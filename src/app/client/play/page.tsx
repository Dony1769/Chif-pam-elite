"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Zap, Loader2, AlertCircle, Wallet } from 'lucide-react';

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
    const channel = supabase.channel('tirage-live').on('postgres_changes', { event: '*', schema: 'public', table: 'tirages' }, () => init()).subscribe();
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
      const { data: past } = await supabase.from('mises').select('chiffre_choisi').eq('tirage_id', tirage.id).eq('user_id', authUser.id);
      setUserMises(past?.map(m => m.chiffre_choisi) || []);
    }
  };

  const handleBet = async () => {
    const betAmt = Number(amount);
    if (!selected || betAmt <= 0 || !session) return;
    if (userMises.includes(selected)) return setError("Déjà joué");
    if (betAmt > (user?.balance || 0)) return setError("Solde insuffisant");

    setIsBetting(true);
    setError(null);

    try {
      // 1. DEBIT
      const { error: dError } = await supabase.rpc('increment_balance', { user_id: user.id, amount: -betAmt });
      if (dError) throw new Error(`ERREUR SOLDE: ${dError.message}`);

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
        // REMBOURSEMENT SI CA BLOQUE
        await supabase.rpc('increment_balance', { user_id: user.id, amount: betAmt });
        // ON AFFICHE LE CODE D'ERREUR PRECIS ICI
        throw new Error(`DB_ERROR: ${mError.code} - ${mError.message}`);
      }

      // 3. TRANSACTION
      await supabase.from('transactions').insert({
        user_id: user.id,
        amount: betAmt,
        type: 'mise',
        status: 'valide'
      });

      alert("✅ Billet validé !");
      setSelected(null);
      setAmount('');
      init();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsBetting(false);
    }
  };

  if (!session) return <div className="min-h-screen bg-[#020617] flex items-center justify-center text-slate-600 font-black uppercase italic">Attente Tirage...</div>;

  return (
    <main className="min-h-screen bg-[#020617] p-6 text-white font-sans">
      <div className="max-w-md mx-auto space-y-6">
        <div className="bg-slate-900 p-6 rounded-3xl border border-white/5 flex justify-between items-center">
          <h1 className="font-black italic text-xl uppercase tracking-tighter">CHIF<span className="text-emerald-500">PAM</span></h1>
          <div className="text-right">
            <p className="text-[8px] text-slate-500 font-black uppercase">Solde</p>
            <p className="text-emerald-400 font-black italic">{user?.balance} HTG</p>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {session.chiffres_visibles.map((n: string) => (
            <button
              key={n}
              disabled={userMises.includes(n) || isBetting}
              onClick={() => setSelected(n)}
              className={`h-12 rounded-xl font-black text-xs border transition-all ${
                userMises.includes(n) ? 'opacity-10 bg-black' :
                selected === n ? 'bg-emerald-500 text-slate-950 border-emerald-400 scale-110 shadow-lg' : 'bg-slate-900 border-white/5'
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-white/5 space-y-6">
          <div className="bg-black/40 p-5 rounded-2xl text-center border border-white/5">
            <p className="text-3xl font-black italic text-emerald-500">{amount || '0'} <span className="text-xs text-white">HTG</span></p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[1,2,3,4,5,6,7,8,9,0,'00','C'].map(b => (
              <button key={b} onClick={() => b === 'C' ? setAmount('') : setAmount(a => a + b)} className="h-12 bg-slate-950 rounded-xl font-black border border-white/5 active:bg-emerald-500">{b}</button>
            ))}
          </div>

          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 font-mono text-[9px] break-all">
              <AlertCircle className="inline mr-2" size={12} />
              {error}
            </div>
          )}

          <button
            disabled={!selected || !amount || isBetting}
            onClick={handleBet}
            className="w-full py-6 bg-emerald-500 text-slate-950 rounded-3xl font-black uppercase text-[11px] tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-20"
          >
            {isBetting ? <Loader2 className="animate-spin mx-auto" /> : "Confirmer le billet"}
          </button>
        </div>
      </div>
    </main>
  );
}
