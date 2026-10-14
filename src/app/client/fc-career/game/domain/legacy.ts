/**
 * FC CAREER — Héritage & Retraite
 * Bilan de carrière, records, trophées, réputation finale, retraite.
 * Pur domaine — aucune dépendance React.
 */

import type { Career } from "./career";
import type { Player } from "./player";

/* ── Records de carrière ─────────────────────────────────────────── */

export interface CareerRecord {
  id: string;
  label: string;
  value: number;
  unit: string; // "buts", "passes", "matchs", etc.
  season: number; // Saison où le record a été établi
  icon: string;  // emoji
}

export interface CareerTrophy {
  id: string;
  label: string;
  season: number;
  icon: string;
  tier: "major" | "minor" | "individual"; // Trophée majeur / mineur / individuel
}

/* ── Réputation finale ──────────────────────────────────────────── */

export type LegacyTier =
  | "unknown"        // Inconnu (< 3 saisons)
  | "decent"         // Joueur correct
  | "good"           // Bon joueur
  | "very_good"      // Très bon joueur
  | "great"          // Grand joueur
  | "legend";        // Légende

export interface CareerLegacy {
  /** Réputation finale calculée 0-100 */
  reputationScore: number;
  tier: LegacyTier;
  /** Titres remportés */
  trophies: CareerTrophy[];
  /** Records personnels */
  records: CareerRecord[];
  /** Statistiques cumulées de carrière */
  stats: CareerStats;
  /** Saisons jouées */
  seasonsPlayed: number;
  /** Phase maximale atteinte */
  peakPhase: string;
  /** OVR maximum atteint */
  peakOverall: number;
  /** Age de la retraite (si retraité) */
  retirementAge: number | null;
  /** Résumé narratif de la carrière */
  narrativeSummary: string;
}

export interface CareerStats {
  totalGoals: number;
  totalAssists: number;
  totalMatches: number;
  totalMinutes: number;
  averageRating: number;
  totalPA: number; // Points d'attribut totaux gagnés
  highestRating: number;
  cleanSheets?: number; // Pour les gardiens
}

/* ── Calcul de la réputation ─────────────────────────────────────── */

export function computeLegacyScore(
  stats: CareerStats,
  trophies: CareerTrophy[],
  peakOverall: number,
  seasonsPlayed: number,
  peakPhase: string,
): number {
  let score = 0;

  // Base sur l'OVR maximum (0-30 pts)
  score += Math.round((peakOverall / 100) * 30);

  // Saisons professionnelles (0-20 pts)
  const proSeasons = Math.max(0, seasonsPlayed - 2);
  score += Math.min(20, proSeasons * 2);

  // Buts (0-15 pts) — normalisé sur 200 buts
  score += Math.min(15, Math.round((stats.totalGoals / 200) * 15));

  // Passes (0-10 pts) — normalisé sur 150 passes
  score += Math.min(10, Math.round((stats.totalAssists / 150) * 10));

  // Trophées majeurs (5 pts chacun, max 15)
  const majorTrophies = trophies.filter(t => t.tier === "major").length;
  score += Math.min(15, majorTrophies * 5);

  // Trophées mineurs (1 pt chacun, max 5)
  score += Math.min(5, trophies.filter(t => t.tier === "minor").length);

  // Récompenses individuelles (2 pts chacune, max 5)
  score += Math.min(5, trophies.filter(t => t.tier === "individual").length * 2);

  // Bonus phase élite/légende
  if (peakPhase === "legend") score += 5;
  else if (peakPhase === "elite") score += 3;

  return Math.min(100, Math.max(0, score));
}

export function legacyTierFromScore(score: number, seasonsPlayed: number): LegacyTier {
  if (seasonsPlayed < 3) return "unknown";
  if (score >= 80) return "legend";
  if (score >= 60) return "great";
  if (score >= 40) return "very_good";
  if (score >= 25) return "good";
  return "decent";
}

