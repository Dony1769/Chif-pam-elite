/**
 * FC CAREER — Données monde fictif cohérent
 * 4 pays, 2 divisions par pays, 8 clubs par division = 64 clubs
 * Noms, couleurs, budgets et philosophies créés de toutes pièces.
 */

import type { Country, League, Club } from "../domain/club";

// ─── Pays ────────────────────────────────────────────────────────────────────

export const COUNTRIES: Country[] = [
  { id: "valtara",  name: "Valtara",  code: "VT", flag: "🟦" },
  { id: "corenthia",name: "Corenthia",code: "CR", flag: "🟥" },
  { id: "solendra", name: "Solendra", code: "SL", flag: "🟨" },
  { id: "nordheim", name: "Nordheim", code: "NH", flag: "⬜" },
];

// ─── Ligues ───────────────────────────────────────────────────────────────────

export const LEAGUES: League[] = [
  // Valtara
  { id: "vlt-d1", name: "Valtara Premier League", countryId: "valtara",  tier: 1, clubCount: 8 },
  { id: "vlt-d2", name: "Valtara Championship",   countryId: "valtara",  tier: 2, clubCount: 8 },
  // Corenthia
  { id: "cor-d1", name: "Liga Corenthia",         countryId: "corenthia",tier: 1, clubCount: 8 },
  { id: "cor-d2", name: "Segunda Corenthia",      countryId: "corenthia",tier: 2, clubCount: 8 },
  // Solendra
  { id: "sol-d1", name: "Solendra Superlega",     countryId: "solendra", tier: 1, clubCount: 8 },
  { id: "sol-d2", name: "Solendra Serie B",       countryId: "solendra", tier: 2, clubCount: 8 },
  // Nordheim
  { id: "nor-d1", name: "Nordheim Eliteliga",     countryId: "nordheim", tier: 1, clubCount: 8 },
  { id: "nor-d2", name: "Nordheim Division 2",    countryId: "nordheim", tier: 2, clubCount: 8 },
];

// ─── Clubs ────────────────────────────────────────────────────────────────────

