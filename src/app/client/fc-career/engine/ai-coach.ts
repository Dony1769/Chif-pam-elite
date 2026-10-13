/**
 * FC CAREER — Étape 7 : Coach engine
 * Trust, conversations, squad selection, objectives, loans.
 */

import type { PositionId, PositionFamily } from "../constants/positions";
import type { Player } from "../types/player";
import type { Club } from "../types/club";
import type {
  CoachRelationship,
  CoachConversation,
  CoachConversationType,
  ConversationChoice,
  CoachMood,
  SimulatedPlayer,
  SquadState,
  SquadStatus,
  SeasonObjective,
  ObjectivesState,
  LoanOffer,
  LoanType,
  ActiveLoan,
} from "../types/relationship";
import { getPosition } from "../constants/positions";

/* ================================================================== */
/* 7.1 — Coach Relationship                                           */
/* ================================================================== */

export function createCoachRelationship(initialTrust = 55): CoachRelationship {
  return {
    trust: Math.max(0, Math.min(100, initialTrust)),
    mood: "neutral",
    lastConversationDay: 0,
    conversationCooldownDays: 7,
  };
}

export function updateTrust(rel: CoachRelationship, delta: number): CoachRelationship {
  const trust = Math.max(0, Math.min(100, rel.trust + delta));
  return { ...rel, trust, mood: moodFromTrust(trust) };
}

function moodFromTrust(trust: number): CoachMood {
  if (trust >= 80) return "happy";
  if (trust >= 50) return "neutral";
  if (trust >= 20) return "annoyed";
  return "angry";
}

/** Trust bracket label */
export function getTrustBracket(trust: number): string {
  if (trust >= 80) return "Titulaire quasi garanti";
  if (trust >= 50) return "En concurrence";
  if (trust >= 20) return "Banc / tribune";
  return "Veut te vendre";
}

/** Check if player can initiate a conversation */
export function canInitiateConversation(rel: CoachRelationship, currentDay: number): boolean {
  return currentDay - rel.lastConversationDay >= rel.conversationCooldownDays;
}

/** All conversation templates */
const CONVERSATIONS: CoachConversation[] = [
  {
    type: "demand-playtime",
    title: "Demande de temps de jeu",
    message: "Coach, je mérite de jouer plus. J'ai travaillé dur à l'entraînement.",
    coachInitiated: false,
    minTrust: 30,
    choices: [
      { id: "polite", label: "Demander poliment", trustDelta: 2, moraleDelta: 5 },
      { id: "insist", label: "Insister fermement", trustDelta: -5, moraleDelta: -3, trustThreshold: 60 },
      { id: "accept", label: "Accepter la situation", trustDelta: 5, moraleDelta: -5 },
    ],
  },
  {
    type: "suggest-position",
    title: "Suggestion de poste",
    message: "Coach, j'aimerais essayer un autre poste. Je pense pouvoir apporter plus ailleurs.",
    coachInitiated: false,
    minTrust: 50,
    choices: [
      { id: "suggest", label: "Proposer un changement", trustDelta: 0, moraleDelta: 3, trustThreshold: 50 },
      { id: "drop", label: "Laisser tomber", trustDelta: 2, moraleDelta: -2 },
    ],
  },
  {
    type: "ask-why-benched",
    title: "Pourquoi je suis sur le banc ?",
    message: "Coach, pourquoi je ne suis pas titulaire ? J'ai besoin de comprendre.",
    coachInitiated: false,
    minTrust: 20,
    choices: [
      { id: "listen", label: "Écouter calmement", trustDelta: 5, moraleDelta: 3 },
      { id: "argue", label: "Contester sa décision", trustDelta: -8, moraleDelta: -5 },
      { id: "promise", label: "Promettre de faire mieux", trustDelta: 3, moraleDelta: 5 },
    ],
  },
  {
    type: "coach-counts-on-you",
    title: "Le coach compte sur toi",
    message: "Je compte sur toi pour le prochain match. C'est un gros rendez-vous, montre-moi ce que tu vaux.",
    coachInitiated: true,
    choices: [
      { id: "confident", label: "Je suis prêt, coach !", trustDelta: 3, moraleDelta: 10 },
      { id: "humble", label: "Je ferai de mon mieux", trustDelta: 5, moraleDelta: 5 },
      { id: "pressure", label: "C'est beaucoup de pression...", trustDelta: -2, moraleDelta: -3 },
    ],
  },
  {
    type: "coach-scolds",
    title: "Recadrage du coach",
    message: "Ta dernière prestation était inacceptable. Si tu ne te reprends pas, tu ne joueras plus.",
    coachInitiated: true,
    choices: [
      { id: "apologize", label: "S'excuser", trustDelta: 3, moraleDelta: -5 },
      { id: "defiant", label: "Se défendre", trustDelta: -10, moraleDelta: 5 },
      { id: "silent", label: "Encaisser en silence", trustDelta: 1, moraleDelta: -8 },
    ],
  },
];

