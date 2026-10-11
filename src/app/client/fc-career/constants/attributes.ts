/**
 * FC CAREER — Les 51 attributs réalistes
 * Groupés en 6 familles, avec pondérations par poste pour l'overall.
 */

import type { AttributeGroup } from "../types/player";

export interface AttributeDef {
  id: string; // clé machine
  label: string; // affichage FR
  group: AttributeGroup;
  /** Vaut-il mieux être haut ou bas ? (tous hauts ici, gardé pour extension) */
  higherIsBetter: boolean;
}

const def = (id: string, label: string, group: AttributeGroup): AttributeDef => ({
  id,
  label,
  group,
  higherIsBetter: true,
});

// --- Techniques (12)
const TECHNICAL: AttributeDef[] = [
  def("control", "Contrôle de balle", "technical"),
  def("dribble", "Dribble", "technical"),
  def("shortPass", "Passe courte", "technical"),
  def("longPass", "Passe longue", "technical"),
  def("crossing", "Centres", "technical"),
  def("finishing", "Finition", "technical"),
  def("volley", "Reprises de volée", "technical"),
  def("freeKick", "Coups francs", "technical"),
  def("penalties", "Penaltys", "technical"),
  def("ballStrike", "Frappe de balle", "technical"),
  def("skillMoves", "Crochets & feintes", "technical"),
  def("weakFoot", "Pied faible", "technical"),
];

// --- Physiques (10)
const PHYSICAL: AttributeDef[] = [
  def("pace", "Vitesse", "physical"),
  def("acceleration", "Accélération", "physical"),
  def("sprintStamina", "Résistance sprint", "physical"),
  def("stamina", "Endurance", "physical"),
  def("strength", "Force physique", "physical"),
  def("balance", "Équilibre", "physical"),
  def("agility", "Agilité", "physical"),
  def("jumping", "Jeu aérien", "physical"),
  def("reaction", "Réflexes", "physical"),
  def("injuryResistance", "Résistance blessures", "physical"),
];

// --- Mentaux (9)
const MENTAL: AttributeDef[] = [
  def("vision", "Vision de jeu", "mental"),
  def("composure", "Sang-froid", "mental"),
  def("decisionMaking", "Prise de décision", "mental"),
  def("positioning", "Placement", "mental"),
  def("teamwork", "Esprit d'équipe", "mental"),
  def("leadership", "Leadership", "mental"),
  def("concentration", "Concentration", "mental"),
  def("workRate", "Volume de jeu", "mental"),
  def("creativity", "Créativité", "mental"),
];

// --- Défensifs (8)
const DEFENSIVE: AttributeDef[] = [
  def("standingTackle", "Tacle debout", "defensive"),
  def("slidingTackle", "Tacle glissé", "defensive"),
  def("interceptions", "Interceptions", "defensive"),
  def("marking", "Marquage", "defensive"),
  def("blockPass", "Contrôle / interception passe", "defensive"),
  def("aerialDuels", "Duels aériens", "defensive"),
  def("lastMinute", "Tacle in extremis", "defensive"),
  def("defensiveAwareness", "Lecture défensive", "defensive"),
];

// --- Offensifs (6)
const OFFENSIVE: AttributeDef[] = [
  def("offensiveAwareness", "Lecture offensive", "offensive"),
  def("runsSpace", "Appels dans la profondeur", "offensive"),
  def("holdBall", "Jeu en appui", "offensive"),
  def("linkUp", "Jeu en une-deux", "offensive"),
  def("firstTouch", "Premier contrôle", "offensive"),
  def("speedWithBall", "Vitesse balle au pied", "offensive"),
];

// --- Gardien (6)
const GOALKEEPING: AttributeDef[] = [
  def("gkDivings", "Plongeons", "goalkeeping"),
  def("gKicking", "Jeu du pied GK", "goalkeeping"),
  def("gHandling", "Prise de balle", "goalkeeping"),
  def("gReflexes", "Réflexes GK", "goalkeeping"),
  def("gOneOnOne", "Duel face à face", "goalkeeping"),
  def("gAerialReach", "Sorties aériennes", "goalkeeping"),
];

export const ALL_ATTRIBUTES: AttributeDef[] = [
  ...TECHNICAL,
  ...PHYSICAL,
  ...MENTAL,
  ...DEFENSIVE,
  ...OFFENSIVE,
  ...GOALKEEPING,
];

// Sanity check : 12+10+9+8+6+6 = 51
if (ALL_ATTRIBUTES.length !== 51) {
  // En dev seulement : on veut le savoir immédiatement.
  if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
    console.warn(`[fc-career] attendu 51 attributs, obtenu ${ALL_ATTRIBUTES.length}`);
  }
}

export const ATTRIBUTES_BY_GROUP: Record<AttributeGroup, AttributeDef[]> = {
  technical: TECHNICAL,
  physical: PHYSICAL,
  mental: MENTAL,
  defensive: DEFENSIVE,
  offensive: OFFENSIVE,
  goalkeeping: GOALKEEPING,
};

export const ATTRIBUTE_IDS: string[] = ALL_ATTRIBUTES.map((a) => a.id);

export function getAttributeDef(id: string): AttributeDef | undefined {
  return ALL_ATTRIBUTES.find((a) => a.id === id);
}
