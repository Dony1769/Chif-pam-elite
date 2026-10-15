/**
 * FC CAREER 27 — Mode Manager : formations, compatibilité de poste, force d'équipe.
 * Fonctions pures.
 */

import type { WorldPlayer, WorldPlayerPosition } from "../data/worldPlayers";
import type { FormationId, Lineup, Mentality, PlayStyle, SlotLine, Tactic } from "./types";

export interface FormationSlot {
  /** Poste idéal */
  pos: WorldPlayerPosition;
  line: SlotLine;
  /** Coordonnées sur le terrain (0-100), y=0 côté but adverse */
  x: number;
  y: number;
}

const S = (pos: WorldPlayerPosition, line: SlotLine, x: number, y: number): FormationSlot => ({ pos, line, x, y });

export const FORMATIONS: Record<FormationId, FormationSlot[]> = {
  "4-4-2": [
    S("GK","GK",50,92), S("LB","DEF",15,72), S("CB","DEF",38,76), S("CB","DEF",62,76), S("RB","DEF",85,72),
    S("LW","MID",15,48), S("CM","MID",38,52), S("CM","MID",62,52), S("RW","MID",85,48),
    S("ST","ATT",38,20), S("ST","ATT",62,20),
  ],
  "4-3-3": [
    S("GK","GK",50,92), S("LB","DEF",15,72), S("CB","DEF",38,76), S("CB","DEF",62,76), S("RB","DEF",85,72),
    S("CM","MID",30,52), S("DM","MID",50,58), S("CM","MID",70,52),
    S("LW","ATT",18,24), S("ST","ATT",50,18), S("RW","ATT",82,24),
  ],
  "4-2-3-1": [
    S("GK","GK",50,92), S("LB","DEF",15,72), S("CB","DEF",38,76), S("CB","DEF",62,76), S("RB","DEF",85,72),
    S("DM","MID",38,58), S("DM","MID",62,58),
    S("LW","MID",18,36), S("AM","MID",50,38), S("RW","MID",82,36),
    S("ST","ATT",50,16),
  ],
  "3-5-2": [
    S("GK","GK",50,92), S("CB","DEF",28,76), S("CB","DEF",50,78), S("CB","DEF",72,76),
    S("LB","MID",10,50), S("CM","MID",32,54), S("DM","MID",50,60), S("CM","MID",68,54), S("RB","MID",90,50),
    S("ST","ATT",38,20), S("ST","ATT",62,20),
  ],
  "5-3-2": [
    S("GK","GK",50,92), S("LB","DEF",10,68), S("CB","DEF",30,76), S("CB","DEF",50,78), S("CB","DEF",70,76), S("RB","DEF",90,68),
    S("CM","MID",30,52), S("CM","MID",50,56), S("CM","MID",70,52),
    S("ST","ATT",38,22), S("ST","ATT",62,22),
  ],
  "4-1-4-1": [
    S("GK","GK",50,92), S("LB","DEF",15,72), S("CB","DEF",38,76), S("CB","DEF",62,76), S("RB","DEF",85,72),
    S("DM","MID",50,62),
    S("LW","MID",15,42), S("CM","MID",38,46), S("CM","MID",62,46), S("RW","MID",85,42),
    S("ST","ATT",50,18),
  ],
};

export const FORMATION_IDS = Object.keys(FORMATIONS) as FormationId[];

/** Famille de postes proches : un DC peut dépanner en DM, pas en BU. */
const POSITION_FAMILY: Record<WorldPlayerPosition, WorldPlayerPosition[]> = {
  GK: [],
  CB: ["DM", "RB", "LB"],
  LB: ["RB", "CB", "LW"],
  RB: ["LB", "CB", "RW"],
  DM: ["CM", "CB"],
  CM: ["DM", "AM"],
  AM: ["CM", "LW", "RW", "ST"],
  LW: ["RW", "AM", "LB"],
  RW: ["LW", "AM", "RB"],
  ST: ["AM", "LW", "RW"],
};

