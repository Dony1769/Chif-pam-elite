// /app/admin-chif-pam/loterie/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, ShieldCheck, Zap, Dices, Timer } from 'lucide-react';

export default function AdminLoterie() {
  const [currentTirage, setCurrentTirage] = useState<any>(null);
  const [multiplicateur, setMultiplicateur] = useState(10);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Vérification de session avec une priorité absolue
  const checkSession = useCallback(async () => {
    const { data, error } = await supabase
      .from('tirages')
      .select('*, mises(count)')
      .eq('status', 'ouvert')
      .maybeSingle();
    
    if (data) {
      setCurrentTirage(data);
      setMultiplicateur(data.multiplicateur);
    } else {
      setCurrentTirage(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    checkSession();
    const channel = supabase.channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tirages' }, () => checkSession())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [checkSession]);

  const ouvrirSession = async (moment: string) => {
    if (currentTirage) return; // Sécurité supplémentaire
    setIsProcessing(true);

    try {
      const numGagnant = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      // Génération 9 chiffres au hasard + le gagnant (Rideau de fumée)
      const reste = Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, '0'))
        .filter(n => n !== numGagnant)
        .sort(() => Math.random() - 0.5).slice(0, 9);
      const grille = [...reste, numGagnant].sort(() => Math.random() - 0.5);

      const { error } = await supabase.from('tirages').insert({
        moment,
        chiffre_gagnant: numGagnant,
        chiffres_visibles: grille,
        multiplicateur: multiplicateur,
        status: 'ouvert'
      });

      if (error) throw error;
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const finaliserSession = async () => {
    if (!currentTirage || isProcessing) return;
    if (!confirm(`Valider le chiffre ${currentTirage.chiffre_gagnant} et payer les clients ?`)) return;

    setIsProcessing(true);
    try {
      // 1. Récupérer les mises gagnantes
      const { data: mises } = await supabase.from('mises')
        .select('*')
        .eq('tirage_id', currentTirage.id)
        .eq('status', 'en_attente');

      if (mises) {
        for (const mise of mises) {
          const gagne = mise.chiffre_choisi === currentTirage.chiffre_gagnant;
          const gain = gagne ? (mise.montant * (mise.multiplicateur_moment || currentTirage.multiplicateur)) : 0;

          // Mise à jour de la mise
          await supabase.from('mises').update({ 
            status: gagne ? 'gagné' : 'perdu', 
            gain_reel: gain 
          }).eq('id', mise.id);

          // Si gagné, on crédite le solde via le RPC
          if (gagne && gain > 0) {
            await supabase.rpc('increment_balance', { user_id: mise.user_id, amount: gain });
            await supabase.from('transactions').insert({
              user_id: mise.user_id, amount: gain, type: 'gain', status: 'valide',
              admin_note: `Tirage ${currentTirage.moment} : ${currentTirage.chiffre_gagnant}`
            });
          }
        }
      }

      // 2. Clôturer définitivement la session
      await supabase.from('tirages').update({ status: 'termine' }).eq('id', currentTirage.id);
      setCurrentTirage(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="min-h-screen bg-[#020617] p-6 text-white font-sans">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* TOP PANEL */}
        <div className="flex justify-between items-center bg-slate-900/50 p-8 rounded-[2rem] border border-white/5">
          <div>
            <h1 className="text-2xl font-black tracking-tighter italic uppercase">Panel <span className="text-emerald-500">Loterie</span></h1>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Gestion des flux financiers</p>
          </div>
          <div className="bg-black/40 px-6 py-3 rounded-2xl border border-white/5 text-center">
            <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Ratio Actuel</p>
            <input type="number" value={multiplicateur} onChange={(e) => setMultiplicateur(Number(e.target.value))} className="bg-transparent text-emerald-500 font-black text-xl w-12 text-center outline-none" />
          </div>
        </div>

        {/* LOGIQUE D'AFFICHAGE DYNAMIQUE */}
        {!currentTirage ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Matin', 'Midi', 'Après-Midi', 'Soir'].map(m => (
              <button key={m} onClick={() => ouvrirSession(m)} disabled={isProcessing} className="py-6 bg-slate-900 rounded-3xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-500 hover:text-black transition-all border border-white/5">
                Ouvrir {m}
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-slate-900 p-10 rounded-[3rem] border border-emerald-500/20 text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" /> Session {currentTirage.moment} Active
            </div>
            <h2 className="text-[12rem] font-black leading-none italic tracking-tighter">{currentTirage.chiffre_gagnant}</h2>
            <button onClick={finaliserSession} disabled={isProcessing} className="w-full py-6 bg-white text-black rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-500 transition-all">
              {isProcessing ? "Traitement des paiements..." : "Valider & Clôturer"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
