/**
 * FC CAREER 27 — Carrière Joueur v2 : vitrine des trophées.
 * Regroupe les récompenses du joueur par trophée (Ballon d'Or, Soulier d'Or,
 * meilleur buteur, titres, coupes…) avec, pour chaque fois, la saison, le club
 * et les statistiques de la saison.
 */

import type { Award, PlayerCareerState } from "./types";

/** Taille d'une case de vitrine (unités de la scène 3D). */
export const CELL_W = 2.4;
export const CELL_H = 3.3;

export type TrophyModel = "ballon" | "boot" | "glove" | "star" | "cup" | "shield" | "globe" | "medal" | "plate";
export type Finish = "gold" | "silver";

export interface ShelfEntry { season: number; clubId?: string; label: string; apps: number; goals: number; assists: number; value?: number }
export interface Shelf { key: string; name: string; model: TrophyModel; finish: Finish; entries: ShelfEntry[]; /** Montré même à 0 */ core: boolean }

interface Def { key: string; name: string; model: TrophyModel; finish: Finish; core: boolean; match: (a: Award) => boolean }

const DEFS: Def[] = [
  { key: "ballon_dor", name: "Ballon d'Or", model: "ballon", finish: "gold", core: true, match: a => a.id === "ballon_dor" || a.id === "golden_star" },
  { key: "kopa", name: "Trophée Kopa", model: "ballon", finish: "silver", core: true, match: a => a.id === "kopa" },
  { key: "golden_boy", name: "Golden Boy", model: "star", finish: "gold", core: true, match: a => a.id === "golden_boy" },
  { key: "yachine", name: "Trophée Yachine", model: "glove", finish: "gold", core: false, match: a => a.id === "yachine" },
  { key: "golden_shoe", name: "Soulier d'Or", model: "boot", finish: "gold", core: true, match: a => a.id === "golden_shoe" },
  { key: "top_scorer", name: "Meilleur buteur", model: "boot", finish: "silver", core: true, match: a => a.id === "league_top_scorer" || a.id === "top_scorer" },
  { key: "top_assist", name: "Meilleur passeur", model: "plate", finish: "silver", core: true, match: a => a.id === "league_top_assist" || a.id === "assist_king" },
  { key: "pots", name: "Joueur de la saison", model: "plate", finish: "gold", core: true, match: a => a.id === "league_pots" || a.id === "revelation" },
  { key: "tots", name: "Équipe type", model: "medal", finish: "gold", core: true, match: a => a.id === "tots" },
  { key: "potm", name: "Joueur du mois", model: "medal", finish: "silver", core: true, match: a => a.id === "potm" },
  { key: "league", name: "Championnat", model: "shield", finish: "gold", core: true, match: a => a.id === "league_title" || a.id === "promotion" },
  { key: "cup", name: "Coupe nationale", model: "cup", finish: "silver", core: true, match: a => a.id === "cup_win" && !!a.compId?.startsWith("cup-") },
  { key: "ucl", name: "Ligue des champions", model: "star", finish: "silver", core: true, match: a => a.id === "cup_win" && a.compId === "ucl" },
  { key: "uel", name: "Ligue Europa", model: "cup", finish: "gold", core: false, match: a => a.id === "cup_win" && a.compId === "uel" },
  { key: "euro", name: "Euro", model: "globe", finish: "silver", core: true, match: a => a.id === "cup_win" && a.compId === "euro" },
  { key: "wc", name: "Coupe du monde", model: "globe", finish: "gold", core: true, match: a => a.id === "cup_win" && a.compId === "wc" },
];

/** Club du joueur une saison donnée (celui où il a le plus joué). */
function clubAt(s: PlayerCareerState, season: number): string | undefined {
  return [...s.seasons.filter(l => l.season === season)].sort((a, b) => b.apps - a.apps)[0]?.clubId;
}

export function trophyCabinet(s: PlayerCareerState): Shelf[] {
  const awards = s.career?.awards ?? [];
  const isGk = s.profile.position === "GK";
  return DEFS.map(d => {
    const entries = awards.filter(d.match).map(a => {
      const lines = s.seasons.filter(l => l.season === a.season);
      return {
        season: a.season, clubId: a.clubId ?? clubAt(s, a.season), label: a.label, value: a.value,
        apps: lines.reduce((t, l) => t + l.apps, 0), goals: lines.reduce((t, l) => t + l.goals, 0), assists: lines.reduce((t, l) => t + l.assists, 0),
      };
    }).sort((a, b) => a.season - b.season);
    return { key: d.key, name: d.name, model: d.model, finish: d.finish, core: d.core || (d.key === "yachine" && isGk), entries };
  }).filter(sh => sh.core || sh.entries.length > 0);
}

export const totalTrophies = (shelves: Shelf[]) => shelves.reduce((t, sh) => t + sh.entries.length, 0);
