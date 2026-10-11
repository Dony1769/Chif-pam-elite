/**
 * FC CAREER — Clubs réels français + divisions (données de base 2025-2026)
 */

import type { Club, Division } from "../types/club";

function club(
  id: string,
  name: string,
  shortName: string,
  city: string,
  stadium: string,
  capacity: number,
  founded: number,
  division: Division,
  colors: Club["colors"],
  reputation: number,
  budget: number,
  academyQuality: number,
  coachName: string,
): Club {
  return {
    id,
    name,
    shortName,
    city,
    stadium,
    capacity,
    founded,
    division,
    colors,
    reputation,
    budget,
    prestige: Math.round(reputation * 0.9),
    academy: { quality: academyQuality, youthSlots: 3, focus: "balanced" },
    coachName,
    preferredFormation: "4-3-3",
    isUserClub: false,
  };
}

const C = (primary: string, secondary: string, accent: string): Club["colors"] => ({
  primary,
  secondary,
  accent,
});

/** Ligue 1 — 18 clubs. */
export const LIGUE1_CLUBS: Club[] = [
  club("psg", "Paris Saint-Germain", "PSG", "Paris", "Parc des Princes", 47929, 1970, "Ligue 1", C("#004170", "#DA291C", "#FFFFFF"), 95, 220_000_000, 78, "Luis Enrique"),
  club("om", "Olympique de Marseille", "OM", "Marseille", "Orange Vélodrome", 67394, 1899, "Ligue 1", C("#2FAEE0", "#FFFFFF", "#1B2A5B"), 84, 90_000_000, 68, "Roberto De Zerbi"),
  club("ol", "Olympique Lyonnais", "OL", "Lyon", "Groupama Stadium", 59186, 1950, "Ligue 1", C("#DA1F42", "#1B4A9E", "#FFFFFF"), 82, 85_000_000, 85, "Pierre Sage"),
  club("asm", "AS Monaco", "ASM", "Monaco", "Stade Louis-II", 18541, 1924, "Ligue 1", C("#E4032E", "#FFFFFF", "#FFD100"), 83, 100_000_000, 88, "Adi Hütter"),
  club("losc", "LOSC Lille", "LIL", "Lille", "Decathlon Arena", 50186, 1944, "Ligue 1", C("#E01E28", "#0B3FA8", "#FFFFFF"), 78, 60_000_000, 76, "Bruno Genesio"),
  club("rcl", "RC Lens", "RCL", "Lens", "Stade Bollaert-Delelis", 38223, 1906, "Ligue 1", C("#FFDE00", "#E4032E", "#000000"), 75, 45_000_000, 70, "Will Still"),
  club("rennes", "Stade Rennais", "SRFC", "Rennes", "Roazhon Park", 29778, 1901, "Ligue 1", C("#E4032E", "#000000", "#FFFFFF"), 74, 50_000_000, 74, "Habib Beye"),
  club("nice", "OGC Nice", "OGCN", "Nice", "Allianz Riviera", 35612, 1904, "Ligue 1", C("#C8102E", "#000000", "#FFFFFF"), 74, 55_000_000, 72, "Franck Haise"),
  club("strasbourg", "RC Strasbourg Alsace", "RCSA", "Strasbourg", "Stade de la Meinau", 29230, 1906, "Ligue 1", C("#009FE3", "#FFFFFF", "#000000"), 68, 35_000_000, 66, "Liam Rosenior"),
  club("toulouse", "Toulouse FC", "TFC", "Toulouse", "Stadium de Toulouse", 33150, 1970, "Ligue 1", C("#5F259F", "#FFFFFF", "#EF7D00"), 65, 28_000_000, 68, "Carles Martínez"),
  club("brest", "Stade Brestois 29", "SB29", "Brest", "Stade Francis-Le Blé", 15931, 1950, "Ligue 1", C("#E4032E", "#FFFFFF", "#000000"), 62, 22_000_000, 58, "Eric Roy"),
  club("lcv", "FC Lorient", "FCL", "Lorient", "Stade du Moustoir", 18890, 1926, "Ligue 1", C("#E4032E", "#FFFFFF", "#1B4A9E"), 58, 18_000_000, 62, "Oriol Romeu"),
  club("ang", "Angers SCO", "SCO", "Angers", "Stade Raymond-Kopa", 18752, 1906, "Ligue 1", C("#000000", "#FFFFFF", "#E4032E"), 57, 17_000_000, 60, "Alexandre Dujeux"),
  club("le-havre", "Le Havre AC", "HAC", "Le Havre", "Stade Océane", 25178, 1872, "Ligue 1", C("#005EB8", "#FFFFFF", "#87CEEB"), 55, 15_000_000, 64, "Didier Digard"),
  club("metz", "FC Metz", "FCM", "Metz", "Stade Saint-Symphorien", 26700, 1932, "Ligue 1", C("#8A1538", "#FFFFFF", "#000000"), 56, 16_000_000, 63, "Stéphane Le Mignan"),
  club("nantes", "FC Nantes", "FCN", "Nantes", "Stade de la Beaujoire", 37443, 1943, "Ligue 1", C("#FFE900", "#009461", "#FFFFFF"), 63, 25_000_000, 71, "Antoine Kombouaré"),
  club("auxerre", "AJ Auxerre", "AJA", "Auxerre", "Stade Abbé-Deschamps", 21379, 1905, "Ligue 1", C("#000000", "#FFFFFF", "#E4032E"), 57, 16_000_000, 61, "Christophe Pélissier"),
  club("parfc", "Paris FC", "PFC", "Paris", "Stade Charléty", 19988, 1969, "Ligue 1", C("#00A651", "#FFFFFF", "#E4032E"), 54, 14_000_000, 59, "Stéphane Gilli"),
];

