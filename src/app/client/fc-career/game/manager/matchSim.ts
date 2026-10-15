/**
 * FC CAREER 27 — Mode Manager : moteur de match minute par minute.
 *
 * Conçu en pas-à-pas (initMatch → simulateMinute × 90 → finishMatch) pour que
 * l'interface puisse afficher le direct et que le manager change sa tactique
 * ou fasse des remplacements entre deux minutes.
 * Déterministe : graine du match + minute → mêmes événements.
 */

import type { WorldPlayer } from "../data/worldPlayers";
import { createRng, seedFromString } from "../utils/random";
import type { Rng } from "../utils/random";
import type { ManagerMatchReport, MatchEvent, Tactic } from "./types";
import {
  FORMATIONS, computeTeamRatings, effectiveRating, styleMatchup, tacticalProfile,
} from "./tactics";

export const MAX_SUBS = 5;

export interface MatchTeamInput {
  clubId: string;
  name: string;
  /** Titulaires dans l'ordre des slots de la formation */
  starters: WorldPlayer[];
  bench: WorldPlayer[];
  tactic: Tactic;
  /** Remplacements automatiques (toujours vrai pour l'IA) */
  autoSubs: boolean;
}

export interface LiveTeam {
  clubId: string;
  name: string;
  tactic: Tactic;
  autoSubs: boolean;
  /** Joueur par slot ; null = slot vidé par un carton rouge */
  pitch: (WorldPlayer | null)[];
  bench: WorldPlayer[];
  subsUsed: number;
  /** Fatigue en cours de match par joueur (part de la fatigue initiale) */
  fatigue: Record<string, number>;
  yellows: string[];
  sentOff: string[];
  injured: string[];
  /** Joueurs ayant joué (titulaires + entrants) */
  appeared: string[];
  goals: number;
  shots: number;
  shotsOnTarget: number;
  xg: number;
  possessionMinutes: number;
  saves: number;
}

export interface LiveMatch {
  seed: string;
  fixtureId: string;
  season: number;
  matchday: number;
  minute: number;
  home: LiveTeam;
  away: LiveTeam;
  events: MatchEvent[];
  managedSide: "home" | "away";
  finished: boolean;
}

const HOME_ADVANTAGE = 1.09;

function makeTeam(t: MatchTeamInput): LiveTeam {
  const fatigue: Record<string, number> = {};
  for (const p of [...t.starters, ...t.bench]) fatigue[p.id] = p.fatigue;
  return {
    clubId: t.clubId, name: t.name, tactic: t.tactic, autoSubs: t.autoSubs,
    pitch: [...t.starters], bench: [...t.bench], subsUsed: 0, fatigue,
    yellows: [], sentOff: [], injured: [], appeared: t.starters.map(p => p.id),
    goals: 0, shots: 0, shotsOnTarget: 0, xg: 0, possessionMinutes: 0, saves: 0,
  };
}

