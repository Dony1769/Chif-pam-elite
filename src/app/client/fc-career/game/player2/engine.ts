/**
 * FC CAREER 27 — Carrière Joueur v2 : moteur.
 * Création, choix du coach, semaine (match + monde via le moteur manager),
 * note et statistiques, confiance, réputation, entraînement, fin de saison.
 * Fonctions pures et déterministes.
 */

import type { WorldPlayer, WorldPlayerPosition } from "../data/worldPlayers";
import type { InboxKind, InboxMessage, ManagerState } from "../manager/types";
import {
  createManagerGame, getManagedClub, getNextFixture, getLeagueSchedule, playWeek, prepareMatch, squadStrength,
} from "../manager/engine";
import { aiTacticFor, autoPickLineup, isAvailable } from "../manager/tactics";
import type { LiveMatch } from "../manager/matchSim";
import { createRng, seedFromString } from "../utils/random";
import type { AttrKey, Attrs } from "./attributes";
import { ATTR_KEYS, keyAttrs, overallOf, profileFor } from "./attributes";
import type {
  Foot, PlayerCareerState, PlayerMatchSummary, PlayerProfile, SeasonLine, Selection, SquadRole,
} from "./types";
import { PLAYER2_SAVE_VERSION } from "./types";

const INBOX_MAX = 80;
const POS_LABEL: Record<WorldPlayerPosition, string> = {
  GK: "gardien", CB: "défenseur central", LB: "latéral gauche", RB: "latéral droit", DM: "milieu défensif",
  CM: "milieu central", AM: "milieu offensif", LW: "ailier gauche", RW: "ailier droit", ST: "buteur",
};
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ─── Lecture ─────────────────────────────────────────────────────────────────

export function me(s: PlayerCareerState): WorldPlayer {
  const p = s.shadow.world.players.find(x => x.id === s.profile.id);
  if (!p) throw new Error("Joueur introuvable dans le monde");
  return p;
}
export const myClub = (s: PlayerCareerState) => getManagedClub(s.shadow);
export const myNextFixture = (s: PlayerCareerState) => getNextFixture(s.shadow);
export function currentSeasonLine(s: PlayerCareerState): SeasonLine {
  const club = myClub(s);
  return s.seasons.find(l => l.season === s.shadow.world.season && l.clubId === club.id)
    ?? { season: s.shadow.world.season, clubId: club.id, leagueId: club.leagueId, apps: 0, starts: 0, goals: 0, assists: 0, ratingSum: 0, motm: 0 };
}
export const avgRating = (l: Pick<SeasonLine, "apps" | "ratingSum">) => (l.apps ? Math.round((l.ratingSum / l.apps) * 100) / 100 : 0);

export function careerTotals(s: PlayerCareerState) {
  const base = s.legacy ?? { apps: 0, goals: 0, assists: 0 };
  return s.seasons.reduce((t, l) => ({ apps: t.apps + l.apps, goals: t.goals + l.goals, assists: t.assists + l.assists }),
    { apps: base.apps, goals: base.goals, assists: base.assists });
}

// ─── Messages ────────────────────────────────────────────────────────────────

export function pmsg(s: PlayerCareerState, kind: InboxKind, title: string, body: string): InboxMessage {
  return {
    id: `pm-s${s.shadow.world.season}-w${s.shadow.world.currentWeek}-${seedFromString(title + body).toString(36)}`,
    season: s.shadow.world.season, week: s.shadow.world.currentWeek, kind, title, body, read: false,
  };
}
export function pushPlayerInbox(s: PlayerCareerState, ...m: InboxMessage[]): PlayerCareerState {
  const taken = new Set(s.inbox.map(x => x.id));
  const fresh = m.map(x => {
    let id = x.id, k = 2;
    while (taken.has(id)) id = `${x.id}-${k++}`;
    taken.add(id);
    return id === x.id ? x : { ...x, id };
  });
  return { ...s, inbox: [...fresh, ...s.inbox].slice(0, INBOX_MAX) };
}

// ─── Synchronisation profil ↔ monde ──────────────────────────────────────────

