"use client";

/**
 * FC CAREER — Étape 3 : Dashboard / Hub principal
 * Fiche joueur, objectifs de la semaine, prochains matchs, navigation.
 */

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useGame }     from "../game/hooks/useGame";
import { PlayerCard }  from "../game/components/PlayerCard";
import { StatBar }     from "../game/components/StatBar";
import { Button }      from "../game/components/Button";
import { EmptyState }  from "../game/components/EmptyState";
import { Spinner }     from "../game/components/LoadingState";
import { pageFade, stagger, itemFade } from "../game/design/animations";
import {
  selectPlayer, selectCareer, selectWallet,
  selectHasSave, selectIsLoading,
} from "../game/state/selectors";
import { weekToMonth, seasonLabel } from "../game/utils/dates";
import { formatMoney, overallTier } from "../game/utils/formatters";

export default function DashboardPage() {
  const { state } = useGame();
  const router    = useRouter();
  const isLoading = selectIsLoading(state);
  const hasSave   = selectHasSave(state);

  if (isLoading) return <Spinner />;

  if (!hasSave) {
    return (
      <EmptyState
        title="Aucune carrière trouvée"
        description="Commencez une nouvelle carrière pour vivre votre aventure."
        action={{ label: "Créer un joueur", onClick: () => router.push("/client/fc-career/create-player") }}
      />
    );
  }

  return <DashboardContent />;
}

