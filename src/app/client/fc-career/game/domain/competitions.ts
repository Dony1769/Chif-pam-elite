/**
 * FC CAREER 27 — Compétitions à élimination du monde CP.
 *
 * - Coupes nationales (CP FA Cup, CP Copa del Rey, CP Coppa Italia, CP DFB-Pokal,
 *   CP Coupe de France) : D1 + D2, tirage avec exemptions pour les mieux classés,
 *   matchs secs en semaine, tirs au but en cas d'égalité.
 * - CP Ligue des champions et CP Ligue Europa : 16 clubs chacune, 4 groupes de 4
 *   (aller-retour, septembre → décembre), puis quarts, demies et finale (mai).
 *   Qualification : classement final de la saison précédente (réputation la 1re saison).
 * - CP Euro (juin des années divisibles par 4) et CP Coupe du monde (juin des
 *   années paires suivantes) : sélections formées des meilleurs joueurs de chaque
 *   nationalité dans le monde CP.
 * Tout est simulé avec le moteur de match du monde ; les buts et passes comptent
 * dans les statistiques des joueurs (identifiant de la compétition).
 */

import type { WorldLiveState } from "./worldState";
import type { WorldPlayer } from "../data/worldPlayers";
import { simulateWorldMatch, type ClubSnapshot } from "./worldMatchEngine";
import { NATIONS, NATION_BY_ID } from "../data/cp/nations";
import { createRng, seedFromString } from "../utils/random";

export interface CupTie { id: string; home: string; away: string; hs?: number; as?: number; pens?: [number, number]; winner?: string }
export interface CupRound { name: string; week: number; ties: CupTie[]; done?: boolean }
export interface GroupRow { id: string; p: number; w: number; d: number; l: number; gf: number; ga: number; pts: number }
export interface CupGroup { name: string; teams: string[]; table: GroupRow[]; matchdays: CupTie[][] }

export type CompetitionKind = "cup" | "continental" | "national";
export interface Competition {
  id: string;
  name: string;
  kind: CompetitionKind;
  season: number;
  countryId?: string;
  /** Équipes encore à placer au tour suivant (exemptées ou qualifiées) */
  pending: string[];
  /** Semaine de chaque tour à élimination (le premier tour est tiré quand il arrive) */
  koWeeks: number[];
  groups?: CupGroup[];
  groupWeeks?: number[];
  rounds: CupRound[];
  winner?: string;
  runnerUp?: string;
}
export interface TrophyRecord { compId: string; name: string; kind: CompetitionKind; season: number; year: number; winner: string; runnerUp?: string }

const CUP_NAMES: Record<string, string> = {
  eng: "CP FA Cup", esp: "CP Copa del Rey", ita: "CP Coppa Italia", ger: "CP DFB-Pokal", fra: "CP Coupe de France",
};
/** Semaines des tours de coupe nationale (mardi/mercredi) */
const CUP_WEEKS = [8, 12, 19, 26, 33, 41, 45];
const EURO_GROUP_WEEKS = [11, 13, 16, 18, 21, 23];
const EURO_KO_WEEKS = [34, 39, 46];
const UCL_QUOTA: Record<string, number> = { eng: 4, esp: 4, ita: 3, ger: 3, fra: 2 };
const UEL_QUOTA: Record<string, number> = { eng: 3, esp: 3, ita: 4, ger: 3, fra: 3 };
const WC_QUOTA: Record<string, number> = { UEFA: 13, CONMEBOL: 6, CAF: 6, AFC: 4, CONCACAF: 3 };

export const isNation = (id: string) => id.length === 3 && id === id.toUpperCase();
export function teamName(w: WorldLiveState, id: string): string {
  if (isNation(id)) { const n = NATION_BY_ID[id]; return n ? `${n.flag} ${n.name}` : id; }
  return w.clubs.find(c => c.id === id)?.name.replace(/^CP /, "") ?? id;
}

function roundName(teams: number): string {
  if (teams <= 2) return "Finale";
  if (teams <= 4) return "Demi-finales";
  if (teams <= 8) return "Quarts de finale";
  if (teams <= 16) return "Huitièmes de finale";
  return `${teams / 2}es de finale`;
}

