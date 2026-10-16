/**
 * FC CAREER 27 — Sous-attributs façon FC (29 joueur de champ + 5 gardien).
 *
 * Les 6 grandes caractéristiques (VIT, TIR, PAS, DRI, DÉF, PHY) et la note
 * globale sont CALCULÉES à partir des sous-attributs, avec des poids par poste.
 * Fonctions pures et déterministes.
 */

import type { WorldPlayerPosition } from "../data/worldPlayers";
import type { AttrKey, Attrs } from "./attributes";

export type SubKey =
  // Vitesse
  | "acceleration" | "sprintSpeed"
  // Tir
  | "positioning" | "finishing" | "shotPower" | "longShots" | "volleys" | "penalties"
  // Passe
  | "vision" | "crossing" | "freeKick" | "shortPassing" | "longPassing" | "curve"
  // Dribble
  | "agility" | "balance" | "reactions" | "ballControl" | "dribbling" | "composure"
  // Défense
  | "interceptions" | "headingAccuracy" | "defAwareness" | "standingTackle" | "slidingTackle"
  // Physique
  | "jumping" | "stamina" | "strength" | "aggression"
  // Gardien
  | "gkDiving" | "gkHandling" | "gkKicking" | "gkPositioning" | "gkReflexes";

export type SubAttrs = Record<SubKey, number>;

/** Sous-attributs de chaque grande caractéristique (joueur de champ). */
export const SUB_GROUPS: Record<AttrKey, SubKey[]> = {
  pac: ["acceleration", "sprintSpeed"],
  sho: ["positioning", "finishing", "shotPower", "longShots", "volleys", "penalties"],
  pas: ["vision", "crossing", "freeKick", "shortPassing", "longPassing", "curve"],
  dri: ["agility", "balance", "reactions", "ballControl", "dribbling", "composure"],
  def: ["interceptions", "headingAccuracy", "defAwareness", "standingTackle", "slidingTackle"],
  phy: ["jumping", "stamina", "strength", "aggression"],
};
export const GK_SUBS: SubKey[] = ["gkDiving", "gkHandling", "gkKicking", "gkPositioning", "gkReflexes"];
export const OUTFIELD_SUBS: SubKey[] = (Object.values(SUB_GROUPS) as SubKey[][]).flat();
export const ALL_SUBS: SubKey[] = [...OUTFIELD_SUBS, ...GK_SUBS];

export const SUB_LABEL: Record<SubKey, string> = {
  acceleration: "Accélération", sprintSpeed: "Vitesse de pointe",
  positioning: "Placement offensif", finishing: "Finition", shotPower: "Puissance de frappe",
  longShots: "Tirs de loin", volleys: "Volées", penalties: "Penaltys",
  vision: "Vista", crossing: "Centres", freeKick: "Précision coups francs",
  shortPassing: "Passes courtes", longPassing: "Passes longues", curve: "Effet",
  agility: "Agilité", balance: "Équilibre", reactions: "Réactivité", ballControl: "Contrôle de balle",
  dribbling: "Dribble", composure: "Sang-froid",
  interceptions: "Interceptions", headingAccuracy: "Précision de la tête", defAwareness: "Conscience défensive",
  standingTackle: "Tacle debout", slidingTackle: "Tacle glissé",
  jumping: "Détente", stamina: "Endurance", strength: "Force", aggression: "Agressivité",
  gkDiving: "Plongeon", gkHandling: "Prise de balle", gkKicking: "Jeu au pied",
  gkPositioning: "Placement (gardien)", gkReflexes: "Réflexes",
};

/** Poids des sous-attributs dans chaque grande caractéristique (somme = 1). */
const FACE_WEIGHTS: Record<AttrKey, Partial<Record<SubKey, number>>> = {
  pac: { acceleration: 0.45, sprintSpeed: 0.55 },
  sho: { positioning: 0.05, finishing: 0.45, shotPower: 0.2, longShots: 0.2, volleys: 0.05, penalties: 0.05 },
  pas: { vision: 0.2, crossing: 0.2, freeKick: 0.05, shortPassing: 0.35, longPassing: 0.15, curve: 0.05 },
  dri: { agility: 0.1, balance: 0.05, ballControl: 0.3, dribbling: 0.5, composure: 0.05 },
  def: { interceptions: 0.2, headingAccuracy: 0.1, defAwareness: 0.3, standingTackle: 0.3, slidingTackle: 0.1 },
  phy: { jumping: 0.05, stamina: 0.25, strength: 0.5, aggression: 0.2 },
};
/** Pour un gardien, les 6 cases de la carte : PLO, PRI, PIE, RÉF, PLA, VIT. */
const GK_FACE: Record<AttrKey, Partial<Record<SubKey, number>>> = {
  pac: { gkDiving: 1 }, sho: { gkHandling: 1 }, pas: { gkKicking: 1 },
  dri: { gkReflexes: 1 }, def: { gkPositioning: 1 }, phy: { acceleration: 0.5, sprintSpeed: 0.5 },
};

