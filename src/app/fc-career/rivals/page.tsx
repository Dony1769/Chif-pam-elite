"use client";

/**
 * FC CAREER — Rivaux évolutifs
 * Suivi des joueurs du monde qui évoluent en parallèle.
 */

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useGame }  from "../game/hooks/useGame";
import { useToast } from "../game/components/Toast";
import { selectPlayer, selectCareer } from "../game/state/selectors";
import { writeSave } from "../game/persistence/saveRepository";
import {
  RELATION_LABELS,
  RELATION_COLORS,
  compareWithRival,
  type PlayerRival,
} from "../game/domain/rivals";
import { getAllWorldPlayers } from "../game/data/worldPlayers";
import { pageFade, stagger, itemFade } from "../game/design/animations";

/* ── Composant RivalCard ──────────────────────────────────────────── */

function RivalCard({ rival, playerOverall, playerGoals, playerRating }: {
  rival: PlayerRival;
  playerOverall: number;
  playerGoals: number;
  playerRating: number;
}) {
  const comparison = compareWithRival(rival, playerOverall, playerGoals, playerRating);
  const color = RELATION_COLORS[rival.relation];

  return (
    <motion.div
      variants={itemFade}
      className="fc-card"
      style={{
        padding: "var(--fc-space-4)",
        opacity: rival.retired ? 0.5 : 1,
        borderLeft: `3px solid ${color}`,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--fc-space-3)", marginBottom: "var(--fc-space-3)" }}>
        <div style={{
          width: 42, height: 42, borderRadius: "50%",
          background: `${color}22`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--fc-font-display)", fontWeight: 900,
          fontSize: "var(--fc-text-md)", color,
        }}>
          {rival.name.slice(0, 1)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--fc-font-display)", fontWeight: 700, fontSize: "var(--fc-text-sm)", color: "var(--fc-text)" }}>
            {rival.name}
            {rival.retired && <span style={{ color: "var(--fc-text-3)", marginLeft: 6 }}>(Retraité)</span>}
          </div>
          <div style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>
            {rival.position} · Apparu saison {rival.appearedSeason}
          </div>
        </div>
        <span style={{
          fontSize: "var(--fc-text-xs)", fontWeight: 600,
          color, padding: "2px 8px",
          border: `1px solid ${color}`,
          borderRadius: "var(--fc-radius-sm)",
        }}>
          {RELATION_LABELS[rival.relation]}
        </span>
      </div>

      {/* Comparaison */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "var(--fc-space-2)", alignItems: "center" }}>
        {/* Joueur */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", marginBottom: 4 }}>Toi</div>
          <div style={{ fontFamily: "var(--fc-font-display)", fontWeight: 900, fontSize: "1.4rem", color: comparison.playerLeading ? "var(--fc-emerald)" : "var(--fc-text)" }}>
            {comparison.playerOverall}
          </div>
          <div style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>Overall</div>
        </div>

        <div style={{ textAlign: "center", color: "var(--fc-text-3)", fontSize: "var(--fc-text-sm)" }}>VS</div>

        {/* Rival */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", marginBottom: 4 }}>{rival.name.split(" ")[1] ?? rival.name}</div>
          <div style={{ fontFamily: "var(--fc-font-display)", fontWeight: 900, fontSize: "1.4rem", color: !comparison.playerLeading ? color : "var(--fc-text)" }}>
            {comparison.rivalOverall}
          </div>
          <div style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>Overall</div>
        </div>
      </div>

      {/* Stats saison */}
      {rival.lastSnapshot && (
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--fc-space-2)",
          marginTop: "var(--fc-space-3)",
          padding: "var(--fc-space-3)",
          background: "var(--fc-surface-2)",
          borderRadius: "var(--fc-radius-sm)",
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 700, fontSize: "var(--fc-text-sm)", color: "var(--fc-text)" }}>{rival.lastSnapshot.goals}</div>
            <div style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>Buts</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 700, fontSize: "var(--fc-text-sm)", color: "var(--fc-text)" }}>{rival.lastSnapshot.appearances}</div>
            <div style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>Matchs</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 700, fontSize: "var(--fc-text-sm)", color: "var(--fc-text)" }}>{rival.lastSnapshot.avgRating.toFixed(1)}</div>
            <div style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>Note moy.</div>
          </div>
        </div>
      )}

      {/* Intensité rivalité */}
      <div style={{ marginTop: "var(--fc-space-3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>Intensité rivalité</span>
          <span style={{ fontSize: "var(--fc-text-xs)", fontWeight: 600, color }}>{rival.intensityScore}/100</span>
        </div>
        <div style={{ height: 4, background: "var(--fc-surface-2)", borderRadius: 2 }}>
          <div style={{ height: "100%", width: `${rival.intensityScore}%`, background: color, borderRadius: 2, transition: "width 0.6s" }} />
        </div>
      </div>
    </motion.div>
  );
}

