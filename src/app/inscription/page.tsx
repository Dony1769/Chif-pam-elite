"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  UserCircle, Phone, Lock, ArrowRight, 
  Loader2, AlertCircle, Trophy, 
  ShieldCheck, Gamepad2, ScrollText, Eye, EyeOff, Gift,
  Users 
} from 'lucide-react';
import Link from 'next/link';
import { LogoChifPam } from '@/components/LogoChifPam';
import { DSButton, DSCard, DSInput } from '@/components/ui/primitives';
import ThreeSurface from '@/components/three/ThreeSurface';

function SignupForm() {
  const [phone, setPhone] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [referralCode, setReferralCode] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) setReferralCode(ref.toUpperCase());
  }, [searchParams]);

  // Saisie téléphonique restreinte à 8 chiffres maximum
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const onlyNums = e.target.value.replace(/\D/g, '');
    const trimmed = onlyNums.slice(0, 8);
    setPhone(trimmed);
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    
    // Validations locales des champs
    if (phone.length !== 8) {
      return setError("Le numéro de téléphone doit contenir exactement 8 chiffres.");
    }
    
    if (password.length < 8) return setError("Le mot de passe doit contenir au moins 8 caractères.");
    if (username.trim().length < 3) return setError("Le pseudo doit contenir au moins 3 caractères.");

    setLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone,
          password,
          username,
          referralCode,
        }),
      });

      const result = (await response.json()) as { success?: boolean; message?: string };

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Une erreur est survenue lors de l'inscription.");
      }

      router.push('/connexion?signup=success');

    } catch (err: unknown) {
      let rawMsg = "";

      if (err instanceof Error) {
        rawMsg = err.message;
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        rawMsg = String((err as { message: unknown }).message);
      }

      // Interception et formatage des erreurs Auth & Database
      const lowerMsg = rawMsg.toLowerCase();

      if (
        lowerMsg.includes("user already registered") || 
        lowerMsg.includes("profiles_phone_key") || 
        lowerMsg.includes("already exists")
      ) {
        setError("Nimewo w la gentan anrejistre kliyan , ou mèt al konekte san tèt kase");
      } else if (lowerMsg.includes("profiles_username_key")) {
        setError("Ce pseudo d'agent est déjà utilisé par un autre joueur.");
      } else {
        setError(rawMsg || "Une erreur est survenue lors de l'inscription. Veuillez réessayer.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <DSCard className="p-8 rounded-[2.5rem] relative w-full max-w-md mx-auto">
      <div className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-400 text-xs font-bold">
        <Gift size={20} className="shrink-0 text-emerald-400" />
        <span>Inscrivez-vous et recevez jusqu'à <strong>10 HTG</strong> de bonus de bienvenue !</span>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-500 text-xs font-bold">
          <AlertCircle size={18} className="shrink-0" /> 
          <span>{error}</span>
        </div>
      )}

      <div className="text-center mb-6">
        <h2 className="text-2xl font-black italic text-white uppercase tracking-tight">Nouvel Agent</h2>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Rejoignez l'arène</p>
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-3">Pseudo Agent</label>
          <div className="relative">
            <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 z-10" size={18} />
            <DSInput 
              type="text" 
              required 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              placeholder="Votre Nom de code" 
              className="pl-12 py-4 font-bold"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-3">Téléphone</label>
          <div className="relative flex items-center">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 z-10" size={18} />
            
            <span className="absolute left-11 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm z-10 select-none">
              +509
            </span>

            <DSInput 
              type="tel" 
              inputMode="numeric"
              required 
              value={phone} 
              onChange={handlePhoneChange} 
              maxLength={8}
              placeholder="0000 0000" 
              className="pl-24 py-4 font-bold tracking-widest"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-3">Sécurité</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 z-10" size={18} />
            <DSInput 
              type={showPassword ? "text" : "password"} 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Mot de passe secret" 
              className="pl-12 pr-12 py-4 font-bold"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors z-10"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-black text-emerald-500 uppercase tracking-widest ml-3">Parrainage (Optionnel)</label>
          <div className="relative">
            <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 z-10" size={18} />
            <DSInput 
              type="text" 
              value={referralCode} 
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())} 
              placeholder="CODE DU PARRAIN" 
              className="pl-12 py-4 font-bold uppercase text-emerald-400 border-emerald-500/30 focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="pt-2">
          <p className="text-[9px] text-slate-500 text-center mb-4 leading-relaxed px-4">
            En créant un compte, vous acceptez nos <Link href="/legal/conditions" className="text-emerald-500 underline hover:text-emerald-400">Conditions d'Utilisation</Link> et certifiez avoir plus de 18 ans.
          </p>
          
          <DSButton 
            type="submit" 
            disabled={loading} 
            className="w-full py-5 font-black uppercase italic tracking-widest flex items-center justify-center gap-3"
          >
            {loading ? <Loader2 className="animate-spin" /> : <><span>VALIDER L'INSCRIPTION</span><ArrowRight size={20} /></>}
          </DSButton>
        </div>
      </form>

      <div className="mt-6 text-center">
        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
          Déjà un compte ? <Link href="/connexion" className="text-emerald-400 hover:text-emerald-300 transition-colors ml-1 underline underline-offset-4">Connexion</Link>
        </p>
      </div>
    </DSCard>
  );
}

export default function Inscription() {
  return (
    <div className="ds-page text-slate-100 flex flex-col font-sans overflow-x-hidden ds-fade-up min-h-screen bg-[#020617]">
      <ThreeSurface variant="auth" className="pointer-events-none -right-12 top-16 z-0 h-[30rem] w-[34rem] opacity-60" />
      <nav className="p-6 md:px-12 flex justify-between items-center w-full max-w-7xl mx-auto">
        <Link href="/">
          <LogoChifPam />
        </Link>
        <Link href="/connexion" className="text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-widest border border-white/10 px-4 py-2 rounded-full">
          Connexion
        </Link>
      </nav>

      <main className="flex-1 flex flex-col md:flex-row items-center justify-center gap-12 p-6 max-w-7xl mx-auto w-full relative z-10">
        <div className="flex-1 text-center md:text-left space-y-8 max-w-lg">
          <div>
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full text-emerald-500 text-[10px] font-black uppercase tracking-widest mb-4">
              <Trophy size={12} /> N°1 Skill Gaming Haïti
            </div>
            <h1 className="text-5xl md:text-6xl font-black italic uppercase tracking-tighter leading-none mb-4 text-white">
              Rejoignez <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">L'Élite.</span>
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Créez votre compte sécurisé pour sauvegarder vos scores, participer aux classements nationaux et convertir vos compétences en récompenses réelles.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5 flex flex-col gap-2">
              <ShieldCheck className="text-emerald-500" size={24}/>
              <div>
                <h3 className="font-bold text-white text-xs uppercase">100% Sécurisé</h3>
                <p className="text-[10px] text-slate-500">Protection des données</p>
              </div>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5 flex flex-col gap-2">
              <Gamepad2 className="text-blue-500" size={24}/>
              <div>
                <h3 className="font-bold text-white text-xs uppercase">Jeu d'Adresse</h3>
                <p className="text-[10px] text-slate-500">Basé sur le talent</p>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full max-w-md">
          <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-500" size={40} /></div>}>
            <SignupForm />
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
