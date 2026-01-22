"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Trophy, Plus, Trash2, Calendar, 
  Target, Zap, Brain, Lock, Loader2, 
  ChevronLeft, Save, X, AlertCircle,
  Users, DollarSign, Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function AdminChallenges() {
  const router = useRouter();
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const [newChallenge, setNewChallenge] = useState({
    title: '',
    game_type: 'quiz',
    entry_fee: 50,
    prize_pool: 500,
    ends_at: '',
    is_active: true
  });

  useEffect(() => {
    fetchChallenges();
  }, []);

  const fetchChallenges = async () => {
    const { data } = await supabase
      .from('challenges')
      .select('*, challenge_entries(count)')
      .order('created_at', { ascending: false });
    setChallenges(data || []);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    const { error } = await supabase.from('challenges').insert([newChallenge]);

    if (!error) {
      setShowAddModal(false);
      fetchChallenges();
      setNewChallenge({ title: '', game_type: 'quiz', entry_fee: 50, prize_pool: 500, ends_at: '', is_active: true });
    }
    setIsSubmitting(false);
  };

  const deleteChallenge = async (id: string) => {
    if (!confirm("⚠️ SUPPRIMER DÉFINITIVEMENT CE DÉFI ET LES SCORES ASSOCIÉS ?")) return;
    const { error } = await supabase.from('challenges').delete().eq('id', id);
    if (!error) fetchChallenges();
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 font-black italic uppercase selection:bg-emerald-500">
      
      {/* HEADER ADM */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-5">
          <button onClick={() => router.back()} className="p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-emerald-500/10 transition-all">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl tracking-tighter italic">CHALLENGE <span className="text-emerald-500">CORE</span></h1>
            <p className="text-[8px] text-slate-500 tracking-[0.5em] mt-1">SYSTÈME D'OPÉRATIONS</p>
          </div>
        </div>
        
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-black px-8 py-5 rounded-3xl flex items-center justify-center gap-3 transition-all shadow-[0_15px_40px_rgba(16,185,129,0.15)] active:scale-95 group font-black"
        >
          <Plus size={22} className="group-hover:rotate-90 transition-transform" /> CRÉER UN DÉFI
        </button>
      </div>

      {/* DASHBOARD LIST */}
      <div className="grid grid-cols-1 gap-5">
        <AnimatePresence>
          {challenges.map((ch) => (
            <motion.div 
              layout key={ch.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-7 flex flex-col md:flex-row items-center justify-between gap-8 backdrop-blur-xl group hover:border-white/10 transition-all"
            >
              <div className="flex items-center gap-6 w-full md:w-auto">
                <div className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center bg-black/40 border border-white/5 text-emerald-500 group-hover:text-white transition-colors">
                  {ch.game_type === 'quiz' ? <Brain size={28} /> : ch.game_type === 'biometric' ? <Zap size={28} /> : <Lock size={28} />}
                </div>
                <div>
                  <h3 className="text-xl tracking-tight mb-1">{ch.title}</h3>
                  <div className="flex items-center gap-3 text-[9px] text-slate-500 font-bold">
                    <span className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-full"><Users size={12}/> {ch.challenge_entries?.[0]?.count || 0} JOUEURS</span>
                    <span className="uppercase text-emerald-500">{ch.game_type}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-10 w-full md:w-auto justify-between border-y md:border-none border-white/5 py-6 md:py-0 font-bold">
                <div className="text-center">
                  <p className="text-[8px] text-slate-500 mb-2 tracking-widest uppercase">Mise</p>
                  <p className="text-lg">{ch.entry_fee} HTG</p>
                </div>
                <div className="text-center">
                  <p className="text-[8px] text-slate-500 mb-2 tracking-widest uppercase">Prix</p>
                  <p className="text-lg text-emerald-500">{ch.prize_pool} HTG</p>
                </div>
                <div className="text-center">
                   <p className="text-[8px] text-slate-500 mb-2 tracking-widest uppercase">Fin</p>
                   <p className="text-[10px] text-rose-500">{new Date(ch.ends_at).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <button 
                  onClick={() => deleteChallenge(ch.id)}
                  className="p-4 bg-rose-500/10 text-rose-500 rounded-2xl border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all shadow-lg active:scale-90"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* FORM MODAL AJOUT */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/95 backdrop-blur-xl"
            />
            <motion.form 
              initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }}
              onSubmit={handleCreate}
              className="relative w-full max-w-xl bg-[#0a0f1e] border border-white/10 rounded-[3.5rem] p-10 space-y-8 shadow-[0_30px_100px_rgba(0,0,0,0.5)]"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black italic tracking-tighter">CONFIGURER <span className="text-emerald-500">DÉFI</span></h2>
                <button type="button" onClick={() => setShowAddModal(false)} className="p-3 bg-white/5 rounded-full hover:bg-white/10"><X size={20}/></button>
              </div>
              
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[9px] text-slate-500 ml-4 tracking-[0.2em] uppercase">Titre de l'événement</label>
                  <input required type="text" value={newChallenge.title} onChange={e => setNewChallenge({...newChallenge, title: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-3xl p-5 outline-none focus:border-emerald-500 focus:bg-black/60 transition-all font-bold uppercase" placeholder="EX: HACKER'S NIGHT" />
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[9px] text-slate-500 ml-4 tracking-[0.2em] uppercase">Type de Jeu</label>
                    <select value={newChallenge.game_type} onChange={e => setNewChallenge({...newChallenge, game_type: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-3xl p-5 outline-none font-bold appearance-none">
                      <option value="quiz">QUIZ ELITE</option>
                      <option value="biometric">BIOMETRIC HACK</option>
                      <option value="vault">LASER VAULT</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] text-slate-500 ml-4 tracking-[0.2em] uppercase">Mise Entrée (HTG)</label>
                    <input required type="number" value={newChallenge.entry_fee} onChange={e => setNewChallenge({...newChallenge, entry_fee: Number(e.target.value)})} className="w-full bg-black/40 border border-white/5 rounded-3xl p-5 outline-none font-black" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[9px] text-slate-500 ml-4 tracking-[0.2em] uppercase">Prize Pool (HTG)</label>
                    <input required type="number" value={newChallenge.prize_pool} onChange={e => setNewChallenge({...newChallenge, prize_pool: Number(e.target.value)})} className="w-full bg-black/40 border border-white/5 rounded-3xl p-5 outline-none font-black text-emerald-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] text-slate-500 ml-4 tracking-[0.2em] uppercase">Expiration</label>
                    <input required type="datetime-local" value={newChallenge.ends_at} onChange={e => setNewChallenge({...newChallenge, ends_at: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-3xl p-5 outline-none font-bold" />
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting} 
                className="w-full py-6 bg-emerald-600 text-black rounded-[2.5rem] font-black text-xs tracking-[0.3em] flex items-center justify-center gap-3 shadow-[0_20px_50px_rgba(16,185,129,0.2)] active:scale-95 transition-all"
              >
                {isSubmitting ? <Loader2 className="animate-spin" /> : <><Save size={20}/> PUBLIER L'ÉVÉNEMENT</>}
              </button>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
