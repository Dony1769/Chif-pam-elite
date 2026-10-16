/**
 * FC CAREER 27 — Mode Manager : types
 * Le joueur dirige un club du monde vivant (gestion façon Football Club Manager).
 * Sauvegarde SÉPARÉE de la carrière joueur : aucune interférence possible.
 */

import type { WorldLiveState } from "../domain/worldState";
import type { ClubSeasonTarget } from "../domain/clubAI";

export const MANAGER_SAVE_VERSION = 1;
export const MANAGER_SAVE_KEY = "fc-career-v2:manager";

// ─── Tactique ────────────────────────────────────────────────────────────────

export type FormationId = "4-4-2" | "4-3-3" | "4-2-3-1" | "3-5-2" | "5-3-2" | "4-1-4-1";

/** Ligne d'un poste dans la formation */
export type SlotLine = "GK" | "DEF" | "MID" | "ATT";

export type Mentality = "very_defensive" | "defensive" | "balanced" | "attacking" | "very_attacking";
export type PlayStyle = "possession" | "counter" | "direct" | "pressing" | "balanced";

export interface Tactic {
  formation: FormationId;
  mentality: Mentality;
  style: PlayStyle;
}

/** Composition : 11 identifiants de joueurs, index = slot de la formation */
export interface Lineup {
  starters: string[];
  bench: string[];
  captainId: string | null;
}

// ─── Match du club géré ──────────────────────────────────────────────────────

export type MatchEventType =
  | "goal" | "chance" | "save" | "yellow" | "red" | "injury" | "sub" | "half_time" | "full_time";

export interface MatchEvent {
  minute: number;
  type: MatchEventType;
  side: "home" | "away";
  playerId?: string;
  assistId?: string;
  /** Joueur entrant pour un remplacement */
  inPlayerId?: string;
  text: string;
}

export interface MatchSideStats {
  goals: number;
  shots: number;
  shotsOnTarget: number;
  possession: number; // %
  xg: number;
}

export interface ManagerMatchReport {
  fixtureId: string;
  season: number;
  matchday: number;
  homeClubId: string;
  awayClubId: string;
  events: MatchEvent[];
  home: MatchSideStats;
  away: MatchSideStats;
  /** Notes /10 des joueurs du club géré */
  ratings: Record<string, number>;
  managedSide: "home" | "away";
}

// ─── Finances ────────────────────────────────────────────────────────────────

export type LedgerCategory =
  | "tickets" | "tv" | "sponsor" | "prize" | "transfer_in" | "transfer_out"
  | "wages" | "staff" | "facilities" | "other";

export interface LedgerEntry {
  season: number;
  week: number;
  category: LedgerCategory;
  amount: number; // positif = revenu, négatif = dépense
  label: string;
}

export interface ClubFinances {
  balance: number;
  transferBudget: number;
  /** Plafond hebdomadaire de masse salariale fixé par le conseil */
  wageBudget: number;
  ledger: LedgerEntry[]; // 200 dernières lignes max
}

// ─── Conseil d'administration ────────────────────────────────────────────────

export interface BoardState {
  objective: ClubSeasonTarget;
  /** 0-100 — sous 15, le manager est licencié */
  confidence: number;
  patience: number;
}

// ─── Boîte de réception ──────────────────────────────────────────────────────

export type InboxKind = "board" | "match" | "finance" | "squad" | "news" | "welcome";

export interface InboxMessage {
  id: string;
  season: number;
  week: number;
  kind: InboxKind;
  title: string;
  body: string;
  read: boolean;
}

// ─── État complet ────────────────────────────────────────────────────────────

export type ManagerStatus = "active" | "sacked";

// ─── Marché (Lot M2) ─────────────────────────────────────────────────────────

export interface PlayerContract {
  /** Salaire hebdomadaire (€) */
  wage: number;
  /** Saisons restantes (0 = part libre en fin de saison) */
  seasonsLeft: number;
}

