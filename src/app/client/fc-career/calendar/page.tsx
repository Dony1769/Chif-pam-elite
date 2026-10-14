"use client";

/**
 * FC CAREER — Étape 5 : Calendrier & simulation de match
 * Liste des matchs académiques + simulation avec résumé animé.
 */

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useGame }   from "../game/hooks/useGame";
import { useToast }  from "../game/components/Toast";
import { Button }    from "../game/components/Button";
import { pageFade, stagger, itemFade } from "../game/design/animations";
import { simulateMatch } from "../game/domain/matchEngine";
import { writeSave } from "../game/persistence/saveRepository";
import type { MatchResult } from "../game/domain/match";
import type { Fixture }     from "../game/domain/season";

/* ── Noms d'équipes lisibles ────────────────────────────────────── */

const CLUB_NAMES: Record<string, string> = {
  "academy":           "Mon Académie",
  "albion-u18":        "Albion U18",
  "riverside-academy": "Riverside Acad.",
  "north-city-youth":  "North City Youth",
  "east-end-u18":      "East End U18",
  "westbrook-youth":   "Westbrook Youth",
  "harbor-academy":    "Harbor Acad.",
};
function clubName(id: string) { return CLUB_NAMES[id] ?? id; }

/* ── Composant principal ─────────────────────────────────────────── */

