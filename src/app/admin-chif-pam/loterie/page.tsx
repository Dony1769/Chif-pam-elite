// /app/admin-chif-pam/loterie/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, ShieldCheck, Zap, Dices } from 'lucide-react';

export default function AdminLoterie() {
  const [currentTirage, setCurrentTirage] = useState<any>(null);
  const [multiplicateur, setMultiplicateur] = useState(10);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fonction pour charger la session
  const refreshSession = async () => {
    const { data } = await supabase.from('tirages').select('*').eq('status', 'ouvert').maybeSingle();
    setCurrentTirage(data);
    if (data) setMultiplicateur(data.multiplicateur);
    setLoading(false);
  };

  useEffect(() => {
    refreshSession();
    // Realtime pour voir les mises arriver et les changements de session
    const sub = supabase.channel('admin-room').on('postgres_changes', { event: '*', schema: 'public', table: 'tirages' }, () => refreshSession()).subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  const ouvrirSession = async (moment: string) => {
    if (currentTirage) return alert("Fermez d'abord la session en cours !");
    setIsProcessing(true);
    
    const gagnant = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    // On crée la grille de 10 chiffres (Rideau de fumée)
    const autres = Array.from({ length: 9 }, () => Math.floor(Math.random() * 100).toString().padStart(2, '0'));
    const grille = [...autres, gagnant].sort(() => Math.random() - 0.5);

    const { error } = await supabase.from('tirages').insert({
      moment,
      chiffre_gagnant: gagnant,
      chiffres_visibles: grille,
      multiplicateur: multiplicateur,
      status: 'ouvert'
    });

    if (error) alert(error.message);
    setIsProcessing(false);
  };

  const payerEtCloturer = async () => {
    if (!currentTirage || isProcessing) return;
    if (!confirm(`Payer les gagnants du chiffre ${currentTirage.chiffre_gagnant} ?`)) return;

    setIsProcessing(true);
    try {
      // 1. On récupère les mises du tirage
      const { data: mises } = await supabase.from('mises').select('*').eq('tirage_id', currentTirage.id).eq('status', 'en_attente');

      if (mises) {
        for (const mise of mises) {
          const estGagne = mise.chiffre_choisi === currentTirage.chiffre_gagnant;
          const gain = estGagne ? (mise.montant * (mise.multiplicateur_moment || currentTirage.multiplicateur)) : 0;

          // Mise à jour de la mise (gagné/perdu)
          await supabase.from('mises').update({ status: estGagne ? 'gagné' : 'perdu', gain_reel: gain }).eq('id', mise.id);

          // Si gagne, on utilise la fonction SQL increment_balance
          if (estGagne) {
            await supabase.rpc('increment_balance', { user_id: mise.user_id, amount: gain });
          }
        }
      }

      // 2. On ferme le tirage
      await supabase.from('tirages').update({ status: 'termine' }).eq('id', currentTirage.id);
      setCurrentTirage(null);
      alert("Terminé !");
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Chargement...</div>;

  return (
    <div className="min-h-screen bg-[#020617] p-6 text-white uppercase italic font-black">
      <div className="max-w-4xl mx-auto space-y-10">
        <h1 className="text-3xl text-emerald-500">Loterie Admin</h1>

        {!currentTirage ? (
          <div className="grid grid-cols-2 gap-4">
            {['Matin', 'Midi', 'Après-Midi', 'Soir'].map(m => (
              <button key={m} onClick={() => ouvrirSession(m)} className="p-10 bg-slate-900 rounded-3xl border border-white/5 hover:bg-emerald-500 transition-all">Ouvrir {m}</button>
            ))}
          </div>
        ) : (
          <div className="bg-slate-900 p-10 rounded-[3rem] text-center space-y-8 border border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.1)]">
            <p className="text-emerald-500 animate-pulse text-xs tracking-widest">Session {currentTirage.moment} en cours</p>
            <h2 className="text-[12rem] leading-none">{currentTirage.chiffre_gagnant}</h2>
            <button onClick={payerEtCloturer} disabled={isProcessing} className="w-full py-6 bg-white text-black rounded-2xl">
              {isProcessing ? "Calcul des gains..." : "Valider & Payer"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
