"use client";

/**
 * FC CAREER 27 — Mini-terrain du match en direct (Carrière Joueur).
 *
 * Terrain incliné en perspective, les 22 joueurs placés selon leur formation,
 * le ballon qui circule minute après minute. À chaque moment clé, le jeu se
 * fige autour du joueur et les options sont tracées (frappe, passe, dribble,
 * intervention). Après le choix, l'action est rejouée : but, arrêt, ballon
 * perdu… Les buts du reste du match finissent aussi dans les filets.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { PlayerLive, KeyMoment, MomentOption, DecisionLog } from "../../game/player2/live";
import { FORMATIONS } from "../../game/manager/tactics";
import type { LiveTeam } from "../../game/manager/matchSim";
import type { WorldPlayer } from "../../game/data/worldPlayers";
import type { MatchEvent } from "../../game/manager/types";
import type { BallKind, Frame } from "../../game/player2/pitchPlay";
import { MatchTV } from "./MatchTV";
import { anchors as tvAnchors, shape as tvShape } from "../../game/player2/pitchPlay";
import { createRng, seedFromString } from "../../game/utils/random";

type Pt = { x: number; y: number };
export interface Dot { id: string; mine: boolean; me: boolean; pt: Pt; label: string; gk: boolean; num: number; pace?: number }

const SHOTS = new Set(["shoot", "longshot", "finesse", "chip", "acrobatic", "header", "lowdriven", "powershot", "trivela", "freekick", "penalty"]);
const PASSES = new Set(["pass", "cross", "through", "longball", "outside", "longthrow", "quickthrow"]);
const RUNS = new Set(["dribble", "flair"]);
/** Numéro de maillot selon le poste occupé (numérotation classique). */
const SHIRT: Record<string, number[]> = { GK: [1], RB: [2], LB: [3], CB: [4, 5, 15], DM: [6, 16], CM: [8, 14, 18], AM: [10], RW: [7], LW: [11], ST: [9, 19] };
const KIND_LABEL: Record<string, string> = {
  box: "Dans la surface", wing: "Sur l'aile", build: "Construction", long: "Jeu long", defend: "Duel défensif", keeper: "Face à face",
  air: "Duel aérien", setpiece: "Coup franc", penalty: "Penalty", keepercross: "Centre adverse", gkbuild: "Relance",
};
const OPP_GOAL: Pt = { x: 50, y: 0 };
const MY_GOAL: Pt = { x: 50, y: 100 };
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Position du slot : y 0 = but adverse, 100 = notre but. */
function slotPts(team: LiveTeam, mirror: boolean, push: number): (Pt | null)[] {
  const slots = FORMATIONS[team.tactic.formation];
  return team.pitch.map((p, i) => {
    const s = slots[i];
    if (!p || !s) return null;
    const y = clamp(s.y - (s.pos === "GK" ? 0 : push), 3, 97);
    return mirror ? { x: 100 - s.x, y: 100 - y } : { x: s.x, y };
  });
}

/** Où se joue le moment clé, selon son type. */
function momentSpot(kind: KeyMoment["kind"], me: Pt): { me: Pt; ball: Pt; rival?: Pt } {
  switch (kind) {
    case "box": return { me: { x: clamp(me.x, 34, 66), y: 19 }, ball: { x: clamp(me.x, 34, 66), y: 20 } };
    case "wing": { const x = me.x < 50 ? 10 : 90; return { me: { x, y: 26 }, ball: { x, y: 27 } }; }
    case "build": return { me: { x: clamp(me.x, 30, 70), y: 52 }, ball: { x: clamp(me.x, 30, 70), y: 53 } };
    case "long": return { me: { x: me.x, y: 62 }, ball: { x: me.x, y: 63 } };
    case "air": return { me: { x: 50, y: 12 }, ball: { x: 50, y: 11 } };
    case "setpiece": return { me: { x: 58, y: 26 }, ball: { x: 58, y: 27 } };
    case "penalty": return { me: { x: 50, y: 15 }, ball: { x: 50, y: 12 } };
    case "oneonone": return { me: { x: 52, y: 17 }, ball: { x: 52, y: 16 }, rival: { x: 50, y: 7 } };
    case "counter": return { me: { x: clamp(me.x, 35, 65), y: 40 }, ball: { x: clamp(me.x, 35, 65), y: 39 } };
    case "keeper": return { me: { x: 50, y: 95 }, ball: { x: 46, y: 78 }, rival: { x: 46, y: 77 } };
    case "keepercross": return { me: { x: 50, y: 95 }, ball: { x: 88, y: 84 }, rival: { x: 52, y: 86 } };
    case "gkbuild": return { me: { x: 50, y: 93 }, ball: { x: 50, y: 91 } };
    case "defend":
    default: return { me: { x: me.x, y: clamp(me.y, 55, 85) }, ball: { x: me.x + 3, y: clamp(me.y, 55, 85) - 9 }, rival: { x: me.x + 3, y: clamp(me.y, 55, 85) - 10 } };
  }
}