export default function CalendarPage() {
  const { state, dispatch } = useGame();
  const { toast } = useToast();
  const router = useRouter();

  const [simulating, setSimulating] = useState(false);
  const [lastResult, setLastResult] = useState<MatchResult | null>(null);

  const save   = state.save;
  const player = save?.player;
  const career = save?.career;

  /* ── Guard ──────────────────────────────────────────────────── */
  if (!save || !player || !career) {
    return (
      <div style={{ padding: "var(--fc-space-6)", textAlign: "center", color: "var(--fc-text-2)" }}>
        <p>Aucune sauvegarde.</p>
        <Button variant="primary" onClick={() => router.push("/client/fc-career/create-player")} style={{ marginTop: "var(--fc-space-4)" }}>
          Nouvelle carrière
        </Button>
      </div>
    );
  }

  /* ── Calendrier courant ─────────────────────────────────────── */
  const schedule = save.world.schedules.find(s => s.season === career.season);
  const fixtures = schedule?.fixtures ?? [];
  const completedIds = new Set(career.completedMatchIds as string[]);

  // Prochain match non joué
  const nextFixture = fixtures.find(f => !completedIds.has(f.id) && f.result === null);

  /* ── Simulation ─────────────────────────────────────────────── */
  const handleSimulate = useCallback(async (fixture: Fixture) => {
    if (simulating) return;
    setSimulating(true);

    // Petite pause pour l'animation
    await new Promise(r => setTimeout(r, 400));

    const isHome = fixture.homeClubId === "academy";
    const opponentId = isHome ? fixture.awayClubId : fixture.homeClubId;

    const result = simulateMatch({
      matchId:      fixture.id,
      season:       career.season,
      matchday:     fixture.matchday,
      player,
      playerClubId: "academy",
      opponentClubId: opponentId,
      isHome,
      competitionId: fixture.competitionId,
    });

    // Appliquer le résultat
    dispatch({ type: "APPLY_MATCH_RESULT", result });

    // Mettre à jour le fixture dans les schedules
    const updatedFixtures = fixtures.map(f =>
      f.id === fixture.id
        ? { ...f, result: { scoreHome: result.scoreHome, scoreAway: result.scoreAway } }
        : f
    );
    const updatedSchedules = save.world.schedules.map(s =>
      s.season === career.season ? { ...s, fixtures: updatedFixtures } : s
    );

    // Persistence
    const updatedSave = {
      ...save,
      player: {
        ...player,
        paPoints: player.paPoints + result.paEarned,
        stats: {
          ...player.stats,
          totalAppearances: player.stats.totalAppearances + 1,
          totalGoals:       player.stats.totalGoals + result.playerStats.goals,
          totalAssists:     player.stats.totalAssists + result.playerStats.assists,
          totalMinutes:     player.stats.totalMinutes + result.playerStats.minutesPlayed,
          totalYellowCards: player.stats.totalYellowCards + result.playerStats.yellowCards,
          totalRedCards:    player.stats.totalRedCards + result.playerStats.redCards,
        },
      },
      career: {
        ...career,
        completedMatchIds: [...(career.completedMatchIds as string[]), fixture.id],
      },
      world: { ...save.world, schedules: updatedSchedules, lastMatchResults: [result, ...save.world.lastMatchResults].slice(0, 20) },
      meta: { ...save.meta, savedAt: Date.now() },
    };
    writeSave(updatedSave);

    setLastResult(result);
    setSimulating(false);

    const outcome = result.scoreHome > result.scoreAway
      ? (isHome ? "Victoire" : "Défaite")
      : result.scoreHome < result.scoreAway
      ? (isHome ? "Défaite" : "Victoire")
      : "Match nul";
    toast(`${outcome} ${result.scoreHome}-${result.scoreAway} · Note ${result.playerRating}/10 · +${result.paEarned} PA`, result.playerRating >= 7 ? "success" : "warning");
  }, [simulating, career, player, save, fixtures, dispatch, toast]);

  return (
    <motion.div
      variants={pageFade}
      initial="hidden"
      animate="visible"
      style={{ padding: "var(--fc-space-5) var(--fc-space-4)", maxWidth: 680, margin: "0 auto" }}
    >
      {/* Header */}
      <div className="fc-page-header">
        <h1 className="fc-page-title">Calendrier</h1>
        <p className="fc-page-meta">
          Saison {career.season} · {fixtures.filter(f => completedIds.has(f.id)).length} / {fixtures.length} matchs joués
        </p>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="visible">

        {/* ── Prochain match ─────────────────────────────────────── */}
        {nextFixture && (
          <motion.section className="fc-panel" variants={itemFade} style={{ marginBottom: "var(--fc-space-4)" }}>
            <p className="fc-panel__label">Prochain match</p>
            <FixtureCard
              fixture={nextFixture}
              clubName={clubName}
              isNext
              onPlay={() => handleSimulate(nextFixture)}
              loading={simulating}
            />
          </motion.section>
        )}

        {!nextFixture && fixtures.length > 0 && (
          <motion.div
            variants={itemFade}
            className="fc-panel"
            style={{ textAlign: "center", marginBottom: "var(--fc-space-4)" }}
          >
            <p style={{ fontSize: "var(--fc-text-lg)", fontWeight: 700, color: "var(--fc-emerald)" }}>🏆 Saison terminée</p>
            <p style={{ fontSize: "var(--fc-text-sm)", color: "var(--fc-text-2)", marginTop: "var(--fc-space-2)" }}>
              Tous les matchs de la saison {career.season} ont été joués.
            </p>
          </motion.div>
        )}

        {/* ── Résultat du dernier match simulé ──────────────────── */}
        <AnimatePresence>
          {lastResult && (
            <motion.section
              key={lastResult.matchId}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="fc-panel"
              style={{ marginBottom: "var(--fc-space-4)", borderColor: "rgba(55,217,154,0.3)" }}
            >
              <p className="fc-panel__label">Dernier résultat</p>
              <MatchResultCard result={lastResult} isHome={lastResult.isHome} clubName={clubName} />
            </motion.section>
          )}
        </AnimatePresence>

        {/* ── Historique des matchs ──────────────────────────────── */}
        {fixtures.filter(f => f.result !== null).length > 0 && (
          <motion.section variants={itemFade}>
            <p style={{
              fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)",
              letterSpacing: "0.05em", marginBottom: "var(--fc-space-3)",
            }}>
              MATCHS JOUÉS
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-2)" }}>
              {fixtures
                .filter(f => f.result !== null)
                .slice()
                .reverse()
                .map(f => (
                  <FixtureCard
                    key={f.id}
                    fixture={f}
                    clubName={clubName}
                    matchResult={save.world.lastMatchResults.find(r => r.matchId === f.id)}
                  />
                ))
              }
            </div>
          </motion.section>
        )}

        {fixtures.length === 0 && (
          <motion.div variants={itemFade} style={{ textAlign: "center", padding: "var(--fc-space-8)", color: "var(--fc-text-3)" }}>
            <p style={{ fontSize: "2rem", marginBottom: "var(--fc-space-2)" }}>📅</p>
            <p>Aucun match planifié.</p>
            <p style={{ fontSize: "var(--fc-text-sm)", marginTop: "var(--fc-space-1)" }}>Avancez dans la saison depuis l&apos;entraînement.</p>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ── Carte d'un match ─────────────────────────────────────────────── */

function FixtureCard({
  fixture, clubName, isNext, onPlay, loading, matchResult,
}: {
  fixture: Fixture;
  clubName: (id: string) => string;
  isNext?: boolean;
  onPlay?: () => void;
  loading?: boolean;
  matchResult?: MatchResult;
}) {
  const isHome  = fixture.homeClubId === "academy";
  const oppId   = isHome ? fixture.awayClubId : fixture.homeClubId;
  const r       = fixture.result;
  const played  = r !== null;

  // Outcome depuis la perspective de l'équipe academy
  let outcome: "win" | "loss" | "draw" | null = null;
  if (r) {
    const academyScore = isHome ? r.scoreHome : r.scoreAway;
    const oppScore     = isHome ? r.scoreAway : r.scoreHome;
    outcome = academyScore > oppScore ? "win" : academyScore < oppScore ? "loss" : "draw";
  }

  const outcomeColor = outcome === "win" ? "var(--fc-emerald)" : outcome === "loss" ? "var(--fc-coral)" : "var(--fc-amber)";

  return (
    <div style={{
      padding: "var(--fc-space-3) var(--fc-space-4)",
      borderRadius: "var(--fc-radius)",
      background: isNext ? "var(--fc-emerald-10)" : "var(--fc-surface-2)",
      border: `1px solid ${isNext ? "rgba(55,217,154,0.25)" : "var(--fc-border)"}`,
      display: "flex",
      alignItems: "center",
      gap: "var(--fc-space-3)",
    }}>
      {/* Journée */}
      <span style={{
        fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)",
        minWidth: 32, textAlign: "center",
      }}>
        J{fixture.matchday}
      </span>

      {/* Équipes + score */}
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--fc-space-2)", flexWrap: "wrap" }}>
          <span style={{
            fontSize: "var(--fc-text-sm)", fontWeight: 700,
            color: isHome ? "var(--fc-emerald)" : "var(--fc-text-2)",
          }}>
            {isHome ? "Académie" : clubName(oppId)}
          </span>
          {played && r ? (
            <span style={{
              fontFamily: "var(--fc-font-display)",
              fontWeight: 800, fontSize: "var(--fc-text-base)",
              color: outcomeColor, minWidth: 40, textAlign: "center",
            }}>
              {r.scoreHome} – {r.scoreAway}
            </span>
          ) : (
            <span style={{ color: "var(--fc-text-3)", fontSize: "var(--fc-text-sm)" }}>vs</span>
          )}
          <span style={{
            fontSize: "var(--fc-text-sm)", fontWeight: 700,
            color: !isHome ? "var(--fc-emerald)" : "var(--fc-text-2)",
          }}>
            {isHome ? clubName(oppId) : "Académie"}
          </span>
        </div>
        {matchResult && (
          <div style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", marginTop: 2 }}>
            Note {matchResult.playerRating}/10 · {matchResult.playerStats.goals}⚽ {matchResult.playerStats.assists}🅰️ · +{matchResult.paEarned} PA
          </div>
        )}
      </div>

      {/* Bouton jouer ou badge résultat */}
      {isNext && onPlay ? (
        <Button variant="primary" size="sm" onClick={onPlay} loading={loading}>
          Jouer
        </Button>
      ) : outcome ? (
        <span style={{
          fontSize: "var(--fc-text-xs)", fontWeight: 700, padding: "2px 8px",
          borderRadius: 99, color: "#fff",
          background: outcomeColor,
        }}>
          {outcome === "win" ? "V" : outcome === "loss" ? "D" : "N"}
        </span>
      ) : null}
    </div>
  );
}