/** Coefficient de compatibilité poste joué / poste naturel (0.35 à 1). */
export function positionFit(natural: WorldPlayerPosition, slot: WorldPlayerPosition): number {
  if (natural === slot) return 1;
  if (natural === "GK") return 0.35;      // un gardien sur le terrain : catastrophe
  if (slot === "GK") return 0.55;         // un joueur de champ dans les buts : dépannage
  if (POSITION_FAMILY[natural].includes(slot)) return 0.9;
  return 0.7;
}

/** Valeur effective d'un joueur dans un slot (OVR × compatibilité × condition). */
export function effectiveRating(p: WorldPlayer, slot: WorldPlayerPosition): number {
  const fit = positionFit(p.position, slot);
  const condition = 1 - Math.max(0, p.fatigue - 30) / 250;          // fatigue >30 pénalise, max -28%
  const moraleMod = 0.96 + (p.morale / 100) * 0.08;                // 0.96 → 1.04
  const formMod   = 0.97 + (p.form / 100) * 0.06;                  // 0.97 → 1.03
  return p.overall * fit * condition * moraleMod * formMod;
}

export function isAvailable(p: WorldPlayer): boolean {
  return !p.injury || p.injury.weeksRemaining <= 0;
}

/**
 * Composition automatique : pour chaque slot, le meilleur joueur disponible
 * (affectation gloutonne, slots les plus spécifiques d'abord).
 */
export function autoPickLineup(squad: WorldPlayer[], formation: FormationId): Lineup {
  const slots = FORMATIONS[formation];
  const pool = squad.filter(isAvailable);
  const used = new Set<string>();
  const starters: string[] = new Array(slots.length).fill("");

  // GK d'abord, puis le reste dans l'ordre
  const order = slots.map((s, i) => i).sort((a, b) => (slots[a].line === "GK" ? -1 : 0) - (slots[b].line === "GK" ? -1 : 0));
  for (const i of order) {
    let best: WorldPlayer | null = null;
    let bestVal = -1;
    for (const p of pool) {
      if (used.has(p.id)) continue;
      const v = effectiveRating(p, slots[i].pos);
      if (v > bestVal) { bestVal = v; best = p; }
    }
    if (best) { starters[i] = best.id; used.add(best.id); }
  }

  const bench = pool
    .filter(p => !used.has(p.id))
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 7)
    .map(p => p.id);

  const captain = [...pool].filter(p => used.has(p.id))
    .sort((a, b) => (b.personality === "leader" ? 1 : 0) - (a.personality === "leader" ? 1 : 0) || b.overall - a.overall)[0];

  return { starters: starters.filter(Boolean), bench, captainId: captain?.id ?? null };
}

export type LineupIssue =
  | { kind: "count"; message: string }
  | { kind: "unknown"; message: string }
  | { kind: "injured"; message: string; playerId: string }
  | { kind: "duplicate"; message: string };

/** Vérifie qu'une composition est jouable avec l'effectif actuel. */
export function validateLineup(lineup: Lineup, squad: WorldPlayer[], formation: FormationId): LineupIssue[] {
  const issues: LineupIssue[] = [];
  const needed = FORMATIONS[formation].length;
  if (lineup.starters.length !== needed) {
    issues.push({ kind: "count", message: `Il faut ${needed} titulaires (actuellement ${lineup.starters.length}).` });
  }
  const all = [...lineup.starters, ...lineup.bench];
  if (new Set(all).size !== all.length) issues.push({ kind: "duplicate", message: "Un joueur apparaît deux fois." });
  for (const id of lineup.starters) {
    const p = squad.find(x => x.id === id);
    if (!p) { issues.push({ kind: "unknown", message: "Un titulaire ne fait plus partie de l'effectif." }); continue; }
    if (!isAvailable(p)) issues.push({ kind: "injured", message: `${p.firstName} ${p.lastName} est blessé.`, playerId: p.id });
  }
  return issues;
}

// ─── Force d'équipe par ligne ────────────────────────────────────────────────

export interface TeamRatings {
  attack: number;
  midfield: number;
  defense: number;
  goalkeeping: number;
}

