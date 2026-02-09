"use client";
import React from 'react';
import Link from 'next/link';
import { ChevronLeft, FileText, Server, MapPin, Mail } from 'lucide-react';

export default function MentionsLegales() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-6 md:p-12 font-sans selection:bg-emerald-500/30">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-emerald-500 mb-8 hover:opacity-80 transition-opacity">
          <ChevronLeft size={20} /> Retour
        </Link>
        
        <div className="flex items-center gap-4 mb-8">
            <FileText size={40} className="text-emerald-500"/>
            <h1 className="text-3xl md:text-4xl font-black text-white italic uppercase">Mentions Légales</h1>
        </div>

        <div className="space-y-8 bg-slate-900/50 p-8 rounded-3xl border border-white/5">
          
          {/* SECTION 1 : ÉDITEUR */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <MapPin size={20} className="text-emerald-500"/> Éditeur du Site
            </h2>
            <div className="bg-black/20 p-4 rounded-xl border border-white/5 text-sm space-y-2">
                <p><span className="text-slate-500 font-bold uppercase">Nom commercial :</span> CHIF PAM</p>
                <p><span className="text-slate-500 font-bold uppercase">Statut :</span> Plateforme de jeux d'adresse en ligne</p>
                <p><span className="text-slate-500 font-bold uppercase">Responsable :</span> [Guillaume Jhonn]</p>
                <p><span className="text-slate-500 font-bold uppercase">Adresse :</span> [Jeremie, HAÏTI]</p>
            </div>
          </section>

          {/* SECTION 2 : CONTACT */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Mail size={20} className="text-emerald-500"/> Contact
            </h2>
            <p className="text-sm mb-2">Pour toute question ou signalement :</p>
            <a href="mailto:support@chifpam.com" className="text-emerald-500 font-bold hover:underline">support@chifpam.com</a>
            {/* Si tu n'as pas cet email, mets ton gmail pro temporairement */}
          </section>

          {/* SECTION 3 : HÉBERGEMENT */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Server size={20} className="text-emerald-500"/> Hébergement
            </h2>
            <div className="bg-black/20 p-4 rounded-xl border border-white/5 text-sm space-y-2">
                <p>Le site est hébergé par :</p>
                <p><strong className="text-white">Vercel Inc.</strong></p>
                <p>340 S Lemon Ave #4133</p>
                <p>Walnut, CA 91789, USA</p>
                {/* Si tu utilises Supabase pour la BDD, tu peux le mentionner aussi */}
                <p className="mt-2 text-xs opacity-50">Base de données sécurisée par Supabase.</p>
            </div>
          </section>

          {/* SECTION 4 : PROPRIÉTÉ INTELLECTUELLE */}
          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Propriété Intellectuelle</h2>
            <p className="text-sm leading-relaxed">
                Tous les éléments graphiques, la structure et, plus généralement, le contenu du site 
                <span className="text-white font-bold"> CHIF PAM</span> sont protégés par le droit d'auteur, 
                le droit des marques et le droit des dessins et modèles.
            </p>
          </section>
          
          <div className="pt-6 border-t border-white/10 text-sm text-slate-500 text-center">
            © 2026 CHIF PAM. Tous droits réservés.
          </div>
        </div>
      </div>
    </div>
  );
}
