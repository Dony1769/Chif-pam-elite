/**
 * FC CAREER — Tests unitaires : gameReducer
 * Vérifie le comportement du réducteur central pour tous les scénarios critiques.
 */

import { gameReducer, initialState, type GameState } from "../../state/gameReducer";
import type { GameSaveV1 } from "../../persistence/saveSchema";
import type { MatchResult } from "../../domain/match";

// ── Fixture de base ──────────────────────────────────────────────────────────

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
  coach: {
    id: "coach-001", name: "Coach Test", philosophy: "équilibré",
    trust: 50, playerRole: "remplaçant" as const,
    conversations: [],
    seasonObjective: { description: "Disputer 5 matchs", type: "appearances", target: 5, current: 0, completed: false },
  },
  weekState: { trainingDone: false, trainingIntensity: null, matchPlayed: false },
};

const loadedState: GameState = { ...initialState, save: baseSave, isLoading: false };

const makeMatchResult = (overrides: Partial<MatchResult> = {}): MatchResult => ({
  matchId: "m-001",
  season: 1, matchday: 1,
  playerClubId: "club-001", opponentClubId: "club-002",
  isHome: true, competitionId: "league-001",
  scoreHome: 2, scoreAway: 1,
  playerRating: 7.5,
  playerStats: { goals: 1, assists: 1, shotsOnTarget: 3, shotsOffTarget: 1, saves: 0, tackles: 1, interceptions: 0, foulsCommitted: 1, yellowCards: 0, redCards: 0, minutesPlayed: 90, keyPasses: 2, dribbles: 3 },
  events: [], paEarned: 3, objectivesCompleted: [],
  lockKey: "m-001:1:1", completedAt: Date.now(),
  ...overrides,
});

// ── Tests : initialisation ───────────────────────────────────────────────────

describe("Initialisation", () => {
  it("LOAD_SAVE charge la sauvegarde et réinitialise les flags", () => {
    const state = gameReducer(initialState, { type: "LOAD_SAVE", save: baseSave });
    expect(state.save).not.toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.isDirty).toBe(false);
  });

  it("NEW_GAME charge une nouvelle sauvegarde", () => {
    const state = gameReducer(initialState, { type: "NEW_GAME", save: baseSave });
    expect(state.save).not.toBeNull();
    expect(state.isLoading).toBe(false);
  });

  it("DELETE_SAVE réinitialise l'état complet", () => {
    const state = gameReducer(loadedState, { type: "DELETE_SAVE" });
    expect(state.save).toBeNull();
    expect(state.isLoading).toBe(false);
  });

  it("Nouvelle carrière : toutes les stats sont à zéro", () => {
    const save = baseSave;
    expect(save.player.stats.totalAppearances).toBe(0);
    expect(save.player.stats.totalGoals).toBe(0);
    expect(save.player.stats.totalAssists).toBe(0);
    expect(save.player.stats.totalMinutes).toBe(0);
    expect(save.player.stats.seasons).toHaveLength(0);
  });
});

// ── Tests : attributs / PA ───────────────────────────────────────────────────

describe("Investissement d'attributs", () => {
  it("INVEST_ATTRIBUTE réduit les PA et monte l'attribut", () => {
    const state = gameReducer(loadedState, { type: "INVEST_ATTRIBUTE", attribute: "finishing", amount: 1 });
    expect(state.save!.player.paPoints).toBe(4);
    expect(state.save!.player.attributes.finishing).toBe(63);
    expect(state.isDirty).toBe(true);
  });

  it("INVEST_ATTRIBUTE refuse si pas assez de PA", () => {
    const stateWith0PA = { ...loadedState, save: { ...baseSave, player: { ...baseSave.player, paPoints: 0 } } };
    const state = gameReducer(stateWith0PA, { type: "INVEST_ATTRIBUTE", attribute: "finishing", amount: 1 });
    expect(state.save!.player.attributes.finishing).toBe(62); // inchangé
    expect(state.save!.player.paPoints).toBe(0);
  });

  it("INVEST_ATTRIBUTE ne dépasse pas le potentiel", () => {
    const highAttrSave = { ...baseSave, player: { ...baseSave.player, paPoints: 100, potential: 62 } };
    const state = gameReducer({ ...loadedState, save: highAttrSave }, { type: "INVEST_ATTRIBUTE", attribute: "finishing", amount: 5 });
    expect(state.save!.player.attributes.finishing).toBeLessThanOrEqual(62);
  });
});

