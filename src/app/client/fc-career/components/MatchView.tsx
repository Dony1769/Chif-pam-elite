"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fixture, MatchResult, MatchEventType, Participation, PlayerCareerState } from '../types';
import { buildMatchContext } from '../engine';
import { startMatch, advanceMatch, resolveMoment, toMatchResult } from '../match';
import { FastForward, SkipForward, Flag } from 'lucide-react';

interface Props {
  player: PlayerCareerState;
  fixture: Fixture;
  participation: Participation;
  onFinish: (result: MatchResult) => void;
}

const EVENT_STYLE: Record<MatchEventType, { icon: string; color: string }> = {
  coup_envoi: { icon: '🏁', color: 'text-slate-300' },
  entree: { icon: '🔁', color: 'text-sky-300' },
  occasion: { icon: '⚡', color: 'text-amber-300' },
  moment: { icon: '🎯', color: 'text-white' },
  but: { icon: '⚽', color: 'text-emerald-300' },
  but_encaisse: { icon: '🥅', color: 'text-rose-300' },
  carton: { icon: '🟨', color: 'text-yellow-300' },
  mi_temps: { icon: '⏸️', color: 'text-slate-400' },
  fin: { icon: '🏁', color: 'text-slate-300' },
};

function hint(p: number): { label: string; color: string } {
  if (p >= 0.45) return { label: 'Très probable', color: 'text-emerald-300' };
  if (p >= 0.3) return { label: 'Probable', color: 'text-lime-300' };
  if (p >= 0.15) return { label: 'Incertain', color: 'text-amber-300' };
  return { label: 'Très risqué', color: 'text-rose-300' };
}

const PARTICIPATION_LABEL: Record<Participation, string> = {
  titulaire: 'Titulaire',
  remplacant: 'Remplaçant',
  tribune: 'Tribune',
};

export default function MatchView({ player, fixture, participation, onFinish }: Props) {
  const [ctx] = useState(() => buildMatchContext(player));
  const [state, setState] = useState(() =>
    advanceMatch(startMatch(ctx, fixture, participation), ctx, participation !== 'tribune')
  );
  const [displayMinute, setDisplayMinute] = useState(0);
  const [fast, setFast] = useState(false);

  // Lecture progressive du match, minute par minute
  useEffect(() => {
    if (displayMinute >= state.minute) return;
    const t = setTimeout(() => setDisplayMinute((m) => m + 1), fast ? 30 : 110);
    return () => clearTimeout(t);
  }, [displayMinute, state.minute, fast]);

  const caughtUp = displayMinute >= state.minute;
  const showMoment = caughtUp && state.pendingMoment !== null;
  const showEnd = caughtUp && state.finished;

  const visible = state.events
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.minute <= displayMinute)
    .reverse();

  const scoreFor = state.events.filter((e) => e.type === 'but' && e.minute <= displayMinute).length;
  const scoreAgainst = state.events.filter((e) => e.type === 'but_encaisse' && e.minute <= displayMinute).length;

  const homeName = fixture.home ? player.clubName : fixture.opponentName;
  const awayName = fixture.home ? fixture.opponentName : player.clubName;
  const homeScore = fixture.home ? scoreFor : scoreAgainst;
  const awayScore = fixture.home ? scoreAgainst : scoreFor;

  const choose = (optionId: string) => {
    setState(advanceMatch(resolveMoment(state, optionId), ctx, participation !== 'tribune'));
  };

  const result = showEnd ? toMatchResult(state) : null;
  const playerOnPitch = displayMinute >= state.enterMinute && (state.sentOffMinute === null || displayMinute < state.sentOffMinute);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#020617] text-white">
      {/* TABLEAU DE SCORE */}
      <div className="border-b border-white/10 bg-gradient-to-b from-slate-900 to-[#020617] px-4 pb-3 pt-4">
        <div className="mx-auto max-w-xl">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <span>Journée {fixture.week}</span>
            <span>
              {PARTICIPATION_LABEL[participation]} - {state.position}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-3 items-center text-center">
            <p className="truncate text-sm font-black">{homeName}</p>
            <p className="text-3xl font-black tabular-nums text-emerald-300">
              {homeScore} - {awayScore}
            </p>
            <p className="truncate text-sm font-black">{awayName}</p>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <span className="w-10 text-xs font-mono text-slate-300">{Math.min(displayMinute, 90)}'</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all"
                style={{ width: `${(Math.min(displayMinute, 90) / 90) * 100}%` }}
              />
            </div>
            <span className={`text-[10px] font-bold ${playerOnPitch ? 'text-emerald-300' : 'text-slate-500'}`}>
              {playerOnPitch ? 'Sur le terrain' : participation === 'tribune' ? 'En tribune' : 'Sur le banc'}
            </span>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setFast((f) => !f)}
              className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 text-[11px] font-bold ${
                fast ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300' : 'border-white/10 text-slate-300'
              }`}
            >
              <FastForward size={12} /> Vitesse x3
            </button>
            {!caughtUp && (
              <button
                onClick={() => setDisplayMinute(state.minute)}
                className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-bold text-slate-300"
              >
                <SkipForward size={12} /> Passer
              </button>
            )}
          </div>
        </div>
      </div>

      {/* FIL DU MATCH */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-xl space-y-2">
          <AnimatePresence initial={false}>
            {visible.map(({ e, i }) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 rounded-2xl border border-white/5 bg-slate-900/60 p-3"
              >
                <span className="w-8 shrink-0 font-mono text-xs text-slate-400">{e.minute}'</span>
                <span>{EVENT_STYLE[e.type].icon}</span>
                <p className={`text-xs leading-relaxed ${EVENT_STYLE[e.type].color}`}>{e.text}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* DÉCISION */}
      <AnimatePresence>
        {showMoment && state.pendingMoment && (
          <motion.div
            key="moment"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="border-t border-emerald-500/30 bg-slate-900 px-4 pb-6 pt-4 shadow-2xl"
          >
            <div className="mx-auto max-w-xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-300">
                {state.pendingMoment.minute}' - {state.pendingMoment.title}
              </p>
              <p className="mt-1 text-sm text-white">{state.pendingMoment.prompt}</p>
              <div className="mt-3 space-y-2">
                {state.pendingMoment.options.map((o) => {
                  const h = hint(o.p);
                  return (
                    <button
                      key={o.id}
                      onClick={() => choose(o.id)}
                      className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-left hover:border-emerald-500/50 active:scale-[0.99]"
                    >
                      <span className="text-xs font-bold text-white">{o.label}</span>
                      <span className={`text-[10px] font-bold ${h.color}`}>{h.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {showEnd && result && (
          <motion.div
            key="end"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="border-t border-white/10 bg-slate-900 px-4 pb-6 pt-4"
          >
            <div className="mx-auto max-w-xl">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-slate-950/80 p-3">
                  <p className="text-[9px] font-bold uppercase text-slate-400">Note</p>
                  <p className="text-xl font-black text-emerald-300">
                    {result.rating !== null ? result.rating.toFixed(1) : '-'}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-950/80 p-3">
                  <p className="text-[9px] font-bold uppercase text-slate-400">Buts</p>
                  <p className="text-xl font-black text-white">{result.playerGoals}</p>
                </div>
                <div className="rounded-2xl bg-slate-950/80 p-3">
                  <p className="text-[9px] font-bold uppercase text-slate-400">Passes D.</p>
                  <p className="text-xl font-black text-white">{result.playerAssists}</p>
                </div>
              </div>
              <button
                onClick={() => onFinish(result)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 py-3.5 text-sm font-black uppercase text-black"
              >
                <Flag size={16} /> Terminer le match
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
