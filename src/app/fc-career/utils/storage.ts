/**
 * FC CAREER — Persistance legacy (utilisé par page.tsx pour le PIN)
 * Ce fichier est le pont d'entrée préservé.
 * Il ne dépend plus des anciens types supprimés.
 * La nouvelle sauvegarde est gérée par game/persistence/saveRepository.ts.
 */

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

/** Vérifie si une sauvegarde de jeu existe (v1 ou v2) */
export function loadGame(): { player: unknown } | null {
  if (!isBrowser()) return null;
  try {
    // Nouvelle sauvegarde v2
    const v2 = window.localStorage.getItem("fc-career-v2:save");
    if (v2) {
      const parsed = JSON.parse(v2);
      if (parsed?.player) return { player: parsed.player };
    }
    return null;
  } catch {
    return null;
  }
}
