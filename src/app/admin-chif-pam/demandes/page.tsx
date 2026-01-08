"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  CheckCircle2, XCircle, Clock, Search, 
  ArrowUpCircle, ArrowDownCircle, Eye, Loader2, MessageSquare
} from 'lucide-react';

export default function AdminDemandes() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchTransactions();
    const sub = supabase.channel('admin-finance')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchTransactions())
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  const fetchTransactions = async () => {
    const { data } = await supabase
      .from('transactions')
      .select('*, profiles(id, balance, locked_balance)')
      .order('created_at', { ascending: false });
    
    if (data) setTransactions(data);
    setLoading(false);
  };

  const traiterTransaction = async (trans: any, action: 'approved' | 'rejected') => {
    setProcessingId(trans.id);
    const note = action === 'rejected' ? prompt("Raison du refus :") : null;
    
    try {
      if (trans.type === 'deposit' && action === 'approved') {
        // Créditer le compte
        await supabase.rpc('increment_balance', { 
          user_id: trans.user_id, 
          amount: trans.amount 
        });
      } 

      else if (trans.type === 'withdrawal') {
        if (action === 'rejected') {
          // Rembourser le montant bloqué
          await supabase.rpc('refund_withdrawal', { 
            user_id_param: trans.user_id, 
            amount_param: trans.amount 
          });
        } else {
          // Approuvé : On diminue juste le locked_balance (l'argent quitte définitivement le système)
          await supabase.from('profiles')
            .update({ locked_balance: trans.profiles.locked_balance - trans.amount })
            .eq('id', trans.user_id);
        }
      }

      // Mettre à jour le statut de la transaction
      await supabase.from('transactions')
        .update({ 
          status: action, 
          admin_note: note,
          processed_at: new Date().toISOString() 
        })
        .eq('id', trans.id);

      alert("Transaction traitée avec succès !");
    } catch (err: any) {
      alert("Erreur : " + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 font-black italic uppercase">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-3xl text-emerald-500 tracking-tighter">Gestion Financière</h1>

        <div className="grid grid-cols-1 gap-4">
          {transactions.map((t) => (
            <div key={t.id} className={`bg-slate-900/50 p-6 rounded-[2rem] border ${t.status === 'pending' ? 'border-amber-500/20' : 'border-white/5'} flex flex-col md:flex-row justify-between items-center gap-6`}>
              
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${t.type === 'deposit' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                  {t.type === 'deposit' ? <ArrowUpCircle /> : <ArrowDownCircle />}
                </div>
                <div>
                  <p className="text-xs">{t.type === 'deposit' ? 'Dépôt' : 'Retrait'} - {t.amount} HTG</p>
                  <p className="text-[8px] text-slate-500 not-italic tracking-widest">{new Date(t.created_at).toLocaleString()}</p>
                </div>
              </div>

              {/* DETAILS SPECIFIQUES */}
              <div className="flex gap-4">
                {t.proof_url && (
                  <a href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/payment-proofs/${t.proof_url}`} target="_blank" className="flex items-center gap-2 text-[10px] bg-white/5 px-4 py-2 rounded-xl">
                    <Eye size={14}/> Voir Preuve
                  </a>
                )}
                {t.phone_number && (
                  <div className="flex items-center gap-2 text-[10px] bg-white/5 px-4 py-2 rounded-xl">
                    <MessageSquare size={14}/> {t.phone_number}
                  </div>
                )}
              </div>

              {/* ACTIONS */}
              {t.status === 'pending' ? (
                <div className="flex gap-2">
                  <button onClick={() => traiterTransaction(t, 'rejected')} disabled={!!processingId} className="px-6 py-3 bg-rose-500/10 text-rose-500 rounded-xl text-[10px]">Refuser</button>
                  <button onClick={() => traiterTransaction(t, 'approved')} disabled={!!processingId} className="px-6 py-3 bg-emerald-500 text-slate-950 rounded-xl text-[10px]">Approuver</button>
                </div>
              ) : (
                <div className={`px-6 py-3 rounded-xl text-[10px] ${t.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                  {t.status === 'approved' ? 'Validé' : 'Refusé'}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
