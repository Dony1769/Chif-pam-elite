/**
 * FC CAREER — Vie personnelle
 * Événements de vie, choix, conséquences sur la carrière.
 * Pur domaine — aucune dépendance React.
 */

/* ── Types ─────────────────────────────────────────────────────────── */

export type PersonalEventCategory =
  | "family"      // Famille — naissance, mariage, divorce
  | "health"      // Santé mentale — burn-out, épanouissement
  | "social"      // Social — fête, scandale, association
  | "finance"     // Finances — investissement, perte
  | "spiritual"   // Mental / spirituel — méditation, motivation
  | "housing";    // Logement — déménagement, vie de luxe

export type PersonalEventImpactType =
  | "moral"       // Moral +/- → bonus OVR temporaire
  | "stamina"     // Endurance +/-
  | "training"    // Efficacité entraînement +/-
  | "economy"     // Finances +/-
  | "reputation"  // Popularité / médias +/-
  | "cohesion";   // Cohésion vestiaire +/-

export interface PersonalEventImpact {
  type: PersonalEventImpactType;
  delta: number;
  label: string;
}

export interface PersonalLifeEvent {
  id: string;
  season: number;
  week: number;
  category: PersonalEventCategory;
  title: string;
  description: string;
  icon: string;
  impacts: PersonalEventImpact[];
  /** Choice made (if applicable) */
  choiceMade?: "accept" | "decline";
  /** Whether event required a choice */
  hadChoice: boolean;
}

export interface PersonalLifeState {
  /** Moral actuel — 0 à 100 */
  moral: number;
  /** Bonus/malus actif sur stamina (dure quelques semaines) */
  activeStaminaBonus: number;
  /** Bonus/malus actif sur efficacité training (dure quelques semaines) */
  activeTrainingBonus: number;
  /** Semaines restantes pour les bonus actifs */
  activeBonusWeeksLeft: number;
  /** Événements de vie vécus */
  events: PersonalLifeEvent[];
  /** Famille — statut civil */
  familyStatus: "single" | "in_relationship" | "married" | "parent";
  /** Nombre d'enfants */
  childrenCount: number;
}

/* ── Initialisation ─────────────────────────────────────────────────── */

export function createInitialPersonalLife(): PersonalLifeState {
  return {
    moral: 70,
    activeStaminaBonus: 0,
    activeTrainingBonus: 0,
    activeBonusWeeksLeft: 0,
    events: [],
    familyStatus: "single",
    childrenCount: 0,
  };
}

/* ── Bonus moral sur OVR effectif ──────────────────────────────────── */

/** Retourne un modificateur OVR basé sur le moral (-5 à +5) */
export function moralOvrBonus(moral: number): number {
  if (moral >= 85) return 3;
  if (moral >= 70) return 1;
  if (moral >= 50) return 0;
  if (moral >= 30) return -2;
  return -5;
}

/* ── Génération d'événements de vie ─────────────────────────────────── */

export interface PersonalEventTemplate {
  id: string;
  category: PersonalEventCategory;
  title: string;
  description: string;
  icon: string;
  impacts: PersonalEventImpact[];
  hadChoice: boolean;
  /** Conditions pour déclencher l'événement */
  condition?: (state: PersonalLifeState, age: number, season: number) => boolean;
}

