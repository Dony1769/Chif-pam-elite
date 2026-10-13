/**
 * FC CAREER — Étape 11 : Médias, Blessures, Mental & Sanctions
 */

/* ------------------------------------------------------------------ */
/* 11.1 — Médias & Conférences de presse                               */
/* ------------------------------------------------------------------ */

export type MediaReaction = "catastrophic" | "discreet" | "good" | "magistral";

export function getMediaReaction(rating: number): { reaction: MediaReaction; label: string } {
  if (rating < 5) return { reaction: "catastrophic", label: "Prestation catastrophique" };
  if (rating < 7) return { reaction: "discreet", label: "Match discret" };
  if (rating < 9) return { reaction: "good", label: "Très bon match !" };
  return { reaction: "magistral", label: "MAGISTRAL !" };
}

export interface PressQuestionChoice {
  id: string;
  label: string;
  tone: "diplomat" | "arrogant" | "neutral" | "humble" | "collective";
  imageDelta: number;
  coachTrustDelta: number;
  moraleDelta: number;
  pressureDelta: number;
}

export interface PressQuestion {
  id: string;
  question: string;
  choices: PressQuestionChoice[];
}

export const PRESS_QUESTIONS: PressQuestion[] = [
  {
    id: "rival-question",
    question: "Que pensez-vous de votre concurrent au poste ?",
    choices: [
      { id: "diplomat", label: "Il est bon, ça me motive", tone: "diplomat", imageDelta: 5, coachTrustDelta: 3, moraleDelta: 0, pressureDelta: 0 },
      { id: "arrogant", label: "Je suis meilleur", tone: "arrogant", imageDelta: -5, coachTrustDelta: -3, moraleDelta: 5, pressureDelta: 5 },
      { id: "neutral", label: "Pas de commentaire", tone: "neutral", imageDelta: 0, coachTrustDelta: 0, moraleDelta: 0, pressureDelta: 0 },
    ],
  },
  {
    id: "golden-globe",
    question: "Vous êtes en forme, vous visez le Globe d'Or ?",
    choices: [
      { id: "humble", label: "Ce serait un rêve", tone: "humble", imageDelta: 5, coachTrustDelta: 0, moraleDelta: 5, pressureDelta: 5 },
      { id: "arrogant", label: "Je le mérite", tone: "arrogant", imageDelta: -5, coachTrustDelta: -2, moraleDelta: 10, pressureDelta: 10 },
      { id: "collective", label: "Je pense d'abord au collectif", tone: "collective", imageDelta: 3, coachTrustDelta: 5, moraleDelta: 0, pressureDelta: 0 },
    ],
  },
  {
    id: "transfer-rumor",
    question: "Les rumeurs de transfert, ça vous affecte ?",
    choices: [
      { id: "focused", label: "Je suis concentré sur mon club", tone: "diplomat", imageDelta: 5, coachTrustDelta: 5, moraleDelta: 0, pressureDelta: -5 },
      { id: "open", label: "On verra ce qui se passe", tone: "neutral", imageDelta: 0, coachTrustDelta: -5, moraleDelta: 0, pressureDelta: 5 },
      { id: "deny", label: "Pas de commentaire", tone: "neutral", imageDelta: 0, coachTrustDelta: 0, moraleDelta: 0, pressureDelta: 0 },
    ],
  },
  {
    id: "bad-result",
    question: "L'équipe traverse une mauvaise passe, comment réagir ?",
    choices: [
      { id: "leader", label: "On va se relever, j'en suis sûr", tone: "diplomat", imageDelta: 5, coachTrustDelta: 5, moraleDelta: 5, pressureDelta: -3 },
      { id: "blame", label: "Il y a des problèmes en interne", tone: "arrogant", imageDelta: -10, coachTrustDelta: -10, moraleDelta: -5, pressureDelta: 10 },
      { id: "deflect", label: "Le football c'est comme ça", tone: "neutral", imageDelta: 0, coachTrustDelta: 0, moraleDelta: 0, pressureDelta: 0 },
    ],
  },
  {
    id: "young-talent",
    question: "Vous êtes un exemple pour les jeunes, un conseil ?",
    choices: [
      { id: "mentor", label: "Travaillez dur et restez humbles", tone: "humble", imageDelta: 10, coachTrustDelta: 3, moraleDelta: 5, pressureDelta: 0 },
      { id: "star", label: "Regardez-moi et apprenez", tone: "arrogant", imageDelta: -8, coachTrustDelta: -2, moraleDelta: 3, pressureDelta: 5 },
    ],
  },
];

