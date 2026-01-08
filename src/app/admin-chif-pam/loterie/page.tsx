"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Dices, Loader2, ShieldCheck, Zap, Users, Lock, AlertTriangle
} from 'lucide-react';

export default function AdminLoterie() {
  const [currentTirage, setCurrentTirage] = useState<any>(null);
  const [multiplicateur, setMultiplicateur] = useState(10);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState({ totalMises: 0, totalMontant: 0 });

  // Sécurité pour éviter les boucles de mise à jour
  const isActionInProgress = useRef(false);

  // RÉCUPÉRATION : On cherche s'il y a DEJA une session ouverte par erreur
  const fetchAdminData = useCallback(async () => {
    if (isActionInProgress.current) return;

    try {
      const { data: tirage, error } = await supabase
        .from('tirages')
        .select('*')
        .eq('status', 'ouvert')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      setCurrentTirage(tirage);

      if (tirage) {
        setMultiplicateur(tirage.multiplicateur);
        const { data: mises } = await supabase
          .from('mises')
          .select('montant')
          .eq('tirage_id', tirage.id);
        
        if (mises) {
          const total = mises.reduce((sum, m) => sum + Number(m.montant), 0);
          setStats({ totalMises: mises.length, totalMontant: total });
        }
      }
    } catch (err) {
      console.error("Erreur sync:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
    // On écoute les changements mais on ne déclenche RIEN automatiquement
    const channel = supabase.channel('admin-control')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mises' }, () => fetchAdminData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAdminData]);

  // ACTION 1 : OUVRIR (Seulement sur clic)
  const ouvrirSession = async (moment: string) => {
    // Si currentTirage existe, c'est qu'une session est déjà ouverte dans la DB
    if (currentTirage) {
      alert("Une session est déjà ouverte dans la base de données. Fermez-la d'abord.");
      return;
    }

    setIsProcessing(true);
    isActionInProgress.current = true;

    try {
      const numGagnant = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      const pool = Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, '0'))
        .filter(n => n !== numGagnant)
        .sort(() => Math.random() - 0.5)
        .slice(0, 9);
      const grilleVisible = [...pool, numGagnant].sort(() => Math.random() - 0.5);

      const { data, error } = await supabase.from('tirages').insert([{
        moment: moment,
        chiffre_gagnant: numGagnant,
        chiffres_visibles: grilleVisible,
        multiplicateur: Number(multiplicateur),
        status: 'ouvert'
      }]).select().single();

      if (error) throw error;
      
      // Mise à jour immédiate de l'interface après le clic réussi
      setCurrentTirage(data);
      alert(`Session ${moment} ouverte avec succès !`);
    } catch (err: any) {
      alert("Erreur lors de l'ouverture : " + err.message);
    } finally {
      setIsProcessing(false);
      isActionInProgress.current = false;
    }
  };

  // ACTION 2 : CLÔTURER (Seulement sur clic)
  const cloturerEtPayer = async () => {
    if (!currentTirage || isProcessing) return;
    if (!window.confirm(`Voulez-vous fermer la session et valider le ${currentTirage.chiffre_gagnant} ?`)) return;

    setIsProcessing(true);
    isActionInProgress.current = true;
    const tid = currentTirage.id;

    try {
      // 1. Fermer le tirage
      await supabase.from('tirages').update({ status: 'termine' }).eq('id', tid);

      // 2. Traiter les mises
      const { data: mises } = await supabase.from('mises').select('*').eq('tirage_id', tid).eq('status', 'en_attente');

      if (mises && mises.length > 0) {
        for (const mise of mises) {
          const gagne = mise.chiffre_choisi === currentTirage.chiffre_gagnant;
          const gain = gagne ? (Number(mise.montant) * Number(mise.multiplicateur_moment)) : 0;
          await supabase.from('mises').update({ status: gagne ? 'gagné' : 'perdu', gain_reel: gain }).eq('id', mise.id);
          if (gagne && gain > 0) {
            await supabase.rpc('increment_balance', { user_id: mise.user_id, amount: gain });
          }
        }
      }

      // 3. Reset TOTAL
      setCurrentTirage(null);
      setStats({ totalMises: 0, totalMontant: 0 });
      alert("Session fermée manuellement. Tout est en ordre.");
      
    } catch (err: any) {
      alert("Erreur lors de la clôture : " + err.message);
    } finally {
      setIsProcessing(false);
      isActionInProgress.current = false;
    }
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 font-black italic uppercase">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex justify-between items-center bg-slate-900/40 p-8 rounded-[2.5rem] border border-white/5">
          <div className="flex items-center gap-4">
            <ShieldCheck className="text-emerald-500" size={40} />
            <h1 className="text-2xl tracking-tighter">Panel de Contrôle</h1>
          </div>
          
          <div className="flex items-center gap-4 bg-black/40 p-3 rounded-2xl border border-white/10">
            <span className="text-[10px] text-slate-500">Multiplicateur :</span>
            <input 
              type="number" 
              value={multiplicateur} 
              disabled={!!currentTirage}
              onChange={(e) => setMultiplicateur(Number(e.target.value))}
              className="bg-transparent text-emerald-500 text-xl w-12 outline-none font-bold"
            />
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* GAUCHE : SESSIONS */}
          <div className="bg-slate-900/40 p-6 rounded-4xl border border-white/5 space-y-4">
            <h3 className="text-xs text-slate-500 flex items-center gap-2"><Zap size={14}/> Actions Manuelles</h3>
            {['Matin', 'Midi', 'Après-Midi', 'Soir'].map((m) => (
              <button
                key={m}
                disabled={!!currentTirage || isProcessing}
                onClick={() => ouvrirSession(m)}
                className={`w-full py-5 rounded-2xl border transition-all ${
                  currentTirage?.moment === m 
                  ? 'bg-emerald-500 text-black border-emerald-400' 
                  : 'bg-slate-950 border-white/5 hover:border-emerald-500/50 disabled:opacity-20'
                }`}
              >
                Ouvrir {m}
              </button>
            ))}
          </div>

          {/* DROITE : AFFICHAGE & CLÔTURE */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900 p-10 rounded-[3rem] border border-white/5 min-h-100 flex flex-col items-center justify-center relative">
              {currentTirage ? (
                <div className="text-center space-y-8 w-full">
                  <div className="bg-amber-500/10 text-amber-500 px-6 py-2 rounded-full border border-amber-500/20 inline-flex items-center gap-2">
                    <Lock size={16} /> <span>Session {currentTirage.moment} Active</span>
                  </div>
                  
                  <div>
                    <p className="text-emerald-500 text-xs tracking-widest mb-2">Chiffre Gagnant pour ce tirage</p>
                    <h2 className="text-[12rem] leading-none">{currentTirage.chiffre_gagnant}</h2>
                  </div>

                  <div className="grid grid-cols-2 gap-4 w-full max-w-md mx-auto mb-8">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <p className="text-[10px] text-slate-500">Mises</p>
                      <p className="text-2xl">{stats.totalMises}</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <p className="text-[10px] text-slate-500">Total</p>
                      <p className="text-2xl">{stats.totalMontant} HTG</p>
                    </div>
                  </div>

                  <button
                    onClick={cloturerEtPayer}
                    disabled={isProcessing}
                    className="w-full max-w-sm py-6 bg-emerald-500 text-black rounded-2xl font-black hover:bg-white transition-colors flex items-center justify-center gap-3"
                  >
                    {isProcessing ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
                    VALIDER ET FERMER LA SESSION
                  </button>
                </div>
              ) : (
                <div className="text-center opacity-30">
                  <Dices size={80} className="mx-auto mb-4" />
                  <p className="text-sm">Système en attente d'une commande admin.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}