const PERSONAL_EVENT_TEMPLATES: PersonalEventTemplate[] = [
  /* ── Famille ── */
  {
    id: "new_relationship",
    category: "family",
    title: "Nouvelle relation",
    description: "Tu as rencontré quelqu'un de spécial. La vie personnelle prend une nouvelle dimension.",
    icon: "💑",
    hadChoice: false,
    impacts: [{ type: "moral", delta: 10, label: "+10 moral" }],
    condition: (s) => s.familyStatus === "single" && Math.random() < 0.3,
  },
  {
    id: "engaged",
    category: "family",
    title: "Fiançailles",
    description: "Vous avez décidé de vous fiancer. Un moment de bonheur qui te booste.",
    icon: "💍",
    hadChoice: false,
    impacts: [{ type: "moral", delta: 15, label: "+15 moral" }],
    condition: (s) => s.familyStatus === "in_relationship" && Math.random() < 0.25,
  },
  {
    id: "marriage",
    category: "family",
    title: "Mariage",
    description: "Le grand jour est arrivé ! Tu te maries et tu es au sommet de ta joie.",
    icon: "👰",
    hadChoice: false,
    impacts: [{ type: "moral", delta: 20, label: "+20 moral" }, { type: "training", delta: -2, label: "-2 training (distractions)" }],
    condition: (s) => s.familyStatus === "in_relationship" && Math.random() < 0.2,
  },
  {
    id: "new_baby",
    category: "family",
    title: "Naissance d'un enfant",
    description: "Un nouveau membre rejoint ta famille ! La joie est immense, mais les nuits courtes aussi.",
    icon: "👶",
    hadChoice: false,
    impacts: [
      { type: "moral", delta: 25, label: "+25 moral" },
      { type: "stamina", delta: -5, label: "-5 endurance (fatigue)" },
    ],
    condition: (s) => (s.familyStatus === "married" || s.familyStatus === "in_relationship") && Math.random() < 0.2,
  },
  {
    id: "family_crisis",
    category: "family",
    title: "Crise familiale",
    description: "Des tensions dans ta vie personnelle affectent ta concentration sur le terrain.",
    icon: "⚡",
    hadChoice: false,
    impacts: [{ type: "moral", delta: -15, label: "-15 moral" }, { type: "training", delta: -3, label: "-3 training" }],
    condition: (s) => s.familyStatus !== "single" && Math.random() < 0.15,
  },

  /* ── Santé mentale ── */
  {
    id: "meditation_routine",
    category: "spiritual",
    title: "Routine de méditation",
    description: "Tu adoptes une pratique de pleine conscience quotidienne. Ton mental s'en trouve renforcé.",
    icon: "🧘",
    hadChoice: true,
    impacts: [{ type: "moral", delta: 8, label: "+8 moral" }, { type: "training", delta: 2, label: "+2 training" }],
  },
  {
    id: "burnout_risk",
    category: "health",
    title: "Risque de burn-out",
    description: "La pression s'accumule. Tu dois choisir : t'accorder du repos ou continuer à fond.",
    icon: "🔥",
    hadChoice: true,
    impacts: [{ type: "moral", delta: -10, label: "-10 moral si ignoré" }, { type: "stamina", delta: -8, label: "-8 endurance" }],
    condition: (_, age) => age >= 27 && Math.random() < 0.2,
  },
  {
    id: "mental_coach",
    category: "health",
    title: "Préparateur mental",
    description: "Tu travailles avec un préparateur mental. Résultat : une tête bien faite sur des épaules solides.",
    icon: "🧠",
    hadChoice: true,
    impacts: [{ type: "moral", delta: 12, label: "+12 moral" }, { type: "training", delta: 3, label: "+3 training" }],
  },

  /* ── Social ── */
  {
    id: "charity_work",
    category: "social",
    title: "Action caritative",
    description: "Tu t'engages pour une cause qui te tient à cœur. Le club et les fans apprécient.",
    icon: "🤝",
    hadChoice: true,
    impacts: [{ type: "moral", delta: 8, label: "+8 moral" }, { type: "reputation", delta: 10, label: "+10 réputation" }],
  },
  {
    id: "social_scandal",
    category: "social",
    title: "Scandale médiatique",
    description: "Une sortie mal interprétée fait le buzz. Les médias se déchaînent.",
    icon: "📰",
    hadChoice: false,
    impacts: [{ type: "moral", delta: -12, label: "-12 moral" }, { type: "reputation", delta: -15, label: "-15 réputation" }],
    condition: () => Math.random() < 0.1,
  },
  {
    id: "team_dinner",
    category: "social",
    title: "Dîner d'équipe",
    description: "Une soirée avec les coéquipiers qui renforce les liens. Le vestiaire s'en souvient.",
    icon: "🍽️",
    hadChoice: false,
    impacts: [{ type: "moral", delta: 5, label: "+5 moral" }, { type: "cohesion", delta: 5, label: "+5 cohésion" }],
    condition: () => Math.random() < 0.25,
  },

  /* ── Finances ── */
  {
    id: "good_investment",
    category: "finance",
    title: "Investissement réussi",
    description: "Ton placement financier a payé. Tu t'épanouis hors des terrains aussi.",
    icon: "📈",
    hadChoice: true,
    impacts: [{ type: "moral", delta: 8, label: "+8 moral" }, { type: "economy", delta: 50000, label: "+50k€" }],
  },
  {
    id: "financial_trouble",
    category: "finance",
    title: "Difficultés financières",
    description: "Des dépenses imprévues créent un stress supplémentaire.",
    icon: "📉",
    hadChoice: false,
    impacts: [{ type: "moral", delta: -10, label: "-10 moral" }, { type: "economy", delta: -30000, label: "-30k€" }],
    condition: () => Math.random() < 0.1,
  },

  /* ── Logement ── */
  {
    id: "new_home",
    category: "housing",
    title: "Nouveau chez-soi",
    description: "Tu emménages dans un logement qui te correspond vraiment. Le confort au quotidien améliore tout.",
    icon: "🏠",
    hadChoice: true,
    impacts: [{ type: "moral", delta: 10, label: "+10 moral" }, { type: "stamina", delta: 3, label: "+3 endurance" }],
    condition: (_, age) => age >= 20 && Math.random() < 0.2,
  },
];

/* ── Calcul d'événement hebdomadaire ───────────────────────────────── */