// ── Tests : résultat de match ─────────────────────────────────────────────────

describe("APPLY_MATCH_RESULT — cohérence des statistiques", () => {
  it("Met à jour totalGoals, totalAssists, totalAppearances, totalMinutes", () => {
    const result = makeMatchResult({ playerStats: { goals: 2, assists: 1, shotsOnTarget: 4, shotsOffTarget: 1, saves: 0, tackles: 1, interceptions: 0, foulsCommitted: 0, yellowCards: 0, redCards: 0, minutesPlayed: 90, keyPasses: 3, dribbles: 2 } });
    const state = gameReducer(loadedState, { type: "APPLY_MATCH_RESULT", result });
    expect(state.save!.player.stats.totalGoals).toBe(2);
    expect(state.save!.player.stats.totalAssists).toBe(1);
    expect(state.save!.player.stats.totalAppearances).toBe(1);
    expect(state.save!.player.stats.totalMinutes).toBe(90);
  });

  it("Crée une entrée season stats pour la saison courante", () => {
    const result = makeMatchResult();
    const state = gameReducer(loadedState, { type: "APPLY_MATCH_RESULT", result });
    const seasonStats = state.save!.player.stats.seasons.find(s => s.season === 1);
    expect(seasonStats).toBeDefined();
    expect(seasonStats!.appearances).toBe(1);
    expect(seasonStats!.goals).toBe(1);
    expect(seasonStats!.assists).toBe(1);
    expect(seasonStats!.minutesPlayed).toBe(90);
  });

  it("Accumule correctement les stats sur plusieurs matchs", () => {
    const r1 = makeMatchResult({ matchId: "m-001", lockKey: "lk-m-001" });
    const r2 = makeMatchResult({ matchId: "m-002", lockKey: "lk-m-002", playerStats: { goals: 0, assists: 2, shotsOnTarget: 1, shotsOffTarget: 2, saves: 0, tackles: 3, interceptions: 1, foulsCommitted: 1, yellowCards: 1, redCards: 0, minutesPlayed: 75, keyPasses: 4, dribbles: 1 } });
    const s1 = gameReducer(loadedState, { type: "APPLY_MATCH_RESULT", result: r1 });
    const s2 = gameReducer(s1, { type: "APPLY_MATCH_RESULT", result: r2 });
    expect(s2.save!.player.stats.totalAppearances).toBe(2);
    expect(s2.save!.player.stats.totalGoals).toBe(1);  // r1=1, r2=0
    expect(s2.save!.player.stats.totalAssists).toBe(3); // r1=1, r2=2
  });

  it("Crédite les PA gagnés", () => {
    const result = makeMatchResult({ paEarned: 5 });
    const state = gameReducer(loadedState, { type: "APPLY_MATCH_RESULT", result });
    expect(state.save!.player.paPoints).toBe(10); // 5 initial + 5 earned
  });

  it("Ajoute le résultat à lastMatchResults", () => {
    const result = makeMatchResult();
    const state = gameReducer(loadedState, { type: "APPLY_MATCH_RESULT", result });
    expect(state.save!.world.lastMatchResults).toHaveLength(1);
    expect(state.save!.world.lastMatchResults[0].matchId).toBe("m-001");
  });
});

// ── Tests : idempotence ───────────────────────────────────────────────────────

