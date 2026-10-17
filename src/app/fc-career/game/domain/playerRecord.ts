/**
 * FC CAREER 27 — Fiche d'un joueur du monde : statistiques par saison et par
 * compétition, récompenses individuelles et trophées gagnés avec son club.
 * Pur, sans React : partagé par la Carrière Joueur, le Manager et les cérémonies.
 */

import type { WorldLiveState } from "./worldState";
import type { WorldAward } from "./worldAwards";
import type { TrophyRecord } from "./competitions";

export interface CompLine { compId: string; name: string; clubId: string; apps: number; goals: number; assists: number; avgRating: number }

export interface SeasonRecord {
  season: number;
  apps: number;
  goals: number;
  assists: number;
  /** Note moyenne pondérée par les matchs (0 si inconnue) */
  avgRating: number;
  lines: CompLine[];
  awards: WorldAward[];
  trophies: TrophyRecord[];
}

function compName(w: WorldLiveState, id: string): string {
  return w.leagues.find(l => l.id === id)?.name ?? (w.competitions ?? []).find(c => c.id === id)?.name ?? (w.trophies ?? []).find(t => t.compId === id)?.name ?? id;
}

/** Saison d'un joueur, toutes compétitions confondues. */
export function seasonRecord(w: WorldLiveState, playerId: string, season: number): SeasonRecord {
  const lines: CompLine[] = w.playerStats
    .filter(st => st.playerId === playerId && st.season === season)
    .map(st => ({ compId: st.leagueId, name: compName(w, st.leagueId), clubId: st.clubId, apps: st.appearances, goals: st.goals, assists: st.assists, avgRating: st.avgRating }));
  const apps = lines.reduce((a, l) => a + l.apps, 0);
  const rated = lines.filter(l => l.avgRating > 0);
  const ratedApps = rated.reduce((a, l) => a + l.apps, 0);
  const avgRating = ratedApps ? Math.round((rated.reduce((a, l) => a + l.avgRating * l.apps, 0) / ratedApps) * 100) / 100 : 0;
  const clubs = new Set(lines.filter(l => l.apps > 0).map(l => l.clubId));
  const awards = (w.awards ?? []).filter(a => a.season === season && (a.playerId === playerId || (a.id === "league_title" && a.clubId && clubs.has(a.clubId) && !a.playerId)));
  // Trophées collectifs : coupes gagnées par un club où il a joué cette saison
  const trophies = (w.trophies ?? []).filter(t => t.season === season && t.kind !== "national" && clubs.has(t.winner));
  return {
    season, apps, goals: lines.reduce((a, l) => a + l.goals, 0), assists: lines.reduce((a, l) => a + l.assists, 0),
    avgRating, lines: lines.sort((a, b) => b.apps - a.apps), awards, trophies,
  };
}

/** Saisons connues d'un joueur (le monde garde les 3 dernières), de la plus récente à la plus ancienne. */
export function playerRecord(w: WorldLiveState, playerId: string): SeasonRecord[] {
  const seasons = new Set(w.playerStats.filter(st => st.playerId === playerId).map(st => st.season));
  for (const a of w.awards ?? []) if (a.playerId === playerId) seasons.add(a.season);
  return [...seasons].sort((a, b) => b - a).map(season => seasonRecord(w, playerId, season));
}

/** Résumé court d'une saison : « 23 buts · 11 passes · 41 matchs · 2 trophées ». */
export function seasonSummary(r: SeasonRecord, gk = false): string {
  const parts = [`${r.apps} match${r.apps > 1 ? "s" : ""}`];
  if (!gk || r.goals) parts.unshift(`${r.goals} but${r.goals > 1 ? "s" : ""}`, `${r.assists} passe${r.assists > 1 ? "s" : ""}`);
  if (r.avgRating) parts.push(`note ${r.avgRating.toFixed(2).replace(".", ",")}`);
  const titles = r.trophies.length + r.awards.filter(a => a.id === "league_title").length;
  if (titles) parts.push(`${titles} trophée${titles > 1 ? "s" : ""}`);
  return parts.join(" · ");
}
