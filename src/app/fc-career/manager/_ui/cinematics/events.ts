/**
 * FC CAREER 27 — Événements du monde à mettre en scène (pur, sans React).
 * Chaque événement a un identifiant stable : l'interface retient ceux déjà vus.
 */

import type { WorldLiveState } from "../../../game/domain/worldState";
import { isNation, teamName } from "../../../game/domain/competitions";
import { fullName } from "../../../game/utils/names";

export type Trophy = "ballon" | "boot" | "glove" | "star" | "cup" | "shield" | "globe";

export interface Nominee { id: string; name: string; club: string; clubId: string; points?: number; isMe?: boolean }
export type Cinematic =
  | { kind: "ceremony"; id: string; title: string; subtitle: string; trophy: Trophy; nominees: Nominee[]; winner: Nominee }
  | { kind: "draw"; id: string; title: string; subtitle: string; groups: { name: string; teams: { id: string; name: string; isMe: boolean }[] }[] }
  | { kind: "final"; id: string; title: string; subtitle: string; trophy: Trophy; winner: { id: string; name: string; isMe: boolean }; runnerUp: string; score?: string };

export interface Me { clubId?: string; playerId?: string; nation?: string }

const yearLabel = (w: WorldLiveState, season: number) => {
  const y = (w.startYear ?? 2026) + season - 1;
  return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
};

/** Tous les événements actuellement présents dans le monde (du plus ancien au plus récent). */
export function allCinematics(w: WorldLiveState, me: Me): Cinematic[] {
  if (w.dataset !== "cp") return [];
  const out: Cinematic[] = [];
  const pl = new Map(w.players.map(p => [p.id, p]));
  const clubName = (id: string) => teamName(w, id);
  const nominee = (playerId: string, clubId: string, points?: number): Nominee => {
    const p = pl.get(playerId);
    return { id: playerId, name: p ? fullName(p) : "Joueur", club: clubName(clubId), clubId, points, isMe: playerId === me.playerId || (!me.playerId && clubId === me.clubId) };
  };

  // Tirages des coupes d'Europe et des tournois de sélections
  for (const c of w.competitions ?? []) {
    if (c.groups && (c.kind === "continental" || c.kind === "national")) {
      out.push({
        kind: "draw", id: `draw-${c.id}-s${c.season}`, title: `Tirage · ${c.name}`,
        subtitle: c.kind === "national" ? "Phase de groupes" : `Saison ${yearLabel(w, c.season)} · phase de groupes`,
        groups: c.groups.map(g => ({ name: g.name, teams: g.teams.map(t => ({ id: t, name: teamName(w, t), isMe: t === me.clubId || t === me.nation })) })),
      });
      if (c.rounds[0]) {
        // Tableau final : les huit (ou seize) qualifiés
        const r = c.rounds[0];
        out.push({
          kind: "draw", id: `draw-${c.id}-s${c.season}-ko`, title: `${r.name} · ${c.name}`, subtitle: "Les affiches",
          groups: r.ties.map((t, i) => ({ name: `Match ${i + 1}`, teams: [t.home, t.away].map(x => ({ id: x, name: teamName(w, x), isMe: x === me.clubId || x === me.nation })) })),
        });
      }
    }
  }
  // Finales et vainqueurs
  for (const t of w.trophies ?? []) {
    const comp = (w.competitions ?? []).find(c => c.id === t.compId && c.season === t.season);
    const final = comp?.rounds[comp.rounds.length - 1]?.ties[0];
    const score = final && final.hs !== undefined ? `${final.hs} - ${final.as}${final.pens ? ` (t.a.b. ${final.pens[0]}-${final.pens[1]})` : ""}` : undefined;
    out.push({
      kind: "final", id: `final-${t.compId}-s${t.season}`, title: t.name,
      subtitle: t.kind === "national" ? `Finale ${t.year}` : `Finale ${yearLabel(w, t.season)}`,
      trophy: t.compId === "ucl" ? "star" : t.compId === "uel" ? "shield" : t.kind === "national" ? "globe" : "cup",
      winner: { id: t.winner, name: teamName(w, t.winner), isMe: t.winner === me.clubId || t.winner === me.nation },
      runnerUp: t.runnerUp ? teamName(w, t.runnerUp) : "", score,
    });
  }
  // Cérémonies individuelles et titres de champion
  for (const a of w.awards ?? []) {
    if (a.id === "ballon_dor" || a.id === "golden_boy" || a.id === "yachine" || a.id === "kopa") {
      if (!a.playerId) continue;
      const ranking = (a.ranking ?? []).slice(0, a.id === "ballon_dor" ? 10 : 5).map(r => nominee(r.playerId, r.clubId, r.points));
      out.push({
        kind: "ceremony", id: `aw-${a.id}-s${a.season}`, title: a.label.replace(/ \d+$/, ""),
        subtitle: a.id === "golden_boy" ? `Meilleur jeune · ${yearLabel(w, a.season)}` : `Saison ${yearLabel(w, a.season)}`,
        trophy: a.id === "yachine" ? "glove" : "ballon",
        nominees: ranking.length ? ranking : [nominee(a.playerId, a.clubId ?? "")], winner: nominee(a.playerId, a.clubId ?? ""),
      });
    }
    if (a.id === "golden_shoe" && a.playerId) {
      out.push({ kind: "ceremony", id: `aw-shoe-s${a.season}`, title: "Soulier d'Or CP", subtitle: `Saison ${yearLabel(w, a.season)}`, trophy: "boot", nominees: [], winner: nominee(a.playerId, a.clubId ?? "") });
    }
    if (a.id === "league_title" && a.clubId && (a.clubId === me.clubId || w.leagues.find(l => l.id === a.leagueId)?.tier === 1)) {
      const league = w.leagues.find(l => l.id === a.leagueId);
      out.push({
        kind: "final", id: `title-${a.leagueId}-s${a.season}`, title: league?.name ?? "Championnat", subtitle: `Champion ${yearLabel(w, a.season)}`,
        trophy: "shield", winner: { id: a.clubId, name: clubName(a.clubId), isMe: a.clubId === me.clubId }, runnerUp: "",
      });
    }
  }
  return out;
}

/** N'affiche que ce qui concerne la ligue du joueur, les coupes d'Europe, les sélections et les grandes cérémonies. */
export function relevant(c: Cinematic, w: WorldLiveState, me: Me): boolean {
  if (c.kind !== "final" || !c.id.startsWith("title-")) return true;
  const myLeague = me.clubId ? w.clubs.find(x => x.id === me.clubId)?.leagueId : undefined;
  return c.winner.isMe || c.id.startsWith(`title-${myLeague}-`);
}

export const isNationId = isNation;
