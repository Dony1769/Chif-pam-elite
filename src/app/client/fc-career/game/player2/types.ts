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
import type { SubAttrs, SubKey } from "./subAttributes";
import type { PlayStyleState } from "./playstyles";

/** Ce que travaille le joueur : un sous-attribut, une famille, ou un geste spécial. */
export type TrainingFocus = SubKey | `group:${AttrKey}` | "weakFoot" | "skillMoves";
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
  /** Les 6 grandes caractéristiques, CALCULÉES depuis `sub` */
  attrs: Attrs;
  /** 29 sous-attributs de joueur de champ + 5 de gardien */
  sub: SubAttrs;
  potential: number;
  /** Ancienne expérience par caractéristique (v1 du profil, conservée) */
  xp: Attrs;
  /** Expérience par sous-attribut (seuil xpNeeded → +1) */
  subXp: Partial<Record<SubKey, number>>;
  trainingFocus: TrainingFocus;
  /** Pied faible et gestes techniques : 1 à 5 étoiles */
  weakFoot: number;
  skillMoves: number;
  /** Expérience des entraînements spéciaux (pied faible, gestes) */
  specialXp: { weakFoot: number; skillMoves: number };
  playStyles: PlayStyleState;
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

// ─── Carrière (Lot J3) ───────────────────────────────────────────────────────

export interface ClubOffer {
  id: string;
  clubId: string;
  kind: "transfer" | "loan" | "free";
  fee: number;
  wage: number;
  seasons: number;
  role: SquadRole;
  /** Index absolu de semaine d'expiration (season*100+week) */
  expiresAt: number;
}

export interface NationalTeamState {
  countryId: string;
  called: boolean;
  caps: number;
  goals: number;
  /** Semaine (index absolu) du dernier rassemblement traité */
  lastWindow: number;
}

export interface Award {
  season: number;
  id: "top_scorer" | "revelation" | "golden_star" | "league_title" | "promotion" | "assist_king";
  label: string;
}

export interface CareerExtras {
  /** Économies du joueur (€) */
  bank: number;
  offers: ClubOffer[];
  /** Le joueur a demandé à partir (plus d'offres) */
  transferRequested: boolean;
  /** Prêt en cours : club propriétaire et saison de retour */
  loan: { parentClubId: string; untilSeason: number; parentWage: number; parentSeasonsLeft: number } | null;
  national: NationalTeamState;
  awards: Award[];
  /** Contrat arrivé à échéance : offres libres en attente */
  freeAgentSince: number | null;
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
  /** Carrière (Lot J3) — optionnel : complété au chargement des parties J1/J2 */
  career?: CareerExtras;
  createdAt: number;
  savedAt: number;
  /** Fin de carrière annoncée par le joueur */
  retired?: { season: number; week: number; age: number };
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
