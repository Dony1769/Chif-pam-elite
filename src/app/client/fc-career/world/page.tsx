"use client";

/**
 * FC CAREER — Page : Monde vivant
 * Classement du championnat, résultats récents, météo de forme.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { useGame }  from "../game/hooks/useGame";
import { useToast } from "../game/components/Toast";
import { Spinner }  from "../game/components/LoadingState";
import {
  selectPlayer, selectCareer, selectIsLoading,
} from "../game/state/selectors";
import { writeSave } from "../game/persistence/saveRepository";
import {
  simulateMatchday,
  applyResultsToSchedule,
  updateStanding,
  getClubForm,
} from "../game/domain/worldSimulator";
import type { FormResult } from "../game/domain/worldSimulator";
import type { StandingRow }  from "../game/domain/club";
import type { SeasonSchedule } from "../game/domain/season";
import { pageFade, stagger, itemFade } from "../game/design/animations";

/* ── Utilitaires UI ─────────────────────────────────────────────── */

function FormBadge({ r }: { r: FormResult }) {
  const cfg: Record<FormResult, { bg: string; color: string; label: string }> = {
    W: { bg: "rgba(55,217,154,0.15)", color: "var(--fc-emerald)", label: "V" },
    D: { bg: "rgba(251,191,36,0.15)", color: "var(--fc-amber)",   label: "N" },
    L: { bg: "rgba(248,113,113,0.15)", color: "var(--fc-coral)",  label: "D" },
  };
  const { bg, color, label } = cfg[r];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 20, height: 20, borderRadius: 4,
      background: bg, color, fontWeight: 800,
      fontSize: 10,
    }}>
      {label}
    </span>
  );
}

function GD(row: StandingRow) {
  const diff = row.goalsFor - row.goalsAgainst;
  const color = diff > 0 ? "var(--fc-emerald)" : diff < 0 ? "var(--fc-coral)" : "var(--fc-text-3)";
  return <span style={{ color }}>{diff > 0 ? `+${diff}` : diff}</span>;
}

/* ── Composant classement ───────────────────────────────────────── */

