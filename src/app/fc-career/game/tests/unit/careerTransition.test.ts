/**
 * FC CAREER — Tests de régression P0 : Transition de carrière à l'acceptation d'une offre
 *
 * Mission P0 (FC CAREER 27 — DIRECTION TECHNIQUE ET IMMERSION FOOTBALLISTIQUE)
 * Tests A-J couvrant l'intégralité du parcours offre → transition.
 *
 * Critère de validation : le joueur ne doit JAMAIS voir son ancienne affectation
 * académie après avoir accepté un contrat professionnel ou un transfert.
 */

import { gameReducer, initialState, type GameState } from "../../state/gameReducer";
import type { GameSaveV1 } from "../../persistence/saveSchema";
import type { ContractOffer } from "../../domain/agent";

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

// Schedule académie simulant des matchs de la saison 1
const academySchedule = {
  competitionId: "youth-league",
  season: 1,
  currentMatchday: 3,
  totalMatchdays: 38,
  fixtures: [
    { id: "fix-1", season: 1, homeClubId: "academy", awayClubId: "opp-1", matchday: 1, result: null, competitionId: "youth-league" },
    { id: "fix-2", season: 1, homeClubId: "opp-2",   awayClubId: "academy", matchday: 2, result: null, competitionId: "youth-league" },
    { id: "fix-3", season: 1, homeClubId: "academy", awayClubId: "opp-3", matchday: 3, result: null, competitionId: "youth-league" },
  ],
};

// Schedule professionnel simulant la ligue 1
const proSchedule = {
  competitionId: "league-valtara-1",
  season: 1,
  currentMatchday: 5,
  totalMatchdays: 38,
  fixtures: [
    { id: "pro-fix-1", season: 1, homeClubId: "club-pro", awayClubId: "club-opp", matchday: 5, result: null, competitionId: "league-valtara-1" },
    { id: "pro-fix-2", season: 1, homeClubId: "club-opp", awayClubId: "club-pro", matchday: 6, result: null, competitionId: "league-valtara-1" },
  ],
};

