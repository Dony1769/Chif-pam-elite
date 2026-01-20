"use client";
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, ArrowRight, HelpCircle } from 'lucide-react';

// --- LOGO (Inchangé) ---
const LogoChifPam = ({ className }: { className?: string }) => (
  <div className={`relative flex flex-col items-center ${className}`}>
    <svg viewBox="0 0 100 100" className="w-20 h-20 drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M75 35.5C71.5 28.5 64.2 24 56 24C41.6 24 30 35.6 30 50C30 64.4 41.6 76 56 76C66.5 76 75.5 69.8 79.5 61" stroke="#10B981" strokeWidth="8" strokeLinecap="round" />
      <path d="M55 45L76 24M76 24H58M76 24V42" stroke="#10B981" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <h1 className="mt-2 text-3xl font-black tracking-tighter uppercase italic text-white">CHIF-<span className="text-emerald-500">PAM</span></h1>
  </div>
);

export default function Connexion() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // --- NOUVELLE LOGIQUE DE SUPPORT AMÉLIORÉE ---
  const handleSupportRequest = async (reason: string) => {
    const cleanPhone = phone.trim();
    if (!cleanPhone) {
      alert("Veuillez entrer votre numéro de téléphone d'abord.");
      return;
    }

    setLoading(true);
    let clientName = "Client inconnu";

    try {
      // On cherche le pseudo associé au numéro dans la table profiles
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (data?.username) {
        clientName = data.username;
      }
    } catch (err) {
      console.error("Erreur récupération pseudo", err);
    }

    const baseUrl = "https://wa.me/message/IN7LA3KWGTZ7B1";
    const msg = reason === 'banni' 
      ? `Bonjour Support, mon compte (@${clientName}) est banni. Numéro: ${cleanPhone}`
      : `Bonjour Support, je suis @${clientName}. J'ai oublié mon mot de passe pour mon compte lié au numéro: ${cleanPhone}. Merci de m'aider à le réinitialiser.`;
    
    setLoading(false);
    window.open(`${baseUrl}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    
    const cleanPhone = phone.trim();
    const email = `${cleanPhone}@chifpam.ht`;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (data?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_banned, ban_reason')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profile?.is_banned) {
          await supabase.auth.signOut();
          setLoading(false);
          if (confirm(`🚫 COMPTE SUSPENDU : ${profile.ban_reason || "Violation des règles."}\nContacter le support ?`)) {
            handleSupportRequest('banni');
          }
          return;
        }

        const targetPath = cleanPhone === '99999999' ? '/admin-chif-pam/dashboard' : '/client/home';
        window.location.replace(targetPath);
      }
    } catch (error: any) {
      alert("Erreur : Identifiants incorrects ou problème de connexion.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-white">
      <div className="w-full max-w-md bg-slate-900 border border-white/10 p-10 rounded-[3rem] text-center shadow-2xl relative overflow-hidden">
        <div className="mb-10"><LogoChifPam /><p className="text-slate-500 text-[10px] uppercase tracking-[0.3em] mt-2 font-bold">Accès Rapide</p></div>
        
        <form onSubmit={handleLogin} className="space-y-4 relative z-10">
          <input type="tel" placeholder="Numéro de téléphone" value={phone} onChange={(e) => setPhone(e.target.value)} required className="w-full bg-slate-950 border border-white/5 p-4 rounded-2xl outline-none focus:border-emerald-500/50 transition-all font-bold" />
          <input type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full bg-slate-950 border border-white/5 p-4 rounded-2xl outline-none focus:border-emerald-500/50 transition-all font-bold" />
          <button type="submit" disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 p-5 rounded-2xl font-black transition-all flex items-center justify-center gap-3">
            {loading ? <Loader2 className="animate-spin" /> : <><span className="italic">SE CONNECTER</span><ArrowRight size={18} /></>}
          </button>
        </form>

        <button 
          onClick={() => handleSupportRequest('pass')} 
          disabled={loading}
          className="mt-8 flex items-center justify-center gap-2 mx-auto text-[10px] text-slate-500 hover:text-emerald-500 uppercase font-bold disabled:opacity-50"
        >
          <HelpCircle size={14} />
          <span>{loading ? "Recherche..." : "Mot de passe oublié ?"}</span>
        </button>
      </div>
    </main>
  );
}
