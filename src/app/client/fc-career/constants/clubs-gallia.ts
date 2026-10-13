/**
 * FC CAREER — Clubs de Gallia (France)
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

export const GALLIA_D1: Club[] = [
  club("paris-gallia",    "Paris Gallia FC",           "PGF", "Paris",      "Parc des Lumières",     47929, 1970, "gallia", "elite-gallia", ["#004170","#DA291C","#FFFFFF"], 95, 220_000_000, 78, "Luis Enrique"),
  club("oly-marsalia",    "Olympique de Marsalia",     "OMA", "Marsalia",   "Stade Vélodrome",       67394, 1899, "gallia", "elite-gallia", ["#2FAEE0","#FFFFFF","#1B2A5B"], 84, 90_000_000, 68, "Roberto De Zerbi"),
  club("oly-lyonais",     "Olympique Lyonais",         "OLY", "Lyona",      "Groupama Arena",        59186, 1950, "gallia", "elite-gallia", ["#DA1F42","#1B4A9E","#FFFFFF"], 82, 85_000_000, 85, "Pierre Sage"),
  club("rc-lensois",      "RC Lensois",                "RCL", "Lensa",      "Stade Bollaert",        38223, 1906, "gallia", "elite-gallia", ["#FFDE00","#E4032E","#000000"], 81, 45_000_000, 70, "Will Still"),
  club("stade-renais",    "Stade Renais",              "SRF", "Renia",      "Roazhon Park",          29778, 1901, "gallia", "elite-gallia", ["#E4032E","#000000","#FFFFFF"], 80, 50_000_000, 74, "Habib Beye"),
  club("stade-brestien",  "Stade Brestien",            "SB2", "Bresta",     "Stade Francis-Le Blé",  15931, 1950, "gallia", "elite-gallia", ["#E4032E","#FFFFFF","#000000"], 78, 22_000_000, 58, "Eric Roy"),
  club("as-monega",       "AS Monéga",                 "ASM", "Monéga",     "Stade Louis-II",        18541, 1924, "gallia", "elite-gallia", ["#E4032E","#FFFFFF","#FFD100"], 77, 100_000_000, 88, "Adi Hütter"),
  club("ogc-nissart",     "OGC Nissart",               "OGC", "Nissa",      "Allianz Riviera",       35612, 1904, "gallia", "elite-gallia", ["#C8102E","#000000","#FFFFFF"], 76, 55_000_000, 72, "Franck Haise"),
  club("losc-lillois",    "LOSC Lillois",              "LIL", "Lilla",      "Decathlon Arena",       50186, 1944, "gallia", "elite-gallia", ["#E01E28","#0B3FA8","#FFFFFF"], 76, 60_000_000, 76, "Bruno Genesio"),
  club("fc-nantais",      "FC Nantais",                "FCN", "Nantia",     "Stade de la Beaujoire", 37443, 1943, "gallia", "elite-gallia", ["#FFE900","#009461","#FFFFFF"], 74, 25_000_000, 71, "Antoine Kombouaré"),
  club("girondins-bord",  "Girondins de Bordélia",     "GDB", "Bordélia",   "Stade Matmut",          42115, 1881, "gallia", "elite-gallia", ["#1B4A9E","#FFFFFF","#E4032E"], 73, 28_000_000, 75, "Albert Riera"),
  club("rc-strasb",       "RC Strasbourgien",          "RCS", "Strasbourg", "Stade de la Meinau",    29230, 1906, "gallia", "elite-gallia", ["#009FE3","#FFFFFF","#000000"], 72, 35_000_000, 66, "Liam Rosenior"),
  club("montpelier-hsc",  "Montpelier HSC",            "MHS", "Montpelia",  "Stade de la Mosson",    17256, 1974, "gallia", "elite-gallia", ["#E4032E","#005EB8","#FFFFFF"], 71, 22_000_000, 67, "Jean-Louis Gasset"),
  club("stade-reimois",   "Stade Reimois",             "SDR", "Reima",      "Stade Auguste-Delaune", 21628, 1931, "gallia", "elite-gallia", ["#E4032E","#FFFFFF","#000000"], 70, 30_000_000, 73, "Luka Elsner"),
  club("fc-tolosain",     "FC Tolosain",               "TFC", "Tolosa",     "Stadium de Tolosa",     33150, 1970, "gallia", "elite-gallia", ["#5F259F","#FFFFFF","#EF7D00"], 69, 28_000_000, 68, "Carles Martínez"),
  club("havre-athletic",  "Havre Athletic",            "HAC", "Le Havra",   "Stade Océane",          25178, 1872, "gallia", "elite-gallia", ["#005EB8","#FFFFFF","#87CEEB"], 68, 15_000_000, 64, "Didier Digard"),
  club("rc-lorientais",   "RC Lorientais",             "RCO", "Lorienta",   "Stade du Moustoir",     18890, 1926, "gallia", "elite-gallia", ["#E4032E","#FFFFFF","#1B4A9E"], 67, 18_000_000, 62, "Oriol Romeu"),
  club("clermont-ath",    "Clermont Athletic",         "CLA", "Clermontia", "Stade Gabriel Montpied",10007, 1911, "gallia", "elite-gallia", ["#8A1538","#005EB8","#FFFFFF"], 66, 14_000_000, 59, "Pascal Gastien"),
];

export const GALLIA_D2: Club[] = [
  club("as-saint-eth",    "AS Saint-Étiennia",         "ASS", "Saint-Étiennia","Stade Geoffroy",     41965, 1933, "gallia", "gallia-seconde",["#00A651","#FFFFFF","#000000"], 72, 35_000_000, 70, "Olivier Dall'Oglio"),
  club("sm-caenia",       "SM Caenia",                 "SMC", "Caenia",     "Stade d'Ornano",        21211, 1913, "gallia", "gallia-seconde",["#E4032E","#000000","#FFFFFF"], 55, 12_000_000, 65, "Nicolas Seube"),
  club("guingamp-av",     "En Avant Guingampia",       "EAG", "Guingampia", "Stade du Roudourou",    18371, 1912, "gallia", "gallia-seconde",["#E4032E","#FFFFFF","#005EB8"], 56, 13_000_000, 66, "Sylvain Didot"),
  club("stade-lavall",    "Stade Lavallois",           "SLV", "Lavalla",    "Stade Le Basser",       11418, 1902, "gallia", "gallia-seconde",["#E4032E","#FFFFFF","#000000"], 50, 8_000_000, 55, "Olivier Frapolli"),
  club("amiens-sc",       "Amiens Sporting",           "AMI", "Amiéna",     "Stade de la Licorne",   12999, 1901, "gallia", "gallia-seconde",["#E4032E","#FFFFFF","#000000"], 51, 9_000_000, 60, "Omar Dahleb"),
  club("pau-fc",          "Pau FC",                    "PAU", "Pau",        "Stade du Hameau",        18320, 1959, "gallia", "gallia-seconde",["#E4032E","#FFFFFF","#005EB8"], 48, 7_000_000, 50, "Bruno Irles"),
  club("annecy-fc",       "FC Annecy",                 "FCA", "Annecia",    "Parc des Sports",       15660, 1927, "gallia", "gallia-seconde",["#E4032E","#FFFFFF","#00A651"], 48, 7_000_000, 52, "Laurent Guyot"),
  club("auxerre-aj",      "AJ Auxerria",               "AJA", "Auxerria",   "Stade Abbé-Deschamps",  21379, 1905, "gallia", "gallia-seconde",["#000000","#FFFFFF","#E4032E"], 57, 16_000_000, 61, "Christophe Pélissier"),
  club("paris-fc",        "Paris FC",                  "PFC", "Paris",      "Stade Charléty",        19988, 1969, "gallia", "gallia-seconde",["#00A651","#FFFFFF","#E4032E"], 54, 14_000_000, 59, "Stéphane Gilli"),
  club("angers-sco",      "Angeria SCO",               "SCO", "Angeria",    "Stade Raymond-Kopa",    18752, 1906, "gallia", "gallia-seconde",["#000000","#FFFFFF","#E4032E"], 57, 17_000_000, 60, "Alexandre Dujeux"),
];