export function getConversation(type: CoachConversationType): CoachConversation {
  return CONVERSATIONS.find((c) => c.type === type)!;
}

export function getAvailablePlayerConversations(rel: CoachRelationship): CoachConversation[] {
  return CONVERSATIONS.filter(
    (c) => !c.coachInitiated && (!c.minTrust || rel.trust >= c.minTrust),
  );
}

/** Decide if the coach triggers a conversation based on context */
export function getCoachInitiatedConversation(
  rel: CoachRelationship,
  lastMatchRating: number | null,
  isBeforeBigMatch: boolean,
): CoachConversationType | null {
  if (isBeforeBigMatch && rel.trust >= 50) return "coach-counts-on-you";
  if (lastMatchRating !== null && lastMatchRating < 5.0 && rel.trust >= 30) return "coach-scolds";
  return null;
}

/** Apply a conversation choice */
export function applyConversationChoice(
  rel: CoachRelationship,
  choice: ConversationChoice,
  currentDay: number,
): { relationship: CoachRelationship; moraleDelta: number; backfired: boolean } {
  let effectiveTrustDelta = choice.trustDelta;
  let moraleDelta = choice.moraleDelta;
  let backfired = false;

  // Backfire: if trust is below threshold, negative consequence amplified
  if (choice.trustThreshold && rel.trust < choice.trustThreshold) {
    effectiveTrustDelta = Math.min(effectiveTrustDelta, -8);
    moraleDelta = Math.min(moraleDelta, -10);
    backfired = true;
  }

  const updated = updateTrust(rel, effectiveTrustDelta);
  return {
    relationship: { ...updated, lastConversationDay: currentDay },
    moraleDelta,
    backfired,
  };
}

/* ================================================================== */
/* 7.2 — Squad Hierarchy & Selection                                  */
/* ================================================================== */

/** Fictional first/last names for simulated squad players */
const FIRST_NAMES = [
  "Lucas", "Marco", "Adrien", "Hugo", "Théo", "Mateo", "Axel", "Nolan",
  "Samuel", "Romain", "Youssef", "Karim", "Paulo", "Stefan", "Viktor",
  "Diogo", "Mamadou", "Ivan", "Andriy", "Luka", "Nikola", "Tomáš",
  "Éric", "Bastien", "Julien",
];

const LAST_NAMES = [
  "Fernandes", "da Silva", "Müller", "Petrov", "Rossi", "Dupont",
  "Moreau", "Garcia", "Hernandez", "Schmidt", "Bianchi", "Novak",
  "Diallo", "Camara", "Konaté", "Lindström", "Andersson", "Patel",
  "Tanaka", "Kim", "Papadopoulos", "Vuković", "Torres", "Mendes", "Ribeiro",
];

/** Standard squad positions (25 players) */
const SQUAD_TEMPLATE: PositionId[] = [
  "GK", "GK",
  "RB", "RCB", "RCB", "LCB", "LCB", "LB",
  "CDM", "CDM", "CM", "CM", "CM", "CAM",
  "RW", "RW", "LW", "ST", "ST", "CF",
  // depth
  "RB", "LB", "CM", "RW", "ST",
];

export function generateSquad(
  clubReputation: number,
  userPosition: PositionId,
  rng: () => number,
): SimulatedPlayer[] {
  const baseRating = Math.max(50, Math.min(85, clubReputation - 10));

  // Shuffle name arrays deterministically
  const shuffled = <T>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const fNames = shuffled(FIRST_NAMES);
  const lNames = shuffled(LAST_NAMES);

  return SQUAD_TEMPLATE.map((pos, i) => ({
    id: `sim-${pos}-${i}`,
    name: `${fNames[i % fNames.length]} ${lNames[i % lNames.length]}`,
    position: pos,
    rating: Math.max(50, Math.min(95, baseRating + Math.round((rng() - 0.5) * 16))),
    form: 50 + Math.round(rng() * 40),
    fatigue: Math.round(rng() * 30),
    lastThreeRatings: [6 + rng() * 2, 6 + rng() * 2, 6 + rng() * 2],
    age: 18 + Math.floor(rng() * 16),
  }));
}

