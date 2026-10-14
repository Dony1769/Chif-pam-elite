/**
 * FC CAREER — Défis de carrière
 * Scénarios optionnels avec objectifs mesurables et récompenses.
 * Pur domaine — aucune dépendance React.
 */

import type { Player } from "./player";
import type { Career } from "./career";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ChallengeCategory =
  | "performance"   // buts, notes, apparitions
  | "progression"   // overall, PA, attributs
  | "social"        // fans, médias, équipe
  | "endurance"     // sans blessure, régularité
  | "elite";        // défis haut niveau

export type ChallengeDifficulty = "bronze" | "silver" | "gold" | "legendary";

export type ChallengeStatus = "locked" | "available" | "active" | "completed" | "failed";

export interface ChallengeObjective {
  id: string;
  label: string;
  /** Type de mesure */
  metric: "goals" | "assists" | "avgRating" | "appearances" | "overall" | "paPoints" | "fanRating" | "mediaRep" | "caps" | "weeks_uninjured";
  target: number;
  current: number;
  done: boolean;
}

export interface ChallengeReward {
  paBonus?: number;
  walletBonus?: number;
  fanBonus?: number;
  mediaBonus?: number;
  label: string;
  icon: string;
}

export interface CareerChallenge {
  id: string;
  title: string;
  description: string;
  category: ChallengeCategory;
  difficulty: ChallengeDifficulty;
  status: ChallengeStatus;
  objectives: ChallengeObjective[];
  reward: ChallengeReward;
  /** Saison de début — null si pas encore activé */
  startedSeason: number | null;
  /** Semaines pour compléter depuis activation — null = pas de limite */
  weekLimit: number | null;
  weeksElapsed: number;
  completedSeason: number | null;
}

// ─── Bibliothèque de défis ─────────────────────────────────────────────────────

