/**
 * FC CAREER — Étape 5 : Entraînement & Progression
 * Sessions spécialisées, formule de gains avec Coach, limites hebdomadaires.
 */

import type { Player, AttributeMap } from "../types/player";
import type { PlayingStyleId, PositionId } from "../constants/positions";
import { getPosition } from "../constants/positions";
import { ATTRIBUTES_BY_GROUP } from "../constants/attributes";
import { ageGainMultiplier as scalingAgeGain, declineFactor, fatiguePenalty } from "../constants/scaling";
import { ageGainMultiplier as ageCurveGain } from "./age-curve";
import { tryImproveAttribute, computeOverall } from "./attribute-calculator";
import { createRng } from "./player-generator";

export type TrainingType =
  | "balanced"     // Équilibré
  | "speed"        // Vitesse
  | "technique"    // Technique
  | "defense"      // Défense
  | "finishing"    // Finition
  | "mental"       // Mental
  | "skill-moves"  // Gestes Techniques
  | "goalkeeper"   // Gardien
  | "active-rest"  // Repos Actif
  | "full-rest"    // Repos Complet
  // Legacy types kept for compatibility
  | "shooting" | "passing" | "dribbling" | "physical" | "tactical" | "recovery" | "match-prep";

export interface TrainingSessionDef {
  id: TrainingType;
  label: string;
  durationMin: number;
  fatigueCost: number; // +fatigue (négatif = récupération)
  /** Attributs ciblés. */
  targets: string[];
  intensity: number; // multiplicateur de gain de base
  /** Limite par semaine (0 = illimité). */
  weeklyLimit: number;
  /** Réservé aux gardiens uniquement ? */
  gkOnly?: boolean;
  /** Est-ce une session de repos ? */
  isRest?: boolean;
}

export const TRAINING_SESSIONS: TrainingSessionDef[] = [
  // --- Nouvelles sessions (Étape 5 spec) ---
  {
    id: "balanced", label: "Équilibré", durationMin: 45, fatigueCost: 15, weeklyLimit: 0,
    targets: ["control", "shortPass", "positioning", "stamina", "composure"],
    intensity: 0.8,
  },
  {
    id: "speed", label: "Vitesse", durationMin: 50, fatigueCost: 20, weeklyLimit: 2,
    targets: ["pace", "acceleration", "sprintStamina", "agility", "balance"],
    intensity: 1.2,
  },
  {
    id: "technique", label: "Technique", durationMin: 45, fatigueCost: 18, weeklyLimit: 2,
    targets: ["dribble", "shortPass", "control", "firstTouch", "crossing"],
    intensity: 1.15,
  },
  {
    id: "defense", label: "Défense", durationMin: 45, fatigueCost: 18, weeklyLimit: 2,
    targets: ["marking", "standingTackle", "slidingTackle", "interceptions", "defensiveAwareness"],
    intensity: 1.15,
  },
  {
    id: "finishing", label: "Finition", durationMin: 50, fatigueCost: 20, weeklyLimit: 2,
    targets: ["finishing", "ballStrike", "volley", "freeKick", "longPass"],
    intensity: 1.2,
  },
  {
    id: "mental", label: "Mental", durationMin: 30, fatigueCost: 12, weeklyLimit: 3,
    targets: ["vision", "decisionMaking", "concentration", "composure", "leadership"],
    intensity: 1.0,
  },
  {
    id: "skill-moves", label: "Gestes Techniques", durationMin: 40, fatigueCost: 15, weeklyLimit: 1,
    targets: ["dribble", "skillMoves", "agility", "balance", "speedWithBall"],
    intensity: 0.6, // Progression lente
  },
  {
    id: "goalkeeper", label: "Gardien", durationMin: 45, fatigueCost: 18, weeklyLimit: 0,
    targets: ["gkDivings", "gReflexes", "gHandling", "gOneOnOne", "gKicking"],
    intensity: 1.15,
    gkOnly: true,
  },
  {
    id: "active-rest", label: "Repos Actif", durationMin: 60, fatigueCost: -25, weeklyLimit: 0,
    targets: ["injuryResistance"],
    intensity: 0.2,
    isRest: true,
  },
  {
    id: "full-rest", label: "Repos Complet", durationMin: 0, fatigueCost: -40, weeklyLimit: 0,
    targets: [],
    intensity: 0,
    isRest: true,
  },
  // --- Legacy sessions (backward compat) ---
  { id: "shooting", label: "Finition & frappes", durationMin: 45, fatigueCost: 12, weeklyLimit: 0, targets: ["finishing", "ballStrike", "volley", "firstTouch", "composure"], intensity: 1.1 },
  { id: "passing", label: "Passes & vision", durationMin: 40, fatigueCost: 8, weeklyLimit: 0, targets: ["shortPass", "longPass", "vision", "decisionMaking", "creativity"], intensity: 1.0 },
  { id: "dribbling", label: "Dribble & conduite", durationMin: 40, fatigueCost: 10, weeklyLimit: 0, targets: ["dribble", "agility", "balance", "speedWithBall", "skillMoves"], intensity: 1.05 },
  { id: "physical", label: "Préparation physique", durationMin: 60, fatigueCost: 18, weeklyLimit: 0, targets: ["pace", "acceleration", "stamina", "strength", "sprintStamina"], intensity: 1.15 },
  { id: "tactical", label: "Revues tactiques", durationMin: 30, fatigueCost: 4, weeklyLimit: 0, targets: ["positioning", "defensiveAwareness", "offensiveAwareness", "teamwork", "concentration"], intensity: 0.9 },
  { id: "recovery", label: "Récupération active", durationMin: 45, fatigueCost: -20, weeklyLimit: 0, targets: ["injuryResistance", "workRate"], intensity: 0.4, isRest: true },
  { id: "match-prep", label: "Préparation match", durationMin: 25, fatigueCost: 6, weeklyLimit: 0, targets: ["composure", "decisionMaking", "penalties", "reaction"], intensity: 0.95 },
];