describe("Idempotence — pas de double comptage", () => {
  it("APPLY_MATCH_RESULT est idempotent via matchId", () => {
    const result = makeMatchResult();
    const s1 = gameReducer(loadedState, { type: "APPLY_MATCH_RESULT", result });
    const s2 = gameReducer(s1, { type: "APPLY_MATCH_RESULT", result });
    expect(s2.save!.player.stats.totalGoals).toBe(1);
    expect(s2.save!.player.stats.totalAppearances).toBe(1);
    expect(s2.save!.career.completedMatchIds).toHaveLength(1);
  });

  it("APPLY_MATCH_RESULT ne rejoue pas un match déjà dans completedMatchIds", () => {
    const result = makeMatchResult();
    // Simuler rechargement avec matchId déjà dans completedMatchIds
    const saveWithCompleted: GameSaveV1 = {
      ...baseSave,
      career: {
        ...baseSave.career,
        completedMatchIds: ["m-001"] as unknown as string[],
      },
    };
    const state = gameReducer({ ...loadedState, save: saveWithCompleted }, { type: "APPLY_MATCH_RESULT", result });
    expect(state.save!.player.stats.totalGoals).toBe(0); // inchangé
  });

  it("APPLY_MATCH_TRUST_DELTA ne peut pas mettre à jour l'objectif sans match joué", () => {
    const state = gameReducer(loadedState, {
      type: "APPLY_MATCH_TRUST_DELTA",
      matchRating: 8.0, minutesPlayed: 0, goals: 0, assists: 0,
    });
    // minutesPlayed=0 → pas de "played" → type appearances ne progresse pas
    expect(state.save!.coach!.seasonObjective.current).toBe(0);
  });

  it("APPLY_MATCH_TRUST_DELTA ne progresse pas l'objectif 'completed'", () => {
    const completedCoach = {
      ...baseSave.coach!,
      seasonObjective: { ...baseSave.coach!.seasonObjective, current: 5, completed: true },
    };
    const stateWithCompleted = { ...loadedState, save: { ...baseSave, coach: completedCoach } };
    const state = gameReducer(stateWithCompleted, {
      type: "APPLY_MATCH_TRUST_DELTA",
      matchRating: 8.0, minutesPlayed: 90, goals: 1, assists: 0,
    });
    expect(state.save!.coach!.seasonObjective.current).toBe(5); // ne bouge pas
    expect(state.save!.coach!.seasonObjective.completed).toBe(true);
  });
});

// ── Tests : objectif du coach ────────────────────────────────────────────────

describe("Objectif du coach — progression exacte", () => {
  it("Type 'appearances' : progresse de 1 par match joué (minutesPlayed > 0)", () => {
    const state = gameReducer(loadedState, {
      type: "APPLY_MATCH_TRUST_DELTA",
      matchRating: 7.0, minutesPlayed: 90,
    });
    expect(state.save!.coach!.seasonObjective.current).toBe(1);
  });

  it("Type 'goals' : progresse du nombre de buts marqués", () => {
    const goalsCoach = {
      ...baseSave.coach!,
      seasonObjective: { description: "3 buts", type: "goals" as const, target: 3, current: 0, completed: false },
    };
    const stateWithGoalsObj = { ...loadedState, save: { ...baseSave, coach: goalsCoach } };
    const state = gameReducer(stateWithGoalsObj, {
      type: "APPLY_MATCH_TRUST_DELTA",
      matchRating: 8.0, minutesPlayed: 90, goals: 2,
    });
    expect(state.save!.coach!.seasonObjective.current).toBe(2);
  });

  it("Type 'goals' ne dépasse pas la cible", () => {
    const goalsCoach = {
      ...baseSave.coach!,
      seasonObjective: { description: "3 buts", type: "goals" as const, target: 3, current: 2, completed: false },
    };
    const stateWithGoalsObj = { ...loadedState, save: { ...baseSave, coach: goalsCoach } };
    const state = gameReducer(stateWithGoalsObj, {
      type: "APPLY_MATCH_TRUST_DELTA",
      matchRating: 8.0, minutesPlayed: 90, goals: 5,
    });
    expect(state.save!.coach!.seasonObjective.current).toBe(3);
    expect(state.save!.coach!.seasonObjective.completed).toBe(true);
  });

  it("Type 'assists' : progresse du nombre de passes décisives", () => {
    const assistsCoach = {
      ...baseSave.coach!,
      seasonObjective: { description: "2 passes", type: "assists" as const, target: 2, current: 0, completed: false },
    };
    const stateWithAssObj = { ...loadedState, save: { ...baseSave, coach: assistsCoach } };
    const state = gameReducer(stateWithAssObj, {
      type: "APPLY_MATCH_TRUST_DELTA",
      matchRating: 7.5, minutesPlayed: 90, assists: 2,
    });
    expect(state.save!.coach!.seasonObjective.current).toBe(2);
    expect(state.save!.coach!.seasonObjective.completed).toBe(true);
  });

  it("Type 'rating' : reflète la note du dernier match, pas cumulé", () => {
    const ratingCoach = {
      ...baseSave.coach!,
      seasonObjective: { description: "Note ≥ 7", type: "rating" as const, target: 7, current: 0, completed: false },
    };
    const stateWithRatingObj = { ...loadedState, save: { ...baseSave, coach: ratingCoach } };
    const state = gameReducer(stateWithRatingObj, {
      type: "APPLY_MATCH_TRUST_DELTA",
      matchRating: 8.5, minutesPlayed: 90,
    });
    expect(state.save!.coach!.seasonObjective.current).toBe(8.5);
    expect(state.save!.coach!.seasonObjective.completed).toBe(true);
  });
});