/** Partenaire le plus avancé (cible des passes). */
function bestMate(dots: Dot[], from: Pt): Pt {
  const mates = dots.filter(d => d.mine && !d.me && !d.gk && d.pt.y < from.y + 5);
  const pick = mates.sort((a, b) => a.pt.y - b.pt.y || Math.abs(a.pt.x - from.x) - Math.abs(b.pt.x - from.x))[0];
  return pick ? pick.pt : { x: 50, y: Math.max(8, from.y - 25) };
}

function optionTarget(o: MomentOption["id"], spot: { me: Pt; ball: Pt; rival?: Pt }, dots: Dot[]): Pt {
  if (SHOTS.has(o)) return o === "chip" ? { x: 50, y: 1 } : { x: o === "finesse" || o === "trivela" ? 44 : 55, y: 0.5 };
  if (PASSES.has(o)) return bestMate(dots, spot.me);
  if (RUNS.has(o)) return { x: spot.me.x + (spot.me.x < 50 ? 8 : -8), y: Math.max(6, spot.me.y - 12) };
  return spot.rival ?? spot.ball;
}

/** Trajectoire du ballon après la décision. */
function outcomePath(d: DecisionLog, spot: { me: Pt; ball: Pt; rival?: Pt }, target: Pt, dots: Dot[]): { path: Pt[]; flash: string | null; mineGoal: boolean | null } {
  const opp = dots.filter(x => !x.mine && !x.gk).sort((a, b) => Math.hypot(a.pt.x - spot.me.x, a.pt.y - spot.me.y) - Math.hypot(b.pt.x - spot.me.x, b.pt.y - spot.me.y))[0]?.pt ?? { x: 50, y: 50 };
  switch (d.outcome) {
    case "goal": return { path: [spot.ball, { x: target.x, y: 2 }, { x: target.x, y: -2 }], flash: "BUT !", mineGoal: true };
    case "assist": { const m = PASSES.has(d.option) ? target : bestMate(dots, spot.me); return { path: [spot.ball, m, { x: 52, y: -2 }], flash: "BUT !", mineGoal: true }; }
    case "chance": return SHOTS.has(d.option) || RUNS.has(d.option)
      ? { path: [spot.ball, { x: 46, y: 3 }, { x: 40, y: 8 }], flash: "Arrêt du gardien", mineGoal: null }
      : { path: [spot.ball, target], flash: null, mineGoal: null };
    case "lost": return SHOTS.has(d.option)
      ? { path: [spot.ball, { x: target.x + 18, y: -1 }], flash: "À côté", mineGoal: null }
      : { path: [spot.ball, opp], flash: "Ballon perdu", mineGoal: null };
    case "stopped": return { path: [spot.ball, spot.me], flash: "Récupéré !", mineGoal: null };
    case "saved": return { path: [spot.ball, { x: 50, y: 97 }, spot.me], flash: "Arrêt !", mineGoal: null };
    case "conceded": return { path: [spot.ball, { x: 50, y: 99 }, { x: 50, y: 102 }], flash: "But encaissé", mineGoal: false };
    default: return { path: [spot.ball, target], flash: null, mineGoal: null };
  }
}

// ─── Rejeu synchronisé des événements du moteur ──────────────────────────────

