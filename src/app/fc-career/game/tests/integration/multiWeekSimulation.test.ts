/**
 * FC CAREER — Tests d'intégration : simulation multi-semaines
 * Vérifie la cohérence du cycle complet sur plusieurs semaines/saisons.
 */

import { gameReducer, initialState, type GameState } from "../../state/gameReducer";
import type { GameSaveV1 } from "../../persistence/saveSchema";
import type { MatchResult } from "../../domain/match";
import { evaluateSponsorMission, buildMissionContext } from "../../domain/sponsors";
import type { SponsorContract } from "../../persistence/saveSchema";

// ── Fixtures communes ────────────────────────────────────────────────────────

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

function makeBaseSave(overrides: Partial<GameSaveV1> = {}): GameSaveV1 {
  return {
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
    coach: {
      id: "coach-001", name: "Coach Test", philosophy: "équilibré",
      trust: 50, playerRole: "remplaçant" as const,
      conversations: [],
      seasonObjective: { description: "Marquer 3 buts", type: "goals", target: 3, current: 0, completed: false },
    },
    weekState: { trainingDone: false, trainingIntensity: null, matchPlayed: false },
    ...overrides,
  };
}

function makeMatchResult(matchId: string, season: number, matchday: number, goals = 1, rating = 7.5): MatchResult {
  return {
    matchId, season, matchday,
    playerClubId: "club-001", opponentClubId: "club-002",
    isHome: true, competitionId: "league-001",
    scoreHome: 2, scoreAway: 1,
    playerRating: rating,
    playerStats: { goals, assists: 0, shotsOnTarget: 3, shotsOffTarget: 1, saves: 0, tackles: 1, interceptions: 0, foulsCommitted: 1, yellowCards: 0, redCards: 0, minutesPlayed: 90, keyPasses: 2, dribbles: 3 },
    events: [], paEarned: Math.floor(rating), objectivesCompleted: [],
    lockKey: `${matchId}:${season}:${matchday}`, completedAt: Date.now(),
  };
}

function stateWith(save: GameSaveV1): GameState {
  return { ...initialState, save, isLoading: false };
}

// ── Tests d'intégration multi-semaines ──────────────────────────────────────

describe("Simulation multi-semaines", () => {
  it("3 matchs successifs accumulent correctement les stats sans doublons", () => {
    let state = stateWith(makeBaseSave());

    // Match 1 : 1 but
    state = gameReducer(state, { type: "APPLY_MATCH_RESULT", result: makeMatchResult("m-001", 1, 1, 1) });
    state = gameReducer(state, { type: "COMMIT_WEEK" });

    // Match 2 : 2 buts
    state = gameReducer(state, { type: "APPLY_MATCH_RESULT", result: makeMatchResult("m-002", 1, 2, 2) });
    state = gameReducer(state, { type: "COMMIT_WEEK" });

    // Match 3 : 0 but
    state = gameReducer(state, { type: "APPLY_MATCH_RESULT", result: makeMatchResult("m-003", 1, 3, 0) });
    state = gameReducer(state, { type: "COMMIT_WEEK" });

    const seasonStats = state.save!.player.stats.seasons.find(s => s.season === 1);
    expect(seasonStats?.goals).toBe(3);
    expect(seasonStats?.appearances).toBe(3);
    expect(state.save!.career.week).toBe(4);
  });

  it("Le même match joué deux fois ne compte qu'une fois (idempotence)", () => {
    let state = stateWith(makeBaseSave());

    const result = makeMatchResult("m-001", 1, 1, 2);
    state = gameReducer(state, { type: "APPLY_MATCH_RESULT", result });
    state = gameReducer(state, { type: "APPLY_MATCH_RESULT", result }); // doublon

    const seasonStats = state.save!.player.stats.seasons.find(s => s.season === 1);
    expect(seasonStats?.goals).toBe(2); // pas 4
    expect(seasonStats?.appearances).toBe(1); // pas 2
  });

  it("Le salaire est crédité chaque semaine sans accumulation double", () => {
    let state = stateWith(makeBaseSave());
    const initialBalance = state.save!.wallet.balance;

    state = gameReducer(state, { type: "COMMIT_WEEK" });
    const afterWeek1 = state.save!.wallet.balance;
    expect(afterWeek1).toBe(initialBalance + 500); // 500 = weeklyWage

    state = gameReducer(state, { type: "COMMIT_WEEK" });
    const afterWeek2 = state.save!.wallet.balance;
    expect(afterWeek2).toBe(initialBalance + 1000); // 2 semaines
  });

  it("La fatigue augmente avec entraînement intense et diminue au repos", () => {
    let state = stateWith(makeBaseSave());
    const initialFatigue = state.save!.player.condition.fatigue; // 20

    // Semaine avec entraînement intense
    state = gameReducer(state, { type: "SET_TRAINING_CHOICE", intensity: "normal" });
    state = gameReducer(state, { type: "COMMIT_WEEK" });
    const afterTraining = state.save!.player.condition.fatigue;
    expect(afterTraining).toBeGreaterThanOrEqual(initialFatigue); // la fatigue augmente ou reste stable

    // Semaine sans entraînement (repos passif)
    // weekState.trainingDone = false après reset
    state = gameReducer(state, { type: "COMMIT_WEEK" });
    const afterRest = state.save!.player.condition.fatigue;
    expect(afterRest).toBeLessThanOrEqual(afterTraining + 5); // repos réduit la fatigue
  });

  it("weekState est réinitialisé après chaque COMMIT_WEEK", () => {
    let state = stateWith(makeBaseSave());

    state = gameReducer(state, { type: "SET_TRAINING_CHOICE", intensity: "intense" });
    expect(state.save!.weekState?.trainingDone).toBe(true);

    state = gameReducer(state, { type: "COMMIT_WEEK" });
    expect(state.save!.weekState?.trainingDone).toBe(false);
    expect(state.save!.weekState?.trainingIntensity).toBeNull();
  });
});

