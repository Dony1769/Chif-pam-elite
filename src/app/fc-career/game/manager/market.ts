/**
 * FC CAREER 27 — Mode Manager : marché des transferts (Lot M2).
 *
 * Achats en deux temps (accord club → contrat joueur), ventes et offres IA,
 * liste des transferts, prêts, contrats en saisons, masse salariale, scouts,
 * centre de formation, joueurs libres. Fonctions pures et déterministes.
 *
 * Les règles retournent toujours un résultat explicite : { ok, state, message }.
 */

import type { WorldPlayer, WorldPlayerPosition } from "../data/worldPlayers";
import type { WorldTransferRecord } from "../domain/worldState";
import { FIRST_NAMES, LAST_NAMES } from "../domain/playerProgression";
import { createRng, seedFromString } from "../utils/random";
import { scoutCostFactor, youthIntakeSize, youthPotentialBonus } from "./clubMath";
import { ensureInfra, seasonClub, weeklyClub } from "./club";
import type {
  IncomingOffer, ManagerState, MarketState, PendingDeal, PlayerContract,
} from "./types";
import {
  addLedger, autoLineup, clamp, formatMoney, getManagedClub, getLeagueSchedule, getSquad, isSeasonOver, msg,
  playWeek, pushInbox, squadStrength, weeklyWages,
} from "./engine";
import { inventPlayer } from "../data/cp/cpWorld";
import { WINTER_WINDOW, transferWindow } from "../domain/calendar";
import { fullName as displayName } from "../utils/names";

export const SQUAD_MIN = 16;
export const SQUAD_MAX = 28;
export const MAX_NEGOTIATION_ATTEMPTS = 3;

export interface MarketResult {
  ok: boolean;
  state: ManagerState;
  message: string;
}

const fail = (state: ManagerState, message: string): MarketResult => ({ ok: false, state, message });
const done = (state: ManagerState, message: string): MarketResult => ({ ok: true, state, message });

const fullName = (p: WorldPlayer) => `${displayName(p)}`;
const weekIndex = (s: ManagerState) => s.world.season * 100 + s.world.currentWeek;

// ─── Initialisation ──────────────────────────────────────────────────────────

/** Complète le marché d'une partie (nouvelle ou issue du Lot M1). Idempotent. */
export function ensureMarket(s: ManagerState): ManagerState {
  if (s.market && s.market.generatedSeason === s.world.season) return s;
  const club = getManagedClub(s);
  const squad = getSquad(s);
  const formula = weeklyWages(squad, club);
  const contracts: Record<string, PlayerContract> = { ...(s.market?.contracts ?? {}) };
  for (const p of squad) {
    if (!contracts[p.id]) contracts[p.id] = { wage: formula[p.id] ?? 0, seasonsLeft: clamp(Math.round(p.contractWeeksLeft / 52), 1, 5) };
  }
  const base: MarketState = s.market ?? {
    contracts, transferList: {}, offers: [], pendingDeals: [], scouted: {}, scouting: [], loansOut: [],
    freeAgents: [], youth: [], generatedSeason: 0,
  };
  // Première initialisation : le conseil laisse 12 % de marge sur la masse salariale
  const finances = s.market ? s.finances : { ...s.finances, wageBudget: Math.round(s.finances.wageBudget * 1.12 / 1000) * 1000 };
  return {
    ...s,
    finances,
    market: {
      ...base,
      contracts,
      freeAgents: generateFreeAgents(s),
      youth: [...base.youth, ...generateYouthIntake(s)],
      generatedSeason: s.world.season,
    },
  };
}

function market(s: ManagerState): MarketState {
  if (!s.market) throw new Error("Marché non initialisé : appeler ensureMarket()");
  return s.market;
}

function withMarket(s: ManagerState, patch: Partial<MarketState>): ManagerState {
  return { ...s, market: { ...market(s), ...patch } };
}

// ─── Fenêtre des transferts ──────────────────────────────────────────────────

/** Mercato ouvert : 3 premières journées, 2 journées à la mi-saison, et l'intersaison. */
export function isWindowOpen(s: ManagerState): boolean {
  // Monde CP : mercato d'été (juillet → 1er septembre) et d'hiver (janvier)
  if (s.world.dataset === "cp") return transferWindow(s.world.currentWeek) !== null;
  const sch = getLeagueSchedule(s);
  if (!sch || isSeasonOver(s)) return true;
  const md = sch.currentMatchday;
  const mid = Math.floor(sch.totalMatchdays / 2);
  return md <= 3 || (md >= mid && md <= mid + 1);
}

export function windowLabel(s: ManagerState): string {
  if (s.world.dataset === "cp") {
    const w = transferWindow(s.world.currentWeek);
    if (w === "summer") return "Mercato d'été ouvert (jusqu'au 1er septembre)";
    if (w === "winter") return "Mercato d'hiver ouvert (janvier)";
    return s.world.currentWeek < WINTER_WINDOW[0] ? "Mercato fermé, réouverture en janvier" : "Mercato fermé, réouverture le 1er juillet";
  }
  if (isWindowOpen(s)) return "Mercato ouvert";
  const sch = getLeagueSchedule(s)!;
  const mid = Math.floor(sch.totalMatchdays / 2);
  return sch.currentMatchday < mid ? `Mercato fermé, réouverture journée ${mid}` : "Mercato fermé jusqu'à l'intersaison";
}

// ─── Valeurs, prix, salaires ─────────────────────────────────────────────────

