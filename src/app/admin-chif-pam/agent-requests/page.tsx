"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

type AgentRequest = { id: string; user_id: string; status: "pending" | "approved" | "rejected"; created_at: string; username: string | null; phone: string };

export default function AdminAgentRequestsPage() {
  const [requests, setRequests] = useState<AgentRequest[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const load = async () => {
    const { data } = await supabase.from("agent_requests").select("id, user_id, status, created_at").eq("status", "pending").order("created_at", { ascending: true });
    const rows = data ?? [];
    const ids = rows.map((row) => row.user_id);
    const { data: profiles } = ids.length ? await supabase.from("profiles").select("id, username, phone").in("id", ids) : { data: [] };
    setRequests(rows.map((row) => ({ ...row, username: profiles?.find((profile) => profile.id === row.user_id)?.username ?? null, phone: profiles?.find((profile) => profile.id === row.user_id)?.phone ?? "" })));
  };
  useEffect(() => { void load(); }, []);
  const review = async (id: string, decision: "approved" | "rejected") => {
    const note = decision === "rejected" ? window.prompt("Motif du refus (optionnel) :") : null;
    const { error } = await supabase.rpc("admin_review_agent_request", { p_request_id: id, p_decision: decision, p_note: note });
    setMessage(error?.message ?? (decision === "approved" ? "Agent activé et soldes réinitialisés." : "Demande refusée."));
    if (!error) await load();
  };
  return <main className="min-h-screen bg-[#05070b] px-4 py-8 text-white sm:px-8"><div className="mx-auto max-w-5xl space-y-6"><div><p className="text-xs uppercase tracking-[0.3em] text-amber-300">Administration</p><h1 className="mt-2 text-4xl font-black">Demandes agent</h1></div>{message && <p className="rounded-xl border border-emerald-300/20 bg-emerald-300/5 p-3 text-sm text-emerald-200">{message}</p>}{requests.length === 0 ? <p className="text-slate-500">Aucune demande en attente.</p> : requests.map((request) => <div key={request.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5"><div><p className="font-black">@{request.username ?? "sans pseudo"}</p><p className="mt-1 text-xs text-slate-400">{request.phone} · Demande du {new Date(request.created_at).toLocaleDateString("fr-FR")}</p><p className="mt-1 font-mono text-[10px] text-slate-600">{request.user_id}</p></div><div className="flex gap-2"><button type="button" onClick={() => review(request.id, "rejected")} className="inline-flex items-center gap-2 rounded-xl border border-rose-300/30 px-3 py-2 text-xs text-rose-200"><X size={14} /> Refuser</button><button type="button" onClick={() => review(request.id, "approved")} className="inline-flex items-center gap-2 rounded-xl bg-emerald-300 px-3 py-2 text-xs font-black text-slate-950"><Check size={14} /> Accepter</button></div></div>)}</div></main>;
}
