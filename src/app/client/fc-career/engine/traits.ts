/**
 * FC CAREER — Étape 4.4 : Traits de Personnalité
 * Chaque joueur a 2-4 traits (certains cachés, révélés au fil du temps).
 */

export type TraitCategory = "positive" | "negative" | "neutral";

export interface TraitDef {
  id: string;
  label: string;
  icon: string;
  category: TraitCategory;
  description: string;
  /** Peut être caché au début et révélé au fil du temps. */
  canBeHidden: boolean;
}

export const TRAIT_DEFS: TraitDef[] = [
  // --- POSITIFS ---
  {
    id: "big-game-player",
    label: "Grand Joueur de Grands Matchs",
    icon: "🏆",
    category: "positive",
    description: "+10% performance en finale, derby et Champions League.",
    canBeHidden: false,
  },
  {
    id: "leader",
    label: "Meneur d'Hommes",
    icon: "🦁",
    category: "positive",
    description: "Booste le moral des coéquipiers (+5).",
    canBeHidden: false,
  },
  {
    id: "clutch",
    label: "Clutch",
    icon: "💎",
    category: "positive",
    description: "Meilleur sous pression (dernières 15 min).",
    canBeHidden: true,
  },
  {
    id: "longevity",
    label: "Longévité",
    icon: "🔄",
    category: "positive",
    description: "Déclin physique retardé de 2 ans.",
    canBeHidden: true,
  },
  {
    id: "intelligent",
    label: "Intelligent",
    icon: "🧠",
    category: "positive",
    description: "Apprend les tactiques plus vite, adaptation rapide.",
    canBeHidden: false,
  },
  {
    id: "perfectionist",
    label: "Perfectionniste",
    icon: "🎯",
    category: "positive",
    description: "Gains d'entraînement +10%.",
    canBeHidden: false,
  },
  {
    id: "cool-head",
    label: "Cool",
    icon: "😎",
    category: "positive",
    description: "Sang-froid en pénalty et moments de pression.",
    canBeHidden: true,
  },
  // --- NÉGATIFS ---
  {
    id: "injury-prone",
    label: "Sujet aux Blessures",
    icon: "🤕",
    category: "negative",
    description: "Risque blessure +5% permanent.",
    canBeHidden: true,
  },
  {
    id: "hot-head",
    label: "Tête Brûlée",
    icon: "😤",
    category: "negative",
    description: "+30% chance de carton, conflits avec arbitre.",
    canBeHidden: false,
  },
  {
    id: "inconsistent",
    label: "Inconstant",
    icon: "📉",
    category: "negative",
    description: "Performances varient beaucoup d'un match à l'autre.",
    canBeHidden: true,
  },
  {
    id: "small-game-player",
    label: "Joueur de Petits Matchs",
    icon: "😰",
    category: "negative",
    description: "-10% en matchs importants.",
    canBeHidden: true,
  },
  {
    id: "party-boy",
    label: "Fêtard",
    icon: "🌙",
    category: "negative",
    description: "Si pas géré, fatigue +10 le lundi, risque scandale.",
    canBeHidden: true,
  },
  {
    id: "mercenary",
    label: "Mercenaire",
    icon: "💰",
    category: "negative",
    description: "Demande toujours plus d'argent, moral lié au salaire.",
    canBeHidden: true,
  },
  // --- NEUTRES ---
  {
    id: "introvert",
    label: "Introverti",
    icon: "🤫",
    category: "neutral",
    description: "Moins de médias/sponsors, mais concentration +5.",
    canBeHidden: false,
  },
  {
    id: "extrovert",
    label: "Extraverti",
    icon: "📢",
    category: "neutral",
    description: "Plus de médias/sponsors, mais plus de pression.",
    canBeHidden: false,
  },
  {
    id: "attached",
    label: "Attaché",
    icon: "🏠",
    category: "neutral",
    description: "Ne veut pas quitter son club/pays, malus si transféré loin.",
    canBeHidden: false,
  },
];

export interface PlayerTrait {
  traitId: string;
  hidden: boolean; // caché au joueur, révélé au fil du temps
  revealedAtDay?: number; // dayNumber quand le trait a été révélé
}

/**
 * Génère les traits initiaux d'un joueur (2-4 traits).
 * Au moins 1 positif et au plus 2 négatifs.
 */
export function generateTraits(rng: () => number): PlayerTrait[] {
  const positives = TRAIT_DEFS.filter((t) => t.category === "positive");
  const negatives = TRAIT_DEFS.filter((t) => t.category === "negative");
  const neutrals = TRAIT_DEFS.filter((t) => t.category === "neutral");

  const traitCount = 2 + Math.floor(rng() * 3); // 2, 3 ou 4
  const chosen: PlayerTrait[] = [];
  const usedIds = new Set<string>();

  function pick(pool: TraitDef[]): TraitDef | null {
    const available = pool.filter((t) => !usedIds.has(t.id));
    if (available.length === 0) return null;
    const t = available[Math.floor(rng() * available.length)];
    usedIds.add(t.id);
    return t;
  }

  // Toujours au moins 1 positif
  const pos = pick(positives);
  if (pos) chosen.push({ traitId: pos.id, hidden: pos.canBeHidden && rng() < 0.4 });

  // Remplir le reste
  let negCount = 0;
  while (chosen.length < traitCount) {
    const roll = rng();
    let pool: TraitDef[];
    if (roll < 0.35 && negCount < 2) {
      pool = negatives;
    } else if (roll < 0.6) {
      pool = neutrals;
    } else {
      pool = positives;
    }
    const t = pick(pool);
    if (t) {
      if (t.category === "negative") negCount++;
      chosen.push({ traitId: t.id, hidden: t.canBeHidden && rng() < 0.5 });
    }
  }

  return chosen;
}

/**
 * Récupère la définition d'un trait par son id.
 */
export function getTraitDef(id: string): TraitDef | undefined {
  return TRAIT_DEFS.find((t) => t.id === id);
}

/**
 * Révèle un trait caché (appelé après un événement en jeu).
 */
export function revealTrait(traits: PlayerTrait[], traitId: string, dayNumber: number): PlayerTrait[] {
  return traits.map((t) =>
    t.traitId === traitId && t.hidden
      ? { ...t, hidden: false, revealedAtDay: dayNumber }
      : t,
  );
}
