/**
 * FC CAREER — Clubs d'Albion (Angleterre)
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
