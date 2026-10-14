/**
 * FC CAREER — Sélecteurs d'état
 * Fonctions pures qui extraient des données dérivées de l'état.
 */

import type { GameState } from "./gameReducer";
import type { Player } from "../domain/player";
import type { Career } from "../domain/career";
import type { Wallet } from "../domain/economy";

export const selectPlayer = (s: GameState): Player | null => s.save?.player ?? null;
export const selectCareer = (s: GameState): Career | null => {
  if (!s.save) return null;
  return s.save.career as unknown as Career;
};
export const selectWallet = (s: GameState): Wallet | null => s.save?.wallet ?? null;
export const selectSeason = (s: GameState): number => s.save?.career.season ?? 1;
export const selectMatchday = (s: GameState): number => s.save?.career.matchday ?? 1;
export const selectPhase = (s: GameState) => s.save?.career.phase ?? "academy";
export const selectClubs = (s: GameState) => s.save?.world.clubs ?? [];
export const selectCurrentClub = (s: GameState) => {
  const player = selectPlayer(s);
  if (!player) return null;
  return s.save?.world.clubs.find((c) => c.id === player.contract.clubId) ?? null;
};
export const selectIsLoading = (s: GameState) => s.isLoading;
export const selectError = (s: GameState) => s.error;
export const selectHasSave = (s: GameState) => s.save !== null;
export const selectLastMatchResults = (s: GameState) =>
  s.save?.world.lastMatchResults ?? [];