/** Compute selection score (spec formula) */
function selectionScore(
  rating: number,
  form: number,
  fatigue: number,
  lastThreeAvg: number,
  coachTrust: number,
): number {
  const ratingPart = rating * 0.5;
  const formFatiguePart = ((form - fatigue) / 100) * 25 * 0.25;
  const recentPart = (lastThreeAvg / 10) * 15 * 0.15;
  const trustPart = (coachTrust / 100) * 10 * 0.10;
  return ratingPart + formFatiguePart + recentPart + trustPart;
}

/** Determine user's squad status based on competition with AI players */
export function evaluateSquadStatus(
  player: Player,
  squad: SimulatedPlayer[],
  coachTrust: number,
  lastThreeRatings: number[],
): SquadState {
  const userPos = player.position;
  const competitors = squad.filter((s) => s.position === userPos);

  const userAvgRating = lastThreeRatings.length > 0
    ? lastThreeRatings.reduce((a, b) => a + b, 0) / lastThreeRatings.length
    : 6.5;

  const userScore = selectionScore(
    player.overall,
    player.form,
    player.fatigue,
    userAvgRating,
    coachTrust,
  );

  const compScores = competitors.map((c) => {
    const avg = c.lastThreeRatings.length > 0
      ? c.lastThreeRatings.reduce((a, b) => a + b, 0) / c.lastThreeRatings.length
      : 6.5;
    return {
      playerId: c.id,
      score: selectionScore(c.rating, c.form, c.fatigue, avg, 60), // AI trust baseline
    };
  });

  const betterThanUser = compScores.filter((c) => c.score > userScore).length;
  let userStatus: SquadStatus;
  if (betterThanUser === 0) {
    userStatus = "TITULAIRE";
  } else if (betterThanUser === 1) {
    userStatus = "REMPLAÇANT";
  } else {
    userStatus = "TRIBUNE";
  }

  return {
    players: squad,
    userStatus,
    userSelectionScore: Math.round(userScore * 10) / 10,
    competitorScores: compScores,
  };
}

/** Get competitors for the user's position */
export function getCompetitors(squad: SimulatedPlayer[], position: PositionId): SimulatedPlayer[] {
  return squad.filter((s) => s.position === position);
}

/* ================================================================== */
/* 7.3 — Season Objectives                                            */
/* ================================================================== */

export function getPositionFamily(pos: PositionId): PositionFamily {
  return getPosition(pos).family;
}

/** Generate objectives based on position family */
export function generateObjectives(position: PositionId): ObjectivesState {
  const family = getPositionFamily(position);
  const objectives: SeasonObjective[] = [];

  switch (family) {
    case "att":
      objectives.push(
        { id: "obj-goals", type: "goals", label: "Marquer 12 buts", target: 12, current: 0, completed: false },
        { id: "obj-assists", type: "assists", label: "Délivrer 5 passes décisives", target: 5, current: 0, completed: false },
      );
      break;
    case "mid":
      objectives.push(
        { id: "obj-rating", type: "avg-rating", label: "Note moyenne de 7.0 sur 25 matchs", target: 7.0, current: 0, completed: false },
        { id: "obj-matches", type: "matches-played", label: "Jouer 25 matchs", target: 25, current: 0, completed: false },
      );
      break;
    case "def":
      objectives.push(
        { id: "obj-cards", type: "max-cards", label: "Maximum 3 cartons", target: 3, current: 0, completed: false },
        { id: "obj-clean", type: "clean-sheets", label: "10 clean sheets", target: 10, current: 0, completed: false },
      );
      break;
    case "gk":
      objectives.push(
        { id: "obj-saves", type: "saves-pct", label: "70% d'arrêts", target: 70, current: 0, completed: false },
        { id: "obj-clean-gk", type: "clean-sheets", label: "12 clean sheets", target: 12, current: 0, completed: false },
      );
      break;
  }

  return { objectives, evaluated: false, success: null };
}