/** Notes par ligne pour un onze aligné dans une formation. */
export function computeTeamRatings(starters: (WorldPlayer | null | undefined)[], formation: FormationId): TeamRatings {
  const slots = FORMATIONS[formation];
  const acc: Record<SlotLine, number[]> = { GK: [], DEF: [], MID: [], ATT: [] };
  slots.forEach((slot, i) => {
    const p = starters[i];
    acc[slot.line].push(p ? effectiveRating(p, slot.pos) : 25);
  });
  const avg = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 40);
  // Le nombre de joueurs par ligne compte : 3 attaquants pèsent plus qu'un seul
  const weight = (line: SlotLine, base: number) => {
    const n = acc[line].length;
    const ref = line === "DEF" ? 4 : line === "MID" ? 4 : line === "ATT" ? 2 : 1;
    return avg(acc[line]) * (1 + (n - ref) * 0.06) * base;
  };
  return {
    goalkeeping: avg(acc.GK),
    defense:  weight("DEF", 1),
    midfield: weight("MID", 1),
    attack:   (weight("ATT", 0.6) + avg(acc.MID) * 0.4),
  };
}

// ─── Modificateurs tactiques ─────────────────────────────────────────────────

const MENTALITY_MOD: Record<Mentality, { atk: number; def: number }> = {
  very_defensive: { atk: 0.80, def: 1.14 },
  defensive:      { atk: 0.90, def: 1.07 },
  balanced:       { atk: 1.00, def: 1.00 },
  attacking:      { atk: 1.09, def: 0.93 },
  very_attacking: { atk: 1.17, def: 0.85 },
};

export interface TacticalProfile {
  /** Multiplie la part de possession */
  control: number;
  /** Multiplie la création d'occasions */
  creation: number;
  /** Multiplie la solidité défensive */
  resistance: number;
  /** Qualité moyenne des occasions (xG par tir) */
  chanceQuality: number;
  /** Fatigue ajoutée par match */
  fatigueCost: number;
}

export function tacticalProfile(t: Tactic): TacticalProfile {
  const m = MENTALITY_MOD[t.mentality];
  const base: TacticalProfile = { control: 1, creation: m.atk, resistance: m.def, chanceQuality: 1, fatigueCost: 14 };
  switch (t.style) {
    case "possession": return { ...base, control: 1.12, creation: base.creation * 0.97, chanceQuality: 1.08, fatigueCost: 12 };
    case "counter":    return { ...base, control: 0.88, resistance: base.resistance * 1.06, chanceQuality: 1.18, fatigueCost: 13 };
    case "direct":     return { ...base, control: 0.95, creation: base.creation * 1.08, chanceQuality: 0.9, fatigueCost: 14 };
    case "pressing":   return { ...base, control: 1.05, creation: base.creation * 1.06, resistance: base.resistance * 1.03, fatigueCost: 21 };
    default:           return base;
  }
}

/** Contre-tactiques : le contre punit le pressing haut, la possession use le contre, le direct passe au-dessus du pressing. */
export function styleMatchup(own: PlayStyle, opp: PlayStyle): number {
  if (own === "counter" && opp === "pressing") return 1.08;
  if (own === "counter" && opp === "possession") return 1.05;
  if (own === "possession" && opp === "counter") return 0.96;
  if (own === "direct" && opp === "pressing") return 1.05;
  if (own === "pressing" && opp === "possession") return 1.05;
  return 1;
}

/** Tactique adoptée par un club IA selon sa philosophie. */
export function aiTacticFor(philosophy: "attacking" | "balanced" | "defensive" | "possession" | "counter"): Tactic {
  switch (philosophy) {
    case "attacking":  return { formation: "4-3-3",   mentality: "attacking", style: "direct" };
    case "defensive":  return { formation: "5-3-2",   mentality: "defensive", style: "counter" };
    case "possession": return { formation: "4-2-3-1", mentality: "balanced",  style: "possession" };
    case "counter":    return { formation: "4-4-2",   mentality: "balanced",  style: "counter" };
    default:           return { formation: "4-4-2",   mentality: "balanced",  style: "balanced" };
  }
}

export const MENTALITY_LABEL: Record<Mentality, string> = {
  very_defensive: "Très défensif", defensive: "Défensif", balanced: "Équilibré",
  attacking: "Offensif", very_attacking: "Très offensif",
};
export const STYLE_LABEL: Record<PlayStyle, string> = {
  possession: "Possession", counter: "Contre-attaque", direct: "Jeu direct",
  pressing: "Pressing haut", balanced: "Équilibré",
};
