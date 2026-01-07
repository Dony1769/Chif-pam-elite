"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Ticket, Zap, Wallet, Delete, X } from 'lucide-react';

export default function PlayZone() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [montant, setMontant] = useState(""); // String pour la calculette
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchUserData();
    fetchCurrentSession();

    const channel = supabase.channel('client-live')
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
      const { data, error } = await supabase.from('tirages').select('*').eq('status', 'ouvert').maybeSingle();
      if (error) throw error;
      setSession(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addDigit = (digit: string) => {
    if (montant.length < 6) setMontant(prev => prev + digit);
  };

  const clearMontant = () => setMontant("");

  const placerMise = async () => {
    const montantNum = parseInt(montant);
    if (!selectedNumber || !session || isNaN(montantNum) || montantNum <= 0) return;
    if (balance < montantNum) return alert("Solde insuffisant !");
    
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: miseError } = await supabase.from('mises').insert({
        user_id: user.id,
        tirage_id: session.id,
        chiffre_choisi: selectedNumber,
        montant: montantNum,
        multiplicateur_moment: session.multiplicateur,
        status: 'en_attente'
      });

      if (miseError) throw miseError;

      await supabase.rpc('increment_balance', { user_id: user.id, amount: -montantNum });
      
      alert("🎉 Billet validé avec succès !");
      setSelectedNumber(null);
      setMontant("");
    } catch (err: any) {
      alert("Erreur: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <main className="min-h-screen bg-[#020617] p-4 text-white pb-40">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* HEADER : BALANCE & SESSION */}
        <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-3xl border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <Wallet className="text-emerald-500" size={20} />
            </div>
            <div>
              <p className="text-[8px] font-black text-slate-500 uppercase">Mon Solde</p>
              <p className="text-sm font-black text-emerald-500">{balance.toLocaleString()} HTG</p>
            </div>
          </div>
          {session && (
            <div className="text-right">
              <p className="text-[8px] font-black text-slate-500 uppercase">Session {session.moment}</p>
              <p className="text-xs font-black text-white italic">Multiplier x{session.multiplicateur}</p>
            </div>
          )}
        </div>

        {session ? (
          <>
            {/* GRILLE RIDEAU DE FUMÉE (Les chiffres de la DB) */}
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase text-slate-500 text-center tracking-widest">Choisissez votre chiffre</p>
              <div className="grid grid-cols-5 gap-2">
                {session.chiffres_visibles.slice(0, 10).map((num: string) => (
                  <button
                    key={num}
                    onClick={() => setSelectedNumber(num)}
                    className={`h-14 rounded-xl font-black text-lg transition-all border ${
                      selectedNumber === num 
                      ? 'bg-emerald-500 border-emerald-400 text-slate-950 scale-95 shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                      : 'bg-slate-900 border-white/5 text-white'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* CALCULETTE DE MONTANT */}
            <div className="bg-slate-900/80 p-6 rounded-[2.5rem] border border-white/10 space-y-4">
              <div className="bg-black/40 p-4 rounded-2xl text-center border border-white/5">
                <p className="text-[8px] text-slate-500 font-black uppercase mb-1">Montant de la mise</p>
                <p className="text-3xl font-black text-white">{montant || "0"} <span className="text-sm text-emerald-500">HTG</span></p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((d) => (
                  <button key={d} onClick={() => addDigit(d)} className="h-12 bg-slate-950 rounded-xl font-black hover:bg-slate-800 border border-white/5 transition-colors">{d}</button>
                ))}
                <button onClick={clearMontant} className="h-12 bg-rose-500/10 text-rose-500 rounded-xl font-black border border-rose-500/20 flex items-center justify-center col-span-2"><Delete size={18}/></button>
              </div>
            </div>

            {/* BOUTON VALIDATION FIXE */}
            <div className="fixed bottom-6 left-6 right-6 max-w-md mx-auto">
              <button
                disabled={!selectedNumber || !montant || isSubmitting}
                onClick={placerMise}
                className="w-full py-5 bg-emerald-500 text-slate-950 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 disabled:opacity-20 shadow-2xl active:scale-95 transition-all"
              >
                {isSubmitting ? <Loader2 className="animate-spin" /> : <Ticket size={20} />}
                Valider mon billet
              </button>
            </div>
          </>
        ) : (
          <div className="py-20 text-center opacity-20">
            <Zap size={48} className="mx-auto mb-4" />
            <p className="font-black uppercase text-xs tracking-widest">En attente de session...</p>
          </div>
        )}
      </div>
    </main>
  );
}

