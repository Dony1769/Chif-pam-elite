"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Loader2, ShieldCheck, Target, Users, Coins, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminArena() {
  const [challenges, setChallenges] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ 
    title: '', 
    game_type: 'quiz', 
    entry_fee_cp_base: 100,
    prize_pool_cp: 0, 
    max_participants: 50, 
    ends_at: '' 
  });

  useEffect(() => { fetchChallenges(); }, []);

  useEffect(() => {
    const totalCPBrut = form.entry_fee_cp_base * form.max_participants;
    const netPrizeCP = Math.floor(totalCPBrut * 0.70);
    setForm(prev => ({ ...prev, prize_pool_cp: netPrizeCP }));
  }, [form.entry_fee_cp_base, form.max_participants]);

  const fetchChallenges = async () => {
    // On sélectionne challenge_attempts pour voir les stats de participation
    const { data } = await supabase
      .from('challenges')
      .select('*, challenge_attempts(user_id, attempts_count, total_score)')
      .order('created_at', { ascending: false });
    setChallenges(data || []);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!form.ends_at) return alert("Heure de fin requise");
    
    const { error } = await supabase.from('challenges').insert([{ 
      ...form, 
      ends_at: new Date(form.ends_at).toISOString(),
      is_active: true 
    }]);
    
    if (error) alert(error.message);
    setShowModal(false);
    fetchChallenges();
  };

  const closeChallenge = async (id: string) => {
    if(!confirm("CLÔTURER ET DISTRIBUER LES CP ? Cette action désactive le défi.")) return;
    const { error } = await supabase.from('challenges').update({ is_active: false }).eq('id', id);
    if(!error) fetchChallenges();
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={40} /></div>;

  return (
    <div className="min-h-screen bg-[#020617] text-white p-8 font-black italic uppercase pb-20">
      <div className="flex justify-between items-end mb-12">
        <div>
          <h1 className="text-5xl tracking-tighter">CP_ARENA <span className="text-emerald-500">ADMIN</span></h1>
          <p className="text-[10px] text-emerald-500/50 mt-4 tracking-[0.5em]">CONTROLE DES FLUX ET MISSIONS</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-white text-black px-10 py-5 rounded-3xl flex items-center gap-3 hover:bg-emerald-500 shadow-2xl transition-all active:scale-95">
          <Plus size={24}/> NOUVELLE MISSION
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {challenges.map((ch) => {
          // Stats basées sur la nouvelle logique de cumul
          const uniquePlayers = ch.challenge_attempts?.length || 0;
          const totalPaidSessions = ch.challenge_attempts?.reduce((acc: number, curr: any) => acc + curr.attempts_count, 0) || 0;
          
          return (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
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
                    <span className="text-[8px] px-3 py-1 rounded-full border border-white/10 text-slate-400">
                        {ch.game_type}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl text-emerald-500 font-black">{ch.prize_pool_cp} <span className="text-xs">CP</span></p>
                  <p className="text-[8px] text-slate-500 tracking-widest uppercase">Cagnotte Finale</p>
                </div>
              </div>

              {/* STATS GRID OPTIMISÉE */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-black/50 p-4 rounded-3xl border border-white/5 text-center">
                  <p className="text-[7px] text-slate-500 mb-1">JOUEURS</p>
                  <p className="text-lg font-black flex items-center justify-center gap-1"><Users size={12}/> {uniquePlayers}</p>
                </div>
                <div className="bg-black/50 p-4 rounded-3xl border border-white/5 text-center">
                  <p className="text-[7px] text-slate-500 mb-1">SESSIONS</p>
                  <p className="text-lg font-black text-emerald-500 flex items-center justify-center gap-1"><Coins size={12}/> {totalPaidSessions}</p>
                </div>
                <div className="bg-black/50 p-4 rounded-3xl border border-white/5 text-center">
                  <p className="text-[7px] text-slate-500 mb-1">LIMIT</p>
                  <p className="text-lg font-black">{ch.max_participants}</p>
                </div>
                <div className="bg-black/50 p-4 rounded-3xl border border-white/5 text-center">
                  <p className="text-[7px] text-slate-500 mb-1">FRAIS</p>
                  <p className="text-lg font-black">{ch.entry_fee_cp_base}</p>
                </div>
              </div>

              <div className="flex gap-4">
                {ch.is_active && (
                  <button onClick={() => closeChallenge(ch.id)} className="flex-1 py-5 bg-emerald-500 text-black rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all">
                    <ShieldCheck size={20}/> CLÔTURER MISSION
                  </button>
                )}
                <button 
                   onClick={() => router.push(`/client/rank?challengeId=${ch.id}`)}
                   className="p-5 bg-white/5 text-emerald-500 rounded-2xl hover:bg-white/10 transition-all"
                >
                  <BarChart3 size={20}/>
                </button>
                <button onClick={async () => { if(confirm("Supprimer définitivement ?")) { await supabase.from('challenges').delete().eq('id', ch.id); fetchChallenges(); }}} className="p-5 bg-white/5 text-rose-500 rounded-2xl hover:bg-rose-600 hover:text-white transition-all">
                  <Trash2 size={20}/>
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* MODAL DE CRÉATION (Inchangé mais nettoyé) */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-2xl">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-black/90" />
            <motion.form 
              initial={{ scale: 0.9, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 50 }}
              onSubmit={handleCreate}
              className="relative w-full max-w-xl bg-slate-900 border border-white/10 rounded-[3.5rem] p-10 space-y-6 shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-4">
                <Target className="text-emerald-500" size={32} />
                <h2 className="text-3xl italic font-black">NOUVELLE MISSION</h2>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                    <p className="text-[9px] text-slate-500 ml-2">TITRE DE L'OPÉRATION</p>
                    <input required placeholder="EX: QUIZ DES LÉGENDES" className="w-full bg-black border border-white/5 p-5 rounded-2xl outline-none focus:border-emerald-500 italic font-black" onChange={e => setForm({...form, title: e.target.value.toUpperCase()})} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-[9px] text-slate-500 ml-2">MOTEUR DE JEU</p>
                    <select className="w-full bg-black border border-white/5 p-5 rounded-2xl outline-none font-bold" onChange={e => setForm({...form, game_type: e.target.value})}>
                        <option value="quiz">QUIZ ELITE</option>
                        <option value="biometric">BIOMETRIC HACK</option>
                        <option value="vault">LASER VAULT</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[9px] text-slate-500 ml-2">EXPIRATION</p>
                    <input required type="datetime-local" className="w-full bg-black border border-white/5 p-5 rounded-2xl outline-none font-bold text-emerald-500 uppercase" onChange={e => setForm({...form, ends_at: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <p className="text-[7px] text-slate-500 text-center uppercase">PRIX SESSION</p>
                    <input required type="number" value={form.entry_fee_cp_base} className="w-full bg-black border border-white/5 p-5 rounded-2xl outline-none text-center font-black" onChange={e => setForm({...form, entry_fee_cp_base: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[7px] text-emerald-500 text-center uppercase font-black">CAGNOTTE CP</p>
                    <input disabled type="number" value={form.prize_pool_cp} className="w-full bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl outline-none text-emerald-500 font-black text-center" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[7px] text-slate-500 text-center uppercase">LIMIT JOUEURS</p>
                    <input required type="number" value={form.max_participants} className="w-full bg-black border border-white/5 p-5 rounded-2xl outline-none text-center font-black" onChange={e => setForm({...form, max_participants: Number(e.target.value)})} />
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full py-6 bg-emerald-600 text-black rounded-[2rem] font-black text-xl hover:bg-emerald-400 transition-all uppercase shadow-[0_15px_30px_rgba(16,185,129,0.3)]">
                DÉPLOYER LA MISSION
              </button>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
