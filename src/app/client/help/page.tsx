"use client";

import React from 'react';
import { 
  ArrowLeft, BookOpen, Coins, ShieldCheck, 
  ChevronRight, Info, MessageCircle, Zap,
  Layers, Disc, Target, Brain, Fingerprint
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// CONSERVATION DU LOGO OFFICIEL SVG
const LogoElite = ({ className = "w-8 h-8" }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M75 35.5C71.5 28.5 64.2 24 56 24C41.6 24 30 35.6 30 50C30 64.4 41.6 76 56 76C66.5 76 75.5 69.8 79.5 61" stroke="#10B981" strokeWidth="10" strokeLinecap="round" />
    <path d="M55 45L76 24M76 24H58M76 24V42" stroke="#10B981" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function HelpPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#020617] text-white font-black italic uppercase pb-20">
      
      {/* HEADER AVEC REDIRECTION HOME */}
      <div className="p-6 flex items-center gap-4 sticky top-0 bg-[#020617]/90 backdrop-blur-xl z-30 border-b border-white/5">
        <button 
          onClick={() => router.push('/client/home')} 
          className="p-3 bg-slate-900 rounded-2xl border border-white/10 text-emerald-500 active:scale-90 transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <LogoElite className="w-6 h-6" />
          <h1 className="text-xl tracking-tighter">Guide <span className="text-emerald-500">Elite</span></h1>
        </div>
      </div>

      <div className="p-6 space-y-10">
        
        {/* SECTION NOUVEAUX JEUX */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/10 rounded-lg border border-rose-500/20">
              <Zap className="text-rose-500" size={20} />
            </div>
            <h2 className="text-sm tracking-widest">Règles des Jeux</h2>
          </div>

          <div className="grid gap-3">
            <GameCard 
              icon={<Zap size={14} className="text-amber-500" />} 
              name="Croissance (Crash)" 
              desc="Encaissez avant que la courbe ne s'arrête. Plus vous attendez, plus le multiplicateur monte."
            />
            <GameCard 
              icon={<Layers size={14} className="text-rose-500" />} 
              name="Squid Glass" 
              desc="Choisissez la bonne vitre pour traverser le pont. Chaque saut réussi augmente vos gains."
            />
            <GameCard 
              icon={<Disc size={14} className="text-indigo-400" />} 
              name="Plinko" 
              desc="Lâchez la bille et espérez qu'elle tombe dans les multiplicateurs extérieurs pour le jackpot."
            />
             <GameCard 
              icon={<Target size={14} className="text-emerald-500" />} 
              name="Mines" 
              desc="Découvrez les diamants sans toucher les mines. Vous pouvez cashout à tout moment."
            />
          </div>
        </div>

        {/* SECTION 1 : FONCTIONNEMENT */}
        <HelpSection icon={<BookOpen className="text-emerald-500" />} title="Comment Miser ?">
          <div className="space-y-4 text-[11px] lowercase not-italic text-slate-400 leading-relaxed">
            <p className="border-l-2 border-emerald-500 pl-4 uppercase font-bold text-white tracking-widest italic">Processus de jeu :</p>
            <ul className="space-y-3">
              <li className="flex gap-3"><ChevronRight size={14} className="shrink-0 text-emerald-500" /> Sélectionnez un jeu dans le menu "Jouer".</li>
              <li className="flex gap-3"><ChevronRight size={14} className="shrink-0 text-emerald-500" /> Définissez votre mise de départ (minimum 10 HTG).</li>
              <li className="flex gap-3"><ChevronRight size={14} className="shrink-0 text-emerald-500" /> Utilisez le bouton "Encaisser" (Cashout) pour sécuriser vos profits avant de perdre.</li>
            </ul>
          </div>
        </HelpSection>

        {/* SECTION 2 : FINANCES */}
        <HelpSection icon={<Coins className="text-emerald-500" />} title="Dépôts & Retraits">
          <div className="space-y-4">
            <div className="bg-slate-950 p-4 rounded-2xl border border-white/5">
              <p className="text-[10px] text-emerald-500 mb-2 tracking-widest">💸 Dépôts Rapides :</p>
              <p className="text-[11px] lowercase not-italic text-slate-400">Via MonCash ou NatCash. Envoyez le montant exact, puis téléchargez votre preuve. Validation automatique ou manuelle en moins de 15 minutes.</p>
            </div>
            <div className="bg-slate-950 p-4 rounded-2xl border border-white/5">
              <p className="text-[10px] text-emerald-500 mb-2 tracking-widest">💰 Retraits Garantis :</p>
              <p className="text-[11px] lowercase not-italic text-slate-400">Les demandes de retraits sont traitées 7j/7. Le montant arrive directement sur votre compte mobile money.</p>
            </div>
          </div>
        </HelpSection>

        {/* SECTION 3 : SÉCURITÉ */}
        <HelpSection icon={<ShieldCheck className="text-emerald-500" />} title="Sécurité & Fraude">
          <div className="bg-rose-500/5 p-5 rounded-4xl border border-rose-500/10 space-y-3">
            <div className="flex items-center gap-2 text-rose-500">
              <Info size={16} />
              <span className="text-[10px] tracking-widest uppercase">Tolérance Zéro :</span>
            </div>
            <ul className="text-[10px] space-y-2 text-slate-500 lowercase not-italic font-bold">
              <li>• La modification de captures d'écran est strictement interdite (Bannissement IP).</li>
              <li>• L'utilisation de robots ou de scripts de mise entraîne le gel immédiat des fonds.</li>
              <li>• Un seul compte est autorisé par numéro de téléphone.</li>
            </ul>
          </div>
        </HelpSection>

        {/* SECTION 4 : SUPPORT DIRECT */}
        <div className="bg-emerald-500 p-8 rounded-[3rem] text-slate-950 flex flex-col items-center text-center space-y-4 shadow-xl shadow-emerald-500/20">
          <MessageCircle size={40} strokeWidth={2.5} />
          <h2 className="text-lg leading-tight">Besoin d'aide en temps réel ?</h2>
          <p className="text-[10px] lowercase not-italic font-bold">Nos modérateurs sont en ligne pour résoudre vos problèmes techniques.</p>
          <Link href="/client/chat" className="bg-slate-950 text-white px-10 py-4 rounded-2xl text-[10px] tracking-[0.2em] hover:scale-105 transition-transform active:scale-95">
            Ouvrir le chat
          </Link>
        </div>

      </div>

      {/* FOOTER LOGO */}
      <div className="flex flex-col items-center justify-center opacity-20 py-10 grayscale">
        <LogoElite className="w-12 h-12 mb-2" />
        <p className="text-[8px] tracking-[1em]">Chif-Pam Elite v1.0</p>
      </div>
    </div>
  );
}

// Composant pour les cartes de jeux
function GameCard({ icon, name, desc }: { icon: React.ReactNode, name: string, desc: string }) {
  return (
    <div className="bg-slate-900/40 p-4 rounded-2xl border border-white/5 flex gap-4 items-start">
      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/5">
        {icon}
      </div>
      <div className="space-y-1">
        <h3 className="text-[11px] text-white tracking-tighter">{name}</h3>
        <p className="text-[9px] text-slate-500 not-italic lowercase leading-tight">{desc}</p>
      </div>
    </div>
  );
}

// Composant interne pour les sections
function HelpSection({ icon, title, children }: { icon: React.ReactNode, title: string, children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 px-2">
        <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
          {icon}
        </div>
        <h2 className="text-sm tracking-widest uppercase">{title}</h2>
      </div>
      <div className="bg-slate-900/50 p-6 rounded-[2.5rem] border border-white/5 shadow-inner">
        {children}
      </div>
    </div>
  );
}