/**
 * FC CAREER 27 — Phases de jeu positionnelles (rendu du match en direct).
 *
 * Pour chaque minute simulée, une phase de jeu est construite avec les vrais
 * joueurs sur le terrain : l'équipe qui a réellement eu le ballon cette minute
 * le fait circuler vers le but adverse (passes vers des partenaires mieux
 * placés), puis la phase se termine comme le moteur l'a décidé : le tir réel
 * (but, arrêt, à côté, poteau) avec le vrai tireur et le vrai passeur, ou une
 * perte de balle récupérée par le défenseur adverse le plus proche.
 * Les 22 joueurs se placent à chaque instant selon un bloc tactique : ils
 * coulissent vers le ballon, le bloc monte en possession et se resserre sans.
 *
 * Repère : x 0-100 de gauche à droite, y = 0 but adverse (notre équipe
 * attaque vers le haut), y = 100 notre but. Pur et déterministe.
 */

import type { LiveTeam } from "../manager/matchSim";
import type { MatchEvent } from "../manager/types";
import { FORMATIONS } from "../manager/tactics";
import { createRng, seedFromString } from "../utils/random";

export type Pt = { x: number; y: number };
export interface Frame {
  /** Durée relative de la transition vers cette image */
  w: number;
  ball: Pt;
  holder?: string;
  pos: Record<string, Pt>;
  caption?: string;
  flash?: { text: string; tone: "good" | "bad" | "neutral" };
  badge?: { id: string; kind: "yellow" | "red" | "injury" | "glove" };
}

interface Anchor { id: string; name: string; x: number; y: number; line: string; gk: boolean; mine: boolean }

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/** Postes de départ des deux équipes dans notre repère. */
export function anchors(mine: LiveTeam, theirs: LiveTeam): Anchor[] {
  const out: Anchor[] = [];
  const add = (t: LiveTeam, own: boolean) => t.pitch.forEach((p, i) => {
    const s = FORMATIONS[t.tactic.formation][i];
    if (!p || !s) return;
    out.push({ id: p.id, name: p.lastName, x: own ? s.x : 100 - s.x, y: own ? s.y : 100 - s.y, line: s.line, gk: s.line === "GK", mine: own });
  });
  add(mine, true);
  add(theirs, false);
  return out;
}

/**
 * Bloc tactique : chaque joueur part de son poste, le bloc suit le ballon en
 * profondeur, coulisse latéralement, monte en possession et se resserre sans.
 */
export function shape(all: Anchor[], ball: Pt, myBall: boolean): Record<string, Pt> {
  const pos: Record<string, Pt> = {};
  for (const a of all) {
    const attacking = a.mine === myBall;
    if (a.gk) {
      const gy = a.mine ? 96 : 4;
      pos[a.id] = { x: clamp(50 + (ball.x - 50) * 0.18, 40, 60), y: gy + (a.mine ? -1 : 1) * clamp(Math.abs(ball.y - gy) * 0.06, 0, 6) };
      continue;
    }
    // Profondeur : tout le bloc glisse avec le ballon ; l'équipe en possession monte
    const depth = (ball.y - 50) * (attacking ? 0.6 : 0.5);
    const push = attacking ? (a.mine ? -9 : 9) : (a.mine ? 5 : -5);
    let y = a.y + depth + push;
    // Sans ballon, le bloc se resserre autour de sa ligne médiane
    if (!attacking) { const c = 50 + depth; y = c + (y - c) * 0.78; }
    const x = a.x + (ball.x - 50) * (attacking ? 0.22 : 0.38);
    pos[a.id] = { x: clamp(x, 4, 96), y: clamp(y, 5, 95) };
  }
  return pos;
}

/** Poids d'un receveur : plus avancé vers le but, pas trop loin du porteur. */
function receiver(team: Anchor[], from: Anchor, pos: Record<string, Pt>, goalY: number, rng: ReturnType<typeof createRng>, exclude: Set<string>): Anchor {
  const f = pos[from.id];
  const cands = team.filter(a => !a.gk && a.id !== from.id && !exclude.has(a.id));
  const w = cands.map(a => {
    const p = pos[a.id];
    const gain = (Math.abs(f.y - goalY) - Math.abs(p.y - goalY));
    const d = dist(f, p);
    return Math.max(0.05, 1 + gain / 12) * Math.exp(-Math.max(0, d - 22) / 14);
  });
  const total = w.reduce((t, v) => t + v, 0);
  let r = rng.float(0, total);
  for (let i = 0; i < cands.length; i++) { r -= w[i]; if (r <= 0) return cands[i]; }
  return cands[cands.length - 1] ?? from;
}

export interface MinuteInput {
  mine: LiveTeam;
  theirs: LiveTeam;
  mySide: "home" | "away";
  minute: number;
  /** Équipe qui a eu le ballon cette minute (moteur) */
  possession: "home" | "away";
  /** Événements visibles de la minute (tir, but, carton…) */
  events: MatchEvent[];
  seed: string;
  /** Dernier ballon affiché (continuité d'une minute à l'autre) */
  from?: Pt;
}

