"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Dices, Loader2, ShieldCheck, Zap, Users, AlertCircle 
} from 'lucide-react';

export default function AdminLoterie() {
  const [currentTirage, setCurrentTirage] = useState<any>(null);
  const [multiplicateur, setMultiplicateur] = useState(10);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState({ totalMises: 0, totalMontant: 0 });

  // 1. RÉCUPÉRATION ET SYNC
  const fetchAdminData = useCallback(async () => {
    try {
      // On cherche une session ouverte
      const { data: tirage, error } = await supabase
        .from('tirages')
        .select('*')
        .eq('status', 'ouvert')
        .maybeSingle();

      if (error) throw error;
      
      setCurrentTirage(tirage);

      if (tirage) {
        setMultiplicateur(tirage.multiplicateur);
        const { data: mises } = await supabase
          .from('mises')
          .select('montant')
          .eq('tirage_id', tirage.id);
        
        if (mises) {
          const total = mises.reduce((sum, m) => sum + Number(m.montant), 0);
          setStats({ totalMises: mises.length, totalMontant: total });
        }
      } else {
        setStats({ totalMises: 0, totalMontant: 0 });
      }
    } catch (err) {
      console.error("Erreur Sync Admin:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
    // Realtime pour mettre à jour les chiffres dès qu'une action est faite
    const channel = supabase.channel('admin-loterie-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tirages' }, () => fetchAdminData())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mises' }, () => fetchAdminData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchAdminData]);

  // 2. OUVERTURE DE SESSION (C'est ici que ça bloquait)
  const ouvrirSession = async (moment: string) => {
    if (currentTirage || isProcessing) return;
    setIsProcessing(true);

    try {
      // Calcul du chiffre
      const numGagnant = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      const pool = Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, '0'))
        .filter(n => n !== numGagnant)
        .sort(() => Math.random() - 0.5)
        .slice(0, 9);
      const grilleVisible = [...pool, numGagnant].sort(() => Math.random() - 0.5);

      // INSERTION
      const { error } = await supabase.from('tirages').insert([{
        moment: moment,
        chiffre_gagnant: numGagnant,
        chiffres_visibles: grilleVisible,
        multiplicateur: Number(multiplicateur),
        status: 'ouvert'
      }]);

      if (error) throw error;

      // RECHARGEMENT IMMÉDIAT
      await fetchAdminData();

    } catch (err: any) {
      console.error("Erreur Ouverture détaillée:", err);
      alert("Erreur d'ouverture : " + (err.message || "Problème base de données"));
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. CLÔTURE ET PAIEMENT
  const cloturerEtPayer = async () => {
    if (!currentTirage || isProcessing) return;
    if (!confirm(`Clôturer la session ${currentTirage.moment} ?`)) return;

    setIsProcessing(true);
    try {
      const { data: mises, error: fetchError } = await supabase
        .from('mises')
        .select('*')
        .eq('tirage_id', currentTirage.id)
        .eq('status', 'en_attente');

      if (fetchError) throw fetchError;

      if (mises && mises.length > 0) {
        for (const mise of mises) {
          const estGagnant = mise.chiffre_choisi === currentTirage.chiffre_gagnant;
          const gain = estGagnant ? (Number(mise.montant) * Number(currentTirage.multiplicateur)) : 0;

          await supabase.from('mises')
            .update({ 
              status: estGagnant ? 'gagné' : 'perdu', 
              gain_reel: gain 
            })
            .eq('id', mise.id);

          if (estGagnant && gain > 0) {
            await supabase.rpc('increment_balance', { 
              user_id: mise.user_id, 
              amount: gain 
            });
          }
        }
      }

      await supabase.from('tirages')
        .update({ status: 'termine' })
        .eq('id', currentTirage.id);

      alert("Clôture réussie !");
      setCurrentTirage(null);
      fetchAdminData();
    } catch (err: any) {
      alert("Erreur Clôture : " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <Loader2 className="animate-spin text-emerald-500" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 font-sans uppercase italic font-black">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-900/40 p-8 rounded-[2.5rem] border border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center">
              <ShieldCheck className="text-slate-950" size={32} />
            </div>
            <div>
              <h1 className="text-2xl">Control Center</h1>
              <p className="text-[9px] text-slate-500 font-bold tracking-[0.3em]">ADMINISTRATION DIRECTE</p>
            </div>
          </div>

          <div className="bg-black/40 p-4 rounded-2xl border border-white/5 text-center">
            <p className="text-[8px] text-slate-500 mb-1">Ratio Gain</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-emerald-500 text-xs">x</span>
              <input 
                type="number" 
                value={multiplicateur} 
                disabled={!!currentTirage}
                onChange={(e) => setMultiplicateur(Number(e.target.value))}
                className="bg-transparent text-xl w-12 text-center outline-none"
              />
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* SESSIONS */}
          <div className="space-y-6">
            <div className="bg-slate-900/40 p-6 rounded-[2rem] border border-white/5">
              <h3 className="text-xs text-slate-500 mb-6 flex items-center gap-2">
                <Zap size={14} /> Sessions
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {['Matin', 'Midi', 'Après-Midi', 'Soir'].map((m) => {
                  const isActive = currentTirage?.moment === m;
                  return (
                    <button
                      key={m}
                      disabled={ (!!currentTirage && !isActive) || isProcessing}
                      onClick={() => ouvrirSession(m)}
                      className={`py-5 rounded-2xl border transition-all flex flex-col items-center justify-center ${
                        isActive 
                        ? 'bg-emerald-500 border-emerald-400 text-slate-950' 
                        : 'bg-slate-950 border-white/5 hover:border-emerald-500/50'
                      } ${(!isActive && !!currentTirage) ? 'opacity-20' : ''}`}
                    >
                      <span className="text-xs tracking-widest">{m}</span>
                      {isActive && <span className="text-[8px] animate-pulse">Session Active</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* MONITORING */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900 p-8 rounded-[3rem] border border-white/5 h-full min-h-[500px] flex flex-col justify-center items-center">
              {currentTirage ? (
                <div className="text-center space-y-10">
                  <div className="space-y-2">
                    <p className="text-emerald-500 text-[10px] tracking-[0.5em]">Résultat {currentTirage.moment}</p>
                    <h2 className="text-[12rem] leading-none drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                      {currentTirage.chiffre_gagnant}
                    </h2>
                  </div>
                  <button
                    disabled={isProcessing}
                    onClick={cloturerEtPayer}
                    className="w-full max-w-sm py-6 bg-white text-slate-950 rounded-2xl text-xs tracking-[0.2em] hover:bg-emerald-500 transition-all flex items-center justify-center gap-3"
                  >
                    {isProcessing ? <Loader2 className="animate-spin" /> : <ShieldCheck size={20} />}
                    Clôturer et Payer
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center text-slate-800 space-y-6">
                  <Dices size={80} strokeWidth={1} />
                  <p className="tracking-[0.5em] text-xs">Aucune session active</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

