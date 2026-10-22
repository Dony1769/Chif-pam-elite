"use client";

/**
 * FC CAREER 27 — Réalisation télévisée du match.
 *
 * Caméra de tribune en perspective (comme une retransmission) qui suit le
 * ballon le long du terrain. Tout est animé en continu, image par image :
 * les joueurs courent vers leur place avec accélération et freinage, le
 * porteur conduit le ballon dans ses pieds, les passes roulent et ralentissent,
 * les centres et dégagements montent en cloche (ombre au sol), les frappes
 * partent sèchement, les touches se jouent à la main.
 *
 * Repère du jeu : x 0-100 en largeur, y 0 = but adverse, 100 = notre but.
 * Monde : X 0-105 m sur la longueur (nous attaquons vers la droite),
 * Z 0-68 m en largeur (0 = côté opposé à la caméra).
 */

import React, { useEffect, useRef } from "react";
import type { BallKind } from "../../game/player2/pitchPlay";

type Pt = { x: number; y: number };
export interface TVDot { id: string; mine: boolean; me: boolean; pt: Pt; label: string; gk: boolean; num: number }
export interface TVBall { key: string; path: Pt[]; dur: number; kind?: BallKind }
export interface TVArrow { id: string; to: Pt; kind: "shot" | "pass" | "run" | "def"; hot: boolean }

interface Props {
  dots: TVDot[];
  ball: TVBall;
  /** Porteur du ballon (le ballon reste dans ses pieds à l'arrêt) */
  holder?: string | null;
  /** Durée des déplacements en cours (ms) */
  moveDur: number;
  colors: { mine: string; mineAlt: string; theirs: string; theirsAlt: string };
  camera: "dynamic" | "fixed";
  /** Point d'intérêt (moment clé, tir) : la caméra resserre */
  focus?: Pt | null;
  arrows?: TVArrow[];
  from?: Pt | null;
  badge?: { id: string; kind: "yellow" | "red" | "injury" | "glove" } | null;
  names: Set<string>;
  frozen?: boolean;
  reduce?: boolean;
  /** Plan de coupe (coup de pied arrêté, nouvelle séquence) : tout le monde est déjà en place */
  cut?: string | null;
}

const L = 105, W = 68;
const toWorld = (p: Pt) => ({ X: ((100 - p.y) / 100) * L, Z: (p.x / 100) * W });
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

interface Cam { cx: number; dist: number; h: number; fov: number }
interface Body { x: number; z: number; vx: number; vz: number; phase: number; face: number }

/** Hauteur maximale (m) et vitesse relative de chaque geste. */
const ARC: Record<string, { peak: number; ease: "out" | "lin" | "inout" }> = {
  pass: { peak: 0.15, ease: "out" }, carry: { peak: 0, ease: "inout" }, cross: { peak: 6.5, ease: "lin" }, long: { peak: 9, ease: "lin" },
  shot: { peak: 1.4, ease: "lin" }, head: { peak: 1.8, ease: "lin" }, lost: { peak: 0.3, ease: "out" }, out: { peak: 0.4, ease: "out" },
  throw: { peak: 2.6, ease: "lin" }, kick: { peak: 8, ease: "lin" }, start: { peak: 0, ease: "inout" },
};

