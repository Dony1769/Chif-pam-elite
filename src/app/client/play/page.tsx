"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Loader2, 
  Ticket, 
  Zap, 
  Wallet, 
  Delete, 
  CheckCircle2,
  ChevronLeft,
  Lock // Ajouté pour le feedback visuel
} from 'lucide-react';

const LogoSmall = () => (
  <svg viewBox="0 0 100 100" className="w-8 h-8 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M75 35.5C71.5 28.5 64.2 24 56 24C41.6 24 30 35.6 30 50C30 64.4 41.6 76 56 76C66.5 76 75.5 69.8 79.5 61" stroke="#10B981" strokeWidth="10" strokeLinecap="round" />
    <path d="M55 45L76 24M76 24H58M76 24V42" stroke="#10B981" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

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
  const router = useRouter();
  const [session, setSession] = useState<Tirage | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [montant, setMontant] = useState(""); 
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastTicket, setLastTicket] = useState<Mise | null>(null);
  
  // --- NOUVEAU SYSTÈME DE SÉCURITÉ : LISTE DES CHIFFRES DÉJÀ JOUÉS ---
  const [alreadyPlayedNumbers, setAlreadyPlayedNumbers] = useState<string[]>([]);

  const syncData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', user.id)
        .single();
      if (profile) setBalance(profile.balance);

      const { data: tirage } = await supabase
        .from('tirages')
        .select('*')
        .eq('status', 'ouvert')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      setSession(tirage);

      // --- RÉCUPÉRATION DES MISES DÉJÀ EFFECTUÉES DANS CETTE SESSION ---
      if (tirage) {
        const { data: existingMises } = await supabase
          .from('mises')
          .select('chiffre_choisi')
          .eq('user_id', user.id)
          .eq('tirage_id', tirage.id);
        
        if (existingMises) {
          setAlreadyPlayedNumbers(existingMises.map(m => m.chiffre_choisi));
        }
      }
    } catch (err) {
      console.error("Erreur sync:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    syncData();
    const channel = supabase.channel('play-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tirages' }, () => syncData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [syncData]);

  const addDigit = (d: string) => {
    if (montant.length < 6) setMontant(prev => prev + d);
  };
  const clearMontant = () => setMontant("");
  const deleteLast = () => setMontant(prev => prev.slice(0, -1));

  const placerMise = async () => {
    const montantNum = parseInt(montant);
    if (!selectedNumber || isNaN(montantNum) || montantNum <= 0 || !session) return alert("Sélection invalide.");
    
    // SÉCURITÉ DOUBLE : Vérification avant envoi
    if (alreadyPlayedNumbers.includes(selectedNumber)) {
      return alert("Vous avez déjà une mise sur ce chiffre pour ce tirage.");
    }

    if (montantNum > balance) return alert("Solde insuffisant.");

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expirée");

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
        .select().single();

      if (miseError) throw miseError;

      await supabase.rpc('increment_balance', { user_id: user.id, amount: -montantNum });

      setLastTicket(mise);
      setMontant("");
      setSelectedNumber(null);
      syncData(); 
      setTimeout(() => setLastTicket(null), 4000); 
    } catch (err: any) {
      alert("Erreur : " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-4">
      <div className="animate-bounce"><LogoSmall /></div>
      <Loader2 className="animate-spin text-emerald-500/20" size={24} />
    </div>
  );

  return (
    <main className="min-h-screen bg-[#020617] text-white p-4 pb-32 font-black italic uppercase tracking-tighter overflow-x-hidden">
      <div className="max-w-md mx-auto space-y-6">
        
        <div className="flex items-center justify-between py-2">
          <button onClick={() => router.back()} className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center border border-white/5 active:scale-90 transition-transform">
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <LogoSmall />
            <span className="text-xs tracking-widest">CHIF-PAM</span>
          </div>
          <div className="w-10" />
        </div>

        <div className="bg-slate-900/40 p-5 rounded-[2.5rem] border border-white/5 flex justify-between items-center shadow-2xl backdrop-blur-sm relative overflow-hidden group">
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)]">
              <Wallet className="text-slate-950" size={20} />
            </div>
            <div>
              <p className="text-[7px] text-slate-500 not-italic font-bold tracking-[0.3em]">Disponible</p>
              <p className="text-xl leading-none">{balance.toLocaleString()} <span className="text-[10px] text-emerald-500">HTG</span></p>
            </div>
          </div>
          {session && (
            <div className="bg-emerald-500 text-slate-950 px-3 py-1 rounded-full text-[8px] animate-pulse border border-emerald-400">
              LIVE: {session.moment}
            </div>
          )}
        </div>

        {session ? (
          <>
            <div className="space-y-4">
              <p className="text-[9px] text-slate-500 text-center tracking-[0.4em] opacity-60">Choisissez un chiffre</p>
              <div className="grid grid-cols-5 gap-2.5">
                {session.chiffres_visibles?.map((num: string) => {
                  const isPlayed = alreadyPlayedNumbers.includes(num);
                  return (
                    <button
                      key={num}
                      disabled={isPlayed}
                      onClick={() => setSelectedNumber(num)}
                      className={`h-14 rounded-2xl border-2 transition-all duration-300 flex items-center justify-center text-xl font-black relative overflow-hidden ${
                        selectedNumber === num 
                        ? 'bg-emerald-500 border-emerald-300 text-slate-950 scale-105 shadow-[0_0_25px_rgba(16,185,129,0.4)] z-20' 
                        : isPlayed 
                        ? 'bg-slate-950 border-white/5 text-slate-700 opacity-40 grayscale cursor-not-allowed' 
                        : 'bg-slate-900 border-white/5 hover:border-emerald-500/30 text-white opacity-80'
                      }`}
                    >
                      {isPlayed ? <Lock size={14} className="opacity-50" /> : num}
                      {selectedNumber === num && (
                         <span className="absolute inset-0 bg-white/20 animate-ping rounded-full scale-150 opacity-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-900 p-6 rounded-[3rem] border border-white/5 space-y-6">
              <div className="bg-slate-950 py-7 rounded-3xl text-center border border-white/5 relative">
                <p className="text-[7px] text-slate-600 absolute top-2 left-1/2 -translate-x-1/2 tracking-[0.5em]">Mise actuelle</p>
                <div className="flex items-center justify-center gap-2">
                   <span className={`text-4xl transition-all ${montant ? 'text-white scale-110' : 'text-slate-800'}`}>
                    {montant || "000"}
                  </span>
                  <span className="text-emerald-500 text-[10px] mt-2">HTG</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                  <button key={d} onClick={() => addDigit(d)} className="h-14 bg-slate-950 rounded-2xl border border-white/5 text-xl active:bg-emerald-500 active:text-slate-950 active:scale-90 transition-all">{d}</button>
                ))}
                <button onClick={clearMontant} className="h-14 bg-rose-500/5 text-rose-500 rounded-2xl border border-rose-500/20 text-sm">C</button>
                <button onClick={() => addDigit("0")} className="h-14 bg-slate-950 rounded-2xl border border-white/5 text-xl">0</button>
                <button onClick={deleteLast} className="h-14 bg-slate-950 rounded-2xl border border-white/5 flex items-center justify-center text-slate-500"><Delete size={18}/></button>
              </div>
            </div>

            {lastTicket && (
              <div className="bg-emerald-500 text-slate-950 p-4 rounded-[2rem] flex items-center justify-between animate-in slide-in-from-bottom-5 fade-in duration-300 shadow-[0_15px_30px_rgba(16,185,129,0.3)]">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={24} className="animate-bounce" />
                  <div>
                    <p className="text-[10px] font-black">BILLET CONFIRMÉ !</p>
                    <p className="text-[9px] not-italic opacity-80">Chiffre {lastTicket.chiffre_choisi} • {lastTicket.montant} HTG</p>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 space-y-6">
            <Zap size={40} className="text-emerald-500/20 animate-pulse" />
            <p className="text-xs tracking-[0.5em] text-emerald-500 animate-pulse text-center">Session en attente</p>
          </div>
        )}
      </div>

      {session && (
        <div className="fixed bottom-8 left-6 right-6 max-w-md mx-auto z-50">
          <button
            disabled={!selectedNumber || !montant || isSubmitting || alreadyPlayedNumbers.includes(selectedNumber!)}
            onClick={placerMise}
            className="w-full py-6 bg-white text-slate-950 rounded-[2.5rem] flex items-center justify-center gap-3 shadow-[0_20px_40px_rgba(255,255,255,0.1)] active:scale-95 transition-all disabled:opacity-20 disabled:grayscale overflow-hidden relative group font-black"
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : (
              <>
                <Ticket size={22} />
                <span className="tracking-[0.3em] text-[10px]">VALIDER MON CHIFFRE</span>
              </>
            )}
          </button>
        </div>
      )}
    </main>
  );
}