/** Une étape d'action : trajet du ballon, joueurs déplacés, légende, effet. */
export interface Step {
  ball: Pt[];
  moves: Record<string, Pt>;
  dur: number;
  caption?: string;
  flash?: { text: string; tone: "good" | "bad" | "neutral" };
  badge?: { id: string; kind: "yellow" | "red" | "injury" | "glove" };
  holder?: string;
  /** Geste du ballon (rendu télé) */
  kind?: BallKind;
  /** Plan de coupe : les joueurs sont déjà en place (coup de pied arrêté, nouvelle séquence) */
  cut?: boolean;
}
export interface PitchAction {
  key: string;
  events: MatchEvent[];
  possession: "home" | "away";
  /** Phase de jeu positionnelle de la minute (pitchPlay) : remplace le script simple */
  frames?: Frame[];
  /** Durée totale de la phase (ms, avant le multiplicateur de vitesse) */
  total?: number;
}

/** Durée naturelle de chaque geste (ms, vitesse normale) : une passe roule, un centre monte. */
export const KIND_MS: Record<string, number> = { start: 450, carry: 800, pass: 900, cross: 1250, long: 1350, shot: 950, head: 900, lost: 800, cut: 950, tackle: 850, out: 1000, throw: 950, kick: 1300 };
export const frameMs = (f: Frame) => (f.kind ? KIND_MS[f.kind] ?? 900 : 900 * f.w) + (f.flash ? 900 : 0) + (f.caption && !f.kind ? 400 : 0);

/** Images de phase → étapes animées (positions complètes des 22 joueurs). */
function framesToSteps(frames: Frame[], total: number): Step[] {
  const sum = frames.reduce((t, f) => t + frameMs(f), 0) || 1;
  let prev: Pt | null = null;
  return frames.map(f => {
    const jump = prev ? Math.hypot(prev.x - f.ball.x, prev.y - f.ball.y) : 0;
    const st: Step = { ball: prev && f.kind !== "out" ? [prev, f.ball] : [f.ball], moves: f.pos, dur: (total * frameMs(f)) / sum, caption: f.caption, flash: f.flash, badge: f.badge, holder: f.holder, kind: f.kind,
      cut: (f.kind === "out" && (jump > 12 || /Corner|Coup franc/.test(f.caption ?? ""))) };
    prev = f.ball;
    return st;
  });
}

const VISUAL = new Set(["goal", "shot", "corner", "freekick", "save", "chance", "yellow", "red", "injury", "half_time", "full_time"]);
export const isVisualEvent = (e: MatchEvent) => VISUAL.has(e.type);

/**
 * Script d'un ensemble d'événements de la même minute, avec les vrais joueurs :
 * le passeur sert le buteur, le tir file au fond, à côté ou dans les gants.
 */
