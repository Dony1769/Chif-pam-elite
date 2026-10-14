/**
 * FC CAREER — Étape 8 : Moteur de match complet
 * Simulation minute par minute, notation 8.4, choix, VAR, rituels.
 */

import type { Player, MatchRating } from "../types/player";
import type {
  SimulatedMatch, MatchEvent, TeamStats, SimulationOptions,
  MatchChoice, MatchChoiceMoment, MatchChoiceId,
  RitualState, RitualId, RITUALS,
  CelebrationId,
} from "../types/match";
import type { Club } from "../types/club";
import { getPosition } from "../constants/positions";
import { ROLE_WEIGHTS } from "../constants/positions";
import { fatiguePenalty } from "../constants/scaling";
import { createRng } from "./player-generator";

/* ================================================================== */
/* Helpers                                                             */
/* ================================================================== */

function teamStrength(club: Club): number {
  return club.reputation * 0.7 + club.prestige * 0.3;
}

function emptyStats(possession: number): TeamStats {
  return {
    possession,
    shots: 0,
    shotsOnTarget: 0,
    corners: 0,
    fouls: 0,
    offsides: 0,
    passAccuracy: 78,
    duelsWon: Math.round(possession / 2 + 25),
  };
}

function rollPoisson(rng: () => number, lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do { k++; p *= rng(); } while (p > L && k < 12);
  return k - 1;
}

/* ================================================================== */
/* Notation 8.4                                                        */
/* ================================================================== */

export interface RatingBreakdown {
  base: number;
  goalBonus: number;
  assistBonus: number;
  shotsOnTargetBonus: number;
  keyPassBonus: number;
  interceptBonus: number;
  tackleBonus: number;
  dribbleBonus: number;
  cleanSheetBonus: number;
  saveBonus: number;
  aerialBonus: number;
  motmBonus: number;
  errorMalus: number;
  penaltyConcededMalus: number;
  ballLossMalus: number;
  passAccMalus: number;
  yellowMalus: number;
  redMalus: number;
  dribbleFailMalus: number;
  shotOffTargetMalus: number;
  choiceBonus: number;
  total: number;
}

export function computeMatchRating(stats: {
  goals: number;
  assists: number;
  shotsOnTarget: number;
  keyPasses: number;
  interceptions: number;
  tackles: number;
  dribblesSucceeded: number;
  dribblesFailed: number;
  cleanSheet: boolean;
  saves: number;
  aerialDuels: number;
  errorLeadingToGoal: number;
  penaltyConceded: number;
  ballLosses: number;
  passAccuracy: number;
  yellowCards: number;
  redCards: number;
  shotsOffTarget: number;
  isMotm: boolean;
  choiceBonus: number;
}): RatingBreakdown {
  const base = 6.0;
  const goalBonus = stats.goals * 1.5;
  const assistBonus = stats.assists * 1.0;
  const shotsOnTargetBonus = stats.shotsOnTarget * 0.5;
  const keyPassBonus = stats.keyPasses * 0.3;
  const interceptBonus = stats.interceptions * 0.3;
  const tackleBonus = stats.tackles * 0.2;
  const dribbleBonus = stats.dribblesSucceeded * 0.2;
  const cleanSheetBonus = stats.cleanSheet ? 0.5 : 0;
  const saveBonus = stats.saves * 0.3;
  const aerialBonus = stats.aerialDuels * 0.2;
  const motmBonus = stats.isMotm ? 0.3 : 0;
  const errorMalus = stats.errorLeadingToGoal * -1.5;
  const penaltyConcededMalus = stats.penaltyConceded * -0.5;
  const ballLossMalus = stats.ballLosses * -0.3;
  const passAccMalus = stats.passAccuracy < 70 ? -0.2 : 0;
  const yellowMalus = stats.yellowCards * -0.5;
  const redMalus = stats.redCards * -2.0;
  const dribbleFailMalus = stats.dribblesFailed * -0.3;
  const shotOffTargetMalus = stats.shotsOffTarget * -0.2;
  const choiceBonus = stats.choiceBonus;

  const raw = base + goalBonus + assistBonus + shotsOnTargetBonus + keyPassBonus
    + interceptBonus + tackleBonus + dribbleBonus + cleanSheetBonus + saveBonus
    + aerialBonus + motmBonus + errorMalus + penaltyConcededMalus + ballLossMalus
    + passAccMalus + yellowMalus + redMalus + dribbleFailMalus + shotOffTargetMalus
    + choiceBonus;

  const total = Math.max(3.0, Math.min(10.0, Math.round(raw * 10) / 10));

  return {
    base, goalBonus, assistBonus, shotsOnTargetBonus, keyPassBonus,
    interceptBonus, tackleBonus, dribbleBonus, cleanSheetBonus, saveBonus,
    aerialBonus, motmBonus, errorMalus, penaltyConcededMalus, ballLossMalus,
    passAccMalus, yellowMalus, redMalus, dribbleFailMalus, shotOffTargetMalus,
    choiceBonus, total,
  };
}

