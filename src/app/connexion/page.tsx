"use client";

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getHomeRouteForRole } from '@/lib/auth-routing';
import { normalizePhoneNumber } from '@/lib/phone';
import { useSearchParams } from 'next/navigation';
import { 
  Loader2, ArrowRight, HelpCircle, ShieldCheck, 
  Trophy, Lock, ScrollText, Sparkles, Phone, Eye, EyeOff, AlertCircle, CheckCircle2 
} from 'lucide-react';
import Link from 'next/link';
import { LogoChifPam } from '@/components/LogoChifPam';
import { DSButton, DSCard, DSInput } from '@/components/ui/primitives';
import ThreeSurface from '@/components/three/ThreeSurface';

interface ProfileData {
  is_banned: boolean | null;
  ban_reason: string | null;
  role: string | null;
}

function LoginFormContent() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('signup') === 'success') {
      setSuccessMessage("Inscription réussie ! Vous pouvez maintenant vous connecter.");
    }
  }, [searchParams]);

  // Le préfixe +509 est affiché séparément; seule la partie locale est saisie.
  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(e.target.value.replace(/\D/g, '').slice(0, 8));
  }, []);

  const handleSupportRequest = async (reason: 'banni' | 'pass') => {
    if (loading) return;

    if (phone.length !== 8 || !/^\d{8}$/.test(phone)) {
      setErrorMessage("Veuillez saisir votre numéro à 8 chiffres pour contacter le support.");
      return;
    }

    setLoading(true);

    try {
      const ADMIN_PHONE = "50940451937"; 
      const intent = reason === 'banni' ? "COMPTE BANNI 🚫" : "MOT DE PASSE OUBLIÉ 🔑";
      
      const messageText = `Bonjour Support CHIF-PAM,\n\n` +
                          `J'ai un problème : ${intent}\n` +
                          `📞 Numéro : +509 ${phone}\n\n` +
                          `Merci de m'aider à accéder à mon compte.`;

      const whatsappUrl = `https://api.whatsapp.com/send?phone=${ADMIN_PHONE}&text=${encodeURIComponent(messageText)}`;
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error("Erreur d'ouverture du support:", err);
      setErrorMessage("Impossible d'ouvrir le support WhatsApp pour le moment.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    setErrorMessage('');
    setSuccessMessage('');

    if (phone.length !== 8 || !/^\d{8}$/.test(phone)) {
      setErrorMessage("Le numéro de téléphone doit contenir exactement 8 chiffres.");
      return;
    }

    if (!password) {
      setErrorMessage("Veuillez entrer votre mot de passe.");
      return;
    }

    setLoading(true);

    try {
      const resolveResponse = await fetch('/api/auth/resolve-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizePhoneNumber(`+509${phone}`) }),
      });
      const resolved = (await resolveResponse.json()) as { success?: boolean; email?: string; message?: string };
      if (!resolveResponse.ok || !resolved.success || !resolved.email) {
        console.error('[connexion] phone resolution failed', {
          status: resolveResponse.status,
          message: resolved.message,
        });
        throw new Error(resolved.message || 'Numéro ou mot de passe incorrect.');
      }

      // 1. Authentification Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
        email: resolved.email,
        password 
      });

      if (authError) {
        console.error('[connexion] Supabase sign-in failed', {
          code: authError.code,
          message: authError.message,
          status: authError.status,
        });
        throw authError;
      }

      const user = authData?.user;
      if (!user) throw new Error("Erreur de session.");

      // 2. Vérification du statut utilisateur dans la table profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_banned, ban_reason, role')
        .eq('id', user.id)
        .maybeSingle<ProfileData>();

      if (profileError) {
        console.error('[connexion] profile lookup after sign-in failed', profileError);
        await supabase.auth.signOut();
        throw new Error("Impossible de vérifier les autorisations du profil.");
      }

      // 3. Traitement des comptes suspendus
      if (profile?.is_banned) {
        await supabase.auth.signOut();
        setErrorMessage(`🚫 COMPTE SUSPENDU : ${profile.ban_reason || "Violation des conditions d'utilisation."}`);
        return;
      }

      // 4. Redirection sécurisée selon le rôle
      const targetPath = getHomeRouteForRole(profile?.role);
      window.location.replace(targetPath);

    } catch (err: unknown) {
      console.error('[connexion] login flow failed', err);
      if (err instanceof Error) {
        // Personnalisation du message d'erreur d'identifiants
        if (err.message.includes("Invalid login credentials")) {
          setErrorMessage("Numéro ou mot de passe incorrect.");
        } else {
          setErrorMessage(err.message);
        }
      } else {
        setErrorMessage("Identifiants incorrects ou service indisponible.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <DSCard className="w-full max-w-md p-8 rounded-[2.5rem] relative mx-auto">
      <div className="text-center mb-8 md:hidden">
        <LogoChifPam className="mb-4 mx-auto items-center" />
        <h2 className="text-2xl font-black italic text-white uppercase tracking-tight">Connexion</h2>
      </div>
      
      <div className="text-center mb-8 hidden md:block">
        <h2 className="text-2xl font-black italic text-white uppercase tracking-tight">Identifiez-vous</h2>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Accès Sécurisé</p>
      </div>

      {successMessage && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-400 text-xs font-bold">
          <CheckCircle2 size={18} className="shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-500 text-xs font-bold">
          <AlertCircle size={18} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="phone" className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-3">Téléphone</label>
          <div className="relative flex items-center">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 z-10" size={18} />
            <span className="absolute left-11 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm z-10 select-none">
              +509
            </span>
            <DSInput 
              id="phone"
              type="tel" 
              inputMode="numeric"
              placeholder="0000 0000" 
              value={phone} 
              onChange={handlePhoneChange} 
              maxLength={8}
              required 
              disabled={loading}
              className="pl-24 py-4 font-bold tracking-widest" 
            />
          </div>
        </div>
        
        <div className="space-y-1">
          <label htmlFor="password" className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-3">Mot de passe</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 z-10" size={18}/>
            <DSInput 
              id="password"
              type={showPassword ? "text" : "password"} 
              placeholder="••••••••" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              disabled={loading}
              className="pl-12 pr-12 py-4 font-bold" 
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors z-10"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <DSButton 
          type="submit" 
          disabled={loading} 
          className="w-full py-5 mt-6 uppercase tracking-widest italic flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" /> : <><span>SE CONNECTER</span><ArrowRight size={18} /></>}
        </DSButton>
      </form>

      <button 
        type="button"
        onClick={() => handleSupportRequest('pass')} 
        className="mt-8 flex items-center justify-center gap-2 mx-auto text-[10px] text-slate-500 hover:text-emerald-400 uppercase font-bold tracking-widest transition-colors"
        disabled={loading}
      >
        <HelpCircle size={14} /><span>Mot de passe oublié ?</span>
      </button>

      <div className="mt-6 text-center border-t border-white/5 pt-4">
        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
          Pas encore de compte ? <Link href="/inscription" className="text-emerald-400 hover:text-emerald-300 transition-colors ml-1 underline underline-offset-4">Inscription</Link>
        </p>
      </div>
    </DSCard>
  );
}

export default function Connexion() {
  return (
    <div className="ds-page text-slate-100 flex flex-col font-sans overflow-x-hidden ds-fade-up min-h-screen bg-[#020617]">
      <ThreeSurface variant="auth" className="pointer-events-none -right-12 top-16 z-0 h-120 w-136 opacity-60" />
      <nav className="p-6 md:px-12 flex justify-between items-center w-full max-w-7xl mx-auto">
        <Link href="/">
          <LogoChifPam />
        </Link>
        <Link href="/inscription" className="text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-widest border border-white/10 px-4 py-2 rounded-full">
          Créer un compte
        </Link>
      </nav>

      <main className="flex-1 flex flex-col md:flex-row items-center justify-center gap-12 p-6 max-w-7xl mx-auto w-full relative z-10">
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

        <div className="w-full max-w-md">
          <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-500" size={40} /></div>}>
            <LoginFormContent />
          </Suspense>
        </div>
      </main>

      <footer className="w-full border-t border-white/5 bg-black/20 p-8 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-slate-600 font-bold uppercase tracking-widest">
          <p>© 2026 Chif Pam. Tous droits réservés.</p>
          <div className="flex gap-6">
            <Link href="/legal/confidentialite" className="hover:text-emerald-500 transition-colors">Politique de Confidentialité</Link>
            <Link href="/legal/conditions" className="hover:text-emerald-500 transition-colors">Conditions d'Utilisation</Link>
            <Link href="/legal/mention-legales" className="hover:text-white transition-colors flex items-center gap-1">
              <ScrollText size={12}/> Mentions Légales
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
