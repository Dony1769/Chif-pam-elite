/**
 * FC CAREER — Domaine : Récompenses de fin de saison
 * Calcule les trophées et distinctions gagnés par le joueur humain
 * à partir des vraies stats de la saison (de player.stats.seasons).
 */

import type { Player } from "./player";
import type { Award } from "../persistence/saveSchema";
import type { Standing } from "./club";

export interface AwardsInput {
  player: Player;
  season: number;
  standings: Record<string, Standing>; // leagueId -> classement
  playerClubId: string;
  playerLeagueId: string;
}

/**
 * Calcule les récompenses du joueur pour la saison écoulée.
 * Retourne les nouvelles récompenses (pas les historiques).
 */
export function computeSeasonAwards(input: AwardsInput): Award[] {
  const { player, season, standings, playerClubId, playerLeagueId } = input;
  const stats = player.stats.seasons.find(s => s.season === season);
  if (!stats) return [];

  const awards: Award[] = [];
  const id = (suffix: string) => `award-s${season}-${suffix}`;

  const { goals, assists, appearances, avgRating } = stats;

  /* ── Récompenses de performance individuelle ─────────────────── */

  // Meilleur buteur de l'équipe (10+ buts)
  if (goals >= 10) {
    awards.push({ id: id("top-scorer"), season, label: "Meilleur buteur", icon: "⚽" });
  } else if (goals >= 5) {
    awards.push({ id: id("scorer"), season, label: "Bon buteur (5+ buts)", icon: "⚽" });
  }

  // Passeur (8+ passes)
  if (assists >= 8) {
    awards.push({ id: id("top-assist"), season, label: "Meilleur passeur", icon: "🎯" });
  } else if (assists >= 4) {
    awards.push({ id: id("assist"), season, label: "Passeur décisif (4+ passes)", icon: "🎯" });
  }

  // Présence sur le terrain
  if (appearances >= 30) {
    awards.push({ id: id("iron-man"), season, label: "Homme de fer (30+ matchs)", icon: "🛡️" });
  } else if (appearances >= 20) {
    awards.push({ id: id("regular"), season, label: "Titulaire régulier (20+ matchs)", icon: "👟" });
  }

  // Note moyenne
  if (appearances >= 10 && avgRating >= 8.0) {
    awards.push({ id: id("player-of-year"), season, label: "Joueur de l'année", icon: "🏅" });
  } else if (appearances >= 10 && avgRating >= 7.5) {
    awards.push({ id: id("team-player"), season, label: "Joueur de l'équipe (7.5+)", icon: "⭐" });
  }

  // Double chiffre contributions
  if (goals >= 10 && assists >= 10) {
    awards.push({ id: id("double-digit"), season, label: "Double numéro (10G/10A)", icon: "💎" });
  }

  // Hat-trick dans la saison (approximation : 3+ buts par apparition moyenne)
  // On ne peut pas détecter les hat-tricks sans logs match par match, donc on skip

  /* ── Récompenses collectives ─────────────────────────────────── */

  const leagueStanding = standings[playerLeagueId];
  if (leagueStanding) {
    const clubIdx = leagueStanding.findIndex(r => r.clubId === playerClubId);
    if (clubIdx >= 0) {
      const pos = clubIdx + 1;

      if (pos === 1) {
        awards.push({ id: id("champion"), season, label: "Champion !", icon: "🏆" });
      } else if (pos <= 3) {
        awards.push({ id: id("podium"), season, label: `Podium — ${pos}e place`, icon: "🥈" });
      } else if (pos <= 6) {
        awards.push({ id: id("top6"), season, label: `Top 6 — ${pos}e place`, icon: "📈" });
      }
    }
  }

  return awards;
}

/**
 * Fusionne les nouvelles récompenses avec les historiques,
 * en évitant les doublons par id.
 */
export function mergeAwards(existing: Award[], newAwards: Award[]): Award[] {
  const existingIds = new Set(existing.map(a => a.id));
  const toAdd = newAwards.filter(a => !existingIds.has(a.id));
  return [...existing, ...toAdd];
}
