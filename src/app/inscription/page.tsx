"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { normalizePhoneInput } from '@/lib/phone';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  UserCircle, Phone, Lock, ArrowRight, 
  Loader2, AlertCircle, Users, Trophy, 
  ShieldCheck, Gamepad2, ScrollText, Eye, EyeOff, CheckCircle2 
} from 'lucide-react';
import Link from 'next/link';
import { DSButton, DSCard, DSInput } from '@/components/ui/primitives';

// --- COMPOSANT LOGO RÉUTILISABLE ---
export const LogoChifPam = ({ className }: { className?: string }) => (
  <div className={`relative flex flex-col items-start ${className || ''}`}>
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 100 100" className="w-10 h-10 md:w-12 md:h-12 drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M75 35.5C71.5 28.5 64.2 24 56 24C41.6 24 30 35.6 30 50C30 64.4 41.6 76 56 76C66.5 76 75.5 69.8 79.5 61" stroke="#10B981" strokeWidth="10" strokeLinecap="round" />
        <path d="M55 45L76 24M76 24H58M76 24V42" stroke="#10B981" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <h1 className="text-2xl font-black tracking-tighter uppercase italic text-white leading-none">
        CHIF<span className="text-emerald-500">PAM</span>
      </h1>
    </div>
  </div>
);

// --- FORMULAIRE D'INSCRIPTION ---
function SignupForm() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) setReferralCode(ref.toUpperCase());
  }, [searchParams]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    
    const cleanPhone = normalizePhoneInput(phone);
    if (cleanPhone.length < 8) {
      setError("Numéro de téléphone invalide (8 chiffres minimum).");
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setLoading(true);

    try {
      const internalEmail = `${cleanPhone}@chifpam.ht`;
      let referrerId: string | null = null;
      let startBalance = 0;

      if (referralCode.trim().length > 0) {
        const { data: foundId } = await supabase.rpc('get_referrer_id_by_code', { code_input: referralCode.trim() });
        if (foundId) {
          referrerId = foundId;
          startBalance = 10;
        }
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: internalEmail,
        password: password,
        options: {
          data: {
            username: username.trim(),
            referral_code: referralCode.trim().toLowerCase()
          }
        }
      });

      if (authError) throw authError;

      if (authData?.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: authData.user.id,
          phone: cleanPhone,
          username: username.trim(),
          email: internalEmail,
          balance: startBalance,
          referred_by: referrerId
        });

        if (profileError) throw new Error("Erreur lors de la création du profil.");

        setSuccessMsg(`Compte créé avec succès ! ${startBalance > 0 ? 'Bonus de 10 HTG appliqué !' : ''}`);
        
        setTimeout(() => {
          router.push('/connexion');
        }, 1500);
      }

    } catch (err: any) {
      setError(err.message || "Erreur lors de l'inscription. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DSCard className="p-8 rounded-[2.5rem] relative w-full border border-white/10 bg-slate-900/90 backdrop-blur-xl shadow-2xl">
      {/* Onglets de Basculement Rapide */}
      <div className="flex bg-black/40 p-1 rounded-2xl mb-6 border border-white/5">
        <Link href="/connexion" className="flex-1 py-2 text-center text-xs font-bold text-slate-400 hover:text-white transition-all rounded-xl">
          Connexion
        </Link>
        <button type="button" className="flex-1 py-2 text-center text-xs font-bold bg-emerald-500 text-slate-950 rounded-xl shadow-md uppercase italic cursor-default">
          Inscription
        </button>
      </div>

      <div className="text-center mb-6">
        <h2 className="text-2xl font-black italic text-white uppercase tracking-tight">Nouveau Joueur</h2>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Créez votre accès joueur</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-400 text-xs font-bold">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-400 text-xs font-bold">
          <CheckCircle2 size={18} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSignup} className="space-y-4">
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Nom d'utilisateur</label>
          <div className="relative">
            <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <DSInput 
              type="text" 
              required 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              placeholder="Ex: PlayerOne" 
              className="pl-12 py-4 text-sm font-bold"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Numéro Téléphone</label>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <DSInput 
              type="tel" 
              required 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)} 
              placeholder="4000 0000" 
              className="pl-12 py-4 text-sm font-bold"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Mot de passe</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <DSInput 
              type={showPassword ? "text" : "password"} 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="6+ caractères" 
              className="pl-12 pr-12 py-4 text-sm font-bold"
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-black text-emerald-500 uppercase tracking-widest ml-3">Code Parrainage (Optionnel)</label>
          <div className="relative">
            <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={18} />
            <DSInput 
              type="text" 
              value={referralCode} 
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())} 
              placeholder="CODE PROMO" 
              className="pl-12 py-4 text-sm font-bold uppercase border-emerald-500/30 focus:border-emerald-500 text-emerald-400 placeholder:text-emerald-800/50"
            />
          </div>
        </div>

        <div className="pt-2">
          <p className="text-[9px] text-slate-500 text-center mb-4 leading-relaxed">
            En créant un compte, vous acceptez nos <Link href="/legal/conditions" className="text-emerald-500 underline">Conditions d'Utilisation</Link> et certifiez être majeur.
          </p>
          <DSButton 
            type="submit" 
            disabled={loading} 
            className="w-full py-5 font-black uppercase italic tracking-widest flex items-center justify-center gap-3"
          >
            {loading ? <Loader2 className="animate-spin" /> : <><span>S'INSCRIRE MAINTENANT</span><ArrowRight size={18} /></>}
          </DSButton>
        </div>
      </form>
    </DSCard>
  );
}

