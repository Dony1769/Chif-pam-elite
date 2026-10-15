/**
 * FC CAREER 27 — Carrière Joueur v2 : sauvegarde locale.
 * Clé dédiée ; une sauvegarde existante est archivée avant tout remplacement.
 * La sauvegarde v1 (« fc-career-v2:save ») n'est jamais modifiée ici.
 */

import type { PlayerCareerState } from "./types";
import { PLAYER2_SAVE_KEY, PLAYER2_SAVE_VERSION } from "./types";
import type { KeyValueStore } from "../manager/storage";

export const PLAYER2_BACKUP_KEY = `${PLAYER2_SAVE_KEY}:backup`;
export const LEGACY_SAVE_KEY = "fc-career-v2:save";

function browserStore(): KeyValueStore | null {
  try {
    return typeof window !== "undefined" && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function isValidPlayerSave(v: unknown): v is PlayerCareerState {
  if (!v || typeof v !== "object") return false;
  const s = v as Partial<PlayerCareerState>;
  return s.version === PLAYER2_SAVE_VERSION
    && !!s.shadow && !!s.shadow.world && Array.isArray(s.shadow.world.players)
    && !!s.profile && typeof s.profile.id === "string" && !!s.profile.attrs
    && !!s.contract && Array.isArray(s.seasons) && Array.isArray(s.inbox);
}

export type PlayerLoad =
  | { ok: true; state: PlayerCareerState }
  | { ok: false; reason: "empty" | "corrupt" | "unavailable" };

export function loadPlayerCareer(store: KeyValueStore | null = browserStore()): PlayerLoad {
  if (!store) return { ok: false, reason: "unavailable" };
  const raw = store.getItem(PLAYER2_SAVE_KEY);
  if (!raw) return { ok: false, reason: "empty" };
  try {
    const parsed = JSON.parse(raw);
    return isValidPlayerSave(parsed) ? { ok: true, state: parsed } : { ok: false, reason: "corrupt" };
  } catch {
    return { ok: false, reason: "corrupt" };
  }
}

export function savePlayerCareer(state: PlayerCareerState, store: KeyValueStore | null = browserStore(), now = Date.now()): boolean {
  if (!store) return false;
  try {
    store.setItem(PLAYER2_SAVE_KEY, JSON.stringify({ ...state, savedAt: now }));
    return true;
  } catch {
    return false;
  }
}

/** Copie de secours avant remplacement. false → ne PAS écraser. */
export function archivePlayerSave(store: KeyValueStore | null = browserStore()): boolean {
  if (!store) return false;
  const raw = store.getItem(PLAYER2_SAVE_KEY);
  if (!raw) return true;
  try {
    store.setItem(PLAYER2_BACKUP_KEY, raw);
    return store.getItem(PLAYER2_BACKUP_KEY) === raw;
  } catch {
    return false;
  }
}

/** Lecture seule de la sauvegarde v1 (pour proposer la migration). */
export function readLegacySave(store: KeyValueStore | null = browserStore()): unknown | null {
  if (!store) return null;
  try {
    const raw = store.getItem(LEGACY_SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
