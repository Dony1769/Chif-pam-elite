// Emplacement : /app/client/play/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Ticket, Zap, Wallet, Delete } from 'lucide-react';

export default function PlayZone() {
  const [session, setSession] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [montant, setMontant] = useState("");
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchUserData();
    fetchCurrentSession();

    // LE LIEN CRUCIAL : Récupérer les changements en direct
    const channel = supabase.channel('sync-client')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tirages' }, () => fetchCurrentSession())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchUserData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
      if (data) setBalance(data.balance);
    }
  };

  const fetchCurrentSession = async () => {
    try {
      const { data, error } = await supabase
        .from('tirages')
        .select('*')
        .eq('status', 'ouvert')
        .maybeSingle();
      
      if (error) throw error;
      setSession(data); // Si l'admin a ouvert, data contient la grille et le moment
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addDigit = (d: string) => { if (montant.length < 6) setMontant(prev => prev + d); };

  const placerMise = async () => {
    const m = parseInt(montant);
    if (!selectedNumber || !session || isNaN(m) || m <= 0) return;
    if (balance < m) return alert("Solde insuffisant !");
    
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
      
      alert("Ticket validé !");
      setMontant("");
      setSelectedNumber(null);
      fetchUserData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center text-emerald-500"><Loader2 className="animate-spin" /></div>;

  return (
    <main className="min-h-screen bg-[#020617] p-4 text-white pb-40">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* SOLDE BANNIÈRE */}
        <div className="bg-slate-900/50 p-5 rounded-[2rem] border border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Wallet className="text-emerald-500" />
            <span className="font-black">{balance.toLocaleString()} HTG</span>
          </div>
          {session && <span className="text-[10px] font-black uppercase text-emerald-500 animate-pulse">Session {session.moment}</span>}
        </div>

        {session ? (
          <>
            {/* RIDEAU DE FUMÉE (10 cases) */}
            <div className="grid grid-cols-5 gap-2">
              {session.chiffres_visibles?.map((n: string) => (
                <button 
                  key={n} 
                  onClick={() => setSelectedNumber(n)}
                  className={`h-14 rounded-xl font-black border transition-all ${selectedNumber === n ? 'bg-emerald-500 text-black border-emerald-400' : 'bg-slate-900 border-white/5'}`}
                >
                  {n}
                </button>
              ))}
            </div>

            {/* CALCULETTE */}
            <div className="bg-slate-900 p-6 rounded-[2.5rem] border border-white/5">
              <div className="bg-black/40 p-4 rounded-xl text-center mb-4 border border-white/5">
                <span className="text-2xl font-black">{montant || "0"}</span> <span className="text-emerald-500 text-xs font-bold">HTG</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {["1","2","3","4","5","6","7","8","9","0"].map(d => (
                  <button key={d} onClick={() => addDigit(d)} className="h-12 bg-slate-950 rounded-xl font-bold hover:bg-emerald-500/10">{d}</button>
                ))}
                <button onClick={() => setMontant("")} className="h-12 bg-rose-500/10 text-rose-500 rounded-xl font-bold col-span-2 flex items-center justify-center"><Delete size={18}/></button>
              </div>
            </div>

            {/* VALIDATION */}
            <div className="fixed bottom-6 left-6 right-6 max-w-md mx-auto">
              <button 
                disabled={!selectedNumber || !montant || isSubmitting}
                onClick={placerMise}
                className="w-full py-5 bg-emerald-500 text-black rounded-2xl font-black uppercase tracking-widest shadow-2xl disabled:opacity-20 transition-all"
              >
                {isSubmitting ? <Loader2 className="animate-spin" /> : "Confirmer le billet"}
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-40 opacity-20">
            <Zap size={64} className="mb-4" />
            <p className="font-black uppercase tracking-widest text-xs italic">En attente d'une session...</p>
          </div>
        )}
      </div>
    </main>
  );
}

