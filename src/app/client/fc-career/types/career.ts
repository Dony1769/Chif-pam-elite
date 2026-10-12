/**
 * FC CAREER — État de carrière runtime + helpers de persistance.
 *
 * C'est la vue "runtime" de la sauvegarde : meta (versionnée) + joueur + wallet.
 * Utilisé par les pages hub (dashboard, create-player).
 */

import type { FullSave } from "../utils/storage";
import type { GameSave, SeasonState, MatchDay } from "./game";
import type { Player } from "./player";
import type { Wallet } from "./economy";
import type { SimulatedMatch } from "./match";

export interface CareerRuntimeState {
  meta: GameSave;
  player: Player | null;
  wallet: Wallet | null;
  /** Dernier match simulé (non persisté, perdu au rechargement). */
  lastMatch?: SimulatedMatch | null;
}

/** Convertit une sauvegarde storage.ts -> état de carrière des pages. */
export function toCareerState(save: FullSave | null): CareerRuntimeState | null {
  if (!save) return null;
  return { meta: save.meta, player: save.player, wallet: save.wallet };
}

/** Convertit un état de carrière -> sauvegarde storage.ts. */
export function toFullSave(state: CareerRuntimeState): FullSave {
  return { meta: state.meta, player: state.player, wallet: state.wallet };
}

/** Saison en cours (raccourci typé). */
export type CareerSeason = SeasonState;

/** Alias de journée pour les composants calendrier. */
export type CareerFixture = MatchDay;
