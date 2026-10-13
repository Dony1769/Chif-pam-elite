"use client";

/**
 * FC CAREER — Étape 19 : Retraite, Vie Après & Héritage
 * Route: /client/fc-career/retirement
 */

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flag,
  Trophy,
  Star,
  Armchair,
  Tv,
  Briefcase,
  Building,
  Palmtree,
} from "lucide-react";
import { Shell, PageTitle, StatCard } from "../lib/components";
import { Button, Dialog, DialogContent, DialogTitle, DialogDescription } from "../lib/ui";
import { loadGame, saveGame } from "../utils/storage";
import type { FullSave } from "../utils/storage";
import type { RetirementState, PostCareerRole } from "../types/retirement";
import {
  createRetirementState,
  canRetireVoluntarily,
  retire,
  applyLegacyAndEnding,
  getAvailablePostCareerOptions,
  choosePostCareer,
  type LegacyInput,
} from "../engine/retirement-engine";

type Tab = "overview" | "legacy" | "post-career";

const TABS: { id: Tab; label: string; icon: typeof Flag }[] = [
  { id: "overview", label: "Retraite", icon: Flag },
  { id: "legacy", label: "Héritage", icon: Trophy },
  { id: "post-career", label: "Après-carrière", icon: Armchair },
];

const ease4 = [0.22, 1, 0.36, 1] as [number, number, number, number];

const TIER_COLOR: Record<string, string> = {
  "living-legend": "#FFD700",
  "icon": "#C0C0C0",
  "solid": "#CD7F32",
  "average": "#6B7280",
  "wasted": "#9CA3AF",
  "broken": "#EF4444",
};

const ROLE_ICON: Record<string, typeof Tv> = {
  "tv-consultant": Tv,
  "coach": Briefcase,
  "sporting-director": Building,
  "peaceful-retirement": Palmtree,
};