/** Prix demandé par un club IA pour l'un de ses joueurs. */
export function askingPrice(s: ManagerState, p: WorldPlayer): number {
  const mates = s.world.players.filter(x => x.clubId === p.clubId).sort((a, b) => b.overall - a.overall);
  const rank = mates.findIndex(x => x.id === p.id);
  let f = 1.15;
  if (rank >= 0 && rank < 3) f *= 1.45;        // cadre de l'équipe
  else if (rank >= 0 && rank < 11) f *= 1.15;  // titulaire
  if (p.contractWeeksLeft < 30) f *= 0.7;      // fin de contrat proche
  if (p.age >= 31) f *= 0.8;
  return Math.max(50_000, Math.round((p.marketValue * f) / 10_000) * 10_000);
}

/** Salaire hebdomadaire exigé par un joueur pour rejoindre le club géré. */
export function wageDemand(s: ManagerState, p: WorldPlayer): number {
  const club = getManagedClub(s);
  const squad = getSquad(s).filter(x => x.id !== p.id);
  const ref = weeklyWages([...squad, p], club)[p.id] ?? 0;
  const myRep = s.world.clubReputations[club.id] ?? club.reputation;
  const hisRep = s.world.clubReputations[p.clubId] ?? myRep;
  // Rejoindre plus petit que son club actuel se paie
  const step = clamp(1 + (hisRep - myRep) / 100, 0.9, 1.35);
  const persona = p.personality === "showman" ? 1.15 : p.personality === "veteran" ? 1.05 : 1;
  return Math.max(500, Math.round((ref * step * persona) / 50) * 50);
}

/** Masse salariale hebdomadaire actuelle (contrats). */
export function currentWageBill(s: ManagerState): number {
  const c = market(s).contracts;
  return getSquad(s).reduce((a, p) => a + (c[p.id]?.wage ?? 0), 0);
}

/** Le joueur accepte-t-il le projet ? (les stars refusent les clubs trop modestes) */
export function playerWillingness(s: ManagerState, p: WorldPlayer): { willing: boolean; reason: string } {
  const club = getManagedClub(s);
  const strength = squadStrength(s.world, club.id);
  const myRep = s.world.clubReputations[club.id] ?? club.reputation;
  const hisRep = s.world.clubReputations[p.clubId] ?? myRep;
  if (p.overall >= strength + 12 && myRep < hisRep - 8) {
    return { willing: false, reason: `${displayName(p)} estime que ${club.name} n'est pas assez ambitieux pour lui.` };
  }
  return { willing: true, reason: "" };
}

// ─── Connaissance des joueurs (scouts) ───────────────────────────────────────

export interface KnownRating {
  overall: number | [number, number];
  potential: number | null;
  exact: boolean;
}

/** Ce que le manager sait d'un joueur : exact pour son effectif et les joueurs observés. */
export function knownRating(s: ManagerState, p: WorldPlayer): KnownRating {
  const m = s.market;
  const own = p.clubId === s.clubId || m?.youth.some(y => y.id === p.id);
  if (own || m?.scouted[p.id]) return { overall: p.overall, potential: p.potential, exact: true };
  const sameLeague = p.leagueId === getManagedClub(s).leagueId;
  if (sameLeague) return { overall: p.overall, potential: null, exact: false };
  // Fourchette stable (dépend du joueur, pas du moment)
  const rng = createRng(seedFromString(`${s.world.seed}-fog-${p.id}`));
  const lo = p.overall - rng.int(2, 6);
  return { overall: [lo, lo + 8], potential: null, exact: false };
}

export function scoutCost(s: ManagerState): number {
  return Math.round(getManagedClub(s).wagesBudget * 0.06 * scoutCostFactor(s.infra) / 1000) * 1000;
}

export function scoutPlayer(s: ManagerState, playerId: string): MarketResult {
  s = ensureMarket(s);
  const m = market(s);
  const p = s.world.players.find(x => x.id === playerId);
  if (!p) return fail(s, "Joueur introuvable.");
  if (p.clubId === s.clubId || m.scouted[playerId]) return fail(s, `${displayName(p)} est déjà connu de vos scouts.`);
  if (m.scouting.some(a => a.playerId === playerId)) return fail(s, `Un scout observe déjà ${displayName(p)}.`);
  if (m.scouting.length >= 3) return fail(s, "Vos 3 scouts sont déjà en mission.");
  const cost = scoutCost(s);
  if (s.finances.balance < cost) return fail(s, "Trésorerie insuffisante pour envoyer un scout.");
  const finances = addLedger(s.finances, [{ season: s.world.season, week: s.world.currentWeek, category: "staff", amount: -cost, label: `Mission de scouting : ${displayName(p)}` }]);
  return done(withMarket({ ...s, finances }, { scouting: [...m.scouting, { playerId, readyAt: weekIndex(s) + 1 }] }),
    `Un scout part observer ${displayName(p)}. Rapport la semaine prochaine.`);
}

// ─── Recherche ───────────────────────────────────────────────────────────────

export interface MarketFilter {
  position?: WorldPlayerPosition;
  maxAge?: number;
  maxPrice?: number;
  leagueId?: string;
  query?: string;
}

export interface MarketListing {
  player: WorldPlayer;
  price: number;
  wage: number;
  known: KnownRating;
  free: boolean;
}

