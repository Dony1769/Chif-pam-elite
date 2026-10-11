"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, Eye, Loader2, ShieldAlert, UserRound, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AdminTransactionsService } from "@/services/admin/transactions";
import { useAppFeedback } from "@/components/ui/AppFeedbackProvider";

type PendingTransaction = { id: string; type: string; amount: number; method: string | null; proof_url: string | null; username: string | null };
type PendingAgentRequest = { id: string; username: string | null; created_at: string };
type FraudFlag = { id: string; pattern: string; created_at: string };

function proofUrl(proof: string) {
  if (proof.startsWith("http")) return proof;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/payment-proofs/${proof}`;
}

function profileUsername(value: unknown): string | null {
  const profile = Array.isArray(value) ? value[0] : value;
  if (!profile || typeof profile !== "object" || !("username" in profile)) return null;
  const username = (profile as { username?: unknown }).username;
  return typeof username === "string" ? username : null;
}

export default function AdminQuickActionCenter() {
  const { confirm, prompt, notify } = useAppFeedback();
  const [transactions, setTransactions] = useState<PendingTransaction[]>([]);
  const [agentRequests, setAgentRequests] = useState<PendingAgentRequest[]>([]);
  const [fraudFlags, setFraudFlags] = useState<FraudFlag[]>([]);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedProof, setSelectedProof] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [transactionResult, agentResult, fraudResult, duplicateResult] = await Promise.all([
      supabase.from("transactions").select("id, type, amount, method, proof_url, profiles(username)").eq("status", "pending").in("type", ["deposit", "depot", "withdrawal", "retrait"]).order("created_at", { ascending: true }).limit(8),
      supabase.from("agent_requests").select("id, created_at, profiles(username)").eq("status", "pending").order("created_at", { ascending: true }).limit(5),
      supabase.from("p2p_fraud_flags").select("id, pattern, created_at").eq("reviewed", false).order("created_at", { ascending: false }).limit(5),
      supabase.from("phone_normalization_duplicates").select("id", { count: "exact", head: true }).eq("reviewed", false),
    ]);

    setTransactions((transactionResult.data ?? []).map((row) => ({ ...row, amount: Number(row.amount), username: profileUsername(row.profiles) })) as PendingTransaction[]);
    setAgentRequests((agentResult.data ?? []).map((row) => ({ id: row.id, created_at: row.created_at, username: profileUsername(row.profiles) })) as PendingAgentRequest[]);
    setFraudFlags((fraudResult.data ?? []) as FraudFlag[]);
    setDuplicateCount(duplicateResult.count ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const channel = supabase.channel("admin-quick-action-center").on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => void load()).on("postgres_changes", { event: "*", schema: "public", table: "agent_requests" }, () => void load()).on("postgres_changes", { event: "*", schema: "public", table: "p2p_fraud_flags" }, () => void load()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const processTransaction = async (transaction: PendingTransaction, decision: "approved" | "rejected") => {
    const label = decision === "approved" ? "approuver" : "refuser";
    if (!(await confirm(`Voulez-vous ${label} la transaction de ${transaction.amount.toLocaleString("fr-FR")} HTG ?`))) return;
    setProcessingId(transaction.id);
    const note = decision === "rejected" ? (await prompt("Motif du refus (optionnel) :", "", "Refuser la transaction")) ?? "" : "";
    const result = await AdminTransactionsService.process(transaction.id, decision, note);
    notify(result.message, result.success ? "success" : "danger");
    setProcessingId(null);
    if (result.success) await load();
  };

  if (loading) return <div className="flex items-center justify-center rounded-[2rem] border border-white/10 bg-slate-900/50 p-12"><Loader2 className="animate-spin text-emerald-500" size={28} /></div>;

  return <section className="space-y-4 rounded-[2rem] border border-rose-500/20 bg-rose-500/[0.04] p-5 shadow-2xl shadow-rose-950/20">
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="rounded-xl bg-rose-500 p-2 text-slate-950"><AlertTriangle size={20} /></div><div><p className="text-[10px] font-black uppercase tracking-[0.25em] text-rose-300">Action immédiate</p><p className="text-xs text-slate-400">Modération financière et sécurité</p></div></div><button type="button" onClick={() => void load()} className="text-[10px] font-black uppercase tracking-widest text-rose-200 hover:text-white">Actualiser</button></div>
    <div className="grid gap-4 xl:grid-cols-3">
      <div className="rounded-2xl border border-amber-400/20 bg-slate-950/60 p-4"><div className="mb-3 flex items-center justify-between"><h2 className="text-xs font-black uppercase text-amber-300">Flux HTG en attente</h2><span className="rounded-full bg-amber-400/15 px-2 py-1 text-[10px] text-amber-200">{transactions.length}</span></div><div className="space-y-2">{transactions.length === 0 && <p className="text-xs text-slate-500">Aucune transaction.</p>}{transactions.map((transaction) => <div key={transaction.id} className="space-y-2 rounded-xl border border-white/8 bg-white/[0.03] p-3"><div className="flex items-center justify-between gap-2 text-xs"><span className="truncate text-slate-300">@{transaction.username ?? "sans pseudo"}</span><strong className="text-amber-200">{transaction.amount.toLocaleString("fr-FR")} HTG</strong></div><p className="text-[10px] uppercase text-slate-500">{transaction.type} · {transaction.method ?? "méthode inconnue"}</p><div className="flex gap-2"><button type="button" disabled={processingId !== null} onClick={() => void processTransaction(transaction, "rejected")} className="inline-flex items-center gap-1 rounded-lg bg-rose-500/15 px-2 py-1.5 text-[10px] font-black text-rose-200 disabled:opacity-50"><X size={13} /> Refuser</button><button type="button" disabled={processingId !== null} onClick={() => void processTransaction(transaction, "approved")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-400 px-2 py-1.5 text-[10px] font-black text-slate-950 disabled:opacity-50"><Check size={13} /> Approuver</button>{transaction.proof_url && <button type="button" onClick={() => setSelectedProof(proofUrl(transaction.proof_url as string))} className="ml-auto rounded-lg bg-white/10 p-1.5 text-slate-200" aria-label="Voir la preuve de paiement"><Eye size={15} /></button>}</div></div>)}</div><Link href="/admin-chif-pam/demandes" className="mt-3 block text-[10px] font-black uppercase tracking-widest text-amber-300 hover:text-white">Ouvrir la file complète</Link></div>
      <div className="rounded-2xl border border-cyan-400/20 bg-slate-950/60 p-4"><div className="mb-3 flex items-center justify-between"><h2 className="text-xs font-black uppercase text-cyan-300">Demandes d’agents</h2><span className="rounded-full bg-cyan-400/15 px-2 py-1 text-[10px] text-cyan-200">{agentRequests.length}</span></div><div className="space-y-2">{agentRequests.length === 0 && <p className="text-xs text-slate-500">Aucune demande.</p>}{agentRequests.map((request) => <div key={request.id} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3"><UserRound size={16} className="text-cyan-300" /><div><p className="text-xs text-slate-200">@{request.username ?? "sans pseudo"}</p><p className="text-[10px] text-slate-500">{new Date(request.created_at).toLocaleDateString("fr-FR")}</p></div></div>)}</div><Link href="/admin-chif-pam/agent-requests" className="mt-3 block text-[10px] font-black uppercase tracking-widest text-cyan-300 hover:text-white">Traiter les demandes</Link></div>
      <div className="rounded-2xl border border-rose-500/30 bg-slate-950/60 p-4"><div className="mb-3 flex items-center justify-between"><h2 className="text-xs font-black uppercase text-rose-300">Alertes sécurité</h2><ShieldAlert size={18} className="text-rose-400" /></div><div className="space-y-2 text-xs">{fraudFlags.length > 0 && <p className="rounded-xl bg-rose-500/10 p-3 text-rose-200">{fraudFlags.length} flag(s) fraude P2P à examiner.</p>}{duplicateCount > 0 && <p className="rounded-xl bg-rose-500/10 p-3 text-rose-200">{duplicateCount} compte(s) dans un conflit téléphonique.</p>}{fraudFlags.length === 0 && duplicateCount === 0 && <p className="text-slate-500">Aucune alerte ouverte.</p>}</div><div className="mt-3 flex flex-wrap gap-3"><Link href="/admin-chif-pam/p2p" className="text-[10px] font-black uppercase tracking-widest text-rose-300 hover:text-white">Voir fraude P2P</Link><Link href="/admin-chif-pam/phone-duplicates" className="text-[10px] font-black uppercase tracking-widest text-rose-300 hover:text-white">Traiter doublons</Link></div></div>
    </div>
    {selectedProof && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4" role="dialog" aria-modal="true" aria-label="Preuve de paiement"><div className="relative max-h-[90vh] max-w-3xl rounded-2xl border border-white/10 bg-slate-900 p-4"><button type="button" onClick={() => setSelectedProof(null)} className="absolute right-3 top-3 rounded-full bg-slate-950 p-2 text-white" aria-label="Fermer"><X size={18} /></button><img src={selectedProof} alt="Preuve de paiement" className="max-h-[80vh] max-w-full rounded-xl object-contain" /></div></div>}
  </section>;
}