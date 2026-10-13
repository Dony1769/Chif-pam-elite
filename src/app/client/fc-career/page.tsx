"use client";

import React, { useState } from 'react';
import { Lock, ArrowRight, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { checkAccessCode, markSessionUnlocked } from './utils/session';
import { loadGame } from './utils/storage';

export default function FcCareerAuthPage() {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<boolean>(false);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (checkAccessCode(pin)) {
      // Marqueur de session (sessionStorage) : lu par FcCareerGuard.
      markSessionUnlocked();
      // Carrière déjà créée -> reprise directe au hub ; sinon création du joueur.
      // On passe par window.location pour un chargement complet : le layout
      // parent (/client) et le guard sont ainsi ré-évalués avec la session
      // fraîchement déverrouillée (pas de redirection fantôme vers /connexion).
      // Nouvelle expérience FC Career (hub, entraînement, saison, match, club).
      // L'ancienne version reste accessible sur /client/fc-career/dashboard.
      const next = '/client/fc-career/carriere';
      window.location.assign(next);
    } else {
      setError(true);
      setPin('');
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/80 p-8 backdrop-blur-xl shadow-2xl text-center"
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
          <Trophy className="text-emerald-400" size={32} />
        </div>

        <h1 className="text-2xl font-black uppercase italic text-white tracking-tight">FC Career 27</h1>
        <p className="mt-1 text-xs text-slate-400">Zone restreinte - Entrez le code secret d'accès</p>

        <form onSubmit={handleVerify} className="mt-6 space-y-4">
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={4}
              value={pin}
              onChange={(e) => { setError(false); setPin(e.target.value.replace(/\D/g, '')); }}
              placeholder="Code PIN (ex: 1769)"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/80 py-3.5 pl-12 pr-4 text-center text-lg font-black tracking-widest text-emerald-400 outline-none focus:border-emerald-500/50"
            />
          </div>

          {error && (
            <p className="text-xs font-bold text-rose-500">Code incorrect. Veuillez réessayer.</p>
          )}

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 py-3.5 font-black uppercase text-black transition-all hover:scale-[1.02] active:scale-95"
          >
            Débloquer ma carrière <ArrowRight size={18} />
          </button>
        </form>
      </motion.div>
    </div>
  );
}
