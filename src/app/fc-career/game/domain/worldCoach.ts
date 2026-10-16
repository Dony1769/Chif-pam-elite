/**
 * FC CAREER — Coachs du monde
 * Chaque club (pro, réserve, académie) a un entraîneur autonome.
 * IA : évaluation, licenciement, recrutement, compositions, développement jeunes.
 */

import { createRng, seedFromString } from "../utils/random";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorldCoachPhilosophy =
  | "attacking"
  | "defensive"
  | "possession"
  | "counter"
  | "balanced"
  | "pressing"
  | "youth_focused";

export type WorldCoachSpecialty =
  | "youth_development"
  | "squad_management"
  | "tactics"
  | "fitness"
  | "motivation"
  | "transfers";

export type WorldCoachStatus =
  | "active"
  | "fired"
  | "resigned"
  | "retired"
  | "unemployed";

export interface WorldCoach {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  nationality: string;
  /** Club actuel — null si sans club */
  clubId: string | null;
  teamLevel: "academy" | "reserve" | "first_team";
  philosophy: WorldCoachPhilosophy;
  specialty: WorldCoachSpecialty;
  status: WorldCoachStatus;

  /** Compétences 0-100 */
  skills: {
    attack: number;
    defense: number;
    youthDevelopment: number;
    motivation: number;
    tactics: number;
    fitness: number;
  };

  /** Formation préférée : "4-3-3", "4-4-2", "3-5-2", "4-2-3-1", "5-3-2" */
  preferredFormation: string;

  /** Personnalité (influence licenciements et pressions) */
  ambition: number;     // 0-100 : plus ambitieux = part plus vite si déçu
  patience: number;     // 0-100 : moins de pression si élevé
  loyalty: number;      // 0-100 : reste plus longtemps

  /** Contrat */
  salary: number;       // hebdomadaire €
  contractEndSeason: number;
  hiredSeason: number;
  hiredWeek: number;

  /** Réputation & historique */
  reputation: number;   // 0-100
  careerTrophies: number;
  previousClubs: { clubId: string; seasons: number; fired: boolean }[];

  /** Évaluation courante par la direction */
  satisfactionScore: number; // 0-100 : descend avec mauvais résultats
  pressureLevel: number;     // 0-100 : monte vite si bad form
}

// ─── Prénoms et noms par régions ─────────────────────────────────────────────

const FIRST_NAMES_BY_REGION: Record<string, string[]> = {
  valtara:   ["James", "William", "Thomas", "Robert", "Edward", "Henry", "Charles", "George", "Arthur", "Frederick"],
  corenthia: ["Carlos", "Miguel", "Javier", "Rodrigo", "Fernando", "Pablo", "Alejandro", "Diego", "Rafael", "Sergio"],
  solendra:  ["Marco", "Luca", "Matteo", "Lorenzo", "Alessandro", "Giulio", "Federico", "Simone", "Andrea", "Roberto"],
  nordheim:  ["Erik", "Lars", "Bjorn", "Magnus", "Gunnar", "Sven", "Oskar", "Nils", "Axel", "Henrik"],
};

const LAST_NAMES_BY_REGION: Record<string, string[]> = {
  valtara:   ["Hartley", "Weston", "Blackwood", "Ashford", "Kingsley", "Thornton", "Mercer", "Donovan", "Walsh", "Pemberton"],
  corenthia: ["Vargas", "Moreno", "Castillo", "Herrera", "Delgado", "Ramos", "Torres", "Fuentes", "Ruiz", "Medina"],
  solendra:  ["Ricci", "Conti", "Bianchi", "Ferrara", "Gentile", "Lombardi", "Romano", "Gallo", "Russo", "Martini"],
  nordheim:  ["Andersen", "Johansson", "Lindqvist", "Bergström", "Eriksson", "Halvorsen", "Dahl", "Strand", "Vik", "Moen"],
};

