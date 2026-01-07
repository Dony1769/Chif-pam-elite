"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Dices, Timer, Loader2, ShieldCheck, Zap } from 'lucide-react';

export default function AdminLoterie() {
  const [currentTirage, setCurrentTirage] = useState<any>(null);
  const [multiplicateur, setMultiplicateur] = useState(10);
  const [loading, setLoading] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Utilisation de useCallback pour stabiliser la fonction de récupération
  const fetchActiveSession = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tirages')
        .select('*, mises(count)')
        .eq('status', 'ouvert')
        .maybeSingle();
      
      if (error) throw error;

      // Si une session est trouvée, on la fixe dans l'état
      if (data) {
        setCurrentTirage(data);
        setMultiplicateur(data.multiplicateur);
      } else {
        setCurrentTirage(null);
      }
    } catch (err) {
      console.error("Erreur lors de la récupération de la session:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveSession();

    // Abonnement Realtime pour rester synchronisé avec la DB
    const channel = supabase.channel('admin-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tirages' }, (payload) => {
        console.log("Changement tirage détecté:", payload);
        fetchActiveSession();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchActiveSession]);

  const ouvrirSession = async (moment: string) => {
    // SÉCURITÉ : Vérifier encore une fois avant de créer
    const { data: active } = await supabase.from('tirages').select('id').eq('status', 'ouvert').maybeSingle();
    if (active || currentTirage) return alert("Une session est déjà en cours !");
    
    setIsCreating(true);
    try {
      const numGagnant = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      const pool = Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, '0'))
        .filter(n => n !== numGagnant)
        .sort(() => Math.random() - 0.5)
        .slice(0, 9);
      
      const grilleFinale = [...pool, numGagnant].sort(() => Math.random() - 0.5);

      const { data, error } = await supabase.from('tirages').insert({
        moment,
        chiffre_gagnant: numGagnant,
        chiffres_visibles: grilleFinale,
        multiplicateur: multiplicateur,
        status: 'ouvert'
      }).select().single();

      if (error) throw error;
      setCurrentTirage(data);
    } catch (err: any) {
      alert("Erreur création : " + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const validerEtPayerGagnants = async () => {
    if (!currentTirage || isClosing) return;
    if (!confirm(`Confirmer la clôture du chiffre ${currentTirage.chiffre_gagnant} ?`)) return;
    
    setIsClosing(true);
    try {
      // 1. Marquer la session comme 'en_cloture' pour éviter les doubles clics
      await supabase.from('tirages').update({ status: 'termine' }).eq('id', currentTirage.id);
      
      // 2. Récupérer les mises
      const { data: mises } = await supabase.from('mises').select('*').eq('tirage_id', currentTirage.id).eq('status', 'en_attente');

      if (mises && mises.length > 0) {
        for (const mise of mises) {
          const gagne = mise.chiffre_choisi === currentTirage.chiffre_gagnant;
          const gainFin = gagne ? (mise.montant * (mise.multiplicateur_moment || currentTirage.multiplicateur)) : 0;
          
          await supabase.from('mises').update({ 
            status: gagne ? 'gagné' : 'perdu', 
            gain_reel: gainFin 
          }).eq('id', mise.id);

          if (gagne) {
            await supabase.rpc('increment_balance', { user_id: mise.user_id, amount: gainFin });
            await supabase.from('transactions').insert({
              user_id: mise.user_id,
              amount: gainFin,
              type: 'gain',
              status: 'valide',
              admin_note: `Gain Tirage ${currentTirage.moment}`
            });
          }
        }
      }
      
      alert("Session terminée et gagnants payés !");
      setCurrentTirage(null);
    } catch (err: any) {
      alert("Erreur système : " + err.message);
    } finally {
      setIsClosing(false);
      fetchActiveSession();
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-emerald-500" size={40} />
      <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Vérification de la session en cours...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] p-6 text-white">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* DASHBOARD HEADER */}
        <div className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center">
              <Zap className="text-slate-950" fill="currentColor" />
            </div>
            <h1 className="text-2xl font-black uppercase italic italic">LOTERIE<span className="text-emerald-500">.</span>ADMIN</h1>
          </div>

          <div className="flex items-center gap-4 bg-black/40 p-2 rounded-2xl border border-white/5">
            <div className="px-4 text-center border-r border-white/10">
              <p className="text-[8px] text-slate-500 font-black uppercase">Multiplicateur</p>
              <input 
                type="number" 
                disabled={!!currentTirage}
                value={multiplicateur} 
                onChange={(e) => setMultiplicateur(Number(e.target.value))}
                className="bg-transparent text-emerald-500 font-black text-xl outline-none w-16 text-center disabled:opacity-30"
              />
            </div>
            <div className="px-4 text-center">
              <p className="text-[8px] text-slate-500 font-black uppercase">Mises</p>
              <p className="text-xl font-black">{currentTirage?.mises?.[0]?.count || 0}</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* SELECTION SESSIONS */}
          <div className="bg-slate-900/40 p-6 rounded-[2.5rem] border border-white/5 space-y-3">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-4">Ouvrir une session</p>
            {['Matin', 'Midi', 'Après-Midi', 'Soir'].map((m) => (
              <button
                key={m}
                disabled={isCreating || !!currentTirage}
                onClick={() => ouvrirSession(m)}
                className={`w-full py-4 rounded-xl font-black uppercase text-[10px] tracking-widest border transition-all ${
                  currentTirage?.moment === m 
                  ? 'bg-emerald-500 border-emerald-500 text-slate-950' 
                  : 'bg-slate-950 border-white/5 text-white hover:bg-emerald-500/10 disabled:opacity-10'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* MONITORING CENTRAL */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900 p-8 rounded-[3rem] border border-emerald-500/10 h-full flex flex-col items-center justify-center min-h-[400px]">
              {currentTirage ? (
                <div className="w-full text-center space-y-8">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest animate-pulse">
                    Session {currentTirage.moment} Active
                  </div>
                  <h2 className="text-[10rem] font-black italic leading-none">{currentTirage.chiffre_gagnant}</h2>
                  <button
                    disabled={isClosing}
                    onClick={validerEtPayerGagnants}
                    className="w-full py-6 bg-white text-slate-950 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-500 transition-all flex items-center justify-center gap-3"
                  >
                    {isClosing ? <Loader2 className="animate-spin" /> : <ShieldCheck size={20} />}
                    CLÔTURER ET PAYER
                  </button>
                </div>
              ) : (
                <div className="opacity-20 text-center">
                  <Dices size={64} className="mx-auto mb-4" />
                  <p className="font-black uppercase text-xs tracking-widest">Aucune session active</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

