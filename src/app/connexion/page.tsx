"use client";

import React, { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getHomeRouteForRole } from '@/lib/auth-routing';
import { normalizePhoneNumber } from '@/lib/phone';
import { useSearchParams } from 'next/navigation';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
  Loader2, ArrowRight, ShieldCheck, ShieldAlert,
  Trophy, Lock, ScrollText, Phone, Eye, EyeOff, AlertCircle, CheckCircle2,
  KeyRound, Gift, Zap, Wallet, Star, Crown, Flame
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

// ─── DONNÉES AGENTS / AVATARS ────────────────────────────────────────────────
const AGENTS = [
  {
    id: 1,
    initials: 'MJ',
    name: 'Makenson J.',
    gain: '42 500 HTG',
    badge: 'Légende',
    rank: 1,
    color: 'from-amber-400 to-orange-500',
    ring: 'ring-amber-400/60',
    icon: Crown,
    wins: 148,
    streak: 12,
  },
  {
    id: 2,
    initials: 'RD',
    name: 'Roseline D.',
    gain: '31 200 HTG',
    badge: 'Elite',
    rank: 2,
    color: 'from-slate-400 to-slate-600',
    ring: 'ring-slate-400/60',
    icon: Star,
    wins: 112,
    streak: 7,
  },
  {
    id: 3,
    initials: 'KP',
    name: 'Kenly P.',
    gain: '27 800 HTG',
    badge: 'Expert',
    rank: 3,
    color: 'from-amber-700 to-yellow-900',
    ring: 'ring-amber-700/60',
    icon: Flame,
    wins: 89,
    streak: 5,
  },
  {
    id: 4,
    initials: 'SL',
    name: 'Sandra L.',
    gain: '19 400 HTG',
    badge: 'Pro',
    rank: 4,
    color: 'from-emerald-400 to-cyan-600',
    ring: 'ring-emerald-400/60',
    icon: Zap,
    wins: 67,
    streak: 3,
  },
  {
    id: 5,
    initials: 'WB',
    name: 'Wilbert B.',
    gain: '14 900 HTG',
    badge: 'Confirmé',
    rank: 5,
    color: 'from-violet-400 to-purple-600',
    ring: 'ring-violet-400/60',
    icon: Trophy,
    wins: 54,
    streak: 2,
  },
];

const WELCOME_BACK_UPDATES = [
  { icon: Trophy, label: 'Classement hebdomadaire', detail: 'Actualisé il y a 2 heures', color: 'text-amber-400' },
  { icon: Gift, label: 'Cagnotte du jour', detail: '18 500 HTG à réclamer', color: 'text-emerald-400' },
  { icon: Zap, label: 'Défi flash', detail: 'Se termine dans 3h12', color: 'text-cyan-400' },
];

const TRUST_STRIP = [
  { icon: ShieldCheck, label: 'Chiffrement SSL' },
  { icon: Wallet, label: 'Retraits rapides' },
  { icon: Phone, label: 'Support en direct' },
];

// ─── COMPOSANT AVATAR CARD ────────────────────────────────────────────────────
function AgentAvatarCard({ agent, index }: { agent: typeof AGENTS[0]; index: number }) {
  const Icon = agent.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.9 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay: index * 0.12, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -8, scale: 1.03 }}
      className="relative group cursor-default"
    >
      <div className="relative bg-slate-900/80 border border-white/8 rounded-3xl p-5 backdrop-blur-sm overflow-hidden">
        {/* Glow de fond */}
        <div className={`absolute inset-0 bg-gradient-to-br ${agent.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />

        {/* Rank badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/40 rounded-full px-2 py-0.5">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">#{agent.rank}</span>
        </div>

        {/* Avatar */}
        <div className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${agent.color} flex items-center justify-center mb-4 ring-2 ${agent.ring} shadow-lg`}>
          <span className="text-white font-black text-lg tracking-tight">{agent.initials}</span>
          {/* Icône badge flottant */}
          <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-lg bg-slate-900 border border-white/10 flex items-center justify-center">
            <Icon size={12} className="text-amber-400" />
          </div>
        </div>

        {/* Infos */}
        <p className="text-white font-bold text-sm leading-tight truncate">{agent.name}</p>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mt-0.5">{agent.badge}</p>

        {/* Stats */}
        <div className="mt-4 flex items-center justify-between pt-3 border-t border-white/5">
          <div>
            <p className="text-[9px] text-slate-600 uppercase font-bold tracking-widest">Gains</p>
            <p className="text-emerald-400 font-black text-xs mt-0.5">{agent.gain}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-slate-600 uppercase font-bold tracking-widest">Série</p>
            <p className="text-amber-400 font-black text-xs mt-0.5">{agent.streak}🔥</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── SECTION LEADERBOARD SCROLL ───────────────────────────────────────────────
