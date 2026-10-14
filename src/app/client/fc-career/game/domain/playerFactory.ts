/**
 * FC CAREER — Création d'un joueur initial
 * Génère les attributs de départ selon position + potentiel.
 * Aucun import React — utilisable côté serveur et dans les tests.
 */

import type { Player, PlayerAttributes, Position } from "./player";
import { positionFamily } from "./player";
import { computeOverall } from "./player";
import { createRng, seedFromString } from "../utils/random";
import { playerId } from "../utils/ids";

/* ── Intervalles d'attributs par famille ───────────────────────── */

type AttrRange = { min: number; max: number };

/** Fortes valeurs par défaut pour chaque poste */
const POSITION_WEIGHTS: Record<Position, Partial<Record<keyof PlayerAttributes, number>>> = {
  GK:  { gkDiving: 3, gkHandling: 3, gkKicking: 2, gkPositioning: 3, gkReflexes: 3, gkSpeed: 2, gkDistribution: 2 },
  CB:  { defAwareness: 3, standingTackle: 3, slidingTackle: 2, headingAccuracy: 3, strength: 3, marking: 3 },
  LB:  { crossing: 3, acceleration: 2, stamina: 3, standingTackle: 2, defAwareness: 2 },
  RB:  { crossing: 3, acceleration: 2, stamina: 3, standingTackle: 2, defAwareness: 2 },
  LWB: { crossing: 3, dribbling: 2, acceleration: 3, stamina: 3 },
  RWB: { crossing: 3, dribbling: 2, acceleration: 3, stamina: 3 },
  CDM: { defAwareness: 3, interceptions: 3, shortPassing: 3, stamina: 3, strength: 2 },
  CM:  { shortPassing: 3, longPassing: 3, stamina: 3, vision: 3, composure: 2 },
  CAM: { shortPassing: 3, vision: 3, dribbling: 3, attPositioning: 3, longShot: 2 },
  LM:  { crossing: 3, acceleration: 3, dribbling: 3, shortPassing: 2 },
  RM:  { crossing: 3, acceleration: 3, dribbling: 3, shortPassing: 2 },
  LW:  { dribbling: 3, acceleration: 3, finishing: 2, curve: 2, agility: 3 },
  RW:  { dribbling: 3, acceleration: 3, finishing: 2, curve: 2, agility: 3 },
  CF:  { finishing: 3, attPositioning: 3, dribbling: 2, reactions: 3, agility: 3 },
  ST:  { finishing: 3, sprintSpeed: 3, attPositioning: 3, shotPower: 3, strength: 2 },
};

/* ── Base basse (académie) ─────────────────────────────────────── */
const BASE_MIN = 25;
const BASE_MAX = 45;
const PRIO_BONUS = 20; // bonus pour les attributs prioritaires

/**
 * Génère les attributs initiaux d'un joueur de 16 ans en académie.
 * @param position  Poste choisi
 * @param potential Potentiel (60–99)
 * @param seed      Graine pour reproductibilité
 */
