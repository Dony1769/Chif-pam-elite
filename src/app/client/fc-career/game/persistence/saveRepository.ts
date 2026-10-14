/**
 * FC CAREER — Dépôt de sauvegarde
 * Seul module autorisé à lire/écrire localStorage.
 * Frontière client : ne jamais importer côté serveur.
 */

import { SAVE_KEY, SAVE_VERSION, type GameSaveV1, type LoadResult } from "./saveSchema";
import { migrate } from "./migrations";
import type { Career } from "../domain/career";
import { createInitialCoach } from "../domain/coach";

// ── Lecture ────────────────────────────────────────────────────────────────

export function loadSave(): LoadResult {
  if (typeof window === "undefined") {
    return { ok: false, reason: "not_found" };
  }
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return { ok: false, reason: "not_found" };

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, reason: "invalid", detail: "JSON invalide" };
    }

    const migrated = migrate(parsed);
    if (!migrated) {
      return { ok: false, reason: "migration_failed", detail: "Schéma incompatible ou données manquantes" };
    }

    // Réhydrater le Set des matchs complétés
    const save = deserializeCareer(migrated);
    return { ok: true, save };
  } catch (e) {
    return { ok: false, reason: "invalid", detail: String(e) };
  }
}

// ── Écriture ───────────────────────────────────────────────────────────────

export function writeSave(save: GameSaveV1): void {
  if (typeof window === "undefined") return;
  const serialized = serializeCareer(save);
  window.localStorage.setItem(SAVE_KEY, JSON.stringify(serialized));
}

// ── Suppression ────────────────────────────────────────────────────────────

export function deleteSave(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SAVE_KEY);
}

// ── Backup ─────────────────────────────────────────────────────────────────

const BACKUP_KEY = `${SAVE_KEY}:backup`;

export function backupSave(save: GameSaveV1): void {
  if (typeof window === "undefined") return;
  const serialized = serializeCareer(save);
  window.localStorage.setItem(BACKUP_KEY, JSON.stringify(serialized));
}

export function loadBackup(): LoadResult {
  if (typeof window === "undefined") return { ok: false, reason: "not_found" };
  const raw = window.localStorage.getItem(BACKUP_KEY);
  if (!raw) return { ok: false, reason: "not_found" };
  try {
    const parsed = JSON.parse(raw);
    const migrated = migrate(parsed);
    if (!migrated) return { ok: false, reason: "migration_failed", detail: "Backup incompatible" };
    return { ok: true, save: deserializeCareer(migrated) };
  } catch (e) {
    return { ok: false, reason: "invalid", detail: String(e) };
  }
}

// ── Sérialisation interne ─────────────────────────────────────────────────

function serializeCareer(save: GameSaveV1): GameSaveV1 {
  return {
    ...save,
    career: {
      ...save.career,
      completedMatchIds: Array.isArray(save.career.completedMatchIds)
        ? save.career.completedMatchIds
        : Array.from(save.career.completedMatchIds as unknown as Set<string>),
    },
  };
}

function deserializeCareer(save: GameSaveV1): GameSaveV1 {
  return {
    ...save,
    career: {
      ...save.career,
      // completedMatchIds est stocké en tableau, on le garde en tableau côté runtime
    },
    world: {
      clubs:            save.world?.clubs            ?? [],
      leagues:          save.world?.leagues          ?? [],
      countries:        save.world?.countries        ?? [],
      schedules:        save.world?.schedules        ?? [],
      lastMatchResults: save.world?.lastMatchResults ?? [],
      standings:        save.world?.standings        ?? {},
    },
    // Rétrocompatibilité : créer un coach par défaut si absent
    coach: save.coach ?? createInitialCoach(save.career?.phase ?? "academy", save.career?.season ?? 1),
  };
}

// ── Vérification de doublon (idempotence des matchs) ─────────────────────

export function isMatchAlreadyCompleted(save: GameSaveV1, matchId: string): boolean {
  const ids = save.career.completedMatchIds as unknown as string[];
  return ids.includes(matchId);
}

export function markMatchCompleted(save: GameSaveV1, matchId: string): GameSaveV1 {
  const ids = save.career.completedMatchIds as unknown as string[];
  if (ids.includes(matchId)) return save; // déjà enregistré
  return {
    ...save,
    career: {
      ...save.career,
      completedMatchIds: [...ids, matchId] as unknown as string[],
    },
  };
}

// ── Méta ─────────────────────────────────────────────────────────────────

export function updateSaveMeta(save: GameSaveV1): GameSaveV1 {
  return {
    ...save,
    meta: { ...save.meta, savedAt: Date.now() },
  };
}

/** Crée une sauvegarde vierge pour une nouvelle carrière */
export function createEmptySave(
  careerId: string,
  player: GameSaveV1["player"],
  career: GameSaveV1["career"],
  wallet: GameSaveV1["wallet"],
  world: GameSaveV1["world"],
): GameSaveV1 {
  return {
    version: SAVE_VERSION,
    meta: {
      careerId,
      createdAt: Date.now(),
      savedAt: Date.now(),
      playTime: 0,
    },
    player,
    career,
    wallet,
    world,
    transferHistory: [],
  };
}
