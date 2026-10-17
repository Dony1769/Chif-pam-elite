"use client";

/**
 * FC CAREER 27 — Séquences animées des événements du monde : tirages des coupes
 * d'Europe, finales, titres, Ballon d'Or, Golden Boy… Elles se jouent au retour
 * sur le jeu, une par une ; « Passer » ferme, un toucher accélère.
 * Les événements vus sont retenus dans ce navigateur (aucune donnée de partie modifiée).
 */

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import type { WorldLiveState } from "../../../game/domain/worldState";
import { allCinematics, relevant, type Cinematic, type Me } from "./events";

const TrophyScene = dynamic(() => import("./TrophyScene"), { ssr: false, loading: () => null });

const MAX_QUEUE = 4;
const read = (k: string): string[] | null => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } };
const write = (k: string, v: string[]) => { try { localStorage.setItem(k, JSON.stringify(v.slice(-600))); } catch { /* stockage indisponible */ } };

export function CinematicHost({ world, me, storageKey }: { world: WorldLiveState; me: Me; storageKey: string }) {
  const { clubId, playerId, nation } = me;
  const all = useMemo(() => { const m = { clubId, playerId, nation }; return allCinematics(world, m).filter(c => relevant(c, world, m)); }, [world, clubId, playerId, nation]);
  const [queue, setQueue] = useState<Cinematic[]>([]);

  useEffect(() => {
    const key = `fc-career:seen:${storageKey}`;
    const seen = read(key);
    if (!seen) { write(key, all.map(c => c.id)); return; } // première visite : rien d'ancien à rejouer
    // Nouveau club (transfert, prêt) : son passé (titres, tirages) n'est pas rejoué
    const clubKey = `${key}:club`;
    let lastClub: string | null = null;
    try { lastClub = localStorage.getItem(clubKey); localStorage.setItem(clubKey, clubId ?? ""); } catch { /* stockage indisponible */ }
    if (lastClub !== null && lastClub !== (clubId ?? "")) { write(key, [...seen, ...all.map(c => c.id)]); return; }
    const fresh = all.filter(c => !seen.includes(c.id));
    if (!fresh.length) return;
    // Après une longue simulation : les plus récents et ceux qui vous concernent d'abord
    const mine = (c: Cinematic) => (c.kind === "ceremony" ? c.winner.isMe : c.kind === "final" ? c.winner.isMe : c.groups.some(g => g.teams.some(t => t.isMe)));
    const picked = [...fresh.filter(mine), ...fresh.filter(c => !mine(c)).reverse()].slice(0, MAX_QUEUE);
    write(key, [...seen, ...fresh.map(c => c.id)]);
    setQueue(q => [...q, ...picked.filter(p => !q.some(x => x.id === p.id))]);
  }, [all, storageKey]);

  const current = queue[0];
  const close = () => setQueue(q => q.slice(1));
  return (
    <AnimatePresence>
      {current && <Sequence key={current.id} c={current} onClose={close} more={queue.length - 1} />}
    </AnimatePresence>
  );
}

