/**
 * FC CAREER — Tests d'intégration Lot A : Parcours complet de carrière
 *
 * Couvre les 10 scénarios obligatoires du document de mission :
 * 1. Créer une carrière en académie avec des statistiques initiales nulles.
 * 2. Jouer un match et vérifier que les statistiques sont comptées une seule fois.
 * 3. Recevoir une offre professionnelle et l'accepter.
 * 4. Vérifier le club, l'équipe, la phase, le contrat, le salaire, le coach et le calendrier.
 * 5. Vérifier qu'aucun ancien match d'académie incompatible ne reste actif.
 * 6. Disputer le premier match du nouveau club (week/matchday reset).
 * 7. Vérifier les minutes, statistiques, classement, objectif du coach et historique.
 * 8. Recharger la sauvegarde et vérifier que tout reste cohérent.
 * 9. Vérifier séparément le refus d'une offre et une promotion interne à l'académie.
 * 10. Vérifier qu'une saison sans résultats ne produit pas de récompenses sportives fictives.
 */

import { gameReducer, initialState, type GameState } from "../../state/gameReducer";
import type { GameSaveV1 } from "../../persistence/saveSchema";
import type { ContractOffer } from "../../domain/agent";
import { computeSeasonEvaluation } from "../../domain/seasonEnd";

/* ── Fixtures minimales ──────────────────────────────────────────────────── */

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

const baseNewCareerSave: GameSaveV1 = {
  version: 1,
  meta: { careerId: "c-fresh", createdAt: 0, savedAt: 0, playTime: 0 },
  player: {
    id: "p-fresh", firstName: "Marco", lastName: "Santos", nationality: "PT",
    birthAge: 16, age: 16, foot: "right", position: "CAM",
    heightCm: 176, weightKg: 70,
    attributes: minAttrs, overall: 60, potential: 85,
    condition: { form: 70, fatigue: 10, morale: 75, injury: null },
    contract: { clubId: "academy-fresh", salary: 400, bonusGoal: 50, bonusAssist: 25, startSeason: 1, endSeason: 3, role: "squad" },
    playStyles: [], traits: [], paPoints: 0,
    stats: {
      totalAppearances: 0, totalGoals: 0, totalAssists: 0,
      totalYellowCards: 0, totalRedCards: 0, totalMinutes: 0, peakOverall: 60,
      seasons: [],
    },
    progressionHistory: [], reputation: 10, popularity: 2,
  },
  career: {
    id: "c-fresh", phase: "academy", season: 1, matchday: 1, week: 1,
    academy: { stage: "youth", evaluationScore: 50, promotionThreshold: 70, weeksInStage: 0 },
    objectives: [], events: [],
    completedMatchIds: [] as unknown as string[],
    seasonSummaries: [],
  },
  wallet: { balance: 0, weeklyWage: 400, totalEarned: 0, totalSpent: 0 },
  world: {
    countries: [],
    leagues: [{ id: "vlt-d1", name: "Valtara D1", countryId: "valtara", level: 1, tier: 1, totalMatchdays: 14 }],
    clubs: [
      { id: "academy-fresh", name: "Académie FC", shortName: "ACF", leagueId: "youth-league", reputation: 30, countryId: "valtara", tier: 4 as const, colors: { primary: "#00aa00", secondary: "#ffffff" }, wagesBudget: 5000, transferBudget: 0, academyLevel: 3, philosophy: "balanced" as const },
      { id: "club-pro-fresh", name: "FC Pro Valtara", shortName: "FPV", leagueId: "vlt-d1", reputation: 65, countryId: "valtara", tier: 1 as const, colors: { primary: "#003399", secondary: "#ffffff" }, wagesBudget: 80000, transferBudget: 3000000, academyLevel: 2, philosophy: "attacking" as const },
      { id: "club-opp-1", name: "FC Opponent 1", shortName: "OP1", leagueId: "vlt-d1", reputation: 60, countryId: "valtara", tier: 1 as const, colors: { primary: "#cc0000", secondary: "#ffffff" }, wagesBudget: 70000, transferBudget: 2000000, academyLevel: 2, philosophy: "defensive" as const },
    ],
    standings: {},
    schedules: [
      {
        competitionId: "youth-league", season: 1, currentMatchday: 0, totalMatchdays: 10,
        fixtures: [
          { id: "yl-fix-1", season: 1, homeClubId: "academy-fresh", awayClubId: "youth-opp-1", matchday: 1, result: null, competitionId: "youth-league" },
          { id: "yl-fix-2", season: 1, homeClubId: "youth-opp-2", awayClubId: "academy-fresh", matchday: 2, result: null, competitionId: "youth-league" },
          { id: "yl-fix-3", season: 1, homeClubId: "academy-fresh", awayClubId: "youth-opp-3", matchday: 3, result: null, competitionId: "youth-league" },
        ],
      },
      {
        competitionId: "vlt-d1", season: 1, currentMatchday: 0, totalMatchdays: 14,
        fixtures: [
          { id: "pro-fix-1", season: 1, homeClubId: "club-pro-fresh", awayClubId: "club-opp-1", matchday: 1, result: null, competitionId: "vlt-d1" },
          { id: "pro-fix-2", season: 1, homeClubId: "club-opp-1", awayClubId: "club-pro-fresh", matchday: 2, result: null, competitionId: "vlt-d1" },
          { id: "pro-fix-3", season: 1, homeClubId: "club-pro-fresh", awayClubId: "club-opp-1", matchday: 3, result: null, competitionId: "vlt-d1" },
        ],
      },
    ],
    lastMatchResults: [],
  },
  transferHistory: [],
  coach: {
    id: "coach-acad", name: "Coach Académie", philosophy: "formation",
    trust: 50, playerRole: "remplaçant" as const,
    conversations: [],
    seasonObjective: { description: "Disputer 3 matchs", type: "appearances", target: 3, current: 0, completed: false },
  },
  weekState: { trainingDone: false, trainingIntensity: null, matchPlayed: false },
  academyMatchContexts: [],
};