// ── Tests : entraînement & condition ──────────────────────────────────────────

describe("Entraînement et fatigue", () => {
  it("SET_TRAINING_CHOICE enregistre l'intensité voulue", () => {
    const state = gameReducer(loadedState, { type: "SET_TRAINING_CHOICE", intensity: "normal" });
    expect(state.save!.weekState!.trainingDone).toBe(true);
    expect(state.save!.weekState!.trainingIntensity).toBe("normal");
  });

  it("SET_TRAINING_CHOICE dégrade à 'light' si fatigue > 85", () => {
    const tiredSave = { ...baseSave, player: { ...baseSave.player, condition: { ...baseSave.player.condition, fatigue: 90 } } };
    const state = gameReducer({ ...loadedState, save: tiredSave }, { type: "SET_TRAINING_CHOICE", intensity: "intense" });
    expect(state.save!.weekState!.trainingIntensity).toBe("light");
  });

  it("SET_TRAINING_CHOICE dégrade à 'normal' si intense et fatigue > 60", () => {
    const tiredSave = { ...baseSave, player: { ...baseSave.player, condition: { ...baseSave.player.condition, fatigue: 65 } } };
    const state = gameReducer({ ...loadedState, save: tiredSave }, { type: "SET_TRAINING_CHOICE", intensity: "intense" });
    expect(state.save!.weekState!.trainingIntensity).toBe("normal");
  });

  it("SET_TRAINING_CHOICE force 'light' si blessé", () => {
    const injuredSave = { ...baseSave, player: { ...baseSave.player, condition: { ...baseSave.player.condition, injury: { type: "Cheville" as const, daysRemaining: 14, severity: "minor" as const } } } };
    const state = gameReducer({ ...loadedState, save: injuredSave }, { type: "SET_TRAINING_CHOICE", intensity: "intense" });
    expect(state.save!.weekState!.trainingIntensity).toBe("light");
  });

  it("COMMIT_WEEK récupération passive si aucun entraînement", () => {
    const saveNoTraining = { ...baseSave, weekState: { trainingDone: false, trainingIntensity: null as null, matchPlayed: false } };
    const state = gameReducer({ ...loadedState, save: saveNoTraining }, { type: "COMMIT_WEEK" });
    // Récupération passive = fatigue - 5
    expect(state.save!.player.condition.fatigue).toBeLessThan(baseSave.player.condition.fatigue);
  });

  it("COMMIT_WEEK réinitialise weekState pour la semaine suivante", () => {
    const saveWithTraining = { ...baseSave, weekState: { trainingDone: true, trainingIntensity: "intense" as const, matchPlayed: true } };
    const state = gameReducer({ ...loadedState, save: saveWithTraining }, { type: "COMMIT_WEEK" });
    expect(state.save!.weekState!.trainingDone).toBe(false);
    expect(state.save!.weekState!.matchPlayed).toBe(false);
  });

  it("COMMIT_WEEK crédite salaire + sponsors actifs", () => {
    const saveWithSponsor = {
      ...baseSave,
      sponsors: [{ id: "sp-1", name: "Test Sponsor", logo: "⚡", weeklyBonus: 200, season: 1, weeksLeft: 5, missionDone: false, missionLabel: "Test" }],
    };
    const state = gameReducer({ ...loadedState, save: saveWithSponsor }, { type: "COMMIT_WEEK" });
    // 1000 + 500 (salaire) + 200 (sponsor) = 1700
    expect(state.save!.wallet.balance).toBe(1700);
  });

  it("COMMIT_WEEK avance la semaine ; le matchday n'avance que si un match a été joué", () => {
    // Cas 1 : aucun match joué → matchday reste identique
    const stateNoMatch = gameReducer(loadedState, { type: "COMMIT_WEEK" });
    expect(stateNoMatch.save!.career.week).toBe(2);
    expect(stateNoMatch.save!.career.matchday).toBe(1); // matchday inchangé sans match

    // Cas 2 : match joué → matchday progresse
    const saveWithMatch = { ...baseSave, weekState: { trainingDone: true, trainingIntensity: "normal" as const, matchPlayed: true } };
    const stateWithMatch = gameReducer({ ...loadedState, save: saveWithMatch }, { type: "COMMIT_WEEK" });
    expect(stateWithMatch.save!.career.week).toBe(2);
    expect(stateWithMatch.save!.career.matchday).toBe(2); // matchday avance après un match
  });

  it("La fatigue ne se réinitialise pas artificiellement au changement de semaine", () => {
    const highFatigueSave = { ...baseSave, player: { ...baseSave.player, condition: { ...baseSave.player.condition, fatigue: 80 } } };
    const state = gameReducer({ ...loadedState, save: highFatigueSave }, { type: "COMMIT_WEEK" });
    // Sans entraînement : récupération de 5 → 75, pas 0
    expect(state.save!.player.condition.fatigue).toBe(75);
  });

  it("COMMIT_WEEK ne réapplique pas un entraînement annulé (trainingDone=false)", () => {
    const saveNoTraining = {
      ...baseSave,
      player: { ...baseSave.player, paPoints: 5 },
      weekState: { trainingDone: false, trainingIntensity: null as null, matchPlayed: false },
    };
    const state = gameReducer({ ...loadedState, save: saveNoTraining }, { type: "COMMIT_WEEK" });
    // Pas de PA gagnés depuis l'entraînement (seulement récupération passive)
    expect(state.save!.player.paPoints).toBe(5); // inchangé
  });
});

