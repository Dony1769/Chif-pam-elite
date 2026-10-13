/**
 * FC CAREER — Barre d'index des types.
 *
 * Point d'entrée unique : `import type { ... } from "../types"`.
 * Chaque domaine a son fichier (./game, ./player, ./club, ./match,
 * ./economy, ./ui) ; ce fichier ne fait que ré-exposer proprement.
 */

export * from "./career";
export * from "./game";
export * from "./player";
export * from "./club";
export * from "./match";
export * from "./economy";
