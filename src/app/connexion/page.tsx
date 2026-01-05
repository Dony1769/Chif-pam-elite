"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, Phone, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function Connexion() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Authentification via Supabase Auth
      // Note: On utilise l'email simulé car Supabase Auth nécessite un format email
      const fakeEmail = `${phone}@chifpam.ht`;
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: fakeEmail,
        password: password,
      });

      if (authError) throw new Error("Identifiants incorrects.");

      if (data.user) {
        // 2. Vérification du rôle dans la table 'profiles'
        const { data: profile, error: profError } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', data.user.id)
          .single();

        if (profError || !profile) throw new Error("Profil introuvable.");

        // 3. Redirection intelligente
        // Si c'est l'email de l'admin, direction dashboard admin
        if (profile.email === '99999999@chifpam.ht') {
          router.push('/admin');
        } else {
          // Sinon, direction espace client
          router.push('/client');
        }
      }
    } catch (err: any) {
      alert(err.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#020617] text-slate-100 flex flex-col items-center justify-center p-6">
      {/* Glow Effect Background */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-full opacity-20 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-75 h-75 bg-emerald-500 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl rotate-3 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)] mb-4">
            <ShieldCheck size={32} className="text-white -rotate-3" />
          </div>
          <h1 className="text-3xl font-black italic tracking-tighter uppercase">
            CHIF-PAM <span className="text-emerald-500">ELITE</span>
          </h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em] mt-2">
            Connexion Sécurisée
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-slate-900/40 border border-slate-800 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Téléphone</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="tel" 
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ex: 40000000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm outline-none focus:border-emerald-500 transition-all font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm outline-none focus:border-emerald-500 transition-all font-bold"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-4 rounded-2xl font-black uppercase italic tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-emerald-500/20"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Chargement...
                </>
              ) : (
                <>
                  Se Connecter
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-800/50 text-center">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">
              Pas encore de compte ?{' '}
              <Link href="/" className="text-emerald-500 hover:text-emerald-400 underline underline-offset-4">
                S'inscrire
              </Link>
            </p>
          </div>
        </div>

        {/* Support Link */}
        <p className="text-center mt-8 text-slate-600 text-[10px] font-bold uppercase tracking-[0.3em]">
          Besoin d'aide ? Contactez le support
        </p>
      </div>
    </main>
  );
}