export const LEGACY_TIER_LABELS: Record<LegacyTier, string> = {
  unknown:   "Carrière en cours",
  decent:    "Joueur correct",
  good:      "Bon joueur",
  very_good: "Très bon joueur",
  great:     "Grand joueur",
  legend:    "Légende",
};

export const LEGACY_TIER_COLORS: Record<LegacyTier, string> = {
  unknown:   "var(--fc-text-3)",
  decent:    "var(--fc-text-2)",
  good:      "var(--fc-blue)",
  very_good: "var(--fc-amber)",
  great:     "var(--fc-amber)",
  legend:    "#FFD700",
};

/* ── Génération du résumé narratif ──────────────────────────────── */

export function generateNarrativeSummary(
  playerName: string,
  stats: CareerStats,
  trophies: CareerTrophy[],
  tier: LegacyTier,
  peakOverall: number,
  seasonsPlayed: number,
  retirementAge: number | null,
): string {
  const majorTrophies = trophies.filter(t => t.tier === "major");
  const goalStr = stats.totalGoals > 0 ? ` ${stats.totalGoals} buts` : "";
  const assistStr = stats.totalAssists > 0 ? ` et ${stats.totalAssists} passes décisives` : "";
  const trophyStr = majorTrophies.length > 0
    ? ` Il a remporté ${majorTrophies.length} titre${majorTrophies.length > 1 ? "s" : ""} majeur${majorTrophies.length > 1 ? "s" : ""}.`
    : "";
  const retirementStr = retirementAge
    ? ` ${playerName} a raccroché les crampons à ${retirementAge} ans.`
    : "";

  const tierPhrases: Record<LegacyTier, string> = {
    unknown: `La carrière de ${playerName} est encore en construction.`,
    decent: `${playerName} a eu une carrière honnête, modeste mais sincère.`,
    good: `${playerName} s'est imposé comme un bon joueur professionnel.`,
    very_good: `${playerName} a brillé dans sa carrière et s'est imposé dans le football professionnel.`,
    great: `${playerName} a marqué le football de son époque et restera dans les mémoires.`,
    legend: `${playerName} est entré dans la légende du football. Son nom sera gravé pour toujours.`,
  };

  return `${tierPhrases[tier]} En ${seasonsPlayed} saison${seasonsPlayed > 1 ? "s" : ""}` +
    `, il a disputé ${stats.totalMatches} match${stats.totalMatches > 1 ? "s" : ""}` +
    `${goalStr}${assistStr}.${trophyStr}${retirementStr}`;
}

/* ── Extraction des records depuis l'historique de progression ──── */

export function extractRecords(
  progressionHistory: Player["progressionHistory"],
  stats: CareerStats,
): CareerRecord[] {
  const records: CareerRecord[] = [];

  if (stats.highestRating > 0) {
    records.push({
      id: "best_rating",
      label: "Meilleure note",
      value: stats.highestRating,
      unit: "/10",
      season: progressionHistory[progressionHistory.length - 1]?.season ?? 1,
      icon: "⭐",
    });
  }

  if (stats.totalGoals > 0) {
    records.push({
      id: "career_goals",
      label: "Buts en carrière",
      value: stats.totalGoals,
      unit: "buts",
      season: progressionHistory[progressionHistory.length - 1]?.season ?? 1,
      icon: "⚽",
    });
  }

  if (stats.totalAssists > 0) {
    records.push({
      id: "career_assists",
      label: "Passes décisives",
      value: stats.totalAssists,
      unit: "passes",
      season: progressionHistory[progressionHistory.length - 1]?.season ?? 1,
      icon: "🎯",
    });
  }

  if (stats.totalMatches > 0) {
    records.push({
      id: "career_matches",
      label: "Matchs joués",
      value: stats.totalMatches,
      unit: "matchs",
      season: progressionHistory[progressionHistory.length - 1]?.season ?? 1,
      icon: "📅",
    });
  }

  return records;
}

/* ── Trophées auto-générés depuis les bilans de saison ──────────── */