/** Images d'une minute de jeu : circulation, puis fin de phase réelle. */
export function minuteFrames(i: MinuteInput): Frame[] {
  const all = anchors(i.mine, i.theirs);
  const rng = createRng(seedFromString(`${i.seed}-phase-${i.minute}`));
  const byId = new Map(all.map(a => [a.id, a]));
  const frames: Frame[] = [];
  const shotEv = i.events.find(e => e.type === "goal" || e.type === "shot" || e.type === "chance" || e.type === "save");
  // Le camp qui attaque : celui du tir s'il y en a un, sinon la possession réelle
  const attSide = shotEv ? (shotEv.type === "save" ? (shotEv.side === "home" ? "away" : "home") : shotEv.side) : i.possession;
  const myBall = attSide === i.mySide;
  const goalY = myBall ? 0 : 100;
  const team = all.filter(a => a.mine === myBall);
  const opp = all.filter(a => a.mine !== myBall);
  if (!team.length) return [];

  // Départ : le joueur de l'équipe en possession le plus proche du dernier ballon
  const start0 = i.from ?? { x: 50, y: 50 };
  let pos = shape(all, start0, myBall);
  let holder = [...team].filter(a => !a.gk).sort((a, b) => dist(pos[a.id], start0) - dist(pos[b.id], start0))[0] ?? team[0];
  let ball = pos[holder.id];
  frames.push({ w: 0.6, ball, holder: holder.id, pos });

  const shooter = shotEv ? byId.get(shotEv.type === "save" ? shotEv.shooterId ?? "" : shotEv.playerId ?? "") : undefined;
  const assister = shotEv?.type === "goal" ? byId.get(shotEv.assistId ?? "") : undefined;
  const passes = shotEv ? rng.int(1, 3) : rng.int(2, 4);
  const used = new Set<string>([...(shooter ? [shooter.id] : []), ...(assister ? [assister.id] : [])]);
  for (let k = 0; k < passes; k++) {
    const r = receiver(team, holder, pos, goalY, rng, used);
    used.add(r.id);
    holder = r;
    // Le bloc se recale sur le nouveau point de ballon
    const target = pos[r.id];
    // Progression : chaque passe gagne du terrain vers le but
    const prog = { x: target.x, y: clamp(target.y + (goalY === 0 ? -1 : 1) * rng.float(2, 7), 8, 92) };
    pos = shape(all, prog, myBall);
    pos[r.id] = prog;
    ball = prog;
    frames.push({ w: 1, ball, holder: r.id, pos });
  }

  if (shotEv && shooter) {
    const dir = goalY === 0 ? 1 : -1;
    // Le passeur réel sert le tireur réel dans la surface
    if (assister) {
      const aPt = { x: assister.x < 50 ? 18 : 82, y: goalY + dir * 24 };
      pos = shape(all, aPt, myBall); pos[assister.id] = aPt; ball = aPt;
      frames.push({ w: 1, ball, holder: assister.id, pos, caption: `${assister.name} s'avance…` });
    }
    const deep = shotEv.type === "chance" ? 9 : shotEv.type === "goal" ? 11 : shotEv.type === "save" ? 13 : 20;
    const sPt = { x: clamp(shooter.x + rng.float(-8, 8), 28, 72), y: goalY + dir * deep };
    pos = shape(all, sPt, myBall); pos[shooter.id] = sPt;
    // Un défenseur adverse colle le tireur
    const marker = opp.filter(a => !a.gk).sort((a, b) => dist(pos[a.id], sPt) - dist(pos[b.id], sPt))[0];
    if (marker) pos[marker.id] = { x: sPt.x + (sPt.x < 50 ? 4 : -4), y: sPt.y + dir * 3 };
    ball = sPt;
    frames.push({ w: assister ? 0.8 : 1, ball, holder: shooter.id, pos, caption: assister ? `${assister.name} pour ${shooter.name}` : `${shooter.name} s'avance` });
    const keeper = opp.find(a => a.gk);
    const saved = shotEv.type === "save" || shotEv.result === "saved";
    const end: Pt = shotEv.type === "goal" ? { x: 44 + ((i.minute * 7) % 13), y: goalY - dir * 2 }
      : saved ? { x: 46 + ((i.minute * 5) % 9), y: goalY + dir * 3 }
      : shotEv.type === "chance" ? { x: sPt.x < 50 ? 41 : 59, y: goalY - dir * 0.5 } : { x: sPt.x < 50 ? 30 : 70, y: goalY - dir * 2 };
    const after = { ...pos };
    if (keeper) after[keeper.id] = { x: shotEv.type === "goal" ? (end.x < 50 ? 56 : 44) : end.x, y: pos[keeper.id].y };
    const ours = attSide === i.mySide;
    frames.push({
      w: 1.5, ball: end, pos: after, caption: shotEv.text,
      flash: shotEv.type === "goal" ? { text: "BUT !", tone: ours ? "good" : "bad" } : shotEv.type === "chance" ? { text: "Poteau !", tone: "neutral" } : undefined,
      badge: saved && keeper ? { id: keeper.id, kind: "glove" } : undefined,
    });
  } else {
    // Perte de balle : le défenseur adverse le plus proche récupère
    const thief = opp.filter(a => !a.gk).sort((a, b) => dist(pos[a.id], ball) - dist(pos[b.id], ball))[0];
    if (thief) {
      const tPt = { x: ball.x + rng.float(-3, 3), y: ball.y + (goalY === 0 ? 3 : -3) };
      pos = shape(all, tPt, !myBall); pos[thief.id] = tPt; ball = tPt;
      frames.push({ w: 0.8, ball, holder: thief.id, pos });
    }
  }
  // Cartons, blessures, mi-temps, fin
  for (const e of i.events) {
    if (e.type === "yellow" || e.type === "red" || e.type === "injury") {
      frames.push({ w: 1.2, ball, pos, caption: e.text, badge: e.playerId ? { id: e.playerId, kind: e.type } : undefined });
    } else if (e.type === "half_time" || e.type === "full_time") {
      const mid = { x: 50, y: 50 };
      frames.push({ w: 1.4, ball: mid, pos: shape(all, mid, myBall), caption: e.text, flash: { text: e.type === "half_time" ? "MI-TEMPS" : "FIN DU MATCH", tone: "neutral" } });
    }
  }
  return frames;
}
