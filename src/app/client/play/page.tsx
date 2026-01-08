"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Loader2, 
  Ticket, 
  Zap, 
  Wallet, 
  Delete, 
  CheckCircle2,
  AlertCircle 
} from 'lucide-react';

// --- 1. LES INTERFACES (PLACTÉES AVANT LE COMPOSANT) ---
interface Tirage {
  id: string;
  moment: string;
  status: 'ouvert' | 'termine';
  chiffre_gagnant: string;
  chiffres_visibles: string[]; 
  multiplicateur: number;
}

interface Mise {
  id: string;
  chiffre_choisi: string;
  montant: number;
  status: string;
}

export default function PlayZone() {
  // --- 2. LES STATES TYPÉS (REMPLACEMENT DES ANY) ---
  const [session, setSession] = useState<Tirage | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [montant, setMontant] = useState(""); 
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastTicket, setLastTicket] = useState<Mise | null>(null);

  // 1. SYNC DONNÉES UTILISATEUR ET SESSION
  const syncData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Récupérer Solde
      const { data: profile } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', user.id)
        .single();
      if (profile) setBalance(profile.balance);

      // Récupérer Session Active (Optimisé pour éviter l'erreur multiple)
      const { data: tirage } = await supabase
        .from('tirages')
        .select('*')
        .eq('status', 'ouvert')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      setSession(tirage);
    } catch (err) {
      console.error("Erreur de synchronisation client:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    syncData();

    const channel = supabase.channel('client-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tirages' }, () => syncData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => syncData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [syncData]);

  // 2. LOGIQUE DU CLAVIER NUMÉRIQUE
  const addDigit = (d: string) => {
    if (montant.length < 6) setMontant(prev => prev + d);
  };
  const clearMontant = () => setMontant("");
  const deleteLast = () => setMontant(prev => prev.slice(0, -1));

  // 3. ENREGISTREMENT DE LA MISE
  const placerMise = async () => {
    const montantNum = parseInt(montant);
    
    if (!selectedNumber || isNaN(montantNum) || montantNum <= 0 || !session) {
      return alert("Veuillez choisir un chiffre et un montant valide.");
    }
    if (montantNum > balance) {
      return alert("Solde insuffisant pour cette mise.");
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session utilisateur expirée");

      // A. Insérer la mise
      const { data: mise, error: miseError } = await supabase
        .from('mises')
        .insert({
          user_id: user.id,
          tirage_id: session.id,
          chiffre_choisi: selectedNumber,
          montant: montantNum,
          multiplicateur_moment: session.multiplicateur,
          status: 'en_attente'
        })
        .select()
        .single();

      if (miseError) throw miseError;

      // B. Débiter le solde via RPC
      const { error: rpcError } = await supabase.rpc('increment_balance', {
        user_id: user.id,
        amount: -montantNum
      });

      if (rpcError) throw rpcError;

      setLastTicket(mise);
      setMontant("");
      setSelectedNumber(null);
      syncData(); 
      
      setTimeout(() => setLastTicket(null), 5000); 
    } catch (err: any) {
      alert("Erreur lors de la mise : " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <Loader2 className="animate-spin text-emerald-500" size={32} />
    </div>
  );

  return (
    <main className="min-h-screen bg-[#020617] text-white p-4 pb-32 font-black italic uppercase tracking-tighter">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* HEADER SOLDE */}
        <div className="bg-slate-900/40 p-5 rounded-4xl border border-white/5 flex justify-between items-center shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
              <Wallet className="text-emerald-500" size={20} />
            </div>
            <div>
              <p className="text-[8px] text-slate-500 not-italic font-bold tracking-widest">Mon Portefeuille</p>
              <p className="text-lg leading-none">{balance.toLocaleString()} <span className="text-[10px] text-emerald-500">HTG</span></p>
            </div>
          </div>
          {session && (
            <div className="bg-emerald-500 text-slate-950 px-4 py-1.5 rounded-full text-[9px] shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse">
              LIVE: {session.moment}
            </div>
          )}
        </div>

        {session ? (
          <>
            <div className="space-y-4">
              <p className="text-[10px] text-slate-500 text-center tracking-[0.3em]">Sélectionnez votre chiffre</p>
              <div className="grid grid-cols-5 gap-3">
                {session.chiffres_visibles?.map((num: string) => (
                  <button
                    key={num}
                    onClick={() => setSelectedNumber(num)}
                    className={`h-14 rounded-2xl border-2 transition-all flex items-center justify-center text-xl ${
                      selectedNumber === num 
                      ? 'bg-emerald-500 border-emerald-400 text-slate-950 scale-110 shadow-lg shadow-emerald-500/20' 
                      : 'bg-slate-900 border-white/5 hover:border-white/20'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 p-6 rounded-[2.5rem] border border-white/5 space-y-6">
              <div className="bg-black/40 py-6 rounded-2xl text-center border border-white/5 relative overflow-hidden">
                <p className="text-[8px] text-slate-500 absolute top-2 left-1/2 -translate-x-1/2 tracking-widest">Montant de la mise</p>
                <span className="text-4xl">{montant || "0"}</span>
                <span className="text-emerald-500 ml-2 text-xs">HTG</span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                  <button key={d} onClick={() => addDigit(d)} className="h-14 bg-slate-950 rounded-2xl border border-white/5 text-xl active:bg-emerald-500 active:text-black transition-colors">{d}</button>
                ))}
                <button onClick={clearMontant} className="h-14 bg-rose-500/10 text-rose-500 rounded-2xl border border-rose-500/10 text-sm">C</button>
                <button onClick={() => addDigit("0")} className="h-14 bg-slate-950 rounded-2xl border border-white/5 text-xl">0</button>
                <button onClick={deleteLast} className="h-14 bg-slate-950 rounded-2xl border border-white/5 flex items-center justify-center text-slate-500"><Delete size={20}/></button>
              </div>
            </div>

            {lastTicket && (
              <div className="bg-emerald-500 text-slate-950 p-4 rounded-2xl flex items-center gap-3 animate-bounce">
                <CheckCircle2 size={20} />
                <p className="text-[10px]">Billet enregistré : {lastTicket.chiffre_choisi} pour {lastTicket.montant} HTG !</p>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 space-y-6 opacity-30">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center">
              <Zap size={40} className="text-slate-500" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-xs tracking-[0.4em]">En attente</p>
              <p className="text-[10px] not-italic font-bold text-slate-500">L'admin n'a pas encore ouvert de session.</p>
            </div>
          </div>
        )}
      </div>

      {session && (
        <div className="fixed bottom-6 left-6 right-6 max-w-md mx-auto">
          <button
            disabled={!selectedNumber || !montant || isSubmitting}
            onClick={placerMise}
            className="w-full py-6 bg-white text-slate-950 rounded-4xl flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all disabled:opacity-10"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                <Ticket size={22} />
                <span className="tracking-[0.2em] text-xs">Confirmer mon billet</span>
              </>
            )}
          </button>
        </div>
      )}
    </main>
  );
}