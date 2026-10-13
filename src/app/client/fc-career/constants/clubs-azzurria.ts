/**
 * FC CAREER — Clubs d'Azzurria (Italie)
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

export const AZZURRIA_D1: Club[] = [
  club("inter-milana",    "Inter Milana",               "INT", "Milana",     "San Siro",              80018, 1908, "azzurria", "serie-a-azzurria",["#0068A8","#000000","#FFFFFF"], 87, 150_000_000, 82, "Simone Inzaghi"),
  club("juventus-torina", "Juventus Torina",            "JUV", "Torina",     "Allianz Arena Torina",  41507, 1897, "azzurria", "serie-a-azzurria",["#FFFFFF","#000000","#D4AF37"], 85, 160_000_000, 85, "Thiago Motta"),
  club("ac-milana",       "AC Milana",                  "ACM", "Milana",     "San Siro",              80018, 1899, "azzurria", "serie-a-azzurria",["#FB090B","#000000","#FFFFFF"], 83, 130_000_000, 80, "Paulo Fonseca"),
  club("ssc-napolia",     "SSC Napolia",                "NAP", "Napolia",    "Diego Armando Maradona",54726, 1926, "azzurria", "serie-a-azzurria",["#12A0D7","#FFFFFF","#000000"], 84, 140_000_000, 76, "Antonio Conte"),
  club("atalanta-berg",   "Atalanta Bergama",           "ATA", "Bergama",    "Gewiss Arena",          24950, 1907, "azzurria", "serie-a-azzurria",["#1D71B8","#000000","#FFFFFF"], 81, 100_000_000, 78, "Gian Piero Gasperini"),
  club("as-roma",         "AS Roma",                    "ROM", "Roma",       "Stadio Olimpico",       70634, 1927, "azzurria", "serie-a-azzurria",["#8E1F2F","#F0BC42","#FFFFFF"], 80, 110_000_000, 74, "Daniele De Rossi"),
  club("ss-lazia",        "SS Lazia",                   "LAZ", "Roma",       "Stadio Olimpico",       70634, 1900, "azzurria", "serie-a-azzurria",["#FFFFFF","#87CEEB","#000000"], 79, 80_000_000, 68, "Igor Tudor"),
  club("acf-fiorentina",  "ACF Fiorentina",             "FIO", "Fiorenza",   "Artemio Franchi",       43147, 1926, "azzurria", "serie-a-azzurria",["#482B7C","#FFFFFF","#E40046"], 78, 70_000_000, 72, "Raffaele Palladino"),
  club("bologna-calc",    "Bologna Calcio",             "BOL", "Bolona",     "Renato Dall'Ara",       38279, 1909, "azzurria", "serie-a-azzurria",["#1A2F56","#A2001D","#FFFFFF"], 77, 60_000_000, 66, "Vincenzo Italiano"),
  club("torino-calc",     "Torino Calcio",              "TOR", "Torina",     "Stadio Olimpico Grande",28177, 1906, "azzurria", "serie-a-azzurria",["#6B1D2A","#FFFFFF","#FDB913"], 74, 40_000_000, 62, "Ivan Juric"),
  club("udinese-calc",    "Udinese Calcio",             "UDI", "Udina",      "Bluenergy Arena",       25132, 1896, "azzurria", "serie-a-azzurria",["#FFFFFF","#000000","#FFFFFF"], 73, 35_000_000, 60, "Andrea Sottil"),
  club("genoa-calc",      "Genoa Calcio",               "GEN", "Genova",     "Luigi Ferraris",        36536, 1893, "azzurria", "serie-a-azzurria",["#DB0030","#003DA5","#FFFFFF"], 72, 32_000_000, 62, "Alberto Gilardino"),
  club("cagliari-calc",   "Cagliari Calcio",            "CAG", "Cagliari",   "Unipol Domus",          16416, 1920, "azzurria", "serie-a-azzurria",["#DB0030","#003DA5","#FFFFFF"], 71, 28_000_000, 58, "Davide Nicola"),
  club("us-leccia",       "US Leccia",                  "LEC", "Leccia",     "Via del Mare",          33876, 1908, "azzurria", "serie-a-azzurria",["#FFC72C","#E4002B","#FFFFFF"], 70, 22_000_000, 54, "Luca Gotti"),
  club("empoli-calc",     "Empoli Calcio",              "EMP", "Empolia",    "Carlo Castellani",      16284, 1920, "azzurria", "serie-a-azzurria",["#005BA6","#FFFFFF","#000000"], 69, 18_000_000, 56, "Roberto D'Aversa"),
  club("hellas-verona",   "Hellas Verona",              "HEL", "Verona",     "Bentegodi",             39211, 1903, "azzurria", "serie-a-azzurria",["#FFCB05","#003DA5","#FFFFFF"], 68, 20_000_000, 54, "Marco Baroni"),
  club("sassuola-us",     "US Sassuola",                "SAS", "Sassuola",   "Mapei Arena",           21584, 1920, "azzurria", "serie-a-azzurria",["#00A651","#000000","#FFFFFF"], 67, 22_000_000, 64, "Fabio Grosso"),
  club("parma-calc",      "Parma Calcio",               "PAR", "Parma",      "Ennio Tardini",         27906, 1913, "azzurria", "serie-a-azzurria",["#FFFFFF","#FFD700","#003DA5"], 67, 24_000_000, 60, "Fabio Pecchia"),
  club("como-calc",       "Como Calcio",                "COM", "Coma",       "Sinigaglia",            13602, 1907, "azzurria", "serie-a-azzurria",["#0073CF","#FFFFFF","#000000"], 66, 18_000_000, 50, "Cesc Fabregas"),
  club("venezia-calc",    "Venezia Calcio",             "VEN", "Venezia",    "Stadio Penzo",          11150, 1907, "azzurria", "serie-a-azzurria",["#004D40","#FF6F00","#000000"], 65, 16_000_000, 48, "Eusebio Di Francesco"),
];
