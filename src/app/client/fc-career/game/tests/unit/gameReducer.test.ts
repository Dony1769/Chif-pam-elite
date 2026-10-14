/**
 * FC CAREER — Tests unitaires : gameReducer
 */

import { gameReducer, initialState, type GameState } from "../../state/gameReducer";
import type { GameSaveV1 } from "../../persistence/saveSchema";
import type { MatchResult } from "../../domain/match";

// ── Fixture ──────────────────────────────────────────────────────────────────

const minAttrs = {
  ballControl: 60, dribbling: 58, crossing: 40, finishing: 62, freeKick: 45,
  longPassing: 48, shortPassing: 55, longShot: 52, curve: 50, volleys: 55,
  acceleration: 72, sprintSpeed: 70, agility: 68, balance: 65, jumping: 60,
  stamina: 65, strength: 58, reactions: 62,
  aggression: 55, composure: 58, interceptions: 40, positioning: 60,
  vision: 52, penalties: 55, marking: 38,
  standingTackle: 35, slidingTackle: 32, headingAccuracy: 58,
  defAwareness: 40, defWork: 45, defLine: 38,
  attPositioning: 62, attWork: 68, shotPower: 60, weakFoot: 55,
  skillMoves: 50, offside: 55,
  gkDiving: 10, gkHandling: 10, gkKicking: 25, gkPositioning: 10,
  gkReflexes: 10, gkSpeed: 35, gkDistribution: 20, gkSweeper: 10,
  gkComesOff: 10, gkCross: 10, gkOneonOne: 10, gkPenalty: 10,
  gkDirectFreeKick: 10, gkPlaymake: 10,
};

const baseSave: GameSaveV1 = {
  version: 1,
  meta: { careerId: "c-001", createdAt: 0, savedAt: 0, playTime: 0 },
  player: {
    id: "p-001", firstName: "Luca", lastName: "Ferreira", nationality: "BR",
    birthAge: 16, age: 16, foot: "right", position: "ST",
    heightCm: 178, weightKg: 73,
    attributes: minAttrs, overall: 61, potential: 87,
    condition: { form: 75, fatigue: 20, morale: 70, injury: null },
    contract: { clubId: "club-001", salary: 500, bonusGoal: 100, bonusAssist: 50, startSeason: 1, endSeason: 3, role: "squad" },
    playStyles: [], traits: [], paPoints: 5,
    stats: { totalAppearances: 0, totalGoals: 0, totalAssists: 0, totalYellowCards: 0, totalRedCards: 0, totalMinutes: 0, peakOverall: 61, seasons: [] },
    progressionHistory: [], reputation: 10, popularity: 5,
  },
  career: {
    id: "c-001", phase: "academy", season: 1, matchday: 1, week: 1,
    academy: null, objectives: [], events: [],
    completedMatchIds: [] as unknown as string[],
    seasonSummaries: [],
  },
  wallet: { balance: 1000, weeklyWage: 500, totalEarned: 0, totalSpent: 0 },
  world: { countries: [], leagues: [], clubs: [], standings: {}, schedules: [], lastMatchResults: [] },
  transferHistory: [],
};

const loadedState: GameState = { ...initialState, save: baseSave, isLoading: false };

const matchResult: MatchResult = {
  matchId: "m-001",
  season: 1, matchday: 1,
  playerClubId: "club-001", opponentClubId: "club-002",
  isHome: true, competitionId: "league-001",
  scoreHome: 2, scoreAway: 1,
  playerRating: 7.5,
  playerStats: { goals: 1, assists: 0, shotsOnTarget: 3, shotsOffTarget: 1, saves: 0, tackles: 1, interceptions: 0, foulsCommitted: 1, yellowCards: 0, redCards: 0, minutesPlayed: 90, keyPasses: 2, dribbles: 3 },
  events: [], paEarned: 3, objectivesCompleted: [],
  lockKey: "m-001:1:1", completedAt: Date.now(),
};

// ── Tests ────────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try { fn(); console.log(`  ✅ ${name}`); passed++; }
  catch (e) { console.error(`  ❌ ${name}: ${e}`); failed++; }
}