export const CHALLENGE_LIBRARY: Omit<CareerChallenge, "status" | "startedSeason" | "weeksElapsed" | "completedSeason">[] = [
  // ── Bronze ──
  {
    id: "challenge-debut",
    title: "Premiers Pas",
    description: "Joue 5 matchs cette saison et marque au moins 1 but.",
    category: "performance",
    difficulty: "bronze",
    objectives: [
      { id: "obj-apps", label: "5 apparitions", metric: "appearances", target: 5, current: 0, done: false },
      { id: "obj-goals", label: "1 but minimum", metric: "goals", target: 1, current: 0, done: false },
    ],
    reward: { paBonus: 5, label: "+5 PA", icon: "⭐" },
    weekLimit: null,
  },
  {
    id: "challenge-form",
    title: "En Forme",
    description: "Maintiens une note moyenne ≥ 6.5 sur 8 matchs.",
    category: "performance",
    difficulty: "bronze",
    objectives: [
      { id: "obj-apps", label: "8 apparitions", metric: "appearances", target: 8, current: 0, done: false },
      { id: "obj-rating", label: "Moyenne ≥ 6.5", metric: "avgRating", target: 65, current: 0, done: false },
    ],
    reward: { paBonus: 8, walletBonus: 500, label: "+8 PA + 500€", icon: "🔥" },
    weekLimit: 20,
  },
  {
    id: "challenge-healthy",
    title: "Indestructible",
    description: "Reste sans blessure pendant 20 semaines consécutives.",
    category: "endurance",
    difficulty: "bronze",
    objectives: [
      { id: "obj-weeks", label: "20 semaines sans blessure", metric: "weeks_uninjured", target: 20, current: 0, done: false },
    ],
    reward: { paBonus: 6, label: "+6 PA", icon: "💪" },
    weekLimit: 30,
  },

  // ── Silver ──
  {
    id: "challenge-goalscorer",
    title: "Buteur Prolifique",
    description: "Marque 10 buts en une seule saison.",
    category: "performance",
    difficulty: "silver",
    objectives: [
      { id: "obj-goals", label: "10 buts en une saison", metric: "goals", target: 10, current: 0, done: false },
    ],
    reward: { paBonus: 15, walletBonus: 2000, label: "+15 PA + 2 000€", icon: "⚽" },
    weekLimit: 38,
  },
  {
    id: "challenge-progression",
    title: "Montée en Puissance",
    description: "Atteins overall 75 et accumule 50 PA totaux.",
    category: "progression",
    difficulty: "silver",
    objectives: [
      { id: "obj-overall", label: "Overall ≥ 75", metric: "overall", target: 75, current: 0, done: false },
      { id: "obj-pa", label: "50 PA accumulés", metric: "paPoints", target: 50, current: 0, done: false },
    ],
    reward: { paBonus: 20, label: "+20 PA", icon: "📈" },
    weekLimit: null,
  },
  {
    id: "challenge-medias",
    title: "Star Médiatique",
    description: "Atteins 60 de réputation médias et 500 followers fans.",
    category: "social",
    difficulty: "silver",
    objectives: [
      { id: "obj-media", label: "60 réputation médias", metric: "mediaRep", target: 60, current: 0, done: false },
      { id: "obj-fans", label: "500 followers fans", metric: "fanRating", target: 50, current: 0, done: false },
    ],
    reward: { walletBonus: 5000, fanBonus: 10, label: "+5 000€ + 10 fan rating", icon: "📺" },
    weekLimit: null,
  },

  // ── Gold ──
  {
    id: "challenge-captain",
    title: "Leadership Naturel",
    description: "Joue 30 matchs avec une moyenne ≥ 7.0 et obtiens 5 sélections nationales.",
    category: "elite",
    difficulty: "gold",
    objectives: [
      { id: "obj-apps", label: "30 apparitions", metric: "appearances", target: 30, current: 0, done: false },
      { id: "obj-rating", label: "Moyenne ≥ 7.0", metric: "avgRating", target: 70, current: 0, done: false },
      { id: "obj-caps", label: "5 sélections nationales", metric: "caps", target: 5, current: 0, done: false },
    ],
    reward: { paBonus: 35, walletBonus: 10000, label: "+35 PA + 10 000€", icon: "🏅" },
    weekLimit: null,
  },
  {
    id: "challenge-elite-scorer",
    title: "Légende Locale",
    description: "Marque 20 buts et délivre 10 passes décisives sur deux saisons.",
    category: "performance",
    difficulty: "gold",
    objectives: [
      { id: "obj-goals", label: "20 buts cumulés", metric: "goals", target: 20, current: 0, done: false },
      { id: "obj-assists", label: "10 passes décisives", metric: "assists", target: 10, current: 0, done: false },
    ],
    reward: { paBonus: 30, fanBonus: 20, label: "+30 PA + 20 fan rating", icon: "🌟" },
    weekLimit: 76,
  },

  // ── Legendary ──
  {
    id: "challenge-pro-ready",
    title: "Prêt pour le Haut Niveau",
    description: "Atteins overall 85, 100 PA totaux et signe un contrat professionnel.",
    category: "elite",
    difficulty: "legendary",
    objectives: [
      { id: "obj-overall", label: "Overall ≥ 85", metric: "overall", target: 85, current: 0, done: false },
      { id: "obj-pa", label: "100 PA totaux", metric: "paPoints", target: 100, current: 0, done: false },
    ],
    reward: { paBonus: 50, walletBonus: 25000, label: "+50 PA + 25 000€", icon: "👑" },
    weekLimit: null,
  },
  {
    id: "challenge-immortal",
    title: "Immortel",
    description: "Joue 50 matchs sans aucune carte rouge et maintiens une moyenne ≥ 7.5.",
    category: "endurance",
    difficulty: "legendary",
    objectives: [
      { id: "obj-apps", label: "50 apparitions", metric: "appearances", target: 50, current: 0, done: false },
      { id: "obj-rating", label: "Moyenne ≥ 7.5", metric: "avgRating", target: 75, current: 0, done: false },
    ],
    reward: { paBonus: 40, walletBonus: 20000, mediaBonus: 20, label: "+40 PA + 20 000€ + 20 médias", icon: "🏆" },
    weekLimit: null,
  },
];

// ─── Initialisation ────────────────────────────────────────────────────────────

export function buildInitialChallenges(): CareerChallenge[] {
  return CHALLENGE_LIBRARY.map((c, i): CareerChallenge => ({
    ...c,
    status: (i < 3 ? "available" : "locked") as ChallengeStatus,
    startedSeason: null,
    weeksElapsed: 0,
    completedSeason: null,
  }));
}

// ─── Activation ───────────────────────────────────────────────────────────────

export function activateChallenge(
  challenges: CareerChallenge[],
  challengeId: string,
  season: number,
): CareerChallenge[] {
  return challenges.map(c =>
    c.id === challengeId && c.status === "available"
      ? { ...c, status: "active" as ChallengeStatus, startedSeason: season, weeksElapsed: 0 }
      : c,
  );
}

