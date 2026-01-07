"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  History, ArrowUpRight, ArrowDownLeft, 
  Clock, CheckCircle2, XCircle, Gavel, 
  TrendingDown, TrendingUp, Loader2, Wallet
} from 'lucide-react';

export default function TransactionHistory() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userBalance, setUserBalance] = useState(0);

  useEffect(() => { 
    fetchData(); 
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Récupérer le solde actuel
      const { data: profile } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
      if (profile) setUserBalance(profile.balance);

      // 2. Récupérer l'historique complet
      const { data: trans, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(trans || []);
    } catch (error) {
      console.error("Erreur chargement historique:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'depot': 
        return { icon: <ArrowUpRight size={18}/>, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Dépôt' };
      case 'gain': 
        return { icon: <TrendingUp size={18}/>, color: 'text-emerald-400', bg: 'bg-emerald-400/10', label: 'Gain Loterie' };
      case 'mise': 
        return { icon: <TrendingDown size={18}/>, color: 'text-rose-400', bg: 'bg-rose-400/10', label: 'Mise Billet' };
      case 'retrait': 
        return { icon: <ArrowDownLeft size={18}/>, color: 'text-slate-400', bg: 'bg-slate-400/10', label: 'Retrait' };
      default: 
        return { icon: <History size={18}/>, color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Transfert' };
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-emerald-500" size={32} />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Chargement des données...</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#020617] p-6 text-white pb-32">
      <div className="max-w-md mx-auto space-y-8">
        
        {/* HEADER & BALANCE */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-black uppercase italic tracking-tighter">Finance<span className="text-emerald-500">Log</span></h1>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Historique des mouvements</p>
          </div>
          <div className="bg-slate-900 border border-white/5 p-4 rounded-2xl text-right">
            <p className="text-[8px] text-slate-500 font-black uppercase mb-1">Solde disponible</p>
            <p className="text-emerald-500 font-black italic">{userBalance.toLocaleString()} HTG</p>
          </div>
        </div>

        {/* LISTE DES TRANSACTIONS */}
        <div className="space-y-3">
          {history.length > 0 ? (
            history.map((t) => {
              const style = getTypeStyle(t.type);
              const isPositive = t.type === 'depot' || t.type === 'gain';

              return (
                <div key={t.id} className="bg-slate-900/50 border border-white/5 p-5 rounded-[1.8rem] flex items-center justify-between transition-all hover:bg-slate-900 shadow-xl">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 ${style.bg} ${style.color} rounded-2xl flex items-center justify-center shadow-inner`}>
                      {style.icon}
                    </div>
                    <div>
                      <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-200">{style.label}</h3>
                      <p className="text-[9px] text-slate-500 mt-0.5 truncate max-w-[150px]">
                        {t.admin_note || new Date(t.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={`font-black italic text-sm ${isPositive ? 'text-emerald-400' : 'text-slate-100'}`}>
                      {isPositive ? '+' : '-'}{t.amount.toLocaleString()} <span className="text-[8px] not-italic opacity-50">HTG</span>
                    </p>
                    
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full mt-2 border ${
                      t.status === 'en_attente' ? 'bg-amber-500/5 border-amber-500/20 text-amber-500' : 
                      t.status === 'valide' || t.status === 'approuve' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500' : 
                      'bg-rose-500/5 border-rose-500/20 text-rose-500'
                    }`}>
                      {t.status === 'en_attente' && <Clock size={10} />}
                      {(t.status === 'valide' || t.status === 'approuve') && <CheckCircle2 size={10} />}
                      {t.status === 'rejete' && <XCircle size={10} />}
                      <span className="text-[8px] font-black uppercase tracking-widest leading-none">
                        {t.status === 'approuve' ? 'Validé' : t.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-slate-900/30 border border-white/5 p-12 rounded-[2.5rem] text-center">
              <History size={40} className="mx-auto text-slate-800 mb-4" />
              <p className="text-[10px] font-black uppercase text-slate-600 tracking-widest italic">Aucune transaction trouvée</p>
            </div>
          )}
        </div>

        {/* FOOTER INFO */}
        <div className="flex items-center justify-center gap-2 py-4 opacity-20">
          <ShieldCheck size={14} className="text-emerald-500" />
          <p className="text-[8px] font-black uppercase tracking-[0.2em]">Transactions chiffrées de bout en bout</p>
        </div>
      </div>
    </main>
  );
}