function StandingsTable({
  standing,
  clubs,
  playerClubId,
  schedule,
}: {
  standing: StandingRow[];
  clubs: { id: string; shortName: string; name: string }[];
  playerClubId: string;
  schedule: SeasonSchedule;
}) {
  const clubMap = new Map(clubs.map(c => [c.id, c]));

  if (standing.length === 0) {
    return (
      <p style={{ color: "var(--fc-text-3)", fontSize: "var(--fc-text-sm)", padding: "var(--fc-space-4) 0" }}>
        Aucun classement disponible. Simulez une journée pour commencer.
      </p>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      {/* En-têtes */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "28px 1fr 32px 32px 32px 32px 40px 60px",
        gap: "var(--fc-space-2)",
        padding: "var(--fc-space-2) var(--fc-space-3)",
        fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)",
        borderBottom: "1px solid var(--fc-border)",
      }}>
        <span>#</span>
        <span>Club</span>
        <span style={{ textAlign: "center" }}>J</span>
        <span style={{ textAlign: "center" }}>G</span>
        <span style={{ textAlign: "center" }}>N</span>
        <span style={{ textAlign: "center" }}>P</span>
        <span style={{ textAlign: "center" }}>DB</span>
        <span style={{ textAlign: "right" }}>Pts</span>
      </div>

      {standing.map((row, idx) => {
        const club = clubMap.get(row.clubId);
        const isPlayer = row.clubId === playerClubId;
        const form = getClubForm(row.clubId, schedule, 5);

        return (
          <div
            key={row.clubId}
            style={{
              display: "grid",
              gridTemplateColumns: "28px 1fr 32px 32px 32px 32px 40px 60px",
              gap: "var(--fc-space-2)",
              padding: "var(--fc-space-3) var(--fc-space-3)",
              alignItems: "center",
              background: isPlayer ? "rgba(55,217,154,0.06)" : "transparent",
              borderBottom: "1px solid var(--fc-border)",
              borderLeft: isPlayer ? "2px solid var(--fc-emerald)" : "2px solid transparent",
            }}
          >
            <span style={{
              fontSize: "var(--fc-text-xs)", fontWeight: idx < 3 ? 700 : 400,
              color: idx < 3 ? "var(--fc-emerald)" : "var(--fc-text-3)",
            }}>
              {idx + 1}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: "var(--fc-text-sm)", fontWeight: isPlayer ? 700 : 500,
                color: isPlayer ? "var(--fc-emerald)" : "var(--fc-text)",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {club?.shortName ?? club?.name ?? row.clubId}
                {isPlayer && (
                  <span style={{ fontSize: 10, color: "var(--fc-emerald)", marginLeft: 4 }}>●</span>
                )}
              </div>
              {form.length > 0 && (
                <div style={{ display: "flex", gap: 2, marginTop: 2 }}>
                  {form.map((r, i) => <FormBadge key={i} r={r} />)}
                </div>
              )}
            </div>
            <span style={{ textAlign: "center", fontSize: "var(--fc-text-xs)", color: "var(--fc-text-2)" }}>{row.played}</span>
            <span style={{ textAlign: "center", fontSize: "var(--fc-text-xs)", color: "var(--fc-text-2)" }}>{row.won}</span>
            <span style={{ textAlign: "center", fontSize: "var(--fc-text-xs)", color: "var(--fc-text-2)" }}>{row.drawn}</span>
            <span style={{ textAlign: "center", fontSize: "var(--fc-text-xs)", color: "var(--fc-text-2)" }}>{row.lost}</span>
            <span style={{ textAlign: "center", fontSize: "var(--fc-text-xs)" }}>{GD(row)}</span>
            <span style={{
              textAlign: "right",
              fontFamily: "var(--fc-font-display)", fontWeight: 800,
              fontSize: "var(--fc-text-md)",
              color: isPlayer ? "var(--fc-emerald)" : "var(--fc-text)",
            }}>
              {row.points}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Résultats récents ───────────────────────────────────────────── */

function RecentResults({
  schedule,
  clubs,
}: {
  schedule: SeasonSchedule;
  clubs: { id: string; shortName: string; name: string }[];
}) {
  const clubMap = new Map(clubs.map(c => [c.id, c]));
  const played = schedule.fixtures
    .filter((f) => f.result !== null)
    .slice(-8)
    .reverse();

  if (played.length === 0) {
    return (
      <p style={{ color: "var(--fc-text-3)", fontSize: "var(--fc-text-sm)" }}>
        Aucun match joué.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-2)" }}>
      {played.map((f) => {
        const home = clubMap.get(f.homeClubId);
        const away = clubMap.get(f.awayClubId);
        const gs = f.result!.scoreHome;
        const ga = f.result!.scoreAway;
        return (
          <div
            key={f.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 48px 1fr",
              gap: "var(--fc-space-2)",
              alignItems: "center",
              padding: "var(--fc-space-2) var(--fc-space-3)",
              background: "var(--fc-surface-2)",
              borderRadius: "var(--fc-radius-sm)",
              fontSize: "var(--fc-text-sm)",
            }}
          >
            <span style={{ textAlign: "right", color: "var(--fc-text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {home?.shortName ?? home?.name ?? f.homeClubId}
            </span>
            <span style={{
              textAlign: "center",
              fontFamily: "var(--fc-font-display)", fontWeight: 800,
              color: "var(--fc-text)", fontSize: "var(--fc-text-md)",
            }}>
              {gs}–{ga}
            </span>
            <span style={{ color: "var(--fc-text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {away?.shortName ?? away?.name ?? f.awayClubId}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Page principale ─────────────────────────────────────────────── */

export default function WorldPage() {
  const { state, dispatch } = useGame();
  const { toast }           = useToast();
  const isLoading           = selectIsLoading(state);
  const player              = selectPlayer(state);
  const career              = selectCareer(state);

  const [simulating, setSimulating] = useState(false);

  if (isLoading) return <Spinner />;
  if (!player || !career || !state.save) {
    return (
      <div className="fc-page">
        <p style={{ color: "var(--fc-text-3)", textAlign: "center", paddingTop: "var(--fc-space-8)" }}>
          Aucune carrière active.
        </p>
      </div>
    );
  }

  const save   = state.save;
  const clubs  = save.world.clubs;
  const season = career.season;

  // Chercher le schedule de ligue actif (non académie)
  const leagueSchedule = save.world.schedules.find(
    (s) => s.competitionId !== "academy-eval" && s.season === season,
  );
  // Si phase académie, utiliser le schedule académie
  const academySchedule = save.world.schedules.find(
    (s) => s.competitionId === "academy-eval" && s.season === season,
  );
  const activeSchedule = leagueSchedule ?? academySchedule;

  // Classement actif
  const standingLeagueId = leagueSchedule?.competitionId ?? "academy-eval";
  const standing: StandingRow[] = save.world.standings[standingLeagueId] ?? [];

  // Prochaine journée non simulée
  const nextMatchday = activeSchedule
    ? (activeSchedule.fixtures.find((f) => f.result === null)?.matchday ?? null)
    : null;

  function handleSimulate() {
    if (!activeSchedule || !nextMatchday || simulating) return;
    setSimulating(true);

    try {
      const seasonSeed = `${save.meta.careerId}-s${season}`;
      const results = simulateMatchday(nextMatchday, activeSchedule, clubs, seasonSeed);

      dispatch({
        type: "SIMULATE_WORLD_MATCHDAY",
        matchday: nextMatchday,
        results,
        leagueId: standingLeagueId,
      });

      // Persister
      const updatedSchedule = applyResultsToSchedule(activeSchedule, results);
      const currentStanding = save.world.standings[standingLeagueId] ?? [];
      const newStanding = updateStanding(currentStanding, results, player!.contract.clubId);

      writeSave({
        ...save,
        world: {
          ...save.world,
          schedules: save.world.schedules.map((s) =>
            s.competitionId === standingLeagueId && s.season === season
              ? updatedSchedule
              : s,
          ),
          standings: {
            ...save.world.standings,
            [standingLeagueId]: newStanding,
          },
        },
        meta: { ...save.meta, savedAt: Date.now() },
      });

      toast(`Journée ${nextMatchday} simulée — ${results.length} match(s)`, "success");
    } catch (err) {
      console.error(err);
      toast("Erreur lors de la simulation", "error");
    } finally {
      setSimulating(false);
    }
  }

  const playerPos = standing.findIndex((r) => r.clubId === player.contract.clubId) + 1;

  return (
    <motion.div
      className="fc-page"
      variants={pageFade}
      initial="hidden"
      animate="visible"
    >
      {/* En-tête */}
      <div className="fc-section-header">
        <h1 className="fc-section-title">Monde</h1>
        <span className="fc-badge fc-badge--neutral">Saison {season}</span>
      </div>

      {/* Position du joueur */}
      {playerPos > 0 && (
        <div className="fc-card" style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "var(--fc-space-4) var(--fc-space-5)",
        }}>
          <div>
            <p style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>Mon classement</p>
            <p style={{
              fontFamily: "var(--fc-font-display)", fontWeight: 900,
              fontSize: "2rem", color: "var(--fc-emerald)", lineHeight: 1,
            }}>
              {playerPos}<span style={{ fontSize: "var(--fc-text-sm)", fontWeight: 500, marginLeft: 2, color: "var(--fc-text-3)" }}>e</span>
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>Points</p>
            <p style={{
              fontFamily: "var(--fc-font-display)", fontWeight: 800,
              fontSize: "var(--fc-text-xl)", color: "var(--fc-text)",
            }}>
              {standing.find((r) => r.clubId === player.contract.clubId)?.points ?? 0}
            </p>
          </div>
        </div>
      )}

      {/* Bouton simulation journée */}
      {nextMatchday !== null && (
        <button
          className="fc-btn fc-btn--secondary"
          style={{ width: "100%" }}
          onClick={handleSimulate}
          disabled={simulating}
        >
          {simulating
            ? "Simulation en cours…"
            : `Simuler journée ${nextMatchday}`}
        </button>
      )}

      {/* Classement */}
      <motion.div
        className="fc-card"
        variants={stagger}
        initial="hidden"
        animate="visible"
        style={{ padding: 0, overflow: "hidden" }}
      >
        <div style={{ padding: "var(--fc-space-4) var(--fc-space-4) 0" }}>
          <h2 style={{
            fontFamily: "var(--fc-font-display)", fontWeight: 700,
            fontSize: "var(--fc-text-md)", color: "var(--fc-text)",
          }}>
            Classement
          </h2>
        </div>
        {activeSchedule ? (
          <StandingsTable
            standing={standing}
            clubs={clubs}
            playerClubId={player.contract.clubId}
            schedule={activeSchedule}
          />
        ) : (
          <p style={{ padding: "var(--fc-space-4)", color: "var(--fc-text-3)", fontSize: "var(--fc-text-sm)" }}>
            Aucun championnat actif pour cette saison.
          </p>
        )}
      </motion.div>

      {/* Résultats récents */}
      {activeSchedule && (
        <motion.div
          className="fc-card"
          variants={itemFade}
          style={{ padding: "var(--fc-space-5)" }}
        >
          <h2 style={{
            fontFamily: "var(--fc-font-display)", fontWeight: 700,
            fontSize: "var(--fc-text-md)", color: "var(--fc-text)",
            marginBottom: "var(--fc-space-4)",
          }}>
            Derniers résultats
          </h2>
          <RecentResults schedule={activeSchedule} clubs={clubs} />
        </motion.div>
      )}

      <div style={{ height: "var(--fc-space-8)" }} />
    </motion.div>
  );
}