// ─── Débloquer les défis suivants ─────────────────────────────────────────────

function unlockNext(challenges: CareerChallenge[]): CareerChallenge[] {
  const ORDER: ChallengeDifficulty[] = ["bronze", "silver", "gold", "legendary"];
  const completedByDiff: Record<ChallengeDifficulty, number> = { bronze: 0, silver: 0, gold: 0, legendary: 0 };
  for (const c of challenges) {
    if (c.status === "completed") completedByDiff[c.difficulty]++;
  }

  return challenges.map(c => {
    if (c.status !== "locked") return c;
    const diffIdx = ORDER.indexOf(c.difficulty);
    // Silver s'ouvre après 2 bronze, gold après 2 silver, legendary après 1 gold
    const thresholds: Record<ChallengeDifficulty, number> = { bronze: 0, silver: 2, gold: 2, legendary: 1 };
    const prevDiff = diffIdx > 0 ? ORDER[diffIdx - 1] : null;
    const prevCompleted = prevDiff ? completedByDiff[prevDiff] : 999;
    const threshold = thresholds[c.difficulty];
    if (prevCompleted >= threshold) return { ...c, status: "available" as ChallengeStatus };
    return c;
  });
}

// ─── Mise à jour hebdomadaire des défis actifs ────────────────────────────────

export interface ChallengeProgressInput {
  player: Player;
  career: Pick<Career, "season" | "week">;
  weeklyGoals?: number;
  weeklyAssists?: number;
  weeklyRating?: number;
  weeklyAppearance?: boolean;
  weeksUninjured?: number;
  mediaRep?: number;
  fanRating?: number;
  caps?: number;
}

export function updateChallengeProgress(
  challenges: CareerChallenge[],
  input: ChallengeProgressInput,
): CareerChallenge[] {
  const currentSeason = input.career.season;
  const updated = challenges.map(c => {
    if (c.status !== "active") return c;

    const elapsed = c.weeksElapsed + 1;
    const timedOut = c.weekLimit !== null && elapsed > c.weekLimit;

    if (timedOut) {
      const allDone = c.objectives.every(o => o.done);
      return { ...c, status: allDone ? "completed" : "failed", weeksElapsed: elapsed };
    }

    // Mettre à jour les objectifs
    const newObjs = c.objectives.map(o => {
      if (o.done) return o;
      let current = o.current;
      switch (o.metric) {
        case "goals":          if (input.weeklyGoals)   current += input.weeklyGoals;   break;
        case "assists":        if (input.weeklyAssists) current += input.weeklyAssists; break;
        case "appearances":    if (input.weeklyAppearance) current++;                    break;
        case "avgRating":
          if (input.weeklyRating) current = Math.round(input.weeklyRating * 10);
          break;
        case "overall":        current = input.player.overall;                          break;
        case "paPoints":       current = input.player.paPoints;                        break;
        case "fanRating":      current = input.fanRating ?? 0;                         break;
        case "mediaRep":       current = input.mediaRep ?? 0;                          break;
        case "caps":           current = input.caps ?? 0;                              break;
        case "weeks_uninjured": current = input.weeksUninjured ?? 0;                   break;
      }
      const done = current >= o.target;
      return { ...o, current: Math.min(current, o.target), done };
    });

    const allDone = newObjs.every(o => o.done);
    const newStatus: ChallengeStatus = allDone ? "completed" : "active";
    return {
      ...c,
      objectives: newObjs,
      weeksElapsed: elapsed,
      status: newStatus,
      completedSeason: allDone ? currentSeason : c.completedSeason,
    };
  });

  return unlockNext(updated as CareerChallenge[]);
}

// ─── Couleurs / labels ────────────────────────────────────────────────────────

export const DIFFICULTY_COLORS: Record<ChallengeDifficulty, string> = {
  bronze:    "#cd7f32",
  silver:    "#a8a9ad",
  gold:      "#ffd700",
  legendary: "#b833ff",
};

export const DIFFICULTY_LABELS: Record<ChallengeDifficulty, string> = {
  bronze:    "Bronze",
  silver:    "Argent",
  gold:      "Or",
  legendary: "Légendaire",
};

export const CATEGORY_LABELS: Record<ChallengeCategory, string> = {
  performance: "Performance",
  progression: "Progression",
  social:      "Social",
  endurance:   "Endurance",
  elite:       "Élite",
};