export interface PressConference {
  id: string;
  dayNumber: number;
  questions: PressQuestion[];
  answers: { questionId: string; choiceId: string }[];
}

/* ------------------------------------------------------------------ */
/* 11.2 — Santé mentale                                                */
/* ------------------------------------------------------------------ */

export interface MentalState {
  /** Pression (0-100) */
  pressure: number;
  /** Peur du contact après blessure (0-100, 0 = aucune) */
  contactFear: number;
  /** Matchs joués sans re-blessure (reset contactFear) */
  matchesSinceReturn: number;
  /** Burnout actif */
  burnout: boolean;
  burnoutDaysLeft: number;
  /** Sessions psychologue cette semaine */
  psychSessionsThisWeek: number;
}

export type PressureSource =
  | "match-streak"    // enchaînement de matchs
  | "media-criticism" // critiques médias
  | "final-near"      // finale proche
  | "transfer-saga"   // saga de transfert
  | "objectives-fail" // objectifs non atteints
  | "coach-conflict"; // conflit coach

export type PressureRelief =
  | "rest"            // repos
  | "victory"         // victoire
  | "agent-support"   // soutien agent/famille
  | "psychologist";   // psychologue

/* ------------------------------------------------------------------ */
/* 11.3 — Blessures                                                    */
/* ------------------------------------------------------------------ */

export type InjuryType =
  | "contusion"
  | "elongation"
  | "sprain"
  | "tear"
  | "fracture"
  | "acl"
  | "chronic";

export interface InjuryDef {
  type: InjuryType;
  label: string;
  emoji: string;
  /** Durée en jours [min, max] */
  durationDays: [number, number];
  /** Fréquence pondérée (en %) */
  frequency: number;
  /** Considérée grave si durée > 30 jours */
  severe: boolean;
}

export const INJURIES: InjuryDef[] = [
  { type: "contusion", label: "Contusion", emoji: "🟡", durationDays: [1, 3], frequency: 35, severe: false },
  { type: "elongation", label: "Élongation", emoji: "🟠", durationDays: [7, 14], frequency: 25, severe: false },
  { type: "sprain", label: "Entorse", emoji: "🔴", durationDays: [14, 28], frequency: 15, severe: false },
  { type: "tear", label: "Déchirure musculaire", emoji: "🔴", durationDays: [28, 56], frequency: 10, severe: true },
  { type: "fracture", label: "Fracture", emoji: "⛔", durationDays: [60, 120], frequency: 8, severe: true },
  { type: "acl", label: "Ligaments croisés", emoji: "💀", durationDays: [180, 270], frequency: 5, severe: true },
  { type: "chronic", label: "Blessure chronique", emoji: "♻️", durationDays: [7, 21], frequency: 2, severe: false },
];

export interface ActiveInjury {
  type: InjuryType;
  daysLeft: number;
  totalDays: number;
  occurredOnDay: number;
}

/* ------------------------------------------------------------------ */
/* 11.5 — Sanctions                                                    */
/* ------------------------------------------------------------------ */

export interface SanctionState {
  /** Cartons jaunes cette saison */
  yellowsThisSeason: number;
  /** Cartons jaunes sur les 10 derniers matchs */
  yellowsLast10: number;
  /** Cartons rouges cette saison */
  redsThisSeason: number;
  /** Matchs de suspension restants */
  suspensionMatchesLeft: number;
  /** Amendes cumulées cette saison */
  totalFines: number;
}

export type OffFieldOffense = "late-training" | "coach-conflict" | "public-scandal";

export interface OffFieldSanction {
  offense: OffFieldOffense;
  label: string;
  fineMultiplier: number; // multiplicateur du salaire journalier
  suspensionMatches: number;
  pressureDelta: number;
}

export const OFF_FIELD_SANCTIONS: OffFieldSanction[] = [
  { offense: "late-training", label: "Retard à l'entraînement", fineMultiplier: 1, suspensionMatches: 0, pressureDelta: 5 },
  { offense: "coach-conflict", label: "Conflit avec le coach", fineMultiplier: 0, suspensionMatches: 2, pressureDelta: 15 },
  { offense: "public-scandal", label: "Scandale public", fineMultiplier: 7, suspensionMatches: 3, pressureDelta: 20 },
];
