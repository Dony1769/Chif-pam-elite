"use client";

/**
 * FC CAREER — Étape 15 : Monde Vivant & Adaptation Culturelle
 * Route: /client/fc-career/world
 */

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  Newspaper,
  TrendingUp,
  Languages,
  BookOpen,
  Users,
  Zap,
} from "lucide-react";
import { Shell, PageTitle, StatCard } from "../lib/components";
import { Button } from "../lib/ui";
import { loadGame, saveGame } from "../utils/storage";
import type { FullSave } from "../utils/storage";
import type { WorldState, NewsItem } from "../types/adaptation";
import {
  createWorldState,
  advanceWorld,
  takeLanguageLesson,
  tickAdaptation,
  getAdaptationPenalties,
  hasMulticulturalBonus,
  hasComfortBonus,
  getWorldTopScorers,
  getWorldTopRated,
} from "../engine/ai-world";

type Tab = "news" | "players" | "adaptation";

const TABS: { id: Tab; label: string; icon: typeof Globe }[] = [
  { id: "news", label: "Actualités", icon: Newspaper },
  { id: "players", label: "Joueurs", icon: TrendingUp },
  { id: "adaptation", label: "Adaptation", icon: Languages },
];

const ease4 = [0.22, 1, 0.36, 1] as [number, number, number, number];

const PHASE_LABEL: Record<string, string> = {
  shock: "Choc culturel",
  adapting: "En adaptation",
  integrated: "Intégré",
};

const PHASE_COLOR: Record<string, string> = {
  shock: "var(--destructive)",
  adapting: "var(--warning, orange)",
  integrated: "var(--primary)",
};

const NEWS_CAT_COLOR: Record<string, string> = {
  transfer: "#3b82f6",
  injury: "#ef4444",
  result: "#22c55e",
  relegation: "#a855f7",
  coach: "#f59e0b",
  youth: "#06b6d4",
  record: "#ec4899",
};

