/**
 * FC CAREER — Verrouillage par code PIN + marqueur de session
 *
 * Le PIN n'est JAMAIS écrit dans le bundle client : il est lu côté serveur
 * via la variable d'environnement `NEXT_PUBLIC_FC_CAREER_PIN` (Vercel ->
 * Project Settings -> Environment Variables).
 *
 * Comportement local (aucune variable définie) : repli sur le code de
 * démonstration pour que `npm run dev` fonctionne sans configuration.
 *
 * Une fois le bon code saisi, un marqueur est stocké dans `sessionStorage`
 * (et non `localStorage`) : l'accès est donc valable pour l'onglet courant
 * et expire naturellement quand on le ferme.
 */

import { hashPin, verifyPin } from "./storage";

/** Marqueur de session (sessionStorage). */
export const FC_SESSION_KEY = "fc-career:session";

/** Hash du PIN attendu (FNV-1a, voir utils/storage.ts) — jamais le PIN en clair. */
const EXPECTED_PIN_HASH = "1c895h0"; // -> 1769 (hash FNV-1a en base36)

/** Clé de la variable d'environnement Vercel contenant le code d'accès. */
export const FC_PIN_ENV_KEY = "NEXT_PUBLIC_FC_CAREER_PIN";

function expectedHash(): string {
  const fromEnv = process.env[FC_PIN_ENV_KEY];
  if (typeof fromEnv === "string" && fromEnv.trim().length > 0) {
    return hashPin(fromEnv.trim());
  }
  return EXPECTED_PIN_HASH;
}

/**
 * Vérifie le code saisi.
 * - Si `NEXT_PUBLIC_FC_CAREER_PIN` est définie (Vercel) : seule cette valeur est acceptée.
 * - Sinon : le hash par défaut (code de démonstration 1769) est utilisé.
 */
export function checkAccessCode(pin: string): boolean {
  const clean = pin.trim();
  if (!/^\d{4}$/.test(clean)) return false;
  return verifyPin(clean, expectedHash());
}

export function isAccessConfigured(): boolean {
  const envPin = process.env[FC_PIN_ENV_KEY];
  return typeof envPin === "string" && envPin.trim().length > 0;
}

export type AccessSession = {
  unlockedAt: number;
};

/** Marque la session comme déverrouillée (onglet courant uniquement). */
export function markSessionUnlocked(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(FC_SESSION_KEY, JSON.stringify({ unlockedAt: Date.now() }));
  } catch {
    /* stockage indisponible (navigation privée) : on laisse la page se comporter normalement */
  }
}

/** La session courante a-t-elle déjà saisi le bon code ? */
export function isSessionUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.sessionStorage.getItem(FC_SESSION_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Partial<AccessSession>;
    return typeof parsed.unlockedAt === "number";
  } catch {
    return false;
  }
}

export function clearSessionUnlock(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(FC_SESSION_KEY);
  } catch {
    /* ignore */
  }
}