/** Classement d'un championnat (points, différence, buts). */
function ranked(w: WorldLiveState, leagueId: string): string[] {
  const rows = w.standings[leagueId] ?? [];
  const sorted = [...rows].sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) || b.goalsFor - a.goalsFor);
  const played = rows.some(r => r.played > 0);
  if (played) return sorted.map(r => r.clubId);
  return w.clubs.filter(c => c.leagueId === leagueId).sort((a, b) => (w.clubReputations[b.id] ?? b.reputation) - (w.clubReputations[a.id] ?? a.reputation)).map(c => c.id);
}

/** Clubs qualifiés pour les deux coupes d'Europe d'après le classement des D1. */
export function continentalEntrants(w: WorldLiveState): { ucl: string[]; uel: string[] } {
  const ucl: string[] = [], uel: string[] = [];
  for (const [country, n] of Object.entries(UCL_QUOTA)) {
    const order = ranked(w, `${country}-1`);
    ucl.push(...order.slice(0, n));
    uel.push(...order.slice(n, n + (UEL_QUOTA[country] ?? 0)));
  }
  return { ucl, uel };
}

// ─── Équipes ─────────────────────────────────────────────────────────────────

function nationSquad(w: WorldLiveState, nat: string): WorldPlayer[] {
  const pool = w.players.filter(p => p.nationality === nat && p.clubId !== "retired" && p.clubId !== "free");
  const gks = pool.filter(p => p.position === "GK").sort((a, b) => b.overall - a.overall).slice(0, 3);
  const out = pool.filter(p => p.position !== "GK").sort((a, b) => b.overall - a.overall).slice(0, 20);
  return [...gks, ...out];
}

function snapshot(w: WorldLiveState, id: string, nationCache: Map<string, WorldPlayer[]>): ClubSnapshot {
  if (isNation(id)) {
    if (!nationCache.has(id)) nationCache.set(id, nationSquad(w, id));
    return { clubId: id, players: nationCache.get(id)!, coach: null, reputation: 70 };
  }
  return {
    clubId: id,
    players: w.players.filter(p => p.clubId === id),
    coach: w.coaches.find(c => c.clubId === id && c.teamLevel === "first_team" && c.status === "active") ?? null,
    reputation: w.clubReputations[id] ?? 50,
  };
}

const strengthOf = (w: WorldLiveState, id: string, cache: Map<string, WorldPlayer[]>) => {
  const s = snapshot(w, id, cache);
  const top = [...s.players].sort((a, b) => b.overall - a.overall).slice(0, 11);
  return top.length ? top.reduce((t, p) => t + p.overall, 0) / top.length : s.reputation * 0.75;
};

// ─── Création ────────────────────────────────────────────────────────────────

function pairs(teams: string[], prefix: string): CupTie[] {
  const ties: CupTie[] = [];
  for (let i = 0; i + 1 < teams.length; i += 2) ties.push({ id: `${prefix}-${i / 2}`, home: teams[i], away: teams[i + 1] });
  return ties;
}