const baseAcademySave: GameSaveV1 = {
  version: 1,
  meta: { careerId: "c-001", createdAt: 0, savedAt: 0, playTime: 0 },
  player: {
    id: "p-001", firstName: "Luca", lastName: "Ferreira", nationality: "BR",
    birthAge: 16, age: 16, foot: "right", position: "ST",
    heightCm: 178, weightKg: 73,
    attributes: minAttrs, overall: 61, potential: 87,
    condition: { form: 75, fatigue: 20, morale: 70, injury: null },
    contract: { clubId: "academy", salary: 500, bonusGoal: 100, bonusAssist: 50, startSeason: 1, endSeason: 3, role: "squad" },
    playStyles: [], traits: [], paPoints: 5,
    stats: {
      totalAppearances: 3, totalGoals: 2, totalAssists: 1,
      totalYellowCards: 0, totalRedCards: 0, totalMinutes: 270, peakOverall: 61,
      seasons: [{ season: 1, clubId: "academy", appearances: 3, starts: 3, goals: 2, assists: 1, yellowCards: 0, redCards: 0, minutesPlayed: 270, avgRating: 7.2, motmCount: 1 }],
    },
    progressionHistory: [], reputation: 15, popularity: 5,
  },
  career: {
    id: "c-001", phase: "academy", season: 1, matchday: 3, week: 10,
    academy: { stage: "youth", evaluationScore: 75, promotionThreshold: 70, weeksInStage: 10 },
    objectives: [], events: [],
    completedMatchIds: ["fix-1", "fix-2"] as unknown as string[],
    seasonSummaries: [],
  },
  wallet: { balance: 5000, weeklyWage: 500, totalEarned: 5000, totalSpent: 0 },
  world: {
    countries: [],
    leagues: [],
    clubs: [
      { id: "club-pro", name: "FC Valtara Pro", shortName: "VAL", leagueId: "league-valtara-1", reputation: 70, countryId: "valtara", tier: 1 as const, colors: { primary: "#0000ff", secondary: "#ffffff" }, wagesBudget: 100000, transferBudget: 5000000, academyLevel: 3, philosophy: "balanced" as const },
      { id: "club-opp", name: "FC Opponent",    shortName: "OPP", leagueId: "league-valtara-1", reputation: 65, countryId: "valtara", tier: 1 as const, colors: { primary: "#ff0000", secondary: "#ffffff" }, wagesBudget: 80000, transferBudget: 3000000, academyLevel: 2, philosophy: "defensive" as const },
    ],
    standings: {},
    schedules: [academySchedule, proSchedule],
    lastMatchResults: [],
  },
  transferHistory: [],
  coach: {
    id: "coach-academy", name: "Coach Académie", philosophy: "offensif",
    trust: 60, playerRole: "remplaçant" as const,
    conversations: [],
    seasonObjective: { description: "Disputer 5 matchs", type: "appearances", target: 5, current: 3, completed: false },
  },
  weekState: { trainingDone: false, trainingIntensity: null, matchPlayed: false },
  academyMatchContexts: [
    {
      fixtureId: "fix-1", competitionId: "youth-league" as const,
      opponentId: "opp-1", opponentName: "Académie Opp 1", opponentStrength: 50,
      isHome: true, matchday: 1, startingStatus: "starter" as const,
      postMatchEval: { rating: 7.5, goals: 1, assists: 0, minutesPlayed: 90, coachComment: "Bon match", coachObjectiveForNext: "Améliorer le jeu sans ballon", evalScoreDelta: 3, recruiterNoticed: false },
    },
    {
      fixtureId: "fix-2", competitionId: "youth-league" as const,
      opponentId: "opp-2", opponentName: "Académie Opp 2", opponentStrength: 55,
      isHome: false, matchday: 2, startingStatus: "starter" as const,
      postMatchEval: { rating: 7.0, goals: 1, assists: 1, minutesPlayed: 90, coachComment: "Très bon match", coachObjectiveForNext: "Continuer sur cette lancée", evalScoreDelta: 2, recruiterNoticed: true, recruiterClubId: "club-pro" },
    },
  ],
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeLoadedState(save: GameSaveV1): GameState {
  return { ...initialState, save, isLoading: false };
}

function makeProOffer(overrides?: Partial<ContractOffer>): ContractOffer {
  return {
    id: "offer-pro-1",
    clubId: "club-pro",
    clubName: "FC Valtara Pro",
    season: 1,
    week: 10,
    offerType: "professional",
    targetPhase: "professional",
    terms: { clubId: "club-pro", salary: 3000, bonusGoal: 300, bonusAssist: 150, startSeason: 1, endSeason: 4, role: "squad" },
    transferFee: 0,
    isLoan: false,
    status: "pending",
    message: "Bienvenue en professionnel.",
    expiresInWeeks: 3,
    ...overrides,
  };
}

function makeAcademyOffer(targetStage: "u18" | "u21" | "reserve" = "u18"): ContractOffer {
  return {
    id: "offer-acad-1",
    clubId: "academy-2",
    clubName: "Académie FC 2",
    season: 1,
    week: 10,
    offerType: "academy_recruitment",
    targetPhase: "academy",
    targetAcademyStage: targetStage,
    terms: { clubId: "academy-2", salary: 600, bonusGoal: 0, bonusAssist: 0, startSeason: 1, endSeason: 3, role: "squad" },
    transferFee: 0,
    isLoan: false,
    status: "pending",
    message: "Rejoins notre académie.",
    expiresInWeeks: 3,
  };
}

// ── Test A : Joueur académie accepte offre d'une autre académie ───────────────

describe("Test A — Recrutement académie vers académie", () => {
  it("le joueur reste en phase academy et ne devient PAS professionnel", () => {
    const loadedState = makeLoadedState(baseAcademySave);
    const offer = makeAcademyOffer("u18");
    const s1 = gameReducer(loadedState, { type: "ADD_CONTRACT_OFFER", offer });
    const s2 = gameReducer(s1, { type: "RESPOND_CONTRACT_OFFER", offerId: "offer-acad-1", accepted: true });

    expect(s2.save!.career.phase).toBe("academy");
    expect(s2.save!.career.academy).not.toBeNull();
    expect(s2.save!.career.academy!.stage).toBe("u18");
    expect(s2.save!.player.contract.clubId).toBe("academy-2");
  });

  it("le nouveau club est academy-2, pas le pro club", () => {
    const loadedState = makeLoadedState(baseAcademySave);
    const offer = makeAcademyOffer("u18");
    const s1 = gameReducer(loadedState, { type: "ADD_CONTRACT_OFFER", offer });
    const s2 = gameReducer(s1, { type: "RESPOND_CONTRACT_OFFER", offerId: "offer-acad-1", accepted: true });

    expect(s2.save!.player.contract.clubId).toBe("academy-2");
    expect(s2.save!.player.contract.salary).toBe(600);
  });
});

// ── Test B : Joueur académie accepte contrat professionnel ────────────────────

describe("Test B — Premier contrat professionnel depuis l'académie", () => {
  it("la phase passe à 'professional'", () => {
    const loadedState = makeLoadedState(baseAcademySave);
    const offer = makeProOffer();
    const s1 = gameReducer(loadedState, { type: "ADD_CONTRACT_OFFER", offer });
    const s2 = gameReducer(s1, { type: "RESPOND_CONTRACT_OFFER", offerId: "offer-pro-1", accepted: true });

    expect(s2.save!.career.phase).toBe("professional");
  });

  it("career.academy devient null (le joueur a quitté l'académie)", () => {
    const loadedState = makeLoadedState(baseAcademySave);
    const offer = makeProOffer();
    const s1 = gameReducer(loadedState, { type: "ADD_CONTRACT_OFFER", offer });
    const s2 = gameReducer(s1, { type: "RESPOND_CONTRACT_OFFER", offerId: "offer-pro-1", accepted: true });

    expect(s2.save!.career.academy).toBeNull();
  });

  it("le contrat reflète les conditions du club pro", () => {
    const loadedState = makeLoadedState(baseAcademySave);
    const offer = makeProOffer();
    const s1 = gameReducer(loadedState, { type: "ADD_CONTRACT_OFFER", offer });
    const s2 = gameReducer(s1, { type: "RESPOND_CONTRACT_OFFER", offerId: "offer-pro-1", accepted: true });

    expect(s2.save!.player.contract.clubId).toBe("club-pro");
    expect(s2.save!.player.contract.salary).toBe(3000);
    expect(s2.save!.wallet.weeklyWage).toBe(3000);
  });

  it("le coach change pour correspondre à la nouvelle phase professionnelle", () => {
    const loadedState = makeLoadedState(baseAcademySave);
    const offer = makeProOffer();
    const s1 = gameReducer(loadedState, { type: "ADD_CONTRACT_OFFER", offer });
    const s2 = gameReducer(s1, { type: "RESPOND_CONTRACT_OFFER", offerId: "offer-pro-1", accepted: true });

    // Le coach ne doit plus être le coach d'académie
    expect(s2.save!.coach?.id).not.toBe("coach-academy");
    expect(s2.save!.coach).not.toBeNull();
  });

  it("le schedule académie est retiré après transition pro", () => {
    const loadedState = makeLoadedState(baseAcademySave);
    const offer = makeProOffer();
    const s1 = gameReducer(loadedState, { type: "ADD_CONTRACT_OFFER", offer });
    const s2 = gameReducer(s1, { type: "RESPOND_CONTRACT_OFFER", offerId: "offer-pro-1", accepted: true });

    const youthSchedule = s2.save!.world.schedules.find(s => s.competitionId === "youth-league");
    expect(youthSchedule).toBeUndefined();
  });

  it("les contextes de match académie sont effacés", () => {
    const loadedState = makeLoadedState(baseAcademySave);
    const offer = makeProOffer();
    const s1 = gameReducer(loadedState, { type: "ADD_CONTRACT_OFFER", offer });
    const s2 = gameReducer(s1, { type: "RESPOND_CONTRACT_OFFER", offerId: "offer-pro-1", accepted: true });

    expect(s2.save!.academyMatchContexts ?? []).toHaveLength(0);
  });

  it("un événement journal de transfert est créé", () => {
    const loadedState = makeLoadedState(baseAcademySave);
    const offer = makeProOffer();
    const s1 = gameReducer(loadedState, { type: "ADD_CONTRACT_OFFER", offer });
    const s2 = gameReducer(s1, { type: "RESPOND_CONTRACT_OFFER", offerId: "offer-pro-1", accepted: true });

    const transferEvent = s2.save!.career.events?.find(e => e.type === "transfer");
    expect(transferEvent).toBeDefined();
    expect(transferEvent?.title).toContain("FC Valtara Pro");
  });
});

// ── Test C : Joueur professionnel accepte offre d'un autre club ───────────────

describe("Test C — Transfert entre clubs professionnels", () => {
  const proSave: GameSaveV1 = {
    ...baseAcademySave,
    player: {
      ...baseAcademySave.player,
      contract: { clubId: "club-pro", salary: 3000, bonusGoal: 300, bonusAssist: 150, startSeason: 1, endSeason: 4, role: "squad" },
    },
    career: {
      ...baseAcademySave.career,
      phase: "professional",
      academy: null,
    },
  };

  it("le nouveau club devient club-opp après acceptation", () => {
    const loadedState = makeLoadedState(proSave);
    const offer: ContractOffer = {
      id: "offer-transfer-1",
      clubId: "club-opp",
      clubName: "FC Opponent",
      season: 1,
      week: 10,
      offerType: "transfer",
      targetPhase: "professional",
      terms: { clubId: "club-opp", salary: 4000, bonusGoal: 400, bonusAssist: 200, startSeason: 1, endSeason: 4, role: "starter" },
      transferFee: 200000,
      isLoan: false,
      status: "pending",
      message: "Transfert pro.",
      expiresInWeeks: 3,
    };
    const s1 = gameReducer(loadedState, { type: "ADD_CONTRACT_OFFER", offer });
    const s2 = gameReducer(s1, { type: "RESPOND_CONTRACT_OFFER", offerId: "offer-transfer-1", accepted: true });

    expect(s2.save!.player.contract.clubId).toBe("club-opp");
    expect(s2.save!.career.phase).toBe("professional");
    expect(s2.save!.career.academy).toBeNull();
  });

  it("le schedule académie reste absent après un transfert pro", () => {
    const loadedState = makeLoadedState(proSave);
    const offer: ContractOffer = {
      id: "offer-transfer-1",
      clubId: "club-opp",
      clubName: "FC Opponent",
      season: 1,
      week: 10,
      offerType: "transfer",
      targetPhase: "professional",
      terms: { clubId: "club-opp", salary: 4000, bonusGoal: 400, bonusAssist: 200, startSeason: 1, endSeason: 4, role: "starter" },
      transferFee: 200000,
      isLoan: false,
      status: "pending",
      message: "Transfert pro.",
      expiresInWeeks: 3,
    };
    const s1 = gameReducer(loadedState, { type: "ADD_CONTRACT_OFFER", offer });
    const s2 = gameReducer(s1, { type: "RESPOND_CONTRACT_OFFER", offerId: "offer-transfer-1", accepted: true });

    const youthSchedule = s2.save!.world.schedules.find(s => s.competitionId === "youth-league");
    expect(youthSchedule).toBeUndefined();
  });
});

// ── Test D : Offre refusée ou expirée ne change rien ─────────────────────────

describe("Test D — Refus d'une offre", () => {
  it("refuser une offre ne change ni la phase ni le club ni le contrat", () => {
    const loadedState = makeLoadedState(baseAcademySave);
    const offer = makeProOffer();
    const s1 = gameReducer(loadedState, { type: "ADD_CONTRACT_OFFER", offer });
    const s2 = gameReducer(s1, { type: "RESPOND_CONTRACT_OFFER", offerId: "offer-pro-1", accepted: false });

    expect(s2.save!.career.phase).toBe("academy");
    expect(s2.save!.career.academy).not.toBeNull();
    expect(s2.save!.player.contract.clubId).toBe("academy");
    expect(s2.save!.agentState!.offers[0].status).toBe("rejected");
  });

  it("une offre avec statut 'rejected' ne peut pas être acceptée", () => {
    const loadedState = makeLoadedState(baseAcademySave);
    const offer = makeProOffer();
    const s1 = gameReducer(loadedState, { type: "ADD_CONTRACT_OFFER", offer });
    const s2 = gameReducer(s1, { type: "RESPOND_CONTRACT_OFFER", offerId: "offer-pro-1", accepted: false });
    // Tenter d'accepter après refus — le reducer doit ignorer (idempotence)
    const s3 = gameReducer(s2, { type: "RESPOND_CONTRACT_OFFER", offerId: "offer-pro-1", accepted: true });

    expect(s3.save!.career.phase).toBe("academy"); // toujours en académie
    expect(s3.save!.player.contract.clubId).toBe("academy");
  });
});

// ── Test E : Une offre acceptée ne peut pas être appliquée deux fois ──────────

describe("Test E — Idempotence de l'acceptation", () => {
  it("appliquer RESPOND_CONTRACT_OFFER deux fois sur la même offre acceptée ne change rien la 2e fois", () => {
    const loadedState = makeLoadedState(baseAcademySave);
    const offer = makeProOffer();
    const s1 = gameReducer(loadedState, { type: "ADD_CONTRACT_OFFER", offer });
    const s2 = gameReducer(s1, { type: "RESPOND_CONTRACT_OFFER", offerId: "offer-pro-1", accepted: true });
    const s3 = gameReducer(s2, { type: "RESPOND_CONTRACT_OFFER", offerId: "offer-pro-1", accepted: true });

    // L'état ne doit pas changer entre s2 et s3
    expect(s3.save!.career.phase).toBe("professional");
    expect(s3.save!.agentState!.transfers).toHaveLength(s2.save!.agentState!.transfers.length);
  });
});

// ── Test F : Le prochain match correspond au calendrier actif ─────────────────

describe("Test F — Calendrier actif après transition", () => {
  it("après passage au pro, les matchs académie ne sont plus dans les schedules actifs", () => {
    const loadedState = makeLoadedState(baseAcademySave);
    const offer = makeProOffer();
    const s1 = gameReducer(loadedState, { type: "ADD_CONTRACT_OFFER", offer });
    const s2 = gameReducer(s1, { type: "RESPOND_CONTRACT_OFFER", offerId: "offer-pro-1", accepted: true });

    const activeSchedules = s2.save!.world.schedules;
    const hasAcademyFixtures = activeSchedules.some(
      s => s.competitionId === "youth-league" || s.competitionId === "academy-cup"
    );
    expect(hasAcademyFixtures).toBe(false);
  });

  it("le schedule pro est toujours présent après transition", () => {
    const loadedState = makeLoadedState(baseAcademySave);
    const offer = makeProOffer();
    const s1 = gameReducer(loadedState, { type: "ADD_CONTRACT_OFFER", offer });
    const s2 = gameReducer(s1, { type: "RESPOND_CONTRACT_OFFER", offerId: "offer-pro-1", accepted: true });

    const proSched = s2.save!.world.schedules.find(s => s.competitionId === "league-valtara-1");
    expect(proSched).toBeDefined();
  });
});

// ── Test G : Historique préservé, pas de doublons de stats ───────────────────

describe("Test G — Préservation de l'historique", () => {
  it("les stats de saison académie sont conservées après transition pro", () => {
    const loadedState = makeLoadedState(baseAcademySave);
    const offer = makeProOffer();
    const s1 = gameReducer(loadedState, { type: "ADD_CONTRACT_OFFER", offer });
    const s2 = gameReducer(s1, { type: "RESPOND_CONTRACT_OFFER", offerId: "offer-pro-1", accepted: true });

    const academySeason = s2.save!.player.stats.seasons.find(s => s.clubId === "academy");
    expect(academySeason).toBeDefined();
    expect(academySeason?.goals).toBe(2);
    expect(academySeason?.appearances).toBe(3);
  });

  it("une seule entrée de transfert est créée dans agentState.transfers", () => {
    const loadedState = makeLoadedState(baseAcademySave);
    const offer = makeProOffer();
    const s1 = gameReducer(loadedState, { type: "ADD_CONTRACT_OFFER", offer });
    const s2 = gameReducer(s1, { type: "RESPOND_CONTRACT_OFFER", offerId: "offer-pro-1", accepted: true });

    const transfersToClub = s2.save!.agentState!.transfers.filter(t => t.toClubId === "club-pro");
    expect(transfersToClub).toHaveLength(1);
  });
});

// ── Test H : Save + reload préserve la transition complète ───────────────────

describe("Test H — Persistance de la transition", () => {
  it("l'état après acceptation est sérialisable (pas de Set/Map non sérialisable)", () => {
    const loadedState = makeLoadedState(baseAcademySave);
    const offer = makeProOffer();
    const s1 = gameReducer(loadedState, { type: "ADD_CONTRACT_OFFER", offer });
    const s2 = gameReducer(s1, { type: "RESPOND_CONTRACT_OFFER", offerId: "offer-pro-1", accepted: true });

    // La sérialisation JSON ne doit pas planter
    expect(() => JSON.stringify(s2.save)).not.toThrow();
    const serialized = JSON.stringify(s2.save);
    const restored = JSON.parse(serialized) as GameSaveV1;

    // Après désérialisation, la phase est toujours correcte
    expect(restored.career.phase).toBe("professional");
    expect(restored.career.academy).toBeNull();
    expect(restored.player.contract.clubId).toBe("club-pro");
  });

  it("les completedMatchIds sont réinitialisés (tableau vide) après transition", () => {
    const loadedState = makeLoadedState(baseAcademySave);
    const offer = makeProOffer();
    const s1 = gameReducer(loadedState, { type: "ADD_CONTRACT_OFFER", offer });
    const s2 = gameReducer(s1, { type: "RESPOND_CONTRACT_OFFER", offerId: "offer-pro-1", accepted: true });

    const ids = s2.save!.career.completedMatchIds as unknown as string[];
    expect(Array.isArray(ids)).toBe(true);
    expect(ids).toHaveLength(0);
  });
});

// ── Test I : Objectifs du coach utilisent le nouveau contexte ─────────────────

describe("Test I — Coach et sélection après transition", () => {
  it("le coach après transition pro a un objectif adapté à la phase pro", () => {
    const loadedState = makeLoadedState(baseAcademySave);
    const offer = makeProOffer();
    const s1 = gameReducer(loadedState, { type: "ADD_CONTRACT_OFFER", offer });
    const s2 = gameReducer(s1, { type: "RESPOND_CONTRACT_OFFER", offerId: "offer-pro-1", accepted: true });

    const coach = s2.save!.coach;
    expect(coach).not.toBeNull();
    // Le coach pro doit avoir un objectif différent de l'académie (ex: rating ou buts en championnat)
    expect(coach?.seasonObjective?.description).not.toBe("");
    // L'id du coach ne doit plus être le coach académie
    expect(coach?.id).not.toBe("coach-academy");
  });

  it("le coach après transition garde trust et rôle initiaux (nouveau départ)", () => {
    const loadedState = makeLoadedState(baseAcademySave);
    const offer = makeProOffer();
    const s1 = gameReducer(loadedState, { type: "ADD_CONTRACT_OFFER", offer });
    const s2 = gameReducer(s1, { type: "RESPOND_CONTRACT_OFFER", offerId: "offer-pro-1", accepted: true });

    const coach = s2.save!.coach;
    // Trust initial = 40 (createInitialCoach)
    expect(coach?.trust).toBe(40);
  });
});

// ── Test J : Les autres clubs continuent de fonctionner normalement ───────────

describe("Test J — Monde vivant non affecté par la transition", () => {
  it("les clubs du monde vivant sont toujours présents après transition", () => {
    const loadedState = makeLoadedState(baseAcademySave);
    const offer = makeProOffer();
    const s1 = gameReducer(loadedState, { type: "ADD_CONTRACT_OFFER", offer });
    const s2 = gameReducer(s1, { type: "RESPOND_CONTRACT_OFFER", offerId: "offer-pro-1", accepted: true });

    expect(s2.save!.world.clubs).toHaveLength(baseAcademySave.world.clubs.length);
  });

  it("le schedule professionnel est intact (non supprimé) après la transition", () => {
    const loadedState = makeLoadedState(baseAcademySave);
    const offer = makeProOffer();
    const s1 = gameReducer(loadedState, { type: "ADD_CONTRACT_OFFER", offer });
    const s2 = gameReducer(s1, { type: "RESPOND_CONTRACT_OFFER", offerId: "offer-pro-1", accepted: true });

    const proSched = s2.save!.world.schedules.find(s => s.competitionId === "league-valtara-1");
    expect(proSched).toBeDefined();
    expect(proSched!.fixtures).toHaveLength(2);
  });

  it("les standings du monde ne sont pas réinitialisés", () => {
    const saveWithStandings: GameSaveV1 = {
      ...baseAcademySave,
      world: {
        ...baseAcademySave.world,
        standings: { "league-valtara-1": [{ clubId: "club-pro", played: 5, won: 3, drawn: 1, lost: 1, goalsFor: 10, goalsAgainst: 5, points: 10 }] },
      },
    };
    const loadedState = makeLoadedState(saveWithStandings);
    const offer = makeProOffer();
    const s1 = gameReducer(loadedState, { type: "ADD_CONTRACT_OFFER", offer });
    const s2 = gameReducer(s1, { type: "RESPOND_CONTRACT_OFFER", offerId: "offer-pro-1", accepted: true });

    expect(s2.save!.world.standings["league-valtara-1"]).toBeDefined();
    expect(s2.save!.world.standings["league-valtara-1"][0].points).toBe(10);
  });
});
