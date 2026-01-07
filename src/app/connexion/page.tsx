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
      const email = `${phone.trim()}@chifpam.ht`;
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) throw error;

      if (data?.user) {
        // On ne fait pas de IF ici, on laisse le Middleware décider.
        // On force juste une redirection vers le dashboard.
        // Si c'est l'admin, il entrera. Si c'est un client, le middleware le renverra ailleurs.
        window.location.href = '/admin-chif-pam/dashboard';
      }
    } catch (err: any) {
      setErrorMessage("Accès refusé. Identifiants invalides.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-white">
      <div className="w-full max-w-md bg-slate-900/40 p-8 rounded-[2.5rem] border border-white/5 backdrop-blur-2xl shadow-2xl">
        <div className="text-center mb-10">
          <ShieldCheck size={48} className="text-emerald-500 mx-auto mb-4" />
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">Accès <span className="text-emerald-500">Sécurisé</span></h1>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 text-[10px] font-black uppercase flex items-center gap-3">
            <AlertCircle size={18} /> {errorMessage}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="relative">
            <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
            <input 
              type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="Numéro de téléphone"
              className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-5 pl-14 pr-6 text-sm outline-none focus:border-emerald-500 transition-all font-bold"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
            <input 
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
              className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-5 pl-14 pr-6 text-sm outline-none focus:border-emerald-500 transition-all font-bold"
            />
          </div>

          <button disabled={loading} className="w-full bg-emerald-500 text-slate-950 py-5 rounded-2xl font-black uppercase italic tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-emerald-500/20">
            {loading ? <Loader2 className="animate-spin" /> : <>Déverrouiller <ArrowRight size={20} /></>}
          </button>
        </form>
      </div>
    </main>
  );
}
