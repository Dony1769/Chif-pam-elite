"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { History, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, XCircle } from 'lucide-react';

export default function TransactionHistory() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    // On récupère les transactions ET les mises pour un historique complet
    const { data: trans } = await supabase.from('transactions')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    setHistory(trans || []);
    setLoading(false);
  };

  return (
    <div className="p-4 space-y-6 pb-32 animate-in fade-in duration-700">
      <div className="flex items-center gap-3">
        <History className="text-emerald-500" />
        <h1 className="text-xl font-black italic uppercase">Historique <span className="text-emerald-500 text-xs">Finance</span></h1>
      </div>

      <div className="space-y-3">
        {history.length === 0 ? (
          <p className="text-center py-20 text-slate-600 text-xs font-bold uppercase tracking-widest">Aucune transaction</p>
        ) : (
          history.map((t) => (
            <div key={t.id} className="bg-slate-900/50 p-5 rounded-3xl border border-white/5 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${t.type === 'depot' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                  {t.type === 'depot' ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest">{t.type}</p>
                  <p className="text-[9px] text-slate-500">{new Date(t.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>

              <div className="text-right">
                <p className="font-black italic text-sm">{t.amount} HTG</p>
                <div className="flex items-center justify-end gap-1 mt-1">
                  {t.status === 'en_attente' && <Clock size={10} className="text-amber-500" />}
                  {t.status === 'approuve' && <CheckCircle2 size={10} className="text-emerald-500" />}
                  {t.status === 'rejete' && <XCircle size={10} className="text-rose-500" />}
                  <span className={`text-[8px] font-bold uppercase ${
                    t.status === 'en_attente' ? 'text-amber-500' : 
                    t.status === 'approuve' ? 'text-emerald-500' : 'text-rose-500'
                  }`}>
                    {t.status}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}