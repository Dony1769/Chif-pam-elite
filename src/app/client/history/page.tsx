"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  History, ArrowUpRight, ArrowDownLeft, 
  Clock, CheckCircle2, XCircle, Gavel, 
  TrendingDown, TrendingUp, Loader2 
} from 'lucide-react';

export default function TransactionHistory() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { 
    fetchHistory(); 
  }, []);

  const fetchHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // On récupère les données de la table transactions
      const { data: trans, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(trans || []);
    } catch (error) {
      console.error("Erreur historique:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fonction utilitaire pour le style des types
  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'depot': return { icon: <ArrowUpRight size={18}/>, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Dépôt' };
      case 'retrait': return { icon: <ArrowDownLeft size={18}/>, color: 'text-rose-500', bg: 'bg-rose-500/10', label: 'Retrait' };
      case 'mise': return { icon: <Gavel size={18}/>, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Mise de Jeu' };
      default: return { icon: <TrendingUp size={18}/>, color: 'text-slate-400', bg: 'bg-slate-400/10', label: type };
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-emerald-500" size={32} />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Chargement du grand livre...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 p-4 pb-32 space-y-8 animate-in fade-in duration-700">
      {/* HEADER PROFESSIONNEL */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <History className="text-emerald-500" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black italic uppercase tracking-tighter">Mon Historique</h1>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Flux financiers & Billets</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {history.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[2.5rem]">
             <Clock className="text-slate-800 mb-4" size={40} />
             <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.2em]">Aucune activité enregistrée</p>
          </div>
        ) : (
          history.map((t) => {
            const style = getTypeStyle(t.type);
            return (
              <div key={t.id} className="bg-slate-900/40 backdrop-blur-sm p-5 rounded-[2rem] border border-white/5 flex justify-between items-center transition-all hover:border-white/10 group">
                <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-2xl ${style.bg} ${style.color} group-hover:scale-110 transition-transform`}>
                    {style.icon}
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white">{style.label}</p>
                    <p className="text-[9px] font-bold text-slate-500 mt-0.5">
                      {new Date(t.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {t.admin_note && (
                        <p className="text-[8px] text-emerald-500/60 font-medium italic mt-1 line-clamp-1 max-w-[120px]">
                            "{t.admin_note}"
                        </p>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <p className={`font-black italic text-base ${t.type === 'depot' ? 'text-emerald-400' : 'text-slate-100'}`}>
                    {t.type === 'depot' ? '+' : '-'}{t.amount.toLocaleString()} <span className="text-[8px] not-italic opacity-50">HTG</span>
                  </p>
                  
                  {/* BADGE DE STATUT DYNAMIQUE */}
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full mt-2 border ${
                    t.status === 'en_attente' ? 'bg-amber-500/5 border-amber-500/20 text-amber-500' : 
                    t.status === 'valide' || t.status === 'approuve' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500' : 
                    'bg-rose-500/5 border-rose-500/20 text-rose-500'
                  }`}>
                    {t.status === 'en_attente' && <Clock size={10} />}
                    {(t.status === 'valide' || t.status === 'approuve') && <CheckCircle2 size={10} />}
                    {t.status === 'rejete' && <XCircle size={10} />}
                    <span className="text-[8px] font-black uppercase tracking-widest leading-none">
                      {t.status === 'approuve' ? 'Approuvé' : t.status === 'valide' ? 'Validé' : t.status}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
