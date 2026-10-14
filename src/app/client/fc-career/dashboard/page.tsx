"use client";

/**
 * FC CAREER — Dashboard (Hub hebdomadaire)
 * Point de contrôle unique du temps.
 * Le joueur : 1) planifie son entraînement, 2) joue le match de la semaine,
 * 3) clique "Terminer la semaine" → COMMIT_WEEK.
 */

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useGame }     from "../game/hooks/useGame";
import { useToast }    from "../game/components/Toast";
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
import { simulateMatch } from "../game/domain/matchEngine";
import type { MatchResult } from "../game/domain/match";
import type { Fixture }     from "../game/domain/season";
import type { GameState }   from "../game/state/gameReducer";
import type { Player }      from "../game/domain/player";
import { positionFamily }   from "../game/domain/player";

/* ── Page racine ─────────────────────────────────────────────────── */

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

/* ── Contenu principal ───────────────────────────────────────────── */

function DashboardContent() {
  const { state, dispatch } = useGame();
  const { toast }           = useToast();
  const router              = useRouter();

  const player    = selectPlayer(state)!;
  const career    = selectCareer(state)!;
  const wallet    = selectWallet(state)!;
  const save      = state.save!;
  const weekState = save.weekState ?? { trainingDone: false, trainingIntensity: null, matchPlayed: false };

  const month  = weekToMonth(career.week);
  const season = seasonLabel(career.season);

  // Match de la semaine (fixture correspondant à cette matchday)
  const schedule = save.world.schedules.find(s => s.season === career.season);
  const fixtures = schedule?.fixtures ?? [];
  const completedIds = new Set(Array.from((career.completedMatchIds ?? []) as unknown as string[]));
  const weekFixture  = fixtures.find(f => f.matchday === career.matchday && !completedIds.has(f.id)) ?? null;

  // Simulation locale
  const [simulating, setSimulating]   = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);

  /* — Jouer le match de la semaine --------------------------------- */
  const handlePlayMatch = useCallback(async () => {
    if (simulating || !weekFixture || !save || !player || !career) return;
    setSimulating(true);

    await new Promise(r => setTimeout(r, 600));

    const isHome       = weekFixture.homeClubId === player.contract.clubId;
    const opponentId   = isHome ? weekFixture.awayClubId : weekFixture.homeClubId;

    const result = simulateMatch({
      matchId:        weekFixture.id,
      season:         career.season,
      matchday:       weekFixture.matchday,
      player,
      playerClubId:   player.contract.clubId,
      opponentClubId: opponentId,
      isHome,
      competitionId:  weekFixture.competitionId,
    });

    // Appliquer le résultat (stats + PA)
    dispatch({ type: "APPLY_MATCH_RESULT", result });
    // Marquer le match joué dans weekState
    dispatch({ type: "MARK_MATCH_PLAYED" });

    // Journal : entrée automatique pour le match
    const scoreStr2 = isHome
      ? `${result.scoreHome} – ${result.scoreAway}`
      : `${result.scoreAway} – ${result.scoreHome}`;
    dispatch({
      type: "ADD_JOURNAL_ENTRY",
      entry: {
        id: `journal-match-${Date.now()}`,
        season: career.season,
        week: career.week,
        type: "match",
        title: `J${weekFixture.matchday} — ${scoreStr2}`,
        body: `Note ${result.playerRating}/10 · ${result.playerStats.goals} but(s) · ${result.playerStats.assists} passe(s) · ${result.playerStats.minutesPlayed} min`,
      },
    });

    // Fans : update basé sur le résultat
    const playerWon = isHome
      ? result.scoreHome > result.scoreAway
      : result.scoreAway > result.scoreHome;
    const fanRatingDelta = playerWon ? (result.playerStats.goals > 0 ? 3 : 1) : -1;
    const followersDelta = playerWon ? (result.playerStats.goals > 0 ? 50 : 20) : 0;
    dispatch({
      type: "UPDATE_FANS",
      fanRatingDelta,
      followersDelta,
    });

    setMatchResult(result);
    setSimulating(false);

    const scoreStr = isHome
      ? `${result.scoreHome} – ${result.scoreAway}`
      : `${result.scoreAway} – ${result.scoreHome}`;
    toast(`Match joué : ${scoreStr} · Note ${result.playerRating}/10`, "success");
  }, [simulating, weekFixture, save, player, career, dispatch, toast]);

  /* — Terminer la semaine ----------------------------------------- */
  const handleCommitWeek = useCallback(() => {
    if (career.week >= 38) {
      router.push("/client/fc-career/season-end");
      return;
    }
    if (!weekState.trainingDone) {
      toast("Planifiez votre entraînement avant de terminer la semaine", "warning");
      return;
    }
    dispatch({ type: "COMMIT_WEEK" });
    setMatchResult(null);
    const intensityLabel = { light: "Légère", normal: "Normale", intense: "Intense" }[weekState.trainingIntensity ?? "normal"];
    toast(`Semaine ${career.week} terminée — Entraînement ${intensityLabel}`, "success");
  }, [career.week, weekState, dispatch, toast, router]);

  const canCommit = weekState.trainingDone;

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
          {season} · Semaine {career.week} · {month} ·{" "}
          <span className="fc-text-emerald">{overallTier(player.overall)}</span>
        </p>
      </div>

      {/* ── Fiche joueur ────────────────────────────────────────── */}
      <section className="fc-section">
        <PlayerCard player={player} />
      </section>

      {/* ── Stats rapides ───────────────────────────────────────── */}
      <motion.section
        className="fc-section fc-panel"
        variants={stagger} initial="hidden" animate="visible"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--fc-space-4)" }}
      >
        {[
          { label: "Note globale", value: player.overall, color: "var(--fc-text)" },
          { label: "Potentiel",    value: player.potential, color: "var(--fc-emerald)" },
          { label: "PA dispo.",    value: player.paPoints,  color: "var(--fc-amber)" },
        ].map(s => (
          <motion.div key={s.label} variants={itemFade} className="fc-stat-hero">
            <span className="fc-stat-hero__value" style={{ color: s.color }}>{s.value}</span>
            <span className="fc-stat-hero__label">{s.label}</span>
          </motion.div>
        ))}
      </motion.section>

      <div className="fc-divider" />

      {/* ── Hub de la semaine ────────────────────────────────────── */}
      <section className="fc-section">
        <h2 className="fc-label" style={{ marginBottom: "var(--fc-space-3)" }}>Actions de la semaine</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-3)" }}>

          {/* 1 — Entraînement */}
          <WeekAction
            done={weekState.trainingDone}
            label="Entraînement"
            sub={weekState.trainingDone
              ? `Intensité : ${({ light: "Légère", normal: "Normale", intense: "Intense" })[weekState.trainingIntensity ?? "normal"]}`
              : "Choisissez votre intensité pour la semaine"
            }
            icon="💪"
            onAction={() => router.push("/client/fc-career/training")}
            actionLabel={weekState.trainingDone ? "Modifier" : "Planifier"}
          />

          {/* 2 — Match de la semaine */}
          {weekFixture ? (
            <WeekMatchCard
              fixture={weekFixture}
              playerClubId={player.contract.clubId}
              clubs={save.world.clubs}
              done={weekState.matchPlayed}
              result={matchResult}
              simulating={simulating}
              onPlay={handlePlayMatch}
            />
          ) : (
            <WeekAction
              done={true}
              label="Pas de match cette semaine"
              sub="Semaine de repos"
              icon="🏟️"
            />
          )}
        </div>
      </section>

      {/* ── Résultat du match (si joué ce tour) ─────────────────── */}
      <AnimatePresence>
        {matchResult && (
          <motion.section
            className="fc-section"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <MatchResultCard result={matchResult} player={player} />
          </motion.section>
        )}
      </AnimatePresence>

      {/* ── Terminer la semaine ──────────────────────────────────── */}
      <section className="fc-section">
        <Button
          variant="primary"
          fullWidth
          size="lg"
          onClick={handleCommitWeek}
          disabled={!canCommit}
          style={{
            opacity: canCommit ? 1 : 0.5,
            transition: "opacity 0.2s",
          }}
        >
          {career.week >= 38 ? "🏆 Fin de saison →" : `Terminer la semaine ${career.week} →`}
        </Button>
        {!canCommit && (
          <p style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", textAlign: "center", marginTop: "var(--fc-space-2)" }}>
            Planifiez votre entraînement pour terminer la semaine
          </p>
        )}
      </section>

      <div className="fc-divider" />

      {/* ── Condition ─────────────────────────────────────────────── */}
      <section className="fc-section">
        <h2 className="fc-label" style={{ marginBottom: "var(--fc-space-3)" }}>Condition</h2>
        <div className="fc-panel fc-panel--sm" style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-3)" }}>
          <StatBar label="Forme"     value={player.condition.form}           />
          <StatBar label="Fraîcheur" value={100 - player.condition.fatigue}  />
          <StatBar label="Moral"     value={player.condition.morale}         />
        </div>
      </section>

      {/* ── Attributs clés ───────────────────────────────────────── */}
      <section className="fc-section">
        <h2 className="fc-label" style={{ marginBottom: "var(--fc-space-3)" }}>Attributs clés</h2>
        <div className="fc-panel fc-panel--sm" style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-3)" }}>
          <KeyAttrs player={player} />
        </div>
      </section>

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
            { label: "Matchs",   value: player.stats.totalAppearances },
            { label: "Buts",     value: player.stats.totalGoals },
            { label: "Passes D", value: player.stats.totalAssists },
          ].map(s => (
            <div key={s.label} className="fc-stat-hero">
              <span className="fc-stat-hero__value">{s.value}</span>
              <span className="fc-stat-hero__label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Classement ───────────────────────────────────────────── */}
      <StandingWidget state={state} />

      {/* ── Navigation secondaire ────────────────────────────────── */}
      <section className="fc-section" style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-2)" }}>
        <Button variant="secondary" fullWidth onClick={() => router.push("/client/fc-career/calendar")}>
          📅 Calendrier de la saison
        </Button>
        <Button variant="secondary" fullWidth onClick={() => router.push("/client/fc-career/world")}>
          🌍 Monde & classements
        </Button>
        <Button variant="secondary" fullWidth onClick={() => router.push("/client/fc-career/career")}>
          🏆 Historique de carrière
        </Button>
        <Button variant="secondary" fullWidth onClick={() => router.push("/client/fc-career/coach")}>
          🧑‍💼 Mon coach
        </Button>
      </section>

      <div style={{ height: "var(--fc-space-8)" }} />
    </motion.div>
  );
}

