/**
 * FC CAREER 27 — Mode Manager : moteur de semaine.
 * Création de partie, match du club géré, finances, conseil, boîte de réception,
 * fin de saison. Fonctions pures : (état) → nouvel état.
 */

import type { WorldPlayer } from "../data/worldPlayers";
import type { Club } from "../domain/club";
import type { ClubSeasonTarget } from "../domain/clubAI";
import type { WorldLiveState, WorldMatchResult } from "../domain/worldState";
import { applyResultToStanding } from "../domain/worldState";
import { advanceWorldWeek, endWorldSeason } from "../domain/worldEngine";
import { generateWorld } from "../domain/worldGenerator";
import type { Fixture } from "../domain/season";
import { createRng, seedFromString } from "../utils/random";
import type {
  BoardState, ClubFinances, InboxKind, InboxMessage, LedgerEntry, ManagerMatchReport,
  ManagerState, Tactic,
} from "./types";
import { MANAGER_SAVE_VERSION } from "./types";
import { aiTacticFor, autoPickLineup, FORMATIONS, isAvailable, validateLineup } from "./tactics";
import { finishMatch, initMatch, postMatchEffects, simulateToEnd } from "./matchSim";
import type { LiveMatch } from "./matchSim";

const LEDGER_MAX = 200;
const INBOX_MAX = 80;

// ─── Lecture ─────────────────────────────────────────────────────────────────

export function getManagedClub(s: ManagerState): Club {
  const c = s.world.clubs.find(x => x.id === s.clubId);
  if (!c) throw new Error(`Club géré introuvable : ${s.clubId}`);
  return c;
}

export function getSquad(s: ManagerState): WorldPlayer[] {
  return s.world.players.filter(p => p.clubId === s.clubId);
}

export function getLeagueSchedule(s: ManagerState) {
  return s.world.schedules[getManagedClub(s).leagueId];
}

/** Prochain match du club géré (null si saison terminée). */
export function getNextFixture(s: ManagerState): Fixture | null {
  const sch = getLeagueSchedule(s);
  if (!sch) return null;
  return sch.fixtures
    .filter(f => !f.result && (f.homeClubId === s.clubId || f.awayClubId === s.clubId))
    .sort((a, b) => a.matchday - b.matchday)[0] ?? null;
}

export function getLeaguePosition(s: ManagerState): number {
  const rows = s.world.standings[getManagedClub(s).leagueId] ?? [];
  const i = rows.findIndex(r => r.clubId === s.clubId);
  return i < 0 ? rows.length : i + 1;
}

export function isSeasonOver(s: ManagerState): boolean {
  const sch = getLeagueSchedule(s);
  return !sch || sch.currentMatchday > sch.totalMatchdays;
}

// ─── Salaires ────────────────────────────────────────────────────────────────

/**
 * Salaire hebdomadaire estimé d'un joueur : la masse salariale du club (90 % du
 * plafond) est répartie selon OVR⁴ — les stars coûtent beaucoup plus cher.
 */
export function weeklyWages(squad: WorldPlayer[], club: Club): Record<string, number> {
  const total = club.wagesBudget * 0.9;
  const weights = squad.map(p => Math.pow(p.overall, 4));
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const out: Record<string, number> = {};
  squad.forEach((p, i) => { out[p.id] = Math.round((total * weights[i]) / sum / 10) * 10; });
  return out;
}

// ─── Objectifs du conseil ────────────────────────────────────────────────────

/** Pire classement acceptable pour un objectif, dans une ligue de n clubs. */
export function objectiveMaxPosition(obj: ClubSeasonTarget, n: number): number {
  switch (obj) {
    case "win_title":          return 1;
    case "gain_promotion":     return 2;
    case "top_3":              return 3;
    case "top_half":           return Math.ceil(n / 2);
    case "mid_table":          return n - 2;
    case "survive_relegation": return n - 3;
    case "develop_youth":      return n - 1;
  }
}