export const CLUBS: Club[] = [

  // ── VALTARA D1 ─────────────────────────────────────────────────────────────
  {
    id: "vlt-fc-meridian",  name: "FC Meridian",       shortName: "MER",
    countryId: "valtara", leagueId: "vlt-d1", tier: 1,
    colors: { primary: "#1a3a6b", secondary: "#f5bd58" },
    wagesBudget: 120_000, transferBudget: 8_000_000, reputation: 88,
    academyLevel: 4, philosophy: "possession",
  },
  {
    id: "vlt-united-capital", name: "United Capital FC", shortName: "UCF",
    countryId: "valtara", leagueId: "vlt-d1", tier: 1,
    colors: { primary: "#c0392b", secondary: "#ffffff" },
    wagesBudget: 105_000, transferBudget: 6_500_000, reputation: 84,
    academyLevel: 3, philosophy: "attacking",
  },
  {
    id: "vlt-as-thornfield", name: "AS Thornfield",     shortName: "THF",
    countryId: "valtara", leagueId: "vlt-d1", tier: 1,
    colors: { primary: "#006400", secondary: "#ffd700" },
    wagesBudget: 95_000, transferBudget: 5_000_000, reputation: 80,
    academyLevel: 3, philosophy: "balanced",
  },
  {
    id: "vlt-riverton-sc", name: "Riverton SC",         shortName: "RSC",
    countryId: "valtara", leagueId: "vlt-d1", tier: 1,
    colors: { primary: "#002366", secondary: "#c0c0c0" },
    wagesBudget: 85_000, transferBudget: 4_000_000, reputation: 76,
    academyLevel: 3, philosophy: "defensive",
  },
  {
    id: "vlt-fc-halcyon",  name: "FC Halcyon",          shortName: "HAL",
    countryId: "valtara", leagueId: "vlt-d1", tier: 1,
    colors: { primary: "#8b0000", secondary: "#d3d3d3" },
    wagesBudget: 80_000, transferBudget: 3_500_000, reputation: 74,
    academyLevel: 2, philosophy: "counter",
  },
  {
    id: "vlt-eastbrook-fc", name: "Eastbrook FC",       shortName: "EBF",
    countryId: "valtara", leagueId: "vlt-d1", tier: 1,
    colors: { primary: "#ff6600", secondary: "#000000" },
    wagesBudget: 75_000, transferBudget: 3_000_000, reputation: 71,
    academyLevel: 2, philosophy: "attacking",
  },
  {
    id: "vlt-graymoor-fc", name: "Graymoor FC",         shortName: "GRY",
    countryId: "valtara", leagueId: "vlt-d1", tier: 1,
    colors: { primary: "#708090", secondary: "#ffffff" },
    wagesBudget: 65_000, transferBudget: 2_500_000, reputation: 67,
    academyLevel: 2, philosophy: "balanced",
  },
  {
    id: "vlt-westcliff-sc", name: "Westcliff SC",       shortName: "WSC",
    countryId: "valtara", leagueId: "vlt-d1", tier: 1,
    colors: { primary: "#4b0082", secondary: "#ffffff" },
    wagesBudget: 55_000, transferBudget: 2_000_000, reputation: 62,
    academyLevel: 2, philosophy: "defensive",
  },

  // ── VALTARA D2 ─────────────────────────────────────────────────────────────
  {
    id: "vlt-castleton-afc", name: "Castleton AFC",    shortName: "CAF",
    countryId: "valtara", leagueId: "vlt-d2", tier: 2,
    colors: { primary: "#2e4057", secondary: "#f6ae2d" },
    wagesBudget: 30_000, transferBudget: 800_000, reputation: 52,
    academyLevel: 2, philosophy: "possession",
  },
  {
    id: "vlt-fc-lakeview",  name: "FC Lakeview",       shortName: "LKV",
    countryId: "valtara", leagueId: "vlt-d2", tier: 2,
    colors: { primary: "#0077b6", secondary: "#ade8f4" },
    wagesBudget: 25_000, transferBudget: 600_000, reputation: 48,
    academyLevel: 1, philosophy: "balanced",
  },
  {
    id: "vlt-north-park-fc", name: "North Park FC",    shortName: "NPF",
    countryId: "valtara", leagueId: "vlt-d2", tier: 2,
    colors: { primary: "#1b4332", secondary: "#ffffff" },
    wagesBudget: 22_000, transferBudget: 500_000, reputation: 45,
    academyLevel: 1, philosophy: "defensive",
  },
  {
    id: "vlt-dunmore-city", name: "Dunmore City FC",   shortName: "DCF",
    countryId: "valtara", leagueId: "vlt-d2", tier: 2,
    colors: { primary: "#9b2226", secondary: "#e9d8a6" },
    wagesBudget: 20_000, transferBudget: 450_000, reputation: 43,
    academyLevel: 1, philosophy: "counter",
  },
  {
    id: "vlt-portside-fc", name: "Portside FC",        shortName: "PTF",
    countryId: "valtara", leagueId: "vlt-d2", tier: 2,
    colors: { primary: "#005f73", secondary: "#94d2bd" },
    wagesBudget: 18_000, transferBudget: 400_000, reputation: 41,
    academyLevel: 1, philosophy: "attacking",
  },
  {
    id: "vlt-fc-ironbay",  name: "FC Ironbay",         shortName: "IRB",
    countryId: "valtara", leagueId: "vlt-d2", tier: 2,
    colors: { primary: "#333333", secondary: "#ff4400" },
    wagesBudget: 16_000, transferBudget: 350_000, reputation: 39,
    academyLevel: 1, philosophy: "defensive",
  },
  {
    id: "vlt-sunridge-afc", name: "Sunridge AFC",      shortName: "SRC",
    countryId: "valtara", leagueId: "vlt-d2", tier: 2,
    colors: { primary: "#f4a261", secondary: "#264653" },
    wagesBudget: 14_000, transferBudget: 300_000, reputation: 37,
    academyLevel: 1, philosophy: "balanced",
  },
  {
    id: "vlt-moorland-fc", name: "Moorland FC",        shortName: "MLD",
    countryId: "valtara", leagueId: "vlt-d2", tier: 2,
    colors: { primary: "#606c38", secondary: "#ffffff" },
    wagesBudget: 12_000, transferBudget: 250_000, reputation: 34,
    academyLevel: 1, philosophy: "counter",
  },

  // ── CORENTHIA D1 ───────────────────────────────────────────────────────────
  {
    id: "cor-atletico-varra", name: "Atlético Varra",  shortName: "AVR",
    countryId: "corenthia", leagueId: "cor-d1", tier: 1,
    colors: { primary: "#c0392b", secondary: "#f1c40f" },
    wagesBudget: 110_000, transferBudget: 7_500_000, reputation: 86,
    academyLevel: 4, philosophy: "attacking",
  },
  {
    id: "cor-real-caldera",  name: "Real Caldera",     shortName: "RCL",
    countryId: "corenthia", leagueId: "cor-d1", tier: 1,
    colors: { primary: "#2471a3", secondary: "#e8e8e8" },
    wagesBudget: 100_000, transferBudget: 6_000_000, reputation: 82,
    academyLevel: 4, philosophy: "possession",
  },
  {
    id: "cor-sporting-bravo", name: "Sporting Bravo",  shortName: "SPB",
    countryId: "corenthia", leagueId: "cor-d1", tier: 1,
    colors: { primary: "#27ae60", secondary: "#ffffff" },
    wagesBudget: 88_000, transferBudget: 4_500_000, reputation: 78,
    academyLevel: 3, philosophy: "balanced",
  },
  {
    id: "cor-cf-torrente",  name: "CF Torrente",       shortName: "TOR",
    countryId: "corenthia", leagueId: "cor-d1", tier: 1,
    colors: { primary: "#884ea0", secondary: "#fdebd0" },
    wagesBudget: 78_000, transferBudget: 3_800_000, reputation: 74,
    academyLevel: 2, philosophy: "counter",
  },
  {
    id: "cor-fc-montesa",   name: "FC Montesa",        shortName: "MNT",
    countryId: "corenthia", leagueId: "cor-d1", tier: 1,
    colors: { primary: "#1f618d", secondary: "#d4e6f1" },
    wagesBudget: 70_000, transferBudget: 3_000_000, reputation: 70,
    academyLevel: 2, philosophy: "defensive",
  },
  {
    id: "cor-ud-palencia",  name: "UD Palencia",       shortName: "UDP",
    countryId: "corenthia", leagueId: "cor-d1", tier: 1,
    colors: { primary: "#b7950b", secondary: "#1a1a1a" },
    wagesBudget: 60_000, transferBudget: 2_500_000, reputation: 66,
    academyLevel: 2, philosophy: "attacking",
  },
  {
    id: "cor-racing-cobre", name: "Racing Cobre",      shortName: "RCB",
    countryId: "corenthia", leagueId: "cor-d1", tier: 1,
    colors: { primary: "#b03a2e", secondary: "#f9f3e3" },
    wagesBudget: 52_000, transferBudget: 2_000_000, reputation: 62,
    academyLevel: 1, philosophy: "counter",
  },
  {
    id: "cor-villanueva-fc", name: "Villanueva FC",    shortName: "VNF",
    countryId: "corenthia", leagueId: "cor-d1", tier: 1,
    colors: { primary: "#0b5345", secondary: "#d5f5e3" },
    wagesBudget: 45_000, transferBudget: 1_500_000, reputation: 58,
    academyLevel: 1, philosophy: "balanced",
  },

  // ── CORENTHIA D2 ───────────────────────────────────────────────────────────
  {
    id: "cor-cd-alcorsa",   name: "CD Alcorsa",        shortName: "ALC",
    countryId: "corenthia", leagueId: "cor-d2", tier: 2,
    colors: { primary: "#6e2594", secondary: "#ffd600" },
    wagesBudget: 28_000, transferBudget: 700_000, reputation: 50,
    academyLevel: 2, philosophy: "possession",
  },
  {
    id: "cor-cf-levantero", name: "CF Levantero",      shortName: "LEV",
    countryId: "corenthia", leagueId: "cor-d2", tier: 2,
    colors: { primary: "#e74c3c", secondary: "#f8c471" },
    wagesBudget: 24_000, transferBudget: 600_000, reputation: 46,
    academyLevel: 1, philosophy: "attacking",
  },
  {
    id: "cor-deportivo-sol", name: "Deportivo Sol",    shortName: "DSL",
    countryId: "corenthia", leagueId: "cor-d2", tier: 2,
    colors: { primary: "#f39c12", secondary: "#2c3e50" },
    wagesBudget: 20_000, transferBudget: 500_000, reputation: 44,
    academyLevel: 1, philosophy: "balanced",
  },
  {
    id: "cor-sc-riveron",   name: "SC Riveron",        shortName: "SRV",
    countryId: "corenthia", leagueId: "cor-d2", tier: 2,
    colors: { primary: "#1abc9c", secondary: "#2c3e50" },
    wagesBudget: 18_000, transferBudget: 420_000, reputation: 42,
    academyLevel: 1, philosophy: "counter",
  },
  {
    id: "cor-san-marcos-fc", name: "San Marcos FC",    shortName: "SMF",
    countryId: "corenthia", leagueId: "cor-d2", tier: 2,
    colors: { primary: "#2980b9", secondary: "#ffffff" },
    wagesBudget: 16_000, transferBudget: 380_000, reputation: 40,
    academyLevel: 1, philosophy: "defensive",
  },
  {
    id: "cor-fc-bellavega",  name: "FC Bellavega",     shortName: "BVG",
    countryId: "corenthia", leagueId: "cor-d2", tier: 2,
    colors: { primary: "#8e44ad", secondary: "#d7bde2" },
    wagesBudget: 14_000, transferBudget: 320_000, reputation: 38,
    academyLevel: 1, philosophy: "balanced",
  },
  {
    id: "cor-cd-vielha",    name: "CD Vielha",         shortName: "VLH",
    countryId: "corenthia", leagueId: "cor-d2", tier: 2,
    colors: { primary: "#c0392b", secondary: "#bdc3c7" },
    wagesBudget: 12_000, transferBudget: 280_000, reputation: 36,
    academyLevel: 1, philosophy: "counter",
  },
  {
    id: "cor-pueblo-afc",   name: "Pueblo AFC",        shortName: "PBL",
    countryId: "corenthia", leagueId: "cor-d2", tier: 2,
    colors: { primary: "#7f8c8d", secondary: "#ecf0f1" },
    wagesBudget: 10_000, transferBudget: 220_000, reputation: 32,
    academyLevel: 1, philosophy: "defensive",
  },

  // ── SOLENDRA D1 ────────────────────────────────────────────────────────────
  {
    id: "sol-fc-aurora",    name: "FC Aurora",         shortName: "AUR",
    countryId: "solendra", leagueId: "sol-d1", tier: 1,
    colors: { primary: "#f39c12", secondary: "#1a1a2e" },
    wagesBudget: 115_000, transferBudget: 7_800_000, reputation: 87,
    academyLevel: 4, philosophy: "attacking",
  },
  {
    id: "sol-sc-vallura",   name: "SC Vallura",        shortName: "VLL",
    countryId: "solendra", leagueId: "sol-d1", tier: 1,
    colors: { primary: "#16213e", secondary: "#0f3460" },
    wagesBudget: 98_000, transferBudget: 6_000_000, reputation: 83,
    academyLevel: 3, philosophy: "possession",
  },
  {
    id: "sol-internazionale-forte", name: "Internazionale Forte", shortName: "INF",
    countryId: "solendra", leagueId: "sol-d1", tier: 1,
    colors: { primary: "#000080", secondary: "#c0c0c0" },
    wagesBudget: 90_000, transferBudget: 5_200_000, reputation: 80,
    academyLevel: 3, philosophy: "counter",
  },
  {
    id: "sol-ac-belforte",  name: "AC Belforte",       shortName: "BLF",
    countryId: "solendra", leagueId: "sol-d1", tier: 1,
    colors: { primary: "#dc143c", secondary: "#000000" },
    wagesBudget: 82_000, transferBudget: 4_000_000, reputation: 76,
    academyLevel: 2, philosophy: "attacking",
  },
  {
    id: "sol-us-pontemare", name: "US Pontemare",      shortName: "USP",
    countryId: "solendra", leagueId: "sol-d1", tier: 1,
    colors: { primary: "#228b22", secondary: "#ffd700" },
    wagesBudget: 74_000, transferBudget: 3_200_000, reputation: 72,
    academyLevel: 2, philosophy: "balanced",
  },
  {
    id: "sol-fc-cristallo",  name: "FC Cristallo",     shortName: "CRS",
    countryId: "solendra", leagueId: "sol-d1", tier: 1,
    colors: { primary: "#4169e1", secondary: "#f0f0f0" },
    wagesBudget: 65_000, transferBudget: 2_700_000, reputation: 68,
    academyLevel: 2, philosophy: "defensive",
  },
  {
    id: "sol-asd-palombara", name: "ASD Palombara",   shortName: "PAL",
    countryId: "solendra", leagueId: "sol-d1", tier: 1,
    colors: { primary: "#808000", secondary: "#ffffff" },
    wagesBudget: 56_000, transferBudget: 2_100_000, reputation: 63,
    academyLevel: 1, philosophy: "counter",
  },
  {
    id: "sol-gs-tramontana", name: "GS Tramontana",   shortName: "TRM",
    countryId: "solendra", leagueId: "sol-d1", tier: 1,
    colors: { primary: "#800020", secondary: "#d4af37" },
    wagesBudget: 48_000, transferBudget: 1_700_000, reputation: 59,
    academyLevel: 1, philosophy: "balanced",
  },

  // ── SOLENDRA D2 ────────────────────────────────────────────────────────────
  {
    id: "sol-fc-malverde",  name: "FC Malverde",       shortName: "MLV",
    countryId: "solendra", leagueId: "sol-d2", tier: 2,
    colors: { primary: "#2d6a4f", secondary: "#b7e4c7" },
    wagesBudget: 26_000, transferBudget: 650_000, reputation: 51,
    academyLevel: 1, philosophy: "balanced",
  },
  {
    id: "sol-pro-casalinga", name: "Pro Casalinga",   shortName: "PCA",
    countryId: "solendra", leagueId: "sol-d2", tier: 2,
    colors: { primary: "#c77dff", secondary: "#10002b" },
    wagesBudget: 22_000, transferBudget: 550_000, reputation: 47,
    academyLevel: 1, philosophy: "attacking",
  },
  {
    id: "sol-ss-cornovale", name: "SS Cornovale",     shortName: "CRN",
    countryId: "solendra", leagueId: "sol-d2", tier: 2,
    colors: { primary: "#e63946", secondary: "#f1faee" },
    wagesBudget: 19_000, transferBudget: 480_000, reputation: 45,
    academyLevel: 1, philosophy: "defensive",
  },
  {
    id: "sol-afc-oltremare", name: "AFC Oltremare",   shortName: "OLT",
    countryId: "solendra", leagueId: "sol-d2", tier: 2,
    colors: { primary: "#457b9d", secondary: "#a8dadc" },
    wagesBudget: 17_000, transferBudget: 400_000, reputation: 43,
    academyLevel: 1, philosophy: "counter",
  },
  {
    id: "sol-vf-sonnino",   name: "VF Sonnino",       shortName: "SON",
    countryId: "solendra", leagueId: "sol-d2", tier: 2,
    colors: { primary: "#f4a261", secondary: "#2a9d8f" },
    wagesBudget: 15_000, transferBudget: 350_000, reputation: 40,
    academyLevel: 1, philosophy: "possession",
  },
  {
    id: "sol-fc-lacustre",  name: "FC Lacustre",      shortName: "LAC",
    countryId: "solendra", leagueId: "sol-d2", tier: 2,
    colors: { primary: "#219ebc", secondary: "#023047" },
    wagesBudget: 13_000, transferBudget: 300_000, reputation: 37,
    academyLevel: 1, philosophy: "balanced",
  },
  {
    id: "sol-us-piana",     name: "US Piana",          shortName: "UPI",
    countryId: "solendra", leagueId: "sol-d2", tier: 2,
    colors: { primary: "#6a0572", secondary: "#e7a6f0" },
    wagesBudget: 11_000, transferBudget: 250_000, reputation: 35,
    academyLevel: 1, philosophy: "defensive",
  },
  {
    id: "sol-ac-fiumara",   name: "AC Fiumara",        shortName: "FMR",
    countryId: "solendra", leagueId: "sol-d2", tier: 2,
    colors: { primary: "#780000", secondary: "#fdf0d5" },
    wagesBudget: 9_000, transferBudget: 200_000, reputation: 32,
    academyLevel: 1, philosophy: "counter",
  },

  // ── NORDHEIM D1 ────────────────────────────────────────────────────────────
  {
    id: "nor-fc-polaris",   name: "FC Polaris",        shortName: "POL",
    countryId: "nordheim", leagueId: "nor-d1", tier: 1,
    colors: { primary: "#003f88", secondary: "#ffffff" },
    wagesBudget: 108_000, transferBudget: 7_200_000, reputation: 85,
    academyLevel: 4, philosophy: "balanced",
  },
  {
    id: "nor-ik-vintern",   name: "IK Vintern",        shortName: "VNT",
    countryId: "nordheim", leagueId: "nor-d1", tier: 1,
    colors: { primary: "#6a0572", secondary: "#d4e4f7" },
    wagesBudget: 96_000, transferBudget: 5_800_000, reputation: 81,
    academyLevel: 3, philosophy: "defensive",
  },
  {
    id: "nor-bf-fjorden",   name: "BF Fjorden",        shortName: "FJR",
    countryId: "nordheim", leagueId: "nor-d1", tier: 1,
    colors: { primary: "#005c29", secondary: "#c8102e" },
    wagesBudget: 85_000, transferBudget: 4_600_000, reputation: 78,
    academyLevel: 3, philosophy: "counter",
  },
  {
    id: "nor-hk-skogen",    name: "HK Skogen",         shortName: "SKG",
    countryId: "nordheim", leagueId: "nor-d1", tier: 1,
    colors: { primary: "#a8201a", secondary: "#f0e6d3" },
    wagesBudget: 76_000, transferBudget: 3_700_000, reputation: 74,
    academyLevel: 2, philosophy: "attacking",
  },
  {
    id: "nor-fc-arctis",    name: "FC Arctis",         shortName: "ARC",
    countryId: "nordheim", leagueId: "nor-d1", tier: 1,
    colors: { primary: "#00b4d8", secondary: "#03045e" },
    wagesBudget: 68_000, transferBudget: 2_900_000, reputation: 70,
    academyLevel: 2, philosophy: "possession",
  },
  {
    id: "nor-sol-brekka",   name: "Sol Brekka",        shortName: "SBK",
    countryId: "nordheim", leagueId: "nor-d1", tier: 1,
    colors: { primary: "#f4d35e", secondary: "#ee964b" },
    wagesBudget: 60_000, transferBudget: 2_400_000, reputation: 66,
    academyLevel: 2, philosophy: "balanced",
  },
  {
    id: "nor-kv-ishavet",   name: "KV Ishavet",        shortName: "ISH",
    countryId: "nordheim", leagueId: "nor-d1", tier: 1,
    colors: { primary: "#e0fbfc", secondary: "#293241" },
    wagesBudget: 52_000, transferBudget: 1_900_000, reputation: 62,
    academyLevel: 1, philosophy: "defensive",
  },
  {
    id: "nor-if-dagfjell",  name: "IF Dagfjell",       shortName: "DGF",
    countryId: "nordheim", leagueId: "nor-d1", tier: 1,
    colors: { primary: "#4a4e69", secondary: "#f2e9e4" },
    wagesBudget: 44_000, transferBudget: 1_500_000, reputation: 58,
    academyLevel: 1, philosophy: "counter",
  },

  // ── NORDHEIM D2 ────────────────────────────────────────────────────────────
  {
    id: "nor-gk-tundra",    name: "GK Tundra",         shortName: "TND",
    countryId: "nordheim", leagueId: "nor-d2", tier: 2,
    colors: { primary: "#7d4f50", secondary: "#d8e2dc" },
    wagesBudget: 24_000, transferBudget: 580_000, reputation: 50,
    academyLevel: 1, philosophy: "defensive",
  },
  {
    id: "nor-fc-nordvik",   name: "FC Nordvik",        shortName: "NRV",
    countryId: "nordheim", leagueId: "nor-d2", tier: 2,
    colors: { primary: "#003049", secondary: "#fcbf49" },
    wagesBudget: 20_000, transferBudget: 500_000, reputation: 46,
    academyLevel: 1, philosophy: "counter",
  },
  {
    id: "nor-hb-fossheim",  name: "HB Fossheim",       shortName: "FSH",
    countryId: "nordheim", leagueId: "nor-d2", tier: 2,
    colors: { primary: "#386641", secondary: "#a7c957" },
    wagesBudget: 17_000, transferBudget: 420_000, reputation: 43,
    academyLevel: 1, philosophy: "balanced",
  },
  {
    id: "nor-ik-havstrom",  name: "IK Havstrom",       shortName: "HVS",
    countryId: "nordheim", leagueId: "nor-d2", tier: 2,
    colors: { primary: "#0077b6", secondary: "#ade8f4" },
    wagesBudget: 15_000, transferBudget: 370_000, reputation: 41,
    academyLevel: 1, philosophy: "attacking",
  },
  {
    id: "nor-sr-kystby",    name: "SR Kystby",         shortName: "KSB",
    countryId: "nordheim", leagueId: "nor-d2", tier: 2,
    colors: { primary: "#c77dff", secondary: "#e0aaff" },
    wagesBudget: 13_000, transferBudget: 320_000, reputation: 38,
    academyLevel: 1, philosophy: "possession",
  },
  {
    id: "nor-fc-elvdal",    name: "FC Elvdal",         shortName: "ELV",
    countryId: "nordheim", leagueId: "nor-d2", tier: 2,
    colors: { primary: "#9e2a2b", secondary: "#e9c46a" },
    wagesBudget: 11_000, transferBudget: 260_000, reputation: 36,
    academyLevel: 1, philosophy: "balanced",
  },
  {
    id: "nor-bk-vargnes",   name: "BK Vargnes",        shortName: "VGN",
    countryId: "nordheim", leagueId: "nor-d2", tier: 2,
    colors: { primary: "#264653", secondary: "#2a9d8f" },
    wagesBudget: 9_000, transferBudget: 210_000, reputation: 33,
    academyLevel: 1, philosophy: "counter",
  },
  {
    id: "nor-il-lyngen",    name: "IL Lyngen",         shortName: "LYN",
    countryId: "nordheim", leagueId: "nor-d2", tier: 2,
    colors: { primary: "#f72585", secondary: "#7209b7" },
    wagesBudget: 7_000, transferBudget: 160_000, reputation: 30,
    academyLevel: 1, philosophy: "defensive",
  },
];

