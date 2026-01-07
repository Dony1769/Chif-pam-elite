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
    
    const gagnant = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    const faux = new Set<string>();
    while(faux.size < 9) {
      const n = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      if (n !== gagnant) faux.add(n);
    }

    const tous = [gagnant, ...Array.from(faux)].sort(() => Math.random() - 0.5);

    const { data, error } = await supabase.from('tirages').insert([{
      moment,
      chiffre_gagnant: gagnant,
      chiffres_visibles: tous,
      multiplicateur: multiplicateur,
      status: 'ouvert'
    }]).select().single();

    if (error) {
      alert("Erreur lors de la création : " + error.message);
    } else {
      setCurrentTirage(data);
    }
  };

  const cloreTirage = async () => {
    if (!currentTirage || !confirm("Voulez-vous clôturer et payer les gagnants ?")) return;
    
    setIsClosing(true);
    try {
      // 1. Fermer le tirage officiellement
      const { error: updateError } = await supabase
        .from('tirages')
        .update({ status: 'ferme' })
        .eq('id', currentTirage.id);

      if (updateError) throw updateError;

      // 2. Déclencher le paiement automatique via SQL
      const { error: rpcError } = await supabase.rpc('distribuer_gains', { 
        p_tirage_id: currentTirage.id, 
        p_chiffre_gagnant: currentTirage.chiffre_gagnant 
      });

      if (rpcError) throw rpcError;

      alert("Succès : Les comptes clients ont été crédités !");
      setCurrentTirage(null);
    } catch (err: any) {
      console.error(err);
      alert("Erreur critique : " + err.message);
    } finally {
      setIsClosing(false);
    }
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      {/* ... (Garder le JSX identique à ton original pour le design) ... */}
    </div>
  );
}
