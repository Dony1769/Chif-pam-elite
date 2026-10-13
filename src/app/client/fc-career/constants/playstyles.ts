/**
 * FC CAREER — Étape 4.3 : PlayStyles (Capacités Spéciales)
 * Chaque joueur a 1-3 PlayStyles et peut avoir 1 PlayStyle+.
 * Débloqués quand un attribut lié dépasse 80 (PlayStyle) ou 90 (PlayStyle+).
 */

import type { AttributeMap } from "../types/player";

export type PlayStyleCategory = "attack" | "speed" | "pass" | "defense" | "goalkeeper";

export interface PlayStyleDef {
  id: string;
  label: string;
  labelPlus: string; // nom du PlayStyle+ version
  category: PlayStyleCategory;
  icon: string;
  /** Attributs requis et seuils — moyenne des attributs listés. */
  requiredAttributes: string[];
  /** Seuil pour débloquer le PlayStyle normal. */
  threshold: number;
  /** Seuil pour débloquer le PlayStyle+ (version élite). */
  thresholdPlus: number;
  description: string;
  descriptionPlus: string;
}

export const PLAYSTYLE_DEFS: PlayStyleDef[] = [
  // --- ATTAQUE ---
  {
    id: "finesse",
    label: "Finesse",
    labelPlus: "Finesse+",
    category: "attack",
    icon: "🎯",
    requiredAttributes: ["finishing"],
    threshold: 80,
    thresholdPlus: 90,
    description: "Tirs enroulés avec précision accrue.",
    descriptionPlus: "Tirs enroulés avec précision parfaite.",
  },
  {
    id: "power-shot",
    label: "Puissance",
    labelPlus: "Puissance+",
    category: "attack",
    icon: "💥",
    requiredAttributes: ["ballStrike"],
    threshold: 80,
    thresholdPlus: 90,
    description: "Frappes surpuissantes.",
    descriptionPlus: "Frappes surpuissantes dévastatrices.",
  },
  {
    id: "aerial-threat",
    label: "Tête d'Or",
    labelPlus: "Tête d'Or+",
    category: "attack",
    icon: "🦅",
    requiredAttributes: ["jumping", "aerialDuels"],
    threshold: 80,
    thresholdPlus: 90,
    description: "Dominant dans les airs.",
    descriptionPlus: "Dominant absolu dans les airs.",
  },
  {
    id: "acrobatic",
    label: "Acrobate",
    labelPlus: "Acrobate+",
    category: "attack",
    icon: "🤸",
    requiredAttributes: ["volley", "agility"],
    threshold: 80,
    thresholdPlus: 90,
    description: "Retournés et bicyclettes.",
    descriptionPlus: "Retournés et bicyclettes spectaculaires.",
  },
  // --- VITESSE ---
  {
    id: "speed-dribbler",
    label: "Dribbleur Rapide",
    labelPlus: "Dribbleur Rapide+",
    category: "speed",
    icon: "⚡",
    requiredAttributes: ["dribble", "agility"],
    threshold: 80,
    thresholdPlus: 90,
    description: "Change de direction sans perdre le ballon.",
    descriptionPlus: "Change de direction à pleine vitesse sans perdre le ballon.",
  },
  {
    id: "rocket",
    label: "Fusée",
    labelPlus: "Fusée+",
    category: "speed",
    icon: "🚀",
    requiredAttributes: ["acceleration", "sprintStamina"],
    threshold: 80,
    thresholdPlus: 90,
    description: "Accélérations fulgurantes.",
    descriptionPlus: "Accélérations fulgurantes irrattrapables.",
  },
  // --- PASSE ---
  {
    id: "whip-crosser",
    label: "Passeur Fouetté",
    labelPlus: "Passeur Fouetté+",
    category: "pass",
    icon: "🌀",
    requiredAttributes: ["crossing", "freeKick"],
    threshold: 80,
    thresholdPlus: 90,
    description: "Centres parfaits.",
    descriptionPlus: "Centres parfaits chirurgicaux.",
  },
  {
    id: "visionary",
    label: "Visionnaire",
    labelPlus: "Visionnaire+",
    category: "pass",
    icon: "👁️",
    requiredAttributes: ["vision", "shortPass"],
    threshold: 80,
    thresholdPlus: 90,
    description: "Passes impossibles dans l'espace.",
    descriptionPlus: "Passes impossibles dans l'espace, vision extra-sensorielle.",
  },
  {
    id: "long-passer",
    label: "Passeur Long",
    labelPlus: "Passeur Long+",
    category: "pass",
    icon: "📡",
    requiredAttributes: ["longPass", "ballStrike"],
    threshold: 78,
    thresholdPlus: 85,
    description: "Transversales précises.",
    descriptionPlus: "Transversales laser.",
  },
  // --- DÉFENSE ---
  {
    id: "wall",
    label: "Mur",
    labelPlus: "Mur+",
    category: "defense",
    icon: "🧱",
    requiredAttributes: ["standingTackle", "defensiveAwareness"],
    threshold: 80,
    thresholdPlus: 90,
    description: "Tacles parfaits, timing impeccable.",
    descriptionPlus: "Tacles parfaits, timing surhumain.",
  },
  {
    id: "interceptor",
    label: "Intercepteur",
    labelPlus: "Intercepteur+",
    category: "defense",
    icon: "🛡️",
    requiredAttributes: ["interceptions", "vision"],
    threshold: 80,
    thresholdPlus: 90,
    description: "Lit le jeu, coupe les lignes.",
    descriptionPlus: "Lit le jeu avant tout le monde, coupe les lignes.",
  },
  {
    id: "rock",
    label: "Roc",
    labelPlus: "Roc+",
    category: "defense",
    icon: "🪨",
    requiredAttributes: ["strength", "balance"],
    threshold: 80,
    thresholdPlus: 90,
    description: "Imbattable en duel.",
    descriptionPlus: "Imbattable en duel, force brute.",
  },
  // --- GARDIEN ---
  {
    id: "cat-reflex",
    label: "Réflexe Chat",
    labelPlus: "Réflexe Chat+",
    category: "goalkeeper",
    icon: "🐱",
    requiredAttributes: ["gReflexes"],
    threshold: 82,
    thresholdPlus: 92,
    description: "Arrêts réflexes exceptionnels.",
    descriptionPlus: "Arrêts réflexes surhumains.",
  },
  {
    id: "sweeper-gk",
    label: "Libéro",
    labelPlus: "Libéro+",
    category: "goalkeeper",
    icon: "🧤",
    requiredAttributes: ["gKicking", "gOneOnOne"],
    threshold: 78,
    thresholdPlus: 85,
    description: "Sort de sa surface, joue au pied.",
    descriptionPlus: "Véritable joueur de champ dans les gants.",
  },
];

