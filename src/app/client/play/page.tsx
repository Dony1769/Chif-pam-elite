"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Ticket, Wallet, Zap, Delete } from 'lucide-react';

export default function PlayZone() {
  const [session, setSession] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [montant, setMontant] = useState("");
  const [selectedNum, setSelectedNum] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    init();
    const channel = supabase.channel('global_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tirages' }, () => fetchSession())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchBalance())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const init = async () => {
    await Promise.all([fetchSession(), fetchBalance()]);
    setLoading(false);
  };

  const fetchSession = async () => {
    const { data } = await supabase.from('tirages').select('*').eq('status', 'ouvert').maybeSingle();
    setSession(data);
  };

  const fetchBalance = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
      setBalance(data?.balance || 0);
    }
  };

  const placerMise = async () => {
    const m = parseInt(montant);
    if (!selectedNum || isNaN(m) || m <= 0 || m > balance) return;
    setIsSubmitting(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('mises').insert({
      user_id: user.id,
      tirage_id: session.id,
      chiffre_choisi: selectedNum,
      montant: m,
      multiplicateur_moment: session.multiplicateur,
      status: 'en_attente'
    });

    if (!error) {
      await supabase.rpc('increment_balance', { user_id: user.id, amount: -m });
      setMontant("");
      setSelectedNum(null);
      alert("Billet validé !");
    }
    setIsSubmitting(false);
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <main className="min-h-screen bg-[#020617] p-4 text-white pb-40">
      <div className="max-w-md mx-auto space-y-6">
        <div className="bg-slate-900/50 p-5 rounded-[2rem] border border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-2"><Wallet className="text-emerald-500" size={18}/><span className="font-black text-sm">{balance.toLocaleString()} HTG</span></div>
          {session && <div className="text-[10px] font-black uppercase text-emerald-400 animate-pulse">{session.moment} LIVE</div>}
        </div>

        {session ? (
          <>
            <div className="grid grid-cols-5 gap-2">
              {session.chiffres_visibles.map((n: string) => (
                <button key={n} onClick={() => setSelectedNum(n)} className={`h-14 rounded-xl font-black border transition-all ${selectedNum === n ? 'bg-emerald-500 border-emerald-400 text-black' : 'bg-slate-900 border-white/5'}`}>{n}</button>
              ))}
            </div>

            <div className="bg-slate-900 p-6 rounded-[2.5rem] border border-white/5 space-y-4">
              <div className="bg-black/40 p-4 rounded-xl text-center border border-white/5 font-black text-2xl">{montant || "0"} <span className="text-xs text-emerald-500 uppercase">HTG</span></div>
              <div className="grid grid-cols-3 gap-2">
                {["1","2","3","4","5","6","7","8","9","0"].map(d => (
                  <button key={d} onClick={() => montant.length < 6 && setMontant(p => p+d)} className="h-12 bg-slate-950 rounded-xl font-bold border border-white/5">{d}</button>
                ))}
                <button onClick={() => setMontant("")} className="h-12 bg-rose-500/10 text-rose-500 rounded-xl font-bold col-span-2 flex items-center justify-center"><Delete size={18}/></button>
              </div>
            </div>

            <div className="fixed bottom-6 left-6 right-6 max-w-md mx-auto">
              <button disabled={!selectedNum || !montant || isSubmitting} onClick={placerMise} className="w-full py-5 bg-emerald-500 text-black rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl disabled:opacity-10 transition-all">
                {isSubmitting ? <Loader2 className="animate-spin" /> : "Placer mon billet"}
              </button>
            </div>
          </>
        ) : (
          <div className="py-20 text-center opacity-20"><Zap size={48} className="mx-auto mb-4"/><p className="font-black uppercase text-[10px] tracking-widest">En attente de session...</p></div>
        )}
      </div>
    </main>
  );
}