// ── Tests : wallet & sponsors ────────────────────────────────────────────────

describe("Wallet et économie", () => {
  it("CREDIT_WALLET augmente le solde", () => {
    const state = gameReducer(loadedState, { type: "CREDIT_WALLET", amount: 10000, reason: "bonus" });
    expect(state.save!.wallet.balance).toBe(11000);
    expect(state.save!.wallet.totalEarned).toBe(10000);
  });

  it("DEBIT_WALLET diminue le solde", () => {
    const state = gameReducer(loadedState, { type: "DEBIT_WALLET", amount: 200, reason: "achat" });
    expect(state.save!.wallet.balance).toBe(800);
    expect(state.save!.wallet.totalSpent).toBe(200);
  });

  it("SIGN_SPONSOR ajoute le contrat aux sponsors", () => {
    const contract = { id: "sp-1", name: "Veltron", logo: "⚡", weeklyBonus: 500, season: 1, weeksLeft: 10, missionDone: false, missionLabel: "Marquer 3 buts" };
    const state = gameReducer(loadedState, { type: "SIGN_SPONSOR", contract });
    expect(state.save!.sponsors).toHaveLength(1);
    expect(state.save!.sponsors![0].id).toBe("sp-1");
    expect(state.save!.sponsors![0].missionDone).toBe(false);
  });
});

// ── Tests : agent & contrats ──────────────────────────────────────────────────

