/**
 * Effectifs officiels EA SPORTS FC 27 (saison 2026-27), par club.
 * Un club absent de ces listes retombe sur les anciennes listes (players/),
 * puis sur des joueurs inventés.
 */
import { FC27_ENG1 } from "./eng1";
import { FC27_ESP1 } from "./esp1";
import { FC27_ITA1 } from "./ita1";
import { FC27_GER1 } from "./ger1";
import { FC27_FRA1 } from "./fra1";
import { FC27_ENG2 } from "./eng2";
import { FC27_ESP2 } from "./esp2";
import { FC27_ITA2 } from "./ita2";
import { FC27_GER2 } from "./ger2";
import { FC27_FRA2 } from "./fra2";

export const FC27_ROSTERS: Record<string, string> = { ...FC27_ENG1, ...FC27_ESP1, ...FC27_ITA1, ...FC27_GER1, ...FC27_FRA1, ...FC27_ENG2, ...FC27_ESP2, ...FC27_ITA2, ...FC27_GER2, ...FC27_FRA2 };
