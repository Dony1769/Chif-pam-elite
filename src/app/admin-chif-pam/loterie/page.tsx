"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Dices, 
  Loader2, 
  ShieldCheck, 
  Zap, 
  Users, 
  Coins, 
  TrendingUp,
  AlertCircle
} from 'lucide-react';

export default function AdminLoterie() {
  const [currentTirage, setCurrentTirage] = useState<any>(null);
  const [multiplicateur, setMultiplicateur] = useState(10);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState({ totalMises: 0, totalMontant: 0 });

  // 1. CHARGEMENT ET SYNC DE LA SESSION
  const fetchAdminData = useCallback(async () => {
    try {
      // Récupérer la session ouverte
      const { data: tirage, error } = await supabase
        .from('tirages')
        .select('*')
        .eq('status', 'ouvert')
        .maybeSingle();

      if (error) throw error;
      setCurrentTirage(tirage);

      if (tirage) {
        setMultiplicateur(tirage.multiplicateur);
        // Récupérer les stats des mises pour ce tirage
        const { data: mises } = await supabase
          .from('mises')
          .select('montant')
          .eq('tirage_id', tirage.id);
        
        if (mises) {
          const total = mises.reduce((sum, m) => sum + Number(m.montant), 0);
          setStats({ totalMises: mises.length, totalMontant: total });
        }
      }
    } catch (err) {
      console.error("Erreur de synchronisation admin:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminData();

    // ECOUTE REALTIME : Tirages et Mises
    const channel = supabase.channel('admin-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tirages' }, () => fetchAdminData())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mises' }, () => fetchAdminData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchAdminData]);

  // 2. OUVERTURE DE SESSION
  const ouvrirSession = async (moment: string) => {
    if (currentTirage) return;
    setIsProcessing(true);

    try {
      // Génération Chiffre Gagnant (00-99)
      const numGagnant = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      
      // Génération du "Rideau de fumée" (9 chiffres faux + 1 gagnant)
      const pool = Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, '0'))
        .filter(n => n !== numGagnant)
        .sort(() => Math.random() - 0.5)
        .slice(0, 9);
      
      const grilleVisible = [...pool, numGagnant].sort(() => Math.random() - 0.5);

      const { error } = await supabase.from('tirages').insert({
        moment,
        chiffre_gagnant: numGagnant,
        chiffres_visibles: grilleVisible,
        multiplicateur: multiplicateur,
        status: 'ouvert'
      });

      if (error) throw error;
    } catch (err: any) {
      alert("Erreur d'ouverture : " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. CLÔTURE ET PAIEMENT AUTOMATIQUE
  const cloturerEtPayer = async () => {
    if (!currentTirage || isProcessing) return;
    const confirmMsg = `Voulez-vous clôturer la session ${currentTirage.moment} ?\nChiffre gagnant : ${currentTirage.chiffre_gagnant}\nLes gagnants seront payés immédiatement.`;
    
    if (!confirm(confirmMsg)) return;

    setIsProcessing(true);
    try {
      // A. Récupérer toutes les mises en attente pour ce tirage
      const { data: mises, error: fetchError } = await supabase
        .from('mises')
        .select('*')
        .eq('tirage_id', currentTirage.id)
        .eq('status', 'en_attente');

      if (fetchError) throw fetchError;

      // B. Traiter chaque mise
      if (mises && mises.length > 0) {
        for (const mise of mises) {
          const estGagnant = mise.chiffre_choisi === currentTirage.chiffre_gagnant;
          const gainCalculé = estGagnant ? (Number(mise.montant) * Number(mise.multiplicateur_moment)) : 0;

          // Mettre à jour le statut de la mise
          await supabase.from('mises')
            .update({ 
              status: estGagnant ? 'gagné' : 'perdu', 
              gain_reel: gainCalculé 
            })
            .eq('id', mise.id);

          // Payer si gagné
          if (estGagnant && gainCalculé > 0) {
            await supabase.rpc('increment_balance', { 
              user_id: mise.user_id, 
              amount: gainCalculé 
            });
          }
        }
      }

      // C. Fermer la session
      const { error: closeError } = await supabase
        .from('tirages')
        .update({ status: 'termine' })
        .eq('id', currentTirage.id);

      if (closeError) throw closeError;

      alert("Session clôturée avec succès ! Tous les gagnants ont été crédités.");
      setCurrentTirage(null);
    } catch (err: any) {
      alert("Erreur lors de la clôture : " + err.message);
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
        
        {/* HEADER DASHBOARD */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-900/40 p-8 rounded-[2.5rem] border border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <ShieldCheck className="text-slate-950" size={32} />
            </div>
            <div>
              <h1 className="text-2xl tracking-tighter">Control Center</h1>
              <p className="text-[9px] text-slate-500 not-italic font-bold tracking-[0.3em]">Loterie Professionnelle</p>
            </div>
          </div>

          <div className="flex gap-4 w-full md:w-auto">
            <div className="flex-1 md:w-32 bg-black/40 p-4 rounded-2xl border border-white/5 text-center">
              <p className="text-[8px] text-slate-500 mb-1">Ratio Gain</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-emerald-500 text-xs">x</span>
                <input 
                  type="number" 
                  value={multiplicateur} 
                  disabled={!!currentTirage}
                  onChange={(e) => setMultiplicateur(Number(e.target.value))}
                  className="bg-transparent text-xl w-12 text-center outline-none disabled:opacity-30"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* COLONNE GAUCHE : ACTIONS / SESSIONS */}
          <div className="space-y-6">
            <div className="bg-slate-900/40 p-6 rounded-[2rem] border border-white/5">
              <h3 className="text-xs text-slate-500 mb-6 tracking-widest flex items-center gap-2">
                <Zap size={14} /> Gestion Sessions
              </h3>
              
              <div className="grid grid-cols-1 gap-3">
                {['Matin', 'Midi', 'Après-Midi', 'Soir'].map((m) => {
                  const isActive = currentTirage?.moment === m;
                  return (
                    <button
                      key={m}
                      disabled={!!currentTirage || isProcessing}
                      onClick={() => ouvrirSession(m)}
                      className={`py-5 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1 ${
                        isActive 
                        ? 'bg-emerald-500 border-emerald-400 text-slate-950 scale-[1.02]' 
                        : 'bg-slate-950 border-white/5 hover:border-emerald-500/50 disabled:opacity-10'
                      }`}
                    >
                      <span className="text-xs tracking-widest">{m}</span>
                      {isActive && <span className="text-[8px] animate-pulse">Session Active</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {currentTirage && (
              <div className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-[2rem] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-emerald-500">Mises en cours</span>
                  <Users size={16} className="text-emerald-500" />
                </div>
                <div className="flex justify-between items-end">
                  <p className="text-4xl">{stats.totalMises}</p>
                  <p className="text-emerald-500 text-xs">{stats.totalMontant} HTG</p>
                </div>
              </div>
            )}
          </div>

          {/* COLONNE DROITE : MONITORING LIVE */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900 p-8 rounded-[3rem] border border-white/5 h-full min-h-[500px] flex flex-col">
              {currentTirage ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-10">
                  <div className="space-y-2">
                    <p className="text-emerald-500 text-[10px] tracking-[0.5em]">Résultat Programmé</p>
                    <h2 className="text-[12rem] leading-none tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                      {currentTirage.chiffre_gagnant}
                    </h2>
                  </div>

                  <div className="w-full max-w-sm space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-black/40 rounded-2xl border border-white/5 text-left">
                      <AlertCircle className="text-amber-500" size={20} />
                      <p className="text-[8px] text-slate-400 uppercase leading-relaxed font-bold">
                        En clôturant, le système calculera automatiquement les gains (Mise x {currentTirage.multiplicateur}) et mettra à jour le solde des clients.
                      </p>
                    </div>
                    
                    <button
                      disabled={isProcessing}
                      onClick={cloturerEtPayer}
                      className="w-full py-6 bg-white text-slate-950 rounded-2xl text-xs tracking-[0.2em] hover:bg-emerald-500 transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95"
                    >
                      {isProcessing ? <Loader2 className="animate-spin" /> : <ShieldCheck size={20} />}
                      Clôturer et Payer
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-800 space-y-6">
                  <Dices size={80} strokeWidth={1} />
                  <p className="tracking-[0.5em] text-xs">Système en veille</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
