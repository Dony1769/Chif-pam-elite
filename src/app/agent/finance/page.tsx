"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownCircle, ArrowUpCircle, CheckCircle2, Clock3, Loader2, Smartphone, Upload, Wallet, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { FINANCE_PAYMENT_METHODS, type FinancePaymentMethod } from "@/lib/constants/finance";
import { ClientFinanceService } from "@/services/client/finance";
import { DSButton, DSCard, DSInput, DSLoader, DSPage } from "@/components/ui/primitives";

type FinanceMode = "deposit" | "withdrawal";
type Transaction = { id: string; amount: number; type: "deposit" | "depot" | "withdrawal" | "retrait"; status: string; created_at: string };

const MIN_DEPOSIT_AMOUNT = 25;
const MIN_WITHDRAWAL_AMOUNT = 100;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const paymentNumbers: Record<FinancePaymentMethod, string> = { NatCash: "+509 4045 1937", MonCash: "+509 4719 3408" };

const formatAmount = (amount: number) => amount.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const isDeposit = (type: Transaction["type"]) => type === "deposit" || type === "depot";

export default function AgentFinancePage() {
  const [mode, setMode] = useState<FinanceMode>("deposit");
  const [method, setMethod] = useState<FinancePaymentMethod>(FINANCE_PAYMENT_METHODS[0]);
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [balance, setBalance] = useState({ available: 0, locked: 0 });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFinance = useCallback(async () => {
    setLoading(true);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      setMessage({ ok: false, text: "Session agent introuvable." });
      setLoading(false);
      return;
    }

    const [profileResult, transactionsResult] = await Promise.all([
      supabase.from("profiles").select("balance, locked_balance").eq("id", user.id).maybeSingle(),
      supabase.from("transactions").select("id, amount, type, status, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
    ]);

    if (profileResult.error) {
      setMessage({ ok: false, text: profileResult.error.message });
    } else {
      const total = Number(profileResult.data?.balance ?? 0);
      const locked = Number(profileResult.data?.locked_balance ?? 0);
      setBalance({ available: Math.max(0, total - locked), locked });
    }
    if (transactionsResult.error) {
      setMessage({ ok: false, text: "Impossible de charger l'historique financier." });
    } else {
      setTransactions((transactionsResult.data ?? []) as Transaction[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void loadFinance(); }, [loadFinance]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const subscribe = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      channel = supabase.channel(`agent-finance-${user.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `id=eq.${user.id}` }, () => void loadFinance())
        .on("postgres_changes", { event: "*", schema: "public", table: "transactions", filter: `user_id=eq.${user.id}` }, () => void loadFinance())
        .subscribe();
    };
    void subscribe();
    return () => { if (channel) void supabase.removeChannel(channel); };
  }, [loadFinance]);

  const selectMode = (nextMode: FinanceMode) => {
    setMode(nextMode);
    setMessage(null);
    setAmount("");
    setPhone("");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (selectedFile: File | undefined) => {
    if (!selectedFile) return setFile(null);
    if (!ALLOWED_IMAGE_TYPES.includes(selectedFile.type)) return setMessage({ ok: false, text: "Format non supporte. Utilisez JPG, PNG, WEBP ou HEIC." });
    if (selectedFile.size > MAX_FILE_SIZE) return setMessage({ ok: false, text: "La preuve de paiement ne doit pas depasser 5 Mo." });
    setMessage(null);
    setFile(selectedFile);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    const numericAmount = Math.round(Number(amount) * 100) / 100;
    const cleanPhone = phone.replace(/\D/g, "");
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return setMessage({ ok: false, text: "Saisissez un montant valide." });
    if (mode === "deposit" && numericAmount < MIN_DEPOSIT_AMOUNT) return setMessage({ ok: false, text: `Le depot minimum est de ${MIN_DEPOSIT_AMOUNT} HTG.` });
    if (mode === "withdrawal" && numericAmount < MIN_WITHDRAWAL_AMOUNT) return setMessage({ ok: false, text: `Le retrait minimum est de ${MIN_WITHDRAWAL_AMOUNT} HTG.` });
    if (mode === "deposit" && !file) return setMessage({ ok: false, text: "Ajoutez une preuve de paiement." });
    if (mode === "withdrawal" && cleanPhone.length !== 8) return setMessage({ ok: false, text: "Le numero doit contenir 8 chiffres." });
    if (mode === "withdrawal" && numericAmount > balance.available) return setMessage({ ok: false, text: "Solde disponible insuffisant." });

    setSubmitting(true);
    setMessage(null);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Votre session a expire.");
      if (mode === "deposit") {
        const extension = file!.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
        const path = `proofs/${user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from("payment-proofs").upload(path, file!, { cacheControl: "3600", upsert: false });
        if (uploadError) throw new Error("Echec de l'envoi de la preuve de paiement.");
        const result = await ClientFinanceService.submitDeposit(numericAmount, method, path);
        if (!result.success) throw new Error(result.message);
        setMessage({ ok: true, text: result.message || "Demande de depot envoyee." });
      } else {
        const result = await ClientFinanceService.submitWithdrawal(numericAmount, method, cleanPhone);
        if (!result.success) throw new Error(result.message);
        setMessage({ ok: true, text: result.message || "Demande de retrait envoyee." });
        setPhone("");
      }
      setAmount("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadFinance();
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : "La demande a echoue." });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <DSPage className="mx-auto max-w-5xl px-4 py-10"><DSLoader label="Chargement du portefeuille agent..." /></DSPage>;

  return (
    <DSPage className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">Finance agent</p>
        <h1 className="mt-2 text-3xl font-black">Depots et retraits</h1>
        <p className="mt-2 text-sm text-slate-400">Gerez les fonds de votre compte agent depuis cet espace securise.</p>
      </motion.header>
      <DSCard className="flex items-center justify-between p-6"><div><p className="text-xs uppercase tracking-widest text-slate-500">Disponible</p><p className="mt-2 text-3xl font-black text-emerald-200">{formatAmount(balance.available)} HTG</p><p className="mt-1 text-xs text-slate-500">Bloque : {formatAmount(balance.locked)} HTG</p></div><Wallet className="text-emerald-300" size={30} /></DSCard>
      <div className="grid gap-4 sm:grid-cols-2">
        <button type="button" onClick={() => selectMode("deposit")} className={`rounded-2xl border p-5 text-left transition ${mode === "deposit" ? "border-emerald-300/40 bg-emerald-300/10" : "border-white/10 bg-white/5"}`}><ArrowUpCircle className="text-emerald-300" /><p className="mt-4 font-black">Deposer des fonds</p><p className="mt-1 text-xs text-slate-400">Avec preuve de paiement, minimum 25 HTG</p></button>
        <button type="button" onClick={() => selectMode("withdrawal")} className={`rounded-2xl border p-5 text-left transition ${mode === "withdrawal" ? "border-amber-300/40 bg-amber-300/10" : "border-white/10 bg-white/5"}`}><ArrowDownCircle className="text-amber-300" /><p className="mt-4 font-black">Retirer des fonds</p><p className="mt-1 text-xs text-slate-400">Vers un portefeuille mobile, minimum 100 HTG</p></button>
      </div>
      {message && <div className={`flex items-center gap-2 rounded-xl border p-4 text-sm ${message.ok ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200" : "border-red-300/30 bg-red-300/10 text-red-200"}`}>{message.ok ? <CheckCircle2 size={18} /> : <XCircle size={18} />}{message.text}</div>}
      <DSCard className="p-6"><form onSubmit={submit} className="space-y-5"><div className="flex gap-2">{FINANCE_PAYMENT_METHODS.map((item) => <button type="button" key={item} onClick={() => setMethod(item)} className={`flex-1 rounded-xl border px-3 py-3 text-sm font-black ${method === item ? "border-emerald-300 bg-emerald-300/10 text-emerald-200" : "border-white/10 text-slate-400"}`}>{item}</button>)}</div><p className="flex items-center gap-2 text-xs text-slate-400"><Smartphone size={15} /> Numero de depot : <strong className="text-slate-200">{paymentNumbers[method]}</strong></p><label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Montant (HTG)<DSInput type="number" min={mode === "deposit" ? MIN_DEPOSIT_AMOUNT : MIN_WITHDRAWAL_AMOUNT} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-2" placeholder={mode === "deposit" ? "Ex : 250" : "Ex : 500"} /></label>{mode === "deposit" ? <label className="flex cursor-pointer flex-col items-center rounded-2xl border border-dashed border-white/15 bg-slate-950/40 p-6 text-center"><Upload className="mb-2 text-emerald-300" size={24} /><span className="text-xs text-slate-300">{file?.name || "Importer la preuve de paiement (5 Mo max)"}</span><input ref={fileInputRef} type="file" accept={ALLOWED_IMAGE_TYPES.join(",")} onChange={(event) => handleFileChange(event.target.files?.[0])} className="hidden" /></label> : <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Numero recepteur<DSInput type="tel" inputMode="numeric" maxLength={8} value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 8))} className="mt-2" placeholder="0000 0000" /></label>}<DSButton type="submit" disabled={submitting}>{submitting ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}{submitting ? "Validation..." : mode === "deposit" ? "Confirmer le depot" : "Confirmer le retrait"}</DSButton></form></DSCard>
      <DSCard className="p-6"><div className="mb-4 flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.25em] text-slate-500">Suivi</p><h2 className="mt-1 text-xl font-black">Historique financier</h2></div><Clock3 className="text-slate-500" size={20} /></div>{transactions.length === 0 ? <p className="text-sm text-slate-500">Aucune transaction recente.</p> : <div className="space-y-3">{transactions.map((transaction) => <div key={transaction.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/3 p-3"><div className="flex items-center gap-3">{isDeposit(transaction.type) ? <ArrowUpCircle className="text-emerald-300" size={18} /> : <ArrowDownCircle className="text-amber-300" size={18} />}<div><p className="text-sm font-bold">{isDeposit(transaction.type) ? "Depot" : "Retrait"}</p><p className="text-xs text-slate-500">{new Date(transaction.created_at).toLocaleString("fr-FR")}</p></div></div><div className="text-right"><p className="font-black">{formatAmount(Number(transaction.amount))} HTG</p><p className={`text-xs ${transaction.status === "approved" ? "text-emerald-300" : transaction.status === "rejected" ? "text-red-300" : "text-amber-300"}`}>{transaction.status === "approved" ? "Approuve" : transaction.status === "rejected" ? "Refuse" : "En attente"}</p></div></div>)}</div>}</DSCard>
    </DSPage>
  );
}
