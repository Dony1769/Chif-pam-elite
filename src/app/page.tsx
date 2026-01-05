"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 1. Inscription Auth
    const { data, error } = await supabase.auth.signUp({
      email: email, 
      password: password,
    });

    if (error) {
      if (error.message.includes("already registered")) {
        alert("Ce compte existe déjà. Redirection vers la connexion...");
        router.push('/connexion'); 
      } else {
        alert("Erreur: " + error.message);
      }
      setLoading(false);
      return;
    }

    // 2. Création du profil SQL
    if (data.user) {
      await supabase.from('profiles').insert([
        { id: data.user.id, phone: phone, email: email, password: password, balance: 0 }
      ]);
      router.push('/home');
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-[#020617] text-white flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-100 bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 backdrop-blur-md">
        <h1 className="text-2xl font-black text-center mb-6 uppercase italic text-emerald-500">Créer un compte</h1>
        
        <form onSubmit={handleRegister} className="space-y-4">
          <input 
            type="tel" placeholder="Numéro de téléphone" required
            value={phone} onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-4 px-6 font-bold"
          />
          <input 
            type="email" placeholder="Email (Pour les messages)" required
            value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-4 px-6 font-bold"
          />
          <input 
            type="password" placeholder="Mot de passe" required
            value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-4 px-6 font-bold"
          />
          <button type="submit" disabled={loading} className="w-full py-5 bg-emerald-500 text-slate-950 rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-transform">
            {loading ? "Chargement..." : "S'INSCRIRE"}
          </button>
        </form>

        <p className="text-center mt-6 text-[10px] font-black uppercase text-slate-500 tracking-widest">
          Déjà un compte ? <Link href="/connexion" className="text-emerald-500 underline underline-offset-4">Se connecter</Link>
        </p>
      </div>
    </main>
  );
}