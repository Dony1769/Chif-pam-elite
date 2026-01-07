"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, ShieldCheck, Zap, Dices, Timer } from 'lucide-react';

export default function AdminLoterie() {
  const [currentTirage, setCurrentTirage] = useState<any>(null);
  const [multiplicateur, setMultiplicateur] = useState(10);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchActiveSession();
    const channel = supabase.channel('admin_room')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tirages' }, () => fetchActiveSession())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchActiveSession = async () => {
    const { data } = await supabase.from('tirages').select('*, mises(count)').eq('status', 'ouvert').maybeSingle();
    setCurrentTirage(data);
    if (data) setMultiplicateur(data.multiplicateur);
    setLoading(false);
  };

  const ouvrirSession = async (moment: string) => {
    if (currentTirage) return; // Sécurité UI
    setIsProcessing(true);

    const numGagnant = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    // Génération de 10 chiffres (9 faux + 1 gagnant)
    const pool = Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, '0'))
      .filter(n => n !== numGagnant).sort(() => Math.random() - 0.5).slice(0, 9);
    const grille = [...pool, numGagnant].sort(() => Math.random() - 0.5);

    await supabase.from('tirages').insert({
      moment,
      chiffre_gagnant: numGagnant,
      chiffres_visibles: grille,
      multiplicateur,
      status: 'ouvert'
    });
    
    setIsProcessing(false);
  };

  const cloturerEtPayer = async () => {
    if (!currentTirage || isProcessing) return;
    setIsProcessing(true);

    try {
      // 1. Récupérer les gagnants
      const { data: gagnants } = await supabase.from('mises')
        .select('*')
        .eq('tirage_id', currentTirage.id)
        .eq('chiffre_choisi', currentTirage.chiffre_gagnant)
        .eq('status', 'en_attente');

      // 2. Créditer les comptes via RPC
      if (gagnants && gagnants.length > 0) {
        for (const mise of gagnants) {
          const gain = mise.montant * (mise.multiplicateur_moment || currentTirage.multiplicateur);
          await supabase.rpc('increment_balance', { user_id: mise.user_id, amount: gain });
          await supabase.from('transactions').insert({
            user_id: mise.user_id, amount: gain, type: 'gain', status: 'valide',
            admin_note: `Tirage ${currentTirage.moment} - Gagnant`
          });
        }
      }

      // 3. Marquer toutes les mises comme traitées
      await supabase.from('mises').update({ status: 'termine' }).eq('tirage_id', currentTirage.id);
      
      // 4. Fermer la session
      await supabase.from('tirages').update({ status: 'termine' }).eq('id', currentTirage.id);
      
      setCurrentTirage(null);
    } catch (error) {
      console.error(error);
      alert("Erreur lors du paiement");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="min-h-screen bg-[#020617] p-6 text-white font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center bg-slate-900/50 p-6 rounded-3xl border border-white/5">
          <h1 className="text-xl font-black italic uppercase italic">Console <span className="text-emerald-500">Master</span></h1>
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-slate-500 uppercase font-black">Ratio</span>
            <input type="number" value={multiplicateur} onChange={e => setMultiplicateur(Number(e.target.value))} className="w-16 bg-black border border-white/10 rounded-lg p-2 text-center text-emerald-500 font-bold" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-slate-900/40 p-6 rounded-[2rem] border border-white/5 space-y-4">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Sessions</p>
            {['Matin', 'Midi', 'Après-Midi', 'Soir'].map(m => (
              <button key={m} disabled={!!currentTirage || isProcessing} onClick={() => ouvrirSession(m)} className="w-full py-4 rounded-2xl bg-slate-950 border border-white/5 font-black uppercase text-[10px] tracking-widest hover:bg-emerald-500 hover:text-black transition-all disabled:opacity-20">{m}</button>
            ))}
          </div>

          <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-emerald-500/20 flex flex-col items-center justify-center min-h-[300px]">
            {currentTirage ? (
              <div className="w-full text-center space-y-6">
                <div className="text-emerald-500 font-black text-xs uppercase animate-pulse">Session {currentTirage.moment} Active</div>
                <div className="text-8xl font-black italic">{currentTirage.chiffre_gagnant}</div>
                <button onClick={cloturerEtPayer} disabled={isProcessing} className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-500 transition-all flex items-center justify-center gap-2">
                  {isProcessing ? <Loader2 className="animate-spin" /> : <ShieldCheck size={20} />}
                  Valider et Payer
                </button>
              </div>
            ) : (
              <div className="opacity-20 text-center"><Dices size={48}/><p className="mt-4 font-black uppercase text-[10px]">Prêt pour ouverture</p></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
