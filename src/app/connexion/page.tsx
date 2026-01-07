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
      const internalEmail = `${phone.trim()}@chifpam.ht`;

      const { data, error } = await supabase.auth.signInWithPassword({
        email: internalEmail,
        password: password,
      });

      if (error) throw error;

      if (data?.user) {
        // PETITE PAUSE pour laisser les cookies s'installer
        setTimeout(() => {
          if (phone.trim() === '99999999') {
            window.location.replace('/admin-chif-pam/dashboard');
          } else {
            window.location.replace('/client/home');
          }
        }, 500);
      }
    } catch (err: any) {
      setErrorMessage("Échec de connexion. Vérifiez vos accès.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-white">
      <div className="w-full max-w-md bg-slate-900/50 p-8 rounded-[2.5rem] border border-white/5 backdrop-blur-xl">
        <div className="text-center mb-8">
            <ShieldCheck className="mx-auto text-emerald-500 mb-4" size={48} />
            <h1 className="text-3xl font-black italic uppercase">CONNEXION <span className="text-emerald-500">ADMIN</span></h1>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 text-xs font-bold flex items-center gap-2">
            <AlertCircle size={16} /> {errorMessage}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <input 
            type="tel" placeholder="Numéro" value={phone} onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 p-5 rounded-2xl outline-none focus:border-emerald-500"
          />
          <input 
            type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 p-5 rounded-2xl outline-none focus:border-emerald-500"
          />
          <button type="submit" disabled={loading} className="w-full bg-emerald-500 text-slate-950 p-5 rounded-2xl font-black uppercase flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin" /> : <>ENTRER <ArrowRight size={20} /></>}
          </button>
        </form>
      </div>
    </main>
  );
}
