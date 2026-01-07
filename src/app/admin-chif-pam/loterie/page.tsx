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
    const { data } = await supabase.from('tirages').select('*').eq('status', 'ouvert').maybeSingle();
    setCurrentTirage(data);
    if (data) setMultiplicateur(data.multiplicateur);
    setLoading(false);
  };

  const preparerTirage = async (moment: string) => {
    console.log("Tentative de création pour:", moment);
    if (currentTirage) return alert(`Une session est déjà active (${currentTirage.moment})`);
    
    setIsCreating(true);
    try {
      // Génération du Rideau de Fumée
      const chiffres = Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, '0'));
      const selection = chiffres.sort(() => Math.random() - 0.5).slice(0, 20);
      const gagnant = selection[Math.floor(Math.random() * selection.length)];

      const { data, error } = await supabase.from('tirages').insert({
        moment: moment,
        chiffre_gagnant: gagnant,
        chiffres_visibles: selection,
        multiplicateur: multiplicateur,
        status: 'ouvert'
      }).select();

      if (error) {
        console.error("Erreur détaillée:", error);
        throw new Error(error.message);
      }

      alert(`Session ${moment} ouverte avec succès !`);
      fetchActiveSession();
    } catch (err: any) {
      alert("ERREUR CRÉATION: " + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const cloturerSession = async () => {
    if (!currentTirage || isClosing) return;
    if (!confirm("Voulez-vous payer les gagnants et fermer la session ?")) return;
    
    setIsClosing(true);
    try {
      const { data: mises } = await supabase.from('mises')
        .select('*')
        .eq('tirage_id', currentTirage.id)
        .eq('status', 'en_attente');

      if (mises && mises.length > 0) {
        for (const mise of mises) {
          const gagne = mise.chiffre_choisi === currentTirage.chiffre_gagnant;
          const gain = gagne ? (mise.montant * (mise.multiplicateur_moment || currentTirage.multiplicateur)) : 0;

          await supabase.from('mises').update({ 
            status: gagne ? 'gagné' : 'perdu', 
            gain_reel: gain 
          }).eq('id', mise.id);

          if (gagne) {
            await supabase.rpc('increment_balance', { user_id: mise.user_id, amount: gain });
            await supabase.from('transactions').insert({
              user_id: mise.user_id,
              amount: gain,
              type: 'gain',
              status: 'valide',
              admin_note: `Gain Tirage ${currentTirage.moment}`
            });
          }
        }
      }

      const { error: closeError } = await supabase.from('tirages')
        .update({ status: 'termine' })
        .eq('id', currentTirage.id);

      if (closeError) throw closeError;
      
      setCurrentTirage(null);
      alert("Session clôturée et paiements effectués !");
    } catch (err: any) {
      alert("Erreur clôture: " + err.message);
    } finally {
      setIsClosing(false);
      fetchActiveSession();
    }
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="min-h-screen bg-[#020617] p-8 text-white font-sans">
      <div className="max-w-4xl mx-auto space-y-10">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-black uppercase italic">ADMIN<span className="text-emerald-500">LOTTO</span></h1>
          <div className="bg-slate-900 p-4 rounded-2xl border border-white/5">
            <span className="text-[8px] text-slate-500 font-black uppercase block mb-1">Multiplicateur</span>
            <input 
              type="number" 
              value={multiplicateur} 
              onChange={(e) => setMultiplicateur(Number(e.target.value))} 
              className="bg-transparent text-emerald-500 font-black text-xl outline-none w-16" 
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* SESSIONS */}
          <div className="bg-slate-900/50 p-8 rounded-[2.5rem] border border-white/5 space-y-6">
            <h2 className="font-black uppercase text-xs flex items-center gap-2 text-slate-400">
              <Timer size={16} className="text-emerald-500"/> Ouvrir une session
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {['Matin', 'Midi', 'Après-Midi', 'Soir'].map(m => (
                <button 
                  key={m} 
                  onClick={() => preparerTirage(m)} 
                  disabled={isCreating || !!currentTirage} 
                  className="py-4 bg-slate-950 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-500 hover:text-black transition-all disabled:opacity-20 border border-white/5"
                >
                  {isCreating ? 'Chargement...' : m}
                </button>
              ))}
            </div>
          </div>

          {/* STATUS LIVE */}
          <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-emerald-500/20 shadow-2xl relative overflow-hidden">
            {currentTirage ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-black italic uppercase text-emerald-500">{currentTirage.moment}</h3>
                  <Trophy className="text-emerald-500 opacity-30" size={30} />
                </div>
                <div className="bg-black/40 p-6 rounded-2xl text-center border border-white/5">
                  <p className="text-[8px] text-slate-500 font-black uppercase mb-1">Chiffre Gagnant Programmé</p>
                  <p className="text-5xl font-black italic">{currentTirage.chiffre_gagnant}</p>
                </div>
                <button 
                  onClick={cloturerSession} 
                  disabled={isClosing} 
                  className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-500 transition-all flex items-center justify-center gap-2"
                >
                  {isClosing ? <Loader2 className="animate-spin" /> : <ShieldCheck size={18} />} 
                  CLÔTURER LA SESSION
                </button>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center py-10 opacity-20">
                <Dices size={48}/>
                <p className="text-[10px] font-black uppercase mt-4">Aucune session active</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
