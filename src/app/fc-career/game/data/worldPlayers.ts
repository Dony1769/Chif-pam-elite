/**
 * FC CAREER — Joueurs du monde
 * Génération procédurale déterministe : 64 clubs × ~18 joueurs ≈ 1 150 joueurs.
 * Chaque joueur a : identité, attributs, personnalité, statistiques, état physique.
 * Seed basée sur le clubId → reproductible à chaque build.
 */

import { CLUBS } from "./world";
import type { Club } from "../domain/club";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorldPlayerPosition = "GK" | "CB" | "LB" | "RB" | "DM" | "CM" | "AM" | "LW" | "RW" | "ST";

export type WorldPlayerPersonality =
  | "leader"       // capitaine naturel, motive l'équipe
  | "genius"       // génie technique imprévisible
  | "warrior"      // combatif, jamais abandonné
  | "showman"      // aime les projecteurs, performe sous pression
  | "introvert"    // discret mais fiable
  | "volatile"     // brillant mais inconsistant
  | "veteran"      // expérience, décline physiquement mais malin
  | "prodigy"      // très jeune, potentiel énorme
  | "journeyman";  // routinier, solid mais sans éclat

export interface WorldPlayerInjury {
  type: string;
  severity: "minor" | "moderate" | "severe";
  weeksRemaining: number;
}

export interface WorldPlayerSeasonStats {
  season: number;
  goals: number;
  assists: number;
  appearances: number;
  avgRating: number;
  yellowCards: number;
  redCards: number;
}

export interface WorldPlayer {
  id: string;
  clubId: string;
  leagueId: string;
  countryId: string;
  firstName: string;
  lastName: string;
  age: number;
  nationality: string;
  position: WorldPlayerPosition;
  overall: number;
  potential: number;
  personality: WorldPlayerPersonality;
  /** Traits spéciaux — peuvent être vides */
  traits: string[];
  /** 0-100 */
  form: number;
  fatigue: number;
  morale: number;
  injury: WorldPlayerInjury | null;
  /** Stats carrière */
  careerGoals: number;
  careerAssists: number;
  careerAppearances: number;
  /** Stats saison courante */
  seasonStats: WorldPlayerSeasonStats[];
  /** Valeur marchande estimée (€) */
  marketValue: number;
  /** Contrat — semaines restantes */
  contractWeeksLeft: number;
  /** Joueur contrôlé par l'utilisateur : le monde ne le met pas à la retraite */
  protected?: boolean;
  /** Carte : VIT, TIR, PAS, DRI, DÉF, PHY (vrais joueurs et joueurs générés du monde CP) */
  face?: { pac: number; sho: number; pas: number; dri: number; def: number; phy: number };
  /** Pied faible et gestes techniques (1-5) */
  weakFoot?: number;
  skillMoves?: number;
  /** PlayStyles (identifiants) et PlayStyles+ */
  playStyles?: string[];
  playStylesPlus?: string[];
  /** Pied fort */
  foot?: "left" | "right";
  /** Régénéré de ce joueur retraité */
  regenOf?: string;
  /** Jour de l'anniversaire dans l'année (1-365) */
  birthDay?: number;
  /** Note à chaque poste connu (joueur de l'utilisateur) : remplace la compatibilité générique */
  posRatings?: Partial<Record<WorldPlayerPosition, number>>;
}

// ─── Générateur RNG déterministe (LCG simple) ────────────────────────────────

function mkRng(seed: string) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) {
    s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return {
    next(): number {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0xffffffff;
    },
    int(min: number, max: number): number {
      return Math.floor(this.next() * (max - min + 1)) + min;
    },
    pick<T>(arr: T[]): T {
      return arr[Math.floor(this.next() * arr.length)];
    },
    bool(prob = 0.5): boolean {
      return this.next() < prob;
    },
  };
}

// ─── Banques de prénoms / noms par région ────────────────────────────────────

