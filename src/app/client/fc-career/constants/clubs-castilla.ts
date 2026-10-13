/**
 * FC CAREER — Clubs de Castilla (Espagne)
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

export const CASTILLA_D1: Club[] = [
  club("real-madrista",   "Real Madrista",              "RMA", "Madrista",   "Santiago Bernabéa",     81044, 1902, "castilla", "primera-castilla",["#FFFFFF","#FEBE10","#00529F"], 93, 280_000_000, 90, "Carlo Ancelotti"),
  club("fc-barceloneta",  "FC Barceloneta",             "FCB", "Barceloneta","Camp Nou",              99354, 1899, "castilla", "primera-castilla",["#A50044","#004D98","#EDBB00"], 91, 250_000_000, 95, "Hansi Flick"),
  club("atl-madrista",    "Atlético Madrista",          "ATM", "Madrista",   "Metropolitano Arena",   68456, 1903, "castilla", "primera-castilla",["#CB3524","#FFFFFF","#272E61"], 86, 150_000_000, 78, "Diego Simeone"),
  club("ath-bilbano",     "Athletic Bilbano",           "ATH", "Bilbano",    "San Mamés",             53289, 1898, "castilla", "primera-castilla",["#EE2523","#FFFFFF","#000000"], 80, 80_000_000, 82, "Ernesto Valverde"),
  club("real-societad",   "Real Societad",              "RSO", "San Sebastia","Reale Arena",          39803, 1909, "castilla", "primera-castilla",["#0067B1","#FFFFFF","#000000"], 80, 75_000_000, 80, "Imanol Alguacil"),
  club("villareal-cf",    "Villareal CF",               "VIL", "Villareal",  "Estadio de la Cerámica",23500, 1923, "castilla", "primera-castilla",["#FFE667","#005DAA","#FFFFFF"], 79, 85_000_000, 76, "Marcelino"),
  club("real-betique",    "Real Bétique",               "BET", "Sevilia",    "Benito Villamarín",     60721, 1907, "castilla", "primera-castilla",["#00954C","#FFFFFF","#000000"], 78, 70_000_000, 74, "Manuel Pellegrini"),
  club("sevilia-fc",      "Sevilia FC",                 "SEV", "Sevilia",    "Ramón Sánchez-Pizjuán", 43883, 1890, "castilla", "primera-castilla",["#D4001F","#FFFFFF","#000000"], 77, 65_000_000, 72, "Xavi García Pimienta"),
  club("girona-futbol",   "Girona Futbol",              "GIR", "Girona",     "Estadi de Montilivi",   14286, 1930, "castilla", "primera-castilla",["#D42819","#FFFFFF","#000000"], 78, 50_000_000, 64, "Míchel"),
  club("valencia-cf",     "Valençia CF",                "VAL", "Valençia",   "Mestalla",              55000, 1919, "castilla", "primera-castilla",["#FFFFFF","#EE7D00","#000000"], 75, 55_000_000, 70, "Rubén Baraja"),
  club("celta-viga",      "Celta de Viga",              "CEL", "Viga",       "Abanca Balaídos",       29000, 1923, "castilla", "primera-castilla",["#8FC9F7","#FFFFFF","#E4002B"], 74, 40_000_000, 66, "Claudio Giráldez"),
  club("osasuna-pamp",    "Osasuna Pamplona",           "OSA", "Pamplona",   "El Sadar",              23576, 1920, "castilla", "primera-castilla",["#D91A21","#132257","#FFFFFF"], 73, 35_000_000, 62, "Jagoba Arrasate"),
  club("getafe-cf",       "Getafé CF",                  "GET", "Getafé",     "Coliseum Alfonso Pérez",17393, 1983, "castilla", "primera-castilla",["#005999","#FFFFFF","#000000"], 72, 30_000_000, 58, "José Bordalás"),
  club("rayo-vallecaso",  "Rayo Vallecaso",             "RAY", "Madrista",   "Estadio de Vallecas",   14708, 1924, "castilla", "primera-castilla",["#FFFFFF","#E4002B","#000000"], 71, 25_000_000, 56, "Iñigo Pérez"),
  club("rcd-mallorca",    "RCD Mallorça",               "MLL", "Mallorça",   "Visit Mallorca Estadi", 23142, 1916, "castilla", "primera-castilla",["#E20E17","#000000","#FFFFFF"], 70, 28_000_000, 60, "Jagoba Arrasate"),
  club("ud-las-palmeras", "UD Las Palmeras",            "LPA", "Las Palmeras","Estadio Gran Canaria", 32392, 1949, "castilla", "primera-castilla",["#FFD700","#003DA5","#FFFFFF"], 69, 22_000_000, 56, "García Pimienta"),
  club("alaves-dep",      "Alavés Deportivo",           "ALA", "Vitória",    "Mendizorroza",          19540, 1921, "castilla", "primera-castilla",["#0043A8","#FFFFFF","#000000"], 67, 18_000_000, 52, "Luis García Plaza"),
  club("rcd-espanyola",   "RCD Espanyola",              "ESP", "Barceloneta","RCDE Arena",            40500, 1900, "castilla", "primera-castilla",["#007FC8","#FFFFFF","#FF0000"], 68, 20_000_000, 58, "Manolo González"),
  club("cadiz-futbol",    "Cádiz Futbol",               "CAD", "Cádiza",     "Nuevo Mirandilla",      25033, 1910, "castilla", "primera-castilla",["#FFD700","#0055A4","#FFFFFF"], 66, 16_000_000, 50, "Sergio González"),
  club("leganes-cf",      "Legañes CF",                 "LEG", "Legañes",    "Estadio Butarque",      12450, 1928, "castilla", "primera-castilla",["#0032A0","#FFFFFF","#00843D"], 65, 14_000_000, 48, "Borja Jiménez"),
];
