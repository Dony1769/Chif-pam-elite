/** FC CAREER 27 — Identité du joueur : apparence, numéro, célébration. */

import type { PlayerCareerState } from "./types";
import type { Look } from "../../manager/_ui/Avatar";

export const CELEBRATIONS: { id: string; label: string; line: string }[] = [
  { id: "siu", label: "Le saut", line: "s'envole et retombe bras écartés devant la tribune" },
  { id: "knee", label: "Glissade à genoux", line: "glisse à genoux jusqu'au poteau de corner" },
  { id: "heart", label: "Cœur avec les mains", line: "forme un cœur avec les mains vers les supporters" },
  { id: "sky", label: "Doigts vers le ciel", line: "pointe les deux index vers le ciel" },
  { id: "cold", label: "Calme glacial", line: "reste impassible, mains sur les hanches" },
  { id: "shh", label: "Chut au public", line: "met un doigt sur la bouche face au public adverse" },
  { id: "badge", label: "Baiser du blason", line: "embrasse le blason de son maillot" },
  { id: "dance", label: "Pas de danse", line: "improvise un pas de danse avec ses coéquipiers" },
  { id: "phone", label: "Coup de fil", line: "mime un coup de téléphone vers la caméra" },
  { id: "salute", label: "Salut militaire", line: "se fige pour un salut militaire" },
];
export const celebrationLine = (id?: string) => CELEBRATIONS.find(c => c.id === id)?.line;

export interface IdentityInput { look?: Look; shirt?: number; celebration?: string }

export function setIdentity(s: PlayerCareerState, i: IdentityInput): PlayerCareerState {
  const shirt = i.shirt === undefined ? s.profile.shirt : Math.max(1, Math.min(99, Math.round(i.shirt)));
  return { ...s, profile: { ...s.profile, look: i.look ?? s.profile.look, shirt, celebration: i.celebration ?? s.profile.celebration } };
}
