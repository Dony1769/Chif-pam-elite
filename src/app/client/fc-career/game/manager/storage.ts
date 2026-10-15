/**
 * FC CAREER 27 — Mode Manager : sauvegarde locale.
 * Clé dédiée, distincte de la carrière joueur. Une sauvegarde valide n'est jamais
 * écrasée sans copie de secours : toute nouvelle partie archive l'ancienne d'abord.
 */

import type { ManagerState } from "./types";
import { MANAGER_SAVE_KEY, MANAGER_SAVE_VERSION } from "./types";

export const MANAGER_BACKUP_KEY = `${MANAGER_SAVE_KEY}:backup`;

export interface KeyValueStore {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

function browserStore(): KeyValueStore | null {
  try {
    return typeof window !== "undefined" && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** Vérification structurelle minimale d'une sauvegarde manager. */
export function isValidManagerSave(v: unknown): v is ManagerState {
  if (!v || typeof v !== "object") return false;
  const s = v as Partial<ManagerState>;
  return s.version === MANAGER_SAVE_VERSION
    && typeof s.clubId === "string"
    && !!s.world && Array.isArray(s.world.clubs) && Array.isArray(s.world.players)
    && !!s.tactic && !!s.lineup && Array.isArray(s.lineup.starters)
    && !!s.finances && typeof s.finances.balance === "number"
    && !!s.board && Array.isArray(s.inbox);
}

export type LoadResult =
  | { ok: true; state: ManagerState }
  | { ok: false; reason: "empty" | "corrupt" | "unavailable" };

export function loadManager(store: KeyValueStore | null = browserStore()): LoadResult {
  if (!store) return { ok: false, reason: "unavailable" };
  const raw = store.getItem(MANAGER_SAVE_KEY);
  if (!raw) return { ok: false, reason: "empty" };
  try {
    const parsed = JSON.parse(raw);
    if (!isValidManagerSave(parsed)) return { ok: false, reason: "corrupt" };
    // Champs ajoutés après coup : valeurs par défaut
    // Réparation douce : identifiants de messages en double renommés (rien n'est supprimé)
    const seen = new Set<string>();
    const inbox = parsed.inbox.map((m, i) => {
      if (!seen.has(m.id)) { seen.add(m.id); return m; }
      const id = `${m.id}-r${i}`;
      seen.add(id);
      return { ...m, id };
    });
    return { ok: true, state: { ...parsed, inbox, suspensions: parsed.suspensions ?? {} } };
  } catch {
    return { ok: false, reason: "corrupt" };
  }
}

export function saveManager(state: ManagerState, store: KeyValueStore | null = browserStore(), now = Date.now()): boolean {
  if (!store) return false;
  try {
    store.setItem(MANAGER_SAVE_KEY, JSON.stringify({ ...state, savedAt: now }));
    return true;
  } catch {
    return false; // quota plein : l'ancienne sauvegarde reste intacte
  }
}

/**
 * Avant de démarrer une nouvelle partie : copie la sauvegarde existante (même
 * corrompue) dans la clé de secours. Retourne false si la copie a échoué —
 * l'appelant ne doit alors PAS écraser la sauvegarde.
 */
export function archiveCurrentSave(store: KeyValueStore | null = browserStore()): boolean {
  if (!store) return false;
  const raw = store.getItem(MANAGER_SAVE_KEY);
  if (!raw) return true;
  try {
    store.setItem(MANAGER_BACKUP_KEY, raw);
    return store.getItem(MANAGER_BACKUP_KEY) === raw;
  } catch {
    return false;
  }
}
