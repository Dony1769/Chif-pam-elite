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
import { createRng, seedFromString } from "../../game/utils/random";

type Pt = { x: number; y: number };
interface Dot { id: string; mine: boolean; me: boolean; pt: Pt; label: string; gk: boolean }

const SHOTS = new Set(["shoot", "longshot", "finesse", "chip", "acrobatic", "header", "lowdriven", "powershot", "trivela", "freekick", "penalty"]);
const PASSES = new Set(["pass", "cross", "through", "longball", "outside", "longthrow", "quickthrow"]);
const RUNS = new Set(["dribble", "flair"]);
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

export function MatchPitch({ live, colors, hoverOption }: {
  live: PlayerLive;
  colors: { mine: string; mineAlt: string; theirs: string; theirsAlt: string };
  hoverOption?: MomentOption["id"] | null;
}) {
  const wide = useWide();
  const reduce = useReducedMotion();
  const m = live.match;
  const mySide = m.managedSide;
  const mine = m[mySide], theirs = m[mySide === "home" ? "away" : "home"];

  // Possession de la minute (déterministe), l'équipe qui a le ballon monte d'un cran
  const rng = createRng(seedFromString(`${m.seed}-pitch-${m.minute}`));
  const total = Math.max(1, m.home.possessionMinutes + m.away.possessionMinutes);
  const ours = live.moment ? !["defend", "keeper", "keepercross"].includes(live.moment.kind) : rng.chance(m.minute === 0 ? 0.5 : mine.possessionMinutes / total);
  const myPts = slotPts(mine, false, ours ? 7 : -3);
  const theirPts = slotPts(theirs, true, ours ? -3 : 7);

  // Petit mouvement : chaque joueur dérive autour de son poste
  const jitter = (id: string, p: Pt): Pt => {
    if (live.moment) return p;
    const r = createRng(seedFromString(`${id}-${m.minute}`));
    return { x: clamp(p.x + r.float(-4, 4), 3, 97), y: clamp(p.y + r.float(-4, 4), 3, 97) };
  };
  const dots: Dot[] = [];
  const add = (team: LiveTeam, pts: (Pt | null)[], own: boolean) => team.pitch.forEach((p: WorldPlayer | null, i) => {
    const pt = pts[i];
    if (!p || !pt) return;
    dots.push({ id: p.id, mine: own, me: p.id === live.playerId, pt: jitter(p.id, pt), label: p.lastName, gk: FORMATIONS[team.tactic.formation][i]?.pos === "GK" });
  });
  add(mine, myPts, true);
  add(theirs, theirPts, false);

  const meDot = dots.find(d => d.me);
  const spot = live.moment && meDot ? momentSpot(live.moment.kind, meDot.pt) : null;
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

  // Ballon : porteur de la minute, ou point du moment clé
  const holderPool = dots.filter(d => d.mine === ours && !d.gk);
  const holder = holderPool.length ? holderPool[rng.int(0, holderPool.length - 1)] : null;
  const restBall: Pt = spot ? spot.ball : holder ? { x: holder.pt.x + 1.5, y: holder.pt.y - 1.5 } : { x: 50, y: 50 };

  // Rejeu après une décision, ou but du reste du match
  const [replay, setReplay] = useState<{ key: string; path: Pt[]; flash: string | null; mineGoal: boolean | null } | null>(null);
  const lastSpot = useRef<{ spot: { me: Pt; ball: Pt; rival?: Pt }; dots: Dot[]; moment: KeyMoment } | null>(null);
  const momentNow = live.moment;
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
      setReplay({ key: `d${decisions}`, ...o });
      return;
    }
    if (goals > prev.goals) {
      const last = [...m.events].reverse().find(e => e.type === "goal");
      const forUs = last?.side === mySide;
      setReplay({ key: `g${goals}`, path: forUs ? [{ x: 45, y: 22 }, { x: 50, y: 2 }, { x: 50, y: -2 }] : [{ x: 55, y: 78 }, { x: 50, y: 98 }, { x: 50, y: 102 }], flash: "BUT !", mineGoal: forUs });
    }
  }, [decisions, goals, live.decisions, m.events, mySide]);
  useEffect(() => {
    if (!replay) return;
    const t = setTimeout(() => setReplay(null), reduce ? 900 : 2300);
    return () => clearTimeout(t);
  }, [replay, reduce]);

  // Repères : horizontal sur grand écran (nous attaquons vers la droite), vertical sinon (vers le haut)
  const P = (p: Pt) => (wide ? { left: `${100 - p.y}%`, top: `${p.x}%` } : { left: `${p.x}%`, top: `${p.y}%` });
  const arrows = live.moment && spot ? live.moment.options.map(o => ({ o, to: optionTarget(o.id, spot, dots) })) : [];
  const svgXY = (p: Pt) => (wide ? { x: 100 - p.y, y: p.x } : { x: p.x, y: p.y });

  return (
    <div className={`pc-pitch${wide ? " is-wide" : ""}${live.moment ? " is-frozen" : ""}`} aria-hidden>
      <div className="pc-pitch__field">
        <svg className="pc-pitch__lines" viewBox="0 0 100 100" preserveAspectRatio="none">
          {wide ? (
            <g>
              <rect x="1" y="1" width="98" height="98" /><line x1="50" y1="1" x2="50" y2="99" /><circle cx="50" cy="50" r="9" />
              <rect x="1" y="22" width="15" height="56" /><rect x="84" y="22" width="15" height="56" />
              <rect x="1" y="38" width="5" height="24" /><rect x="94" y="38" width="5" height="24" />
            </g>
          ) : (
            <g>
              <rect x="1" y="1" width="98" height="98" /><line x1="1" y1="50" x2="99" y2="50" /><circle cx="50" cy="50" r="9" />
              <rect x="22" y="1" width="56" height="15" /><rect x="22" y="84" width="56" height="15" />
              <rect x="38" y="1" width="24" height="5" /><rect x="38" y="94" width="24" height="5" />
            </g>
          )}
          {arrows.map(({ o, to }) => {
            const a = svgXY(spot!.me), b = svgXY(to);
            const kind = SHOTS.has(o.id) ? "shot" : PASSES.has(o.id) ? "pass" : RUNS.has(o.id) ? "run" : "def";
            return <line key={o.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={`pc-pitch__arrow is-${kind}${hoverOption === o.id ? " is-hot" : ""}`} />;
          })}
        </svg>
        <div className="pc-pitch__goal is-theirs" /><div className="pc-pitch__goal is-ours" />
        {dots.map(d => (
          <motion.div key={d.id} className={`pc-pitch__dot${d.mine ? " is-mine" : " is-theirs"}${d.me ? " is-me" : ""}${d.gk ? " is-gk" : ""}`}
            style={{ ["--c" as string]: d.mine ? colors.mine : colors.theirs, ["--c2" as string]: d.mine ? colors.mineAlt : colors.theirsAlt }}
            initial={false} animate={P(d.pt)} transition={{ duration: reduce ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] }}>
            {d.me && <span className="pc-pitch__name">{d.label}</span>}
          </motion.div>
        ))}
        {replay ? (
          <motion.div key={replay.key} className="pc-pitch__ball"
            initial={P(replay.path[0])} animate={{ left: replay.path.map(p => P(p).left), top: replay.path.map(p => P(p).top) }}
            transition={{ duration: reduce ? 0 : 1.1, ease: "easeInOut" }} />
        ) : (
          <motion.div className="pc-pitch__ball" initial={false} animate={P(restBall)} transition={{ duration: reduce ? 0 : 0.5, ease: "easeOut" }} />
        )}
      </div>
      <AnimatePresence>
        {replay?.flash && (
          <motion.div key={replay.key + "f"} className={`pc-pitch__flash${replay.mineGoal === true ? " is-good" : replay.mineGoal === false ? " is-bad" : ""}`}
            initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.2 }} transition={{ delay: reduce ? 0 : 0.8, duration: 0.35 }}>
            {replay.flash}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
