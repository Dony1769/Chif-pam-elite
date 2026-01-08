"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  CheckCircle2, XCircle, Clock, 
  ArrowUpCircle, ArrowDownCircle, 
  Eye, Loader2, Smartphone, AlertCircle 
} from 'lucide-react';

export default function AdminDemandes() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchTransactions();
    // Realtime pour voir les demandes arriver
    const channel = supabase.channel('admin-finance')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchTransactions())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchTransactions = async () => {
    // On récupère les données directement avec une jointure simple
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        profiles (
          id,
          balance,
          locked_balance
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Erreur de récupération:", error);
    } else {
      setTransactions(data || []);
    }
    setLoading(false);
  };

  const traiterDemande = async (trans: any, status: 'approved' | 'rejected') => {
    if (!confirm(`Confirmer ${status === 'approved' ? 'l’approbation' : 'le refus'} de ${trans.amount} HTG ?`)) return;
    
    setProcessingId(trans.id);
    let note = "";
    if (status === 'rejected') {
      note = prompt("Raison du refus (ex: Preuve invalide) :") || "Demande refusée par l'admin";
    }

    try {
      // --- LOGIQUE MÉTIER SELON LE RAPPORT ---
      
      if (trans.type === 'deposit' && status === 'approved') {
        // 1. Créditer la BALANCE (profiles)
        await supabase.rpc('increment_balance', { 
          user_id: trans.user_id, 
          amount: trans.amount 
        });
      } 
      
      else if (trans.type === 'withdrawal') {
        if (status === 'rejected') {
          // 2. REFUS RETRAIT : Rembourser (Locked -> Balance)
          await supabase.rpc('refund_withdrawal', { 
            user_id_param: trans.user_id, 
            amount_param: trans.amount 
          });
        } else {
          // 3. APPROUVER RETRAIT : L'argent sort du locked_balance définitivement
          const newLocked = Math.max(0, (trans.profiles?.locked_balance || 0) - trans.amount);
          await supabase.from('profiles')
            .update({ locked_balance: newLocked })
            .eq('id', trans.user_id);
        }
      }

      // --- MISE À JOUR DU STATUT DE LA TRANSACTION ---
      const { error: finalError } = await supabase
        .from('transactions')
        .update({ 
          status: status, 
          admin_note: note,
          processed_at: new Date().toISOString() 
        })
        .eq('id', trans.id);

      if (finalError) throw finalError;

      alert("Opération réussie");
      fetchTransactions();
    } catch (err: any) {
      alert("Erreur système : " + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 font-black italic uppercase tracking-tighter">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <div className="flex justify-between items-end border-b border-white/10 pb-6">
          <h1 className="text-4xl text-emerald-500">Demandes <span className="text-white">Financières</span></h1>
          <p className="text-[10px] text-slate-500">En attente : {transactions.filter(t => t.status === 'pending').length}</p>
        </div>

        <div className="grid gap-4">
          {transactions.map((t) => (
            <div key={t.id} className={`bg-slate-900/40 border ${t.status === 'pending' ? 'border-amber-500/30' : 'border-white/5'} p-6 rounded-[2rem] flex flex-col md:flex-row justify-between items-center gap-6 transition-all`}>
              
              <div className="flex items-center gap-4 flex-1">
                <div className={`p-4 rounded-2xl ${t.type === 'deposit' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                  {t.type === 'deposit' ? <ArrowUpCircle size={30} /> : <ArrowDownCircle size={30} />}
                </div>
                <div>
                  <h3 className="text-xl">{t.amount} HTG</h3>
                  <p className="text-[9px] text-slate-500 not-italic tracking-widest">{t.type === 'deposit' ? 'Dépôt' : 'Retrait'} • {new Date(t.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="flex gap-3 flex-1 justify-center">
                {t.proof_url && (
                  <a href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/payment-proofs/${t.proof_url}`} target="_blank" className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-xl text-[9px]">
                    <Eye size={14}/> Preuve
                  </a>
                )}
                {t.phone_number && (
                  <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-xl text-[9px] border border-white/5">
                    <Smartphone size={14} className="text-emerald-500" /> {t.phone_number}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {t.status === 'pending' ? (
                  <>
                    <button onClick={() => traiterDemande(t, 'rejected')} disabled={!!processingId} className="px-6 py-4 bg-rose-600 rounded-xl text-[10px] hover:bg-rose-700 transition-colors disabled:opacity-50">Refuser</button>
                    <button onClick={() => traiterDemande(t, 'approved')} disabled={!!processingId} className="px-6 py-4 bg-emerald-500 text-black rounded-xl text-[10px] hover:bg-emerald-400 transition-colors disabled:opacity-50">Approuver</button>
                  </>
                ) : (
                  <div className={`flex items-center gap-2 px-6 py-3 rounded-xl border ${t.status === 'approved' ? 'border-emerald-500/30 text-emerald-500' : 'border-rose-500/30 text-rose-500'} text-[10px]`}>
                    {t.status === 'approved' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                    {t.status}
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
