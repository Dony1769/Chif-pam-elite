import { ALL_51_ATTRIBUTES } from './constants';
import {
  PlayerAttributes,
  CoachProfile,
  PlayerCareerState,
  GameMessage,
  MessageSender,
  Participation,
} from './types';
import {
  BALANCE,
  WEEKS_PER_SEASON,
  START_AGE,
  getAgeStage,
  getReachableClubTier,
  getClubTierName,
} from './rules';


const clamp = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));

// ---------------------------------------------------------------
// CALCUL DU CAP MAXIMUM (Biomécanique)
// ---------------------------------------------------------------
export function getAttributeCap(attrId: string, heightCm: number, weightKg: number): number {
  // Les joueurs lourds ou très grands subissent des limites d'accélération et agilité
  if (attrId === 'acceleration' || attrId === 'agilite') {
    if (weightKg > 85 || heightCm > 190) {
      const penalty = Math.floor((weightKg - 75) * 0.8 + (heightCm - 180) * 0.5);
      return Math.max(65, 99 - penalty);
    }
  }
  // Les joueurs plus légers subissent une limite de Force pure
  if (attrId === 'force' && weightKg < 70) {
    return Math.min(78, 55 + (weightKg - 50) * 1.1);
  }
  return 99; // Cap par défaut
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
      const rating = finition * 0.3 + placement * 0.25 + calme * 0.2 + puissance * 0.15 + reactivite * 0.1;
      return Math.round(rating);
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

  const isStarter = bestScore >= coach.strictness;

  return {
    assignedPosition: bestPosition,
    isStarter,
    overallRating: bestScore,
  };
}

// ---------------------------------------------------------------
// ÉTAT INITIAL
// ---------------------------------------------------------------
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
    reputation: { niveau: 5, image: 50, moral: 60, followers: 0 },
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
// BOUCLE HEBDOMADAIRE
// ---------------------------------------------------------------
type MessageDraft = {
  from: MessageSender;
  title: string;
  body: string;
};

const POSITION_FOCUS: Record<string, string> = {
  BU: 'Finition, Placement offensif et Calme',
  MOC: 'Vista, Passes courtes et Contrôle de balle',
  DC: 'Tacle debout, Marquage et Force physique',
};