function AgentLeaderboardSection() {
  return (
    <section className="relative py-24 px-6 overflow-hidden">
      {/* Background décoratif */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-950/20 to-transparent pointer-events-none" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto">
        {/* Header section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-amber-400/10 border border-amber-400/20 px-4 py-2 rounded-full mb-6">
            <Trophy size={14} className="text-amber-400" />
            <span className="text-amber-300 text-[11px] font-black uppercase tracking-widest">Hall of Fame</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tight text-white mb-4">
            Les Meilleurs <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">Agents</span>
          </h2>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Rejoignez l'élite et grimpez dans le classement. Chaque partie est une chance de briller.
          </p>
        </motion.div>

        {/* Grid avatars */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {AGENTS.map((agent, i) => (
            <AgentAvatarCard key={agent.id} agent={agent} index={i} />
          ))}
        </div>

        {/* CTA bas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="text-center mt-12"
        >
          <p className="text-slate-600 text-xs font-bold uppercase tracking-widest">
            Connectez-vous pour voir votre position dans le classement
          </p>
        </motion.div>
      </div>
    </section>
  );
}

// ─── ANNEAU SÉCURITÉ ──────────────────────────────────────────────────────────
function SecurityRing() {
  return (
    <div className="relative h-14 w-14 shrink-0">
      <svg viewBox="0 0 64 64" className="h-14 w-14 -rotate-90">
        <circle cx="32" cy="32" r="27" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
        <circle
          cx="32" cy="32" r="27" fill="none"
          stroke="url(#ring-gradient)" strokeWidth="3" strokeLinecap="round"
          strokeDasharray="170"
          className="security-ring-arc"
        />
        <defs>
          <linearGradient id="ring-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f2c675" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <KeyRound size={18} className="text-amber-300" />
      </div>
    </div>
  );
}

// ─── FLOATING PARTICLES ───────────────────────────────────────────────────────
function FloatingParticles() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 8 + 6,
    delay: Math.random() * 4,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-emerald-400/20"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
          animate={{
            y: [0, -30, 0],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// ─── SCROLL PROGRESS BAR ──────────────────────────────────────────────────────
function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-amber-400 origin-left z-50"
      style={{ scaleX }}
    />
  );
}

// ─── HERO SECTION ─────────────────────────────────────────────────────────────
function HeroContent() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <motion.div
      ref={ref}
      style={{ y, opacity }}
      className="flex-1 text-center md:text-left space-y-8 max-w-lg hidden md:block"
    >
      <div>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 bg-amber-400/10 border border-amber-400/20 px-3 py-1.5 rounded-full text-amber-300 text-[10px] font-black uppercase tracking-widest mb-4"
        >
          <ShieldCheck size={12} /> Accès agent
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="text-5xl md:text-6xl font-black italic uppercase tracking-tighter leading-none mb-4 text-white"
        >
          Bon <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">Retour.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-slate-400 text-sm leading-relaxed"
        >
          Reconnectez-vous à votre espace pour reprendre vos parties, suivre vos gains et vos récompenses en cours.
        </motion.p>
      </div>

      {/* Feed updates */}
      <div className="space-y-2">
        {WELCOME_BACK_UPDATES.map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              className="flex items-center gap-4 bg-slate-900/50 border border-white/5 rounded-2xl px-4 py-3 group hover:border-white/10 transition-colors"
            >
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                <Icon size={16} className={item.color} />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white">{item.label}</p>
                <p className="text-[10px] text-slate-500">{item.detail}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Trust strip */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="flex items-center justify-between bg-slate-900/50 border border-white/5 rounded-2xl px-5 py-4"
      >
        {TRUST_STRIP.map((item, i) => {
          const Icon = item.icon;
          return (
            <React.Fragment key={item.label}>
              {i > 0 && <span className="h-6 w-px bg-white/10" />}
              <div className="flex items-center gap-2">
                <Icon size={16} className="text-emerald-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</span>
              </div>
            </React.Fragment>
          );
        })}
      </motion.div>
    </motion.div>
  );
}

// ─── FORMULAIRE LOGIN ─────────────────────────────────────────────────────────
function LoginFormContent() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [focused, setFocused] = useState<'phone' | 'password' | null>(null);

  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('signup') === 'success') {
      setSuccessMessage("Inscription réussie ! Vous pouvez maintenant vous connecter.");
    }
    const authError = searchParams.get('auth_error');
    if (authError) setErrorMessage(authError);
  }, [searchParams]);

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
      const messageText = `Bonjour Support CHIF-PAM,\n\nJ'ai un problème : ${intent}\n📞 Numéro : +509 ${phone}\n\nMerci de m'aider à accéder à mon compte.`;
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${ADMIN_PHONE}&text=${encodeURIComponent(messageText)}`;
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
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
        throw new Error(resolved.message || 'Numéro ou mot de passe incorrect.');
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: resolved.email,
        password
      });

      if (authError) throw authError;
      const user = authData?.user;
      if (!user) throw new Error("Erreur de session.");

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_banned, ban_reason, role')
        .eq('id', user.id)
        .maybeSingle<ProfileData>();

      if (profileError) {
        await supabase.auth.signOut();
        throw new Error("Impossible de vérifier les autorisations du profil.");
      }

      if (profile?.is_banned) {
        await supabase.auth.signOut();
        setErrorMessage(`🚫 COMPTE SUSPENDU : ${profile.ban_reason || "Violation des conditions d'utilisation."}`);
        return;
      }

      const targetPath = getHomeRouteForRole(profile?.role);
      window.location.replace(targetPath);

    } catch (err: unknown) {
      if (err instanceof Error) {
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
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full max-w-md mx-auto"
    >
      <DSCard className="p-8 rounded-[2.5rem] relative w-full overflow-hidden">
        {/* Glow scan */}
        <div className="scan-glow pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-amber-400/10 via-emerald-400/5 to-transparent" />

        {/* Bordure lumineuse dynamique selon focus */}
        <AnimatePresence>
          {focused && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-0 rounded-[2.5rem] ring-2 ring-emerald-400/20"
            />
          )}
        </AnimatePresence>

        <div className="md:hidden mb-6 flex justify-center">
          <LogoChifPam />
        </div>

        <div className="flex items-center gap-4 mb-8 relative">
          <SecurityRing />
          <div>
            <h2 className="text-2xl font-black italic text-white uppercase tracking-tight leading-none">Bon retour</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Accès agent vérifié</p>
          </div>
        </div>

        <AnimatePresence mode="popLayout">
          {successMessage && (
            <motion.div
              key="success"
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-400 text-xs font-bold relative overflow-hidden"
            >
              <CheckCircle2 size={18} className="shrink-0" />
              <span>{successMessage}</span>
            </motion.div>
          )}

          {errorMessage && (
            <motion.div
              key="error"
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-500 text-xs font-bold relative overflow-hidden"
            >
              <motion.div
                animate={{ rotate: [0, -5, 5, -5, 5, 0] }}
                transition={{ duration: 0.5 }}
              >
                <AlertCircle size={18} className="shrink-0" />
              </motion.div>
              <span>{errorMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleLogin} className="space-y-4 relative">
          {/* Champ Téléphone */}
          <div className="space-y-1">
            <label htmlFor="phone" className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-3">
              Téléphone
            </label>
            <div className={`relative flex items-center rounded-2xl transition-all duration-300 ${focused === 'phone' ? 'ring-2 ring-amber-400/30' : ''}`}>
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
                onFocus={() => setFocused('phone')}
                onBlur={() => setFocused(null)}
                maxLength={8}
                required
                disabled={loading}
                className="pl-24 py-4 font-bold tracking-widest"
              />
              {/* Indicateur progression */}
              {phone.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-0.5"
                >
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 w-1 rounded-full transition-colors duration-200 ${i < phone.length ? 'bg-emerald-400' : 'bg-slate-700'}`}
                    />
                  ))}
                </motion.div>
              )}
            </div>
          </div>

          {/* Champ Mot de passe */}
          <div className="space-y-1">
            <label htmlFor="password" className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-3">
              Mot de passe
            </label>
            <div className={`relative rounded-2xl transition-all duration-300 ${focused === 'password' ? 'ring-2 ring-amber-400/30' : ''}`}>
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 z-10" size={18} />
              <DSInput
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
                required
                disabled={loading}
                className="pl-12 pr-12 py-4 font-bold"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors z-10"
                tabIndex={-1}
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Bouton submit */}
          <DSButton
            type="submit"
            disabled={loading}
            className="w-full py-5 mt-6 uppercase tracking-widest italic flex items-center justify-center gap-2 relative overflow-hidden"
          >
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.span
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Loader2 className="animate-spin" />
                </motion.span>
              ) : (
                <motion.span
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <span>SE CONNECTER</span>
                  <ArrowRight size={18} />
                </motion.span>
              )}
            </AnimatePresence>
          </DSButton>
        </form>

        {/* Actions support */}
        <div className="mt-6 flex items-center justify-center gap-6 relative">
          <button
            type="button"
            onClick={() => handleSupportRequest('pass')}
            className="flex items-center gap-2 text-[10px] text-slate-500 hover:text-emerald-400 uppercase font-bold tracking-widest transition-colors"
            disabled={loading}
          >
            <KeyRound size={13} /><span>Mot de passe oublié</span>
          </button>
          <span className="h-3 w-px bg-white/10" />
          <button
            type="button"
            onClick={() => handleSupportRequest('banni')}
            className="flex items-center gap-2 text-[10px] text-slate-500 hover:text-rose-400 uppercase font-bold tracking-widest transition-colors"
            disabled={loading}
          >
            <ShieldAlert size={13} /><span>Compte banni</span>
          </button>
        </div>

        {/* Lien inscription */}
        <div className="mt-6 text-center border-t border-white/5 pt-4 relative">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
            Pas encore de compte ?{' '}
            <Link href="/inscription" className="text-emerald-400 hover:text-emerald-300 transition-colors ml-1 underline underline-offset-4">
              Inscription
            </Link>
          </p>
        </div>
      </DSCard>

      <style jsx>{`
        .scan-glow {
          animation: scan-fade 1.8s ease-out 1;
        }
        @keyframes scan-fade {
          0% { opacity: 0; transform: translateY(-30%); }
          20% { opacity: 1; }
          100% { opacity: 0; transform: translateY(0%); }
        }
        .security-ring-arc {
          stroke-dashoffset: 170;
          animation: ring-sweep 1.4s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
        }
        @keyframes ring-sweep {
          to { stroke-dashoffset: 40; }
        }
        @media (prefers-reduced-motion: reduce) {
          .scan-glow, .security-ring-arc { animation: none; }
          .security-ring-arc { stroke-dashoffset: 40; }
        }
      `}</style>
    </motion.div>
  );
}