export function MatchTV(props: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef(props);
  useEffect(() => { live.current = props; });
  const state = useRef({
    bodies: new Map<string, Body>(),
    ball: { x: 52.5, z: 34, y: 0 },
    anim: null as null | { key: string; pts: { X: number; Z: number }[]; t0: number; dur: number; kind: string; startY: number },
    lastKey: "",
    cam: { cx: 52.5, dist: 46, h: 24, fov: 40 } as Cam,
    last: 0,
    cut: "" as string,
    crowd: [] as { x: number; y: number; c: number }[],
  });

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const st = state.current;
    // Foule : points colorés fixes (deux couleurs de club + neutres)
    if (!st.crowd.length) {
      let s = 7;
      const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
      for (let k = 0; k < 1400; k++) st.crowd.push({ x: rnd(), y: rnd(), c: rnd() });
    }

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const p = live.current;
      const dt = Math.min(0.05, st.last ? (now - st.last) / 1000 : 0.016);
      st.last = now;
      const rect = cv.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const Wpx = Math.max(1, Math.round(rect.width * dpr)), Hpx = Math.max(1, Math.round(rect.height * dpr));
      if (cv.width !== Wpx || cv.height !== Hpx) { cv.width = Wpx; cv.height = Hpx; }

      // ── Joueurs : course vers la cible avec accélération limitée ──
      const tau = clamp(p.moveDur / 1000 / 4, 0.07, 0.45);
      const seen = new Set<string>();
      const cutNow = !!p.cut && p.cut !== st.cut;
      if (cutNow) st.cut = p.cut!;
      for (const d of p.dots) {
        seen.add(d.id);
        const t = toWorld(d.pt);
        let b = st.bodies.get(d.id);
        if (!b) { b = { x: t.X, z: t.Z, vx: 0, vz: 0, phase: Math.random() * 6, face: d.mine ? 0 : Math.PI }; st.bodies.set(d.id, b); }
        if (p.reduce || cutNow) { b.x = t.X; b.z = t.Z; b.vx = b.vz = 0; continue; }
        // Ressort amorti critique : arrive à l'heure, sans à-coup
        const w = 1 / tau;
        const ax = w * w * (t.X - b.x) - 2 * w * b.vx, az = w * w * (t.Z - b.z) - 2 * w * b.vz;
        b.vx += ax * dt; b.vz += az * dt;
        // Sprint ~9,5 m/s, mais un joueur en retard accélère pour être à l'heure
        const need = Math.hypot(t.X - b.x, t.Z - b.z) / Math.max(0.25, p.moveDur / 1000);
        const sp = Math.hypot(b.vx, b.vz), max = Math.max(9.5, need * 1.3);
        if (sp > max) { b.vx *= max / sp; b.vz *= max / sp; }
        b.x += b.vx * dt; b.z += b.vz * dt;
        if (sp > 0.4) b.face = Math.atan2(b.vz, b.vx);
        b.phase += dt * (2 + sp * 1.6);
      }
      for (const id of [...st.bodies.keys()]) if (!seen.has(id)) st.bodies.delete(id);

      // ── Ballon : trajectoire selon le geste ──
      const bk = p.ball;
      if (bk.key !== st.lastKey) {
        st.lastKey = bk.key;
        const pts = bk.path.map(toWorld);
        if (pts.length) {
          const start = { X: st.ball.x, Z: st.ball.z };
          const chain = Math.hypot(pts[0].X - start.X, pts[0].Z - start.Z) < 0.5 || pts.length === 1 ? [start, ...pts.slice(pts.length === 1 ? 0 : 1)] : [start, ...pts];
          st.anim = { key: bk.key, pts: chain, t0: now, dur: Math.max(120, bk.dur), kind: bk.kind ?? "pass", startY: st.ball.y };
        }
      }
      const holderBody = p.holder ? st.bodies.get(p.holder) : undefined;
      if (st.anim) {
        const a = st.anim;
        const raw = clamp((now - a.t0) / a.dur, 0, 1);
        const arc = ARC[a.kind] ?? ARC.pass;
        const e = arc.ease === "out" ? 1 - (1 - raw) * (1 - raw) : arc.ease === "inout" ? raw * raw * (3 - 2 * raw) : raw;
        // Parcours le long de la polyligne (longueurs cumulées)
        const segs = a.pts.slice(1).map((q, i) => Math.hypot(q.X - a.pts[i].X, q.Z - a.pts[i].Z));
        const total = segs.reduce((t, v) => t + v, 0) || 1;
        let dist = e * total, i = 0;
        while (i < segs.length - 1 && dist > segs[i]) { dist -= segs[i]; i++; }
        const s = segs[i] ? dist / segs[i] : 1;
        const A = a.pts[i], B = a.pts[Math.min(i + 1, a.pts.length - 1)];
        st.ball.x = lerp(A.X, B.X, s); st.ball.z = lerp(A.Z, B.Z, s);
        // Hauteur : parabole selon la longueur du geste
        const peak = arc.peak * clamp(total / 30, 0.35, 1.4);
        st.ball.y = lerp(a.startY, 0, Math.min(1, raw * 3)) * (1 - raw) + 4 * peak * raw * (1 - raw);
        if (raw >= 1) { st.anim = null; st.ball.y = 0; }
      } else if (holderBody) {
        // Dans les pieds du porteur, légèrement devant lui
        const tx = holderBody.x + Math.cos(holderBody.face) * 0.7, tz = holderBody.z + Math.sin(holderBody.face) * 0.7;
        const k = 1 - Math.exp(-dt * 14);
        st.ball.x = lerp(st.ball.x, tx, k); st.ball.z = lerp(st.ball.z, tz, k); st.ball.y = 0;
      }

      // ── Caméra de tribune ──
      const focus = p.focus ? toWorld(p.focus) : null;
      const want: Cam = p.camera === "fixed"
        ? { cx: 52.5, dist: 74, h: 44, fov: 56 }
        : focus ? { cx: clamp(focus.X, 20, 85), dist: 40, h: 21, fov: 34 } : { cx: clamp(st.ball.x + (st.anim ? 0 : 0), 24, 81), dist: 44, h: 23, fov: 40 };
      // Écran étroit (téléphone) : plan plus serré pour garder des joueurs lisibles
      if (Wpx / Hpx < 1.5) { want.fov *= p.camera === "fixed" ? 0.92 : 0.8; want.dist *= 0.95; }
      const kc = p.reduce || cutNow ? 1 : 1 - Math.exp(-dt / 0.55);
      if (cutNow && st.anim) { const e = st.anim.pts[st.anim.pts.length - 1]; st.ball.x = e.X; st.ball.z = e.Z; st.ball.y = 0; st.anim = null; st.cam.cx = want.cx; }
      const c = st.cam;
      c.cx = lerp(c.cx, want.cx, kc); c.dist = lerp(c.dist, want.dist, kc); c.h = lerp(c.h, want.h, kc); c.fov = lerp(c.fov, want.fov, kc);

      draw(ctx, Wpx, Hpx, dpr, st, p);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvas} className="pc-tv__canvas" />;
}

