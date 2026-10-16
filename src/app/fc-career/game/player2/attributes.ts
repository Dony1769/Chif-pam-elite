/**
 * FC CAREER 27 — Carrière Joueur v2 : les 6 caractéristiques façon FC.
 * Un même jeu de clés pour tous ; un gardien les lit autrement (plongeon,
 * prise de balle, jeu au pied, réflexes, placement, vitesse).
 */

import type { WorldPlayerPosition } from "../data/worldPlayers";

export type AttrKey = "pac" | "sho" | "pas" | "dri" | "def" | "phy";
export type Attrs = Record<AttrKey, number>;
export const ATTR_KEYS: AttrKey[] = ["pac", "sho", "pas", "dri", "def", "phy"];

export const ATTR_LABEL: Record<AttrKey, string> = {
  pac: "Vitesse", sho: "Tir", pas: "Passe", dri: "Dribble", def: "Défense", phy: "Physique",
};
export const GK_ATTR_LABEL: Record<AttrKey, string> = {
  pac: "Plongeon", sho: "Prise de balle", pas: "Jeu au pied", dri: "Réflexes", def: "Placement", phy: "Vitesse",
};
export const ATTR_SHORT: Record<AttrKey, string> = { pac: "VIT", sho: "TIR", pas: "PAS", dri: "DRI", def: "DÉF", phy: "PHY" };
export const GK_ATTR_SHORT: Record<AttrKey, string> = { pac: "PLO", sho: "PRI", pas: "PIE", dri: "RÉF", def: "PLA", phy: "VIT" };

export function attrLabel(k: AttrKey, pos: WorldPlayerPosition): string {
  return pos === "GK" ? GK_ATTR_LABEL[k] : ATTR_LABEL[k];
}

/** Poids de chaque caractéristique dans la note globale selon le poste. */
export const POSITION_WEIGHTS: Record<WorldPlayerPosition, Attrs> = {
  GK: { pac: 0.26, sho: 0.2, pas: 0.08, dri: 0.26, def: 0.2, phy: 0 },
  CB: { pac: 0.1, sho: 0, pas: 0.05, dri: 0, def: 0.55, phy: 0.3 },
  LB: { pac: 0.3, sho: 0, pas: 0.2, dri: 0, def: 0.35, phy: 0.15 },
  RB: { pac: 0.3, sho: 0, pas: 0.2, dri: 0, def: 0.35, phy: 0.15 },
  DM: { pac: 0, sho: 0, pas: 0.25, dri: 0.1, def: 0.4, phy: 0.25 },
  CM: { pac: 0, sho: 0.1, pas: 0.4, dri: 0.2, def: 0.15, phy: 0.15 },
  AM: { pac: 0.1, sho: 0.2, pas: 0.35, dri: 0.3, def: 0, phy: 0.05 },
  LW: { pac: 0.3, sho: 0.2, pas: 0.15, dri: 0.3, def: 0, phy: 0.05 },
  RW: { pac: 0.3, sho: 0.2, pas: 0.15, dri: 0.3, def: 0, phy: 0.05 },
  ST: { pac: 0.2, sho: 0.45, pas: 0.05, dri: 0.2, def: 0, phy: 0.1 },
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Note globale (1-99) à partir des caractéristiques et du poste. */
export function overallOf(a: Attrs, pos: WorldPlayerPosition): number {
  const w = POSITION_WEIGHTS[pos];
  const raw = ATTR_KEYS.reduce((s, k) => s + a[k] * w[k], 0);
  return clamp(Math.round(raw), 1, 99);
}

/** Caractéristiques qui comptent pour un poste, de la plus à la moins importante. */
export function keyAttrs(pos: WorldPlayerPosition): AttrKey[] {
  const w = POSITION_WEIGHTS[pos];
  return [...ATTR_KEYS].filter(k => w[k] > 0).sort((a, b) => w[b] - w[a]);
}

/**
 * Profil de départ cohérent avec un poste : les caractéristiques clés autour
 * de la note visée, les autres plus basses. `jitter` ∈ [0,1) fourni par le RNG.
 */
export function profileFor(pos: WorldPlayerPosition, targetOverall: number, jitter: () => number): Attrs {
  const w = POSITION_WEIGHTS[pos];
  const a = {} as Attrs;
  for (const k of ATTR_KEYS) {
    const importance = w[k];
    const base = importance >= 0.2 ? targetOverall + 3 : importance > 0 ? targetOverall - 2 : targetOverall - 18;
    a[k] = clamp(Math.round(base + (jitter() - 0.5) * 10), 20, 95);
  }
  // Ajustement pour retomber exactement sur la note visée
  let guard = 0;
  while (overallOf(a, pos) !== targetOverall && guard++ < 60) {
    const diff = targetOverall - overallOf(a, pos);
    const k = keyAttrs(pos)[guard % keyAttrs(pos).length];
    a[k] = clamp(a[k] + Math.sign(diff), 20, 99);
  }
  return a;
}

/**
 * Conversion depuis les 51 attributs de la carrière v1 (migration).
 * Moyennes des familles d'attributs correspondantes.
 */
export function fromLegacyAttributes(old: Record<string, number>, isGK: boolean): Attrs {
  const avg = (...keys: string[]) => {
    const vals = keys.map(k => old[k]).filter(v => typeof v === "number");
    return vals.length ? Math.round(vals.reduce((x, y) => x + y, 0) / vals.length) : 50;
  };
  if (isGK) {
    return {
      pac: avg("gkDiving"), sho: avg("gkHandling"), pas: avg("gkKicking", "gkDistribution"),
      dri: avg("gkReflexes", "reactions"), def: avg("gkPositioning", "gkOneonOne"), phy: avg("gkSpeed", "acceleration"),
    };
  }
  return {
    pac: avg("acceleration", "sprintSpeed"),
    sho: avg("finishing", "shotPower", "longShot", "volleys", "penalties", "attPositioning"),
    pas: avg("shortPassing", "longPassing", "vision", "crossing", "curve", "freeKick"),
    dri: avg("dribbling", "ballControl", "agility", "balance", "composure", "reactions"),
    def: avg("standingTackle", "slidingTackle", "interceptions", "defAwareness", "marking", "headingAccuracy"),
    phy: avg("stamina", "strength", "jumping", "aggression"),
  };
}

/** Correspondance des postes v1 (15) vers les postes du monde (10). */
export function legacyPosition(p: string): WorldPlayerPosition {
  const map: Record<string, WorldPlayerPosition> = {
    GK: "GK", CB: "CB", LB: "LB", RB: "RB", LWB: "LB", RWB: "RB",
    CDM: "DM", CM: "CM", CAM: "AM", LM: "LW", RM: "RW", LW: "LW", RW: "RW", CF: "ST", ST: "ST",
  };
  return map[p] ?? "CM";
}
