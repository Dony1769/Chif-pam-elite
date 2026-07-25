"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getHomeRouteForRole } from '@/lib/auth-routing';
import { normalizePhoneInput } from '@/lib/phone';
import { 
  Loader2, ArrowRight, HelpCircle, ShieldCheck, 
  Trophy, Lock, ScrollText, Sparkles, Phone, Eye, EyeOff, AlertCircle 
} from 'lucide-react';
import Link from 'next/link';
import { DSButton, DSCard, DSInput } from '@/components/ui/primitives';
import { LogoChifPam } from '../inscription/page';

export default function Connexion() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSupportRequest = async (reason: string) => {
    const cleanPhone = normalizePhoneInput(phone);
    if (!cleanPhone) {
      setErrorMessage("Veuillez entrer votre numéro de téléphone pour contacter le support.");
      return;
    }

    setLoading(true);
    let clientName = "Non identifié";

    try {
      const { data } = await supabase.rpc('get_username_by_phone', { phone_input: cleanPhone });

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
    setErrorMessage('');
    setLoading(true);
    
    const cleanPhone = normalizePhoneInput(phone);
    const email = `${cleanPhone}@chifpam.ht`;

    try {
      const authResult = await supabase.auth.signInWithPassword({ email, password });
      if (authResult.error) throw authResult.error;

      const user = authResult.data?.user;
      const session = authResult.data?.session;
      if (!user || !session) {
        throw new Error("Impossible d'établir la session.");
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_banned, ban_reason')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.is_banned) {
        await supabase.auth.signOut();
        setLoading(false);
        setErrorMessage(`Compte suspendu : ${profile.ban_reason || "Violation des règles."}`);
        return;
      }

      const { data: roleProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const targetPath = getHomeRouteForRole(roleProfile?.role);
      window.location.replace(targetPath);
    } catch (err: any) {
      setErrorMessage("Identifiants incorrects ou problème de réseau.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col font-sans overflow-x-hidden relative">
      {/* Effet Lumineux d'Arrière-Plan */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-emerald-500/10 blur-[120px] pointer-events-none rounded-full" />

      {/* HEADER */}
      <nav className="p-6 md:px-12 flex justify-between items-center w-full max-w-7xl mx-auto z-10">
        <Link href="/">
          <LogoChifPam />
        </Link>
        <Link href="/inscription" className="text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-widest border border-white/10 px-4 py-2 rounded-full backdrop-blur-md">
          Créer un compte
        </Link>
      </nav>

      <main className="flex-1 flex flex-col md:flex-row items-center justify-center gap-12 p-6 max-w-7xl mx-auto w-full relative z-10">
        
        {/* BRANDING (Visible aussi sur mobile de façon condensée) */}
        <div className="flex-1 text-center md:text-left space-y-6 max-w-lg">
          <div>
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-4">
              <Trophy size={12} /> Espace Joueur
            </div>
            <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-none mb-4 text-white">
              Bon <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">Retour.</span>
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed hidden sm:block">
              Connectez-vous pour accéder à votre tableau de bord, suivre vos performances et gérer vos récompenses.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 hidden sm:grid">
            <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5 flex flex-col gap-2 backdrop-blur-md">
              <ShieldCheck className="text-emerald-500" size={24}/>
              <div>
                <h3 className="font-bold text-white text-xs uppercase">Connexion Sûre</h3>
                <p className="text-[10px] text-slate-500">Chiffrement SSL</p>
              </div>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5 flex flex-col gap-2 backdrop-blur-md">
              <Sparkles className="text-cyan-500" size={24}/>
              <div>
                <h3 className="font-bold text-white text-xs uppercase">Temps Réel</h3>
                <p className="text-[10px] text-slate-500">Synchronisation cloud</p>
              </div>
            </div>
          </div>
        </div>

        {/* FORMULAIRE DE CONNEXION */}
        <DSCard className="w-full max-w-md p-8 rounded-[2.5rem] relative border border-white/10 bg-slate-900/90 backdrop-blur-xl shadow-2xl">
          {/* Onglets de Basculement Rapide */}
          <div className="flex bg-black/40 p-1 rounded-2xl mb-6 border border-white/5">
            <button type="button" className="flex-1 py-2 text-center text-xs font-bold bg-emerald-500 text-slate-950 rounded-xl shadow-md uppercase italic">
              Connexion
            </button>
            <Link href="/inscription" className="flex-1 py-2 text-center text-xs font-bold text-slate-400 hover:text-white transition-all rounded-xl">
              Inscription
            </Link>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-black italic text-white uppercase tracking-tight">Identifiez-vous</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Accès Sécurisé</p>
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-400 text-xs font-bold">
              <AlertCircle size={18} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Votre Téléphone</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <DSInput 
                  type="tel" 
                  placeholder="4000 0000" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  required 
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
                  placeholder="••••••••" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
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

            <DSButton 
              type="submit" 
              disabled={loading} 
              className="w-full py-5 mt-6 font-black uppercase tracking-widest italic flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : <><span>SE CONNECTER</span><ArrowRight size={18} /></>}
            </DSButton>
          </form>

          <button 
            type="button"
            onClick={() => handleSupportRequest('pass')} 
            className="mt-6 flex items-center justify-center gap-2 mx-auto text-[10px] text-slate-400 hover:text-emerald-400 font-bold tracking-widest transition-colors uppercase"
            disabled={loading}
          >
            <HelpCircle size={14} /><span>Mot de passe oublié ?</span>
          </button>
        </DSCard>

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
          handleSupportRequest('banni');
        }
        return;
      }

      const { data: roleProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const targetPath = getHomeRouteForRole(roleProfile?.role);
      window.location.replace(targetPath);
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
