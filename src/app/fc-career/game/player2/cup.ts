/**
 * FC CAREER 27 — Carrière Joueur v2 : matchs de coupe et de sélection jouables.
 *
 * Coupes nationales, CP Ligue des champions, CP Ligue Europa (avec le club) et
 * CP Euro, CP Coupe du monde (avec la sélection) : le match du joueur se joue
 * en direct avec les moments clés, comme en championnat. Le résultat est
 * imposé au monde (`forcedTies`) : la compétition continue avec ce score.
 * Sans direct, le match est joué automatiquement (le joueur décide seul).
 */

import type { WorldPlayer } from "../data/worldPlayers";
import { FORMATIONS, aiTacticFor, autoPickLineup, isAvailable } from "../manager/tactics";
import { finishMatch, initMatch, simulateToEnd } from "../manager/matchSim";
import type { LiveMatch, MatchTeamInput } from "../manager/matchSim";
import { sheetFromLive } from "../domain/matchSheet";
import { nationSquad, teamName, teamTiesThisWeek } from "../domain/competitions";
import type { ForcedTie, TeamTie } from "../domain/competitions";
import { formatDate, matchDate } from "../domain/calendar";
import { NATION_BY_ID } from "../data/cp/nations";
import { createRng, seedFromString } from "../utils/random";
import { shortName } from "../utils/names";
import type { OptionId } from "./playstyles";
import type { PlayerCareerState, SeasonLine } from "./types";
import { simulateRest, startPlayerLive } from "./live";
import {
  POS_LABEL, applyPlayStyleProgress, effSubs, coachDecision, currentSeasonLine, emptyTally, myClub, pmsg, pushPlayerInbox,
} from "./engine";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export interface CupMatch extends TeamTie {
  /** Équipe du joueur : son club ou sa sélection */
  team: string;
  national: boolean;
  side: "home" | "away";
  opponent: string;
  /** Statut du joueur pour ce match */
  selection: "starter" | "bench" | "out";
}

/** Le joueur fait-il partie de la sélection de son pays (23 meilleurs) ? */
function nationalPick(s: PlayerCareerState): WorldPlayer[] | null {
  const nat = s.shadow.world.players.find(p => p.id === s.profile.id)?.nationality ?? s.profile.nationality;
  if (!NATION_BY_ID[nat]) return null;
  const squad = nationSquad(s.shadow.world, nat);
  return squad.some(p => p.id === s.profile.id) ? squad : null;
}

function teamInput(s: PlayerCareerState, team: string, national: boolean): MatchTeamInput & { me: "starter" | "bench" | "out" } {
  const w = s.shadow.world;
  if (!national && team === myClub(s).id) {
    const d = coachDecision(s);
    const byId = new Map(w.players.map(p => [p.id, p]));
    const me = d.selection === "starter" ? "starter" : d.selection === "bench" ? "bench" : "out";
    return {
      clubId: team, name: myClub(s).name, tactic: d.shadow.tactic, autoSubs: true, me,
      starters: d.shadow.lineup.starters.map(id => byId.get(id)!).filter(Boolean),
      bench: d.shadow.lineup.bench.map(id => byId.get(id)!).filter(p => p && isAvailable(p)),
    };
  }
  const squad = national ? nationSquad(w, team) : w.players.filter(p => p.clubId === team);
  const club = w.clubs.find(c => c.id === team);
  const tactic = aiTacticFor(club?.philosophy ?? "balanced");
  const lineup = autoPickLineup(squad, tactic.formation);
  const byId = new Map(squad.map(p => [p.id, p]));
  const me = lineup.starters.includes(s.profile.id) ? "starter" : lineup.bench.includes(s.profile.id) ? "bench" : "out";
  return {
    clubId: team, name: teamName(w, team), tactic, autoSubs: true, me,
    starters: lineup.starters.map(id => byId.get(id)!).filter(Boolean),
    bench: lineup.bench.map(id => byId.get(id)!).filter(Boolean),
  };
}

/** Prochain match de coupe ou de sélection du joueur cette semaine (non joué). */
export function myCupMatch(s: PlayerCareerState): CupMatch | null {
  const w = s.shadow.world;
  if (w.dataset !== "cp" || s.retired) return null;
  const week = w.currentWeek;
  const nation = nationalPick(s) ? (w.players.find(p => p.id === s.profile.id)?.nationality ?? s.profile.nationality) : null;
  const candidates: { t: TeamTie; team: string; national: boolean }[] = [
    ...teamTiesThisWeek(w, myClub(s).id, week).map(t => ({ t, team: myClub(s).id, national: false })),
    ...(nation ? teamTiesThisWeek(w, nation, week).map(t => ({ t, team: nation, national: true })) : []),
  ];
  const first = candidates[0];
  if (!first) return null;
  const side = first.t.tie.home === first.team ? "home" : "away";
  const mine = teamInput(s, first.team, first.national);
  const injured = s.shadow.world.players.find(p => p.id === s.profile.id)?.injury;
  return {
    ...first.t, team: first.team, national: first.national, side,
    opponent: side === "home" ? first.t.tie.away : first.t.tie.home,
    selection: injured && injured.weeksRemaining > 0 ? "out" : mine.me,
  };
}