/* ================================================================== */
/* Match Choice Moments (8.2)                                          */
/* ================================================================== */

const CHOICE_PAIRS: [MatchChoice, MatchChoice][] = [
  [
    { id: "corner-front-post", label: "1er poteau (agressif)", emoji: "🎯", baseSuccessPct: 40, successOutcome: "Tête puissante !", successRatingBonus: 0.5, failureOutcome: "Dévié par le défenseur.", failureRatingMalus: -0.1, canGoal: true, cardRisk: 0 },
    { id: "corner-back-post", label: "2e poteau (prudent)", emoji: "🎯", baseSuccessPct: 55, successOutcome: "Bien placé au 2e poteau.", successRatingBonus: 0.3, failureOutcome: "Corner dégagé.", failureRatingMalus: 0, canGoal: true, cardRisk: 0 },
  ],
  [
    { id: "dribble", label: "Dribbler (risqué)", emoji: "⚡", baseSuccessPct: 35, successOutcome: "Dribble magnifique !", successRatingBonus: 0.4, failureOutcome: "Perte de balle.", failureRatingMalus: -0.3, canGoal: true, cardRisk: 0 },
    { id: "pass-safe", label: "Passer (sûr)", emoji: "📤", baseSuccessPct: 70, successOutcome: "Bonne passe en profondeur.", successRatingBonus: 0.2, failureOutcome: "Passe interceptée.", failureRatingMalus: -0.1, canGoal: false, cardRisk: 0 },
  ],
  [
    { id: "long-shot", label: "Tir de loin (30%)", emoji: "🚀", baseSuccessPct: 30, successOutcome: "FRAPPE SUBLIME DE LOIN !", successRatingBonus: 0.8, failureOutcome: "Tir au-dessus.", failureRatingMalus: -0.2, canGoal: true, cardRisk: 0 },
    { id: "advance", label: "Avancer (50%)", emoji: "🏃", baseSuccessPct: 50, successOutcome: "Bonne progression.", successRatingBonus: 0.3, failureOutcome: "Taclé ! Perte de balle.", failureRatingMalus: -0.2, canGoal: true, cardRisk: 0.05 },
  ],
  [
    { id: "contest-ref", label: "Contester l'arbitre", emoji: "🗣️", baseSuccessPct: 20, successOutcome: "L'arbitre revient sur sa décision.", successRatingBonus: 0.1, failureOutcome: "Carton jaune !", failureRatingMalus: -0.5, canGoal: false, cardRisk: 0.6 },
    { id: "accept-ref", label: "Accepter la décision", emoji: "🤝", baseSuccessPct: 90, successOutcome: "Fair-play reconnu.", successRatingBonus: 0.1, failureOutcome: "", failureRatingMalus: 0, canGoal: false, cardRisk: 0 },
  ],
  [
    { id: "press-high", label: "Pressing haut", emoji: "🔥", baseSuccessPct: 45, successOutcome: "Récupération haute et contre !", successRatingBonus: 0.4, failureOutcome: "Dépassé, espace derrière.", failureRatingMalus: -0.2, canGoal: true, cardRisk: 0.05 },
    { id: "stay-back", label: "Rester en place", emoji: "🛡️", baseSuccessPct: 75, successOutcome: "Bonne couverture défensive.", successRatingBonus: 0.15, failureOutcome: "L'adversaire trouve l'espace.", failureRatingMalus: -0.1, canGoal: false, cardRisk: 0 },
  ],
];

