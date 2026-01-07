"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Check, X, Clock, ExternalLink, 
  Search, Filter, Loader2, AlertCircle,
  ArrowUpRight, ArrowDownLeft, User as UserIcon
} from 'lucide-react';

export default function AdminDemandes() {
  const [demandes, setDemandes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchDemandes();
    
    // Realtime : Si un client envoie une nouvelle demande, elle apparaît sans rafraîchir
    const channel = supabase.channel('admin-flux-financier')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, () => fetchDemandes())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchDemandes = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, profiles(username, phone, balance)')
      .eq('status', 'en_attente')
      .order('created_at', { ascending: false });

    if (!error) setDemandes(data || []);
    setLoading(false);
  };

  const validerTransaction = async (trx: any, decision: 'approuve' | 'refuse') => {
    const confirmation = confirm(`Voulez-vous vraiment ${decision === 'approuve' ? 'APPROUVER' : 'REFUSER'} cette transaction de ${trx.amount} HTG ?`);
    if (!confirmation) return;

    setProcessingId(trx.id);

    try {
      if (decision === 'approuve') {
        if (trx.type === 'depot') {
          // Pour un dépôt, on ajoute l'argent sur le compte du client
          const { error: rpcError } = await supabase.rpc('increment_balance', { 
            user_id: trx.user_id, 
            amount: trx.amount 
          });
          if (rpcError) throw rpcError;
        }
        // Pour un retrait, l'argent a déjà été déduit lors de la demande (sécurité client)
        // Donc on ne fait que valider le statut.
      } else {
        // En cas de REFUS d'un retrait, il faut RENDRE l'argent au client
        if (trx.type === 'retrait') {
          const { error: rpcError } = await supabase.rpc('increment_balance', { 
            user_id: trx.user_id, 
            amount: trx.amount 
          });
          if (rpcError) throw rpcError;
        }
      }

      // Mise à jour du statut final
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ status: decision === 'approuve' ? 'valide' : 'refuse' })
        .eq('id', trx.id);

      if (updateError) throw updateError;

      alert("Transaction traitée avec succès !");
      fetchDemandes();
    } catch (err: any) {
      alert("Erreur critique : " + err.message);
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
    <main className="min-h-screen bg-[#020617] p-4 md:p-10 text-white font-sans">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">
              Flux <span className="text-emerald-500">Financiers</span>
            </h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">
              Validation des demandes en attente ({demandes.length})
            </p>
          </div>
          <div className="flex gap-2 bg-slate-900/50 p-2 rounded-2xl border border-white/5">
             <div className="px-4 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-500 text-[9px] font-black uppercase tracking-widest">
                Sécurité Activée
             </div>
          </div>
        </div>

        {/* LISTE DES DEMANDES */}
        <div className="grid gap-6">
          {demandes.length === 0 ? (
            <div className="bg-slate-900/30 border border-white/5 p-20 rounded-[3rem] text-center">
               <Clock className="mx-auto text-slate-800 mb-4" size={48} />
               <p className="text-slate-600 font-black uppercase text-[10px] tracking-widest">Aucune demande en attente</p>
            </div>
          ) : demandes.map((d) => (
            <div key={d.id} className="bg-slate-900 border border-white/5 p-8 rounded-[2.5rem] flex flex-col lg:flex-row gap-8 items-center group hover:border-emerald-500/20 transition-all">
              
              {/* INFO CLIENT */}
              <div className="flex items-center gap-4 min-w-[250px]">
                <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 text-slate-500">
                  <UserIcon size={24} />
                </div>
                <div>
                  <h3 className="font-black uppercase text-sm">{d.profiles?.username}</h3>
                  <p className="text-[10px] text-slate-500 font-bold">{d.profiles?.phone}</p>
                  <p className="text-[9px] text-emerald-500/60 font-black uppercase mt-1">Solde: {d.profiles?.balance} HTG</p>
                </div>
              </div>

              {/* TYPE & MONTANT */}
              <div className="flex-1 flex items-center justify-center gap-8">
                <div className="text-center">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Type</p>
                  <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${
                    d.type === 'depot' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                  }`}>
                    {d.type === 'depot' ? <ArrowUpRight size={12}/> : <ArrowDownLeft size={12}/>}
                    {d.type}
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Montant</p>
                  <p className="text-2xl font-black italic">{d.amount} <span className="text-[10px] not-italic text-slate-600">HTG</span></p>
                </div>

                {d.proof_url && (
                  <div className="text-center">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Preuve</p>
                    <a href={d.proof_url} target="_blank" className="p-3 bg-slate-950 rounded-xl border border-white/5 text-emerald-500 hover:bg-emerald-500 hover:text-black transition-all flex items-center justify-center">
                      <ExternalLink size={18} />
                    </a>
                  </div>
                )}
              </div>

              {/* ACTIONS */}
              <div className="flex gap-3">
                <button
                  disabled={!!processingId}
                  onClick={() => validerTransaction(d, 'approuve')}
                  className="h-14 px-8 bg-emerald-500 text-slate-950 rounded-2xl font-black text-[10px] tracking-widest hover:scale-105 transition-all shadow-lg shadow-emerald-500/10 flex items-center gap-2"
                >
                  {processingId === d.id ? <Loader2 className="animate-spin" size={16}/> : <Check size={18}/>}
                  APPROUVER
                </button>
                <button
                  disabled={!!processingId}
                  onClick={() => validerTransaction(d, 'refuse')}
                  className="h-14 px-6 bg-slate-950 border border-white/5 text-rose-500 rounded-2xl font-black text-[10px] tracking-widest hover:bg-rose-500 hover:text-white transition-all"
                >
                  {processingId === d.id ? <Loader2 className="animate-spin" size={16}/> : <X size={18}/>}
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </main>
  );
}