const PHILOSOPHIES: WorldCoachPhilosophy[] = [
  "attacking", "defensive", "possession", "counter", "balanced", "pressing", "youth_focused"
];
const SPECIALTIES: WorldCoachSpecialty[] = [
  "youth_development", "squad_management", "tactics", "fitness", "motivation", "transfers"
];
const FORMATIONS = ["4-3-3", "4-4-2", "3-5-2", "4-2-3-1", "5-3-2", "4-1-4-1", "4-3-3"];

// ─── Génération déterministe d'un coach ──────────────────────────────────────

export function generateWorldCoach(
  clubId: string,
  countryId: string,
  teamLevel: WorldCoach["teamLevel"],
  reputation: number, // réputation du club : définit le niveau du coach
  season: number,
  seed: string,
): WorldCoach {
  const rng = createRng(seedFromString(seed));

  const region = countryId;
  const firstNames = FIRST_NAMES_BY_REGION[region] ?? FIRST_NAMES_BY_REGION.valtara;
  const lastNames  = LAST_NAMES_BY_REGION[region]  ?? LAST_NAMES_BY_REGION.valtara;

  const firstName = rng.pick(firstNames);
  const lastName  = rng.pick(lastNames);
  const age       = rng.int(34, 60);

  // Niveau du coach selon réputation du club et niveau d'équipe
  const levelMod = teamLevel === "first_team" ? 0 : teamLevel === "reserve" ? -15 : -25;
  const coachReputation = Math.max(20, Math.min(99, reputation + levelMod + rng.int(-10, 10)));

  const philosophy = rng.pick(PHILOSOPHIES);
  const specialty  = rng.pick(SPECIALTIES);

  // Compétences corrélées à la réputation + spécialité
  const baseSkill = Math.round(coachReputation * 0.8);
  const skills = {
    attack:           clampSkill(baseSkill + rng.int(-15, 15) + (philosophy === "attacking" || philosophy === "pressing" ? 10 : 0)),
    defense:          clampSkill(baseSkill + rng.int(-15, 15) + (philosophy === "defensive" ? 10 : 0)),
    youthDevelopment: clampSkill(baseSkill + rng.int(-15, 15) + (specialty === "youth_development" || philosophy === "youth_focused" ? 15 : 0)),
    motivation:       clampSkill(baseSkill + rng.int(-15, 15) + (specialty === "motivation" ? 15 : 0)),
    tactics:          clampSkill(baseSkill + rng.int(-15, 15) + (specialty === "tactics" ? 15 : 0)),
    fitness:          clampSkill(baseSkill + rng.int(-15, 15) + (specialty === "fitness" ? 15 : 0)),
  };

  const salary = Math.round((500 + coachReputation * 80) * (teamLevel === "first_team" ? 1 : teamLevel === "reserve" ? 0.5 : 0.3));

  return {
    id: `coach-${clubId}-${teamLevel}-${season}`,
    firstName,
    lastName,
    age,
    nationality: countryId,
    clubId,
    teamLevel,
    philosophy,
    specialty,
    status: "active",
    skills,
    preferredFormation: rng.pick(FORMATIONS),
    ambition:  rng.int(30, 90),
    patience:  rng.int(30, 80),
    loyalty:   rng.int(20, 90),
    salary,
    contractEndSeason: season + rng.int(1, 3),
    hiredSeason: season,
    hiredWeek: 1,
    reputation: coachReputation,
    careerTrophies: Math.max(0, rng.int(-2, Math.floor(coachReputation / 20))),
    previousClubs: [],
    satisfactionScore: 70,
    pressureLevel: 20,
  };
}

function clampSkill(v: number): number {
  return Math.max(10, Math.min(99, v));
}

// ─── IA : Évaluation de la satisfaction ──────────────────────────────────────

export interface ClubPerformanceSnapshot {
  leaguePosition: number;
  totalClubs: number;
  expectedPosition: number; // basé sur réputation club
  lastFiveResults: ("W" | "D" | "L")[];
  goalsFor: number;
  goalsAgainst: number;
  season: number;
  week: number;
}

/**
 * Met à jour la satisfaction et la pression d'un coach selon les résultats.
 * Appelé après chaque journée simulée.
 */
