/**
 * FC CAREER — Compétitions : 5 pays + Europe + Monde
 */

import type { CompetitionId, Division, Country } from "../types/club";

export interface CompetitionDef {
  id: CompetitionId;
  name: string;
  shortName: string;
  country: Country | "europa" | "world";
  type: "league" | "cup" | "supercup" | "friendly";
  division: Division | "all";
  totalMatchdays: number; // 0 pour coupes
  trophyIcon: string;
  prestige: number;
  bonuses: { win: number; draw: number; goal: number };
}

export const COMPETITIONS: CompetitionDef[] = [
  // ─── GALLIA ───
  { id: "elite-gallia",     name: "Élite Gallia",             shortName: "EG",  country: "gallia",  type: "league",  division: "elite-gallia",     totalMatchdays: 34, trophyIcon: "🏆", prestige: 85, bonuses: { win: 15000, draw: 6000, goal: 8000 } },
  { id: "gallia-seconde",   name: "Gallia Seconde",           shortName: "GS",  country: "gallia",  type: "league",  division: "gallia-seconde",   totalMatchdays: 34, trophyIcon: "🥈", prestige: 60, bonuses: { win: 5000, draw: 2000, goal: 2500 } },
  { id: "national-gallia",  name: "National Gallia",          shortName: "NG",  country: "gallia",  type: "league",  division: "national-gallia",  totalMatchdays: 34, trophyIcon: "🥉", prestige: 40, bonuses: { win: 1500, draw: 600, goal: 700 } },
  { id: "coupe-gallia",     name: "Coupe de Gallia",          shortName: "CG",  country: "gallia",  type: "cup",     division: "all",              totalMatchdays: 0,  trophyIcon: "🎖️", prestige: 70, bonuses: { win: 10000, draw: 0, goal: 5000 } },
  { id: "supercoupe-gallia",name: "Supercoupe de Gallia",     shortName: "SG",  country: "gallia",  type: "supercup",division: "all",              totalMatchdays: 0,  trophyIcon: "⭐", prestige: 55, bonuses: { win: 8000, draw: 0, goal: 4000 } },

  // ─── ALBION ───
  { id: "premier-albion",      name: "Premier Albion",           shortName: "PA",  country: "albion",  type: "league",  division: "premier-albion",      totalMatchdays: 38, trophyIcon: "🏆", prestige: 95, bonuses: { win: 25000, draw: 10000, goal: 12000 } },
  { id: "albion-championship", name: "Albion Championship",      shortName: "ACh", country: "albion",  type: "league",  division: "albion-championship", totalMatchdays: 46, trophyIcon: "🥈", prestige: 65, bonuses: { win: 8000, draw: 3000, goal: 4000 } },
  { id: "albion-league-one",   name: "Albion League One",        shortName: "AL1", country: "albion",  type: "league",  division: "albion-league-one",   totalMatchdays: 46, trophyIcon: "🥉", prestige: 45, bonuses: { win: 3000, draw: 1200, goal: 1500 } },
  { id: "albion-league-two",   name: "Albion League Two",        shortName: "AL2", country: "albion",  type: "league",  division: "albion-league-two",   totalMatchdays: 46, trophyIcon: "🏅", prestige: 30, bonuses: { win: 1500, draw: 600, goal: 800 } },
  { id: "fa-trophy",           name: "FA Trophy",                shortName: "FAT", country: "albion",  type: "cup",     division: "all",                 totalMatchdays: 0,  trophyIcon: "🎖️", prestige: 80, bonuses: { win: 15000, draw: 0, goal: 8000 } },
  { id: "league-trophy",       name: "League Trophy",            shortName: "LT",  country: "albion",  type: "cup",     division: "all",                 totalMatchdays: 0,  trophyIcon: "🏅", prestige: 50, bonuses: { win: 6000, draw: 0, goal: 3000 } },
  { id: "community-shield",    name: "Community Shield",         shortName: "CS",  country: "albion",  type: "supercup",division: "all",                 totalMatchdays: 0,  trophyIcon: "⭐", prestige: 60, bonuses: { win: 10000, draw: 0, goal: 5000 } },

  // ─── CASTILLA ───
  { id: "primera-castilla",  name: "Primera Castilla",         shortName: "PC",  country: "castilla", type: "league",  division: "primera-castilla",  totalMatchdays: 38, trophyIcon: "🏆", prestige: 92, bonuses: { win: 22000, draw: 9000, goal: 10000 } },
  { id: "segunda-castilla",  name: "Segunda Castilla",         shortName: "SC",  country: "castilla", type: "league",  division: "segunda-castilla",  totalMatchdays: 42, trophyIcon: "🥈", prestige: 58, bonuses: { win: 5000, draw: 2000, goal: 2500 } },
  { id: "copa-rey-castilla", name: "Copa del Rey de Castilla", shortName: "CDR", country: "castilla", type: "cup",     division: "all",               totalMatchdays: 0,  trophyIcon: "🎖️", prestige: 75, bonuses: { win: 12000, draw: 0, goal: 6000 } },
  { id: "supercopa-castilla",name: "Supercopa de Castilla",    shortName: "SUP", country: "castilla", type: "supercup",division: "all",               totalMatchdays: 0,  trophyIcon: "⭐", prestige: 60, bonuses: { win: 10000, draw: 0, goal: 5000 } },

  // ─── GERMANIA ───
  { id: "bundesliga",       name: "Bundesliga",                shortName: "BL",  country: "germania", type: "league",  division: "bundesliga",       totalMatchdays: 34, trophyIcon: "🏆", prestige: 90, bonuses: { win: 20000, draw: 8000, goal: 10000 } },
  { id: "zweite-germania",  name: "Zweite Germania",           shortName: "ZG",  country: "germania", type: "league",  division: "zweite-germania",  totalMatchdays: 34, trophyIcon: "🥈", prestige: 55, bonuses: { win: 5000, draw: 2000, goal: 2500 } },
  { id: "dfb-pokal",        name: "DFB-Pokal Germania",        shortName: "DFB", country: "germania", type: "cup",     division: "all",              totalMatchdays: 0,  trophyIcon: "🎖️", prestige: 72, bonuses: { win: 12000, draw: 0, goal: 6000 } },
  { id: "dfl-supercup",     name: "DFL-Supercup",              shortName: "DFL", country: "germania", type: "supercup",division: "all",              totalMatchdays: 0,  trophyIcon: "⭐", prestige: 50, bonuses: { win: 8000, draw: 0, goal: 4000 } },

  // ─── AZZURRIA ───
  { id: "serie-a-azzurria",    name: "Serie A Azzurria",         shortName: "SA",  country: "azzurria", type: "league",  division: "serie-a-azzurria",    totalMatchdays: 38, trophyIcon: "🏆", prestige: 88, bonuses: { win: 18000, draw: 7000, goal: 9000 } },
  { id: "serie-b-azzurria",    name: "Serie B Azzurria",         shortName: "SB",  country: "azzurria", type: "league",  division: "serie-b-azzurria",    totalMatchdays: 38, trophyIcon: "🥈", prestige: 52, bonuses: { win: 4500, draw: 1800, goal: 2200 } },
  { id: "coppa-azzurria",      name: "Coppa d'Azzurria",         shortName: "CDA", country: "azzurria", type: "cup",     division: "all",                 totalMatchdays: 0,  trophyIcon: "🎖️", prestige: 70, bonuses: { win: 10000, draw: 0, goal: 5000 } },
  { id: "supercoppa-azzurria", name: "Supercoppa d'Azzurria",    shortName: "SCA", country: "azzurria", type: "supercup",division: "all",                 totalMatchdays: 0,  trophyIcon: "⭐", prestige: 55, bonuses: { win: 8000, draw: 0, goal: 4000 } },

  // ─── EUROPA ───
  { id: "champions-europa",          name: "Coupe des Champions d'Europa",  shortName: "CCE", country: "europa", type: "cup", division: "all", totalMatchdays: 0, trophyIcon: "🌟", prestige: 100, bonuses: { win: 50000, draw: 20000, goal: 25000 } },
  { id: "coupe-europa",              name: "Coupe d'Europa",                shortName: "CE",  country: "europa", type: "cup", division: "all", totalMatchdays: 0, trophyIcon: "⚡", prestige: 80,  bonuses: { win: 25000, draw: 10000, goal: 12000 } },
  { id: "conference-europa",         name: "Conference d'Europa",           shortName: "CFE", country: "europa", type: "cup", division: "all", totalMatchdays: 0, trophyIcon: "💚", prestige: 65,  bonuses: { win: 15000, draw: 6000, goal: 8000 } },
  { id: "supercoupe-europa",         name: "Supercoupe d'Europa",           shortName: "SCE", country: "europa", type: "supercup", division: "all", totalMatchdays: 0, trophyIcon: "🏅", prestige: 75, bonuses: { win: 30000, draw: 0, goal: 15000 } },

  // ─── MONDE ───
  { id: "coupe-monde-clubs",         name: "Coupe du Monde des Clubs",      shortName: "CMC", country: "world", type: "cup", division: "all", totalMatchdays: 0, trophyIcon: "🌍", prestige: 85, bonuses: { win: 40000, draw: 15000, goal: 20000 } },
  { id: "coupe-monde-nations",       name: "Coupe du Monde des Nations",    shortName: "CMN", country: "world", type: "cup", division: "all", totalMatchdays: 0, trophyIcon: "🏆", prestige: 100, bonuses: { win: 60000, draw: 25000, goal: 30000 } },
  { id: "championnat-europa-nations",name: "Championnat d'Europa des Nations",shortName:"CEN",country: "world", type: "cup", division: "all", totalMatchdays: 0, trophyIcon: "🏆", prestige: 90, bonuses: { win: 45000, draw: 18000, goal: 22000 } },

  // ─── AMICAUX ───
  { id: "amical", name: "Matchs amicaux", shortName: "AMI", country: "gallia", type: "friendly", division: "all", totalMatchdays: 0, trophyIcon: "🤝", prestige: 5, bonuses: { win: 500, draw: 200, goal: 300 } },
];

