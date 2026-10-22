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
  /** Passe interceptée : receveur visé et point visé (le rendu montre la passe coupée) */
  to?: string;
  aim?: Pt;
  /** Perte de balle sur un dribble (tacle) plutôt que sur une passe */
  tackle?: boolean;
  /** Qualité du geste (0-1) d'après les notes du joueur : passe précise, dribble, frappe */
  q?: number;
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
  passes: [4, 10] as [number, number],
  /** Conduite de balle (par action, selon le dribble) et réussite du tacle */
  carry: 0.18,
  tackle: 0.3,
  /** Passes vers la surface : défense regroupée, interceptions plus fréquentes */
  boxInt: 2.2,
  /** Poids d'une passe vers la surface, et poids du gain de terrain dans le choix */
  boxPass: 0.3,
  gainW: 22,
  shootNear: 0.38,
  shootFar: 0.12,
  /** Frappes lointaines des bons tireurs */
  longShot: 0.12,
  gain: [1, 6] as [number, number],
  shootZone: 17,
  intBase: 0.04,
  intNear: 0.1,
  intRadius: 7,
  intSkillExp: 0.8,
  intPowerExp: 0.3,
  xgScale: 0.26,
  xgDecay: 16,
  duelExp: 0.6,
  homeXg: 1.12,
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
  // Le joueur le plus proche vient chercher le ballon là où il est (pas de ballon téléporté)
  let holder = [...att].sort((a, b) => dist(pos[a.p.id], start) - dist(pos[b.p.id], start))[0];
  let ball = { x: clamp(start.x, 3, 97), y: clamp(start.y, 3, 97) };
  pos = { ...pos, [holder.p.id]: ball };
  frames.push({ w: 0.5, ball, holder: holder.p.id, pos, kind: "start" });
  let prev: Unit | null = null;
  const maxActions = rng.int(TUNE.passes[0], TUNE.passes[1]);
  // Repère de niveau : la défense adverse (les gestes se jugent face à l'adversaire, pas dans l'absolu)
  const ref = def.length ? def.reduce((t, u) => t + skill(u.p, u.pos, "def"), 0) / def.length : 60;
  const pressure = (q: Pt) => {
    const d = [...def].sort((a, b) => dist(pos[a.p.id], q) - dist(pos[b.p.id], q))[0];
    return d ? { u: d, d: dist(pos[d.p.id], q) } : null;
  };

  for (let k = 0; k <= maxActions; k++) {
    // Distance à l'embouchure du but (largeur ±6) : un attaquant excentré n'est pas pénalisé deux fois
    const gDist = Math.hypot(Math.max(0, Math.abs(ball.x - 50) - 6), ball.y - goalY);
    const shoNow = skill(holder.p, holder.pos, "sho");
    // Zone de tir ; les bons frappeurs tentent aussi de loin
    const longShot = gDist >= TUNE.shootZone && gDist < 30 && rng.chance(TUNE.longShot * Math.pow(shoNow / ref, 3));
    // Marqué de près, le porteur cherche plutôt une solution
    const tight = pressure(ball);
    const room = tight ? clamp(tight.d / 5, 0.35, 1) : 1;
    if ((gDist < TUNE.shootZone && rng.chance((gDist < 15 ? TUNE.shootNear : TUNE.shootFar) * room)) || longShot) {
      // Le tireur repique vers l'axe avant de frapper
      ball = { x: 50 + (ball.x - 50) * 0.55, y: ball.y };
      pos = { ...pos, [holder.p.id]: ball };
      // Angle de tir : 0 face au but, 1 sur la ligne de but
      const angle = Math.atan2(Math.abs(ball.x - 50), Math.max(1, Math.abs(ball.y - goalY))) / (Math.PI / 2);
      const keeper = all.find(u => u.side !== side && u.line === "GK");
      const sh = shoNow;
      const gk = keeper ? effectiveRating(keeper.p, "GK") : 35;
      const duel = clamp(sh / Math.max(30, gk), 0.6, 1.6);
      const gD2 = Math.hypot(Math.max(0, Math.abs(ball.x - 50) - 6), ball.y - goalY);
      const xg = clamp(TUNE.xgScale * Math.exp(-gD2 / TUNE.xgDecay) * (1 - angle * 0.35) * Math.pow(duel, TUNE.duelExp) * opts.quality * (side === "home" ? TUNE.homeXg : 1) * rng.float(0.6, 1.4), 0.02, 0.75);
      frames.push({ w: 0.6, ball, holder: holder.p.id, pos, kind: "shot", q: clamp((sh - 40) / 50, 0, 1) });
      return { phase: { minute, side, frames }, shot: { shooter: holder.p, assist: prev?.p ?? null, xg, from: ball }, end: ball };
    }
    if (k === maxActions) break;
    const pasNow = skill(holder.p, holder.pos, "pas"), driNow = skill(holder.p, holder.pos, "dri");
    // Conduite de balle : un bon dribbleur avec de l'espace avance balle au pied
    const press = pressure(ball);
    const space = press ? press.d : 30;
    if (rng.chance(clamp(TUNE.carry * Math.pow(driNow / ref, 1.5) * (space > 8 ? 1.4 : 0.7), 0.03, 0.6))) {
      const run: Pt = { x: clamp(ball.x + rng.float(-6, 6), 5, 95), y: clamp(ball.y + dir * rng.float(5, 11), 4, 96) };
      const opp = pressure(run);
      if (opp && opp.d < 7) {
        // Duel : dribble contre défense
        const ratio = skill(opp.u.p, opp.u.pos, "def") / Math.max(30, driNow);
        if (rng.chance(clamp(TUNE.tackle * Math.pow(ratio, 1.4) / Math.pow(opts.power, TUNE.intPowerExp), 0.04, 0.7))) {
          const lost = { x: (run.x + pos[opp.u.p.id].x) / 2, y: (run.y + pos[opp.u.p.id].y) / 2 };
          pos = shapeAround(all, lost, side === "home" ? "away" : "home");
          pos[opp.u.p.id] = lost;
          frames.push({ w: 0.8, ball: lost, holder: opp.u.p.id, pos, kind: "lost", tackle: true });
          return { phase: { minute, side, frames }, shot: null, end: lost };
        }
      }
      pos = shapeAround(all, run, side);
      pos[holder.p.id] = run;
      ball = run;
      frames.push({ w: 0.8, ball, holder: holder.p.id, pos, kind: "carry", q: clamp((driNow - 40) / 50, 0, 1) });
      continue;
    }
    // Passe : un bon passeur voit plus loin et joue plus vers l'avant
    const vision = clamp(pasNow / ref, 0.6, 1.5);
    const cands = att.filter(u => u.p.id !== holder.p.id);
    const weights = cands.map(u => {
      const q = pos[u.p.id];
      const gain = Math.abs(ball.y - goalY) - Math.abs(q.y - goalY);
      const d = dist(ball, q);
      // Un partenaire marqué de près est un mauvais choix
      const mk = pressure(q);
      const free = mk ? clamp(mk.d / 6, 0.25, 1.2) : 1.2;
      // Entrée dans la surface : seulement pour un partenaire démarqué ou un passeur qui voit l'ouverture
      const inBox = Math.hypot(Math.max(0, Math.abs(q.x - 50) - 6), q.y - goalY) < 24;
      const boxW = inBox ? TUNE.boxPass * vision * free : 1;
      return Math.max(0.05, 1 + (gain / TUNE.gainW) * vision) * Math.exp(-Math.max(0, d - 18 * vision) / 12) * free * boxW;
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
      const len = dist(ball, recv);
      const ratio = skill(near.p, near.pos, "def") / Math.max(30, pasNow);
      // Passe longue = plus risquée ; passeur précis = moins risquée
      const toBox = Math.hypot(Math.max(0, Math.abs(recv.x - 50) - 6), recv.y - goalY) < 24 ? TUNE.boxInt : 1;
      const pInt = clamp((TUNE.intBase + TUNE.intNear * Math.exp(-dd / TUNE.intRadius)) * (0.7 + len / 60) * toBox * Math.pow(ratio, TUNE.intSkillExp) / Math.pow(opts.power, TUNE.intPowerExp) / Math.pow(opts.tactic ?? 1, TUNE.tacticExp), 0.02, 0.7);
      if (rng.chance(pInt)) {
        const lost = { x: (mid.x + pos[near.p.id].x) / 2, y: (mid.y + pos[near.p.id].y) / 2 };
        pos = shapeAround(all, lost, side === "home" ? "away" : "home");
        pos[near.p.id] = lost;
        frames.push({ w: 0.8, ball: lost, holder: near.p.id, pos, kind: "lost", to: to.p.id, aim: recv });
        return { phase: { minute, side, frames }, shot: null, end: lost };
      }
    }
    prev = holder;
    holder = to;
    pos = shapeAround(all, recv, side);
    pos[to.p.id] = recv;
    ball = recv;
    frames.push({ w: 1, ball, holder: to.p.id, pos, kind: "pass", q: clamp((pasNow - 40) / 50, 0, 1) });
  }
  return { phase: { minute, side, frames }, shot: null, end: ball };
}