export function extractTrophiesFromSummaries(
  summaries: Career["seasonSummaries"],
): CareerTrophy[] {
  const trophies: CareerTrophy[] = [];

  for (const summary of summaries) {
    // Promotion = trophée mineur
    if ((summary as { promoted?: boolean }).promoted) {
      trophies.push({
        id: `promotion-s${summary.season}`,
        label: `Promotion — Saison ${summary.season}`,
        season: summary.season,
        icon: "⬆️",
        tier: "minor",
      });
    }

    // Titre de champion (si OVR haut et résumé)
    const avgRating = (summary as { averageRating?: number }).averageRating ?? 0;
    if (avgRating >= 8.5) {
      trophies.push({
        id: `top-performer-s${summary.season}`,
        label: `Joueur de saison — Saison ${summary.season}`,
        season: summary.season,
        icon: "🏅",
        tier: "individual",
      });
    }
  }

  return trophies;
}

/* ── Calcul du bilan complet ─────────────────────────────────────── */

export function computeCareerLegacy(
  player: Player,
  career: Career,
): CareerLegacy {
  // Lire les stats depuis le joueur (Player.stats: CareerStats)
  const playerStats = player.stats;
  const totalGoals    = playerStats.totalGoals;
  const totalAssists  = playerStats.totalAssists;
  const totalMatches  = playerStats.totalAppearances;
  const totalMinutes  = playerStats.totalMinutes;

  // Calculer la moyenne de note depuis les saisons
  const seasonRatings = playerStats.seasons
    .filter(s => s.appearances > 0)
    .map(s => s.avgRating);
  const averageRating = seasonRatings.length > 0
    ? seasonRatings.reduce((a, b) => a + b, 0) / seasonRatings.length
    : 0;
  const highestRating = seasonRatings.length > 0
    ? Math.max(...seasonRatings)
    : 0;

  const stats: CareerStats = {
    totalGoals,
    totalAssists,
    totalMatches,
    totalMinutes,
    averageRating: Math.round(averageRating * 10) / 10,
    totalPA: player.paPoints,
    highestRating: Math.round(highestRating * 10) / 10,
  };

  const trophies = extractTrophiesFromSummaries(career.seasonSummaries);
  const records  = extractRecords(player.progressionHistory, stats);

  // OVR maximum depuis les stats ou l'historique
  const peakOverall = Math.max(
    playerStats.peakOverall,
    player.progressionHistory.length > 0
      ? Math.max(...player.progressionHistory.map(h => h.overall))
      : 0,
    player.overall,
  );

  const seasonsPlayed = career.seasonSummaries.length;
  const peakPhase     = career.phase;

  const reputationScore = computeLegacyScore(stats, trophies, peakOverall, seasonsPlayed, peakPhase);
  const tier = legacyTierFromScore(reputationScore, seasonsPlayed);

  const fullName = `${player.firstName} ${player.lastName}`;
  const narrativeSummary = generateNarrativeSummary(
    fullName, stats, trophies, tier, peakOverall, seasonsPlayed, null
  );

  return {
    reputationScore,
    tier,
    trophies,
    records,
    stats,
    seasonsPlayed,
    peakPhase,
    peakOverall,
    retirementAge: null,
    narrativeSummary,
  };
}

/* ── Vérification de fin de carrière ────────────────────────────── */

export function shouldSuggestRetirement(
  player: Player,
  career: Career,
): { suggest: boolean; reason: string } {
  const age = player.age;
  const ovr = player.overall;

  if (age >= 38) {
    return { suggest: true, reason: `À ${age} ans, l'heure de la retraite approche.` };
  }
  if (age >= 35 && ovr < 65) {
    return { suggest: true, reason: `À ${age} ans avec ${ovr} OVR, les performances déclinent.` };
  }
  if (career.phase === "legend" && career.season > 20) {
    return { suggest: true, reason: "Après plus de 20 saisons au sommet, c'est le temps du bilan." };
  }

  return { suggest: false, reason: "" };
}
