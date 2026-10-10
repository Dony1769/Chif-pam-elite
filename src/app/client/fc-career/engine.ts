import { ALL_51_ATTRIBUTES } from './constants';
import type {
  PlayerAttributes,
  CoachProfile,
  PlayerCareerState,
  TrainingFocus,
  AttributeCategory,
  Participation,
} from './types';

const clamp = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));

// ---------------------------------------------------------------
// CAP BIOMÉCANIQUE
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
// ÉVALUATION DU POSTE
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
// CHOIX DU COACH
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

  const points = player.skillPointsAvailable + 1;
  const note = focus === 'repos' ? 'Tu as bien récupéré.' : `Séance ${TRAINING_FOCUS[focus].label.toLowerCase()} : +1 pt.`;

  return {
    ...player,
    skillPointsAvailable: points,
    fatigue: clamp(player.fatigue + TRAINING_FOCUS[focus].fatigue),
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
  const role = evaluatePlayerRole(player.attributes, player.coach);
  const relationOk = player.coach.relation >= 30;

  if (role.isStarter && relationOk) return 'titulaire';
  const baseChance = 0.25 + player.coach.patienceRating * 0.05;
  const chance = relationOk ? baseChance : baseChance * 0.4;
  return Math.random() < chance ? 'remplacant' : 'tribune';
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
    age: 12,
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
    seasonStats: { matches: 0, wins: 0, draws: 0, losses: 0, goals: 0, assists: 0, ratingSum: 0, ratedMatches: 0 },
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
        body: "Tes parents t'ont accompagné. « Donne tout. »",
        read: false,
      },
      {
        id: 'init-0',
        from: 'coach',
        season: 1,
        week: 1,
        title: 'Bienvenue',
        body: 'Coach Rossi : « Travaille ton profil complet. »',
        read: false,
      },
    ],
  };
}
