"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Power, Users, Database, X, Loader2, Award, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminArena() {
  const [challenges, setChallenges] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', game_type: 'quiz', entry_fee_base: 50, prize_pool: 500, max_participants: 100, ends_at: '' });

  useEffect(() => { fetchChallenges(); }, []);

  const fetchChallenges = async () => {
    const { data } = await supabase.from('challenges').select('*, challenge_attempts(user_id)').order('created_at', { ascending: false });
    setChallenges(data || []);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('challenges').insert([{ ...form, ends_at: new Date(form.ends_at).toISOString() }]);
    setShowModal(false);
    fetchChallenges();
  };

  const closeChallenge = async (id: string) => {
    if(!confirm("ATTENTION : Cela va stopper le défi et payer automatiquement les 3 gagnants sur leur balance. Confirmer ?")) return;
    await supabase.from('challenges').update({ is_active: false }).eq('id', id);
    fetchChallenges();
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="min-h-screen bg-[#020617] text-white p-8 font-black italic uppercase">
      <div className="flex justify-between items-end mb-12">
        <div>
          <h1 className="text-5xl tracking-tighter">ARENA <span className="text-emerald-500 underline decoration-1 underline-offset-8">HQ</span></h1>
          <p className="text-[10px] text-emerald-500/50 mt-4 tracking-[0.5em]">SYSTEM_CONTROL_ACTIVE</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-emerald-600 text-black px-10 py-5 rounded-3xl flex items-center gap-3 hover:bg-emerald-400 transition-all shadow-2xl">
          <Plus size={24}/> NOUVELLE MISSION
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {challenges.map((ch) => {
          const playersCount = new Set(ch.challenge_attempts?.map((a: any) => a.user_id)).size;
          return (
            <div key={ch.id} className={`p-8 rounded-[3rem] border transition-all ${ch.is_active ? 'bg-slate-900/40 border-white/10' : 'bg-black/80 border-rose-900/30 grayscale'}`}>
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-xl mb-2">{ch.title}</h3>
                  <span className={`text-[9px] px-3 py-1 rounded-full border ${ch.is_active ? 'text-emerald-500 border-emerald-500/20' : 'text-rose-500 border-rose-500/20'}`}>
                    {ch.is_active ? 'MISSION EN COURS' : 'MISSION TERMINÉE'}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-2xl text-emerald-500">{ch.prize_pool} HTG</p>
                  <p className="text-[8px] text-slate-500 tracking-widest uppercase">POOL DE RÉCOMPENSE</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-black/50 p-4 rounded-2xl border border-white/5">
                  <p className="text-[7px] text-slate-500 mb-1">PARTICIPANTS</p>
                  <p className="text-sm">{playersCount}/{ch.max_participants}</p>
                </div>
                <div className="bg-black/50 p-4 rounded-2xl border border-white/5">
                  <p className="text-[7px] text-slate-500 mb-1">TYPE</p>
                  <p className="text-sm">{ch.game_type}</p>
                </div>
                <div className="bg-black/50 p-4 rounded-2xl border border-white/5">
                  <p className="text-[7px] text-slate-500 mb-1">FEE BASE</p>
                  <p className="text-sm">{ch.entry_fee_base}</p>
                </div>
              </div>

              <div className="flex gap-4">
                {ch.is_active && (
                  <button onClick={() => closeChallenge(ch.id)} className="flex-1 py-4 bg-rose-600/10 text-rose-500 border border-rose-500/20 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-rose-600 hover:text-white transition-all">
                    <Power size={18}/> CLÔTURER & PAYER
                  </button>
                )}
                <button onClick={async () => { if(confirm("Supprimer ?")) await supabase.from('challenges').delete().eq('id', ch.id); fetchChallenges(); }} className="p-4 bg-white/5 text-slate-500 rounded-2xl hover:bg-rose-500/20 hover:text-rose-500 transition-all">
                  <Trash2 size={20}/>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL CONFIGURATION PREMIUM */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-2xl">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-black/80" />
            <motion.form 
              initial={{ scale: 0.9, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 50 }}
              onSubmit={handleCreate}
              className="relative w-full max-w-xl bg-slate-900 border border-white/10 rounded-[3.5rem] p-12 space-y-6 shadow-[0_30px_100px_rgba(0,0,0,0.8)]"
            >
              <div className="flex items-center gap-4 mb-4">
                <Settings className="text-emerald-500" size={32} />
                <h2 className="text-3xl italic font-black underline decoration-emerald-500">INITIALISER DÉFI</h2>
              </div>
              
              <div className="space-y-4">
                <input required placeholder="NOM DE LA MISSION" className="w-full bg-black border border-white/5 p-5 rounded-2xl outline-none focus:border-emerald-500 italic" onChange={e => setForm({...form, title: e.target.value.toUpperCase()})} />
                
                <div className="grid grid-cols-2 gap-4">
                  <select className="bg-black border border-white/5 p-5 rounded-2xl outline-none italic" onChange={e => setForm({...form, game_type: e.target.value})}>
                    <option value="quiz">QUIZ ELITE</option>
                    <option value="biometric">BIOMETRIC HACK</option>
                    <option value="vault">LASER VAULT</option>
                  </select>
                  <input required type="datetime-local" className="bg-black border border-white/5 p-5 rounded-2xl outline-none italic" onChange={e => setForm({...form, ends_at: e.target.value})} />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <p className="text-[7px] text-slate-500 ml-2 uppercase tracking-widest">TICKET BASE</p>
                    <input required type="number" className="w-full bg-black border border-white/5 p-5 rounded-2xl outline-none" onChange={e => setForm({...form, entry_fee_base: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[7px] text-slate-500 ml-2 uppercase tracking-widest">CAGNOTTE TOTAL</p>
                    <input required type="number" className="w-full bg-black border border-white/5 p-5 rounded-2xl outline-none text-emerald-500" onChange={e => setForm({...form, prize_pool: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[7px] text-slate-500 ml-2 uppercase tracking-widest">LIMITE JOUEURS</p>
                    <input required type="number" className="w-full bg-black border border-white/5 p-5 rounded-2xl outline-none" onChange={e => setForm({...form, max_participants: Number(e.target.value)})} />
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full py-6 bg-emerald-600 text-black rounded-3xl font-black text-xl shadow-2xl hover:bg-emerald-400 hover:scale-[1.02] transition-all uppercase tracking-tighter">
                DÉPLOYER SUR LE RÉSEAU
              </button>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