function shuffle<T>(arr: T[], seed: string): T[] {
  const rng = createRng(seedFromString(seed));
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = rng.int(0, i); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** Groupes de 4 avec chapeaux (les têtes de série sont dans des groupes différents). */
function makeGroups(teams: string[], seed: string, letters = "ABCDEFGH", doubleLegs = true): CupGroup[] {
  const nGroups = teams.length / 4;
  const pots = [0, 1, 2, 3].map(k => shuffle(teams.slice(k * nGroups, (k + 1) * nGroups), `${seed}-pot${k}`));
  const groups: CupGroup[] = [];
  for (let g = 0; g < nGroups; g++) {
    const t = pots.map(p => p[g]);
    const base: [number, number][][] = [[[0, 1], [2, 3]], [[2, 0], [3, 1]], [[0, 3], [1, 2]]];
    const legs = doubleLegs ? [...base, ...base.map(md => md.map(([a, b]) => [b, a] as [number, number]))] : base;
    groups.push({
      name: `Groupe ${letters[g]}`, teams: t,
      table: t.map(id => ({ id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 })),
      matchdays: legs.map((md, k) => md.map(([a, b], j) => ({ id: `${seed}-g${g}-m${k}-${j}`, home: t[a], away: t[b] }))),
    });
  }
  return groups;
}

function domesticCup(w: WorldLiveState, countryId: string): Competition {
  const clubs = w.clubs.filter(c => c.countryId === countryId);
  const order = [...clubs].sort((a, b) => a.tier - b.tier || (w.clubReputations[b.id] ?? b.reputation) - (w.clubReputations[a.id] ?? a.reputation)).map(c => c.id);
  let size = 1;
  while (size < order.length) size *= 2;
  const playIn = 2 * (order.length - size / 2); // clubs du premier tour, les autres sont exemptés
  const byes = order.slice(0, order.length - playIn);
  const first = shuffle(order.slice(order.length - playIn), `${w.seed}-cup-${countryId}-${w.season}`);
  const rounds = Math.log2(size);
  const weeks = CUP_WEEKS.slice(CUP_WEEKS.length - rounds);
  const id = `cup-${countryId}`;
  return {
    id, name: CUP_NAMES[countryId] ?? `CP Coupe ${countryId}`, kind: "cup", season: w.season, countryId,
    pending: byes, koWeeks: weeks,
    rounds: [{ name: roundName(size), week: weeks[0], ties: pairs(first, `${id}-s${w.season}-r0`) }],
  };
}

function continental(w: WorldLiveState, id: "ucl" | "uel", teams: string[]): Competition {
  const seeded = [...teams].sort((a, b) => (w.clubReputations[b] ?? 50) - (w.clubReputations[a] ?? 50));
  return {
    id, name: id === "ucl" ? "CP Ligue des champions" : "CP Ligue Europa", kind: "continental", season: w.season,
    pending: [], koWeeks: EURO_KO_WEEKS, groupWeeks: EURO_GROUP_WEEKS,
    groups: makeGroups(seeded, `${w.seed}-${id}-s${w.season}`), rounds: [],
  };
}

function nationalTournament(w: WorldLiveState, kind: "euro" | "wc", year: number): Competition | null {
  const cache = new Map<string, WorldPlayer[]>();
  const eligible = NATIONS.filter(n => nationSquad(w, n.id).length >= 14);
  const strength = (id: string) => strengthOf(w, id, cache);
  let teams: string[];
  if (kind === "euro") {
    teams = eligible.filter(n => n.conf === "UEFA").map(n => n.id).sort((a, b) => strength(b) - strength(a)).slice(0, 16);
    if (teams.length < 16) return null;
  } else {
    teams = [];
    for (const [conf, n] of Object.entries(WC_QUOTA)) teams.push(...eligible.filter(e => e.conf === conf).map(e => e.id).sort((a, b) => strength(b) - strength(a)).slice(0, n));
    const rest = eligible.map(e => e.id).filter(id => !teams.includes(id)).sort((a, b) => strength(b) - strength(a));
    while (teams.length < 32 && rest.length) teams.push(rest.shift()!);
    if (teams.length < 32) return null;
    teams.sort((a, b) => strength(b) - strength(a));
  }
  const id = kind;
  return {
    id, name: kind === "euro" ? `CP Euro ${year}` : `CP Coupe du monde ${year}`, kind: "national", season: w.season,
    pending: [], koWeeks: kind === "euro" ? [51, 51, 52] : [50, 51, 52, 52],
    groupWeeks: [49, 49, 50], groups: makeGroups(teams, `${w.seed}-${id}-${year}`, "ABCDEFGH", false), rounds: [],
  };
}

/** Année civile de juin pour la saison courante (saison 2026-27 → juin 2027). */
const juneYear = (w: WorldLiveState) => (w.startYear ?? 2026) + w.season;

function ensureCompetitions(w: WorldLiveState, week: number): WorldLiveState {
  const comps = w.competitions ?? [];
  let next = comps.filter(c => c.season === w.season);
  let changed = next.length !== comps.length;
  if (!next.some(c => c.kind !== "national") && week <= CUP_WEEKS[0]) {
    const countries = [...new Set(w.clubs.map(c => c.countryId))].filter(c => CUP_NAMES[c]);
    next = [...next, ...countries.map(c => domesticCup(w, c))];
    const q = w.continentalNext?.forSeason === w.season ? w.continentalNext : continentalEntrants(w);
    if (q.ucl.length === 16 && q.uel.length === 16) next.push(continental(w, "ucl", q.ucl), continental(w, "uel", q.uel));
    changed = true;
  }
  const y = juneYear(w);
  const nk: "euro" | "wc" | null = y % 4 === 0 ? "euro" : y % 4 === 2 ? "wc" : null;
  if (nk && week >= 48 && week <= 49 && !next.some(c => c.id === nk)) {
    const t = nationalTournament(w, nk, y);
    if (t) { next.push(t); changed = true; }
  }
  return changed ? { ...w, competitions: next } : w;
}

// ─── Simulation ──────────────────────────────────────────────────────────────

interface Ctx { w: WorldLiveState; cache: Map<string, WorldPlayer[]>; stats: { playerId: string; clubId: string; leagueId: string; goals: number; assists: number }[] }

function play(ctx: Ctx, comp: Competition, tie: CupTie, knockout: boolean): CupTie {
  const out = simulateWorldMatch({
    fixture: { id: `${comp.id}-${comp.season}-${tie.id}`, season: comp.season, matchday: 1, homeClubId: tie.home, awayClubId: tie.away, competitionId: comp.id, result: null },
    home: snapshot(ctx.w, tie.home, ctx.cache), away: snapshot(ctx.w, tie.away, ctx.cache), season: comp.season,
  });
  ctx.stats.push(...out.updatedPlayerStats);
  const hs = out.result.scoreHome, as = out.result.scoreAway;
  if (!knockout) return { ...tie, hs, as };
  if (hs !== as) return { ...tie, hs, as, winner: hs > as ? tie.home : tie.away };
  // Tirs au but : légère prime à l'équipe la plus forte
  const rng = createRng(seedFromString(`pens-${comp.id}-${comp.season}-${tie.id}`));
  const edge = (strengthOf(ctx.w, tie.home, ctx.cache) - strengthOf(ctx.w, tie.away, ctx.cache)) * 0.01;
  const homeWins = rng.chance(Math.min(0.75, Math.max(0.25, 0.5 + edge)));
  const loserPens = rng.int(2, 4);
  const pens: [number, number] = homeWins ? [loserPens + 1, loserPens] : [loserPens, loserPens + 1];
  return { ...tie, hs, as, pens, winner: homeWins ? tie.home : tie.away };
}

function applyGroup(g: CupGroup, t: CupTie): CupGroup {
  const table = g.table.map(r => {
    if (r.id !== t.home && r.id !== t.away) return r;
    const gf = r.id === t.home ? t.hs! : t.as!, ga = r.id === t.home ? t.as! : t.hs!;
    return { ...r, p: r.p + 1, w: r.w + (gf > ga ? 1 : 0), d: r.d + (gf === ga ? 1 : 0), l: r.l + (gf < ga ? 1 : 0), gf: r.gf + gf, ga: r.ga + ga, pts: r.pts + (gf > ga ? 3 : gf === ga ? 1 : 0) };
  });
  return { ...g, table };
}
export const sortTable = (t: GroupRow[]) => [...t].sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);

