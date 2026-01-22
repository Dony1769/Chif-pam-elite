"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Brain, Zap, Lock, Loader2, ChevronLeft, Save, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function AdminChallenges() {
  const router = useRouter();
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const [newChallenge, setNewChallenge] = useState({
    title: '', game_type: 'quiz', entry_fee: 50, prize_pool: 500, ends_at: ''
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
    
    // Insertion alignée sur la structure de ta table
    const { error } = await supabase.from('challenges').insert([{
      title: newChallenge.title,
      game_type: newChallenge.game_type,
      entry_fee: newChallenge.entry_fee,
      prize_pool: newChallenge.prize_pool,
      ends_at: new Date(newChallenge.ends_at).toISOString(),
      is_active: true
    }]);

    if (error) {
      alert("Erreur critique : " + error.message);
    } else {
      setShowAddModal(false);
      fetchChallenges();
      setNewChallenge({ title: '', game_type: 'quiz', entry_fee: 50, prize_pool: 500, ends_at: '' });
    }
    setIsSubmitting(false);
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 font-black italic uppercase">
      <div className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-emerald-500 transition-all">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-3xl tracking-tighter italic font-black">ARENA <span className="text-emerald-500">MASTER</span></h1>
        </div>
        <button onClick={() => setShowAddModal(true)} className="bg-emerald-500 text-black px-6 py-4 rounded-2xl font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
          <Plus size={20} /> DÉPLOYER MISSION
        </button>
      </div>

      {/* LISTE ADMIN */}
      <div className="space-y-4">
        {challenges.map((ch) => (
          <div key={ch.id} className="bg-slate-900/50 border border-white/5 rounded-3xl p-6 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center text-emerald-500 border border-white/10">
                {ch.game_type === 'quiz' ? <Brain /> : ch.game_type === 'biometric' ? <Zap /> : <Lock />}
              </div>
              <div>
                <p className="text-sm italic">{ch.title}</p>
                <p className="text-[7px] text-slate-500 tracking-widest">{ch.game_type} • {ch.prize_pool} HTG</p>
              </div>
            </div>
            <button onClick={async () => { await supabase.from('challenges').delete().eq('id', ch.id); fetchChallenges(); }} className="p-3 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all">
              <Trash2 size={20} />
            </button>
          </div>
        ))}
      </div>

      {/* MODAL AJOUT */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)} className="absolute inset-0 bg-black/80" />
            <motion.form 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onSubmit={handleCreate}
              className="relative w-full max-w-lg bg-[#0a0a0f] border border-white/10 rounded-[3rem] p-10 space-y-6"
            >
              <h2 className="text-2xl text-emerald-500 italic font-black">INITIALISER DÉFI</h2>
              <div className="space-y-4">
                <input required type="text" value={newChallenge.title} onChange={e => setNewChallenge({...newChallenge, title: e.target.value.toUpperCase()})} placeholder="NOM DE LA MISSION" className="w-full bg-black border border-white/10 rounded-2xl p-4 outline-none focus:border-emerald-500 italic" />
                <select value={newChallenge.game_type} onChange={e => setNewChallenge({...newChallenge, game_type: e.target.value})} className="w-full bg-black border border-white/10 rounded-2xl p-4 outline-none italic">
                  <option value="quiz">QUIZ ELITE</option>
                  <option value="biometric">BIOMETRIC HACK</option>
                  <option value="vault">LASER VAULT</option>
                </select>
                <div className="grid grid-cols-2 gap-4">
                  <input required type="number" value={newChallenge.entry_fee} onChange={e => setNewChallenge({...newChallenge, entry_fee: Number(e.target.value)})} placeholder="TICKET HTG" className="bg-black border border-white/10 rounded-2xl p-4 outline-none italic" />
                  <input required type="number" value={newChallenge.prize_pool} onChange={e => setNewChallenge({...newChallenge, prize_pool: Number(e.target.value)})} placeholder="POOL HTG" className="bg-black border border-white/10 rounded-2xl p-4 outline-none italic text-emerald-500" />
                </div>
                <input required type="datetime-local" value={newChallenge.ends_at} onChange={e => setNewChallenge({...newChallenge, ends_at: e.target.value})} className="w-full bg-black border border-white/10 rounded-2xl p-4 outline-none italic" />
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-emerald-600 text-black rounded-2xl font-black text-lg hover:bg-emerald-500 transition-all">
                {isSubmitting ? <Loader2 className="animate-spin mx-auto" /> : "DÉPLOYER"}
              </button>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

