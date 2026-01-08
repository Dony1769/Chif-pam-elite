"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Upload, 
  Loader2, 
  History, 
  CheckCircle2, 
  Clock, 
  XCircle,
  Smartphone
} from 'lucide-react';

export default function FinancePage() {
  const [view, setView] = useState<'menu' | 'deposit' | 'withdrawal'>('menu');
  const [profile, setProfile] = useState<{balance: number, locked_balance: number} | null>(null);
  const [loading, setLoading] = useState(true);
  const [issubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const fetchProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('balance, locked_balance').eq('id', user.id).single();
      setProfile(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProfile();
    // Sync realtime pour le solde
    const sub = supabase.channel('finance-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchProfile())
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [fetchProfile]);

  // LOGIQUE DÉPÔT
  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !amount) return alert("Remplissez tous les champs");
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Math.random()}.${fileExt}`;
      const filePath = `proofs/${fileName}`;

      // 1. Upload Image
      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Créer transaction
      const { error: transError } = await supabase.from('transactions').insert({
        user_id: user?.id,
        type: 'deposit',
        amount: parseFloat(amount),
        proof_url: filePath,
        status: 'pending'
      });

      if (transError) throw transError;

      alert("Demande de dépôt envoyée ! En attente de validation admin.");
      setView('menu');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // LOGIQUE RETRAIT
  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || !phone) return alert("Remplissez tous les champs");
    if (amt > (profile?.balance || 0) - (profile?.locked_balance || 0)) return alert("Solde disponible insuffisant");

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // 1. Utiliser le RPC pour bloquer le montant (balance -> locked_balance)
      const { error: rpcError } = await supabase.rpc('initiate_withdrawal', {
        user_id_param: user?.id,
        amount_param: amt
      });

      if (rpcError) throw rpcError;

      // 2. Créer la transaction
      const { error: transError } = await supabase.from('transactions').insert({
        user_id: user?.id,
        type: 'withdrawal',
        amount: amt,
        phone_number: phone,
        status: 'pending'
      });

      if (transError) throw transError;

      alert("Demande de retrait enregistrée. Le montant est bloqué jusqu'à validation.");
      setView('menu');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

  const availableBalance = (profile?.balance || 0) - (profile?.locked_balance || 0);

  return (
    <main className="min-h-screen bg-[#020617] text-white p-6 uppercase italic font-black">
      <div className="max-w-md mx-auto space-y-8">
        
        {/* SOLDE CARD */}
        <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
          <p className="text-[10px] text-slate-500 tracking-widest mb-2">Solde Disponible</p>
          <h2 className="text-4xl text-emerald-500 mb-4">{availableBalance.toLocaleString()} HTG</h2>
          {profile?.locked_balance! > 0 && (
            <div className="flex items-center gap-2 text-[10px] text-amber-500 bg-amber-500/10 p-2 rounded-xl">
              <Clock size={12} /> {profile?.locked_balance} HTG bloqués (Retrait en cours)
            </div>
          )}
        </div>

        {view === 'menu' && (
          <div className="grid grid-cols-1 gap-4">
            <button onClick={() => setView('deposit')} className="p-8 bg-emerald-500 text-slate-950 rounded-[2rem] flex flex-col items-center gap-3">
              <ArrowUpCircle size={32} /> Dépôt
            </button>
            <button onClick={() => setView('withdrawal')} className="p-8 bg-slate-900 border border-white/5 rounded-[2rem] flex flex-col items-center gap-3">
              <ArrowDownCircle size={32} className="text-emerald-500" /> Retrait
            </button>
          </div>
        )}

        {view === 'deposit' && (
          <form onSubmit={handleDeposit} className="space-y-6 bg-slate-900 p-8 rounded-[2.5rem] border border-white/5">
            <h3 className="text-center text-emerald-500">Effectuer un Dépôt</h3>
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500">Montant HTG</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl outline-none" placeholder="Ex: 1000" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500">Preuve de paiement (Image)</label>
              <label className="w-full flex flex-col items-center p-6 bg-black/40 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-emerald-500/50 transition-all">
                <Upload size={24} className="text-slate-500 mb-2" />
                <span className="text-[8px]">{file ? file.name : "Cliquez pour uploader"}</span>
                <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} className="hidden" />
              </label>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setView('menu')} className="flex-1 py-4 bg-slate-950 rounded-xl">Annuler</button>
              <button type="submit" disabled={issubmitting} className="flex-1 py-4 bg-emerald-500 text-slate-950 rounded-xl flex justify-center">
                {issubmitting ? <Loader2 className="animate-spin" /> : "Soumettre"}
              </button>
            </div>
          </form>
        )}

        {view === 'withdrawal' && (
          <form onSubmit={handleWithdrawal} className="space-y-6 bg-slate-900 p-8 rounded-[2.5rem] border border-white/5">
            <h3 className="text-center text-emerald-500">Demander un Retrait</h3>
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500">Montant à retirer</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl outline-none" placeholder="Ex: 500" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500">Numéro de réception</label>
              <div className="relative">
                <Smartphone className="absolute left-4 top-4 text-slate-500" size={18} />
                <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-black/40 border border-white/10 p-4 pl-12 rounded-xl outline-none" placeholder="Ex: 4848..." />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setView('menu')} className="flex-1 py-4 bg-slate-950 rounded-xl">Annuler</button>
              <button type="submit" disabled={issubmitting} className="flex-1 py-4 bg-white text-slate-950 rounded-xl flex justify-center">
                {issubmitting ? <Loader2 className="animate-spin" /> : "Confirmer"}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}