/** Recopie note et potentiel du profil dans le joueur du monde (le moteur de match lit le monde). */
export function syncWorldPlayer(s: PlayerCareerState): PlayerCareerState {
  const ovr = overallOf(s.profile.attrs, s.profile.position);
  const players = s.shadow.world.players.map(p => (p.id === s.profile.id
    ? { ...p, overall: ovr, potential: Math.max(s.profile.potential, ovr), position: s.profile.position }
    : p));
  return { ...s, shadow: { ...s.shadow, world: { ...s.shadow.world, players } } };
}

// ─── Création ────────────────────────────────────────────────────────────────

export interface NewCareerInput {
  seed: string;
  clubId: string;
  firstName: string;
  lastName: string;
  nationality: string;
  position: WorldPlayerPosition;
  foot: Foot;
  now?: number;
}

/** Clubs proposés à un jeune de 17 ans : les plus modestes de chaque pays (D2). */
export function starterClubs(seed: string): { id: string; name: string; leagueId: string; reputation: number }[] {
  const sh = createManagerGame({ seed, clubId: "vlt-fc-meridian", managerName: "IA" });
  return sh.world.clubs.filter(c => c.tier >= 2).map(c => ({ id: c.id, name: c.name, leagueId: c.leagueId, reputation: c.reputation }));
}

export function createPlayerCareer(i: NewCareerInput): PlayerCareerState {
  const shadow0 = createManagerGame({ seed: i.seed, clubId: i.clubId, managerName: "Coach IA", now: i.now });
  const club = getManagedClub(shadow0);
  const rng = createRng(seedFromString(`${i.seed}-player-${i.firstName}-${i.lastName}`));
  // Jeune de 17 ans : un peu sous le niveau moyen de son club, gros potentiel
  const target = clamp(Math.round(squadStrength(shadow0.world, club.id)) - rng.int(4, 8), 45, 70);
  const attrs = profileFor(i.position, target, () => rng.next());
  const potential = clamp(target + rng.int(24, 36), 76, 94);
  const id = `me-${seedFromString(i.seed + i.firstName + i.lastName).toString(36)}`;
  const wp: WorldPlayer = {
    id, clubId: club.id, leagueId: club.leagueId, countryId: club.countryId,
    firstName: i.firstName.trim() || "Joueur", lastName: i.lastName.trim() || "Inconnu", nationality: i.nationality,
    age: 17, position: i.position, overall: overallOf(attrs, i.position), potential,
    personality: "prodigy", traits: [], form: 60, fatigue: 0, morale: 75, injury: null,
    careerGoals: 0, careerAssists: 0, careerAppearances: 0, seasonStats: [],
    marketValue: 150_000, contractWeeksLeft: 3 * 52,
  };
  const shadow: ManagerState = {
    ...shadow0,
    world: { ...shadow0.world, players: [...shadow0.world.players, wp] },
    inbox: [],
  };
  const zero: Attrs = { pac: 0, sho: 0, pas: 0, dri: 0, def: 0, phy: 0 };
  const now = i.now ?? Date.now();
  const base: PlayerCareerState = {
    version: PLAYER2_SAVE_VERSION,
    shadow,
    profile: {
      id, firstName: wp.firstName, lastName: wp.lastName, nationality: i.nationality, foot: i.foot,
      position: i.position, attrs, potential, xp: zero, trainingFocus: keyAttrs(i.position)[0],
      reputation: clamp(Math.round(club.reputation * 0.25), 5, 40),
    },
    contract: { clubId: club.id, wage: Math.round(club.wagesBudget * 0.01 / 50) * 50 + 200, seasonsLeft: 3, role: "prospect" },
    coachTrust: 45,
    selection: "out",
    seasons: [],
    lastMatch: null,
    inbox: [],
    createdAt: now,
    savedAt: now,
  };
  const withSel = coachDecision(base);
  return pushPlayerInbox(withSel, pmsg(withSel, "welcome", `Premier contrat pro à ${club.name}`,
    `${wp.firstName} ${wp.lastName}, ${POS_LABEL[i.position]}, 17 ans. Contrat de 3 saisons. Le coach vous voit comme un espoir : gagnez votre place à l'entraînement et sur le terrain.`));
}

// ─── Décision du coach ───────────────────────────────────────────────────────

/** Bonus de sélection lié à la confiance (-4 à +4 points de note). */
export const trustBonus = (trust: number) => Math.round((trust - 50) / 12);

