import { ALL_51_ATTRIBUTES } from './constants';
import {
  PlayerAttributes,
  CoachProfile,
  PlayerCareerState,
  GameMessage,
  MessageSender,
  Participation,
  TrainingFocus,
  AttributeCategory,
  MatchResult,
  SeasonStats,
} from './types';
import {
  BALANCE,
  WEEKS_PER_SEASON,
  START_AGE,
  getAgeStage,
  getReachableClubTier,
  getClubTierName,
} from './rules';
import { MatchContext, simulateFullMatch, getFixture } from './match';
import { rollEvent } from './events';


const clamp = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));

// ---------------------------------------------------------------
// CALCUL DU CAP MAXIMUM (Biomécanique)
// ---------------------------------------------------------------
export function getAttributeCap(attrId: string, heightCm: number, weightKg: number): number {
  if (attrId === 'acceleration' || attrId === 'agilite') {
    if (weightKg > 85 || heightCm > 190) {
      const penalty = Math.floor((weightKg - 75) * 0.8 + (heightCm - 180) * 0.5);
      return Math.max(65, 99 - penalty);
    }
  }
  if (attrId === 'force' && weightKg < 70) {
    return Math.min(78, 55 + (weightKg - 50) * 1.1);
  }
  return 99;
}

// ---------------------------------------------------------------
// SYNERGIE DES ATTRIBUTS : valeur réelle d'un poste
// ---------------------------------------------------------------
export function calculatePositionRating(position: string, attrs: PlayerAttributes): number {
  const getVal = (id: string) => attrs[id] || 40;

  switch (position) {
    case 'BU': {
      const finition = getVal('finition');
      const placement = getVal('placement_offensif');
      const calme = getVal('calme');
      const puissance = getVal('puissance_tir');
      const reactivite = getVal('reactivite');
      return Math.round(finition * 0.3 + placement * 0.25 + calme * 0.2 + puissance * 0.15 + reactivite * 0.1);
    }
    case 'MOC': {
      const vista = getVal('vista');
      const passesC = getVal('passes_courtes');
      const controle = getVal('controle');
      const dribble = getVal('dribble');
      const tirsL = getVal('tirs_lointains');
      return Math.round(vista * 0.3 + passesC * 0.25 + controle * 0.2 + dribble * 0.15 + tirsL * 0.1);
    }
    case 'DC': {
      const tackle = getVal('tackle_debout');
      const marquage = getVal('marquage');
      const force = getVal('force');
      const placementDef = getVal('placement_defensif');
      const detente = getVal('detente');
      return Math.round(tackle * 0.25 + marquage * 0.25 + force * 0.2 + placementDef * 0.2 + detente * 0.1);
    }
    default:
      return 50;
  }
}

// ---------------------------------------------------------------
// CHOIX DU COACH POUR LE POSTE ET TITULARISATION
// ---------------------------------------------------------------
export function evaluatePlayerRole(
  attrs: PlayerAttributes,
  coach: CoachProfile
): { assignedPosition: string; isStarter: boolean; overallRating: number } {
  const buRating = calculatePositionRating('BU', attrs);
  const mocRating = calculatePositionRating('MOC', attrs);
  const dcRating = calculatePositionRating('DC', attrs);

  let bestPosition = 'BU';
  let bestScore = buRating;

  if (mocRating > bestScore) {
    bestPosition = 'MOC';
    bestScore = mocRating;
  }
  if (dcRating > bestScore) {
    bestPosition = 'DC';
    bestScore = dcRating;
  }

  return {
    assignedPosition: bestPosition,
    isStarter: bestScore >= coach.strictness,
    overallRating: bestScore,
  };
}

// Note globale effective : fatigue et forme influencent le niveau du jour
export function getEffectiveOvr(player: PlayerCareerState): number {
  const role = evaluatePlayerRole(player.attributes, player.coach);
  return role.overallRating - Math.max(0, player.fatigue - 60) * 0.2 + (player.form - 50) * 0.1;
}

export function buildMatchContext(player: PlayerCareerState): MatchContext {
  const role = evaluatePlayerRole(player.attributes, player.coach);
  return {
    position: role.assignedPosition,
    attrs: player.attributes,
    ovr: getEffectiveOvr(player),
    teamStrength: player.teamStrength,
  };
}

