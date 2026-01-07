"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Zap, Loader2, CheckCircle2, AlertCircle, Wallet, Info } from 'lucide-react';

export default function PlayZone() {
  const [session, setSession] = useState<any>(null);
  const [userMises, setUserMises] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [isBetting, setIsBetting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<string | null>(null); // Pour voir l'erreur sans F12

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
      const { data: pastMises } = await supabase
        .from('mises')
        .select('chiffre_choisi')
        .eq('tirage_id', tirage.id)
        .eq('user_id', authUser.id);
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
    setDebug(null);

    try {
      // 1. DÉDUCTION DU SOLDE
      const { error: rpcError } = await supabase.rpc('increment_balance', {
        user_id: user.id,
        amount: -betAmount
      });

      if (rpcError) throw new Error("Problème de solde: " + rpcError.message);

      // 2. TENTATIVE D'INSERTION
      const { error: miseError } = await supabase.from('mises').insert([{
        user_id: user.id,
        tirage_id: session.id,
        chiffre_choisi: selected,
        montant: betAmount,
        status: 'en_attente',
        multiplicateur_moment: session.multiplicateur || 10
      }]);

      if (miseError) {
        // AFFICHAGE DE L'ERREUR TECHNIQUE POUR TOI
        setDebug(`CODE: ${miseError.code} | MSG: ${miseError.message}`);
        
        // REMBOURSEMENT AUTOMATIQUE
        await supabase.rpc('increment_balance', { user_id: user.id, amount: betAmount });
        throw new Error("Erreur technique : Mise annulée et remboursée.");
      }

      // 3. LOG TRANSACTION
      await supabase.from('transactions').insert([{
        user_id: user.id,
        amount: betAmount,
        type: 'mise',
        status: 'valide'
      }]);

      setSelected(null);
      setAmount('');
      alert("✅ Billet enregistré !");
      init();

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsBetting(false);
    }
  };

  if (!session) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-center">
      <Zap size={48} className="text-slate-800 mb-4 animate-pulse" />
      <h2 className="text-white font-black uppercase italic tracking-tighter">Session Fermée</h2>
      <p className="text-slate-500 text-[10px] mt-2 uppercase tracking-[0.3em]">En attente du prochain tirage...</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#020617] p-4 pb-32 text-white font-sans">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* CARTE INFO SESSION */}
        <div className="bg-slate-900 border border-white/5 p-6 rounded-[2.5rem] flex justify-between items-center shadow-2xl">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-black">
                <Zap size={20} fill="currentColor" />
             </div>
             <div>
                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Session active</p>
                <h1 className="text-lg font-black uppercase italic">{session.moment}</h1>
             </div>
          </div>
          <div className="bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20">
             <p className="text-emerald-500 font-black text-xs italic">x{session.multiplicateur}</p>
          </div>
        </div>

        {/* GRILLE TACTILE OPTIMISÉE */}
        <div className="grid grid-cols-5 gap-2">
          {session.chiffres_visibles.map((num: string) => {
            const hasBet = userMises.includes(num);
            const isSelected = selected === num;
            return (
              <button
                key={num}
                disabled={hasBet || isBetting}
                onClick={() => setSelected(num)}
                className={`h-14 rounded-2xl font-black text-sm transition-all border ${
                  hasBet ? 'bg-slate-950 border-white/5 text-slate-700' :
                  isSelected ? 'bg-emerald-500 border-emerald-400 text-slate-950 scale-105 shadow-[0_0_20px_rgba(16,185,129,0.3)]' :
                  'bg-slate-900 border-white/5 text-slate-400 active:bg-slate-800'
                }`}
              >
                {num}
              </button>
            );
          })}
        </div>

        {/* CLAVIER DE MISE PRO */}
        <div className="bg-slate-900 border border-white/5 p-8 rounded-[2.5rem] space-y-6 relative overflow-hidden">
           <div className="flex justify-between items-center bg-black/40 p-5 rounded-2xl border border-white/5">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Mise Billet</span>
              <span className="text-3xl font-black italic text-emerald-500">{amount || '0'} <span className="text-[10px] text-slate-600 not-italic">HTG</span></span>
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

           {/* AFFICHAGE DES ERREURS */}
           {error && (
             <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl space-y-2">
               <div className="flex items-center gap-3 text-rose-500">
                 <AlertCircle size={18} />
                 <p className="text-[10px] font-black uppercase italic">{error}</p>
               </div>
               {/* ZONE DE DEBUG VISUEL POUR MOBILE */}
               {debug && (
                 <div className="p-2 bg-black/40 rounded-lg border border-white/5 font-mono text-[8px] text-rose-400 break-all">
                    LOG_TECHNIQUE: {debug}
                 </div>
               )}
             </div>
           )}

           <button
             disabled={!selected || !amount || isBetting}
             onClick={handleBet}
             className="w-full py-6 bg-emerald-500 text-slate-950 rounded-[2rem] font-black uppercase text-[11px] tracking-[0.2em] shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-20 transition-all flex items-center justify-center gap-2"
           >
             {isBetting ? <Loader2 className="animate-spin" /> : 'Valider le Billet'}
           </button>
        </div>

        {/* BARRE DE SOLDE */}
        <div className="flex items-center justify-center gap-4 py-4 bg-slate-900/30 rounded-2xl border border-white/5">
            <Wallet size={16} className="text-emerald-500" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Solde: <span className="text-white">{user?.balance?.toLocaleString()} HTG</span></p>
        </div>
      </div>
    </main>
  );
}
