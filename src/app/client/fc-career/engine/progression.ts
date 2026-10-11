/**
 * FC CAREER — Progression : entraînement, amélioration, fatigue
 */

import type { Player, AttributeMap } from "../types/player";
import type { PlayingStyleId, PositionId } from "../constants/positions";
import { getPosition } from "../constants/positions";
import { ATTRIBUTES_BY_GROUP } from "../constants/attributes";
import { ageGainMultiplier, declineFactor, fatiguePenalty } from "../constants/scaling";
import { tryImproveAttribute, computeOverall } from "./attribute-calculator";
import { createRng } from "./player-generator";

export type TrainingType = "shooting" | "passing" | "dribbling" | "physical" | "tactical" | "recovery" | "match-prep";

export interface TrainingSessionDef {
  id: TrainingType;
  label: string;
  durationMin: number;
  fatigueCost: number; // +fatigue
  /** Attributs ciblés (jusqu'à 6). */
  targets: string[];
  intensity: number; // multiplicateur de gain de base
}

export const TRAINING_SESSIONS: TrainingSessionDef[] = [
  { id: "shooting", label: "Finition & frappes", durationMin: 45, fatigueCost: 12, targets: ["finishing", "ballStrike", "volley", "firstTouch", "composure"], intensity: 1.1 },
  { id: "passing", label: "Passes & vision", durationMin: 40, fatigueCost: 8, targets: ["shortPass", "longPass", "vision", "decisionMaking", "creativity"], intensity: 1.0 },
  { id: "dribbling", label: "Dribble & conduite", durationMin: 40, fatigueCost: 10, targets: ["dribble", "agility", "balance", "speedWithBall", "skillMoves"], intensity: 1.05 },
  { id: "physical", label: "Préparation physique", durationMin: 60, fatigueCost: 18, targets: ["pace", "acceleration", "stamina", "strength", "sprintStamina"], intensity: 1.15 },
  { id: "tactical", label: "Revues tactiques", durationMin: 30, fatigueCost: 4, targets: ["positioning", "defensiveAwareness", "offensiveAwareness", "teamwork", "concentration"], intensity: 0.9 },
  { id: "recovery", label: "Récupération active", durationMin: 45, fatigueCost: -20, targets: ["injuryResistance", "workRate"], intensity: 0.4 },
  { id: "match-prep", label: "Préparation match", durationMin: 25, fatigueCost: 6, targets: ["composure", "decisionMaking", "penalties", "reaction"], intensity: 0.95 },
];

export interface SessionResult {
  improved: { attributeId: string; from: number; to: number }[];
  fatigueDelta: number;
  formDelta: number;
  overallAfter: number;
}

function attributesForPosition(base: AttributeMap, position: PositionId): string[] {
  const family = getPosition(position).family;
  const groups: string[] = family === "gk" ? ["goalkeeping", "mental"] : ["technical", "physical", "mental"];
  return groups.flatMap((g) => ATTRIBUTES_BY_GROUP[g as keyof typeof ATTRIBUTES_BY_GROUP].map((d) => d.id));
}

/**
 * Applique une séance d'entraînement et retourne le joueur mis à jour (immuable).
 */
export function runTrainingSession(
  player: Player,
  session: TrainingSessionDef,
  seed = Date.now(),
): { player: Player; result: SessionResult } {
  const rng = createRng(seed);
  const next: Player = { ...player, attributes: { ...player.attributes } };

  const ageMult = ageGainMultiplier(player.age);
  const fatMult = fatiguePenalty(player.fatigue);
  const gainMult = session.intensity * ageMult * fatMult;

  const improved: SessionResult["improved"] = [];
  for (const attrId of session.targets) {
    if (!(attrId in next.attributes)) continue;
    const before = next.attributes[attrId];
    const attempt = tryImproveAttribute(next.attributes, attrId, player.overall, player.potential, gainMult, rng);
    next.attributes[attrId] = attempt.value;
    if (attempt.improved) improved.push({ attributeId: attrId, from: before, to: attempt.value });
  }

  // Déclin physique après 30 ans, appliqué doucement sur la famille physique.
  const decline = declineFactor(player.age);
  if (decline > 0 && rng() < decline) {
    for (const d of ATTRIBUTES_BY_GROUP.physical) {
      const v = next.attributes[d.id] ?? 50;
      if (v > 20) next.attributes[d.id] = v - 1;
    }
  }

  const fatigueDelta = session.fatigueCost;
  next.fatigue = Math.max(0, Math.min(100, player.fatigue + fatigueDelta));
  const formDelta = improved.length > 0 ? Math.min(6, improved.length * 2) : -1;
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
    fatigue: Math.max(0, player.fatigue - 25),
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
      return ["shooting", "physical", "match-prep"];
    case "regista":
    case "box-to-box":
      return ["passing", "tactical", "physical"];
    case "winger":
      return ["dribbling", "physical", "match-prep"];
    case "ball-playing-def":
      return ["tactical", "passing", "physical"];
    case "sweeper-keeper":
      return ["tactical", "physical", "recovery"];
    default:
      return ["passing", "shooting", "physical"];
  }
}
