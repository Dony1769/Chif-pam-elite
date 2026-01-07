// Emplacement : /app/admin-chif-pam/loterie/page.tsx
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
    if (currentTirage) return alert("Une session est déjà active !");
    setIsCreating(true);

    try {
      // GÉNÉRATION DU RIDEAU DE FUMÉE (10 chiffres dont le gagnant)
      const numGagnant = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      const pool = Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, '0'))
        .filter(n => n !== numGagnant)
        .sort(() => Math.random() - 0.5)
        .slice(0, 9);
      
      const grilleFinale = [...pool, numGagnant].sort(() => Math.random() - 0.5);

      const { data, error } = await supabase.from('tirages').insert({
        moment,
        chiffre_gagnant: numGagnant,
        chiffres_visibles: grilleFinale, // TRANSMISSION À LA DB
        multiplicateur: multiplicateur,
        status: 'ouvert'
      }).select().single();

      if (error) throw error;
      setCurrentTirage(data); // MISE À JOUR ÉTAT LOCAL IMMÉDIATE
      alert(`Session ${moment} OUVERTE. Chiffre : ${numGagnant}`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const validerEtPayerGagnants = async () => {
    if (!currentTirage || isClosing) return;
    if (!confirm("Voulez-vous clôturer et payer ?")) return;
    
    setIsClosing(true);
    try {
      // 1. Récupération des mises gagnantes
      const { data: gagnants } = await supabase
        .from('mises')
        .select('*')
        .eq('tirage_id', currentTirage.id)
        .eq('chiffre_choisi', currentTirage.chiffre_gagnant)
        .eq('status', 'en_attente');

      // 2. Traitement des gains
      if (gagnants) {
        for (const mise of gagnants) {
          const gain = mise.montant * (mise.multiplicateur_moment || currentTirage.multiplicateur);
          await supabase.rpc('increment_balance', { user_id: mise.user_id, amount: gain });
          await supabase.from('transactions').insert({
            user_id: mise.user_id, amount: gain, type: 'gain', status: 'valide',
            admin_note: `Gain ${currentTirage.moment}`
          });
        }
      }

      // 3. Fermeture
      await supabase.from('mises').update({ status: 'termine' }).eq('tirage_id', currentTirage.id).eq('status', 'en_attente');
      await supabase.from('tirages').update({ status: 'termine' }).eq('id', currentTirage.id);
      
      setCurrentTirage(null);
      alert("Session clôturée avec succès !");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsClosing(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="min-h-screen bg-[#020617] p-6 text-white">
       <div className="max-w-5xl mx-auto space-y-8">
          {/* HEADER AVEC MULTIPLICATEUR */}
          <div className="bg-slate-900/40 p-6 rounded-[2rem] border border-white/5 flex justify-between items-center">
            <h1 className="text-xl font-black uppercase italic italic">Loterie <span className="text-emerald-500">Admin</span></h1>
            <input 
              type="number" value={multiplicateur} 
              onChange={(e) => setMultiplicateur(Number(e.target.value))}
              className="w-20 bg-black p-2 rounded-xl border border-white/10 text-emerald-500 text-center font-bold"
            />
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* BOUTONS SESSIONS */}
            <div className="bg-slate-900/40 p-6 rounded-[2rem] border border-white/5 flex flex-col gap-4">
              {['Matin', 'Midi', 'Après-Midi', 'Soir'].map(m => (
                <button 
                  key={m} 
                  disabled={!!currentTirage || isCreating}
                  onClick={() => ouvrirSession(m)}
                  className="py-4 rounded-xl bg-slate-950 font-black uppercase text-[10px] tracking-widest border border-white/5 hover:bg-emerald-500 hover:text-black transition-all disabled:opacity-20"
                >
                  {m}
                </button>
              ))}
            </div>

            {/* MONITORING LIVE */}
            <div className="lg:col-span-2 bg-slate-900 p-8 rounded-[2.5rem] border border-emerald-500/10 shadow-2xl flex flex-col items-center justify-center min-h-[400px]">
              {currentTirage ? (
                <div className="w-full space-y-8 text-center">
                  <p className="text-emerald-500 font-black uppercase tracking-widest text-[10px]">Session {currentTirage.moment} en cours</p>
                  <h2 className="text-[10rem] font-black leading-none italic">{currentTirage.chiffre_gagnant}</h2>
                  <button 
                    onClick={validerEtPayerGagnants} 
                    className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-500 transition-all"
                  >
                    Valider et Payer
                  </button>
                </div>
              ) : (
                <div className="opacity-20 text-center">
                  <Dices size={64} className="mx-auto mb-4" />
                  <p className="font-black uppercase text-xs tracking-[0.3em]">En attente d'ouverture</p>
                </div>
              )}
            </div>
          </div>
       </div>
    </div>
  );
}
