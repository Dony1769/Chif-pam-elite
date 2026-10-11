"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Issue = { profile_id: string; issue_type: string; normalized_phone: string | null; resolved: boolean; phone: string; username: string | null; created_at: string };
type MergeReview = { kept_profile_id: string; candidate_profile_id: string; normalized_phone: string; action: string; related_data: Record<string, unknown> };

export default function AdminPhoneIssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [merges, setMerges] = useState<MergeReview[]>([]);
  const load = async () => {
    const [{ data: issueRows }, { data: mergeRows }] = await Promise.all([
      supabase.from('phone_account_issues').select('profile_id, issue_type, normalized_phone, resolved, created_at').eq('resolved', false),
      supabase.from('phone_merge_review_log').select('kept_profile_id, candidate_profile_id, normalized_phone, action, related_data').order('created_at', { ascending: false }),
    ]);
    const ids = (issueRows ?? []).map((row) => row.profile_id);
    const { data: profiles } = ids.length ? await supabase.from('profiles').select('id, phone, username').in('id', ids) : { data: [] };
    setIssues((issueRows ?? []).map((row) => ({ ...row, phone: profiles?.find((profile) => profile.id === row.profile_id)?.phone ?? '', username: profiles?.find((profile) => profile.id === row.profile_id)?.username ?? null })));
    setMerges(mergeRows ?? []);
  };
  useEffect(() => { void load(); }, []);
  const resolve = async (profileId: string) => { await supabase.from('phone_account_issues').update({ resolved: true, resolved_at: new Date().toISOString() }).eq('profile_id', profileId); await load(); };
  return <main className="min-h-screen space-y-8 bg-[#05070b] px-4 py-8 text-white sm:px-8"><div className="mx-auto max-w-6xl"><p className="text-xs uppercase tracking-[0.3em] text-amber-300">Administration</p><h1 className="mt-2 text-4xl font-black">Incidents téléphone</h1></div><div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2"><section className="space-y-3"><h2 className="text-xl font-black">À traiter</h2>{issues.map((issue) => <div key={issue.profile_id} className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4"><p className="font-bold">{issue.issue_type === 'invalid_phone' ? 'Numéro invalide' : 'Doublon non résolu'}</p><p className="mt-2 text-xs text-slate-300">Compte : {issue.profile_id}</p><p className="text-xs text-slate-400">@{issue.username ?? 'sans pseudo'} · {issue.phone}</p><button type="button" onClick={() => resolve(issue.profile_id)} className="mt-3 rounded-lg border border-amber-300/30 px-3 py-2 text-xs text-amber-200">Marquer résolu</button></div>)}{issues.length === 0 && <p className="text-sm text-slate-500">Aucun incident ouvert.</p>}</section><section className="space-y-3"><h2 className="text-xl font-black">Fusions bloquées</h2>{merges.map((merge) => <div key={`${merge.kept_profile_id}-${merge.candidate_profile_id}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs"><p className="font-bold text-slate-200">{merge.normalized_phone}</p><p className="mt-2 text-slate-400">Conserver : {merge.kept_profile_id}</p><p className="text-slate-400">Candidat : {merge.candidate_profile_id}</p><p className="mt-2 text-amber-200">Suppression bloquée : données liées détectées.</p></div>)}</section></div></main>;
}