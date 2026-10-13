/**
 * FC CAREER — Univers Fictif : 96+ clubs répartis sur 5 pays
 * Noms inspirés du réel, légèrement modifiés (style PES/eFootball).
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

// ═══════════════════════════════════════════════════════════════
// 🇫🇷 GALLIA (France)
// ═══════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════
// 🏴󠁧󠁢󠁥󠁮󠁧󠁿 ALBION (Angleterre)
// ═══════════════════════════════════════════════════════════════

export const ALBION_D1: Club[] = [
  club("man-cityzens",    "Manchester Cityzens",        "MCI", "Manchester", "Etihad Arena",          55017, 1880, "albion", "premier-albion",["#6CABDD","#FFFFFF","#1C2C5B"], 93, 250_000_000, 85, "Pep Guardiola"),
  club("arsenwall",       "Arsenwall FC",               "ARS", "Londra",     "Emirates Arena",        60704, 1886, "albion", "premier-albion",["#EF0107","#FFFFFF","#063672"], 90, 180_000_000, 88, "Mikel Arteta"),
  club("liverport",       "Liverport FC",               "LIV", "Liverport",  "Anfield Road",          61276, 1892, "albion", "premier-albion",["#C8102E","#FFFFFF","#00B2A9"], 89, 170_000_000, 82, "Arne Slot"),
  club("man-reds",        "Manchester Reds",            "MRE", "Manchester", "Old Trafford",          74310, 1878, "albion", "premier-albion",["#DA291C","#FFFFFF","#FBE122"], 87, 200_000_000, 80, "Ruben Amorim"),
  club("cheltown",        "Cheltown FC",                "CHE", "Londra",     "Stamford Bridge",       40341, 1905, "albion", "premier-albion",["#034694","#FFFFFF","#DBA111"], 84, 180_000_000, 78, "Enzo Maresca"),
  club("totbury",         "Totbury Hotspur",            "TOT", "Londra",     "Totbury Stadium",       62850, 2019, "albion", "premier-albion",["#FFFFFF","#132257","#FFFFFF"], 83, 150_000_000, 76, "Ange Postecoglou"),
  club("newford-utd",     "Newford United",             "NEW", "Newford",    "St. James' Park",       52305, 1892, "albion", "premier-albion",["#241F20","#FFFFFF","#41B6E6"], 82, 140_000_000, 70, "Eddie Howe"),
  club("asbury-villa",    "Asbury Villa",               "AVL", "Birmington","Villa Park",            42657, 1874, "albion", "premier-albion",["#670E36","#95BFE5","#FFFFFF"], 80, 120_000_000, 74, "Unai Emery"),
  club("west-borough",    "West Borough",               "WHU", "Londra",     "Londra Stadium",        62500, 1895, "albion", "premier-albion",["#7A263A","#1BB1E7","#F3D459"], 78, 100_000_000, 65, "Julen Lopetegui"),
  club("brighton-rov",    "Brighton Rovers",            "BHA", "Brightona",  "Amex Arena",            31800, 1901, "albion", "premier-albion",["#0057B8","#FFFFFF","#FFCD00"], 77, 90_000_000, 72, "Fabian Hürzeler"),
  club("wolverton",       "Wolverton Wanderers",        "WOL", "Wolverton",  "Molineux Arena",        31750, 1877, "albion", "premier-albion",["#FDB913","#231F20","#FFFFFF"], 76, 80_000_000, 68, "Gary O'Neil"),
  club("crystal-town",    "Crystal Town",               "CRY", "Londra",     "Selhurst Park",         25486, 1905, "albion", "premier-albion",["#1B458F","#C4122E","#FFFFFF"], 75, 70_000_000, 64, "Oliver Glasner"),
  club("fulborough",      "Fulborough FC",              "FUL", "Londra",     "Craven Cottage",        25700, 1879, "albion", "premier-albion",["#FFFFFF","#000000","#CC0000"], 74, 65_000_000, 62, "Marco Silva"),
  club("evermere",        "Evermere FC",                "EVE", "Liverport",  "Goodison Park",         39414, 1878, "albion", "premier-albion",["#003399","#FFFFFF","#FFD700"], 74, 60_000_000, 66, "Sean Dyche"),
  club("brentwick",       "Brentwick FC",               "BRE", "Londra",     "Gtech Arena",           17250, 1889, "albion", "premier-albion",["#E30613","#FFFFFF","#FBB800"], 73, 55_000_000, 60, "Thomas Frank"),
  club("bournecastle",    "Bournecastle",               "BOU", "Bourna",     "Vitality Arena",        11307, 1899, "albion", "premier-albion",["#DA291C","#000000","#FFFFFF"], 72, 50_000_000, 58, "Andoni Iraola"),
  club("nottingford",     "Nottingford Forest",         "NOT", "Nottingford","City Ground",           30445, 1865, "albion", "premier-albion",["#DD0000","#FFFFFF","#000000"], 71, 55_000_000, 62, "Nuno Espírito Santo"),
  club("ipston-town",     "Ipston Town",                "IPS", "Ipston",     "Portman Road",          30311, 1878, "albion", "premier-albion",["#3A64A3","#FFFFFF","#E4002B"], 68, 35_000_000, 56, "Kieran McKenna"),
  club("leighton-fc",     "Leighton FC",                "LEI", "Leighton",   "King Power Arena",      32261, 1884, "albion", "premier-albion",["#003090","#FDBE11","#FFFFFF"], 67, 40_000_000, 64, "Steve Cooper"),
  club("southton",        "Southton FC",                "SOU", "Southton",   "St Mary's Arena",       32384, 1885, "albion", "premier-albion",["#D71920","#FFFFFF","#130C0E"], 65, 30_000_000, 60, "Russell Martin"),
];

export const ALBION_D2: Club[] = [
  club("leeds-city",      "Leeds City",                 "LEE", "Leeds",      "Elland Road",           37890, 1919, "albion", "albion-championship",["#FFFFFF","#1D428A","#FFD700"], 72, 45_000_000, 72, "Daniel Farke"),
  club("burnwick",        "Burnwick FC",                "BUR", "Burnwick",   "Turf Moor",             21944, 1882, "albion", "albion-championship",["#6C1D45","#99D6EA","#FFFFFF"], 68, 30_000_000, 62, "Scott Parker"),
  club("shefford-utd",    "Shefford United",            "SHU", "Shefford",   "Bramall Lane",          32050, 1889, "albion", "albion-championship",["#EE2737","#FFFFFF","#000000"], 66, 25_000_000, 60, "Chris Wilder"),
  club("lutonbury",       "Lutonbury Town",             "LUT", "Lutonbury",  "Kenilworth Arena",      10356, 1885, "albion", "albion-championship",["#F78F1E","#FFFFFF","#002D62"], 62, 18_000_000, 56, "Rob Edwards"),
  club("norford-city",    "Norford City",               "NOR", "Norford",    "Carrow Road",           27244, 1902, "albion", "albion-championship",["#00A650","#FFF200","#000000"], 64, 22_000_000, 66, "David Wagner"),
  club("sunderwick",      "Sunderwick AFC",             "SUN", "Sunderwick","Stadium of Light",      49000, 1879, "albion", "albion-championship",["#EB172B","#FFFFFF","#211E1F"], 66, 28_000_000, 64, "Régis Le Bris"),
  club("midlands-boro",   "Midlands Borough",           "MID", "Middlesboro","Riverside Arena",       34742, 1876, "albion", "albion-championship",["#E4002B","#FFFFFF","#000000"], 60, 20_000_000, 58, "Michael Carrick"),
  club("stoketon",        "Stoketon City",              "STO", "Stoketon",   "bet365 Arena",          30089, 1863, "albion", "albion-championship",["#E03A3E","#1B449C","#FFFFFF"], 58, 16_000_000, 54, "Steven Schumacher"),
];

export const ALBION_D3: Club[] = [
  club("birmington-city", "Birmington City",            "BIR", "Birmington","St Andrew's",           29409, 1875, "albion", "albion-league-one",["#0000FF","#FFFFFF","#CD0000"], 60, 15_000_000, 56, "Tony Mowbray"),
  club("charlwick",       "Charlwick Athletic",         "CHA", "Londra",     "The Valley",            27111, 1905, "albion", "albion-league-one",["#D50032","#FFFFFF","#000000"], 54, 10_000_000, 50, "Nathan Jones"),
  club("readington",      "Readington FC",              "REA", "Readington","Select Car Leasing",    24161, 1871, "albion", "albion-league-one",["#004494","#FFFFFF","#FFD700"], 56, 12_000_000, 54, "Rubén Sellés"),
  club("portsmorth",      "Portsmorth FC",              "POR", "Portsmorth","Fratton Park",          20688, 1898, "albion", "albion-league-one",["#001489","#FFFFFF","#BF0D3E"], 55, 10_000_000, 52, "John Mousinho"),
  club("derbyshire",      "Derbyshire County",          "DER", "Derbyshire","Pride Park",            33597, 1884, "albion", "albion-league-one",["#FFFFFF","#000000","#FFD700"], 58, 14_000_000, 56, "Paul Warne"),
  club("oxfield-utd",     "Oxfield United",             "OXF", "Oxfield",   "Kassam Arena",          12500, 1893, "albion", "albion-league-one",["#FEE11A","#00205B","#FFFFFF"], 48, 6_000_000, 46, "Des Buckingham"),
];

export const ALBION_D4: Club[] = [
  club("wrecksham",       "Wrecksham AFC",              "WRE", "Wrecksham",  "Racecourse Ground",     10771, 1864, "albion", "albion-league-two",["#FF0000","#FFFFFF","#000000"], 52, 8_000_000, 48, "Phil Parkinson"),
  club("mansford-town",   "Mansford Town",              "MAN", "Mansford",   "One Call Arena",        10000, 1897, "albion", "albion-league-two",["#FFC72C","#003DA5","#FFFFFF"], 46, 4_000_000, 42, "Nigel Clough"),
  club("crawwick-town",   "Crawwick Town",              "CRA", "Crawwick",   "Broadfield Arena",      6134, 1896, "albion", "albion-league-two",["#FF0000","#FFFFFF","#000000"], 44, 3_000_000, 40, "Scott Lindsey"),
  club("gillingham-fc",   "Gillingham FC",              "GIL", "Gillingham", "Priestfield Arena",     11582, 1893, "albion", "albion-league-two",["#0000FF","#FFFFFF","#000000"], 45, 3_500_000, 42, "Stephen Clemence"),
  club("doncaster-rov",   "Doncaster Rovers",           "DON", "Doncaster",  "Eco-Power Arena",       15231, 1879, "albion", "albion-league-two",["#FF0000","#FFFFFF","#000000"], 46, 4_000_000, 44, "Grant McCann"),
  club("harrowgate",      "Harrowgate Town",            "HAR", "Harrowgate", "Wetherby Road",         5000, 1914, "albion", "albion-league-two",["#FFC72C","#000000","#FFFFFF"], 42, 2_500_000, 38, "Simon Weaver"),
];

// ═══════════════════════════════════════════════════════════════
// 🇪🇸 CASTILLA (Espagne)
// ═══════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════
// 🇩🇪 GERMANIA (Allemagne)
// ═══════════════════════════════════════════════════════════════

export const GERMANIA_D1: Club[] = [
  club("bayern-munich",   "Bayern Münich",              "BAY", "Münich",     "Allianz Arena",         75024, 1900, "germania", "bundesliga",["#DC052D","#FFFFFF","#0066B2"], 91, 260_000_000, 92, "Vincent Kompany"),
  club("bor-dortheim",    "Borussia Dortheim",          "BVB", "Dortheim",   "Signal Iduna Park",     81365, 1909, "germania", "bundesliga",["#FDE100","#000000","#FFFFFF"], 84, 140_000_000, 85, "Nuri Şahin"),
  club("bayer-levk",      "Bayer Leverkusen",           "B04", "Leverkusen", "BayArena",              30210, 1904, "germania", "bundesliga",["#E32221","#000000","#FFFFFF"], 84, 130_000_000, 78, "Xabi Alonso"),
  club("rb-leipzich",     "RB Leipzich",                "RBL", "Leipzich",   "Red Bull Arena",        47069, 2009, "germania", "bundesliga",["#DD0741","#FFFFFF","#001F47"], 82, 120_000_000, 75, "Marco Rose"),
  club("vfb-stuttgard",   "VfB Stuttgard",              "VFB", "Stuttgard",  "MHPArena",              60449, 1893, "germania", "bundesliga",["#FFFFFF","#E32219","#000000"], 78, 60_000_000, 72, "Sebastian Hoeneß"),
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

// ═══════════════════════════════════════════════════════════════
// 🇮🇹 AZZURRIA (Italie)
// ═══════════════════════════════════════════════════════════════

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
  club("torino-calc",     "Torino Calcio",              "TOR", "Torina",     "Stadio Olimpico Grande",28177, 1906, "azzurria", "serie-a-azzurria",["#6B1D2A","#FFFFFF","#FDB913"], 74, 40_000_000, 62, "Ivan Jurić"),
  club("udinese-calc",    "Udinese Calcio",             "UDI", "Udina",      "Bluenergy Arena",       25132, 1896, "azzurria", "serie-a-azzurria",["#FFFFFF","#000000","#FFFFFF"], 73, 35_000_000, 60, "Andrea Sottil"),
  club("genoa-calc",      "Genoa Calcio",               "GEN", "Genova",     "Luigi Ferraris",        36536, 1893, "azzurria", "serie-a-azzurria",["#DB0030","#003DA5","#FFFFFF"], 72, 32_000_000, 62, "Alberto Gilardino"),
  club("cagliari-calc",   "Cagliari Calcio",            "CAG", "Cagliari",   "Unipol Domus",          16416, 1920, "azzurria", "serie-a-azzurria",["#DB0030","#003DA5","#FFFFFF"], 71, 28_000_000, 58, "Davide Nicola"),
  club("us-leccia",       "US Leccia",                  "LEC", "Leccia",     "Via del Mare",          33876, 1908, "azzurria", "serie-a-azzurria",["#FFC72C","#E4002B","#FFFFFF"], 70, 22_000_000, 54, "Luca Gotti"),
  club("empoli-calc",     "Empoli Calcio",              "EMP", "Empolia",    "Carlo Castellani",      16284, 1920, "azzurria", "serie-a-azzurria",["#005BA6","#FFFFFF","#000000"], 69, 18_000_000, 56, "Roberto D'Aversa"),
  club("hellas-verona",   "Hellas Verona",              "HEL", "Verona",     "Bentegodi",             39211, 1903, "azzurria", "serie-a-azzurria",["#FFCB05","#003DA5","#FFFFFF"], 68, 20_000_000, 54, "Marco Baroni"),
  club("sassuola-us",     "US Sassuola",                "SAS", "Sassuola",   "Mapei Arena",           21584, 1920, "azzurria", "serie-a-azzurria",["#00A651","#000000","#FFFFFF"], 67, 22_000_000, 64, "Fabio Grosso"),
  club("parma-calc",      "Parma Calcio",               "PAR", "Parma",      "Ennio Tardini",         27906, 1913, "azzurria", "serie-a-azzurria",["#FFFFFF","#FFD700","#003DA5"], 67, 24_000_000, 60, "Fabio Pecchia"),
  club("como-calc",       "Como Calcio",                "COM", "Coma",       "Sinigaglia",            13602, 1907, "azzurria", "serie-a-azzurria",["#0073CF","#FFFFFF","#000000"], 66, 18_000_000, 50, "Cesc Fàbregas"),
  club("venezia-calc",    "Venezia Calcio",             "VEN", "Venezia",    "Stadio Penzo",          11150, 1907, "azzurria", "serie-a-azzurria",["#004D40","#FF6F00","#000000"], 65, 16_000_000, 48, "Eusebio Di Francesco"),
];

// ═══════════════════════════════════════════════════════════════
// EXPORTS AGRÉGÉS
// ═══════════════════════════════════════════════════════════════

export const ALL_CLUBS: Club[] = [
  ...GALLIA_D1, ...GALLIA_D2,
  ...ALBION_D1, ...ALBION_D2, ...ALBION_D3, ...ALBION_D4,
  ...CASTILLA_D1,
  ...GERMANIA_D1,
  ...AZZURRIA_D1,
];

export const CLUBS_BY_ID: Record<string, Club> = Object.fromEntries(
  ALL_CLUBS.map((c) => [c.id, c]),
);

export function getClub(id: string): Club | undefined {
  return CLUBS_BY_ID[id];
}

export function getClubsByDivision(division: Division): Club[] {
  return ALL_CLUBS.filter((c) => c.division === division);
}

export function getClubsByCountry(country: Country): Club[] {
  return ALL_CLUBS.filter((c) => c.country === country);
}

/** Clubs accessibles au joueur en début de carrière selon le pays choisi. */
export function getStartingClubs(country: Country): Club[] {
  return getClubsByCountry(country);
}