// --- PAGE PRINCIPALE ---
export default function Inscription() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col font-sans overflow-x-hidden relative">
      {/* Effet Lumineux d'Arrière-Plan */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-emerald-500/10 blur-[120px] pointer-events-none rounded-full" />

      {/* HEADER */}
      <nav className="p-6 md:px-12 flex justify-between items-center w-full max-w-7xl mx-auto z-10">
        <Link href="/">
          <LogoChifPam />
        </Link>
        <Link href="/connexion" className="text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-widest border border-white/10 px-4 py-2 rounded-full backdrop-blur-md">
          Connexion
        </Link>
      </nav>

      <main className="flex-1 flex flex-col md:flex-row items-center justify-center gap-12 p-6 max-w-7xl mx-auto w-full relative z-10">
        {/* BRANDING (Gauche) */}
        <div className="flex-1 text-center md:text-left space-y-8 max-w-lg">
          <div>
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-4">
              <Trophy size={12} /> N°1 Skill Gaming Haïti
            </div>
            <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-none mb-4 text-white">
              Rejoignez <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">L'Élite.</span>
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Sauvegardez vos scores, participez aux classements nationaux et convertissez vos compétences en récompenses réelles.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5 flex flex-col gap-2 backdrop-blur-md">
              <ShieldCheck className="text-emerald-500" size={24}/>
              <div>
                <h3 className="font-bold text-white text-xs uppercase">100% Sécurisé</h3>
                <p className="text-[10px] text-slate-500">Protection des données</p>
              </div>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5 flex flex-col gap-2 backdrop-blur-md">
              <Gamepad2 className="text-cyan-500" size={24}/>
              <div>
                <h3 className="font-bold text-white text-xs uppercase">Jeu d'Adresse</h3>
                <p className="text-[10px] text-slate-500">Basé sur le talent</p>
              </div>
            </div>
          </div>
        </div>

        {/* FORMULAIRE (Droite) */}
        <div className="w-full max-w-md">
          <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-500" size={40} /></div>}>
            <SignupForm />
          </Suspense>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full border-t border-white/5 bg-black/40 backdrop-blur-md p-8 mt-12 z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
          <p>© 2026 Chif Pam. Tous droits réservés.</p>
          <div className="flex gap-6">
            <Link href="/legal/confidentialite" className="hover:text-emerald-500 transition-colors">Politique de Confidentialité</Link>
            <Link href="/legal/conditions" className="hover:text-emerald-500 transition-colors">Conditions d'Utilisation</Link>
            <Link href="/legal/mention-legales" className="hover:text-white transition-colors flex items-center gap-1"><ScrollText size={12}/> Mentions Légales</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
          username: username.trim(),
          email: internalEmail,
          balance: startBalance,
          referred_by: referrerId
        });

        if (profileError) throw new Error("Erreur lors de la création du profil.");

        setSuccessMsg(`Compte créé avec succès ! ${startBalance > 0 ? 'Bonus de 10 HTG appliqué !' : ''}`);
        
        setTimeout(() => {
          router.push('/connexion');
        }, 1500);
      }

    } catch (err: any) {
      setError(err.message || "Erreur lors de l'inscription. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DSCard className="p-8 rounded-[2.5rem] relative w-full border border-white/10 bg-slate-900/90 backdrop-blur-xl shadow-2xl">
      {/* Onglets de Basculement Rapide */}
      <div className="flex bg-black/40 p-1 rounded-2xl mb-6 border border-white/5">
        <Link href="/connexion" className="flex-1 py-2 text-center text-xs font-bold text-slate-400 hover:text-white transition-all rounded-xl">
          Connexion
        </Link>
        <button type="button" className="flex-1 py-2 text-center text-xs font-bold bg-emerald-500 text-slate-950 rounded-xl shadow-md uppercase italic">
          Inscription
        </button>
      </div>

      <div className="text-center mb-6">
        <h2 className="text-2xl font-black italic text-white uppercase tracking-tight">Nouveau Joueur</h2>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Créez votre accès joueur</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-400 text-xs font-bold">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-400 text-xs font-bold">
          <CheckCircle2 size={18} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSignup} className="space-y-4">
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Nom d'utilisateur</label>
          <div className="relative">
            <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <DSInput 
              type="text" 
              required 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              placeholder="Ex: PlayerOne" 
              className="pl-12 py-4 text-sm font-bold"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Numéro Téléphone</label>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <DSInput 
              type="tel" 
              required 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)} 
              placeholder="4000 0000" 
              className="pl-12 py-4 text-sm font-bold"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Mot de passe</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <DSInput 
              type={showPassword ? "text" : "password"} 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="6+ caractères" 
              className="pl-12 pr-12 py-4 text-sm font-bold"
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-black text-emerald-500 uppercase tracking-widest ml-3">Code Parrainage (Optionnel)</label>
          <div className="relative">
            <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={18} />
            <DSInput 
              type="text" 
              value={referralCode} 
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())} 
              placeholder="CODE PROMO" 
              className="pl-12 py-4 text-sm font-bold uppercase border-emerald-500/30 focus:border-emerald-500 text-emerald-400 placeholder:text-emerald-800/50"
            />
          </div>
        </div>

        <div className="pt-2">
          <p className="text-[9px] text-slate-500 text-center mb-4 leading-relaxed">
            En créant un compte, vous acceptez nos <Link href="/legal/conditions" className="text-emerald-500 underline">Conditions d'Utilisation</Link> et certifiez être majeur.
          </p>
          <DSButton 
            type="submit" 
            disabled={loading} 
            className="w-full py-5 font-black uppercase italic tracking-widest flex items-center justify-center gap-3"
          >
            {loading ? <Loader2 className="animate-spin" /> : <><span>S'INSCRIRE MAINTENANT</span><ArrowRight size={18} /></>}
          </DSButton>
        </div>
      </form>
    </DSCard>
  );
}

