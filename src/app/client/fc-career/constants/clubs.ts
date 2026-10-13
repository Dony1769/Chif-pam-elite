/**
 * FC CAREER — Univers Fictif : 96+ clubs repartis sur 5 pays
 * Barrel file — donnees par pays dans clubs-*.ts
 */

import type { Club, Division, Country } from "../types/club";

import { GALLIA_D1, GALLIA_D2 } from "./clubs-gallia";
import { ALBION_D1, ALBION_D2, ALBION_D3, ALBION_D4 } from "./clubs-albion";
import { CASTILLA_D1 } from "./clubs-castilla";
import { GERMANIA_D1 } from "./clubs-germania";
import { AZZURRIA_D1 } from "./clubs-azzurria";

export {
  GALLIA_D1, GALLIA_D2,
  ALBION_D1, ALBION_D2, ALBION_D3, ALBION_D4,
  CASTILLA_D1,
  GERMANIA_D1,
  AZZURRIA_D1,
};

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

/** Clubs accessibles au joueur en debut de carriere selon le pays choisi. */
export function getStartingClubs(country: Country): Club[] {
  return getClubsByCountry(country);
}
