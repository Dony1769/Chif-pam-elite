"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Zap, Target, Loader2, Info } from 'lucide-react';

export default function PlayZone() {
  const [session, setSession] = useState<any>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [isBetting, setIsBetting] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetchSession();
    fetchUser();
    
    // Realtime : On écoute les nouveaux tirages
    const channel = supabase.channel('tirage-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tirages' }, () => fetchSession())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from('profiles').select('*').eq('id', user?.id).single();
    setUser(data);
  };

  const fetchSession = async () => {
    const { data } = await supabase.from('tirages').select('*').eq('status', 'ouvert').maybeSingle();
    setSession(data);
  };

  const handleBet = async () => {
    if (!selected || !amount || !session || !user) return;
    const betVal = Number(amount);
    if (betVal > user.balance) return alert("Solde insuffisant !");
    if (betVal < 10) return alert("Minimum 10 HTG");

    setIsBetting(true);
    // 1. Déduire le solde
    await supabase.rpc('increment_balance', { user_id: user.id, amount: -betVal });
    
    // 2. Créer la mise
    const { error } = await supabase.from('mises').insert([{
      user_id: user.id,
      tirage_id: session.id,
      chiffre_choisi: selected,
      montant: betVal,
      gain_potentiel: betVal * session.multiplicateur
    }]);

    if (!error) {
      alert(`Mise validée sur le ${selected} !`);
      setAmount('');
      setSelected(null);
      fetchUser();
    }
    setIsBetting(false);
  };

  if (!session) return (
    <div className="h-[70vh] flex flex-col items-center justify-center text-slate-500 space-y-4">
      <Loader2 className="animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em]">Attente du prochain tirage...</p>
    </div>
  );

  return (
    <div className="p-4 space-y-8 pb-32 animate-in fade-in duration-700">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 px-4 py-1 rounded-full border border-emerald-500/20">
          <Zap size={12} className="text-emerald-500 animate-pulse" />
          <span className="text-[9px] font-black uppercase text-emerald-500 tracking-widest">Session {session.moment} • x{session.multiplicateur}</span>
        </div>
        <h2 className="text-2xl font-black italic uppercase tracking-tighter">Rideau de <span className="text-emerald-500">Fumée</span></h2>
      </div>

      {/* Les 10 Bulles Néon */}
      <div className="grid grid-cols-5 gap-3">
        {session.chiffres_visibles.map((num: string) => (
          <button
            key={num}
            onClick={() => setSelected(num)}
            className={`h-16 rounded-2xl font-black text-xl transition-all duration-300 border ${
              selected === num 
              ? 'bg-emerald-500 border-emerald-400 text-slate-950 scale-110 shadow-[0_0_25px_rgba(16,185,129,0.4)]' 
              : 'bg-slate-900/80 border-white/5 text-slate-400 hover:border-emerald-500/30'
            }`}
          >
            {num}
          </button>
        ))}
      </div>

      {/* Clavier Elite */}
      <div className="bg-slate-900/60 p-6 rounded-[2.5rem] border border-white/10 backdrop-blur-xl">
        <div className="flex justify-between items-center mb-6 px-2">
           <span className="text-[10px] font-black uppercase text-slate-500">Ta Mise (HTG)</span>
           <span className="text-2xl font-black text-emerald-500 italic">{amount || '0'}</span>
        </div>
        
        <div className="grid grid-cols-3 gap-2 mb-6">
          {['1','2','3','4','5','6','7','8','9','0','00','C'].map(btn => (
            <button
              key={btn}
              onClick={() => btn === 'C' ? setAmount('') : setAmount(prev => prev + btn)}
              className="h-12 rounded-xl bg-white/5 hover:bg-white/10 font-black text-sm transition-all active:scale-95"
            >
              {btn}
            </button>
          ))}
        </div>

        <button
          disabled={!selected || !amount || isBetting}
          onClick={handleBet}
          className="w-full py-5 bg-emerald-500 text-slate-950 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-lg shadow-emerald-500/20 disabled:opacity-20 active:scale-95 transition-all"
        >
          {isBetting ? 'Transmission...' : 'Valider mon choix'}
        </button>
      </div>
    </div>
  );
}