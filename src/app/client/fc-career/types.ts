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
  baseCapFormula?: (heightCm: number, weightKg: number) => number;
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
  patienceRating: number; // 1-10 : plus c'est haut, plus il donne de minutes aux remplaçants
  strictness: number; // Exigence de note globale pour la titularisation
  relation: number; // 0-100 : relation joueur/coach (< 30 = perte de place)
}

export interface PlayerReputation {
  niveau: number; // 0-100 : réputation sportive
  image: number; // 0-100 : comportement, discipline, scandales
  moral: number; // 0-100
  followers: number; // abonnés réseaux sociaux
}

export type AgentAccess = 'none' | 'parents' | 'direct';

export type MessageSender =
  | 'coach'
  | 'agent'
  | 'club'
  | 'sponsor'
  | 'presse'
  | 'famille'
  | 'systeme';

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

// ---------------------------------------------------------------
// MATCH
// ---------------------------------------------------------------
export interface Fixture {
  week: number;
  opponentName: string;
  opponentStrength: number;
  home: boolean;
}

export type MatchEventType =
  | 'coup_envoi'
  | 'entree'
  | 'occasion'
  | 'moment'
  | 'but'
  | 'but_encaisse'
  | 'carton'
  | 'mi_temps'
  | 'fin';

export interface MatchEvent {
  minute: number;
  type: MatchEventType;
  text: string;
}

export interface MomentEffect {
  text: string;
  altText?: string; // texte utilisé si le but n'a finalement pas lieu (chanceGoal)
  rating: number; // impact sur la note du match
  ourGoal?: boolean;
  theirGoal?: boolean;
  playerGoal?: boolean;
  playerAssist?: boolean;
  card?: boolean;
  chanceGoal?: number; // probabilité que le but ait réellement lieu
}

export interface MomentOption {
  id: string;
  label: string;
  p: number; // probabilité de réussite
  success: MomentEffect;
  fail: MomentEffect;
}

export interface KeyMoment {
  minute: number;
  title: string;
  prompt: string;
  options: MomentOption[];
}

export interface MatchState {
  fixture: Fixture;
  participation: Participation;
  position: string;
  minute: number;
  enterMinute: number; // 0 = titulaire, 55-70 = remplaçant, 999 = tribune
  sentOffMinute: number | null;
  goalsFor: number;
  goalsAgainst: number;
  playerGoals: number;
  playerAssists: number;
  yellowCards: number;
  rating: number; // note en cours, échelle sur 10
  momentsCount: number;
  lastMomentMinute: number;
  events: MatchEvent[];
  pendingMoment: KeyMoment | null;
  finished: boolean;
}

export interface MatchResult {
  fixture: Fixture;
  participation: Participation;
  position: string;
  goalsFor: number;
  goalsAgainst: number;
  playerGoals: number;
  playerAssists: number;
  rating: number | null; // null si tribune
  minutesPlayed: number;
  sentOff: boolean;
  events: MatchEvent[];
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

export interface SeasonStats {
  matches: number; // matchs joués par le joueur
  wins: number;
  draws: number;
  losses: number;
  goals: number;
  assists: number;
  ratingSum: number;
  ratedMatches: number;
}

// ---------------------------------------------------------------
// ÉVÉNEMENTS DE VIE
// ---------------------------------------------------------------
export interface EventChoice {
  id: string;
  label: string;
}

export interface GameEvent {
  id: string;
  from: MessageSender;
  title: string;
  body: string;
  choices: EventChoice[];
}

export interface PlayerCareerState {
  isUnlocked: boolean;
  playerName: string;
  age: number; // Début à 12 (U12)
  season: number;
  week: number; // 1 à 38
  heightCm: number;
  weightKg: number;
  skillPointsAvailable: number;
  attributes: PlayerAttributes;
  assignedPosition: string; // 'BU', 'MOC', 'DC'
  isStarter: boolean;
  clubName: string;
  teamStrength: number; // niveau de ton équipe (30-90)
  coach: CoachProfile;
  activeSponsors: SponsorContract[];
  matchHistoryCount: number;
  form: number; // 0-100
  fatigue: number; // 0-100
  injuryWeeks: number; // semaines de blessure restantes
  trainedThisWeek: boolean;
  lastTrainingNote: string | null;
  reputation: PlayerReputation;
  inbox: GameMessage[]; // le plus récent en premier
  seasonStats: SeasonStats;
  careerStats: { matches: number; goals: number; assists: number };
  pendingEvent: GameEvent | null;
  lastWeek: WeekReport | null;
}
