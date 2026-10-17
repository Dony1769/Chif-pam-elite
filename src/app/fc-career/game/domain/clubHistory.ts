/**
 * FC CAREER 27 — Histoire d'un club : palmarès, meilleurs buteurs, passeurs et
 * joueurs les plus capés depuis le début du monde, meilleur entraîneur.
 */

import type { WorldLiveState } from "./worldState";

export interface HonourLine { key: string; name: string; seasons: number[] }
export interface Leader { playerId: string; value: number }

export interface ClubHistory {
  honours: HonourLine[];
  total: number;
  scorers: Leader[];
  assisters: Leader[];
  apps: Leader[];
  bestCoach: { coachId: string; titles: number } | null;
}

export function clubHistory(w: WorldLiveState, clubId: string): ClubHistory {
  const honours = new Map<string, HonourLine>();
  const coachTitles = new Map<string, number>();
  const addHonour = (key: string, name: string, season: number, coachId?: string) => {
    const h = honours.get(key) ?? { key, name, seasons: [] };
    if (!h.seasons.includes(season)) h.seasons.push(season);
    honours.set(key, h);
    if (coachId) coachTitles.set(coachId, (coachTitles.get(coachId) ?? 0) + 1);
  };
  const titles = [...(w.leagueTitles ?? [])];
  // Anciennes parties : titres encore présents dans les récompenses
  for (const a of w.awards ?? []) {
    if (a.id === "league_title" && a.clubId && a.leagueId && !titles.some(t => t.leagueId === a.leagueId && t.season === a.season)) {
      titles.push({ leagueId: a.leagueId, season: a.season, clubId: a.clubId, coachId: a.coachId });
    }
  }
  for (const t of titles) if (t.clubId === clubId) addHonour(`league-${t.leagueId}`, w.leagues.find(l => l.id === t.leagueId)?.name ?? "Championnat", t.season, t.coachId);
  for (const t of w.trophies ?? []) if (t.winner === clubId) addHonour(t.compId, t.name.replace(/ \d{4}$/, ""), t.season, t.coachId);

  const sum = (kind: "goals" | "assists" | "apps"): Leader[] => {
    const m = new Map<string, number>(Object.entries(w.clubRecords?.[clubId]?.[kind] ?? {}));
    for (const st of w.playerStats) {
      if (st.clubId !== clubId) continue;
      const v = kind === "goals" ? st.goals : kind === "assists" ? st.assists : st.appearances;
      if (v) m.set(st.playerId, (m.get(st.playerId) ?? 0) + v);
    }
    return [...m].map(([playerId, value]) => ({ playerId, value })).filter(x => x.value > 0).sort((a, b) => b.value - a.value).slice(0, 3);
  };

  const best = [...coachTitles].sort((a, b) => b[1] - a[1])[0];
  const list = [...honours.values()].map(h => ({ ...h, seasons: h.seasons.sort((a, b) => a - b) })).sort((a, b) => b.seasons.length - a.seasons.length);
  return {
    honours: list, total: list.reduce((t, h) => t + h.seasons.length, 0),
    scorers: sum("goals"), assisters: sum("assists"), apps: sum("apps"),
    bestCoach: best ? { coachId: best[0], titles: best[1] } : null,
  };
}