function expect(value: unknown) {
  return {
    toBe: (expected: unknown) => { if (value !== expected) throw new Error(`Attendu ${expected}, reçu ${value}`); },
    toBeNull: () => { if (value !== null) throw new Error(`Attendu null, reçu ${value}`); },
    toBeGreaterThan: (n: number) => { if (typeof value !== "number" || value <= n) throw new Error(`Attendu > ${n}, reçu ${value}`); },
    toInclude: (s: string) => { if (!(value as string[]).includes(s)) throw new Error(`Attendu ${s} dans ${value}`); },
  };
}

console.log("\n📋 Tests : gameReducer\n");

test("LOAD_SAVE charge la sauvegarde", () => {
  const state = gameReducer(initialState, { type: "LOAD_SAVE", save: baseSave });
  if (!state.save) throw new Error("save null après LOAD_SAVE");
  expect(state.isLoading).toBe(false);
  expect(state.isDirty).toBe(false);
});

test("DELETE_SAVE réinitialise l'état", () => {
  const state = gameReducer(loadedState, { type: "DELETE_SAVE" });
  expect(state.save).toBeNull();
  expect(state.isLoading).toBe(false);
});

test("INVEST_ATTRIBUTE réduit les PA et monte l'attribut", () => {
  const state = gameReducer(loadedState, { type: "INVEST_ATTRIBUTE", attribute: "finishing", amount: 1 });
  expect(state.save!.player.paPoints).toBe(4);
  expect(state.save!.player.attributes.finishing).toBe(63);
  expect(state.isDirty).toBe(true);
});

test("INVEST_ATTRIBUTE refuse si pas assez de PA", () => {
  const stateWith0PA = { ...loadedState, save: { ...baseSave, player: { ...baseSave.player, paPoints: 0 } } };
  const state = gameReducer(stateWith0PA, { type: "INVEST_ATTRIBUTE", attribute: "finishing", amount: 1 });
  expect(state.save!.player.attributes.finishing).toBe(62); // inchangé
  expect(state.save!.player.paPoints).toBe(0); // inchangé
});

test("APPLY_MATCH_RESULT met à jour les stats", () => {
  const state = gameReducer(loadedState, { type: "APPLY_MATCH_RESULT", result: matchResult });
  expect(state.save!.player.stats.totalGoals).toBe(1);
  expect(state.save!.player.stats.totalAppearances).toBe(1);
  expect(state.save!.player.paPoints).toBe(8); // 5 + 3
});

test("APPLY_MATCH_RESULT est idempotent", () => {
  const s1 = gameReducer(loadedState, { type: "APPLY_MATCH_RESULT", result: matchResult });
  const s2 = gameReducer(s1, { type: "APPLY_MATCH_RESULT", result: matchResult });
  expect(s2.save!.player.stats.totalGoals).toBe(1); // pas de doublon
  expect(s2.save!.player.stats.totalAppearances).toBe(1);
});

test("ADVANCE_WEEK crédite le salaire hebdomadaire", () => {
  const state = gameReducer(loadedState, { type: "ADVANCE_WEEK" });
  expect(state.save!.wallet.balance).toBe(1500); // 1000 + 500
  expect(state.save!.career.week).toBe(2);
});

test("CREDIT_WALLET augmente le solde", () => {
  const state = gameReducer(loadedState, { type: "CREDIT_WALLET", amount: 10000, reason: "bonus" });
  expect(state.save!.wallet.balance).toBe(11000);
});

test("SET_ERROR puis CLEAR_ERROR", () => {
  const s1 = gameReducer(loadedState, { type: "SET_ERROR", message: "Erreur test" });
  expect(s1.error).toBe("Erreur test");
  const s2 = gameReducer(s1, { type: "CLEAR_ERROR" });
  expect(s2.error).toBeNull();
});

// ─────────────────────────────────────────────────────────────────────────────

console.log(`\n${passed} passés, ${failed} échoués\n`);
if (failed > 0) process.exit(1);
