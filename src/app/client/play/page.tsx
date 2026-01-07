"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Zap, Loader2 } from 'lucide-react';

export default function PlayZone() {
  const [session, setSession] = useState<any>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [isBetting, setIsBetting] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetchSession();
    fetchUser();
    
    const channel = supabase.channel('tirage-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tirages' }, () => fetchSession())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const { data } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
      setUser(data);
    }
  };

  const fetchSession = async () => {
    const { data } = await supabase.from('tirages').select('*').eq('status', 'ouvert').maybeSingle();
    setSession(data);
  };

  const handleBet = async () => {
    if (!selected || !amount || !session || !user) return;
    const betVal = Number(amount);
    
    if (betVal > user.balance) return alert("Solde insuffisant !");
    if (betVal < 10) return alert("Minimum 10 HTG");

    setIsBetting(true);
    try {
      // 1. Déduire le solde via RPC
      await supabase.rpc('increment_balance', { user_id: user.id, amount: -betVal });
      
      // 2. Créer la mise
      await supabase.from('mises').insert([{
        user_id: user.id,
        tirage_id: session.id,
        chiffre_choisi: selected,
        montant: betVal,
        gain_potentiel: betVal * session.multiplicateur
      }]);

      // 3. Créer une transaction pour l'historique
      await supabase.from('transactions').insert([{
        user_id: user.id,
        amount: -betVal,
        type: 'mise',
        status: 'valide',
        admin_note: `Mise sur le chiffre ${selected}`
      }]);

      alert(`Mise validée sur le ${selected} !`);
      setAmount('');
      setSelected(null);
      fetchUser();
    } catch (err) {
      alert("Erreur lors de la mise.");
    } finally {
      setIsBetting(false);
    }
  };

  // ... (Garder ton JSX de clavier et design qui est très beau) ...
}