export default function WorldPage() {
  const [save, setSave] = useState<FullSave | null>(null);
  const [tab, setTab] = useState<Tab>("news");

  useEffect(() => { setSave(loadGame()); }, []);

  const world: WorldState = save?.meta?.worldState ?? createWorldState();
  const player = save?.player;
  const currentDay = save?.meta?.season?.currentDay ?? 1;

  const persist = useCallback((updated: WorldState) => {
    setSave(prev => {
      if (!prev) return prev;
      const next: FullSave = { ...prev, meta: { ...prev.meta, worldState: updated } };
      saveGame(next);
      return next;
    });
  }, []);

  const handleSimulate = useCallback(() => {
    const nextDay = currentDay + 7;
    let updated = advanceWorld(world, currentDay, nextDay);
    if (updated.adaptation) {
      updated = { ...updated, adaptation: tickAdaptation(updated.adaptation, nextDay) };
    }
    persist(updated);
  }, [world, currentDay, persist]);

  const handleLesson = useCallback(() => {
    if (!world.adaptation) return;
    const updated = { ...world, adaptation: takeLanguageLesson(world.adaptation) };
    persist(updated);
  }, [world, persist]);

  if (!save) {
    return (
      <Shell>
        <PageTitle eyebrow="ÉTAPE 15" title="Monde Vivant" subtitle="Chargement..." />
      </Shell>
    );
  }

  const penalties = getAdaptationPenalties(world.adaptation, currentDay);
  const multicultural = hasMulticulturalBonus(world.adaptation);
  const comfort = hasComfortBonus(world.adaptation, currentDay);
  const topScorers = getWorldTopScorers(world, 10);
  const topRated = getWorldTopRated(world, 10);

  return (
    <Shell>
      <PageTitle
        eyebrow="ÉTAPE 15"
        title="Monde Vivant"
        subtitle="Le monde ne tourne pas autour de toi"
        action={
          <Button variant="action" onClick={handleSimulate}>
            <Zap /> Simuler 1 semaine
          </Button>
        }
      />

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <StatCard icon={<Newspaper />} value={world.news.length} label="Actualités" tone="blue" />
        <StatCard icon={<Users />} value={world.players.length} label="Joueurs IA" tone="amber" />
        <StatCard icon={<TrendingUp />} value={world.players.filter(p => !p.injured).length} label="En forme" tone="green" />
        <StatCard
          icon={<Languages />}
          value={world.adaptation ? PHASE_LABEL[world.adaptation.phase] : "—"}
          label="Adaptation"
          tone={world.adaptation?.phase === "integrated" ? "green" : world.adaptation?.phase === "shock" ? "red" : "amber"}
        />
      </div>

      {/* Bonuses */}
      {(multicultural || comfort) && (
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          {multicultural && (
            <div style={{ padding: "0.5rem 1rem", background: "var(--primary)", color: "white", borderRadius: "0.5rem", fontSize: "0.875rem" }}>
              🌍 Joueur multiculturel (+3 adaptabilité)
            </div>
          )}
          {comfort && (
            <div style={{ padding: "0.5rem 1rem", background: "var(--primary)", color: "white", borderRadius: "0.5rem", fontSize: "0.875rem" }}>
              🏠 Bonus confort (+5 moral à domicile)
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {TABS.map(t => (
          <Button key={t.id} variant={tab === t.id ? "career" : "ghost"} onClick={() => setTab(t.id)}>
            <t.icon /> {t.label}
          </Button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25, ease: ease4 }}>

          {/* ---- NEWS ---- */}
          {tab === "news" && (
            <div style={{ display: "grid", gap: "0.5rem" }}>
              {world.news.length === 0 ? (
                <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
                  <Newspaper style={{ width: 48, height: 48, margin: "0 auto 1rem", opacity: 0.3 }} />
                  <p>Aucune actualité. Simulez une semaine pour voir le monde évoluer.</p>
                </div>
              ) : (
                [...world.news].reverse().map(item => (
                  <div key={item.id} className="card" style={{ padding: "1rem", borderLeft: `3px solid ${NEWS_CAT_COLOR[item.category] ?? "var(--muted)"}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "1.25rem" }}>{item.emoji}</span>
                      <div>
                        <p style={{ fontSize: "0.9rem", fontWeight: 500 }}>{item.headline}</p>
                        <span style={{ fontSize: "0.75rem", opacity: 0.5 }}>Jour {item.day}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ---- PLAYERS ---- */}
          {tab === "players" && (
            <div style={{ display: "grid", gap: "1.5rem" }}>
              {/* Top Scorers */}
              <div>
                <h3 style={{ marginBottom: "0.75rem", fontSize: "1rem", fontWeight: 600 }}>⚽ Meilleurs buteurs</h3>
                <div className="card" style={{ overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--muted)" }}>
                        <th style={{ padding: "0.5rem", textAlign: "left" }}>#</th>
                        <th style={{ padding: "0.5rem", textAlign: "left" }}>Joueur</th>
                        <th style={{ padding: "0.5rem", textAlign: "center" }}>OVR</th>
                        <th style={{ padding: "0.5rem", textAlign: "center" }}>Buts</th>
                        <th style={{ padding: "0.5rem", textAlign: "center" }}>Passes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topScorers.map((p, i) => (
                        <tr key={p.id} style={{ borderBottom: "1px solid var(--muted)", opacity: p.injured ? 0.5 : 1 }}>
                          <td style={{ padding: "0.5rem" }}>{i + 1}</td>
                          <td style={{ padding: "0.5rem", fontWeight: 500 }}>
                            {p.name} {p.injured && "🤕"}
                          </td>
                          <td style={{ padding: "0.5rem", textAlign: "center" }}>{p.overall}</td>
                          <td style={{ padding: "0.5rem", textAlign: "center", fontWeight: 600 }}>{p.goals}</td>
                          <td style={{ padding: "0.5rem", textAlign: "center" }}>{p.assists}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Top Rated */}
              <div>
                <h3 style={{ marginBottom: "0.75rem", fontSize: "1rem", fontWeight: 600 }}>🏆 Meilleurs joueurs</h3>
                <div className="card" style={{ overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--muted)" }}>
                        <th style={{ padding: "0.5rem", textAlign: "left" }}>#</th>
                        <th style={{ padding: "0.5rem", textAlign: "left" }}>Joueur</th>
                        <th style={{ padding: "0.5rem", textAlign: "center" }}>Âge</th>
                        <th style={{ padding: "0.5rem", textAlign: "center" }}>OVR</th>
                        <th style={{ padding: "0.5rem", textAlign: "center" }}>Pos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topRated.map((p, i) => (
                        <tr key={p.id} style={{ borderBottom: "1px solid var(--muted)", opacity: p.injured ? 0.5 : 1 }}>
                          <td style={{ padding: "0.5rem" }}>{i + 1}</td>
                          <td style={{ padding: "0.5rem", fontWeight: 500 }}>
                            {p.name} {p.injured && "🤕"}
                          </td>
                          <td style={{ padding: "0.5rem", textAlign: "center" }}>{p.age}</td>
                          <td style={{ padding: "0.5rem", textAlign: "center", fontWeight: 600 }}>{p.overall}</td>
                          <td style={{ padding: "0.5rem", textAlign: "center" }}>{p.position}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ---- ADAPTATION ---- */}
          {tab === "adaptation" && (
            <div style={{ display: "grid", gap: "1rem" }}>
              {!world.adaptation ? (
                <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
                  <Globe style={{ width: 48, height: 48, margin: "0 auto 1rem", opacity: 0.3 }} />
                  <p>Vous jouez dans votre pays d&apos;origine. Pas d&apos;adaptation nécessaire.</p>
                </div>
              ) : (
                <>
                  {/* Phase */}
                  <div className="card" style={{ padding: "1.25rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                      <strong>Phase d&apos;adaptation</strong>
                      <span style={{ padding: "0.25rem 0.75rem", borderRadius: "1rem", fontSize: "0.8rem", fontWeight: 600, background: PHASE_COLOR[world.adaptation.phase], color: "white" }}>
                        {PHASE_LABEL[world.adaptation.phase]}
                      </span>
                    </div>
                    {world.adaptation.hasCompatriot && (
                      <p style={{ fontSize: "0.85rem", color: "var(--primary)", marginBottom: "0.5rem" }}>
                        🤝 Un compatriote dans l&apos;équipe — adaptation 2x plus rapide !
                      </p>
                    )}
                  </div>

                  {/* Language barrier */}
                  <div className="card" style={{ padding: "1.25rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                      <strong>Barrière linguistique</strong>
                      <span style={{ fontWeight: 600 }}>{Math.round(world.adaptation.languageBarrier)}%</span>
                    </div>
                    <div style={{ background: "var(--muted)", borderRadius: "0.5rem", height: "0.5rem", overflow: "hidden", marginBottom: "0.75rem" }}>
                      <div style={{
                        height: "100%", borderRadius: "0.5rem",
                        width: `${world.adaptation.languageBarrier}%`,
                        background: world.adaptation.languageBarrier > 50 ? "var(--destructive)" : world.adaptation.languageBarrier > 20 ? "var(--warning, orange)" : "var(--primary)",
                      }} />
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <Button variant="action" onClick={handleLesson} disabled={world.adaptation.languageBarrier <= 0}>
                        <BookOpen /> Cours de langue (-5%)
                      </Button>
                      <span style={{ fontSize: "0.8rem", opacity: 0.6 }}>{world.adaptation.lessonsCompleted} cours suivis</span>
                    </div>
                  </div>

                  {/* Penalties */}
                  {world.adaptation.phase !== "integrated" && (
                    <div className="card" style={{ padding: "1.25rem" }}>
                      <strong style={{ marginBottom: "0.75rem", display: "block" }}>Malus actifs</strong>
                      <div style={{ display: "grid", gap: "0.5rem", fontSize: "0.875rem" }}>
                        {penalties.communicationPenalty > 0 && (
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>Communication coach/coéquipiers</span>
                            <span style={{ color: "var(--destructive)", fontWeight: 600 }}>-{penalties.communicationPenalty}%</span>
                          </div>
                        )}
                        {penalties.tacticalPenalty > 0 && (
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>Discipline tactique</span>
                            <span style={{ color: "var(--destructive)", fontWeight: 600 }}>-{penalties.tacticalPenalty}%</span>
                          </div>
                        )}
                        {penalties.moraleDelta !== 0 && (
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>Moral</span>
                            <span style={{ color: "var(--destructive)", fontWeight: 600 }}>{penalties.moraleDelta}</span>
                          </div>
                        )}
                        {penalties.pressureDelta > 0 && (
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>Pression</span>
                            <span style={{ color: "var(--destructive)", fontWeight: 600 }}>+{penalties.pressureDelta}</span>
                          </div>
                        )}
                        {penalties.fatigueDelta > 0 && (
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>Fatigue permanente</span>
                            <span style={{ color: "var(--destructive)", fontWeight: 600 }}>+{penalties.fatigueDelta}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Countries lived */}
                  {world.adaptation.countriesLived.length > 1 && (
                    <div className="card" style={{ padding: "1.25rem" }}>
                      <strong style={{ marginBottom: "0.5rem", display: "block" }}>Pays vécus</strong>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        {world.adaptation.countriesLived.map(c => (
                          <span key={c} style={{ padding: "0.25rem 0.75rem", background: "var(--muted)", borderRadius: "1rem", fontSize: "0.85rem" }}>
                            {c.charAt(0).toUpperCase() + c.slice(1)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </Shell>
  );
}