/** Tirage du tour suivant : vainqueurs du tour (et exemptés), têtes de série séparées au premier tour à élimination. */
function drawNext(comp: Competition, teams: string[], roundIdx: number): CupRound {
  const order = shuffle(teams, `${comp.id}-${comp.season}-draw${roundIdx}`);
  return { name: roundName(teams.length), week: comp.koWeeks[roundIdx], ties: pairs(order, `${comp.id}-s${comp.season}-r${roundIdx}`) };
}

function step(ctx: Ctx, comp0: Competition, week: number, news: string[]): Competition {
  let comp = comp0;
  // Phase de groupes
  if (comp.groups && comp.groupWeeks) {
    comp.groupWeeks.forEach((gw, md) => {
      if (gw !== week) return;
      if (comp.groups!.every(g => g.matchdays[md].every(t => t.hs !== undefined))) return;
      comp = { ...comp, groups: comp.groups!.map(g => {
        let gg = g;
        const played = g.matchdays[md].map(t => (t.hs !== undefined ? t : play(ctx, comp, t, false)));
        for (const t of played) if (g.matchdays[md].find(x => x.id === t.id)?.hs === undefined) gg = applyGroup(gg, t);
        return { ...gg, matchdays: gg.matchdays.map((m, k) => (k === md ? played : m)) };
      }) };
    });
    const allDone = comp.groups.every(g => g.matchdays.every(m => m.every(t => t.hs !== undefined)));
    if (allDone && comp.rounds.length === 0) {
      // Premiers contre deuxièmes d'autres groupes
      const firsts = comp.groups.map(g => sortTable(g.table)[0].id);
      const seconds = comp.groups.map(g => sortTable(g.table)[1].id);
      const n = firsts.length;
      const ties: CupTie[] = firsts.map((f, i) => ({ id: `${comp.id}-s${comp.season}-r0-${i}`, home: f, away: seconds[(i + 1) % n] }));
      comp = { ...comp, rounds: [{ name: roundName(n * 2), week: comp.koWeeks[0], ties }] };
    }
  }
  // Tours à élimination de la semaine (plusieurs possibles, dans l'ordre)
  for (let guard = 0; guard < 8; guard++) {
    const idx = comp.rounds.length - 1;
    const r = comp.rounds[idx];
    if (!r || r.done || r.week !== week) break;
    const ties = r.ties.map(t => (t.winner ? t : play(ctx, comp, t, true)));
    const winners = ties.map(t => t.winner!);
    comp = { ...comp, rounds: comp.rounds.map((x, k) => (k === idx ? { ...x, ties, done: true } : x)) };
    if (ties.length === 1 && comp.pending.length === 0) {
      const f = ties[0];
      comp = { ...comp, winner: f.winner, runnerUp: f.winner === f.home ? f.away : f.home };
      news.push(`${teamName(ctx.w, f.winner!)} remporte la ${comp.name} !`);
      break;
    }
    const nextTeams = [...comp.pending, ...winners];
    comp = { ...comp, pending: [], rounds: [...comp.rounds, drawNext(comp, nextTeams, comp.rounds.length)] };
  }
  return comp;
}