const NAMES_BY_REGION: Record<string, { first: string[]; last: string[] }> = {
  valtara: {
    first: ["Aiden","Caden","Ethan","Luca","Owen","Finn","Declan","Rowan","Jaxon","Marcus",
             "Sebastian","Tristan","Caleb","Nolan","Elliot","Remy","Cole","Jasper","Leo","Miles",
             "Griffin","Spencer","Archer","Orion","Felix","Theo","Dorian","Emmet","Quinn","Blake"],
    last:  ["Harrow","Stormfield","Mercer","Ashford","Caldwell","Dunmore","Everett","Fentham",
             "Grayson","Holbrook","Ingram","Jenner","Kessler","Langley","Montrose","Norwood",
             "Pemberton","Quince","Radcliff","Stratton","Townsend","Ulrich","Vance","Whitmore"],
  },
  corenthia: {
    first: ["Mateo","Alejandro","Diego","Carlos","Rafael","Javier","Sergio","Pablo","Ricardo","Eduardo",
             "Fernando","Miguel","Andres","Bruno","Raul","Ivan","Omar","Victor","Ruben","Emilio",
             "Cesar","Hector","Jorge","Luis","Marco","Nico","Pedro","Ricky","Salvador","Tomas"],
    last:  ["Varela","Herrera","Castillo","Morales","Ramos","Guerrero","Delgado","Fuentes","Ibarra",
             "Jimenez","Lozano","Medina","Navarro","Ortega","Paredes","Quiroga","Romero","Salazar",
             "Tapia","Uribe","Villanueva","Zabala","Arroyo","Bonilla","Cordero"],
  },
  solendra: {
    first: ["Giovanni","Marco","Luca","Matteo","Lorenzo","Federico","Simone","Alessandro","Riccardo",
             "Filippo","Antonio","Claudio","Daniele","Emanuele","Fabio","Giacomo","Leonardo","Nicola",
             "Roberto","Stefano","Valentino","Andrea","Cristiano","Davide","Enrico","Franco","Giulio"],
    last:  ["Conti","Ferrari","Ferrara","Greco","Lombardi","Marino","Marini","Mazza","Pellegrini",
             "Rinaldi","Romano","Rossi","Russo","Sanna","Serra","Silvestri","Sorrentino","Testa",
             "Vitale","Volterra","Amato","Barbieri","Colombo","De Luca","Esposito"],
  },
  nordheim: {
    first: ["Erik","Lars","Bjorn","Mikkel","Anders","Johan","Sven","Tobias","Magnus","Rasmus",
             "Henrik","Karl","Nils","Olaf","Petter","Rune","Sigurd","Tomas","Ulf","Viktor",
             "Wilhelm","Axel","Casper","Dag","Emil","Finn","Gustav","Hans","Ivar","Jonas"],
    last:  ["Berg","Dahl","Eirik","Halvorsen","Jensen","Karlsson","Lindberg","Magnusson","Nielsen",
             "Olsen","Petersen","Qvist","Rasmussen","Svensson","Thorsen","Ulfsson","Voss","Wallén",
             "Aasen","Bjornstad","Christensen","Danielsen","Eriksen","Fjelstad","Gundersen"],
  },
};

// ─── Positions par rôle ───────────────────────────────────────────────────────

const SQUAD_TEMPLATE: WorldPlayerPosition[] = [
  "GK","GK",
  "CB","CB","CB","LB","RB",
  "DM","DM","CM","CM","AM",
  "LW","RW","ST","ST","ST","AM",
];

const POSITION_LABELS: Record<WorldPlayerPosition, string> = {
  GK: "GB", CB: "DC", LB: "DG", RB: "DD", DM: "MDC",
  CM: "MC", AM: "MOC", LW: "AG", RW: "AD", ST: "AT",
};

// ─── Traits selon personnalité ────────────────────────────────────────────────

const PERSONALITY_TRAITS: Record<WorldPlayerPersonality, string[]> = {
  leader:    ["Capitaine", "Inspire l'équipe", "Sang-froid en finale"],
  genius:    ["Dribbleur d'élite", "Vision de jeu", "Imprévisible"],
  warrior:   ["Inépuisable", "Duel aérien", "Jamais blessé (ou presque)"],
  showman:   ["Performeur en grand match", "Buteur en Serie A", "Adore les projecteurs"],
  introvert: ["Fiable", "Passe décisive discrète", "Régulier"],
  volatile:  ["Génie ou catastrophe", "Carton rouge possible", "Très haut plafond"],
  veteran:   ["Lecture du jeu", "Endurance mentale", "Déclin physique"],
  prodigy:   ["Progression rapide", "Futur star", "Inexpérimenté"],
  journeyman:["Polyvalent", "Zéro ego", "Toujours disponible"],
};