// ─── Lookups ──────────────────────────────────────────────────────────────────

export function getClubsByLeague(leagueId: string): Club[] {
  return CLUBS.filter(c => c.leagueId === leagueId);
}

export function getLeaguesByCountry(countryId: string): League[] {
  return LEAGUES.filter(l => l.countryId === countryId);
}

export function getClub(id: string): Club | undefined {
  return CLUBS.find(c => c.id === id);
}

export function getLeague(id: string): League | undefined {
  return LEAGUES.find(l => l.id === id);
}

export function getCountry(id: string): Country | undefined {
  return COUNTRIES.find(c => c.id === id);
}

/** Retourne le club d'académie par défaut selon le pays du joueur (D2 niveau 1) */
export function getAcademyClubForCountry(countryId: string): Club {
  const d2Clubs = CLUBS.filter(c => c.countryId === countryId && c.tier === 2);
  return d2Clubs[d2Clubs.length - 1] ?? CLUBS[CLUBS.length - 1];
}

/** Retourne les clubs concurrents (même ligue, exclut le joueur) */
export function getRivalClubs(playerClubId: string): Club[] {
  const club = getClub(playerClubId);
  if (!club) return [];
  return CLUBS.filter(c => c.leagueId === club.leagueId && c.id !== playerClubId);
}

/** Niveau de force d'un club (0.0–1.0) basé sur la réputation */
export function clubStrength(club: Club): number {
  return club.reputation / 100;
}