/** Joue les matchs de coupe de la semaine. Monde CP uniquement. */
export function runCompetitions(w0: WorldLiveState, week: number): { world: WorldLiveState; news: string[] } {
  if (w0.dataset !== "cp") return { world: w0, news: [] };
  let w = ensureCompetitions(w0, week);
  const news: string[] = [];
  // Qualification européenne de la saison suivante, dès la fin des championnats
  if (week === 47 && w.continentalNext?.forSeason !== w.season + 1) {
    const q = continentalEntrants(w);
    w = { ...w, continentalNext: { forSeason: w.season + 1, ...q } };
  }
  const comps = w.competitions ?? [];
  if (!comps.length) return { world: w, news };
  const ctx: Ctx = { w, cache: new Map(), stats: [] };
  const updated = comps.map(c => (c.winner ? c : step(ctx, c, week, news)));
  const trophies = [...(w.trophies ?? [])];
  for (const c of updated) {
    if (c.winner && !comps.find(o => o.id === c.id && o.season === c.season)?.winner) {
      trophies.push({ compId: c.id, name: c.name, kind: c.kind, season: c.season, year: juneYear(w), winner: c.winner, runnerUp: c.runnerUp });
    }
  }
  // Statistiques des joueurs (identifiant de la compétition)
  let playerStats = w.playerStats;
  if (ctx.stats.length) {
    playerStats = [...w.playerStats];
    const idx = new Map<string, number>();
    playerStats.forEach((s, i) => { if (s.season === w.season) idx.set(`${s.playerId}|${s.leagueId}`, i); });
    for (const u of ctx.stats) {
      const key = `${u.playerId}|${u.leagueId}`;
      const i = idx.get(key);
      if (i !== undefined) playerStats[i] = { ...playerStats[i], goals: playerStats[i].goals + u.goals, assists: playerStats[i].assists + u.assists, appearances: playerStats[i].appearances + 1 };
      else { idx.set(key, playerStats.length); playerStats.push({ playerId: u.playerId, clubId: u.clubId, leagueId: u.leagueId, season: w.season, goals: u.goals, assists: u.assists, appearances: 1, yellowCards: 0, redCards: 0, avgRating: 6.5 }); }
    }
  }
  return { world: { ...w, competitions: updated, trophies: trophies.slice(-300), playerStats }, news };
}

/** Parcours d'une équipe dans une compétition (« Quarts de finale », « Vainqueur »…). */
export function progressOf(c: Competition, team: string): string | null {
  if (c.winner === team) return "Vainqueur";
  if (c.runnerUp === team) return "Finaliste";
  const inGroups = c.groups?.some(g => g.teams.includes(team));
  let last: string | null = inGroups ? "Phase de groupes" : null;
  for (const r of c.rounds) {
    const t = r.ties.find(x => x.home === team || x.away === team);
    if (!t) continue;
    last = t.winner && t.winner !== team ? `Éliminé en ${r.name.toLowerCase()}` : r.name;
  }
  if (!last && c.pending.includes(team)) return "Exempté du premier tour";
  return last;
}
