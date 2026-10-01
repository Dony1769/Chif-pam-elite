"use client";

import React from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ShieldCheck,
  Database,
  LockKeyhole,
  Cookie,
  UserRound,
  Eye,
  Trash2,
  Mail,
  Server,
} from "lucide-react";

const sections = [
  { id: "intro", label: "Introduction" },
  { id: "collecte", label: "Données collectées" },
  { id: "utilisation", label: "Utilisation" },
  { id: "securite", label: "Sécurité" },
  { id: "cookies", label: "Cookies" },
  { id: "conservation", label: "Conservation" },
  { id: "droits", label: "Vos droits" },
];

export default function PrivacyPolicy() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020617] text-slate-300 selection:bg-emerald-500/30">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[20%] top-[-220px] h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[150px]" />
        <div className="absolute right-[-150px] top-[40%] h-[450px] w-[450px] rounded-full bg-cyan-500/5 blur-[140px]" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-5 py-7 md:px-8 md:py-12">
        <header className="mb-10">
          <Link
            href="/"
            className="group mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-slate-300 backdrop-blur-xl transition hover:border-emerald-400/30 hover:bg-emerald-400/10 hover:text-emerald-300"
          >
            <ChevronLeft
              size={17}
              className="transition-transform group-hover:-translate-x-1"
            />
            Retour à Chif Pam
          </Link>

          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-300">
            <ShieldCheck size={14} />
            Protection des données
          </div>

          <h1 className="text-4xl font-black uppercase tracking-tight text-white md:text-6xl">
            Politique de
            <span className="block text-emerald-400">confidentialité</span>
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 md:text-base">
            Cette page présente les principes généraux relatifs aux données
            traitées dans le cadre de l'utilisation de Chif Pam.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-8 rounded-2xl border border-white/10 bg-white/[0.025] p-4 backdrop-blur-xl">
              <p className="mb-3 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                Navigation
              </p>

              <nav className="space-y-1">
                {sections.map((section, index) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-400 transition hover:bg-white/5 hover:text-emerald-300"
                  >
                    <span className="font-mono text-[10px] text-emerald-500/60">
                      0{index + 1}
                    </span>
                    {section.label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          <article className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/60 backdrop-blur-2xl">
            <section
              id="intro"
              className="border-b border-white/10 p-6 md:p-10"
            >
              <SectionTitle icon={ShieldCheck}>1. Introduction</SectionTitle>

              <p className="text-sm leading-7 text-slate-400">
                Chif Pam accorde une attention particulière à la protection des
                informations associées à ses utilisateurs. Cette politique
                explique quelles catégories de données peuvent être traitées,
                pourquoi elles sont utilisées et quelles mesures sont prévues
                pour leur protection.
              </p>

              <Notice>
                Cette politique doit être adaptée aux données réellement
                collectées par ton application et validée avant sa publication
                comme document juridique définitif.
              </Notice>
            </section>

            <section
              id="collecte"
              className="border-b border-white/10 p-6 md:p-10"
            >
              <SectionTitle icon={Database}>2. Données susceptibles d'être collectées</SectionTitle>

              <div className="grid gap-4 md:grid-cols-2">
                <DataCard
                  icon={UserRound}
                  title="Compte"
                  text="Informations nécessaires à la création et à la gestion du compte."
                />

                <DataCard
                  icon={Database}
                  title="Activité"
                  text="Informations liées à l'utilisation des fonctionnalités proposées."
                />

                <DataCard
                  icon={Server}
                  title="Données techniques"
                  text="Informations techniques nécessaires au fonctionnement et à la sécurité du service."
                />

                <DataCard
                  icon={Eye}
                  title="Sécurité"
                  text="Informations pouvant être utilisées pour détecter les abus, fraudes ou activités anormales."
                />
              </div>
            </section>

            <section
              id="utilisation"
              className="border-b border-white/10 p-6 md:p-10"
            >
              <SectionTitle icon={Eye}>3. Utilisation des données</SectionTitle>

              <p className="mb-4 text-sm leading-7 text-slate-400">
                Les données peuvent notamment être utilisées pour :
              </p>

              <BulletList
                items={[
                  "créer et gérer les comptes utilisateurs ;",
                  "assurer le fonctionnement des fonctionnalités du site ;",
                  "sécuriser les comptes et les sessions ;",
                  "détecter les comportements abusifs ou frauduleux ;",
                  "répondre aux demandes adressées au support ;",
                  "améliorer l'expérience et la fiabilité du service.",
                ]}
              />

              <div className="mt-6 rounded-2xl border border-emerald-400/10 bg-emerald-400/5 p-5">
                <p className="text-sm leading-6 text-slate-300">
                  Les données ne doivent être utilisées que pour des finalités
                  compatibles avec leur collecte et dans les limites prévues
                  par les règles applicables.
                </p>
              </div>
            </section>

            <section
              id="securite"
              className="border-b border-white/10 p-6 md:p-10"
            >
              <SectionTitle icon={LockKeyhole}>4. Sécurité</SectionTitle>

              <p className="text-sm leading-7 text-slate-400">
                Des mesures techniques et organisationnelles appropriées
                doivent être mises en place afin de limiter les accès non
                autorisés, les pertes de données et les usages abusifs.
              </p>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <SecurityItem title="Authentification" />
                <SecurityItem title="Contrôle d'accès" />
                <SecurityItem title="Protection des données" />
              </div>
            </section>

            <section
              id="cookies"
              className="border-b border-white/10 p-6 md:p-10"
            >
              <SectionTitle icon={Cookie}>5. Cookies et stockage local</SectionTitle>

              <p className="text-sm leading-7 text-slate-400">
                Chif Pam peut utiliser des mécanismes techniques tels que les
                cookies, le stockage local ou des technologies similaires pour
                maintenir une session, mémoriser certaines préférences ou
                assurer la sécurité du service.
              </p>

              <p className="mt-4 text-sm leading-7 text-slate-400">
                La liste exacte des cookies et technologies utilisés doit être
                ajustée en fonction de l'implémentation réellement déployée.
              </p>
            </section>

            <section
              id="conservation"
              className="border-b border-white/10 p-6 md:p-10"
            >
              <SectionTitle icon={Database}>6. Conservation</SectionTitle>

              <p className="text-sm leading-7 text-slate-400">
                Les données doivent être conservées pendant une durée
                proportionnée à leur finalité et aux obligations éventuellement
                applicables au service.
              </p>

              <p className="mt-4 text-sm leading-7 text-slate-400">
                Les durées précises de conservation doivent être définies selon
                les catégories de données réellement utilisées par Chif Pam.
              </p>
            </section>

            <section id="droits" className="p-6 md:p-10">
              <SectionTitle icon={Trash2}>7. Vos droits et demandes</SectionTitle>

              <p className="text-sm leading-7 text-slate-400">
                Pour toute demande concernant les informations associées à votre
                compte ou la présente politique, contactez l'équipe Chif Pam
                via l'adresse officielle :
              </p>

              <a
                href="mailto:support@chifpam.com"
                className="mt-5 inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-5 py-4 font-semibold text-emerald-300 transition hover:border-emerald-400/30 hover:bg-emerald-400/5"
              >
                <Mail size={18} />
                support@chifpam.com
              </a>
            </section>

            <footer className="border-t border-white/10 bg-black/20 px-6 py-6 text-center">
              <p className="text-xs text-slate-500">
                Dernière mise à jour : 1er octobre 2026
              </p>

              <div className="mt-3 flex justify-center gap-5 text-xs">
                <Link
                  href="/mention-legales"
                  className="text-slate-500 hover:text-emerald-400"
                >
                  Mentions légales
                </Link>

                <Link
                  href="/conditions"
                  className="text-slate-500 hover:text-emerald-400"
                >
                  Conditions
                </Link>
              </div>
            </footer>
          </article>
        </div>
      </div>
    </main>
  );
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-center gap-3">
      {Icon && (
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10">
          <Icon size={19} className="text-emerald-400" />
        </div>
      )}

      <h2 className="text-xl font-black tracking-tight text-white md:text-2xl">
        {children}
      </h2>
    </div>
  );
}

function DataCard({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ElementType;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5 transition hover:border-emerald-400/20">
      <Icon size={20} className="mb-4 text-emerald-400" />
      <h3 className="font-bold text-white">{title}</h3>
      <p className="mt-2 text-xs leading-6 text-slate-500">{text}</p>
    </div>
  );
}

function SecurityItem({ title }: { title: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-center text-xs font-semibold text-slate-400">
      <LockKeyhole size={15} className="mx-auto mb-2 text-emerald-400" />
      {title}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-6 text-slate-400">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
          {item}
        </li>
      ))}
    </ul>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-2xl border border-amber-400/15 bg-amber-400/5 px-4 py-4 text-xs leading-6 text-amber-200/70">
      <strong className="text-amber-300">Important :</strong> {children}
    </div>
  );
}
