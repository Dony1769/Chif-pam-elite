/**
 * FC CAREER — Progression des joueurs monde
 * Gère le développement des joueurs monde sur une saison :
 * - Croissance des jeunes selon leur potentiel
 * - Déclin des vétérans
 * - Retraites
 * - Génération de nouvelles recrues jeunes
 * Déterministe : même seed → même résultat.
 */

import type { WorldPlayer } from "../data/worldPlayers";
import { createRng, seedFromString } from "../utils/random";
import { generateId } from "../utils/ids";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProgressionEvent {
  type: "growth" | "decline" | "retirement" | "breakout" | "new_youth";
  playerId: string;
  playerName: string;
  description: string;
  ovralDelta: number;
}

export interface ProgressionResult {
  updated: WorldPlayer[];
  events: ProgressionEvent[];
  newYouth: WorldPlayer[];
}

// ─── Constantes ───────────────────────────────────────────────────────────────

/** Âge de pic moyen par position */
const PEAK_AGE: Record<string, number> = {
  GK: 29,
  CB: 28, LB: 26, RB: 26,
  DM: 27, CM: 27, AM: 25,
  LW: 24, RW: 24, ST: 25,
};

/** Positions utilisées pour générer de nouveaux jeunes */
const YOUTH_POSITIONS: WorldPlayer["position"][] = [
  "GK", "CB", "CB", "LB", "RB",
  "DM", "CM", "AM",
  "LW", "RW", "ST", "ST",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function peakAge(pos: string): number {
  return PEAK_AGE[pos] ?? 27;
}

/**
 * Calcule le delta d'OVR annuel pour un joueur selon son âge et potentiel.
 * Retourne un float pouvant être 0 (pas de changement visible).
 */
function computeProgressionDelta(
  player: WorldPlayer,
  rng: ReturnType<typeof createRng>,
): number {
  const peak = peakAge(player.position);
  const age = player.age;
  const gap = (player.potential ?? player.overall) - player.overall; // marge de progression

  if (age < peak - 1) {
    // Phase de croissance
    const baseGrowth = Math.min(gap * 0.35, 4); // max +4 OVR/an
    const noise = rng.float(-0.8, 0.8);
    return Math.max(0, baseGrowth + noise);
  } else if (age <= peak + 1) {
    // Plateau — légère variation
    return rng.float(-0.5, 0.5);
  } else if (age <= peak + 4) {
    // Début de déclin
    const baseDrop = -rng.float(0.5, 2);
    return baseDrop;
  } else {
    // Déclin marqué (après peak+4)
    const baseDrop = -rng.float(1, 3.5);
    return baseDrop;
  }
}

/** Probabilité de retraite selon l'âge */
function retirementChance(age: number): number {
  if (age < 34) return 0;
  if (age === 34) return 0.05;
  if (age === 35) return 0.10;
  if (age === 36) return 0.20;
  if (age === 37) return 0.35;
  if (age === 38) return 0.55;
  return 0.75; // 39+
}

// ─── Progression d'une saison ─────────────────────────────────────────────────

export function progressWorldPlayers(
  players: WorldPlayer[],
  season: number,
  seed: string,
  /** true quand ageWorldPlayers a déjà ajouté l'année (évite le double vieillissement) */
  ageAlreadyApplied = false,
): ProgressionResult {
  const rng = createRng(seedFromString(`${seed}-progress-s${season}`));

  const updated: WorldPlayer[] = [];
  const events: ProgressionEvent[] = [];
  const retirees: string[] = [];

  for (const player of players) {
    // Un retraité reste archivé tel quel : il ne vieillit plus, ne reprend pas
    // sa retraite et ne génère pas de nouveau jeune (sinon effectifs qui gonflent)
    if (player.clubId === "retired") { updated.push(player); continue; }
    // Vieillir
    const aged: WorldPlayer = ageAlreadyApplied ? player : { ...player, age: player.age + 1 };

    // Retraite ?
    if (rng.chance(retirementChance(aged.age))) {
      retirees.push(aged.id);
      events.push({
        type: "retirement",
        playerId: aged.id,
        playerName: `${aged.firstName} ${aged.lastName}`,
        description: `${aged.firstName} ${aged.lastName} prend sa retraite à ${aged.age} ans.`,
        ovralDelta: 0,
      });
      // Retirer du club (sans supprimer — archivé avec clubId "retired")
      updated.push({ ...aged, clubId: "retired" });
      continue;
    }

    // Calcul de la progression
    const rawDelta = computeProgressionDelta(aged, rng);
    const delta = Math.round(rawDelta); // entier pour l'OVR
    // La progression s'arrête au potentiel ; le déclin peut descendre sous la note actuelle
    const ceiling = delta > 0 ? Math.max(aged.overall, aged.potential ?? 99) : 99;
    const newOverall = Math.min(ceiling, Math.max(40, aged.overall + delta));

    const progressed: WorldPlayer = { ...aged, overall: newOverall };

    // Événement notable
    if (delta >= 3) {
      events.push({
        type: "breakout",
        playerId: progressed.id,
        playerName: `${progressed.firstName} ${progressed.lastName}`,
        description: `${progressed.firstName} ${progressed.lastName} progresse fortement (+${delta} OVR).`,
        ovralDelta: delta,
      });
    } else if (delta <= -3) {
      events.push({
        type: "decline",
        playerId: progressed.id,
        playerName: `${progressed.firstName} ${progressed.lastName}`,
        description: `${progressed.firstName} ${progressed.lastName} décline (${delta} OVR).`,
        ovralDelta: delta,
      });
    } else if (delta >= 2) {
      events.push({
        type: "growth",
        playerId: progressed.id,
        playerName: `${progressed.firstName} ${progressed.lastName}`,
        description: `${progressed.firstName} ${progressed.lastName} progresse (+${delta} OVR).`,
        ovralDelta: delta,
      });
    }

    updated.push(progressed);
  }

  // ── Générer de nouveaux jeunes pour remplacer les retraités ──────────────
  const newYouth: WorldPlayer[] = [];
  const clubIds = [...new Set(players.filter(p => p.clubId && p.clubId !== "retired").map(p => p.clubId!))];

  for (let i = 0; i < retirees.length; i++) {
    const pos = YOUTH_POSITIONS[i % YOUTH_POSITIONS.length];
    const clubId = clubIds[i % clubIds.length] ?? "free";
    const youth = generateYouthPlayer(pos, clubId, season, rng);
    newYouth.push(youth);
    events.push({
      type: "new_youth",
      playerId: youth.id,
      playerName: `${youth.firstName} ${youth.lastName}`,
      description: `${youth.firstName} ${youth.lastName} (${pos}, ${youth.age} ans) rejoint ${clubId}.`,
      ovralDelta: 0,
    });
  }

  return {
    updated: [...updated, ...newYouth],
    events,
    newYouth,
  };
}

// ─── Génération d'un jeune joueur ─────────────────────────────────────────────

export const FIRST_NAMES = [
  "Mateo", "Lucas", "Noah", "Liam", "Ethan", "Omar", "Yusuf", "Karim",
  "Diego", "Rafael", "Enzo", "Theo", "Felix", "Noel", "Soren", "Emil",
  "Kiran", "Aiden", "Marcus", "Elias", "Nathan", "Hugo", "Axel", "Leon",
];
export const LAST_NAMES = [
  "Silva", "Santos", "Ferreira", "Costa", "Pereira", "Oliveira", "Souza",
  "Lopez", "Garcia", "Martinez", "Rodrigues", "Fernandez", "Morales",
  "Dubois", "Müller", "Weber", "Fischer", "Becker", "Schneider", "Braun",
  "Diallo", "Cissé", "Traoré", "Koné", "Mbaye", "Ndiaye", "Keita",
];

export function generateYouthPlayer(
  position: WorldPlayer["position"],
  clubId: string,
  season: number,
  rng: ReturnType<typeof createRng>,
): WorldPlayer {
  const age = rng.int(17, 20);
  // Un jeune de 17-20 ans débute modestement ; le potentiel fait la différence
  const potential = rng.int(62, 84);
  const overall = rng.int(44, Math.min(56, potential - 8));
  const firstName = rng.pick(FIRST_NAMES);
  const lastName = rng.pick(LAST_NAMES);
  void season;

  return {
    id: generateId("wp"),
    firstName,
    lastName,
    nationality: "UN",
    age,
    position,
    overall,
    potential,
    personality: "journeyman",
    traits: [],
    clubId,
    leagueId: "",
    countryId: "",
    form: 65,
    fatigue: 10,
    morale: 70,
    injury: null,
    careerGoals: 0,
    careerAssists: 0,
    careerAppearances: 0,
    seasonStats: [],
    marketValue: overall * 10_000,
    contractWeeksLeft: 52 * 2,
  };
}
