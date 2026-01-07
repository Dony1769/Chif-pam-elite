"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Zap, Loader2, CheckCircle2, AlertTriangle, Wallet } from 'lucide-react';

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
      const { data: pastMises } = await supabase
        .from('mises')
        .select('chiffre_choisi')
        .eq('tirage_id', tirage.id)
        .eq('user_id', authUser.id);
      setUserMises(pastMises?.map(m => m.chiffre_choisi) || []);
    }
  };

  const handleBet = async () => {
    if (!selected || !amount || Number(amount) <= 0) return;
    if (Number(amount) > user.balance) {
      setError("Solde insuffisant");
      return;
    }

    setIsBetting(true);
    setError(null);

    try {
      // 1. DÉDUCTION DU SOLDE (Sécurisé par RPC)
      const { error: rpcError } = await supabase.rpc('increment_balance', {
        user_id: user.id,
        amount: -Number(amount)
      });

      if (rpcError) throw new Error("Échec de la transaction financière.");

      // 2. ENREGISTREMENT DE LA MISE
      const { error: miseError } = await supabase.from('mises').insert([{
        user_id: user.id,
        tirage_id: session.id,
        chiffre_choisi: selected,
        montant: Number(amount),
        status: 'en_attente',
        multiplicateur_moment: session.multiplicateur
      }]);

      if (miseError) {
        // ACTION CRITIQUE : Rembourser le joueur si l'insertion de la mise échoue
        await supabase.rpc('increment_balance', { user_id: user.id, amount: Number(amount) });
        throw new Error("Erreur technique : Mise annulée et remboursée.");
      }

      // 3. ENREGISTREMENT DANS LES TRANSACTIONS POUR L'HISTORIQUE
      await supabase.from('transactions').insert([{
        user_id: user.id,
        amount: Number(amount),
        type: 'mise',
        status: 'valide',
        admin_note: `Mise sur le chiffre ${selected}`
      }]);

      // Succès
      setSelected(null);
      setAmount('');
      init(); // Rafraîchir le solde et les chiffres misés
      alert("Billet validé avec succès ! Bonne chance.");

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsBetting(false);
    }
  };

  if (!session) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-center">
      <Zap size={48} className="text-slate-800 mb-4" />
      <h2 className="text-white font-black uppercase italic">Aucun tirage en cours</h2>
      <p className="text-slate-500 text-xs mt-2 uppercase tracking-widest">Revenez bientôt pour le prochain impact</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#020617] p-4 pb-32 text-white font-sans">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* HEADER TIRAGE */}
        <div className="bg-slate-900/50 border border-white/5 p-6 rounded-[2.5rem] flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Session {session.moment}</p>
            <h1 className="text-xl font-black italic uppercase">Rideau de Fumée</h1>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold text-slate-500 uppercase">Gain possible</p>
            <p className="text-lg font-black text-emerald-500">x{session.multiplicateur}</p>
          </div>
        </div>

        {/* GRILLE DE CHOIX */}
        <div className="grid grid-cols-5 gap-3">
          {session.chiffres_visibles.map((num: string) => {
            const hasBet = userMises.includes(num);
            const isSelected = selected === num;

            return (
              <button
                key={num}
                disabled={hasBet || isBetting}
                onClick={() => setSelected(num)}
                className={`h-14 rounded-2xl font-black text-sm transition-all relative overflow-hidden ${
                  hasBet ? 'bg-slate-950 text-slate-700 border border-white/5 opacity-50' :
                  isSelected ? 'bg-emerald-500 text-slate-950 scale-110 shadow-lg shadow-emerald-500/20' :
                  'bg-slate-900 text-white border border-white/5 hover:border-emerald-500/30'
                }`}
              >
                {num}
                {hasBet && <CheckCircle2 className="absolute top-1 right-1 text-emerald-500" size={10} />}
              </button>
            );
          })}
        </div>

        {/* ZONE DE MISE */}
        <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-white/5 space-y-6">
           <div className="flex justify-between items-end">
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Montant à miser</p>
              <div className="text-right">
                <p className="text-3xl font-black italic text-white">{amount || '0'} <span className="text-xs not-italic text-slate-600">HTG</span></p>
              </div>
           </div>
           
           <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0, '00', 'C'].map(btn => (
                <button
                  key={btn}
                  onClick={() => btn === 'C' ? setAmount('') : setAmount(prev => (prev.length < 6 ? prev + btn : prev))}
                  className="h-14 rounded-2xl bg-slate-950 text-white font-black hover:bg-emerald-500 hover:text-black transition-all active:scale-90 border border-white/5"
                >
                  {btn}
                </button>
              ))}
           </div>

           {error && (
             <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-500">
               <AlertTriangle size={18} />
               <p className="text-[10px] font-black uppercase">{error}</p>
             </div>
           )}

           <button
             disabled={!selected || !amount || isBetting}
             onClick={handleBet}
             className="w-full py-6 bg-emerald-500 text-slate-950 rounded-3xl font-black uppercase text-[11px] tracking-[0.2em] shadow-lg shadow-emerald-500/20 disabled:opacity-10 transition-all flex items-center justify-center gap-3"
           >
             {isBetting ? <Loader2 className="animate-spin" /> : <Zap size={18} />}
             CONFIRMER LE BILLET
           </button>
        </div>

        <div className="flex items-center justify-center gap-4 text-slate-500">
            <Wallet size={16} />
            <p className="text-[10px] font-black uppercase tracking-widest">Mon Solde: <span className="text-white">{user?.balance?.toLocaleString()} HTG</span></p>
        </div>
      </div>
    </main>
  );
}
