"use client";


import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ShieldCheck,
  LockKeyhole,
  Database,
  UserRound,
  EyeOff,
  Server,
  Mail,
} from "lucide-react";

const privacySections = [
  {
    icon: ShieldCheck,
    number: "01",
    title: "Introduction",
    content: (
      <p>
        Bienvenue sur CHIF PAM. Cette politique présente de manière générale
        les informations que la plateforme peut traiter dans le cadre de la
        création et de l'utilisation d'un compte, de la sécurité du service
        et de son fonctionnement technique.
      </p>
    ),
  },
  {
    icon: UserRound,
    number: "02",
    title: "Données collectées",
    content: (
      <>
        <p>
          Les informations traitées dépendent des fonctionnalités utilisées
          sur la plateforme. Elles peuvent notamment comprendre :
        </p>

        <ul className="mt-4 space-y-3">
          <PrivacyItem>
            les informations nécessaires à la création et à la gestion du
            compte ;
          </PrivacyItem>

          <PrivacyItem>
            les identifiants nécessaires à l'authentification ;
          </PrivacyItem>

          <PrivacyItem>
            les informations liées à l'activité du joueur, lorsque celles-ci
            sont nécessaires au fonctionnement des fonctionnalités concernées ;
          </PrivacyItem>

          <PrivacyItem>
            certaines informations techniques nécessaires à la sécurité et au
            bon fonctionnement du service.
          </PrivacyItem>
        </ul>
      </>
    ),
  },
  {
    icon: Database,
    number: "03",
    title: "Utilisation des données",
    content: (
      <>
        <p>
          Les données peuvent être utilisées pour les besoins légitimes du
          fonctionnement de CHIF PAM, notamment afin de :
        </p>

        <ul className="mt-4 space-y-3">
          <PrivacyItem>
            créer, maintenir et sécuriser les comptes utilisateurs ;
          </PrivacyItem>

          <PrivacyItem>
            assurer le fonctionnement des fonctionnalités de la plateforme ;
          </PrivacyItem>

          <PrivacyItem>
            détecter les comportements susceptibles de compromettre la
            sécurité ou l'intégrité du service ;
          </PrivacyItem>

          <PrivacyItem>
            répondre aux demandes adressées au support.
          </PrivacyItem>
        </ul>
      </>
    ),
  },
  {
    icon: EyeOff,
    number: "04",
    title: "Partage et confidentialité",
    content: (
      <p>
        CHIF PAM ne prévoit pas de vendre les données personnelles des
        utilisateurs. Certaines données peuvent toutefois être traitées par
        des prestataires techniques nécessaires au fonctionnement de la
        plateforme, conformément aux services effectivement utilisés.
      </p>
    ),
  },
  {
    icon: LockKeyhole,
    number: "05",
    title: "Sécurité",
    content: (
      <p>
        Des mesures techniques et organisationnelles sont mises en place afin
        de limiter les accès non autorisés, les pertes de données et les
        utilisations abusives. L'authentification et certaines données de la
        plateforme sont gérées au moyen de services d'infrastructure
        sécurisés.
      </p>
    ),
  },
  {
    icon: Server,
    number: "06",
    title: "Services techniques",
    content: (
      <p>
        L'infrastructure technique de CHIF PAM peut notamment s'appuyer sur
        Vercel pour l'hébergement de l'application et Supabase pour certaines
        fonctions liées à l'authentification et aux données. Les services
        réellement utilisés peuvent évoluer avec la plateforme.
      </p>
    ),
  },
  {
    icon: Mail,
    number: "07",
    title: "Contact",
    content: (
      <div>
        <p>
          Pour toute demande concernant la confidentialité ou les données
          associées à votre compte, contactez le support :
        </p>

        <a
          href="mailto:support@chifpam.com"
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-3 text-sm font-bold text-emerald-400 transition hover:border-emerald-400/40 hover:bg-emerald-400/10"
        >
          <Mail size={16} />
          support@chifpam.com
        </a>
      </div>
    ),
  },
];

function PrivacyItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3 text-sm leading-7 text-slate-400">
      <span className="mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.5)]" />
      <span>{children}</span>
    </li>
  );
}

export default function PrivacyPolicy() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020617] font-sans text-slate-300 selection:bg-emerald-400/30 selection:text-white">
      {/* Background immersif */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[-180px] top-[15%] h-[450px] w-[450px] rounded-full bg-emerald-500/[0.045] blur-[150px]" />

        <div className="absolute bottom-[-220px] right-[-120px] h-[500px] w-[500px] rounded-full bg-cyan-500/[0.035] blur-[150px]" />

        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,.8) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-5xl px-5 py-7 sm:px-8 md:px-12 md:py-12">
        {/* Retour */}
        <motion.div
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45 }}
        >
          <Link
            href="/"
            className="group inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.025] px-4 py-2.5 text-sm font-bold text-slate-400 backdrop-blur-xl transition hover:border-emerald-400/30 hover:text-emerald-400"
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
          <div className="flex items-center gap-4">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.08]">
              <div className="absolute inset-0 rounded-2xl bg-emerald-400/10 blur-xl" />

              <ShieldCheck
                size={28}
                className="relative text-emerald-400"
              />
            </div>

            <div>
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.28em] text-emerald-400">
                CHIF PAM • PROTECTION
              </p>

              <h1 className="text-3xl font-black uppercase italic tracking-tight text-white sm:text-4xl md:text-5xl">
                Confidentialité
              </h1>
            </div>
          </div>

          <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
            Cette page présente les principes appliqués au traitement des
            informations nécessaires au fonctionnement et à la sécurisation
            de CHIF PAM.
          </p>
        </motion.header>

        {/* Document */}
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.18 }}
          className="mt-10 overflow-hidden rounded-[2rem] border border-white/[0.07] bg-slate-900/50 shadow-2xl shadow-black/30 backdrop-blur-xl"
        >
          {/* Security header */}
          <div className="border-b border-white/[0.06] bg-emerald-400/[0.025] px-6 py-6 sm:px-8">
            <div className="flex items-start gap-4">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/15 bg-emerald-400/[0.06]">
                <LockKeyhole size={18} className="text-emerald-400" />
              </div>

              <div>
                <p className="text-sm font-bold text-white">
                  Protection des informations
                </p>

                <p className="mt-1 text-xs leading-6 text-slate-500">
                  CHIF PAM applique le principe de minimisation : les
                  informations doivent être utilisées uniquement lorsqu'elles
                  sont nécessaires au fonctionnement concerné.
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-white/[0.06]">
            {privacySections.map((section) => {
              const Icon = section.icon;

              return (
                <motion.section
                  key={section.number}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.45 }}
                  className="p-6 sm:p-8"
                >
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-400/15 bg-emerald-400/[0.06]">
                      <Icon size={17} className="text-emerald-400" />
                    </div>

                    <div>
                      <span className="mr-2 text-[10px] font-black text-emerald-500/70">
                        {section.number}
                      </span>

                      <h2 className="inline text-lg font-black text-white">
                        {section.title}
                      </h2>
                    </div>
                  </div>

                  <div className="text-sm leading-7 text-slate-400">
                    {section.content}
                  </div>
                </motion.section>
              );
            })}
          </div>

          <div className="border-t border-white/[0.06] bg-black/20 px-6 py-7 text-center sm:px-8">
            <p className="text-xs text-slate-600">
              Dernière mise à jour : 1er octobre 2026
            </p>
          </div>
        </motion.div>

        {/* Navigation */}
        <div className="mt-8 flex flex-wrap justify-center gap-3 pb-8">
          <Link
            href="/mention-legales"
            className="rounded-full border border-white/[0.06] px-4 py-2 text-xs font-bold text-slate-500 transition hover:border-emerald-400/20 hover:text-emerald-400"
          >
            Mentions légales
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
