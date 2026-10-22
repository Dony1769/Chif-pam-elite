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
/** Nature du geste qui amène le ballon à cette image (rendu : trajectoire, hauteur, vitesse). */
export type BallKind = "start" | "pass" | "carry" | "cross" | "long" | "shot" | "lost" | "out" | "throw" | "kick" | "head" | "cut" | "tackle";
export interface Frame {
  /** Durée relative de la transition vers cette image */
  w: number;
  kind?: BallKind;
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
  const shotEv = i.events.find(e => (e.type === "goal" && !e.setPiece) || e.type === "shot" || e.type === "chance" || e.type === "save");
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
  frames.push(...setPieceFrames(i, all, frames[frames.length - 1]));
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

/**
 * Images d'écran à partir de la phase réellement jouée par le moteur
 * positionnel (repère domicile → repère du joueur), complétées par l'issue du
 * tir et les cartons de la minute.
 */
export function phaseFrames(phase: import("../manager/positional").Phase, i: MinuteInput): Frame[] {
  const flip = i.mySide === "away";
  const mp = (p: Pt): Pt => (flip ? { x: 100 - p.x, y: 100 - p.y } : p);
  const all = anchors(i.mine, i.theirs);
  const name = new Map(all.map(a => [a.id, a.name]));
  const raw: Frame[] = phase.frames.map((f, k) => {
    const pos = Object.fromEntries(Object.entries(f.pos).map(([id, v]) => [id, mp(v)]));
    const prevHolder = phase.frames[k - 1]?.holder;
    let kind: BallKind = f.kind === "assist" ? "pass" : f.kind;
    let caption: string | undefined;
    if (f.kind === "lost" && f.holder) {
      if (f.tackle) { kind = "tackle"; caption = `${name.get(f.holder) ?? "Le défenseur"} tacle ${name.get(prevHolder ?? "") ?? "le porteur"}`; }
      else if (f.to && f.aim) {
        // Passe coupée : le receveur visé court vers le point de passe, le défenseur s'interpose
        kind = "cut";
        pos[f.to] = mp(f.aim);
        caption = `Passe vers ${name.get(f.to) ?? "un partenaire"}, interceptée par ${name.get(f.holder) ?? "la défense"}`;
      } else caption = `${name.get(f.holder) ?? "L'adversaire"} récupère le ballon`;
    } else if (f.kind === "carry" && (f.q ?? 0) > 0.7 && f.holder) caption = `${name.get(f.holder)} s'échappe balle au pied`;
    else if (f.kind === "pass" && (f.q ?? 0) > 0.8 && prevHolder && Math.hypot(f.ball.x - phase.frames[k - 1].ball.x, f.ball.y - phase.frames[k - 1].ball.y) > 28) caption = `Ouverture millimétrée de ${name.get(prevHolder)}`;
    return { w: f.w, ball: mp(f.ball), holder: f.holder, kind, pos, caption };
  });
  const attMineRaw = (phase.side === i.mySide);
  const frames = direct(raw, all, attMineRaw, i);
  const last = frames[frames.length - 1];
  if (!last) return minuteFrames(i);
  const shotEv = i.events.find(e => (e.type === "goal" && !e.setPiece) || e.type === "shot" || e.type === "chance" || e.type === "save");
  if (shotEv) {
    const attMine = (shotEv.type === "save" ? (shotEv.side === "home" ? "away" : "home") : shotEv.side) === i.mySide;
    const goalY = attMine ? 0 : 100, dir = attMine ? 1 : -1;
    const keeper = all.find(a => a.gk && a.mine !== attMine);
    const saved = shotEv.type === "save" || shotEv.result === "saved";
    const sPt = last.ball;
    const end: Pt = shotEv.type === "goal" ? { x: 44 + ((i.minute * 7) % 13), y: goalY - dir * 2 }
      : saved ? { x: 46 + ((i.minute * 5) % 9), y: goalY + dir * 3 }
      : shotEv.type === "chance" ? { x: sPt.x < 50 ? 41 : 59, y: goalY - dir * 0.5 } : { x: sPt.x < 50 ? 30 : 70, y: goalY - dir * 2 };
    const after = { ...last.pos };
    if (keeper && after[keeper.id]) after[keeper.id] = { x: shotEv.type === "goal" ? (end.x < 50 ? 56 : 44) : end.x, y: after[keeper.id].y };
    last.caption = shotEv.type === "goal" && shotEv.assistId ? `${name.get(shotEv.assistId) ?? ""} pour ${name.get(shotEv.playerId ?? "") ?? ""}…` : `${name.get(shotEv.type === "save" ? shotEv.shooterId ?? "" : shotEv.playerId ?? "") ?? "Le tireur"} frappe…`;
    frames.push({
      w: 1.5, kind: "shot", ball: end, pos: after, caption: shotEv.text,
      flash: shotEv.type === "goal" ? { text: "BUT !", tone: attMine ? "good" : "bad" } : shotEv.type === "chance" ? { text: "Poteau !", tone: "neutral" } : undefined,
      badge: saved && keeper ? { id: keeper.id, kind: "glove" } : undefined,
    });
    // Arrêt : le gardien garde le ballon ; à côté : six mètres et dégagement long
    if (saved && keeper) frames.push({ w: 0.7, kind: "carry", ball: { x: after[keeper.id]?.x ?? 50, y: goalY + dir * 4 }, holder: keeper.id, pos: after });
    else if (shotEv.type === "shot" && keeper) {
      const six: Pt = { x: end.x < 50 ? 42 : 58, y: goalY + dir * 5 };
      const kp = { ...after, [keeper.id]: { x: six.x, y: six.y + dir * 1.5 } };
      frames.push({ w: 0.9, kind: "out", ball: six, holder: keeper.id, pos: kp, caption: "Six mètres" });
      const mates = all.filter(a => a.mine !== attMine && !a.gk);
      const tgt = mates.sort((a, b) => Math.abs((kp[a.id]?.y ?? 50) - 50) - Math.abs((kp[b.id]?.y ?? 50) - 50))[0];
      if (tgt) {
        const land: Pt = { x: clamp((kp[tgt.id]?.x ?? 50), 15, 85), y: 50 + dir * 4 };
        const p2 = shape(all, land, !attMine); p2[tgt.id] = land; p2[keeper.id] = { x: 50, y: goalY + dir * 3 };
        frames.push({ w: 1.2, kind: "long", ball: land, holder: tgt.id, pos: p2, caption: `${name.get(keeper.id) ?? "Le gardien"} dégage loin` });
      }
    }
  }
  frames.push(...setPieceFrames(i, all, frames[frames.length - 1]));
  for (const e of i.events) {
    const ref = frames[frames.length - 1];
    if (e.type === "yellow" || e.type === "red" || e.type === "injury") {
      frames.push({ w: 1.2, ball: ref.ball, pos: ref.pos, caption: e.text, badge: e.playerId ? { id: e.playerId, kind: e.type } : undefined });
    } else if (e.type === "half_time" || e.type === "full_time") {
      frames.push({ w: 1.4, ball: { x: 50, y: 50 }, pos: shape(all, { x: 50, y: 50 }, true), caption: e.text, flash: { text: e.type === "half_time" ? "MI-TEMPS" : "FIN DU MATCH", tone: "neutral" } });
    }
  }
  return frames;
}


/**
 * Coups de pied arrêtés de la minute : corner (centre au point de penalty,
 * reprise de la tête) ou coup franc (mur, frappe enroulée), avec leur issue.
 */
function setPieceFrames(i: MinuteInput, all: Anchor[], ref?: Frame): Frame[] {
  const out: Frame[] = [];
  const name = new Map(all.map(a => [a.id, a.name]));
  for (const e of i.events) {
    const kind = e.type === "corner" || e.type === "freekick" ? e.type : e.type === "goal" ? e.setPiece : undefined;
    if (!kind) continue;
    const attMine = e.side === i.mySide;
    const goalY = attMine ? 0 : 100, dir = attMine ? 1 : -1;
    const taker = all.find(a => a.id === e.playerId);
    const keeper = all.find(a => a.gk && a.mine !== attMine);
    const goal = e.type === "goal", saved = e.result === "saved";
    const att = all.filter(a => a.mine === attMine && !a.gk), def = all.filter(a => a.mine !== attMine && !a.gk);
    const end: Pt = goal ? { x: 46 + ((i.minute * 3) % 9), y: goalY - dir * 2 } : saved ? { x: 50, y: goalY + dir * 3 } : { x: 62, y: goalY - dir * 3 };
    if (kind === "corner") {
      const flag: Pt = { x: (i.minute % 2) ? 2 : 98, y: goalY + dir * 1 };
      const head: Pt = { x: 48 + ((i.minute * 5) % 7), y: goalY + dir * 9 };
      const box = shape(all, { x: 50, y: goalY + dir * 12 }, attMine);
      // Attaquants et défenseurs dans la surface
      att.slice(-5).forEach((a, k) => { box[a.id] = { x: 38 + k * 6, y: goalY + dir * (8 + (k % 2) * 4) }; });
      def.slice(0, 5).forEach((a, k) => { box[a.id] = { x: 40 + k * 5, y: goalY + dir * (6 + (k % 2) * 4) }; });
      const kicker = att.find(a => a.id !== taker?.id);
      if (kicker) box[kicker.id] = flag;
      if (taker) box[taker.id] = { x: head.x, y: head.y + dir * 4 };
      out.push({ w: 1, kind: "out", ball: flag, holder: kicker?.id, pos: box, caption: `Corner pour ${attMine ? "vous" : "l'adversaire"}` });
      const at = { ...box, ...(taker ? { [taker.id]: head } : {}) };
      out.push({ w: 0.9, kind: "cross", ball: head, holder: taker?.id, pos: at, caption: `${name.get(taker?.id ?? "") ?? "Un joueur"} s'élève…` });
      out.push({ w: 1.3, kind: "head", ball: end, pos: { ...at, ...(keeper ? { [keeper.id]: { x: goal ? (end.x < 50 ? 56 : 44) : end.x, y: at[keeper.id]?.y ?? goalY + dir * 3 } } : {}) }, caption: e.text,
        flash: goal ? { text: "BUT !", tone: attMine ? "good" : "bad" } : undefined, badge: saved && keeper ? { id: keeper.id, kind: "glove" } : undefined });
    } else {
      const spot: Pt = { x: 40 + ((i.minute * 7) % 21), y: goalY + dir * 22 };
      const pos = shape(all, spot, attMine);
      // Le mur : quatre défenseurs à 9 mètres, entre le ballon et le but
      def.slice(0, 4).forEach((a, k) => { pos[a.id] = { x: spot.x + (50 - spot.x) * 0.35 - 4.5 + k * 3, y: spot.y - dir * 9 }; });
      if (taker) pos[taker.id] = { x: spot.x - 2, y: spot.y + dir * 3 };
      out.push({ w: 1, kind: "out", ball: spot, holder: taker?.id, pos, caption: `Coup franc : ${name.get(taker?.id ?? "") ?? "un tireur"} se présente` });
      const curve: Pt = { x: (spot.x + end.x) / 2 + (spot.x < 50 ? -6 : 6), y: (spot.y + goalY) / 2 };
      out.push({ w: 0.6, kind: "long", ball: curve, pos, caption: "Par-dessus le mur…" });
      out.push({ w: 1.2, kind: "shot", ball: end, pos: { ...pos, ...(keeper ? { [keeper.id]: { x: goal ? (end.x < 50 ? 56 : 44) : end.x, y: pos[keeper.id]?.y ?? goalY + dir * 3 } } : {}) }, caption: e.text,
        flash: goal ? { text: "BUT !", tone: attMine ? "good" : "bad" } : undefined, badge: saved && keeper ? { id: keeper.id, kind: "glove" } : undefined });
    }
  }
  void ref;
  return out;
}


/**
 * Mise en scène télévisée d'une phase réelle : conduites de balle avant les
 * passes, centres depuis les ailes, transversales aériennes, et touches
 * quand le ballon est perdu près de la ligne. Le résultat (qui a le ballon,
 * où se termine la phase) reste celui du moteur.
 */
function direct(raw: Frame[], all: Anchor[], attMine: boolean, i: MinuteInput): Frame[] {
  if (!raw.length) return raw;
  const rng = createRng(seedFromString(`${i.seed}-tv-${i.minute}`));
  const goalY = attMine ? 0 : 100, dir = attMine ? 1 : -1;
  const name = new Map(all.map(a => [a.id, a.name]));
  const out: Frame[] = [raw[0]];
  for (let k = 1; k < raw.length; k++) {
    const prev = out[out.length - 1], f = raw[k];
    if ((f.kind === "pass" || f.kind === "shot") && prev.holder && (prev.kind === "pass" || prev.kind === "cross" || prev.kind === "long" || prev.kind === "start")) {
      // Contrôle orienté : le receveur prend le ballon et avance d'un ou deux pas
      const carry = rng.float(1.5, 4);
      const from = prev.pos[prev.holder] ?? prev.ball;
      const c: Pt = { x: clamp(from.x + rng.float(-3, 3), 4, 96), y: clamp(from.y - dir * carry, 4, 96) };
      if (f.kind === "pass" || Math.abs(c.y - goalY) > 12) {
        out.push({ w: 0.4, kind: "carry", ball: c, holder: prev.holder, pos: { ...prev.pos, [prev.holder]: c } });
      }
    }
    if (f.kind === "pass") {
      const from = out[out.length - 1].ball;
      const wide = from.x < 28 || from.x > 72;
      const inBox = Math.abs(f.ball.y - goalY) < 26 && Math.abs(f.ball.x - 50) < 26 && Math.abs(from.y - goalY) < 40;
      const d = Math.hypot(f.ball.x - from.x, f.ball.y - from.y);
      f.kind = wide && inBox ? "cross" : d > 30 ? "long" : "pass";
      if (f.kind === "cross") f.caption = f.caption ?? `Centre de ${name.get(out[out.length - 1].holder ?? "") ?? "l'ailier"}`;
    }
    if ((f.kind === "lost" || f.kind === "cut") && (f.ball.x < 24 || f.ball.x > 76) && rng.chance(0.35) && f.holder) {
      // Ballon sorti : touche pour l'équipe qui récupère
      const side = f.ball.x < 50 ? -1.5 : 101.5;
      out.push({ w: 0.6, kind: "lost", ball: { x: side, y: f.ball.y }, pos: f.pos, caption: "Sortie en touche" });
      const line: Pt = { x: side < 0 ? 0.5 : 99.5, y: f.ball.y };
      const thrower = f.holder;
      const tp = { ...f.pos, [thrower]: line };
      out.push({ w: 0.7, kind: "out", ball: line, holder: thrower, pos: tp, caption: `Touche, ${name.get(thrower) ?? "remise en jeu"}` });
      const team = all.filter(a => a.mine === !attMine && !a.gk && a.id !== thrower);
      const mate = team.sort((a, b) => Math.hypot((tp[a.id]?.x ?? 50) - line.x, (tp[a.id]?.y ?? 50) - line.y) - Math.hypot((tp[b.id]?.x ?? 50) - line.x, (tp[b.id]?.y ?? 50) - line.y))[0];
      if (mate) {
        const to: Pt = { x: clamp(line.x + (side < 0 ? 9 : -9), 4, 96), y: clamp(line.y + rng.float(-5, 5), 6, 94) };
        out.push({ w: 0.8, kind: "throw", ball: to, holder: mate.id, pos: { ...shape(all, to, !attMine), [thrower]: { x: clamp(line.x + (side < 0 ? 3 : -3), 2, 98), y: line.y }, [mate.id]: to } });
      }
      continue;
    }
    out.push(f);
  }
  return out;
}