export function scriptFor(events: MatchEvent[], dots: Dot[], mySide: "home" | "away"): Step[] {
  const steps: Step[] = [];
  const at = (id?: string) => dots.find(d => d.id === id);
  for (const e of events) {
    const ours = e.side === mySide;
    // But visé : y = 0 pour nous, y = 100 pour l'adversaire
    const gy = (e.type === "save" ? !ours : ours) ? 0 : 100;
    const dir = gy === 0 ? 1 : -1;
    const box = (x: number, depth: number): Pt => ({ x: clamp(x, 30, 70), y: gy + dir * depth });
    const keeper = dots.find(d => d.gk && (gy === 0 ? !d.mine : d.mine));
    if (e.type === "goal") {
      const sc = at(e.playerId), as = at(e.assistId);
      const scPt = box(sc?.pt.x ?? 50, 12);
      const net: Pt = { x: 44 + ((e.minute * 7) % 13), y: gy - dir * 2 };
      if (as) {
        const asPt: Pt = { x: as.pt.x < 50 ? 16 : 84, y: gy + dir * 22 };
        steps.push({ ball: [asPt], moves: { [as.id]: asPt, ...(sc ? { [sc.id]: { x: scPt.x, y: scPt.y + dir * 8 } } : {}) }, dur: 650, caption: `${as.label} s'avance` });
        steps.push({ kind: asPt.x < 30 || asPt.x > 70 ? "cross" : "pass", ball: [asPt, scPt], moves: { [as.id]: asPt, ...(sc ? { [sc.id]: scPt } : {}) }, dur: 600, caption: `${as.label} pour ${sc?.label ?? "le buteur"}…` });
      } else {
        steps.push({ ball: [{ x: scPt.x, y: scPt.y + dir * 14 }], moves: sc ? { [sc.id]: { x: scPt.x, y: scPt.y + dir * 14 } } : {}, dur: 650, caption: `${sc?.label ?? "Un attaquant"} s'avance` });
      }
      steps.push({ kind: "shot", ball: [scPt, net], moves: { ...(sc ? { [sc.id]: scPt } : {}), ...(keeper ? { [keeper.id]: { x: net.x < 50 ? 54 : 46, y: keeper.pt.y } } : {}) }, dur: 1500, caption: e.text, flash: { text: "BUT !", tone: ours ? "good" : "bad" } });
    } else if (e.type === "shot" || e.type === "chance" || e.type === "save") {
      const sh = at(e.type === "save" ? e.shooterId : e.playerId);
      const deep = e.type === "chance" ? 9 : e.type === "save" ? 12 : 20;
      const shPt = box(sh?.pt.x ?? 50, deep);
      steps.push({ ball: [{ x: shPt.x, y: shPt.y + dir * 10 }], moves: sh ? { [sh.id]: { x: shPt.x, y: shPt.y + dir * 10 } } : {}, dur: 550, caption: `${sh?.label ?? "Un attaquant"} s'avance` });
      const saved = e.type === "save" || e.result === "saved";
      const end: Pt = saved ? { x: 50 + ((e.minute * 5) % 9) - 4, y: gy + dir * 3 }
        : e.type === "chance" ? { x: shPt.x < 50 ? 41 : 59, y: gy - dir * 1 } : { x: shPt.x < 50 ? 30 : 70, y: gy - dir * 2 };
      steps.push({
        kind: "shot", ball: [shPt, end], moves: { ...(sh ? { [sh.id]: shPt } : {}), ...(saved && keeper ? { [keeper.id]: { x: end.x, y: keeper.pt.y } } : {}) }, dur: 1100, caption: e.text,
        flash: e.type === "chance" ? { text: "Poteau !", tone: "neutral" } : undefined,
        badge: saved && keeper ? { id: keeper.id, kind: "glove" } : undefined,
      });
    } else if (e.type === "yellow" || e.type === "red" || e.type === "injury") {
      const p = at(e.playerId);
      steps.push({ ball: p ? [{ x: p.pt.x + 2, y: p.pt.y }] : [], moves: {}, dur: 1200, caption: e.text, badge: p ? { id: p.id, kind: e.type } : undefined });
    } else if (e.type === "half_time" || e.type === "full_time") {
      steps.push({ ball: [{ x: 50, y: 50 }], moves: {}, dur: 1400, caption: e.text, flash: { text: e.type === "half_time" ? "MI-TEMPS" : "FIN DU MATCH", tone: "neutral" } });
    }
  }
  return steps;
}

function useWide(): boolean {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 720px)");
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return wide;
}