/**
 * Le coach compose son onze avec sa tactique habituelle ; la confiance qu'il a
 * en notre joueur pèse comme quelques points de note.
 */
export function coachDecision(s: PlayerCareerState): PlayerCareerState {
  const sh = s.shadow;
  const club = getManagedClub(sh);
  const tactic = aiTacticFor(club.philosophy);
  const squad = sh.world.players.filter(p => p.clubId === club.id && !(sh.suspensions[p.id] > 0));
  const bonus = trustBonus(s.coachTrust);
  // Le coach juge aussi l'entraînement : sans temps de jeu, forme et moral
  // comptent au moins pour un niveau d'entraînement normal (60)
  const view = squad.map(p => (p.id === s.profile.id
    ? { ...p, overall: p.overall + bonus, form: Math.max(p.form, 60), morale: Math.max(p.morale, 60) }
    : p));
  const lineup = autoPickLineup(view, tactic.formation);
  const mine = squad.find(p => p.id === s.profile.id);
  let selection: Selection = "out";
  if (mine && !isAvailable(mine)) selection = "injured";
  else if ((sh.suspensions[s.profile.id] ?? 0) > 0) selection = "suspended";
  else if (lineup.starters.includes(s.profile.id)) selection = "starter";
  else if (lineup.bench.includes(s.profile.id)) selection = "bench";
  return { ...s, selection, shadow: { ...sh, tactic, lineup } };
}

export const SELECTION_LABEL: Record<Selection, string> = {
  starter: "Titulaire", bench: "Remplaçant", out: "Non retenu", injured: "Blessé", suspended: "Suspendu",
};

/** Rôle dans l'effectif selon le rang de la note au sein du club. */
export function squadRole(s: PlayerCareerState): SquadRole {
  const club = myClub(s);
  const ranked = s.shadow.world.players.filter(p => p.clubId === club.id).sort((a, b) => b.overall - a.overall);
  const r = ranked.findIndex(p => p.id === s.profile.id);
  if (r < 0) return "prospect";
  if (r < 3) return "key";
  if (r < 11) return "starter";
  if (r < 18) return "rotation";
  return "prospect";
}

// ─── Entraînement ────────────────────────────────────────────────────────────

/** Expérience nécessaire pour gagner un point (plus dur quand la note est haute). */
export const xpNeeded = (value: number) => 100 + Math.max(0, value - 50) * 4;

/**
 * Une semaine d'entraînement : 100 % de l'expérience sur la caractéristique
 * travaillée, 25 % sur les autres. L'âge, le temps de jeu et le moral comptent.
 * La note globale ne dépasse jamais le potentiel.
 */
export function trainWeek(s: PlayerCareerState, played: boolean, rating: number | null): { state: PlayerCareerState; gains: AttrKey[] } {
  const p = me(s);
  const age = p.age;
  const ageF = age <= 19 ? 1.5 : age <= 22 ? 1.25 : age <= 26 ? 1 : age <= 29 ? 0.65 : 0.35;
  const playF = played ? 1.25 + Math.max(0, ((rating ?? 6.5) - 6.5) * 0.2) : 1;
  const moraleF = 0.85 + p.morale / 400;
  const tierF = myClub(s).tier === 1 ? 1.1 : 1;
  const base = 30 * ageF * playF * moraleF * tierF;
  const attrs = { ...s.profile.attrs };
  const xp = { ...s.profile.xp };
  const gains: AttrKey[] = [];
  for (const k of ATTR_KEYS) {
    xp[k] = xp[k] + base * (k === s.profile.trainingFocus ? 1 : 0.25);
    while (xp[k] >= xpNeeded(attrs[k]) && attrs[k] < 99) {
      const trial = { ...attrs, [k]: attrs[k] + 1 };
      if (overallOf(trial, s.profile.position) > s.profile.potential) { xp[k] = xpNeeded(attrs[k]) - 1; break; }
      xp[k] -= xpNeeded(attrs[k]);
      attrs[k] += 1;
      gains.push(k);
    }
  }
  return { state: syncWorldPlayer({ ...s, profile: { ...s.profile, attrs, xp } }), gains };
}

export function setTrainingFocus(s: PlayerCareerState, k: AttrKey): PlayerCareerState {
  return { ...s, profile: { ...s.profile, trainingFocus: k } };
}

