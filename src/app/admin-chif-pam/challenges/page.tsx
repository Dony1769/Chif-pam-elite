"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation'; 
import { Plus, Trash2, Loader2, ShieldCheck, Target, Users, Coins, BarChart3, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminChallengesService } from '@/services/admin/challenges';
import { DEFAULT_ADMIN_CHALLENGE_FORM, type AdminChallengeForm, type ChallengeGameType } from '@/lib/constants/challenges';
import { computeChallengePrizePool } from '@/validators/challenges';

export default function AdminArena() {
  const router = useRouter(); 

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
    challenge_attempts?: ChallengeAttempt[];
  };
  
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<AdminChallengeForm>({ ...DEFAULT_ADMIN_CHALLENGE_FORM });

  const readChallenges = useCallback(async () => {
    return supabase
      .from('challenges')
      .select('*, challenge_attempts(user_id, attempts_count, total_score)')
      .order('created_at', { ascending: false });
  }, []);

  const fetchChallenges = useCallback(async () => {
    const { data, error } = await readChallenges();

    if (error) {
      console.error(error);
    }

    setChallenges(((data || []) as Challenge[]));
    setLoading(false);
  }, [readChallenges]);

  // 1. Chargement initial et Realtime
  useEffect(() => { 
    let mounted = true;

    const load = async () => {
      const { data, error } = await readChallenges();
      if (!mounted) return;

      if (error) {
        console.error(error);
      }

      setChallenges(((data || []) as Challenge[]));
      setLoading(false);
    };

    load();

    // Ecoute les changements sur challenge_attempts pour mettre à jour les compteurs en direct
    const channel = supabase.channel('admin_arena_sync')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'challenge_attempts' 
      }, async () => {
        const { data, error } = await readChallenges();
        if (!mounted) return;

        if (error) {
          console.error(error);
          return;
        }

        setChallenges(((data || []) as Challenge[]));
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [readChallenges]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!form.ends_at) return alert("Date d'expiration requise");

    const result = await AdminChallengesService.create({
      title: form.title,
      game_type: form.game_type,
      entry_fee_cp_base: form.entry_fee_cp_base,
      max_participants: form.max_participants,
      ends_at: form.ends_at,
    });

    if (result.success) {
      setShowModal(false);
      fetchChallenges();
    } else {
      alert("Erreur RLS ou Base : " + result.message);
    }
  };

  const closeChallenge = async (id: string) => {
    if(!confirm("CLÔTURER LA MISSION ? Elle ne sera plus jouable.")) return;
    const result = await AdminChallengesService.close(id);
    if (result.success) {
      fetchChallenges();
      return;
    }
    alert("Erreur de clôture : " + result.message);
  };

  const deleteChallenge = async (id: string) => {
    if(!confirm("SUPPRIMER DÉFINITIVEMENT ? Toutes les tentatives liées seront perdues.")) return;
    const result = await AdminChallengesService.delete(id);
    if (result.success) {
      fetchChallenges();
      return;
    }
    alert("Erreur de suppression : " + result.message);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <Loader2 className="animate-spin text-emerald-500" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white p-8 font-black italic uppercase pb-20">
      
      {/* HEADER SECTION */}
      <div className="flex justify-between items-end mb-12">
        <div>
          <h1 className="text-5xl tracking-tighter italic">CP_ARENA <span className="text-emerald-500">ADMIN</span></h1>
          <p className="text-[10px] text-emerald-500/50 mt-4 tracking-[0.5em]">PANNEAU DE CONTRÔLE GÉNÉRAL</p>
        </div>
        <button 
          onClick={() => setShowModal(true)} 
          className="bg-white text-black px-10 py-5 rounded-3xl flex items-center gap-3 hover:bg-emerald-500 shadow-2xl transition-all active:scale-95 group"
        >
          <Plus size={24} className="group-hover:rotate-90 transition-transform"/> NOUVELLE MISSION
        </button>
      </div>

      {/* CHALLENGES GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {challenges.map((ch) => {
          const uniquePlayers = ch.challenge_attempts?.length || 0;
          const totalSessions = ch.challenge_attempts?.reduce((acc, curr) => acc + (curr.attempts_count || 0), 0) || 0;
          
          return (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }}
              key={ch.id} 
              className={`p-8 rounded-[3.5rem] border transition-all ${ch.is_active ? 'bg-slate-900/40 border-white/10' : 'bg-black/80 border-rose-900/30 grayscale opacity-60'}`}
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl mb-2 tracking-tighter text-emerald-500">{ch.title}</h3>
                  <div className="flex gap-2">
                    <span className={`text-[8px] px-3 py-1 rounded-full border font-bold ${ch.is_active ? 'text-emerald-500 border-emerald-500/20' : 'text-rose-500 border-rose-500/20'}`}>
                        {ch.is_active ? 'MISSION_ACTIVE' : 'MISSION_TERMINEE'}
                    </span>
                    <span className="text-[8px] px-3 py-1 rounded-full border border-white/10 text-slate-400 uppercase">
                        {ch.game_type}
                    </span>
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
              <div className="flex gap-4">
                {ch.is_active && (
                  <button 
                    onClick={() => closeChallenge(ch.id)} 
                    className="flex-1 py-5 bg-emerald-500 text-black rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all"
                  >
                    <ShieldCheck size={20}/> CLÔTURER
                  </button>
                )}
                <button 
                   onClick={() => router.push(`/client/rank?challengeId=${ch.id}`)}
                   className="p-5 bg-white/5 text-emerald-500 rounded-2xl hover:bg-white/10 transition-all"
                   title="Voir le classement"
                >
                  <BarChart3 size={20}/>
                </button>
                <button 
                  onClick={() => deleteChallenge(ch.id)} 
                  className="p-5 bg-white/5 text-rose-500 rounded-2xl hover:bg-rose-600 hover:text-white transition-all"
                >
                  <Trash2 size={20}/>
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* MODAL : CRÉATION DE MISSION */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-6 backdrop-blur-2xl">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowModal(false)} 
              className="absolute inset-0 bg-black/90" 
            />
            <motion.form 
              initial={{ scale: 0.9, y: 50 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.9, y: 50 }}
              onSubmit={handleCreate}
              className="relative w-full max-w-xl bg-slate-900 border border-white/10 rounded-[3.5rem] p-10 space-y-6 shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-4">
                <Target className="text-emerald-500" size={32} />
                <h2 className="text-3xl italic font-black">NOUVELLE MISSION</h2>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                    <p className="text-[9px] text-slate-500 ml-2 uppercase">Titre de l&apos;opération</p>
                    <input 
                      required 
                      placeholder="EX: QUIZ DES LÉGENDES" 
                      className="w-full bg-black border border-white/5 p-5 rounded-2xl outline-none focus:border-emerald-500 italic font-black" 
                      onChange={e => setForm({...form, title: e.target.value.toUpperCase()})} 
                    />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-[9px] text-slate-500 ml-2 uppercase">Moteur de jeu</p>
                    <select 
                      className="w-full bg-black border border-white/5 p-5 rounded-2xl outline-none font-bold italic" 
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
                      className="w-full bg-black border border-white/5 p-5 rounded-2xl outline-none font-bold text-emerald-500 uppercase" 
                      onChange={e => setForm({...form, ends_at: e.target.value})} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <p className="text-[7px] text-slate-500 text-center uppercase">Prix Session</p>
                    <input 
                      required 
                      type="number" 
                      value={form.entry_fee_cp_base} 
                      className="w-full bg-black border border-white/5 p-5 rounded-2xl outline-none text-center font-black" 
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
                      className="w-full bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl outline-none text-emerald-500 font-black text-center" 
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[7px] text-slate-500 text-center uppercase">Limit Joueurs</p>
                    <input 
                      required 
                      type="number" 
                      value={form.max_participants} 
                      className="w-full bg-black border border-white/5 p-5 rounded-2xl outline-none text-center font-black" 
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
                className="w-full py-6 bg-emerald-600 text-black rounded-4xl font-black text-xl hover:bg-emerald-400 transition-all uppercase shadow-[0_15px_30px_rgba(16,185,129,0.3)] flex items-center justify-center gap-3"
              >
                DÉPLOYER LA MISSION <Zap size={20} fill="black" />
              </button>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
