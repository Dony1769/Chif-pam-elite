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
      // 1. Déduction du solde
      const { error: rpcError } = await supabase.rpc('increment_balance', {
        user_id: user.id,
        amount: -betAmount
      });
      if (rpcError) throw new Error("Erreur de solde : " + rpcError.message);

      // 2. Insertion de la mise
      // J'ai réduit les colonnes au minimum vital pour tester la connexion
      const { error: miseError } = await supabase.from('mises').insert([{
        user_id: user.id,
        tirage_id: session.id,
        chiffre_choisi: String(selected),
        montant: betAmount,
        status: 'en_attente',
        multiplicateur_moment: session.multiplicateur || 10
      }]);

      if (miseError) {
        // DETAILED LOG POUR TOI (à voir dans la console F12)
        console.error("DETAILED ERROR:", miseError);
        
        // REMBOURSEMENT IMMÉDIAT
        await supabase.rpc('increment_balance', { user_id: user.id, amount: betAmount });
        throw new Error(`Erreur technique (${miseError.code}) : Mise remboursée.`);
      }

      // 3. Log transaction
      await supabase.from('transactions').insert([{
        user_id: user.id,
        amount: betAmount,
        type: 'mise',
        status: 'valide'
      }]);

      setSelected(null);
      setAmount('');
      init();
      alert("🎉 Billet validé !");

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsBetting(false);
    }
  };

  if (!session) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-center text-slate-500 font-black uppercase italic">
      <Zap size={48} className="mb-4 opacity-20" />
      <p>Aucun tirage ouvert</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#020617] p-4 pb-32 text-white">
      <div className="max-w-md mx-auto space-y-6">
        <div className="bg-slate-900 border border-white/5 p-6 rounded-[2rem] flex justify-between items-center">
            <h1 className="font-black italic uppercase">Rideau de Fumée</h1>
            <span className="text-emerald-500 font-black text-xs bg-emerald-500/10 px-3 py-1 rounded-lg">x{session.multiplicateur}</span>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {session.chiffres_visibles.map((num: string) => (
            <button
              key={num}
              disabled={userMises.includes(num) || isBetting}
              onClick={() => setSelected(num)}
              className={`h-12 rounded-xl font-black text-sm border transition-all ${
                userMises.includes(num) ? 'opacity-20 bg-slate-800' :
                selected === num ? 'bg-emerald-500 text-black border-emerald-400' : 'bg-slate-900 border-white/5'
              }`}
            >
              {num}
            </button>
          ))}
        </div>

        <div className="bg-slate-900 border border-white/5 p-6 rounded-[2.5rem] space-y-4">
           <div className="bg-black/40 p-4 rounded-2xl flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-500 uppercase">Mise</span>
              <span className="text-2xl font-black italic">{amount || '0'} <span className="text-xs">HTG</span></span>
           </div>
           <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0, '00', 'C'].map(btn => (
                <button
                  key={btn}
                  onClick={() => btn === 'C' ? setAmount('') : setAmount(prev => prev + btn)}
                  className="h-12 rounded-xl bg-slate-950 font-black border border-white/5 active:bg-emerald-500 transition-colors"
                >
                  {btn}
                </button>
              ))}
           </div>
           {error && <div className="text-rose-500 text-[9px] font-black uppercase flex items-center gap-2"><AlertCircle size={14}/> {error}</div>}
           <button
             disabled={!selected || !amount || isBetting}
             onClick={handleBet}
             className="w-full py-5 bg-emerald-500 text-black rounded-2xl font-black uppercase text-[10px] tracking-widest disabled:opacity-20"
           >
             {isBetting ? <Loader2 className="animate-spin mx-auto"/> : 'Confirmer le Billet'}
           </button>
        </div>
        
        <div className="text-center">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Solde: {user?.balance?.toLocaleString()} HTG</p>
        </div>
      </div>
    </main>
  );
}