/** Poids des sous-attributs dans la note globale, par poste (somme = 1). */
export const OVR_WEIGHTS: Record<WorldPlayerPosition, Partial<Record<SubKey, number>>> = {
  ST: { finishing: 0.18, positioning: 0.13, headingAccuracy: 0.1, shotPower: 0.1, reactions: 0.08, dribbling: 0.07, ballControl: 0.1, volleys: 0.02, longShots: 0.03, acceleration: 0.04, sprintSpeed: 0.05, strength: 0.05, shortPassing: 0.05 },
  LW: { acceleration: 0.07, sprintSpeed: 0.06, agility: 0.03, reactions: 0.07, positioning: 0.09, dribbling: 0.16, ballControl: 0.14, crossing: 0.09, shortPassing: 0.09, vision: 0.06, finishing: 0.1, longShots: 0.04 },
  RW: { acceleration: 0.07, sprintSpeed: 0.06, agility: 0.03, reactions: 0.07, positioning: 0.09, dribbling: 0.16, ballControl: 0.14, crossing: 0.09, shortPassing: 0.09, vision: 0.06, finishing: 0.1, longShots: 0.04 },
  AM: { shortPassing: 0.16, vision: 0.14, ballControl: 0.15, dribbling: 0.13, positioning: 0.09, reactions: 0.07, finishing: 0.07, longShots: 0.07, agility: 0.03, acceleration: 0.04, shotPower: 0.05 },
  CM: { shortPassing: 0.17, longPassing: 0.13, vision: 0.13, ballControl: 0.14, dribbling: 0.07, reactions: 0.08, interceptions: 0.05, positioning: 0.06, stamina: 0.06, standingTackle: 0.05, longShots: 0.04, composure: 0.02 },
  DM: { shortPassing: 0.14, longPassing: 0.1, ballControl: 0.1, interceptions: 0.14, defAwareness: 0.14, standingTackle: 0.12, slidingTackle: 0.05, reactions: 0.07, stamina: 0.06, strength: 0.04, aggression: 0.04 },
  CB: { defAwareness: 0.17, standingTackle: 0.17, slidingTackle: 0.13, headingAccuracy: 0.1, strength: 0.1, interceptions: 0.13, aggression: 0.07, reactions: 0.05, jumping: 0.03, shortPassing: 0.05 },
  LB: { acceleration: 0.05, sprintSpeed: 0.07, stamina: 0.08, reactions: 0.08, interceptions: 0.12, defAwareness: 0.08, standingTackle: 0.11, slidingTackle: 0.14, crossing: 0.09, shortPassing: 0.07, ballControl: 0.07, headingAccuracy: 0.04 },
  RB: { acceleration: 0.05, sprintSpeed: 0.07, stamina: 0.08, reactions: 0.08, interceptions: 0.12, defAwareness: 0.08, standingTackle: 0.11, slidingTackle: 0.14, crossing: 0.09, shortPassing: 0.07, ballControl: 0.07, headingAccuracy: 0.04 },
  GK: { gkDiving: 0.24, gkHandling: 0.22, gkKicking: 0.04, gkReflexes: 0.24, gkPositioning: 0.22, reactions: 0.04 },
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const wsum = (s: SubAttrs, w: Partial<Record<SubKey, number>>) =>
  (Object.entries(w) as [SubKey, number][]).reduce((t, [k, x]) => t + (s[k] ?? 0) * x, 0);

/** Les 6 grandes caractéristiques calculées. */
export function faceOf(s: SubAttrs, pos: WorldPlayerPosition): Attrs {
  const W = pos === "GK" ? GK_FACE : FACE_WEIGHTS;
  return {
    pac: Math.round(wsum(s, W.pac)), sho: Math.round(wsum(s, W.sho)), pas: Math.round(wsum(s, W.pas)),
    dri: Math.round(wsum(s, W.dri)), def: Math.round(wsum(s, W.def)), phy: Math.round(wsum(s, W.phy)),
  };
}

/** Note globale à partir des sous-attributs (1-99). */
export function overallFromSubs(s: SubAttrs, pos: WorldPlayerPosition): number {
  return clamp(Math.round(wsum(s, OVR_WEIGHTS[pos])), 1, 99);
}

/** Sous-attributs qui comptent pour un poste, du plus au moins important. */
export function keySubs(pos: WorldPlayerPosition): SubKey[] {
  return (Object.entries(OVR_WEIGHTS[pos]) as [SubKey, number][]).sort((a, b) => b[1] - a[1]).map(([k]) => k);
}

/** Petit générateur déterministe local (évite une dépendance circulaire). */
function hashRng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => {
    h += 0x6D2B79F5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Sous-attributs cohérents avec les 6 caractéristiques d'une carte.
 * Chaque groupe gravite autour de sa caractéristique (±5), puis est recalé
 * pour que la moyenne pondérée retombe exactement dessus. Les sous-attributs
 * gardien suivent la carte pour un gardien, et restent bas sinon.
 */
export function subsFromFace(face: Attrs, pos: WorldPlayerPosition, seed: string, overall?: number): SubAttrs {
  const rnd = hashRng(seed);
  const s = {} as SubAttrs;
  const jit = (span: number) => Math.round((rnd() - 0.5) * 2 * span);
  if (pos === "GK") {
    s.gkDiving = clamp(face.pac, 20, 99); s.gkHandling = clamp(face.sho, 20, 99); s.gkKicking = clamp(face.pas, 20, 99);
    s.gkReflexes = clamp(face.dri, 20, 99); s.gkPositioning = clamp(face.def, 20, 99);
    const sp = jit(3);
    s.acceleration = clamp(face.phy + sp, 20, 99); s.sprintSpeed = clamp(face.phy - sp, 20, 99);
    const ovr = overall ?? Math.round((face.pac + face.sho + face.dri + face.def) / 4);
    for (const k of OUTFIELD_SUBS) if (s[k] === undefined) s[k] = clamp(Math.round(ovr * 0.42) + jit(8), 10, 70);
    s.reactions = clamp(ovr + jit(4), 30, 99);
    s.composure = clamp(ovr - 10 + jit(6), 20, 90);
    s.jumping = clamp(ovr - 10 + jit(8), 20, 90);
    s.strength = clamp(ovr - 15 + jit(10), 20, 90);
    return s;
  }
  const groups = SUB_GROUPS;
  for (const [g, keys] of Object.entries(groups) as [AttrKey, SubKey[]][]) {
    const target = face[g];
    for (const k of keys) s[k] = clamp(target + jit(5), 15, 99);
    // Recalage sur la caractéristique
    let guard = 0;
    while (guard++ < 40) {
      const cur = Math.round(wsum(s, FACE_WEIGHTS[g]));
      if (cur === target) break;
      const k = keys[guard % keys.length];
      s[k] = clamp(s[k] + Math.sign(target - cur), 15, 99);
    }
  }
  // Réactivité et sang-froid suivent le niveau global
  const ovr = overall ?? Math.round((face.pac + face.sho + face.pas + face.dri + face.def + face.phy) / 6);
  s.reactions = clamp(Math.round((s.reactions + ovr) / 2) + jit(2), 20, 99);
  s.composure = clamp(Math.round((s.composure + ovr) / 2) + jit(2), 20, 99);
  for (const k of GK_SUBS) s[k] = clamp(8 + jit(5) + 4, 5, 20);
  return s;
}

/**
 * Profil de départ pour un poste et une note visée : les sous-attributs clés
 * autour de la note, les autres plus bas ; recalé pour tomber sur la note.
 */
export function subsForTarget(pos: WorldPlayerPosition, target: number, seed: string): SubAttrs {
  const rnd = hashRng(seed);
  const jit = (span: number) => Math.round((rnd() - 0.5) * 2 * span);
  const w = OVR_WEIGHTS[pos];
  const s = {} as SubAttrs;
  for (const k of ALL_SUBS) {
    const imp = w[k] ?? 0;
    const isGkSub = GK_SUBS.includes(k);
    if (pos === "GK") s[k] = isGkSub ? target + 2 + jit(4) : clamp(Math.round(target * 0.5) + jit(10), 10, 70);
    else if (isGkSub) s[k] = clamp(10 + jit(4), 5, 20);
    else s[k] = imp >= 0.08 ? target + 3 + jit(4) : imp > 0 ? target - 1 + jit(5) : target - 14 + jit(8);
    s[k] = clamp(s[k], 5, 95);
  }
  const keys = keySubs(pos);
  let guard = 0;
  while (overallFromSubs(s, pos) !== target && guard++ < 200) {
    const k = keys[guard % keys.length];
    s[k] = clamp(s[k] + Math.sign(target - overallFromSubs(s, pos)), 5, 99);
  }
  return s;
}

/** Applique un écart de note globale à un joueur (progression/déclin) en gardant son profil. */
export function shiftSubs(s: SubAttrs, pos: WorldPlayerPosition, newOverall: number): SubAttrs {
  const out = { ...s };
  const keys = keySubs(pos);
  let guard = 0;
  while (overallFromSubs(out, pos) !== newOverall && guard++ < 400) {
    const d = Math.sign(newOverall - overallFromSubs(out, pos));
    const k = keys[guard % keys.length];
    out[k] = clamp(out[k] + d, 5, 99);
  }
  return out;
}

/** Déclin physique lié à l'âge (après 30 ans). */
export function ageDecline(s: SubAttrs, age: number, rnd: () => number): SubAttrs {
  if (age < 30) return s;
  const out = { ...s };
  const hit = (k: SubKey, max: number) => { out[k] = clamp(out[k] - Math.floor(rnd() * (max + 1)), 5, 99); };
  const f = age >= 34 ? 2 : 1;
  hit("acceleration", 2 * f); hit("sprintSpeed", 2 * f); hit("agility", 1 * f); hit("stamina", 2 * f);
  hit("jumping", 1 * f); hit("balance", 1 * f);
  // L'expérience compense un peu
  out.composure = clamp(out.composure + (rnd() < 0.5 ? 1 : 0), 5, 99);
  out.vision = clamp(out.vision + (rnd() < 0.3 ? 1 : 0), 5, 99);
  return out;
}

export const SUB_ZERO = (): SubAttrs => Object.fromEntries(ALL_SUBS.map(k => [k, 0])) as SubAttrs;
