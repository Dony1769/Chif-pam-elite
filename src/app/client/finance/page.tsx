"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { FINANCE_PAYMENT_METHODS, type FinancePaymentMethod } from '@/lib/constants/finance';
import { ClientFinanceService } from '@/services/client/finance';
import { 
  ArrowUpCircle, ArrowDownCircle, Upload, Loader2, Clock, 
  Smartphone, ChevronLeft, TrendingUp, Wallet, CheckCircle2, Copy
} from 'lucide-react';
import dynamic from 'next/dynamic';

const AdsterraNativeBanner = dynamic(() => import('@/components/ads/AdsterraNativeBanner'), { ssr: false });

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
  const [method, setMethod] = useState<FinancePaymentMethod | null>(null);
  const [profile, setProfile] = useState<{balance: number, locked_balance: number} | null>(null);
  const [loading, setLoading] = useState(true);
  const [issubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const adminNumbers = {
    NatCash: "+509 4045 1937",
    MonCash: "+509 4719 3408"
  };

  const fetchProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      const { data } = await supabase.from('profiles').select('balance, locked_balance').eq('id', user.id).single();
      setProfile(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (!userId) return;
    const sub = supabase.channel('finance-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` }, () => fetchProfile())
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [fetchProfile, userId]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !amount || !method) return alert("Remplissez tous les champs et choisissez une méthode");
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Session expirée. Reconnectez-vous.');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${crypto.randomUUID()}.${fileExt}`;
      const filePath = `proofs/${fileName}`;
      
      const { error: uploadError } = await supabase.storage.from('payment-proofs').upload(filePath, file);
      if (uploadError) throw uploadError;

      const result = await ClientFinanceService.submitDeposit(parseFloat(amount), method, filePath);
      if (!result.success) {
        throw new Error(result.message);
      }

      alert(result.message);
      setView('menu');
      setMethod(null);
      setAmount('');
      setFile(null);
    } catch (err: unknown) { alert(err instanceof Error ? err.message : 'Erreur inconnue'); } 
    finally { setIsSubmitting(false); }
  };

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || !phone || !method) return alert("Remplissez tous les champs");
    if (amt > (profile?.balance || 0) - (profile?.locked_balance || 0)) return alert("Solde disponible insuffisant");
    
    setIsSubmitting(true);
    try {
      const result = await ClientFinanceService.submitWithdrawal(amt, method, phone);
      if (!result.success) {
        throw new Error(result.message);
      }

      alert(result.message);
      setView('menu');
      setMethod(null);
      setAmount('');
      setPhone('');
    } catch (err: unknown) { alert(err instanceof Error ? err.message : 'Erreur inconnue'); } 
    finally { setIsSubmitting(false); }
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

  const availableBalance = (profile?.balance || 0) - (profile?.locked_balance || 0);

  return (
    <main className="min-h-screen bg-[#020617] text-white p-6 uppercase italic font-black">
      <div className="max-w-md mx-auto space-y-8 animate-in fade-in duration-500">
        
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              if (method) {
                setMethod(null);
                return;
              }
              if (view === 'menu') {
                window.history.back();
                return;
              }
              setView('menu');
            }}
            className="p-3 bg-slate-900 rounded-2xl border border-white/5 hover:bg-slate-800 transition-all active:scale-90"
          >
            <ChevronLeft size={24} className="text-emerald-500" />
          </button>
          <LogoChifPam />
          <div className="w-12" />
        </div>

        <div className="relative group overflow-hidden bg-slate-900 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl transition-all hover:border-emerald-500/30">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform"><Wallet size={80} /></div>
          <p className="text-[10px] text-slate-500 tracking-widest mb-2 flex items-center gap-2"><TrendingUp size={12} className="text-emerald-500" /> Solde Disponible</p>
          <h2 className="text-4xl text-emerald-500 mb-4">{availableBalance.toLocaleString()} <span className="text-sm text-white/50">HTG</span></h2>
          {(profile?.locked_balance ?? 0) > 0 && (
            <div className="flex items-center gap-2 text-[10px] text-amber-500 bg-amber-500/10 p-3 rounded-2xl border border-amber-500/20 animate-pulse">
              <Clock size={14} /> {profile?.locked_balance} HTG bloqués
            </div>
          )}
        </div>

        {view === 'menu' && (
          <div className="grid grid-cols-1 gap-4">
            <button onClick={() => setView('deposit')} className="group p-8 bg-emerald-500 text-slate-950 rounded-4xl flex flex-col items-center gap-3 transition-all hover:bg-emerald-400 active:scale-95 shadow-lg shadow-emerald-500/20">
              <ArrowUpCircle size={36} className="group-hover:-translate-y-1 transition-transform" /> <span className="text-lg">Dépôt</span>
            </button>
            <div>
              <button onClick={() => setView('withdrawal')} className="group p-8 bg-slate-900 border border-white/5 rounded-4xl flex flex-col items-center gap-3 transition-all hover:bg-slate-800 active:scale-95">
                <ArrowDownCircle size={36} className="text-emerald-500 group-hover:translate-y-1 transition-transform" /> <span className="text-lg">Retrait</span>
              </button>

              {/* --- Native Banner Adsterra juste sous la case Retrait --- */}
              <div className="mt-4">
                <AdsterraNativeBanner />
              </div>
            </div>
          </div>
        )}

        {(view === 'deposit' || view === 'withdrawal') && !method && (
          <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
            <h3 className="text-center text-emerald-500 text-sm tracking-widest">Choisir le service</h3>
            {FINANCE_PAYMENT_METHODS.map(m => (
              <button key={m} onClick={() => setMethod(m)} className="w-full p-6 bg-slate-900/50 border border-white/10 rounded-2xl flex items-center justify-between hover:bg-slate-800 transition-all">
                <span className={m === 'MonCash' ? 'text-[#CC1011]' : 'text-emerald-500'}>{m}</span>
                <Smartphone size={20} className="text-slate-500" />
              </button>
            ))}
          </div>
        )}

        {/* Formulaires Dépôt */}
        {view === 'deposit' && method && (
          <form onSubmit={handleDeposit} className="space-y-6 bg-slate-900 p-8 rounded-[2.5rem] border border-emerald-500/20 animate-in zoom-in-95 duration-300">
            <div className="text-center space-y-2">
              <h3 className="text-emerald-500 text-lg">Dépôt via {method}</h3>
              <div onClick={() => copyToClipboard(adminNumbers[method])} className="p-4 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-between cursor-pointer active:scale-95 transition-all">
                <span className="text-sm font-sans tracking-normal italic-none">{adminNumbers[method]}</span>
                {copied ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} className="text-slate-500" />}
              </div>
            </div>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none focus:border-emerald-500 transition-all text-emerald-500" placeholder="Montant HTG" />
            <label className="w-full flex flex-col items-center p-8 bg-black/40 border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:border-emerald-500/50 transition-all">
              <Upload size={32} className="text-slate-500 mb-2" />
              <span className="text-[10px] text-slate-400">{file ? file.name : "Preuve (Image)"}</span>
              <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} className="hidden" />
            </label>
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => setMethod(null)} className="flex-1 py-5 bg-slate-950 rounded-2xl border border-white/5">Retour</button>
              <button type="submit" disabled={issubmitting} className="flex-1 py-5 bg-emerald-500 text-slate-950 rounded-2xl flex justify-center items-center shadow-lg">{issubmitting ? <Loader2 className="animate-spin" /> : "Envoyer"}</button>
            </div>
          </form>
        )}

        {/* Formulaire Retrait */}
        {view === 'withdrawal' && method && (
          <form onSubmit={handleWithdrawal} className="space-y-6 bg-slate-900 p-8 rounded-[2.5rem] border border-amber-500/20 animate-in zoom-in-95 duration-300">
            <h3 className="text-center text-amber-500 text-xl">Retrait {method}</h3>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none focus:border-amber-500 transition-all text-amber-500" placeholder="Montant HTG" />
            <div className="relative">
              <Smartphone className="absolute left-5 top-5 text-slate-500" size={20} />
              <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-black/40 border border-white/10 p-5 pl-14 rounded-2xl outline-none focus:border-amber-500 transition-all font-sans" placeholder="Numéro Réception" />
            </div>
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => setMethod(null)} className="flex-1 py-5 bg-slate-950 rounded-2xl border border-white/5">Retour</button>
              <button type="submit" disabled={issubmitting} className="flex-1 py-5 bg-white text-slate-950 rounded-2xl flex justify-center items-center">{issubmitting ? <Loader2 className="animate-spin" /> : "Confirmer"}</button>
            </div>

            {/* --- Native Banner Adsterra sous le formulaire Retrait --- */}
            <div className="mt-6">
              <AdsterraNativeBanner />
            </div>
          </form>
        )}

      </div>
    </main>
  );
              }