describe("Agent et contrats", () => {
  it("HIRE_AGENT définit l'agent", () => {
    const agent = { id: "a-1", name: "Marco Silva", tier: "local" as const, commissionPct: 5, salaryBoostPct: 5, specialty: "Test", hiredSeason: 1 };
    const state = gameReducer(loadedState, { type: "HIRE_AGENT", agent });
    expect(state.save!.agentState!.agent?.id).toBe("a-1");
  });

  it("FIRE_AGENT supprime l'agent", () => {
    const agent = { id: "a-1", name: "Marco Silva", tier: "local" as const, commissionPct: 5, salaryBoostPct: 5, specialty: "Test", hiredSeason: 1 };
    const s1 = gameReducer(loadedState, { type: "HIRE_AGENT", agent });
    const s2 = gameReducer(s1, { type: "FIRE_AGENT" });
    expect(s2.save!.agentState!.agent).toBeNull();
  });

  it("ADD_CONTRACT_OFFER ajoute l'offre à agentState.offers", () => {
    const offer = {
      id: "offer-1", clubId: "club-999", clubName: "FC Test", season: 1, week: 3,
      offerType: "professional" as const, targetPhase: "professional" as const,
      terms: { clubId: "club-999", salary: 1500, bonusGoal: 200, bonusAssist: 100, startSeason: 1, endSeason: 3, role: "squad" as const },
      transferFee: 0, isLoan: false, status: "pending" as const, message: "Test", expiresInWeeks: 3,
    };
    const state = gameReducer(loadedState, { type: "ADD_CONTRACT_OFFER", offer });
    expect(state.save!.agentState!.offers).toHaveLength(1);
    expect(state.save!.agentState!.offers[0].clubName).toBe("FC Test");
  });

  it("RESPOND_CONTRACT_OFFER: acceptation met à jour le contrat du joueur", () => {
    const offer = {
      id: "offer-1", clubId: "club-999", clubName: "FC Test", season: 1, week: 3,
      offerType: "professional" as const, targetPhase: "professional" as const,
      terms: { clubId: "club-999", salary: 2000, bonusGoal: 200, bonusAssist: 100, startSeason: 1, endSeason: 3, role: "starter" as const },
      transferFee: 0, isLoan: false, status: "pending" as const, message: "Test", expiresInWeeks: 3,
    };
    const s1 = gameReducer(loadedState, { type: "ADD_CONTRACT_OFFER", offer });
    const s2 = gameReducer(s1, { type: "RESPOND_CONTRACT_OFFER", offerId: "offer-1", accepted: true });
    expect(s2.save!.player.contract.clubId).toBe("club-999");
    expect(s2.save!.player.contract.salary).toBe(2000);
    expect(s2.save!.agentState!.offers[0].status).toBe("accepted");
  });

  it("RESPOND_CONTRACT_OFFER: refus change seulement le statut", () => {
    const offer = {
      id: "offer-2", clubId: "club-888", clubName: "FC Test 2", season: 1, week: 4,
      offerType: "transfer" as const, targetPhase: "professional" as const,
      terms: { clubId: "club-888", salary: 800, bonusGoal: 50, bonusAssist: 30, startSeason: 1, endSeason: 2, role: "squad" as const },
      transferFee: 0, isLoan: false, status: "pending" as const, message: "Test", expiresInWeeks: 3,
    };
    const s1 = gameReducer(loadedState, { type: "ADD_CONTRACT_OFFER", offer });
    const s2 = gameReducer(s1, { type: "RESPOND_CONTRACT_OFFER", offerId: "offer-2", accepted: false });
    expect(s2.save!.player.contract.clubId).toBe("club-001"); // inchangé
    expect(s2.save!.agentState!.offers[0].status).toBe("rejected");
  });
});

// ── Tests : blessures ─────────────────────────────────────────────────────────