export function generatePersonalEvent(
  state: PersonalLifeState,
  age: number,
  season: number,
  week: number,
  rng: () => number,
): PersonalLifeEvent | null {
  // Fréquence : événement ~1 fois toutes les 5 semaines
  if (rng() > 0.2) return null;

  const eligible = PERSONAL_EVENT_TEMPLATES.filter(t => {
    // Pas de doublon récent (même ID dans les 3 dernières saisons)
    const alreadyRecent = state.events.some(
      e => e.id === t.id && season - e.season < 3
    );
    if (alreadyRecent) return false;
    if (t.condition && !t.condition(state, age, season)) return false;
    return true;
  });

  if (eligible.length === 0) return null;

  const tpl = eligible[Math.floor(rng() * eligible.length)];
  return {
    id: tpl.id,
    season,
    week,
    category: tpl.category,
    title: tpl.title,
    description: tpl.description,
    icon: tpl.icon,
    impacts: tpl.impacts,
    hadChoice: tpl.hadChoice,
    choiceMade: tpl.hadChoice ? undefined : "accept",
  };
}

/* ── Application d'un événement ────────────────────────────────────── */

export function applyPersonalEvent(
  state: PersonalLifeState,
  event: PersonalLifeEvent,
  accepted: boolean,
): PersonalLifeState {
  let moral = state.moral;
  let activeStaminaBonus = state.activeStaminaBonus;
  let activeTrainingBonus = state.activeTrainingBonus;
  let activeBonusWeeksLeft = state.activeBonusWeeksLeft;
  let familyStatus = state.familyStatus;
  let childrenCount = state.childrenCount;

  if (accepted) {
    for (const impact of event.impacts) {
      if (impact.type === "moral") moral = Math.max(0, Math.min(100, moral + impact.delta));
      if (impact.type === "stamina") { activeStaminaBonus += impact.delta; activeBonusWeeksLeft = Math.max(activeBonusWeeksLeft, 8); }
      if (impact.type === "training") { activeTrainingBonus += impact.delta; activeBonusWeeksLeft = Math.max(activeBonusWeeksLeft, 8); }
    }

    // Mise à jour statut familial
    if (event.id === "new_relationship") familyStatus = "in_relationship";
    if (event.id === "marriage" || event.id === "engaged") familyStatus = "married";
    if (event.id === "new_baby") { familyStatus = "parent"; childrenCount++; }
  } else {
    // Refus : légère baisse de moral
    moral = Math.max(0, moral - 3);
  }

  const updatedEvent: PersonalLifeEvent = { ...event, choiceMade: accepted ? "accept" : "decline" };

  return {
    ...state,
    moral,
    activeStaminaBonus,
    activeTrainingBonus,
    activeBonusWeeksLeft,
    familyStatus,
    childrenCount,
    events: [updatedEvent, ...state.events].slice(0, 50),
  };
}

/* ── Mise à jour hebdomadaire ─────────────────────────────────────── */

export function updatePersonalLifeWeekly(
  state: PersonalLifeState,
): PersonalLifeState {
  // Décroissance naturelle des bonus actifs
  const weeksLeft = Math.max(0, state.activeBonusWeeksLeft - 1);
  const staminaBonus = weeksLeft > 0 ? state.activeStaminaBonus : 0;
  const trainingBonus = weeksLeft > 0 ? state.activeTrainingBonus : 0;

  // Décroissance lente du moral vers 65 (moyenne)
  const targetMoral = 65;
  const moral = state.moral + (targetMoral - state.moral) * 0.02;

  return {
    ...state,
    moral: Math.round(moral * 10) / 10,
    activeStaminaBonus: staminaBonus,
    activeTrainingBonus: trainingBonus,
    activeBonusWeeksLeft: weeksLeft,
  };
}

/* ── Labels ─────────────────────────────────────────────────────────── */

export const CATEGORY_LABELS: Record<PersonalEventCategory, string> = {
  family:    "Famille",
  health:    "Santé mentale",
  social:    "Social",
  finance:   "Finances",
  spiritual: "Mental",
  housing:   "Logement",
};

export const FAMILY_STATUS_LABELS: Record<PersonalLifeState["familyStatus"], string> = {
  single:          "Célibataire",
  in_relationship: "En couple",
  married:         "Marié(e)",
  parent:          "Parent",
};

export const MORAL_LABEL = (moral: number): string => {
  if (moral >= 85) return "Excellent";
  if (moral >= 70) return "Bien";
  if (moral >= 50) return "Neutre";
  if (moral >= 30) return "Difficile";
  return "Critique";
};

export const MORAL_COLOR = (moral: number): string => {
  if (moral >= 70) return "var(--fc-emerald)";
  if (moral >= 50) return "var(--fc-blue)";
  if (moral >= 30) return "var(--fc-amber)";
  return "var(--fc-red)";
};