/** Generate 3-5 choice moments spread across a match. */
export function generateChoiceMoments(rng: () => number): MatchChoiceMoment[] {
  const count = 3 + Math.floor(rng() * 3); // 3-5
  const shuffled = [...CHOICE_PAIRS].sort(() => rng() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));

  const minutes = selected.map(() => 1 + Math.floor(rng() * 89)).sort((a, b) => a - b);

  const prompts = [
    "Situation de corner !",
    "Tu reçois le ballon face au défenseur...",
    "Tu es à 25 mètres du but...",
    "L'arbitre siffle contre toi !",
    "Phase défensive, tu choisis ta position...",
  ];

  return selected.map((pair, i) => ({
    minute: minutes[i],
    prompt: prompts[i % prompts.length],
    options: pair,
  }));
}

/** Resolve a choice with player attributes modifying success. */
export function resolveChoice(
  choice: MatchChoice,
  player: Player,
  rng: () => number,
): { success: boolean; goalScored: boolean; cardGiven: boolean } {
  // Modify success chance based on attributes
  let successPct = choice.baseSuccessPct;
  const attrs = player.attributes;

  if (choice.id === "dribble") successPct += (attrs.dribbling ?? 50) / 5;
  if (choice.id === "long-shot") successPct += (attrs.longShots ?? 50) / 5;
  if (choice.id === "corner-front-post") successPct += (attrs.heading ?? 50) / 5;
  if (choice.id === "press-high") successPct += (attrs.workRate ?? 50) / 5;
  if (choice.id === "pass-safe") successPct += (attrs.shortPass ?? 50) / 8;

  successPct = Math.max(5, Math.min(95, successPct));
  const success = rng() * 100 < successPct;
  const goalScored = success && choice.canGoal && rng() < 0.35;
  const cardGiven = !success && choice.cardRisk > 0 && rng() < choice.cardRisk;

  return { success, goalScored, cardGiven };
}

/* ================================================================== */
/* VAR Moments (8.2)                                                   */
/* ================================================================== */

export function shouldTriggerVAR(rng: () => number, varCount: number): boolean {
  if (varCount >= 2) return false;
  return rng() < 0.18;
}

export function resolveVAR(rng: () => number): { validated: boolean; reason: string } {
  const validated = rng() < 0.6;
  const reasons = validated
    ? ["But validé après vérification.", "Position régulière confirmée."]
    : ["Hors-jeu détecté !", "Main involontaire annule le but.", "Faute au départ de l'action."];
  return { validated, reason: reasons[Math.floor(rng() * reasons.length)] };
}

/* ================================================================== */
/* Rituels (8.1)                                                       */
/* ================================================================== */

export function createRitualState(): RitualState {
  return {
    selectedRituals: [],
    streaks: { music: 0, meditate: 0, "call-family": 0, "last-out": 0, pray: 0 },
    permanentBonuses: [],
    broken: false,
    brokenMatchesLeft: 0,
  };
}