describe("Blessures", () => {
  it("APPLY_INJURY impose une blessure et augmente la fatigue", () => {
    const injury = { type: "Genou" as const, daysRemaining: 21, severity: "moderate" as const };
    const state = gameReducer(loadedState, { type: "APPLY_INJURY", injury });
    expect(state.save!.player.condition.injury).not.toBeNull();
    expect(state.save!.player.condition.fatigue).toBeGreaterThan(20); // +30
  });

  it("HEAL_INJURY supprime la blessure", () => {
    const injuredSave = { ...baseSave, player: { ...baseSave.player, condition: { ...baseSave.player.condition, injury: { type: "Cheville" as const, daysRemaining: 7, severity: "minor" as const } } } };
    const state = gameReducer({ ...loadedState, save: injuredSave }, { type: "HEAL_INJURY" });
    expect(state.save!.player.condition.injury).toBeNull();
  });

  it("COMMIT_WEEK guérit la blessure si daysRemaining ≤ 7", () => {
    const injuredSave = { ...baseSave, player: { ...baseSave.player, condition: { ...baseSave.player.condition, injury: { type: "Cheville" as const, daysRemaining: 7, severity: "minor" as const } } } };
    const state = gameReducer({ ...loadedState, save: injuredSave }, { type: "COMMIT_WEEK" });
    expect(state.save!.player.condition.injury).toBeNull();
  });
});

// ── Tests : sauvegarde & rechargement ────────────────────────────────────────

describe("Sauvegarde et rechargement", () => {
  it("SAVE_GAME met isDirty à false", () => {
    const dirtyState = { ...loadedState, isDirty: true };
    const state = gameReducer(dirtyState, { type: "SAVE_GAME" });
    expect(state.isDirty).toBe(false);
  });

  it("Les matchs déjà dans completedMatchIds ne sont pas rejoués au rechargement", () => {
    const result = makeMatchResult();
    // Appliquer le match une première fois
    const s1 = gameReducer(loadedState, { type: "APPLY_MATCH_RESULT", result });
    // Simuler rechargement : créer un GameState depuis la sauvegarde obtenue
    const reloadedState = gameReducer(initialState, { type: "LOAD_SAVE", save: s1.save! });
    // Essayer d'appliquer le même match à nouveau
    const s2 = gameReducer(reloadedState, { type: "APPLY_MATCH_RESULT", result });
    expect(s2.save!.player.stats.totalGoals).toBe(1); // pas doublé
    expect(s2.save!.player.stats.totalAppearances).toBe(1);
  });

  it("Plusieurs semaines : stats s'accumulent correctement", () => {
    let state = loadedState;
    const results = Array.from({ length: 5 }, (_, i) =>
      makeMatchResult({ matchId: `m-${i+1}`, lockKey: `lk-${i+1}`, playerStats: { goals: 1, assists: 0, shotsOnTarget: 2, shotsOffTarget: 1, saves: 0, tackles: 1, interceptions: 0, foulsCommitted: 0, yellowCards: 0, redCards: 0, minutesPlayed: 90, keyPasses: 1, dribbles: 1 } })
    );
    for (const r of results) {
      state = gameReducer(state, { type: "APPLY_MATCH_RESULT", result: r });
      state = gameReducer(state, { type: "APPLY_MATCH_TRUST_DELTA", matchRating: 7.0, minutesPlayed: 90 });
      state = gameReducer(state, { type: "COMMIT_WEEK" });
    }
    expect(state.save!.player.stats.totalAppearances).toBe(5);
    expect(state.save!.player.stats.totalGoals).toBe(5);
    expect(state.save!.career.week).toBe(6);
  });
});

// ── Tests : journal ───────────────────────────────────────────────────────────

describe("Journal", () => {
  it("ADD_JOURNAL_ENTRY ajoute une entrée", () => {
    const entry = { id: "j-1", season: 1, week: 1, type: "match" as const, title: "Victoire", body: "Superbe match" };
    const state = gameReducer(loadedState, { type: "ADD_JOURNAL_ENTRY", entry });
    expect(state.save!.journal).toHaveLength(1);
    expect(state.save!.journal![0].title).toBe("Victoire");
  });
});

// ── Tests : erreurs ───────────────────────────────────────────────────────────

describe("Erreurs", () => {
  it("SET_ERROR stocke le message", () => {
    const state = gameReducer(loadedState, { type: "SET_ERROR", message: "Erreur test" });
    expect(state.error).toBe("Erreur test");
  });

  it("CLEAR_ERROR efface le message", () => {
    const s1 = gameReducer(loadedState, { type: "SET_ERROR", message: "Erreur test" });
    const s2 = gameReducer(s1, { type: "CLEAR_ERROR" });
    expect(s2.error).toBeNull();
  });
});