export interface UnlockedPlayStyle {
  id: string;
  isPlus: boolean;
}

/**
 * Calcule la moyenne des attributs requis pour un PlayStyle.
 */
function avgRequired(attributes: AttributeMap, requiredIds: string[]): number {
  if (requiredIds.length === 0) return 0;
  const sum = requiredIds.reduce((acc, id) => acc + (attributes[id] ?? 0), 0);
  return sum / requiredIds.length;
}

/**
 * Évalue tous les PlayStyles débloqués pour un joueur.
 */
export function evaluatePlayStyles(attributes: AttributeMap): UnlockedPlayStyle[] {
  const unlocked: UnlockedPlayStyle[] = [];
  for (const ps of PLAYSTYLE_DEFS) {
    const avg = avgRequired(attributes, ps.requiredAttributes);
    if (avg >= ps.thresholdPlus) {
      unlocked.push({ id: ps.id, isPlus: true });
    } else if (avg >= ps.threshold) {
      unlocked.push({ id: ps.id, isPlus: false });
    }
  }
  return unlocked;
}

/**
 * Récupère la définition d'un PlayStyle par son id.
 */
export function getPlayStyleDef(id: string): PlayStyleDef | undefined {
  return PLAYSTYLE_DEFS.find((ps) => ps.id === id);
}