export function applyRitualPreMatch(
  state: RitualState,
  chosenRituals: RitualId[],
): { state: RitualState; moraleDelta: number; ratingBonus: number } {
  let moraleDelta = 0;
  let ratingBonus = 0;
  const newStreaks = { ...state.streaks };
  const permanentBonuses = [...state.permanentBonuses];
  let broken = false;
  let brokenMatchesLeft = state.brokenMatchesLeft;

  // Check if ritual was broken (had rituals before, changed them)
  if (state.selectedRituals.length > 0) {
    const changed = state.selectedRituals.some((r) => !chosenRituals.includes(r));
    if (changed) {
      broken = true;
      brokenMatchesLeft = 3;
      moraleDelta -= 5;
      ratingBonus -= 0.2;
      // Reset broken ritual streaks
      for (const r of state.selectedRituals) {
        if (!chosenRituals.includes(r)) newStreaks[r] = 0;
      }
    }
  }

  // Apply chosen rituals
  for (const r of chosenRituals) {
    newStreaks[r] = (newStreaks[r] ?? 0) + 1;
    if (r === "call-family") moraleDelta += 5;
    ratingBonus += 0.1; // small consistent boost

    // Permanent bonus at streak threshold
    if (newStreaks[r] >= 10 && !permanentBonuses.includes(r)) {
      permanentBonuses.push(r);
      ratingBonus += 0.1;
    }
  }

  // Broken malus fades
  if (brokenMatchesLeft > 0) {
    ratingBonus -= 0.2;
    brokenMatchesLeft--;
  }

  return {
    state: {
      selectedRituals: chosenRituals,
      streaks: newStreaks,
      permanentBonuses,
      broken,
      brokenMatchesLeft,
    },
    moraleDelta,
    ratingBonus,
  };
}

/* ================================================================== */
/* Prediction de note                                                  */
/* ================================================================== */

export function predictRating(player: Player): number {
  const family = getPosition(player.position).family;
  const weights = ROLE_WEIGHTS[family];
  let total = 0;
  let wsum = 0;
  for (const [attrId, w] of Object.entries(weights)) {
    total += (player.attributes[attrId] ?? 50) * (w ?? 0);
    wsum += w ?? 0;
  }
  const raw = wsum > 0 ? total / wsum : player.overall;
  const formAdj = ((player.form - 50) / 50) * 0.6;
  const fatigueAdj = -(1 - fatiguePenalty(player.fatigue)) * 2.5;
  return Math.max(4, Math.min(10, raw / 12 + formAdj + fatigueAdj));
}

/* ================================================================== */
/* Probabilité de sélection                                            */
/* ================================================================== */

export function selectionChance(player: Player): number {
  const clubLevel = 55;
  const gap = player.overall - clubLevel;
  return Math.max(0.05, Math.min(0.95, 0.5 + gap / 40));
}

/* ================================================================== */
/* Timeline: événements minute par minute pour match joué (1-1.5min)   */
/* ================================================================== */

export interface LiveMatchTick {
  minute: number;
  event: MatchEvent | null;
  homeScore: number;
  awayScore: number;
  /** Si un choix est requis à cette minute */
  choiceMoment?: MatchChoiceMoment;
  /** Si la VAR intervient */
  varMoment?: boolean;
}

/**
 * Pré-génère la timeline complète d'un match (90+ minutes).
 * Le front-end la déroule tick par tick (1 tick = ~1 seconde réelle = ~1 minute de jeu).
 * Total: ~90 ticks ≈ 1min30 de temps réel.
 */