export function updateCoachSatisfaction(
  coach: WorldCoach,
  perf: ClubPerformanceSnapshot,
): WorldCoach {
  const relativePos = perf.leaguePosition / perf.totalClubs; // 0 = 1er, 1 = dernier
  const expectedRel = perf.expectedPosition / perf.totalClubs;

  // Performance relative vs attente
  const perfScore = 1 - relativePos; // 0=dernier, 1=premier
  const expectedScore = 1 - expectedRel;
  const delta = (perfScore - expectedScore) * 40; // -40 à +40

  // Forme récente (5 derniers)
  const formScore = perf.lastFiveResults.reduce((acc, r) => {
    if (r === "W") return acc + 3;
    if (r === "D") return acc + 1;
    return acc;
  }, 0);
  const formNorm = (formScore / 15) * 30 - 15; // -15 à +15

  // Mise à jour satisfaction
  const newSatisfaction = Math.max(0, Math.min(100,
    coach.satisfactionScore * 0.92 + delta * 0.5 + formNorm * 0.3 + 4
  ));

  // Pression : monte vite quand mauvais résultats
  const pressureDelta = perfScore < expectedScore - 0.15
    ? 8 + (expectedScore - perfScore) * 20
    : perfScore > expectedScore + 0.1
    ? -6
    : -2;
  const newPressure = Math.max(0, Math.min(100, coach.pressureLevel + pressureDelta));

  return {
    ...coach,
    satisfactionScore: Math.round(newSatisfaction),
    pressureLevel: Math.round(newPressure),
  };
}

// ─── IA : Décision de licenciement par la direction ──────────────────────────

export interface FiringDecisionResult {
  fire: boolean;
  reason: string;
  urgency: "low" | "medium" | "high";
}

/**
 * La direction évalue si le coach doit être licencié.
 * Facteurs : pression, satisfaction, saison avancée, écart en classement.
 */
export function evaluateFiringDecision(
  coach: WorldCoach,
  perf: ClubPerformanceSnapshot,
  directorPatience: number, // 0-100 : patience de la direction
): FiringDecisionResult {
  const noFire: FiringDecisionResult = { fire: false, reason: "", urgency: "low" };

  // Trop tôt en saison (8 premières semaines de grâce)
  if (perf.week <= 8) return noFire;

  // Catastrophe : dernier ou avant-dernier, relégation probable
  const inRelegationZone = perf.leaguePosition >= perf.totalClubs - 2;
  const wayBelowExpected = perf.leaguePosition > perf.expectedPosition + 4;

  // Seuil de pression ajusté à la patience de la direction
  const pressureThreshold = 30 + directorPatience * 0.5; // 30-80

  if (coach.pressureLevel >= 90 && inRelegationZone) {
    return { fire: true, reason: "Résultats catastrophiques — zone de relégation.", urgency: "high" };
  }

  if (coach.pressureLevel >= 80 && wayBelowExpected && coach.satisfactionScore < 25) {
    return { fire: true, reason: "Objectifs largement ratés.", urgency: "high" };
  }

  if (coach.pressureLevel >= pressureThreshold && coach.satisfactionScore < 35 && perf.week >= 20) {
    return { fire: true, reason: "Résultats insuffisants sur la durée.", urgency: "medium" };
  }

  // Contrat terminé sans résultats
  if (coach.contractEndSeason <= perf.season && coach.satisfactionScore < 55) {
    return { fire: true, reason: "Fin de contrat — pas de renouvellement.", urgency: "low" };
  }

  return noFire;
}

// ─── IA : Recherche d'un remplaçant ──────────────────────────────────────────

/**
 * Sélectionne un coach remplaçant parmi les disponibles.
 * Favorise les coaches de réputation proche du club.
 */
