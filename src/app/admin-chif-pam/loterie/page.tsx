"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Dices, Timer, Trophy, Loader2, ShieldCheck, Zap, BarChart3 } from 'lucide-react';

export default function AdminLoterie() {
  const [currentTirage, setCurrentTirage] = useState<any>(null);
  const [multiplicateur, setMultiplicateur] = useState(10);
  const [loading, setLoading] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchActiveSession();
    // Ecoute en temps réel des changements sur les tirages et les mises
    const channel = supabase.channel('admin-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tirages' }, () => fetchActiveSession())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mises' }, () => fetchActiveSession())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchActiveSession = async () => {
    try {
      const { data, error } = await supabase
        .from('tirages')
        .select('*, mises(count)')
        .eq('status', 'ouvert')
        .maybeSingle();
      
      if (error) throw error;
      setCurrentTirage(data);
      if (data) setMultiplicateur(data.multiplicateur);
    } catch (err) {
      console.error("Erreur sync:", err);
    } finally {
      setLoading(false);
    }
  };

  const ouvrirSession = async (moment: string) => {
    // SÉCURITÉ 1 : On bloque si une session est déjà dans l'état local
    if (currentTirage) return alert("Une session est déjà active. Clôturez-la d'abord.");
    
    setIsCreating(true);
    try {
      // SÉCURITÉ 2 : Double vérification côté serveur avant d'insérer
      const { data: check } = await supabase.from('tirages').select('id').eq('status', 'ouvert').maybeSingle();
      if (check) throw new Error("Une session a été ouverte par un autre administrateur entre-temps.");

      const numGagnant = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      const tousLesChiffres = Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, '0'));
      const grille = tousLesChiffres.sort(() => Math.random() - 0.5).slice(0, 20);
      if (!grille.includes(numGagnant)) grille[0] = numGagnant;

      const { data: newSession, error } = await supabase.from('tirages').insert({
        moment,
        chiffre_gagnant: numGagnant,
        chiffres_visibles: grille.sort(() => Math.random() - 0.5),
        multiplicateur: multiplicateur,
        status: 'ouvert'
      }).select().single();

      if (error) throw error;
      
      // MISE À JOUR IMMÉDIATE DE L'INTERFACE
      setCurrentTirage(newSession);
      alert(`Session ${moment} ouverte ! Le chiffre gagnant est le ${numGagnant}`);
      
    } catch (err: any) {
      alert("Erreur : " + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const validerEtPayerGagnants = async () => {
    if (!currentTirage || isClosing) return;
    if (!confirm(`Confirmer le tirage du ${currentTirage.chiffre_gagnant} ? Cette action créditera TOUS les gagnants.`)) return;
    
    setIsClosing(true);
    try {
      // 1. Récupérer toutes les mises gagnantes d'un coup
      const { data: gagnants, error: errG } = await supabase
        .from('mises')
        .select('*')
        .eq('tirage_id', currentTirage.id)
        .eq('chiffre_choisi', currentTirage.chiffre_gagnant)
        .eq('status', 'en_attente');

      if (errG) throw errG;

      // 2. Traitement des paiements (Automatique pour chaque gagnant trouvé)
      if (gagnants && gagnants.length > 0) {
        for (const mise of gagnants) {
          const gain = mise.montant * (mise.multiplicateur_moment || currentTirage.multiplicateur);
          
          // Mise à jour Solde + Mise à jour Statut Mise + Log Transaction
          await supabase.rpc('increment_balance', { user_id: mise.user_id, amount: gain });
          await supabase.from('mises').update({ status: 'gagné', gain_reel: gain }).eq('id', mise.id);
          await supabase.from('transactions').insert({
            user_id: mise.user_id,
            amount: gain,
            type: 'gain',
            status: 'valide',
            admin_note: `Gain Tirage ${currentTirage.moment} (${currentTirage.chiffre_gagnant})`
          });
        }
      }

      // 3. Marquer les autres mises comme perdues
      await supabase.from('mises')
        .update({ status: 'perdu', gain_reel: 0 })
        .eq('tirage_id', currentTirage.id)
        .eq('status', 'en_attente');

      // 4. Clôturer la session
      await supabase.from('tirages').update({ status: 'termine' }).eq('id', currentTirage.id);
      
      alert("Succès : Les gagnants ont été crédités et la session est fermée.");
      setCurrentTirage(null);
    } catch (err: any) {
      alert("Erreur lors du paiement : " + err.message);
    } finally {
      setIsClosing(false);
      fetchActiveSession();
    }
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={40} /></div>;

  return (
    <div className="min-h-screen bg-[#020617] p-6 text-white font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* HEADER STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-slate-900/40 p-6 rounded-[2rem] border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20"><Zap className="text-slate-950" /></div>
              <div>
                <h1 className="text-xl font-black uppercase italic tracking-tighter">Loterie Control</h1>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Administration des gains</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[8px] text-slate-500 font-black uppercase block mb-1">Multiplicateur</span>
              <input type="number" value={multiplicateur} onChange={(e) => setMultiplicateur(Number(e.target.value))} className="bg-black/50 border border-white/10 rounded-lg px-3 py-1 text-emerald-500 font-black text-lg outline-none w-16 text-center" />
            </div>
          </div>
          
          <div className="bg-slate-900/40 p-6 rounded-[2rem] border border-white/5 flex items-center justify-around">
             <div className="text-center">
               <p className="text-[8px] text-slate-500 font-black uppercase">Mises en cours</p>
               <p className="text-2xl font-black text-white">{currentTirage?.mises?.[0]?.count || 0}</p>
             </div>
             <BarChart3 className="text-emerald-500 opacity-20" size={32} />
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* COLONNE GAUCHE : SESSIONS */}
          <div className="space-y-4">
            <div className="bg-slate-900/40 p-6 rounded-[2.5rem] border border-white/5">
              <h2 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-6 flex items-center gap-2"><Timer size={14}/> Sessions disponibles</h2>
              <div className="flex flex-col gap-3">
                {['Matin', 'Midi', 'Après-Midi', 'Soir'].map((m) => {
                  const isActive = currentTirage?.moment === m;
                  return (
                    <button
                      key={m}
                      disabled={isCreating || !!currentTirage}
                      onClick={() => ouvrirSession(m)}
                      className={`py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border ${
                        isActive ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-slate-950 text-white border-white/5 hover:border-emerald-500/50 disabled:opacity-20'
                      }`}
                    >
                      {isActive ? 'Session Active' : m}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* COLONNE DROITE : MONITORING & VALIDATION */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900 p-10 rounded-[3rem] border border-emerald-500/10 shadow-2xl h-full flex flex-col justify-center relative overflow-hidden">
              {currentTirage ? (
                <div className="space-y-10 text-center">
                   <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest animate-pulse">
                     Live: {currentTirage.moment}
                   </div>
                   
                   <div>
                     <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] mb-4">Chiffre Gagnant Programmé</p>
                     <h3 className="text-[10rem] leading-none font-black italic text-white tracking-tighter drop-shadow-2xl">
                       {currentTirage.chiffre_gagnant}
                     </h3>
                   </div>

                   <button
                    disabled={isClosing}
                    onClick={validerEtPayerGagnants}
                    className="w-full py-6 bg-white text-slate-950 rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] hover:bg-emerald-500 transition-all flex items-center justify-center gap-3 shadow-2xl active:scale-[0.98]"
                   >
                    {isClosing ? <Loader2 className="animate-spin" /> : <ShieldCheck size={20} />}
                    {isClosing ? "Paiement en cours..." : "Valider et Payer les gagnants"}
                   </button>
                </div>
              ) : (
                <div className="text-center py-20 opacity-20">
                  <Dices size={80} className="mx-auto mb-6 text-slate-500" />
                  <p className="text-xs font-black uppercase tracking-[0.5em]">Attente d'ouverture de session</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

