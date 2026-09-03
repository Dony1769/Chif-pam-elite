"use client";

import { useEffect, useMemo, useState } from 'react';
import { Loader2, ExternalLink, Gift } from 'lucide-react';

export interface RewardedVideoProps {
  onReward: () => void;
  onClose: () => void;
  zoneId?: number;
}

type StartResponse = {
  success: boolean;
  message?: string;
  claimId?: string;
  token?: string;
  adUrl?: string;
  minWaitSeconds?: number;
};

type ClaimResponse = {
  success: boolean;
  message?: string;
};

export default function RewardedVideo({ onReward, onClose }: RewardedVideoProps) {
  const [loadingStart, setLoadingStart] = useState(false);
  const [loadingClaim, setLoadingClaim] = useState(false);
  const [error, setError] = useState('');
  const [claimId, setClaimId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [waitSeconds, setWaitSeconds] = useState(0);

  useEffect(() => {
    if (waitSeconds <= 0) return;
    const timer = window.setTimeout(() => setWaitSeconds((prev) => Math.max(0, prev - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [waitSeconds]);

  const canClaim = useMemo(() => Boolean(claimId && token && waitSeconds === 0), [claimId, token, waitSeconds]);

  const handleStart = async () => {
    setError('');
    setLoadingStart(true);

    try {
      const response = await fetch('/api/rewards/monetag/start', {
        method: 'POST',
      });
      const result = (await response.json()) as StartResponse;

      if (!response.ok || !result.success || !result.claimId || !result.token || !result.adUrl) {
        setError(result.message || 'Impossible de lancer la publicite.');
        return;
      }

      setClaimId(result.claimId);
      setToken(result.token);
      setWaitSeconds(Math.max(0, result.minWaitSeconds ?? 12));

      window.open(result.adUrl, '_blank', 'noopener,noreferrer');
    } catch {
      setError('Erreur de connexion au service publicitaire.');
    } finally {
      setLoadingStart(false);
    }
  };

  const handleClaim = async () => {
    if (!claimId || !token || loadingClaim) return;

    setError('');
    setLoadingClaim(true);

    try {
      const response = await fetch('/api/rewards/monetag/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ claimId, token }),
      });

      const result = (await response.json()) as ClaimResponse;
      if (!response.ok || !result.success) {
        setError(result.message || 'Recompense refusee.');
        return;
      }

      onReward();
      onClose();
    } catch {
      setError('Erreur reseau pendant la reclamation.');
    } finally {
      setLoadingClaim(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-emerald-500/20 bg-slate-950 p-6 text-slate-100 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-2.5 text-emerald-300">
            <Gift size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black uppercase tracking-wide">Recompense publicitaire</h3>
            <p className="text-xs text-slate-400">Visionnez puis reclamez vos bonus securises.</p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleStart}
            disabled={loadingStart || Boolean(claimId)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-black transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingStart ? <Loader2 size={15} className="animate-spin" /> : <ExternalLink size={15} />}
            <span>{claimId ? 'Publicite ouverte' : 'Ouvrir la publicite'}</span>
          </button>

          <button
            type="button"
            onClick={handleClaim}
            disabled={!canClaim || loadingClaim}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-400/35 bg-amber-500/15 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-amber-200 transition hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingClaim ? <Loader2 size={15} className="animate-spin" /> : null}
            <span>{waitSeconds > 0 ? `Disponibe dans ${waitSeconds}s` : 'Reclamer +5 diamants +10 XP'}</span>
          </button>
        </div>

        {error ? <p className="mt-3 text-xs font-semibold text-rose-400">{error}</p> : null}

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-300 transition hover:bg-white/10"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
