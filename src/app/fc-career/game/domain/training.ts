/**
 * FC CAREER — Domaine : Entraînement
 * Règles de progression des attributs par PA et gestion de la condition.
 */

import type { PlayerAttributes, Position, PositionFamily } from "./player";
import { positionFamily } from "./player";

/* ── Familles d'attributs pour l'UI ────────────────────────────── */

export interface AttributeGroup {
  id: string;
  label: string;
  color: "emerald" | "amber" | "coral" | "sky";
  keys: (keyof PlayerAttributes)[];
}

/** Groupes affichés dans l'UI d'entraînement (hors gardien pour non-GK) */
export const ATTRIBUTE_GROUPS: AttributeGroup[] = [
  {
    id: "technique",
    label: "Technique",
    color: "emerald",
    keys: [
      "ballControl", "dribbling", "crossing", "finishing",
      "shortPassing", "longPassing", "longShot", "freeKick", "curve", "volleys",
    ],
  },
  {
    id: "physical",
    label: "Physique",
    color: "amber",
    keys: [
      "acceleration", "sprintSpeed", "agility", "balance",
      "jumping", "stamina", "strength", "reactions",
    ],
  },
  {
    id: "mental",
    label: "Mental",
    color: "sky",
    keys: [
      "aggression", "composure", "interceptions", "positioning",
      "vision", "penalties", "marking",
    ],
  },
  {
    id: "defensive",
    label: "Défensif",
    color: "coral",
    keys: [
      "standingTackle", "slidingTackle", "headingAccuracy",
      "defAwareness", "defWork", "defLine",
    ],
  },
  {
    id: "offensive",
    label: "Offensif",
    color: "emerald",
    keys: [
      "attPositioning", "attWork", "shotPower",
      "weakFoot", "skillMoves", "offside",
    ],
  },
];

export const GK_ATTRIBUTE_GROUP: AttributeGroup = {
  id: "goalkeeper",
  label: "Gardien",
  color: "sky",
  keys: [
    "gkDiving", "gkHandling", "gkKicking", "gkPositioning",
    "gkReflexes", "gkSpeed", "gkDistribution", "gkSweeper",
    "gkComesOff", "gkCross", "gkOneonOne", "gkPenalty",
    "gkDirectFreeKick", "gkPlaymake",
  ],
};

/** Renvoie les groupes d'attributs adaptés au poste */
export function getAttributeGroups(position: Position): AttributeGroup[] {
  if (position === "GK") {
    return [GK_ATTRIBUTE_GROUP, ATTRIBUTE_GROUPS[1], ATTRIBUTE_GROUPS[2]];
  }
  const family = positionFamily(position);
  // Ordre par pertinence selon la famille
  if (family === "defender") {
    return [ATTRIBUTE_GROUPS[3], ATTRIBUTE_GROUPS[1], ATTRIBUTE_GROUPS[2], ATTRIBUTE_GROUPS[0], ATTRIBUTE_GROUPS[4]];
  }
  if (family === "midfielder") {
    return [ATTRIBUTE_GROUPS[0], ATTRIBUTE_GROUPS[2], ATTRIBUTE_GROUPS[1], ATTRIBUTE_GROUPS[3], ATTRIBUTE_GROUPS[4]];
  }
  // attacker
  return [ATTRIBUTE_GROUPS[4], ATTRIBUTE_GROUPS[0], ATTRIBUTE_GROUPS[1], ATTRIBUTE_GROUPS[2], ATTRIBUTE_GROUPS[3]];
}

/* ── Coût en PA ─────────────────────────────────────────────────── */

/**
 * Coût en PA pour augmenter un attribut d'un point.
 * Plus l'attribut est déjà haut, plus c'est cher.
 * 1–49 → 1 PA   50–64 → 2 PA   65–74 → 3 PA   75–84 → 4 PA   85+ → 5 PA
 */
export function paCostForAttribute(currentValue: number): number {
  if (currentValue < 50) return 1;
  if (currentValue < 65) return 2;
  if (currentValue < 75) return 3;
  if (currentValue < 85) return 4;
  return 5;
}

/* ── Libellés d'attributs ───────────────────────────────────────── */

export const ATTRIBUTE_LABELS: Record<keyof PlayerAttributes, string> = {
  ballControl:     "Contrôle",
  dribbling:       "Dribble",
  crossing:        "Centre",
  finishing:       "Finition",
  freeKick:        "Coup franc",
  longPassing:     "Long pass",
  shortPassing:    "Passe courte",
  longShot:        "Frappe lointaine",
  curve:           "Effet",
  volleys:         "Volée",

  acceleration:    "Accélération",
  sprintSpeed:     "Vitesse",
  agility:         "Agilité",
  balance:         "Équilibre",
  jumping:         "Détente",
  stamina:         "Endurance",
  strength:        "Force",
  reactions:       "Réactivité",

  aggression:      "Agressivité",
  composure:       "Sang-froid",
  interceptions:   "Interceptions",
  positioning:     "Positionnement",
  vision:          "Vision",
  penalties:       "Penalties",
  marking:         "Marquage",

  standingTackle:  "Tacle debout",
  slidingTackle:   "Tacle glissé",
  headingAccuracy: "Jeu de tête",
  defAwareness:    "Conscience déf.",
  defWork:         "Travail déf.",
  defLine:         "Ligne déf.",

  attPositioning:  "Placement off.",
  attWork:         "Travail off.",
  shotPower:       "Puissance tir",
  weakFoot:        "Pied faible",
  skillMoves:      "Gestes tech.",
  offside:         "Hors-jeu",

  gkDiving:        "Plongeon",
  gkHandling:      "Prise en main",
  gkKicking:       "Dégagement",
  gkPositioning:   "Placement GK",
  gkReflexes:      "Réflexes",
  gkSpeed:         "Vitesse GK",
  gkDistribution:  "Distribution",
  gkSweeper:       "GK libéro",
  gkComesOff:      "Sortie",
  gkCross:         "Prise de croix",
  gkOneonOne:      "Face-à-face",
  gkPenalty:       "Pénalty GK",
  gkDirectFreeKick:"Coup franc GK",
  gkPlaymake:      "Construction",
};

/* ── Effet de l'entraînement sur la condition ───────────────────── */

export interface WeeklyConditionDelta {
  fatigueGain: number;    // +fatigue
  formDelta: number;      // +/- form
  moraleDelta: number;    // +/- morale
  paGained: number;       // PA gagnés
}

/**
 * Calcule l'impact d'une semaine d'entraînement sur la condition.
 * Intensité : "light" | "normal" | "intense"
 */
export function computeWeeklyCondition(
  currentFatigue: number,
  currentForm: number,
  intensity: "light" | "normal" | "intense",
): WeeklyConditionDelta {
  const config = {
    light:   { fatigueGain: 2,  formBase: +1, morale: +2,  pa: 1 },
    normal:  { fatigueGain: 8,  formBase: +3, morale: +0,  pa: 2 },
    intense: { fatigueGain: 15, formBase: +5, morale: -3,  pa: 3 },
  }[intensity];

  // La fatigue réduit le gain de forme
  const fatiguePenalty = currentFatigue > 60 ? -2 : currentFatigue > 40 ? -1 : 0;

  return {
    fatigueGain:  config.fatigueGain,
    formDelta:    config.formBase + fatiguePenalty,
    moraleDelta:  config.morale,
    paGained:     currentFatigue > 80 ? Math.max(0, config.pa - 1) : config.pa,
  };
}
