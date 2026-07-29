"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  ArrowUpCircle, ArrowDownCircle, 
  Clock, Loader2, ChevronLeft, 
  AlertCircle, Wallet, History, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- TYPE STRICT TRANSACTION ---
export type TransactionType = 'deposit' | 'depot' | 'withdrawal' | 'retrait';
export type TransactionStatus = 'pending' | 'approved' | 'rejected';

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  created_at: string;
  admin_note?: string | null;
}

// --- LOGO MINI MÉMOÏSÉ ---
const LogoTiny = React.memo(() => (
  <svg viewBox="0 0 100 100" className="w-6 h-6 drop-shadow-[0_0_5px_rgba(16,185,129,0.4)]" fill="none" aria-hidden="true">
    <path d="M75 35.5C71.5 28.5 64.2 24 56 24C41.6 24 30 35.6 30 50C30 64.4 41.6 76 56 76C66.5 76 75.5 69.8 79.5 61" stroke="#10B981" strokeWidth="12" strokeLinecap="round" />
    <path d="M55 45L76 24M76 24H58M76 24V42" stroke="#10B981" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
));
LogoTiny.displayName = 'LogoTiny';

export default function ClientHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  // Helper pour vérifier si le type est un dépôt
  const isDeposit = (type: TransactionType): boolean => {
    return type === 'deposit' || type === 'depot';
  };

  // Récupération des transactions avec gestion des erreurs
  const fetchHistory = useCallback(async () => {
    try {
      setErrorMessage(null);
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        setErrorMessage("Veuillez vous connecter pour consulter votre historique.");
        return;
      }

      const { data, error } = await supabase
        .from('transactions')
        .select('id, user_id, amount, type, status, created_at, admin_note')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setTransactions((data as Transaction[]) || []);
    } catch (error: any) {
      console.error("Erreur historique:", error);
      setErrorMessage("Impossible de charger votre historique. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Écoute des mises à jour Realtime Supabase
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupSubscription = async () => {
      await fetchHistory();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase.channel(`history-user-${user.id}`)
        .on(
          'postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'transactions',
            filter: `user_id=eq.${user.id}`
          }, 
          () => {
            fetchHistory();
          }
        )
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchHistory]);

  // Formateur de date pour éviter les instanciations réseau/rendu répétitives
  const formatDate = useMemo(() => {
    return (dateString: string) => {
      try {
        return new Date(dateString).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch {
        return dateString;
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center space-y-4">
        <LogoTiny />
        <Loader2 className="animate-spin text-emerald-500" size={32} />
        <p className="text-xs text-slate-400 font-medium">Chargement de votre historique...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans pb-24 selection:bg-emerald-500/30">
      
      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-[#020617]/90 backdrop-blur-xl border-b border-white/5 p-4 flex items-center justify-between">
        <button 
          onClick={() => router.back()} 
          className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center active:scale-90 transition-all hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          aria-label="Retour"
        >
          <ChevronLeft size={20} className="text-emerald-500" />
        </button>

        <h1 className="text-lg font-black italic uppercase tracking-tighter">
          Transactions
        </h1>

        <div className="w-10 h-10 flex items-center justify-center">
          <LogoTiny />
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        
        {/* CARTE RÉSUMÉ */}
        <section className="bg-gradient-to-br from-slate-900 to-slate-950 p-6 rounded-[2rem] border border-white/5 shadow-lg flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-full border border-emerald-500/20 shrink-0">
            <Wallet className="text-emerald-500" size={24} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              Activités Récentes
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Suivez vos dépôts et retraits en temps réel.
            </p>
          </div>
        </section>

        {/* AFFICHAGE ERREUR ÉVENTUELLE */}
        {errorMessage && (
          <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-rose-500 shrink-0" />
              <p className="text-xs text-rose-300 font-medium">{errorMessage}</p>
            </div>
            <button 
              onClick={fetchHistory}
              className="p-1.5 bg-rose-500/20 rounded-lg hover:bg-rose-500/30 transition-colors"
              aria-label="Réessayer"
            >
              <RefreshCw size={14} className="text-rose-300" />
            </button>
          </div>
        )}

        {/* LISTE DES TRANSACTIONS */}
        <section className="space-y-3" aria-label="Liste de transactions">
          {transactions.length === 0 && !errorMessage ? (
            <div className="text-center py-12 opacity-40 flex flex-col items-center justify-center">
              <History size={44} className="mb-3 text-slate-400" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Aucune transaction trouvée
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {transactions.map((t, index) => {
                const deposit = isDeposit(t.type);

                return (
                  <motion.article
                    key={t.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: Math.min(index * 0.04, 0.4) }}
                    className="bg-[#0f172a]/60 p-5 rounded-[1.5rem] border border-white/5 space-y-3 hover:bg-[#0f172a] transition-colors"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-3.5">
                        <div className={`p-3 rounded-2xl shrink-0 ${
                          deposit
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-blue-500/10 text-blue-500'
                        }`}>
                          {deposit ? (
                            <ArrowUpCircle size={20} aria-hidden="true" />
                          ) : (
                            <ArrowDownCircle size={20} aria-hidden="true" />
                          )}
                        </div>

                        <div>
                          <p className="text-sm font-black italic uppercase tracking-wider text-white">
                            {deposit ? 'Dépôt' : 'Retrait'}
                          </p>
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wide mt-0.5">
                            {formatDate(t.created_at)}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className={`text-base sm:text-lg font-black italic tracking-tighter ${
                          deposit ? 'text-white' : 'text-slate-300'
                        }`}>
                          {deposit ? '+' : '-'}
                          {t.amount.toLocaleString('fr-FR')} 
                          <span className="text-[10px] text-emerald-500 font-normal"> HTG</span>
                        </p>

                        <div className="flex items-center justify-end gap-1.5 mt-1">
                          {t.status === 'pending' && (
                            <Clock size={10} className="text-amber-500 animate-pulse" aria-hidden="true" />
                          )}
                          <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${
                            t.status === 'approved'
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                              : t.status === 'rejected'
                              ? 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                              : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                          }`}>
                            {t.status === 'approved'
                              ? 'Validé'
                              : t.status === 'rejected'
                              ? 'Refusé'
                              : 'En attente'
                            }
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Motif de refus si applicable */}
                    {t.status === 'rejected' && t.admin_note && (
                      <div className="bg-rose-500/5 p-3 rounded-xl border border-rose-500/10 flex items-start gap-2 mt-2">
                        <AlertCircle size={12} className="text-rose-500 shrink-0 mt-0.5" />
                        <p className="text-[9px] text-rose-300/80 font-bold leading-relaxed uppercase">
                          Motif : {t.admin_note}
                        </p>
                      </div>
                    )}
                  </motion.article>
                );
              })}
            </AnimatePresence>
          )}
        </section>
      </main>
    </div>
  );
}
