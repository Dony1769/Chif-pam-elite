/**
 * FC CAREER — Clubs de Germania (Allemagne)
 */

import type { Club, Division, Country } from "../types/club";

function club(
  id: string,
  name: string,
  shortName: string,
  city: string,
  stadium: string,
  capacity: number,
  founded: number,
  country: Country,
  division: Division,
  colors: [string, string, string],
  reputation: number,
  budget: number,
  academyQuality: number,
  coachName: string,
  formation = "4-3-3",
): Club {
  return {
    id, name, shortName, city, stadium, capacity, founded, country, division,
    colors: { primary: colors[0], secondary: colors[1], accent: colors[2] },
    reputation, budget,
    prestige: Math.round(reputation * 0.9),
    academy: { quality: academyQuality, youthSlots: 3, focus: "balanced" },
    coachName,
    preferredFormation: formation,
    isUserClub: false,
  };
}

export const GERMANIA_D1: Club[] = [
  club("bayern-munich",   "Bayern Münich",              "BAY", "Münich",     "Allianz Arena",         75024, 1900, "germania", "bundesliga",["#DC052D","#FFFFFF","#0066B2"], 91, 260_000_000, 92, "Vincent Kompany"),
  club("bor-dortheim",    "Borussia Dortheim",          "BVB", "Dortheim",   "Signal Iduna Park",     81365, 1909, "germania", "bundesliga",["#FDE100","#000000","#FFFFFF"], 84, 140_000_000, 85, "Nuri Sahin"),
  club("bayer-levk",      "Bayer Leverkusen",           "B04", "Leverkusen", "BayArena",              30210, 1904, "germania", "bundesliga",["#E32221","#000000","#FFFFFF"], 84, 130_000_000, 78, "Xabi Alonso"),
  club("rb-leipzich",     "RB Leipzich",                "RBL", "Leipzich",   "Red Bull Arena",        47069, 2009, "germania", "bundesliga",["#DD0741","#FFFFFF","#001F47"], 82, 120_000_000, 75, "Marco Rose"),
  club("vfb-stuttgard",   "VfB Stuttgard",              "VFB", "Stuttgard",  "MHPArena",              60449, 1893, "germania", "bundesliga",["#FFFFFF","#E32219","#000000"], 78, 60_000_000, 72, "Sebastian Hoeness"),
  club("ein-frankfurt",   "Eintracht Frankfürt",        "SGE", "Frankfürt",  "Deutsche Bank Park",    58000, 1899, "germania", "bundesliga",["#000000","#E1001A","#FFFFFF"], 77, 55_000_000, 68, "Dino Toppmöller"),
  club("vfl-wolfsburg",   "VfL Wolfsbürg",              "WOB", "Wolfsbürg",  "Volkswagen Arena",      30000, 1945, "germania", "bundesliga",["#65B32E","#FFFFFF","#000000"], 76, 50_000_000, 66, "Ralph Hasenhüttl"),
  club("sc-freiburg",     "SC Freibürg",                "SCF", "Freibürg",   "Europa-Park Stadion",   34700, 1904, "germania", "bundesliga",["#E4002B","#FFFFFF","#000000"], 75, 45_000_000, 70, "Julian Schuster"),
  club("bor-gladbach",    "Borussia Mönchenglaad",      "BMG", "Gladbach",   "Borussia-Park",         54057, 1900, "germania", "bundesliga",["#000000","#FFFFFF","#00A551"], 74, 40_000_000, 66, "Gerardo Seoane"),
  club("tsg-hoffenheim",  "TSG Hoffenhaim",             "TSG", "Hoffenhaim", "PreZero Arena",         30150, 1899, "germania", "bundesliga",["#0067B1","#FFFFFF","#000000"], 73, 38_000_000, 64, "Pellegrino Matarazzo"),
  club("union-berlina",   "FC Union Berlina",           "FCU", "Berlina",    "An der Alten Försterei",22012, 1966, "germania", "bundesliga",["#EB1923","#FFFFFF","#FEE501"], 72, 30_000_000, 58, "Bo Svensson"),
  club("werder-brema",    "SV Werder Brema",            "SVW", "Brema",      "Weserstadion",          42100, 1899, "germania", "bundesliga",["#00A651","#FFFFFF","#000000"], 71, 28_000_000, 62, "Ole Werner"),
  club("fc-augsburg",     "FC Augsbürg",                "FCA", "Augsbürg",   "WWK Arena",             30660, 1907, "germania", "bundesliga",["#BA3733","#006B3E","#FFFFFF"], 70, 22_000_000, 56, "Jess Thorup"),
  club("fsv-mainza",      "1. FSV Mainza",              "M05", "Mainza",     "Mewa Arena",            34034, 1905, "germania", "bundesliga",["#E4032E","#FFFFFF","#000000"], 69, 20_000_000, 60, "Bo Henriksen"),
  club("fc-heidenheim",   "1. FC Heidenhain",           "FCH", "Heidenhain", "Voith-Arena",           15000, 1946, "germania", "bundesliga",["#0039A6","#E4002B","#FFFFFF"], 66, 12_000_000, 48, "Frank Schmidt"),
  club("fc-kolna",        "1. FC Kölna",                "KOE", "Kölna",      "RheinEnergie Stadion",  50000, 1948, "germania", "bundesliga",["#FFFFFF","#E4002B","#000000"], 68, 25_000_000, 62, "Steffen Baumgart"),
  club("fc-st-paulis",    "FC St. Paulis",              "STP", "Hambürg",    "Millerntor-Stadion",    29546, 1910, "germania", "bundesliga",["#793D28","#FFFFFF","#000000"], 67, 18_000_000, 54, "Alexander Blessin"),
  club("holstein-kieler", "Holstein Kieler",             "KSV", "Kieler",     "Holstein-Stadion",      15034, 1900, "germania", "bundesliga",["#004AAD","#FFFFFF","#E40046"], 65, 10_000_000, 46, "Marcel Rapp"),
];
