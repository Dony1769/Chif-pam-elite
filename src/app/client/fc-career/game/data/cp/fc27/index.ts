/**
 * Effectifs officiels EA SPORTS FC 27 (saison 2026-27), par club.
 * Un club absent de ces listes retombe sur les anciennes listes (players/),
 * puis sur des joueurs inventés.
 */
import { FC27_ENG1 } from "./eng1";
import { FC27_ESP1 } from "./esp1";

export const FC27_ROSTERS: Record<string, string> = { ...FC27_ENG1, ...FC27_ESP1 };
