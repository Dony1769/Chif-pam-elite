"use client";
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ShieldCheck, Lock, Phone, ArrowRight, Loader2 } from 'lucide-react';

export default function Connexion() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const email = `${phone.trim()}@chifpam.ht`;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      alert("Erreur: " + error.message);
      setLoading(false);
      return;
    }

    if (data?.user) {
      // Redirection directe
      if (phone.trim() === '99999999') {
        window.location.href = '/admin-chif-pam/dashboard';
      } else {
        window.location.href = '/client/home';
      }
    }
  };

  return (
    <main className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-white">
      <div className="w-full max-w-md bg-slate-900 border border-white/10 p-10 rounded-[2rem] text-center">
        <ShieldCheck size={50} className="text-emerald-500 mx-auto mb-6" />
        <h1 className="text-2xl font-black uppercase mb-8 italic">Accès <span className="text-emerald-500">Privé</span></h1>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <input 
            type="tel" placeholder="Numéro" value={phone} onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl outline-none focus:border-emerald-500"
          />
          <input 
            type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl outline-none focus:border-emerald-500"
          />
          <button type="submit" disabled={loading} className="w-full bg-emerald-500 text-black p-4 rounded-xl font-bold flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin" /> : "SE CONNECTER"}
          </button>
        </form>
      </div>
    </main>
  );
}