/** Sessions principales (nouvelles, excluant legacy). */
export const NEW_SESSIONS: TrainingSessionDef[] = TRAINING_SESSIONS.filter(s =>
  ["balanced", "speed", "technique", "defense", "finishing", "mental", "skill-moves", "goalkeeper", "active-rest", "full-rest"].includes(s.id)
);

export interface SessionResult {
  improved: { attributeId: string; from: number; to: number }[];
  fatigueDelta: number;
  formDelta: number;
  overallAfter: number;
}

/** Facteur Coach selon le niveau du club. */
export type CoachTier = "d4" | "d3" | "d2" | "d1" | "d1-top" | "elite";

export const COACH_MULTIPLIERS: Record<CoachTier, number> = {
  "d4": 0.75,
  "d3": 0.8,
  "d2": 0.9,
  "d1": 1.0,
  "d1-top": 1.15,
  "elite": 1.3,
};

/** Détermine le tier du coach basé sur la division du club. */
export function coachTierFromDivision(division: string): CoachTier {
  if (division.includes("D1") || division.includes("Ligue 1") || division.includes("Premier")) {
    return "d1";
  }
  if (division.includes("D2") || division.includes("Ligue 2") || division.includes("Championship")) {
    return "d2";
  }
  if (division.includes("D3") || division.includes("National")) {
    return "d3";
  }
  return "d4";
}

/** Vérifie si un joueur a un trait spécifique. */
function hasTrait(player: Player, traitId: string): boolean {
  return player.traits?.some(t => t.traitId === traitId) ?? false;
}

/** Vérifie les limites hebdomadaires. */
export interface WeeklyTrainingLog {
  [sessionId: string]: number; // nombre de fois cette session cette semaine
}

export function canTrainSession(session: TrainingSessionDef, log: WeeklyTrainingLog, player: Player): { allowed: boolean; reason?: string } {
  // GK-only check
  if (session.gkOnly && player.position !== "GK") {
    return { allowed: false, reason: "Réservé aux gardiens." };
  }
  // Weekly limit
  if (session.weeklyLimit > 0) {
    const count = log[session.id] ?? 0;
    if (count >= session.weeklyLimit) {
      return { allowed: false, reason: `Limite ${session.weeklyLimit}x/semaine atteinte.` };
    }
  }
  return { allowed: true };
}