/** Offre d'un club IA pour un joueur du club géré */
export interface IncomingOffer {
  id: string;
  playerId: string;
  fromClubId: string;
  fee: number;
  /** Index absolu de semaine d'expiration (season*100+week) */
  expiresAt: number;
}

/** Accord de transfert conclu avec le club vendeur, en attente du contrat joueur */
export interface PendingDeal {
  playerId: string;
  fromClubId: string | null; // null = joueur libre
  fee: number;
  wageDemand: number;
  /** Nombre de tentatives de négociation restantes */
  attemptsLeft: number;
}

export interface ScoutAssignment {
  playerId: string;
  readyAt: number; // index absolu de semaine
}

export interface LoanOut {
  playerId: string;
  toClubId: string;
  untilSeason: number;
}

// ─── Club : stade, installations, staff, sponsors (Lot M3) ───────────────────

export type FacilityId = "training" | "academy" | "medical";
export type StaffRole = "coach" | "fitness" | "physio" | "youth" | "scout";

export interface StaffMember {
  id: string;
  role: StaffRole;
  name: string;
  /** Compétence 1-5 */
  quality: number;
  wage: number;
}

export interface BuildProject {
  kind: "stadium" | FacilityId;
  /** Index absolu de semaine de livraison (season*100+week) */
  readyAt: number;
  cost: number;
  /** Places ajoutées (stade) */
  seats?: number;
}

export interface SponsorOffer {
  id: string;
  name: string;
  weekly: number;
  winBonus: number;
  /** Prime si l'objectif du conseil est atteint en fin de saison */
  objectiveBonus: number;
  style: "safe" | "balanced" | "ambitious";
}

export interface ClubInfra {
  stadium: { name: string; capacity: number; ticketPrice: number };
  facilities: Record<FacilityId, number>;
  staff: StaffMember[];
  /** Candidats disponibles au recrutement (renouvelés chaque saison) */
  staffMarket: StaffMember[];
  projects: BuildProject[];
  sponsor: SponsorOffer | null;
  sponsorOffers: SponsorOffer[];
  /** Saison pour laquelle offres sponsors et staff ont été générés */
  generatedSeason: number;
  /** Dernière affluence à domicile */
  lastAttendance: { spectators: number; fill: number; revenue: number } | null;
}

export interface MarketState {
  contracts: Record<string, PlayerContract>;
  /** Joueurs mis sur la liste des transferts : prix demandé */
  transferList: Record<string, number>;
  offers: IncomingOffer[];
  pendingDeals: PendingDeal[];
  scouted: Record<string, true>;
  scouting: ScoutAssignment[];
  loansOut: LoanOut[];
  /** Joueurs sans club, signables à tout moment */
  freeAgents: import("../data/worldPlayers").WorldPlayer[];
  /** Jeunes du centre de formation (hors effectif tant qu'ils ne sont pas promus) */
  youth: import("../data/worldPlayers").WorldPlayer[];
  /** Saison pour laquelle le centre et le marché libre ont été générés */
  generatedSeason: number;
}

export interface ManagerSeasonRecord {
  season: number;
  clubId: string;
  leagueId: string;
  position: number;
  points: number;
  objective: ClubSeasonTarget;
  objectiveMet: boolean;
}

export interface ManagerState {
  version: typeof MANAGER_SAVE_VERSION;
  managerName: string;
  clubId: string;
  status: ManagerStatus;
  world: WorldLiveState;
  tactic: Tactic;
  lineup: Lineup;
  /** Matchs de suspension restants : playerId → nombre */
  suspensions: Record<string, number>;
  finances: ClubFinances;
  /** Marché des transferts — optionnel : complété au chargement des parties M1 */
  market?: MarketState;
  /** Stade, installations, staff, sponsors — optionnel : complété au chargement */
  infra?: ClubInfra;
  board: BoardState;
  inbox: InboxMessage[];
  lastMatch: ManagerMatchReport | null;
  /** Matchs du club joués pendant la dernière semaine (monde CP : 2 en cas de match en semaine) */
  weekReports?: ManagerMatchReport[];
  history: ManagerSeasonRecord[];
  createdAt: number;
  savedAt: number;
}
