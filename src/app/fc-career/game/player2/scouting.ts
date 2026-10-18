/**
 * FC CAREER 27 — Carrière Joueur v2 : recruteurs et objectifs.
 *
 * Un club ne fait plus d'offre d'un coup : il commence par suivre le joueur et
 * fixe des objectifs à remplir avant le prochain mercato (buts, passes,
 * clean sheets, matchs décisifs contre le top 6, sous-attribut, note
 * moyenne…). Les objectifs dépendent du poste du joueur et de l'écart de
 * niveau avec le club. Objectifs remplis : l'offre arrive à l'ouverture du
 * mercato. Échéance dépassée : le club passe à autre chose.
 */

import { squadStrength } from "../manager/engine";
import { SEASON_WEEKS, WINTER_WINDOW, SUMMER_WINDOW, transferWindow } from "../domain/calendar";
import { createRng, seedFromString } from "../utils/random";
import type { WorldPlayerPosition } from "../data/worldPlayers";
import { diffOf } from "./difficulty";
import { SUB_LABEL, keySubs, GK_SUBS } from "./subAttributes";
import type { ClubInterest, ClubOffer, PlayerCareerState, ScoutObjective, Tally } from "./types";
import { avgRating, emptyTally, me, myClub, pmsg, pushPlayerInbox } from "./engine";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const weekIndex = (s: PlayerCareerState) => s.shadow.world.season * 100 + s.shadow.world.currentWeek;
/** Semaines entre deux index absolus (52 semaines par saison). */
export const weeksBetween = (a: number, b: number) => (Math.floor(b / 100) - Math.floor(a / 100)) * SEASON_WEEKS + (b % 100) - (a % 100);

export const MAX_INTERESTS = 3;
/** Suivi minimum avant l'échéance (sinon, échéance au mercato suivant). */
const MIN_WEEKS = 8;

const ATTACK: WorldPlayerPosition[] = ["ST", "LW", "RW", "AM"];
const MIDFIELD: WorldPlayerPosition[] = ["CM", "DM"];

export const tallyOf = (s: PlayerCareerState): Tally => s.career?.tally ?? emptyTally();

/** Fin du prochain mercato laissant au moins MIN_WEEKS semaines de suivi. */
export function nextDeadline(now: number): number {
  const season = Math.floor(now / 100);
  const candidates = [season * 100 + WINTER_WINDOW[1], (season + 1) * 100 + SUMMER_WINDOW[1], (season + 1) * 100 + WINTER_WINDOW[1], (season + 2) * 100 + SUMMER_WINDOW[1]];
  return candidates.find(c => weeksBetween(now, c) >= MIN_WEEKS)!;
}

/** Libellé d'un objectif. */
export function objectiveLabel(o: ScoutObjective): string {
  switch (o.kind) {
    case "goals": return `Marquer ${o.target} but${o.target > 1 ? "s" : ""}`;
    case "assists": return `Délivrer ${o.target} passe${o.target > 1 ? "s" : ""} décisive${o.target > 1 ? "s" : ""}`;
    case "cleanSheets": return `${o.target} clean sheet${o.target > 1 ? "s" : ""} comme titulaire`;
    case "starts": return `${o.target} titularisation${o.target > 1 ? "s" : ""}`;
    case "bigGames": return `${o.target} match${o.target > 1 ? "s" : ""} à 7,3+ contre le top 6`;
    case "rating": return `Note moyenne de ${o.target.toFixed(1).replace(".", ",")} (5 matchs min.)`;
    case "sub": return `${SUB_LABEL[o.sub!]} à ${o.target}`;
    case "overall": return `Note globale de ${o.target}`;
  }
}

/** Avancement d'un objectif : valeur actuelle et cible. */
export function objectiveProgress(s: PlayerCareerState, it: ClubInterest, o: ScoutObjective): { value: number; target: number; done: boolean } {
  const t = tallyOf(s);
  const b = it.base;
  let value = 0;
  switch (o.kind) {
    case "goals": value = t.goals - b.goals; break;
    case "assists": value = t.assists - b.assists; break;
    case "cleanSheets": value = t.cleanSheets - b.cleanSheets; break;
    case "starts": value = t.starts - b.starts; break;
    case "bigGames": value = t.bigGames - b.bigGames; break;
    case "rating": {
      const apps = t.apps - b.apps;
      value = apps ? Math.round(((t.ratingSum - b.ratingSum) / apps) * 100) / 100 : 0;
      return { value, target: o.target, done: apps >= 5 && value >= o.target };
    }
    case "sub": value = s.profile.sub[o.sub!] ?? 0; break;
    case "overall": value = me(s).overall; break;
  }
  return { value, target: o.target, done: value >= o.target };
}

