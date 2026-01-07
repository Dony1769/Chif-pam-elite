"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Zap, Loader2, CheckCircle2, AlertTriangle, Wallet } from 'lucide-react';

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
    if (!selected || !amount || Number(amount) <= 0) return;
    if (Number(amount) > user.balance) {
      setError("Solde insuffisant");
      return;
    }

    setIsBetting(true);
    setError(null);

    try {
      // 1. DÉDUCTION DU SOLDE
      const { error: rpcError } = await supabase.rpc('increment_balance', {
        user_id: user.id,
        amount: -Number(amount)
      });

      if (rpcError) throw new Error("Erreur de solde : " + rpcError.message);

      // 2. INSERTION DE LA MISE
      const { error: miseError } = await supabase.from('mises').insert([{
        user_id: user.id,
        tirage_id: session.id,
        chiffre_choisi: selected,
        montant: Number(amount),
        status: 'en_attente',
        multiplicateur_moment: session.multiplicateur || 10
      }]);

      if (miseError) {
        console.error("DEBUG MISE ERROR:", miseError); // Important pour le diagnostic
        // REMBOURSEMENT SI ÉCHEC INSERTION
        await supabase.rpc('increment_balance', { user_id: user.id, amount: Number(amount) });
        throw new Error("Erreur technique : Mise remboursée. (Vérifiez la table mises)");
      }

      // 3. LOG TRANSACTION POUR L'HISTORIQUE
      await supabase.from('transactions').insert([{
        user_id: user.id,
        amount: Number(amount),
        type: 'mise',
        status: 'valide',
        admin_note: `Billet #${selected} pour session ${session.moment}`
      }]);

      // FINALE
      setSelected(null);
      setAmount('');
      alert("Félicitations ! Billet validé.");
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
      <h2 className="text-white font-black uppercase italic">Aucun tirage en cours</h2>
      <p className="text-slate-500 text-[10px] mt-2 uppercase tracking-[0.3em]">Attendez le lancement par l'admin</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#020617] p-4 pb-32 text-white">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* CARTE SESSION */}
        <div className="bg-slate-900/80 border border-white/5 p-6 rounded-[2.5rem] flex justify-between items-center backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                <Zap size={24} />
            </div>
            <div>
                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Session {session.moment}</p>
                <h1 className="text-lg font-black uppercase italic">En Direct</h1>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold text-slate-500 uppercase">Cote</p>
            <p className="text-xl font-black text-white">x{session.multiplicateur}</p>
          </div>
        </div>

        {/* GRILLE */}
        <div className="grid grid-cols-5 gap-2">
          {session.chiffres_visibles.map((num: string) => {
            const hasBet = userMises.includes(num);
            const isSelected = selected === num;
            return (
              <button
                key={num}
                disabled={hasBet || isBetting}
                onClick={() => setSelected(num)}
                className={`h-14 rounded-xl font-black text-sm transition-all border ${
                  hasBet ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500/40' :
                  isSelected ? 'bg-emerald-500 border-emerald-400 text-slate-950 scale-105 shadow-lg shadow-emerald-500/20' :
                  'bg-slate-900 border-white/5 text-slate-400 hover:border-white/20'
                }`}
              >
                {num}
              </button>
            );
          })}
        </div>

        {/* CLAVIER DE MISE */}
        <div className="bg-slate-900 border border-white/5 p-8 rounded-[2.5rem] space-y-6">
           <div className="flex justify-between items-center bg-black/30 p-4 rounded-2xl border border-white/5">
              <span className="text-[10px] font-black uppercase text-slate-500">Mise HTG</span>
              <span className="text-2xl font-black italic text-emerald-500">{amount || '0'}</span>
           </div>

           <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0, '00', 'C'].map(btn => (
                <button
                  key={btn}
                  onClick={() => btn === 'C' ? setAmount('') : setAmount(prev => (prev.length < 6 ? prev + btn : prev))}
                  className="h-12 rounded-xl bg-slate-950 text-white font-black border border-white/5 active:bg-emerald-500 active:text-black transition-colors"
                >
                  {btn}
                </button>
              ))}
           </div>

           {error && (
             <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-500 text-[9px] font-black uppercase italic">
               <AlertTriangle size={16} /> {error}
             </div>
           )}

           <button
             disabled={!selected || !amount || isBetting}
             onClick={handleBet}
             className="w-full py-5 bg-emerald-500 text-slate-950 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-20 transition-all flex items-center justify-center gap-2"
           >
             {isBetting ? <Loader2 className="animate-spin" /> : 'Valider le Billet'}
           </button>
        </div>

        <div className="flex items-center justify-center gap-4 text-slate-500 bg-slate-900/30 py-4 rounded-2xl border border-white/5">
            <Wallet size={16} className="text-emerald-500" />
            <p className="text-[10px] font-black uppercase tracking-widest">Solde actuel: <span className="text-white">{user?.balance?.toLocaleString()} HTG</span></p>
        </div>
      </div>
    </main>
  );
}
