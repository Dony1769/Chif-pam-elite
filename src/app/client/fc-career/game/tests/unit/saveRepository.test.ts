/**
 * FC CAREER — Tests unitaires : saveRepository
 */

import {
  createEmptySave,
  isMatchAlreadyCompleted,
  markMatchCompleted,
  updateSaveMeta,
} from "../../persistence/saveRepository";
import { validateSave } from "../../utils/validation";
import { _resetCounterForTests } from "../../utils/ids";
import type { GameSaveV1 } from "../../persistence/saveSchema";

// ── Fixtures ────────────────────────────────────────────────────────────────

function makeMinimalPlayer(): GameSaveV1["player"] {
  return {
    id: "player-001",
    firstName: "Luca",
    lastName: "Ferreira",
    nationality: "BR",
    birthAge: 16,
    age: 16,
    foot: "right",
    position: "ST",
    heightCm: 178,
    weightKg: 73,
    attributes: {
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
    },
    overall: 61,
    potential: 87,
    condition: { form: 75, fatigue: 20, morale: 70, injury: null },
    contract: { clubId: "club-albion-city", salary: 500, bonusGoal: 100, bonusAssist: 50, startSeason: 1, endSeason: 3, role: "squad" },
    playStyles: [],
    traits: [],
    paPoints: 5,
    stats: {
      totalAppearances: 0, totalGoals: 0, totalAssists: 0,
      totalYellowCards: 0, totalRedCards: 0, totalMinutes: 0,
      peakOverall: 61, seasons: [],
    },
    progressionHistory: [],
    reputation: 10,
    popularity: 5,
  };
}

function makeMinimalSave(): GameSaveV1 {
  _resetCounterForTests();
  return createEmptySave(
    "career-001",
    makeMinimalPlayer(),
    {
      id: "career-001",
      phase: "academy",
      season: 1,
      matchday: 1,
      week: 1,
      academy: { stage: "youth", evaluationScore: 50, promotionThreshold: 80, weeksInStage: 0 },
      objectives: [],
      events: [],
      completedMatchIds: [] as unknown as string[],
      seasonSummaries: [],
    },
    { balance: 1000, weeklyWage: 500, totalEarned: 0, totalSpent: 0 },
    { countries: [], leagues: [], clubs: [], standings: {}, schedules: [], lastMatchResults: [] },
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("saveRepository", () => {
  it("createEmptySave produit une sauvegarde valide", () => {
    const save = makeMinimalSave();
    const errors = validateSave(save);
    expect(errors).toHaveLength(0);
  });

  it("La sauvegarde a la version 1", () => {
    const save = makeMinimalSave();
    expect(save.version).toBe(1);
  });

  it("isMatchAlreadyCompleted retourne false pour un nouveau match", () => {
    const save = makeMinimalSave();
    expect(isMatchAlreadyCompleted(save, "match-xyz")).toBe(false);
  });

  it("markMatchCompleted enregistre un match", () => {
    const save = makeMinimalSave();
    const updated = markMatchCompleted(save, "match-001");
    expect(isMatchAlreadyCompleted(updated, "match-001")).toBe(true);
  });

  it("markMatchCompleted est idempotent (pas de doublon)", () => {
    const save = makeMinimalSave();
    const s1 = markMatchCompleted(save, "match-001");
    const s2 = markMatchCompleted(s1, "match-001");
    const ids = s2.career.completedMatchIds as unknown as string[];
    expect(ids.filter(id => id === "match-001")).toHaveLength(1);
  });

  it("updateSaveMeta met à jour savedAt", () => {
    const save = makeMinimalSave();
    const updated = updateSaveMeta({ ...save, meta: { ...save.meta, savedAt: 0 } });
    expect(updated.meta.savedAt).toBeGreaterThan(0);
  });

  it("validateSave signale les champs manquants", () => {
    const errors = validateSave({ version: 1, meta: { careerId: "x" } });
    expect(errors.some(e => e.includes("player"))).toBe(true);
  });
});
