/**
 * FC CAREER — Domaine : Fin de saison & évaluation académique
 * Calcule le score d'évaluation, détermine promotion/maintien/relégation.
 */

import type { Player } from "./player";
import type { Career, AcademyState, SeasonSummary } from "./career";
export type { SeasonSummary } from "./career";
import type { SeasonSchedule } from "./season";
import type { MatchResult } from "./match";
import { PROMOTION_THRESHOLD, RELEGATION_THRESHOLD } from "./academySchedule";
import { generateAcademySchedule } from "./academySchedule";

/* ── Calcul du score d'évaluation ─────────────────────────────── */

export interface EvaluationInput {
  player: Player;
  season: number;
  schedule: SeasonSchedule;
  matchResults: MatchResult[];
}

export interface EvaluationResult {
  score: number;           // 0-100
  verdict: "promotion" | "maintained" | "relegated";
  highlights: string[];
  paBonus: number;         // PA bonus de fin de saison
}

export function computeSeasonEvaluation(input: EvaluationInput): EvaluationResult {
  const { player, season, matchResults } = input;
  const seasonStats = player.stats.seasons.find(s => s.season === season);

  let score = 50; // base
  const highlights: string[] = [];

  if (seasonStats) {
    const { appearances, goals, assists, avgRating } = seasonStats;

    // Matchs joués (max +20 pts)
    const matchScore = Math.min(20, Math.round(appearances * 3.5));
    score += matchScore;
    if (appearances >= 5) highlights.push(`${appearances} matchs disputés`);

    // Note moyenne (max +15 pts)
    if (avgRating >= 7) {
      const ratingScore = Math.round((avgRating - 6) * 7);
      score += Math.min(15, ratingScore);
      if (avgRating >= 8) highlights.push(`Excellente moyenne (${avgRating.toFixed(1)}/10)`);
      else if (avgRating >= 7) highlights.push(`Bonne moyenne (${avgRating.toFixed(1)}/10)`);
    } else if (avgRating < 5.5) {
      score -= 10;
    }

    // Buts & passes (max +10 pts)
    const goalContrib = goals + assists;
    if (goalContrib > 0) {
      score += Math.min(10, goalContrib * 2);
      if (goalContrib >= 3) highlights.push(`${goals} buts, ${assists} passes décisives`);
    }
  } else {
    // Aucun match joué
    score -= 15;
    highlights.push("Aucun match joué cette saison");
  }

  // OVR du joueur (bonus si progression)
  if (player.overall >= 65) {
    score += 5;
    highlights.push(`OVR ${player.overall} — solide progression`);
  }

  // Condition générale
  if (player.condition.morale >= 70) score += 3;
  if (player.condition.form >= 70) score += 3;

  // Clamp
  score = Math.max(0, Math.min(100, Math.round(score)));

  const verdict: EvaluationResult["verdict"] =
    score >= PROMOTION_THRESHOLD  ? "promotion" :
    score <= RELEGATION_THRESHOLD ? "relegated"  :
    "maintained";

  // PA bonus selon verdict
  const paBonus = verdict === "promotion" ? 8 : verdict === "maintained" ? 4 : 0;

  if (verdict === "promotion")  highlights.unshift("🏆 Promotion — passage au niveau supérieur !");
  if (verdict === "relegated")  highlights.unshift("⬇️ Évaluation insuffisante");
  if (verdict === "maintained") highlights.unshift("✅ Maintien en académie");

  return { score, verdict, highlights, paBonus };
}

/* ── Transition de phase ────────────────────────────────────────── */

export type AcademyStage = AcademyState["stage"];

const STAGE_PROGRESSION: Record<AcademyStage, AcademyStage | "professional"> = {
  youth:   "u18",
  u18:     "u21",
  u21:     "reserve",
  reserve: "professional",
};

const STAGE_LABELS: Record<AcademyStage | "professional", string> = {
  youth:        "Jeunes (U16)",
  u18:          "U18",
  u21:          "U21",
  reserve:      "Réserve",
  professional: "Professionnel",
};

export function getStageLabel(stage: AcademyStage | "professional"): string {
  return STAGE_LABELS[stage] ?? stage;
}

/* ── Construction du résumé de saison ─────────────────────────── */

export function buildSeasonSummary(
  player: Player,
  career: Career,
  evaluation: EvaluationResult,
): SeasonSummary {
  const s = player.stats.seasons.find(ss => ss.season === career.season);
  return {
    season:       career.season,
    clubId:       player.contract.clubId,
    phase:        career.phase,
    appearances:  s?.appearances  ?? 0,
    goals:        s?.goals        ?? 0,
    assists:      s?.assists      ?? 0,
    avgRating:    s?.avgRating    ?? 0,
    trophies:     [],
    highlights:   evaluation.highlights,
  };
}

/* ── Préparer la saison suivante ────────────────────────────────── */

export interface NextSeasonSetup {
  /** Nouvelle phase de carrière */
  newPhase: Career["phase"];
  /** Nouveau stage académie (null si promotion vers pro) */
  newAcademyStage: AcademyStage | null;
  /** Nouveau calendrier académique */
  newSchedule: ReturnType<typeof generateAcademySchedule> | null;
  /** L'âge a progressé d'un an */
  newAge: number;
}

export function prepareNextSeason(
  careerId: string,
  player: Player,
  career: Career,
  verdict: EvaluationResult["verdict"],
): NextSeasonSetup {
  const newAge = player.age + 1;
  const currentStage = career.academy?.stage ?? "reserve";

  if (verdict !== "promotion") {
    // Maintien ou relégation : reste en académie, même stage
    const newSchedule = generateAcademySchedule(careerId, career.season + 1);
    return {
      newPhase:        "academy",
      newAcademyStage: currentStage,
      newSchedule,
      newAge,
    };
  }

  // Promotion
  const nextStage = STAGE_PROGRESSION[currentStage];

  if (nextStage === "professional") {
    return {
      newPhase:        "professional",
      newAcademyStage: null,
      newSchedule:     null,
      newAge,
    };
  }

  const newSchedule = generateAcademySchedule(careerId, career.season + 1);
  return {
    newPhase:        "academy",
    newAcademyStage: nextStage as AcademyStage,
    newSchedule,
    newAge,
  };
}
