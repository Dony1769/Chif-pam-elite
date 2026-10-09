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

// Jauges de visibilité du joueur
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

export interface WeekReport {
  participation: Participation;
  matchRating: number | null;
  reputationDelta: number;
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
  assignedPosition: string; // Ex: 'BU', 'MOC', 'DC'
  isStarter: boolean;
  clubName: string;
  coach: CoachProfile;
  activeSponsors: SponsorContract[];
  matchHistoryCount: number;
  form: number; // 0-100, forme du moment
  reputation: PlayerReputation;
  inbox: GameMessage[]; // le plus récent en premier
  lastWeek: WeekReport | null;
}
