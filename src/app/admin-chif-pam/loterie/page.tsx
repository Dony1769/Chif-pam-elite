// /app/admin-chif-pam/loterie/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, ShieldCheck, Zap, Dices, AlertCircle } from 'lucide-react';

export default function AdminLoterie() {
  const [currentTirage, setCurrentTirage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [multiplicateur, setMultiplicateur] = useState(10);

  const checkActiveSession = async () => {
    const { data } = await supabase.from('tirages').select('*').eq('status', 'ouvert').maybeSingle();
    setCurrentTirage(data);
    if (data) setMultiplicateur(data.multiplicateur);
    setLoading(false);
  };

  useEffect(() => {
    checkActiveSession();
    const channel = supabase.channel('admin-sync').on('postgres_changes', { event: '*', schema: 'public', table: 'tirages' }, () => checkActiveSession()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const ouvrirSession = async (moment: string) => {
    if (currentTirage) return alert("Une session est déjà active. Clôturez-la d'abord !");
    setIsProcessing(true);

    try {
      const gagnant = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      // Génération du rideau de fumée (9 faux + 1 gagnant)
      const faux = Array.from({ length: 9 }, () => Math.floor(Math.random() * 100).toString().padStart(2, '0'));
      const grille = [...faux, gagnant].sort(() => Math.random() - 0.5);

      await supabase.from('tirages').insert({
        moment, chiffre_gagnant: gagnant, chiffres_visibles: grille,
        multiplicateur, status: 'ouvert'
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const validerEtPayer = async () => {
    if (!currentTirage || isProcessing) return;
    if (!confirm(`Confirmer le gain pour le chiffre ${currentTirage.chiffre_gagnant} ?`)) return;

    setIsProcessing(true);
    try {
      // 1. Récupérer les mises
      const { data: mises } = await supabase.from('mises').select('*').eq('tirage_id', currentTirage.id).eq('status', 'en_attente');

      if (mises) {
        for (const mise of mises) {
          const isWinner = mise.chiffre_choisi === currentTirage.chiffre_gagnant;
          const gain = isWinner ? (mise.montant * (mise.multiplicateur_moment || currentTirage.multiplicateur)) : 0;

          // Mise à jour de la mise
          await supabase.from('mises').update({ status: isWinner ? 'gagné' : 'perdu', gain_reel: gain }).eq('id', mise.id);

          // Paiement si gagné
          if (isWinner && gain > 0) {
            await supabase.rpc('increment_balance', { user_id: mise.user_id, amount: gain });
            await supabase.from('transactions').insert({
              user_id: mise.user_id, amount: gain, type: 'gain', status: 'valide', admin_note: `Gain ${currentTirage.moment}`
            });
          }
        }
      }

      // 2. Fermer le tirage
      await supabase.from('tirages').update({ status: 'termine' }).eq('id', currentTirage.id);
      setCurrentTirage(null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="min-h-screen bg-[#020617] p-6 text-white font-black italic uppercase">
      <div className="max-w-4xl mx-auto space-y-10">
        <div className="flex justify-between items-center bg-slate-900/50 p-8 rounded-[2rem] border border-white/5">
          <h1 className="text-2xl tracking-tighter text-emerald-500">ADMIN CONTROL</h1>
          <div className="flex items-center gap-4">
             <span className="text-[10px] text-slate-500">Multiplicateur:</span>
             <input type="number" value={multiplicateur} onChange={(e) => setMultiplicateur(Number(e.target.value))} className="bg-black border border-white/10 w-16 p-2 rounded-xl text-emerald-500 text-center" />
          </div>
        </div>

        {!currentTirage ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Matin', 'Midi', 'Après-Midi', 'Soir'].map(m => (
              <button key={m} onClick={() => ouvrirSession(m)} className="h-32 bg-slate-900 rounded-3xl border border-white/5 hover:bg-emerald-500 hover:text-black transition-all">
                Ouvrir {m}
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-slate-900 p-12 rounded-[3rem] border border-emerald-500/20 text-center space-y-8">
            <div className="text-emerald-500 text-xs animate-pulse">Session {currentTirage.moment} en cours...</div>
            <div className="text-[12rem] leading-none tracking-tighter">{currentTirage.chiffre_gagnant}</div>
            <button onClick={validerEtPayer} disabled={isProcessing} className="w-full py-6 bg-white text-black rounded-2xl hover:bg-emerald-500 transition-all">
              {isProcessing ? "Traitement des gains..." : "Valider et Payer"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