export default function Inscription() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col font-sans overflow-x-hidden relative">
      {/* Effet Lumineux d'Arrière-Plan */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-emerald-500/10 blur-[120px] pointer-events-none rounded-full" />

      {/* HEADER */}
      <nav className="p-6 md:px-12 flex justify-between items-center w-full max-w-7xl mx-auto z-10">
        <Link href="/">
          <LogoChifPam />
        </Link>
        <Link href="/connexion" className="text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-widest border border-white/10 px-4 py-2 rounded-full backdrop-blur-md">
          Connexion
        </Link>
      </nav>

      <main className="flex-1 flex flex-col md:flex-row items-center justify-center gap-12 p-6 max-w-7xl mx-auto w-full relative z-10">
        {/* BRANDING (Gauche) */}
        <div className="flex-1 text-center md:text-left space-y-8 max-w-lg">
          <div>
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-4">
              <Trophy size={12} /> N°1 Skill Gaming Haïti
            </div>
            <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-none mb-4 text-white">
              Rejoignez <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">L'Élite.</span>
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Sauvegardez vos scores, participez aux classements nationaux et convertissez vos compétences en récompenses réelles.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5 flex flex-col gap-2 backdrop-blur-md">
              <ShieldCheck className="text-emerald-500" size={24}/>
              <div>
                <h3 className="font-bold text-white text-xs uppercase">100% Sécurisé</h3>
                <p className="text-[10px] text-slate-500">Protection des données</p>
              </div>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5 flex flex-col gap-2 backdrop-blur-md">
              <Gamepad2 className="text-cyan-500" size={24}/>
              <div>
                <h3 className="font-bold text-white text-xs uppercase">Jeu d'Adresse</h3>
                <p className="text-[10px] text-slate-500">Basé sur le talent</p>
              </div>
            </div>
          </div>
        </div>

        {/* FORMULAIRE (Droite) */}
        <div className="w-full max-w-md">
          <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-500" size={40} /></div>}>
            <SignupForm />
          </Suspense>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full border-t border-white/5 bg-black/40 backdrop-blur-md p-8 mt-12 z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
          <p>© 2026 Chif Pam. Tous droits réservés.</p>
          <div className="flex gap-6">
            <Link href="/legal/confidentialite" className="hover:text-emerald-500 transition-colors">Politique de Confidentialité</Link>
            <Link href="/legal/conditions" className="hover:text-emerald-500 transition-colors">Conditions d'Utilisation</Link>
            <Link href="/legal/mention-legales" className="hover:text-white transition-colors flex items-center gap-1"><ScrollText size={12}/> Mentions Légales</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/80 border border-white/10 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl relative w-full max-w-md mx-auto">
      {error && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-500 text-[10px] font-black uppercase">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <div className="text-center mb-8">
        <h2 className="text-2xl font-black italic text-white uppercase tracking-tight">Nouvel Agent</h2>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Rejoignez l'arène</p>
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-3">Pseudo Agent</label>
          <div className="relative">
            <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Votre Nom de code" className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm outline-none focus:border-emerald-500/50 transition-all font-bold text-white placeholder:text-slate-700"/>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-3">Téléphone</label>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ex: 4000 0000" className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm outline-none focus:border-emerald-500/50 transition-all font-bold text-white placeholder:text-slate-700"/>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-3">Sécurité</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe secret" className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm outline-none focus:border-emerald-500/50 transition-all font-bold text-white placeholder:text-slate-700"/>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest ml-3">Parrainage (Optionnel)</label>
          <div className="relative">
            <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600" size={18} />
            <input type="text" value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())} placeholder="CODE DU PARRAIN" className="w-full bg-emerald-900/10 border border-emerald-500/20 rounded-2xl py-4 pl-12 pr-6 text-sm outline-none focus:border-emerald-500 transition-all font-bold uppercase text-emerald-500 placeholder:text-emerald-800/50"/>
          </div>
        </div>

        <div className="pt-2">
            <p className="text-[8px] text-slate-500 text-center mb-4 leading-relaxed px-4">
                En créant un compte, vous acceptez nos <Link href="/legal/conditions" className="text-emerald-500 underline">Conditions d'Utilisation</Link> et certifiez avoir plus de 18 ans.
            </p>
            <button type="submit" disabled={loading} className="w-full bg-emerald-500 text-slate-950 py-5 rounded-2xl font-black uppercase italic tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 shadow-[0_10px_30px_rgba(16,185,129,0.3)] hover:bg-emerald-400">
            {loading ? <Loader2 className="animate-spin" /> : <><span className="text-black">VALIDER L'INSCRIPTION</span><ArrowRight size={20} className="text-black"/></>}
            </button>
        </div>
      </form>

      <div className="mt-6 text-center">
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider">
          Déjà un compte ? <Link href="/connexion" className="text-white hover:text-emerald-400 transition-colors ml-1 underline underline-offset-4">Connexion</Link>
        </p>
      </div>
    </div>
  );
}

