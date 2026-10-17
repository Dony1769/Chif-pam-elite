/**
 * FC CAREER 27 — Carrière Joueur v2 : reducer pur avec message pour l'interface.
 */

import type { PlayerCareerState } from "./types";
import type { AttrKey } from "./attributes";
import type { TrainingFocus } from "./types";
import type { OptionId } from "./playstyles";
import type { LiveMatch } from "../manager/matchSim";
import type { NewCareerInput } from "./engine";
import { applyPlayStyleProgress, createPlayerCareer, setPrimaryPosition, setTrainingFocus } from "./engine";
import type { WorldPlayerPosition } from "../data/worldPlayers";
import { hasMatchThisWeek } from "../manager/engine";
import type { CareerResult } from "./career";
import { migrateLegacy } from "./migrate";
import { applyCupMatch, autoPlayCup, myCupMatch } from "./cup";
import { acceptOffer, advancePlayerWeek, ensureCareer, negotiateRenewal, rejectOffer, signOffer, requestTransfer, retirePlayer } from "./career";

export type PlayerAction =
  | { type: "NEW"; input: NewCareerInput }
  | { type: "LOAD"; state: PlayerCareerState }
  | { type: "IMPORT_LEGACY"; raw: unknown; now?: number }
  | { type: "PLAY_WEEK"; live?: LiveMatch | null; psGain?: Partial<Record<OptionId, number>> }
  | { type: "SET_FOCUS"; attr: AttrKey | TrainingFocus }
  | { type: "RETIRE" }
  | { type: "SKIP_CUP" }
  | { type: "PLAY_CUP"; live: LiveMatch; psGain?: Partial<Record<OptionId, number>> }
  | { type: "SET_POSITION"; position: WorldPlayerPosition }
  | { type: "ADVANCE_TO_MATCH" }
  | { type: "ACCEPT_OFFER"; offerId: string }
  | { type: "REJECT_OFFER"; offerId: string }
  | { type: "SIGN_OFFER"; offerId: string; wage: number; seasons: number }
  | { type: "REQUEST_TRANSFER"; on: boolean }
  | { type: "RENEW"; wage: number; seasons: number }
  | { type: "MARK_READ"; id: string }
  | { type: "MARK_ALL_READ" };

export interface PlayerStep {
  state: PlayerCareerState | null;
  message: { ok: boolean; text: string } | null;
}

const fromResult = (r: CareerResult): PlayerStep => ({ state: r.state, message: { ok: r.ok, text: r.message } });

export function playerStep(state: PlayerCareerState | null, action: PlayerAction): PlayerStep {
  // Les PlayStyles dont les sous-attributs sont atteints s'activent tout de suite
  const withPs = (x: PlayerCareerState) => applyPlayStyleProgress(x, undefined).state;
  if (action.type === "NEW") return { state: withPs(ensureCareer(createPlayerCareer(action.input))), message: null };
  if (action.type === "LOAD") return { state: withPs(ensureCareer(action.state)), message: null };
  if (action.type === "IMPORT_LEGACY") {
    const migrated = migrateLegacy(action.raw, action.now);
    return migrated
      ? { state: migrated, message: { ok: true, text: "Carrière importée : votre ancienne sauvegarde reste intacte." } }
      : { state, message: { ok: false, text: "Sauvegarde v1 illisible : import impossible." } };
  }
  if (!state) return { state, message: null };
  const s = ensureCareer(state);
  const plain = (next: PlayerCareerState): PlayerStep => ({ state: next, message: null });
  switch (action.type) {
    case "PLAY_WEEK":        return plain(advancePlayerWeek(s, action.live, action.psGain));
    case "RETIRE":           return fromResult(retirePlayer(s));
    case "SKIP_CUP": {
      const cm = myCupMatch(s);
      return cm ? plain(autoPlayCup(s, cm)) : plain(s);
    }
    case "PLAY_CUP": {
      const cm = myCupMatch(s);
      if (!cm || action.live.fixtureId !== `cup:${cm.key}`) return { state: s, message: { ok: false, text: "Ce match de coupe n'est plus d'actualité." } };
      return plain(applyCupMatch(s, cm, action.live, action.psGain));
    }
    case "SET_POSITION":     return fromResult(setPrimaryPosition(s, action.position));
    case "ADVANCE_TO_MATCH": {
      // Semaines sans match (intersaison, trêves) enchaînées jusqu'au prochain match ou une offre
      let cur = s, n = 0;
      const season = s.shadow.world.season;
      do { cur = advancePlayerWeek(cur); n++; } while (n < 16 && !cur.retired && !hasMatchThisWeek(cur.shadow) && !myCupMatch(cur) && cur.shadow.world.season === season && (cur.career?.offers.length ?? 0) === (s.career?.offers.length ?? 0));
      return { state: cur, message: { ok: true, text: `${n} semaine${n > 1 ? "s" : ""} passée${n > 1 ? "s" : ""}.` } };
    }
    case "SET_FOCUS":        return plain(setTrainingFocus(s, action.attr));
    case "ACCEPT_OFFER":     return fromResult(acceptOffer(s, action.offerId));
    case "SIGN_OFFER":       return fromResult(signOffer(s, action.offerId, action.wage, action.seasons));
    case "REJECT_OFFER":     return plain(rejectOffer(s, action.offerId));
    case "REQUEST_TRANSFER": return fromResult(requestTransfer(s, action.on));
    case "RENEW":            return fromResult(negotiateRenewal(s, action.wage, action.seasons));
    case "MARK_READ":        return plain({ ...s, inbox: s.inbox.map(m => (m.id === action.id ? { ...m, read: true } : m)) });
    case "MARK_ALL_READ":    return plain({ ...s, inbox: s.inbox.map(m => ({ ...m, read: true })) });
  }
}
