/**
 * FC CAREER 27 — Carrière Joueur v2 : postes secondaires.
 *
 * Le joueur a un poste principal et des postes voisins avec une familiarité
 * (0-100). Le coach compose son équipe avec la note du joueur à chaque poste :
 * s'il est barré à son poste, il peut être décalé sur un poste voisin. Jouer à
 * un poste augmente sa familiarité ; à 80, il peut en faire son poste principal.
 */

import type { WorldPlayerPosition } from "../data/worldPlayers";
import { overallFromSubs } from "./subAttributes";
import type { SubAttrs } from "./subAttributes";

export type Pos = WorldPlayerPosition;

/** Familiarité de départ avec les postes voisins. */
export const NEIGHBOURS: Record<Pos, Partial<Record<Pos, number>>> = {
  GK: {},
  CB: { DM: 45, RB: 30, LB: 30 },
  LB: { RB: 50, CB: 35, LW: 30 },
  RB: { LB: 50, CB: 35, RW: 30 },
  DM: { CM: 60, CB: 40 },
  CM: { DM: 55, AM: 55 },
  AM: { CM: 55, ST: 40, LW: 35, RW: 35 },
  LW: { RW: 60, AM: 40, ST: 35, LB: 20 },
  RW: { LW: 60, AM: 40, ST: 35, RB: 20 },
  ST: { AM: 40, LW: 35, RW: 35 },
};

/** Familiarité à partir de laquelle un poste peut devenir le poste principal. */
export const MASTERED = 80;
/** Gain de familiarité par match commencé à ce poste. */
export const FAMILIARITY_PER_START = 6;

export function defaultFamiliarity(primary: Pos): Partial<Record<Pos, number>> {
  return { ...NEIGHBOURS[primary] };
}

/** Points de note perdus à un poste selon la familiarité (0 à 100 → -10 à 0). */
export const familiarityPenalty = (fam: number) => Math.round((100 - Math.max(0, Math.min(100, fam))) / 10);

/** Note du joueur à chaque poste qu'il connaît (principal compris). */
export function positionRatings(sub: SubAttrs, primary: Pos, fam: Partial<Record<Pos, number>>): Partial<Record<Pos, number>> {
  const out: Partial<Record<Pos, number>> = { [primary]: overallFromSubs(sub, primary) };
  for (const [pos, f] of Object.entries(fam) as [Pos, number][]) {
    if (pos === primary || pos === "GK" || primary === "GK") continue;
    out[pos] = Math.max(30, overallFromSubs(sub, pos) - familiarityPenalty(f));
  }
  return out;
}

/** Familiarité après un match commencé à `played`. */
export function gainFamiliarity(fam: Partial<Record<Pos, number>>, primary: Pos, played: Pos): Partial<Record<Pos, number>> {
  if (played === primary) return fam;
  return { ...fam, [played]: Math.min(100, (fam[played] ?? 0) + FAMILIARITY_PER_START) };
}

/** Nouveau poste principal : l'ancien reste parfaitement connu. */
export function switchPrimary(fam: Partial<Record<Pos, number>>, oldPrimary: Pos, next: Pos): Partial<Record<Pos, number>> {
  const out = { ...fam, [oldPrimary]: 100 };
  delete out[next];
  for (const [p, f] of Object.entries(NEIGHBOURS[next]) as [Pos, number][]) if (out[p] === undefined && p !== next) out[p] = f;
  return out;
}
