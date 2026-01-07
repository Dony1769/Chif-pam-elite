"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ShieldCheck, Lock, Phone, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function Connexion() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    setLoading(true);
    setErrorMessage('');

    try {
      const cleanPhone = phone.trim();
      // On construit l'email exactement comme stocké dans Supabase Auth
      const internalEmail = `${cleanPhone}@chifpam.ht`;

      const { data, error } = await supabase.auth.signInWithPassword({
        email: internalEmail,
        password: password,
      });

      if (error) {
        throw new Error("Identifiants incorrects. Vérifiez votre numéro.");
      }

      if (data?.user) {
        // PAUSE TECHNIQUE : Crucial sur mobile pour laisser le temps au navigateur 
        // d'enregistrer le cookie de session avant que le middleware ne vérifie.
        setTimeout(() => {
          if (cleanPhone === '99999999') {
            // Force le rechargement complet vers le dashboard admin
            window.location.replace('/admin-chif-pam/dashboard');
          } else {
            // Force le rechargement complet vers l'espace client
            window.location.replace('/client/home');
          }
        }, 1200); // 1.2 seconde de sécurité
      }
    } catch (err: any) {
      setErrorMessage(err.message);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#020617] text-slate-100 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Effet de lumière en arrière-plan */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex p-4 bg-emerald-500/10 rounded-3xl border border-emerald-500/20 mb-6">
            <ShieldCheck size={40} className="text-emerald-500" />
          </div>
          <h1 className="text-4xl font-black italic tracking-tighter uppercase mb-2">
            CHIF-PAM <span className="text-emerald-500">ELITE</span>
          </h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">Système de gestion</p>
        </div>

        <div className="bg-slate-900/40 border border-white/5 backdrop-blur-2xl p-8 rounded-[2.5rem] shadow-2xl">
          {errorMessage && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-500 text-[11px] font-black uppercase tracking-widest animate-pulse">
              <AlertCircle size={18} />
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Téléphone</label>
              <div className="relative">
                <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                <input 
                  type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="Numéro"
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-5 pl-14 pr-6 text-sm outline-none focus:border-emerald-500 transition-all font-bold text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                <input 
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-5 pl-14 pr-6 text-sm outline-none focus:border-emerald-500 transition-all font-bold text-white"
                />
              </div>
            </div>

            <button 
              type="submit" disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-5 rounded-2xl font-black uppercase italic tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="animate-spin" size={20} />
                  <span>Vérification...</span>
                </div>
              ) : (
                <>Accéder à l'Elite <ArrowRight size={20} /></>
              )}
            </button>
          </form>

          <div className="mt-8 text-center pt-6 border-t border-white/5">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-wider">
              Besoin d'aide ? <Link href="/" className="text-emerald-500 hover:underline ml-1">Retour</Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