/** Joueurs achetables (autres clubs + libres), triés par note connue. */
export function searchMarket(s: ManagerState, f: MarketFilter = {}, limit = 60): MarketListing[] {
  s = ensureMarket(s);
  const q = f.query?.trim().toLowerCase();
  const pool: MarketListing[] = [
    ...market(s).freeAgents.map(p => ({ player: p, price: 0, wage: wageDemand(s, p), known: knownRating(s, p), free: true })),
    ...s.world.players
      .filter(p => p.clubId !== s.clubId && !market(s).loansOut.some(l => l.playerId === p.id))
      .map(p => ({ player: p, price: askingPrice(s, p), wage: wageDemand(s, p), known: knownRating(s, p), free: false })),
  ];
  const ovr = (k: KnownRating) => (Array.isArray(k.overall) ? (k.overall[0] + k.overall[1]) / 2 : k.overall);
  return pool
    .filter(l => !f.position || l.player.position === f.position)
    .filter(l => !f.maxAge || l.player.age <= f.maxAge)
    .filter(l => f.maxPrice === undefined || l.price <= f.maxPrice)
    .filter(l => !f.leagueId || l.player.leagueId === f.leagueId)
    .filter(l => !q || fullName(l.player).toLowerCase().includes(q))
    .sort((a, b) => ovr(b.known) - ovr(a.known))
    .slice(0, limit);
}

// ─── Achat ───────────────────────────────────────────────────────────────────

export type BidOutcome = "accepted" | "counter" | "rejected";

/**
 * Offre au club vendeur. Acceptée → accord en attente du contrat joueur.
 * Proche du prix (≥ 85 %) → contre-offre au prix demandé. Sinon refus.
 */
export function makeBid(s: ManagerState, playerId: string, fee: number): MarketResult & { outcome?: BidOutcome; counter?: number } {
  s = ensureMarket(s);
  const m = market(s);
  const p = s.world.players.find(x => x.id === playerId);
  if (!p) return fail(s, "Joueur introuvable.");
  if (p.clubId === s.clubId) return fail(s, "Ce joueur est déjà dans votre effectif.");
  if (!isWindowOpen(s)) return fail(s, `${windowLabel(s)}. Seuls les joueurs libres peuvent signer.`);
  if (getSquad(s).length >= SQUAD_MAX) return fail(s, `Effectif complet (${SQUAD_MAX} joueurs). Vendez ou prêtez d'abord.`);
  if (m.pendingDeals.some(d => d.playerId === playerId)) return fail(s, "Un accord est déjà en cours pour ce joueur : négociez son contrat.");
  if (fee > s.finances.transferBudget) return fail(s, `Offre supérieure à votre budget transferts (${formatMoney(s.finances.transferBudget)}).`);
  if (fee > s.finances.balance) return fail(s, `Trésorerie insuffisante (${formatMoney(s.finances.balance)}).`);
  const sellerSquad = s.world.players.filter(x => x.clubId === p.clubId).length;
  if (sellerSquad <= 15) return fail(s, `${clubName(s, p.clubId)} refuse de vendre : effectif trop court.`);

  const asking = askingPrice(s, p);
  if (fee >= asking) {
    const deal: PendingDeal = { playerId, fromClubId: p.clubId, fee, wageDemand: wageDemand(s, p), attemptsLeft: MAX_NEGOTIATION_ATTEMPTS };
    return { ...done(withMarket(s, { pendingDeals: [...m.pendingDeals, deal] }),
      `${clubName(s, p.clubId)} accepte ${formatMoney(fee)} pour ${displayName(p)}. Il reste à convaincre le joueur.`), outcome: "accepted" };
  }
  if (fee >= asking * 0.85) {
    return { ...fail(s, `${clubName(s, p.clubId)} fait une contre-offre : ${formatMoney(asking)}.`), outcome: "counter", counter: asking };
  }
  return { ...fail(s, `${clubName(s, p.clubId)} rejette l'offre de ${formatMoney(fee)}.`), outcome: "rejected" };
}

/** Accord de principe avec un joueur libre (pas d'indemnité, signable hors mercato). */
export function approachFreeAgent(s: ManagerState, playerId: string): MarketResult {
  s = ensureMarket(s);
  const m = market(s);
  const p = m.freeAgents.find(x => x.id === playerId);
  if (!p) return fail(s, "Ce joueur n'est plus libre.");
  if (getSquad(s).length >= SQUAD_MAX) return fail(s, `Effectif complet (${SQUAD_MAX} joueurs).`);
  if (m.pendingDeals.some(d => d.playerId === playerId)) return fail(s, "Discussion déjà en cours : proposez-lui un contrat.");
  const deal: PendingDeal = { playerId, fromClubId: null, fee: 0, wageDemand: wageDemand(s, p), attemptsLeft: MAX_NEGOTIATION_ATTEMPTS };
  return done(withMarket(s, { pendingDeals: [...m.pendingDeals, deal] }), `${displayName(p)} est ouvert à la discussion.`);
}

/**
 * Proposition de contrat au joueur (après accord club ou pour un libre).
 * Accepté si salaire ≥ 95 % de sa demande ; durée 1 à 5 saisons.
 */
