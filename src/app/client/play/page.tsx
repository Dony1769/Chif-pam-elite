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

  const fetchSession = async () => {
    const { data } = await supabase.from('tirages').select('*').eq('status', 'ouvert').maybeSingle();
    setSession(data || null);
    setLoading(false);
  };

  const fetchBalance = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
      if (data) setBalance(data.balance);
    }
  };

  useEffect(() => {
    fetchSession();
    fetchBalance();

    const channel = supabase.channel('client-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tirages' }, () => fetchSession())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchBalance())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const placerMise = async () => {
    const m = parseInt(montant);
    if (!selectedNumber || !session || isNaN(m) || m <= 0) return;
    if (balance < m) return alert("Solde insuffisant");

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Connectez-vous");

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
      alert("Mise enregistrée !");
      setMontant(""); setSelectedNumber(null); fetchBalance();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <main className="min-h-screen bg-[#020617] p-4 text-white pb-40 font-sans">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* TOP NAV */}
        <div className="flex justify-between items-center bg-slate-900/50 p-5 rounded-[2rem] border border-white/5 shadow-xl">
          <div className="flex items-center gap-3">
            <Wallet className="text-emerald-500" size={20} />
            <span className="font-black text-emerald-500">{balance.toLocaleString()} HTG</span>
          </div>
          {session && <div className="text-right text-[10px] font-black uppercase text-emerald-500 animate-pulse tracking-tighter">Session {session.moment}</div>}
        </div>

        {session ? (
          <>
            {/* RIDEAU DE FUMÉE (Les 10 cases) */}
            <div className="grid grid-cols-5 gap-3">
              {session.chiffres_visibles?.map((num: string) => (
                <button
                  key={num}
                  onClick={() => setSelectedNumber(num)}
                  className={`h-16 rounded-2xl font-black text-xl border transition-all ${selectedNumber === num ? 'bg-emerald-500 border-emerald-400 text-black shadow-lg shadow-emerald-500/20' : 'bg-slate-900 border-white/5'}`}
                >
                  {num}
                </button>
              ))}
            </div>

            {/* CALCULETTE */}
            <div className="bg-slate-900 p-8 rounded-[3rem] border border-white/5 shadow-inner">
              <div className="bg-black/40 p-5 rounded-2xl text-center mb-6 border border-white/5 shadow-inner">
                <span className="text-4xl font-black tracking-tighter">{montant || "0"}</span> <span className="text-emerald-500 text-xs font-black uppercase">HTG</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {["1","2","3","4","5","6","7","8","9","0"].map(d => (
                  <button key={d} onClick={() => setMontant(p => (p + d).slice(0, 6))} className="h-14 bg-slate-950 rounded-xl font-black text-lg border border-white/5 active:scale-90 transition-transform">{d}</button>
                ))}
                <button onClick={() => setMontant("")} className="h-14 bg-rose-500/10 text-rose-500 rounded-xl font-black col-span-2 flex items-center justify-center border border-rose-500/10"><Delete /></button>
              </div>
            </div>

            <button
              disabled={!selectedNumber || !montant || isSubmitting}
              onClick={placerMise}
              className="fixed bottom-8 left-8 right-8 max-w-md mx-auto py-6 bg-emerald-500 text-black rounded-[2rem] font-black uppercase tracking-widest shadow-2xl disabled:opacity-20 active:scale-95 transition-all"
            >
              {isSubmitting ? <Loader2 className="animate-spin mx-auto" /> : "Confirmer le billet"}
            </button>
          </>
        ) : (
          <div className="py-40 text-center opacity-20 italic flex flex-col items-center gap-4">
            <Zap size={64} />
            <p className="font-black uppercase tracking-[0.4em] text-xs">Attente d'ouverture...</p>
          </div>
        )}
      </div>
    </main>
  );
}
