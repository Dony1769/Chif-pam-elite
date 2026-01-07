"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ShieldCheck, Lock, Phone, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

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
      const internalEmail = `${cleanPhone}@chifpam.ht`;

      const { data, error } = await supabase.auth.signInWithPassword({
        email: internalEmail,
        password: password,
      });

      if (error) throw new Error("Accès refusé. Vérifiez vos paramètres.");

      if (data?.user) {
        // Redirection forcée
        setTimeout(() => {
          if (cleanPhone === '99999999') {
            window.location.replace('/admin-chif-pam/dashboard');
          } else {
            window.location.replace('/client/home');
          }
        }, 1000);
      }
    } catch (err: any) {
      setErrorMessage(err.message);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#020617] text-slate-100 flex items-center justify-center p-6 relative">
      <div className="absolute inset-0 bg-emerald-500/5 blur-[120px] rounded-full w-96 h-96 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-10">
          <div className="inline-flex p-5 bg-emerald-500/10 rounded-[2rem] border border-emerald-500/20 mb-6 shadow-2xl shadow-emerald-500/10">
            <ShieldCheck size={44} className="text-emerald-500" />
          </div>
          <h1 className="text-4xl font-black italic tracking-tighter uppercase mb-2">
            CHIF-PAM <span className="text-emerald-500">ELITE</span>
          </h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.5em]">Authentification Sécurisée</p>
        </div>

        <div className="bg-slate-900/60 border border-white/5 backdrop-blur-3xl p-10 rounded-[3rem] shadow-2xl">
          {errorMessage && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-500 text-[11px] font-black uppercase tracking-widest">
              <AlertCircle size={18} />
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Identifiant</label>
              <div className="relative">
                <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                <input 
                  type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="Numéro"
                  className="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-5 pl-16 pr-6 text-sm outline-none focus:border-emerald-500 transition-all font-bold text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                <input 
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-5 pl-16 pr-6 text-sm outline-none focus:border-emerald-500 transition-all font-bold text-white"
                />
              </div>
            </div>

            <button 
              type="submit" disabled={loading}
              className="w-full bg-emerald-500 text-slate-950 py-5 rounded-2xl font-black uppercase italic tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={24} /> : <>Entrer dans le système <ArrowRight size={20} /></>}
            </button>
          </form>
        </div>
        
        <p className="text-center mt-8 text-slate-600 text-[9px] font-black uppercase tracking-[0.3em]">
          Accès restreint au personnel autorisé uniquement
        </p>
      </div>
    </main>
  );
}
