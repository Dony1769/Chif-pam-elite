/**
 * FC CAREER — Persistance localStorage + versioning de sauvegarde
 */

import type { GameSave } from "../types/game";
import { GAME_CONSTANTS } from "../types/game";
import type { Player } from "../types/player";
import type { Wallet } from "../types/economy";

export interface FullSave {
  meta: GameSave;
  player: Player | null;
  wallet: Wallet | null;
}

const KEY = GAME_CONSTANTS.STORAGE_KEY;

/** Hachage simple du PIN (non cryptographique — jeu, pas banque). */
export function hashPin(pin: string): string {
  let h = 2166136261;
  for (let i = 0; i < pin.length; i++) {
    h ^= pin.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export function verifyPin(pin: string, storedHash: string | null): boolean {
  if (!storedHash) return false;
  return hashPin(pin) === storedHash;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/** Migration entre versions de schéma de sauvegarde. */
function migrate(raw: unknown): FullSave | null {
  if (!raw || typeof raw !== "object") return null;
  const save = raw as FullSave & { version?: number };
  const version = save.meta?.version ?? save.version ?? 0;

  if (version > GAME_CONSTANTS.CURRENT_SAVE_VERSION) {
    // Sauvegarde plus récente que le code : on refuse pour éviter la corruption.
    return null;
  }

  // Exemple de chaîne de migration : v0 -> v1 ajoute wallet.
  if (version < 1) {
    save.wallet = save.wallet ?? null;
    if (save.meta) save.meta.version = 1;
  }

  return save;
}

export function loadSave(): FullSave | null {
  if (!isBrowser()) return null;
  try {
    const json = window.localStorage.getItem(KEY);
    if (!json) return null;
    return migrate(JSON.parse(json));
  } catch (err) {
    console.error("[fc-career] sauvegarde corrompue", err);
    return null;
  }
}

export function saveGame(save: FullSave): boolean {
  if (!isBrowser()) return false;
  try {
    save.meta.version = GAME_CONSTANTS.CURRENT_SAVE_VERSION;
    save.meta.lastPlayedAt = new Date().toISOString();
    window.localStorage.setItem(KEY, JSON.stringify(save));
    return true;
  } catch (err) {
    console.error("[fc-career] échec de sauvegarde", err);
    return false;
  }
}

export function deleteSave(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(KEY);
}

/** Export JSON pour backup manuel (téléchargement dans Settings). */
export function exportSaveJson(save: FullSave): string {
  return JSON.stringify(save, null, 2);
}

export function importSaveJson(json: string): FullSave | null {
  try {
    return migrate(JSON.parse(json));
  } catch {
    return null;
  }
}
