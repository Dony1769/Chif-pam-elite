"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  History, 
  Ticket, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Clock, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  Loader2,
  ChevronLeft
} from 'lucide-react';

// --- COMPOSANT LOGO MINI ---
const LogoTiny = () => (
  <svg viewBox="0 0 100 100" className="w-6 h-6 drop-shadow-[0_0_5px_rgba(16,185,129,0.4)]" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M75 35.5C71.5 28.5 64.2 24 56 24C41.6 24 30 35.6 30 50C30 64.4 41.6 76 56 76C66.5 76 75.5 69.8 79.5 61" stroke="#10B981" strokeWidth="12" strokeLinecap="round" />
    <path d="M55 45L76 24M76 24H58M76 24V42" stroke="#10B981" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

type Tab = 'billets' | 'finances';

export default function ClientHistory() {
  const [activeTab, setActiveTab] = useState<Tab>('billets');
  const [mises, setMises] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchHistory();
    const channel = supabase.channel('history-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchHistory())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mises' }, () => fetchHistory())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: misesData } = await supabase.from('mises').select('*, tirages(moment)').eq('user_id', user.id).order('created_at', { ascending: false });
    const { data: transData } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (misesData) setMises(misesData);
    if (transData) setTransactions(transData);
    setLoading(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center space-y-4">
      <div className="animate-pulse"><LogoTiny /></div>
      <Loader2 className="animate-spin text-emerald-500/20" size={32} />
    </div>
  );

  return (
    <main className="min-h-screen bg-[#020617] text-white p-6 pb-32 font-black italic uppercase tracking-tighter animate-in fade-in duration-500">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* HEADER AVEC BOUTON RETOUR (POINT 6) */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => router.back()} 
            className="w-10 h-10 bg-slate-900 border border-white/10 rounded-xl flex items-center justify-center active:scale-90 transition-all"
          >
            <ChevronLeft size={20} className="text-emerald-500" />
          </button>
          <LogoTiny />
        </div>

        <div className="flex items-center gap-4 bg-slate-900/40 p-6 rounded-[2rem] border border-white/5 shadow-xl">
          <History className="text-emerald-500" size={24} />
          <h1 className="text-2xl">Historique</h1>
        </div>

        {/* ONGLETS */}
        <div className="flex bg-slate-900/80 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md">
          <button 
            onClick={() => setActiveTab('billets')}
            className={`flex-1 py-3 rounded-xl text-[10px] transition-all duration-300 font-bold ${activeTab === 'billets' ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'text-slate-500'}`}
          >
            Mes Billets
          </button>
          <button 
            onClick={() => setActiveTab('finances')}
            className={`flex-1 py-3 rounded-xl text-[10px] transition-all duration-300 font-bold ${activeTab === 'finances' ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'text-slate-500'}`}
          >
            Transactions
          </button>
        </div>

        {/* CONTENU : BILLETS - VERSION "ALIVE" (POINT 3) */}
        {activeTab === 'billets' && (
          <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
            {mises.length === 0 && <p className="text-center py-10 opacity-20 text-xs">Aucun billet</p>}
            {mises.map((mise) => (
              <div key={mise.id} className="bg-slate-900/40 p-5 rounded-[1.5rem] border border-white/5 flex justify-between items-center active:scale-95 transition-all hover:border-emerald-500/20 group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
                    <Ticket size={20} />
                  </div>
                  <div>
                    <p className="text-lg leading-none">Chiffre {mise.chiffre_choisi}</p>
                    <p className="text-[8px] text-slate-500 mt-1 not-italic font-bold tracking-widest">{mise.tirages?.moment} • {new Date(mise.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{mise.montant} HTG</p>
                  <p className={`text-[8px] mt-1 font-black ${mise.status === 'gagné' ? 'text-emerald-500' : mise.status === 'perdu' ? 'text-rose-500' : 'text-amber-500'}`}>
                    {mise.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CONTENU : TRANSACTIONS */}
        {activeTab === 'finances' && (
          <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
            {transactions.length === 0 && <p className="text-center py-10 opacity-20 text-xs">Aucune transaction</p>}
            {transactions.map((t) => (
              <div key={t.id} className="bg-slate-900/40 p-5 rounded-[1.5rem] border border-white/5 space-y-4 active:scale-95 transition-all">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    {t.type === 'deposit' ? (
                      <ArrowUpCircle className="text-emerald-500" size={24} />
                    ) : (
                      <ArrowDownCircle className="text-blue-500" size={24} />
                    )}
                    <div>
                      <p className="text-sm font-bold">{t.type === 'deposit' ? 'Dépôt' : 'Retrait'}</p>
                      <p className="text-[8px] text-slate-500 not-italic font-bold">{new Date(t.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg leading-none font-bold">{t.amount} HTG</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      {t.status === 'pending' && <Clock size={10} className="text-amber-500" />}
                      {t.status === 'approved' && <CheckCircle2 size={10} className="text-emerald-500" />}
                      {t.status === 'rejected' && <XCircle size={10} className="text-rose-500" />}
                      <span className={`text-[8px] font-black ${t.status === 'approved' ? 'text-emerald-500' : t.status === 'rejected' ? 'text-rose-500' : 'text-amber-500'}`}>
                        {t.status}
                      </span>
                    </div>
                  </div>
                </div>
                {t.status === 'rejected' && t.admin_note && (
                  <div className="bg-rose-500/10 p-3 rounded-xl flex items-start gap-2 border border-rose-500/20">
                    <AlertCircle size={14} className="text-rose-500 shrink-0 mt-0.5" />
                    <p className="text-[9px] text-rose-200 not-italic lowercase leading-tight">Note: {t.admin_note}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