function attributesForPosition(base: AttributeMap, position: PositionId): string[] {
  const family = getPosition(position).family;
  const groups: string[] = family === "gk" ? ["goalkeeping", "mental"] : ["technical", "physical", "mental"];
  return groups.flatMap((g) => ATTRIBUTES_BY_GROUP[g as keyof typeof ATTRIBUTES_BY_GROUP].map((d) => d.id));
}

/**
 * Applique une séance d'entraînement et retourne le joueur mis à jour (immuable).
 *
 * Formule: Gain = Base × Âge × Fatigue × Potentiel × Moral × Coach × Trait
 */
export function runTrainingSession(
  player: Player,
  session: TrainingSessionDef,
  coachTier: CoachTier = "d1",
  seed = Date.now(),
): { player: Player; result: SessionResult } {
  const rng = createRng(seed);
  const next: Player = { ...player, attributes: { ...player.attributes } };

  // Formule de gains composée
  const hasLongevity = hasTrait(player, "longevity");
  const ageMult = ageCurveGain(player.age, hasLongevity);
  const fatMult = fatiguePenalty(player.fatigue);
  const moralMult = 1 + (player.morale - 50) * 0.002; // ±10% selon moral
  const coachMult = COACH_MULTIPLIERS[coachTier];
  const traitMult = hasTrait(player, "perfectionist") ? 1.1 : 1.0;
  const gainMult = session.intensity * ageMult * fatMult * moralMult * coachMult * traitMult;

  const improved: SessionResult["improved"] = [];
  for (const attrId of session.targets) {
    if (!(attrId in next.attributes)) continue;
    const before = next.attributes[attrId];
    const attempt = tryImproveAttribute(next.attributes, attrId, player.overall, player.potential, gainMult, rng);
    next.attributes[attrId] = attempt.value;
    if (attempt.improved) improved.push({ attributeId: attrId, from: before, to: attempt.value });
  }

  // Déclin physique après 30 ans
  const decline = declineFactor(player.age);
  if (decline > 0 && rng() < decline) {
    for (const d of ATTRIBUTES_BY_GROUP.physical) {
      const v = next.attributes[d.id] ?? 50;
      if (v > 20) next.attributes[d.id] = v - 1;
    }
  }

  const fatigueDelta = session.fatigueCost;
  next.fatigue = Math.max(0, Math.min(100, player.fatigue + fatigueDelta));
  const formDelta = improved.length > 0 ? Math.min(6, improved.length * 2) : session.isRest ? 0 : -1;
  next.form = Math.max(0, Math.min(100, player.form + formDelta));
  next.trainingSessionsThisWeek = player.trainingSessionsThisWeek + 1;
  next.overall = computeOverall(next.attributes, getPosition(player.position).family);

  next.progressionHistory = [
    ...player.progressionHistory,
    { dayNumber: player.progressionHistory.length, overall: next.overall, potential: next.potential, fatigue: next.fatigue },
  ];

  void attributesForPosition; // réservé pour ciblage automatique futur

  return {
    player: next,
    result: { improved, fatigueDelta, formDelta, overallAfter: next.overall },
  };
}

/** Repos complet hors séance : réduit la fatigue, fait légèrement baisser la forme. */
export function applyRest(player: Player): Player {
  return {
    ...player,
    fatigue: Math.max(0, player.fatigue - 40),
    form: Math.max(0, player.form - 2),
  };
}

/** Fin de semaine : remise à zéro du compteur de séances, récupération naturelle. */
export function endOfWeek(player: Player): Player {
  return {
    ...player,
    trainingSessionsThisWeek: 0,
    fatigue: Math.max(0, player.fatigue - 10),
  };
}

/** Style par défaut recommandé pour l'affichage des séances. */
export function recommendedSessions(style: PlayingStyleId): TrainingType[] {
  switch (style) {
    case "poacher":
    case "target-man":
      return ["finishing", "speed", "mental"];
    case "regista":
    case "box-to-box":
      return ["technique", "mental", "speed"];
    case "winger":
      return ["speed", "technique", "skill-moves"];
    case "ball-playing-def":
      return ["defense", "technique", "mental"];
    case "sweeper-keeper":
      return ["goalkeeper", "mental", "active-rest"];
    default:
      return ["balanced", "technique", "speed"];
  }
}
