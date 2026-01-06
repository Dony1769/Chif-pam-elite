"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Dices, Timer, Trophy, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';

export default function AdminLoterie() {
  const [currentTirage, setCurrentTirage] = useState<any>(null);
  const [multiplicateur, setMultiplicateur] = useState(5);
  const [loading, setLoading] = useState(true);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => { fetchActiveSession(); }, []);

  const fetchActiveSession = async () => {
    const { data } = await supabase.from('tirages').select('*').eq('status', 'ouvert').maybeSingle();
    setCurrentTirage(data);
    setLoading(false);
  };

  const preparerTirage = async (moment: string) => {
    if (currentTirage) return alert("Une session est déjà en cours !");
    
    // 1. Génération du chiffre gagnant (00-99)
    const gagnant = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    
    // 2. Génération de 9 chiffres perdants uniques
    const faux = new Set<string>();
    while(faux.size < 9) {
      const n = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      if (n !== gagnant) faux.add(n);
    }

    // 3. Mélange (Shuffle) pour le Rideau de Fumée
    const tous = [gagnant, ...Array.from(faux)].sort(() => Math.random() - 0.5);

    const { data, error } = await supabase.from('tirages').insert([{
      moment,
      chiffre_gagnant: gagnant,
      chiffres_visibles: tous,
      multiplicateur: multiplicateur,
      status: 'ouvert'
    }]).select().single();

    if (!error) {
      setCurrentTirage(data);
    } else {
      alert("Erreur lors de la création du tirage");
    }
  };

  // --- VERSION OPTIMISÉE AVEC APPEL RPC ---
  const cloreTirage = async () => {
    if (!currentTirage || !confirm("Voulez-vous clôturer et payer les gagnants via le moteur SQL ?")) return;
    
    setIsClosing(true);
    try {
      // 1. Appel de la fonction SQL intelligente (Gère le status 'ferme' + les gains)
      // On ferme d'abord le tirage
      await supabase.from('tirages').update({ status: 'ferme' }).eq('id', currentTirage.id);

      // 2. On déclenche la distribution massive des gains
      const { error: rpcError } = await supabase.rpc('distribuer_gains', { 
        p_tirage_id: currentTirage.id, 
        p_chiffre_gagnant: currentTirage.chiffre_gagnant 
      });

      if (rpcError) throw rpcError;

      alert("Succès : Le tirage est clos et les comptes clients ont été crédités.");
      setCurrentTirage(null);
    } catch (err) {
      console.error(err);
      alert("Erreur critique lors de la distribution.");
    } finally {
      setIsClosing(false);
    }
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-emerald-500" size={32} />
          <h1 className="text-2xl font-black italic uppercase tracking-tighter">Contrôle <span className="text-emerald-500">Loterie</span></h1>
        </div>
        {currentTirage && (
           <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Session Live</span>
           </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-slate-900/50 p-8 rounded-[3rem] border border-white/5 space-y-6 shadow-2xl">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
              <AlertCircle size={14} /> Paramètres de session
            </p>
            <div className="flex items-center justify-between bg-slate-950 p-5 rounded-2xl border border-white/5">
              <span className="text-sm font-bold uppercase text-slate-400">Gain Multiplié par</span>
              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-emerald-500">x</span>
                <input 
                  type="number" 
                  value={multiplicateur} 
                  onChange={(e) => setMultiplicateur(Number(e.target.value))}
                  className="bg-transparent border-b border-emerald-500/30 w-12 text-center text-2xl font-black outline-none focus:border-emerald-500 transition-all"
                />
              </div>
            </div>
            
            {!currentTirage ? (
              <div className="grid grid-cols-3 gap-3 pt-4">
                {['Matin', 'Midi', 'Soir'].map(m => (
                  <button key={m} onClick={() => preparerTirage(m)} className="bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 p-5 rounded-3xl transition-all group flex flex-col items-center">
                     <Timer className="mb-2 opacity-50 group-hover:opacity-100" size={24} />
                     <span className="text-[9px] font-black uppercase tracking-tighter">{m}</span>
                  </button>
                ))}
              </div>
            ) : (
              <button 
                disabled={isClosing}
                onClick={cloreTirage} 
                className="w-full py-6 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-4xl uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-rose-900/20 transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                {isClosing ? <Loader2 className="animate-spin" size={18} /> : <Trophy size={18} />}
                {isClosing ? 'Calcul des gains...' : `Clôturer & Payer (${currentTirage.moment})`}
              </button>
            )}
          </div>
        </div>

        <div className="bg-slate-900/30 p-8 rounded-[3rem] border border-white/5 backdrop-blur-sm relative overflow-hidden">
           {currentTirage ? (
             <div className="text-center space-y-8 relative z-10">
                <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Le Rideau de Fumée est actif</p>
                <div className="space-y-2">
                  <p className="text-[8px] font-black uppercase text-slate-500">Chiffre Gagnant Masqué</p>
                  <div className="text-8xl font-black text-white italic drop-shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                    {currentTirage.chiffre_gagnant}
                  </div>
                </div>
                
                <div className="grid grid-cols-5 gap-2 pt-6">
                  {currentTirage.chiffres_visibles.map((c: string, i: number) => (
                    <div key={i} className={`h-12 rounded-xl flex items-center justify-center font-black text-xs border transition-all ${
                      c === currentTirage.chiffre_gagnant 
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                      : 'border-white/5 bg-slate-950/50 text-slate-600'
                    }`}>
                      {c}
                    </div>
                  ))}
                </div>
                <p className="text-[9px] font-bold text-slate-500 uppercase italic">Les clients voient ces 10 chiffres mélangés</p>
             </div>
           ) : (
             <div className="h-full flex flex-col items-center justify-center text-slate-700 space-y-6 py-20">
                <div className="p-8 bg-slate-900/50 rounded-full border border-white/5">
                  <Dices size={64} className="opacity-10" />
                </div>
                <p className="text-[10px] uppercase font-black tracking-[0.3em]">En attente de lancement</p>
             </div>
           )}
           <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[80px] rounded-full"></div>
        </div>
      </div>
    </div>
  );
}