export function generateLiveTimeline(
  home: Club,
  away: Club,
  user: Player,
  choiceMoments: MatchChoiceMoment[],
  seed = Date.now(),
): { ticks: LiveMatchTick[]; baseResult: SimulatedMatch } {
  const rng = createRng(seed);

  const homeIsUser = home.id === user.contract.clubId;
  const sHome = teamStrength(home) + 4;
  const sAway = teamStrength(away);
  const diff = sHome - sAway;

  const lambdaHome = Math.max(0.2, 1.35 + diff / 45);
  const lambdaAway = Math.max(0.15, 1.1 - diff / 45);

  let homeScore = 0;
  let awayScore = 0;
  const events: MatchEvent[] = [];
  const ticks: LiveMatchTick[] = [];

  const scorerPool = ["M. Junior", "T. Nkunda", "A. Rivera", "K. Diallo", "L. Santos"];
  const userName = `${user.firstName} ${user.lastName}`;
  const userClubId = user.contract.clubId;

  // Injury time
  const injuryTime1 = 1 + Math.floor(rng() * 3);
  const injuryTime2 = 2 + Math.floor(rng() * 5);
  const totalMinutes = 90 + injuryTime2;

  // Pre-determine goal minutes
  const homeGoals = rollPoisson(rng, lambdaHome);
  const awayGoals = rollPoisson(rng, lambdaAway);
  const goalMinutes: { minute: number; clubId: string; scorer: string }[] = [];

  for (let i = 0; i < homeGoals; i++) {
    const m = 1 + Math.floor(rng() * 90);
    const isUser = home.id === userClubId && rng() < 0.35;
    goalMinutes.push({ minute: m, clubId: home.id, scorer: isUser ? userName : scorerPool[Math.floor(rng() * scorerPool.length)] });
  }
  for (let i = 0; i < awayGoals; i++) {
    const m = 1 + Math.floor(rng() * 90);
    const isUser = away.id === userClubId && rng() < 0.35;
    goalMinutes.push({ minute: m, clubId: away.id, scorer: isUser ? userName : scorerPool[Math.floor(rng() * scorerPool.length)] });
  }
  goalMinutes.sort((a, b) => a.minute - b.minute);

  // Pre-determine card minutes
  const cardMinutes: { minute: number; clubId: string; player: string; color: "yellow" | "red" }[] = [];
  const cardCount = rollPoisson(rng, 2.5);
  for (let i = 0; i < cardCount; i++) {
    const m = 5 + Math.floor(rng() * 85);
    const club = rng() < 0.5 ? home.id : away.id;
    const isUser = club === userClubId && rng() < 0.15;
    cardMinutes.push({ minute: m, clubId: club, player: isUser ? userName : scorerPool[Math.floor(rng() * scorerPool.length)], color: rng() < 0.92 ? "yellow" : "red" });
  }

  // VAR tracking
  let varCount = 0;

  // Build choice moment map
  const choiceMap = new Map<number, MatchChoiceMoment>();
  for (const cm of choiceMoments) {
    choiceMap.set(cm.minute, cm);
  }

  // Generate ticks
  // Kickoff
  ticks.push({
    minute: 0,
    event: { id: "whistle-ko", minute: 0, type: "whistle", half: "kickoff" },
    homeScore: 0,
    awayScore: 0,
  });

  for (let m = 1; m <= totalMinutes; m++) {
    let event: MatchEvent | null = null;
    let choiceMoment: MatchChoiceMoment | undefined;
    let varMoment = false;

    // Halftime
    if (m === 45 + injuryTime1) {
      ticks.push({
        minute: m,
        event: { id: `whistle-ht-${m}`, minute: m, type: "whistle", half: "halftime" },
        homeScore,
        awayScore,
      });
      ticks.push({
        minute: 46,
        event: { id: `whistle-2h-${m}`, minute: 46, type: "whistle", half: "secondhalf" },
        homeScore,
        awayScore,
      });
      continue;
    }

    // Goals
    const goal = goalMinutes.find((g) => g.minute === m);
    if (goal) {
      // Check for VAR
      if (shouldTriggerVAR(rng, varCount)) {
        varCount++;
        const varResult = resolveVAR(rng);
        if (varResult.validated) {
          if (goal.clubId === home.id) homeScore++;
          else awayScore++;
          event = { id: `goal-${m}`, minute: m, type: "goal", scorer: goal.scorer, clubId: goal.clubId };
          events.push(event);
          events.push({ id: `var-${m}`, minute: m, type: "var", clubId: goal.clubId, outcome: varResult.reason, varResult: "validated" });
        } else {
          event = { id: `var-${m}`, minute: m, type: "var", clubId: goal.clubId, outcome: varResult.reason, varResult: "cancelled" };
          events.push(event);
        }
        varMoment = true;
      } else {
        if (goal.clubId === home.id) homeScore++;
        else awayScore++;
        event = { id: `goal-${m}`, minute: m, type: "goal", scorer: goal.scorer, clubId: goal.clubId };
        events.push(event);
      }
    }

    // Cards
    const card = cardMinutes.find((c) => c.minute === m);
    if (card && !event) {
      event = { id: `card-${m}`, minute: m, type: "card", clubId: card.clubId, player: card.player, color: card.color };
      events.push(event);
    }

    // Choice moment
    if (choiceMap.has(m)) {
      choiceMoment = choiceMap.get(m);
    }

    // Chance events (fill quiet minutes with commentary)
    if (!event && rng() < 0.08) {
      const descriptions = [
        "Belle combinaison mais la défense tient.",
        "Tir repoussé par le gardien !",
        "Centre dangereux, dégagé in extremis.",
        "Coup franc indirect, rien de spécial.",
        "Beau mouvement collectif.",
      ];
      event = { id: `chance-${m}`, minute: m, type: "chance", clubId: rng() < 0.5 ? home.id : away.id, description: descriptions[Math.floor(rng() * descriptions.length)] };
      events.push(event);
    }

    ticks.push({ minute: m, event, homeScore, awayScore, choiceMoment, varMoment: varMoment || undefined });
  }

  // Full time whistle
  ticks.push({
    minute: totalMinutes,
    event: { id: `whistle-ft`, minute: totalMinutes, type: "whistle", half: "fulltime" },
    homeScore,
    awayScore,
  });

  // Build base user stats
  const played = user.condition === "fit" && rng() < selectionChance(user);
  const minutes = played ? (rng() < 0.75 ? 90 : 30 + Math.floor(rng() * 55)) : 0;
  const userGoals = events.filter((e) => e.type === "goal" && (e as { scorer: string }).scorer === userName).length;
  const userAssists = played ? rollPoisson(rng, 0.3) : 0;

  const homePoss = Math.round(50 + diff / 3 + (rng() * 8 - 4));

  const baseResult: SimulatedMatch = {
    id: `m-${seed.toString(36)}`,
    dayNumber: 0,
    competitionId: "ligue1",
    homeClubId: home.id,
    awayClubId: away.id,
    homeScore,
    awayScore,
    events,
    homeStats: { ...emptyStats(homePoss), shots: homeScore * 2 + 4 + Math.floor(rng() * 6), shotsOnTarget: homeScore + Math.floor(rng() * 3) },
    awayStats: { ...emptyStats(100 - homePoss), shots: awayScore * 2 + 4 + Math.floor(rng() * 6), shotsOnTarget: awayScore + Math.floor(rng() * 3) },
    userRating: {
      rating: 6.0,
      goals: userGoals,
      assists: userAssists,
      keyPasses: played ? rollPoisson(rng, 0.8) : 0,
      tackles: played ? rollPoisson(rng, 1.2) : 0,
      passesAccuracy: Math.round(68 + rng() * 24),
      shotsOnTarget: played ? rollPoisson(rng, 0.9 + userGoals) : 0,
      duelsWon: Math.round(38 + rng() * 30),
    },
    userPlayed: played,
    userMinutes: minutes,
  };

  return { ticks, baseResult };
}

