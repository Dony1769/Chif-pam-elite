/**
 * FC CAREER 27 — Mode Manager : reducer pur (state, action) → state.
 * Les actions du marché renvoient aussi un message pour l'interface (lastMessage).
 */

import type { ManagerState, Tactic } from "./types";
import type { LiveMatch } from "./matchSim";
import { hasMatchThisWeek } from "./engine";
import {
  autoLineup, createManagerGame, markRead, setCaptain, setTactic, swapPlayers,
} from "./engine";
import type { MarketResult } from "./market";
import type { ClubResult } from "./club";
import { chooseSponsor, ensureInfra, expandStadium, hireStaff, setTicketPrice, upgradeFacility } from "./club";
import type { FacilityId } from "./types";
import {
  acceptOffer, advanceWeek, approachFreeAgent, cancelDeal, ensureMarket, listForTransfer, loanOut,
  makeBid, offerContract, promoteYouth, rejectOffer, releasePlayer, releaseYouth, renewContract,
  scoutPlayer, unlist,
} from "./market";

export type ManagerAction =
  | { type: "NEW_GAME"; seed: string; clubId: string; managerName: string; now?: number }
  | { type: "LOAD"; state: ManagerState }
  | { type: "SET_TACTIC"; tactic: Tactic }
  | { type: "AUTO_LINEUP" }
  | { type: "SWAP_PLAYERS"; a: string; b: string }
  | { type: "SET_CAPTAIN"; playerId: string }
  | { type: "PLAY_WEEK"; live?: LiveMatch | null }
  | { type: "ADVANCE_TO_MATCH" }
  | { type: "MARK_READ"; id: string }
  | { type: "MARK_ALL_READ" }
  // Marché
  | { type: "BID"; playerId: string; fee: number }
  | { type: "APPROACH_FREE"; playerId: string }
  | { type: "OFFER_CONTRACT"; playerId: string; wage: number; seasons: number }
  | { type: "CANCEL_DEAL"; playerId: string }
  | { type: "LIST_PLAYER"; playerId: string; price: number }
  | { type: "UNLIST_PLAYER"; playerId: string }
  | { type: "ACCEPT_OFFER"; offerId: string }
  | { type: "REJECT_OFFER"; offerId: string }
  | { type: "RELEASE_PLAYER"; playerId: string }
  | { type: "LOAN_OUT"; playerId: string }
  | { type: "RENEW_CONTRACT"; playerId: string; wage: number; seasons: number }
  | { type: "SCOUT"; playerId: string }
  | { type: "PROMOTE_YOUTH"; youthId: string }
  | { type: "RELEASE_YOUTH"; youthId: string }
  // Club
  | { type: "SET_TICKET_PRICE"; price: number }
  | { type: "EXPAND_STADIUM" }
  | { type: "UPGRADE_FACILITY"; facility: FacilityId }
  | { type: "HIRE_STAFF"; candidateId: string }
  | { type: "CHOOSE_SPONSOR"; offerId: string };

/** Résultat d'une action : nouvel état + message éventuel à afficher. */
export interface ManagerStep {
  state: ManagerState | null;
  message: { ok: boolean; text: string } | null;
}

const fromResult = (r: MarketResult | ClubResult): ManagerStep => ({ state: r.state, message: { ok: r.ok, text: r.message } });

export function managerStep(state: ManagerState | null, action: ManagerAction): ManagerStep {
  switch (action.type) {
    case "NEW_GAME":
      return { state: ensureInfra(ensureMarket(createManagerGame({ seed: action.seed, clubId: action.clubId, managerName: action.managerName, now: action.now }))), message: null };
    case "LOAD":
      return { state: ensureInfra(ensureMarket(action.state)), message: null };
  }
  if (!state) return { state, message: null };
  const s = ensureInfra(ensureMarket(state));
  const plain = (next: ManagerState): ManagerStep => ({ state: next, message: null });
  switch (action.type) {
    case "SET_TACTIC":     return plain(setTactic(s, action.tactic));
    case "AUTO_LINEUP":    return plain(autoLineup(s));
    case "SWAP_PLAYERS":   return plain(swapPlayers(s, action.a, action.b));
    case "SET_CAPTAIN":    return plain(setCaptain(s, action.playerId));
    case "PLAY_WEEK":      return plain(advanceWeek(s, action.live));
    case "ADVANCE_TO_MATCH": {
      // Monde CP : enchaîne les semaines sans match (intersaison, trêves) jusqu'au prochain match
      let cur = s, n = 0;
      const season = s.world.season;
      do { cur = advanceWeek(cur); n++; } while (n < 16 && cur.status === "active" && !hasMatchThisWeek(cur) && cur.world.season === season && (cur.market?.offers.length ?? 0) <= (s.market?.offers.length ?? 0));
      return { state: cur, message: { ok: true, text: `${n} semaine${n > 1 ? "s" : ""} passée${n > 1 ? "s" : ""}.` } };
    }
    case "MARK_READ":      return plain(markRead(s, action.id));
    case "MARK_ALL_READ":  return plain({ ...s, inbox: s.inbox.map(m => ({ ...m, read: true })) });
    case "BID":            return fromResult(makeBid(s, action.playerId, action.fee));
    case "APPROACH_FREE":  return fromResult(approachFreeAgent(s, action.playerId));
    case "OFFER_CONTRACT": return fromResult(offerContract(s, action.playerId, action.wage, action.seasons));
    case "CANCEL_DEAL":    return plain(cancelDeal(s, action.playerId));
    case "LIST_PLAYER":    return fromResult(listForTransfer(s, action.playerId, action.price));
    case "UNLIST_PLAYER":  return plain(unlist(s, action.playerId));
    case "ACCEPT_OFFER":   return fromResult(acceptOffer(s, action.offerId));
    case "REJECT_OFFER":   return plain(rejectOffer(s, action.offerId));
    case "RELEASE_PLAYER": return fromResult(releasePlayer(s, action.playerId));
    case "LOAN_OUT":       return fromResult(loanOut(s, action.playerId));
    case "RENEW_CONTRACT": return fromResult(renewContract(s, action.playerId, action.wage, action.seasons));
    case "SCOUT":          return fromResult(scoutPlayer(s, action.playerId));
    case "PROMOTE_YOUTH":  return fromResult(promoteYouth(s, action.youthId));
    case "RELEASE_YOUTH":  return plain(releaseYouth(s, action.youthId));
    case "SET_TICKET_PRICE": return fromResult(setTicketPrice(s, action.price));
    case "EXPAND_STADIUM":   return fromResult(expandStadium(s));
    case "UPGRADE_FACILITY": return fromResult(upgradeFacility(s, action.facility));
    case "HIRE_STAFF":       return fromResult(hireStaff(s, action.candidateId));
    case "CHOOSE_SPONSOR":   return fromResult(chooseSponsor(s, action.offerId));
  }
}

/** Forme reducer classique (sans message) — compatible useReducer. */
export function managerReducer(state: ManagerState | null, action: ManagerAction): ManagerState | null {
  return managerStep(state, action).state;
}