export function MatchPitch({ live, colors, hoverOption, camera = "dynamic", action, onActionDone, pace = 1, possession, board, onStep }: {
  live: PlayerLive;
  colors: { mine: string; mineAlt: string; theirs: string; theirsAlt: string };
  hoverOption?: MomentOption["id"] | null;
  camera?: "dynamic" | "fixed";
  /** Événements de la minute à rejouer avant de mettre à jour le score */
  action?: PitchAction | null;
  onActionDone?: () => void;
  /** Multiplicateur de durée (vitesse rapide < 1) */
  pace?: number;
  /** Équipe en possession à la dernière minute (sinon tirage) */
  possession?: "home" | "away" | null;
  /** État affiché au tableau (score avant l'action en cours) */
  board?: PlayerLive["match"];
  /** Chaque étape jouée (son, vibrations…) */
  onStep?: (s: Step) => void;
}) {
  const wide = useWide();
  const reduce = useReducedMotion();
  const m = live.match;
  const mySide = m.managedSide;
  // Pendant le rejeu d'une minute, le moment clé suivant attend
  const moment = action ? null : live.moment;
  const bm = board ?? m;
  // Positions de fin de la dernière phase : le jeu reprend de là
  const [rest, setRest] = useState<{ pos: Record<string, Pt>; ball: Pt; holder?: string } | null>(null);
  const mine = m[mySide], theirs = m[mySide === "home" ? "away" : "home"];

  // Possession de la minute (déterministe), l'équipe qui a le ballon monte d'un cran
  const rng = createRng(seedFromString(`${m.seed}-pitch-${m.minute}`));
  const total = Math.max(1, m.home.possessionMinutes + m.away.possessionMinutes);
  const ours = action ? action.possession === mySide
    : moment ? !["defend", "keeper", "keepercross"].includes(moment.kind)
    : possession ? possession === mySide : rng.chance(m.minute === 0 ? 0.5 : mine.possessionMinutes / total);
  const myPts = slotPts(mine, false, ours ? 7 : -3);
  const theirPts = slotPts(theirs, true, ours ? -3 : 7);

  // Petit mouvement : chaque joueur dérive autour de son poste
  const jitter = (id: string, p: Pt): Pt => {
    if (rest?.pos[id] && !moment) return rest.pos[id];
    if (moment) return p;
    const r = createRng(seedFromString(`${id}-${m.minute}`));
    return { x: clamp(p.x + r.float(-4, 4), 3, 97), y: clamp(p.y + r.float(-4, 4), 3, 97) };
  };
  const dots: Dot[] = [];
  const add = (team: LiveTeam, pts: (Pt | null)[], own: boolean) => {
    const used = new Map<string, number>();
    team.pitch.forEach((p: WorldPlayer | null, i) => {
      const pt = pts[i];
      if (!p || !pt) return;
      const pos = FORMATIONS[team.tactic.formation][i]?.pos ?? p.position;
      const k = used.get(pos) ?? 0;
      used.set(pos, k + 1);
      const num = SHIRT[pos]?.[k] ?? 12 + i;
      dots.push({ id: p.id, mine: own, me: p.id === live.playerId, pt: jitter(p.id, pt), label: p.lastName, gk: pos === "GK", num, pace: p.face?.pac ?? p.overall });
    });
  };
  add(mine, myPts, true);
  add(theirs, theirPts, false);

  const meDot = dots.find(d => d.me);
  const spot = moment && meDot ? momentSpot(moment.kind, meDot.pt) : null;
  // Bloc cohérent autour du ballon : au moment clé, ou entre deux phases sans position mémorisée
  {
    const all = tvAnchors(mine, theirs);
    const center = spot ? spot.ball : rest ? null : { x: 50, y: 50 };
    if (center) {
      const attack = spot ? !["defend", "keeper", "keepercross"].includes(moment!.kind) : ours;
      const pos = tvShape(all, center, attack);
      // Coups de pied arrêtés et duels aériens : du monde dans la surface
      if (spot && (moment!.kind === "air" || moment!.kind === "keepercross")) {
        const gy = moment!.kind === "air" ? 0 : 100, dir = gy === 0 ? 1 : -1;
        all.filter(a => !a.gk && a.mine === (gy === 0)).slice(-5).forEach((a, k) => { pos[a.id] = { x: 36 + k * 7, y: gy + dir * (9 + (k % 2) * 5) }; });
        all.filter(a => !a.gk && a.mine !== (gy === 0)).slice(0, 6).forEach((a, k) => { pos[a.id] = { x: 34 + k * 6.5, y: gy + dir * (6 + (k % 2) * 5) }; });
      }
      for (const d of dots) if (pos[d.id]) d.pt = pos[d.id];
    }
  }
  if (spot && meDot) {
    meDot.pt = spot.me;
    if (spot.rival) {
      const near = dots.filter(d => !d.mine && !d.gk).sort((a, b) => Math.hypot(a.pt.x - spot.rival!.x, a.pt.y - spot.rival!.y) - Math.hypot(b.pt.x - spot.rival!.x, b.pt.y - spot.rival!.y))[0];
      if (near) near.pt = spot.rival;
    } else {
      // Un défenseur adverse colle le joueur
      const near = dots.filter(d => !d.mine && !d.gk).sort((a, b) => Math.hypot(a.pt.x - spot.me.x, a.pt.y - spot.me.y) - Math.hypot(b.pt.x - spot.me.x, b.pt.y - spot.me.y))[0];
      if (near) near.pt = { x: spot.me.x + (spot.me.x < 50 ? 5 : -5), y: spot.me.y - 4 };
    }
  }

  // Rejeu des événements de la minute (synchronisé avec le moteur)
  const [play, setPlay] = useState<{ key: string; steps: Step[]; idx: number } | null>(null);
  const dotsRef = useRef(dots);
  useEffect(() => { dotsRef.current = dots; });
  const actionKey = action?.key ?? null;
  const actionEvents = action?.events;
  useEffect(() => {
    if (!actionKey || !actionEvents) { setPlay(null); return; }
    const steps = action?.frames ? framesToSteps(action.frames, action.total ?? 2000) : scriptFor(actionEvents, dotsRef.current, mySide);
    if (!steps.length) { setPlay(null); onActionDone?.(); return; }
    setPlay({ key: actionKey, steps, idx: 0 });
  }, [actionKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const playKey = play ? `${play.key}-${play.idx}` : null;
  useEffect(() => {
    if (play) onStep?.(play.steps[play.idx]);
  }, [playKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!play) return;
    const st = play.steps[play.idx];
    const t = setTimeout(() => {
      if (play.idx + 1 < play.steps.length) setPlay({ ...play, idx: play.idx + 1 });
      else {
        const last = play.steps[play.steps.length - 1];
        setRest({ pos: Object.assign({}, ...play.steps.map(x => x.moves)), ball: last.ball[last.ball.length - 1] ?? { x: 50, y: 50 }, holder: [...play.steps].reverse().find(x => x.holder)?.holder });
        setPlay(null); onActionDone?.();
      }
    }, Math.max(120, st.dur * pace * (reduce ? 0.4 : 1)));
    return () => clearTimeout(t);
  }, [play, pace, reduce, onActionDone]);
  const step = play ? play.steps[play.idx] : null;
  const moves: Record<string, Pt> = play ? Object.assign({}, ...play.steps.slice(0, play.idx + 1).map(x => x.moves)) : {};
  const shownDots = play ? dots.map(d => (moves[d.id] ? { ...d, pt: moves[d.id] } : d)) : dots;

  // Ballon : porteur de la minute, ou point du moment clé
  const holderPool = dots.filter(d => d.mine === ours && !d.gk);
  const holder = holderPool.length ? holderPool[rng.int(0, holderPool.length - 1)] : null;
  const restBall: Pt = spot ? spot.ball : rest ? rest.ball : holder ? { x: holder.pt.x + 1.5, y: holder.pt.y - 1.5 } : { x: 50, y: 50 };

  // Rejeu après une décision, ou but du reste du match
  const [replay, setReplay] = useState<{ key: string; path: Pt[]; flash: string | null; mineGoal: boolean | null; kind?: BallKind } | null>(null);
  const lastSpot = useRef<{ spot: { me: Pt; ball: Pt; rival?: Pt }; dots: Dot[]; moment: KeyMoment } | null>(null);
  const momentNow = moment;
  useEffect(() => { if (spot && momentNow) lastSpot.current = { spot, dots, moment: momentNow }; });
  const decisions = live.decisions.length;
  const goals = mine.goals + theirs.goals;
  const seen = useRef({ decisions, goals });
  useEffect(() => {
    const prev = seen.current;
    seen.current = { decisions, goals };
    if (decisions > prev.decisions && lastSpot.current) {
      const d = live.decisions[decisions - 1];
      const { spot: sp, dots: ds } = lastSpot.current;
      const target = optionTarget(d.option, sp, ds);
      const o = outcomePath(d, sp, target, ds);
      setReplay({ key: `d${decisions}`, ...o, kind: SHOTS.has(d.option) ? "shot" : d.option === "cross" || d.option === "longball" ? "cross" : PASSES.has(d.option) ? "pass" : "carry" });
      return;
    }
  }, [decisions, goals, live.decisions]);
  useEffect(() => {
    if (!replay) return;
    const t = setTimeout(() => { setReplay(null); onActionDone?.(); }, reduce ? 900 : 2300);
    return () => clearTimeout(t);
  }, [replay, reduce, onActionDone]);

  const arrows = moment && spot ? moment.options.map(o => ({ id: o.id, to: optionTarget(o.id, spot, dots), kind: (SHOTS.has(o.id) ? "shot" : PASSES.has(o.id) ? "pass" : RUNS.has(o.id) ? "run" : "def") as "shot" | "pass" | "run" | "def", hot: hoverOption === o.id })) : [];
  // Caméra : resserre sur le moment clé et sur les tirs
  const focus: Pt | null = camera === "dynamic" ? (step && (step.kind === "shot" || step.kind === "head" || step.flash) && step.ball.length ? step.ball[step.ball.length - 1] : replay ? replay.path[replay.path.length - 1] : spot ? spot.ball : null) : null;
  const tvBall = step && step.ball.length
    ? { key: `${play!.key}-${play!.idx}`, path: step.ball, dur: step.dur * pace * (reduce ? 0.4 : step.kind === "shot" || step.kind === "head" ? 0.45 : 0.85), kind: step.kind }
    : replay ? { key: replay.key, path: replay.path, dur: replay.kind === "shot" ? 700 : 1100, kind: replay.kind }
      : { key: `rest-${restBall.x.toFixed(1)}-${restBall.y.toFixed(1)}`, path: [restBall], dur: 450, kind: "carry" as BallKind };
  const tvHolder = step ? step.holder ?? null : replay || spot ? null : rest?.holder ?? holder?.id ?? null;
  const nameIds = new Set<string>([...(tvHolder ? [tvHolder] : []), ...(step?.badge ? [step.badge.id] : [])]);
  const abbr = (n: string) => n.replace(/^CP /, "").replace(/[^A-Za-zÀ-ÿ ]/g, "").trim().slice(0, 3).toUpperCase();
  const lastGoal = [...m.events].reverse().find(e => e.type === "goal");
  const lastDecision = live.decisions[live.decisions.length - 1];
  const caption = step ? step.caption ?? null : moment ? moment.text
    : replay ? (replay.key.startsWith("d") ? lastDecision?.text : lastGoal?.text) : null;
  const flash = step?.flash ? { key: `${play!.key}-${play!.idx}`, text: step.flash.text, tone: step.flash.tone }
    : replay?.flash ? { key: replay.key + "f", text: replay.flash, tone: replay.mineGoal === true ? "good" : replay.mineGoal === false ? "bad" : "neutral" } : null;
  void wide;

  return (
    <div className={`pc-pitch pc-tv${moment ? " is-frozen" : ""}`} aria-hidden>
      <div className="pc-pitch__frame pc-tv__frame">
        <MatchTV dots={shownDots} ball={tvBall} holder={tvHolder} moveDur={step ? step.dur * pace : 650} colors={colors} camera={camera}
          cut={step?.cut ? `${play!.key}-${play!.idx}` : null} focus={focus} arrows={arrows} from={spot?.me ?? null} badge={step?.badge ?? null} names={nameIds} frozen={!!moment} reduce={!!reduce} />
        <div className="pc-pitch__hud">
          <span className="pc-pitch__board">
            <i style={{ background: m.home.clubId === mine.clubId ? colors.mine : colors.theirs }} />{abbr(m.home.name)}
            <b>{bm.home.goals} - {bm.away.goals}</b>{abbr(m.away.name)}
            <i style={{ background: m.away.clubId === mine.clubId ? colors.mine : colors.theirs }} /><em>{bm.finished ? "FIN" : `${action ? action.events[0]?.minute ?? bm.minute : bm.minute}'`}</em>
          </span>
        </div>
        {moment && <span className="pc-pitch__tag">{moment.minute}&apos; · {KIND_LABEL[moment.kind] ?? "Moment clé"}</span>}
        {caption && <span className="pc-pitch__caption">{caption}</span>}
        <AnimatePresence>
          {flash && (
            <motion.div key={flash.key} className={`pc-pitch__flash is-${flash.tone}`}
              initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.2 }} transition={{ delay: reduce ? 0 : step ? 0.55 * pace : 0.8, duration: 0.35 }}>
              {flash.text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
