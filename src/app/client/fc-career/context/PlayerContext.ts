/**
 * FC CAREER — Contexte du joueur actuel
 */

"use client";

import { createContext, useContext } from "react";
import type { Player } from "../types/player";
import type { Club } from "../types/club";
import { getClub } from "../constants/clubs";

export interface PlayerContextValue {
  player: Player | null;
  club: Club | null; // club du contrat courant
}

export const PlayerContext = createContext<PlayerContextValue>({ player: null, club: null });

export function usePlayerContext(): PlayerContextValue {
  return useContext(PlayerContext);
}

/** Fabrique la valeur de contexte à partir d'un joueur (résout le club). */
export function buildPlayerContext(player: Player | null): PlayerContextValue {
  const club = player ? getClub(player.contract.clubId) ?? null : null;
  return { player, club };
}
