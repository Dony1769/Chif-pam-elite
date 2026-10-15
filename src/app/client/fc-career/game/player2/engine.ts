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
import { ATTR_KEYS, ATTR_LABEL } from "./attributes";
import type { SubAttrs, SubKey } from "./subAttributes";
import {
  ALL_SUBS, GK_SUBS, OVR_WEIGHTS, SUB_GROUPS, SUB_LABEL, ageDecline, faceOf, keySubs, overallFromSubs, subsForTarget, subsFromFace,
} from "./subAttributes";
import type { OptionId } from "./playstyles";
import { PS_BY_ID, emptyPlayStyles, unlockPlayStyles } from "./playstyles";
import { simulateRest, startPlayerLive } from "./live";
import type {
  Foot, PlayerCareerState, PlayerMatchSummary, PlayerProfile, SeasonLine, Selection, SquadRole, TrainingFocus,
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

// ─── Profil : sous-attributs ─────────────────────────────────────────────────

/** Note globale du joueur, calculée depuis ses sous-attributs. */
export const profileOverall = (p: Pick<PlayerProfile, "sub" | "position">) => overallFromSubs(p.sub, p.position);

/**
 * Complète un profil créé avant les sous-attributs (sauvegardes antérieures) :
 * sous-attributs déduits des 6 caractéristiques, pied faible, gestes, PlayStyles.
 */
export function upgradeProfile(s: PlayerCareerState): PlayerCareerState {
  const p = s.profile as PlayerProfile & Partial<Pick<PlayerProfile, "sub" | "subXp" | "weakFoot" | "skillMoves" | "specialXp" | "playStyles">>;
  if (p.sub && p.playStyles && p.specialXp && p.subXp && p.weakFoot) return s;
  const old = p.trainingFocus as string;
  const focus: TrainingFocus = (ATTR_KEYS as string[]).includes(old) ? `group:${old as AttrKey}` : (p.trainingFocus ?? keySubs(p.position)[0]);
  const sub = p.sub ?? subsFromFace(p.attrs, p.position, p.id);
  const profile: PlayerProfile = {
    ...p, sub, attrs: faceOf(sub, p.position), subXp: p.subXp ?? {}, trainingFocus: focus,
    weakFoot: p.weakFoot ?? (p.foot === "both" ? 4 : 3), skillMoves: p.skillMoves ?? defaultSkillMoves(p.position),
    specialXp: p.specialXp ?? { weakFoot: 0, skillMoves: 0 }, playStyles: p.playStyles ?? emptyPlayStyles(),
  };
  return syncWorldPlayer({ ...s, profile });
}

function defaultSkillMoves(pos: WorldPlayerPosition): number {
  return pos === "GK" ? 1 : ["LW", "RW", "AM", "ST"].includes(pos) ? 3 : 2;
}

// ─── Synchronisation profil ↔ monde ──────────────────────────────────────────

/** Recopie note et potentiel du profil dans le joueur du monde (le moteur de match lit le monde). */
export function syncWorldPlayer(s: PlayerCareerState): PlayerCareerState {
  const pr = s.profile;
  const ovr = pr.sub ? overallFromSubs(pr.sub, pr.position) : Math.round((pr.attrs.pac + pr.attrs.sho + pr.attrs.pas + pr.attrs.dri + pr.attrs.def + pr.attrs.phy) / 6);
  const attrs = pr.sub ? faceOf(pr.sub, pr.position) : pr.attrs;
  const players = s.shadow.world.players.map(p => (p.id === pr.id
    ? {
      ...p, overall: ovr, potential: Math.max(pr.potential, ovr), position: pr.position, protected: true, face: attrs,
      weakFoot: pr.weakFoot, skillMoves: pr.skillMoves, playStyles: pr.playStyles?.owned, playStylesPlus: pr.playStyles?.plus,
    }
    : p));
  return { ...s, profile: { ...pr, attrs }, shadow: { ...s.shadow, world: { ...s.shadow.world, players } } };
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
  const sub = subsForTarget(i.position, target, `${i.seed}-${i.firstName}-${i.lastName}`);
  const attrs = faceOf(sub, i.position);
  const potential = clamp(target + rng.int(24, 36), 76, 94);
  const weakFoot = i.foot === "both" ? 4 : rng.int(2, 3);
  const skillMoves = clamp(defaultSkillMoves(i.position) + (rng.chance(0.4) ? 1 : 0), 1, 4);
  const id = `me-${seedFromString(i.seed + i.firstName + i.lastName).toString(36)}`;
  const wp: WorldPlayer = {
    id, clubId: club.id, leagueId: club.leagueId, countryId: club.countryId,
    firstName: i.firstName.trim() || "Joueur", lastName: i.lastName.trim() || "Inconnu", nationality: i.nationality,
    age: 17, position: i.position, overall: overallFromSubs(sub, i.position), potential, protected: true,
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
      position: i.position, attrs, sub, potential, xp: zero, subXp: {}, trainingFocus: keySubs(i.position)[0],
      weakFoot, skillMoves, specialXp: { weakFoot: 0, skillMoves: 0 }, playStyles: emptyPlayStyles(),
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
  const withSel = coachDecision(syncWorldPlayer(base));
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

/** Expérience nécessaire pour gagner un point (plus dur quand la valeur est haute). */
export const xpNeeded = (value: number) => 100 + Math.max(0, value - 50) * 4;
/** Expérience pour une étoile de pied faible ou de gestes techniques. */
export const specialXpNeeded = (stars: number) => 900 + stars * 450;

/** Sous-attributs travaillés par un objectif d'entraînement. */
export function focusSubs(focus: TrainingFocus, pos: WorldPlayerPosition): SubKey[] {
  if (focus === "weakFoot" || focus === "skillMoves") return [];
  if (focus.startsWith("group:")) {
    const g = focus.slice(6) as AttrKey;
    // Un gardien travaille ses gestes de gardien selon la case de sa carte
    if (pos === "GK") return ({ pac: ["gkDiving"], sho: ["gkHandling"], pas: ["gkKicking"], dri: ["gkReflexes"], def: ["gkPositioning"], phy: ["acceleration", "sprintSpeed"] } as Record<AttrKey, SubKey[]>)[g];
    return SUB_GROUPS[g];
  }
  return [focus as SubKey];
}

export function focusLabel(focus: TrainingFocus, pos: WorldPlayerPosition): string {
  if (focus === "weakFoot") return "Pied faible";
  if (focus === "skillMoves") return "Gestes techniques";
  if (focus.startsWith("group:")) return pos === "GK" ? `Famille ${focusSubs(focus, pos).map(k => SUB_LABEL[k]).join(", ")}` : `Famille ${ATTR_LABEL[focus.slice(6) as AttrKey]}`;
  return SUB_LABEL[focus as SubKey];
}

/**
 * Une semaine d'entraînement. L'objectif reçoit l'essentiel de l'expérience
 * (un sous-attribut seul : ×1,6 ; une famille : ×0,6 chacun) ; les autres
 * sous-attributs utiles au poste progressent un peu (×0,15), le reste à peine.
 * L'âge, le temps de jeu, la note et le moral comptent. La note globale ne
 * dépasse jamais le potentiel.
 */
export function trainWeek(s: PlayerCareerState, played: boolean, rating: number | null): { state: PlayerCareerState; gains: SubKey[]; special: ("weakFoot" | "skillMoves")[] } {
  const p = me(s);
  const pr = s.profile;
  const age = p.age;
  const ageF = age <= 19 ? 1.5 : age <= 22 ? 1.25 : age <= 26 ? 1 : age <= 29 ? 0.65 : 0.35;
  const playF = played ? 1.25 + Math.max(0, ((rating ?? 6.5) - 6.5) * 0.2) : 1;
  const moraleF = 0.85 + p.morale / 400;
  const tierF = myClub(s).tier === 1 ? 1.1 : 1;
  const base = 30 * ageF * playF * moraleF * tierF;
  const sub = { ...pr.sub };
  const xp = { ...pr.subXp };
  const gains: SubKey[] = [];
  const special: ("weakFoot" | "skillMoves")[] = [];
  const focus = focusSubs(pr.trainingFocus, pr.position);
  const w = OVR_WEIGHTS[pr.position];
  const isGk = pr.position === "GK";
  for (const k of ALL_SUBS) {
    if (!isGk && GK_SUBS.includes(k)) continue;
    const share = focus.includes(k) ? (focus.length === 1 ? 1.6 : 0.6) : (w[k] ? 0.15 : 0.04);
    xp[k] = (xp[k] ?? 0) + base * share;
    while ((xp[k] ?? 0) >= xpNeeded(sub[k]) && sub[k] < 99) {
      const trial = { ...sub, [k]: sub[k] + 1 };
      if (overallFromSubs(trial, pr.position) > pr.potential) { xp[k] = xpNeeded(sub[k]) - 1; break; }
      xp[k] = (xp[k] ?? 0) - xpNeeded(sub[k]);
      sub[k] += 1;
      gains.push(k);
    }
  }
  let { weakFoot, skillMoves } = pr;
  const sp = { ...pr.specialXp };
  if (pr.trainingFocus === "weakFoot" && weakFoot < 5) {
    sp.weakFoot += base * 1.5;
    if (sp.weakFoot >= specialXpNeeded(weakFoot)) { sp.weakFoot = 0; weakFoot += 1; special.push("weakFoot"); }
  }
  if (pr.trainingFocus === "skillMoves" && skillMoves < 5) {
    sp.skillMoves += base * 1.5;
    if (sp.skillMoves >= specialXpNeeded(skillMoves)) { sp.skillMoves = 0; skillMoves += 1; special.push("skillMoves"); }
  }
  const next = syncWorldPlayer({ ...s, profile: { ...pr, sub, subXp: xp, weakFoot, skillMoves, specialXp: sp } });
  return { state: next, gains, special };
}

export function setTrainingFocus(s: PlayerCareerState, k: TrainingFocus | AttrKey): PlayerCareerState {
  const focus: TrainingFocus = (ATTR_KEYS as string[]).includes(k) ? `group:${k as AttrKey}` : (k as TrainingFocus);
  return { ...s, profile: { ...s.profile, trainingFocus: focus } };
}

/** PlayStyles : ajoute les réussites du match puis débloque ce qui peut l'être. */
export function applyPlayStyleProgress(s: PlayerCareerState, gain: Partial<Record<OptionId, number>> | undefined): { state: PlayerCareerState; news: { title: string; body: string }[] } {
  const pr = s.profile;
  const progress = { ...pr.playStyles.progress };
  for (const [k, n] of Object.entries(gain ?? {}) as [OptionId, number][]) progress[k] = (progress[k] ?? 0) + n;
  const res = unlockPlayStyles({ ...pr.playStyles, progress }, pr.sub, pr.position === "GK", profileOverall(pr));
  const news = res.gained.map(g => ({ title: `${g.plus ? "PlayStyle+" : "PlayStyle"} débloqué : ${PS_BY_ID[g.id].name}`, body: PS_BY_ID[g.id].desc }));
  return { state: syncWorldPlayer({ ...s, profile: { ...pr, playStyles: res.ps } }), news };
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
export function playPlayerWeek(s0: PlayerCareerState, live?: LiveMatch | null, psGain?: Partial<Record<OptionId, number>>): PlayerCareerState {
  let s = coachDecision(syncWorldPlayer(upgradeProfile(s0)));
  // Match simulé : le joueur décide lui-même ses moments clés (sous-attributs et PlayStyles comptent aussi)
  if (!live && (s.selection === "starter" || s.selection === "bench")) {
    const m = preparePlayerMatch(s);
    if (m) {
      const pl = simulateRest(startPlayerLive(m, {
        id: s.profile.id, name: `${s.profile.firstName.charAt(0)}. ${s.profile.lastName}`, attrs: s.profile.attrs, position: s.profile.position,
        sub: s.profile.sub, ps: s.profile.playStyles, weakFoot: s.profile.weakFoot, skillMoves: s.profile.skillMoves,
      }));
      live = pl.match;
      psGain = pl.psGain;
    }
  }
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
  const ovrBefore = profileOverall(s.profile);
  const t = trainWeek(s, !!sum?.played, sum?.rating ?? null);
  s = t.state;
  if (t.gains.length || t.special.length) {
    const counts = new Map<SubKey, number>();
    for (const k of t.gains) counts.set(k, (counts.get(k) ?? 0) + 1);
    const labels = [...counts].map(([k, n]) => `${SUB_LABEL[k]} +${n}`);
    if (t.special.includes("weakFoot")) labels.push(`Pied faible ${s.profile.weakFoot}★`);
    if (t.special.includes("skillMoves")) labels.push(`Gestes techniques ${s.profile.skillMoves}★`);
    const ovr = profileOverall(s.profile);
    messages.push(pmsg(s, "squad", ovr > ovrBefore ? `Note globale : ${ovr} (+${ovr - ovrBefore})` : "Progrès à l'entraînement",
      `${labels.join(", ")}. Note globale : ${ovr}.`));
  }
  // PlayStyles
  const ps = applyPlayStyleProgress(s, sum?.played ? psGain : undefined);
  s = ps.state;
  for (const n of ps.news) messages.push(pmsg(s, "board", n.title, n.body));

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
  // Vieillissement : déclin physique après 30 ans, sous-attribut par sous-attribut
  const rng = createRng(seedFromString(`${s.shadow.world.seed}-decline-${endedSeason}`));
  const sub = ageDecline(s.profile.sub, p.age, () => rng.next());
  const contract = { ...s.contract, seasonsLeft: Math.max(0, s.contract.seasonsLeft - 1) };
  messages.push(pmsg(s, "board", `Bilan de la saison ${endedSeason}`, line
    ? `${line.apps} match(s) dont ${line.starts} titularisation(s), ${line.goals} but(s), ${line.assists} passe(s) décisive(s), note moyenne ${avgRating(line).toFixed(2)}.`
    : "Aucun match joué cette saison."));
  // Convention : seasonsLeft inclut la saison en cours ; à 1, c'est la dernière
  if (contract.seasonsLeft === 1) {
    messages.push(pmsg(s, "finance", "Dernière année de contrat", "Votre contrat se termine à la fin de cette saison. Votre agent peut négocier une prolongation ou chercher un nouveau club."));
  }
  return syncWorldPlayer({ ...s, contract, profile: { ...s.profile, sub } });
}

// ─── Pilote automatique (tests) ──────────────────────────────────────────────

export function simulatePlayerSeason(s: PlayerCareerState, maxWeeks = 60): PlayerCareerState {
  let cur = s;
  const season = cur.shadow.world.season;
  for (let i = 0; i < maxWeeks && cur.shadow.world.season === season; i++) cur = playPlayerWeek(cur);
  return cur;
}

/** Tests : impose des caractéristiques ; les sous-attributs en sont déduits. */
export function mutateAttrs(s: PlayerCareerState, attrs: Partial<Attrs>): PlayerCareerState {
  const face = { ...s.profile.attrs, ...attrs };
  return syncWorldPlayer({ ...s, profile: { ...s.profile, sub: subsFromFace(face, s.profile.position, s.profile.id) } });
}

/** Tests : impose des sous-attributs. */
export function mutateSubs(s: PlayerCareerState, sub: Partial<SubAttrs>): PlayerCareerState {
  return syncWorldPlayer({ ...s, profile: { ...s.profile, sub: { ...s.profile.sub, ...sub } } });
}

export type { PlayerProfile };
