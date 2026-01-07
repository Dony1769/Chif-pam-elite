"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Zap, Loader2, AlertCircle, Wallet, CheckCircle2 } from 'lucide-react';

export default function PlayZone() {
  const [session, setSession] = useState<any>(null);
  const [userMises, setUserMises] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [isBetting, setIsBetting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    init();
    const channel = supabase.channel('tirage-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tirages' }, () => init())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mises' }, () => init())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const init = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
    setUser(profile);

    const { data: tirage } = await supabase.from('tirages').select('*').eq('status', 'ouvert').maybeSingle();
    setSession(tirage);

    if (tirage) {
      const { data: past } = await supabase.from('mises')
        .select('chiffre_choisi')
        .eq('tirage_id', tirage.id)
        .eq('user_id', authUser.id);
      setUserMises(past?.map(m => m.chiffre_choisi) || []);
    }
  };

  const handleBet = async () => {
    const betAmt = Number(amount);
    if (!selected || betAmt <= 0 || !session) return;
    
    if (userMises.includes(selected)) {
      setError("Vous avez déjà parié sur ce chiffre.");
      return;
    }
    if (betAmt > (user?.balance || 0)) {
      setError("Solde insuffisant.");
      return;
    }

    setIsBetting(true);
    setError(null);

    try {
      // 1. DÉBIT DU SOLDE
      const { error: dError } = await supabase.rpc('increment_balance', { 
        user_id: user.id, 
        amount: -betAmt 
      });
      if (dError) throw new Error(`ERREUR SOLDE: ${dError.message}`);

      // 2. INSERTION AVEC GAIN POTENTIEL (Correction Erreur 23502)
      const multiplicateurActuel = session.multiplicateur || 10;
      const { error: mError } = await supabase.from('mises').insert({
        user_id: user.id,
        tirage_id: session.id,
        chiffre_choisi: selected,
        montant: betAmt,
        status: 'en_attente',
        multiplicateur_moment: multiplicateurActuel,
        gain_potentiel: betAmt * multiplicateurActuel
      });

      if (mError) {
        // REMBOURSEMENT AUTOMATIQUE EN CAS D'ÉCHEC DB
        await supabase.rpc('increment_balance', { user_id: user.id, amount: betAmt });
        throw new Error(`DB_ERROR: ${mError.code} - ${mError.message}`);
      }

      // 3. ENREGISTREMENT TRANSACTION
      await supabase.from('transactions').insert({
        user_id: user.id,
        amount: betAmt,
        type: 'mise',
        status: 'valide',
        admin_note: `Mise sur le ${selected} (Session: ${session.moment})`
      });

      alert("🎉 Billet validé avec succès !");
      setSelected(null);
      setAmount('');
      init();

    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsBetting(false);
    }
  };

  if (!session) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-center">
      <Zap size={48} className="text-slate-800 mb-4 animate-pulse" />
      <p className="text-slate-500 font-black uppercase text-xs tracking-widest">Attente d'une nouvelle session...</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#020617] p-6 text-white font-sans">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* EN-TÊTE PROFIL & SOLDE */}
        <div className="bg-slate-900 p-6 rounded-[2rem] border border-white/5 flex justify-between items-center shadow-xl">
          <div>
            <h1 className="font-black italic text-xl uppercase tracking-tighter">CHIF<span className="text-emerald-500">PAM</span></h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase">{session.moment}</p>
          </div>
          <div className="text-right">
            <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Mon Solde</p>
            <p className="text-emerald-400 font-black italic text-lg">{user?.balance?.toLocaleString()} HTG</p>
          </div>
        </div>

        {/* GRILLE DE SÉLECTION */}
        <div className="grid grid-cols-5 gap-2">
          {session.chiffres_visibles.map((n: string) => {
            const isPlayed = userMises.includes(n);
            const isSelected = selected === n;
            return (
              <button
                key={n}
                disabled={isPlayed || isBetting}
                onClick={() => setSelected(n)}
                className={`h-12 rounded-xl font-black text-xs border transition-all ${
                  isPlayed ? 'opacity-10 bg-black border-transparent' :
                  isSelected ? 'bg-emerald-500 text-slate-950 border-emerald-400 scale-110 shadow-lg shadow-emerald-500/20' : 
                  'bg-slate-900 border-white/5 text-slate-400 hover:bg-slate-800'
                }`}
              >
                {n}
              </button>
            );
          })}
        </div>

        {/* ZONE DE MISE & CLAVIER */}
        <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-white/5 space-y-6 shadow-2xl">
          <div className="bg-black/40 p-5 rounded-2xl text-center border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/20"></div>
            <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Montant du billet</p>
            <p className="text-4xl font-black italic text-white">{amount || '0'} <span className="text-xs text-emerald-500">HTG</span></p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[1,2,3,4,5,6,7,8,9,0,'00','C'].map(b => (
              <button 
                key={b} 
                onClick={() => b === 'C' ? setAmount('') : setAmount(a => a.length < 7 ? a + b : a)} 
                className="h-14 bg-slate-950 rounded-2xl font-black border border-white/5 active:bg-emerald-500 active:text-slate-950 transition-all text-lg"
              >
                {b}
              </button>
            ))}
          </div>

          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 font-mono text-[10px] flex items-center gap-3">
              <AlertCircle size={14} />
              <span className="break-all">{error}</span>
            </div>
          )}

          <button
            disabled={!selected || !amount || isBetting}
            onClick={handleBet}
            className="w-full py-6 bg-emerald-500 text-slate-950 rounded-[2rem] font-black uppercase text-[12px] tracking-widest shadow-lg shadow-emerald-500/30 disabled:opacity-20 transition-all flex items-center justify-center gap-3"
          >
            {isBetting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
            {isBetting ? "Traitement..." : "Confirmer mon billet"}
          </button>
        </div>

        <div className="text-center">
            <p className="text-[9px] text-slate-600 font-black uppercase tracking-[0.3em]">Sécurisé par Supabase SSL</p>
        </div>
      </div>
    </main>
  );
}
