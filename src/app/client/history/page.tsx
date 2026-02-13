"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  ArrowUpCircle, ArrowDownCircle, 
  Clock, Loader2, ChevronLeft, 
  AlertCircle, Wallet, History
} from 'lucide-react';
import { motion } from 'framer-motion';

import ExoClickBanner from "@/components/ads/ExoClickBanner";
import MonetagMultiTag from "@/components/ads/MonetagMultiTag";


// --- LOGO MINI ---
const LogoTiny = () => (
  <svg viewBox="0 0 100 100" className="w-6 h-6 drop-shadow-[0_0_5px_rgba(16,185,129,0.4)]" fill="none">
    <path d="M75 35.5C71.5 28.5 64.2 24 56 24C41.6 24 30 35.6 30 50C30 64.4 41.6 76 56 76C66.5 76 75.5 69.8 79.5 61" stroke="#10B981" strokeWidth="12" strokeLinecap="round" />
    <path d="M55 45L76 24M76 24H58M76 24V42" stroke="#10B981" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function ClientHistory() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // ✅ LOGIQUE ORIGINALE RESTAURÉE (Supabase + Realtime)
  useEffect(() => {
    fetchHistory();

    const channel = supabase.channel('history-updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'transactions' 
      }, () => fetchHistory())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setTransactions(data || []);
    } catch (error) {
      console.error("Erreur historique:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center space-y-4">
        <LogoTiny />
        <Loader2 className="animate-spin text-emerald-500" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans pb-24 selection:bg-emerald-500/30">
      
      {/* ✅ MONETAG MULTITAG — chargé uniquement sur cette page */}
      <MonetagMultiTag />

      {/* HEADER */}
      <div className="sticky top-0 z-30 bg-[#020617]/90 backdrop-blur-xl border-b border-white/5 p-4 flex items-center justify-between">
        <button 
          onClick={() => router.back()} 
          className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center active:scale-90 transition-all hover:bg-white/10"
        >
          <ChevronLeft size={20} className="text-emerald-500" />
        </button>

        <h1 className="text-lg font-black italic uppercase tracking-tighter">
          Transactions
        </h1>

        <div className="w-10 h-10 flex items-center justify-center">
          <LogoTiny />
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        
        {/* Résumé */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-6 rounded-[2rem] border border-white/5 shadow-lg flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-full border border-emerald-500/20">
            <Wallet className="text-emerald-500" size={24} />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              Activités Récentes
            </p>
            <p className="text-xs text-slate-400">
              Suivez vos dépôts et retraits en temps réel.
            </p>
          </div>
        </div>

        {/* --- EXOCLICK BANNER --- */}
        <div className="w-full overflow-hidden rounded-[1.5rem] border border-white/5 shadow-lg bg-black/20 relative min-h-[100px] flex items-center justify-center">
          <p className="absolute top-2 right-4 text-[8px] text-slate-600 font-black uppercase tracking-widest z-0">
            Sponsor
          </p>
          <ExoClickBanner />
        </div>

        {/* LISTE DES TRANSACTIONS */}
        <div className="space-y-3">
          {transactions.length === 0 ? (
            <div className="text-center py-10 opacity-30 flex flex-col items-center">
              <History size={40} className="mb-2" />
              <p className="text-xs font-bold uppercase">
                Aucune transaction trouvée
              </p>
            </div>
          ) : (
            transactions.map((t, index) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-[#0f172a]/60 p-5 rounded-[1.5rem] border border-white/5 space-y-3 hover:bg-[#0f172a] transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${
                      t.type === 'deposit' || t.type === 'depot'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-blue-500/10 text-blue-500'
                    }`}>
                      {t.type === 'deposit' || t.type === 'depot'
                        ? <ArrowUpCircle size={20} />
                        : <ArrowDownCircle size={20} />
                      }
                    </div>

                    <div>
                      <p className="text-sm font-black italic uppercase tracking-wider text-white">
                        {t.type === 'deposit' || t.type === 'depot' ? 'Dépôt' : 'Retrait'}
                      </p>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wide">
                        {new Date(t.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={`text-lg font-black italic tracking-tighter ${
                      t.type === 'deposit' || t.type === 'depot'
                        ? 'text-white'
                        : 'text-slate-300'
                    }`}>
                      {t.type === 'deposit' || t.type === 'depot' ? '+' : '-'}
                      {t.amount.toLocaleString()} 
                      <span className="text-[10px] text-emerald-500"> HTG</span>
                    </p>

                    <div className="flex items-center justify-end gap-1.5 mt-1">
                      {t.status === 'pending' && (
                        <Clock size={10} className="text-amber-500 animate-pulse" />
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

                {t.status === 'rejected' && t.admin_note && (
                  <div className="bg-rose-500/5 p-3 rounded-xl border border-rose-500/10 flex items-start gap-2 mt-2">
                    <AlertCircle size={12} className="text-rose-500 shrink-0 mt-0.5" />
                    <p className="text-[9px] text-rose-300/80 font-bold leading-relaxed uppercase">
                      Motif : {t.admin_note}
                    </p>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
                             }