// ─── Calcul d'attributs selon position et réputation du club ─────────────────

function overallForSlot(
  rng: ReturnType<typeof mkRng>,
  pos: WorldPlayerPosition,
  clubRep: number,
  slot: number,
  personality: WorldPlayerPersonality,
): { overall: number; potential: number } {
  // Titulaires (slots 0-10) plus forts que remplaçants (11-17)
  const isStarter = slot < 11;
  const base = Math.round(clubRep * 0.72 + rng.int(-8, 8));
  const clampedBase = Math.max(45, Math.min(94, isStarter ? base + rng.int(0, 6) : base - rng.int(0, 10)));

  let potential = clampedBase + rng.int(0, 12);
  if (personality === "prodigy") potential = Math.min(97, potential + rng.int(8, 16));
  if (personality === "veteran") potential = clampedBase; // déjà au max
  if (personality === "genius")  potential = Math.min(96, potential + rng.int(3, 8));

  return { overall: clampedBase, potential: Math.max(clampedBase, Math.min(99, potential)) };
}

// ─── Valeur marchande ────────────────────────────────────────────────────────

function computeMarketValue(overall: number, age: number, potential: number): number {
  const base = Math.pow(Math.max(0, overall - 50), 2.3) * 1200;
  const ageFactor = age <= 22 ? 1.6 : age <= 27 ? 1.2 : age <= 31 ? 0.9 : 0.5;
  const potFactor = potential - overall >= 8 ? 1.3 : 1;
  return Math.round(base * ageFactor * potFactor / 10000) * 10000;
}

// ─── Génération d'un joueur ───────────────────────────────────────────────────

function generatePlayer(
  club: Club,
  slot: number,
  seed: string,
): WorldPlayer {
  const rng = mkRng(seed);

  const region = club.countryId;
  const namePool = NAMES_BY_REGION[region] ?? NAMES_BY_REGION.valtara;
  const firstName = rng.pick(namePool.first);
  const lastName  = rng.pick(namePool.last);

  const position: WorldPlayerPosition = SQUAD_TEMPLATE[slot % SQUAD_TEMPLATE.length];

  const personalities: WorldPlayerPersonality[] = [
    "leader","genius","warrior","showman","introvert","volatile","veteran","prodigy","journeyman",
  ];
  const personality = rng.pick(personalities);

  // Âge selon personnalité et slot
  let age: number;
  if (personality === "prodigy") age = rng.int(17, 21);
  else if (personality === "veteran") age = rng.int(33, 39);
  else age = rng.int(20, 34);

  const { overall, potential } = overallForSlot(rng, position, club.reputation, slot, personality);

  // Traits — 1 à 3 selon personnalité
  const traitPool = PERSONALITY_TRAITS[personality];
  const traitCount = rng.int(1, Math.min(3, traitPool.length));
  const traits: string[] = [];
  const shuffled = [...traitPool].sort(() => rng.next() - 0.5);
  for (let i = 0; i < traitCount; i++) traits.push(shuffled[i]);

  // État physique
  const form    = rng.int(55, 95);
  const fatigue = rng.int(10, 60);
  const morale  = rng.int(50, 95);

  // Blessure (15% de chance, plus élevé pour volatile/veteran)
  const injuryProb = personality === "volatile" ? 0.22 : personality === "veteran" ? 0.18 : 0.12;
  let injury: WorldPlayerInjury | null = null;
  if (rng.bool(injuryProb)) {
    const injuryTypes = ["Muscle ischio-jambier","Entorse cheville","Genou (ligament)","Fracture pied","Commotion","Dos"];
    const severity = rng.pick<"minor"|"moderate"|"severe">(["minor","minor","moderate","moderate","severe"]);
    injury = {
      type: rng.pick(injuryTypes),
      severity,
      weeksRemaining: severity === "minor" ? rng.int(1,3) : severity === "moderate" ? rng.int(3,8) : rng.int(8,20),
    };
  }

  // Stats carrière
  const yearsPlayed = Math.max(1, age - 17);
  const gamesPerYear = position === "GK" ? 30 : rng.int(20, 36);
  const careerAppearances = yearsPlayed * gamesPerYear + rng.int(-10, 10);
  const goalsPerGame = position === "ST" ? rng.next() * 0.5 : position === "LW" || position === "RW" || position === "AM" ? rng.next() * 0.25 : rng.next() * 0.05;
  const careerGoals   = Math.round(careerAppearances * goalsPerGame);
  const careerAssists = Math.round(careerAppearances * goalsPerGame * 0.6 + rng.int(0, 20));

  // Stats saison en cours : toujours initialisées à zéro.
  // Les statistiques ne s'accumulent QUE via les résultats de matchs réels (updateWorldPlayerStats).
  // Les données historiques (careerGoals, etc.) représentent les saisons précédentes.

  return {
    id: `wp-${club.id}-${slot}`,
    clubId: club.id,
    leagueId: club.leagueId,
    countryId: club.countryId,
    firstName,
    lastName,
    age,
    nationality: region,
    position,
    overall,
    potential,
    personality,
    traits,
    form,
    fatigue,
    morale,
    injury,
    careerGoals,
    careerAssists,
    careerAppearances,
    seasonStats: [],          // ✅ Zéro stat au démarrage — seuls les matchs réels incrémentent
    marketValue: computeMarketValue(overall, age, potential),
    contractWeeksLeft: rng.int(20, 200),
  };
}

