"use client";
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, ArrowRight, HelpCircle } from 'lucide-react';

// --- COMPOSANT LOGO CHIF-PAM (SVG PROFESSIONNEL) ---
const LogoChifPam = ({ className }: { className?: string }) => (
  <div className={`relative flex flex-col items-center ${className}`}>
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
    <h1 className="mt-2 text-3xl font-black tracking-tighter uppercase italic text-white">
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
      
      // 1. Authentification Supabase
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });

      if (error) throw error;

      if (data?.user) {
        // 2. VÉRIFICATION DU BLOCAGE (SÉCURITÉ ÉTABLIE)
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_banned, ban_reason')
          .eq('id', data.user.id)
          .single();

        if (profile?.is_banned) {
          await supabase.auth.signOut(); // Déconnexion forcée immédiate
          alert(`🚫 COMPTE SUSPENDU : ${profile.ban_reason || "Violation des conditions d'utilisation."}`);
          setLoading(false);
          return;
        }

        // 3. Redirection si non banni
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

  const handleForgotPassword = () => {
    alert("Pour réinitialiser votre mot de passe, veuillez contacter le support Chif-Pam muni de votre numéro de téléphone pour vérification d'identité.");
  };

  return (
    <main className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-white font-sans">
      <div className="w-full max-w-md bg-slate-900 border border-white/10 p-10 rounded-[3rem] text-center shadow-2xl relative overflow-hidden">
        
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
              className="w-full bg-slate-950 border border-white/5 p-4 rounded-2xl outline-none focus:border-emerald-500/50 transition-all text-white placeholder:text-slate-700 font-bold"
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
              className="w-full bg-slate-950 border border-white/5 p-4 rounded-2xl outline-none focus:border-emerald-500/50 transition-all text-white placeholder:text-slate-700 font-bold"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 p-5 rounded-2xl font-black transition-all flex items-center justify-center gap-3 mt-4 disabled:opacity-50 shadow-[0_10px_20px_rgba(16,185,129,0.2)] active:scale-95"
          >
            {loading ? <Loader2 className="animate-spin" /> : (
              <>
                <span className="tracking-tighter italic">SE CONNECTER</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <button 
          onClick={handleForgotPassword}
          className="mt-8 flex items-center justify-center gap-2 mx-auto text-[10px] text-slate-500 hover:text-emerald-500 transition-colors uppercase tracking-widest font-bold group"
        >
          <HelpCircle size={14} className="group-hover:animate-pulse" />
          <span>Mot de passe oublié ?</span>
        </button>

        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/5 rounded-full blur-[80px]" />
      </div>
    </main>
  );
}