export function offerContract(s: ManagerState, playerId: string, wage: number, seasons: number): MarketResult {
  s = ensureMarket(s);
  const m = market(s);
  const deal = m.pendingDeals.find(d => d.playerId === playerId);
  if (!deal) return fail(s, "Aucun accord en cours avec ce joueur.");
  const p = deal.fromClubId ? s.world.players.find(x => x.id === playerId) : m.freeAgents.find(x => x.id === playerId);
  if (!p) {
    return fail(withMarket(s, { pendingDeals: m.pendingDeals.filter(d => d.playerId !== playerId) }), "Le joueur n'est plus disponible.");
  }
  if (seasons < 1 || seasons > 5) return fail(s, "Durée de contrat : entre 1 et 5 saisons.");
  if (deal.fromClubId && !isWindowOpen(s)) return fail(s, "Le mercato a fermé avant la signature.");
  if (deal.fee > s.finances.transferBudget) return fail(s, "Budget transferts insuffisant pour finaliser.");
  if (deal.fee > s.finances.balance) return fail(s, "Trésorerie insuffisante pour finaliser.");
  if (currentWageBill(s) + wage > s.finances.wageBudget) {
    return fail(s, `Ce salaire ferait dépasser la masse salariale autorisée (${formatMoney(s.finances.wageBudget)} par semaine).`);
  }
  const will = playerWillingness(s, p);
  if (!will.willing) {
    return fail(withMarket(s, { pendingDeals: m.pendingDeals.filter(d => d.playerId !== playerId) }), will.reason);
  }
  // Un contrat long rassure : la demande baisse légèrement
  const demand = Math.round(deal.wageDemand * (1 - (seasons - 1) * 0.02));
  if (wage < demand * 0.95) {
    const left = deal.attemptsLeft - 1;
    if (left <= 0) {
      return fail(withMarket(s, { pendingDeals: m.pendingDeals.filter(d => d.playerId !== playerId) }),
        `${displayName(p)} met fin aux discussions.`);
    }
    return fail(withMarket(s, { pendingDeals: m.pendingDeals.map(d => (d.playerId === playerId ? { ...d, attemptsLeft: left } : d)) }),
      `${displayName(p)} refuse : il demande ${formatMoney(demand)} par semaine. Encore ${left} tentative(s).`);
  }
  return done(completeSigning(s, p, deal, wage, seasons), `${displayName(p)} signe pour ${seasons} saison(s) à ${formatMoney(wage)} par semaine.`);
}

function completeSigning(s: ManagerState, p: WorldPlayer, deal: PendingDeal, wage: number, seasons: number): ManagerState {
  const m = market(s);
  const club = getManagedClub(s);
  const season = s.world.season, week = s.world.currentWeek;
  const moved: WorldPlayer = { ...p, clubId: club.id, leagueId: club.leagueId, contractWeeksLeft: seasons * 52, morale: clamp(p.morale + 10, 0, 100) };
  const isFree = deal.fromClubId === null;
  const players = isFree ? [...s.world.players, moved] : s.world.players.map(x => (x.id === p.id ? moved : x));

  // Le club vendeur encaisse : son budget IA augmente
  const clubDirectors = { ...s.world.clubDirectors };
  if (deal.fromClubId && clubDirectors[deal.fromClubId]) {
    const d = clubDirectors[deal.fromClubId];
    clubDirectors[deal.fromClubId] = { ...d, remainingTransferBudget: d.remainingTransferBudget + deal.fee };
  }
  const record: WorldTransferRecord = {
    id: `mgr-in-${p.id}-s${season}w${week}`, season, week, type: isFree ? "free" : "transfer",
    playerId: p.id, playerName: fullName(p), fromClubId: deal.fromClubId ?? "free", toClubId: club.id,
    fee: deal.fee, salary: wage, description: `${displayName(p)} rejoint ${club.name}${deal.fee ? ` pour ${formatMoney(deal.fee)}` : " libre"}.`,
  };
  let finances = s.finances;
  if (deal.fee > 0) {
    finances = addLedger({ ...finances, transferBudget: finances.transferBudget - deal.fee }, [
      { season, week, category: "transfer_out", amount: -deal.fee, label: `Achat : ${displayName(p)}` },
    ]);
  }
  let next: ManagerState = {
    ...s, finances,
    world: { ...s.world, players, clubDirectors, transferHistory: [record, ...s.world.transferHistory].slice(0, 100) },
    market: {
      ...m,
      contracts: { ...m.contracts, [p.id]: { wage, seasonsLeft: seasons } },
      pendingDeals: m.pendingDeals.filter(d => d.playerId !== p.id),
      freeAgents: m.freeAgents.filter(x => x.id !== p.id),
      scouted: { ...m.scouted, [p.id]: true },
    },
  };
  next = pushInbox(next, msg(next, "squad", `Signature : ${displayName(p)}`, record.description));
  return next;
}

export function cancelDeal(s: ManagerState, playerId: string): ManagerState {
  s = ensureMarket(s);
  return withMarket(s, { pendingDeals: market(s).pendingDeals.filter(d => d.playerId !== playerId) });
}

// ─── Vente ───────────────────────────────────────────────────────────────────

export function listForTransfer(s: ManagerState, playerId: string, price: number): MarketResult {
  s = ensureMarket(s);
  const p = getSquad(s).find(x => x.id === playerId);
  if (!p) return fail(s, "Ce joueur n'est pas dans votre effectif.");
  if (!(price >= 1_000)) return fail(s, "Prix trop bas (minimum 1 k€).");
  return done(withMarket(s, { transferList: { ...market(s).transferList, [playerId]: price } }), `${displayName(p)} est sur la liste des transferts à ${formatMoney(price)}.`);
}

export function unlist(s: ManagerState, playerId: string): ManagerState {
  s = ensureMarket(s);
  const transferList = { ...market(s).transferList };
  delete transferList[playerId];
  return withMarket(s, { transferList, offers: market(s).offers.filter(o => o.playerId !== playerId) });
}