export default function RetirementPage() {
  const [save, setSave] = useState<FullSave | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [retireModal, setRetireModal] = useState(false);

  useEffect(() => { setSave(loadGame()); }, []);

  const retState: RetirementState = save?.meta?.retirementState ?? createRetirementState();
  const player = save?.player;
  const seasonYear = save?.meta?.season?.seasonYear ?? 1;
  const currentDay = save?.meta?.season?.currentDay ?? 1;

  const persist = useCallback((updated: RetirementState) => {
    setSave(prev => {
      if (!prev) return prev;
      const next: FullSave = { ...prev, meta: { ...prev.meta, retirementState: updated } };
      saveGame(next);
      return next;
    });
  }, []);

  const handleRetire = useCallback((farewell: boolean) => {
    let updated = retire(retState, "voluntary", player?.age ?? 35, currentDay, seasonYear, farewell);
    // Compute legacy
    const currentStats = player?.seasonStats?.[player.seasonStats.length - 1];
    const input: LegacyInput = {
      championships: 1,
      cups: 0,
      championsLeague: 0,
      europaLeague: 0,
      worldCup: 0,
      euro: 0,
      totalGoals: currentStats?.goals ?? 0,
      totalCaps: 0,
      avgRating: currentStats?.averageRating ?? 6.0,
      goldenGlobes: 0,
      goldenBoots: 0,
      bestPlayer: 0,
      countriesPlayed: 1,
      wasCaptainClub: false,
      wasCaptainNational: false,
      yearsAtOneClub: seasonYear,
    };
    updated = applyLegacyAndEnding(updated, input);
    persist(updated);
    setRetireModal(false);
  }, [retState, player, currentDay, seasonYear, persist]);

  const handleChoosePostCareer = useCallback((role: PostCareerRole) => {
    const updated = choosePostCareer(retState, role, 500_000);
    persist(updated);
  }, [retState, persist]);

  if (!save) {
    return (
      <Shell>
        <PageTitle eyebrow="ÉTAPE 19" title="Retraite" subtitle="Chargement..." />
      </Shell>
    );
  }

  const canRetire = player ? canRetireVoluntarily(player.age) : false;
  const legacyScore = retState.legacyScore;
  const ending = retState.ending;
  const postCareerOptions = legacyScore
    ? getAvailablePostCareerOptions(legacyScore.total, player?.overall ?? 60)
    : [];

  return (
    <Shell>
      <PageTitle
        eyebrow="ÉTAPE 19"
        title="Retraite & Héritage"
        subtitle={retState.retired ? "Votre carrière est terminée" : "Préparez votre avenir"}
      />

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <StatCard icon={<Flag />} value={retState.retired ? "Oui" : "Non"} label="Retraité" tone={retState.retired ? "amber" : "blue"} />
        <StatCard icon={<Trophy />} value={legacyScore?.total ?? "—"} label="Score héritage" tone={legacyScore && legacyScore.total >= 75 ? "green" : "amber"} />
        <StatCard icon={<Star />} value={ending?.title ?? "—"} label="Fin" tone={ending?.tier === "living-legend" ? "green" : "blue"} />
        <StatCard icon={<Armchair />} value={retState.postCareer?.role ? "Choisi" : "—"} label="Après-carrière" tone={retState.postCareer ? "green" : "blue"} />
      </div>

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

          {/* ---- OVERVIEW ---- */}
          {tab === "overview" && (
            <div style={{ display: "grid", gap: "1rem" }}>
              {!retState.retired ? (
                <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
                  <Flag style={{ width: 48, height: 48, margin: "0 auto 1rem", opacity: 0.3 }} />
                  <p style={{ marginBottom: "1rem" }}>
                    {canRetire
                      ? `À ${player?.age} ans, tu peux prendre ta retraite.`
                      : `Tu dois avoir au moins 32 ans pour la retraite volontaire. (Actuel: ${player?.age ?? "?"} ans)`}
                  </p>
                  {canRetire && (
                    <Button variant="action" onClick={() => setRetireModal(true)}>
                      <Flag /> Prendre sa retraite
                    </Button>
                  )}
                  <div style={{ marginTop: "1.5rem", fontSize: "0.85rem", opacity: 0.6 }}>
                    <p><strong>Retraite forcée :</strong> Blessures récurrentes · OVR &lt; 60 sans club · Âge &gt; 38</p>
                    <p><strong>Retraite brisée :</strong> Sanctions · Scandale · Faillite</p>
                  </div>
                </div>
              ) : (
                <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
                  <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>{ending?.emoji ?? "👋"}</div>
                  <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>{ending?.title}</h2>
                  <p style={{ fontSize: "1rem", opacity: 0.7, marginBottom: "1rem" }}>{ending?.description}</p>
                  <p style={{ fontSize: "0.85rem", opacity: 0.5 }}>
                    Retraite à {retState.retirementInfo?.age} ans · Saison {retState.retirementInfo?.seasonYear}
                    {retState.retirementInfo?.farewellMatch && " · Match d'adieu ⚽"}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ---- LEGACY ---- */}
          {tab === "legacy" && (
            <div style={{ display: "grid", gap: "1rem" }}>
              {!legacyScore ? (
                <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
                  <Trophy style={{ width: 48, height: 48, margin: "0 auto 1rem", opacity: 0.3 }} />
                  <p>Le score d&apos;héritage sera calculé à la retraite.</p>
                </div>
              ) : (
                <>
                  {/* Total score */}
                  <div className="card" style={{ padding: "1.5rem", textAlign: "center" }}>
                    <div style={{
                      width: 120, height: 120, borderRadius: "50%", margin: "0 auto 1rem",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      border: `4px solid ${TIER_COLOR[ending?.tier ?? "average"]}`,
                      fontSize: "2rem", fontWeight: 800,
                    }}>
                      {legacyScore.total}
                    </div>
                    <p style={{ fontWeight: 600 }}>Score d&apos;héritage</p>
                  </div>

                  {/* Breakdown */}
                  <div className="card" style={{ padding: "1.25rem" }}>
                    <strong style={{ marginBottom: "1rem", display: "block" }}>Détail du score</strong>
                    {([
                      { label: "Trophées", value: legacyScore.trophies, max: 35, icon: "🏆" },
                      { label: "Statistiques", value: legacyScore.stats, max: 25, icon: "📊" },
                      { label: "Récompenses", value: legacyScore.awards, max: 25, icon: "🥇" },
                      { label: "Parcours", value: legacyScore.career, max: 15, icon: "🛤️" },
                    ]).map(item => (
                      <div key={item.label} style={{ marginBottom: "0.75rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem", fontSize: "0.875rem" }}>
                          <span>{item.icon} {item.label}</span>
                          <span style={{ fontWeight: 600 }}>{item.value}/{item.max}</span>
                        </div>
                        <div style={{ background: "var(--muted)", borderRadius: "0.5rem", height: "0.5rem", overflow: "hidden" }}>
                          <div style={{
                            height: "100%", borderRadius: "0.5rem",
                            width: `${(item.value / item.max) * 100}%`,
                            background: "var(--primary)",
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Legacy players */}
                  {retState.legacyPlayers.length > 0 && (
                    <div className="card" style={{ padding: "1.25rem" }}>
                      <strong style={{ marginBottom: "0.75rem", display: "block" }}>Légendes précédentes</strong>
                      {retState.legacyPlayers.map((lp, i) => (
                        <div key={i} style={{ padding: "0.75rem", background: "var(--muted)", borderRadius: "0.5rem", marginBottom: "0.5rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <strong>{lp.name}</strong>
                            <span style={{ fontSize: "0.8rem" }}>Score: {lp.legacyScore}</span>
                          </div>
                          <p style={{ fontSize: "0.8rem", opacity: 0.6 }}>
                            {lp.goals} buts · {lp.caps} sélections · {lp.trophies} trophées
                            {lp.hasStatue && " · 🏛️ Statue"}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ---- POST-CAREER ---- */}
          {tab === "post-career" && (
            <div style={{ display: "grid", gap: "1rem" }}>
              {!retState.retired ? (
                <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
                  <Armchair style={{ width: 48, height: 48, margin: "0 auto 1rem", opacity: 0.3 }} />
                  <p>Les options post-carrière seront disponibles après la retraite.</p>
                </div>
              ) : retState.postCareer ? (
                <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
                  {(() => {
                    const Icon = ROLE_ICON[retState.postCareer.role] ?? Armchair;
                    return <Icon style={{ width: 48, height: 48, margin: "0 auto 1rem" }} />;
                  })()}
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 700 }}>
                    {postCareerOptions.find(o => o.role === retState.postCareer?.role)?.emoji}{" "}
                    {postCareerOptions.find(o => o.role === retState.postCareer?.role)?.label ?? retState.postCareer.role}
                  </h3>
                  <p style={{ opacity: 0.7, marginTop: "0.5rem" }}>
                    {postCareerOptions.find(o => o.role === retState.postCareer?.role)?.description}
                  </p>
                </div>
              ) : (
                <div style={{ display: "grid", gap: "0.75rem" }}>
                  <p style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>Choisissez votre vie après le football :</p>
                  {postCareerOptions.map(option => (
                    <div key={option.role} className="card" style={{ padding: "1.25rem", cursor: "pointer" }} onClick={() => handleChoosePostCareer(option.role)}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <span style={{ fontSize: "2rem" }}>{option.emoji}</span>
                        <div>
                          <strong>{option.label}</strong>
                          <p style={{ fontSize: "0.85rem", opacity: 0.7 }}>{option.description}</p>
                          {option.minScore > 0 && (
                            <span style={{ fontSize: "0.75rem", opacity: 0.5 }}>Requis: score ≥ {option.minScore}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Retire modal */}
      <Dialog open={retireModal} onOpenChange={setRetireModal}>
        <DialogContent>
          <DialogTitle>Prendre sa retraite</DialogTitle>
          <DialogDescription>Cette décision est irréversible.</DialogDescription>
          <div style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}>
            <Button variant="action" onClick={() => handleRetire(true)}>
              ⚽ Retraite avec match d&apos;adieu
            </Button>
            <Button variant="outline" onClick={() => handleRetire(false)}>
              👋 Retraite discrète
            </Button>
            <Button variant="ghost" onClick={() => setRetireModal(false)}>
              Annuler
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
