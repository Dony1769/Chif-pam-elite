export type AttributeCategory =
  | 'Attaque'
  | 'Technique & Passes'
  | 'Physique & Moteur'
  | 'Mental & Tactique'
  | 'Défense'
  | 'Gardien';


export interface AttributeDefinition {
  id: string;
  name: string;
  category: AttributeCategory;
  description: string;
}

export type PlayerAttributes = Record<string, number>;

export interface SponsorContract {
  id: string;
  sponsorName: string;
  objective: string;
  targetCount: number;
  currentCount: number;
  durationMatches: number;
  rewardSkillPoints: number;
  completed: boolean;
  failed: boolean;
}

export interface CoachProfile {
  id: string;
  name: string;
  preferredFormation: '4-3-3' | '4-2-3-1' | '3-5-2' | '4-4-2';
  tacticalStyle: 'Possession' | 'Contre-attaque' | 'Gegenpressing' | 'Bus';
  patienceRating: number;
  strictness: number;
  relation: number;
}

export interface PlayerReputation {
  niveau: number;
  image: number;
  moral: number;
  followers: number;
}

export type MessageSender = 'coach' | 'agent' | 'club' | 'sponsor' | 'presse' | 'famille' | 'systeme';

export interface GameMessage {
  id: string;
  from: MessageSender;
  season: number;
  week: number;
  title: string;
  body: string;
  read: boolean;
}

export type Participation = 'titulaire' | 'remplacant' | 'tribune';

export type TrainingFocus = 'technique' | 'physique' | 'mental' | 'tactique' | 'repos';

export interface SeasonStats {
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goals: number;
  assists: number;
  ratingSum: number;
  ratedMatches: number;
}

export interface WeekReport {
  season: number;
  week: number;
  opponentName: string;
  home: boolean;
  goalsFor: number;
  goalsAgainst: number;
  participation: Participation;
  rating: number | null;
  playerGoals: number;
  playerAssists: number;
  reputationDelta: number;
  newInjuryWeeks: number;
}

export interface GameEvent {
  id: string;
  from: MessageSender;
  title: string;
  body: string;
  choices: Array<{ id: string; label: string }>;
}

export interface PlayerCareerState {
  isUnlocked: boolean;
  playerName: string;
  age: number;
  season: number;
  week: number;
  heightCm: number;
  weightKg: number;
  skillPointsAvailable: number;
  attributes: PlayerAttributes;
  assignedPosition: string;
  isStarter: boolean;
  clubName: string;
  teamStrength: number;
  coach: CoachProfile;
  activeSponsors: SponsorContract[];
  matchHistoryCount: number;
  form: number;
  fatigue: number;
  injuryWeeks: number;
  trainedThisWeek: boolean;
  lastTrainingNote: string | null;
  reputation: PlayerReputation;
  inbox: GameMessage[];
  seasonStats: SeasonStats;
  careerStats: { matches: number; goals: number; assists: number };
  pendingEvent: GameEvent | null;
  lastWeek: WeekReport | null;
}
