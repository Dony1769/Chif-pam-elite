"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  History, Ticket, ArrowUpCircle, ArrowDownCircle, 
  Clock, CheckCircle2, XCircle, AlertCircle, 
  Loader2, ChevronLeft, Target, Sprout, Shield
} from 'lucide-react';

// --- COMPOSANT LOGO MINI ---
const LogoTiny = () => (
  <svg viewBox="0 0 100 100" className="w-6 h-6 drop-shadow-[0_0_5px_rgba(16,185,129,0.4)]" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M75 35.5C71.5 28.5 64.2 24 56 24C41.6 24 30 35.6 30 50C30 64.4 41.6 76 56 76C66.5 76 75.5 69.8 79.5 61" stroke="#10B981" strokeWidth="12" strokeLinecap="round" />
    <path d="M55 45L76 24M76 24H58M76 24V42" stroke="#10B981" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

type Tab = 'activites' | 'finances';

export default function ClientHistory() {
  const [activeTab, setActiveTab] = useState<Tab>('activites');
  const [activites, setActivites] = useState<any[]>([]); 
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchHistory();
    const channel = supabase.channel('history-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchHistory())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Récupération parallèle pour la performance
      const [misesRes, minesRes, crashRes, transRes] = await Promise.all([
        supabase.from('mises').select('*, tirages(moment)').eq('user_id', user.id),
        supabase.from('mines_games').select('*').eq('user_id', user.id),
        supabase.from('crash_games').select('*').eq('user_id', user.id),
        supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      ]);

      // 2. Fusionner les jeux
      const combined = [
        ...(misesRes.data || []).map(m => ({ ...m, gameType: 'loterie', displayStatus: m.status })),
        ...(minesRes.data || []).map(m => ({ ...m, gameType: 'mines', montant: m.bet_amount, displayStatus: m.is_won ? 'gagné' : 'perdu' })),
        ...(crashRes.data || []).map(c => ({ ...c, gameType: 'crash', montant: c.bet_amount, displayStatus: c.status === 'won' ? 'gagné' : 'perdu' }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setActivites(combined);
      setTransactions(transRes.data || []);
    } catch (error) {
      console.error("Erreur historique:", error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'loterie': return <Ticket size={18} />;
      case 'mines': return <Target size={18} />;
      case 'crash': return <Sprout size={18} />;
      default: return <Shield size={18} />;
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center space-y-4">
      <LogoTiny />
      <Loader2 className="animate-spin text-emerald-500" size={32} />
    </div>
  );

  return (
    <main className="min-h-screen bg-[#020617] text-white p-6 pb-32 font-black italic uppercase tracking-tighter animate-in fade-in duration-500">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="w-10 h-10 bg-slate-900 border border-white/10 rounded-xl flex items-center justify-center active:scale-90 transition-all">
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
            onClick={() => setActiveTab('activites')} 
            className={`flex-1 py-3 rounded-xl text-[10px] font-bold transition-all ${activeTab === 'activites' ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'text-slate-500'}`}
          >
            Activités Jeux
          </button>
          <button 
            onClick={() => setActiveTab('finances')} 
            className={`flex-1 py-3 rounded-xl text-[10px] font-bold transition-all ${activeTab === 'finances' ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'text-slate-500'}`}
          >
            Finances
          </button>
        </div>

        {/* LISTE ACTIVITES */}
        {activeTab === 'activites' && (
          <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
            {activites.length === 0 && <p className="text-center py-10 opacity-20 text-xs">Aucune activité</p>}
            {activites.map((item, i) => (
              <div key={i} className="bg-slate-900/40 p-5 rounded-[1.5rem] border border-white/5 flex justify-between items-center group active:scale-95 transition-all">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.displayStatus === 'gagné' ? 'bg-emerald-500 text-slate-950' : 'bg-white/5 text-slate-500'}`}>
                    {getIcon(item.gameType)}
                  </div>
                  <div>
                    <p className="text-sm">{item.gameType === 'loterie' ? `Chiffre ${item.chiffre_choisi}` : item.gameType}</p>
                    <p className="text-[7px] text-slate-500 not-italic font-bold">{new Date(item.created_at).toLocaleDateString()} {item.tirages?.moment}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{item.montant} HTG</p>
                  <p className={`text-[8px] font-black ${item.displayStatus === 'gagné' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {item.displayStatus} {item.multiplier > 1 ? `(${item.multiplier}x)` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* LISTE FINANCES */}
        {activeTab === 'finances' && (
          <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
            {transactions.length === 0 && <p className="text-center py-10 opacity-20 text-xs">Aucune transaction</p>}
            {transactions.map((t) => (
              <div key={t.id} className="bg-slate-900/40 p-5 rounded-[1.5rem] border border-white/5 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    {t.type === 'deposit' || t.type === 'depot' ? <ArrowUpCircle className="text-emerald-500" size={24} /> : <ArrowDownCircle className="text-blue-500" size={24} />}
                    <div>
                      <p className="text-sm font-bold">{t.type === 'deposit' || t.type === 'depot' ? 'Dépôt' : 'Retrait'}</p>
                      <p className="text-[8px] text-slate-500 not-italic font-bold">{new Date(t.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{t.amount} HTG</p>
                    <div className="flex items-center justify-end gap-1">
                      {t.status === 'pending' && <Clock size={10} className="text-amber-500" />}
                      <span className={`text-[8px] font-black ${t.status === 'approved' ? 'text-emerald-500' : t.status === 'rejected' ? 'text-rose-500' : 'text-amber-500'}`}>
                        {t.status}
                      </span>
                    </div>
                  </div>
                </div>
                {t.status === 'rejected' && t.admin_note && (
                  <div className="bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 flex items-start gap-2">
                    <AlertCircle size={14} className="text-rose-500 shrink-0 mt-0.5" />
                    <p className="text-[9px] text-rose-200 lowercase italic">Note: {t.admin_note}</p>
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