function DashboardContent() {
  const { state } = useGame();
  const router    = useRouter();
  const player    = selectPlayer(state)!;
  const career    = selectCareer(state)!;
  const wallet    = selectWallet(state)!;

  const month     = weekToMonth(career.week);
  const season    = seasonLabel(career.season);

  const tier = overallTier(player.overall);

  return (
    <motion.div
      className="fc-page"
      variants={pageFade}
      initial="hidden"
      animate="visible"
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="fc-page-header">
        <h1 className="fc-page-title">{player.firstName} {player.lastName}</h1>
        <p className="fc-page-meta">
          {season} · Semaine {career.week} · {month} · Phase : <span className="fc-text-emerald">
            {career.phase === "academy" ? "Académie" : career.phase}
          </span>
        </p>
      </div>

      {/* ── Carte joueur ────────────────────────────────────────── */}
      <section className="fc-section">
        <PlayerCard player={player} />
      </section>

      {/* ── Tier + note ─────────────────────────────────────────── */}
      <motion.section
        className="fc-section fc-panel"
        variants={stagger}
        initial="hidden"
        animate="visible"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--fc-space-4)" }}
      >
        <motion.div variants={itemFade} className="fc-stat-hero">
          <span className="fc-stat-hero__value">{player.overall}</span>
          <span className="fc-stat-hero__label">Note globale</span>
        </motion.div>
        <motion.div variants={itemFade} className="fc-stat-hero">
          <span className="fc-stat-hero__value" style={{ color: "var(--fc-emerald)" }}>{player.potential}</span>
          <span className="fc-stat-hero__label">Potentiel</span>
        </motion.div>
        <motion.div variants={itemFade} className="fc-stat-hero">
          <span className="fc-stat-hero__value" style={{ color: "var(--fc-amber)" }}>{player.paPoints}</span>
          <span className="fc-stat-hero__label">PA disponibles</span>
        </motion.div>
      </motion.section>

      <div className="fc-divider" />

      {/* ── Condition ────────────────────────────────────────────── */}
      <section className="fc-section">
        <h2 className="fc-label" style={{ marginBottom: "var(--fc-space-3)" }}>Condition</h2>
        <div className="fc-panel fc-panel--sm" style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-3)" }}>
          <StatBar label="Forme"     value={player.condition.form}    />
          <StatBar label="Endurance" value={100 - player.condition.fatigue} max={100} />
          <StatBar label="Moral"     value={player.condition.morale}  />
        </div>
      </section>

      {/* ── Attributs clés ───────────────────────────────────────── */}
      <section className="fc-section">
        <h2 className="fc-label" style={{ marginBottom: "var(--fc-space-3)" }}>Attributs clés</h2>
        <div className="fc-panel fc-panel--sm" style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-3)" }}>
          <KeyAttrs player={player} />
        </div>
      </section>

      {/* ── Académie ─────────────────────────────────────────────── */}
      {career.phase === "academy" && career.academy && (
        <section className="fc-section">
          <h2 className="fc-label" style={{ marginBottom: "var(--fc-space-3)" }}>Académie</h2>
          <div className="fc-panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--fc-space-3)" }}>
              <span style={{ fontSize: "var(--fc-text-sm)", color: "var(--fc-text-2)" }}>Score d&apos;évaluation</span>
              <span style={{ fontFamily: "var(--fc-font-display)", fontWeight: 700, color: "var(--fc-emerald)", fontSize: "var(--fc-text-md)" }}>
                {career.academy.evaluationScore} / 100
              </span>
            </div>
            <div className="fc-progress">
              <div
                className="fc-progress__fill"
                style={{ width: `${career.academy.evaluationScore}%` }}
              />
            </div>
            <p style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", marginTop: "var(--fc-space-2)" }}>
              Seuil de promotion : {career.academy.promotionThreshold} points
            </p>
          </div>
        </section>
      )}

      {/* ── Finances ─────────────────────────────────────────────── */}
      <section className="fc-section">
        <h2 className="fc-label" style={{ marginBottom: "var(--fc-space-3)" }}>Finances</h2>
        <div className="fc-panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>Solde</p>
            <p style={{ fontFamily: "var(--fc-font-display)", fontWeight: 800, fontSize: "var(--fc-text-xl)", color: "var(--fc-text)" }}>
              {formatMoney(wallet.balance)}
            </p>
          </div>
          {wallet.weeklyWage > 0 && (
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>Salaire / sem.</p>
              <p style={{ fontFamily: "var(--fc-font-display)", fontWeight: 700, fontSize: "var(--fc-text-md)", color: "var(--fc-emerald)" }}>
                +{formatMoney(wallet.weeklyWage)}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Stats carrière ───────────────────────────────────────── */}
      <section className="fc-section">
        <h2 className="fc-label" style={{ marginBottom: "var(--fc-space-3)" }}>Statistiques</h2>
        <div className="fc-panel" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--fc-space-4)" }}>
          {[
            { label: "Matchs",  value: player.stats.totalAppearances },
            { label: "Buts",    value: player.stats.totalGoals },
            { label: "Passes D", value: player.stats.totalAssists },
          ].map(s => (
            <div key={s.label} className="fc-stat-hero">
              <span className="fc-stat-hero__value">{s.value}</span>
              <span className="fc-stat-hero__label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Position au classement ───────────────────────────────── */}
      <StandingWidget state={state} />

      {/* ── Actions ──────────────────────────────────────────────── */}
      <section className="fc-section" style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-3)" }}>
        <Button
          variant="primary"
          fullWidth
          size="lg"
          onClick={() => router.push("/client/fc-career/training")}
        >
          ⚽ Entraîner mes attributs
        </Button>
        <Button
          variant="secondary"
          fullWidth
          onClick={() => router.push("/client/fc-career/calendar")}
        >
          📅 Calendrier des matchs
        </Button>
        <Button
          variant="secondary"
          fullWidth
          onClick={() => router.push("/client/fc-career/world")}
        >
          🌍 Voir le classement
        </Button>
      </section>

      <div style={{ height: "var(--fc-space-8)" }} />
    </motion.div>
  );
}

import type { GameState } from "../game/state/gameReducer";
import type { Player } from "../game/domain/player";
import { positionFamily } from "../game/domain/player";

