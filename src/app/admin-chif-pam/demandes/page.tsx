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
    // Realtime pour voir les nouvelles demandes arriver sans rafraîchir
    const channel = supabase.channel('admin-finance-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchTransactions())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, profiles(id, balance, locked_balance)')
      .order('created_at', { ascending: false });
    
    if (data) setTransactions(data);
    setLoading(false);
  };

  const handleAction = async (trans: any, status: 'approved' | 'rejected') => {
    const confirmAction = confirm(`Voulez-vous vraiment ${status === 'approved' ? 'APPROUVER' : 'REFUSER'} cette transaction de ${trans.amount} HTG ?`);
    if (!confirmAction) return;

    setProcessingId(trans.id);
    let note = "";
    if (status === 'rejected') {
      note = prompt("Raison du refus (sera visible par le client) :") || "Refusé par l'administrateur";
    }

    try {
      // 1. LOGIQUE FINANCIÈRE (Impact sur la table PROFILES)
      if (trans.type === 'deposit' && status === 'approved') {
        // Approuver Dépôt : On ajoute à la balance
        await supabase.rpc('increment_balance', { user_id: trans.user_id, amount: trans.amount });
      } 
      
      else if (trans.type === 'withdrawal') {
        if (status === 'rejected') {
          // Refuser Retrait : On rembourse (Locked -> Balance)
          await supabase.rpc('refund_withdrawal', { user_id_param: trans.user_id, amount_param: trans.amount });
        } else {
          // Approuver Retrait : L'argent est déjà déduit de balance, on vide juste le locked_balance
          const newLocked = Math.max(0, (trans.profiles.locked_balance || 0) - trans.amount);
          await supabase.from('profiles').update({ locked_balance: newLocked }).eq('id', trans.user_id);
        }
      }

      // 2. MISE À JOUR DE LA TRANSACTION
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ 
          status: status, 
          admin_note: note,
          processed_at: new Date().toISOString() 
        })
        .eq('id', trans.id);

      if (updateError) throw updateError;
      
      alert("Transaction traitée !");
      fetchTransactions();
    } catch (err: any) {
      alert("Erreur critique : " + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 font-black italic uppercase tracking-tighter">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <div className="flex justify-between items-center bg-slate-900/40 p-8 rounded-[2rem] border border-white/5">
          <div>
            <h1 className="text-3xl">Flux Financiers</h1>
            <p className="text-[9px] text-slate-500 not-italic tracking-[0.3em]">Validation des Dépôts & Retraits</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-emerald-500">{transactions.filter(t => t.status === 'pending').length} En attente</p>
          </div>
        </div>

        <div className="grid gap-4">
          {transactions.length === 0 && <p className="text-center py-20 opacity-20">Aucune transaction enregistrée</p>}
          
          {transactions.map((t) => (
            <div key={t.id} className="bg-slate-900/60 border border-white/5 p-6 rounded-[2rem] flex flex-col md:flex-row justify-between items-center gap-6">
              
              {/* INFOS CLIENT ET TYPE */}
              <div className="flex items-center gap-4 flex-1">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${t.type === 'deposit' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                  {t.type === 'deposit' ? <ArrowUpCircle size={28} /> : <ArrowDownCircle size={28} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{t.amount} HTG</span>
                    <span className={`text-[8px] px-2 py-0.5 rounded-full ${t.status === 'pending' ? 'bg-amber-500 text-black' : t.status === 'approved' ? 'bg-emerald-500 text-black' : 'bg-rose-500 text-white'}`}>
                      {t.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 not-italic lowercase">ID Client: {t.user_id.slice(0,8)}...</p>
                </div>
              </div>

              {/* PREUVES / CONTACT */}
              <div className="flex-1 flex gap-3">
                {t.type === 'deposit' && t.proof_url && (
                  <a 
                    href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/payment-proofs/${t.proof_url}`} 
                    target="_blank" 
                    className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-3 rounded-xl transition-all border border-white/5"
                  >
                    <Eye size={16} className="text-emerald-500" />
                    <span className="text-[9px]">Voir Reçu</span>
                  </a>
                )}
                {t.type === 'withdrawal' && (
                  <div className="flex items-center gap-2 bg-black/40 px-4 py-3 rounded-xl border border-white/5">
                    <Smartphone size={16} className="text-blue-500" />
                    <span className="text-[9px]">{t.phone_number}</span>
                  </div>
                )}
              </div>

              {/* ACTIONS */}
              <div className="flex gap-2 w-full md:w-auto">
                {t.status === 'pending' ? (
                  <>
                    <button 
                      onClick={() => handleAction(t, 'rejected')}
                      disabled={processingId === t.id}
                      className="flex-1 md:flex-none px-6 py-4 bg-rose-500/10 text-rose-500 rounded-xl text-[10px] hover:bg-rose-500 hover:text-white transition-all"
                    >
                      {processingId === t.id ? <Loader2 className="animate-spin" /> : "REFUSER"}
                    </button>
                    <button 
                      onClick={() => handleAction(t, 'approved')}
                      disabled={processingId === t.id}
                      className="flex-1 md:flex-none px-6 py-4 bg-emerald-500 text-slate-950 rounded-xl text-[10px] hover:scale-105 transition-all shadow-lg"
                    >
                      {processingId === t.id ? <Loader2 className="animate-spin" /> : "APPROUVER"}
                    </button>
                  </>
                ) : (
                  <div className="text-[9px] text-slate-600 not-italic">
                    Traité le {new Date(t.processed_at).toLocaleDateString()}
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