// ---------------------------------------------------------------
// ÉTAT INITIAL
// ---------------------------------------------------------------
const EMPTY_SEASON: SeasonStats = {
  matches: 0, wins: 0, draws: 0, losses: 0, goals: 0, assists: 0, ratingSum: 0, ratedMatches: 0,
};

export function createInitialPlayer(): PlayerCareerState {
  const initialAttrs: Record<string, number> = {};
  ALL_51_ATTRIBUTES.forEach((attr) => {
    initialAttrs[attr.id] = 50;
  });

  return {
    isUnlocked: true,
    playerName: 'Guillaume (Dony)',
    age: START_AGE,
    season: 1,
    week: 1,
    heightCm: 185,
    weightKg: 88,
    skillPointsAvailable: 15,
    attributes: initialAttrs,
    assignedPosition: 'Évaluation...',
    isStarter: false,
    clubName: 'FC Quartier',
    teamStrength: 50,
    coach: {
      id: 'c1',
      name: 'Coach Rossi',
      preferredFormation: '4-3-3',
      tacticalStyle: 'Gegenpressing',
      patienceRating: 7,
      strictness: 58,
      relation: 50,
    },
    activeSponsors: [],
    matchHistoryCount: 0,
    form: 50,
    fatigue: 10,
    injuryWeeks: 0,
    trainedThisWeek: false,
    lastTrainingNote: null,
    reputation: { niveau: 5, image: 50, moral: 60, followers: 0 },
    seasonStats: { ...EMPTY_SEASON },
    careerStats: { matches: 0, goals: 0, assists: 0 },
    pendingEvent: null,
    lastWeek: null,
    inbox: [
      {
        id: 'init-1',
        from: 'famille',
        season: 1,
        week: 1,
        title: 'Premier jour au club',
        body: "Tes parents t'ont accompagné à l'entraînement. « Donne tout, on est fiers de toi. »",
        read: false,
      },
      {
        id: 'init-0',
        from: 'coach',
        season: 1,
        week: 1,
        title: 'Bienvenue au club',
        body: 'Coach Rossi : « Si tu montes la Finition sans le Calme ni le Placement, tu ne seras pas aligné en Buteur. Travaille tout ton profil. »',
        read: false,
      },
    ],
  };
}

// ---------------------------------------------------------------
// ENTRAÎNEMENT
// ---------------------------------------------------------------
export const TRAINING_FOCUS: Record<
  TrainingFocus,
  { label: string; description: string; categories: AttributeCategory[]; fatigue: number }
> = {
  technique: {
    label: 'Technique',
    description: 'Dribbles, passes, finition',
    categories: ['Technique & Passes', 'Attaque'],
    fatigue: 10,
  },
  physique: {
    label: 'Physique',
    description: 'Vitesse, endurance, force',
    categories: ['Physique & Moteur'],
    fatigue: 18,
  },
  mental: {
    label: 'Mental',
    description: 'Calme, lecture du jeu, leadership',
    categories: ['Mental & Tactique'],
    fatigue: 6,
  },
  tactique: {
    label: 'Tactique',
    description: 'Défense et placement',
    categories: ['Défense', 'Mental & Tactique'],
    fatigue: 10,
  },
  repos: {
    label: 'Récupération',
    description: 'Réduit la fatigue, remonte le moral',
    categories: [],
    fatigue: -30,
  },
};

export function trainWeek(player: PlayerCareerState, focus: TrainingFocus): PlayerCareerState {
  if (player.trainedThisWeek || player.injuryWeeks > 0) return player;
  const cfg = TRAINING_FOCUS[focus];

  let attributes = player.attributes;
  let note = 'Tu as bien récupéré cette semaine.';
  let points = player.skillPointsAvailable;

  if (focus !== 'repos') {
    points += BALANCE.weeklyTrainingPoints;
    note = `Séance ${cfg.label.toLowerCase()} terminée : +${BALANCE.weeklyTrainingPoints} point à répartir.`;

    const pool = ALL_51_ATTRIBUTES.filter((a) => cfg.categories.includes(a.category));
    if (pool.length > 0 && Math.random() < 0.4) {
      const attr = pool[Math.floor(Math.random() * pool.length)];
      const cur = attributes[attr.id] || 50;
      if (cur < getAttributeCap(attr.id, player.heightCm, player.weightKg)) {
        attributes = { ...attributes, [attr.id]: cur + 1 };
        note += ` Progression : ${attr.name} +1.`;
      }
    }
  }

  return {
    ...player,
    attributes,
    skillPointsAvailable: points,
    fatigue: clamp(player.fatigue + cfg.fatigue),
    reputation: {
      ...player.reputation,
      moral: clamp(player.reputation.moral + (focus === 'repos' ? 2 : 0)),
    },
    trainedThisWeek: true,
    lastTrainingNote: note,
  };
}