export const OBJECTIVE_LABEL: Record<ClubSeasonTarget, string> = {
  win_title: "Remporter le championnat",
  top_3: "Finir sur le podium",
  top_half: "Finir dans la première moitié",
  mid_table: "Assurer un milieu de tableau",
  survive_relegation: "Éviter la relégation",
  gain_promotion: "Obtenir la montée",
  develop_youth: "Éviter la dernière place",
};


// ─── Objectif réaliste ───────────────────────────────────────────────────────

/** Moyenne des 11 meilleurs OVR d'un club. */
export function squadStrength(w: WorldLiveState, clubId: string): number {
  const top = w.players.filter(p => p.clubId === clubId).map(p => p.overall).sort((a, b) => b - a).slice(0, 11);
  return top.length ? top.reduce((a, b) => a + b, 0) / top.length : 0;
}

/**
 * Objectif fixé par le conseil d'après le rang RÉEL de l'effectif dans sa ligue
 * (la réputation seule surestime les clubs historiques en déclin).
 */
export function realisticObjective(w: WorldLiveState, clubId: string): ClubSeasonTarget {
  const club = w.clubs.find(c => c.id === clubId)!;
  const rivals = w.clubs.filter(c => c.leagueId === club.leagueId);
  const n = rivals.length;
  const rank = 1 + rivals.filter(c => c.id !== clubId && squadStrength(w, c.id) > squadStrength(w, clubId)).length;
  const share = rank / n;
  if (club.tier >= 2) {
    if (rank <= 2) return "gain_promotion";
    if (share <= 0.5) return "top_half";
    return share <= 0.75 ? "mid_table" : "develop_youth";
  }
  if (rank === 1) return "win_title";
  if (rank <= 3) return "top_3";
  if (share <= 0.5) return "top_half";
  if (share <= 0.75) return "survive_relegation";
  return "develop_youth"; // effectif parmi les plus faibles : ne pas finir dernier
}

// ─── Utilitaires d'état ──────────────────────────────────────────────────────

export function msg(s: ManagerState, kind: InboxKind, title: string, body: string): InboxMessage {
  return {
    id: `msg-s${s.world.season}-w${s.world.currentWeek}-${s.inbox.length}-${kind}`,
    season: s.world.season, week: s.world.currentWeek, kind, title, body, read: false,
  };
}

export function pushInbox(s: ManagerState, ...m: InboxMessage[]): ManagerState {
  return { ...s, inbox: [...m.reverse(), ...s.inbox].slice(0, INBOX_MAX) };
}