export function acceptOffer(s: ManagerState, offerId: string): MarketResult {
  s = ensureMarket(s);
  const m = market(s);
  const o = m.offers.find(x => x.id === offerId);
  if (!o) return fail(s, "Offre expirée.");
  const p = getSquad(s).find(x => x.id === o.playerId);
  if (!p) return fail(withMarket(s, { offers: m.offers.filter(x => x.id !== offerId) }), "Le joueur n'est plus au club.");
  if (!isWindowOpen(s)) return fail(s, "Mercato fermé : la vente ne peut pas être enregistrée.");
  if (getSquad(s).length <= SQUAD_MIN) return fail(s, `Effectif minimum atteint (${SQUAD_MIN} joueurs).`);
  const buyer = s.world.clubs.find(c => c.id === o.fromClubId)!;
  const season = s.world.season, week = s.world.currentWeek;
  const club = getManagedClub(s);
  const players = s.world.players.map(x => (x.id === p.id ? { ...x, clubId: buyer.id, leagueId: buyer.leagueId } : x));
  const clubDirectors = { ...s.world.clubDirectors };
  const d = clubDirectors[buyer.id];
  if (d) clubDirectors[buyer.id] = { ...d, remainingTransferBudget: Math.max(0, d.remainingTransferBudget - o.fee) };
  const contracts = { ...m.contracts };
  delete contracts[p.id];
  const transferList = { ...m.transferList };
  delete transferList[p.id];
  // 75 % de la vente revient au budget transferts
  const finances = addLedger({ ...s.finances, transferBudget: s.finances.transferBudget + Math.round(o.fee * 0.75) }, [
    { season, week, category: "transfer_in", amount: o.fee, label: `Vente : ${displayName(p)}` },
  ]);
  const record: WorldTransferRecord = {
    id: `mgr-out-${p.id}-s${season}w${week}`, season, week, type: "transfer", playerId: p.id, playerName: fullName(p),
    fromClubId: club.id, toClubId: buyer.id, fee: o.fee, salary: 0, description: `${displayName(p)} quitte ${club.name} pour ${buyer.name} (${formatMoney(o.fee)}).`,
  };
  let next: ManagerState = {
    ...s, finances,
    world: { ...s.world, players, clubDirectors, transferHistory: [record, ...s.world.transferHistory].slice(0, 100) },
    market: { ...m, contracts, transferList, offers: m.offers.filter(x => x.playerId !== p.id) },
    lineup: {
      starters: s.lineup.starters.filter(id => id !== p.id),
      bench: s.lineup.bench.filter(id => id !== p.id),
      captainId: s.lineup.captainId === p.id ? null : s.lineup.captainId,
    },
  };
  next = pushInbox(next, msg(next, "squad", `Vente : ${displayName(p)}`, record.description));
  return done(next, record.description);
}

export function rejectOffer(s: ManagerState, offerId: string): ManagerState {
  s = ensureMarket(s);
  return withMarket(s, { offers: market(s).offers.filter(o => o.id !== offerId) });
}

/** Libère un joueur : indemnité = 50 % du salaire restant sur son contrat. */
export function releasePlayer(s: ManagerState, playerId: string): MarketResult {
  s = ensureMarket(s);
  const m = market(s);
  const p = getSquad(s).find(x => x.id === playerId);
  if (!p) return fail(s, "Ce joueur n'est pas dans votre effectif.");
  if (getSquad(s).length <= SQUAD_MIN) return fail(s, `Effectif minimum atteint (${SQUAD_MIN} joueurs).`);
  const c = m.contracts[playerId] ?? { wage: 0, seasonsLeft: 1 };
  const payoff = Math.round(c.wage * 15 * Math.max(1, c.seasonsLeft) * 0.5);
  if (s.finances.balance < payoff) return fail(s, `Indemnité de départ trop élevée (${formatMoney(payoff)}).`);
  const contracts = { ...m.contracts };
  delete contracts[playerId];
  const freed = { ...p, clubId: "free", leagueId: "", contractWeeksLeft: 0 };
  const finances = addLedger(s.finances, [{ season: s.world.season, week: s.world.currentWeek, category: "wages", amount: -payoff, label: `Indemnité de départ : ${displayName(p)}` }]);
  const next: ManagerState = {
    ...s, finances,
    world: { ...s.world, players: s.world.players.filter(x => x.id !== playerId) },
    market: { ...m, contracts, freeAgents: [...m.freeAgents, freed], offers: m.offers.filter(o => o.playerId !== playerId) },
    lineup: { starters: s.lineup.starters.filter(id => id !== playerId), bench: s.lineup.bench.filter(id => id !== playerId), captainId: s.lineup.captainId === playerId ? null : s.lineup.captainId },
  };
  return done(next, `${displayName(p)} est libéré (indemnité ${formatMoney(payoff)}).`);
}

// ─── Prêts ───────────────────────────────────────────────────────────────────

