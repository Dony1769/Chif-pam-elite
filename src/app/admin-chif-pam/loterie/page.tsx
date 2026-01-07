"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Dices, Timer, Trophy, Loader2, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AdminLoterie() {
  const [currentTirage, setCurrentTirage] = useState<any>(null);
  const [multiplicateur, setMultiplicateur] = useState(10);
  const [loading, setLoading] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchActiveSession();
    const channel = supabase.channel('admin-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tirages' }, () => fetchActiveSession())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchActiveSession = async () => {
    try {
      const { data, error } = await supabase
        .from('tirages')
        .select('*')
        .eq('status', 'ouvert')
        .maybeSingle();
      
      if (error) throw error;
      setCurrentTirage(data);
      if (data) setMultiplicateur(data.multiplicateur);
    } catch (err) {
      console.error("Erreur fetch session:", err);
    } finally {
      setLoading(false);
    }
  };

  const preparerTirage = async (moment: string) => {
    if (currentTirage) {
      alert(`Une session est déjà active (${currentTirage.moment}). Veuillez la clôturer d'abord.`);
      return;
    }
    
    setIsCreating(true);
    try {
      // Génération du "Rideau de Fumée" (20 chiffres aléatoires entre 00 et 99)
      const chiffres = Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, '0'));
      const selection = chiffres.sort(() => Math.random() - 0.5).slice(0, 20);
      const gagnant = selection[Math.floor(Math.random() * selection.length)];

      const { error } = await supabase.from('tirages').insert({
        moment: moment,
        chiffre_gagnant: gagnant,
        chiffres_visibles: selection,
        multiplicateur: multiplicateur,
        status: 'ouvert'
      });

      if (error) throw error;

      alert(`Session de ${moment} créée avec succès.`);
      await fetchActiveSession();
    } catch (err: any) {
      alert("ERREUR CRÉATION: " + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const cloturerSession = async () => {
    if (!currentTirage || isClosing) return;
    if (!confirm("Attention : Cette action va payer les gagnants et archiver la session. Continuer ?")) return;
    
    setIsClosing(true);
    try {
      // 1. Récupérer les mises en attente pour ce tirage
      const { data: mises, error: fetchError } = await supabase
        .from('mises')
        .select('*')
        .eq('tirage_id', currentTirage.id)
        .eq('status', 'en_attente');

      if (fetchError) throw fetchError;

      // 2. Traitement des paiements et mises à jour
      if (mises && mises.length > 0) {
        for (const mise of mises) {
          const estGagnant = mise.chiffre_choisi === currentTirage.chiffre_gagnant;
          const multiplicateurApplique = mise.multiplicateur_moment || currentTirage.multiplicateur;
          const gain = estGagnant ? (mise.montant * multiplicateurApplique) : 0;

          // Mise à jour de la mise
          await supabase.from('mises').update({ 
            status: estGagnant ? 'gagné' : 'perdu', 
            gain_reel: gain 
          }).eq('id', mise.id);

          // Si gagnant : Crédit et Transaction
          if (estGagnant) {
            await supabase.rpc('increment_balance', { 
              user_id: mise.user_id, 
              amount: gain 
            });

            await supabase.from('transactions').insert({
              user_id: mise.user_id,
              amount: gain,
              type: 'gain',
              status: 'valide',
              admin_note: `Gain Tirage ${currentTirage.moment} (${currentTirage.chiffre_gagnant})`
            });
          }
        }
      }

      // 3. Clôturer définitivement le tirage
      const { error: updateError } = await supabase
        .from('tirages')
        .update({ status: 'termine' })
        .eq('id', currentTirage.id);

      if (updateError) throw updateError;
      
      alert("Session clôturée. Tous les comptes ont été mis à jour.");
      setCurrentTirage(null);
      await fetchActiveSession();
    } catch (err: any) {
      alert("Erreur lors de la clôture: " + err.message);
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
    <div className="min-h-screen bg-[#020617] p-4 md:p-8 text-white font-sans">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* HEADER */}
        <div className="flex justify-between items-center bg-slate-900/50 p-6 rounded-[2rem] border border-white/5">
          <div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter">ADMIN<span className="text-emerald-500">CONTROL</span></h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">Gestion des flux de loterie</p>
          </div>
          <div className="text-right">
            <span className="text-[8px] text-slate-500 font-black uppercase block mb-1">Ratio Gain</span>
            <input 
              type="number" 
              value={multiplicateur} 
              onChange={(e) => setMultiplicateur(Number(e.target.value))} 
              className="bg-black/50 border border-white/10 rounded-lg px-3 py-1 text-emerald-500 font-black text-xl outline-none w-20 text-center" 
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* ACTIONS DE CRÉATION */}
          <div className="bg-slate-900/30 p-8 rounded-[2.5rem] border border-white/5 space-y-6">
            <h2 className="font-black uppercase text-xs flex items-center gap-2 text-slate-400">
              <Timer size={16} className="text-emerald-500"/> Planifier une session
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {['Matin', 'Midi', 'Après-Midi', 'Soir'].map(m => (
                <button 
                  key={m} 
                  onClick={() => preparerTirage(m)} 
                  disabled={isCreating || !!currentTirage} 
                  className="py-5 bg-slate-950 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-500 hover:text-black transition-all disabled:opacity-10 border border-white/5"
                >
                  {isCreating ? 'Ouverture...' : m}
                </button>
              ))}
            </div>
          </div>

          {/* MONITORING LIVE */}
          <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-emerald-500/10 shadow-2xl relative overflow-hidden">
            {currentTirage ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-black italic uppercase text-emerald-500 tracking-tighter">{currentTirage.moment}</h3>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                    <span className="text-[9px] font-black uppercase text-emerald-500">Live</span>
                  </div>
                </div>
                <div className="bg-black/60 p-6 rounded-2xl text-center border border-white/5 shadow-inner">
                  <p className="text-[8px] text-slate-500 font-black uppercase mb-2">Résultat Programmé</p>
                  <p className="text-6xl font-black italic text-white tracking-tighter">{currentTirage.chiffre_gagnant}</p>
                </div>
                <button 
                  onClick={cloturerSession} 
                  disabled={isClosing} 
                  className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"
                >
                  {isClosing ? <Loader2 className="animate-spin" /> : <ShieldCheck size={18} />} 
                  VALIDER LES RÉSULTATS
                </button>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center py-10 opacity-20">
                <Dices size={54} className="mb-4 text-slate-400" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">En attente de session</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