// ─── Match du joueur ─────────────────────────────────────────────────────────

/** Match en direct de la semaine, préparé avec la compo du coach. */
export function preparePlayerMatch(s: PlayerCareerState): LiveMatch | null {
  const decided = coachDecision(s);
  return prepareMatch(decided.shadow, { autoSubs: true });
}

function summarize(s: PlayerCareerState, before: ManagerState, after: ManagerState): PlayerMatchSummary | null {
  const report = after.lastMatch;
  if (!report || report === before.lastMatch) return null;
  const id = s.profile.id;
  const rating = report.ratings[id] ?? null;
  const goals = report.events.filter(e => e.type === "goal" && e.playerId === id).length;
  const assists = report.events.filter(e => e.type === "goal" && e.assistId === id).length;
  const played = rating !== null;
  const started = played && s.selection === "starter";
  const best = Math.max(...Object.values(report.ratings));
  return { report, played, started, rating, goals, assists, motm: played && rating! >= 7.5 && rating === best };
}

// ─── Semaine ─────────────────────────────────────────────────────────────────

/**
 * Semaine du joueur : décision du coach, match (direct fourni ou simulé),
 * reste de la ligue et du monde, puis effets sur le joueur.
 */
export function playPlayerWeek(s0: PlayerCareerState, live?: LiveMatch | null): PlayerCareerState {
  let s = coachDecision(syncWorldPlayer(s0));
  const before = s.shadow;
  const season = before.world.season;
  // Le coach IA n'est jamais licencié : la carrière suit le joueur, pas l'entraîneur
  const pinned: ManagerState = { ...before, status: "active", board: { ...before.board, confidence: 80 } };
  const after = playWeek(pinned, live);
  s = { ...s, shadow: { ...after, board: { ...after.board, confidence: 80 }, status: "active" } };

  const sum = summarize(s, before, after);
  const messages: InboxMessage[] = [];
  if (sum) {
    s = applyMatch(s, sum, messages);
  } else if (getLeagueSchedule(before) && !getNextFixture(before)) {
    // Intersaison : pas de match
  }

  // Entraînement de la semaine
  const t = trainWeek(s, !!sum?.played, sum?.rating ?? null);
  s = t.state;
  if (t.gains.length) {
    const labels = t.gains.map(k => k.toUpperCase()).join(", ");
    messages.push(pmsg(s, "squad", "Progrès à l'entraînement", `+1 en ${labels}. Note globale : ${overallOf(s.profile.attrs, s.profile.position)}.`));
  }

  s = { ...s, contract: { ...s.contract, role: squadRole(s) } };
  if (after.world.season !== season) s = closePlayerSeason(s, season, messages);
  s = coachDecision(s);
  if (s.selection === "starter" && s0.selection !== "starter") {
    messages.push(pmsg(s, "board", "Titulaire pour le prochain match", "Le coach vous fait confiance : vous démarrez la rencontre."));
  }
  return pushPlayerInbox(s, ...messages);
}

