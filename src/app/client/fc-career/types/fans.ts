/**
 * FC CAREER — Étape 16 : Fans, Vestiaire & Capitanat
 */

/* ------------------------------------------------------------------ */
/* 16.1 — Fans                                                         */
/* ------------------------------------------------------------------ */

export type FanAction = "throw-jersey" | "go-to-fans" | "ignore-fans" | "applaud-away-fans";

export interface FanActionResult {
  action: FanAction;
  label: string;
  popDelta: number;
  imageDelta: number;
  description: string;
}

export interface FanState {
  /** Fan popularity 0-100. */
  popularity: number;
  /** Jersey count remaining for toss actions. */
  jerseysAvailable: number;
  /** Whether fans sing the player's name (pop > 80). */
  fansSingName: boolean;
  /** Whether a tifo exists (pop > 80). */
  tifoActive: boolean;
  /** Whether the player is an idol (pop > 90). */
  isIdol: boolean;
  /** Whether fans whistle (pop < 30). */
  fansWhistle: boolean;
  /** Whether fans demand departure (pop < 10). */
  fansDemandDeparture: boolean;
}

/* ------------------------------------------------------------------ */
/* 16.2 — Vestiaire                                                    */
/* ------------------------------------------------------------------ */

export type LockerRoomRole = "leader" | "follower" | "hothead" | "youngster";

export interface LockerRoomMember {
  id: string;
  name: string;
  role: LockerRoomRole;
  morale: number; // 0-100
}

export type LockerRoomMood = "united" | "neutral" | "divided";

export interface LockerRoomConflict {
  id: string;
  player1: string;
  player2: string;
  description: string;
  resolved: boolean;
  day: number;
}

export type ConflictChoice = "mediate" | "side-player1" | "side-player2" | "ignore";

export interface LockerRoomState {
  members: LockerRoomMember[];
  mood: LockerRoomMood;
  cohesion: number; // 0-100
  conflicts: LockerRoomConflict[];
  perfBonus: number; // +3% united, -5% divided, 0 neutral
}

/* ------------------------------------------------------------------ */
/* 16.3 — Capitanat                                                    */
/* ------------------------------------------------------------------ */

export type SpeechType = "motivating" | "calm" | "aggressive";

export interface SpeechResult {
  type: SpeechType;
  label: string;
  perfBonus: number;
  cardRiskBonus: number; // % increase in card risk
  requiresWin: boolean; // if true, perfBonus becomes negative on loss
}

export interface CaptainState {
  isCaptain: boolean;
  /** Seasons as captain. */
  seasonsAsCaptain: number;
  /** Last speech given. */
  lastSpeech: SpeechType | null;
  /** Toss won/lost count. */
  tossWins: number;
  tossTotal: number;
}

/* ------------------------------------------------------------------ */
/* Combined State                                                      */
/* ------------------------------------------------------------------ */

export interface FansVestiaireState {
  fan: FanState;
  lockerRoom: LockerRoomState;
  captain: CaptainState;
}
