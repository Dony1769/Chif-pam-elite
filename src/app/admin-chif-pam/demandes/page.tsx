"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  CheckCircle2, XCircle, Clock, 
  ArrowUpCircle, ArrowDownCircle, 
  Eye, Loader2, Smartphone, Wallet2, 
  ArrowRightLeft
} from 'lucide-react';

export default function AdminDemandes() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

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
        profiles (
          id,
          username,
          balance,
          locked_balance
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) console.error("Erreur:", error);
    else setTransactions(data || []);
    setLoading(false);
  };

  const traiterDemande = async (trans: any, status: 'approved' | 'rejected') => {
    const actionText = status === 'approved' ? 'APPROUVER' : 'REFUSER';
    if (!confirm(`${actionText} cette transaction de ${trans.amount} HTG ?`)) return;
    
    setProcessingId(trans.id);
    let note = "";
    if (status === 'rejected') {
      note = prompt("Raison du refus (ex: Preuve invalide) :") || "Demande refusée par l'admin";
    }

    try {
      // LOGIQUE MÉTIER PRÉSERVÉE SELON VOS SYSTÈMES ÉTABLIS
      if (trans.type === 'deposit' && status === 'approved') {
        await supabase.rpc('increment_balance', { 
          user_id: trans.user_id, 
          amount: trans.amount 
        });
      } 
      else if (trans.type === 'withdrawal') {
        if (status === 'rejected') {
          await supabase.rpc('refund_withdrawal', { 
            user_id_param: trans.user_id, 
            amount_param: trans.amount 
          });
        } else {
          // L'argent sort définitivement du locked_balance
          const newLocked = Math.max(0, (trans.profiles?.locked_balance || 0) - trans.amount);
          await supabase.from('profiles').update({ locked_balance: newLocked }).eq('id', trans.user_id);
        }
      }

      const { error: finalError } = await supabase
        .from('transactions')
        .update({ 
          status: status, 
          admin_note: note,
          processed_at: new Date().toISOString() 
        })
        .eq('id', trans.id);

      if (finalError) throw finalError;
      fetchTransactions();
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
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* HEADER PROFESSIONNEL */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/5 pb-8">
          <div>
            <h1 className="text-5xl flex items-center gap-4">
              <ArrowRightLeft className="text-emerald-500" size={40} /> Flux <span className="text-emerald-500">Financier</span>
            </h1>
            <p className="text-[10px] text-slate-500 mt-2 tracking-[0.4em] not-italic opacity-60">Validation des dépôts et retraits clients</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-slate-900 px-6 py-3 rounded-2xl border border-white/5">
              <p className="text-[8px] text-slate-500 tracking-widest mb-1">En attente</p>
              <p className="text-xl text-amber-500">{transactions.filter(t => t.status === 'pending').length}</p>
            </div>
          </div>
        </div>

        {/* LISTE DES TRANSACTIONS */}
        <div className="grid gap-6">
          {transactions.map((t) => (
            <div key={t.id} className={`bg-slate-900/40 backdrop-blur-md border ${t.status === 'pending' ? 'border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.05)]' : 'border-white/5'} p-8 rounded-[2.5rem] flex flex-col xl:flex-row justify-between items-center gap-8 transition-all hover:bg-slate-900/60`}>
              
              {/* INFOS CLIENT ET TYPE */}
              <div className="flex items-center gap-6 flex-1 w-full">
                <div className={`p-5 rounded-3xl ${t.type === 'deposit' ? 'bg-emerald-500 text-slate-950' : 'bg-blue-600 text-white shadow-lg shadow-blue-500/10'}`}>
                  {t.type === 'deposit' ? <ArrowUpCircle size={32} /> : <ArrowDownCircle size={32} />}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-slate-400 not-italic lowercase">@{t.profiles?.username || 'utilisateur'}</span>
                    <span className={`text-[8px] px-2 py-0.5 rounded-full ${t.type === 'deposit' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                      {t.type === 'deposit' ? 'DÉPÔT' : 'RETRAIT'}
                    </span>
                  </div>
                  <h3 className="text-2xl tracking-tighter">{t.amount.toLocaleString()} <span className="text-[10px] text-slate-500">HTG</span></h3>
                </div>
              </div>

              {/* MÉTHODE ET COORDONNÉES (NOUVEAU) */}
              <div className="flex flex-wrap gap-3 flex-1 justify-center w-full">
                <div className="flex items-center gap-3 bg-slate-950/50 px-5 py-3 rounded-2xl border border-white/5">
                  <Wallet2 size={16} className="text-emerald-500" />
                  <span className="text-[10px] tracking-widest">{t.method || 'MONCASH'}</span>
                </div>
                
                {t.phone_number && (
                  <div className="flex items-center gap-3 bg-slate-950/50 px-5 py-3 rounded-2xl border border-white/5">
                    <Smartphone size={16} className="text-emerald-500" />
                    <span className="text-[10px] tracking-widest">{t.phone_number}</span>
                  </div>
                )}

                {t.proof_url && (
                  <a 
                    href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/payment-proofs/${t.proof_url}`} 
                    target="_blank" 
                    className="flex items-center gap-3 bg-emerald-500 text-slate-950 px-5 py-3 rounded-2xl text-[10px] hover:scale-105 transition-transform"
                  >
                    <Eye size={16}/> VOIR PREUVE
                  </a>
                )}
              </div>

              {/* ACTIONS */}
              <div className="flex gap-3 w-full xl:w-auto justify-end">
                {t.status === 'pending' ? (
                  <>
                    <button 
                      onClick={() => traiterDemande(t, 'rejected')} 
                      disabled={!!processingId} 
                      className="flex-1 xl:flex-none px-8 py-4 bg-slate-800 text-rose-500 border border-rose-500/20 rounded-2xl text-[10px] hover:bg-rose-500 hover:text-white transition-all disabled:opacity-50"
                    >
                      REFUSER
                    </button>
                    <button 
                      onClick={() => traiterDemande(t, 'approved')} 
                      disabled={!!processingId} 
                      className="flex-1 xl:flex-none px-8 py-4 bg-emerald-500 text-slate-950 rounded-2xl text-[10px] hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all disabled:opacity-50"
                    >
                      APPROUVER
                    </button>
                  </>
                ) : (
                  <div className={`flex items-center gap-3 px-8 py-4 rounded-2xl border ${t.status === 'approved' ? 'border-emerald-500/20 text-emerald-500' : 'border-rose-500/20 text-rose-500'} text-[10px] bg-slate-950/30`}>
                    {t.status === 'approved' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                    {t.status === 'approved' ? 'CONFIRMÉ' : 'REJETÉ'}
                  </div>
                )}
              </div>
            </div>
          ))}

          {transactions.length === 0 && (
            <div className="py-20 text-center border border-dashed border-white/5 rounded-[3rem]">
              <Clock className="mx-auto text-slate-800 mb-4" size={48} />
              <p className="text-slate-600 text-[10px] tracking-widest">Aucune transaction enregistrée</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
