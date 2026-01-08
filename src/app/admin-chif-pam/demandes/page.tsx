"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  CheckCircle2, XCircle, Clock, 
  ArrowUpCircle, ArrowDownCircle, Eye, Loader2, MessageSquare, AlertTriangle
} from 'lucide-react';

export default function AdminDemandes() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchTransactions();
    // Realtime pour voir les demandes arriver
    const sub = supabase.channel('admin-finance-watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchTransactions())
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  const fetchTransactions = async () => {
    try {
      // On récupère la transaction ET les données du profil associé (balance/locked)
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          profiles:user_id (
            id,
            balance,
            locked_balance
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      console.error("Erreur lors du chargement:", err);
    } finally {
      setLoading(false);
    }
  };

  const traiterTransaction = async (trans: any, action: 'approved' | 'rejected') => {
    setProcessingId(trans.id);
    const note = action === 'rejected' ? prompt("Raison du refus :") : "Validé par l'admin";
    
    try {
      // --- LOGIQUE DÉPÔT ---
      if (trans.type === 'deposit' && action === 'approved') {
        const { error: rpcErr } = await supabase.rpc('increment_balance', { 
          user_id: trans.user_id, 
          amount: trans.amount 
        });
        if (rpcErr) throw rpcErr;
      } 

      // --- LOGIQUE RETRAIT ---
      else if (trans.type === 'withdrawal') {
        if (action === 'rejected') {
          // Rembourser (Locked -> Balance)
          const { error: refundErr } = await supabase.rpc('refund_withdrawal', { 
            user_id_param: trans.user_id, 
            amount_param: trans.amount 
          });
          if (refundErr) throw refundErr;
        } else {
          // Approuvé : Déduire du locked_balance définitivement
          const currentLocked = trans.profiles?.locked_balance || 0;
          const { error: updateErr } = await supabase
            .from('profiles')
            .update({ locked_balance: Math.max(0, currentLocked - trans.amount) })
            .eq('id', trans.user_id);
          if (updateErr) throw updateErr;
        }
      }

      // --- MISE À JOUR STATUT TRANSACTION ---
      const { error: finalError } = await supabase
        .from('transactions')
        .update({ 
          status: action, 
          admin_note: note,
          processed_at: new Date().toISOString() 
        })
        .eq('id', trans.id);

      if (finalError) throw finalError;

      alert(`Demande ${action === 'approved' ? 'acceptée' : 'refusée'} avec succès.`);
      fetchTransactions();
    } catch (err: any) {
      console.error(err);
      alert("Erreur lors du traitement : " + (err.message || "Erreur Inconnue"));
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 font-black italic uppercase tracking-tighter">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-center bg-slate-900/50 p-8 rounded-[2.5rem] border border-white/5">
          <h1 className="text-3xl text-emerald-500">Flux Financiers</h1>
          <div className="bg-emerald-500/10 text-emerald-500 px-4 py-2 rounded-full text-[10px] border border-emerald-500/20">
             {transactions.filter(t => t.status === 'pending').length} en attente
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {transactions.map((t) => (
            <div key={t.id} className={`bg-slate-900/50 p-6 rounded-[2rem] border ${t.status === 'pending' ? 'border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.05)]' : 'border-white/5'} flex flex-col md:flex-row justify-between items-center gap-6`}>
              
              <div className="flex items-center gap-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${t.type === 'deposit' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                  {t.type === 'deposit' ? <ArrowUpCircle size={28}/> : <ArrowDownCircle size={28}/>}
                </div>
                <div>
                  <p className="text-lg leading-none">{t.amount} <span className="text-[10px]">HTG</span></p>
                  <p className="text-[9px] text-slate-500 not-italic mt-1 tracking-widest">{t.type === 'deposit' ? 'DEPOT' : 'RETRAIT'} • {new Date(t.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {/* DETAILS : PREUVE OU TELEPHONE */}
              <div className="flex flex-wrap gap-3">
                {t.proof_url && (
                  <button 
                    onClick={() => window.open(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/payment-proofs/${t.proof_url}`, '_blank')}
                    className="flex items-center gap-2 text-[10px] bg-white/5 hover:bg-white/10 px-5 py-3 rounded-xl border border-white/5 transition-all"
                  >
                    <Eye size={16} className="text-emerald-500"/> VOIR LA PREUVE
                  </button>
                )}
                {t.phone_number && (
                  <div className="flex items-center gap-2 text-[10px] bg-black/40 px-5 py-3 rounded-xl border border-white/10">
                    <Smartphone size={16} className="text-blue-500"/> {t.phone_number}
                  </div>
                )}
              </div>

              {/* ACTIONS */}
              <div className="flex gap-2 w-full md:w-auto">
                {t.status === 'pending' ? (
                  <>
                    <button 
                      onClick={() => traiterTransaction(t, 'rejected')} 
                      disabled={processingId === t.id}
                      className="flex-1 md:flex-none px-6 py-4 bg-rose-500/10 text-rose-500 rounded-2xl text-[10px] hover:bg-rose-500 hover:text-white transition-all"
                    >
                      REFUSER
                    </button>
                    <button 
                      onClick={() => traiterTransaction(t, 'approved')} 
                      disabled={processingId === t.id}
                      className="flex-1 md:flex-none px-6 py-4 bg-emerald-500 text-slate-950 rounded-2xl text-[10px] hover:scale-105 transition-all shadow-xl"
                    >
                      {processingId === t.id ? <Loader2 className="animate-spin" /> : "APPROUVER"}
                    </button>
                  </>
                ) : (
                  <div className={`px-6 py-3 rounded-xl text-[10px] border ${t.status === 'approved' ? 'border-emerald-500/20 text-emerald-500 bg-emerald-500/5' : 'border-rose-500/20 text-rose-500 bg-rose-500/5'}`}>
                    {t.status === 'approved' ? '✓ TRANSACTION VALIDÉE' : '✕ TRANSACTION REFUSÉE'}
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

// Icone Smartphone manquante dans les imports précédents, ajoutée ici par précaution
function Smartphone({ size, className }: { size: number, className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>
    </svg>
  );
}