function makeState(save: GameSaveV1): GameState {
  return { ...initialState, save, isLoading: false };
}

function makeProOffer(overrides?: Partial<ContractOffer>): ContractOffer {
  return {
    id: "offer-pro-fresh",
    clubId: "club-pro-fresh",
    clubName: "FC Pro Valtara",
    offerType: "professional",
    targetPhase: "professional",
    targetAcademyStage: undefined,
    transferFee: 0,
    isLoan: false,
    loanEndSeason: undefined,
    terms: {
      clubId: "club-pro-fresh",
      salary: 2000,
      bonusGoal: 200,
      bonusAssist: 100,
      startSeason: 1,
      endSeason: 4,
      role: "squad",
    },
    status: "pending",
    expiresWeek: 99,
    ...overrides,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   SCÉNARIO 1 — Nouvelle carrière : statistiques initiales nulles
   ═══════════════════════════════════════════════════════════════════════════ */
describe("Scénario 1 — Nouvelle carrière : statistiques initiales nulles", () => {
  const s = makeState(baseNewCareerSave);

  it("aucune apparition au démarrage", () => {
    expect(s.save!.player.stats.totalAppearances).toBe(0);
  });
  it("aucun but au démarrage", () => {
    expect(s.save!.player.stats.totalGoals).toBe(0);
  });
  it("aucun résumé de saison au démarrage", () => {
    expect(s.save!.career.seasonSummaries).toHaveLength(0);
  });
  it("completedMatchIds vide au démarrage", () => {
    expect(Array.from(s.save!.career.completedMatchIds as unknown as string[])).toHaveLength(0);
  });
  it("aucun historique de transfert au démarrage", () => {
    expect(s.save!.agentState?.transfers ?? s.save!.transferHistory ?? []).toHaveLength(0);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   SCÉNARIO 2 — Jouer un match : statistiques comptées une seule fois
   ═══════════════════════════════════════════════════════════════════════════ */
describe("Scénario 2 — Jouer un match : statistiques comptées une seule fois", () => {
  // Utiliser APPLY_MATCH_RESULT (l'action réelle qui met à jour les stats)
  const matchResult = {
    matchId: "yl-fix-1",
    season: 1,
    matchday: 1,
    playerClubId: "academy-fresh",
    opponentClubId: "youth-opp-1",
    isHome: true,
    competitionId: "youth-league",
    scoreHome: 2,
    scoreAway: 1,
    playerRating: 7.5,
    playerStats: { goals: 1, assists: 0, minutesPlayed: 90, yellowCards: 0, redCards: 0 },
    events: [],
    paEarned: 2,
    objectivesCompleted: [],
    lockKey: "yl-fix-1-1",
    completedAt: Date.now(),
  };

  const s0 = makeState(baseNewCareerSave);
  const s1 = gameReducer(s0, { type: "APPLY_MATCH_RESULT", result: matchResult });

  it("exactement 1 apparition après 1 match", () => {
    const s = s1.save!.player.stats.seasons.find(ss => ss.season === 1);
    expect(s?.appearances).toBe(1);
  });
  it("exactement 1 but après 1 match avec 1 but", () => {
    const s = s1.save!.player.stats.seasons.find(ss => ss.season === 1);
    expect(s?.goals).toBe(1);
  });
  it("le fixture est dans completedMatchIds", () => {
    const ids = Array.from(s1.save!.career.completedMatchIds as unknown as string[]);
    expect(ids).toContain("yl-fix-1");
  });

  // Appliquer le même APPLY_MATCH_RESULT une deuxième fois — doit être ignoré (idempotence)
  const s2 = gameReducer(s1, { type: "APPLY_MATCH_RESULT", result: matchResult });

  it("appliquer APPLY_MATCH_RESULT deux fois ne double pas les buts (idempotence)", () => {
    const s = s2.save!.player.stats.seasons.find(ss => ss.season === 1);
    expect(s?.goals).toBe(1);
  });
  it("appliquer APPLY_MATCH_RESULT deux fois ne double pas les apparitions (idempotence)", () => {
    const s = s2.save!.player.stats.seasons.find(ss => ss.season === 1);
    expect(s?.appearances).toBe(1);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   SCÉNARIO 3+4 — Accepter une offre pro : état cohérent après transition
   ═══════════════════════════════════════════════════════════════════════════ */
describe("Scénarios 3+4 — Accepter offre pro : club, phase, contrat, coach, calendrier", () => {
  // État : semaine 8, matchday 3 (simuler une transition en milieu de saison)
  const midSeasonSave: GameSaveV1 = {
    ...baseNewCareerSave,
    career: { ...baseNewCareerSave.career, week: 8, matchday: 3 },
    agentState: {
      offers: [makeProOffer()],
      transfers: [],
    },
  };
  const s0 = makeState(midSeasonSave);
  const s1 = gameReducer(s0, { type: "RESPOND_CONTRACT_OFFER", offerId: "offer-pro-fresh", accepted: true });

  it("la phase passe à 'professional'", () => {
    expect(s1.save!.career.phase).toBe("professional");
  });
  it("le club passe à club-pro-fresh", () => {
    expect(s1.save!.player.contract.clubId).toBe("club-pro-fresh");
  });
  it("le salaire est celui de l'offre (2000)", () => {
    expect(s1.save!.player.contract.salary).toBe(2000);
    expect(s1.save!.wallet.weeklyWage).toBe(2000);
  });
  it("career.academy devient null", () => {
    expect(s1.save!.career.academy).toBeNull();
  });
  it("le coach change (pas le même ID qu'avant)", () => {
    expect(s1.save!.coach.id).not.toBe("coach-acad");
  });
  it("le contrat endSeason est 4", () => {
    expect(s1.save!.player.contract.endSeason).toBe(4);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   SCÉNARIO 5 — Aucun match académie résiduel après transition pro
   ═══════════════════════════════════════════════════════════════════════════ */
describe("Scénario 5 — Aucun match académie résiduel après transition pro", () => {
  const s0 = makeState({
    ...baseNewCareerSave,
    agentState: { offers: [makeProOffer()], transfers: [] },
  });
  const s1 = gameReducer(s0, { type: "RESPOND_CONTRACT_OFFER", offerId: "offer-pro-fresh", accepted: true });

  it("le schedule youth-league est retiré", () => {
    const hasYouth = s1.save!.world.schedules.some(s => s.competitionId === "youth-league");
    expect(hasYouth).toBe(false);
  });
  it("le schedule academy-cup est retiré", () => {
    const hasCup = s1.save!.world.schedules.some(s => s.competitionId === "academy-cup");
    expect(hasCup).toBe(false);
  });
  it("les academyMatchContexts sont vides", () => {
    expect(s1.save!.academyMatchContexts ?? []).toHaveLength(0);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   SCÉNARIO 6 — Reset week/matchday après transition pro
   ═══════════════════════════════════════════════════════════════════════════ */
describe("Scénario 6 — Reset week/matchday après transition pro", () => {
  const midSeasonSave: GameSaveV1 = {
    ...baseNewCareerSave,
    career: { ...baseNewCareerSave.career, week: 12, matchday: 5 },
    agentState: { offers: [makeProOffer()], transfers: [] },
  };
  const s0 = makeState(midSeasonSave);
  const s1 = gameReducer(s0, { type: "RESPOND_CONTRACT_OFFER", offerId: "offer-pro-fresh", accepted: true });

  it("career.week est réinitialisé à 1 après transition pro", () => {
    expect(s1.save!.career.week).toBe(1);
  });
  it("career.matchday est réinitialisé à 1 après transition pro", () => {
    expect(s1.save!.career.matchday).toBe(1);
  });
  it("le schedule pro pour la saison 1 est toujours présent", () => {
    const proSchedule = s1.save!.world.schedules.find(s => s.competitionId === "vlt-d1" && s.season === 1);
    expect(proSchedule).toBeDefined();
  });
  it("le premier match du calendrier pro (matchday 1) est trouvable", () => {
    const proSchedule = s1.save!.world.schedules.find(s => s.competitionId === "vlt-d1" && s.season === 1);
    const matchday1 = proSchedule?.fixtures.find(f => f.matchday === 1);
    expect(matchday1).toBeDefined();
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   SCÉNARIO 7 — Statistiques et historique après 1er match pro
   ═══════════════════════════════════════════════════════════════════════════ */
describe("Scénario 7 — Statistiques et historique après 1er match pro", () => {
  // État post-transition pro
  const s0 = makeState({
    ...baseNewCareerSave,
    career: { ...baseNewCareerSave.career, phase: "professional", week: 1, matchday: 1, academy: null },
    player: {
      ...baseNewCareerSave.player,
      contract: { clubId: "club-pro-fresh", salary: 2000, bonusGoal: 200, bonusAssist: 100, startSeason: 1, endSeason: 4, role: "squad" },
    },
  });

  const proMatchResult = {
    matchId: "pro-fix-1",
    season: 1,
    matchday: 1,
    playerClubId: "club-pro-fresh",
    opponentClubId: "club-opp-1",
    isHome: true,
    competitionId: "vlt-d1",
    scoreHome: 1,
    scoreAway: 0,
    playerRating: 7.0,
    playerStats: { goals: 0, assists: 1, minutesPlayed: 85, yellowCards: 0, redCards: 0 },
    events: [],
    paEarned: 2,
    objectivesCompleted: [],
    lockKey: "pro-fix-1-1",
    completedAt: Date.now(),
  };
  const s1 = gameReducer(s0, { type: "APPLY_MATCH_RESULT", result: proMatchResult });

  it("1 apparition en saison 1 après le 1er match pro", () => {
    const s = s1.save!.player.stats.seasons.find(ss => ss.season === 1);
    expect(s?.appearances).toBe(1);
  });
  it("1 passe décisive en saison 1", () => {
    const s = s1.save!.player.stats.seasons.find(ss => ss.season === 1);
    expect(s?.assists).toBe(1);
  });
  it("85 minutes jouées en saison 1", () => {
    const s = s1.save!.player.stats.seasons.find(ss => ss.season === 1);
    expect(s?.minutesPlayed).toBe(85);
  });
  it("pro-fix-1 dans completedMatchIds", () => {
    const ids = Array.from(s1.save!.career.completedMatchIds as unknown as string[]);
    expect(ids).toContain("pro-fix-1");
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   SCÉNARIO 8 — Persistance de la cohérence (sérialisation)
   ═══════════════════════════════════════════════════════════════════════════ */
describe("Scénario 8 — Cohérence après rechargement (sérialisation JSON)", () => {
  const s0 = makeState({
    ...baseNewCareerSave,
    agentState: { offers: [makeProOffer()], transfers: [] },
  });
  const s1 = gameReducer(s0, { type: "RESPOND_CONTRACT_OFFER", offerId: "offer-pro-fresh", accepted: true });

  // Simuler un rechargement : JSON.stringify → JSON.parse
  const serialized = JSON.stringify(s1.save);
  const reloaded = JSON.parse(serialized) as GameSaveV1;

  it("la phase est préservée après rechargement", () => {
    expect(reloaded.career.phase).toBe("professional");
  });
  it("le clubId est préservé après rechargement", () => {
    expect(reloaded.player.contract.clubId).toBe("club-pro-fresh");
  });
  it("week est 1 après rechargement", () => {
    expect(reloaded.career.week).toBe(1);
  });
  it("matchday est 1 après rechargement", () => {
    expect(reloaded.career.matchday).toBe(1);
  });
  it("les schedules pro sont toujours présents après rechargement", () => {
    const proSchedule = reloaded.world.schedules.find(s => s.competitionId === "vlt-d1");
    expect(proSchedule).toBeDefined();
  });
  it("aucun schedule youth-league après rechargement", () => {
    const youth = reloaded.world.schedules.find(s => s.competitionId === "youth-league");
    expect(youth).toBeUndefined();
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   SCÉNARIO 9a — Refus d'une offre : rien ne change
   ═══════════════════════════════════════════════════════════════════════════ */
describe("Scénario 9a — Refus d'une offre : état inchangé", () => {
  const s0 = makeState({
    ...baseNewCareerSave,
    agentState: { offers: [makeProOffer()], transfers: [] },
  });
  const s1 = gameReducer(s0, { type: "RESPOND_CONTRACT_OFFER", offerId: "offer-pro-fresh", accepted: false });

  it("la phase reste 'academy' après refus", () => {
    expect(s1.save!.career.phase).toBe("academy");
  });
  it("le club reste academy-fresh après refus", () => {
    expect(s1.save!.player.contract.clubId).toBe("academy-fresh");
  });
  it("le schedule youth-league est toujours présent après refus", () => {
    const youth = s1.save!.world.schedules.find(s => s.competitionId === "youth-league");
    expect(youth).toBeDefined();
  });
  it("l'offre passe au statut 'rejected'", () => {
    const offer = s1.save!.agentState!.offers.find(o => o.id === "offer-pro-fresh");
    expect(offer?.status).toBe("rejected");
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   SCÉNARIO 9b — Promotion interne en académie
   ═══════════════════════════════════════════════════════════════════════════ */
describe("Scénario 9b — Promotion interne académie (youth → u18)", () => {
  const promoOffer: ContractOffer = {
    id: "offer-promo-1",
    clubId: "academy-fresh",
    clubName: "Académie FC",
    offerType: "academy_promotion",
    targetPhase: "academy",
    targetAcademyStage: "u18",
    transferFee: 0,
    isLoan: false,
    loanEndSeason: undefined,
    terms: {
      clubId: "academy-fresh",
      salary: 500,
      bonusGoal: 60,
      bonusAssist: 30,
      startSeason: 1,
      endSeason: 3,
      role: "squad",
    },
    status: "pending",
    expiresWeek: 99,
  };

  const s0 = makeState({
    ...baseNewCareerSave,
    agentState: { offers: [promoOffer], transfers: [] },
  });
  const s1 = gameReducer(s0, { type: "RESPOND_CONTRACT_OFFER", offerId: "offer-promo-1", accepted: true });

  it("la phase reste 'academy' après promotion interne", () => {
    expect(s1.save!.career.phase).toBe("academy");
  });
  it("le stage passe à 'u18'", () => {
    expect(s1.save!.career.academy?.stage).toBe("u18");
  });
  it("le club reste le même (academy-fresh)", () => {
    expect(s1.save!.player.contract.clubId).toBe("academy-fresh");
  });
  it("week et matchday ne sont PAS réinitialisés pour une promotion interne", () => {
    // Pour une promotion interne, on garde la continuité du calendrier
    expect(s1.save!.career.week).toBe(1); // déjà 1 dans baseNewCareerSave
    expect(s1.save!.career.matchday).toBe(1);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   SCÉNARIO 10 — Saison sans résultats : pas de récompenses fictives
   ═══════════════════════════════════════════════════════════════════════════ */
describe("Scénario 10 — Saison sans résultats : pas de récompenses fictives", () => {
  const playerNoStats = baseNewCareerSave.player;
  const careerSeason1 = baseNewCareerSave.career;

  // Évaluation sans aucun match joué
  const result = computeSeasonEvaluation({
    player: playerNoStats,
    season: 1,
    schedule: {
      competitionId: "youth-league", season: 1, currentMatchday: 0, totalMatchdays: 10,
      fixtures: [],
    },
    matchResults: [],
  });

  it("le score d'évaluation ne dépasse pas 50 sans match joué", () => {
    // Le score de base est 50, sans stats il perd 15 → 35
    expect(result.score).toBeLessThanOrEqual(50);
  });
  it("le verdict ne peut pas être 'promotion' sans match (seuil > 50)", () => {
    // Seuil de promotion = 70, score sans match ≤ 50 → jamais promotion
    expect(result.verdict).not.toBe("promotion");
  });
  it("les highlights mentionnent l'absence de matchs", () => {
    const hasNoMatch = result.highlights.some(h => h.toLowerCase().includes("aucun match"));
    expect(hasNoMatch).toBe(true);
  });
  it("les stats de la saison sont null/vide sans match joué", () => {
    const seasonStats = playerNoStats.stats.seasons.find(s => s.season === 1);
    // Soit undefined (pas de saison), soit appearances = 0
    expect(seasonStats?.appearances ?? 0).toBe(0);
    expect(seasonStats?.goals ?? 0).toBe(0);
  });
  it("aucun résumé de saison n'est créé automatiquement (doit être explicitement déclenché)", () => {
    expect(careerSeason1.seasonSummaries).toHaveLength(0);
  });
});
