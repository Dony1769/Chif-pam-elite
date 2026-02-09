"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  UserCircle, Phone, Lock, ArrowRight, 
  Loader2, AlertCircle, Users, Trophy, 
  ShieldCheck, Gamepad2, ScrollText 
} from 'lucide-react';
import Link from 'next/link';

// --- COMPOSANT LOGO ---
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

// --- FORMULAIRE D'INSCRIPTION ---
function SignupForm() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) setReferralCode(ref.toUpperCase());
  }, [searchParams]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const cleanPhone = phone.trim().replace(/\s/g, '');
    if (cleanPhone.length < 8) return setError("Numéro trop court");
    if (password.length < 6) return setError("Mot de passe : 6 caractères min.");

    setLoading(true);

    try {
      const internalEmail = `${cleanPhone}@chifpam.ht`;
      let referrerId = null;
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

        if (profileError) throw new Error("Erreur création profil.");

        alert(`Bienvenue ! ${startBalance > 0 ? 'Vous avez reçu 10 HTG de bienvenue !' : ''}`);
        router.push('/connexion');
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
                <Link href="#" className="hover:text-white transition-colors flex items-center gap-1"><ScrollText size={12}/> Mentions Légales</Link>
            </div>
        </div>
      </footer>

    </div>
  );
}
