"use client";
import React from 'react';
import Link from 'next/link';
import { ChevronLeft, Scale } from 'lucide-react';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-6 md:p-12 font-sans selection:bg-emerald-500/30">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-emerald-500 mb-8 hover:opacity-80 transition-opacity">
          <ChevronLeft size={20} /> Retour
        </Link>
        
        <div className="flex items-center gap-4 mb-8">
            <Scale size={40} className="text-emerald-500"/>
            <h1 className="text-3xl md:text-4xl font-black text-white italic uppercase">Conditions d'Utilisation</h1>
        </div>

        <div className="space-y-8 bg-slate-900/50 p-8 rounded-3xl border border-white/5">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Acceptation</h2>
            <p>En accédant à CHIF PAM, vous acceptez ces conditions. CHIF PAM est une plateforme de jeux d'adresse et de compétence (Skill-based gaming).</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. Éligibilité</h2>
            <p>Vous devez avoir au moins 18 ans pour utiliser nos services et participer aux défis payants.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. Fair-Play & Triche</h2>
            <p>Toute utilisation de bots, scripts ou failles pour manipuler les scores entraînera le bannissement immédiat et la saisie des gains. Nous prônons un environnement de jeu équitable.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Paiements & Retraits</h2>
            <p>Les jetons CP sont une monnaie virtuelle interne. Les retraits en Gourdes (HTG) sont soumis à validation et traités sous 24-48h.</p>
          </section>
          
          <div className="pt-6 border-t border-white/10 text-sm text-slate-500">
            Dernière mise à jour : Février 2026
          </div>
        </div>
      </div>
    </div>
  );
}

