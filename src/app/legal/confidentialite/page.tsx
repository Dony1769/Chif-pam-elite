"use client";
import React from 'react';
import Link from 'next/link';
import { ChevronLeft, ShieldCheck } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-6 md:p-12 font-sans selection:bg-emerald-500/30">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-emerald-500 mb-8 hover:opacity-80 transition-opacity">
          <ChevronLeft size={20} /> Retour
        </Link>
        
        <div className="flex items-center gap-4 mb-8">
            <ShieldCheck size={40} className="text-emerald-500"/>
            <h1 className="text-3xl md:text-4xl font-black text-white italic uppercase">Politique de Confidentialité</h1>
        </div>

        <div className="space-y-8 bg-slate-900/50 p-8 rounded-3xl border border-white/5">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Introduction</h2>
            <p>Bienvenue sur CHIF PAM. La protection de vos données est notre priorité absolue. Cette politique explique comment nous traitons vos informations.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. Données Collectées</h2>
            <p>Nous collectons uniquement les données nécessaires au fonctionnement du jeu :</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Identifiants de connexion (pour sécuriser votre compte).</li>
                <li>Historique des scores et transactions (pour le classement et les gains).</li>
                <li>Informations techniques (adresse IP, type d'appareil) pour la sécurité.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. Utilisation des Données</h2>
            <p>Vos données ne sont JAMAIS vendues à des tiers. Elles servent uniquement à :</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Gérer votre compte joueur.</li>
                <li>Verser vos gains (MonCash / Natcash).</li>
                <li>Prévenir la fraude et la triche.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Sécurité</h2>
            <p>Nous utilisons des protocoles de cryptage avancés pour protéger vos informations lors des transferts et du stockage.</p>
          </section>
          
          <div className="pt-6 border-t border-white/10 text-sm text-slate-500">
            Dernière mise à jour : Février 2026
          </div>
        </div>
      </div>
    </div>
  );
}