export function initMatch(input: {
  fixtureId: string; season: number; matchday: number; seed: string;
  home: MatchTeamInput; away: MatchTeamInput; managedSide: "home" | "away";
}): LiveMatch {
  return {
    seed: input.seed, fixtureId: input.fixtureId, season: input.season, matchday: input.matchday,
    minute: 0, home: makeTeam(input.home), away: makeTeam(input.away),
    events: [], managedSide: input.managedSide, finished: false,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const name = (p: WorldPlayer) => `${p.firstName.charAt(0)}. ${p.lastName}`;

/** Copie de travail : la minute modifie une copie, jamais l'état reçu. */
function cloneTeam(t: LiveTeam): LiveTeam {
  return {
    ...t, pitch: [...t.pitch], bench: [...t.bench], fatigue: { ...t.fatigue },
    yellows: [...t.yellows], sentOff: [...t.sentOff], injured: [...t.injured], appeared: [...t.appeared],
  };
}

/** Joueurs en jeu avec leur fatigue de match appliquée. */
function pitchSnapshot(t: LiveTeam): (WorldPlayer | null)[] {
  return t.pitch.map(p => (p ? { ...p, fatigue: t.fatigue[p.id] ?? p.fatigue } : null));
}

function ratingsOf(t: LiveTeam) {
  // Un slot vide (rouge, blessé sans remplaçant) compte comme un joueur très faible
  return computeTeamRatings(pitchSnapshot(t), t.tactic.formation);
}

function weightedPick<T>(items: T[], weight: (t: T) => number, rng: Rng): T | null {
  const total = items.reduce((s, it) => s + Math.max(0, weight(it)), 0);
  if (total <= 0) return null;
  let r = rng.float(0, total);
  for (const it of items) {
    r -= Math.max(0, weight(it));
    if (r <= 0) return it;
  }
  return items[items.length - 1] ?? null;
}

const LINE_SHOT_WEIGHT = { GK: 0, DEF: 0.5, MID: 2, ATT: 5 } as const;
const LINE_ASSIST_WEIGHT = { GK: 0.1, DEF: 1, MID: 4, ATT: 3 } as const;

// ─── Remplacements ───────────────────────────────────────────────────────────

/**
 * Remplace un joueur sur le terrain par un remplaçant. Retourne le match inchangé
 * si le remplacement est impossible (quota atteint, joueur absent, exclu…).
 */
export function applySubstitution(m: LiveMatch, side: "home" | "away", outId: string, inId: string): LiveMatch {
  const team = m[side];
  if (team.subsUsed >= MAX_SUBS || m.finished) return m;
  const slot = team.pitch.findIndex(p => p?.id === outId);
  const incoming = team.bench.find(p => p.id === inId);
  if (slot < 0 || !incoming) return m;
  const out = team.pitch[slot]!;
  const t = cloneTeam(team);
  t.pitch[slot] = incoming;
  t.bench = t.bench.filter(p => p.id !== inId);
  t.subsUsed += 1;
  if (!t.appeared.includes(inId)) t.appeared.push(inId);
  const ev: MatchEvent = {
    minute: Math.max(1, m.minute), type: "sub", side, playerId: outId, inPlayerId: inId,
    text: `Changement ${t.name} : ${name(incoming)} remplace ${name(out)}.`,
  };
  return { ...m, [side]: t, events: [...m.events, ev] };
}

export function changeTactic(m: LiveMatch, side: "home" | "away", tactic: Tactic): LiveMatch {
  if (m.finished) return m;
  const team = m[side];
  // Changer de formation garde les mêmes joueurs dans le même ordre de slots
  if (FORMATIONS[tactic.formation].length !== team.pitch.length) return m;
  return { ...m, [side]: { ...team, tactic } };
}

/** Remplacement automatique : joueur le plus fatigué ou blessé → meilleur remplaçant de la même ligne. */
function autoSubstitute(m: LiveMatch, side: "home" | "away", forceSlot?: number): LiveMatch {
  const team = m[side];
  if (team.subsUsed >= MAX_SUBS || team.bench.length === 0) return m;
  const slots = FORMATIONS[team.tactic.formation];
  let slot = forceSlot ?? -1;
  if (slot < 0) {
    let worst = 74; // ne remplace que si fatigue de match > 74
    team.pitch.forEach((p, i) => {
      if (!p || slots[i].line === "GK") return;
      const f = team.fatigue[p.id] ?? 0;
      if (f > worst) { worst = f; slot = i; }
    });
  }
  if (slot < 0) return m;
  const out = team.pitch[slot];
  if (!out) return m;
  const pos = slots[slot].pos;
  const best = [...team.bench]
    .filter(p => !p.injury || p.injury.weeksRemaining <= 0)
    .sort((a, b) => effectiveRating(b, pos) - effectiveRating(a, pos))[0];
  if (!best) return m;
  return applySubstitution(m, side, out.id, best.id);
}

// ─── Une minute de jeu ───────────────────────────────────────────────────────

export function simulateMinute(match: LiveMatch): LiveMatch {
  if (match.finished) return match;
  const minute = match.minute + 1;
  const rng = createRng(seedFromString(`${match.seed}-m${minute}`));
  let m: LiveMatch = { ...match, minute, home: cloneTeam(match.home), away: cloneTeam(match.away), events: [...match.events] };

  // Fatigue de match
  for (const side of ["home", "away"] as const) {
    const t = m[side];
    const cost = tacticalProfile(t.tactic).fatigueCost / 90;
    for (const p of t.pitch) if (p) t.fatigue[p.id] = Math.min(100, (t.fatigue[p.id] ?? 0) + cost * 1.5);
  }

  const rH = ratingsOf(m.home);
  const rA = ratingsOf(m.away);
  const pH = tacticalProfile(m.home.tactic);
  const pA = tacticalProfile(m.away.tactic);

  // L'IA qui perd en fin de match prend des risques
  const urgency = (side: "home" | "away") => {
    if (side === m.managedSide || minute < 70) return 1;
    const diff = m[side].goals - m[side === "home" ? "away" : "home"].goals;
    return diff < 0 ? 1.12 : 1;
  };

  // Possession
  const ctrlH = rH.midfield * pH.control * styleMatchup(m.home.tactic.style, m.away.tactic.style) * HOME_ADVANTAGE;
  const ctrlA = rA.midfield * pA.control * styleMatchup(m.away.tactic.style, m.home.tactic.style);
  const homeHasBall = rng.chance(ctrlH / (ctrlH + ctrlA));
  const side: "home" | "away" = homeHasBall ? "home" : "away";
  const oppSide = homeHasBall ? "away" : "home";
  const att = m[side];
  const def = m[oppSide];
  att.possessionMinutes += 1;

  const rAtt = homeHasBall ? rH : rA;
  const rDef = homeHasBall ? rA : rH;
  const profAtt = homeHasBall ? pH : pA;
  const profDef = homeHasBall ? pA : pH;

  // Occasion
  const atkPower = rAtt.attack * profAtt.creation * urgency(side) * (homeHasBall ? HOME_ADVANTAGE : 1);
  const defPower = rDef.defense * profDef.resistance;
  const chanceProb = 0.232 * (atkPower / defPower);
  if (rng.chance(Math.min(0.55, chanceProb))) {
    const slots = FORMATIONS[att.tactic.formation];
    const candidates = att.pitch.map((p, i) => ({ p, i })).filter((x): x is { p: WorldPlayer; i: number } => x.p !== null);
    const shooter = weightedPick(candidates, c => LINE_SHOT_WEIGHT[slots[c.i].line] * effectiveRating(c.p, slots[c.i].pos), rng);
    if (shooter) {
      const gk = def.pitch.find((p, i) => p && FORMATIONS[def.tactic.formation][i].line === "GK") ?? null;
      const gkRating = gk ? effectiveRating(gk, "GK") : 35;
      const shooterRating = effectiveRating(shooter.p, slots[shooter.i].pos);
      const duel = Math.max(0.6, Math.min(1.6, shooterRating / Math.max(30, gkRating)));
      let xg = 0.11 * profAtt.chanceQuality * Math.pow(duel, 0.9) * rng.float(0.35, 1.9);
      xg = Math.max(0.02, Math.min(0.7, xg));
      att.shots += 1;
      att.xg += xg;
      const onTarget = rng.chance(Math.min(0.9, 0.3 + xg * 1.2));
      if (onTarget) att.shotsOnTarget += 1;
      if (onTarget && rng.chance(Math.min(0.95, xg / (0.3 + xg * 1.2) * 1.05))) {
        att.goals += 1;
        const helpers = candidates.filter(c => c.p.id !== shooter.p.id);
        const assist = rng.chance(0.72) ? weightedPick(helpers, c => LINE_ASSIST_WEIGHT[slots[c.i].line] * c.p.overall, rng) : null;
        m.events.push({
          minute, type: "goal", side, playerId: shooter.p.id, assistId: assist?.p.id,
          text: `BUT ! ${name(shooter.p)} marque pour ${att.name}${assist ? ` sur une passe de ${name(assist.p)}` : ""}. ${m.home.goals}-${m.away.goals}.`,
        });
      } else if (onTarget) {
        def.saves += 1;
        if (xg > 0.18) m.events.push({ minute, type: "save", side: oppSide, playerId: gk?.id, text: `Arrêt décisif ${gk ? `de ${name(gk)}` : ""} face à ${name(shooter.p)}.` });
      } else if (xg > 0.25) {
        m.events.push({ minute, type: "chance", side, playerId: shooter.p.id, text: `Grosse occasion manquée par ${name(shooter.p)} !` });
      }
    }
  }

  // Cartons et blessures (les deux équipes)
  for (const s of ["home", "away"] as const) {
    const t = m[s];
    const onPitch = t.pitch.map((p, i) => ({ p, i })).filter((x): x is { p: WorldPlayer; i: number } => x.p !== null);
    if (onPitch.length === 0) continue;
    const foulRate = t.tactic.style === "pressing" ? 0.024 : 0.018;
    if (rng.chance(foulRate)) {
      const { p, i } = rng.pick(onPitch);
      if (t.yellows.includes(p.id) || rng.chance(0.012)) {
        t.sentOff.push(p.id);
        t.pitch[i] = null;
        m.events.push({ minute, type: "red", side: s, playerId: p.id, text: `Carton rouge pour ${name(p)} (${t.name}) !` });
      } else {
        t.yellows.push(p.id);
        m.events.push({ minute, type: "yellow", side: s, playerId: p.id, text: `Carton jaune pour ${name(p)}.` });
      }
    }
    if (rng.chance(0.0011)) {
      const { p, i } = rng.pick(onPitch);
      t.injured.push(p.id);
      m.events.push({ minute, type: "injury", side: s, playerId: p.id, text: `${name(p)} se blesse et ne peut pas continuer.` });
      if (t.subsUsed < MAX_SUBS && t.bench.length > 0) {
        m = autoSubstitute(m, s, i);
      } else {
        m[s].pitch[i] = null;
      }
    }
  }

  // Remplacements automatiques aux minutes clés
  if ([60, 68, 75, 82].includes(minute)) {
    for (const s of ["home", "away"] as const) if (m[s].autoSubs) m = autoSubstitute(m, s);
  }

  if (minute === 45) {
    m.events.push({ minute, type: "half_time", side: "home", text: `Mi-temps : ${m.home.name} ${m.home.goals}-${m.away.goals} ${m.away.name}.` });
  }
  if (minute >= 90) {
    m.events.push({ minute: 90, type: "full_time", side: "home", text: `Coup de sifflet final : ${m.home.name} ${m.home.goals}-${m.away.goals} ${m.away.name}.` });
    m.finished = true;
  }
  return m;
}

export function simulateToEnd(m: LiveMatch): LiveMatch {
  let cur = m;
  while (!cur.finished) cur = simulateMinute(cur);
  return cur;
}

// ─── Rapport final ───────────────────────────────────────────────────────────

/** Notes /10 des joueurs d'une équipe ayant joué. */
function rateTeam(m: LiveMatch, side: "home" | "away"): Record<string, number> {
  const t = m[side];
  const opp = m[side === "home" ? "away" : "home"];
  const won = t.goals > opp.goals, lost = t.goals < opp.goals;
  const rng = createRng(seedFromString(`${m.seed}-ratings-${side}`));
  const all = [...t.pitch.filter((p): p is WorldPlayer => !!p), ...t.bench];
  const known = new Map<string, WorldPlayer>();
  for (const p of all) known.set(p.id, p);
  const out: Record<string, number> = {};
  for (const id of t.appeared) {
    let r = 6.3 + (won ? 0.35 : lost ? -0.35 : 0) + rng.float(-0.4, 0.4);
    const p = known.get(id);
    const defensive = p && (p.position === "GK" || p.position === "CB" || p.position === "LB" || p.position === "RB");
    for (const e of m.events) {
      if (e.side === side && e.type === "goal" && e.playerId === id) r += 1.0;
      if (e.side === side && e.type === "goal" && e.assistId === id) r += 0.6;
      if (e.side === side && e.type === "save" && e.playerId === id) r += 0.3;
      if (e.type === "yellow" && e.playerId === id) r -= 0.3;
      if (e.type === "red" && e.playerId === id) r -= 1.5;
    }
    if (defensive) r += opp.goals === 0 ? 0.5 : -0.25 * opp.goals;
    out[id] = Math.round(Math.max(3, Math.min(10, r)) * 10) / 10;
  }
  return out;
}

export function finishMatch(m: LiveMatch): ManagerMatchReport {
  const done = m.finished ? m : simulateToEnd(m);
  const total = Math.max(1, done.home.possessionMinutes + done.away.possessionMinutes);
  const side = (t: LiveTeam) => ({
    goals: t.goals, shots: t.shots, shotsOnTarget: t.shotsOnTarget,
    possession: Math.round((t.possessionMinutes / total) * 100), xg: Math.round(t.xg * 100) / 100,
  });
  return {
    fixtureId: done.fixtureId, season: done.season, matchday: done.matchday,
    homeClubId: done.home.clubId, awayClubId: done.away.clubId,
    events: done.events, home: side(done.home), away: side(done.away),
    ratings: rateTeam(done, done.managedSide), managedSide: done.managedSide,
  };
}

/** Effets d'après-match à appliquer aux joueurs du monde (les deux équipes). */
export interface PostMatchPlayerEffect {
  playerId: string;
  fatigueAfter: number;
  injuredWeeks: number;
  suspended: boolean;
  played: boolean;
}

export function postMatchEffects(m: LiveMatch): PostMatchPlayerEffect[] {
  const out: PostMatchPlayerEffect[] = [];
  const rng = createRng(seedFromString(`${m.seed}-post`));
  for (const s of ["home", "away"] as const) {
    const t = m[s];
    for (const id of t.appeared) {
      out.push({
        playerId: id,
        fatigueAfter: Math.round(t.fatigue[id] ?? 0),
        injuredWeeks: t.injured.includes(id) ? rng.int(1, 6) : 0,
        suspended: t.sentOff.includes(id),
        played: true,
      });
    }
  }
  return out;
}