/** Libellé court : « CP FA Cup · Huitièmes de finale ». */
/** Date du match : mardi/mercredi pour les coupes de clubs, week-end pour les sélections. */
export function cupDate(s: PlayerCareerState, cm: Pick<CupMatch, "national">): string | null {
  const w = s.shadow.world;
  if (!w.startYear) return null;
  return formatDate(matchDate(w.startYear + w.season - 1, w.currentWeek, !cm.national));
}

export const cupLabel = (cm: Pick<CupMatch, "comp" | "stage">) => `${cm.comp.name} · ${cm.stage}`;

/** Match en direct prêt à démarrer. */
export function prepareCupMatch(s: PlayerCareerState, cm: CupMatch): LiveMatch {
  const mine = teamInput(s, cm.team, cm.national);
  const theirs = teamInput(s, cm.opponent, cm.national);
  return initMatch({
    fixtureId: `cup:${cm.key}`, season: s.shadow.world.season, matchday: 0,
    seed: `${s.shadow.world.seed}-cuplive-${cm.key}`,
    home: cm.side === "home" ? mine : theirs, away: cm.side === "home" ? theirs : mine,
    managedSide: cm.side,
  });
}

export function startCupLive(s: PlayerCareerState, cm: CupMatch) {
  const m = prepareCupMatch(s, cm);
  const slot = (cm.side === "home" ? m.home : m.away).pitch.findIndex(p => p?.id === s.profile.id);
  const formation = (cm.side === "home" ? m.home : m.away).tactic.formation;
  const pos = slot >= 0 ? FORMATIONS[formation][slot]?.pos ?? s.profile.position : s.profile.position;
  return startPlayerLive(m, {
    id: s.profile.id, name: shortName(s.profile), attrs: s.profile.attrs, position: pos,
    sub: effSubs(s.profile), ps: s.profile.playStyles, weakFoot: s.profile.weakFoot, skillMoves: s.profile.skillMoves,
  });
}

/** Tirs au but : le joueur tire (et réussit selon sa finition), le reste est aléatoire. */
function shootout(s: PlayerCareerState, cm: CupMatch, mySide: "home" | "away"): { pens: [number, number]; scored: boolean } {
  const rng = createRng(seedFromString(`${s.shadow.world.seed}-pens-${cm.key}`));
  const skill = s.profile.position === "GK" ? 60 : (s.profile.sub.penalties ?? 60);
  const scored = rng.chance(clamp(0.55 + (skill - 60) / 100, 0.5, 0.95));
  let mine = (scored ? 1 : 0) + [0, 1, 2, 3].filter(() => rng.chance(0.76)).length;
  let theirs = [0, 1, 2, 3, 4].filter(() => rng.chance(0.76)).length;
  while (mine === theirs) { mine += rng.chance(0.75) ? 1 : 0; theirs += rng.chance(0.75) ? 1 : 0; }
  return { pens: mySide === "home" ? [mine, theirs] : [theirs, mine], scored };
}

/**
 * Applique un match de coupe joué (en direct ou automatiquement) : résultat
 * imposé au monde, statistiques et progression du joueur, message.
 */
