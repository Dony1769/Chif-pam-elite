"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { FINANCE_PAYMENT_METHODS, type FinancePaymentMethod } from '@/lib/constants/finance';
import { ClientFinanceService } from '@/services/client/finance';
import { 
  ArrowUpCircle, ArrowDownCircle, Upload, Loader2, Clock, 
  Smartphone, ChevronLeft, TrendingUp, Wallet, CheckCircle2, Copy, Sparkles, ShieldCheck,
  AlertCircle, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';

const AdsterraNativeBanner = dynamic(() => import('@/components/ads/AdsterraNativeBanner'), { ssr: false });

// Structure pour la gestion des notifications UI (Toasts)
type ToastState = {
  type: 'success' | 'error';
  message: string;
} | null;

// Constantes de configuration financière
const MIN_DEPOSIT_AMOUNT = 25; // Minimum 25 HTG
const MIN_WITHDRAWAL_AMOUNT = 100; // Minimum 100 HTG

const LogoChifPam = ({ className }: { className?: string }) => (
  <div className={`flex flex-col items-center ${className}`}>
    <svg viewBox="0 0 100 100" className="w-12 h-12 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M75 35.5C71.5 28.5 64.2 24 56 24C41.6 24 30 35.6 30 50C30 64.4 41.6 76 56 76C66.5 76 69.8 75.5 61" stroke="#10B981" strokeWidth="8" strokeLinecap="round" />
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

  // État du Toast de notification
  const [toast, setToast] = useState<ToastState>(null);

  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const adminNumbers = {
    NatCash: "+509 4045 1937",
    MonCash: "+509 4719 3408"
  };

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  }, []);

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

  // Traitement de la demande de Dépôt
  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);

    if (!file || isNaN(amt) || !method) {
      return showToast("error", "Veuillez remplir tous les champs et importer une preuve de paiement.");
    }

    // Vérification du dépôt minimum (25 HTG)
    if (amt < MIN_DEPOSIT_AMOUNT) {
      return showToast("error", `Le montant minimum pour un dépôt est de ${MIN_DEPOSIT_AMOUNT} HTG.`);
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${crypto.randomUUID()}.${fileExt}`;
      const filePath = `proofs/${fileName}`;
      
      const { error: uploadError } = await supabase.storage.from('payment-proofs').upload(filePath, file);
      if (uploadError) throw uploadError;

      const result = await ClientFinanceService.submitDeposit(amt, method, filePath);
      if (!result.success) {
        throw new Error(result.message);
      }

      showToast("success", result.message || "Votre demande de dépôt a été transmise avec succès !");
      setView('menu');
      setMethod(null);
      setAmount('');
      setFile(null);
    } catch (err: unknown) { 
      showToast("error", err instanceof Error ? err.message : 'Une erreur inattendue est survenue.'); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  // Traitement de la demande de Retrait
  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    const cleanPhone = phone.replace(/\D/g, '');

    if (isNaN(amt) || !cleanPhone || !method) {
      return showToast("error", "Veuillez remplir tous les champs obligatoires.");
    }

    if (cleanPhone.length !== 8) {
      return showToast("error", "Le numéro de téléphone doit contenir exactement 8 chiffres.");
    }
    
    // Vérification du retrait minimum (100 HTG)
    if (amt < MIN_WITHDRAWAL_AMOUNT) {
      return showToast("error", `Le montant minimum pour un retrait est de ${MIN_WITHDRAWAL_AMOUNT} HTG.`);
    }

    const available = (profile?.balance || 0) - (profile?.locked_balance || 0);
    if (amt > available) {
      return showToast("error", "Solde disponible insuffisant pour effectuer ce retrait.");
    }
    
    setIsSubmitting(true);
    try {
      const result = await ClientFinanceService.submitWithdrawal(amt, method, cleanPhone);
      if (!result.success) {
        throw new Error(result.message);
      }

      showToast("success", result.message || "Demande de retrait envoyée avec succès.");
      setView('menu');
      setMethod(null);
      setAmount('');
      setPhone('');
    } catch (err: unknown) { 
      showToast("error", err instanceof Error ? err.message : 'Une erreur inattendue est survenue.'); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  if (loading) return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.22),_transparent_40%),linear-gradient(135deg,_#030712_0%,_#020617_45%,_#020617_100%)] text-white">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-[2rem] border border-emerald-400/20 bg-slate-900/70 p-8 text-center shadow-[0_24px_80px_rgba(16,185,129,0.15)] backdrop-blur-2xl"
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/10">
            <Loader2 className="h-7 w-7 animate-spin text-emerald-500" />
          </div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-emerald-400 font-bold">Chargement du portefeuille</p>
          <p className="mt-2 text-sm text-slate-400">Préparation de votre espace finance en cours…</p>
        </motion.div>
      </div>
    </main>
  );

  const availableBalance = (profile?.balance || 0) - (profile?.locked_balance || 0);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_30%),linear-gradient(135deg,_#030712_0%,_#020617_45%,_#020617_100%)] text-white relative">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        
        {/* Entête */}
        <div className="mb-4 flex items-center justify-between">
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
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-slate-900/70 text-emerald-500 shadow-[0_10px_30px_rgba(2,6,23,0.45)] transition-all duration-200 active:scale-95 hover:border-emerald-500/40"
          >
            <ChevronLeft size={20} />
          </button>
          <LogoChifPam />
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-400">
            <Sparkles size={18} />
          </div>
        </div>

        {/* Notifications Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className={`mb-4 flex items-center justify-between rounded-2xl border p-4 shadow-lg backdrop-blur-xl ${
                toast.type === 'success'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200 shadow-emerald-950/20'
                  : 'border-red-500/30 bg-red-500/10 text-red-200 shadow-red-950/20'
              }`}
            >
              <div className="flex items-center gap-3">
                {toast.type === 'success' ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
                )}
                <span className="text-xs font-semibold tracking-wide sm:text-sm">{toast.message}</span>
              </div>
              <button
                onClick={() => setToast(null)}
                className="ml-3 rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Solde du portefeuille */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="relative overflow-hidden rounded-[2rem] border border-emerald-400/20 bg-slate-900/70 p-5 shadow-[0_24px_80px_rgba(2,6,23,0.45)] backdrop-blur-2xl sm:p-7"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.22),_transparent_35%)]" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.3em] font-black text-emerald-400">
                <TrendingUp size={12} /> Portefeuille principal
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-400">Solde disponible</p>
                <h2 className="mt-2 text-4xl font-black tracking-tight text-emerald-400 sm:text-5xl">
                  {availableBalance.toLocaleString()} <span className="text-base text-slate-300">HTG</span>
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-[1.4rem] border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
              <div className="rounded-2xl bg-emerald-500/15 p-2 text-emerald-400">
                <Wallet size={18} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">Sécurité</p>
                <p className="font-semibold text-white text-xs">Transactions vérifiées</p>
              </div>
            </div>
          </div>

          {(profile?.locked_balance ?? 0) > 0 && (
            <div className="relative mt-5 flex items-center gap-2 rounded-[1.2rem] border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.25em] text-amber-300">
              <Clock size={14} />
              {profile?.locked_balance} HTG bloqués • en attente de validation
            </div>
          )}
        </motion.section>

        {/* Menu principal */}
        {view === 'menu' && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="mt-5 grid gap-4 lg:grid-cols-2"
          >
            <button
              onClick={() => setView('deposit')}
              className="group relative overflow-hidden rounded-[2rem] border border-emerald-400/30 bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-cyan-500/10 p-6 text-left shadow-[0_20px_60px_rgba(16,185,129,0.16)] transition-all duration-200 hover:-translate-y-1 active:scale-[0.99]"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.16),_transparent_35%)]" />
              <div className="relative flex items-start justify-between">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-emerald-300">
                    <ArrowUpCircle size={14} /> Dépôt rapide (Min 25 HTG)
                  </div>
                  <h3 className="text-xl font-black tracking-tight text-white uppercase">Ajouter des fonds</h3>
                  <p className="mt-2 max-w-xs text-sm text-slate-300">Achetez des jetons de jeu à partir de 25 HTG seulement.</p>
                </div>
                <div className="rounded-2xl border border-emerald-400/30 bg-slate-950/40 p-3 text-emerald-400">
                  <ArrowUpCircle size={24} />
                </div>
              </div>
            </button>

            <div className="space-y-4">
              <button
                onClick={() => setView('withdrawal')}
                className="group relative w-full overflow-hidden rounded-[2rem] border border-amber-400/20 bg-slate-900/80 p-6 text-left shadow-[0_20px_60px_rgba(2,6,23,0.3)] transition-all duration-200 hover:-translate-y-1 active:scale-[0.99]"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-amber-300">
                      <ArrowDownCircle size={14} /> Retrait instantané (Min 100 HTG)
                    </div>
                    <h3 className="text-xl font-black tracking-tight text-white uppercase">Sortir votre solde</h3>
                    <p className="mt-2 max-w-xs text-sm text-slate-400">Convertissez vos points en argent réel dès 100 HTG.</p>
                  </div>
                  <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-amber-400">
                    <ArrowDownCircle size={24} />
                  </div>
                </div>
              </button>

              <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/40 p-3 shadow-[0_10px_40px_rgba(2,6,23,0.2)]">
                <AdsterraNativeBanner />
              </div>
            </div>
          </motion.div>
        )}

        {/* Choix de la méthode de paiement */}
        {(view === 'deposit' || view === 'withdrawal') && !method && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-5 rounded-[2rem] border border-white/10 bg-slate-900/70 p-5 shadow-[0_20px_60px_rgba(2,6,23,0.3)] backdrop-blur-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-emerald-400">Mode de paiement</p>
                <h3 className="mt-1 text-lg font-black text-white uppercase">Sélectionnez un opérateur</h3>
              </div>
              <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 p-2 text-emerald-400">
                <ShieldCheck size={18} />
              </div>
            </div>
            <div className="space-y-3">
              {FINANCE_PAYMENT_METHODS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className="flex w-full items-center justify-between rounded-[1.3rem] border border-white/10 bg-slate-950/60 px-5 py-4 text-left transition-all duration-200 hover:border-emerald-400/40 hover:bg-slate-800/80 active:scale-[0.99]"
                >
                  <span className={`text-base font-black ${m === 'MonCash' ? 'text-[#CC1011]' : 'text-emerald-400'}`}>{m}</span>
                  <div className="rounded-2xl bg-white/5 p-2 text-slate-400">
                    <Smartphone size={18} />
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Formulaire de Dépôt */}
        {view === 'deposit' && method && (
          <motion.form
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            onSubmit={handleDeposit}
            className="mt-5 space-y-5 rounded-[2rem] border border-emerald-400/20 bg-slate-900/70 p-5 shadow-[0_24px_80px_rgba(16,185,129,0.13)] backdrop-blur-2xl sm:p-6"
          >
            <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Dépôt via {method}</p>
                  <h3 className="mt-1 text-lg font-black text-white">Numéro du compte récepteur</h3>
                </div>
                <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-400">
                  <Wallet size={18} />
                </div>
              </div>
              <div
                onClick={() => copyToClipboard(adminNumbers[method])}
                className="mt-4 flex cursor-pointer items-center justify-between rounded-[1.2rem] border border-emerald-400/30 bg-emerald-500/10 px-4 py-3.5 transition-all duration-200 hover:bg-emerald-500/20 active:scale-[0.99]"
              >
                <span className="text-base font-bold tracking-wider text-white">{adminNumbers[method]}</span>
                {copied ? <CheckCircle2 size={18} className="text-emerald-400" /> : <Copy size={18} className="text-slate-400" />}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Montant à déposer (HTG)</label>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Min. 25 HTG
                </span>
              </div>
              <input
                type="number"
                min={MIN_DEPOSIT_AMOUNT}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-[1.2rem] border border-white/10 bg-slate-950/70 px-4 py-4 text-base font-black text-emerald-400 outline-none transition-all focus:border-emerald-400/50"
                placeholder="Ex: 50"
              />
            </div>

            <label className="flex w-full flex-col items-center rounded-[1.5rem] border border-dashed border-white/15 bg-slate-950/60 p-6 text-center cursor-pointer transition-all duration-200 hover:border-emerald-400/40">
              <Upload size={24} className="mb-2 text-emerald-400" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-300">
                {file ? file.name : 'Importer le reçu ou capture d\'écran'}
              </span>
              <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" />
            </label>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setMethod(null)} className="flex-1 rounded-[1.2rem] border border-white/10 bg-slate-950/70 py-4 text-xs font-black uppercase tracking-widest text-slate-300 transition-all duration-200 hover:bg-slate-800/70">
                Annuler
              </button>
              <button type="submit" disabled={issubmitting} className="flex-1 rounded-[1.2rem] bg-gradient-to-r from-emerald-500 to-cyan-500 py-4 text-xs font-black uppercase tracking-widest text-slate-950 shadow-[0_20px_40px_rgba(16,185,129,0.2)] transition-all duration-200 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70">
                {issubmitting ? <Loader2 className="mx-auto animate-spin" /> : 'Confirmer le Dépôt'}
              </button>
            </div>
          </motion.form>
        )}

        {/* Formulaire de Retrait */}
        {view === 'withdrawal' && method && (
          <motion.form
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            onSubmit={handleWithdrawal}
            className="mt-5 space-y-5 rounded-[2rem] border border-amber-400/20 bg-slate-900/70 p-5 shadow-[0_24px_80px_rgba(245,158,11,0.12)] backdrop-blur-2xl sm:p-6"
          >
            <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Retrait via {method}</p>
                  <h3 className="mt-1 text-lg font-black text-white uppercase">Informations de réception</h3>
                </div>
                <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-400">
                  <ArrowDownCircle size={18} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Montant à retirer (HTG)</label>
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => setAmount(availableBalance.toString())}
                    className="text-[9px] font-black uppercase text-amber-400 underline"
                  >
                    Tout retirer
                  </button>
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    Min. 100 HTG
                  </span>
                </div>
              </div>
              <input
                type="number"
                min={MIN_WITHDRAWAL_AMOUNT}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-[1.2rem] border border-white/10 bg-slate-950/70 px-4 py-4 text-base font-black text-amber-400 outline-none transition-all focus:border-amber-400/50"
                placeholder="Ex: 150"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Numéro Récepteur</label>
              <div className="relative flex items-center">
                <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 z-10" size={18} />
                <span className="absolute left-11 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm z-10 select-none">
                  +509
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={8}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  className="w-full rounded-[1.2rem] border border-white/10 bg-slate-950/70 py-4 pl-24 pr-4 text-base font-bold text-white outline-none transition-all focus:border-amber-400/50"
                  placeholder="0000 0000"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setMethod(null)} className="flex-1 rounded-[1.2rem] border border-white/10 bg-slate-950/70 py-4 text-xs font-black uppercase tracking-widest text-slate-300 transition-all duration-200 hover:bg-slate-800/70">
                Annuler
              </button>
              <button type="submit" disabled={issubmitting} className="flex-1 rounded-[1.2rem] bg-amber-400 py-4 text-xs font-black uppercase tracking-widest text-slate-950 transition-all duration-200 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70">
                {issubmitting ? <Loader2 className="mx-auto animate-spin" /> : 'Confirmer le Retrait'}
              </button>
            </div>

            <div className="mt-2 rounded-[1.2rem] border border-white/10 bg-slate-950/40 p-3">
              <AdsterraNativeBanner />
            </div>
          </motion.form>
        )}
      </div>
    </main>
  );
}
