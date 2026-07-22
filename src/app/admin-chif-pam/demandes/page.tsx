"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { AdminTransactionsService } from '@/services/admin/transactions';
import { 
  CheckCircle2, XCircle, Clock, 
  ArrowUpCircle, ArrowDownCircle, 
  Eye, Loader2, Smartphone, Wallet2, 
  ArrowRightLeft, Search, Filter
} from 'lucide-react';

type TabType = 'pending' | 'approved' | 'rejected' | 'all';

export default function AdminDemandes() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Nouveaux états pour la gestion de gros volumes
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('pending');

  useEffect(() => {
    fetchTransactions();
    const channel = supabase.channel('admin-finance-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchTransactions())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        profiles ( id, username, balance, locked_balance )
      `)
      .order('created_at', { ascending: false });
    
    if (error) console.error("Erreur:", error);
    else setTransactions(data || []);
    setLoading(false);
  };

  // LOGIQUE DE FILTRAGE ET RECHERCHE (Optimisée)
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesTab = activeTab === 'all' ? true : t.status === activeTab;
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        (t.profiles?.username || '').toLowerCase().includes(searchLower) ||
        (t.phone_number || '').includes(searchQuery);
      
      return matchesTab && matchesSearch;
    });
  }, [transactions, activeTab, searchQuery]);

  const traiterDemande = async (trans: any, status: 'approved' | 'rejected') => {
    const actionText = status === 'approved' ? 'APPROUVER' : 'REFUSER';
    if (!confirm(`${actionText} cette transaction de ${trans.amount} HTG ?`)) return;
    
    setProcessingId(trans.id);
    let note = '';
    if (status === 'rejected') {
      note = prompt("Raison du refus :") || "Demande refusée par l'admin";
    }

    try {
      const result = await AdminTransactionsService.process(trans.id, status, note);
      if (!result.success) {
        throw new Error(result.message);
      }
      await fetchTransactions();
    } catch (err: any) {
      alert("Erreur système : " + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <Loader2 className="animate-spin text-emerald-500" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 lg:p-12 font-black italic uppercase tracking-tighter">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-8">
          <div>
            <h1 className="text-5xl flex items-center gap-4">
              <ArrowRightLeft className="text-emerald-500" size={40} /> Flux <span className="text-emerald-500">Elite</span>
            </h1>
            <p className="text-[10px] text-slate-500 mt-2 tracking-[0.4em] not-italic opacity-60 uppercase">Gestionnaire financier haute performance</p>
          </div>

          {/* BARRE DE RECHERCHE PREMIUM */}
          <div className="relative w-full md:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors" size={18} />
            <input 
              type="text"
              placeholder="RECHERCHER NOM OU NUMÉRO..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-white/5 py-4 pl-12 pr-6 rounded-2xl outline-none focus:border-emerald-500/50 transition-all text-[10px] tracking-widest placeholder:text-slate-700"
            />
          </div>
        </div>

        {/* SYSTÈME D'ONGLETS (TABS) */}
        <div className="flex flex-wrap gap-2 p-1 bg-slate-950/50 rounded-2xl border border-white/5 w-fit">
          {[
            { id: 'pending', label: 'En attente', color: 'text-amber-500' },
            { id: 'approved', label: 'Approuvés', color: 'text-emerald-500' },
            { id: 'rejected', label: 'Refusés', color: 'text-rose-500' },
            { id: 'all', label: 'Tout voir', color: 'text-slate-400' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-6 py-3 rounded-xl text-[9px] tracking-[0.2em] transition-all ${
                activeTab === tab.id 
                ? 'bg-emerald-500 text-slate-950 shadow-lg' 
                : 'hover:bg-white/5 ' + tab.color
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* LISTE DES TRANSACTIONS FILTRÉES */}
        <div className="grid gap-4">
          {filteredTransactions.map((t) => (
            <div key={t.id} className={`bg-slate-900/40 backdrop-blur-md border ${t.status === 'pending' ? 'border-emerald-500/20' : 'border-white/5'} p-6 rounded-4xl flex flex-col xl:flex-row justify-between items-center gap-6 transition-all hover:bg-slate-900/60`}>
              
              <div className="flex items-center gap-6 flex-1 w-full">
                <div className={`p-4 rounded-2xl ${t.type === 'deposit' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                  {t.type === 'deposit' ? <ArrowUpCircle size={28} /> : <ArrowDownCircle size={28} />}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-slate-400 not-italic lowercase">@{t.profiles?.username || 'user'}</span>
                  </div>
                  <h3 className="text-xl tracking-tighter">{t.amount.toLocaleString()} HTG</h3>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 flex-1 justify-center w-full">
                <div className="flex items-center gap-3 bg-slate-950/50 px-4 py-2 rounded-xl border border-white/5 text-[9px]">
                  <Wallet2 size={14} className="text-emerald-500" /> {t.method || 'MONCASH'}
                </div>
                {t.phone_number && (
                  <div className="flex items-center gap-3 bg-slate-950/50 px-4 py-2 rounded-xl border border-white/5 text-[9px]">
                    <Smartphone size={14} className="text-emerald-500" /> {t.phone_number}
                  </div>
                )}
              </div>

              <div className="flex gap-2 w-full xl:w-auto justify-end">
                {t.status === 'pending' ? (
                  <>
                    <button onClick={() => traiterDemande(t, 'rejected')} disabled={!!processingId} className="px-6 py-3 bg-slate-800 text-rose-500 rounded-xl text-[9px] hover:bg-rose-500 hover:text-white transition-all">REFUSER</button>
                    <button onClick={() => traiterDemande(t, 'approved')} disabled={!!processingId} className="px-6 py-3 bg-emerald-500 text-slate-950 rounded-xl text-[9px] hover:shadow-emerald-500/20 shadow-lg transition-all">APPROUVER</button>
                  </>
                ) : (
                  <div className={`flex items-center gap-2 px-6 py-3 rounded-xl border ${t.status === 'approved' ? 'border-emerald-500/20 text-emerald-500' : 'border-rose-500/20 text-rose-500'} text-[9px] bg-slate-950/20`}>
                    {t.status === 'approved' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                    {t.status}
                  </div>
                )}
                {t.proof_url && (
                  <a href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/payment-proofs/${t.proof_url}`} target="_blank" className="p-3 bg-white text-black rounded-xl hover:scale-110 transition-transform"><Eye size={16}/></a>
                )}
              </div>
            </div>
          ))}

          {filteredTransactions.length === 0 && (
            <div className="py-20 text-center border border-dashed border-white/5 rounded-[3rem]">
              <p className="text-slate-600 text-[10px] tracking-[0.3em]">Aucune correspondance trouvée</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