export function getCompetition(id: CompetitionId): CompetitionDef {
  const c = COMPETITIONS.find((x) => x.id === id);
  if (!c) throw new Error(`Compétition inconnue: ${id}`);
  return c;
}

export function getCompetitionsForCountry(country: Country): CompetitionDef[] {
  return COMPETITIONS.filter((c) => c.country === country);
}

export function getCompetitionsForDivision(division: Division): CompetitionId[] {
  const country = getCountryForDivision(division);
  return COMPETITIONS
    .filter((c) => c.division === division || (c.division === "all" && c.country === country))
    .map((c) => c.id);
}

function getCountryForDivision(division: Division): Country {
  const map: Record<string, Country> = {
    "elite-gallia": "gallia", "gallia-seconde": "gallia", "national-gallia": "gallia",
    "premier-albion": "albion", "albion-championship": "albion", "albion-league-one": "albion", "albion-league-two": "albion",
    "primera-castilla": "castilla", "segunda-castilla": "castilla",
    "bundesliga": "germania", "zweite-germania": "germania",
    "serie-a-azzurria": "azzurria", "serie-b-azzurria": "azzurria",
  };
  return map[division] ?? "gallia";
}

/** Compétitions jouables selon la division du club utilisateur. */
export function getPlayableCompetitions(division: Division): CompetitionId[] {
  const country = getCountryForDivision(division);
  const result: CompetitionId[] = [division as CompetitionId];

  // Ajouter les coupes nationales
  const cups = COMPETITIONS.filter(
    (c) => c.country === country && (c.type === "cup" || c.type === "supercup")
  );
  result.push(...cups.map((c) => c.id));

  return result;
}