export const interestDone = (s: PlayerCareerState, it: ClubInterest) => it.objectives.every(o => objectiveProgress(s, it, o).done);

/**
 * Objectifs d'un club : selon le poste et l'écart entre le niveau de son
 * effectif et la note du joueur. Plus le club est fort, plus c'est exigeant.
 */
export function buildObjectives(s: PlayerCareerState, clubStrength: number, weeks: number, seed: string): ScoutObjective[] {
  const rng = createRng(seedFromString(seed));
  const pos = s.playedAs ?? s.profile.position;
  const ovr = me(s).overall;
  const gap = clamp(clubStrength - ovr, -6, 10);
  // Matchs de championnat attendus d'ici l'échéance (hors intersaison)
  const games = clamp(Math.round(weeks * 0.8), 6, 30);
  const hard = (1 + Math.max(0, gap) * 0.06) * diffOf(s.difficulty).scout;
  const out: ScoutObjective[] = [];
  const add = (o: ScoutObjective) => { if (!out.some(x => x.kind === o.kind && x.sub === o.sub)) out.push(o); };

  if (pos === "GK") {
    add({ kind: "cleanSheets", target: clamp(Math.round(games * 0.3 * hard), 2, 14) });
  } else if (ATTACK.includes(pos)) {
    const rate = pos === "ST" ? 0.42 : pos === "AM" ? 0.25 : 0.3;
    add({ kind: "goals", target: clamp(Math.round(games * rate * hard), 2, 25) });
    if (pos !== "ST" || rng.chance(0.25)) add({ kind: "assists", target: clamp(Math.round(games * (pos === "ST" ? 0.12 : 0.2) * hard), 1, 15) });
  } else if (MIDFIELD.includes(pos)) {
    add({ kind: pos === "CM" ? "assists" : "starts", target: pos === "CM" ? clamp(Math.round(games * 0.15 * hard), 1, 12) : clamp(Math.round(games * 0.7), 4, 22) });
    if (pos === "CM" && rng.chance(0.5)) add({ kind: "goals", target: clamp(Math.round(games * 0.08 * hard), 1, 8) });
  } else {
    add({ kind: "cleanSheets", target: clamp(Math.round(games * 0.28 * hard), 2, 12) });
    if ((pos === "LB" || pos === "RB") && rng.chance(0.5)) add({ kind: "assists", target: clamp(Math.round(games * 0.1 * hard), 1, 8) });
  }

  // Sous-attribut clé du poste, un cran au-dessus
  const keys = keySubs(pos).filter(k => (pos === "GK" || !GK_SUBS.includes(k)) && (s.profile.sub[k] ?? 0) < 97).slice(0, 4);
  if (keys.length && (gap >= 0 || rng.chance(0.5))) {
    const k = keys[rng.int(0, keys.length - 1)];
    add({ kind: "sub", sub: k, target: clamp((s.profile.sub[k] ?? 0) + clamp(Math.round(1 + gap / 4), 1, 3), 1, 99) });
  }
  // Grands clubs : décisif contre les meilleurs, ou une note globale plus haute
  if (gap >= 4) add(gap < 6 || rng.chance(0.5) ? { kind: "bigGames", target: gap >= 8 ? 2 : 1 } : { kind: "overall", target: Math.min(99, ovr + clamp(Math.round(gap / 4), 1, 2)) });
  // Note moyenne exigée
  if (out.length < 2 || gap >= 6) add({ kind: "rating", target: Math.round(clamp(6.6 + gap * 0.06, 6.5, 7.3) * 10) / 10 });
  return out.slice(0, gap >= 7 ? 4 : 3);
}