export function advanceWeek(player: PlayerCareerState): PlayerCareerState {
  const { coach } = player;
  const role = evaluatePlayerRole(player.attributes, coach);
  const relationOk = coach.relation >= BALANCE.minRelationToStart;
  const startsMatch = role.isStarter && relationOk;
  const drafts: MessageDraft[] = [];

  // 1. Participation au match
  let participation: Participation = 'tribune';
  if (startsMatch) {
    participation = 'titulaire';
  } else {
    const baseChance = 0.25 + coach.patienceRating * 0.05;
    const chance = relationOk ? baseChance : baseChance * 0.4;
    if (Math.random() < chance) participation = 'remplacant';
  }
  const played = participation !== 'tribune';

  // 2. Note du match
  const matchRating = played
    ? Math.round(clamp(role.overallRating + (player.form - 50) * 0.2 + (Math.random() * 12 - 6), 1, 99))
    : null;

  // 3. Réputation
  let reputationDelta = -0.1;
  if (played && matchRating !== null) {
    const base = Math.max(-0.3, (matchRating - 55) * 0.04);
    reputationDelta = participation === 'titulaire' ? base + 0.15 : (base + 0.05) * 0.6;
  }
  const newNiveau = clamp(player.reputation.niveau + reputationDelta);

  // 4. Abonnés
  const followersFactor = participation === 'titulaire' ? 1.5 : participation === 'remplacant' ? 0.7 : 0.3;
  const followersGain = Math.round((newNiveau / 100) ** 2 * 400 * followersFactor);

  // 5. Moral, image, relation avec le coach, forme
  let moralDelta = -3;
  if (played && matchRating !== null) {
    moralDelta = matchRating >= coach.strictness ? 2 : -1;
  }
  const newMoral = clamp(player.reputation.moral + moralDelta);
  const newImage = clamp(player.reputation.image + (newMoral >= 50 ? 0.05 : -0.1));

  let relationDelta = -0.5;
  if (played && matchRating !== null) {
    relationDelta = matchRating >= coach.strictness + 5 ? 1.5 : matchRating >= coach.strictness ? 0.5 : -1;
  }
  const newRelation = clamp(coach.relation + relationDelta);

  let newForm = player.form;
  if (played && matchRating !== null) newForm = clamp(newForm + (matchRating - 60) * 0.3);
  newForm = clamp(newForm * 0.9 + 5);

  // 6. Points d'attributs
  let skillPoints = player.skillPointsAvailable + BALANCE.weeklyTrainingPoints;
  if (player.week % 4 === 0 && newMoral >= BALANCE.moodBonusThreshold) {
    skillPoints += BALANCE.moodBonusPoints;
  }

  // 7. Objectifs sponsors (si présents)
  const updatedSponsors = player.activeSponsors.map((sp) => {
    if (!played || sp.completed || sp.failed) return sp;
    const nextCount = sp.currentCount + 1;
    const isDone = nextCount >= sp.targetCount;
    if (isDone) skillPoints += sp.rewardSkillPoints;
    return { ...sp, currentCount: nextCount, completed: isDone };
  });

  // 8. Messages : paliers de repérage
  const prevTier = getReachableClubTier(player.age, player.reputation.niveau);
  const newTier = getReachableClubTier(player.age, newNiveau);
  if (newTier > prevTier) {
    drafts.push({
      from: 'club',
      title: 'Un recruteur a noté ton nom',
      body: `Tes performances attirent l'attention. Tu es désormais sur le radar de clubs de niveau « ${getClubTierName(newTier)} ».`,
    });
  }

  // 9. Messages : alerte relation coach
  if (coach.relation >= 40 && newRelation < 40) {
    drafts.push({
      from: 'coach',
      title: 'On doit parler',
      body: `${coach.name} : « Ton attitude et tes dernières prestations me posent problème. Si ça continue, tu perds ta place. »`,
    });
  }

  // 10. Message : rapport mensuel du coach
  if (player.week % BALANCE.coachReportEveryWeeks === 0) {
    const focus = POSITION_FOCUS[role.assignedPosition] ?? 'tes fondamentaux';
    let body: string;
    if (role.isStarter && !relationOk) {
      body = `${coach.name} : « Tu as la note pour jouer (${role.overallRating}), mais notre relation est trop tendue. Je ne peux pas te titulariser pour l'instant. »`;
    } else if (role.isStarter) {
      body = `${coach.name} : « Tu es aligné au poste de ${role.assignedPosition} avec une note de ${role.overallRating}. Continue comme ça. »`;
    } else {
      const gap = coach.strictness - role.overallRating;
      body = `${coach.name} : « Ton meilleur poste est ${role.assignedPosition} (note ${role.overallRating}). Il te manque ${gap} point${gap > 1 ? 's' : ''} pour être titulaire. Travaille : ${focus}. »`;
    }
    drafts.push({ from: 'coach', title: 'Rapport mensuel', body });
  }

  // 11. Avancement du calendrier / fin de saison
  let age = player.age;
  let season = player.season;
  let week = player.week + 1;

  if (week > WEEKS_PER_SEASON) {
    week = 1;
    season += 1;
    age += 1;
    skillPoints += BALANCE.seasonEndPoints;

    drafts.push({
      from: 'systeme',
      title: `Fin de saison ${player.season}`,
      body: `Tu as joué ${player.matchHistoryCount + (played ? 1 : 0)} match(s) au total. Tu as maintenant ${age} ans. +${BALANCE.seasonEndPoints} points d'attributs de fin de saison.`,
    });

    const oldStage = getAgeStage(player.age);
    const newStage = getAgeStage(age);
    if (newStage.id !== oldStage.id) {
      drafts.push({
        from: 'systeme',
        title: `Nouveau palier : ${newStage.title}`,
        body: newStage.description,
      });
    }
  }

  // 12. Construction des messages (le plus récent en premier)
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

  return {
    ...player,
    age,
    season,
    week,
    skillPointsAvailable: skillPoints,
    assignedPosition: role.assignedPosition,
    isStarter: startsMatch,
    activeSponsors: updatedSponsors,
    matchHistoryCount: player.matchHistoryCount + (played ? 1 : 0),
    form: newForm,
    coach: { ...coach, relation: newRelation },
    reputation: {
      niveau: newNiveau,
      image: newImage,
      moral: newMoral,
      followers: player.reputation.followers + followersGain,
    },
    inbox,
    lastWeek: { participation, matchRating, reputationDelta },
  };
}
