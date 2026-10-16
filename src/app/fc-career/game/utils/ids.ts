/**
 * FC CAREER — Générateur d'identifiants uniques
 * Fonctions pures, testables sans navigateur.
 */

let _counter = 0;

/**
 * Génère un identifiant unique lisible.
 * Format : {prefix}-{timestamp}-{counter}
 */
export function generateId(prefix = "id"): string {
  _counter = (_counter + 1) % 99999;
  return `${prefix}-${Date.now().toString(36)}-${_counter.toString(36).padStart(3, "0")}`;
}

/** ID de carrière */
export function careerId(): string { return generateId("career"); }
/** ID de joueur */
export function playerId(): string { return generateId("player"); }
/** ID de match */
export function matchId(): string { return generateId("match"); }
/** ID d'événement */
export function eventId(): string { return generateId("evt"); }

/** Réinitialise le compteur (usage tests uniquement) */
export function _resetCounterForTests(): void { _counter = 0; }