/** Un nouveau club commence à suivre le joueur (au plus une fois par semaine). */
export function maybeNewInterest(s: PlayerCareerState): PlayerCareerState {
  const c = s.career!;
  if (s.shadow.world.dataset !== "cp" || c.loan || c.freeAgentSince !== null || s.retired) return s;
  const interests = c.interests ?? [];
  if (interests.length >= MAX_INTERESTS) return s;
  const now = weekIndex(s);
  const rng = createRng(seedFromString(`${s.shadow.world.seed}-scout-${now}-${s.profile.id}`));
  const line = s.seasons.find(l => l.season === s.shadow.world.season);
  const form = line && line.apps >= 3 ? avgRating(line) : 6.5;
  const chance = clamp(0.08 + (form - 6.5) * 0.12 + s.profile.reputation / 500 + (c.transferRequested ? 0.18 : 0), 0.04, 0.45);
  if (!rng.chance(chance)) return s;

  const cur = myClub(s);
  const ovr = me(s).overall;
  const taken = new Set([...interests.map(i => i.clubId), ...c.offers.map(o => o.clubId), cur.id]);
  const pool = s.shadow.world.clubs.filter(cl => !taken.has(cl.id)).map(cl => ({ cl, str: squadStrength(s.shadow.world, cl.id) }));
  const best = Math.max(...pool.map(p => p.str));
  const ambitious = pool.filter(p => p.str >= Math.min(ovr - 4, best - 5) && p.str <= ovr + 10 && (p.cl.reputation >= cur.reputation - 8 || c.transferRequested));
  if (!ambitious.length) return s;
  // Surtout des clubs un peu au-dessus de son niveau ; les géants seulement pour un joueur réputé
  const aim = ovr + 2;
  const elite = s.profile.reputation >= 60 && rng.chance(0.3);
  const sorted = elite
    ? ambitious.sort((a, b) => b.cl.reputation - a.cl.reputation)
    : ambitious.sort((a, b) => Math.abs(a.str - aim) - Math.abs(b.str - aim));
  const pick = sorted[rng.int(0, Math.min(sorted.length - 1, 5))];
  const deadline = nextDeadline(now);
  const weeks = weeksBetween(now, deadline);
  const objectives = buildObjectives(s, pick.str, weeks, `${s.shadow.world.seed}-obj-${pick.cl.id}-${now}`);
  const it: ClubInterest = {
    id: `int-${pick.cl.id}-${now}`, clubId: pick.cl.id, since: now, deadline, role: "rotation",
    objectives, base: tallyOf(s), ready: false,
  };
  const window = deadline % 100 === WINTER_WINDOW[1] ? "du mercato d'hiver" : "du mercato d'été";
  const next = { ...s, career: { ...c, interests: [...interests, it] } };
  return pushPlayerInbox(next, pmsg(next, "finance", `${pick.cl.name} vous observe`,
    `Un recruteur de ${pick.cl.name} suit vos matchs. Pour recevoir une offre avant la fin ${window}, il faut : ${objectives.map(objectiveLabel).join(" ; ")}.${objectives.some(o => o.kind === "sub") ? " Pensez à travailler le sous-attribut demandé à l'entraînement." : ""}`));
}

/**
 * Suivi hebdomadaire : objectifs remplis → offre au mercato ; échéance
 * dépassée → le club abandonne. Retourne aussi les offres créées.
 */
export function updateInterests(s: PlayerCareerState, roleAt: (clubId: string) => ClubOffer["role"], makeOffer: (clubId: string, role: ClubOffer["role"]) => ClubOffer): PlayerCareerState {
  const c = s.career!;
  const interests = c.interests ?? [];
  if (!interests.length) return s;
  const now = weekIndex(s);
  const open = transferWindow(s.shadow.world.currentWeek) !== null;
  const keep: ClubInterest[] = [];
  const offers: ClubOffer[] = [];
  const msgs = [];
  for (const it0 of interests) {
    const club = s.shadow.world.clubs.find(x => x.id === it0.clubId);
    if (!club || club.id === myClub(s).id) continue;
    const it = { ...it0, role: roleAt(it0.clubId) };
    const done = it.ready || interestDone(s, it);
    if (done && !it.ready) {
      msgs.push(pmsg(s, "finance", `Objectifs remplis pour ${club.name}`, open
        ? `${club.name} est convaincu : son offre arrive.`
        : `${club.name} est convaincu. Son offre arrivera à l'ouverture du mercato, à condition de rester performant.`));
    }
    if (done && open && !c.loan) {
      offers.push(makeOffer(it.clubId, it.role));
      continue;
    }
    if (!done && now > it.deadline) {
      msgs.push(pmsg(s, "finance", `${club.name} abandonne la piste`, "Les objectifs fixés par le recruteur n'ont pas été remplis à temps."));
      continue;
    }
    // Objectifs remplis hors mercato : l'intérêt tient jusqu'au mercato suivant
    keep.push(done ? { ...it, ready: true, deadline: Math.max(it.deadline, nextDeadline(now)) } : it);
  }
  const next = { ...s, career: { ...c, interests: keep, offers: [...c.offers, ...offers] } };
  return msgs.length ? pushPlayerInbox(next, ...msgs) : next;
}
