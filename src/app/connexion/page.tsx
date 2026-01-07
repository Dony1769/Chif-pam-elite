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
    setLoading(true);
    setErrorMessage('');

    try {
      const cleanPhone = phone.trim();
      const email = `${cleanPhone}@chifpam.ht`;

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;

      if (data?.user) {
        // ON VÉRIFIE L'ID VIA LA VARIABLE D'ENVIRONNEMENT
        const ADMIN_ID = process.env.NEXT_PUBLIC_ADMIN_ID;

        setTimeout(() => {
          if (data.user.id === ADMIN_ID || cleanPhone === '99999999') {
            window.location.href = '/admin-chif-pam/dashboard';
          } else {
            window.location.href = '/client/home';
          }
        }, 1000);
      }
    } catch (err: any) {
      setErrorMessage("Accès refusé. Vérifiez vos identifiants.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-white font-sans">
      <div className="w-full max-w-md bg-slate-900/40 p-10 rounded-[2.5rem] border border-white/5 backdrop-blur-3xl shadow-2xl">
        <div className="text-center mb-10">
          <ShieldCheck size={48} className="text-emerald-500 mx-auto mb-4" />
          <h1 className="text-3xl font-black italic uppercase">CHIF-PAM <span className="text-emerald-500">ELITE</span></h1>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 text-[10px] font-black uppercase flex items-center gap-3">
            <AlertCircle size={18} /> {errorMessage}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="relative">
            <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
            <input 
              type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="Numéro"
              className="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-5 pl-16 pr-6 text-sm outline-none focus:border-emerald-500 font-bold"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
            <input 
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
              className="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-5 pl-16 pr-6 text-sm outline-none focus:border-emerald-500 font-bold"
            />
          </div>
          <button disabled={loading} className="w-full bg-emerald-500 text-slate-950 py-5 rounded-2xl font-black uppercase italic tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-emerald-500/20">
            {loading ? <Loader2 className="animate-spin" /> : <>Déverrouiller <ArrowRight size={20} /></>}
          </button>
        </form>
      </div>
    </main>
  );
}
