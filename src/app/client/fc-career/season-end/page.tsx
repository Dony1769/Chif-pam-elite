"use client";

/**
 * FC CAREER — Page : Fin de saison
 * Évaluation académique + transition vers la saison suivante.
 */

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useGame }    from "../game/hooks/useGame";
import { useToast }   from "../game/components/Toast";
import { selectPlayer, selectCareer } from "../game/state/selectors";
import type { GameSaveV1 } from "../game/persistence/saveSchema";
import { writeSave }  from "../game/persistence/saveRepository";
import {
  computeSeasonEvaluation,
  buildSeasonSummary,
  prepareNextSeason,
  getStageLabel,
} from "../game/domain/seasonEnd";
import type { EvaluationResult } from "../game/domain/seasonEnd";
import { pageFade, stagger, itemFade } from "../game/design/animations";

/* ── Helpers ─────────────────────────────────────────────────────── */

function scoreColor(score: number): string {
  if (score >= 80) return "var(--fc-emerald)";
  if (score >= 50) return "var(--fc-amber)";
  return "var(--fc-coral)";
}

function verdictLabel(verdict: EvaluationResult["verdict"]): string {
  switch (verdict) {
    case "promotion":  return "Promotion";
    case "maintained": return "Maintien";
    case "relegated":  return "Relégation";
  }
}

function verdictBadgeClass(verdict: EvaluationResult["verdict"]): string {
  switch (verdict) {
    case "promotion":  return "fc-badge fc-badge--pos";
    case "maintained": return "fc-badge fc-badge--neutral";
    case "relegated":  return "fc-badge fc-badge--warn";
  }
}

/* ── ScoreArc : arc SVG animé ────────────────────────────────────── */
function ScoreArc({ score }: { score: number }) {
  const R = 52;
  const C = 2 * Math.PI * R;
  const offset = C - (score / 100) * C;
  const color = scoreColor(score);

  return (
    <div style={{ position: "relative", width: 140, height: 140, margin: "0 auto" }}>
      <svg width="140" height="140" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="70" cy="70" r={R} fill="none" stroke="var(--fc-surface-2)" strokeWidth="10" />
        <motion.circle
          cx="70" cy="70" r={R}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: "easeOut", delay: 0.3 }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <motion.span
          style={{
            fontFamily: "var(--fc-font-display)", fontWeight: 900,
            fontSize: "2.4rem", color, lineHeight: 1,
          }}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          {score}
        </motion.span>
        <span style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>/100</span>
      </div>
    </div>
  );
}

/* ── Aperçu saison suivante ──────────────────────────────────────── */
const STAGE_NEXT: Record<string, string> = {
  youth: "u18", u18: "u21", u21: "reserve", reserve: "professional",
};

