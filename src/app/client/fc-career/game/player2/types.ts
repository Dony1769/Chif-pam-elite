/**
 * FC CAREER 27 — Carrière Joueur v2 : types.
 *
 * Le joueur vit dans le monde vivant du mode Manager. Son club est piloté par
 * un « coach » IA qui réutilise tout le moteur manager (match minute par
 * minute, ligue cohérente, monde, fin de saison) via `shadow`.
 * Sauvegarde SÉPARÉE : la carrière v1 et le mode Manager ne sont pas touchés.
 */

import type { ManagerMatchReport, ManagerState, InboxMessage } from "../manager/types";
import type { AttrKey, Attrs } from "./attributes";
import type { WorldPlayerPosition } from "../data/worldPlayers";

export const PLAYER2_SAVE_VERSION = 1;
export const PLAYER2_SAVE_KEY = "fc-career-v3:player";

export type Foot = "left" | "right" | "both";

export interface PlayerProfile {
  /** Identifiant du joueur dans le monde (WorldPlayer.id) */
  id: string;
  firstName: string;
  lastName: string;
  nationality: string;
  foot: Foot;
  position: WorldPlayerPosition;
  attrs: Attrs;
  potential: number;
  /** Expérience accumulée par caractéristique (100+ → +1 point) */
  xp: Attrs;
  trainingFocus: AttrKey;
  /** Réputation sportive 0-100 */
  reputation: number;
}

export type Selection = "starter" | "bench" | "out" | "injured" | "suspended";
export type SquadRole = "prospect" | "rotation" | "starter" | "key";

export interface PlayerContractV2 {
  clubId: string;
  wage: number;
  seasonsLeft: number;
  role: SquadRole;
}

export interface SeasonLine {
  season: number;
  clubId: string;
  leagueId: string;
  apps: number;
  starts: number;
  goals: number;
  assists: number;
  ratingSum: number;
  motm: number;
}

export interface PlayerMatchSummary {
  report: ManagerMatchReport;
  played: boolean;
  started: boolean;
  rating: number | null;
  goals: number;
  assists: number;
  motm: boolean;
}

export interface PlayerCareerState {
  version: typeof PLAYER2_SAVE_VERSION;
  /** Club du joueur piloté par l'IA avec le moteur manager */
  shadow: ManagerState;
  profile: PlayerProfile;
  contract: PlayerContractV2;
  /** Confiance de l'entraîneur 0-100 */
  coachTrust: number;
  selection: Selection;
  seasons: SeasonLine[];
  lastMatch: PlayerMatchSummary | null;
  inbox: InboxMessage[];
  createdAt: number;
  savedAt: number;
  /** Migration depuis la carrière v1 */
  legacy?: {
    careerId: string;
    importedAt: number;
    apps: number;
    goals: number;
    assists: number;
    seasonsPlayed: number;
  };
}
