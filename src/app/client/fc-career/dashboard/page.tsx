"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ALL_51_ATTRIBUTES } from '../constants';
import {
  getAttributeCap,
  evaluatePlayerRole,
  createInitialPlayer,
  trainWeek,
  rollParticipation,
  completeMatch,
  restWeek,
  buildMatchContext,
  TRAINING_FOCUS,
} from '../engine';
import { getFixture, simulateFullMatch } from '../match';
import { resolveEvent } from '../events';
import { getAgeStage, getCategoryLabel, getUnlockStatuses, WEEKS_PER_SEASON, BALANCE } from '../rules';
import {
  PlayerCareerState,
  AttributeCategory,
  Fixture,
  Participation,
  MatchResult,
  TrainingFocus,
} from '../types';
import MatchView from '../components/MatchView';
import { Shield, Play, Plus, Mail, Lock, Check, TrendingUp, Dumbbell, HeartPulse, Zap } from 'lucide-react';

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

const PARTICIPATION_LABEL: Record<Participation, string> = {
  titulaire: 'Titulaire',
  remplacant: 'Entré en jeu',
  tribune: 'Tribune',
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

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-slate-950/60 p-2 text-center">
      <p className="text-[9px] font-bold uppercase text-slate-400">{label}</p>
      <p className="text-sm font-black text-white">{value}</p>
    </div>
  );
}