function KeyAttrs({ player }: { player: Player }) {
  const family = positionFamily(player.position);
  const a = player.attributes;

  const maps: Record<string, { label: string; value: number }[]> = {
    goalkeeper: [
      { label: "Réflexes",   value: a.gkReflexes },
      { label: "Positionnement", value: a.gkPositioning },
      { label: "Plongeon",   value: a.gkDiving },
      { label: "Maîtrise",   value: a.gkHandling },
      { label: "Distribution", value: a.gkDistribution },
    ],
    defender: [
      { label: "Déf. Aware", value: a.defAwareness },
      { label: "Tacle",      value: a.standingTackle },
      { label: "Tête",       value: a.headingAccuracy },
      { label: "Force",      value: a.strength },
      { label: "Vitesse",    value: a.sprintSpeed },
    ],
    midfielder: [
      { label: "Passe C.",   value: a.shortPassing },
      { label: "Vision",     value: a.vision },
      { label: "Endurance",  value: a.stamina },
      { label: "Dribble",    value: a.dribbling },
      { label: "Composure",  value: a.composure },
    ],
    attacker: [
      { label: "Finition",   value: a.finishing },
      { label: "Vitesse",    value: a.sprintSpeed },
      { label: "Position.",  value: a.attPositioning },
      { label: "Dribble",    value: a.dribbling },
      { label: "Tir",        value: a.shotPower },
    ],
  };

  const stats = maps[family] ?? maps.attacker;

  return (
    <>
      {stats.map(s => (
        <StatBar key={s.label} label={s.label} value={s.value} />
      ))}
    </>
  );
}

/* ── Widget classement ──────────────────────────────────────────── */
function StandingWidget({ state }: { state: GameState }) {
  const save   = state.save;
  const player = selectPlayer(state);
  const career = selectCareer(state);
  if (!save || !player || !career) return null;

  const season = career.season;
  const leagueSchedule = save.world.schedules.find(
    (s) => s.competitionId !== "academy-eval" && s.season === season,
  );
  const academySchedule = save.world.schedules.find(
    (s) => s.competitionId === "academy-eval" && s.season === season,
  );
  const activeSchedule  = leagueSchedule ?? academySchedule;
  const standingKey     = activeSchedule?.competitionId;
  if (!standingKey) return null;

  const standing = save.world.standings[standingKey] ?? [];
  const pos = standing.findIndex((r) => r.clubId === player.contract.clubId) + 1;
  if (pos === 0 || standing.length === 0) return null;

  const myRow = standing[pos - 1];
  const top3 = standing.slice(0, 3);

  return (
    <section className="fc-section">
      <h2 className="fc-label" style={{ marginBottom: "var(--fc-space-3)" }}>Classement</h2>
      <div className="fc-panel">
        {/* Ma position */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--fc-space-3)" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "var(--fc-space-2)" }}>
            <span style={{
              fontFamily: "var(--fc-font-display)", fontWeight: 900,
              fontSize: "1.8rem", color: "var(--fc-emerald)", lineHeight: 1,
            }}>{pos}</span>
            <span style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>
              / {standing.length}
            </span>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>Points</span>
            <p style={{ fontFamily: "var(--fc-font-display)", fontWeight: 800, color: "var(--fc-text)", fontSize: "var(--fc-text-lg)" }}>
              {myRow?.points ?? 0}
            </p>
          </div>
        </div>

        {/* Top 3 */}
        {top3.map((row, i) => {
          const club = save.world.clubs.find(c => c.id === row.clubId);
          const isMe = row.clubId === player.contract.clubId;
          return (
            <div
              key={row.clubId}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "var(--fc-space-1) 0",
                borderTop: i === 0 ? "1px solid var(--fc-border)" : undefined,
              }}
            >
              <div style={{ display: "flex", gap: "var(--fc-space-2)", alignItems: "center" }}>
                <span style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-emerald)", fontWeight: 700, width: 16 }}>
                  {i + 1}
                </span>
                <span style={{
                  fontSize: "var(--fc-text-sm)", fontWeight: isMe ? 700 : 400,
                  color: isMe ? "var(--fc-emerald)" : "var(--fc-text-2)",
                }}>
                  {club?.shortName ?? row.clubId}
                  {isMe && " ●"}
                </span>
              </div>
              <span style={{ fontSize: "var(--fc-text-sm)", fontWeight: 700, color: "var(--fc-text)" }}>
                {row.points}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
