"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  History, TrendingUp, TrendingDown, 
  ArrowUpRight, ArrowDownLeft, Clock, 
  CheckCircle2, XCircle, Loader2, Wallet 
} from 'lucide-react';

export default function TransactionHistory() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);

  useEffect(() => { 
    fetchData(); 
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Récupérer le solde
      const { data: profile } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
      if (profile) setBalance(profile.balance);

      // 2. Récupérer les transactions
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error("Erreur historique:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStyle = (type: string) => {
    switch(type) {
      case 'gain': 
      case 'depot': 
        return { icon: <TrendingUp size={18}/>, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: type === 'gain' ? 'Gain Loterie' : 'Dépôt' };
      default: 
        return { icon: <TrendingDown size={18}/>, color: 'text-rose-500', bg: 'bg-rose-500/10', label: type === 'mise' ? 'Mise Billet' : type };
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <Loader2 className="animate-spin text-emerald-500" size={32} />
    </div>
  );

  return (
    <main className="min-h-screen bg-[#020617] p-6 pb-32 text-white font-sans">
      <div className="max-w-md mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-black uppercase italic tracking-tighter">Mon<span className="text-emerald-500">Historique</span></h1>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Flux financier</p>
          </div>
          <div className="bg-slate-900 border border-white/5 p-4 rounded-2xl text-right">
             <p className="text-emerald-500 font-black italic">{balance.toLocaleString()} HTG</p>
          </div>
        </div>
        
        {/* LISTE */}
        <div className="space-y-3">
          {history.length > 0 ? history.map((t) => {
            const style = getStyle(t.type);
            const isPositive = t.type === 'gain' || t.type === 'depot';
            
            return (
              <div key={t.id} className="bg-slate-900/80 border border-white/5 p-5 rounded-[1.8rem] flex items-center justify-between shadow-xl">
                <div className="flex items-center gap-4">
                  <div className={`w-11 h-11 ${style.bg} ${style.color} rounded-2xl flex items-center justify-center shadow-inner`}>
                    {style.icon}
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-200">{style.label}</p>
                    <p className="text-[8px] text-slate-500 uppercase mt-0.5 tracking-tighter">
                      {t.admin_note || new Date(t.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className={`font-black italic text-sm ${isPositive ? 'text-emerald-500' : 'text-white'}`}>
                    {isPositive ? '+' : '-'}{t.amount.toLocaleString()} <span className="text-[9px] not-italic opacity-40">HTG</span>
                  </p>
                  <div className="mt-1 flex items-center justify-end gap-1">
                    <span className="text-[7px] font-black uppercase text-slate-500">{t.status}</span>
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="text-center py-24 opacity-20 bg-slate-900/30 rounded-[3rem] border border-dashed border-white/10">
              <History size={48} className="mx-auto mb-4"/>
              <p className="text-[10px] font-black uppercase tracking-[0.2em]">Aucun mouvement détecté</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
