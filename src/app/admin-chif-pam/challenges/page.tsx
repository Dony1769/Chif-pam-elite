"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Plus, Trash2, Brain, Zap, Lock, Loader2, 
  ChevronLeft, Save, Users, X
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
    title: '', game_type: 'quiz', entry_fee: 50, prize_pool: 500, ends_at: '', is_active: true
  });

  useEffect(() => { fetchChallenges(); }, []);

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
    setIsSubmitting(true);
    
    // IMPORTANT: On insère uniquement les colonnes présentes dans ta table challenges (Screenshot 232824)
    const { error } = await supabase
      .from('challenges')
      .insert([{
        title: newChallenge.title,
        game_type: newChallenge.game_type,
        entry_fee: newChallenge.entry_fee,
        prize_pool: newChallenge.prize_pool,
        ends_at: new Date(newChallenge.ends_at).toISOString(),
        is_active: true
      }]);

    if (error) {
      alert("ERREUR CRITIQUE: " + error.message);
    } else {
      setShowAddModal(false);
      fetchChallenges();
      setNewChallenge({ title: '', game_type: 'quiz', entry_fee: 50, prize_pool: 500, ends_at: '', is_active: true });
    }
    setIsSubmitting(false);
  };

  const deleteChallenge = async (id: string) => {
    if (!confirm("CONFIRMER LA DESTRUCTION DU DÉFI ?")) return;
    await supabase.from('challenges').delete().eq('id', id);
    fetchChallenges();
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 font-black italic uppercase">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-emerald-500 hover:text-black transition-all">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl tracking-tighter italic font-black">COMMAND <span className="text-emerald-500 underline decoration-white/10">CENTER</span></h1>
            <p className="text-[8px] text-slate-500 tracking-[0.4em]">ADMINISTRATION DES DÉFIS</p>
          </div>
        </div>
        
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-emerald-500 text-black px-8 py-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-[0_10px_40px_rgba(16,185,129,0.2)] active:scale-95 hover:bg-emerald-400"
        >
          <Plus size={20} /> CRÉER UNE MISSION
        </button>
      </div>

      {/* LISTE DES DÉFIS ADMIN */}
      <div className="grid grid-cols-1 gap-6">
        {challenges.map((ch) => (
          <motion.div layout key={ch.id} className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6 w-full md:w-auto">
              <div className="w-16 h-16 rounded-3xl bg-black border border-white/5 flex items-center justify-center shadow-xl">
                {ch.game_type === 'quiz' ? <Brain className="text-blue-400" /> : ch.game_type === 'biometric' ? <Zap className="text-emerald-400" /> : <Lock className="text-amber-400" />}
              </div>
              <div>
                <h3 className="text-lg tracking-tight mb-1 italic">{ch.title}</h3>
                <div className="flex items-center gap-3 text-[8px] text-slate-500">
                  <span className="bg-white/5 px-2 py-1 rounded italic uppercase">{ch.game_type}</span>
                  <span className="flex items-center gap-1"><Users size={10} className="text-emerald-500"/> {ch.challenge_entries?.[0]?.count || 0} INSCRITS</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-10 bg-black/40 px-8 py-4 rounded-[2rem] border border-white/5">
              <div className="text-center">
                <p className="text-[7px] text-slate-500 mb-1 tracking-widest uppercase">Entrée</p>
                <p className="text-sm font-black italic">{ch.entry_fee} HTG</p>
              </div>
              <div className="text-center">
                <p className="text-[7px] text-slate-500 mb-1 tracking-widest uppercase">Pool</p>
                <p className="text-sm text-emerald-500 font-black italic">{ch.prize_pool} HTG</p>
              </div>
              <div className="text-center">
                <p className="text-[7px] text-slate-500 mb-1 tracking-widest uppercase">Status</p>
                <p className={`text-[9px] font-black italic ${ch.is_active ? 'text-emerald-500' : 'text-rose-500'}`}>{ch.is_active ? 'ACTIF' : 'OFFLINE'}</p>
              </div>
            </div>

            <button onClick={() => deleteChallenge(ch.id)} className="p-4 bg-rose-500/10 text-rose-500 rounded-2xl border border-rose-500/10 hover:bg-rose-500 hover:text-white transition-all shadow-lg active:scale-90">
              <Trash2 size={20} />
            </button>
          </motion.div>
        ))}
      </div>

      {/* MODAL AJOUT DÉFI DESIGN PREMIUM */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <motion.form 
              initial={{ scale: 0.9, y: 50, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.9, y: 50, opacity: 0 }}
              onSubmit={handleCreate}
              className="relative w-full max-w-lg bg-[#0a0a14] border border-white/10 rounded-[3.5rem] p-10 space-y-8 overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.8)]"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full" />
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl text-emerald-500 italic font-black tracking-tighter uppercase">Nouveau Protocole</h2>
                <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-white"><X size={24}/></button>
              </div>
              
              <div className="space-y-5">
                <div className="bg-black/40 p-5 rounded-3xl border border-white/5 focus-within:border-emerald-500/50 transition-all">
                  <label className="text-[8px] text-slate-500 ml-2 block mb-2 font-bold uppercase tracking-widest">Titre du Défi</label>
                  <input required type="text" value={newChallenge.title} onChange={e => setNewChallenge({...newChallenge, title: e.target.value.toUpperCase()})} className="w-full bg-transparent text-white outline-none text-sm uppercase italic font-bold" placeholder="EX: OPERATION BLACKOUT" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/40 p-5 rounded-3xl border border-white/5">
                    <label className="text-[8px] text-slate-500 ml-2 block mb-2 font-bold uppercase tracking-widest">Interface Jeu</label>
                    <select value={newChallenge.game_type} onChange={e => setNewChallenge({...newChallenge, game_type: e.target.value})} className="w-full bg-transparent text-white outline-none text-xs italic font-bold cursor-pointer">
                      <option value="quiz" className="bg-slate-900">QUIZ ELITE</option>
                      <option value="biometric" className="bg-slate-900">BIOMETRIC HACK</option>
                      <option value="vault" className="bg-slate-900">LASER VAULT</option>
                    </select>
                  </div>
                  <div className="bg-black/40 p-5 rounded-3xl border border-white/5">
                    <label className="text-[8px] text-slate-500 ml-2 block mb-2 font-bold uppercase tracking-widest">Ticket HTG</label>
                    <input required type="number" value={newChallenge.entry_fee} onChange={e => setNewChallenge({...newChallenge, entry_fee: Number(e.target.value)})} className="w-full bg-transparent text-white outline-none text-sm font-bold" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/40 p-5 rounded-3xl border border-white/5">
                    <label className="text-[8px] text-slate-500 ml-2 block mb-2 font-bold uppercase tracking-widest">Prize Pool HTG</label>
                    <input required type="number" value={newChallenge.prize_pool} onChange={e => setNewChallenge({...newChallenge, prize_pool: Number(e.target.value)})} className="w-full bg-transparent text-emerald-500 outline-none text-sm font-black italic" />
                  </div>
                  <div className="bg-black/40 p-5 rounded-3xl border border-white/5">
                    <label className="text-[8px] text-slate-500 ml-2 block mb-2 font-bold uppercase tracking-widest">Expiration</label>
                    <input required type="datetime-local" value={newChallenge.ends_at} onChange={e => setNewChallenge({...newChallenge, ends_at: e.target.value})} className="w-full bg-transparent text-white outline-none text-[10px] font-bold" />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="submit" disabled={isSubmitting} className="w-full py-6 bg-emerald-600 text-black rounded-[2rem] font-black text-xl shadow-xl hover:bg-emerald-500 active:scale-95 transition-all">
                  {isSubmitting ? <Loader2 className="animate-spin mx-auto" /> : "PUBLIER LE DÉFI"}
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