function Confetti() {
  const bits = useMemo(() => Array.from({ length: 60 }, (_, i) => ({
    left: (i * 37) % 100, delay: (i % 12) * 0.12, dur: 2.4 + (i % 5) * 0.4, hue: ["#B9FF39", "#F6C84A", "#5CE1FF", "#ffffff", "#FF6BD6"][i % 5], rot: (i * 47) % 360,
  })), []);
  return (
    <div className="cin-confetti" aria-hidden="true">
      {bits.map((b, i) => <i key={i} style={{ left: `${b.left}%`, background: b.hue, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s`, transform: `rotate(${b.rot}deg)` }} />)}
    </div>
  );
}

function Sequence({ c, onClose, more }: { c: Cinematic; onClose: () => void; more: number }) {
  // Phases : 0 intro, 1 nommés / tirage, 2 suspense, 3 révélation
  const [phase, setPhase] = useState(0);
  const nominees = c.kind === "ceremony" ? [...c.nominees].filter(n => n.id !== c.winner.id).slice(0, 9).reverse() : [];
  useEffect(() => {
    const plan = c.kind === "ceremony" ? [1800, 900 + nominees.length * 550, 1800] : c.kind === "draw" ? [1400, 99999] : [1500, 1700];
    if (phase >= plan.length) return;
    const t = window.setTimeout(() => setPhase(p => p + 1), plan[phase]);
    return () => window.clearTimeout(t);
  }, [phase, c.kind, nominees.length]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  const reveal = c.kind === "ceremony" ? phase >= 3 : c.kind === "final" ? phase >= 2 : false;
  const won = (c.kind === "ceremony" && c.winner.isMe) || (c.kind === "final" && c.winner.isMe);

  return (
    <motion.div className={`cin cin--${c.kind}${won ? " is-mine" : ""}`} role="dialog" aria-modal="true" aria-label={c.title}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.35 } }}
      onClick={() => (reveal || c.kind === "draw" ? undefined : setPhase(p => p + 1))}>
      <div className="cin__beams" aria-hidden="true" />
      <header className="cin__head">
        <motion.p className="cin__kicker" initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}>{c.subtitle}</motion.p>
        <motion.h2 className="cin__title" initial={{ scale: 1.25, opacity: 0, letterSpacing: "0.3em" }} animate={{ scale: 1, opacity: 1, letterSpacing: "0.01em" }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}>{c.title}</motion.h2>
      </header>

      {c.kind !== "draw" && (
        <div className="cin__stage">
          <TrophyScene kind={c.trophy} rise />
        </div>
      )}

      {c.kind === "ceremony" && (
        <div className="cin__body">
          {phase === 1 && (
            <ol className="cin__nominees">
              {nominees.map((n, i) => (
                <motion.li key={n.id} className={n.isMe ? "is-me" : ""} initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.5 }}>
                  <span className="cin__rank">{nominees.length - i + 1}</span><b>{n.name}</b><span>{n.club}{n.stats ? ` · ${n.stats}` : ""}</span>
                </motion.li>
              ))}
            </ol>
          )}
          {phase === 2 && <motion.p className="cin__suspense" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>Et le vainqueur est…</motion.p>}
          {reveal && <Winner name={c.winner.name} club={c.winner.club} isMe={!!c.winner.isMe} stats={c.winner.stats} />}
        </div>
      )}

      {c.kind === "final" && (
        <div className="cin__body">
          {phase >= 1 && c.score && <motion.p className="cin__score" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>{c.score}{c.runnerUp ? ` · face à ${c.runnerUp}` : ""}</motion.p>}
          {reveal && <Winner name={c.winner.name} club={c.subtitle} isMe={c.winner.isMe} />}
        </div>
      )}

      {c.kind === "draw" && phase >= 1 && (
        <div className="cin__groups">
          {c.groups.map((g, gi) => (
            <motion.section key={g.name} className="cin__group" initial={{ rotateX: -70, opacity: 0, y: 30 }} animate={{ rotateX: 0, opacity: 1, y: 0 }} transition={{ delay: gi * 0.18, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
              <h3>{g.name}</h3>
              {g.teams.map((t, ti) => (
                <motion.div key={t.id} className={`cin__ball${t.isMe ? " is-me" : ""}`} initial={{ scale: 0, y: -40 }} animate={{ scale: 1, y: 0 }} transition={{ delay: 0.5 + gi * 0.18 + ti * 0.22, type: "spring", stiffness: 260, damping: 18 }}>
                  {t.name}
                </motion.div>
              ))}
            </motion.section>
          ))}
        </div>
      )}

      {(reveal && won) && <Confetti />}
      <footer className="cin__foot">
        <button type="button" className="cin__btn" onClick={e => { e.stopPropagation(); onClose(); }}>
          {reveal || (c.kind === "draw" && phase >= 1) ? (more > 0 ? `Continuer (${more})` : "Continuer") : "Passer"}
        </button>
      </footer>
    </motion.div>
  );
}

function Winner({ name, club, isMe, stats }: { name: string; club: string; isMe: boolean; stats?: string }) {
  return (
    <motion.div className={`cin__winner${isMe ? " is-me" : ""}`} initial={{ scale: 0.4, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 160, damping: 14 }}>
      <b>{name}</b>
      <span>{isMe ? "C'est vous !" : club}</span>
      {stats && <small className="cin__stats">{stats}</small>}
    </motion.div>
  );
}