// ---------------------------------------------------------------
// PARTICIPATION AU MATCH
// ---------------------------------------------------------------
export function rollParticipation(player: PlayerCareerState): Participation {
  if (player.injuryWeeks > 0) return 'tribune';
  const { coach } = player;
  const role = evaluatePlayerRole(player.attributes, coach);
  const relationOk = coach.relation >= BALANCE.minRelationToStart;

  if (role.isStarter && relationOk) return 'titulaire';

  const baseChance = 0.25 + coach.patienceRating * 0.05;
  const chance = relationOk ? baseChance : baseChance * 0.4;
  return Math.random() < chance ? 'remplacant' : 'tribune';
}

// ---------------------------------------------------------------
// FIN DE MATCH : applique le résultat à la carrière
// ---------------------------------------------------------------
type MessageDraft = { from: MessageSender; title: string; body: string };

const POSITION_FOCUS: Record<string, string> = {
  BU: 'Finition, Placement offensif et Calme',
  MOC: 'Vista, Passes courtes et Contrôle de balle',
  DC: 'Tacle debout, Marquage et Force physique',
};

export function completeMatch(player: PlayerCareerState, result: MatchResult): PlayerCareerState {
  const { coach } = player;
  const role = evaluatePlayerRole(player.attributes, coach);
  const wasInjured = player.injuryWeeks > 0;
  const played = result.participation !== 'tribune';
  const r = result.rating ?? 6;
  const win = result.goalsFor > result.goalsAgainst;
  const draw = result.goalsFor === result.goalsAgainst;
  const drafts: MessageDraft[] = [];

  // 1. Statistiques
  const ss = player.seasonStats;
  const seasonStats: SeasonStats = {
    matches: ss.matches + (played ? 1 : 0),
    wins: ss.wins + (win ? 1 : 0),
    draws: ss.draws + (draw ? 1 : 0),
    losses: ss.losses + (!win && !draw ? 1 : 0),
    goals: ss.goals + result.playerGoals,
    assists: ss.assists + result.playerAssists,
    ratingSum: ss.ratingSum + (result.rating ?? 0),
    ratedMatches: ss.ratedMatches + (result.rating !== null ? 1 : 0),
  };
  const careerStats = {
    matches: player.careerStats.matches + (played ? 1 : 0),
    goals: player.careerStats.goals + result.playerGoals,
    assists: player.careerStats.assists + result.playerAssists,
  };

  // 2. Réputation
  let reputationDelta = -0.1;
  if (played) {
    const base = Math.max(-0.3, (r - 6.0) * 0.35);
    const bonus = result.playerGoals * 0.3 + result.playerAssists * 0.2 + (win ? 0.1 : 0);
    reputationDelta =
      result.participation === 'titulaire' ? base + 0.1 + bonus : (base + 0.03 + bonus) * 0.6;
  }
  const newNiveau = clamp(player.reputation.niveau + reputationDelta);

  // 3. Abonnés
  const factor = result.participation === 'titulaire' ? 1.5 : result.participation === 'remplacant' ? 0.7 : 0.3;
  const followersGain =
    Math.round((newNiveau / 100) ** 2 * 400 * factor) + result.playerGoals * 150 + result.playerAssists * 60;

  // 4. Moral, image, relation, forme, fatigue
  let moralDelta: number;
  if (!played) moralDelta = wasInjured ? -1 : -3;
  else moralDelta = (r >= 6.5 ? 2 : r < 5.5 ? -2 : 0) + (win ? 1 : 0);
  const newMoral = clamp(player.reputation.moral + moralDelta);

  let imageDelta = newMoral >= 50 ? 0.05 : -0.1;
  if (result.sentOff) imageDelta -= 4;
  const newImage = clamp(player.reputation.image + imageDelta);

  let relationDelta: number;
  if (!played) relationDelta = wasInjured ? 0 : -0.5;
  else relationDelta = r >= 7 ? 1.5 : r >= 6.3 ? 0.5 : r < 5.5 ? -1 : 0;
  if (result.sentOff) relationDelta -= 3;
  const newRelation = clamp(coach.relation + relationDelta);

  let newForm = player.form;
  if (played) newForm = clamp(newForm + (r - 6) * 8);
  newForm = clamp(newForm * 0.9 + 5);

  let fatigue = player.fatigue;
  if (wasInjured) fatigue -= 15;
  else if (played) fatigue += result.participation === 'titulaire' ? 12 : 6;
  else fatigue -= 10;
  fatigue = clamp(fatigue);

  // 5. Blessures
  let injuryWeeks = wasInjured ? Math.max(0, player.injuryWeeks - 1) : 0;
  let newInjuryWeeks = 0;
  if (played && !wasInjured) {
    const resilience = player.attributes['resilience'] ?? 50;
    const p = Math.max(0.004, (0.012 + (player.fatigue > 70 ? 0.02 : 0)) * (1 + (50 - resilience) / 100));
    if (Math.random() < p) {
      newInjuryWeeks = 1 + Math.floor(Math.random() * 5);
      injuryWeeks = newInjuryWeeks;
      drafts.push({
        from: 'systeme',
        title: 'Blessure',
        body: `Tu t'es blessé pendant le match contre ${result.fixture.opponentName}. Indisponible environ ${newInjuryWeeks} semaine${newInjuryWeeks > 1 ? 's' : ''}.`,
      });
    }
  }
  if (wasInjured && injuryWeeks === 0) {
    drafts.push({ from: 'systeme', title: 'Retour à l\'entraînement', body: 'Tu es rétabli et de nouveau disponible.' });
  }

  // 6. Points d'attributs (bonus mensuel de moral)
  let skillPoints = player.skillPointsAvailable;
  if (player.week % 4 === 0 && newMoral >= BALANCE.moodBonusThreshold) {
    skillPoints += BALANCE.moodBonusPoints;
  }

  // 7. Objectifs sponsors
  const activeSponsors = player.activeSponsors.map((sp) => {
    if (!played || sp.completed || sp.failed) return sp;
    const nextCount = sp.currentCount + 1;
    const isDone = nextCount >= sp.targetCount;
    if (isDone) skillPoints += sp.rewardSkillPoints;
    return { ...sp, currentCount: nextCount, completed: isDone };
  });

  // 8. Messages
  if (result.sentOff) {
    drafts.push({
      from: 'coach',
      title: 'Carton rouge',
      body: `${coach.name} : « Ton expulsion a coûté cher à l'équipe. Je veux plus de discipline. »`,
    });
  }
  if (played && (result.playerGoals >= 2 || r >= 8.5)) {
    drafts.push({
      from: 'presse',
      title: 'Performance remarquée',
      body: `La presse locale salue ta prestation contre ${result.fixture.opponentName} (note ${r.toFixed(1)}${result.playerGoals > 0 ? `, ${result.playerGoals} but${result.playerGoals > 1 ? 's' : ''}` : ''}).`,
    });
  }

  const prevTier = getReachableClubTier(player.age, player.reputation.niveau);
  const newTier = getReachableClubTier(player.age, newNiveau);
  if (newTier > prevTier) {
    drafts.push({
      from: 'club',
      title: 'Un recruteur a noté ton nom',
      body: `Tes performances attirent l'attention. Tu es désormais sur le radar de clubs de niveau « ${getClubTierName(newTier)} ».`,
    });
  }

  if (coach.relation >= 40 && newRelation < 40) {
    drafts.push({
      from: 'coach',
      title: 'On doit parler',
      body: `${coach.name} : « Ton attitude et tes dernières prestations me posent problème. Si ça continue, tu perds ta place. »`,
    });
  }

  if (player.week % BALANCE.coachReportEveryWeeks === 0) {
    const focus = POSITION_FOCUS[role.assignedPosition] ?? 'tes fondamentaux';
    const avg = seasonStats.ratedMatches > 0 ? (seasonStats.ratingSum / seasonStats.ratedMatches).toFixed(1) : '-';
    let body: string;
    if (role.isStarter && newRelation < BALANCE.minRelationToStart) {
      body = `${coach.name} : « Tu as le niveau (${role.overallRating}), mais notre relation est trop tendue. Je ne peux pas te titulariser pour l'instant. »`;
    } else if (role.isStarter) {
      body = `${coach.name} : « Tu es aligné au poste de ${role.assignedPosition} (note ${role.overallRating}, moyenne ${avg} sur la saison). Continue comme ça. »`;
    } else {
      const gap = coach.strictness - role.overallRating;
      body = `${coach.name} : « Ton meilleur poste est ${role.assignedPosition} (note ${role.overallRating}). Il te manque ${gap} point${gap > 1 ? 's' : ''} pour être titulaire. Travaille : ${focus}. »`;
    }
    drafts.push({ from: 'coach', title: 'Rapport mensuel', body });
  }

  // 9. Calendrier / fin de saison
  let age = player.age;
  let season = player.season;
  let week = player.week + 1;
  let nextSeasonStats = seasonStats;

  if (week > WEEKS_PER_SEASON) {
    week = 1;
    season += 1;
    age += 1;
    skillPoints += BALANCE.seasonEndPoints;

    const avg = seasonStats.ratedMatches > 0 ? (seasonStats.ratingSum / seasonStats.ratedMatches).toFixed(1) : '-';
    const pts = seasonStats.wins * 3 + seasonStats.draws;
    drafts.push({
      from: 'systeme',
      title: `Bilan de la saison ${player.season}`,
      body: `${seasonStats.matches} match(s) joués, ${seasonStats.goals} but(s), ${seasonStats.assists} passe(s) décisive(s), note moyenne ${avg}. Équipe : ${seasonStats.wins}V ${seasonStats.draws}N ${seasonStats.losses}D (${pts} pts). Tu as maintenant ${age} ans. +${BALANCE.seasonEndPoints} points d'attributs.`,
    });

    const oldStage = getAgeStage(player.age);
    const newStage = getAgeStage(age);
    if (newStage.id !== oldStage.id) {
      drafts.push({ from: 'systeme', title: `Nouveau palier : ${newStage.title}`, body: newStage.description });
    }
    nextSeasonStats = { ...EMPTY_SEASON };
  }

  const newMessages: GameMessage[] = drafts.map((d, i) => ({
    id: `m-${player.season}-${player.week}-${i}`,
    from: d.from,
    season: player.season,
    week: player.week,
    title: d.title,
    body: d.body,
    read: false,
  }));
  const inbox = [...newMessages.reverse(), ...player.inbox].slice(0, BALANCE.inboxMaxSize);

  const next: PlayerCareerState = {
    ...player,
    age,
    season,
    week,
    skillPointsAvailable: skillPoints,
    assignedPosition: role.assignedPosition,
    isStarter: role.isStarter && newRelation >= BALANCE.minRelationToStart,
    activeSponsors,
    matchHistoryCount: player.matchHistoryCount + (played ? 1 : 0),
    form: newForm,
    fatigue,
    injuryWeeks,
    trainedThisWeek: false,
    lastTrainingNote: null,
    coach: { ...coach, relation: newRelation },
    reputation: {
      niveau: newNiveau,
      image: newImage,
      moral: newMoral,
      followers: player.reputation.followers + followersGain,
    },
    seasonStats: nextSeasonStats,
    careerStats,
    inbox,
    lastWeek: {
      season: player.season,
      week: player.week,
      opponentName: result.fixture.opponentName,
      home: result.fixture.home,
      goalsFor: result.goalsFor,
      goalsAgainst: result.goalsAgainst,
      participation: result.participation,
      rating: result.rating,
      playerGoals: result.playerGoals,
      playerAssists: result.playerAssists,
      reputationDelta,
      newInjuryWeeks,
    },
  };

  return { ...next, pendingEvent: rollEvent(next) };
}

// ---------------------------------------------------------------
// SEMAINE DE RÉÉDUCATION (joueur blessé : le match est joué sans lui)
// ---------------------------------------------------------------
export function restWeek(player: PlayerCareerState): PlayerCareerState {
  const fixture = getFixture(player.season, player.week, player.teamStrength);
  const result = simulateFullMatch(buildMatchContext(player), fixture, 'tribune');
  return completeMatch(player, result);
}