/* ── Carte action de la semaine ──────────────────────────────────── */

function WeekAction({
  done, label, sub, icon, onAction, actionLabel,
}: {
  done: boolean;
  label: string;
  sub: string;
  icon: string;
  onAction?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="fc-panel" style={{
      display: "flex", alignItems: "center", gap: "var(--fc-space-3)",
    }}>
      <span style={{
        fontSize: "1.5rem", minWidth: 36, textAlign: "center",
        opacity: done ? 1 : 0.5,
      }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 700, fontSize: "var(--fc-text-sm)", color: "var(--fc-text)", margin: 0 }}>
          {label}
          {done && (
            <span style={{
              marginLeft: "var(--fc-space-2)", fontSize: "var(--fc-text-xs)",
              color: "var(--fc-emerald)", fontWeight: 600,
            }}>✓</span>
          )}
        </p>
        <p style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", margin: 0, marginTop: 2 }}>{sub}</p>
      </div>
      {onAction && actionLabel && (
        <button
          onClick={onAction}
          style={{
            flexShrink: 0,
            padding: "6px 14px",
            borderRadius: "var(--fc-radius-sm)",
            border: `1px solid ${done ? "var(--fc-border-mid)" : "var(--fc-emerald)"}`,
            background: done ? "var(--fc-surface-3)" : "var(--fc-emerald-10)",
            color: done ? "var(--fc-text-2)" : "var(--fc-emerald)",
            fontSize: "var(--fc-text-xs)", fontWeight: 700, cursor: "pointer",
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/* ── Carte match de la semaine ───────────────────────────────────── */

function WeekMatchCard({
  fixture, playerClubId, clubs, done, result, simulating, onPlay,
}: {
  fixture: Fixture;
  playerClubId: string;
  clubs: { id: string; shortName: string; name: string }[];
  done: boolean;
  result: MatchResult | null;
  simulating: boolean;
  onPlay: () => void;
}) {
  const homeClub = clubs.find(c => c.id === fixture.homeClubId);
  const awayClub = clubs.find(c => c.id === fixture.awayClubId);
  const homeLabel = homeClub?.shortName ?? fixture.homeClubId;
  const awayLabel = awayClub?.shortName ?? fixture.awayClubId;
  const isHome    = fixture.homeClubId === playerClubId;

  return (
    <div className="fc-panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--fc-space-2)" }}>
        <p className="fc-panel__label" style={{ margin: 0 }}>
          Match J{fixture.matchday}
          {done && <span style={{ marginLeft: 8, color: "var(--fc-emerald)", fontWeight: 700 }}>✓ Joué</span>}
        </p>
        <span style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>
          {isHome ? "Domicile" : "Extérieur"}
        </span>
      </div>

      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: "var(--fc-space-4)", padding: "var(--fc-space-3) 0",
      }}>
        <span style={{
          fontWeight: fixture.homeClubId === playerClubId ? 800 : 400,
          color: fixture.homeClubId === playerClubId ? "var(--fc-emerald)" : "var(--fc-text-2)",
          fontSize: "var(--fc-text-sm)",
        }}>{homeLabel}</span>

        {result ? (
          <span style={{
            fontFamily: "var(--fc-font-display)", fontWeight: 900,
            fontSize: "var(--fc-text-xl)", color: "var(--fc-text)",
          }}>
            {result.scoreHome} – {result.scoreAway}
          </span>
        ) : (
          <span style={{ color: "var(--fc-text-3)", fontSize: "var(--fc-text-sm)" }}>vs</span>
        )}

        <span style={{
          fontWeight: fixture.awayClubId === playerClubId ? 800 : 400,
          color: fixture.awayClubId === playerClubId ? "var(--fc-emerald)" : "var(--fc-text-2)",
          fontSize: "var(--fc-text-sm)",
        }}>{awayLabel}</span>
      </div>

      {!done && (
        <Button
          variant="primary"
          fullWidth
          onClick={onPlay}
          disabled={simulating}
          style={{ marginTop: "var(--fc-space-2)" }}
        >
          {simulating ? "Simulation…" : "⚽ Jouer le match"}
        </Button>
      )}
    </div>
  );
}

/* ── Résumé du match ─────────────────────────────────────────────── */

function MatchResultCard({ result, player }: { result: MatchResult; player: Player }) {
  const myGoals   = result.playerStats.goals;
  const myAssists = result.playerStats.assists;
  const rating    = result.playerRating;
  const ratingColor = rating >= 7.5 ? "var(--fc-emerald)" : rating >= 6 ? "var(--fc-amber)" : "var(--fc-coral)";

  return (
    <div className="fc-panel" style={{ borderTop: `3px solid var(--fc-emerald)` }}>
      <p className="fc-panel__label">Résumé du match</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--fc-space-3)", marginTop: "var(--fc-space-3)" }}>
        <div className="fc-stat-hero">
          <span className="fc-stat-hero__value" style={{ color: ratingColor }}>{rating.toFixed(1)}</span>
          <span className="fc-stat-hero__label">Note</span>
        </div>
        <div className="fc-stat-hero">
          <span className="fc-stat-hero__value">{myGoals}</span>
          <span className="fc-stat-hero__label">Buts</span>
        </div>
        <div className="fc-stat-hero">
          <span className="fc-stat-hero__value">{myAssists}</span>
          <span className="fc-stat-hero__label">Passes D</span>
        </div>
      </div>
      {result.paEarned > 0 && (
        <p style={{
          marginTop: "var(--fc-space-3)", fontSize: "var(--fc-text-xs)",
          color: "var(--fc-emerald)", fontWeight: 700, textAlign: "center",
        }}>
          +{result.paEarned} PA gagnés
        </p>
      )}
    </div>
  );
}