export function applyCupMatch(s0: PlayerCareerState, cm: CupMatch, live: LiveMatch, psGain?: Partial<Record<OptionId, number>>): PlayerCareerState {
  const done = live.finished ? live : simulateToEnd(live);
  const report = finishMatch(done);
  const w = s0.shadow.world;
  const id = s0.profile.id;
  const rating = report.ratings[id] ?? null;
  const played = rating !== null;
  const goals = report.events.filter(e => e.type === "goal" && e.playerId === id).length;
  const assists = report.events.filter(e => e.type === "goal" && e.assistId === id).length;
  const hs = report.home.goals, as = report.away.goals;
  const sh = cm.knockout && hs === as ? shootout(s0, cm, cm.side) : null;

  // Statistiques des deux équipes pour le monde (identifiant de la compétition)
  const byPlayer = new Map<string, { goals: number; assists: number; clubId: string }>();
  const clubOfPlayer = (pid: string) => (done.home.appeared.includes(pid) ? done.home.clubId : done.away.clubId);
  for (const pid of [...done.home.appeared, ...done.away.appeared]) byPlayer.set(pid, { goals: 0, assists: 0, clubId: clubOfPlayer(pid) });
  for (const e of report.events) {
    if (e.type !== "goal") continue;
    if (e.playerId && byPlayer.has(e.playerId)) byPlayer.get(e.playerId)!.goals++;
    if (e.assistId && byPlayer.has(e.assistId)) byPlayer.get(e.assistId)!.assists++;
  }
  const forced: ForcedTie = {
    hs, as, pens: sh?.pens, sheet: sheetFromLive(done, report, cm.comp.id),
    stats: [...byPlayer].map(([playerId, v]) => ({ playerId, clubId: w.players.find(p => p.id === playerId)?.clubId ?? v.clubId, leagueId: cm.comp.id, goals: v.goals, assists: v.assists })),
  };
  // Match en semaine : de la fatigue pour le week-end (le coach peut faire tourner)
  const players = played ? w.players.map(p => (p.id === id ? { ...p, fatigue: Math.min(100, p.fatigue + (cm.selection === "starter" ? 14 : 6)) } : p)) : w.players;
  let s: PlayerCareerState = { ...s0, shadow: { ...s0.shadow, world: { ...w, players, forcedTies: { ...(w.forcedTies ?? {}), [cm.key]: forced } } } };

  const mine = cm.side === "home" ? hs : as, theirs = cm.side === "home" ? as : hs;
  const won = mine > theirs || (sh !== null && (cm.side === "home" ? sh.pens[0] > sh.pens[1] : sh.pens[1] > sh.pens[0]));
  const drawn = mine === theirs && !sh;
  const final = cm.knockout && cm.stage === "Finale";
  const weight = cm.national ? 1.6 : cm.comp.kind === "continental" ? 1.4 : 1;

  if (played) {
    // Club : la ligne de saison compte toutes les compétitions ; sélection : sélections et buts
    if (!cm.national) {
      const line = currentSeasonLine(s);
      const next: SeasonLine = {
        ...line, apps: line.apps + 1, starts: line.starts + (cm.selection === "starter" ? 1 : 0), goals: line.goals + goals, assists: line.assists + assists,
        ratingSum: Math.round((line.ratingSum + rating!) * 10) / 10,
      };
      s = { ...s, seasons: [...s.seasons.filter(l => !(l.season === line.season && l.clubId === line.clubId)), next].sort((a, b) => a.season - b.season) };
    } else if (s.career) {
      const nat = s.career.national;
      s = { ...s, career: { ...s.career, national: { ...nat, called: true, caps: nat.caps + 1, goals: nat.goals + goals } } };
    }
    if (s.career) {
      const t = s.career.tally ?? emptyTally();
      s = { ...s, career: { ...s.career, tally: {
        ...t, apps: t.apps + 1, starts: t.starts + (cm.selection === "starter" ? 1 : 0), goals: t.goals + goals, assists: t.assists + assists,
        cleanSheets: t.cleanSheets + (cm.selection === "starter" && theirs === 0 ? 1 : 0),
        bigGames: t.bigGames + (rating! >= 7.3 && (cm.comp.kind !== "cup" || final) ? 1 : 0), ratingSum: Math.round((t.ratingSum + rating!) * 10) / 10,
      } } };
    }
    const dTrust = cm.national ? 0 : Math.round((rating! - 6.4) * 3) + goals * 2 + assists;
    const rep = (rating! - 6.5) * 1.2 * weight + goals * 0.8 * weight + (won && final ? 4 * weight : 0);
    s = { ...s, coachTrust: clamp(s.coachTrust + dTrust, 0, 100), profile: { ...s.profile, reputation: clamp(Math.round((s.profile.reputation + rep) * 10) / 10, 1, 100) } };
    const ps = applyPlayStyleProgress(s, psGain);
    s = ps.state;
    if (ps.news.length) s = pushPlayerInbox(s, ...ps.news.map(n => pmsg(s, "board", n.title, n.body)));
  }

  const opp = teamName(w, cm.opponent);
  const score = `${mine}-${theirs}${sh ? ` (t.a.b. ${cm.side === "home" ? `${sh.pens[0]}-${sh.pens[1]}` : `${sh.pens[1]}-${sh.pens[0]}`})` : ""}`;
  const res = won ? (final ? "Vainqueur" : "Qualifié") : drawn ? "Nul" : cm.knockout ? "Éliminé" : "Défaite";
  const mePart = played
    ? `${cm.selection === "starter" ? "Titulaire" : "Entré en jeu"} · note ${rating!.toFixed(1)}${goals ? ` · ${goals} but(s)` : ""}${assists ? ` · ${assists} passe(s) déc.` : ""}${sh ? (sh.scored ? " · tir au but réussi" : " · tir au but manqué") : ""}.`
    : cm.selection === "bench" ? "Resté sur le banc." : "Pas dans le groupe.";
  const title = cm.knockout ? `${res} ${score} contre ${opp}` : `${mine > theirs ? "Victoire" : mine < theirs ? "Défaite" : "Nul"} ${score} contre ${opp}`;
  return pushPlayerInbox(s, pmsg(s, "match", `${cupLabel(cm)} : ${title}`, mePart));
}

/** Joue automatiquement le match de coupe du joueur (il décide seul de ses moments clés). */
export function autoPlayCup(s: PlayerCareerState, cm: CupMatch): PlayerCareerState {
  if (cm.selection === "out") return applyCupMatch(s, cm, prepareCupMatch(s, cm));
  const pl = simulateRest(startCupLive(s, cm));
  return applyCupMatch(s, cm, pl.match, pl.psGain);
}

/** Tous les matchs de coupe restants de la semaine joués automatiquement. */
export function autoPlayCupsThisWeek(s0: PlayerCareerState): PlayerCareerState {
  let s = s0;
  for (let i = 0; i < 4; i++) {
    const cm = myCupMatch(s);
    if (!cm) break;
    s = autoPlayCup(s, cm);
  }
  return s;
}

export { POS_LABEL };