/** Projection perspective depuis la caméra de tribune. */
function projector(c: Cam, Wpx: number, Hpx: number) {
  const C = { x: c.cx, y: c.h, z: W + c.dist };
  const T = { x: c.cx, y: 0, z: W * 0.45 };
  let fx = T.x - C.x, fy = T.y - C.y, fz = T.z - C.z;
  const fl = Math.hypot(fx, fy, fz); fx /= fl; fy /= fl; fz /= fl;
  // Droite de l'écran = +X ; haut = (droite × avant) normalisé
  const rx = 1, ry = 0, rz = 0;
  let ux = ry * fz - rz * fy, uy = rz * fx - rx * fz, uz = rx * fy - ry * fx;
  const ul = Math.hypot(ux, uy, uz); ux /= ul; uy /= ul; uz /= ul;
  if (uy < 0) { ux = -ux; uy = -uy; uz = -uz; }
  const focal = (Wpx / 2) / Math.tan((c.fov * Math.PI) / 360);
  return (X: number, Y: number, Z: number) => {
    const dx = X - C.x, dy = Y - C.y, dz = Z - C.z;
    const depth = dx * fx + dy * fy + dz * fz;
    const sx = (dx * rx + dy * ry + dz * rz) / depth, sy = (dx * ux + dy * uy + dz * uz) / depth;
    return { x: Wpx / 2 + sx * focal, y: Hpx * 0.52 - sy * focal, s: focal / depth, depth };
  };
}