/* ── Attributs clés par poste ────────────────────────────────────── */

function KeyAttrs({ player }: { player: Player }) {
  const family = positionFamily(player.position);
  const a = player.attributes;
  const maps: Record<string, { label: string; value: number }[]> = {
    goalkeeper: [
      { label: "Réflexes",       value: a.gkReflexes },
      { label: "Positionnement", value: a.gkPositioning },
      { label: "Plongeon",       value: a.gkDiving },
      { label: "Prise en main",  value: a.gkHandling },
      { label: "Distribution",   value: a.gkDistribution },
    ],
    defender: [
      { label: "Déf. Aware", value: a.defAwareness },
      { label: "Tacle",      value: a.standingTackle },
      { label: "Tête",       value: a.headingAccuracy },
      { label: "Force",      value: a.strength },
      { label: "Vitesse",    value: a.sprintSpeed },
    ],
    midfielder: [
      { label: "Passe courte", value: a.shortPassing },
      { label: "Vision",       value: a.vision },
      { label: "Endurance",    value: a.stamina },
      { label: "Dribble",      value: a.dribbling },
      { label: "Sang-froid",   value: a.composure },
    ],
    attacker: [
      { label: "Finition",     value: a.finishing },
      { label: "Vitesse",      value: a.sprintSpeed },
      { label: "Placement",    value: a.attPositioning },
      { label: "Dribble",      value: a.dribbling },
      { label: "Puissance tir",value: a.shotPower },
    ],
  };
  const stats = maps[family] ?? maps.attacker;
  return (
    <>
      {stats.map(s => <StatBar key={s.label} label={s.label} value={s.value} />)}
    </>
  );
}

