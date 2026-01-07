"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Dices, Timer, Trophy, Loader2, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function AdminLoterie() {
  const [currentTirage, setCurrentTirage] = useState<any>(null);
  const [multiplicateur, setMultiplicateur] = useState(5);
  const [loading, setLoading] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchActiveSession();
    
    // Écoute en temps réel pour synchroniser l'affichage
    const channel = supabase.channel('admin-tirage-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tirages' }, () => fetchActiveSession())
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchActiveSession = async () => {
    const { data } = await supabase
      .from('tirages')
      .select('*')
      .eq('status', 'ouvert')
      .maybeSingle();
    setCurrentTirage(data);
    setLoading(false);
  };

  const preparerTirage = async (moment: string) => {
    if (currentTirage) return alert("Une session est déjà en cours !");
    setIsCreating(true);
    
    // Logique du "Rideau de Fumée" : Génération côté serveur
    const gagnant = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    const faux = new Set<string>();
    while(faux.size < 9) {
      const n = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      if (n !== gagnant) faux.add(n);
    }
    const tous = [gagnant, ...Array.from(faux)].sort(() => Math.random() - 0.5);

    const { error } = await supabase.from('tirages').insert([{
      moment,
      chiffre_gagnant: gagnant,
      chiffres_visibles: tous,
      multiplicateur: multiplicateur,
      status: 'ouvert'
    }]);

    if (error) {
      alert("Erreur de création : " + error.message);
    } else {
      fetchActiveSession();
    }
    setIsCreating(false);
  };

  const cloreTirage = async () => {
    if (!currentTirage) return;
    
    const confirmClose = confirm(`Voulez-vous clôturer la session ${currentTirage.moment} ? Le chiffre gagnant était le ${currentTirage.chiffre_gagnant}. Les gains seront distribués automatiquement.`);
    if (!confirmClose) return;

    setIsClosing(true);
    
    try {
      // ÉTAPE 1 : Appel de la fonction SQL RPC pour distribuer les gains
      // Cette fonction gère le calcul (Mise * Multiplicateur) et met à jour les profils
      const { error: rpcError } = await supabase.rpc('distribuer_gains_automatique', {
        p_tirage_id: currentTirage.id,
        p_chiffre_gagnant: currentTirage.chiffre_gagnant
      });

      if (rpcError) throw new Error("Erreur lors de la distribution SQL : " + rpcError.message);

      // ÉTAPE 2 : Fermeture officielle de la session dans la table
      const { error: updateError } = await supabase
        .from('tirages')
        .update({ status: 'ferme' })
        .eq('id', currentTirage.id);

      if (updateError) throw updateError;

      alert("SUCCÈS : Tirage clôturé et portefeuilles clients mis à jour !");
      setCurrentTirage(null);
    } catch (err: any) {
      console.error("Détails erreur clôture:", err);
      alert(err.message || "Une erreur critique est survenue.");
    } finally {
      setIsClosing(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <Loader2 className="animate-spin text-emerald-500" size={40} />
    </div>
  );

  return (
    <main className="min-h-screen bg-[#020617] p-4 md:p-8 text-white">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/50 p-8 rounded-[2.5rem] border border-white/5 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
              <ShieldCheck className="text-emerald-500" size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase italic tracking-tighter">Contrôle <span className="text-emerald-500">Loterie</span></h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Gestion des flux de tirage</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-500 uppercase">Multiplicateur Actif</p>
              <input 
                type="number" value={multiplicateur} onChange={(e) => setMultiplicateur(Number(e.target.value))}
                className="bg-transparent text-2xl font-black text-emerald-500 w-16 text-right outline-none"
              />
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* CRÉATION DE SESSION */}
          <div className="bg-slate-900 border border-white/5 p-8 rounded-[2.5rem] space-y-6">
            <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <Timer size={18} className="text-emerald-500" /> Nouvel Impact
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {['MATIN', 'MIDI', 'SOIR', 'SPECIAL'].map(moment => (
                <button
                  key={moment}
                  disabled={!!currentTirage || isCreating}
                  onClick={() => preparerTirage(moment)}
                  className="py-4 bg-slate-950 border border-white/5 rounded-2xl font-black text-[10px] tracking-widest hover:border-emerald-500/50 transition-all disabled:opacity-20"
                >
                  {isCreating ? <Loader2 className="animate-spin mx-auto"/> : `LANCER ${moment}`}
                </button>
              ))}
            </div>
          </div>

          {/* ÉTAT DU TIRAGE ACTUEL */}
          <div className="bg-slate-900 border border-emerald-500/20 p-8 rounded-[2.5rem] relative overflow-hidden group">
            {currentTirage ? (
              <div className="space-y-6 text-center">
                <div className="inline-flex items-center gap-2 bg-emerald-500/10 px-4 py-1 rounded-full border border-emerald-500/20">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[9px] font-black uppercase text-emerald-500 tracking-widest">Session {currentTirage.moment} en cours</span>
                </div>

                <div className="space-y-2">
                  <p className="text-[8px] font-black uppercase text-slate-500">Chiffre Gagnant (Rideau de Fumée)</p>
                  <div className="text-8xl font-black text-white italic drop-shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                    {currentTirage.chiffre_gagnant}
                  </div>
                </div>

                <button
                  disabled={isClosing}
                  onClick={cloreTirage}
                  className="w-full py-5 bg-emerald-500 text-slate-950 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-lg shadow-emerald-500/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                >
                  {isClosing ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={16} />}
                  CLÔTURER ET PAYER LES GAGNANTS
                </button>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-700 py-10 space-y-4">
                <Dices size={48} className="opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-widest italic">Aucun tirage actif</p>
              </div>
            )}
          </div>
        </div>

        {/* GRILLE VISIBLE PAR LES CLIENTS */}
        {currentTirage && (
           <div className="bg-slate-900/50 p-8 rounded-[2.5rem] border border-white/5">
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-6 text-center">Grille générée pour les clients</p>
              <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
                {currentTirage.chiffres_visibles.map((c: string, i: number) => (
                  <div key={i} className={`h-12 rounded-xl flex items-center justify-center font-black text-sm border ${
                    c === currentTirage.chiffre_gagnant 
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' 
                    : 'border-white/5 bg-slate-950/50 text-slate-600'
                  }`}>
                    {c}
                  </div>
                ))}
              </div>
           </div>
        )}

      </div>
    </main>
  );
}