/* ── Résumé détaillé du match ─────────────────────────────────────── */

function MatchResultCard({ result, isHome, clubName }: {
  result: MatchResult;
  isHome: boolean;
  clubName: (id: string) => string;
}) {
  const academyScore = isHome ? result.scoreHome : result.scoreAway;
  const oppScore     = isHome ? result.scoreAway : result.scoreHome;
  const outcome      = academyScore > oppScore ? "Victoire" : academyScore < oppScore ? "Défaite" : "Match nul";
  const outcomeColor = academyScore > oppScore ? "var(--fc-emerald)" : academyScore < oppScore ? "var(--fc-coral)" : "var(--fc-amber)";

  return (
    <div>
      {/* Score */}
      <div style={{ textAlign: "center", marginBottom: "var(--fc-space-4)" }}>
        <div style={{
          fontFamily: "var(--fc-font-display)",
          fontWeight: 800, fontSize: "3rem", letterSpacing: "-0.02em",
          color: "var(--fc-text)",
        }}>
          {result.scoreHome} <span style={{ color: "var(--fc-text-3)" }}>–</span> {result.scoreAway}
        </div>
        <div style={{ fontSize: "var(--fc-text-sm)", color: "var(--fc-text-2)" }}>
          {isHome ? "Académie" : clubName(result.opponentClubId)} vs{" "}
          {isHome ? clubName(result.opponentClubId) : "Académie"}
        </div>
        <div style={{ marginTop: "var(--fc-space-1)", fontWeight: 700, color: outcomeColor }}>
          {outcome}
        </div>
      </div>

      {/* Note + PA */}
      <div style={{
        display: "flex", justifyContent: "center", gap: "var(--fc-space-6)",
        marginBottom: "var(--fc-space-4)",
      }}>
        <Stat label="Note" value={`${result.playerRating}/10`} accent />
        <Stat label="PA gagnés" value={`+${result.paEarned}`} accent />
        <Stat label="Minutes" value={`${result.playerStats.minutesPlayed}'`} />
      </div>

      {/* Stats */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
        gap: "var(--fc-space-2)",
        marginBottom: "var(--fc-space-4)",
      }}>
        <Stat label="Buts"    value={result.playerStats.goals} />
        <Stat label="Passes D." value={result.playerStats.assists} />
        <Stat label="Tirs cadrés" value={result.playerStats.shotsOnTarget} />
        {result.playerStats.saves > 0 && <Stat label="Arrêts" value={result.playerStats.saves} />}
        {result.playerStats.tackles > 0 && <Stat label="Tacles" value={result.playerStats.tackles} />}
        {result.playerStats.interceptions > 0 && <Stat label="Interceptions" value={result.playerStats.interceptions} />}
      </div>

      {/* Événements */}
      {result.events.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-1)" }}>
          {result.events.slice(0, 6).map(ev => (
            <div key={ev.id} style={{
              fontSize: "var(--fc-text-xs)", color: "var(--fc-text-2)",
              padding: "var(--fc-space-1) var(--fc-space-2)",
              background: "var(--fc-surface-2)", borderRadius: "var(--fc-radius-sm)",
            }}>
              {ev.description}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        fontFamily: "var(--fc-font-display)",
        fontWeight: 800,
        fontSize: accent ? "var(--fc-text-xl)" : "var(--fc-text-lg)",
        color: accent ? "var(--fc-emerald)" : "var(--fc-text)",
      }}>
        {value}
      </div>
      <div style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>{label}</div>
    </div>
  );
}
