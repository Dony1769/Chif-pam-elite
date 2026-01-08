"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  CheckCircle2, XCircle, Clock, 
  ArrowUpCircle, ArrowDownCircle, Eye, Loader2, MessageSquare, Smartphone 
} from 'lucide-react';

export default function AdminDemandes() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchTransactions();
    // Ecoute en temps réel des nouvelles demandes
    const sub = supabase.channel('admin-finance')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchTransactions())
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  const fetchTransactions = async () => {
    try {
      // On récupère la transaction ET le profil lié pour avoir le solde actuel
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          profiles:user_id (
            id,
            balance,
            locked_balance,
            full_name
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      console.error("Erreur fetch:", err);
    } finally {
      setLoading(false);
    }
  };

  const traiterTransaction = async (trans: any, action: 'approved' | 'rejected') => {
    if (!confirm(`Confirmer le statut : ${action} ?`)) return;
    
    setProcessingId(trans.id);
    const note = action === 'rejected' ? prompt("Raison du refus (ex: Preuve invalide) :") : null;
    
    try {
      // --- LOGIQUE DÉPÔT ---
      if (trans.type === 'deposit' && action === 'approved') {
        // On utilise le RPC existant pour ajouter à la balance
        const { error: rpcErr } = await supabase.rpc('increment_balance', { 
          user_id: trans.user_id, 
          amount: trans.amount 
        });
        if (rpcErr) throw rpcErr;
      } 

      // --- LOGIQUE RETRAIT ---
      else if (trans.type === 'withdrawal') {
        if (action === 'rejected') {
          // Si refusé, on rend l'argent bloqué au solde réel via le RPC refund_withdrawal
          const { error: rpcErr } = await supabase.rpc('refund_withdrawal', { 
            user_id_param: trans.user_id, 
            amount_param: trans.amount 
          });
          if (rpcErr) throw rpcErr;
        } else {
          // Si approuvé, le montant quitte définitivement le locked_balance
          const newLocked = (trans.profiles?.locked_balance || 0) - trans.amount;
          const { error: profileErr } = await supabase
            .from('profiles')
            .update({ locked_balance: Math.max(0, newLocked) })
            .eq('id', trans.user_id);
          if (profileErr) throw profileErr;
        }
      }

      // --- MISE À JOUR DU STATUT ---
      const { error: transErr } = await supabase
        .from('transactions')
        .update({ 
          status: action, 
          admin_note: note,
          processed_at: new Date().toISOString() 
        })
        .eq('id', trans.id);

      if (transErr) throw transErr;

      alert("Opération réussie !");
    } catch (err: any) {
      alert("Erreur lors du traitement : " + err.message);
    } finally {
      setProcessingId(null);
      fetchTransactions();
    }
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 font-black italic uppercase tracking-tighter">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-center bg-slate-900/50 p-8 rounded-[2rem] border border-white/5">
          <h1 className="text-3xl text-emerald-500">Flux Financiers</h1>
          <div className="text-right">
             <p className="text-[10px] text-slate-500">Demandes en attente</p>
             <p className="text-xl">{transactions.filter(t => t.status === 'pending').length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {transactions.map((t) => (
            <div key={t.id} className={`bg-slate-900/40 p-6 rounded-[2rem] border ${t.status === 'pending' ? 'border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.05)]' : 'border-white/5 opacity-60'} flex flex-col md:flex-row justify-between items-center gap-6`}>
              
              {/* TYPE & MONTANT */}
              <div className="flex items-center gap-4 flex-1">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${t.type === 'deposit' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                  {t.type === 'deposit' ? <ArrowUpCircle size={30} /> : <ArrowDownCircle size={30} />}
                </div>
                <div>
                  <p className="text-xl">{t.amount} HTG</p>
                  <p className="text-[9px] text-slate-500 not-italic tracking-widest">{t.type === 'deposit' ? 'DÉPÔT' : 'RETRAIT'} • {new Date(t.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {/* CLIENT INFO */}
              <div className="flex-1 text-center md:text-left">
                <p className="text-xs text-white">{t.profiles?.full_name || 'Client Inconnu'}</p>
                <p className="text-[8px] text-slate-500 not-italic">Solde: {t.profiles?.balance} HTG</p>
              </div>

              {/* PREUVE OU CONTACT */}
              <div className="flex-1 flex justify-center gap-2">
                {t.proof_url ? (
                  <a 
                    href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/payment-proofs/${t.proof_url}`} 
                    target="_blank" 
                    className="flex items-center gap-2 bg-emerald-500 text-slate-950 px-4 py-2 rounded-xl text-[10px]"
                  >
                    <Eye size={14}/> Voir Preuve
                  </a>
                ) : t.phone_number ? (
                  <div className="flex items-center gap-2 bg-blue-500/10 text-blue-500 px-4 py-2 rounded-xl text-[10px] border border-blue-500/20">
                    <Smartphone size={14}/> {t.phone_number}
                  </div>
                ) : null}
              </div>

              {/* ACTIONS */}
              <div className="flex gap-2 w-full md:w-auto">
                {t.status === 'pending' ? (
                  <>
                    <button 
                      onClick={() => traiterTransaction(t, 'rejected')} 
                      disabled={!!processingId} 
                      className="flex-1 md:flex-none px-6 py-4 bg-rose-500/10 text-rose-500 rounded-2xl text-[10px] hover:bg-rose-500 hover:text-white transition-all"
                    >
                      Refuser
                    </button>
                    <button 
                      onClick={() => traiterTransaction(t, 'approved')} 
                      disabled={!!processingId} 
                      className="flex-1 md:flex-none px-6 py-4 bg-emerald-500 text-slate-950 rounded-2xl text-[10px] hover:scale-105 transition-all"
                    >
                      {processingId === t.id ? <Loader2 className="animate-spin" /> : "Approuver"}
                    </button>
                  </>
                ) : (
                  <div className={`px-8 py-3 rounded-2xl text-[10px] border ${t.status === 'approved' ? 'border-emerald-500/30 text-emerald-500' : 'border-rose-500/30 text-rose-500'}`}>
                    {t.status === 'approved' ? 'Transaction Validée' : 'Demande Refusée'}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
