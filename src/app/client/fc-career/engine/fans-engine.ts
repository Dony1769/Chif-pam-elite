/**
 * FC CAREER — Étape 16 : Engine Fans, Vestiaire & Capitanat
 */

import type {
  FanState,
  FanAction,
  FanActionResult,
  LockerRoomState,
  LockerRoomMember,
  LockerRoomMood,
  LockerRoomConflict,
  ConflictChoice,
  CaptainState,
  SpeechType,
  SpeechResult,
  FansVestiaireState,
  LockerRoomRole,
} from "../types/fans";

/* ------------------------------------------------------------------ */
/* Fans                                                                */
/* ------------------------------------------------------------------ */

export function createFanState(): FanState {
  return {
    popularity: 50,
    jerseysAvailable: 3,
    fansSingName: false,
    tifoActive: false,
    isIdol: false,
    fansWhistle: false,
    fansDemandDeparture: false,
  };
}

function refreshFanFlags(state: FanState): FanState {
  return {
    ...state,
    fansSingName: state.popularity > 80,
    tifoActive: state.popularity > 80,
    isIdol: state.popularity > 90,
    fansWhistle: state.popularity < 30,
    fansDemandDeparture: state.popularity < 10,
  };
}

export function adjustPopularity(state: FanState, delta: number): FanState {
  const updated = { ...state, popularity: Math.max(0, Math.min(100, state.popularity + delta)) };
  return refreshFanFlags(updated);
}

const FAN_ACTIONS: Record<FanAction, Omit<FanActionResult, "action">> = {
  "throw-jersey": { label: "Jeter ton maillot au public", popDelta: 8, imageDelta: 3, description: "Les fans adorent ! (+pop, -1 maillot)" },
  "go-to-fans": { label: "Aller vers les fans", popDelta: 5, imageDelta: 2, description: "Tu salues les supporters après la victoire." },
  "ignore-fans": { label: "Ignorer les fans", popDelta: -5, imageDelta: -2, description: "Les fans n'apprécient pas ton indifférence." },
  "applaud-away-fans": { label: "Applaudir les fans adverses", popDelta: 2, imageDelta: 5, description: "Geste de respect apprécié par tous." },
};

export function performFanAction(state: FanState, action: FanAction): { state: FanState; result: FanActionResult } {
  const info = FAN_ACTIONS[action];
  let updated = { ...state };

  if (action === "throw-jersey") {
    if (updated.jerseysAvailable <= 0) {
      return { state, result: { action, ...info, popDelta: 0, description: "Pas de maillot disponible !" } };
    }
    updated.jerseysAvailable -= 1;
  }

  updated = adjustPopularity(updated, info.popDelta);
  return { state: updated, result: { action, ...info } };
}

/** Get pressure delta from fan state. */
export function fanPressureDelta(state: FanState): number {
  if (state.popularity < 30) return 15;
  return 0;
}

export function getAvailableFanActions(): FanActionResult[] {
  return (Object.entries(FAN_ACTIONS) as [FanAction, Omit<FanActionResult, "action">][]).map(
    ([action, info]) => ({ action, ...info })
  );
}

/* ------------------------------------------------------------------ */
/* Vestiaire                                                           */
/* ------------------------------------------------------------------ */

const MEMBER_NAMES: { name: string; role: LockerRoomRole }[] = [
  { name: "Marcus Leroy", role: "leader" },
  { name: "Jean-Pierre Kante", role: "leader" },
  { name: "Sofiane Belmadi", role: "follower" },
  { name: "Lucas Petit", role: "follower" },
  { name: "Diego Alvarez", role: "hothead" },
  { name: "Yannick Ferreira", role: "hothead" },
  { name: "Ousmane Cissé", role: "youngster" },
  { name: "Théo Lambert", role: "youngster" },
];

export function createLockerRoomState(): LockerRoomState {
  const members: LockerRoomMember[] = MEMBER_NAMES.map((m, i) => ({
    id: `lr-${i}`,
    name: m.name,
    role: m.role,
    morale: 50 + Math.floor(Math.random() * 30),
  }));

  return {
    members,
    mood: "neutral",
    cohesion: 50,
    conflicts: [],
    perfBonus: 0,
  };
}

function getMood(cohesion: number): LockerRoomMood {
  if (cohesion >= 70) return "united";
  if (cohesion <= 30) return "divided";
  return "neutral";
}

function getPerfBonus(mood: LockerRoomMood): number {
  if (mood === "united") return 3;
  if (mood === "divided") return -5;
  return 0;
}

export function adjustCohesion(state: LockerRoomState, delta: number): LockerRoomState {
  const cohesion = Math.max(0, Math.min(100, state.cohesion + delta));
  const mood = getMood(cohesion);
  return { ...state, cohesion, mood, perfBonus: getPerfBonus(mood) };
}

