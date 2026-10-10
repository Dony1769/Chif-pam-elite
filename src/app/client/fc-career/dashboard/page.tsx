"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ALL_51_ATTRIBUTES } from '../constants';
import { getAttributeCap, evaluatePlayerRole, createInitialPlayer, trainWeek, TRAINING_FOCUS } from '../engine';
import { saveGame, loadGame, clearAllSaves } from '../utils/storage';
import type { PlayerCareerState, AttributeCategory, TrainingFocus } from '../types';
import { Shield, Plus, TrendingUp, Dumbbell, Download, Trash2 } from 'lucide-react';

type Tab = 'attributs' | 'messages' | 'carriere';


const CATEGORY_ORDER: AttributeCategory[] = [
  'Attaque',
  'Technique & Passes',
  'Physique & Moteur',
  'Mental & Tactique',
  'Défense',
  'Gardien',
];

const SENDER_LABEL: Record<string, string> = {
  coach: 'Coach',
  agent: 'Agent',
  club: 'Club',
  sponsor: 'Sponsor',
  presse: 'Presse',
  famille: 'Famille',
  systeme: 'Système',
};

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>{label}</span>
        <span className="font-mono">{Math.round(pct)}</span>
      </div>
      <div className="mt-1 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-slate-950/60 p-2 text-center">
      <p className="text-[9px] font-bold uppercase text-slate-400">{label}</p>
      <p className="text-sm font-black text-white">{value}</p>
    </div>
  );
}

