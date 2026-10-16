/**
 * FC CAREER — Domaine : Sponsors & Missions
 * Évaluation des conditions de mission à partir des données réelles du jeu.
 * Chaque contrat sponsor a un missionLabel qui identifie sa condition.
 */

import type { SponsorContract } from "../persistence/saveSchema";
import type { Player } from "./player";
import type { Standing } from "./club";

export interface MissionEvalContext {
  /** Stats de saison du joueur (saison courante) */
  seasonGoals: number;
  seasonAssists: number;
  seasonAppearances: number;
  /** Note du dernier match */
  lastMatchRating: number;
  /** Matchs gagnés consécutivement (doit être tracé dans le contexte) */
  consecutiveWins: number;
  /** Forme du joueur (0-100) */
  playerForm: number;
  /** Semaines consécutives à forme > 70 */
  weeksHighForm: number;
  /** Notes > 7 cette saison */
  ratingsAbove7: number;
  /** Classement actuel du club du joueur dans sa ligue (1 = premier) */
  clubLeaguePosition: number | null;
}

/**
 * Évalue si la mission d'un contrat sponsor est accomplie.
 * Renvoie true si la condition est remplie.
 * Appelé après chaque match et à chaque fin de semaine.
 */
export function evaluateSponsorMission(
  contract: SponsorContract,
  ctx: MissionEvalContext,
): boolean {
  const label = contract.missionLabel.toLowerCase();

  // "Marquer 3 buts en championnat"
  if (label.includes("marquer") && label.includes("3 buts")) {
    return ctx.seasonGoals >= 3;
  }
  // "Marquer N buts"
  const marquerMatch = label.match(/marquer (\d+) buts?/);
  if (marquerMatch) {
    return ctx.seasonGoals >= parseInt(marquerMatch[1]);
  }

  // "Maintenir la forme > 70 pendant 4 semaines"
  if (label.includes("forme") && label.includes("70")) {
    return ctx.weeksHighForm >= 4;
  }

  // "Décrocher une note > 7 trois fois"
  if (label.includes("note") && label.includes("7") && label.includes("trois")) {
    return ctx.ratingsAbove7 >= 3;
  }
  // "Décrocher une note > N K fois"
  const noteMatch = label.match(/note.*?(\d+(?:\.\d+)?).{1,10}?(\d+) fois/);
  if (noteMatch) {
    return ctx.ratingsAbove7 >= parseInt(noteMatch[2]);
  }

  // "Gagner 2 matchs consécutifs"
  if (label.includes("gagner") && label.includes("consécutifs")) {
    const nMatch = label.match(/gagner (\d+) matchs?/);
    const n = nMatch ? parseInt(nMatch[1]) : 2;
    return ctx.consecutiveWins >= n;
  }

  // "Finir dans le top 5 du classement"
  if (label.includes("top") && label.includes("classement")) {
    const topMatch = label.match(/top (\d+)/);
    const top = topMatch ? parseInt(topMatch[1]) : 5;
    return ctx.clubLeaguePosition !== null && ctx.clubLeaguePosition <= top;
  }

  // Condition non reconnue : mission considérée non accomplie par défaut
  return false;
}

/**
 * Recalcule missionDone pour tous les sponsors actifs d'après le contexte.
 * Utilisé dans le reducer après APPLY_MATCH_RESULT et COMMIT_WEEK.
 */
export function updateSponsorMissions(
  sponsors: SponsorContract[],
  ctx: MissionEvalContext,
): SponsorContract[] {
  return sponsors.map(s => {
    // Ne jamais réinitialiser une mission déjà accomplie
    if (s.missionDone) return s;
    const done = evaluateSponsorMission(s, ctx);
    return done ? { ...s, missionDone: true } : s;
  });
}

/**
 * Construit le contexte d'évaluation depuis les données du save.
 */
export function buildMissionContext(
  player: Player,
  season: number,
  standings: Record<string, { clubId: string }[]>,
  lastMatchResults: import("./match").MatchResult[],
): MissionEvalContext {
  const seasonStats = player.stats.seasons.find(s => s.season === season);
  const lastMatch = lastMatchResults[0] ?? null;
  const lastMatchRating = lastMatch?.playerRating ?? 0;

  // Calculer notes > 7 depuis les lastMatchResults (saison courante)
  const currentSeasonResults = lastMatchResults.filter(r => r.season === season);
  const ratingsAbove7 = currentSeasonResults.filter(r => r.playerRating > 7).length;

  // Victoires consécutives
  let consecutiveWins = 0;
  for (const r of currentSeasonResults) {
    const won = r.isHome ? r.scoreHome > r.scoreAway : r.scoreAway > r.scoreHome;
    if (won) consecutiveWins++;
    else break;
  }

  // Position du club dans sa ligue (index dans le tableau standings, trié par points décroissants)
  const playerClubId = player.contract.clubId;
  let clubLeaguePosition: number | null = null;
  for (const rows of Object.values(standings)) {
    const idx = rows.findIndex(r => r.clubId === playerClubId);
    if (idx >= 0) {
      clubLeaguePosition = idx + 1;
      break;
    }
  }

  return {
    seasonGoals: seasonStats?.goals ?? 0,
    seasonAssists: seasonStats?.assists ?? 0,
    seasonAppearances: seasonStats?.appearances ?? 0,
    lastMatchRating,
    consecutiveWins,
    playerForm: player.condition.form,
    weeksHighForm: player.condition.form > 70 ? 1 : 0, // approximation simple
    ratingsAbove7,
    clubLeaguePosition,
  };
}