// ─── Génération de tout le monde ─────────────────────────────────────────────

let _cachedPlayers: WorldPlayer[] | null = null;

export function getAllWorldPlayers(): WorldPlayer[] {
  if (_cachedPlayers) return _cachedPlayers;

  const players: WorldPlayer[] = [];
  for (const club of CLUBS) {
    for (let slot = 0; slot < 18; slot++) {
      const seed = `${club.id}:slot${slot}:v1`;
      players.push(generatePlayer(club, slot, seed));
    }
  }
  _cachedPlayers = players;
  return players;
}

export function getPlayersByClub(clubId: string): WorldPlayer[] {
  return getAllWorldPlayers().filter(p => p.clubId === clubId);
}

export function getPlayersByLeague(leagueId: string): WorldPlayer[] {
  return getAllWorldPlayers().filter(p => p.leagueId === leagueId);
}

/**
 * Meilleurs buteurs de la ligue pour une saison donnée.
 * Si livePlayerStats est fourni (depuis WorldLiveState.playerStats), il est utilisé
 * comme source de vérité plutôt que player.seasonStats (qui reste pour rétrocompatibilité).
 */
export function getTopScorers(
  leagueId: string,
  season = 1,
  limit = 10,
  livePlayerStats?: Array<{ playerId: string; leagueId: string; season: number; goals: number; assists: number; appearances: number }>,
): Array<WorldPlayer & { liveGoals?: number; liveAssists?: number; liveAppearances?: number }> {
  const players = getPlayersByLeague(leagueId);
  if (livePlayerStats && livePlayerStats.length > 0) {
    const leagueStats = livePlayerStats.filter(s => s.leagueId === leagueId && s.season === season);
    if (leagueStats.length > 0) {
      return leagueStats
        .sort((a, b) => b.goals - a.goals)
        .slice(0, limit)
        .map(s => {
          const player = players.find(p => p.id === s.playerId);
          if (!player) return null;
          return { ...player, liveGoals: s.goals, liveAssists: s.assists, liveAppearances: s.appearances };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null);
    }
  }
  // Fallback : player.seasonStats (vide pour une nouvelle carrière — aucun buteur fantôme)
  return players
    .filter(p => p.seasonStats.some(s => s.season === season && s.goals > 0))
    .sort((a, b) => {
      const ag = a.seasonStats.find(s => s.season === season)?.goals ?? 0;
      const bg = b.seasonStats.find(s => s.season === season)?.goals ?? 0;
      return bg - ag;
    })
    .slice(0, limit);
}

export function getTopRated(leagueId: string, limit = 10): WorldPlayer[] {
  return getPlayersByLeague(leagueId)
    .sort((a, b) => b.overall - a.overall)
    .slice(0, limit);
}

/** Avancer d'une semaine : guérir blessures, déclin vétérans, progression prodigies */
export function advanceWorldPlayerWeek(player: WorldPlayer, rng: ReturnType<typeof mkRng>): WorldPlayer {
  let updated = { ...player };

  // Guérison blessure
  if (updated.injury) {
    const rem = updated.injury.weeksRemaining - 1;
    updated = { ...updated, injury: rem <= 0 ? null : { ...updated.injury, weeksRemaining: rem } };
  }

  // Nouvelle blessure aléatoire (hors déjà blessé)
  if (!updated.injury && rng.bool(personality_injury_prob(updated.personality))) {
    const types = ["Muscle","Cheville","Genou","Dos","Contusion"];
    const sev: "minor"|"moderate"|"severe" = rng.bool(0.6) ? "minor" : rng.bool(0.7) ? "moderate" : "severe";
    updated = {
      ...updated,
      injury: { type: rng.pick(types), severity: sev, weeksRemaining: sev === "minor" ? rng.int(1,2) : sev === "moderate" ? rng.int(3,6) : rng.int(8,16) },
    };
  }

  // Évolution forme
  const formDelta = rng.int(-5, 5);
  updated = { ...updated, form: Math.max(40, Math.min(99, updated.form + formDelta)) };

  // Vieillissement saison (si > 33 ans, peut décliner)
  if (updated.personality === "veteran" && rng.bool(0.03)) {
    updated = { ...updated, overall: Math.max(50, updated.overall - 1) };
  }

  // Progression prodigy
  if (updated.personality === "prodigy" && rng.bool(0.04) && updated.overall < updated.potential) {
    updated = { ...updated, overall: updated.overall + 1 };
  }

  return updated;
}

function personality_injury_prob(p: WorldPlayerPersonality): number {
  return p === "volatile" ? 0.04 : p === "veteran" ? 0.035 : p === "warrior" ? 0.01 : 0.02;
}

/** Mise à jour des stats saison après un match simulé */
export function recordWorldPlayerMatch(
  player: WorldPlayer,
  goals: number,
  assists: number,
  rating: number,
  season: number,
): WorldPlayer {
  const existing = player.seasonStats.find(s => s.season === season);
  if (existing) {
    const newStats = {
      ...existing,
      goals: existing.goals + goals,
      assists: existing.assists + assists,
      appearances: existing.appearances + 1,
      avgRating: parseFloat(((existing.avgRating * existing.appearances + rating) / (existing.appearances + 1)).toFixed(1)),
    };
    return {
      ...player,
      seasonStats: player.seasonStats.map(s => s.season === season ? newStats : s),
      careerGoals: player.careerGoals + goals,
      careerAssists: player.careerAssists + assists,
      careerAppearances: player.careerAppearances + 1,
    };
  }
  return {
    ...player,
    seasonStats: [...player.seasonStats, {
      season, goals, assists, appearances: 1, avgRating: rating, yellowCards: 0, redCards: 0,
    }],
    careerGoals: player.careerGoals + goals,
    careerAssists: player.careerAssists + assists,
    careerAppearances: player.careerAppearances + 1,
  };
}

// ─── Export de métadonnées ────────────────────────────────────────────────────

export const PERSONALITY_LABELS: Record<WorldPlayerPersonality, string> = {
  leader:    "Leader",
  genius:    "Génie",
  warrior:   "Guerrier",
  showman:   "Showman",
  introvert: "Discret",
  volatile:  "Volatile",
  veteran:   "Vétéran",
  prodigy:   "Prodige",
  journeyman:"Routinier",
};

export const POSITION_DISPLAY: Record<WorldPlayerPosition, string> = POSITION_LABELS;
