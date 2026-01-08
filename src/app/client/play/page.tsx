// /app/client/play/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Wallet, Zap, Loader2, Ticket } from 'lucide-react';

export default function PlayZone() {
  const [session, setSession] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [montant, setMontant] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    // 1. Charger la session ouverte
    const { data: tirage } = await supabase.from('tirages').select('*').eq('status', 'ouvert').maybeSingle();
    setSession(tirage);
    // 2. Charger le solde (balance)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: prof } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
      if (prof) setBalance(prof.balance);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('sync-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tirages' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const validerMise = async () => {
    const m = parseInt(montant);
    if (!selected || !m || m > balance) return alert("Vérifiez votre chiffre, montant ou solde !");
    
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // Insérer la mise
      await supabase.from('mises').insert({
        user_id: user?.id, tirage_id: session.id, chiffre_choisi: selected,
        montant: m, multiplicateur_moment: session.multiplicateur
      });
      // Débiter le solde (balance)
      await supabase.rpc('increment_balance', { user_id: user?.id, amount: -m });
      
      alert("Ticket validé avec succès !");
      setMontant(""); setSelected(null);
    } catch (e) {
      alert("Erreur de connexion");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center text-emerald-500 font-black italic tracking-widest">CHIF PAM...</div>;

  return (
    <main className="min-h-screen bg-[#020617] p-6 text-white font-black italic uppercase">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* HEADER BALANCE */}
        <div className="flex justify-between items-center bg-slate-900/50 p-6 rounded-[2rem] border border-white/5">
          <div className="flex items-center gap-3">
            <Wallet className="text-emerald-500" />
            <span className="text-xl tracking-tighter">{balance.toLocaleString()} <span className="text-[10px] opacity-50">HTG</span></span>
          </div>
          {session && <div className="text-emerald-500 text-[8px] animate-pulse">Session {session.moment}</div>}
        </div>

        {session ? (
          <>
            {/* GRILLE RIDEAU DE FUMÉE */}
            <div className="grid grid-cols-5 gap-3">
              {session.chiffres_visibles?.map((n: string) => (
                <button key={n} onClick={() => setSelected(n)} className={`h-14 rounded-2xl border transition-all text-xl ${selected === n ? 'bg-emerald-500 text-black border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'bg-slate-900 border-white/5'}`}>
                  {n}
                </button>
              ))}
            </div>

            {/* CALCULETTE */}
            <div className="bg-slate-900 p-6 rounded-[2.5rem] border border-white/5 space-y-4">
              <div className="bg-black/50 p-4 rounded-xl text-center text-3xl text-emerald-500 border border-white/5">
                {montant || "0"}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {["1","2","3","4","5","6","7","8","9","C","0","X"].map(k => (
                  <button key={k} onClick={() => {
                    if(k === "C") setMontant("");
                    else if(k === "X") setMontant(p => p.slice(0, -1));
                    else if(montant.length < 6) setMontant(p => p + k);
                  }} className="h-12 bg-slate-950 rounded-xl border border-white/5 hover:bg-slate-800 transition-colors">
                    {k}
                  </button>
                ))}
              </div>
            </div>

            <button disabled={!selected || !montant || isSubmitting} onClick={validerMise} className="w-full py-6 bg-emerald-500 text-black rounded-3xl shadow-2xl disabled:opacity-20 active:scale-95 transition-all flex items-center justify-center gap-3">
              {isSubmitting ? <Loader2 className="animate-spin" /> : <Ticket size={20} />}
              VALIDER LE BILLET
            </button>
          </>
        ) : (
          <div className="py-40 text-center opacity-20 space-y-4">
            <Zap size={64} className="mx-auto" />
            <p className="text-xs tracking-[0.5em]">Aucune session en cours...</p>
          </div>
        )}
      </div>
    </main>
  );
}
