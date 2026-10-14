/**
 * FC CAREER — Schéma de sauvegarde versionné
 * Version actuelle : 1
 * Toute modification du schéma doit incrémenter SAVE_VERSION
 * et ajouter une migration dans migrations.ts.
 */

import type { Player } from "../domain/player";
import type { Career } from "../domain/career";
import type { Wallet, Transfer } from "../domain/economy";
import type { Club, League, Country, Standing } from "../domain/club";
import type { SeasonSchedule } from "../domain/season";
import type { MatchResult } from "../domain/match";
import type { CoachProfile } from "../domain/coach";
import type { AgentState } from "../domain/agent";

export const SAVE_VERSION = 1;
export const SAVE_KEY = "fc-career-v2:save";

/**
 * Structure complète de la sauvegarde.
 * Toutes les propriétés optionnelles permettent les migrations progressives.
 */
export interface GameSaveV1 {
  version: 1;
  meta: {
    careerId: string;
    createdAt: number;
    savedAt: number;
    playTime: number; // secondes
  };
  player: Player;
  career: Omit<Career, "completedMatchIds"> & {
    completedMatchIds: string[]; // Set sérialisé en tableau
  };
  wallet: Wallet;
  world: {
    countries: Country[];
    leagues: League[];
    clubs: Club[];
    standings: Record<string, Standing>; // leagueId -> standing
    schedules: SeasonSchedule[];
    lastMatchResults: MatchResult[]; // 20 derniers max
  };
  transferHistory: Transfer[];
  /** Profil coach — optionnel pour compatibilité avec les sauvegardes existantes */
  coach?: CoachProfile;
  /** Agent & contrats — optionnel pour compatibilité avec les sauvegardes existantes */
  agentState?: AgentState;
  /**
   * État de la semaine en cours — optionnel pour rétrocompatibilité.
   * Réinitialisé à chaque COMMIT_WEEK.
   */
  weekState?: {
    trainingDone: boolean;
    trainingIntensity: "light" | "normal" | "intense" | null;
    matchPlayed: boolean;
  };
  /** Médias & réputation — optionnel pour rétrocompatibilité */
  media?: {
    mediaReputation: number;       // 0-100
    lastHeadline: string | null;
    pressConferences: PressConference[];
  };
  /** Sponsors — optionnel pour rétrocompatibilité */
  sponsors?: SponsorContract[];
  /** Sélection nationale — optionnel pour rétrocompatibilité */
  nationalTeam?: {
    called: boolean;
    caps: number;
    goals: number;
    lastCallSeason: number | null;
  };
  /** Fans & popularité — optionnel pour rétrocompatibilité */
  fans?: {
    fanRating: number;   // 0-100
    followers: number;
    events: FanEvent[];
  };
  /** Récompenses — optionnel pour rétrocompatibilité */
  awards?: Award[];
  /** Journal autobiographique — optionnel pour rétrocompatibilité */
  journal?: JournalEntry[];
}

export interface PressConference {
  id: string;
  season: number;
  week: number;
  question: string;
  answer: string;
  impact: number; // -10 à +10 sur mediaReputation
}

export interface SponsorContract {
  id: string;
  name: string;
  logo: string;       // emoji ou lettre
  weeklyBonus: number;
  season: number;
  weeksLeft: number;
  missionDone: boolean;
  missionLabel: string;
}

export interface FanEvent {
  id: string;
  season: number;
  week: number;
  type: "match_win" | "goal" | "transfer" | "award" | "scandal";
  label: string;
  impact: number;
}

export interface Award {
  id: string;
  season: number;
  label: string;
  icon: string;
}

export interface JournalEntry {
  id: string;
  season: number;
  week: number;
  type: "match" | "training" | "contract" | "transfer" | "award" | "injury" | "milestone";
  title: string;
  body: string;
}

/** Type union pour les migrations futures */
export type AnyGameSave = GameSaveV1;

/** Résultat d'une tentative de chargement */
export type LoadResult =
  | { ok: true; save: GameSaveV1 }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "invalid"; detail: string }
  | { ok: false; reason: "migration_failed"; detail: string };