/** Prête un joueur jusqu'à la fin de saison à un club de division inférieure (ou de même niveau). */
export function loanOut(s: ManagerState, playerId: string): MarketResult {
  s = ensureMarket(s);
  const m = market(s);
  const p = getSquad(s).find(x => x.id === playerId);
  if (!p) return fail(s, "Ce joueur n'est pas dans votre effectif.");
  if (!isWindowOpen(s)) return fail(s, windowLabel(s));
  if (getSquad(s).length <= SQUAD_MIN) return fail(s, `Effectif minimum atteint (${SQUAD_MIN} joueurs).`);
  const club = getManagedClub(s);
  const candidates = s.world.clubs
    .filter(c => c.id !== club.id && c.tier >= club.tier)
    .sort((a, b) => squadStrength(s.world, a.id) - squadStrength(s.world, b.id));
  // Le prêt va au club où il jouera : celui dont l'effectif est juste en dessous de son niveau
  const dest = candidates.find(c => squadStrength(s.world, c.id) <= p.overall) ?? candidates[candidates.length - 1];
  if (!dest) return fail(s, "Aucun club intéressé.");
  const players = s.world.players.map(x => (x.id === p.id ? { ...x, clubId: dest.id, leagueId: dest.leagueId } : x));
  const next: ManagerState = {
    ...s,
    world: { ...s.world, players },
    market: { ...m, loansOut: [...m.loansOut, { playerId, toClubId: dest.id, untilSeason: s.world.season }], offers: m.offers.filter(o => o.playerId !== playerId) },
    lineup: { starters: s.lineup.starters.filter(id => id !== playerId), bench: s.lineup.bench.filter(id => id !== playerId), captainId: s.lineup.captainId === playerId ? null : s.lineup.captainId },
  };
  return done(next, `${displayName(p)} est prêté à ${dest.name} jusqu'à la fin de la saison. Son salaire est pris en charge.`);
}

// ─── Contrats ────────────────────────────────────────────────────────────────

/** Prolongation : le joueur demande une hausse liée à sa progression. */
export function renewalDemand(s: ManagerState, playerId: string): number {
  s = ensureMarket(s);
  const p = getSquad(s).find(x => x.id === playerId);
  const c = market(s).contracts[playerId];
  if (!p || !c) return 0;
  const fair = weeklyWages(getSquad(s), getManagedClub(s))[playerId] ?? c.wage;
  return Math.round(Math.max(c.wage * 1.05, fair) / 50) * 50;
}

export function renewContract(s: ManagerState, playerId: string, wage: number, seasons: number): MarketResult {
  s = ensureMarket(s);
  const m = market(s);
  const p = getSquad(s).find(x => x.id === playerId);
  const c = m.contracts[playerId];
  if (!p || !c) return fail(s, "Ce joueur n'est pas sous contrat chez vous.");
  if (seasons < 1 || seasons > 5) return fail(s, "Durée de contrat : entre 1 et 5 saisons.");
  if (currentWageBill(s) - c.wage + wage > s.finances.wageBudget) return fail(s, "Ce salaire ferait dépasser la masse salariale autorisée.");
  const demand = renewalDemand(s, playerId);
  if (wage < demand * 0.95) return fail(s, `${displayName(p)} veut au moins ${formatMoney(demand)} par semaine.`);
  return done(withMarket(s, { contracts: { ...m.contracts, [playerId]: { wage, seasonsLeft: seasons } } }),
    `${displayName(p)} prolonge de ${seasons} saison(s) à ${formatMoney(wage)} par semaine.`);
}

// ─── Centre de formation ─────────────────────────────────────────────────────

const YOUTH_POSITIONS: WorldPlayerPosition[] = ["GK", "CB", "LB", "RB", "DM", "CM", "AM", "LW", "RW", "ST"];

/** Promotion des jeunes : chaque saison, 1 + niveau d'académie espoirs. */
export function generateYouthIntake(s: ManagerState): WorldPlayer[] {
  const club = getManagedClub(s);
  const rng = createRng(seedFromString(`${s.world.seed}-youth-${club.id}-s${s.world.season}`));
  const n = youthIntakeSize(s.infra, club.academyLevel);
  const bonus = youthPotentialBonus(s.infra, club.academyLevel);
  return Array.from({ length: n }, (_, i) => {
    const potential = clamp(rng.int(58, 70) + bonus, 55, 94);
    const overall = rng.int(42, Math.min(60, potential - 8));
    const age = rng.int(16, 18);
    const position = rng.pick(YOUTH_POSITIONS);
    return makePlayer(`youth-${club.id}-s${s.world.season}-${i}`, rng, {
      clubId: "academy", leagueId: "", countryId: club.countryId, age, position, overall, potential,
      personality: rng.chance(0.15) ? "prodigy" : "journeyman",
    }, s.world.dataset);
  });
}

export function promoteYouth(s: ManagerState, youthId: string): MarketResult {
  s = ensureMarket(s);
  const m = market(s);
  const y = m.youth.find(x => x.id === youthId);
  if (!y) return fail(s, "Jeune introuvable.");
  if (getSquad(s).length >= SQUAD_MAX) return fail(s, `Effectif complet (${SQUAD_MAX} joueurs).`);
  const club = getManagedClub(s);
  const wage = Math.round(club.wagesBudget * 0.004 / 50) * 50 + 300;
  const p: WorldPlayer = { ...y, clubId: club.id, leagueId: club.leagueId, contractWeeksLeft: 3 * 52 };
  const next = {
    ...s,
    world: { ...s.world, players: [...s.world.players, p] },
    market: { ...m, youth: m.youth.filter(x => x.id !== youthId), contracts: { ...m.contracts, [p.id]: { wage, seasonsLeft: 3 } } },
  };
  return done(next, `${displayName(p)} (${p.age} ans) signe son premier contrat professionnel.`);
}

export function releaseYouth(s: ManagerState, youthId: string): ManagerState {
  s = ensureMarket(s);
  return withMarket(s, { youth: market(s).youth.filter(x => x.id !== youthId) });
}

// ─── Joueurs libres ──────────────────────────────────────────────────────────

