"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Dices, Timer, Trophy, Loader2, ShieldCheck, CheckCircle2, Zap, AlertCircle } from 'lucide-react';

export default function AdminLoterie() {
  const [currentTirage, setCurrentTirage] = useState<any>(null);
  const [multiplicateur, setMultiplicateur] = useState(10);
  const [loading, setLoading] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchActiveSession();
    // Synchronisation en temps réel : si une mise arrive ou si le tirage change
    const channel = supabase.channel('admin-sync-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tirages' }, () => fetchActiveSession())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mises' }, () => fetchActiveSession())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchActiveSession = async () => {
    try {
      const { data, error } = await supabase
        .from('tirages')
        .select('*, mises(count)') // On récupère aussi le nombre de mises en cours
        .eq('status', 'ouvert')
        .maybeSingle();
      
      if (error) throw error;
      setCurrentTirage(data);
      if (data) setMultiplicateur(data.multiplicateur);
    } catch (err) {
      console.error("Erreur de synchronisation:", err);
    } finally {
      setLoading(false);
    }
  };

  const ouvrirPorteSession = async (moment: string) => {
    if (currentTirage) return alert("Une session est déjà ouverte ! Clôturez-la avant d'en ouvrir une autre.");
    
    setIsCreating(true);
    try {
      // 1. Génération du chiffre gagnant (C'est ici que le destin se joue)
      const num = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      
      // 2. Génération de la grille visible (20 chiffres incluant le gagnant)
      const reste = Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, '0'))
        .filter(n => n !== num)
        .sort(() => Math.random() - 0.5)
        .slice(0, 19);
      const grille = [...reste, num].sort(() => Math.random() - 0.5);

      // 3. Ouverture officielle dans la DB
      const { error } = await supabase.from('tirages').insert({
        moment,
        chiffre_gagnant: num,
        chiffres_visibles: grille,
        multiplicateur: multiplicateur,
        status: 'ouvert'
      });

      if (error) throw error;
      alert(`Porte ouverte pour la session ${moment} ! Les clients peuvent miser.`);
    } catch (err: any) {
      alert("Erreur d'ouverture : " + err.message);
    } finally {
      setIsCreating(false);
      fetchActiveSession();
    }
  };

  const executerPaiementsEtCloture = async () => {
    if (!currentTirage || isClosing) return;
    if (!confirm(`Voulez-vous valider le chiffre ${currentTirage.chiffre_gagnant} et payer les gagnants ?`)) return;
    
    setIsClosing(true);
    try {
      // 1. On récupère toutes les mises en attente pour ce tirage
      const { data: mises } = await supabase.from('mises')
        .select('*')
        .eq('tirage_id', currentTirage.id)
        .eq('status', 'en_attente');

      if (mises && mises.length > 0) {
        for (const mise of mises) {
          const gagne = mise.chiffre_choisi === currentTirage.chiffre_gagnant;
          const gainFin = gagne ? (mise.montant * (mise.multiplicateur_moment || currentTirage.multiplicateur)) : 0;

          // Mise à jour de la mise (Gagné/Perdu)
          await supabase.from('mises').update({ status: gagne ? 'gagné' : 'perdu', gain_reel: gainFin }).eq('id', mise.id);

          if (gagne) {
            // Crédit du solde via RPC
            await supabase.rpc('increment_balance', { user_id: mise.user_id, amount: gainFin });
            // Création de la transaction de gain pour l'historique
            await supabase.from('transactions').insert({
              user_id: mise.user_id,
              amount: gainFin,
              type: 'gain',
              status: 'valide',
              admin_note: `Gain Tirage ${currentTirage.moment} (Chiffre ${currentTirage.chiffre_gagnant})`
            });
          }
        }
      }

      // 2. On ferme le tirage
      await supabase.from('tirages').update({ status: 'termine' }).eq('id', currentTirage.id);
      
      alert("Succès ! La session est clôturée et les gagnants sont payés.");
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
      <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest">Initialisation du Dashboard...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] p-6 text-white font-sans selection:bg-emerald-500/30">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* TOP BAR */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-slate-900/40 p-8 rounded-[2.5rem] border border-white/5 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Zap className="text-slate-950" fill="currentColor" />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase italic tracking-tighter">Loterie<span className="text-emerald-500 text-3xl">.</span>Admin</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Panneau de contrôle des tirages</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 bg-black/40 p-2 rounded-2xl border border-white/5">
            <div className="px-4 text-center border-r border-white/10">
              <p className="text-[8px] text-slate-500 font-black uppercase mb-1">Ratio Gain</p>
              <input 
                type="number" 
                value={multiplicateur} 
                onChange={(e) => setMultiplicateur(Number(e.target.value))}
                className="bg-transparent text-emerald-500 font-black text-xl outline-none w-16 text-center"
              />
            </div>
            <div className="px-4 text-center">
              <p className="text-[8px] text-slate-500 font-black uppercase mb-1">Mises Actives</p>
              <p className="text-xl font-black text-white">{currentTirage?.mises?.[0]?.count || 0}</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* STEP 1: SÉLECTION SESSION */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-slate-900/40 p-6 rounded-[2rem] border border-white/5 space-y-6">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <Timer className="text-emerald-500" size={20} />
                <h2 className="font-black uppercase text-xs tracking-widest">Choisir la Session</h2>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {['Matin', 'Midi', 'Après-Midi', 'Soir'].map((m) => (
                  <button
                    key={m}
                    disabled={isCreating || !!currentTirage}
                    onClick={() => ouvrirPorteSession(m)}
                    className="group relative py-4 bg-slate-950 rounded-xl font-black uppercase text-[10px] tracking-widest overflow-hidden transition-all hover:bg-emerald-500 hover:text-slate-950 disabled:opacity-20 border border-white/5"
                  >
                    <span className="relative z-10">{m}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* STEP 2: MONITORING LIVE */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-emerald-500/20 shadow-2xl h-full relative overflow-hidden">
              {currentTirage ? (
                <div className="flex flex-col h-full justify-between gap-8">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                        <span className="text-[10px] font-black uppercase text-emerald-500">Session Ouverte</span>
                      </div>
                      <h3 className="text-4xl font-black italic uppercase tracking-tighter">{currentTirage.moment}</h3>
                    </div>
                    <Trophy size={40} className="text-emerald-500 opacity-20" />
                  </div>

                  <div className="bg-black/40 p-8 rounded-[2rem] border border-white/5 text-center shadow-inner">
                    <p className="text-[10px] text-slate-500 font-black uppercase mb-4 tracking-[0.3em]">Chiffre Gagnant à Valider</p>
                    <div className="text-8xl font-black text-white italic tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                      {currentTirage.chiffre_gagnant}
                    </div>
                  </div>

                  <button
                    disabled={isClosing}
                    onClick={executerPaiementsEtCloture}
                    className="w-full py-6 bg-white text-slate-950 rounded-2xl font-black uppercase text-[12px] tracking-[0.2em] shadow-xl hover:bg-emerald-500 transition-all flex items-center justify-center gap-3 active:scale-95"
                  >
                    {isClosing ? <Loader2 className="animate-spin" /> : <ShieldCheck size={20} />}
                    {isClosing ? "Traitement des gains..." : "Clôturer & Payer les clients"}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-20 opacity-30">
                  <Dices size={64} className="mb-6" />
                  <p className="text-sm font-black uppercase tracking-[0.4em] text-center">Aucune session en cours<br/><span className="text-[8px] font-medium">Veuillez en ouvrir une à gauche</span></p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* GRILLE CLIENTS (LIAISON VISUELLE) */}
        {currentTirage && (
          <div className="bg-slate-900/20 p-8 rounded-[2.5rem] border border-white/5 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle2 size={16} className="text-slate-500" />
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Aperçu de la grille envoyée aux clients</p>
            </div>
            <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
              {currentTirage.chiffres_visibles.map((c: string, i: number) => (
                <div 
                  key={i} 
                  className={`h-12 rounded-xl flex items-center justify-center font-black text-sm border transition-all ${
                    c === currentTirage.chiffre_gagnant 
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                    : 'border-white/5 bg-slate-950 text-slate-700'
                  }`}
                >
                  {c}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