/* ================================================================== */
/* Simulation rapide (mode "Simuler" — résultat instantané)            */
/* ================================================================== */

export function simulateMatch(
  home: Club,
  away: Club,
  user: Player,
  options: SimulationOptions = {},
): SimulatedMatch {
  const seed = options.seed ?? Date.now();
  const rng = createRng(seed);

  const homeIsUser = home.id === user.contract.clubId;
  const sHome = teamStrength(home) + 4;
  const sAway = teamStrength(away);
  const diff = sHome - sAway;

  const lambdaHome = Math.max(0.2, 1.35 + diff / 45);
  const lambdaAway = Math.max(0.15, 1.1 - diff / 45);

  const homeScore = rollPoisson(rng, lambdaHome);
  const awayScore = rollPoisson(rng, lambdaAway);

  const events: MatchEvent[] = [];
  const scorerPool = ["M. Junior", "T. Nkunda", "A. Rivera", "K. Diallo"];
  const userName = `${user.firstName} ${user.lastName}`;
  const userClubId = user.contract.clubId;

  const addGoals = (n: number, clubId: string) => {
    for (let i = 0; i < n; i++) {
      const isUser = clubId === userClubId && rng() < 0.35;
      events.push({
        id: `e-${clubId}-${i}-${seed}`,
        minute: 1 + Math.floor(rng() * 90),
        type: "goal",
        scorer: isUser ? userName : scorerPool[Math.floor(rng() * scorerPool.length)],
        clubId,
      });
    }
  };
  addGoals(homeScore, home.id);
  addGoals(awayScore, away.id);
  events.sort((a, b) => a.minute - b.minute);

  const userGoals = events.filter((e) => e.type === "goal" && (e as { scorer: string }).scorer === userName).length;

  const played = user.condition === "fit" && rng() < selectionChance(user);
  const minutes = played ? (rng() < 0.75 ? 90 : 30 + Math.floor(rng() * 55)) : 0;
  const userAssists = played ? rollPoisson(rng, 0.3) : 0;
  const userTackles = played ? rollPoisson(rng, 1.2) : 0;
  const userKeyPasses = played ? rollPoisson(rng, 0.8) : 0;
  const userShotsOnTarget = played ? rollPoisson(rng, 0.9 + userGoals) : 0;
  const passAcc = Math.round(68 + rng() * 24);

  // Compute rating via the 8.4 formula
  const isCleanSheet = homeIsUser ? awayScore === 0 : homeScore === 0;
  const breakdown = computeMatchRating({
    goals: played ? userGoals : 0,
    assists: played ? userAssists : 0,
    shotsOnTarget: played ? userShotsOnTarget : 0,
    keyPasses: played ? userKeyPasses : 0,
    interceptions: played ? rollPoisson(rng, 0.6) : 0,
    tackles: played ? userTackles : 0,
    dribblesSucceeded: played ? rollPoisson(rng, 0.8) : 0,
    dribblesFailed: played ? rollPoisson(rng, 0.4) : 0,
    cleanSheet: played && isCleanSheet,
    saves: 0,
    aerialDuels: played ? rollPoisson(rng, 0.5) : 0,
    errorLeadingToGoal: played && rng() < 0.05 ? 1 : 0,
    penaltyConceded: 0,
    ballLosses: played ? rollPoisson(rng, 0.3) : 0,
    passAccuracy: passAcc,
    yellowCards: played && rng() < 0.12 ? 1 : 0,
    redCards: 0,
    shotsOffTarget: played ? rollPoisson(rng, 0.5) : 0,
    isMotm: false,
    choiceBonus: 0,
  });

  const rating = played ? breakdown.total : 0;
  const isMotm = rating >= 7.5;

  const homePoss = Math.round(50 + diff / 3 + (rng() * 8 - 4));

  return {
    id: `m-${seed.toString(36)}`,
    dayNumber: 0,
    competitionId: "ligue1",
    homeClubId: home.id,
    awayClubId: away.id,
    homeScore,
    awayScore,
    events,
    homeStats: { ...emptyStats(homePoss), shots: homeScore * 2 + 4 + Math.floor(rng() * 6), shotsOnTarget: homeScore + Math.floor(rng() * 3) },
    awayStats: { ...emptyStats(100 - homePoss), shots: awayScore * 2 + 4 + Math.floor(rng() * 6), shotsOnTarget: awayScore + Math.floor(rng() * 3) },
    userRating: {
      rating,
      goals: played ? userGoals : 0,
      assists: played ? userAssists : 0,
      keyPasses: played ? userKeyPasses : 0,
      tackles: played ? userTackles : 0,
      passesAccuracy: passAcc,
      shotsOnTarget: played ? userShotsOnTarget : 0,
      duelsWon: Math.round(38 + rng() * 30),
    },
    userPlayed: played,
    userMinutes: minutes,
    manOfTheMatch: isMotm ? userName : scorerPool[0],
  };
}