/* ── Page principale ─────────────────────────────────────────────── */
export default function RivalsPage() {
  const { state, dispatch } = useGame();
  const { toast }           = useToast();

  const player = selectPlayer(state);
  const career = selectCareer(state);
  const save   = state.save;

  // Initialiser les rivaux si nécessaires
  useEffect(() => {
    if (!save || !player) return;
    if ((save.rivals ?? []).length === 0) {
      dispatch({ type: "INIT_RIVALS" });
    }
  }, [save, player, dispatch]);

  if (!player || !career || !save) {
    return (
      <div className="fc-page">
        <p style={{ color: "var(--fc-text-3)", textAlign: "center", paddingTop: "var(--fc-space-8)" }}>
          Chargement…
        </p>
      </div>
    );
  }

  const rivals: PlayerRival[] = save.rivals ?? [];
  const active  = rivals.filter(r => !r.retired);
  const retired = rivals.filter(r => r.retired);

  const currentSeasonStats = player.stats.seasons.find(s => s.season === career.season);
  const playerGoals  = currentSeasonStats?.goals ?? 0;
  const playerRating = currentSeasonStats?.avgRating ?? 0;

  return (
    <motion.div className="fc-page" variants={pageFade} initial="hidden" animate="visible">
      {/* En-tête */}
      <div className="fc-section-header">
        <h1 className="fc-section-title">Rivaux évolutifs</h1>
        <span className="fc-badge fc-badge--neutral">{active.length} actifs</span>
      </div>

      {/* Intro */}
      <div className="fc-card" style={{ padding: "var(--fc-space-4)" }}>
        <p style={{ fontSize: "var(--fc-text-sm)", color: "var(--fc-text-2)", lineHeight: 1.6 }}>
          Ces joueurs évoluent dans le monde en même temps que toi. Blessures, progressions, retraites —
          leur carrière se déroule en parallèle. Reste attentif à ta position par rapport à eux.
        </p>
      </div>

      {/* Rivaux actifs */}
      {rivals.length === 0 && (
        <div className="fc-card" style={{ padding: "var(--fc-space-6)", textAlign: "center" }}>
          <p style={{ color: "var(--fc-text-3)" }}>Aucun rival assigné encore. Reviens après ta première semaine de jeu.</p>
        </div>
      )}

      {active.length > 0 && (
        <motion.div variants={stagger} initial="hidden" animate="visible" style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-3)" }}>
          {active.map(rival => (
            <RivalCard
              key={rival.worldPlayerId}
              rival={rival}
              playerOverall={player.overall}
              playerGoals={playerGoals}
              playerRating={playerRating}
            />
          ))}
        </motion.div>
      )}

      {/* Rivaux retraités */}
      {retired.length > 0 && (
        <>
          <h2 style={{ fontFamily: "var(--fc-font-display)", fontWeight: 700, fontSize: "var(--fc-text-md)", color: "var(--fc-text-3)", marginTop: "var(--fc-space-4)" }}>
            Retraités
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-3)" }}>
            {retired.map(rival => (
              <RivalCard
                key={rival.worldPlayerId}
                rival={rival}
                playerOverall={player.overall}
                playerGoals={playerGoals}
                playerRating={playerRating}
              />
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}
