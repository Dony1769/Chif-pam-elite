/**
 * FC CAREER 27 — Moteur de jeu positionnel (une minute de possession).
 *
 * L'équipe qui a le ballon le fait circuler sur un vrai terrain : chaque
 * joueur a une position (bloc tactique qui suit le ballon), chaque passe peut
 * être interceptée par le défenseur le mieux placé selon la distance, la passe
 * du passeur et la défense du défenseur, et dès que le porteur entre dans la
 * zone de tir il frappe : xG selon la distance, l'angle, la finition du
 * tireur face au gardien. Le score naît de ce qui se passe sur le terrain.
 *
 * Repère de l'équipe à domicile : x 0-100, y = 0 but de l'extérieur (le
 * domicile attaque vers le haut), y = 100 but du domicile. Déterministe.
 */

import type { WorldPlayer } from "../data/worldPlayers";
import type { Rng } from "../utils/random";
import { FORMATIONS, effectiveRating } from "./tactics";
import type { LiveTeam } from "./matchSim";

export type Pt = { x: number; y: number };
export interface PhaseFrame {
  /** Durée relative de la transition vers cette image */
  w: number;
  ball: Pt;
  holder?: string;
  pos: Record<string, Pt>;
  kind: "start" | "pass" | "carry" | "lost" | "shot" | "assist";
}
export interface Phase { minute: number; side: "home" | "away"; frames: PhaseFrame[] }

export interface ShotOutcome {
  shooter: WorldPlayer;
  assist: WorldPlayer | null;
  xg: number;
  /** Point du tir (repère domicile) */
  from: Pt;
}

interface Unit { p: WorldPlayer; slot: number; side: "home" | "away"; line: string; ax: number; ay: number; pos: string }

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/** Notes utiles d'un joueur (carte si connue, sinon note globale), avec forme et fatigue. */
function skill(p: WorldPlayer, pos: string, k: "pas" | "sho" | "def" | "dri"): number {
  const base = effectiveRating(p, pos as WorldPlayer["position"]);
  const face = p.face?.[k];
  return face ? base * (0.55 + 0.45 * (face / Math.max(30, p.overall))) : base;
}

function units(home: LiveTeam, away: LiveTeam): Unit[] {
  const out: Unit[] = [];
  for (const [t, side] of [[home, "home"], [away, "away"]] as const) {
    t.pitch.forEach((p, i) => {
      const s = FORMATIONS[t.tactic.formation][i];
      if (!p || !s) return;
      out.push({ p, slot: i, side, line: s.line, pos: s.pos, ax: side === "home" ? s.x : 100 - s.x, ay: side === "home" ? s.y : 100 - s.y });
    });
  }
  return out;
}

/** Bloc tactique : postes, glissement avec le ballon, montée en possession, resserrement sans. */
export function shapeAround(all: Unit[], ball: Pt, attSide: "home" | "away"): Record<string, Pt> {
  const pos: Record<string, Pt> = {};
  for (const u of all) {
    const attacking = u.side === attSide;
    const homeTeam = u.side === "home";
    if (u.line === "GK") {
      const gy = homeTeam ? 96 : 4;
      pos[u.p.id] = { x: clamp(50 + (ball.x - 50) * 0.18, 40, 60), y: gy + (homeTeam ? -1 : 1) * clamp(Math.abs(ball.y - gy) * 0.06, 0, 6) };
      continue;
    }
    const depth = (ball.y - 50) * (attacking ? 0.6 : 0.5);
    const push = attacking ? (homeTeam ? -9 : 9) : (homeTeam ? 5 : -5);
    let y = u.ay + depth + push;
    if (!attacking) { const c = 50 + depth; y = c + (y - c) * 0.78; }
    const x = u.ax + (ball.x - 50) * (attacking ? 0.22 : 0.38);
    pos[u.p.id] = { x: clamp(x, 4, 96), y: clamp(y, 5, 95) };
  }
  return pos;
}

/**
 * Calibrage sur 1 000 matchs de D1 CP pour garder l'équilibre du moteur précédent
 * (3,15 buts, 24 tirs) : 3,0 buts, 25,5 tirs dont 11 cadrés, 47 % de victoires à
 * domicile, 19 % de nuls ; le plus fort gagne 66 % du temps avec 5 points d'écart.
 * Un 4-4-2 équilibré contre un 4-4-2 donne 2,3 buts : la tactique compte.
 */
export const TUNE = {
  passes: [1, 5] as [number, number],
  gain: [6, 15] as [number, number],
  shootZone: 20,
  intBase: 0.48,
  intNear: 0.4,
  intRadius: 7,
  intSkillExp: 0.8,
  intPowerExp: 0.3,
  xgScale: 0.177,
  xgDecay: 16,
  duelExp: 0.6,
  homeXg: 1.06,
  /** Poids de la mentalité et du style (création / résistance) sur les interceptions */
  tacticExp: 2.2,
};

/**
 * Joue la possession de la minute. Retourne la phase (images pour l'écran)
 * et, si l'action finit par un tir, le tireur, le passeur et l'xG.
 * `power` = rapport attaque / défense des deux équipes (profil tactique compris).
 */
