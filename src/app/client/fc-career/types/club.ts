/**
 * FC CAREER — Club, académie, ligue — UNIVERS FICTIF 5 PAYS
 */

/** Les 5 pays fictifs du jeu. */
export type Country = "gallia" | "albion" | "castilla" | "germania" | "azzurria";

export const COUNTRIES: { id: Country; name: string; flag: string; inspired: string }[] = [
  { id: "gallia", name: "Gallia", flag: "🇫🇷", inspired: "France" },
  { id: "albion", name: "Albion", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", inspired: "Angleterre" },
  { id: "castilla", name: "Castilla", flag: "🇪🇸", inspired: "Espagne" },
  { id: "germania", name: "Germania", flag: "🇩🇪", inspired: "Allemagne" },
  { id: "azzurria", name: "Azzurria", flag: "🇮🇹", inspired: "Italie" },
];

export type Division =
  // Gallia
  | "elite-gallia" | "gallia-seconde" | "national-gallia"
  // Albion
  | "premier-albion" | "albion-championship" | "albion-league-one" | "albion-league-two"
  // Castilla
  | "primera-castilla" | "segunda-castilla"
  // Germania
  | "bundesliga" | "zweite-germania"
  // Azzurria
  | "serie-a-azzurria" | "serie-b-azzurria";

export const DIVISION_INFO: Record<Division, { name: string; shortName: string; country: Country; tier: number }> = {
  "elite-gallia":        { name: "Élite Gallia",            shortName: "EG",   country: "gallia",   tier: 1 },
  "gallia-seconde":      { name: "Gallia Seconde",          shortName: "GS",   country: "gallia",   tier: 2 },
  "national-gallia":     { name: "National Gallia",         shortName: "NG",   country: "gallia",   tier: 3 },
  "premier-albion":      { name: "Premier Albion",          shortName: "PA",   country: "albion",   tier: 1 },
  "albion-championship": { name: "Albion Championship",     shortName: "ACh",  country: "albion",   tier: 2 },
  "albion-league-one":   { name: "Albion League One",       shortName: "AL1",  country: "albion",   tier: 3 },
  "albion-league-two":   { name: "Albion League Two",       shortName: "AL2",  country: "albion",   tier: 4 },
  "primera-castilla":    { name: "Primera Castilla",        shortName: "PC",   country: "castilla", tier: 1 },
  "segunda-castilla":    { name: "Segunda Castilla",        shortName: "SC",   country: "castilla", tier: 2 },
  "bundesliga":          { name: "Bundesliga",              shortName: "BL",   country: "germania", tier: 1 },
  "zweite-germania":     { name: "Zweite Germania",         shortName: "ZG",   country: "germania", tier: 2 },
  "serie-a-azzurria":    { name: "Serie A Azzurria",        shortName: "SA",   country: "azzurria", tier: 1 },
  "serie-b-azzurria":    { name: "Serie B Azzurria",        shortName: "SB",   country: "azzurria", tier: 2 },
};

export type CompetitionId =
  // Championnats
  | "elite-gallia" | "gallia-seconde" | "national-gallia"
  | "premier-albion" | "albion-championship" | "albion-league-one" | "albion-league-two"
  | "primera-castilla" | "segunda-castilla"
  | "bundesliga" | "zweite-germania"
  | "serie-a-azzurria" | "serie-b-azzurria"
  // Coupes nationales
  | "coupe-gallia" | "supercoupe-gallia"
  | "fa-trophy" | "league-trophy" | "community-shield"
  | "copa-rey-castilla" | "supercopa-castilla"
  | "dfb-pokal" | "dfl-supercup"
  | "coppa-azzurria" | "supercoppa-azzurria"
  // Europe & Monde
  | "champions-europa" | "coupe-europa" | "conference-europa" | "supercoupe-europa"
  | "coupe-monde-clubs" | "coupe-monde-nations" | "championnat-europa-nations"
  // Amicaux
  | "amical";


export interface ClubColors {
  primary: string;
  secondary: string;
  accent: string;
}

export interface AcademyInfo {
  quality: number;
  youthSlots: number;
  focus: "technical" | "physical" | "tactical" | "balanced";
}

export interface Club {
  id: string;
  name: string;
  shortName: string;
  city: string;
  stadium: string;
  capacity: number;
  founded: number;
  country: Country;
  division: Division;
  colors: ClubColors;
  reputation: number;
  budget: number;
  prestige: number;
  academy: AcademyInfo;
  coachName: string;
  preferredFormation: string;
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
  form: ("W" | "D" | "L")[];
}

export interface League {
  id: CompetitionId;
  name: string;
  country: Country;
  divisions: Division[];
  clubs: Club[];
  standings: LeagueStandingRow[];
  relegationZones: { from: number; to: number }[];
  promotionZones: { from: number; to: number }[];
  playoffZones?: { from: number; to: number }[];
  europeZones: { from: number; to: number }[];
}

/** Helpers */
export function getDivisionsForCountry(country: Country): Division[] {
  return (Object.entries(DIVISION_INFO) as [Division, typeof DIVISION_INFO[Division]][])
    .filter(([, info]) => info.country === country)
    .sort((a, b) => a[1].tier - b[1].tier)
    .map(([div]) => div);
}

export function getDivisionTier(division: Division): number {
  return DIVISION_INFO[division].tier;
}

export function getDivisionCountry(division: Division): Country {
  return DIVISION_INFO[division].country;
}
