"use client";

/**
 * FC CAREER — Étape 12 : Récompenses & Trophées
 * Route: /client/fc-career/awards
 */

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award,
  Crown,
  Globe,
  Medal,
  Star,
  Trophy,
  TrendingUp,
} from "lucide-react";
import { Shell, PageTitle, StatCard } from "../lib/components";
import { Button } from "../lib/ui";
import { loadGame, saveGame } from "../utils/storage";
import type { FullSave } from "../utils/storage";
import type { AwardsState, GoldenGlobeCeremony, LeagueAward, LeagueRanking } from "../types/awards";
import {
  createAwardsState,
  runGoldenGlobeCeremony,
  generateLeagueRankings,
  checkPlayerOfMonth,
  checkLeagueAwards,
} from "../engine/awards-engine";
import { getClub } from "../constants/clubs";

type Tab = "rankings" | "golden-globe" | "league-awards" | "european";

const TABS: { id: Tab; label: string; icon: typeof Trophy }[] = [
  { id: "rankings", label: "Classements", icon: TrendingUp },
  { id: "golden-globe", label: "Globe d'Or", icon: Globe },
  { id: "league-awards", label: "Championnat", icon: Medal },
  { id: "european", label: "Europe", icon: Star },
];

const ease4 = [0.22, 1, 0.36, 1] as [number, number, number, number];

