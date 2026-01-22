"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Plus, Trash2, Brain, Zap, Lock, Loader2, 
  ChevronLeft, Save, Users, DollarSign, Power
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
    const { data } = await supabase.from('challenges').select('*, challenge_entries(count)').order('created_at', { ascending: false });
    setChallenges(data || []);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { error } = await supabase.from('challenges').insert([newChallenge]);
    if (error) alert(error.message);
    else {
      setShowAddModal(false);
      fetchChallenges();
    }
    setIsSubmitting(false);
  };

  const deleteChallenge = async (id: string) => {
    if (!confirm("Supprimer l'arène ? Scores inclus.")) return;
    await supabase.from('challenges').delete().eq('id', id);
    fetchChallenges();
  };

  if (loading) return <div className="min-h-screen bg-[#050508] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="min-h-screen bg-[#050508] text-white p-6 font-black italic uppercase">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-emerald-500 hover:text-black transition-all">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl tracking-tighter italic">GESTION <span className="text-emerald-500 underline decoration-white/10">ARENA</span></h1>
            <p className="text-[8px] text-slate-500 tracking-[0.4em]">Déploiement de défis communautaires</p>
          </div>
        </div>
        
        <button onClick={() => setShowAddModal(true)} className="bg-emerald-500 text-black px-8 py-5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-95">
          <Plus size={20} /> INITIALISER UN DÉFI
        </button>
      </div>

      <div className="grid gap-4">
        {challenges.map((ch) => (
          <motion.div layout key={ch.id} className="bg-white/5 border border-white/5 rounded-[2.5rem] p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-6 w-full md:w-auto">
              <div className="w-16 h-16 rounded-3xl bg-black border border-white/5 flex items-center justify-center text-emerald-500">
                {ch.game_type === 'quiz' ? <Brain /> : ch.game_type === 'biometric' ? <Zap /> : <Lock />}
              </div>
              <div>
                <h3 className="text-lg tracking-tight mb-1">{ch.title}</h3>
                <div className="flex items-center gap-3 text-[8px] text-slate-500">
                  <span className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full">{ch.challenge_entries?.[0]?.count || 0} JOUEURS ACTIFS</span>
                  <span className="uppercase text-white border-l border-white/10 pl-3">{ch.game_type}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-8 text-center bg-black/40 p-5 rounded-[2rem] border border-white/5">
              <div><p className="text-[7px] text-slate-500 mb-1">ENTRÉE</p><p className="text-sm font-black">{ch.entry_fee} HTG</p></div>
              <div className="w-px h-8 bg-white/10 self-center"/>
              <div><p className="text-[7px] text-slate-500 mb-1">POOL</p><p className="text-sm text-emerald-500 font-black">{ch.prize_pool} HTG</p></div>
              <div className="w-px h-8 bg-white/10 self-center"/>
              <div><p className="text-[7px] text-slate-500 mb-1">FIN</p><p className="text-[10px] text-rose-500">{new Date(ch.ends_at).toLocaleDateString()}</p></div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => deleteChallenge(ch.id)} className="p-4 bg-rose-500/10 text-rose-500 rounded-2xl border border-rose-500/10 hover:bg-rose-500 hover:text-white transition-all">
                <Trash2 size={20} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* MODAL DESIGN PREMIUM */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)} className="absolute inset-0 bg-black/95 backdrop-blur-md" />
            <motion.form initial={{ scale: 0.9, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 50 }} onSubmit={handleCreate} className="relative w-full max-w-lg bg-[#0a0a0f] border border-white/10 rounded-[3.5rem] p-10 space-y-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl text-emerald-500 tracking-tighter italic font-black">Nouveau Protocole</h2>
                <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-500"><X size={24}/></button>
              </div>
              
              <div className="space-y-5">
                <div className="bg-black/40 p-4 rounded-3xl border border-white/5 focus-within:border-emerald-500/50 transition-all">
                  <label className="text-[8px] text-slate-500 ml-2 block mb-1">DÉSIGNATION DE L'OPÉRATION</label>
                  <input required type="text" value={newChallenge.title} onChange={e => setNewChallenge({...newChallenge, title: e.target.value.toUpperCase()})} className="w-full bg-transparent text-white p-2 outline-none" placeholder="EX: OPÉRATION GHOST" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/40 p-4 rounded-3xl border border-white/5">
                    <label className="text-[8px] text-slate-500 ml-2 block mb-1">INTERFACE JEU</label>
                    <select value={newChallenge.game_type} onChange={e => setNewChallenge({...newChallenge, game_type: e.target.value})} className="w-full bg-transparent text-white p-2 outline-none appearance-none">
                      <option value="quiz" className="bg-slate-900">QUIZ ELITE</option>
                      <option value="biometric" className="bg-slate-900">BIOMETRIC HACK</option>
                      <option value="vault" className="bg-slate-900">LASER VAULT</option>
                    </select>
                  </div>
                  <div className="bg-black/40 p-4 rounded-3xl border border-white/5">
                    <label className="text-[8px] text-slate-500 ml-2 block mb-1">ENTRÉE (HTG)</label>
                    <input required type="number" value={newChallenge.entry_fee} onChange={e => setNewChallenge({...newChallenge, entry_fee: Number(e.target.value)})} className="w-full bg-transparent text-white p-2 outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/40 p-4 rounded-3xl border border-white/5">
                    <label className="text-[8px] text-slate-500 ml-2 block mb-1">RÉCOMPENSE POOL</label>
                    <input required type="number" value={newChallenge.prize_pool} onChange={e => setNewChallenge({...newChallenge, prize_pool: Number(e.target.value)})} className="w-full bg-transparent text-emerald-500 p-2 outline-none font-black" />
                  </div>
                  <div className="bg-black/40 p-4 rounded-3xl border border-white/5">
                    <label className="text-[8px] text-slate-500 ml-2 block mb-1">EXPIRATION</label>
                    <input required type="datetime-local" value={newChallenge.ends_at} onChange={e => setNewChallenge({...newChallenge, ends_at: e.target.value})} className="w-full bg-transparent text-white p-2 outline-none text-[10px]" />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button type="submit" disabled={isSubmitting} className="w-full py-6 bg-emerald-500 text-black rounded-[2rem] font-black text-xl shadow-[0_0_30px_rgba(16,185,129,0.2)] active:scale-95 transition-all">
                  {isSubmitting ? <Loader2 className="animate-spin mx-auto" /> : "DÉPLOYER LE DÉFI"}
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const X = ({size}: {size: number}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