export function playPossession(home: LiveTeam, away: LiveTeam, side: "home" | "away", minute: number, rng: Rng,
  opts: { power: number; quality: number; from?: Pt; tactic?: number }): { phase: Phase; shot: ShotOutcome | null; end: Pt } {
  const all = units(home, away);
  const att = all.filter(u => u.side === side && u.line !== "GK");
  const def = all.filter(u => u.side !== side && u.line !== "GK");
  const goalY = side === "home" ? 0 : 100;
  const dir = side === "home" ? -1 : 1; // sens de progression en y
  const frames: PhaseFrame[] = [];
  const start = opts.from ?? { x: 50, y: 50 };
  let pos = shapeAround(all, start, side);
  if (!att.length) return { phase: { minute, side, frames }, shot: null, end: start };
  let holder = [...att].sort((a, b) => dist(pos[a.p.id], start) - dist(pos[b.p.id], start))[0];
  let ball = { ...pos[holder.p.id] };
  frames.push({ w: 0.5, ball, holder: holder.p.id, pos, kind: "start" });
  let prev: Unit | null = null;
  const maxActions = rng.int(TUNE.passes[0], TUNE.passes[1]);

  for (let k = 0; k <= maxActions; k++) {
    // Distance à l'embouchure du but (largeur ±6) : un attaquant excentré n'est pas pénalisé deux fois
    const gDist = Math.hypot(Math.max(0, Math.abs(ball.x - 50) - 6), ball.y - goalY);
    // Zone de tir : le porteur frappe (plus il est près, plus c'est sûr)
    if (gDist < TUNE.shootZone && rng.chance(gDist < 15 ? 0.85 : 0.55)) {
      // Le tireur repique vers l'axe avant de frapper
      ball = { x: 50 + (ball.x - 50) * 0.55, y: ball.y };
      pos = { ...pos, [holder.p.id]: ball };
      // Angle de tir : 0 face au but, 1 sur la ligne de but
      const angle = Math.atan2(Math.abs(ball.x - 50), Math.max(1, Math.abs(ball.y - goalY))) / (Math.PI / 2);
      const keeper = all.find(u => u.side !== side && u.line === "GK");
      const sh = skill(holder.p, holder.pos, "sho");
      const gk = keeper ? effectiveRating(keeper.p, "GK") : 35;
      const duel = clamp(sh / Math.max(30, gk), 0.6, 1.6);
      const xg = clamp(TUNE.xgScale * Math.exp(-gDist / TUNE.xgDecay) * (1 - angle * 0.35) * Math.pow(duel, TUNE.duelExp) * opts.quality * (side === "home" ? TUNE.homeXg : 1) * rng.float(0.6, 1.4), 0.02, 0.75);
      frames.push({ w: 0.6, ball, holder: holder.p.id, pos, kind: "shot" });
      return { phase: { minute, side, frames }, shot: { shooter: holder.p, assist: prev?.p ?? null, xg, from: ball }, end: ball };
    }
    if (k === maxActions) break;
    // Passe vers un partenaire mieux placé (ou conduite de balle si personne)
    const cands = att.filter(u => u.p.id !== holder.p.id);
    const weights = cands.map(u => {
      const q = pos[u.p.id];
      const gain = Math.abs(ball.y - goalY) - Math.abs(q.y - goalY);
      const d = dist(ball, q);
      return Math.max(0.05, 1 + gain / 10) * Math.exp(-Math.max(0, d - 20) / 12) * (u.line === "ATT" ? 1.3 : 1);
    });
    const total = weights.reduce((t, v) => t + v, 0);
    let r = rng.float(0, total), to = cands[cands.length - 1];
    for (let i = 0; i < cands.length; i++) { r -= weights[i]; if (r <= 0) { to = cands[i]; break; } }
    const target = pos[to.p.id];
    // Le receveur se présente un peu plus haut : la passe fait gagner du terrain
    const recv: Pt = { x: clamp(target.x + rng.float(-4, 4), 5, 95), y: clamp(target.y + dir * rng.float(TUNE.gain[0], TUNE.gain[1]) * 0.5, 4, 96) };
    // Interception : défenseur le plus proche de la ligne de passe
    const mid = { x: (ball.x + recv.x) / 2, y: (ball.y + recv.y) / 2 };
    const near = [...def].sort((a, b) => dist(pos[a.p.id], mid) - dist(pos[b.p.id], mid))[0];
    if (near) {
      const dd = Math.min(dist(pos[near.p.id], mid), dist(pos[near.p.id], recv));
      const ratio = skill(near.p, near.pos, "def") / Math.max(30, skill(holder.p, holder.pos, "pas"));
      const pInt = clamp((TUNE.intBase + TUNE.intNear * Math.exp(-dd / TUNE.intRadius)) * Math.pow(ratio, TUNE.intSkillExp) / Math.pow(opts.power, TUNE.intPowerExp) / Math.pow(opts.tactic ?? 1, TUNE.tacticExp), 0.02, 0.7);
      if (rng.chance(pInt)) {
        const lost = { x: (mid.x + pos[near.p.id].x) / 2, y: (mid.y + pos[near.p.id].y) / 2 };
        pos = shapeAround(all, lost, side === "home" ? "away" : "home");
        pos[near.p.id] = lost;
        frames.push({ w: 0.8, ball: lost, holder: near.p.id, pos, kind: "lost" });
        return { phase: { minute, side, frames }, shot: null, end: lost };
      }
    }
    prev = holder;
    holder = to;
    pos = shapeAround(all, recv, side);
    pos[to.p.id] = recv;
    ball = recv;
    frames.push({ w: 1, ball, holder: to.p.id, pos, kind: "pass" });
  }
  return { phase: { minute, side, frames }, shot: null, end: ball };
}
