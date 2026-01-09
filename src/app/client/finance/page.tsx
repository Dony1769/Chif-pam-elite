"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Upload, 
  Loader2, 
  Clock, 
  Smartphone,
  ChevronLeft,
  TrendingUp,
  Wallet
} from 'lucide-react';

// --- COMPOSANT LOGO CHIF-PAM (SVG INTÉGRÉ) ---
const LogoChifPam = ({ className }: { className?: string }) => (
  <div className={`flex flex-col items-center ${className}`}>
    <svg viewBox="0 0 100 100" className="w-12 h-12 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M75 35.5C71.5 28.5 64.2 24 56 24C41.6 24 30 35.6 30 50C30 64.4 41.6 76 56 76C66.5 76 75.5 69.8 79.5 61" stroke="#10B981" strokeWidth="8" strokeLinecap="round" />
      <path d="M55 45L76 24M76 24H58M76 24V42" stroke="#10B981" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <span className="text-[10px] font-black tracking-tighter text-white mt-1">CHIF-<span className="text-emerald-500">PAM</span></span>
  </div>
);

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
    const sub = supabase.channel('finance-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchProfile())
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [fetchProfile]);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !amount) return alert("Remplissez tous les champs");
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Math.random()}.${fileExt}`;
      const filePath = `proofs/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('payment-proofs').upload(filePath, file);
      if (uploadError) throw uploadError;
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

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || !phone) return alert("Remplissez tous les champs");
    if (amt > (profile?.balance || 0) - (profile?.locked_balance || 0)) return alert("Solde disponible insuffisant");
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error: rpcError } = await supabase.rpc('initiate_withdrawal', {
        user_id_param: user?.id,
        amount_param: amt
      });
      if (rpcError) throw rpcError;
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

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-4">
      <LogoChifPam className="animate-pulse" />
      <Loader2 className="animate-spin text-emerald-500" />
    </div>
  );

  const availableBalance = (profile?.balance || 0) - (profile?.locked_balance || 0);

  return (
    <main className="min-h-screen bg-[#020617] text-white p-6 uppercase italic font-black">
      <div className="max-w-md mx-auto space-y-8 animate-in fade-in duration-500">
        
        {/* HEADER AVEC LOGO ET BOUTON RETOUR */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => view === 'menu' ? window.history.back() : setView('menu')}
            className="p-3 bg-slate-900 rounded-2xl border border-white/5 hover:bg-slate-800 transition-all active:scale-90"
          >
            <ChevronLeft size={24} className="text-emerald-500" />
          </button>
          <LogoChifPam />
          <div className="w-12" /> {/* Spacer pour centrer le logo */}
        </div>

        {/* SOLDE CARD - EFFET VIVANT */}
        <div className="relative group overflow-hidden bg-slate-900 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl transition-all hover:border-emerald-500/30">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
            <Wallet size={80} />
          </div>
          
          <p className="text-[10px] text-slate-500 tracking-widest mb-2 flex items-center gap-2">
            <TrendingUp size={12} className="text-emerald-500" /> Solde Disponible
          </p>
          <h2 className="text-4xl text-emerald-500 mb-4 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
            {availableBalance.toLocaleString()} <span className="text-sm text-white/50">HTG</span>
          </h2>
          
          {profile?.locked_balance! > 0 && (
            <div className="flex items-center gap-2 text-[10px] text-amber-500 bg-amber-500/10 p-3 rounded-2xl border border-amber-500/20 animate-pulse">
              <Clock size={14} /> {profile?.locked_balance} HTG bloqués (Retrait en cours)
            </div>
          )}
        </div>

        {view === 'menu' && (
          <div className="grid grid-cols-1 gap-4">
            <button 
              onClick={() => setView('deposit')} 
              className="group p-8 bg-emerald-500 text-slate-950 rounded-[2rem] flex flex-col items-center gap-3 transition-all hover:bg-emerald-400 active:scale-95 shadow-lg shadow-emerald-500/20"
            >
              <ArrowUpCircle size={36} className="group-hover:translate-y-[-4px] transition-transform" /> 
              <span className="text-lg">Dépôt</span>
            </button>
            <button 
              onClick={() => setView('withdrawal')} 
              className="group p-8 bg-slate-900 border border-white/5 rounded-[2rem] flex flex-col items-center gap-3 transition-all hover:bg-slate-800 active:scale-95"
            >
              <ArrowDownCircle size={36} className="text-emerald-500 group-hover:translate-y-[4px] transition-transform" /> 
              <span className="text-lg">Retrait</span>
            </button>
          </div>
        )}

        {/* FORMULAIRES AVEC EFFETS DE TRANSITION */}
        {view === 'deposit' && (
          <form onSubmit={handleDeposit} className="space-y-6 bg-slate-900 p-8 rounded-[2.5rem] border border-emerald-500/20 animate-in slide-in-from-bottom-4 duration-300">
            <h3 className="text-center text-emerald-500 text-xl">Effectuer un Dépôt</h3>
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 ml-2 uppercase">Montant HTG</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none focus:border-emerald-500 transition-all text-emerald-500 text-lg" placeholder="Ex: 1000" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 ml-2 uppercase">Preuve de paiement (Image)</label>
              <label className="w-full flex flex-col items-center p-8 bg-black/40 border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:border-emerald-500/50 transition-all hover:bg-emerald-500/5 group">
                <Upload size={32} className="text-slate-500 mb-2 group-hover:text-emerald-500 transition-colors" />
                <span className="text-[10px] text-slate-400">{file ? file.name : "Cliquez pour uploader"}</span>
                <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} className="hidden" />
              </label>
            </div>
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => setView('menu')} className="flex-1 py-5 bg-slate-950 rounded-2xl border border-white/5 hover:bg-red-500/10 hover:text-red-500 transition-all">Annuler</button>
              <button type="submit" disabled={issubmitting} className="flex-1 py-5 bg-emerald-500 text-slate-950 rounded-2xl flex justify-center items-center shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 active:scale-95 transition-all">
                {issubmitting ? <Loader2 className="animate-spin" /> : "Soumettre"}
              </button>
            </div>
          </form>
        )}

        {view === 'withdrawal' && (
          <form onSubmit={handleWithdrawal} className="space-y-6 bg-slate-900 p-8 rounded-[2.5rem] border border-amber-500/20 animate-in slide-in-from-bottom-4 duration-300">
            <h3 className="text-center text-amber-500 text-xl">Demander un Retrait</h3>
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 ml-2 uppercase">Montant à retirer</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none focus:border-amber-500 transition-all text-amber-500 text-lg" placeholder="Ex: 500" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 ml-2 uppercase">Numéro de réception</label>
              <div className="relative">
                <Smartphone className="absolute left-5 top-5 text-slate-500" size={20} />
                <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-black/40 border border-white/10 p-5 pl-14 rounded-2xl outline-none focus:border-amber-500 transition-all" placeholder="Ex: 4848..." />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => setView('menu')} className="flex-1 py-5 bg-slate-950 rounded-2xl border border-white/5">Annuler</button>
              <button type="submit" disabled={issubmitting} className="flex-1 py-5 bg-white text-slate-950 rounded-2xl flex justify-center items-center hover:bg-slate-200 active:scale-95 transition-all">
                {issubmitting ? <Loader2 className="animate-spin" /> : "Confirmer"}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}

