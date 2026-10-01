"use client";


import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  FileText,
  Server,
  MapPin,
  Mail,
  ShieldCheck,
  Copyright,
  Globe2,
  Database,
} from "lucide-react";

const sections = [
  {
    icon: MapPin,
    title: "Éditeur du site",
    children: (
      <div className="grid gap-3">
        <InfoRow label="Nom commercial" value="CHIF PAM" />
        <InfoRow
          label="Activité"
          value="Plateforme de jeux d'adresse et de compétence en ligne"
        />
        <InfoRow
          label="Staff Responsable"
          value="JGG PRODUCTION "
        />
        <InfoRow
          label="Adresse"
          value=" Léogâne — Haïti "
        />
      </div>
    ),
  },
  {
    icon: Mail,
    title: "Contact",
    children: (
      <div className="space-y-4">
        <p className="text-sm leading-7 text-slate-400">
          Pour toute question concernant la plateforme, votre compte, un
          signalement ou une demande relative à vos données personnelles,
          vous pouvez nous contacter à l'adresse suivante :
        </p>

        <a
          href="mailto:support@chifpam.com"
          className="group inline-flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-3 text-sm font-bold text-emerald-400 transition-all hover:border-emerald-400/40 hover:bg-emerald-400/10"
        >
          <Mail size={17} />
          <span>support@chifpam.com</span>
        </a>
      </div>
    ),
  },
  {
    icon: Server,
    title: "Hébergement",
    children: (
      <div className="space-y-5">
        <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-5">
          <div className="mb-3 flex items-center gap-3">
            <Globe2 className="text-emerald-400" size={18} />
            <span className="font-bold text-white">Hébergement du site</span>
          </div>

          <div className="space-y-1 text-sm leading-6 text-slate-400">
            <p className="font-semibold text-slate-200">Vercel Inc.</p>
            <p>340 S Lemon Ave #4133</p>
            <p>Walnut, CA 91789, USA</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-5">
          <div className="mb-3 flex items-center gap-3">
            <Database className="text-emerald-400" size={18} />
            <span className="font-bold text-white">
              Services de données
            </span>
          </div>

          <p className="text-sm leading-7 text-slate-400">
            CHIF PAM utilise des services d'infrastructure et de base de
            données sécurisés, notamment Supabase, pour certaines fonctions
            techniques de la plateforme.
          </p>
        </div>
      </div>
    ),
  },
  {
    icon: Copyright,
    title: "Propriété intellectuelle",
    children: (
      <div className="space-y-4 text-sm leading-7 text-slate-400">
        <p>
          L'ensemble des éléments composant CHIF PAM, notamment sa structure,
          son interface, ses éléments graphiques, son identité visuelle, ses
          textes, ses logos, ses animations et ses composants logiciels,
          peuvent être protégés par les règles applicables en matière de
          propriété intellectuelle.
        </p>

        <p>
          Toute reproduction, représentation, modification ou réutilisation
          non autorisée d'un élément appartenant à CHIF PAM peut être
          interdite par les droits applicables.
        </p>
      </div>
    ),
  },
];

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-white/[0.05] bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
        {label}
      </span>

      <span className="text-sm font-semibold text-slate-200 sm:text-right">
        {value}
      </span>
    </div>
  );
}

export default function MentionsLegales() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020617] font-sans text-slate-300 selection:bg-emerald-400/30 selection:text-white">
      {/* Atmosphère */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-280px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-emerald-500/[0.06] blur-[140px]" />
        <div className="absolute bottom-[-250px] right-[-150px] h-[500px] w-[500px] rounded-full bg-cyan-500/[0.035] blur-[150px]" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
      </div>

      <div className="relative mx-auto w-full max-w-5xl px-5 py-7 sm:px-8 md:px-12 md:py-12">
        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <Link
            href="/"
            className="group inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.025] px-4 py-2.5 text-sm font-bold text-slate-400 backdrop-blur-xl transition-all hover:border-emerald-400/30 hover:bg-emerald-400/[0.05] hover:text-emerald-400"
          >
            <ArrowLeft
              size={17}
              className="transition-transform group-hover:-translate-x-1"
            />
            Retour à CHIF PAM
          </Link>
        </motion.div>

        {/* Hero */}
        <motion.header
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08 }}
          className="mt-12"
        >
          <div className="mb-5 flex items-center gap-4">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.08]">
              <div className="absolute inset-0 rounded-2xl bg-emerald-400/10 blur-xl" />
              <FileText
                size={27}
                className="relative text-emerald-400"
              />
            </div>

            <div>
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.28em] text-emerald-400">
                CHIF PAM • INFORMATIONS
              </p>

              <h1 className="text-3xl font-black uppercase italic tracking-tight text-white sm:text-4xl md:text-5xl">
                Mentions légales
              </h1>
            </div>
          </div>

          <p className="max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
            Les informations permettant d'identifier l'éditeur de la
            plateforme, son hébergement et les principales règles relatives
            à son contenu.
          </p>
        </motion.header>

        {/* Document */}
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.18 }}
          className="mt-10 overflow-hidden rounded-[2rem] border border-white/[0.07] bg-slate-900/50 shadow-2xl shadow-black/30 backdrop-blur-xl"
        >
          {/* Barre supérieure */}
          <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.02] px-6 py-4 sm:px-8">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                Document officiel
              </span>
            </div>

            <span className="rounded-full border border-white/[0.06] px-3 py-1 text-[9px] font-black uppercase tracking-[0.15em] text-slate-600">
              2026
            </span>
          </div>

          <div className="divide-y divide-white/[0.06]">
            {sections.map((section, index) => {
              const Icon = section.icon;

              return (
                <motion.section
                  key={section.title}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.45 }}
                  className="p-6 sm:p-8"
                >
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-400/15 bg-emerald-400/[0.06]">
                      <Icon size={17} className="text-emerald-400" />
                    </div>

                    <div>
                      <span className="mr-2 text-[10px] font-black text-emerald-500/70">
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <h2 className="inline text-lg font-black text-white">
                        {section.title}
                      </h2>
                    </div>
                  </div>

                  {section.children}
                </motion.section>
              );
            })}
          </div>

          {/* Footer */}
          <div className="border-t border-white/[0.06] bg-black/20 px-6 py-7 text-center sm:px-8">
            <p className="text-xs text-slate-600">
              © 2026 CHIF PAM. Tous droits réservés.
            </p>

            <p className="mt-2 text-[10px] text-slate-700">
              Version du document : 01 • Dernière mise à jour : 2026
            </p>
          </div>
        </motion.div>

        {/* Navigation légale */}
        <div className="mt-8 flex flex-wrap justify-center gap-3 pb-8">
          <Link
            href="/confidentialite"
            className="rounded-full border border-white/[0.06] px-4 py-2 text-xs font-bold text-slate-500 transition hover:border-emerald-400/20 hover:text-emerald-400"
          >
            Confidentialité
          </Link>

          <Link
            href="/conditions"
            className="rounded-full border border-white/[0.06] px-4 py-2 text-xs font-bold text-slate-500 transition hover:border-emerald-400/20 hover:text-emerald-400"
          >
            Conditions
          </Link>
        </div>
      </div>
    </main>
  );
}