/** Marché des libres : 12 joueurs dont 3 gardiens, un peu sous le niveau de la ligue. */
export function generateFreeAgents(s: ManagerState): WorldPlayer[] {
  const club = getManagedClub(s);
  const leagueAvg = s.world.clubs.filter(c => c.leagueId === club.leagueId)
    .reduce((a, c, _, arr) => a + squadStrength(s.world, c.id) / arr.length, 0);
  const rng = createRng(seedFromString(`${s.world.seed}-free-s${s.world.season}`));
  const positions: WorldPlayerPosition[] = ["GK", "GK", "GK", "CB", "CB", "LB", "RB", "DM", "CM", "AM", "LW", "ST"];
  return positions.map((position, i) => {
    const age = rng.int(24, 34);
    const overall = clamp(Math.round(leagueAvg) - rng.int(3, 11), 40, 85);
    return makePlayer(`free-s${s.world.season}-${i}`, rng, {
      clubId: "free", leagueId: "", countryId: club.countryId, age, position, overall,
      potential: overall + (age < 27 ? rng.int(0, 4) : 0),
      personality: age >= 31 ? "veteran" : "journeyman",
    }, s.world.dataset);
  });
}

function makePlayer(id: string, rng: ReturnType<typeof createRng>, o: Pick<WorldPlayer, "clubId" | "leagueId" | "countryId" | "age" | "position" | "overall" | "potential" | "personality">, dataset?: "fictional" | "cp"): WorldPlayer {
  if (dataset === "cp") {
    const p = inventPlayer({ id, clubId: o.clubId, leagueId: o.leagueId, countryId: o.countryId, pos: o.position, ovr: o.overall, age: o.age, pot: o.potential, seed: `${id}-${rng.int(0, 1e9)}` });
    return { ...p, personality: o.personality };
  }
  const base = Math.pow(Math.max(0, o.overall - 50), 2.3) * 1200;
  const ageF = o.age <= 22 ? 1.6 : o.age <= 27 ? 1.2 : o.age <= 31 ? 0.9 : 0.5;
  return {
    id, ...o,
    firstName: rng.pick(FIRST_NAMES), lastName: rng.pick(LAST_NAMES), nationality: o.countryId,
    traits: [], form: 60, fatigue: 0, morale: 65, injury: null,
    careerGoals: 0, careerAssists: 0, careerAppearances: 0, seasonStats: [],
    marketValue: Math.max(20_000, Math.round(base * ageF / 10_000) * 10_000),
    contractWeeksLeft: 0,
  };
}

// ─── Hebdomadaire : offres IA, scouts ────────────────────────────────────────

function clubName(s: ManagerState, id: string): string {
  return s.world.clubs.find(c => c.id === id)?.name ?? "Un club";
}

/** Offres des clubs IA pour les joueurs du manager (listés surtout, stars parfois). */
export function generateIncomingOffers(s: ManagerState): IncomingOffer[] {
  if (!isWindowOpen(s)) return [];
  const m = market(s);
  const rng = createRng(seedFromString(`${s.world.seed}-offers-${weekIndex(s)}`));
  const squad = getSquad(s).sort((a, b) => b.overall - a.overall);
  const out: IncomingOffer[] = [];
  const buyers = (fee: number, p: WorldPlayer) => s.world.clubs.filter(c =>
    c.id !== s.clubId
    && (s.world.clubDirectors[c.id]?.remainingTransferBudget ?? c.transferBudget) >= fee
    && squadStrength(s.world, c.id) <= p.overall + 6);
  for (const p of squad) {
    if (m.offers.some(o => o.playerId === p.id)) continue;
    const listed = m.transferList[p.id];
    const star = squad.indexOf(p) < 3;
    let fee = 0;
    if (listed && rng.chance(0.6)) fee = Math.round(listed * rng.float(0.8, 1.05) / 10_000) * 10_000;
    else if (!listed && star && rng.chance(0.08)) fee = Math.round(p.marketValue * rng.float(1.1, 1.4) / 10_000) * 10_000;
    if (fee <= 0) continue;
    const pool = buyers(fee, p);
    if (pool.length === 0) continue;
    const buyer = rng.pick(pool);
    out.push({ id: `off-${p.id}-${weekIndex(s)}`, playerId: p.id, fromClubId: buyer.id, fee, expiresAt: weekIndex(s) + 2 });
  }
  return out;
}

/** Traitement hebdomadaire du marché, après la semaine jouée. */
function weeklyMarket(prev: ManagerState, s: ManagerState): ManagerState {
  let m = market(s);
  const now = weekIndex(s);
  const messages = [];

  // Rapports de scouts
  const ready = m.scouting.filter(a => a.readyAt <= now);
  if (ready.length) {
    const scouted = { ...m.scouted };
    for (const a of ready) {
      scouted[a.playerId] = true;
      const p = s.world.players.find(x => x.id === a.playerId);
      if (p) messages.push(msg(s, "squad", `Rapport de scout : ${displayName(p)}`,
        `${p.age} ans, ${p.position}. Note ${p.overall}, potentiel ${p.potential}. Prix demandé : ${formatMoney(askingPrice(s, p))}, salaire souhaité : ${formatMoney(wageDemand(s, p))}/sem.`));
    }
    m = { ...m, scouted, scouting: m.scouting.filter(a => a.readyAt > now) };
  }

  // Offres : on retire les expirées et celles de joueurs partis, on en ajoute de nouvelles
  const squadIds = new Set(getSquad(s).map(p => p.id));
  m = { ...m, offers: m.offers.filter(o => o.expiresAt > now && squadIds.has(o.playerId)) };
  const fresh = generateIncomingOffers({ ...s, market: m });
  for (const o of fresh) {
    const p = getSquad(s).find(x => x.id === o.playerId)!;
    messages.push(msg(s, "finance", `Offre pour ${displayName(p)}`, `${clubName(s, o.fromClubId)} propose ${formatMoney(o.fee)}. Offre valable 2 semaines.`));
  }
  m = { ...m, offers: [...m.offers, ...fresh] };

  // Les accords club non finalisés tombent à la fermeture du mercato
  if (!isWindowOpen(s)) m = { ...m, pendingDeals: m.pendingDeals.filter(d => d.fromClubId === null) };

  let next: ManagerState = { ...s, market: m };
  if (messages.length) next = pushInbox(next, ...messages);
  void prev;
  return next;
}

