/**
 * FC CAREER 27 — Carrière Joueur v2 : reducer pur avec message pour l'interface.
 */

import type { PlayerCareerState } from "./types";
import type { AttrKey } from "./attributes";
import type { LiveMatch } from "../manager/matchSim";
import type { NewCareerInput } from "./engine";
import { createPlayerCareer, setTrainingFocus } from "./engine";
import type { CareerResult } from "./career";
import { migrateLegacy } from "./migrate";
import { acceptOffer, advancePlayerWeek, ensureCareer, negotiateRenewal, rejectOffer, requestTransfer } from "./career";

export type PlayerAction =
  | { type: "NEW"; input: NewCareerInput }
  | { type: "LOAD"; state: PlayerCareerState }
  | { type: "IMPORT_LEGACY"; raw: unknown; now?: number }
  | { type: "PLAY_WEEK"; live?: LiveMatch | null }
  | { type: "SET_FOCUS"; attr: AttrKey }
  | { type: "ACCEPT_OFFER"; offerId: string }
  | { type: "REJECT_OFFER"; offerId: string }
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
  if (action.type === "NEW") return { state: ensureCareer(createPlayerCareer(action.input)), message: null };
  if (action.type === "LOAD") return { state: ensureCareer(action.state), message: null };
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
    case "PLAY_WEEK":        return plain(advancePlayerWeek(s, action.live));
    case "SET_FOCUS":        return plain(setTrainingFocus(s, action.attr));
    case "ACCEPT_OFFER":     return fromResult(acceptOffer(s, action.offerId));
    case "REJECT_OFFER":     return plain(rejectOffer(s, action.offerId));
    case "REQUEST_TRANSFER": return fromResult(requestTransfer(s, action.on));
    case "RENEW":            return fromResult(negotiateRenewal(s, action.wage, action.seasons));
    case "MARK_READ":        return plain({ ...s, inbox: s.inbox.map(m => (m.id === action.id ? { ...m, read: true } : m)) });
    case "MARK_ALL_READ":    return plain({ ...s, inbox: s.inbox.map(m => ({ ...m, read: true })) });
  }
}
