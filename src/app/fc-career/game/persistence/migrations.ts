/**
 * FC CAREER — Migrations de sauvegarde
 * Chaque migration transforme une version N en version N+1.
 * Ajouter ici quand SAVE_VERSION est incrémenté.
 */

import type { AnyGameSave, GameSaveV1 } from "./saveSchema";
import { SAVE_VERSION } from "./saveSchema";

/** Applique toutes les migrations nécessaires */
export function migrate(raw: unknown): GameSaveV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const version = typeof obj.version === "number" ? obj.version : 0;

  if (version === SAVE_VERSION) {
    // Déjà à jour — validation légère
    return validateV1(obj);
  }

  // Exemple migration future : version 0 → 1
  // if (version === 0) {
  //   const migrated = migrateV0toV1(obj);
  //   return migrate(migrated); // cascade
  // }

  return null; // version inconnue ou trop ancienne
}

function validateV1(obj: Record<string, unknown>): GameSaveV1 | null {
  try {
    const s = obj as unknown as GameSaveV1;
    if (
      !s.meta?.careerId ||
      !s.player?.id ||
      !s.career?.id ||
      !s.wallet ||
      !s.world
    ) return null;
    return s;
  } catch {
    return null;
  }
}

export type { AnyGameSave };
