"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Trophy, Plus, Trash2, Calendar, 
  Target, Zap, Brain, Lock, Loader2, 
  ChevronLeft, Save, AlertCircle, CheckCircle2,
  Users, DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function AdminChallenges() {
  const router = useRouter();
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // État pour le nouveau défi
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
    const { data, error } = await supabase
      .from('challenges')
      .select('*, challenge_entries(count)')
      .order('created_at', { ascending: false });

    if (!error) setChallenges(data || []);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const { error } = await supabase
      .from('challenges')
      .insert([newChallenge]);

    if (error) {
      alert("Erreur: " + error.message);
    } else {
      setShowAddModal(false);
      fetchChallenges();
      setNewChallenge({ title: '', game_type: 'quiz', entry_fee: 50, prize_pool: 500, ends_at: '', is_active: true });
    }
    setIsSubmitting(false);
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    await supabase
      .from('challenges')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    fetchChallenges();
  };

  const deleteChallenge = async (id: string) => {
    if (!confirm("Supprimer ce défi ? Cela effacera aussi les participations.")) return;
    await supabase.from('challenges').delete().eq('id', id);
    fetchChallenges();
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 font-black italic uppercase">
      {/* HEADER CONTROL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl tracking-tighter">GESTION <span className="text-emerald-500">DÉFIS</span></h1>
            <p className="text-[8px] text-slate-500 tracking-[0.4em]">Administration Arena</p>
          </div>
        </div>
        
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-black px-6 py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_10px_30px_rgba(16,185,129,0.2)] active:scale-95"
        >
          <Plus size={20} /> NOUVEAU DÉFI
        </button>
      </div>

      {/* DASHBOARD GRID */}
      <div className="grid grid-cols-1 gap-4">
        {challenges.map((ch) => (
          <motion.div 
            layout
            key={ch.id}
            className="bg-slate-900/50 border border-white/5 rounded-[2rem] p-6 flex flex-col md:flex-row items-center justify-between gap-6"
          >
            <div className="flex items-center gap-6 w-full md:w-auto">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${ch.is_active ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'}`}>
                {ch.game_type === 'quiz' ? <Brain className="text-blue-400" /> : ch.game_type === 'biometric' ? <Zap className="text-emerald-400" /> : <Lock className="text-amber-400" />}
              </div>
              <div>
                <h3 className="text-lg tracking-tight mb-1">{ch.title}</h3>
                <div className="flex items-center gap-3 text-[8px] text-slate-500">
                  <span className="flex items-center gap-1"><Users size={10}/> {ch.challenge_entries?.[0]?.count || 0} INSCRITS</span>
                  <span className="flex items-center gap-1 uppercase bg-white/5 px-2 py-0.5 rounded text-white">{ch.game_type}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-8 w-full md:w-auto justify-between border-t border-b md:border-none border-white/5 py-4 md:py-0">
              <div className="text-center">
                <p className="text-[7px] text-slate-500 mb-1">ENTRÉE</p>
                <p className="text-sm">{ch.entry_fee} HTG</p>
              </div>
              <div className="text-center">
                <p className="text-[7px] text-slate-500 mb-1">PRIZE POOL</p>
                <p className="text-sm text-emerald-500">{ch.prize_pool} HTG</p>
              </div>
              <div className="text-center">
                <p className="text-[7px] text-slate-500 mb-1">EXPIRATION</p>
                <p className="text-[10px] text-rose-500">{new Date(ch.ends_at).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button 
                onClick={() => toggleStatus(ch.id, ch.is_active)}
                className={`flex-1 md:flex-none px-4 py-3 rounded-xl text-[10px] transition-all ${ch.is_active ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}
              >
                {ch.is_active ? 'ACTIF' : 'INACTIF'}
              </button>
              <button 
                onClick={() => deleteChallenge(ch.id)}
                className="p-3 bg-rose-500/10 text-rose-500 rounded-xl border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* MODAL AJOUT DÉFI */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.form 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onSubmit={handleCreate}
              className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-[3rem] p-8 space-y-6 overflow-hidden"
            >
              <h2 className="text-2xl text-emerald-500 mb-8">CONFIGURER LE DÉFI</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[8px] text-slate-500 ml-2">TITRE DU DÉFI</label>
                  <input required type="text" value={newChallenge.title} onChange={e => setNewChallenge({...newChallenge, title: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-2xl p-4 mt-1 outline-none focus:border-emerald-500" placeholder="EX: TOURNOI DE NOËL" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[8px] text-slate-500 ml-2">TYPE DE JEU</label>
                    <select value={newChallenge.game_type} onChange={e => setNewChallenge({...newChallenge, game_type: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-2xl p-4 mt-1 outline-none appearance-none">
                      <option value="quiz">QUIZ ELITE</option>
                      <option value="biometric">BIOMETRIC HACK</option>
                      <option value="vault">LASER VAULT</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[8px] text-slate-500 ml-2">FRAIS D'ENTRÉE (HTG)</label>
                    <input required type="number" value={newChallenge.entry_fee} onChange={e => setNewChallenge({...newChallenge, entry_fee: Number(e.target.value)})} className="w-full bg-black/50 border border-white/10 rounded-2xl p-4 mt-1 outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[8px] text-slate-500 ml-2">PRIZE POOL (HTG)</label>
                    <input required type="number" value={newChallenge.prize_pool} onChange={e => setNewChallenge({...newChallenge, prize_pool: Number(e.target.value)})} className="w-full bg-black/50 border border-white/10 rounded-2xl p-4 mt-1 outline-none text-emerald-500" />
                  </div>
                  <div>
                    <label className="text-[8px] text-slate-500 ml-2">DATE DE FIN</label>
                    <input required type="datetime-local" value={newChallenge.ends_at} onChange={e => setNewChallenge({...newChallenge, ends_at: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-2xl p-4 mt-1 outline-none" />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-4 bg-white/5 rounded-2xl border border-white/10 font-bold hover:bg-white/10 transition-all">ANNULER</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-4 bg-emerald-600 text-black rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all">
                  {isSubmitting ? <Loader2 className="animate-spin" /> : <><Save size={18}/> PUBLIER</>}
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