/* ── Widget classement ──────────────────────────────────────────── */

function StandingWidget({ state }: { state: GameState }) {
  const save   = state.save;
  const player = selectPlayer(state);
  const career = selectCareer(state);
  if (!save || !player || !career) return null;

  const activeSchedule = save.world.schedules.find(s => s.season === career.season);
  const standingKey    = activeSchedule?.competitionId;
  if (!standingKey) return null;

  const standing = save.world.standings[standingKey] ?? [];
  const pos      = standing.findIndex(r => r.clubId === player.contract.clubId) + 1;
  if (pos === 0 || standing.length === 0) return null;

  const myRow = standing[pos - 1];
  const top3  = standing.slice(0, 3);

  return (
    <section className="fc-section">
      <h2 className="fc-label" style={{ marginBottom: "var(--fc-space-3)" }}>Classement</h2>
      <div className="fc-panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--fc-space-3)" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "var(--fc-space-2)" }}>
            <span style={{ fontFamily: "var(--fc-font-display)", fontWeight: 900, fontSize: "1.8rem", color: "var(--fc-emerald)", lineHeight: 1 }}>
              {pos}
            </span>
            <span style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>/ {standing.length}</span>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>Points</span>
            <p style={{ fontFamily: "var(--fc-font-display)", fontWeight: 800, color: "var(--fc-text)", fontSize: "var(--fc-text-lg)" }}>
              {myRow?.points ?? 0}
            </p>
          </div>
        </div>
        {top3.map((row, i) => {
          const club = save.world.clubs.find(c => c.id === row.clubId);
          const isMe = row.clubId === player.contract.clubId;
          return (
            <div key={row.clubId} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "var(--fc-space-1) 0",
              borderTop: i === 0 ? "1px solid var(--fc-border)" : undefined,
            }}>
              <div style={{ display: "flex", gap: "var(--fc-space-2)", alignItems: "center" }}>
                <span style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-emerald)", fontWeight: 700, width: 16 }}>{i + 1}</span>
                <span style={{ fontSize: "var(--fc-text-sm)", fontWeight: isMe ? 700 : 400, color: isMe ? "var(--fc-emerald)" : "var(--fc-text-2)" }}>
                  {club?.shortName ?? row.clubId}{isMe && " ●"}
                </span>
              </div>
              <span style={{ fontSize: "var(--fc-text-sm)", fontWeight: 700, color: "var(--fc-text)" }}>{row.points}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