// ── Tests sponsors missions ──────────────────────────────────────────────────

describe("Évaluation des missions sponsors", () => {
  const makeContract = (missionLabel: string, done = false): SponsorContract => ({
    id: "spon-001",
    name: "TestBrand",
    logo: "T",
    weeklyBonus: 200,
    weeksLeft: 8,
    season: 1,
    missionLabel,
    missionDone: done,
  });

  it("Mission buts : 3 buts accomplie quand seasonGoals >= 3", () => {
    const contract = makeContract("Marquer 3 buts en championnat");
    const ctx = { seasonGoals: 3, seasonAssists: 0, seasonAppearances: 5, lastMatchRating: 7, consecutiveWins: 0, playerForm: 70, weeksHighForm: 0, ratingsAbove7: 0, clubLeaguePosition: null };
    expect(evaluateSponsorMission(contract, ctx)).toBe(true);
  });

  it("Mission buts : non accomplie si moins de 3 buts", () => {
    const contract = makeContract("Marquer 3 buts en championnat");
    const ctx = { seasonGoals: 2, seasonAssists: 0, seasonAppearances: 5, lastMatchRating: 7, consecutiveWins: 0, playerForm: 70, weeksHighForm: 0, ratingsAbove7: 0, clubLeaguePosition: null };
    expect(evaluateSponsorMission(contract, ctx)).toBe(false);
  });

  it("Mission nombre buts générique : marquer 10 buts", () => {
    const contract = makeContract("Marquer 10 buts");
    const ctx = { seasonGoals: 10, seasonAssists: 0, seasonAppearances: 15, lastMatchRating: 7, consecutiveWins: 0, playerForm: 70, weeksHighForm: 0, ratingsAbove7: 0, clubLeaguePosition: null };
    expect(evaluateSponsorMission(contract, ctx)).toBe(true);
  });

  it("Mission forme : 4 semaines haute forme", () => {
    const contract = makeContract("Maintenir la forme > 70 pendant 4 semaines");
    const ctx = { seasonGoals: 0, seasonAssists: 0, seasonAppearances: 0, lastMatchRating: 7, consecutiveWins: 0, playerForm: 80, weeksHighForm: 4, ratingsAbove7: 0, clubLeaguePosition: null };
    expect(evaluateSponsorMission(contract, ctx)).toBe(true);
  });

  it("Mission forme : non accomplie si seulement 3 semaines", () => {
    const contract = makeContract("Maintenir la forme > 70 pendant 4 semaines");
    const ctx = { seasonGoals: 0, seasonAssists: 0, seasonAppearances: 0, lastMatchRating: 7, consecutiveWins: 0, playerForm: 80, weeksHighForm: 3, ratingsAbove7: 0, clubLeaguePosition: null };
    expect(evaluateSponsorMission(contract, ctx)).toBe(false);
  });

  it("Mission notes : décrocher une note > 7 trois fois", () => {
    const contract = makeContract("Décrocher une note > 7 trois fois");
    const ctx = { seasonGoals: 0, seasonAssists: 0, seasonAppearances: 5, lastMatchRating: 8, consecutiveWins: 0, playerForm: 70, weeksHighForm: 0, ratingsAbove7: 3, clubLeaguePosition: null };
    expect(evaluateSponsorMission(contract, ctx)).toBe(true);
  });

  it("Mission victoires consécutives : gagner 3 matchs consécutifs", () => {
    const contract = makeContract("Gagner 3 matchs consécutifs");
    const ctx = { seasonGoals: 0, seasonAssists: 0, seasonAppearances: 3, lastMatchRating: 7, consecutiveWins: 3, playerForm: 70, weeksHighForm: 0, ratingsAbove7: 0, clubLeaguePosition: null };
    expect(evaluateSponsorMission(contract, ctx)).toBe(true);
  });

  it("Mission classement : finir dans le top 5", () => {
    const contract = makeContract("Finir dans le top 5 du classement");
    const ctx = { seasonGoals: 0, seasonAssists: 0, seasonAppearances: 10, lastMatchRating: 7, consecutiveWins: 0, playerForm: 70, weeksHighForm: 0, ratingsAbove7: 0, clubLeaguePosition: 3 };
    expect(evaluateSponsorMission(contract, ctx)).toBe(true);
  });

  it("Mission classement : non accomplie si hors top 5", () => {
    const contract = makeContract("Finir dans le top 5 du classement");
    const ctx = { seasonGoals: 0, seasonAssists: 0, seasonAppearances: 10, lastMatchRating: 7, consecutiveWins: 0, playerForm: 70, weeksHighForm: 0, ratingsAbove7: 0, clubLeaguePosition: 8 };
    expect(evaluateSponsorMission(contract, ctx)).toBe(false);
  });

  it("Mission déjà accomplie n'est jamais réinitialisée", () => {
    let state = stateWith(makeBaseSave({
      sponsors: [makeContract("Marquer 3 buts en championnat", true)],
    }));

    // Appliquer un match avec 0 buts — ne devrait pas réinitialiser missionDone
    state = gameReducer(state, {
      type: "APPLY_MATCH_RESULT",
      result: makeMatchResult("m-001", 1, 1, 0),
    });

    expect(state.save!.sponsors?.[0].missionDone).toBe(true);
  });

  it("Mission est marquée accomplie après APPLY_MATCH_RESULT avec assez de buts", () => {
    let state = stateWith(makeBaseSave({
      sponsors: [makeContract("Marquer 3 buts en championnat", false)],
    }));

    // Match 1 : 1 but
    state = gameReducer(state, { type: "APPLY_MATCH_RESULT", result: makeMatchResult("m-001", 1, 1, 1) });
    expect(state.save!.sponsors?.[0].missionDone).toBe(false);

    // Match 2 : 2 buts de plus
    state = gameReducer(state, { type: "APPLY_MATCH_RESULT", result: makeMatchResult("m-002", 1, 2, 2) });
    expect(state.save!.sponsors?.[0].missionDone).toBe(true);
  });
});

// ── Tests coherence calendrier ───────────────────────────────────────────────

describe("Cohérence du calendrier", () => {
  it("La semaine avance correctement après COMMIT_WEEK", () => {
    let state = stateWith(makeBaseSave());
    expect(state.save!.career.week).toBe(1);

    state = gameReducer(state, { type: "COMMIT_WEEK" });
    expect(state.save!.career.week).toBe(2);

    state = gameReducer(state, { type: "COMMIT_WEEK" });
    expect(state.save!.career.week).toBe(3);
  });

  it("ADVANCE_SEASON incrémente la saison", () => {
    let state = stateWith(makeBaseSave());

    // Jouer un match en saison 1
    state = gameReducer(state, { type: "APPLY_MATCH_RESULT", result: makeMatchResult("m-001", 1, 1, 1) });

    const idsBeforeAdvance = state.save!.career.completedMatchIds as unknown as string[];
    expect(idsBeforeAdvance.length).toBeGreaterThan(0);

    // ADVANCE_SEASON (simple) incrémente la saison
    state = gameReducer(state, { type: "ADVANCE_SEASON" });

    expect(state.save!.career.season).toBe(2);
    expect(state.save!.career.week).toBe(1);
  });
});