export default function CareerDashboardPage() {
  const router = useRouter();
  const [player, setPlayer] = useState<PlayerCareerState>(createInitialPlayer);
  const [tab, setTab] = useState<Tab>('attributs');
  const [openMessageId, setOpenMessageId] = useState<string | null>(null);
  const [matchSetup, setMatchSetup] = useState<{ fixture: Fixture; participation: Participation } | null>(null);

  // Vérification de la sécurité PIN
  useEffect(() => {
    const isUnlocked = sessionStorage.getItem('fc_career_unlocked');
    if (!isUnlocked) {
      router.push('/client/fc-career');
    }
  }, [router]);

  const role = evaluatePlayerRole(player.attributes, player.coach);
  const stage = getAgeStage(player.age);
  const unlocks = getUnlockStatuses(player.age, player.reputation, player.week);
  const unreadCount = player.inbox.filter((m) => !m.read).length;
  const fixture = getFixture(player.season, player.week, player.teamStrength);
  const relationOk = player.coach.relation >= BALANCE.minRelationToStart;
  const willStart = role.isStarter && relationOk;
  const injured = player.injuryWeeks > 0;
  const ss = player.seasonStats;
  const avgRating = ss.ratedMatches > 0 ? (ss.ratingSum / ss.ratedMatches).toFixed(1) : '-';
  const lw = player.lastWeek;

  // ----- Actions -----
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

  const train = (focus: TrainingFocus) => setPlayer(trainWeek(player, focus));
  const rehab = () => setPlayer(restWeek(player));

  const playLive = () => {
    setMatchSetup({ fixture, participation: rollParticipation(player) });
  };

  const quickSim = () => {
    const participation = rollParticipation(player);
    const result = simulateFullMatch(buildMatchContext(player), fixture, participation);
    setPlayer(completeMatch(player, result));
  };

  const finishLiveMatch = (result: MatchResult) => {
    setPlayer(completeMatch(player, result));
    setMatchSetup(null);
  };

  const chooseEvent = (choiceId: string) => setPlayer(resolveEvent(player, choiceId));

  const openMessage = (id: string) => {
    setOpenMessageId((cur) => (cur === id ? null : id));
    setPlayer((prev) => ({
      ...prev,
      inbox: prev.inbox.map((m) => (m.id === id ? { ...m, read: true } : m)),
    }));
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-24">
      {/* ---------- CARTE JOUEUR ---------- */}
      <header className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-emerald-950 via-slate-900 to-[#020617] px-4 pb-6 pt-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative mx-auto max-w-5xl">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
            {getCategoryLabel(player.age)} - Saison {player.season} - Journée {player.week}/{WEEKS_PER_SEASON}
          </p>

          <div className="mt-3 flex items-center gap-4">
            <div className="flex h-24 w-20 shrink-0 flex-col items-center justify-center rounded-2xl border border-emerald-400/40 bg-gradient-to-b from-emerald-400/20 to-slate-900 shadow-lg">
              <span className="text-4xl font-black leading-none text-emerald-300">{role.overallRating}</span>
              <span className="mt-1 text-xs font-black tracking-widest text-white">{role.assignedPosition}</span>
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-black uppercase italic">{player.playerName}</h1>
              <p className="text-xs text-slate-400">
                {player.age} ans | {player.heightCm} cm | {player.weightKg} kg
              </p>
              <p className="text-xs text-slate-400">{player.clubName} - {stage.title}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                    injured
                      ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                      : willStart
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                        : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                  }`}
                >
                  {injured ? `Blessé (${player.injuryWeeks} sem.)` : willStart ? 'Titulaire' : 'Remplaçant'}
                </span>
                <span className="rounded-full border border-white/10 bg-slate-900/60 px-2.5 py-0.5 text-[10px] font-bold text-white">
                  {player.skillPointsAvailable} pts
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            <Stat label="Matchs" value={ss.matches} />
            <Stat label="Buts" value={ss.goals} />
            <Stat label="Passes D." value={ss.assists} />
            <Stat label="Note moy." value={avgRating} />
          </div>
        </div>
      </header>

      <main className="mx-auto mt-6 grid max-w-5xl grid-cols-1 gap-6 px-4 lg:grid-cols-3">
        {/* ---------- COLONNE GAUCHE ---------- */}
        <section className="space-y-6">
          {/* SEMAINE */}
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5">
            <h2 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-300">
              <Zap size={16} /> Cette semaine
            </h2>

            {/* Résultat du dernier match */}
            {lw && !player.trainedThisWeek && (
              <div className="mb-4 rounded-2xl border border-white/5 bg-slate-950/60 p-3">
                <p className="text-[10px] font-bold uppercase text-slate-400">
                  Journée {lw.week} - {lw.home ? 'Domicile' : 'Extérieur'} vs {lw.opponentName}
                </p>
                <p
                  className={`text-xl font-black tabular-nums ${
                    lw.goalsFor > lw.goalsAgainst
                      ? 'text-emerald-300'
                      : lw.goalsFor < lw.goalsAgainst
                        ? 'text-rose-300'
                        : 'text-amber-300'
                  }`}
                >
                  {lw.goalsFor} - {lw.goalsAgainst}
                </p>
                <p className="text-[11px] text-slate-300">
                  {PARTICIPATION_LABEL[lw.participation]}
                  {lw.rating !== null ? ` - note ${lw.rating.toFixed(1)}` : ''}
                  {lw.playerGoals > 0 ? ` - ${lw.playerGoals} but(s)` : ''}
                  {lw.playerAssists > 0 ? ` - ${lw.playerAssists} passe(s) D.` : ''}
                </p>
                <p className="text-[10px] text-slate-500">
                  Réputation {lw.reputationDelta >= 0 ? '+' : ''}
                  {lw.reputationDelta.toFixed(2)}
                </p>
              </div>
            )}

            {injured ? (
              <div>
                <div className="flex items-center gap-2 text-rose-300">
                  <HeartPulse size={16} />
                  <p className="text-xs font-bold">Blessé : encore {player.injuryWeeks} semaine(s)</p>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Tu ne peux ni t'entraîner ni jouer. Ton équipe affronte {fixture.opponentName} sans toi.
                </p>
                <button
                  onClick={rehab}
                  className="mt-3 w-full rounded-xl border border-rose-500/40 bg-rose-500/10 py-2.5 text-xs font-bold text-rose-200"
                >
                  Faire ma rééducation (semaine suivante)
                </button>
              </div>
            ) : !player.trainedThisWeek ? (
              <div>
                <p className="mb-2 text-[11px] text-slate-400">Choisis ton entraînement de la semaine :</p>
                <div className="space-y-2">
                  {(Object.keys(TRAINING_FOCUS) as TrainingFocus[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => train(f)}
                      className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-left hover:border-emerald-500/50"
                    >
                      <span>
                        <span className="block text-xs font-bold text-white">{TRAINING_FOCUS[f].label}</span>
                        <span className="block text-[10px] text-slate-400">{TRAINING_FOCUS[f].description}</span>
                      </span>
                      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                        <Dumbbell size={12} />
                        {TRAINING_FOCUS[f].fatigue > 0 ? `+${TRAINING_FOCUS[f].fatigue}` : TRAINING_FOCUS[f].fatigue}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                {player.lastTrainingNote && (
                  <p className="mb-3 text-[11px] text-emerald-300">{player.lastTrainingNote}</p>
                )}
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Prochain match</p>
                  <p className="text-sm font-black text-white">
                    {fixture.home ? 'Domicile' : 'Extérieur'} vs {fixture.opponentName}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Force adverse {fixture.opponentStrength} / ton équipe {player.teamStrength}
                  </p>
                  <p className={`mt-1 text-[11px] font-bold ${willStart ? 'text-emerald-300' : 'text-amber-300'}`}>
                    {willStart ? 'Tu es dans le onze de départ' : 'Tu es sur le banc'}
                  </p>
                </div>
                <button
                  onClick={playLive}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 py-3 text-xs font-black uppercase text-black"
                >
                  <Play size={14} /> Jouer le match
                </button>
                <button
                  onClick={quickSim}
                  className="mt-2 w-full rounded-xl border border-white/10 py-2.5 text-xs font-bold text-slate-300"
                >
                  Simuler rapidement
                </button>
              </div>
            )}
          </div>

          {/* JAUGES */}
          <div className="space-y-3 rounded-3xl border border-white/10 bg-slate-900/60 p-5">
            <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400">
              <TrendingUp size={16} className="text-emerald-400" /> Visibilité
            </h2>
            <StatBar label="Réputation" value={player.reputation.niveau} color="bg-emerald-400" />
            <StatBar label="Image" value={player.reputation.image} color="bg-cyan-400" />
            <StatBar label="Moral" value={player.reputation.moral} color="bg-amber-400" />
            <StatBar label="Forme" value={player.form} color="bg-fuchsia-400" />
            <StatBar label="Fatigue" value={player.fatigue} color="bg-rose-400" />
            <p className="text-[11px] text-slate-400">
              {Math.round(player.reputation.followers).toLocaleString('fr-FR')} abonnés
            </p>
          </div>

          {/* COACH */}
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5">
            <h2 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400">
              <Shield size={16} className="text-emerald-400" /> {player.coach.name}
            </h2>
            <p className="text-xs text-slate-300">Style : {player.coach.tacticalStyle}</p>
            <p className="text-xs text-slate-300">Exigence : {player.coach.strictness} de note</p>
            <div className="mt-2">
              <StatBar label="Relation avec le coach" value={player.coach.relation} color="bg-sky-400" />
            </div>
          </div>
        </section>

        {/* ---------- COLONNE DROITE ---------- */}
        <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 lg:col-span-2">
          <div className="mb-4 flex gap-2">
            {(
              [
                ['attributs', 'Attributs'],
                ['messages', 'Messages'],
                ['carriere', 'Carrière'],
              ] as [Tab, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`rounded-xl border px-4 py-2 text-xs font-bold ${
                  tab === id
                    ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                    : 'border-white/10 bg-slate-950/60 text-slate-400'
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

          {/* ATTRIBUTS */}
          {tab === 'attributs' && (
            <div className="max-h-[620px] space-y-4 overflow-y-auto pr-2">
              {CATEGORY_ORDER.map((cat) => (
                <div key={cat}>
                  <h3 className="mb-2 text-[10px] font-black uppercase tracking-widest text-emerald-400">{cat}</h3>
                  <div className="space-y-3">
                    {ALL_51_ATTRIBUTES.filter((a) => a.category === cat).map((attr) => {
                      const val = player.attributes[attr.id] || 50;
                      const cap = getAttributeCap(attr.id, player.heightCm, player.weightKg);
                      const isCapped = val >= cap;
                      return (
                        <div key={attr.id} className="border-b border-white/5 pb-2 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="pr-2">
                              <span className="font-bold text-white">{attr.name}</span>
                              <p className="text-[10px] text-slate-400">{attr.description}</p>
                              {cap < 99 && (
                                <span className="text-[9px] font-bold text-amber-400">Cap poids/taille : {cap}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-black text-emerald-400">
                                {val} / {cap}
                              </span>
                              <button
                                onClick={() => upgradeAttribute(attr.id)}
                                disabled={player.skillPointsAvailable <= 0 || isCapped}
                                className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 font-bold text-black hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-30"
                              >
                                <Plus size={16} />
                              </button>
                            </div>
                          </div>
                          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-800">
                            <div className="h-full rounded-full bg-emerald-500/70" style={{ width: `${val}%` }} />
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
              {player.inbox.length === 0 && <p className="text-xs text-slate-400">Aucun message.</p>}
              {player.inbox.map((m) => (
                <button
                  key={m.id}
                  onClick={() => openMessage(m.id)}
                  className={`w-full rounded-2xl border p-3 text-left ${
                    m.read ? 'border-white/5 bg-slate-950/40' : 'border-emerald-500/30 bg-emerald-500/5'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-bold uppercase">{SENDER_LABEL[m.from] ?? m.from}</span>
                    <span>
                      Saison {m.season} - J{m.week}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-bold text-white">{m.title}</p>
                  {openMessageId === m.id && (
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-300">{m.body}</p>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* CARRIÈRE */}
          {tab === 'carriere' && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <p className="text-[10px] font-black uppercase text-emerald-400">Palier actuel</p>
                <p className="text-sm font-black text-white">{stage.title}</p>
                <p className="mt-1 text-[11px] text-slate-400">{stage.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat label="Victoires" value={ss.wins} />
                <Stat label="Nuls" value={ss.draws} />
                <Stat label="Défaites" value={ss.losses} />
                <Stat label="Points" value={ss.wins * 3 + ss.draws} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Matchs carrière" value={player.careerStats.matches} />
                <Stat label="Buts carrière" value={player.careerStats.goals} />
                <Stat label="Passes D. carrière" value={player.careerStats.assists} />
              </div>

              {unlocks.map((u) => (
                <div
                  key={u.id}
                  className="flex items-start gap-3 rounded-2xl border border-white/5 bg-slate-950/40 p-3"
                >
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

      {/* ---------- ÉVÉNEMENT DE VIE ---------- */}
      <AnimatePresence>
        {player.pendingEvent && !matchSetup && (
          <motion.div
            key="event"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-4 sm:items-center"
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6"
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-300">
                {SENDER_LABEL[player.pendingEvent.from] ?? 'Événement'}
              </p>
              <h3 className="mt-1 text-lg font-black text-white">{player.pendingEvent.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">{player.pendingEvent.body}</p>
              <div className="mt-4 space-y-2">
                {player.pendingEvent.choices.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => chooseEvent(c.id)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-left text-xs font-bold text-white hover:border-emerald-500/50"
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- MATCH EN DIRECT ---------- */}
      {matchSetup && (
        <MatchView
          player={player}
          fixture={matchSetup.fixture}
          participation={matchSetup.participation}
          onFinish={finishLiveMatch}
        />
      )}
    </div>
  );
}
