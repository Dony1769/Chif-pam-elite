/**
 * FC CAREER — Club, académie, ligue
 */

export type Division = "Ligue 1" | "Ligue 2" | "National" | "Amateur";

export type CompetitionId =
  | "ligue1"
  | "ligue2"
  | "national"
  | "coupe-de-france"
  | "coupe-la-ligue"
  | "amical";


export interface ClubColors {
  primary: string; // hex
  secondary: string;
  accent: string;
}

export interface AcademyInfo {
  quality: number; // 0-100 (centre de formation)
  youthSlots: number; // joueurs U19 dispo par saison
  focus: "technical" | "physical" | "tactical" | "balanced";
}

export interface Club {
  id: string;
  name: string;
  shortName: string; // 3 lettres (PSG, OM, OL...)
  city: string;
  stadium: string;
  capacity: number;
  founded: number;
  division: Division;
  colors: ClubColors;
  reputation: number; // 0-100
  budget: number; // masse salariale annuelle dispo (€)
  prestige: number; // 0-100 (palmarès, historique)
  academy: AcademyInfo;
  coachName: string;
  preferredFormation: string; // id formation (constants/formations)
  isUserClub: boolean;
}

export interface LeagueStandingRow {
  clubId: string;
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  form: ("W" | "D" | "L")[]; // 5 derniers
}

export interface League {
  id: CompetitionId;
  name: string;
  country: string;
  divisions: Division[];
  clubs: Club[];
  standings: LeagueStandingRow[];
  relegationZones: { from: number; to: number }[];
  europeZones: { from: number; to: number }[];
}
