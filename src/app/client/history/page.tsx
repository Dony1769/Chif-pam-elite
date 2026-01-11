"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  History, Ticket, ArrowUpCircle, ArrowDownCircle, 
  Clock, CheckCircle2, XCircle, AlertCircle, 
  Loader2, ChevronLeft, Target, Sprout, Shield
} from 'lucide-react';


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

type Tab = 'activites' | 'finances';
type Tab = 'billets' | 'finances';

export default function ClientHistory() {
  const [activeTab, setActiveTab] = useState<Tab>('activites');
  const [activites, setActivites] = useState<any[]>([]); // Fusion Loterie + Mines + Crash
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchHistory();
    const channel = supabase.channel('history-global')
    const channel = supabase.channel('history-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchHistory())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Récupérer les Billets de Loterie
    const { data: misesData } = await supabase.from('mises').select('*, tirages(moment)').eq('user_id', user.id);
    
    // 2. Récupérer les sessions Mines
    const { data: minesData } = await supabase.from('mines_games').select('*').eq('user_id', user.id);
    
    // 3. Récupérer les sessions Crash
    const { data: crashData } = await supabase.from('crash_games').select('*').eq('user_id', user.id);

    // 4. Fusionner et trier par date
    const combined = [
      ...(misesData || []).map(m => ({ ...m, gameType: 'loterie' })),
      ...(minesData || []).map(m => ({ ...m, gameType: 'mines', status: m.is_won ? 'gagné' : 'perdu' })),
      ...(crashData || []).map(c => ({ ...c, gameType: 'crash', status: c.status === 'won' ? 'gagné' : 'perdu', montant: c.bet_amount }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // 5. Récupérer Finances (Dépôts/Retraits)
    const { data: transData } = await supabase.from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .in('type', ['deposit', 'withdrawal']) // On ne garde que le financier pur ici
      .order('created_at', { ascending: false });

    setActivites(combined);
    setTransactions(transData || []);
    setLoading(false);
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'loterie': return <Ticket size={18} />;
      case 'mines': return <Target size={18} />;
      case 'crash': return <Sprout size={18} />;
      default: return <Shield size={18} />;
    }
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <main className="min-h-screen bg-[#020617] text-white p-6 pb-32 font-black italic uppercase tracking-tighter">
      <div className="max-w-md mx-auto space-y-6">
        
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="w-10 h-10 bg-slate-900 border border-white/10 rounded-xl flex items-center justify-center"><ChevronLeft size={20} className="text-emerald-500" /></button>
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
        <div className="flex bg-slate-900/80 p-1.5 rounded-2xl border border-white/5">
          <button onClick={() => setActiveTab('activites')} className={`flex-1 py-3 rounded-xl text-[10px] font-bold ${activeTab === 'activites' ? 'bg-emerald-500 text-slate-950' : 'text-slate-500'}`}>Activités Jeux</button>
          <button onClick={() => setActiveTab('finances')} className={`flex-1 py-3 rounded-xl text-[10px] font-bold ${activeTab === 'finances' ? 'bg-emerald-500 text-slate-950' : 'text-slate-500'}`}>Finances</button>
        </div>

        {/* LISTE ACTIVITES (LOTERIE + MINES + CRASH) */}
        {activeTab === 'activites' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            {activites.map((item, i) => (
              <div key={i} className="bg-slate-900/40 p-5 rounded-[1.5rem] border border-white/5 flex justify-between items-center group">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.status === 'gagné' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-white/5 text-slate-500'}`}>
                    {getIcon(item.gameType)}
                  </div>
                  <div>
                    <p className="text-sm">{item.gameType === 'loterie' ? `Chiffre ${item.chiffre_choisi}` : item.gameType}</p>
                    <p className="text-[7px] text-slate-500 not-italic">{new Date(item.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{item.montant || item.bet_amount} HTG</p>
                  <p className={`text-[8px] font-black ${item.status === 'gagné' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {item.status} {item.multiplier > 1 && `(${item.multiplier}x)`}
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

        {/* LISTE FINANCES (RESTE INCHANGÉ POUR LA SÉCURITÉ) */}
        {activeTab === 'finances' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            {transactions.map((t) => (
              <div key={t.id} className="bg-slate-900/40 p-5 rounded-[1.5rem] border border-white/5 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    {t.type === 'deposit' ? <ArrowUpCircle className="text-emerald-500" size={20} /> : <ArrowDownCircle className="text-blue-500" size={20} />}
                    <p className="text-sm font-bold">{t.type === 'deposit' ? 'Dépôt' : 'Retrait'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{t.amount} HTG</p>
                    <span className={`text-[8px] font-black ${t.status === 'approved' ? 'text-emerald-500' : 'text-amber-500'}`}>{t.status}</span>
                  </div>
                </div>
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