/** Ligue 2 — 18 clubs (sélection représentative). */
export const LIGUE2_CLUBS: Club[] = [
  club("stade-de-reims", "Stade de Reims", "SDR", "Reims", "Stade Auguste-Delaune", 21628, 1931, "Ligue 2", C("#E4032E", "#FFFFFF", "#000000"), 66, 30_000_000, 73, "Luka Elsner"),
  club("saint-etienne", "AS Saint-Étienne", "ASSE", "Saint-Étienne", "Stade Geoffroy-Guichard", 41965, 1933, "Ligue 2", C("#00A651", "#FFFFFF", "#000000"), 72, 35_000_000, 70, "Olivier Dall'Oglio"),
  club("bordeaux", "FC Girondins de Bordeaux", "FCGB", "Bordeaux", "Stade Matmut-Atlantique", 42115, 1881, "Ligue 2", C("#1B4A9E", "#FFFFFF", "#E4032E"), 70, 28_000_000, 75, "Albert Riera"),
  club("montpellier", "Montpellier HSC", "MHSC", "Montpellier", "Stade de la Mosson", 17256, 1974, "Ligue 2", C("#E4032E", "#005EB8", "#FFFFFF"), 64, 22_000_000, 67, "Jean-Louis Gasset"),
  club("caen", "SM Caen", "SMC", "Caen", "Stade Michel-d'Ornano", 21211, 1913, "Ligue 2", C("#E4032E", "#000000", "#FFFFFF"), 55, 12_000_000, 65, "Nicolas Seube"),
  club("guingamp", "En Avant Guingamp", "EAG", "Guingamp", "Stade du Roudourou", 18371, 1912, "Ligue 2", C("#E4032E", "#FFFFFF", "#005EB8"), 56, 13_000_000, 66, "Sylvain Didot"),
  club("laval", "Stade Lavallois", "SL", "Laval", "Stade Francis-Le Basser", 11418, 1902, "Ligue 2", C("#E4032E", "#FFFFFF", "#000000"), 50, 8_000_000, 55, "Olivier Frapolli"),
  club("amiens", "Amiens SC", "ASC", "Amiens", "Stade Crédit Mutuel de la Licorne", 12999, 1901, "Ligue 2", C("#E4032E", "#FFFFFF", "#000000"), 51, 9_000_000, 60, "Omar Dahleb"),
  club("pau", "Pau FC", "PFC64", "Pau", "Stade du Hameau", 18320, 1959, "Ligue 2", C("#E4032E", "#FFFFFF", "#005EB8"), 48, 7_000_000, 50, "Bruno Irles"),
  club("annecy", "FC Annecy", "FCA", "Annecy", "Parc des Sports", 15660, 1927, "Ligue 2", C("#E4032E", "#FFFFFF", "#00A651"), 48, 7_000_000, 52, "Laurent Guyot"),
];

/** Tous les clubs du jeu indexés par id. */
export const CLUBS_BY_ID: Record<string, Club> = Object.fromEntries(
  [...LIGUE1_CLUBS, ...LIGUE2_CLUBS].map((c) => [c.id, c]),
);

export function getClub(id: string): Club | undefined {
  return CLUBS_BY_ID[id];
}

export function getClubsByDivision(division: Division): Club[] {
  if (division === "Ligue 1") return LIGUE1_CLUBS;
  if (division === "Ligue 2") return LIGUE2_CLUBS;
  return [];
}

/** Clubs accessibles au joueur en début de carrière (formation / amateur inclus). */
export const STARTING_CLUB_IDS: string[] = [
  "clermont",
  "qrm",
  ...LIGUE2_CLUBS.map((c) => c.id),
  ...LIGUE1_CLUBS.map((c) => c.id),
];