/** Update objective progress after a match */
export function updateObjectiveProgress(
  state: ObjectivesState,
  stats: { goals: number; assists: number; rating: number; cleanSheet: boolean; yellowCards: number; redCards: number; matchesPlayed: number; savesPct?: number },
): ObjectivesState {
  const objectives = state.objectives.map((obj) => {
    const updated = { ...obj };
    switch (obj.type) {
      case "goals":
        updated.current += stats.goals;
        break;
      case "assists":
        updated.current += stats.assists;
        break;
      case "avg-rating":
        // Rolling average: (old * (matches-1) + new) / matches
        updated.current = stats.matchesPlayed > 0
          ? Math.round(((obj.current * (stats.matchesPlayed - 1) + stats.rating) / stats.matchesPlayed) * 10) / 10
          : stats.rating;
        break;
      case "matches-played":
        updated.current = stats.matchesPlayed;
        break;
      case "clean-sheets":
        if (stats.cleanSheet) updated.current++;
        break;
      case "saves-pct":
        if (stats.savesPct !== undefined) updated.current = Math.round(stats.savesPct);
        break;
      case "max-cards":
        updated.current += stats.yellowCards + stats.redCards;
        break;
    }
    // For max-cards, "completed" means staying under target
    if (obj.type === "max-cards") {
      updated.completed = updated.current <= obj.target;
    } else {
      updated.completed = updated.current >= obj.target;
    }
    return updated;
  });

  return { ...state, objectives };
}

/** Evaluate objectives at end of season */
export function evaluateObjectives(state: ObjectivesState): {
  state: ObjectivesState;
  moraleDelta: number;
  trustDelta: number;
  extensionOffered: boolean;
} {
  const allCompleted = state.objectives.every((o) => o.completed);
  const success = allCompleted;

  return {
    state: { ...state, evaluated: true, success },
    moraleDelta: success ? 15 : -10,
    trustDelta: success ? 20 : -10,
    extensionOffered: success,
  };
}

/* ================================================================== */
/* 7.4 — Loans                                                        */
/* ================================================================== */

export function createLoanOffer(
  fromClubId: string,
  toClubId: string,
  type: LoanType,
  durationMonths: 6 | 12,
  buyPrice?: number,
  obligationMatches?: number,
): LoanOffer {
  return {
    id: `loan-${Date.now()}`,
    fromClubId,
    toClubId,
    type,
    durationMonths,
    buyPrice: type !== "dry" ? buyPrice : undefined,
    obligationCondition: type === "obligation-to-buy" && obligationMatches
      ? { matchesPlayed: obligationMatches }
      : undefined,
    salaryCoverage: type === "dry" ? 100 : 80,
  };
}

export function activateLoan(
  offer: LoanOffer,
  parentClubId: string,
  startDay: number,
): ActiveLoan {
  const daysPerMonth = 30;
  return {
    offer,
    startDay,
    endDay: startDay + offer.durationMonths * daysPerMonth,
    parentClubId,
    matchesPlayed: 0,
    avgRating: 0,
    bought: null,
  };
}

/** Resolve loan at the end: does the borrowing club buy? */
export function resolveLoan(loan: ActiveLoan): ActiveLoan {
  const { offer, matchesPlayed, avgRating } = loan;

  switch (offer.type) {
    case "dry":
      return { ...loan, bought: false };
    case "option-to-buy":
      // Buy if player performed well
      return { ...loan, bought: avgRating >= 7.0 && matchesPlayed >= 15 };
    case "obligation-to-buy":
      // Buy if obligation condition met
      if (offer.obligationCondition) {
        return { ...loan, bought: matchesPlayed >= offer.obligationCondition.matchesPlayed };
      }
      return { ...loan, bought: true };
  }
}

/** Update loan stats after a match */
export function updateLoanStats(
  loan: ActiveLoan,
  matchRating: number,
): ActiveLoan {
  const newMatches = loan.matchesPlayed + 1;
  const newAvg = ((loan.avgRating * loan.matchesPlayed) + matchRating) / newMatches;
  return {
    ...loan,
    matchesPlayed: newMatches,
    avgRating: Math.round(newAvg * 10) / 10,
  };
}

/** Check if loan has a positive rating bonus on return */
export function getLoanReturnBonus(loan: ActiveLoan): number {
  if (loan.avgRating >= 7.5 && loan.matchesPlayed >= 20) return 5;
  if (loan.avgRating >= 7.0 && loan.matchesPlayed >= 15) return 3;
  if (loan.avgRating >= 6.5 && loan.matchesPlayed >= 10) return 1;
  return 0;
}
