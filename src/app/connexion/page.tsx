"use client";
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getHomeRouteForRole } from '@/lib/auth-routing';
import { normalizePhoneInput } from '@/lib/phone';
import { Loader2, ArrowRight, HelpCircle, ShieldCheck, Trophy, Lock, ScrollText, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { DSButton, DSCard, DSInput } from '@/components/ui/primitives';

// --- LOGO ---
const LogoChifPam = ({ className }: { className?: string }) => (
  <div className={`relative flex flex-col items-start ${className}`}>
    <div className="flex items-center gap-3">
        <svg viewBox="0 0 100 100" className="w-12 h-12 drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M75 35.5C71.5 28.5 64.2 24 56 24C41.6 24 30 35.6 30 50C30 64.4 41.6 76 56 76C66.5 76 75.5 69.8 79.5 61" stroke="#10B981" strokeWidth="10" strokeLinecap="round" />
        <path d="M55 45L76 24M76 24H58M76 24V42" stroke="#10B981" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h1 className="text-2xl font-black tracking-tighter uppercase italic text-white leading-none">
        CHIF<span className="text-emerald-500">PAM</span>
        </h1>
    </div>
  </div>
);

export default function Connexion() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // --- LOGIQUE SUPPORT (Gardée intacte car excellente) ---
  const handleSupportRequest = async (reason: string) => {
    const cleanPhone = normalizePhoneInput(phone);
    if (!cleanPhone) {
      alert("Entrez votre numéro pour que le support puisse vous identifier.");
      return;
    }

    setLoading(true);
    let clientName = "Non identifié";

    try {
      const { data } = await supabase
        .rpc('get_username_by_phone', { phone_input: cleanPhone });

      if (data && data.length > 0) {
        clientName = data[0].username;
      }

      const ADMIN_PHONE = "50940451937"; 
      const intent = reason === 'banni' ? "COMPTE BANNI 🚫" : "MOT DE PASSE OUBLIÉ 🔑";
      
      const messageText = `Bonjour Support CHIF-PAM,\n\n` +
                          `J'ai un problème : ${intent}\n` +
                          `👤 Pseudo: ${clientName}\n` +
                          `📞 Numéro: ${cleanPhone}\n\n` +
                          `Merci de m'aider à accéder à mon compte.`;

      const whatsappUrl = `https://api.whatsapp.com/send?phone=${ADMIN_PHONE}&text=${encodeURIComponent(messageText)}`;

      window.open(whatsappUrl, '_blank');
    } catch (err) {
      console.error("Erreur support:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    
    const cleanPhone = normalizePhoneInput(phone);
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

        const { data: roleProfile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle();

        const targetPath = getHomeRouteForRole(roleProfile?.role);
        window.location.replace(targetPath);
      }
    } catch {
      alert("Erreur : Identifiants incorrects ou problème de connexion.");
      setLoading(false);
    }
  };

  return (
    <div className="ds-page text-slate-100 flex flex-col font-sans overflow-x-hidden ds-fade-up">
      
      {/* HEADER SIMPLE */}
      <nav className="p-6 md:px-12 flex justify-between items-center w-full max-w-7xl mx-auto">
        <Link href="/">
            <LogoChifPam />
        </Link>
        <Link href="/inscription" className="text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-widest border border-white/10 px-4 py-2 rounded-full">
            Créer un compte
        </Link>
      </nav>

      <main className="flex-1 flex flex-col md:flex-row items-center justify-center gap-12 p-6 max-w-7xl mx-auto w-full relative z-10">
        
        {/* PARTIE GAUCHE : Branding & Confiance (Pour rassurer Google) */}
        <div className="flex-1 text-center md:text-left space-y-8 max-w-lg hidden md:block">
            <div>
                <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full text-emerald-500 text-[10px] font-black uppercase tracking-widest mb-4">
                  <Trophy size={12} /> Accès sécurisé
                </div>
                <h1 className="text-5xl md:text-6xl font-black italic uppercase tracking-tighter leading-none mb-4 text-white">
                    Bon <br/>
                  <span className="text-transparent bg-clip-text bg-linear-to-r from-emerald-400 to-cyan-500">Retour.</span>
                </h1>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Connectez-vous à votre espace personnel pour suivre vos activités, vos récompenses et vos opérations.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5 flex flex-col gap-2">
                    <ShieldCheck className="text-emerald-500" size={24}/>
                    <div>
                        <h3 className="font-bold text-white text-xs uppercase">Connexion Sûre</h3>
                        <p className="text-[10px] text-slate-500">Chiffrement SSL</p>
                    </div>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5 flex flex-col gap-2">
                  <Sparkles className="text-blue-500" size={24}/>
                    <div>
                    <h3 className="font-bold text-white text-xs uppercase">Expérience premium</h3>
                    <p className="text-[10px] text-slate-500">Synchronisation cloud</p>
                    </div>
                </div>
            </div>
        </div>

        {/* PARTIE DROITE : Formulaire de Connexion */}
            <DSCard className="w-full max-w-md p-8 rounded-[2.5rem] relative">
            <div className="text-center mb-8 md:hidden">
                <LogoChifPam className="mb-4 mx-auto items-center" />
                <h2 className="text-2xl font-black italic text-white uppercase tracking-tight">Connexion</h2>
            </div>
            
            <div className="text-center mb-8 hidden md:block">
                <h2 className="text-2xl font-black italic text-white uppercase tracking-tight">Identifiez-vous</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Accès Sécurisé</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-3">Votre Téléphone</label>
                  <DSInput 
                        type="tel" 
                        placeholder="4000 0000" 
                        value={phone} 
                        onChange={(e) => setPhone(e.target.value)} 
                        required 
                    className="py-4 px-6 font-bold" 
                    />
                </div>
                
                <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-3">Mot de passe</label>
                    <div className="relative">
                    <DSInput 
                            type="password" 
                            placeholder="••••••••" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            required 
                      className="py-4 px-6 font-bold" 
                        />
                        <Lock className="absolute right-4 top-4 text-slate-600" size={18}/>
                    </div>
                </div>

                <DSButton 
                    type="submit" 
                    disabled={loading} 
                  className="w-full py-5 mt-6 uppercase tracking-widest italic"
                >
                    {loading ? <Loader2 className="animate-spin" /> : <><span className="not-italic">SE CONNECTER</span><ArrowRight size={18} /></>}
                </DSButton>
            </form>

            <button 
                type="button"
                onClick={() => handleSupportRequest('pass')} 
                className="mt-8 flex items-center justify-center gap-2 mx-auto text-[10px] text-slate-500 hover:text-emerald-500 uppercase font-bold tracking-widest transition-colors"
                disabled={loading}
            >
                <HelpCircle size={14} /><span>Mot de passe oublié ?</span>
            </button>
            </DSCard>

      </main>

      {/* FOOTER LEGAL (Indispensable) */}
      <footer className="w-full border-t border-white/5 bg-black/20 p-8 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-slate-600 font-bold uppercase tracking-widest">
            <p>© 2026 Chif Pam. Tous droits réservés.</p>
            <div className="flex gap-6">
                <Link href="/legal/confidentialite" className="hover:text-emerald-500 transition-colors">Politique de Confidentialité</Link>
                <Link href="/legal/conditions" className="hover:text-emerald-500 transition-colors">Conditions d&apos;Utilisation</Link>
              <Link href="/legal/mention-legales" className="hover:text-white transition-colors flex items-center gap-1"><ScrollText size={12}/> Mentions Légales</Link>
            </div>
        </div>
      </footer>

    </div>
  );
}
