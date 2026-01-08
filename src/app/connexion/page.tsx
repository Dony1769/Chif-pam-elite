"use client";
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ShieldCheck, Loader2, ArrowRight } from 'lucide-react';

export default function Connexion() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    
    try {
      const email = `${phone.trim()}@chifpam.ht`;
      
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });

      if (error) throw error;

      if (data?.user) {
        // Redirection radicale pour éviter les problèmes de cache
        if (phone.trim() === '99999999') {
          window.location.href = '/admin-chif-pam/dashboard';
        } else {
          window.location.href = '/client/home';
        }
      }
    } catch (error: any) {
      alert("Erreur d'accès: " + error.message);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-white">
      <div className="w-full max-w-md bg-slate-900 border border-white/10 p-10 rounded-[3rem] text-center shadow-2xl">
        <ShieldCheck size={60} className="text-emerald-500 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]" />
        <h1 className="text-2xl font-black uppercase mb-8 italic tracking-tighter">
          Accès <span className="text-emerald-500">Privé</span>
        </h1>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="text-left space-y-1">
            <label className="text-[10px] text-slate-500 uppercase ml-4 tracking-widest">Identifiant</label>
            <input 
              type="tel" 
              placeholder="Numéro de téléphone" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full bg-slate-950 border border-white/5 p-4 rounded-2xl outline-none focus:border-emerald-500/50 transition-all text-white"
            />
          </div>

          <div className="text-left space-y-1">
            <label className="text-[10px] text-slate-500 uppercase ml-4 tracking-widest">Mot de passe</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-slate-950 border border-white/5 p-4 rounded-2xl outline-none focus:border-emerald-500/50 transition-all text-white"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 p-5 rounded-2xl font-black transition-all flex items-center justify-center gap-3 mt-4 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : (
              <>
                <span>SE CONNECTER</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}