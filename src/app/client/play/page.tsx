"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Zap, Loader2, CheckCircle2, AlertCircle, Wallet } from 'lucide-react';

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
      const { data: pastMises } = await supabase.from('mises').select('chiffre_choisi').eq('tirage_id', tirage.id).eq('user_id', authUser.id);
      setUserMises(pastMises?.map(m => m.chiffre_choisi) || []);
    }
  };

  const handleBet = async () => {
    const betAmount = Number(amount);
    if (!selected || !amount || betAmount <= 0) return;
    if (betAmount > (user?.balance || 0)) {
      setError("Solde insuffisant");
      return;
    }

    setIsBetting(true);
    setError(null);

    try {
      // ÉTAPE 1 : DÉBIT DU COMPTE
      const { error: rpcError } = await supabase.rpc('increment_balance', {
        user_id: user.id,
        amount: -betAmount
      });
      if (rpcError) throw new Error("Transaction refusée.");

      // ÉTAPE 2 : ENREGISTREMENT DU BILLET
      const { error: miseError } = await supabase.from('mises').insert([{
        user_id: user.id,
        tirage_id: session.id,
        chiffre_choisi: selected,
        montant: betAmount,
        status: 'en_attente',
        multiplicateur_moment: session.multiplicateur || 10
      }]);

      if (miseError) {
        // REMBOURSEMENT SI ÉCHEC
        await supabase.rpc('increment_balance', { user_id: user.id, amount: betAmount });
        throw new Error("Sécurité : Mise annulée et remboursée.");
      }

      // ÉTAPE 3 : TRANSACTION LOG
      await supabase.from('transactions').insert([{
        user_id: user.id,
        amount: betAmount,
        type: 'mise',
        status: 'valide'
      }]);

      setSelected(null);
      setAmount('');
      init();
      alert("✅ Billet validé ! Bonne chance.");

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsBetting(false);
    }
  };

  if (!session) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-10 text-center">
      <Zap size={40} className="text-slate-800 mb-4" />
      <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest">Aucun tirage en cours</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#020617] p-4 pb-32 text-white">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* EN-TÊTE */}
        <div className="bg-slate-900 border border-white/5 p-6 rounded-[2rem] flex justify-between items-center shadow-xl">
           <div>
              <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Rideau de Fumée</p>
              <h1 className="text-lg font-black uppercase italic">{session.moment}</h1>
           </div>
           <div className="bg-emerald-500 text-slate-950 px-4 py-1 rounded-full text-[10px] font-black italic">
              x{session.multiplicateur}
           </div>
        </div>

        {/* GRILLE */}
        <div className="grid grid-cols-5 gap-2">
          {session.chiffres_visibles.map((num: string) => (
            <button
              key={num}
              disabled={userMises.includes(num) || isBetting}
              onClick={() => setSelected(num)}
              className={`h-14 rounded-2xl font-black text-sm transition-all border ${
                userMises.includes(num) ? 'bg-slate-950 border-white/5 text-slate-800' :
                selected === num ? 'bg-emerald-500 border-emerald-400 text-slate-950 scale-105' : 'bg-slate-900 border-white/5 text-slate-400'
              }`}
            >
              {num}
            </button>
          ))}
        </div>

        {/* CLAVIER */}
        <div className="bg-slate-900/50 border border-white/5 p-8 rounded-[2.5rem] space-y-6 backdrop-blur-md">
           <div className="bg-black/40 p-5 rounded-2xl border border-white/5 flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-500 uppercase">Mise</span>
              <span className="text-3xl font-black italic text-white">{amount || '0'} <span className="text-xs">HTG</span></span>
           </div>

           <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0, '00', 'C'].map(btn => (
                <button
                  key={btn}
                  onClick={() => btn === 'C' ? setAmount('') : setAmount(prev => prev.length < 6 ? prev + btn : prev)}
                  className="h-14 rounded-2xl bg-slate-950 text-white font-black border border-white/5 active:bg-emerald-500 active:text-black transition-all"
                >
                  {btn}
                </button>
              ))}
           </div>

           {error && (
             <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-500 text-[9px] font-black uppercase italic">
               <AlertCircle size={16} /> {error}
             </div>
           )}

           <button
             disabled={!selected || !amount || isBetting}
             onClick={handleBet}
             className="w-full py-6 bg-emerald-500 text-slate-950 rounded-[2rem] font-black uppercase text-[11px] tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-20 transition-all flex items-center justify-center gap-2"
           >
             {isBetting ? <Loader2 className="animate-spin" /> : 'Confirmer le Billet'}
           </button>
        </div>

        <div className="flex items-center justify-center gap-4 py-4 bg-slate-900/20 rounded-2xl border border-white/5">
            <Wallet size={16} className="text-slate-600" />
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Solde: <span className="text-white">{user?.balance?.toLocaleString()} HTG</span></p>
        </div>
      </div>
    </main>
  );
}
