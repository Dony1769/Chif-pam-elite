"use client";
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, ArrowRight } from 'lucide-react';

// --- COMPOSANT LOGO CHIF-PAM (SVG PROFESSIONNEL) ---
const LogoChifPam = ({ className }: { className?: string }) => (
  <div className={`relative flex flex-col items-center ${className}`}>
    {/* Icône du Logo */}
    <svg 
      viewBox="0 0 100 100" 
      className="w-20 h-20 drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]"
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        d="M75 35.5C71.5 28.5 64.2 24 56 24C41.6 24 30 35.6 30 50C30 64.4 41.6 76 56 76C66.5 76 75.5 69.8 79.5 61" 
        stroke="#10B981" 
        strokeWidth="8" 
        strokeLinecap="round" 
      />
      <path 
        d="M55 45L76 24M76 24H58M76 24V42" 
        stroke="#10B981" 
        strokeWidth="8" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
    </svg>
    
    {/* Texte du Logo */}
    <h1 className="mt-2 text-3xl font-black tracking-tighter uppercase italic">
      CHIF-<span className="text-emerald-500">PAM</span>
    </h1>
  </div>
);

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
    <main className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-white font-sans">
      <div className="w-full max-w-md bg-slate-900 border border-white/10 p-10 rounded-[3rem] text-center shadow-2xl relative overflow-hidden">
        
        {/* Intégration du Logo */}
        <div className="mb-10">
          <LogoChifPam />
          <p className="text-slate-500 text-[10px] uppercase tracking-[0.3em] mt-2 font-bold">
            Accès Privé
          </p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4 relative z-10">
          <div className="text-left space-y-1">
            <label className="text-[10px] text-slate-500 uppercase ml-4 tracking-widest font-bold">Identifiant</label>
            <input 
              type="tel" 
              placeholder="Numéro de téléphone" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full bg-slate-950 border border-white/5 p-4 rounded-2xl outline-none focus:border-emerald-500/50 transition-all text-white placeholder:text-slate-700"
            />
          </div>

          <div className="text-left space-y-1">
            <label className="text-[10px] text-slate-500 uppercase ml-4 tracking-widest font-bold">Mot de passe</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-slate-950 border border-white/5 p-4 rounded-2xl outline-none focus:border-emerald-500/50 transition-all text-white placeholder:text-slate-700"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 p-5 rounded-2xl font-black transition-all flex items-center justify-center gap-3 mt-4 disabled:opacity-50 shadow-[0_10px_20px_rgba(16,185,129,0.2)] active:scale-95"
          >
            {loading ? <Loader2 className="animate-spin" /> : (
              <>
                <span>SE CONNECTER</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Effet de lumière en arrière-plan pour le "look" premium */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/5 rounded-full blur-[80px]" />
      </div>
    </main>
  );
}