const CONFLICT_DESCRIPTIONS = [
  "se disputent pour une place de titulaire",
  "ne sont pas d'accord sur la tactique",
  "ont un différend personnel",
  "se reprochent mutuellement une erreur en match",
  "se battent pour le penalty",
];

let conflictCounter = 0;

/** Generate a random conflict between two members. */
export function generateConflict(state: LockerRoomState, day: number): LockerRoomState {
  if (state.members.length < 2) return state;
  const hotheads = state.members.filter(m => m.role === "hothead");
  const pool = hotheads.length >= 2 ? hotheads : state.members;

  const i1 = Math.floor(Math.random() * pool.length);
  let i2 = Math.floor(Math.random() * pool.length);
  while (i2 === i1) i2 = Math.floor(Math.random() * pool.length);

  conflictCounter++;
  const conflict: LockerRoomConflict = {
    id: `conflict-${day}-${conflictCounter}`,
    player1: pool[i1].name,
    player2: pool[i2].name,
    description: CONFLICT_DESCRIPTIONS[Math.floor(Math.random() * CONFLICT_DESCRIPTIONS.length)],
    resolved: false,
    day,
  };

  return adjustCohesion({ ...state, conflicts: [...state.conflicts, conflict] }, -10);
}

/** Resolve a conflict with a choice. */
export function resolveConflict(
  state: LockerRoomState,
  conflictId: string,
  choice: ConflictChoice,
  playerLeadership: number,
): { state: LockerRoomState; success: boolean; message: string } {
  const idx = state.conflicts.findIndex(c => c.id === conflictId);
  if (idx === -1) return { state, success: false, message: "Conflit introuvable." };

  const conflict = state.conflicts[idx];
  const updatedConflicts = [...state.conflicts];
  updatedConflicts[idx] = { ...conflict, resolved: true };

  let cohesionDelta = 0;
  let success = false;
  let message = "";

  switch (choice) {
    case "mediate": {
      // Success depends on leadership
      success = playerLeadership >= 60 || Math.random() < 0.4;
      if (success) {
        cohesionDelta = 15;
        message = "Tu as réussi à calmer les esprits. Le vestiaire est plus uni.";
      } else {
        cohesionDelta = -5;
        message = "Ta médiation n'a pas convaincu. La tension reste.";
      }
      break;
    }
    case "side-player1":
    case "side-player2": {
      success = Math.random() < 0.5;
      cohesionDelta = success ? 5 : -10;
      message = success
        ? "Ton choix a apaisé la situation."
        : "L'autre joueur t'en veut. Division dans le vestiaire.";
      break;
    }
    case "ignore": {
      cohesionDelta = -8;
      message = "Le conflit s'envenime sans intervention.";
      break;
    }
  }

  const updated = adjustCohesion({ ...state, conflicts: updatedConflicts }, cohesionDelta);
  return { state: updated, success, message };
}

/* ------------------------------------------------------------------ */
/* Capitanat                                                           */
/* ------------------------------------------------------------------ */

export function createCaptainState(): CaptainState {
  return {
    isCaptain: false,
    seasonsAsCaptain: 0,
    lastSpeech: null,
    tossWins: 0,
    tossTotal: 0,
  };
}

/** Check eligibility: overall top 3, leadership > 80 (we use overall as proxy). */
export function checkCaptainEligibility(playerOverall: number, playerAge: number, seasonsAtClub: number): boolean {
  return playerOverall >= 82 && playerAge >= 22 && seasonsAtClub >= 2;
}

export function appointCaptain(state: CaptainState): CaptainState {
  return { ...state, isCaptain: true };
}

const SPEECHES: Record<SpeechType, SpeechResult> = {
  motivating: { type: "motivating", label: "On va les écraser !", perfBonus: 5, cardRiskBonus: 0, requiresWin: true },
  calm: { type: "calm", label: "Restons concentrés", perfBonus: 0, cardRiskBonus: 0, requiresWin: false },
  aggressive: { type: "aggressive", label: "Pas de pitié !", perfBonus: 8, cardRiskBonus: 20, requiresWin: false },
};

export function giveSpeech(state: CaptainState, type: SpeechType): { state: CaptainState; result: SpeechResult } {
  return {
    state: { ...state, lastSpeech: type },
    result: SPEECHES[type],
  };
}

export function getSpeechOptions(): SpeechResult[] {
  return Object.values(SPEECHES);
}

export function doToss(state: CaptainState): { state: CaptainState; won: boolean } {
  const won = Math.random() < 0.5;
  return {
    state: { ...state, tossWins: state.tossWins + (won ? 1 : 0), tossTotal: state.tossTotal + 1 },
    won,
  };
}

/* ------------------------------------------------------------------ */
/* Combined State                                                      */
/* ------------------------------------------------------------------ */

export function createFansVestiaireState(): FansVestiaireState {
  return {
    fan: createFanState(),
    lockerRoom: createLockerRoomState(),
    captain: createCaptainState(),
  };
}