export function generateInitialAttributes(
  position: Position,
  potential: number,
  seed: string,
): PlayerAttributes {
  const rng = createRng(seedFromString(seed));
  const prio = POSITION_WEIGHTS[position] ?? {};

  // Le potentiel influence légèrement le niveau de départ
  const potBonus = Math.round((potential - 60) / 10);

  function rollAttr(key: keyof PlayerAttributes): number {
    const weight = prio[key] ?? 1;
    const isPriority = weight >= 2;
    const baseMin = BASE_MIN + (isPriority ? PRIO_BONUS / 2 : 0) + potBonus;
    const baseMax = BASE_MAX + (isPriority ? PRIO_BONUS : 0) + potBonus;
    return rng.int(
      Math.max(10, Math.min(55, baseMin)),
      Math.max(20, Math.min(65, baseMax)),
    );
  }

  // GK attrs très bas pour les non-GK
  const isGk = position === "GK";

  const attrs: PlayerAttributes = {
    // Technique
    ballControl:    rollAttr("ballControl"),
    dribbling:      rollAttr("dribbling"),
    crossing:       rollAttr("crossing"),
    finishing:      rollAttr("finishing"),
    freeKick:       rollAttr("freeKick"),
    longPassing:    rollAttr("longPassing"),
    shortPassing:   rollAttr("shortPassing"),
    longShot:       rollAttr("longShot"),
    curve:          rollAttr("curve"),
    volleys:        rollAttr("volleys"),

    // Physique
    acceleration:   rollAttr("acceleration"),
    sprintSpeed:    rollAttr("sprintSpeed"),
    agility:        rollAttr("agility"),
    balance:        rollAttr("balance"),
    jumping:        rollAttr("jumping"),
    stamina:        rollAttr("stamina"),
    strength:       rollAttr("strength"),
    reactions:      rollAttr("reactions"),

    // Mental
    aggression:     rollAttr("aggression"),
    composure:      rollAttr("composure"),
    interceptions:  rollAttr("interceptions"),
    positioning:    rollAttr("positioning"),
    vision:         rollAttr("vision"),
    penalties:      rollAttr("penalties"),
    marking:        rollAttr("marking"),

    // Défensif
    standingTackle: rollAttr("standingTackle"),
    slidingTackle:  rollAttr("slidingTackle"),
    headingAccuracy:rollAttr("headingAccuracy"),
    defAwareness:   rollAttr("defAwareness"),
    defWork:        rollAttr("defWork"),
    defLine:        rollAttr("defLine"),

    // Offensif
    attPositioning: rollAttr("attPositioning"),
    attWork:        rollAttr("attWork"),
    shotPower:      rollAttr("shotPower"),
    weakFoot:       rollAttr("weakFoot"),
    skillMoves:     rollAttr("skillMoves"),
    offside:        rollAttr("offside"),

    // Gardien
    gkDiving:        isGk ? rollAttr("gkDiving")        : rng.int(8, 15),
    gkHandling:      isGk ? rollAttr("gkHandling")      : rng.int(8, 15),
    gkKicking:       isGk ? rollAttr("gkKicking")       : rng.int(15, 25),
    gkPositioning:   isGk ? rollAttr("gkPositioning")   : rng.int(8, 15),
    gkReflexes:      isGk ? rollAttr("gkReflexes")      : rng.int(8, 15),
    gkSpeed:         isGk ? rollAttr("gkSpeed")         : rng.int(25, 35),
    gkDistribution:  isGk ? rollAttr("gkDistribution")  : rng.int(15, 25),
    gkSweeper:       isGk ? rollAttr("gkSweeper")       : rng.int(8, 15),
    gkComesOff:      isGk ? rollAttr("gkComesOff")      : rng.int(8, 15),
    gkCross:         isGk ? rollAttr("gkCross")         : rng.int(8, 15),
    gkOneonOne:      isGk ? rollAttr("gkOneonOne")      : rng.int(8, 15),
    gkPenalty:       isGk ? rollAttr("gkPenalty")       : rng.int(8, 15),
    gkDirectFreeKick:isGk ? rollAttr("gkDirectFreeKick"): rng.int(8, 15),
    gkPlaymake:      isGk ? rollAttr("gkPlaymake")      : rng.int(15, 25),
  };

  return attrs;
}

export interface CreatePlayerInput {
  firstName: string;
  lastName: string;
  nationality: string;
  position: Position;
  foot: "right" | "left" | "both";
  potential?: number; // 60–99, défaut 75–85 aléatoire
  seed?: string;
}

/** Crée un joueur complet prêt à entrer en académie */
export function createPlayer(input: CreatePlayerInput): Player {
  const {
    firstName, lastName, nationality, position, foot,
    potential: inputPot,
    seed = `${firstName}-${lastName}-${Date.now()}`,
  } = input;

  const rng = createRng(seedFromString(seed + "-meta"));
  const potential = inputPot ?? rng.int(72, 88);
  const attributes = generateInitialAttributes(position, potential, seed + "-attrs");
  const family = positionFamily(position);
  const overall = computeOverall(attributes, family);

  return {
    id: playerId(),
    firstName,
    lastName,
    nationality,
    birthAge: 16,
    age: 16,
    foot,
    position,
    heightCm: rng.int(165, 192),
    weightKg: rng.int(62, 82),
    attributes,
    overall,
    potential,
    condition: { form: 70, fatigue: 10, morale: 75, injury: null },
    contract: {
      clubId: "academy",
      salary: 0,
      bonusGoal: 0,
      bonusAssist: 0,
      startSeason: 1,
      endSeason: 1,
      role: "squad",
    },
    playStyles: [],
    traits: [],
    paPoints: 0,
    stats: {
      totalAppearances: 0, totalGoals: 0, totalAssists: 0,
      totalYellowCards: 0, totalRedCards: 0, totalMinutes: 0,
      peakOverall: overall, seasons: [],
    },
    progressionHistory: [],
    reputation: 5,
    popularity: 2,
  };
}