// --- PAGE PRINCIPALE (Layout Pro pour Google) ---
export default function Inscription() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col font-sans overflow-x-hidden">
      
      {/* HEADER SIMPLE */}
      <nav className="p-6 md:px-12 flex justify-between items-center w-full max-w-7xl mx-auto">
        <Link href="/">
            <LogoChifPam />
        </Link>
        <Link href="/connexion" className="text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-widest border border-white/10 px-4 py-2 rounded-full">
            Connexion
        </Link>
      </nav>

      <main className="flex-1 flex flex-col md:flex-row items-center justify-center gap-12 p-6 max-w-7xl mx-auto w-full relative z-10">
        
        {/* PARTIE GAUCHE : Branding & Confiance (Pour Google) */}
        <div className="flex-1 text-center md:text-left space-y-8 max-w-lg">
            <div>
                <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full text-emerald-500 text-[10px] font-black uppercase tracking-widest mb-4">
                    <Trophy size={12} /> N°1 Skill Gaming Haïti
                </div>
                <h1 className="text-5xl md:text-6xl font-black italic uppercase tracking-tighter leading-none mb-4 text-white">
                    Rejoignez <br/>
                    <span className="text-transparent bg-clip-text bg-linear-to-r from-emerald-400 to-cyan-500">L'Élite.</span>
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

        {/* PARTIE DROITE : Formulaire */}
        <div className="w-full max-w-md">
            <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-500" size={40} /></div>}>
                <SignupForm />
            </Suspense>
        </div>

      </main>

      {/* FOOTER LEGAL (Indispensable pour Google) */}
      <footer className="w-full border-t border-white/5 bg-black/20 p-8 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-slate-600 font-bold uppercase tracking-widest">
            <p>© 2026 Chif Pam. Tous droits réservés.</p>
            <div className="flex gap-6">
                <Link href="/legal/confidentialite" className="hover:text-emerald-500 transition-colors">Politique de Confidentialité</Link>
                <Link href="/legal/conditions" className="hover:text-emerald-500 transition-colors">Conditions d'Utilisation</Link>
                <Link href="/legal/mention-legales" className="hover:text-white transition-colors flex items-center gap-1"><ScrollText size={12}/> Mentions Légales</Link>
            </div>
        </div>
      </footer>

    </div>
  );
                  }
