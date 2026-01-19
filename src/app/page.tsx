"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  UserCircle, Phone, Lock, ArrowRight, 
  Loader2, AlertCircle, Users 
} from 'lucide-react';
import Link from 'next/link';

// --- TON LOGO OFFICIEL ---
const LogoChifPam = ({ className }: { className?: string }) => (
  <div className={`relative flex flex-col items-center ${className}`}>
    <svg viewBox="0 0 100 100" className="w-20 h-20 drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M75 35.5C71.5 28.5 64.2 24 56 24C41.6 24 30 35.6 30 50C30 64.4 41.6 76 56 76C66.5 76 75.5 69.8 79.5 61" stroke="#10B981" strokeWidth="8" strokeLinecap="round" />
      <path d="M55 45L76 24M76 24H58M76 24V42" stroke="#10B981" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <h1 className="mt-2 text-3xl font-black tracking-tighter uppercase italic text-white">
      CHIF-<span className="text-emerald-500">PAM</span>
    </h1>
  </div>
);

export default function Inscription() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

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

      // ---------------------------------------------------------
      // 1. VÉRIFICATION DU CODE PARRAIN (Via Fonction RPC Sécurisée)
      // ---------------------------------------------------------
      if (referralCode.trim().length > 0) {
        // On appelle la fonction SQL qu'on a créée pour contourner la sécurité RLS
        const { data: foundId, error: rpcError } = await supabase
          .rpc('get_referrer_id_by_code', { code_input: referralCode.trim() });
        
        if (foundId) {
          referrerId = foundId;
          startBalance = 10; // ✅ Bonus de 10 HTG activé
          console.log("Parrain trouvé :", foundId);
        } else {
          console.log("Code invalide ou introuvable");
        }
      }

      // ---------------------------------------------------------
      // 2. CRÉATION DU COMPTE AUTH
      // ---------------------------------------------------------
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

      // ---------------------------------------------------------
      // 3. CRÉATION DU PROFIL AVEC LE LIEN PARRAIN
      // ---------------------------------------------------------
      if (authData?.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: authData.user.id,
          phone: cleanPhone,
          username: username.trim(),
          email: internalEmail,
          balance: startBalance, // 0 ou 10 selon le code
          referred_by: referrerId // ✅ L'ID du parrain est inséré ici
        });

        if (profileError) {
             console.error("Erreur profil:", profileError);
             // On ne bloque pas tout si le profil plante, mais c'est critique
             throw new Error("Erreur lors de la création du profil.");
        }

        alert(`Bienvenue ! ${startBalance > 0 ? 'Vous avez reçu 10 HTG de bienvenue ! 🎁' : ''}`);
        router.push('/connexion');
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#020617] text-slate-100 flex flex-col items-center justify-center p-6 font-sans overflow-hidden">
      {/* EFFET LUMINEUX D'ARRIÈRE-PLAN */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-64 bg-emerald-500/10 blur-[120px] pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <LogoChifPam />
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mt-4 opacity-70">Création de compte</p>
        </div>

        <div className="bg-slate-900/60 border border-white/10 backdrop-blur-2xl p-8 rounded-[3rem] shadow-2xl relative overflow-hidden">
          {error && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-500 text-[10px] font-black uppercase">
              <AlertCircle size={18} /> {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            {/* INPUT PSEUDO */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Pseudo</label>
              <div className="relative">
                <UserCircle className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                <input 
                  type="text" 
                  required 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  placeholder="Ton pseudo unique" 
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-sm outline-none focus:border-emerald-500/50 transition-all font-bold placeholder:text-slate-700 text-white"
                />
              </div>
            </div>

            {/* INPUT TÉLÉPHONE */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Téléphone</label>
              <div className="relative">
                <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                <input 
                  type="tel" 
                  required 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  placeholder="4000 0000" 
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-sm outline-none focus:border-emerald-500/50 transition-all font-bold placeholder:text-slate-700 text-white"
                />
              </div>
            </div>

            {/* INPUT MOT DE PASSE */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                <input 
                  type="password" 
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="••••••••" 
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-sm outline-none focus:border-emerald-500/50 transition-all font-bold placeholder:text-slate-700 text-white"
                />
              </div>
            </div>

            {/* INPUT CODE PARRAIN */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-4">Code Parrain (Optionnel)</label>
              <div className="relative">
                <Users className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-500" size={18} />
                <input 
                  type="text" 
                  value={referralCode} 
                  onChange={(e) => setReferralCode(e.target.value)} 
                  placeholder="CODE AMI" 
                  className="w-full bg-slate-950 border border-emerald-500/20 rounded-2xl py-4 pl-14 pr-6 text-sm outline-none focus:border-emerald-500 transition-all font-bold placeholder:text-slate-700 uppercase text-emerald-500"
                />
              </div>
              <p className="text-[8px] text-emerald-500/70 ml-4 italic">Bonus de 10 HTG si valide</p>
            </div>

            {/* BOUTON VALIDER */}
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-emerald-500 text-slate-950 py-5 rounded-2xl font-black uppercase italic tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 mt-4 shadow-[0_10px_20px_rgba(16,185,129,0.2)]"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <span>S'INSCRIRE</span>
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center pt-6 border-t border-slate-800/50">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider">
              Déjà membre ? <Link href="/connexion" className="text-emerald-500 hover:text-emerald-400 transition-colors ml-1 underline underline-offset-4">Se connecter</Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

