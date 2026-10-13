/**
 * FC CAREER — Générateur de joueur réaliste
 * Morphologie + âge + poste + style -> 51 attributs cohérents.
 */

import { ALL_ATTRIBUTES, ATTRIBUTES_BY_GROUP } from "../constants/attributes";
import { getPosition, getStyle } from "../constants/positions";
import type { PositionId, PlayingStyleId } from "../constants/positions";
import type { Morphology, Player, AttributeMap, AcademyLevel } from "../types/player";
import { computeOverall, computePotential } from "./attribute-calculator";
import { initialStageForAge, createAcademyStatus } from "./academy";
import { marketValueMultiplier } from "../constants/scaling";
import { evaluatePlayStyles } from "./playstyles";
import { generateTraits } from "./traits";

export interface GenerationInput {
  firstName: string;
  lastName: string;
  age: number; // 16-35
  position: PositionId;
  secondaryPositions: PositionId[];
  style: PlayingStyleId;
  morphology: Morphology;
  heightCm: number;
  weightKg: number;
  nationality?: string;
}

/** PRNG déterministe (mulberry32) pour rejouer une génération à l'identique. */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Influence morphologie -> familles physiques/aériennes. */
function morphologyBias(m: Morphology, heightCm: number, weightKg: number): Partial<Record<string, number>> {
  const bias: Partial<Record<string, number>> = {};
  const bmi = weightKg / Math.pow(heightCm / 100, 2);

  switch (m) {
    case "fin":
      bias.agility = 6; bias.balance = 5; bias.pace = 3; bias.strength = -8; bias.aerialDuels = -5;
      break;
    case "costaud":
      bias.strength = 8; bias.jumping = 3; bias.balance = 4; bias.agility = -6; bias.sprintStamina = -4;
      break;
    case "grand":
      bias["jumping"] = 7; bias.aerialDuels = 8; bias.gAerialReach = 5; bias.agility = -5; bias.dribble = -4;
      break;
    case "petit":
      bias.agility = 7; bias.balance = 6; bias.dribble = 5; bias.firstTouch = 3; bias.aerialDuels = -7; bias.jumping = -5;
      break;
    default:
      break;
  }
  if (bmi > 26) bias.strength = (bias.strength ?? 0) + 3;
  if (bmi < 19) bias.acceleration = (bias.acceleration ?? 0) + 3;
  return bias;
}

/** Base de départ selon l'âge : un U19 démarre bas, un trentenaire est plus abouti mais plafonné. */
function baseLevelForAge(age: number): number {
  if (age <= 17) return 42;
  if (age <= 19) return 48;
  if (age <= 21) return 54;
  if (age <= 24) return 60;
  if (age <= 28) return 64;
  if (age <= 31) return 62;
  return 58;
}

export function generatePlayer(input: GenerationInput, seed = Date.now()): Player {
  const rng = createRng(seed);
  const posDef = getPosition(input.position);
  const style = getStyle(input.style);
  const morph = morphologyBias(input.morphology, input.heightCm, input.weightKg);
  const base = baseLevelForAge(input.age);

  const attributes: AttributeMap = {};
  for (const attr of ALL_ATTRIBUTES) {
    // Les attributs GK ne comptent que pour un gardien ; idem défensifs/offensifs pondérés par famille.
    const isGkAttr = attr.group === "goalkeeping";
    const relevant = posDef.family === "gk" ? isGkAttr : !isGkAttr;

    let value = base + (rng() * 14 - 7); // dispersion ±7
    value += style.modifiers[attr.group] ?? 0;
    value += morph[attr.id] ?? 0;
    if (!relevant) value -= 25; // hors spécialité => nettement plus faible

    attributes[attr.id] = clamp(Math.round(value), 1, 99);
  }

  const overall = computeOverall(attributes, posDef.family);
  const potential = computePotential(overall, input.age, input.style, rng);

  // Étoiles gestes techniques : basé sur dribble + agility + age
  const skillBase = ((attributes["dribble"] ?? 50) + (attributes["skillMoves"] ?? 50)) / 2;
  const skillMovesStars = clamp(Math.round(skillBase / 20), 1, 5) as 1 | 2 | 3 | 4 | 5;

  // Étoiles pied faible : basé sur l'attribut weakFoot
  const wfBase = attributes["weakFoot"] ?? 50;
  const weakFootStars = clamp(Math.round(wfBase / 20), 1, 5) as 1 | 2 | 3 | 4 | 5;

  // PlayStyles débloqués selon les attributs
  const playStyles = evaluatePlayStyles(attributes);

  // Traits de personnalité
  const traits = generateTraits(rng);

  const birthYear = new Date().getFullYear() - input.age;
  const birthDate = new Date(Date.UTC(birthYear, 6, 1)).toISOString();

  return {
    id: `p-${seed.toString(36)}-${Math.floor(rng() * 1e6).toString(36)}`,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    birthDate,
    age: input.age,
    nationality: input.nationality ?? "FR",
    foot: rng() < 0.22 ? "left" : "right",
    position: input.position,
    secondaryPositions: input.secondaryPositions,
    style: input.style,
    morphology: input.morphology,
    heightCm: input.heightCm,
    weightKg: input.weightKg,
    attributes,
    overall,
    potential,
    skillMovesStars,
    weakFootStars,
    playStyles,
    traits,
    contract: {
      clubId: "",
      salaryPerWeek: 0,
      bonusPerMatch: 0,
      bonusPerGoal: 0,
      signingBonus: 0,
      yearsRemaining: 1,
      isProfessional: false,
      releaseClause: 0,
    },
    marketValue: marketValueMultiplier(overall, input.age, potential),
    fatigue: 10,
    morale: 70,
    form: 55,
    condition: "fit",
    injuryWeeksLeft: 0,
    trainingSessionsThisWeek: 0,
    academyLevel: "regional" as AcademyLevel,
    academy: createAcademyStatus(initialStageForAge(input.age)),
    seasonStats: [],
    careerTotals: {
      matches: 0, starts: 0, minutes: 0, goals: 0, assists: 0,
      yellowCards: 0, redCards: 0, averageRating: 0, overallAtSeasonEnd: 0,
    },
    progressionHistory: [{ dayNumber: 0, overall, potential, fatigue: 10 }],
    achievements: [],
  };
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** Répartition des groupes d'attributs (pour l'écran GenerationScreen). */
export function groupSummary(attributes: AttributeMap) {
  return Object.entries(ATTRIBUTES_BY_GROUP).map(([group, defs]) => {
    const vals = defs.map((d) => attributes[d.id] ?? 0);
    const avg = vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length);
    return { group, avg: Math.round(avg) };
  });
}