function NextSeasonPreview({
  verdict,
  currentStage,
  newAge,
}: {
  verdict: EvaluationResult["verdict"];
  currentStage: string;
  newAge: number;
}) {
  const nextStage = verdict === "promotion"
    ? (STAGE_NEXT[currentStage] ?? "professional")
    : currentStage;

  const nextLabel = getStageLabel(nextStage as Parameters<typeof getStageLabel>[0]);
  const isPromo   = verdict === "promotion";
  const isPro     = nextStage === "professional";

  return (
    <div
      className="fc-card"
      style={{
        padding: "var(--fc-space-5)",
        borderColor: isPromo ? "rgba(55,217,154,0.25)" : "var(--fc-border)",
      }}
    >
      <h2 style={{
        fontFamily: "var(--fc-font-display)", fontWeight: 700,
        fontSize: "var(--fc-text-md)", color: "var(--fc-text)",
        marginBottom: "var(--fc-space-4)",
      }}>
        Saison suivante
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "var(--fc-text-sm)", color: "var(--fc-text-3)" }}>Niveau</span>
          <span style={{
            fontSize: "var(--fc-text-sm)", fontWeight: 600,
            color: isPromo ? "var(--fc-emerald)" : "var(--fc-text)",
          }}>{nextLabel}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "var(--fc-text-sm)", color: "var(--fc-text-3)" }}>Âge</span>
          <span style={{ fontSize: "var(--fc-text-sm)", fontWeight: 600, color: "var(--fc-text)" }}>
            {newAge} ans
          </span>
        </div>

        {isPro && (
          <div style={{
            marginTop: "var(--fc-space-2)",
            padding: "var(--fc-space-3)",
            background: "rgba(55,217,154,0.06)",
            borderRadius: "var(--fc-radius-sm)",
            border: "1px solid rgba(55,217,154,0.2)",
          }}>
            <p style={{
              fontSize: "var(--fc-text-sm)", color: "var(--fc-emerald)",
              fontFamily: "var(--fc-font-display)", fontWeight: 700,
            }}>
              🏆 Passage en professionnel !
            </p>
            <p style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", marginTop: 4 }}>
              Tu intègres l'équipe première. Une nouvelle aventure commence.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Page principale ─────────────────────────────────────────────── */
export default function SeasonEndPage() {
  const { state, dispatch } = useGame();
  const { toast }           = useToast();
  const router              = useRouter();

  const player = selectPlayer(state);
  const career = selectCareer(state);
  const save: GameSaveV1 | null = state.save;

  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [confirming, setConfirming] = useState(false);
  const evalDone = useRef(false);

  /* Calcul de l'évaluation une seule fois */
  useEffect(() => {
    if (!player || !career || !save || evalDone.current) return;
    const currentSchedule = save.world.schedules.find(
      (s) => s.season === career.season,
    );
    if (!currentSchedule) return;
    evalDone.current = true;
    const result = computeSeasonEvaluation({
      player,
      season: career.season,
      schedule: currentSchedule,
      matchResults: save.world.lastMatchResults,
    });
    setEvaluation(result);
  }, [player, career, save]);

  /* Confirmation : appliquer END_SEASON */
  function handleConfirm() {
    if (!player || !career || !save || !evaluation || confirming) return;
    setConfirming(true);

    const summary = buildSeasonSummary(player, career, evaluation);
    const setup   = prepareNextSeason(career.id, player, career, evaluation.verdict);

    dispatch({ type: "END_SEASON", setup, summary, paBonus: evaluation.paBonus });

    // Journal : entrée de fin de saison
    dispatch({
      type: "ADD_JOURNAL_ENTRY",
      entry: {
        id: `journal-season-${career.season}-${Date.now()}`,
        season: career.season,
        week: career.week,
        type: "milestone",
        title: `Fin de saison ${career.season} — ${evaluation.verdict === "promotion" ? "Promotion !" : evaluation.verdict === "relegated" ? "Relégation" : "Maintien"}`,
        body: `Score d'évaluation : ${evaluation.score}/100 · +${evaluation.paBonus} PA`,
      },
    });

    // Awards : distinction si excellent
    const currentSeasonStats = player.stats.seasons.find(s => s.season === career.season);
    if (currentSeasonStats && currentSeasonStats.avgRating >= 7.5) {
      dispatch({
        type: "ADD_JOURNAL_ENTRY",
        entry: {
          id: `journal-award-${career.season}-${Date.now()}`,
          season: career.season,
          week: career.week,
          type: "award",
          title: `Joueur de la saison ${career.season}`,
          body: `Note moyenne ${currentSeasonStats.avgRating.toFixed(1)}/10 · ${currentSeasonStats.goals} buts · ${currentSeasonStats.assists} passes`,
        },
      });
    }

    /* Construire la sauvegarde mise à jour et la persister */
    const newAcademy = setup.newAcademyStage
      ? { stage: setup.newAcademyStage, evaluationScore: 50, promotionThreshold: 80, weeksInStage: 0 }
      : null;

    const updatedSave = {
      ...save,
      player: {
        ...player,
        age: setup.newAge,
        paPoints: player.paPoints + evaluation.paBonus,
        progressionHistory: [
          ...player.progressionHistory,
          {
            season: career.season,
            overall: player.overall,
            potential: player.potential,
            paPoints: player.paPoints,
          },
        ],
      },
      career: {
        ...career,
        season: career.season + 1,
        week: 1,
        matchday: 1,
        phase: setup.newPhase,
        academy: newAcademy,
        completedMatchIds: [] as unknown as string[],
        seasonSummaries: [...career.seasonSummaries, summary],
      },
      world: {
        ...save.world,
        schedules: setup.newSchedule
          ? [...save.world.schedules, setup.newSchedule]
          : save.world.schedules,
      },
      meta: { ...save.meta, savedAt: Date.now() },
    };

    writeSave(updatedSave as Parameters<typeof writeSave>[0]);

    toast("Saison terminée — bonne suite !", "success");
    router.push("/client/fc-career/dashboard");
  }

  /* Chargement */
  if (!player || !career || !save) {
    return (
      <div className="fc-page">
        <p style={{ color: "var(--fc-text-3)", textAlign: "center", paddingTop: "var(--fc-space-8)" }}>
          Chargement…
        </p>
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="fc-page">
        <p style={{ color: "var(--fc-text-3)", textAlign: "center", paddingTop: "var(--fc-space-8)" }}>
          Calcul de l'évaluation…
        </p>
      </div>
    );
  }

  const currentStage = career.academy?.stage ?? "reserve";
  const stageLabel   = getStageLabel(currentStage);

  return (
    <motion.div
      className="fc-page"
      variants={pageFade}
      initial="hidden"
      animate="visible"
    >
      {/* En-tête */}
      <div className="fc-section-header">
        <h1 className="fc-section-title">Fin de saison {career.season}</h1>
        <span className="fc-badge fc-badge--neutral">{stageLabel}</span>
      </div>

      {/* Score d'évaluation */}
      <div className="fc-card" style={{ textAlign: "center", padding: "var(--fc-space-6)" }}>
        <p style={{
          fontSize: "var(--fc-text-sm)", color: "var(--fc-text-3)",
          marginBottom: "var(--fc-space-4)",
        }}>
          Évaluation du coach
        </p>

        <ScoreArc score={evaluation.score} />

        <div style={{ marginTop: "var(--fc-space-4)" }}>
          <span
            className={verdictBadgeClass(evaluation.verdict)}
            style={{ fontSize: "var(--fc-text-md)", padding: "4px 14px" }}
          >
            {verdictLabel(evaluation.verdict)}
          </span>
        </div>

        {evaluation.paBonus > 0 && (
          <motion.p
            style={{
              marginTop: "var(--fc-space-3)",
              color: "var(--fc-emerald)",
              fontFamily: "var(--fc-font-display)",
              fontWeight: 700, fontSize: "var(--fc-text-md)",
            }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
          >
            +{evaluation.paBonus} PA bonus
          </motion.p>
        )}
      </div>

      {/* Points clés */}
      <motion.div
        className="fc-card"
        variants={stagger}
        initial="hidden"
        animate="visible"
        style={{ padding: "var(--fc-space-5)" }}
      >
        <h2 style={{
          fontFamily: "var(--fc-font-display)", fontWeight: 700,
          fontSize: "var(--fc-text-md)", color: "var(--fc-text)",
          marginBottom: "var(--fc-space-4)",
        }}>
          Points clés
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-2)" }}>
          {evaluation.highlights.map((h, i) => (
            <motion.div
              key={i}
              variants={itemFade}
              style={{
                display: "flex", alignItems: "flex-start", gap: "var(--fc-space-3)",
                padding: "var(--fc-space-3)",
                background: "var(--fc-surface-2)",
                borderRadius: "var(--fc-radius-sm)",
              }}
            >
              <span style={{ color: "var(--fc-emerald)", flexShrink: 0, marginTop: 1 }}>◆</span>
              <span style={{ fontSize: "var(--fc-text-sm)", color: "var(--fc-text-2)", lineHeight: 1.5 }}>
                {h}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Aperçu saison suivante */}
      <NextSeasonPreview
        verdict={evaluation.verdict}
        currentStage={currentStage}
        newAge={player.age + 1}
      />

      {/* Bouton de confirmation */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        style={{ paddingBottom: "var(--fc-space-8)" }}
      >
        <button
          className="fc-btn fc-btn--primary"
          style={{ width: "100%", marginTop: "var(--fc-space-4)" }}
          onClick={handleConfirm}
          disabled={confirming}
        >
          {confirming ? "Transition en cours…" : "Commencer la saison suivante →"}
        </button>

        {/* Retraite : disponible si ≥ 35 ans */}
        {player.age >= 35 && (
          <button
            className="fc-btn fc-btn--secondary"
            style={{ width: "100%", marginTop: "var(--fc-space-2)", opacity: 0.7 }}
            onClick={() => {
              if (!career || !save) return;
              const summary = buildSeasonSummary(player, career, evaluation!);
              dispatch({
                type: "END_SEASON",
                setup: { ...prepareNextSeason(career.id, player, career, "maintained"), newPhase: "retired" as import("../game/domain/career").CareerPhase },
                summary,
                paBonus: 0,
              });
              dispatch({
                type: "ADD_JOURNAL_ENTRY",
                entry: {
                  id: `journal-retire-${Date.now()}`,
                  season: career.season,
                  week: career.week,
                  type: "milestone",
                  title: "Fin de carrière",
                  body: `${player.firstName} ${player.lastName} raccroche les crampons à ${player.age} ans. Une carrière de légende.`,
                },
              });
              writeSave({ ...save, career: { ...career, phase: "retired", completedMatchIds: [] as unknown as string[] } } as unknown as Parameters<typeof writeSave>[0]);
              toast("Vous avez pris votre retraite. Merci pour tout !", "success");
              router.push("/client/fc-career/career");
            }}
          >
            Prendre sa retraite
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}