function draw(ctx: CanvasRenderingContext2D, Wpx: number, Hpx: number, dpr: number, st: { bodies: Map<string, Body>; ball: { x: number; y: number; z: number }; cam: Cam; crowd: { x: number; y: number; c: number }[] }, p: Props) {
  const P = projector(st.cam, Wpx, Hpx);
  // Ciel de stade et tribunes
  ctx.fillStyle = "#0b1226"; ctx.fillRect(0, 0, Wpx, Hpx);
  const farL = P(-45, 0, -3), farR = P(150, 0, -3);
  const topL = P(-45, 16, -18), topR = P(150, 16, -18);
  ctx.beginPath(); ctx.moveTo(farL.x, farL.y); ctx.lineTo(farR.x, farR.y); ctx.lineTo(topR.x, topR.y); ctx.lineTo(topL.x, topL.y); ctx.closePath();
  const g = ctx.createLinearGradient(0, topL.y, 0, farL.y); g.addColorStop(0, "#141b33"); g.addColorStop(1, "#232c4c");
  ctx.fillStyle = g; ctx.fill();
  // Spectateurs (points)
  ctx.save(); ctx.clip();
  for (const s of st.crowd) {
    const X = -45 + s.x * 195, Y = 1 + s.y * 15, Z = -3 - s.y * 15;
    const q = P(X, Y, Z);
    ctx.fillStyle = s.c < 0.3 ? p.colors.mine : s.c < 0.42 ? p.colors.theirs : s.c < 0.7 ? "#cfd6e6" : "#5b6688";
    ctx.globalAlpha = 0.55;
    ctx.fillRect(q.x, q.y, Math.max(1, q.s * 0.45), Math.max(1, q.s * 0.45));
  }
  ctx.restore(); ctx.globalAlpha = 1;
  // Panneaux publicitaires
  quad(ctx, P, [-30, 0, -1.4], [135, 0, -1.4], [135, 1, -1.4], [-30, 1, -1.4], "#0f2a63");
  ctx.save();
  const b0 = P(0, 0.5, -1.4);
  ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.font = `800 ${Math.max(7, b0.s * 0.62)}px system-ui, sans-serif`; ctx.textBaseline = "middle";
  for (let X = 2; X < 105; X += 26) { const q = P(X, 0.5, -1.4); ctx.fillText("CHIFPAM · FC CAREER 27", q.x, q.y); }
  ctx.restore();

  // Pelouse : bandes de tonte
  quad(ctx, P, [-30, 0, -1.4], [135, 0, -1.4], [135, 0, W + 30], [-30, 0, W + 30], "#2a7a37");
  for (let k = 0; k < 14; k++) {
    if (k % 2) continue;
    const x0 = (k * L) / 14, x1 = ((k + 1) * L) / 14;
    quad(ctx, P, [x0, 0, 0], [x1, 0, 0], [x1, 0, W], [x0, 0, W], "#318a40");
  }
  // Lignes
  ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = Math.max(1, 1.3 * dpr);
  const line = (pts: [number, number][]) => { ctx.beginPath(); pts.forEach(([x, z], i) => { const q = P(x, 0, z); if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); }); ctx.stroke(); };
  line([[0, 0], [L, 0], [L, W], [0, W], [0, 0]]);
  line([[L / 2, 0], [L / 2, W]]);
  const circle = (cx: number, cz: number, r: number, a0 = 0, a1 = Math.PI * 2) => line(Array.from({ length: 33 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / 32; return [cx + Math.cos(a) * r, cz + Math.sin(a) * r] as [number, number]; }));
  circle(L / 2, W / 2, 9.15);
  for (const side of [0, 1]) {
    const x0 = side ? L : 0, s = side ? -1 : 1;
    line([[x0, W / 2 - 20.16], [x0 + s * 16.5, W / 2 - 20.16], [x0 + s * 16.5, W / 2 + 20.16], [x0, W / 2 + 20.16]]);
    line([[x0, W / 2 - 9.16], [x0 + s * 5.5, W / 2 - 9.16], [x0 + s * 5.5, W / 2 + 9.16], [x0, W / 2 + 9.16]]);
    const a = Math.acos(5.5 / 9.15);
    circle(x0 + s * 11, W / 2, 9.15, side ? Math.PI - a : -a, side ? Math.PI + a : a);
    const spot = P(x0 + s * 11, 0, W / 2); ctx.fillStyle = "#fff"; ctx.fillRect(spot.x - dpr, spot.y - dpr, 2 * dpr, 2 * dpr);
  }

  // Flèches du moment clé (au sol)
  if (p.arrows?.length && p.from) {
    const f = toWorld(p.from);
    for (const a of p.arrows) {
      const t = toWorld(a.to);
      ctx.save();
      ctx.strokeStyle = a.kind === "shot" ? "#F6C84A" : a.kind === "pass" ? "#42C8FF" : a.kind === "run" ? "#B9FF39" : "#FF6B72";
      ctx.globalAlpha = a.hot ? 1 : 0.7; ctx.lineWidth = (a.hot ? 4 : 2.2) * dpr; ctx.setLineDash([6 * dpr, 5 * dpr]); ctx.lineDashOffset = -performance.now() / 40;
      const q0 = P(f.X, 0.05, f.Z), q1 = P(t.X, 0.05, t.Z);
      ctx.beginPath(); ctx.moveTo(q0.x, q0.y); ctx.lineTo(q1.x, q1.y); ctx.stroke();
      ctx.restore();
    }
  }

  // Objets triés par profondeur : buts, joueurs, ballon
  type Item = { depth: number; draw: () => void };
  const items: Item[] = [];
  for (const side of [0, 1]) items.push({ depth: P(side ? L : 0, 0, W / 2).depth + 0.01, draw: () => goal(ctx, P, side ? L : 0, side ? 1 : -1, dpr) });
  const dots = new Map(p.dots.map(d => [d.id, d]));
  for (const [id, b] of st.bodies) {
    const d = dots.get(id); if (!d) continue;
    const q = P(b.x, 0, b.z);
    items.push({ depth: q.depth, draw: () => player(ctx, P, b, d, p, dpr) });
  }
  const bq = P(st.ball.x, 0, st.ball.z);
  items.push({ depth: bq.depth - 0.05, draw: () => {
    // Ombre au sol, puis ballon à sa hauteur
    const sh = P(st.ball.x, 0, st.ball.z), up = P(st.ball.x, 0.11 + st.ball.y, st.ball.z);
    const r = Math.max(2.2 * dpr, up.s * 0.22);
    ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath(); ctx.ellipse(sh.x, sh.y, r * (1 + st.ball.y * 0.08), r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    const gr = ctx.createRadialGradient(up.x - r * 0.35, up.y - r * 0.35, r * 0.1, up.x, up.y, r);
    gr.addColorStop(0, "#ffffff"); gr.addColorStop(1, "#c7cfdc");
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(up.x, up.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(20,25,40,.6)"; ctx.lineWidth = Math.max(0.6, r * 0.15); ctx.stroke();
  } });
  items.sort((a, b) => b.depth - a.depth).forEach(i => i.draw());

  // Vignette de retransmission
  const v = ctx.createRadialGradient(Wpx / 2, Hpx / 2, Hpx * 0.3, Wpx / 2, Hpx / 2, Wpx * 0.75);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.35)");
  ctx.fillStyle = v; ctx.fillRect(0, 0, Wpx, Hpx);
}