export default function AwardsPage() {
  const [save, setSave] = useState<FullSave | null>(null);
  const [tab, setTab] = useState<Tab>("rankings");

  useEffect(() => { setSave(loadGame()); }, []);

  const awards: AwardsState = save?.meta?.awardsState ?? createAwardsState();
  const player = save?.player;
  const playerName = player ? `${player.firstName} ${player.lastName}` : "Joueur";
  const clubId = player?.contract?.clubId ?? "";
  const club = clubId ? getClub(clubId) : null;

  // Generate rankings on load
  const [rankings, setRankings] = useState<{ topScorers: LeagueRanking[]; topAssisters: LeagueRanking[] } | null>(null);
  const currentStats = player?.seasonStats?.length ? player.seasonStats[player.seasonStats.length - 1] : null;

  useEffect(() => {
    if (!player) return;
    const r = generateLeagueRankings(playerName, clubId, currentStats?.goals ?? 0, currentStats?.assists ?? 0);
    setRankings(r);
  }, [player, playerName, clubId, currentStats]);

  const persist = useCallback((updated: AwardsState) => {
    setSave(prev => {
      if (!prev) return prev;
      const next: FullSave = { ...prev, meta: { ...prev.meta, awardsState: updated } };
      saveGame(next);
      return next;
    });
  }, []);

  const simulateGoldenGlobe = useCallback(() => {
    if (!player) return;
    const seasonYear = save?.meta?.season?.seasonYear ?? 2026;
    const ceremony = runGoldenGlobeCeremony(
      seasonYear,
      playerName,
      clubId,
      currentStats?.averageRating ?? 6.0,
      currentStats?.matches ?? 0,
      currentStats?.goals ?? 0,
      currentStats?.assists ?? 0,
      0, // collective trophies
      currentStats?.averageRating ?? 6.0, // champions perf (simplified)
      50, // popularity
    );
    const updated: AwardsState = { ...awards, goldenGlobes: [...awards.goldenGlobes, ceremony] };
    // Also update rankings
    if (rankings) {
      updated.topScorers = rankings.topScorers;
      updated.topAssisters = rankings.topAssisters;
    }
    persist(updated);
  }, [player, playerName, clubId, save, awards, rankings, persist]);

  if (!save) {
    return (
      <Shell>
        <PageTitle eyebrow="ÉTAPE 12" title="Récompenses" subtitle="Chargement..." />
      </Shell>
    );
  }

  const latestCeremony = awards.goldenGlobes.length > 0 ? awards.goldenGlobes[awards.goldenGlobes.length - 1] : null;
  const totalAwards = awards.leagueAwards.length + awards.europeanAwards.length + awards.goldenGlobes.filter(g => g.playerResult === "winner").length;

  return (
    <Shell>
      <PageTitle
        eyebrow="ÉTAPE 12"
        title="Récompenses & Trophées"
        subtitle="Globe d'Or, classements, distinctions"
        action={
          <Button variant="action" onClick={simulateGoldenGlobe}>
            <Crown /> Simuler Globe d'Or
          </Button>
        }
      />

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <StatCard icon={<Trophy />} value={totalAwards} label="Récompenses" tone="amber" />
        <StatCard icon={<Globe />} value={awards.goldenGlobes.filter(g => g.playerResult === "winner").length} label="Globe d'Or" tone="amber" />
        <StatCard
          icon={<TrendingUp />}
          value={rankings?.topScorers.find(r => r.isPlayer)?.rank ?? "—"}
          label="Class. buteurs"
          tone="blue"
        />
        <StatCard
          icon={<Award />}
          value={rankings?.topAssisters.find(r => r.isPlayer)?.rank ?? "—"}
          label="Class. passeurs"
          tone="green"
        />
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

          {/* ---- RANKINGS ---- */}
          {tab === "rankings" && rankings && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              {/* Top scorers */}
              <div className="card" style={{ padding: "1.5rem" }}>
                <h3 style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Trophy /> Meilleurs Buteurs
                </h3>
                <div style={{ display: "grid", gap: "0.25rem" }}>
                  {rankings.topScorers.map(r => (
                    <div key={r.playerName} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "0.5rem 0.75rem", borderRadius: "0.5rem",
                      background: r.isPlayer ? "var(--primary)" : "transparent",
                      color: r.isPlayer ? "white" : "inherit",
                      fontWeight: r.isPlayer ? 700 : 400,
                    }}>
                      <span>{r.rank}. {r.playerName}</span>
                      <strong>{r.value} buts</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top assisters */}
              <div className="card" style={{ padding: "1.5rem" }}>
                <h3 style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Award /> Meilleurs Passeurs
                </h3>
                <div style={{ display: "grid", gap: "0.25rem" }}>
                  {rankings.topAssisters.map(r => (
                    <div key={r.playerName} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "0.5rem 0.75rem", borderRadius: "0.5rem",
                      background: r.isPlayer ? "var(--primary)" : "transparent",
                      color: r.isPlayer ? "white" : "inherit",
                      fontWeight: r.isPlayer ? 700 : 400,
                    }}>
                      <span>{r.rank}. {r.playerName}</span>
                      <strong>{r.value} PD</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "rankings" && !rankings && (
            <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
              <p style={{ opacity: 0.5 }}>Classements en cours de chargement...</p>
            </div>
          )}

          {/* ---- GOLDEN GLOBE ---- */}
          {tab === "golden-globe" && (
            <div style={{ display: "grid", gap: "1rem" }}>
              {latestCeremony ? (
                <>
                  <div className="card" style={{ padding: "1.5rem", textAlign: "center" }}>
                    {latestCeremony.playerResult === "winner" && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>
                        <Crown style={{ width: 64, height: 64, color: "gold", margin: "0 auto 1rem" }} />
                        <h2 style={{ color: "gold" }}>GLOBE D&apos;OR !</h2>
                        <p>Vous avez remporté le Globe d&apos;Or de la saison {latestCeremony.seasonYear} !</p>
                      </motion.div>
                    )}
                    {latestCeremony.playerResult === "finalist" && (
                      <div>
                        <Medal style={{ width: 48, height: 48, margin: "0 auto 1rem", opacity: 0.7 }} />
                        <h3>Finaliste du Globe d&apos;Or</h3>
                        <p>Top 3 — Position : {latestCeremony.playerRank}e</p>
                      </div>
                    )}
                    {latestCeremony.playerResult === "nominated" && (
                      <div>
                        <Star style={{ width: 48, height: 48, margin: "0 auto 1rem", opacity: 0.5 }} />
                        <h3>Nominé au Globe d&apos;Or</h3>
                        <p>Top 30 — Position : {latestCeremony.playerRank}e</p>
                      </div>
                    )}
                    {latestCeremony.playerResult === "none" && (
                      <div>
                        <Globe style={{ width: 48, height: 48, margin: "0 auto 1rem", opacity: 0.3 }} />
                        <h3>Non nominé cette saison</h3>
                        <p>Continuez à performer pour atteindre le top 30.</p>
                      </div>
                    )}
                  </div>

                  {/* Top 10 */}
                  <div className="card" style={{ padding: "1.5rem" }}>
                    <h3 style={{ marginBottom: "1rem" }}>Classement Globe d&apos;Or {latestCeremony.seasonYear}</h3>
                    <div style={{ display: "grid", gap: "0.25rem" }}>
                      {latestCeremony.candidates.slice(0, 10).map((c, i) => (
                        <div key={c.playerId} style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "0.5rem 0.75rem", borderRadius: "0.5rem",
                          background: c.playerId === "player" ? "var(--primary)" : i < 3 ? "var(--muted)" : "transparent",
                          color: c.playerId === "player" ? "white" : "inherit",
                          fontWeight: c.playerId === "player" || i < 3 ? 700 : 400,
                        }}>
                          <span>
                            {i === 0 && "🥇 "}
                            {i === 1 && "🥈 "}
                            {i === 2 && "🥉 "}
                            {i > 2 && `${i + 1}. `}
                            {c.name}
                          </span>
                          <span style={{ fontSize: "0.875rem" }}>{c.score.toFixed(1)} pts</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
                  <Globe style={{ width: 48, height: 48, margin: "0 auto 1rem", opacity: 0.3 }} />
                  <p>Aucune cérémonie du Globe d&apos;Or simulée.</p>
                  <p style={{ fontSize: "0.875rem", opacity: 0.6 }}>Terminez une saison et lancez la simulation.</p>
                </div>
              )}
            </div>
          )}

          {/* ---- LEAGUE AWARDS ---- */}
          {tab === "league-awards" && (
            <div style={{ display: "grid", gap: "1rem" }}>
              {awards.leagueAwards.length > 0 ? (
                awards.leagueAwards.map((a, i) => (
                  <div key={`${a.type}-${a.seasonYear}-${i}`} className="card" style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                    <Medal style={{ flexShrink: 0, color: "gold" }} />
                    <div>
                      <strong>{a.label}</strong>
                      <p style={{ fontSize: "0.875rem", opacity: 0.7 }}>Saison {a.seasonYear} {a.value != null ? `— ${a.value}` : ""}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
                  <Medal style={{ width: 48, height: 48, margin: "0 auto 1rem", opacity: 0.3 }} />
                  <p>Aucune récompense de championnat pour le moment.</p>
                  <p style={{ fontSize: "0.875rem", opacity: 0.6 }}>
                    Meilleur Buteur · Meilleur Passeur · Meilleur Joueur · Meilleur Jeune · Joueur du Mois
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ---- EUROPEAN ---- */}
          {tab === "european" && (
            <div style={{ display: "grid", gap: "1rem" }}>
              {awards.europeanAwards.length > 0 ? (
                awards.europeanAwards.map((a, i) => (
                  <div key={`${a.type}-${a.seasonYear}-${i}`} className="card" style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                    <Star style={{ flexShrink: 0, color: "gold" }} />
                    <div>
                      <strong>{a.label}</strong>
                      <p style={{ fontSize: "0.875rem", opacity: 0.7 }}>Saison {a.seasonYear} {a.value != null ? `— ${a.value}` : ""}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
                  <Star style={{ width: 48, height: 48, margin: "0 auto 1rem", opacity: 0.3 }} />
                  <p>Aucune récompense européenne.</p>
                  <p style={{ fontSize: "0.875rem", opacity: 0.6 }}>
                    Soulier d&apos;Or · MVP Champions · Équipe Type Champions
                  </p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </Shell>
  );
}