export function addLedger(f: ClubFinances, entries: LedgerEntry[]): ClubFinances {
  const delta = entries.reduce((a, e) => a + e.amount, 0);
  return { ...f, balance: f.balance + delta, ledger: [...entries, ...f.ledger].slice(0, LEDGER_MAX) };
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ─── Création de partie ──────────────────────────────────────────────────────

export function createManagerGame(opts: { seed: string; clubId: string; managerName: string; now?: number }): ManagerState {
  const world = generateWorld(opts.seed);
  const club = world.clubs.find(c => c.id === opts.clubId);
  if (!club) throw new Error(`Club inconnu : ${opts.clubId}`);
  const tactic: Tactic = { ...aiTacticFor(club.philosophy) };
  const squad = world.players.filter(p => p.clubId === club.id);
  const now = opts.now ?? Date.now();
  const director = world.clubDirectors[club.id];

  const base: ManagerState = {
    version: MANAGER_SAVE_VERSION,
    managerName: opts.managerName.trim() || "Manager",
    clubId: club.id,
    status: "active",
    world,
    tactic,
    lineup: autoPickLineup(squad, tactic.formation),
    suspensions: {},
    finances: {
      // La trésorerie couvre le budget transferts avec une réserve pour les salaires
      balance: Math.round(club.transferBudget * 1.4),
      transferBudget: club.transferBudget,
      wageBudget: club.wagesBudget,
      ledger: [],
    },
    board: {
      objective: realisticObjective(world, club.id),
      confidence: 65,
      patience: director?.patience ?? 55,
    },
    inbox: [],
    lastMatch: null,
    history: [],
    createdAt: now,
    savedAt: now,
  };
  return pushInbox(base, msg(base, "welcome",
    `Bienvenue à ${club.name}`,
    `Le conseil vous confie l'équipe première. Objectif de la saison : ${OBJECTIVE_LABEL[base.board.objective].toLowerCase()}. ` +
    `Budget transferts : ${formatMoney(club.transferBudget)}. Masse salariale maximale : ${formatMoney(club.wagesBudget)} par semaine.`,
  ));
}

export function formatMoney(v: number): string {
  const a = Math.abs(v), sign = v < 0 ? "-" : "";
  if (a >= 1_000_000) return `${sign}${(a / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1).replace(".", ",")} M€`;
  if (a >= 1_000) return `${sign}${Math.round(a / 1_000)} k€`;
  return `${sign}${Math.round(a)} €`;
}

// ─── Actions du manager ──────────────────────────────────────────────────────

export function setTactic(s: ManagerState, tactic: Tactic): ManagerState {
  // Les joueurs choisis restent titulaires ; on ne recompose que si le nombre de postes change
  const sameShape = FORMATIONS[tactic.formation].length === s.lineup.starters.length;
  return { ...s, tactic, lineup: sameShape ? s.lineup : autoPickLineup(availableSquad(s), tactic.formation) };
}

export function availableSquad(s: ManagerState): WorldPlayer[] {
  return getSquad(s).filter(p => isAvailable(p) && !(s.suspensions[p.id] > 0));
}

export function autoLineup(s: ManagerState): ManagerState {
  return { ...s, lineup: autoPickLineup(availableSquad(s), s.tactic.formation) };
}

/** Échange deux joueurs entre titulaires / remplaçants / tribune. */
export function swapPlayers(s: ManagerState, aId: string, bId: string): ManagerState {
  const swap = (arr: string[]) => arr.map(id => (id === aId ? bId : id === bId ? aId : id));
  const starters = swap(s.lineup.starters);
  const bench = swap(s.lineup.bench);
  const captainId = s.lineup.captainId && !starters.includes(s.lineup.captainId) ? starters[0] ?? null : s.lineup.captainId;
  return { ...s, lineup: { starters, bench, captainId } };
}

export function setCaptain(s: ManagerState, playerId: string): ManagerState {
  if (!s.lineup.starters.includes(playerId)) return s;
  return { ...s, lineup: { ...s.lineup, captainId: playerId } };
}

export function markRead(s: ManagerState, id: string): ManagerState {
  return { ...s, inbox: s.inbox.map(m => (m.id === id ? { ...m, read: true } : m)) };
}

export function lineupIssues(s: ManagerState) {
  const unavailable = getSquad(s).filter(p => s.suspensions[p.id] > 0).map(p => p.id);
  const issues = validateLineup(s.lineup, getSquad(s), s.tactic.formation);
  for (const id of s.lineup.starters) {
    if (unavailable.includes(id)) {
      const p = getSquad(s).find(x => x.id === id)!;
      issues.push({ kind: "injured", message: `${p.firstName} ${p.lastName} est suspendu.`, playerId: id });
    }
  }
  return issues;
}

// ─── Match du club géré ──────────────────────────────────────────────────────

/** Prépare le match en direct de la semaine (null si pas de match). */
export function prepareMatch(s: ManagerState, opts: { autoSubs?: boolean } = {}): LiveMatch | null {
  const fx = getNextFixture(s);
  const sch = getLeagueSchedule(s);
  if (!fx || !sch || fx.matchday !== sch.currentMatchday) return null;

  const isHome = fx.homeClubId === s.clubId;
  const oppId = isHome ? fx.awayClubId : fx.homeClubId;
  const opp = s.world.clubs.find(c => c.id === oppId)!;
  const club = getManagedClub(s);

  // Compo du manager : si invalide, on complète automatiquement
  let lineup = s.lineup;
  if (lineupIssues(s).length > 0) lineup = autoPickLineup(availableSquad(s), s.tactic.formation);
  const byId = new Map(getSquad(s).map(p => [p.id, p]));
  const starters = lineup.starters.map(id => byId.get(id)!).filter(Boolean);
  const bench = lineup.bench.map(id => byId.get(id)!).filter(Boolean)
    .filter(p => isAvailable(p) && !(s.suspensions[p.id] > 0));

  const mine = { clubId: club.id, name: club.name, starters, bench, tactic: s.tactic, autoSubs: opts.autoSubs ?? true };
  const theirs = aiTeam(s, opp.id);
  return initMatch({
    fixtureId: fx.id, season: s.world.season, matchday: fx.matchday,
    seed: `${s.world.seed}-mgr-${fx.id}`,
    home: isHome ? mine : theirs, away: isHome ? theirs : mine,
    managedSide: isHome ? "home" : "away",
  });
}

/** Équipe alignée par l'IA d'un club (compo optimale selon sa philosophie). */
function aiTeam(s: ManagerState, clubId: string) {
  const club = s.world.clubs.find(c => c.id === clubId)!;
  const tactic = aiTacticFor(club.philosophy);
  const squad = s.world.players.filter(p => p.clubId === clubId && !(s.suspensions[p.id] > 0));
  const lineup = autoPickLineup(squad, tactic.formation);
  const byId = new Map(squad.map(p => [p.id, p]));
  return {
    clubId, name: club.name, tactic, autoSubs: true,
    starters: lineup.starters.map(id => byId.get(id)!),
    bench: lineup.bench.map(id => byId.get(id)!),
  };
}

/**
 * Les autres matchs de la journée dans la ligue du manager passent par le même
 * moteur que le sien : le classement reste cohérent (même modèle pour tous).
 */
function playLeagueMatchday(s: ManagerState): ManagerState {
  const sch = getLeagueSchedule(s);
  if (!sch) return s;
  let cur = s;
  for (const fx of sch.fixtures.filter(f => f.matchday === sch.currentMatchday && !f.result)) {
    if (fx.homeClubId === s.clubId || fx.awayClubId === s.clubId) continue;
    const live = initMatch({
      fixtureId: fx.id, season: s.world.season, matchday: fx.matchday,
      seed: `${s.world.seed}-mgr-${fx.id}`,
      home: aiTeam(cur, fx.homeClubId), away: aiTeam(cur, fx.awayClubId), managedSide: "home",
    });
    cur = recordMatch(cur, live).state;
  }
  return cur;
}

/** Enregistre un match terminé dans le monde (classement, calendrier, stats, joueurs). */
function recordMatch(s: ManagerState, live: LiveMatch): { state: ManagerState; report: ManagerMatchReport } {
  const done = live.finished ? live : simulateToEnd(live);
  const report = finishMatch(done);
  const w = s.world;
  const club = getManagedClub(s);
  const leagueId = club.leagueId;
  const sch = w.schedules[leagueId];

  const result: WorldMatchResult = {
    fixtureId: report.fixtureId, leagueId, season: w.season, matchday: report.matchday,
    homeClubId: report.homeClubId, awayClubId: report.awayClubId,
    scoreHome: report.home.goals, scoreAway: report.away.goals,
    scorers: report.events.filter(e => e.type === "goal" && e.playerId)
      .map(e => ({ playerId: e.playerId!, clubId: e.side === "home" ? report.homeClubId : report.awayClubId })),
  };

  // Stats saison (même structure que le moteur monde)
  const stats = [...w.playerStats];
  const bump = (playerId: string, clubId: string, g: number, a: number, appearance: boolean) => {
    const i = stats.findIndex(x => x.playerId === playerId && x.season === w.season && x.leagueId === leagueId);
    if (i >= 0) stats[i] = { ...stats[i], goals: stats[i].goals + g, assists: stats[i].assists + a, appearances: stats[i].appearances + (appearance ? 1 : 0) };
    else stats.push({ playerId, clubId, leagueId, season: w.season, goals: g, assists: a, appearances: appearance ? 1 : 0, yellowCards: 0, redCards: 0, avgRating: 6.5 });
  };
  for (const side of ["home", "away"] as const) {
    const t = done[side];
    for (const id of t.appeared) bump(id, t.clubId, 0, 0, true);
  }
  for (const e of report.events) {
    if (e.type !== "goal") continue;
    const cid = e.side === "home" ? report.homeClubId : report.awayClubId;
    if (e.playerId) bump(e.playerId, cid, 1, 0, false);
    if (e.assistId) bump(e.assistId, cid, 0, 1, false);
  }

  // Effets joueurs : fatigue, blessures, moral, forme
  const effects = new Map(postMatchEffects(done).map(e => [e.playerId, e]));
  const involvesManaged = report.homeClubId === s.clubId || report.awayClubId === s.clubId;
  const managedGoals = report.managedSide === "home" ? report.home.goals : report.away.goals;
  const oppGoals = report.managedSide === "home" ? report.away.goals : report.home.goals;
  const outcome = managedGoals > oppGoals ? 1 : managedGoals < oppGoals ? -1 : 0;
  const starterIds = new Set(done[done.managedSide].appeared);
  const players = w.players.map(p => {
    const e = effects.get(p.id);
    let next = p;
    if (e) {
      next = {
        ...next,
        fatigue: e.fatigueAfter,
        injury: e.injuredWeeks > 0 ? { type: "Blessure musculaire", severity: e.injuredWeeks >= 4 ? "moderate" : "minor", weeksRemaining: e.injuredWeeks } : next.injury,
      };
    }
    if (involvesManaged && p.clubId === s.clubId) {
      const rating = report.ratings[p.id];
      const moraleDelta = starterIds.has(p.id) ? outcome * 4 : -2;          // les non-alignés râlent un peu
      const formDelta = rating !== undefined ? (rating - 6.5) * 6 : -1;
      next = { ...next, morale: clamp(next.morale + moraleDelta, 5, 100), form: clamp(Math.round(next.form + formDelta), 5, 100) };
    }
    return next;
  });

  const suspensions = { ...s.suspensions };
  for (const e of effects.values()) if (e.suspended) suspensions[e.playerId] = (suspensions[e.playerId] ?? 0) + 1;

  const world: WorldLiveState = {
    ...w,
    players,
    playerStats: stats,
    standings: applyResultToStanding(w.standings, result),
    matchResults: [...w.matchResults, result],
    recentResults: [result, ...w.recentResults].slice(0, 20),
    schedules: {
      ...w.schedules,
      [leagueId]: { ...sch, fixtures: sch.fixtures.map(f => (f.id === result.fixtureId ? { ...f, result: { scoreHome: result.scoreHome, scoreAway: result.scoreAway } } : f)) },
    },
  };
  return { state: { ...s, world, suspensions, lastMatch: involvesManaged ? report : s.lastMatch }, report };
}

// ─── Protection de l'effectif géré ───────────────────────────────────────────

/**
 * L'IA du monde ne doit ni vendre ni acheter pour le club géré.
 * Les départs à la retraite (joueur disparu) restent acceptés.
 */
function protectManagedSquad(before: WorldLiveState, after: WorldLiveState, clubId: string): WorldLiveState {
  const prevClub = new Map(before.players.map(p => [p.id, p.clubId]));
  let changed = false;
  const players = after.players.map(p => {
    const was = prevClub.get(p.id);
    if (was === undefined) return p; // nouveau jeune généré : laisser
    if (was === clubId && p.clubId !== clubId) { changed = true; return { ...p, clubId, leagueId: before.clubs.find(c => c.id === clubId)?.leagueId ?? p.leagueId }; }
    if (was !== clubId && p.clubId === clubId) { changed = true; return { ...p, clubId: was }; }
    return p;
  });
  if (!changed) return after;
  // Les joueurs gardés suivent la ligue actuelle du club (il peut avoir été promu)
  const leagueId = after.clubs.find(c => c.id === clubId)?.leagueId;
  return {
    ...after,
    players: players.map(p => (p.clubId === clubId && leagueId ? { ...p, leagueId } : p)),
    transferHistory: after.transferHistory.filter(t => {
      const r = t as unknown as { fromClubId?: string; toClubId?: string };
      return r.fromClubId !== clubId && r.toClubId !== clubId;
    }),
  };
}

// ─── Récupération hebdomadaire ───────────────────────────────────────────────

function weeklyRecovery(w: WorldLiveState): WorldLiveState {
  return {
    ...w,
    players: w.players.map(p => {
      const injury = p.injury && p.injury.weeksRemaining > 1 ? { ...p.injury, weeksRemaining: p.injury.weeksRemaining - 1 } : null;
      const fatigue = Math.max(0, p.fatigue - 32);
      if (injury === p.injury && fatigue === p.fatigue) return p;
      return { ...p, injury, fatigue };
    }),
  };
}

// ─── Finances de la semaine ──────────────────────────────────────────────────

function weeklyFinances(s: ManagerState, homeMatch: boolean, managedWon: boolean | null): { finances: ClubFinances; entries: LedgerEntry[] } {
  const club = getManagedClub(s);
  const rep = s.world.clubReputations[club.id] ?? club.reputation;
  const W = club.wagesBudget;
  const season = s.world.season, week = s.world.currentWeek;
  const squad = getSquad(s);
  // Salaire contractuel quand il existe (marché), sinon estimation
  const formula = weeklyWages(squad, club);
  const wages = squad.reduce((a, p) => a + (s.market?.contracts[p.id]?.wage ?? formula[p.id] ?? 0), 0);
  const entries: LedgerEntry[] = [];

  if (homeMatch) {
    const pos = getLeaguePosition(s);
    const fill = clamp(0.5 + rep / 220 + (managedWon ? 0.04 : 0) - (pos > 5 ? 0.05 : 0), 0.3, 1);
    entries.push({ season, week, category: "tickets", amount: Math.round(W * 1.25 * fill), label: `Billetterie (${Math.round(fill * 100)} % de remplissage)` });
  }
  entries.push({ season, week, category: "tv", amount: Math.round(W * (club.tier === 1 ? 0.55 : 0.32)), label: "Droits TV" });
  entries.push({ season, week, category: "sponsor", amount: Math.round(W * 0.35 * (rep / 80)), label: "Sponsors" });
  if (managedWon) entries.push({ season, week, category: "prize", amount: Math.round(W * 0.15), label: "Prime de victoire" });
  entries.push({ season, week, category: "wages", amount: -wages, label: "Salaires des joueurs" });
  entries.push({ season, week, category: "staff", amount: -Math.round(W * 0.12), label: "Staff technique" });
  entries.push({ season, week, category: "facilities", amount: -Math.round(W * 0.08), label: "Entretien des installations" });
  return { finances: addLedger(s.finances, entries), entries };
}

// ─── Conseil d'administration ────────────────────────────────────────────────

function boardAfterMatch(s: ManagerState, report: ManagerMatchReport): BoardState {
  const mine = report.managedSide === "home" ? report.home.goals : report.away.goals;
  const theirs = report.managedSide === "home" ? report.away.goals : report.home.goals;
  const oppId = report.managedSide === "home" ? report.awayClubId : report.homeClubId;
  const repMe = s.world.clubReputations[s.clubId] ?? 50;
  const repOpp = s.world.clubReputations[oppId] ?? 50;
  const favourite = repMe - repOpp; // >0 : on était favori
  let d = mine > theirs ? 3 : mine === theirs ? 0 : -4;
  if (mine > theirs && favourite < -8) d += 3;   // victoire d'outsider
  if (mine < theirs && favourite > 8) d -= 3;    // défaite de favori
  if (mine === theirs && favourite > 8) d -= 1;
  // Patience : un conseil patient amortit les mauvaises nouvelles
  if (d < 0) d = Math.round(d * (1.25 - s.board.patience / 200));
  return { ...s.board, confidence: clamp(s.board.confidence + d, 0, 100) };
}

function boardMonthlyReview(s: ManagerState): { board: BoardState; message: InboxMessage | null } {
  const sch = getLeagueSchedule(s);
  if (!sch || s.world.currentWeek % 4 !== 0 || (sch.currentMatchday - 1) < 4) return { board: s.board, message: null };
  const n = (s.world.standings[getManagedClub(s).leagueId] ?? []).length;
  const pos = getLeaguePosition(s);
  const max = objectiveMaxPosition(s.board.objective, n);
  let d = pos <= max ? 3 : pos - max >= 3 ? -7 : -3;
  if (s.finances.balance < 0) d -= 3;
  const board = { ...s.board, confidence: clamp(s.board.confidence + d, 0, 100) };
  const tone = d > 0 ? "Le conseil est satisfait de la trajectoire." : "Le conseil s'inquiète des résultats.";
  return {
    board,
    message: msg(s, "board", "Point mensuel du conseil",
      `${tone} Classement actuel : ${pos}e (objectif : top ${max}). Confiance : ${board.confidence}/100.`),
  };
}

// ─── Fin de saison ───────────────────────────────────────────────────────────

function closeSeason(s: ManagerState): ManagerState {
  const club = getManagedClub(s);
  const rows = s.world.standings[club.leagueId] ?? [];
  const pos = getLeaguePosition(s);
  const n = rows.length;
  const objectiveMet = pos <= objectiveMaxPosition(s.board.objective, n);
  const record = {
    season: s.world.season, clubId: club.id, leagueId: club.leagueId,
    position: pos, points: rows.find(r => r.clubId === s.clubId)?.points ?? 0,
    objective: s.board.objective, objectiveMet,
  };

  // Prime de classement
  const prize = Math.round(club.wagesBudget * (club.tier === 1 ? 14 : 7) * (1 - (pos - 1) / Math.max(1, n)));
  let finances = addLedger(s.finances, [{ season: s.world.season, week: s.world.currentWeek, category: "prize", amount: prize, label: `Prime de classement (${pos}e)` }]);

  const before = s.world;
  const { world: ended, newsItems } = endWorldSeason(s.world);
  const world = protectManagedSquad(before, ended, s.clubId);
  const newClub = world.clubs.find(c => c.id === s.clubId)!;

  // Sanction proportionnelle à l'écart avec l'objectif
  const gap = pos - objectiveMaxPosition(s.board.objective, n);
  const confidence = clamp(s.board.confidence + (objectiveMet ? 15 : -Math.min(30, 8 * gap)), 0, 100);
  // Budget accordé par le conseil, jamais supérieur à 80 % de la trésorerie disponible
  finances = { ...finances, transferBudget: Math.max(0, Math.min(Math.round(newClub.transferBudget * (objectiveMet ? 1.15 : 0.85)), Math.round(finances.balance * 0.8))) };

  let next: ManagerState = {
    ...s, world, finances, suspensions: {},
    board: { ...s.board, confidence, objective: realisticObjective(world, newClub.id) },
    history: [...s.history, record],
  };
  next = { ...next, lineup: autoPickLineup(availableSquad(next), next.tactic.formation) };

  const league = world.leagues.find(l => l.id === newClub.leagueId);
  next = pushInbox(next,
    msg(next, "board", `Bilan de la saison ${record.season}`,
      `${club.name} termine ${pos}e. Objectif ${objectiveMet ? "atteint" : "manqué"} (${OBJECTIVE_LABEL[record.objective].toLowerCase()}). ` +
      `Prime de classement : ${formatMoney(prize)}. Confiance du conseil : ${confidence}/100.`),
    msg(next, "board", `Saison ${world.season} : nouvel objectif`,
      `Vous jouerez en ${league?.name ?? "championnat"}. Objectif : ${OBJECTIVE_LABEL[next.board.objective].toLowerCase()}. ` +
      `Budget transferts : ${formatMoney(finances.transferBudget)}.`),
    ...newsItems.slice(0, 4).map(n => msg(next, "news", "Actualité du monde", n)),
  );
  if (confidence < 15) next = sack(next);
  return next;
}

function sack(s: ManagerState): ManagerState {
  const club = getManagedClub(s);
  return pushInbox({ ...s, status: "sacked" }, msg(s, "board", "Vous êtes licencié",
    `Le conseil de ${club.name} a perdu confiance et met fin à votre contrat. Vous pouvez reprendre un autre club depuis l'écran de départ.`));
}

// ─── Avancer d'une semaine ───────────────────────────────────────────────────

/**
 * Joue la semaine : match du club géré (le direct fourni ou simulé), reste du monde,
 * récupération, finances, conseil. En fin de calendrier, clôt la saison.
 */
export function playWeek(s: ManagerState, live?: LiveMatch | null): ManagerState {
  if (s.status === "sacked") return s;
  if (isSeasonOver(s)) return closeSeason(s);

  let state = s;
  let report: ManagerMatchReport | null = null;
  const match = live ?? prepareMatch(s);
  const messages: InboxMessage[] = [];

  if (match) {
    // Les suspensions purgées cette semaine sont décomptées après le match
    const r = recordMatch(state, match);
    state = r.state;
    report = r.report;
  }
  state = playLeagueMatchday(state);

  // Suspensions : un match purgé par semaine de championnat
  const suspensions: Record<string, number> = {};
  for (const [id, n] of Object.entries(state.suspensions)) {
    // Suspendu avant cette semaine → il vient de purger un match ; expulsé cette semaine → rien purgé
    const left = id in s.suspensions ? n - 1 : n;
    if (left > 0) suspensions[id] = left;
  }
  state = { ...state, suspensions };

  // Reste du monde
  const before = state.world;
  const adv = advanceWorldWeek(state.world);
  state = { ...state, world: weeklyRecovery(protectManagedSquad(before, adv.world, state.clubId)) };

  // Finances + conseil
  let won: boolean | null = null;
  if (report) {
    const mine = report.managedSide === "home" ? report.home.goals : report.away.goals;
    const theirs = report.managedSide === "home" ? report.away.goals : report.home.goals;
    won = mine > theirs;
    const opp = state.world.clubs.find(c => c.id === (report!.managedSide === "home" ? report!.awayClubId : report!.homeClubId));
    messages.push(msg(state, "match", `${mine > theirs ? "Victoire" : mine === theirs ? "Match nul" : "Défaite"} contre ${opp?.name ?? "l'adversaire"} (${mine}-${theirs})`,
      `Journée ${report.matchday}. Possession ${report.managedSide === "home" ? report.home.possession : report.away.possession} %, ` +
      `tirs ${report.managedSide === "home" ? report.home.shots : report.away.shots}. Classement : ${getLeaguePosition(state)}e.`));
    state = { ...state, board: boardAfterMatch(state, report) };
  }
  const fin = weeklyFinances(state, !!report && report.managedSide === "home", won);
  state = { ...state, finances: fin.finances };

  const review = boardMonthlyReview(state);
  state = { ...state, board: review.board };
  if (review.message) messages.push(review.message);

  // Infirmerie
  for (const p of getSquad(state)) {
    if (p.injury && p.injury.weeksRemaining > 0 && report?.events.some(e => e.type === "injury" && e.playerId === p.id)) {
      messages.push(msg(state, "squad", `Blessure : ${p.firstName} ${p.lastName}`, `Indisponible environ ${p.injury.weeksRemaining} semaine(s).`));
    }
  }
  for (const n of adv.newsItems.slice(0, 2)) messages.push(msg(state, "news", "Actualité du monde", n));

  state = pushInbox(state, ...messages);
  // La compo suivante retire automatiquement blessés et suspendus
  if (lineupIssues(state).length > 0) state = autoLineup(state);

  // Pas de licenciement avant la mi-saison : le conseil laisse le temps de construire
  const sch = getLeagueSchedule(state);
  const halfway = sch ? sch.currentMatchday - 1 >= Math.ceil(sch.totalMatchdays / 2) : true;
  if (state.board.confidence < 15 && halfway) return sack(state);
  return state;
}

/** Simule jusqu'à la fin de la saison (utile pour les tests et le mode rapide). */
export function simulateSeason(s: ManagerState, maxWeeks = 60): ManagerState {
  let cur = s;
  const season = s.world.season;
  for (let i = 0; i < maxWeeks && cur.status === "active" && cur.world.season === season; i++) cur = playWeek(autoLineup(cur));
  return cur;
}

/** Graine stable dérivée d'un texte — pour des parties reproductibles. */
export function seedFor(text: string): string {
  return `mgr-${seedFromString(text).toString(36)}-${createRng(seedFromString(text)).int(1000, 9999)}`;
}
