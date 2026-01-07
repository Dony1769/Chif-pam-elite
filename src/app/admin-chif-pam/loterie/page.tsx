"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Dices, Timer, Loader2, ShieldCheck, Zap, BarChart3 } from 'lucide-react';

export default function AdminLoterie() {
  const [currentTirage, setCurrentTirage] = useState<any>(null);
  const [multiplicateur, setMultiplicateur] = useState(10);
  const [loading, setLoading] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Récupération stable de la session ouverte
  const refreshStatus = useCallback(async () => {
    const { data, error } = await supabase
      .from('tirages')
      .select('*, mises(count)')
      .eq('status', 'ouvert')
      .maybeSingle();
    
    if (error) console.error("Erreur fetch:", error);
    setCurrentTirage(data);
    if (data) setMultiplicateur(data.multiplicateur);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshStatus();

    // Canal Realtime unique et robuste
    const channel = supabase.channel('admin_main_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tirages' }, () => refreshStatus())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mises' }, () => refreshStatus())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [refreshStatus]);

  const ouvrirSession = async (moment: string) => {
    if (currentTirage) return alert("Une session est déjà ouverte.");
    setIsCreating(true);

    try {
      const numGagnant = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      // Génération de 10 chiffres (9 faux + 1 gagnant)
      const pool = Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, '0'))
        .filter(n => n !== numGagnant)
        .sort(() => Math.random() - 0.5)
        .slice(0, 9);
      
      const grille = [...pool, numGagnant].sort(() => Math.random() - 0.5);

      const { error } = await supabase.from('tirages').insert({
        moment,
        chiffre_gagnant: numGagnant,
        chiffres_visibles: grille,
        multiplicateur,
        status: 'ouvert'
      });

      if (error) throw error;
    } catch (err: any) {
      alert("Erreur: " + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const executerCloture = async () => {
    if (!currentTirage || isClosing) return;
    if (!confirm(`Clôturer la session sur le chiffre ${currentTirage.chiffre_gagnant} ?`)) return;

    setIsClosing(true);
    try {
      // 1. Récupérer les mises gagnantes
      const { data: gagnants } = await supabase.from('mises')
        .select('*')
        .eq('tirage_id', currentTirage.id)
        .eq('chiffre_choisi', currentTirage.chiffre_gagnant)
        .eq('status', 'en_attente');

      // 2. Créditer les comptes via RPC
      if (gagnants && gagnants.length > 0) {
        for (const m of gagnants) {
          const gain = m.montant * (m.multiplicateur_moment || currentTirage.multiplicateur);
          await supabase.rpc('increment_balance', { user_id: m.user_id, amount: gain });
          await supabase.from('mises').update({ status: 'gagné', gain_reel: gain }).eq('id', m.id);
          await supabase.from('transactions').insert({
            user_id: m.user_id, amount: gain, type: 'gain', status: 'valide', admin_note: `Tirage ${currentTirage.moment}`
          });
        }
      }

      // 3. Clôturer le reste
      await supabase.from('mises').update({ status: 'perdu' }).eq('tirage_id', currentTirage.id).eq('status', 'en_attente');
      await supabase.from('tirages').update({ status: 'termine' }).eq('id', currentTirage.id);
      
      setCurrentTirage(null);
    } catch (err: any) {
      alert("Erreur: " + err.message);
    } finally {
      setIsClosing(false);
    }
  };

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-emerald-500"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#020617] p-4 text-white font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex justify-between items-center bg-slate-900/40 p-6 rounded-[2rem] border border-white/5 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500 rounded-2xl"><Zap className="text-black" /></div>
            <h1 className="text-xl font-black italic">LOTTO ADMIN</h1>
          </div>
          <div className="bg-black/50 px-4 py-2 rounded-xl border border-white/10 text-center">
            <p className="text-[8px] uppercase text-slate-500 font-bold">Ratio</p>
            <input type="number" value={multiplicateur} onChange={(e) => setMultiplicateur(Number(e.target.value))} className="bg-transparent text-emerald-500 font-black w-12 outline-none text-center" />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* SESSIONS */}
          <div className="space-y-3 bg-slate-900/40 p-4 rounded-[2rem] border border-white/5">
            {['Matin', 'Midi', 'Après-Midi', 'Soir'].map((m) => (
              <button key={m} onClick={() => ouvrirSession(m)} disabled={!!currentTirage} className="w-full py-4 bg-slate-950 rounded-xl font-black text-[10px] uppercase tracking-widest border border-white/5 hover:bg-emerald-500 hover:text-black transition-all disabled:opacity-20">
                {m}
              </button>
            ))}
          </div>

          {/* MONITORING */}
          <div className="md:col-span-2 bg-slate-900 p-8 rounded-[2.5rem] border border-emerald-500/10 flex flex-col items-center justify-center min-h-[350px]">
            {currentTirage ? (
              <div className="w-full text-center space-y-6">
                <span className="bg-emerald-500/10 text-emerald-500 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter animate-pulse">Session {currentTirage.moment} Active</span>
                <h2 className="text-9xl font-black italic text-white">{currentTirage.chiffre_gagnant}</h2>
                <button onClick={executerCloture} disabled={isClosing} className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3">
                  {isClosing ? <Loader2 className="animate-spin" /> : <ShieldCheck />} CLÔTURER & PAYER
                </button>
              </div>
            ) : (
              <div className="opacity-20 flex flex-col items-center"><Dices size={64} /><p className="font-black text-[10px] uppercase mt-4">Aucun tirage</p></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
