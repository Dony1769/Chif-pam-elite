"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ALL_51_ATTRIBUTES } from '../constants';
import { getAttributeCap, evaluatePlayerRole, createInitialPlayer, advanceWeek } from '../engine';
import { getAgeStage, getCategoryLabel, getUnlockStatuses, WEEKS_PER_SEASON } from '../rules';
import { PlayerCareerState, AttributeCategory } from '../types';
import { Shield, Award, Play, Plus, Mail, Lock, Check, TrendingUp } from 'lucide-react';

type Tab = 'attributs' | 'messages' | 'paliers';

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
        <span className="font-mono text-white">{Math.round(pct)}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function CareerDashboardPage() {
  const router = useRouter();
  const [player, setPlayer] = useState<PlayerCareerState>(createInitialPlayer);
  const [tab, setTab] = useState<Tab>('attributs');
  const [openMessageId, setOpenMessageId] = useState<string | null>(null);

  // Vérification de la sécurité PIN
  useEffect(() => {
    const isUnlocked = sessionStorage.getItem('fc_career_unlocked');
    if (!isUnlocked) {
      router.push('/client/fc-career');
    }
  }, [router]);

  // Réévaluation automatique par le Coach
  const { assignedPosition, overallRating } = evaluatePlayerRole(player.attributes, player.coach);
  const stage = getAgeStage(player.age);
  const unlocks = getUnlockStatuses(player.age, player.reputation, player.week);
  const unreadCount = player.inbox.filter((m) => !m.read).length;

  const upgradeAttribute = (attrId: string) => {
    if (player.skillPointsAvailable <= 0) return;
    const currentVal = player.attributes[attrId] || 50;
    const maxCap = getAttributeCap(attrId, player.heightCm, player.weightKg);
    if (currentVal >= maxCap) return;

    setPlayer((prev) => ({
      ...prev,
      skillPointsAvailable: prev.skillPointsAvailable - 1,
      attributes: { ...prev.attributes, [attrId]: currentVal + 1 },
    }));
  };

  const handleNextWeek = () => {
    setPlayer(advanceWeek(player));
  };

  const openMessage = (id: string) => {
    setOpenMessageId((cur) => (cur === id ? null : id));
    setPlayer((prev) => ({
      ...prev,
      inbox: prev.inbox.map((m) => (m.id === id ? { ...m, read: true } : m)),
    }));
  };

  const participationLabel =
    player.lastWeek?.participation === 'titulaire'
      ? 'Titulaire'
      : player.lastWeek?.participation === 'remplacant'
        ? 'Entré en jeu'
        : 'Tribune';

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 sm:p-6 pb-24">
      {/* EN-TÊTE JOUEUR */}
      <header className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-slate-900/80 p-6 backdrop-blur-xl mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">
              {getCategoryLabel(player.age)} - Saison {player.season} - Semaine {player.week}/{WEEKS_PER_SEASON}
            </span>
            <h1 className="text-2xl font-black uppercase italic">{player.playerName}</h1>
            <p className="text-xs text-slate-400">
              {player.age} ans | {player.heightCm} cm | {player.weightKg} kg | {player.clubName}
            </p>
            <p className="text-[11px] text-slate-500">{stage.title}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-3 text-center">
              <span className="text-[9px] uppercase font-bold text-slate-400">Poste / Note</span>
              <p className="text-lg font-black text-emerald-400">
                {assignedPosition} {overallRating}
              </p>
            </div>
            <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-3 text-center">
              <span className="text-[9px] uppercase font-bold text-slate-400">Statut</span>
              <p className={`text-sm font-black ${player.isStarter ? 'text-emerald-400' : 'text-amber-400'}`}>
                {player.isStarter ? 'Titulaire' : 'Remplaçant'}
              </p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3 text-center">
              <span className="text-[9px] uppercase font-bold text-emerald-400">Points d'attributs</span>
              <p className="text-xl font-black text-white">{player.skillPointsAvailable}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLONNE GAUCHE */}
        <section className="space-y-6">
          {/* JAUGES */}
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 space-y-3">
            <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-400" /> Visibilité
            </h2>
            <StatBar label="Réputation" value={player.reputation.niveau} color="bg-emerald-400" />
            <StatBar label="Image" value={player.reputation.image} color="bg-cyan-400" />
            <StatBar label="Moral" value={player.reputation.moral} color="bg-amber-400" />
            <StatBar label="Forme" value={player.form} color="bg-fuchsia-400" />
            <p className="text-[11px] text-slate-400">
              {Math.round(player.reputation.followers).toLocaleString('fr-FR')} abonnés
            </p>
          </div>

          {/* COACH */}
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5">
            <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3 flex items-center gap-2">
              <Shield size={16} className="text-emerald-400" /> {player.coach.name}
            </h2>
            <p className="text-xs text-slate-300">Style : {player.coach.tacticalStyle}</p>
            <p className="text-xs text-slate-300">Exigence : {player.coach.strictness} de note</p>
            <div className="mt-2">
              <StatBar label="Relation avec le coach" value={player.coach.relation} color="bg-sky-400" />
            </div>
          </div>

          {/* SEMAINE */}
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5">
            <h2 className="text-xs font-black uppercase text-amber-400 tracking-wider mb-3 flex items-center gap-2">
              <Award size={16} /> Semaine
            </h2>
            {player.lastWeek ? (
              <p className="text-[11px] text-slate-300">
                Dernier match : {participationLabel}
                {player.lastWeek.matchRating !== null ? ` - note ${player.lastWeek.matchRating}` : ''} - réputation{' '}
                {player.lastWeek.reputationDelta >= 0 ? '+' : ''}
                {player.lastWeek.reputationDelta.toFixed(2)}
              </p>
            ) : (
              <p className="text-[11px] text-slate-400">Aucun match joué pour l'instant.</p>
            )}
            <button
              onClick={handleNextWeek}
              className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 py-2.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30"
            >
              <Play size={14} /> Semaine suivante
            </button>
          </div>
        </section>

        {/* COLONNE DROITE */}
        <section className="lg:col-span-2 rounded-3xl border border-white/10 bg-slate-900/60 p-5">
          {/* ONGLETS */}
          <div className="mb-4 flex gap-2">
            {(
              [
                ['attributs', 'Attributs'],
                ['messages', 'Messages'],
                ['paliers', 'Paliers'],
              ] as [Tab, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`relative rounded-xl px-4 py-2 text-xs font-bold border ${
                  tab === id
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-950/60 border-white/10 text-slate-400'
                }`}
              >
                {id === 'messages' && <Mail size={12} className="mr-1 inline" />}
                {label}
                {id === 'messages' && unreadCount > 0 && (
                  <span className="ml-1.5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ONGLET ATTRIBUTS */}
          {tab === 'attributs' && (
            <div className="space-y-4 max-h-[560px] overflow-y-auto pr-2">
              {CATEGORY_ORDER.map((cat) => (
                <div key={cat}>
                  <h3 className="mb-2 text-[10px] font-black uppercase tracking-widest text-emerald-400">{cat}</h3>
                  <div className="space-y-3">
                    {ALL_51_ATTRIBUTES.filter((a) => a.category === cat).map((attr) => {
                      const val = player.attributes[attr.id] || 50;
                      const cap = getAttributeCap(attr.id, player.heightCm, player.weightKg);
                      const isCapped = val >= cap;
                      return (
                        <div
                          key={attr.id}
                          className="flex items-center justify-between border-b border-white/5 pb-2 text-xs"
                        >
                          <div className="pr-2">
                            <span className="font-bold text-white">{attr.name}</span>
                            <p className="text-[10px] text-slate-400">{attr.description}</p>
                            {cap < 99 && (
                              <span className="text-[9px] text-amber-400 font-bold">Cap poids/taille : {cap}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-black text-emerald-400">
                              {val} / {cap}
                            </span>
                            <button
                              onClick={() => upgradeAttribute(attr.id)}
                              disabled={player.skillPointsAvailable <= 0 || isCapped}
                              className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-black font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-emerald-400"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ONGLET MESSAGES */}
          {tab === 'messages' && (
            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-2">
              {player.inbox.length === 0 && <p className="text-xs text-slate-400">Aucun message.</p>}
              {player.inbox.map((m) => (
                <button
                  key={m.id}
                  onClick={() => openMessage(m.id)}
                  className={`w-full text-left rounded-2xl border p-3 ${
                    m.read ? 'border-white/5 bg-slate-950/40' : 'border-emerald-500/30 bg-emerald-500/5'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-bold uppercase">{SENDER_LABEL[m.from] ?? m.from}</span>
                    <span>
                      Saison {m.season} - Sem. {m.week}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-bold text-white">{m.title}</p>
                  {openMessageId === m.id && <p className="mt-2 text-[11px] leading-relaxed text-slate-300">{m.body}</p>}
                </button>
              ))}
            </div>
          )}

          {/* ONGLET PALIERS */}
          {tab === 'paliers' && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <p className="text-[10px] font-black uppercase text-emerald-400">Palier actuel</p>
                <p className="text-sm font-black text-white">{stage.title}</p>
                <p className="mt-1 text-[11px] text-slate-400">{stage.description}</p>
              </div>
              {unlocks.map((u) => (
                <div key={u.id} className="flex items-start gap-3 rounded-2xl border border-white/5 bg-slate-950/40 p-3">
                  <div
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      u.unlocked ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {u.unlocked ? <Check size={14} /> : <Lock size={12} />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{u.label}</p>
                    <p className="text-[11px] text-slate-400">{u.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
