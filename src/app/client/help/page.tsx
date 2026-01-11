"use client";

import React from 'react';
import { 
  ArrowLeft, BookOpen, Coins, Wallet, 
  ShieldCheck, HelpCircle, ChevronRight,
  Info, MessageCircle
} from 'lucide-react';
import Link from 'next/link';

// Composant Logo SVG intégré pour la cohérence visuelle
const LogoElite = ({ className = "w-8 h-8" }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M75 35.5C71.5 28.5 64.2 24 56 24C41.6 24 30 35.6 30 50C30 64.4 41.6 76 56 76C66.5 76 75.5 69.8 79.5 61" stroke="#10B981" strokeWidth="10" strokeLinecap="round" />
    <path d="M55 45L76 24M76 24H58M76 24V42" stroke="#10B981" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-white font-black italic uppercase pb-20">
      
      {/* HEADER STATIQUE */}
      <div className="p-6 flex items-center gap-4 sticky top-0 bg-[#020617]/90 backdrop-blur-xl z-30 border-b border-white/5">
        <Link href="/client/profile" className="p-2 bg-slate-900 rounded-full border border-white/10 text-emerald-500">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex items-center gap-2">
          <LogoElite className="w-6 h-6" />
          <h1 className="text-xl tracking-tighter">Centre d'<span className="text-emerald-500">Aide</span></h1>
        </div>
      </div>

      <div className="p-6 space-y-8">
        
        {/* SECTION 1 : LES MISES */}
        <HelpSection icon={<BookOpen className="text-emerald-500" />} title="Comment Miser ?">
          <div className="space-y-4 text-[11px] lowercase not-italic text-slate-400 leading-relaxed">
            <p className="border-l-2 border-emerald-500 pl-4 uppercase font-bold text-white tracking-widest italic">Processus de jeu :</p>
            <ul className="space-y-3">
              <li className="flex gap-3"><ChevronRight size={14} className="shrink-0 text-emerald-500" /> Choisissez votre loterie préférée dans l'onglet "Jouer".</li>
              <li className="flex gap-3"><ChevronRight size={14} className="shrink-0 text-emerald-500" /> Entrez vos numéros et le montant de votre mise.</li>
              <li className="flex gap-3"><ChevronRight size={14} className="shrink-0 text-emerald-500" /> Les mises sont débitées instantanément de votre solde.</li>
              <li className="flex gap-3"><ChevronRight size={14} className="shrink-0 text-emerald-500" /> En cas de gain, votre solde est crédité dès la validation du tirage par l'administration.</li>
            </ul>
          </div>
        </HelpSection>

        {/* SECTION 2 : FINANCES */}
        <HelpSection icon={<Coins className="text-emerald-500" />} title="Dépôts & Retraits">
          <div className="space-y-6">
            <div className="bg-slate-950 p-4 rounded-2xl border border-white/5">
              <p className="text-[10px] text-emerald-500 mb-2 tracking-widest">💸 Pour Déposer :</p>
              <p className="text-[11px] lowercase not-italic text-slate-400">Utilisez MonCash ou NatCash. Après avoir envoyé l'argent aux numéros indiqués, soumettez votre preuve (capture d'écran ou numéro de transaction). Validation sous 5 à 15 minutes.</p>
            </div>
            <div className="bg-slate-950 p-4 rounded-2xl border border-white/5">
              <p className="text-[10px] text-emerald-500 mb-2 tracking-widest">💰 Pour Retirer :</p>
              <p className="text-[11px] lowercase not-italic text-slate-400">Indiquez le montant et votre numéro. Les retraits sont traités du lundi au dimanche. Assurez-vous que le numéro fourni est bien celui lié à votre compte de paiement.</p>
            </div>
          </div>
        </HelpSection>

        {/* SECTION 3 : RÈGLES */}
        <HelpSection icon={<ShieldCheck className="text-emerald-500" />} title="Bonnes Pratiques">
          <div className="bg-rose-500/5 p-5 rounded-[2rem] border border-rose-500/10 space-y-3">
            <div className="flex items-center gap-2 text-rose-500">
              <Info size={16} />
              <span className="text-[10px] tracking-widest">Interdictions :</span>
            </div>
            <ul className="text-[10px] space-y-2 text-slate-500 lowercase not-italic">
              <li>• Un seul compte par utilisateur.</li>
              <li>• Toute tentative de fraude sur les preuves de dépôt entraîne un bannissement définitif.</li>
              <li>• Respectez les limites de mise minimales et maximales affichées.</li>
            </ul>
          </div>
        </HelpSection>

        {/* SECTION 4 : SUPPORT */}
        <div className="bg-emerald-500 p-8 rounded-[3rem] text-slate-950 flex flex-col items-center text-center space-y-4 shadow-xl shadow-emerald-500/10">
          <MessageCircle size={40} strokeWidth={2.5} />
          <h2 className="text-lg leading-tight">Besoin d'une assistance directe ?</h2>
          <p className="text-[10px] lowercase not-italic font-bold">Nos agents sont disponibles 24/7 via le chat intégré.</p>
          <Link href="/client/chat" className="bg-slate-950 text-white px-8 py-4 rounded-2xl text-[10px] tracking-[0.2em]">
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

// Composant interne pour les sections
function HelpSection({ icon, title, children }: { icon: React.ReactNode, title: string, children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
          {icon}
        </div>
        <h2 className="text-sm tracking-widest">{title}</h2>
      </div>
      <div className="bg-slate-900/50 p-6 rounded-[2.5rem] border border-white/5 shadow-inner">
        {children}
      </div>
    </div>
  );
}
