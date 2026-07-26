"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation'; 
import { 
  Plus, 
  Trash2, 
  Loader2, 
  ShieldCheck, 
  Target, 
  Users, 
  Coins, 
  BarChart3, 
  Zap, 
  Timer, 
  Filter, 
  AlertTriangle, 
  X, 
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminChallengesService } from '@/services/admin/challenges';
import { DEFAULT_ADMIN_CHALLENGE_FORM, type AdminChallengeForm, type ChallengeGameType } from '@/lib/constants/challenges';
import { computeChallengePrizePool } from '@/validators/challenges';

type ChallengeAttempt = {
  user_id: string;
  attempts_count: number | null;
  total_score: number | null;
};

type Challenge = {
  id: string;
  title: string;
  game_type: string;
  entry_fee_cp_base: number;
  prize_pool_cp: number;
  max_participants: number;
  is_active: boolean;
  ends_at?: string;
  challenge_attempts?: ChallengeAttempt[];
};

// Composant pour le compte à rebours individuel
function ChallengeCountdown({ endsAt, onExpire }: { endsAt?: string; onExpire: () => void }) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isUrgent, setIsUrgent] = useState<boolean>(false);

  useEffect(() => {
    if (!endsAt) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const end = new Date(endsAt).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('EXPIRÉ');
        onExpire();
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        setIsUrgent(diff < 3600000); // Moins de 1 heure
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [endsAt, onExpire]);

  if (!endsAt) return null;

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-black tracking-wider ${
      isUrgent 
        ? 'border-rose-500/50 bg-rose-500/10 text-rose-400 animate-pulse' 
        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
    }`}>
      <Timer size={12} />
      <span>{timeLeft}</span>
    </div>
  );
}

export default function AdminArena() {
  const router = useRouter(); 

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<AdminChallengeForm>({ ...DEFAULT_ADMIN_CHALLENGE_FORM });
  
  // États de filtres
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'closed'>('all');
  const [gameFilter, setGameFilter] = useState<string>('all');

  // Toasts / Notifications UI
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Récupération + Vérification d'auto-clôture pour les missions expirées
  const readChallengesAndAutoClose = useCallback(async () => {
    const { data, error } = await supabase
      .from('challenges')
      .select('*, challenge_attempts(user_id, attempts_count, total_score)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      return [];
    }

    const fetchedChallenges = (data || []) as Challenge[];
    const now = new Date();

    // Auto-clôture en arrière-plan pour les défis expirés encore marqués "is_active = true"
    const expiredActive = fetchedChallenges.filter(
      (ch) => ch.is_active && ch.ends_at && new Date(ch.ends_at) <= now
    );

    if (expiredActive.length > 0) {
      for (const expCh of expiredActive) {
        await AdminChallengesService.close(expCh.id);
        expCh.is_active = false;
      }
    }

    return fetchedChallenges;
  }, []);

  const fetchChallenges = useCallback(async () => {
    const updatedData = await readChallengesAndAutoClose();
    setChallenges(updatedData);
    setLoading(false);
  }, [readChallengesAndAutoClose]);

  useEffect(() => { 
    let mounted = true;

    const load = async () => {
      const updatedData = await readChallengesAndAutoClose();
      if (!mounted) return;
      setChallenges(updatedData);
      setLoading(false);
    };

    load();

    // Synchronisation Supabase Realtime
    const channel = supabase.channel('admin_arena_sync')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'challenge_attempts' 
      }, async () => {
        const updatedData = await readChallengesAndAutoClose();
        if (!mounted) return;
        setChallenges(updatedData);
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [readChallengesAndAutoClose]);

  // Création d'une mission
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.ends_at) {
      showToast('error', "La date d'expiration est obligatoire.");
      return;
    }

    setSubmitting(true);
    const result = await AdminChallengesService.create({
      title: form.title,
      game_type: form.game_type,
      entry_fee_cp_base: form.entry_fee_cp_base,
      max_participants: form.max_participants,
      ends_at: form.ends_at,
    });

    setSubmitting(false);

    if (result.success) {
      setShowModal(false);
      setForm({ ...DEFAULT_ADMIN_CHALLENGE_FORM });
      showToast('success', "Nouvelle mission déployée avec succès.");
      fetchChallenges();
    } else {
      showToast('error', "Erreur lors de la création : " + result.message);
    }
  };

  // Clôture manuelle
  const closeChallenge = async (id: string) => {
    const result = await AdminChallengesService.close(id);
    if (result.success) {
      showToast('success', "Mission clôturée manuellement.");
      fetchChallenges();
    } else {
      showToast('error', "Erreur de clôture : " + result.message);
    }
  };

  // Suppression
  const deleteChallenge = async (id: string) => {
    const result = await AdminChallengesService.delete(id);
    if (result.success) {
      showToast('success', "Mission supprimée définitivement.");
      fetchChallenges();
    } else {
      showToast('error', "Erreur de suppression : " + result.message);
    }
  };

  // Filtrage des défis
  const filteredChallenges = challenges.filter((ch) => {
    const matchesStatus = 
      statusFilter === 'all' ? true :
      statusFilter === 'active' ? ch.is_active : !ch.is_active;

    const matchesGame = 
      gameFilter === 'all' ? true : ch.game_type === gameFilter;

    return matchesStatus && matchesGame;
  });

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <Loader2 className="animate-spin text-emerald-500" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 sm:p-8 font-black italic uppercase pb-20">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-[110] flex items-center gap-3 px-6 py-4 rounded-2xl border shadow-2xl ${
              notification.type === 'success' 
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300' 
                : 'bg-rose-950/90 border-rose-500/40 text-rose-300'
            }`}
          >
            {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
            <span className="text-xs font-extrabold">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-75">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl sm:text-5xl tracking-tighter italic">
            CP_ARENA <span className="text-emerald-500">ADMIN</span>
          </h1>
          <p className="text-[10px] text-emerald-500/50 mt-2 tracking-[0.5em]">
            PANNEAU DE CONTRÔLE GÉNÉRAL
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchChallenges()}
            className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 text-slate-300 transition-all active:scale-95"
            title="Rafraîchir & synchroniser"
          >
            <RefreshCw size={20} />
          </button>

          <button 
            onClick={() => setShowModal(true)} 
            className="bg-white text-black px-8 py-4 rounded-2xl flex items-center gap-3 hover:bg-emerald-500 shadow-2xl transition-all active:scale-95 group text-sm"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform"/> NOUVELLE MISSION
          </button>
        </div>
      </div>

      {/* BARRE DE FILTRES */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-slate-900/40 border border-white/10 p-4 rounded-3xl">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[9px] text-slate-500 mr-2 flex items-center gap-1">
            <Filter size={12} /> STATUT:
          </span>
          {[
            { id: 'all', label: 'TOUS' },
            { id: 'active', label: 'ACTIFS' },
            { id: 'closed', label: 'TERMINÉS' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as 'all' | 'active' | 'closed')}
              className={`px-4 py-2 rounded-xl text-[10px] transition ${
                statusFilter === tab.id
                  ? 'bg-emerald-500 text-black font-black'
                  : 'bg-black/50 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-[9px] text-slate-500 mr-2">JEU:</span>
          {[
            { id: 'all', label: 'TOUS' },
            { id: 'quiz', label: 'QUIZ' },
            { id: 'biometric', label: 'BIOMETRIC' },
            { id: 'vault', label: 'VAULT' },
          ].map((game) => (
            <button
              key={game.id}
              onClick={() => setGameFilter(game.id)}
              className={`px-3 py-2 rounded-xl text-[10px] transition ${
                gameFilter === game.id
                  ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 font-black'
                  : 'bg-black/50 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              {game.label}
            </button>
          ))}
        </div>
      </div>

      {/* CHALLENGES GRID */}
      {filteredChallenges.length === 0 ? (
        <div className="p-12 text-center border border-white/5 rounded-[2.5rem] bg-slate-900/20 text-slate-500 text-xs">
          AUCUNE MISSION NE CORRESPOND À CES CRITÈRES.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {filteredChallenges.map((ch) => {
            const uniquePlayers = ch.challenge_attempts?.length || 0;
            const totalSessions = ch.challenge_attempts?.reduce((acc, curr) => acc + (curr.attempts_count || 0), 0) || 0;
            
            return (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }}
                key={ch.id} 
                className={`p-8 rounded-[3.5rem] border transition-all ${
                  ch.is_active 
                    ? 'bg-slate-900/40 border-white/10 hover:border-emerald-500/30' 
                    : 'bg-black/80 border-rose-900/30 grayscale opacity-60'
                }`}
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl mb-3 tracking-tighter text-emerald-500">{ch.title}</h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[8px] px-3 py-1 rounded-full border font-bold ${
                        ch.is_active ? 'text-emerald-500 border-emerald-500/20' : 'text-rose-500 border-rose-500/20'
                      }`}>
                        {ch.is_active ? 'MISSION_ACTIVE' : 'MISSION_TERMINEE'}
                      </span>
                      <span className="text-[8px] px-3 py-1 rounded-full border border-white/10 text-slate-400 uppercase">
                        {ch.game_type}
                      </span>
                      {ch.is_active && (
                        <ChallengeCountdown endsAt={ch.ends_at} onExpire={() => fetchChallenges()} />
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl text-emerald-500 font-black">{ch.prize_pool_cp.toLocaleString()} <span className="text-xs">CP</span></p>
                    <p className="text-[8px] text-slate-500 tracking-widest uppercase">Cagnotte Finale</p>
                  </div>
                </div>

                {/* STATS RAPIDES */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-black/50 p-4 rounded-3xl border border-white/5 text-center">
                    <p className="text-[7px] text-slate-500 mb-1 uppercase">Joueurs</p>
                    <p className="text-lg font-black flex items-center justify-center gap-1"><Users size={12}/> {uniquePlayers}</p>
                  </div>
                  <div className="bg-black/50 p-4 rounded-3xl border border-white/5 text-center">
                    <p className="text-[7px] text-slate-500 mb-1 uppercase">Sessions</p>
                    <p className="text-lg font-black text-emerald-500 flex items-center justify-center gap-1"><Coins size={12}/> {totalSessions}</p>
                  </div>
                  <div className="bg-black/50 p-4 rounded-3xl border border-white/5 text-center">
                    <p className="text-[7px] text-slate-500 mb-1 uppercase">Limite</p>
                    <p className="text-lg font-black">{ch.max_participants}</p>
                  </div>
                  <div className="bg-black/50 p-4 rounded-3xl border border-white/5 text-center">
                    <p className="text-[7px] text-slate-500 mb-1 uppercase">Frais</p>
                    <p className="text-lg font-black">{ch.entry_fee_cp_base}</p>
                  </div>
                </div>

                {/* ACTIONS */}
                <div className="flex gap-3">
                  {ch.is_active && (
                    <button 
                      onClick={() => closeChallenge(ch.id)} 
                      className="flex-1 py-4 bg-emerald-500 text-black rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all active:scale-95"
                    >
                      <ShieldCheck size={18}/> CLÔTURER
                    </button>
                  )}
                  <button 
                    onClick={() => router.push(`/client/rank?challengeId=${ch.id}`)}
                    className="p-4 bg-white/5 text-emerald-500 rounded-2xl hover:bg-white/10 transition-all active:scale-95"
                    title="Voir le classement"
                  >
                    <BarChart3 size={18}/>
                  </button>
                  <button 
                    onClick={() => deleteChallenge(ch.id)} 
                    className="p-4 bg-white/5 text-rose-500 rounded-2xl hover:bg-rose-600 hover:text-white transition-all active:scale-95"
                    title="Supprimer définitivement"
                  >
                    <Trash2 size={18}/>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* MODAL : CRÉATION DE MISSION */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-2xl">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => !submitting && setShowModal(false)} 
              className="absolute inset-0 bg-black/90" 
            />
            <motion.form 
              initial={{ scale: 0.9, y: 50 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.9, y: 50 }}
              onSubmit={handleCreate}
              className="relative w-full max-w-xl bg-slate-900 border border-white/10 rounded-[3rem] p-6 sm:p-10 space-y-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Target className="text-emerald-500" size={28} />
                  <h2 className="text-2xl sm:text-3xl italic font-black">NOUVELLE MISSION</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-2 text-slate-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-[9px] text-slate-500 ml-2 uppercase">Titre de l&apos;opération</p>
                  <input 
                    required 
                    placeholder="EX: QUIZ DES LÉGENDES" 
                    value={form.title}
                    className="w-full bg-black border border-white/5 p-4 rounded-2xl outline-none focus:border-emerald-500 italic font-black text-sm" 
                    onChange={e => setForm({...form, title: e.target.value.toUpperCase()})} 
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-[9px] text-slate-500 ml-2 uppercase">Moteur de jeu</p>
                    <select 
                      value={form.game_type}
                      className="w-full bg-black border border-white/5 p-4 rounded-2xl outline-none font-bold italic text-sm" 
                      onChange={e => setForm({...form, game_type: e.target.value as ChallengeGameType})}
                    >
                      <option value="quiz">QUIZ ELITE</option>
                      <option value="biometric">BIOMETRIC HACK</option>
                      <option value="vault">LASER VAULT</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[9px] text-slate-500 ml-2 uppercase">Expiration</p>
                    <input 
                      required 
                      type="datetime-local" 
                      value={form.ends_at}
                      className="w-full bg-black border border-white/5 p-4 rounded-2xl outline-none font-bold text-emerald-500 text-xs uppercase" 
                      onChange={e => setForm({...form, ends_at: e.target.value})} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <p className="text-[7px] text-slate-500 text-center uppercase">Prix Session</p>
                    <input 
                      required 
                      type="number" 
                      value={form.entry_fee_cp_base} 
                      className="w-full bg-black border border-white/5 p-4 rounded-2xl outline-none text-center font-black text-sm" 
                      onChange={e => {
                        const nextEntryFee = Number(e.target.value);
                        setForm({
                          ...form,
                          entry_fee_cp_base: nextEntryFee,
                          prize_pool_cp: computeChallengePrizePool(nextEntryFee, form.max_participants),
                        });
                      }} 
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[7px] text-emerald-500 text-center uppercase font-black">Cagnotte CP</p>
                    <input 
                      disabled 
                      type="number" 
                      value={form.prize_pool_cp} 
                      className="w-full bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl outline-none text-emerald-500 font-black text-center text-sm" 
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[7px] text-slate-500 text-center uppercase">Limit Joueurs</p>
                    <input 
                      required 
                      type="number" 
                      value={form.max_participants} 
                      className="w-full bg-black border border-white/5 p-4 rounded-2xl outline-none text-center font-black text-sm" 
                      onChange={e => {
                        const nextMaxParticipants = Number(e.target.value);
                        setForm({
                          ...form,
                          max_participants: nextMaxParticipants,
                          prize_pool_cp: computeChallengePrizePool(form.entry_fee_cp_base, nextMaxParticipants),
                        });
                      }} 
                    />
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={submitting}
                className="w-full py-5 bg-emerald-600 text-black rounded-3xl font-black text-lg hover:bg-emerald-400 transition-all uppercase shadow-[0_15px_30px_rgba(16,185,129,0.3)] flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="animate-spin" size={20} /> : <>DÉPLOYER LA MISSION <Zap size={18} fill="black" /></>}
              </button>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
