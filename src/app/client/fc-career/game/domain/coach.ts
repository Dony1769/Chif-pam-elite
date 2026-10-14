/**
 * FC CAREER — Domaine : Coach
 * Relation joueur-entraîneur, confiance, temps de jeu, rôle.
 */

export type PlayerRole =
  | "titulaire"       // Titulaire établi
  | "rotation"        // Joueur de rotation
  | "remplaçant"      // Remplaçant
  | "espoir";         // Joueur en développement

export type CoachPhilosophy =
  | "offensif"
  | "défensif"
  | "possession"
  | "contre-attaque"
  | "équilibré";

export interface CoachProfile {
  id: string;
  name: string;
  philosophy: CoachPhilosophy;
  /** 0-100 : confiance du coach envers le joueur */
  trust: number;
  /** Rôle actuel dans l'effectif */
  playerRole: PlayerRole;
  /** Objectif saisonnier fixé par le coach */
  seasonObjective: CoachObjective;
  /** Conversations passées */
  conversations: CoachConversation[];
}

export interface CoachObjective {
  description: string;
  type: "appearances" | "goals" | "assists" | "rating" | "development";
  target: number;
  current: number;
  completed: boolean;
}

export interface CoachConversation {
  id: string;
  season: number;
  week: number;
  trigger: string; // raison de la conversation
  message: string; // message du coach
  effect?: { trust?: number; role?: PlayerRole };
}

/** Calcule l'évolution de la confiance coach selon les performances */
export function computeTrustDelta(
  currentRole: PlayerRole,
  matchRating: number,
  minutesPlayed: number,
): number {
  const playedFull = minutesPlayed >= 60;
  const playedSub  = minutesPlayed > 0 && minutesPlayed < 60;

  let delta = 0;

  if (matchRating >= 8.0) delta += playedFull ? 4 : 2;
  else if (matchRating >= 7.0) delta += playedFull ? 2 : 1;
  else if (matchRating >= 6.0) delta += 0;
  else if (matchRating >= 5.0) delta -= playedFull ? 2 : 1;
  else delta -= playedFull ? 4 : 2;

  if (!playedFull && !playedSub) delta -= 1; // non convoqué

  // Bonus si espoir : progression plus rapide
  if (currentRole === "espoir" && delta > 0) delta += 1;

  return delta;
}

/** Détermine le rôle en fonction de la confiance */
export function roleFromTrust(trust: number): PlayerRole {
  if (trust >= 80) return "titulaire";
  if (trust >= 55) return "rotation";
  if (trust >= 30) return "remplaçant";
  return "espoir";
}

/** Génère un message de coach selon le contexte */
export function generateCoachMessage(
  trigger: string,
  trust: number,
  role: PlayerRole,
  objective: CoachObjective,
): string {
  const progressPct = objective.target > 0
    ? Math.round((objective.current / objective.target) * 100)
    : 0;

  const messages: Record<string, string[]> = {
    good_performance: [
      "Excellente prestation. Continue comme ça et tu auras plus de temps de jeu.",
      "C'est exactement ce que j'attends de toi. Tu mérites ta place.",
      "Match solide. Tu t'imposes dans l'équipe.",
    ],
    bad_performance: [
      "Ce n'était pas suffisant aujourd'hui. Tu dois mieux faire.",
      "Je t'ai donné une chance, j'espère que tu la saisiras mieux la prochaine fois.",
      "Tes performances doivent s'améliorer si tu veux garder ta place.",
    ],
    season_start: [
      `Objectif de la saison : ${objective.description}. Concentre-toi là-dessus.`,
      `Nouvelle saison, nouvelles attentes. Je compte sur toi pour ${objective.description.toLowerCase()}.`,
    ],
    objective_progress: [
      `Tu progresses vers ton objectif (${progressPct}%). Garde le cap.`,
      `${progressPct}% de l'objectif atteint. Il reste du travail.`,
    ],
    promotion_warning: [
      "Tu as progressé. On va te donner plus de responsabilités.",
      "Tes performances te valent une montée en grade. Prouve-toi.",
    ],
    demotion_warning: [
      "Je dois être honnête : tu n'es plus dans mes plans si ça continue.",
      "Ta place n'est pas garantie. Réagis vite.",
    ],
  };

  const pool = messages[trigger] ?? messages.season_start;
  return pool[Math.floor(trust / 34)] ?? pool[0];
}

/** Génère un profil coach initial selon la phase de carrière */
export function createInitialCoach(phase: string, season: number): CoachProfile {
  const coaches: Record<string, { name: string; philosophy: CoachPhilosophy }> = {
    academy: { name: "Marc Delacroix", philosophy: "offensif" },
    reserve: { name: "Antoine Morel", philosophy: "équilibré" },
    professional: { name: "Stefan Bauer", philosophy: "possession" },
    elite: { name: "Carlos Mendez", philosophy: "contre-attaque" },
    legend: { name: "Roberto Silva", philosophy: "défensif" },
  };
  const base = coaches[phase] ?? coaches.academy;

  return {
    id: `coach-${phase}-s${season}`,
    name: base.name,
    philosophy: base.philosophy,
    trust: 40,
    playerRole: "espoir",
    seasonObjective: {
      description: "Disputer au moins 5 matchs",
      type: "appearances",
      target: 5,
      current: 0,
      completed: false,
    },
    conversations: [],
  };
}