function applyMatch(s: PlayerCareerState, sum: PlayerMatchSummary, messages: InboxMessage[]): PlayerCareerState {
  const club = myClub(s);
  const line = currentSeasonLine(s);
  const nextLine: SeasonLine = sum.played ? {
    ...line,
    apps: line.apps + 1, starts: line.starts + (sum.started ? 1 : 0),
    goals: line.goals + sum.goals, assists: line.assists + sum.assists,
    ratingSum: Math.round((line.ratingSum + (sum.rating ?? 0)) * 10) / 10, motm: line.motm + (sum.motm ? 1 : 0),
  } : line;
  const seasons = [...s.seasons.filter(l => !(l.season === line.season && l.clubId === line.clubId)), nextLine]
    .sort((a, b) => a.season - b.season);

  // Confiance du coach : la note fait tout ; ne pas jouer l'érode lentement
  // Sans jouer, la confiance revient doucement vers un niveau neutre (pas de spirale)
  let dTrust = s.coachTrust < 45 ? 1 : s.coachTrust > 45 ? -1 : 0;
  if (sum.played && sum.rating !== null) dTrust = Math.round((sum.rating - 6.4) * 4) + sum.goals * 2 + sum.assists;
  const coachTrust = clamp(s.coachTrust + dTrust, 0, 100);
  const reputation = clamp(Math.round((s.profile.reputation + (sum.played ? ((sum.rating ?? 6.5) - 6.5) * 1.2 + sum.goals * 0.6 : 0)) * 10) / 10, 1, 100);

  // Moral du joueur dans le monde
  const mine = sum.report.managedSide === "home" ? sum.report.home.goals : sum.report.away.goals;
  const theirs = sum.report.managedSide === "home" ? sum.report.away.goals : sum.report.home.goals;
  const players = s.shadow.world.players.map(p => (p.id === s.profile.id
    ? { ...p, morale: clamp(p.morale + (sum.played ? (sum.rating! >= 7 ? 5 : sum.rating! < 6 ? -4 : 1) : -3) + (mine > theirs ? 2 : mine < theirs ? -2 : 0), 5, 100) }
    : p));

  const opp = s.shadow.world.clubs.find(c => c.id === (sum.report.managedSide === "home" ? sum.report.awayClubId : sum.report.homeClubId));
  const res = mine > theirs ? "Victoire" : mine < theirs ? "Défaite" : "Nul";
  const body = sum.played
    ? `${sum.started ? "Titulaire" : "Entré en jeu"} · note ${sum.rating!.toFixed(1)}${sum.goals ? ` · ${sum.goals} but(s)` : ""}${sum.assists ? ` · ${sum.assists} passe(s) déc.` : ""}${sum.motm ? " · homme du match" : ""}.`
    : s.selection === "bench" ? "Resté sur le banc." : "Pas dans le groupe cette semaine.";
  messages.push(pmsg(s, "match", `${res} ${mine}-${theirs} contre ${opp?.name ?? "l'adversaire"}`, `${body} Confiance du coach : ${coachTrust}/100.`));
  void club;
  return {
    ...s, seasons, coachTrust, lastMatch: sum,
    profile: { ...s.profile, reputation },
    shadow: { ...s.shadow, world: { ...s.shadow.world, players } },
  };
}

// ─── Fin de saison ───────────────────────────────────────────────────────────

function closePlayerSeason(s: PlayerCareerState, endedSeason: number, messages: InboxMessage[]): PlayerCareerState {
  const line = s.seasons.find(l => l.season === endedSeason && l.clubId === s.contract.clubId);
  const p = me(s);
  // Vieillissement : le monde fait vieillir ses joueurs, on suit pour les caractéristiques physiques
  let attrs = { ...s.profile.attrs };
  if (p.age >= 30) {
    const rng = createRng(seedFromString(`${s.shadow.world.seed}-decline-${endedSeason}`));
    attrs = { ...attrs, pac: attrs.pac - rng.int(1, 3), phy: attrs.phy - rng.int(0, 2) };
  }
  const contract = { ...s.contract, seasonsLeft: Math.max(0, s.contract.seasonsLeft - 1) };
  messages.push(pmsg(s, "board", `Bilan de la saison ${endedSeason}`, line
    ? `${line.apps} match(s) dont ${line.starts} titularisation(s), ${line.goals} but(s), ${line.assists} passe(s) décisive(s), note moyenne ${avgRating(line).toFixed(2)}.`
    : "Aucun match joué cette saison."));
  // Convention : seasonsLeft inclut la saison en cours ; à 1, c'est la dernière
  if (contract.seasonsLeft === 1) {
    messages.push(pmsg(s, "finance", "Dernière année de contrat", "Votre contrat se termine à la fin de cette saison. Votre agent peut négocier une prolongation ou chercher un nouveau club."));
  }
  return syncWorldPlayer({ ...s, contract, profile: { ...s.profile, attrs } });
}

// ─── Pilote automatique (tests) ──────────────────────────────────────────────

export function simulatePlayerSeason(s: PlayerCareerState, maxWeeks = 60): PlayerCareerState {
  let cur = s;
  const season = cur.shadow.world.season;
  for (let i = 0; i < maxWeeks && cur.shadow.world.season === season; i++) cur = playPlayerWeek(cur);
  return cur;
}

export function mutateAttrs(s: PlayerCareerState, attrs: Partial<Attrs>): PlayerCareerState {
  return syncWorldPlayer({ ...s, profile: { ...s.profile, attrs: { ...s.profile.attrs, ...attrs } } });
}

export type { PlayerProfile };
