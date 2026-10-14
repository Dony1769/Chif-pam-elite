/**
 * FC CAREER — Rivaux évolutifs
 * Des joueurs du monde qui évoluent en parallèle du joueur.
 * Pur domaine — aucune dépendance React.
 */

import type { WorldPlayer } from "../data/worldPlayers";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type RivalRelation = "rivalry" | "nemesis" | "benchmark" | "companion";

export interface RivalSnapshot {
  season: number;
  overall: number;
  goals: number;
  assists: number;
  appearances: number;
  avgRating: number;
}

export interface PlayerRival {
  /** ID du WorldPlayer correspondant */
  worldPlayerId: string;
  /** Nom affiché */
  name: string;
  clubId: string;
  position: string;
  relation: RivalRelation;
  /** Rencontres : plus c'est élevé, plus la rivalité est intense (0-100) */
  intensityScore: number;
  /** Historique des snapshots par saison */
  history: RivalSnapshot[];
  /** Saison où le rival est apparu */
  appearedSeason: number;
  /** Dernier snapshot connu */
  lastSnapshot: RivalSnapshot | null;
  /** Retraité ? */
  retired: boolean;
}

// ─── Sélection initiale des rivaux ───────────────────────────────────────────

/**
 * Sélectionne des rivaux depuis la liste des world players au démarrage.
 * On prend 5 joueurs : 2 du même poste, 1 de la même ligue, 2 "nemesis" plus forts.
 */
export function pickInitialRivals(
  worldPlayers: WorldPlayer[],
  playerPosition: string,
  playerLeagueId: string,
  playerOverall: number,
  season: number,
): PlayerRival[] {
  const samePos  = worldPlayers.filter(p => p.position === playerPosition && !p.injury);
  const sameLg   = worldPlayers.filter(p => p.leagueId === playerLeagueId && p.position !== playerPosition);
  const stronger = worldPlayers.filter(p => p.overall > playerOverall + 5 && p.position === playerPosition);

  const shuffle = <T>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);

  const picks: Array<{ player: WorldPlayer; relation: RivalRelation }> = [
    ...shuffle(samePos).slice(0, 2).map(p => ({ player: p, relation: "rivalry" as RivalRelation })),
    ...shuffle(sameLg).slice(0, 1).map(p => ({ player: p, relation: "benchmark" as RivalRelation })),
    ...shuffle(stronger).slice(0, 2).map(p => ({ player: p, relation: "nemesis" as RivalRelation })),
  ].slice(0, 5);

  return picks.map(({ player, relation }) => buildRival(player, relation, season));
}

function buildRival(wp: WorldPlayer, relation: RivalRelation, season: number): PlayerRival {
  const snapshot: RivalSnapshot = {
    season,
    overall: wp.overall,
    goals: wp.seasonStats.find(s => s.season === season)?.goals ?? 0,
    assists: wp.seasonStats.find(s => s.season === season)?.assists ?? 0,
    appearances: wp.seasonStats.find(s => s.season === season)?.appearances ?? 0,
    avgRating: wp.seasonStats.find(s => s.season === season)?.avgRating ?? 7.0,
  };
  return {
    worldPlayerId: wp.id,
    name: `${wp.firstName} ${wp.lastName}`,
    clubId: wp.clubId,
    position: wp.position,
    relation,
    intensityScore: relation === "nemesis" ? 60 : relation === "rivalry" ? 45 : 30,
    history: [snapshot],
    appearedSeason: season,
    lastSnapshot: snapshot,
    retired: false,
  };
}

// ─── Mise à jour saisonnière des rivaux ───────────────────────────────────────

/**
 * À appeler en fin de saison pour :
 * - Prendre un snapshot de chaque rival
 * - Retirer les retraités (vétérans > 38 ans)
 * - Ajouter un nouveau rival éventuellement
 */
export function updateRivalsEndOfSeason(
  rivals: PlayerRival[],
  worldPlayers: WorldPlayer[],
  playerOverall: number,
  playerLeagueId: string,
  playerPosition: string,
  season: number,
): PlayerRival[] {
  const wpMap = new Map(worldPlayers.map(p => [p.id, p]));

  const updated: PlayerRival[] = rivals.map(rival => {
    const wp = wpMap.get(rival.worldPlayerId);
    if (!wp) return { ...rival, retired: true };

    // Retraite si vétéran et > 38
    if (wp.age >= 38 && wp.personality === "veteran") {
      return { ...rival, retired: true };
    }

    const snapshot: RivalSnapshot = {
      season,
      overall: wp.overall,
      goals: wp.seasonStats.find(s => s.season === season)?.goals ?? 0,
      assists: wp.seasonStats.find(s => s.season === season)?.assists ?? 0,
      appearances: wp.seasonStats.find(s => s.season === season)?.appearances ?? 0,
      avgRating: wp.seasonStats.find(s => s.season === season)?.avgRating ?? 7.0,
    };

    // Intensité monte si le rival performe mieux que le joueur
    const intensityDelta = snapshot.avgRating > 7.0 && snapshot.overall > playerOverall ? 5 : -2;
    const newIntensity = Math.max(10, Math.min(100, rival.intensityScore + intensityDelta));

    return {
      ...rival,
      history: [...rival.history, snapshot],
      lastSnapshot: snapshot,
      intensityScore: newIntensity,
    };
  });

  // Éventuellement ajouter un nouveau rival (si < 5 actifs)
  const active = updated.filter(r => !r.retired);
  if (active.length < 4) {
    const existing = new Set(updated.map(r => r.worldPlayerId));
    const candidates = worldPlayers.filter(
      p => !existing.has(p.id) && p.position === playerPosition && p.overall >= playerOverall - 10,
    );
    if (candidates.length > 0) {
      const pick = candidates[Math.floor(Math.random() * Math.min(5, candidates.length))];
      updated.push(buildRival(pick, "rivalry", season));
    }
  }

  return updated;
}

// ─── Comparer rival vs joueur ──────────────────────────────────────────────────

export interface RivalComparison {
  rivalName: string;
  relation: RivalRelation;
  playerOverall: number;
  rivalOverall: number;
  playerGoals: number;
  rivalGoals: number;
  playerRating: number;
  rivalRating: number;
  playerLeading: boolean;
}

export function compareWithRival(
  rival: PlayerRival,
  playerOverall: number,
  playerSeasonGoals: number,
  playerSeasonRating: number,
): RivalComparison {
  const snap = rival.lastSnapshot;
  return {
    rivalName: rival.name,
    relation: rival.relation,
    playerOverall,
    rivalOverall: snap?.overall ?? rival.history[0]?.overall ?? 70,
    playerGoals: playerSeasonGoals,
    rivalGoals: snap?.goals ?? 0,
    playerRating: playerSeasonRating,
    rivalRating: snap?.avgRating ?? 7.0,
    playerLeading: playerOverall > (snap?.overall ?? 70),
  };
}

// ─── Labels ────────────────────────────────────────────────────────────────────

export const RELATION_LABELS: Record<RivalRelation, string> = {
  rivalry:   "Rival direct",
  nemesis:   "Bête noire",
  benchmark: "Référence",
  companion: "Compagnon",
};

export const RELATION_COLORS: Record<RivalRelation, string> = {
  rivalry:   "var(--fc-coral)",
  nemesis:   "#b833ff",
  benchmark: "var(--fc-amber)",
  companion: "var(--fc-emerald)",
};
