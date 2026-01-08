// /app/client/play/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Wallet, Zap, Loader2 } from 'lucide-react';

export default function PlayZone() {
  const [session, setSession] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [montant, setMontant] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    // 1. Session
    const { data: tirage } = await supabase.from('tirages').select('*').eq('status', 'ouvert').maybeSingle();
    setSession(tirage);
    // 2. Solde
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
      if (data) setBalance(data.balance);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const sub = supabase.channel('client-sync').on('postgres_changes', { event: '*', schema: 'public', table: 'tirages' }, () => loadData()).on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => loadData()).subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  const miser = async () => {
    const val = parseInt(montant);
    if (!selected || !val || val > balance) return alert("Erreur mise/solde");
    
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('mises').insert({
      user_id: user?.id, tirage_id: session.id, chiffre_choisi: selected,
      montant: val, multiplicateur_moment: session.multiplicateur
    });
    await supabase.rpc('increment_balance', { user_id: user?.id, amount: -val });
    
    alert("Billet validé !");
    setMontant(""); setSelected(null);
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-black italic">CHIF PAM...</div>;

  return (
    <main className="min-h-screen bg-[#020617] p-6 text-white font-black italic uppercase">
      <div className="max-w-md mx-auto space-y-6">
        
        <div className="flex justify-between items-center bg-slate-900/50 p-5 rounded-3xl border border-white/5">
          <div className="flex items-center gap-2"><Wallet className="text-emerald-500" /> {balance} HTG</div>
          {session && <div className="text-emerald-500 text-[10px]">{session.moment}</div>}
        </div>

        {session ? (
          <>
            <div className="grid grid-cols-5 gap-2">
              {session.chiffres_visibles?.map((n: string) => (
                <button key={n} onClick={() => setSelected(n)} className={`h-12 rounded-xl border ${selected === n ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-slate-900 border-white/5'}`}>
                  {n}
                </button>
              ))}
            </div>

            <div className="bg-slate-900 p-6 rounded-[2.5rem] border border-white/5 space-y-4">
              <div className="bg-black text-center p-4 rounded-xl text-2xl text-emerald-500">{montant || "0"}</div>
              <div className="grid grid-cols-3 gap-2">
                {["1","2","3","4","5","6","7","8","9","C","0","X"].map(k => (
                  <button key={k} onClick={() => {
                    if(k === "C") setMontant(""); 
                    else if(k === "X") setMontant(m => m.slice(0, -1));
                    else if(montant.length < 5) setMontant(m => m + k);
                  }} className="h-12 bg-slate-950 rounded-xl border border-white/5">{k}</button>
                ))}
              </div>
            </div>

            <button onClick={miser} disabled={!selected || !montant} className="w-full py-5 bg-emerald-500 text-black rounded-2xl shadow-[0_10px_30px_rgba(16,185,129,0.3)]">Confirmer</button>
          </>
        ) : (
          <div className="py-40 text-center opacity-20"><Zap className="mx-auto mb-4" /> Attente session...</div>
        )}
      </div>
    </main>
  );
}
