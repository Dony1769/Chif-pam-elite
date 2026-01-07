"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Zap, Loader2, CheckCircle2, AlertCircle, Wallet, Lock } from 'lucide-react';

export default function PlayZone() {
  const [session, setSession] = useState<any>(null);
  const [userMises, setUserMises] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [isBetting, setIsBetting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    init();
    const channel = supabase.channel('tirage-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tirages' }, () => init())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mises' }, () => init())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const init = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
    setUser(profile);

    const { data: tirage } = await supabase.from('tirages').select('*').eq('status', 'ouvert').maybeSingle();
    setSession(tirage);

    if (tirage) {
      const { data: past } = await supabase.from('mises')
        .select('chiffre_choisi')
        .eq('tirage_id', tirage.id)
        .eq('user_id', authUser.id);
      setUserMises(past?.map(m => m.chiffre_choisi) || []);
    }
  };

  const handleBet = async () => {
    const betAmt = Number(amount);
    if (!selected || betAmt <= 0 || !session) return;
    
    if (userMises.includes(selected)) {
      setError("Chiffre déjà joué pour cette session.");
      return;
    }
    if (betAmt > (user?.balance || 0)) {
      setError("Solde insuffisant.");
      return;
    }

    setIsBetting(true);
    setError(null);

    try {
      // 1. DÉBIT
      const { error: dError } = await supabase.rpc('increment_balance', { 
        user_id: user.id, 
        amount: -betAmt 
      });
      if (dError) throw new Error("Échec du débit.");

      // 2. INSERTION
      const { error: mError } = await supabase.from('mises').insert({
        user_id: user.id,
        tirage_id: session.id,
        chiffre_choisi: selected,
        montant: betAmt,
        status: 'en_attente',
        multiplicateur_moment: session.multiplicateur || 10
      });

      if (mError) {
        // REMBOURSEMENT AUTOMATIQUE SI LA DB REJETTE
        await supabase.rpc('increment_balance', { user_id: user.id, amount: betAmt });
        console.error("Erreur DB détaillée:", mError);
        throw new Error("Erreur technique (Base de données). Mise remboursée.");
      }

      // 3. LOG TRANSACTION
      await supabase.from('transactions').insert({
        user_id: user.id,
        amount: betAmt,
        type: 'mise',
        status: 'valide'
      });

      alert("🎉 Billet validé ! Bonne chance.");
      setSelected(null);
      setAmount('');
      init();

    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsBetting(false);
    }
  };

  if (!session) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-8 text-center">
      <Lock size={40} className="text-slate-800 mb-4" />
      <h2 className="text-white font-black uppercase italic tracking-tighter">Aucune session ouverte</h2>
      <p className="text-slate-500 text-[10px] mt-2 uppercase tracking-widest">Revenez au prochain tirage</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#020617] p-4 pb-32 text-white font-sans">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* HEADER PRO */}
        <div className="bg-slate-900 border border-white/5 p-6 rounded-[2.5rem] flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-black shadow-lg shadow-emerald-500/20">
              <Zap size={20} fill="currentColor" />
            </div>
            <div>
              <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">{session.moment}</p>
              <h1 className="text-lg font-black uppercase italic">Live Zone</h1>
            </div>
          </div>
          <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/5">
            <p className="text-emerald-500 font-black text-xs">x{session.multiplicateur}</p>
          </div>
        </div>

        {/* GRILLE DE CHIFFRES */}
        <div className="grid grid-cols-5 gap-2">
          {session.chiffres_visibles.map((n: string) => {
            const played = userMises.includes(n);
            const active = selected === n;
            return (
              <button
                key={n}
                disabled={played || isBetting}
                onClick={() => setSelected(n)}
                className={`h-14 rounded-2xl font-black text-sm border transition-all ${
                  played ? 'bg-slate-950 border-white/5 text-slate-800' :
                  active ? 'bg-emerald-500 border-emerald-400 text-slate-950 scale-105 shadow-xl' :
                  'bg-slate-900 border-white/5 text-slate-400 active:scale-95'
                }`}
              >
                {n}
              </button>
            );
          })}
        </div>

        {/* CLAVIER & ACTION */}
        <div className="bg-slate-900/50 border border-white/5 p-8 rounded-[2.5rem] space-y-6 backdrop-blur-xl">
           <div className="bg-black/40 p-5 rounded-2xl border border-white/5 flex justify-between items-center">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Votre Mise</span>
              <span className="text-3xl font-black italic text-white">{amount || '0'} <span className="text-xs">HTG</span></span>
           </div>

           <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0, '00', 'C'].map(btn => (
                <button
                  key={btn}
                  onClick={() => btn === 'C' ? setAmount('') : setAmount(prev => prev.length < 6 ? prev + btn : prev)}
                  className="h-12 rounded-xl bg-slate-950 text-white font-black border border-white/5 active:bg-emerald-500 active:text-black transition-colors"
                >
                  {btn}
                </button>
              ))}
           </div>

           {error && (
             <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-500 text-[10px] font-black uppercase italic">
               <AlertCircle size={16} /> {error}
             </div>
           )}

           <button
             disabled={!selected || !amount || isBetting}
             onClick={handleBet}
             className="w-full py-6 bg-emerald-500 text-slate-950 rounded-[2rem] font-black uppercase text-[11px] tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-20 transition-all flex items-center justify-center gap-2"
           >
             {isBetting ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={18} />}
             VALIDER LE BILLET
           </button>
        </div>

        {/* FOOTER SOLDE */}
        <div className="flex items-center justify-center gap-4 py-4 bg-slate-900/20 rounded-2xl border border-white/5">
            <Wallet size={16} className="text-slate-600" />
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Mon Solde: <span className="text-white">{user?.balance?.toLocaleString()} HTG</span></p>
        </div>
      </div>
    </main>
  );
}
