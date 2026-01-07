"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Zap, Loader2, CheckCircle2, AlertCircle, Wallet, History } from 'lucide-react';
import Link from 'next/link';

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
    if (betAmount > user.balance) {
      setError("Solde insuffisant pour ce billet");
      return;
    }

    setIsBetting(true);
    setError(null);

    try {
      // 1. Déduction préventive du solde
      const { error: rpcError } = await supabase.rpc('increment_balance', {
        user_id: user.id,
        amount: -betAmount
      });

      if (rpcError) throw new Error("Transaction refusée par le système bancaire.");

      // 2. Enregistrement de la mise avec multiplicateur figé
      const { error: miseError } = await supabase.from('mises').insert([{
        user_id: user.id,
        tirage_id: session.id,
        chiffre_choisi: selected,
        montant: betAmount,
        status: 'en_attente',
        multiplicateur_moment: session.multiplicateur || 10
      }]);

      if (miseError) {
        // ACTION DE SECOURS : Remboursement automatique
        await supabase.rpc('increment_balance', { user_id: user.id, amount: betAmount });
        console.error("Erreur technique DB:", miseError);
        throw new Error("Erreur serveur : Votre mise a été annulée et remboursée.");
      }

      // 3. Log de transaction pour l'admin
      await supabase.from('transactions').insert([{
        user_id: user.id,
        amount: betAmount,
        type: 'mise',
        status: 'valide',
        admin_note: `Billet #${selected} (Session ${session.moment})`
      }]);

      setSelected(null);
      setAmount('');
      init();
      alert("🎉 Billet validé avec succès ! Bonne chance.");

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsBetting(false);
    }
  };

  if (!session) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mb-6 border border-white/5">
        <Zap size={32} className="text-slate-700" />
      </div>
      <h2 className="text-white font-black uppercase italic tracking-tighter text-xl">Aucune session active</h2>
      <p className="text-slate-500 text-[10px] mt-2 uppercase tracking-[0.2em]">Le prochain tirage commence bientôt...</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#020617] p-4 pb-32 text-white font-sans">
      <div className="max-w-md mx-auto space-y-6 animate-in fade-in duration-500">
        
        {/* STATUT DU TIRAGE */}
        <div className="bg-gradient-to-r from-emerald-600/20 to-transparent border border-emerald-500/20 p-6 rounded-[2.5rem] flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20">
              <Zap size={24} />
            </div>
            <div>
              <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">En cours • {session.moment}</p>
              <h1 className="text-lg font-black uppercase italic leading-none">Rideau de Fumée</h1>
            </div>
          </div>
          <div className="bg-black/40 px-4 py-2 rounded-xl border border-white/5">
             <span className="text-[10px] font-black text-emerald-500">x{session.multiplicateur}</span>
          </div>
        </div>

        {/* GRILLE DE CHIFFRES */}
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
                  hasBet ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-500/20' :
                  isSelected ? 'bg-emerald-500 border-emerald-400 text-slate-950 scale-110' :
                  'bg-slate-900 border-white/5 text-slate-400 active:scale-90'
                }`}
              >
                {num}
              </button>
            );
          })}
        </div>

        {/* CLAVIER NUMÉRIQUE PRO */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 p-8 rounded-[2.5rem] space-y-6">
           <div className="flex justify-between items-center bg-slate-950 p-5 rounded-3xl border border-white/5 shadow-inner">
              <span className="text-[10px] font-black uppercase text-slate-600 tracking-widest">Mise Billet</span>
              <div className="text-right">
                <span className="text-3xl font-black italic text-white">{amount || '0'}</span>
                <span className="text-[10px] ml-2 font-bold text-slate-500">HTG</span>
              </div>
           </div>

           <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0, '00', 'C'].map(btn => (
                <button
                  key={btn}
                  onClick={() => btn === 'C' ? setAmount('') : setAmount(prev => (prev.length < 6 ? prev + btn : prev))}
                  className="h-14 rounded-2xl bg-slate-900 text-white font-black border border-white/5 hover:bg-emerald-500 hover:text-black transition-all active:scale-95 shadow-sm"
                >
                  {btn}
                </button>
              ))}
           </div>

           {error && (
             <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-500">
               <AlertCircle size={18} />
               <p className="text-[10px] font-black uppercase italic">{error}</p>
             </div>
           )}

           <button
             disabled={!selected || !amount || isBetting}
             onClick={handleBet}
             className="w-full py-6 bg-emerald-500 text-slate-950 rounded-[2rem] font-black uppercase text-[11px] tracking-[0.2em] shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-20 transition-all flex items-center justify-center gap-2"
           >
             {isBetting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
             CONFIRMER LE BILLET
           </button>
        </div>

        {/* SOLDE RAPIDE */}
        <div className="flex items-center justify-center gap-4 py-4 bg-slate-900/20 rounded-2xl border border-white/5">
            <Wallet size={16} className="text-slate-500" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Solde Disponible: <span className="text-emerald-500">{user?.balance?.toLocaleString()} HTG</span></p>
        </div>
      </div>
    </main>
  );
}
