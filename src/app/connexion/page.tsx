"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, Phone, Lock, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: `${phone}@chifpam.ht`,
        password: password,
      });

      if (authError) throw new Error("Identifiants incorrects.");

      if (authData.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (profileError || !profile) {
          throw new Error(`Profil introuvable. ID: ${authData.user.id}`);
        }

        if (profile.phone === '99999999') {
          router.push('/admin-chif-pam');
        } else {
          router.push('/home');
        }
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#020617] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-100 space-y-8">
        <div className="text-center">
          <ShieldCheck className="mx-auto text-emerald-500 mb-2" size={48} />
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">CHIF-PAM <span className="text-emerald-500">ELITE</span></h1>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem] backdrop-blur-md">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Téléphone</label>
              <input 
                type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-4 px-6 font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="99999999" required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Mot de passe</label>
              <input 
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-4 px-6 font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="••••••••" required
              />
            </div>

            <button type="submit" disabled={loading} className="w-full py-5 rounded-2xl font-black bg-emerald-500 text-slate-950 flex items-center justify-center gap-3 active:scale-95 transition-transform">
              {loading ? "CHARGEMENT..." : "CONNEXION ÉLITE"}
            </button>
          </form>

          <div className="mt-8 text-center">
            <Link href="/" className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-emerald-500 transition-colors">
              Pas encore de compte ? <span className="text-emerald-500 underline underline-offset-4">S'inscrire</span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}