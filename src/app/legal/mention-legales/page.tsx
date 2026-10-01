"use client";

import React from "react";
import Link from "next/link";
import {
  ChevronLeft,
  FileText,
  Server,
  MapPin,
  Mail,
  ShieldCheck,
  Globe,
  ExternalLink,
} from "lucide-react";

const sections = [
  { id: "editeur", label: "Éditeur" },
  { id: "contact", label: "Contact" },
  { id: "hebergement", label: "Hébergement" },
  { id: "propriete", label: "Propriété intellectuelle" },
  { id: "responsabilite", label: "Responsabilité" },
];

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      {Icon && (
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10">
          <Icon size={19} className="text-emerald-400" />
        </div>
      )}

      <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
        {children}
      </h2>
    </div>
  );
}

export default function MentionsLegales() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020617] text-slate-300 selection:bg-emerald-500/30">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-[-180px] h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[140px]" />
        <div className="absolute bottom-[-200px] right-[-150px] h-[450px] w-[450px] rounded-full bg-cyan-500/5 blur-[130px]" />

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
        {/* Header */}
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

          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-300">
                <ShieldCheck size={14} />
                Informations légales
              </div>

              <h1 className="max-w-3xl text-4xl font-black uppercase tracking-tight text-white md:text-6xl">
                Mentions
                <span className="block text-emerald-400">légales</span>
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 md:text-base">
                Informations relatives à l'éditeur, à l'hébergement et à
                l'utilisation du site Chif Pam.
              </p>
            </div>

            <div className="hidden rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-right backdrop-blur-xl md:block">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Document
              </p>
              <p className="mt-1 font-bold text-white">Version 2026</p>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          {/* Side navigation */}
          <aside className="hidden lg:block">
            <div className="sticky top-8 rounded-2xl border border-white/10 bg-white/[0.025] p-4 backdrop-blur-xl">
              <p className="mb-3 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                Sur cette page
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

          {/* Content */}
          <article className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/60 shadow-2xl shadow-black/30 backdrop-blur-2xl">
            <div className="space-y-0">
              {/* Éditeur */}
              <section id="editeur" className="border-b border-white/10 p-6 md:p-10">
                <SectionTitle icon={MapPin}>Éditeur du site</SectionTitle>

                <div className="grid gap-3 md:grid-cols-2">
                  <InfoCard label="Nom commercial" value="CHIF PAM" />
                  <InfoCard
                    label="Activité"
                    value="Plateforme numérique de jeux et services en ligne"
                  />
                  <InfoCard
                    label="Responsable"
                    value="[Nom légal à compléter]"
                  />
                  <InfoCard
                    label="Adresse"
                    value="[Adresse complète à compléter]"
                  />
                </div>

                <Notice>
                  Les informations entre crochets doivent être remplacées par
                  les informations légales exactes avant publication.
                </Notice>
              </section>

              {/* Contact */}
              <section id="contact" className="border-b border-white/10 p-6 md:p-10">
                <SectionTitle icon={Mail}>Contact</SectionTitle>

                <p className="mb-5 text-sm leading-7 text-slate-400">
                  Pour toute question concernant le site, votre compte ou les
                  présentes informations, vous pouvez utiliser le moyen de
                  contact officiel indiqué ci-dessous.
                </p>

                <a
                  href="mailto:support@chifpam.com"
                  className="group inline-flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 px-5 py-4 transition hover:border-emerald-400/40 hover:bg-emerald-400/10"
                >
                  <Mail size={19} className="text-emerald-400" />

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Adresse de contact
                    </p>
                    <p className="font-bold text-emerald-300">
                      support@chifpam.com
                    </p>
                  </div>

                  <ExternalLink
                    size={15}
                    className="ml-2 text-slate-500 transition group-hover:text-emerald-300"
                  />
                </a>
              </section>

              {/* Hébergement */}
              <section
                id="hebergement"
                className="border-b border-white/10 p-6 md:p-10"
              >
                <SectionTitle icon={Server}>Hébergement et services techniques</SectionTitle>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5">
                      <Globe size={20} className="text-cyan-400" />
                    </div>

                    <div>
                      <p className="font-bold text-white">
                        Hébergement applicatif
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-400">
                        Le site peut utiliser des services d'infrastructure
                        tiers pour son hébergement et son fonctionnement.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-white/10 pt-5 text-sm text-slate-400">
                    <p>
                      <strong className="text-white">Hébergeur :</strong>{" "}
                      Vercel Inc.
                    </p>
                    <p className="mt-1">
                      <strong className="text-white">Adresse :</strong>{" "}
                      340 S Lemon Ave #4133, Walnut, CA 91789, USA
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-xs leading-6 text-slate-500">
                  D'autres fournisseurs techniques peuvent être utilisés pour
                  l'authentification, le stockage ou la base de données. Leur
                  utilisation doit être décrite dans la politique de
                  confidentialité applicable.
                </p>
              </section>

              {/* Propriété */}
              <section id="propriete" className="border-b border-white/10 p-6 md:p-10">
                <SectionTitle icon={FileText}>
                  Propriété intellectuelle
                </SectionTitle>

                <p className="text-sm leading-7 text-slate-400">
                  Sauf indication contraire, les éléments composant Chif Pam,
                  notamment son identité visuelle, ses interfaces, textes,
                  graphismes, logos, illustrations, composants et éléments
                  logiciels, sont destinés à être protégés par les droits
                  applicables à la propriété intellectuelle.
                </p>

                <p className="mt-4 text-sm leading-7 text-slate-400">
                  Toute reproduction, modification ou réutilisation non
                  autorisée d'un élément protégé peut être soumise aux droits
                  et conditions applicables.
                </p>
              </section>

              {/* Responsabilité */}
              <section id="responsabilite" className="p-6 md:p-10">
                <SectionTitle>Responsabilité</SectionTitle>

                <p className="text-sm leading-7 text-slate-400">
                  Les informations présentées sur le site sont fournies dans
                  le cadre de son fonctionnement normal. Des interruptions,
                  erreurs techniques ou indisponibilités temporaires peuvent
                  survenir.
                </p>

                <p className="mt-4 text-sm leading-7 text-slate-400">
                  Les conditions spécifiques applicables aux comptes, services
                  et fonctionnalités sont précisées dans les documents
                  contractuels correspondants.
                </p>
              </section>

              {/* Footer */}
              <footer className="border-t border-white/10 bg-black/20 px-6 py-6 text-center">
                <p className="text-xs text-slate-500">
                  © 2026 CHIF PAM — Tous droits réservés.
                </p>

                <div className="mt-3 flex justify-center gap-5 text-xs">
                  <Link
                    href="/confidentialite"
                    className="text-slate-500 transition hover:text-emerald-400"
                  >
                    Confidentialité
                  </Link>
                  <Link
                    href="/conditions"
                    className="text-slate-500 transition hover:text-emerald-400"
                  >
                    Conditions
                  </Link>
                </div>
              </footer>
            </div>
          </article>
        </div>
      </div>
    </main>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold leading-6 text-white">
        {value}
      </p>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-5 rounded-2xl border border-amber-400/15 bg-amber-400/5 px-4 py-3 text-xs leading-6 text-amber-200/70">
      <strong className="text-amber-300">À compléter :</strong> {children}
    </div>
  );
}
