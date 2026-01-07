"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, ShieldCheck, Zap, Dices, Timer } from 'lucide-react';

export default function AdminLoterie() {
  const [currentTirage, setCurrentTirage] = useState<any>(null);
  const [multiplicateur, setMultiplicateur] = useState(10);
  const [loading, setLoading] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // RÉCUPÉRATION SOLIDE DE LA SESSION
  const fetchActiveSession = async () => {
    try {
      const { data, error } = await supabase
        .from('tirages')
        .select('*, mises(count)')
        .eq('status', 'ouvert')
        .maybeSingle();
      
      if (error) throw error;
      setCurrentTirage(data || null);
      if (data) setMultiplicateur(data.multiplicateur);
    } catch (err) {
      console.error("Erreur sync:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveSession();
    const channel = supabase.channel('admin-global-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tirages' }, () => fetchActiveSession())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mises' }, () => fetchActiveSession())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const ouvrirSession = async (moment: string) => {
    if (currentTirage) return alert("Veuillez d'abord clôturer la session en cours.");
    setIsCreating(true);

    try {
      const numG = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      const pool = Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, '0'))
        .filter(n => n !== numG).sort(() => Math.random() - 0.5).slice(0, 9);
      const grille = [...pool, numG].sort(() => Math.random() - 0.5);

      const { error } = await supabase.from('tirages').insert({
        moment,
        chiffre_gagnant: numG,
        chiffres_visibles: grille,
        multiplicateur,
        status: 'ouvert'
      });

      if (error) throw error;
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const executerPaiementsEtCloture = async () => {
    if (!currentTirage || isClosing) return;
    if (!confirm(`Valider le chiffre ${currentTirage.chiffre_gagnant} et payer les clients ?`)) return;

    setIsClosing(true);
    try {
      // 1. Récupérer toutes les mises du tirage
      const { data: toutesLesMises } = await supabase
        .from('mises')
        .select('*')
        .eq('tirage_id', currentTirage.id)
        .eq('status', 'en_attente');

      if (toutesLesMises && toutesLesMises.length > 0) {
        for (const m of toutesLesMises) {
          const estGagnant = m.chiffre_choisi === currentTirage.chiffre_gagnant;
          const gain = estGagnant ? (m.montant * (m.multiplicateur_moment || currentTirage.multiplicateur)) : 0;

          // Update mise
          await supabase.from('mises').update({ 
            status: estGagnant ? 'gagné' : 'perdu', 
            gain_reel: gain 
          }).eq('id', m.id);

          if (estGagnant) {
            await supabase.rpc('increment_balance', { user_id: m.user_id, amount: gain });
            await supabase.from('transactions').insert({
              user_id: m.user_id, amount: gain, type: 'gain', status: 'valide',
              admin_note: `Tirage ${currentTirage.moment} Chiffre ${currentTirage.chiffre_gagnant}`
            });
          }
        }
      }

      // 2. Clôturer la session
      await supabase.from('tirages').update({ status: 'termine' }).eq('id', currentTirage.id);
      setCurrentTirage(null);
      alert("Succès ! Session clôturée.");
    } catch (err: any) {
      alert("Erreur fatale: " + err.message);
    } finally {
      setIsClosing(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="min-h-screen bg-[#020617] p-6 text-white font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex justify-between items-center bg-slate-900/40 p-8 rounded-[2.5rem] border border-white/5">
          <div className="flex items-center gap-4">
            <Zap className="text-emerald-500" />
            <h1 className="text-2xl font-black italic">LOTERIE ADMIN</h1>
          </div>
          <div className="text-center">
            <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Multiplicateur par défaut</p>
            <input type="number" value={multiplicateur} onChange={(e) => setMultiplicateur(Number(e.target.value))} className="bg-transparent text-emerald-500 text-2xl font-black outline-none w-16 text-center" />
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* SESSIONS */}
          <div className="space-y-4">
            {['Matin', 'Midi', 'Après-Midi', 'Soir'].map((m) => (
              <button
                key={m}
                disabled={isCreating || !!currentTirage}
                onClick={() => ouvrirSession(m)}
                className={`w-full py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest border transition-all ${currentTirage?.moment === m ? 'bg-emerald-500 border-emerald-500 text-black' : 'bg-slate-950 border-white/5 disabled:opacity-20'}`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* MONITORING */}
          <div className="lg:col-span-2 bg-slate-900 p-10 rounded-[3rem] border border-emerald-500/10 flex flex-col items-center justify-center min-h-[400px]">
            {currentTirage ? (
              <div className="w-full text-center space-y-10">
                <p className="text-emerald-500 font-black text-xs tracking-widest uppercase">Session {currentTirage.moment} Ouverte</p>
                <h2 className="text-[12rem] font-black leading-none italic">{currentTirage.chiffre_gagnant}</h2>
                <button disabled={isClosing} onClick={executerPaiementsEtCloture} className="w-full py-6 bg-white text-black rounded-2xl font-black tracking-widest hover:bg-emerald-500 transition-all">
                  {isClosing ? <Loader2 className="animate-spin mx-auto" /> : "CLÔTURER ET PAYER LES CLIENTS"}
                </button>
              </div>
            ) : (
              <div className="text-center opacity-20 italic font-black uppercase tracking-[0.5em]"><Dices size={64} className="mx-auto mb-4" />Aucune session</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