export function recruitReplacementCoach(
  clubReputation: number,
  countryId: string,
  teamLevel: WorldCoach["teamLevel"],
  availableCoaches: WorldCoach[],
  season: number,
  rng: ReturnType<typeof createRng>,
): WorldCoach | null {
  const candidates = availableCoaches.filter(c =>
    c.status === "unemployed" &&
    c.teamLevel === teamLevel &&
    Math.abs(c.reputation - clubReputation) <= 20
  );

  if (candidates.length === 0) {
    // Aucun disponible — génère un nouveau coach
    const seed = `new-coach-${clubReputation}-${season}-${Math.random()}`;
    return generateWorldCoach("temp", countryId, teamLevel, clubReputation, season, seed);
  }

  // Trie par proximité de réputation
  candidates.sort((a, b) =>
    Math.abs(a.reputation - clubReputation) - Math.abs(b.reputation - clubReputation)
  );

  return candidates[0];
}

// ─── IA : Tactique et composition ────────────────────────────────────────────

export interface CoachTacticsOutput {
  formation: string;
  style: "attacking" | "balanced" | "defensive";
  pressIntensity: number; // 0-100
  lineHeight: number;     // 0-100 (bas=défensif, haut=offensif)
  tempoSetting: number;   // 0-100 (lent=possession, rapide=contre)
}

/**
 * Génère les paramètres tactiques pour un match selon la philosophie du coach.
 */
export function buildCoachTactics(
  coach: WorldCoach,
  isHome: boolean,
  rivalReputation: number,
  ownReputation: number,
): CoachTacticsOutput {
  const philo = coach.philosophy;
  const repDiff = ownReputation - rivalReputation; // positif = favori

  let style: CoachTacticsOutput["style"] = "balanced";
  let pressIntensity = 50;
  let lineHeight = 50;
  let tempoSetting = 50;

  switch (philo) {
    case "attacking":
      style = "attacking";
      pressIntensity = 75;
      lineHeight = 70;
      tempoSetting = 65;
      break;
    case "defensive":
      style = "defensive";
      pressIntensity = 35;
      lineHeight = 30;
      tempoSetting = 35;
      break;
    case "possession":
      style = "balanced";
      pressIntensity = 55;
      lineHeight = 55;
      tempoSetting = 30; // slow tempo = possession
      break;
    case "counter":
      style = "defensive";
      pressIntensity = 40;
      lineHeight = 35;
      tempoSetting = 80; // fast transitions
      break;
    case "pressing":
      style = "attacking";
      pressIntensity = 90;
      lineHeight = 65;
      tempoSetting = 75;
      break;
    case "youth_focused":
    case "balanced":
    default:
      style = "balanced";
      pressIntensity = 50;
      lineHeight = 50;
      tempoSetting = 50;
      break;
  }

  // Ajustement selon statut de favori
  if (repDiff < -20 && !isHome) {
    // Outsider à l'extérieur → plus défensif
    style = "defensive";
    lineHeight = Math.max(20, lineHeight - 20);
    pressIntensity = Math.max(20, pressIntensity - 15);
  } else if (repDiff > 20 && isHome) {
    // Grand favori à domicile → plus offensif
    style = "attacking";
    lineHeight = Math.min(85, lineHeight + 15);
  }

  return {
    formation: coach.preferredFormation,
    style,
    pressIntensity,
    lineHeight,
    tempoSetting,
  };
}

// ─── Coach satisfaction IA: décision de départ volontaire ────────────────────

export function evaluateResignation(
  coach: WorldCoach,
  perf: ClubPerformanceSnapshot,
): { resign: boolean; reason: string } {
  // Un coach très ambitieux part si l'équipe ne lui permet pas d'évoluer
  if (coach.ambition > 75 && perf.leaguePosition > 3 && perf.season >= coach.hiredSeason + 2) {
    if (Math.random() < 0.05) {
      return { resign: true, reason: "Départ volontaire — recherche d'un projet plus ambitieux." };
    }
  }

  // Contrat terminé + satisfait → renégociation OU départ
  if (coach.contractEndSeason <= perf.season && coach.satisfactionScore >= 65) {
    if (coach.loyalty < 40 && Math.random() < 0.3) {
      return { resign: true, reason: "Fin de contrat — nouvelle opportunité acceptée." };
    }
  }

  return { resign: false, reason: "" };
}
