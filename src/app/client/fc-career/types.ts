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
  patienceRating: number; // 1-10 (Seuil de licenciement par le directeur)
  strictness: number; // Exigence pour la titularisation
}

export interface PlayerCareerState {
  isUnlocked: boolean;
  playerName: string;
  age: number; // Début à 12 (U12)
  season: number;
  heightCm: number;
  weightKg: number;
  skillPointsAvailable: number;
  attributes: PlayerAttributes;
  assignedPosition: string; // Ex: 'BU', 'MOC', 'Remplaçant', 'Réserviste'
  isStarter: boolean;
  clubName: string;
  coach: CoachProfile;
  activeSponsors: SponsorContract[];
  matchHistoryCount: number;
}
