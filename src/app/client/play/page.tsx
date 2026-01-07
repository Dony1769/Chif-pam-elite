"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Zap, Loader2, CheckCircle2 } from 'lucide-react';

export default function PlayZone() {
  const [session, setSession] = useState<any>(null);
  const [userMises, setUserMises] = useState<string[]>([]); // Chiffres déjà misés
  const [selected, setSelected] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [isBetting, setIsBetting] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    init();
    // Ecoute en temps réel des changements de tirages
    const channel = supabase.channel('tirage-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tirages' }, () => init())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const init = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    // 1. Récupération du Profil (Solde à jour)
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
    setUser(profile);

    // 2. Récupération de la Session Active
    const { data: tirage } = await supabase.from('tirages').select('*').eq('status', 'ouvert').maybeSingle();
    setSession(tirage);

    // 3. Récupération des chiffres déjà joués pour les griser
    if (tirage) {
      const { data: existingMises } = await supabase
        .from('mises')
        .select('chiffre_choisi')
        .eq('user_id', authUser.id)
        .eq('tirage_id', tirage.id);
      
      setUserMises(existingMises?.map(m => m.chiffre_choisi) || []);
    }
  };

  const handleBet = async () => {
    if (!selected || !amount || !session || !user) return;
    
    const betVal = parseFloat(amount);

    // Sécurité Client
    if (userMises.includes(selected)) return alert("Vous avez déjà misé sur ce chiffre !");
    if (betVal > user.balance) return alert("Solde insuffisant !");
    if (betVal < 10) return alert("Mise minimale : 10 HTG");

    setIsBetting(true);
    try {
      // ETAPE 1 : Déduction du solde côté Serveur (SQL RPC)
      // On utilise le SECURITY DEFINER configuré précédemment
      const { error: rpcError } = await supabase.rpc('increment_balance', { 
        user_id: user.id, 
        amount: -betVal 
      });

      if (rpcError) throw new Error("Erreur de validation : Solde insuffisant sur le serveur.");

      // ETAPE 2 : Insertion de la Mise
      const { error: miseError } = await supabase.from('mises').insert([{
        user_id: user.id,
        tirage_id: session.id,
        chiffre_choisi: selected,
        montant: betVal,
        status: 'en_attente'
      }]);

      if (miseError) throw miseError;

      // ETAPE 3 : Création de l'historique dans la table transactions
      await supabase.from('transactions').insert([{
        user_id: user.id,
        amount: betVal,
        type: 'mise',
        status: 'valide',
        admin_note: `Mise sur le chiffre ${selected} (Session ${session.moment})`
      }]);

      alert("Mise confirmée ! Votre solde a été mis à jour.");
      
      // Réinitialisation de l'interface
      setAmount('');
      setSelected(null);
      await init(); // Recharge les données pour verrouiller le chiffre joué

    } catch (err: any) {
      alert(err.message || "Une erreur est survenue lors de la mise.");
      console.error("Détails erreur:", err);
    } finally {
      setIsBetting(false);
    }
  };

  if (!session) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#020617] text-slate-500">
      <Loader2 className="animate-spin mb-4 text-emerald-500" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em]">En attente d'une nouvelle session...</p>
    </div>
  );

  return (
    <div className="p-4 space-y-8 pb-32 max-w-md mx-auto min-h-screen bg-[#020617] animate-in fade-in duration-500">
      {/* HEADER SESSION */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 px-4 py-1 rounded-full border border-emerald-500/20">
          <Zap size={12} className="text-emerald-500 animate-pulse" />
          <span className="text-[9px] font-black uppercase text-emerald-500 tracking-widest">
            Session {session.moment} • x{session.multiplicateur}
          </span>
        </div>
        <h2 className="text-2xl font-black italic uppercase text-white tracking-tighter">Rideau de <span className="text-emerald-500">Fumée</span></h2>
      </div>

      {/* GRILLE DES CHIFFRES */}
      <div className="grid grid-cols-5 gap-3">
        {session.chiffres_visibles.map((num: string) => {
          const isAlreadyPlayed = userMises.includes(num);
          return (
            <button
              key={num}
              disabled={isAlreadyPlayed || isBetting}
              onClick={() => setSelected(num)}
              className={`h-14 rounded-xl font-black text-xl transition-all border relative flex items-center justify-center ${
                isAlreadyPlayed 
                ? 'bg-slate-950 border-white/5 text-slate-800' 
                : selected === num 
                ? 'bg-emerald-500 border-emerald-400 text-slate-950 scale-110 shadow-lg shadow-emerald-500/30' 
                : 'bg-slate-900 border-white/5 text-slate-400 hover:border-emerald-500/30'
              }`}
            >
              {num}
              {isAlreadyPlayed && (
                <CheckCircle2 className="absolute -top-1 -right-1 text-emerald-500 bg-[#020617] rounded-full" size={14} />
              )}
            </button>
          );
        })}
      </div>

      {/* CLAVIER ET VALIDATION */}
      <div className="bg-slate-900/60 p-6 rounded-[2.5rem] border border-white/10 backdrop-blur-xl shadow-2xl">
        <div className="flex justify-between items-center mb-6 px-2">
           <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Montant de mise</span>
           <div className="flex items-center gap-1">
              <span className="text-2xl font-black text-emerald-500 italic">{amount || '0'}</span>
              <span className="text-[10px] font-bold text-slate-600">HTG</span>
           </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2 mb-6">
          {['1','2','3','4','5','6','7','8','9','0','00','C'].map(btn => (
            <button
              key={btn}
              disabled={isBetting}
              onClick={() => btn === 'C' ? setAmount('') : setAmount(prev => prev + btn)}
              className="h-12 rounded-xl bg-white/5 text-white hover:bg-white/10 font-black transition-all active:scale-90"
            >
              {btn}
            </button>
          ))}
        </div>

        <button
          disabled={!selected || !amount || isBetting}
          onClick={handleBet}
          className="w-full py-5 bg-emerald-500 text-slate-950 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-lg shadow-emerald-500/20 disabled:opacity-20 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          {isBetting ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              Traitement Sécurisé...
            </>
          ) : 'Placer mon billet'}
        </button>
      </div>

      {/* INFO SOLDE RAPIDE */}
      <div className="text-center">
        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
          Ton solde actuel : <span className="text-slate-400">{user?.balance?.toLocaleString()} HTG</span>
        </p>
      </div>
    </div>
  );
}
