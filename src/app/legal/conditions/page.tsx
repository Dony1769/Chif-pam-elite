"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Scale,
  ShieldCheck,
  UserCheck,
  Swords,
  Coins,
  AlertTriangle,
  Ban,
  FileCheck2,
} from "lucide-react";

const termsSections = [
  {
    icon: FileCheck2,
    number: "01",
    title: "Acceptation",
    content: (
      <p>
        L'accès et l'utilisation de CHIF PAM impliquent l'acceptation des
        présentes conditions d'utilisation. Si vous n'acceptez pas ces
        conditions, vous devez cesser d'utiliser les services concernés.
      </p>
    ),
  },
  {
    icon: UserCheck,
    number: "02",
    title: "Éligibilité",
    content: (
      <>
        <p>
          L'utilisation des services concernés par une limite d'âge est
          réservée aux personnes remplissant les conditions d'âge applicables.
        </p>

        <div className="mt-4 flex gap-3 rounded-2xl border border-amber-400/15 bg-amber-400/[0.045] p-4">
          <AlertTriangle
            size={18}
            className="mt-0.5 shrink-0 text-amber-400"
          />

          <p className="text-sm leading-6 text-slate-400">
            Pour les défis ou fonctionnalités réservés aux adultes, l'âge
            minimum indiqué par CHIF PAM est de <strong className="text-slate-200">18 ans</strong>.
          </p>
        </div>
      </>
    ),
  },
  {
    icon: Swords,
    number: "03",
    title: "Fair-play et intégrité",
    content: (
      <>
        <p>
          CHIF PAM vise à maintenir un environnement de jeu équitable. Les
          utilisateurs doivent utiliser la plateforme conformément aux règles
          des jeux et fonctionnalités auxquels ils participent.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <RuleCard
            icon={ShieldCheck}
            title="Jeu équitable"
            text="Les résultats doivent provenir d'une utilisation normale de la plateforme."
          />

          <RuleCard
            icon={Ban}
            title="Manipulation interdite"
            text="Les bots, scripts, exploits ou mécanismes destinés à fausser les résultats peuvent entraîner des mesures sur le compte."
          />
        </div>
      </>
    ),
  },
  {
    icon: Coins,
    number: "04",
    title: "CP, paiements et retraits",
    content: (
      <p>
        Les CP constituent une unité virtuelle interne utilisée par les
        fonctionnalités prévues par CHIF PAM. Lorsqu'une fonctionnalité de
        retrait est disponible, les demandes peuvent être soumises à des
        contrôles et à une validation avant leur traitement.
      </p>
    ),
  },
  {
    icon: AlertTriangle,
    number: "05",
    title: "Comportements interdits",
    content: (
      <>
        <p>
          Il est notamment interdit d'utiliser CHIF PAM pour compromettre la
          sécurité de la plateforme, contourner ses mécanismes de protection
          ou perturber volontairement son fonctionnement.
        </p>

        <ul className="mt-4 space-y-3">
          <RuleListItem>
            tentative d'accès non autorisé à un compte ou à une partie du
            système ;
          </RuleListItem>

          <RuleListItem>
            exploitation volontaire d'une faille ou d'un comportement
            technique destiné à obtenir un avantage indu ;
          </RuleListItem>

          <RuleListItem>
            utilisation d'outils automatisés lorsqu'ils sont interdits par la
            fonctionnalité concernée ;
          </RuleListItem>

          <RuleListItem>
            comportement destiné à perturber les autres utilisateurs ou le
            service.
          </RuleListItem>
        </ul>
      </>
    ),
  },
  {
    icon: Ban,
    number: "06",
    title: "Mesures sur les comptes",
    content: (
      <p>
        Lorsqu'une violation des règles est constatée ou lorsqu'une activité
        présente un risque pour la sécurité ou l'intégrité de la plateforme,
        CHIF PAM peut prendre les mesures prévues par ses procédures,
        notamment limiter temporairement certaines fonctionnalités ou
        suspendre un compte.
      </p>
    ),
  },
];

function RuleCard({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof ShieldCheck;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon size={17} className="text-emerald-400" />
        <span className="text-sm font-black text-white">{title}</span>
      </div>

      <p className="text-xs leading-6 text-slate-500">{text}</p>
    </div>
  );
}

function RuleListItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3 text-sm leading-7 text-slate-400">
      <span className="mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
      <span>{children}</span>
    </li>
  );
}

export default function TermsOfService() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020617] font-sans text-slate-300 selection:bg-emerald-400/30 selection:text-white">
      {/* Atmosphère */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-[-260px] h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-emerald-500/[0.055] blur-[150px]" />

        <div className="absolute bottom-[-200px] left-[-180px] h-[450px] w-[450px] rounded-full bg-blue-500/[0.025] blur-[150px]" />

        <div
          className="absolute inset-0 opacity-[0.018]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)",
            backgroundSize: "42px 42px",
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

              <Scale
                size={28}
                className="relative text-emerald-400"
              />
            </div>

            <div>
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.28em] text-emerald-400">
                CHIF PAM • RÈGLES
              </p>

              <h1 className="text-3xl font-black uppercase italic tracking-tight text-white sm:text-4xl md:text-5xl">
                Conditions
              </h1>
            </div>
          </div>

          <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
            Les règles essentielles encadrant l'accès, l'utilisation et
            l'intégrité de la plateforme CHIF PAM.
          </p>
        </motion.header>

        {/* Document */}
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.18 }}
          className="mt-10 overflow-hidden rounded-[2rem] border border-white/[0.07] bg-slate-900/50 shadow-2xl shadow-black/30 backdrop-blur-xl"
        >
          {/* Header */}
          <div className="border-b border-white/[0.06] bg-white/[0.02] px-6 py-6 sm:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/15 bg-emerald-400/[0.06]">
                <Scale size={18} className="text-emerald-400" />
              </div>

              <div>
                <p className="text-sm font-bold text-white">
                  Conditions d'utilisation
                </p>

                <p className="mt-1 text-xs text-slate-600">
                  CHIF PAM • Version 2026
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-white/[0.06]">
            {termsSections.map((section) => {
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

          {/* Footer document */}
          <div className="border-t border-white/[0.06] bg-black/20 px-6 py-7 text-center sm:px-8">
            <p className="text-xs text-slate-600">
              Dernière mise à jour : 1er octobre 2026
            </p>
          </div>
        </motion.div>

        {/* Navigation légale */}
        <div className="mt-8 flex flex-wrap justify-center gap-3 pb-8">
          <Link
            href="/mention-legales"
            className="rounded-full border border-white/[0.06] px-4 py-2 text-xs font-bold text-slate-500 transition hover:border-emerald-400/20 hover:text-emerald-400"
          >
            Mentions légales
          </Link>

          <Link
            href="/confidentialite"
            className="rounded-full border border-white/[0.06] px-4 py-2 text-xs font-bold text-slate-500 transition hover:border-emerald-400/20 hover:text-emerald-400"
          >
            Confidentialité
          </Link>
        </div>
      </div>
    </main>
  );
                       }