type Proj = ReturnType<typeof projector>;

function quad(ctx: CanvasRenderingContext2D, P: Proj, a: number[], b: number[], c: number[], d: number[], fill: string) {
  const q = [a, b, c, d].map(v => P(v[0], v[1], v[2]));
  ctx.beginPath(); q.forEach((v, i) => (i ? ctx.lineTo(v.x, v.y) : ctx.moveTo(v.x, v.y))); ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
}

/** But : poteaux, transversale et filet en perspective. */
function goal(ctx: CanvasRenderingContext2D, P: Proj, x0: number, back: number, dpr: number) {
  const zA = W / 2 - 3.66, zB = W / 2 + 3.66, h = 2.44, d = 2 * (back < 0 ? -1 : 1) * -1;
  const xb = x0 - d;
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = Math.max(0.5, 0.7 * dpr);
  for (let k = 0; k <= 8; k++) {
    const z = lerp(zA, zB, k / 8);
    const a = P(x0, h, z), b = P(xb, h * 0.8, z), c = P(xb, 0, z);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.stroke();
  }
  for (let k = 0; k <= 4; k++) {
    const y = (h * k) / 4;
    const a = P(xb, y * 0.8, zA), b = P(xb, y * 0.8, zB);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  ctx.strokeStyle = "#ffffff"; ctx.lineWidth = Math.max(1.5, P(x0, 0, W / 2).s * 0.12);
  const p1 = P(x0, 0, zA), p2 = P(x0, h, zA), p3 = P(x0, h, zB), p4 = P(x0, 0, zB);
  ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.stroke();
  ctx.restore();
}

/** Joueur : ombre, jambes qui courent, short, maillot, tête, numéro. */
function player(ctx: CanvasRenderingContext2D, P: Proj, b: Body, d: TVDot, p: Props, dpr: number) {
  const foot = P(b.x, 0, b.z);
  const s = foot.s; // pixels par mètre à cette distance
  const hgt = 1.8 * s, wdt = 0.55 * s;
  const shirt = d.gk ? (d.mine ? "#F6E05E" : "#9AE6B4") : d.mine ? p.colors.mine : p.colors.theirs;
  const alt = d.mine ? p.colors.mineAlt : p.colors.theirsAlt;
  const speed = Math.hypot(b.vx, b.vz);
  const stride = Math.sin(b.phase * 2.2) * Math.min(1, speed / 4) * wdt * 0.55;
  ctx.save();
  // Ombre
  ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(foot.x + wdt * 0.3, foot.y, wdt * 0.9, wdt * 0.28, 0, 0, Math.PI * 2); ctx.fill();
  // Repère sous les pieds (vous)
  if (d.me) {
    ctx.strokeStyle = "#F6BF45"; ctx.lineWidth = Math.max(1.5, 2 * dpr);
    ctx.beginPath(); ctx.ellipse(foot.x, foot.y, wdt * 1.4, wdt * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
  }
  // Jambes
  ctx.strokeStyle = "#1b1f2a"; ctx.lineWidth = Math.max(1, wdt * 0.22); ctx.lineCap = "round";
  const hip = foot.y - hgt * 0.45;
  ctx.beginPath(); ctx.moveTo(foot.x - wdt * 0.15, hip); ctx.lineTo(foot.x - wdt * 0.15 + stride, foot.y);
  ctx.moveTo(foot.x + wdt * 0.15, hip); ctx.lineTo(foot.x + wdt * 0.15 - stride, foot.y); ctx.stroke();
  // Short
  ctx.fillStyle = alt; ctx.fillRect(foot.x - wdt / 2, hip - hgt * 0.1, wdt, hgt * 0.14);
  // Maillot
  ctx.fillStyle = shirt;
  roundRect(ctx, foot.x - wdt / 2 - wdt * 0.05, foot.y - hgt * 0.86, wdt * 1.1, hgt * 0.34, wdt * 0.18); ctx.fill();
  // Bras
  ctx.strokeStyle = shirt; ctx.lineWidth = Math.max(1, wdt * 0.2);
  ctx.beginPath(); ctx.moveTo(foot.x - wdt * 0.55, foot.y - hgt * 0.8); ctx.lineTo(foot.x - wdt * 0.65 - stride * 0.5, foot.y - hgt * 0.56);
  ctx.moveTo(foot.x + wdt * 0.55, foot.y - hgt * 0.8); ctx.lineTo(foot.x + wdt * 0.65 + stride * 0.5, foot.y - hgt * 0.56); ctx.stroke();
  // Tête
  ctx.fillStyle = "#d9a57e"; ctx.beginPath(); ctx.arc(foot.x, foot.y - hgt * 0.94, wdt * 0.32, 0, Math.PI * 2); ctx.fill();
  // Numéro
  if (s > 9) {
    ctx.fillStyle = alt; ctx.font = `800 ${Math.max(7, wdt * 0.55)}px system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(String(d.num), foot.x, foot.y - hgt * 0.69);
  }
  // Carton / gants
  if (p.badge?.id === d.id) {
    const k = p.badge.kind;
    ctx.fillStyle = k === "yellow" ? "#FFD43B" : k === "red" ? "#F0525B" : k === "glove" ? "#5CE1FF" : "#ffffff";
    roundRect(ctx, foot.x - wdt * 0.3, foot.y - hgt * 1.35, wdt * 0.6, wdt * 0.8, 2); ctx.fill();
    if (k === "injury") { ctx.fillStyle = "#F0525B"; ctx.font = `900 ${wdt * 0.7}px system-ui`; ctx.textAlign = "center"; ctx.fillText("+", foot.x, foot.y - hgt * 1.35 + wdt * 0.42); }
  }
  // Nom
  if (d.me || p.names.has(d.id)) {
    const label = d.label;
    ctx.font = `700 ${Math.max(10, 11 * dpr)}px system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    const tw = ctx.measureText(label).width + 8 * dpr;
    const y = foot.y - hgt * 1.12;
    ctx.fillStyle = d.me ? "rgba(246,191,69,.95)" : "rgba(6,12,30,.8)";
    roundRect(ctx, foot.x - tw / 2, y - 14 * dpr, tw, 15 * dpr, 4 * dpr); ctx.fill();
    ctx.fillStyle = d.me ? "#0A1430" : "#ffffff"; ctx.fillText(label, foot.x, y - 1 * dpr);
  }
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