// ─── SECTION STATS SCROLL ─────────────────────────────────────────────────────
function StatsScrollSection() {
  const stats = [
    { value: '12 400+', label: 'Agents actifs', icon: '👥' },
    { value: '2.1M HTG', label: 'Distribués ce mois', icon: '💰' },
    { value: '99.8%', label: 'Disponibilité', icon: '⚡' },
    { value: '< 2min', label: 'Temps de retrait', icon: '🚀' },
  ];

  return (
    <section className="py-20 px-6 border-t border-white/5">
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.6 }}
            className="text-center group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform duration-300">{stat.icon}</div>
            <p className="text-2xl font-black text-white italic">{stat.value}</p>
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ─── PAGE PRINCIPALE ──────────────────────────────────────────────────────────
export default function Connexion() {
  return (
    <div className="ds-page text-slate-100 flex flex-col font-sans overflow-x-hidden min-h-screen bg-[#020617]">
      {/* Barre de progression scroll */}
      <ScrollProgressBar />

      {/* Background Three.js */}
      <ThreeSurface
        variant="auth"
        className="fixed pointer-events-none right-0 top-0 z-0 h-full w-1/2 opacity-40"
      />

      {/* Particules flottantes */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <FloatingParticles />
      </div>

      {/* NAV */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-20 p-6 md:px-12 flex justify-between items-center w-full max-w-7xl mx-auto"
      >
        <Link href="/">
          <LogoChifPam />
        </Link>
        <Link
          href="/inscription"
          className="text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-widest border border-white/10 px-4 py-2 rounded-full hover:border-white/30 hover:bg-white/5"
        >
          Créer un compte
        </Link>
      </motion.nav>

      {/* HERO — Formulaire + texte côté */}
      <main className="relative z-10 flex-1 flex flex-col md:flex-row items-center justify-center gap-12 p-6 max-w-7xl mx-auto w-full min-h-screen">
        <HeroContent />

        <div className="w-full max-w-md">
          <Suspense
            fallback={
              <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-emerald-500" size={40} />
              </div>
            }
          >
            <LoginFormContent />
          </Suspense>
        </div>
      </main>

      {/* SECTION STATS — visible au scroll */}
      <div className="relative z-10">
        <StatsScrollSection />
      </div>

      {/* SECTION LEADERBOARD AVATARS — la pièce maîtresse */}
      <div className="relative z-10">
        <AgentLeaderboardSection />
      </div>

      {/* FOOTER */}
      <footer className="relative z-10 w-full border-t border-white/5 bg-black/20 p-8 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-slate-600 font-bold uppercase tracking-widest">
          <p>© 2026 Chif Pam. Tous droits réservés.</p>
          <div className="flex gap-6">
            <Link href="/legal/confidentialite" className="hover:text-emerald-500 transition-colors">
              Politique de Confidentialité
            </Link>
            <Link href="/legal/conditions" className="hover:text-emerald-500 transition-colors">
              Conditions d'Utilisation
            </Link>
            <Link href="/legal/mention-legales" className="hover:text-white transition-colors flex items-center gap-1">
              <ScrollText size={12} /> Mentions Légales
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
          }
