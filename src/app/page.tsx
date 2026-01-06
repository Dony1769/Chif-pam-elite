"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { UserCircle, Phone, Lock, ArrowRight, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function Inscription() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (phone.length < 8) return setError("Numéro de téléphone trop court");
    setLoading(true);

    try {
      const cleanPhone = phone.trim();
      const internalEmail = `${cleanPhone}@chifpam.ht`;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: internalEmail,
        password: password,
      });

      // SI L'UTILISATEUR EXISTE DÉJÀ
      if (authError) {
        if (authError.message.includes("already registered")) {
          setError("Ce numéro possède déjà un compte Elite.");
          setTimeout(() => router.push('/connexion'), 2000);
          return;
        }
        throw authError;
      }

      if (authData.user) {
        const { error: profileError } = await supabase.from('profiles').insert([{
          id: authData.user.id,
          phone: cleanPhone,
          username: username.trim(),
          balance: 0,
          is_banned: false
        }]);

        if (profileError) throw profileError;
        router.push('/connexion');
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#020617] text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl rotate-3 flex items-center justify-center shadow-lg shadow-emerald-500/20 mx-auto mb-4">
            <ShieldCheck size={32} className="text-slate-950 -rotate-3" />
          </div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">Elite <span className="text-emerald-500">Pam</span></h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Nouveau Membre</p>
        </div>

        <div className="bg-slate-900/40 border border-white/5 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl">
          {error && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-500 text-[10px] font-black uppercase animate-pulse">
              <AlertCircle size={18} /> {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Pseudo</label>
              <div className="relative">
                <UserCircle className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                <input 
                  type="text" required value={username} onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ton pseudo unique"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-14 pr-6 text-sm outline-none focus:border-emerald-500 transition-all font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Téléphone</label>
              <div className="relative">
                <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                <input 
                  type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="4000 0000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-14 pr-6 text-sm outline-none focus:border-emerald-500 transition-all font-bold"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-14 pr-6 text-sm outline-none focus:border-emerald-500 transition-all font-bold"
                />
              </div>
            </div>

            <button 
              type="submit" disabled={loading}
              className="w-full bg-emerald-500 text-slate-950 py-5 rounded-2xl font-black uppercase italic tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : "S'inscrire maintenant"}
              {!loading && <ArrowRight size={20} />}
            </button>
          </form>

          <div className="mt-8 text-center pt-6 border-t border-slate-800/50">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-wider">
              Déjà un compte ? <Link href="/connexion" className="text-emerald-500 hover:underline ml-1">Connectez-vous ici</Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}