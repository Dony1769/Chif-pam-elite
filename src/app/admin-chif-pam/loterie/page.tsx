"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Dices, Timer, Trophy, Loader2, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function AdminLoterie() {
  const [currentTirage, setCurrentTirage] = useState<any>(null);
  const [multiplicateur, setMultiplicateur] = useState(10);
  const [loading, setLoading] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchActiveSession();
    const channel = supabase.channel('admin-tirage-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tirages' }, () => fetchActiveSession())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchActiveSession = async () => {
    const { data } = await supabase.from('tirages').select('*').eq('status', 'ouvert').maybeSingle();
    setCurrentTirage(data);
    if (data) setMultiplicateur(data.multiplicateur);
    setLoading(false);
  };

  const preparerTirage = async (moment: string) => {
    if (currentTirage) return alert("Une session est déjà en cours !");
    setIsCreating(true);
    
    // Génération de la grille (Rideau de fumée)
    const chiffres = Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, '0'));
    const melange = chiffres.sort(() => Math.random() - 0.5);
    const selection = melange.slice(0, 20); // 20 chiffres visibles
    const gagnant = selection[Math.floor(Math.random() * selection.length)];

    const { error } = await supabase.from('tirages').insert([{
      moment,
      chiffre_gagnant: gagnant,
      chiffres_visibles: selection,
      multiplicateur: multiplicateur,
      status: 'ouvert'
    }]);

    if (error) alert("Erreur création: " + error.message);
    setIsCreating(false);
    fetchActiveSession();
  };

  const cloturerSession = async () => {
    if (!currentTirage || !window.confirm("Voulez-vous clôturer ce tirage et payer les gagnants ?")) return;
    setIsClosing(true);

    try {
      // 1. Récupérer toutes les mises de ce tirage
      const { data: mises, error: fetchError } = await supabase
        .from('mises')
        .select('*')
        .eq('tirage_id', currentTirage.id)
        .eq('status', 'en_attente');

      if (fetchError) throw fetchError;

      // 2. Traiter chaque mise
      if (mises && mises.length > 0) {
        for (const mise of mises) {
          const isGagnant = mise.chiffre_choisi === currentTirage.chiffre_gagnant;
          const statusFinal = isGagnant ? 'gagné' : 'perdu';
          const gain = isGagnant ? (mise.montant * mise.multiplicateur_moment) : 0;

          // Mettre à jour la mise
          await supabase.from('mises').update({ 
            status: statusFinal, 
            gain_reel: gain 
          }).eq('id', mise.id);

          // Si gagnant, créditer le profil et créer transaction
          if (isGagnant) {
            await supabase.rpc('increment_balance', { 
              user_id: mise.user_id, 
              amount: gain 
            });

            await supabase.from('transactions').insert({
              user_id: mise.user_id,
              amount: gain,
              type: 'gain',
              status: 'valide',
              admin_note: `Gain Tirage ${currentTirage.moment} (Chiffre ${mise.chiffre_choisi})`
            });
          }
        }
      }

      // 3. Terminer le tirage
      await supabase.from('tirages')
        .update({ status: 'termine' })
        .eq('id', currentTirage.id);

      alert("✅ Tirage terminé. Les gagnants ont été payés !");
      setCurrentTirage(null);

    } catch (err: any) {
      alert("Erreur lors de la clôture: " + err.message);
    } finally {
      setIsClosing(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="min-h-screen bg-[#020617] p-8 text-white font-sans">
      <div className="max-w-4xl mx-auto space-y-10">
        
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter">Gestion <span className="text-emerald-500">Loterie</span></h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-2">Contrôle du rideau de fumée</p>
          </div>
          <div className="bg-slate-900 border border-white/5 p-4 rounded-2xl">
            <p className="text-[8px] text-slate-500 font-black uppercase mb-1">Multiplicateur Actuel</p>
            <input 
              type="number" 
              value={multiplicateur} 
              onChange={(e) => setMultiplicateur(Number(e.target.value))}
              className="bg-transparent text-xl font-black text-emerald-500 outline-none w-16"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* CRÉATION */}
          <div className="bg-slate-900/50 border border-white/5 p-8 rounded-[2.5rem] space-y-6">
            <h2 className="font-black uppercase italic text-sm flex items-center gap-3">
              <Timer size={18} className="text-emerald-500" /> Nouvelles Sessions
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {['Matin', 'Midi', 'Après-Midi', 'Soir'].map((m) => (
                <button
                  key={m}
                  disabled={isCreating || !!currentTirage}
                  onClick={() => preparerTirage(m)}
                  className="py-4 bg-slate-950 border border-white/5 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-emerald-500 hover:text-black transition-all disabled:opacity-10"
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* SESSION ACTIVE */}
          <div className="bg-slate-900 border border-emerald-500/10 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
            {currentTirage ? (
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="bg-emerald-500 text-black text-[8px] font-black px-2 py-1 rounded-md uppercase">En cours</span>
                    <h3 className="text-2xl font-black italic mt-2 uppercase">{currentTirage.moment}</h3>
                  </div>
                  <Trophy size={32} className="text-emerald-500 opacity-20" />
                </div>

                <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                  <p className="text-[8px] text-slate-500 font-black uppercase mb-2 text-center">Chiffre Gagnant Programmé</p>
                  <p className="text-4xl text-center font-black text-emerald-500 italic">{currentTirage.chiffre_gagnant}</p>
                </div>

                <button
                  disabled={isClosing}
                  onClick={cloturerSession}
                  className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-500 transition-all flex items-center justify-center gap-2"
                >
                  {isClosing ? <Loader2 className="animate-spin" /> : <ShieldCheck size={16} />}
                  CLÔTURER ET PAYER
                </button>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center py-10 opacity-20">
                <Dices size={48} />
                <p className="text-[10px] font-black uppercase mt-4">Aucun tirage actif</p>
              </div>
            )}
          </div>
        </div>

        {/* APERÇU DE LA GRILLE */}
        {currentTirage && (
          <div className="bg-slate-900/30 p-8 rounded-[2.5rem] border border-white/5">
            <p className="text-[9px] font-black uppercase text-slate-500 mb-6 tracking-widest text-center">Grille visible par les clients</p>
            <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
              {currentTirage.chiffres_visibles.map((c: string, i: number) => (
                <div 
                  key={i} 
                  className={`h-12 rounded-xl flex items-center justify-center font-black text-sm border ${
                    c === currentTirage.chiffre_gagnant 
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500' 
                    : 'border-white/5 bg-slate-950 text-slate-600'
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
