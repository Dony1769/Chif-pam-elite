"use client";

import { useEffect, useMemo, useState } from 'react';
import { Loader2, ShieldAlert, User, Calendar, Smartphone, Wallet2, Search, RefreshCcw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { adminResolvePhoneDuplicate } from '@/app/actions/adminActions';
import { useAppFeedback } from '@/components/ui/AppFeedbackProvider';

interface DuplicatePhoneRecord {
  profile_id: string;
  phone_original: string;
  normalized_phone: string;
  created_at: string;
  role: string | null;
  jetons_cp: number | null;
  balance: number | string | null;
  reviewed: boolean;
  review_note: string | null;
  username: string | null;
}

export default function AdminPhoneDuplicatesPage() {
  const { confirm, notify } = useAppFeedback();
  const [rows, setRows] = useState<DuplicatePhoneRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchDuplicates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('phone_normalization_duplicates')
      .select('*')
      .eq('reviewed', false)
      .order('normalized_phone', { ascending: true })
      .order('created_at', { ascending: true });

    if (!error) {
      const profileIds = (data ?? []).map((row) => row.profile_id);
      const { data: profiles } = profileIds.length ? await supabase.from('profiles').select('id, username').in('id', profileIds) : { data: [] };
      setRows((data ?? []).map((row) => ({ ...row, username: profiles?.find((profile) => profile.id === row.profile_id)?.username ?? null })) as DuplicatePhoneRecord[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    const loadDuplicates = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('phone_normalization_duplicates')
        .select('*')
        .eq('reviewed', false)
        .order('normalized_phone', { ascending: true })
        .order('created_at', { ascending: true });

      if (!error) {
        const profileIds = (data ?? []).map((row) => row.profile_id);
        const { data: profiles } = profileIds.length ? await supabase.from('profiles').select('id, username').in('id', profileIds) : { data: [] };
        setRows((data ?? []).map((row) => ({ ...row, username: profiles?.find((profile) => profile.id === row.profile_id)?.username ?? null })) as DuplicatePhoneRecord[]);
      }
      setLoading(false);
    };

    void loadDuplicates();
  }, []);

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => {
      const profile = row.profile_id.toLowerCase();
      const original = String(row.phone_original ?? '').toLowerCase();
      const normalized = String(row.normalized_phone ?? '').toLowerCase();
      const role = (row.role ?? '').toLowerCase();
      const username = (row.username ?? '').toLowerCase();
      return profile.includes(needle) || original.includes(needle) || normalized.includes(needle) || role.includes(needle) || username.includes(needle);
    });
  }, [rows, search]);

  const grouped = useMemo(() => {
    const groups = new Map<string, DuplicatePhoneRecord[]>();
    for (const row of filteredRows) {
      const key = row.normalized_phone;
      const current = groups.get(key) ?? [];
      current.push(row);
      groups.set(key, current);
    }
    return [...groups.entries()].map(([normalizedPhone, items]) => ({ normalizedPhone, items }));
  }, [filteredRows]);

  const resolveDuplicate = async (kept: DuplicatePhoneRecord, candidate: DuplicatePhoneRecord, action: 'merged' | 'blocked_related_data') => {
    const actionLabel = action === 'merged' ? 'fusionner et bloquer le compte suspect' : 'bloquer le compte suspect';
    if (!(await confirm(`Voulez-vous ${actionLabel} @${candidate.username ?? candidate.profile_id} ?`))) return;
    const result = await adminResolvePhoneDuplicate(kept.profile_id, candidate.profile_id, kept.normalized_phone, action);
    notify(result.message, result.success ? 'success' : 'danger');
    if (result.success) await fetchDuplicates();
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 text-white">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-400">Audit sécurité</p>
          <h1 className="mt-2 text-3xl font-black italic uppercase tracking-tight text-white">Doublons téléphoniques</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-96">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un numéro / profil"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 py-3 pl-12 pr-4 text-xs font-bold text-slate-200 outline-none transition focus:border-emerald-500"
            />
          </div>
          <button
            type="button"
            onClick={() => void fetchDuplicates()}
            className="inline-flex items-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-300 transition hover:bg-emerald-500/15"
          >
            <RefreshCcw size={14} />
            Rafraîchir
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[2rem] border border-amber-500/20 bg-amber-500/5 p-5">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-400">Groupes détectés</p>
          <p className="mt-4 text-3xl font-black text-amber-300">{grouped.length}</p>
        </div>
        <div className="rounded-[2rem] border border-rose-500/20 bg-rose-500/5 p-5">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-rose-400">Comptes concernés</p>
          <p className="mt-4 text-3xl font-black text-rose-300">{rows.length}</p>
        </div>
        <div className="rounded-[2rem] border border-cyan-500/20 bg-cyan-500/5 p-5">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-400">Journalisation</p>
          <p className="mt-4 text-sm font-bold text-cyan-200">Le compte le plus ancien est conservé; chaque revue bloque le suspect et est journalisée.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[240px] items-center justify-center rounded-[2rem] border border-white/10 bg-slate-950/50">
          <Loader2 className="animate-spin text-emerald-500" size={28} />
        </div>
      ) : grouped.length === 0 ? (
        <div className="rounded-[2rem] border border-emerald-500/20 bg-emerald-500/5 p-8 text-center text-sm font-bold text-emerald-300">
          Aucun doublon détecté pour la recherche actuelle.
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ normalizedPhone, items }) => (
            <div key={normalizedPhone} className="rounded-[2rem] border border-white/10 bg-slate-950/50 p-5">
              <div className="mb-4 flex flex-col gap-2 border-b border-white/10 pb-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2 text-emerald-300">
                  <Smartphone size={18} />
                  <span className="text-lg font-black tracking-tight">{normalizedPhone}</span>
                </div>
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{items.length} comptes en conflit</div>
              </div>

              <div className="grid gap-4">
                {items.map((row) => (
                  <div key={row.profile_id} className="rounded-[1.5rem] border border-white/8 bg-slate-900/80 p-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                          <User size={14} />
                          <span>Profil : @{row.username ?? 'sans pseudo'} · {row.profile_id}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                          <span className="font-bold text-slate-500">Original :</span>
                          <span>{row.phone_original || '—'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                          <span className="font-bold text-slate-500">Normalisé :</span>
                          <span>{row.normalized_phone}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                          <span className="font-bold text-slate-500">Rôle :</span>
                          <span>{row.role ?? 'client'}</span>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-slate-300">
                          <Calendar size={14} className="text-slate-500" />
                          <span>{new Date(row.created_at).toLocaleString('fr-FR')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-300">
                          <Wallet2 size={14} className="text-slate-500" />
                          <span>CP: {row.jetons_cp ?? 0} | HTG: {Number(row.balance ?? 0).toLocaleString('fr-FR')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-amber-300">
                          <ShieldAlert size={14} />
                          <span>{row.reviewed ? 'Reviewée' : 'À revoir'}</span>
                        </div>
                      </div>

                      {items[0]?.profile_id !== row.profile_id && (
                        <div className="flex flex-wrap justify-end gap-2">
                          <button type="button" onClick={() => void resolveDuplicate(items[0], row, 'blocked_related_data')} className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-rose-200 transition hover:bg-rose-500/20">Bloquer suspect</button>
                          <button type="button" onClick={() => void resolveDuplicate(items[0], row, 'merged')} className="rounded-xl bg-emerald-400 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-950 transition hover:bg-white">Fusionner</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
