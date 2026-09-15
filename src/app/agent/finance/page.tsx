"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownCircle, ArrowUpCircle, CheckCircle2, Loader2, Smartphone, Upload, Wallet } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { FINANCE_PAYMENT_METHODS, type FinancePaymentMethod } from "@/lib/constants/finance";
import { ClientFinanceService } from "@/services/client/finance";
import { DSButton, DSCard, DSInput, DSLoader, DSPage } from "@/components/ui/primitives";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const methods: Record<FinancePaymentMethod, string> = { NatCash: "+509 4045 1937", MonCash: "+509 4719 3408" };

export default function AgentFinancePage() {
  const [mode, setMode] = useState<"deposit" | "withdrawal">("deposit");
  const [method, setMethod] = useState<FinancePaymentMethod>(FINANCE_PAYMENT_METHODS[0]);
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [balance, setBalance] = useState<{ available: number; locked: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadBalance = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMessage({ ok: false, text: "Session agent introuvable." }); setLoading(false); return; }
    const { data, error } = await supabase.from("profiles").select("balance, locked_balance").eq("id", user.id).single();
    if (error) setMessage({ ok: false, text: error.message });
    else setBalance({ available: Math.max(0, Number(data.balance ?? 0) - Number(data.locked_balance ?? 0)), locked: Number(data.locked_balance ?? 0) });
    setLoading(false);
  }, []);
  useEffect(() => { void loadBalance(); }, [loadBalance]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) return setMessage({ ok: false, text: "Saisissez un montant valide." });
    if (mode === "deposit" && (!file || file.size > MAX_FILE_SIZE)) return setMessage({ ok: false, text: "Ajoutez une preuve de paiement de 5 Mo maximum." });
    if (mode === "withdrawal" && phone.replace(/\D/g, "").length !== 8) return setMessage({ ok: false, text: "Le numéro doit contenir 8 chiffres." });
    if (mode === "withdrawal" && numericAmount > (balance?.available ?? 0)) return setMessage({ ok: false, text: "Solde disponible insuffisant." });
    setSubmitting(true); setMessage(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Votre session a expiré.");
      if (mode === "deposit") {
        const extension = file!.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
        const path = `proofs/${user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from("payment-proofs").upload(path, file!, { cacheControl: "3600", upsert: false });
        if (uploadError) throw new Error("Échec de l’envoi de la preuve de paiement.");
        const result = await ClientFinanceService.submitDeposit(numericAmount, method, path);
        if (!result.success) throw new Error(result.message);
        setMessage({ ok: true, text: result.message || "Demande de dépôt envoyée." });
        setFile(null); if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        const result = await ClientFinanceService.submitWithdrawal(numericAmount, method, phone.replace(/\D/g, ""));
        if (!result.success) throw new Error(result.message);
        setMessage({ ok: true, text: result.message || "Demande de retrait envoyée." }); setPhone("");
        await loadBalance();
      }
      setAmount("");
    } catch (err) { setMessage({ ok: false, text: err instanceof Error ? err.message : "La demande a échoué." }); } finally { setSubmitting(false); }
  };

  if (loading) return <DSPage className="mx-auto max-w-4xl px-4 py-10"><DSLoader label="Chargement du portefeuille agent..." /></DSPage>;
  return <DSPage className="mx-auto max-w-4xl space-y-6 px-4 py-8"><motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}><p className="text-xs uppercase tracking-[0.3em] text-emerald-300">Finance agent</p><h1 className="mt-2 text-3xl font-black">Dépôt et retrait</h1><p className="mt-2 text-sm text-slate-400">Gérez les fonds de votre compte agent depuis cet espace sécurisé.</p></motion.div><DSCard className="flex items-center justify-between p-6"><div><p className="text-xs uppercase tracking-widest text-slate-500">Disponible</p><p className="mt-2 text-3xl font-black text-emerald-200">{balance?.available.toLocaleString()} HTG</p></div><Wallet className="text-emerald-300" size={30} /></DSCard><div className="grid gap-4 sm:grid-cols-2"><button type="button" onClick={() => setMode("deposit")} className={`rounded-2xl border p-5 text-left transition ${mode === "deposit" ? "border-emerald-300/40 bg-emerald-300/10" : "border-white/10 bg-white/5"}`}><ArrowUpCircle className="text-emerald-300" /><p className="mt-4 font-black">Déposer des fonds</p><p className="mt-1 text-xs text-slate-400">Avec preuve de paiement</p></button><button type="button" onClick={() => setMode("withdrawal")} className={`rounded-2xl border p-5 text-left transition ${mode === "withdrawal" ? "border-amber-300/40 bg-amber-300/10" : "border-white/10 bg-white/5"}`}><ArrowDownCircle className="text-amber-300" /><p className="mt-4 font-black">Retirer des fonds</p><p className="mt-1 text-xs text-slate-400">Vers votre portefeuille mobile</p></button></div><DSCard className="p-6"><form onSubmit={submit} className="space-y-5"><div className="flex gap-2">{FINANCE_PAYMENT_METHODS.map((item) => <button type="button" key={item} onClick={() => setMethod(item)} className={`flex-1 rounded-xl border px-3 py-3 text-sm font-black ${method === item ? "border-emerald-300 bg-emerald-300/10 text-emerald-200" : "border-white/10 text-slate-400"}`}>{item}</button>)}</div><p className="text-xs text-slate-400"><Smartphone size={14} className="mr-1 inline" /> Numéro de référence: {methods[method]}</p><label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Montant HTG<DSInput className="mt-2" type="number" min={mode === "deposit" ? 25 : 100} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>{mode === "deposit" ? <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-center"><Upload className="text-emerald-300" /><span className="text-sm text-slate-300">{file?.name ?? "Importer une preuve de paiement"}</span><input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="hidden" /></label> : <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Téléphone réception<DSInput className="mt-2" inputMode="numeric" maxLength={8} value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 8))} /></label>}<DSButton type="submit" disabled={submitting}>{submitting ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}{submitting ? "Envoi..." : mode === "deposit" ? "Envoyer la demande de dépôt" : "Envoyer la demande de retrait"}</DSButton>{message && <p className={message.ok ? "text-sm text-emerald-200" : "text-sm text-rose-200"}>{message.text}</p>}</form></DSCard></DSPage>;
}
