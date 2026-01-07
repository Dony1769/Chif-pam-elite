// /app/client/play/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Ticket, Wallet, Zap } from 'lucide-react';

export default function PlayZone() {
  const [session, setSession] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [montant, setMontant] = useState("");
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const syncAll = async () => {
    // 1. Charger Session
    const { data: tirage } = await supabase.from('tirages').select('*').eq('status', 'ouvert').maybeSingle();
    setSession(tirage);
    // 2. Charger Balance
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: prof } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
      if (prof) setBalance(prof.balance);
    }
    setLoading(false);
  };

  useEffect(() => {
    syncAll();
    const channel = supabase.channel('playzone-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tirages' }, () => syncAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => syncAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const validerMise = async () => {
    const m = parseInt(montant);
    if (!selectedNumber || !m || m > balance) return alert("Vérifiez votre mise ou solde");
    
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // On insère la mise
      await supabase.from('mises').insert({
        user_id: user?.id, tirage_id: session.id, chiffre_choisi: selectedNumber,
        montant: m, multiplicateur_moment: session.multiplicateur
      });
      // On débite le solde
      await supabase.rpc('increment_balance', { user_id: user?.id, amount: -m });
      
      alert("Mise acceptée !");
      setMontant("");
      setSelectedNumber(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <main className="min-h-screen bg-[#020617] p-6 text-white pb-40">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* BANDEAU SOLDE */}
        <div className="flex justify-between items-center bg-slate-900/50 p-5 rounded-[2rem] border border-white/5">
          <div className="flex items-center gap-3">
            <Wallet className="text-emerald-500" size={20} />
            <span className="font-black text-lg">{balance.toLocaleString()} HTG</span>
          </div>
          {session && <div className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[8px] font-black uppercase">Session {session.moment}</div>}
        </div>

        {session ? (
          <>
            {/* GRILLE RIDEAU DE FUMÉE */}
            <div className="grid grid-cols-5 gap-3">
              {session.chiffres_visibles?.map((num: string) => (
                <button key={num} onClick={() => setSelectedNumber(num)} className={`h-14 rounded-2xl font-black text-lg border transition-all ${selectedNumber === num ? 'bg-emerald-500 text-black border-emerald-400' : 'bg-slate-900 border-white/5'}`}>
                  {num}
                </button>
              ))}
            </div>

            {/* CLAVIER MONTANT */}
            <div className="bg-slate-900 p-6 rounded-[2.5rem] border border-white/5 space-y-4">
              <div className="bg-black/40 p-4 rounded-2xl text-center text-2xl font-black">
                {montant || "0"} <span className="text-emerald-500 text-xs uppercase">HTG</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {["1","2","3","4","5","6","7","8","9","C","0","X"].map(key => (
                  <button key={key} onClick={() => {
                    if (key === "C") setMontant("");
                    else if (key === "X") setMontant(prev => prev.slice(0, -1));
                    else if (montant.length < 6) setMontant(prev => prev + key);
                  }} className="h-12 bg-slate-950 rounded-xl font-bold border border-white/5 hover:bg-slate-800">
                    {key}
                  </button>
                ))}
              </div>
            </div>

            <button disabled={!selectedNumber || !montant || isSubmitting} onClick={validerMise} className="fixed bottom-6 left-6 right-6 max-w-md mx-auto py-5 bg-emerald-500 text-black rounded-2xl font-black uppercase tracking-widest shadow-2xl disabled:opacity-20 active:scale-95 transition-all">
              {isSubmitting ? <Loader2 className="animate-spin" /> : "Confirmer le billet"}
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-40 opacity-20 space-y-4">
            <Zap size={48} />
            <p className="font-black uppercase tracking-widest text-xs italic">En attente d'ouverture par l'Admin...</p>
          </div>
        )}
      </div>
    </main>
  );
}