export default function CareerDashboardPage() {
  const router = useRouter();
  const [player, setPlayer] = useState<PlayerCareerState | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('attributs');
  const [openMessageId, setOpenMessageId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const isUnlocked = sessionStorage.getItem('fc_career_unlocked');
    if (!isUnlocked) {
      router.push('/client/fc-career');
      return;
    }

    const saved = loadGame();
    setPlayer(saved || createInitialPlayer());
    setLoading(false);
  }, [router]);

  if (loading || !player) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020617]">
        <p className="text-white">Chargement...</p>
      </div>
    );
  }

  const role = evaluatePlayerRole(player.attributes, player.coach);
  const ss = player.seasonStats;
  const unreadCount = player.inbox.filter((m) => !m.read).length;
  const injured = player.injuryWeeks > 0;

  const updatePlayer = (p: PlayerCareerState) => {
    setPlayer(p);
    saveGame(p);
  };

  const upgradeAttribute = (attrId: string) => {
    if (player.skillPointsAvailable <= 0) return;
    const val = player.attributes[attrId] || 50;
    const cap = getAttributeCap(attrId, player.heightCm, player.weightKg);
    if (val >= cap) return;
    updatePlayer({
      ...player,
      skillPointsAvailable: player.skillPointsAvailable - 1,
      attributes: { ...player.attributes, [attrId]: val + 1 },
    });
  };

  const train = (focus: TrainingFocus) => updatePlayer(trainWeek(player, focus));
  const openMessage = (id: string) =>
    updatePlayer({
      ...player,
      inbox: player.inbox.map((m) => (m.id === id ? { ...m, read: true } : m)),
    });

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-24">
      {/* HEADER */}
      <header className="border-b border-white/10 bg-gradient-to-br from-emerald-950 via-slate-900 to-[#020617] px-4 pb-6 pt-6">
        <div className="mx-auto max-w-5xl">
          <p className="text-[10px] font-black uppercase text-emerald-400">U{player.age} - Saison {player.season} - Journée {player.week}/38</p>
          <div className="mt-3 flex items-center gap-4">
            <div className="flex h-24 w-20 flex-col items-center justify-center rounded-2xl border border-emerald-400/40 bg-gradient-to-b from-emerald-400/20 to-slate-900">
              <span className="text-4xl font-black text-emerald-300">{role.overallRating}</span>
              <span className="mt-1 text-xs font-black text-white">{role.assignedPosition}</span>
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-black uppercase">{player.playerName}</h1>
              <p className="text-xs text-slate-400">{player.age} ans | {player.clubName}</p>
              <span
                className={`mt-2 inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                  injured ? 'border-rose-500/40 bg-rose-500/10 text-rose-300' : role.isStarter ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                }`}
              >
                {injured ? 'Blessé' : role.isStarter ? 'Titulaire' : 'Remplaçant'}
              </span>
            </div>
            <button onClick={() => setShowSettings(!showSettings)} className="rounded-2xl border border-white/10 bg-slate-950/80 p-3">
              ⚙️
            </button>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2">
            <Stat label="Matchs" value={ss.matches} />
            <Stat label="Buts" value={ss.goals} />
            <Stat label="Passes D." value={ss.assists} />
            <Stat label="Points" value={ss.wins * 3 + ss.draws} />
          </div>
        </div>
      </header>

      {/* SETTINGS */}
      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="border-b border-white/10 bg-slate-900/80 px-4 py-3">
            <div className="mx-auto max-w-5xl flex gap-2">
              <button onClick={() => saveGame(player)} className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-[10px] font-bold">
                <Download size={12} /> Sauvegarder
              </button>
              <button
                onClick={() => {
                  if (confirm('Réinitialiser ?')) {
                    clearAllSaves();
                    updatePlayer(createInitialPlayer());
                  }
                }}
                className="flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[10px] font-bold text-rose-300"
              >
                <Trash2 size={12} /> Réinit
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="mx-auto mt-6 grid max-w-5xl grid-cols-1 gap-6 px-4 lg:grid-cols-3">
        {/* LEFT */}
        <section className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5">
            <h2 className="mb-3 text-xs font-black uppercase text-amber-300">Entraînement</h2>
            {injured ? (
              <p className="text-[11px] text-rose-300">Blessé ({player.injuryWeeks} sem.)</p>
            ) : !player.trainedThisWeek ? (
              <div className="space-y-2">
                {(Object.keys(TRAINING_FOCUS) as TrainingFocus[]).map((f) => (
                  <button key={f} onClick={() => train(f)} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-left text-[11px] font-bold text-white hover:border-emerald-500/50">
                    <span>{TRAINING_FOCUS[f].label}</span>
                    <span className="float-right text-[10px] text-slate-400">{TRAINING_FOCUS[f].fatigue > 0 ? '+' : ''}{TRAINING_FOCUS[f].fatigue}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-emerald-300">{player.lastTrainingNote}</p>
            )}
          </div>

          <div className="space-y-3 rounded-3xl border border-white/10 bg-slate-900/60 p-5">
            <h2 className="flex items-center gap-2 text-xs font-black uppercase text-slate-400">
              <TrendingUp size={16} className="text-emerald-400" /> Visibilité
            </h2>
            <StatBar label="Réputation" value={player.reputation.niveau} color="bg-emerald-400" />
            <StatBar label="Image" value={player.reputation.image} color="bg-cyan-400" />
            <StatBar label="Moral" value={player.reputation.moral} color="bg-amber-400" />
            <StatBar label="Forme" value={player.form} color="bg-fuchsia-400" />
            <StatBar label="Fatigue" value={player.fatigue} color="bg-rose-400" />
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5">
            <h2 className="mb-3 flex items-center gap-2 text-xs font-black uppercase text-slate-400">
              <Shield size={16} className="text-emerald-400" /> {player.coach.name}
            </h2>
            <p className="text-xs text-slate-300">Style : {player.coach.tacticalStyle}</p>
            <div className="mt-2">
              <StatBar label="Relation" value={player.coach.relation} color="bg-sky-400" />
            </div>
          </div>
        </section>

        {/* RIGHT */}
        <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 lg:col-span-2">
          <div className="mb-4 flex gap-2">
            {(['attributs', 'messages', 'carriere'] as Tab[]).map((id) => (
              <button key={id} onClick={() => setTab(id)} className={`rounded-xl border px-4 py-2 text-xs font-bold ${tab === id ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300' : 'border-white/10 bg-slate-950/60 text-slate-400'}`}>
                {id === 'messages' && unreadCount > 0 && <span className="mr-2 text-rose-300">{unreadCount}</span>}
                {id.charAt(0).toUpperCase() + id.slice(1)}
              </button>
            ))}
          </div>

          {/* ATTRIBUTS */}
          {tab === 'attributs' && (
            <div className="max-h-[620px] space-y-4 overflow-y-auto pr-2">
              {CATEGORY_ORDER.map((cat) => (
                <div key={cat}>
                  <h3 className="mb-2 text-[10px] font-black uppercase text-emerald-400">{cat}</h3>
                  <div className="space-y-3">
                    {ALL_51_ATTRIBUTES.filter((a) => a.category === cat).map((attr) => {
                      const val = player.attributes[attr.id] || 50;
                      const cap = getAttributeCap(attr.id, player.heightCm, player.weightKg);
                      return (
                        <div key={attr.id} className="border-b border-white/5 pb-2 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="pr-2">
                              <span className="font-bold text-white">{attr.name}</span>
                              <p className="text-[10px] text-slate-400">{attr.description}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-emerald-400">
                                {val}/{cap}
                              </span>
                              <button onClick={() => upgradeAttribute(attr.id)} disabled={player.skillPointsAvailable <= 0 || val >= cap} className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 font-bold text-black disabled:opacity-30">
                                <Plus size={16} />
                              </button>
                            </div>
                          </div>
                          <div className="mt-1.5 h-1 w-full bg-slate-800 rounded-full">
                            <div className="h-full bg-emerald-500/70 rounded-full" style={{ width: `${val}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* MESSAGES */}
          {tab === 'messages' && (
            <div className="max-h-[620px] space-y-2 overflow-y-auto pr-2">
              {player.inbox.map((m) => (
                <button key={m.id} onClick={() => openMessage(m.id)} className={`w-full rounded-2xl border p-3 text-left ${m.read ? 'border-white/5 bg-slate-950/40' : 'border-emerald-500/30 bg-emerald-500/5'}`}>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-bold">{SENDER_LABEL[m.from] ?? m.from}</span>
                    <span>S{m.season} J{m.week}</span>
                  </div>
                  <p className="mt-1 text-xs font-bold text-white">{m.title}</p>
                  {openMessageId === m.id && <p className="mt-2 text-[11px] text-slate-300">{m.body}</p>}
                </button>
              ))}
            </div>
          )}

          {/* CARRIÈRE */}
          {tab === 'carriere' && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <p className="text-[10px] font-black uppercase text-emerald-400">Saison</p>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  <Stat label="V" value={ss.wins} />
                  <Stat label="N" value={ss.draws} />
                  <Stat label="D" value={ss.losses} />
                  <Stat label="Pts" value={ss.wins * 3 + ss.draws} />
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <p className="text-[10px] font-black uppercase text-emerald-400">Carrière</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <Stat label="Matchs" value={player.careerStats.matches} />
                  <Stat label="Buts" value={player.careerStats.goals} />
                  <Stat label="Passes" value={player.careerStats.assists} />
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      <div className="text-center mt-10 text-white pb-10">
        <p className="text-[10px] text-slate-400">Points d'attributs : {player.skillPointsAvailable}</p>
      </div>
    </div>
  );
}