/** Nouvelle saison : contrats, retours de prêt, départs libres, nouvelle génération. */
function seasonMarket(prev: ManagerState, s: ManagerState): ManagerState {
  let m = market(s);
  const club = getManagedClub(s);
  const messages = [];

  // Retours de prêt
  const returning = m.loansOut.filter(l => l.untilSeason < s.world.season);
  let players = s.world.players.map(p => (returning.some(l => l.playerId === p.id) ? { ...p, clubId: club.id, leagueId: club.leagueId } : p));
  for (const l of returning) {
    const p = players.find(x => x.id === l.playerId);
    if (p) messages.push(msg(s, "squad", `Retour de prêt : ${displayName(p)}`, `${displayName(p)} revient de ${clubName(s, l.toClubId)}.`));
  }

  // Une saison de contrat en moins ; à 0, départ libre
  const contracts: Record<string, PlayerContract> = {};
  const leaving: WorldPlayer[] = [];
  for (const p of players.filter(x => x.clubId === club.id)) {
    const c = m.contracts[p.id];
    if (!c) continue;
    const left = c.seasonsLeft - 1;
    if (left < 0) { leaving.push(p); continue; }
    contracts[p.id] = { ...c, seasonsLeft: left };
    if (left === 0) messages.push(msg(s, "squad", `Dernière année de contrat : ${displayName(p)}`, `Sans prolongation, ${displayName(p)} partira libre en fin de saison.`));
  }
  // Les contrats des prêtés courent toujours
  for (const l of m.loansOut.filter(x => x.untilSeason >= s.world.season)) if (m.contracts[l.playerId]) contracts[l.playerId] = m.contracts[l.playerId];
  if (leaving.length) {
    const ids = new Set(leaving.map(p => p.id));
    players = players.filter(p => !ids.has(p.id));
    for (const p of leaving) messages.push(msg(s, "squad", `Départ libre : ${displayName(p)}`, `${displayName(p)} arrive en fin de contrat et quitte le club.`));
  }

  // Les jeunes non promus vieillissent ; à 20 ans ils quittent le centre
  const youth = m.youth.map(y => ({ ...y, age: y.age + 1 })).filter(y => y.age <= 19);
  m = { ...m, contracts, youth, loansOut: m.loansOut.filter(l => l.untilSeason >= s.world.season), offers: [], pendingDeals: [], transferList: {} };
  let next: ManagerState = { ...s, world: { ...s.world, players }, market: m };
  // Nouvelle génération (libres + jeunes) pour la nouvelle saison
  next = ensureMarket(next);
  messages.push(msg(next, "squad", "Centre de formation : nouvelle génération",
    `${next.market!.youth.length} jeune(s) attendent une décision. Les meilleurs peuvent signer pro.`));
  void prev;
  // Les partants quittent la compo
  return autoLineup(pushInbox(next, ...messages));
}

// ─── Semaine complète (match + marché) ───────────────────────────────────────

/**
 * Avance d'une semaine en incluant le marché. C'est le point d'entrée utilisé
 * par l'interface (le reducer). Les prêtés sont protégés des transferts IA.
 */
export function advanceWeek(s: ManagerState, live?: Parameters<typeof playWeek>[1]): ManagerState {
  const start = ensureInfra(ensureMarket(s));
  const season = start.world.season;
  let next = playWeek(start, live);
  if (next.status === "sacked") return next;
  next = keepLoaneesWhereLoaned(start, next);
  if (next.world.season !== season) return seasonClub(start, seasonMarket(start, next));
  return weeklyClub(start, weeklyMarket(start, next));
}

/** Un prêté reste dans son club de prêt même si l'IA du monde le déplace. */
function keepLoaneesWhereLoaned(before: ManagerState, after: ManagerState): ManagerState {
  const loans = market(before).loansOut;
  if (!loans.length) return after;
  const players = after.world.players.map(p => {
    const l = loans.find(x => x.playerId === p.id);
    if (!l || p.clubId === l.toClubId) return p;
    const dest = after.world.clubs.find(c => c.id === l.toClubId);
    return dest ? { ...p, clubId: dest.id, leagueId: dest.leagueId } : p;
  });
  return { ...after, world: { ...after.world, players } };
}

/** Saison complète avec marché, pilote automatique (tests, simulation rapide). */
export function simulateSeasonWithMarket(s: ManagerState, maxWeeks = 60): ManagerState {
  let cur = ensureMarket(s);
  const season = cur.world.season;
  for (let i = 0; i < maxWeeks && cur.status === "active" && cur.world.season === season; i++) {
    cur = advanceWeek(autoLineup(cur));
  }
  return cur;
}
