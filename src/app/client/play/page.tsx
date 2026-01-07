"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Ticket, Wallet, Zap, Delete } from 'lucide-react';

export default function PlayZone() {
  const [session, setSession] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [montant, setMontant] = useState("");
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fonction de récupération
  const loadData = async () => {
    // 1. Session active
    const { data: tirage } = await supabase.from('tirages').select('*').eq('status', 'ouvert').maybeSingle();
    setSession(tirage);

    // 2. Solde
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: prof } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
      if (prof) setBalance(prof.balance);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();

    // ECOUTE REALTIME : C'est ici que la magie opère
    const channel = supabase.channel('lotto_client_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tirages' }, (payload) => {
        console.log("Mise à jour session reçue:", payload);
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => loadData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const placerMise = async () => {
    const m = parseInt(montant);
    if (!selectedNumber || !session || isNaN(m) || m < 10) return;
    if (balance < m) return alert("Solde insuffisant");

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('mises').insert({
        user_id: user.id,
        tirage_id: session.id,
        chiffre_choisi: selectedNumber,
        montant: m,
        multiplicateur_moment: session.multiplicateur,
        status: 'en_attente'
      });

      if (error) throw error;
      await supabase.rpc('increment_balance', { user_id: user.id, amount: -m });
      
      alert("Ticket confirmé !");
      setMontant("");
      setSelectedNumber(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <main className="min-h-screen bg-[#020617] p-4 text-white pb-32">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* TOP BAR */}
        <div className="flex justify-between items-center bg-slate-900/50 p-5 rounded-[2rem] border border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg"><Wallet className="text-emerald-500" size={18} /></div>
            <span className="font-black text-sm">{balance.toLocaleString()} HTG</span>
          </div>
          {session && <div className="text-right"><p className="text-[8px] text-slate-500 font-bold uppercase">Multi x{session.multiplicateur}</p><p className="text-[10px] font-black italic">{session.moment}</p></div>}
        </div>

        {session ? (
          <>
            {/* GRILLE DYNAMIQUE */}
            <div className="grid grid-cols-5 gap-2">
              {session.chiffres_visibles?.map((n: string) => (
                <button key={n} onClick={() => setSelectedNumber(n)} className={`h-14 rounded-xl font-black border transition-all ${selectedNumber === n ? 'bg-emerald-500 text-black border-emerald-400' : 'bg-slate-900 border-white/5 text-slate-400'}`}>
                  {n}
                </button>
              ))}
            </div>

            {/* CALCULETTE */}
            <div className="bg-slate-900/80 p-6 rounded-[2.5rem] border border-white/5 space-y-4 shadow-2xl">
              <div className="bg-black/50 p-4 rounded-2xl text-center border border-white/5">
                <span className="text-2xl font-black text-white">{montant || "0"}</span> <span className="text-emerald-500 text-xs font-bold uppercase">HTG</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {["1","2","3","4","5","6","7","8","9","0"].map(d => (
                  <button key={d} onClick={() => setMontant(p => (p.length < 5 ? p + d : p))} className="h-12 bg-slate-950 rounded-xl font-bold hover:bg-slate-800 transition-colors border border-white/5">{d}</button>
                ))}
                <button onClick={() => setMontant("")} className="h-12 bg-rose-500/10 text-rose-500 rounded-xl font-bold col-span-2 flex items-center justify-center border border-rose-500/20"><Delete size={18}/></button>
              </div>
            </div>

            {/* ACTION */}
            <div className="fixed bottom-6 left-6 right-6 max-w-md mx-auto">
              <button disabled={!selectedNumber || !montant || isSubmitting} onClick={placerMise} className="w-full py-5 bg-emerald-500 text-black rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl disabled:opacity-20 flex items-center justify-center gap-3 active:scale-95 transition-all">
                {isSubmitting ? <Loader2 className="animate-spin" /> : <Ticket size={18} />} VALIDER MON BILLET
              </button>
            </div>
          </>
        ) : (
          <div className="py-32 text-center opacity-20"><Zap size={48} className="mx-auto mb-4" /><p className="font-black uppercase text-[10px] tracking-widest">En attente de session...</p></div>
        )}
      </div>
    </main>
  );
}
