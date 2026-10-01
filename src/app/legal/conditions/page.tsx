"use client";

import React from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Scale,
  ShieldCheck,
  UserCheck,
  Ban,
  WalletCards,
  AlertTriangle,
  FileCheck2,
  Mail,
} from "lucide-react";

const sections = [
  { id: "acceptation", label: "Acceptation" },
  { id: "compte", label: "Compte" },
  { id: "eligibilite", label: "Éligibilité" },
  { id: "fairplay", label: "Fair-play" },
  { id: "services", label: "Services" },
  { id: "paiements", label: "Paiements" },
  { id: "suspension", label: "Suspension" },
  { id: "contact", label: "Contact" },
];

export default function TermsOfService() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020617] text-slate-300 selection:bg-emerald-500/30">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[45%] top-[-220px] h-[550px] w-[550px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[150px]" />
        <div className="absolute bottom-[-250px] left-[-100px] h-[450px] w-[450px] rounded-full bg-cyan-500/5 blur-[140px]" />

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

          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-300">
            <Scale size={14} />
            Cadre d'utilisation
          </div>

          <h1 className="text-4xl font-black uppercase tracking-tight text-white md:text-6xl">
            Conditions
            <span className="block text-emerald-400">d'utilisation</span>
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 md:text-base">
            Les règles générales applicables à l'utilisation du site et de ses
            fonctionnalités.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          {/* Navigation */}
          <aside className="hidden lg:block">
            <div className="sticky top-8 rounded-2xl border border-white/10 bg-white/[0.025] p-4 backdrop-blur-xl">
              <p className="mb-3 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                Sommaire
              </p>

              <nav className="space-y-1">
                {sections.map((section, index) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-400 transition hover:bg-white/5 hover:text-emerald-300"
                  >
                    <span className="font-mono text-[10px] text-emerald-500/60">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {section.label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          <article className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/60 backdrop-blur-2xl">
            {/* Acceptation */}
            <section
              id="acceptation"
              className="border-b border-white/10 p-6 md:p-10"
            >
              <SectionTitle icon={FileCheck2}>
                1. Acceptation des conditions
              </SectionTitle>

              <p className="text-sm leading-7 text-slate-400">
                L'accès et l'utilisation des fonctionnalités de Chif Pam sont
                soumis aux présentes conditions ainsi qu'aux documents
                complémentaires applicables au service.
              </p>

              <Notice>
                L'utilisateur doit prendre connaissance des conditions
                applicables avant d'utiliser une fonctionnalité concernée.
              </Notice>
            </section>

            {/* Compte */}
            <section
              id="compte"
              className="border-b border-white/10 p-6 md:p-10"
            >
              <SectionTitle icon={UserCheck}>2. Compte utilisateur</SectionTitle>

              <p className="mb-4 text-sm leading-7 text-slate-400">
                Certaines fonctionnalités peuvent nécessiter la création d'un
                compte.
              </p>

              <BulletList
                items={[
                  "Les informations fournies lors de l'inscription doivent être exactes et à jour.",
                  "Les identifiants doivent rester confidentiels.",
                  "Un compte ne doit pas être utilisé pour contourner les mesures de sécurité du service.",
                  "Toute activité inhabituelle ou compromission présumée doit être signalée au support.",
                ]}
              />
            </section>

            {/* Eligibilité */}
            <section
              id="eligibilite"
              className="border-b border-white/10 p-6 md:p-10"
            >
              <SectionTitle icon={ShieldCheck}>3. Éligibilité</SectionTitle>

              <p className="text-sm leading-7 text-slate-400">
                Certaines fonctionnalités peuvent être réservées aux personnes
                remplissant des conditions d'âge, de résidence ou d'identité
                prévues par le service et par les règles applicables.
              </p>

              <div className="mt-5 rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-5">
                <div className="flex gap-3">
                  <ShieldCheck
                    size={20}
                    className="mt-0.5 shrink-0 text-emerald-400"
                  />

                  <p className="text-xs leading-6 text-slate-400">
                    Les restrictions d'accès doivent être respectées lorsqu'une
                    fonctionnalité est légalement ou techniquement réservée à
                    certaines catégories d'utilisateurs.
                  </p>
                </div>
              </div>
            </section>

            {/* Fair play */}
            <section
              id="fairplay"
              className="border-b border-white/10 p-6 md:p-10"
            >
              <SectionTitle icon={Ban}>4. Fair-play et sécurité</SectionTitle>

              <p className="mb-4 text-sm leading-7 text-slate-400">
                Les utilisateurs doivent utiliser le service conformément à
                son fonctionnement prévu.
              </p>

              <BulletList
                items={[
                  "L'utilisation de logiciels ou automatisations non autorisés peut être interdite.",
                  "L'exploitation volontaire de failles ou de dysfonctionnements doit être signalée.",
                  "Les tentatives de manipulation des résultats ou du fonctionnement du service peuvent entraîner des mesures sur le compte.",
                  "Les systèmes de sécurité peuvent enregistrer certaines informations techniques nécessaires à la détection des abus.",
                ]}
              />
            </section>

            {/* Services */}
            <section
              id="services"
              className="border-b border-white/10 p-6 md:p-10"
            >
              <SectionTitle>5. Fonctionnement des services</SectionTitle>

              <p className="text-sm leading-7 text-slate-400">
                Les fonctionnalités disponibles peuvent évoluer, être
                temporairement suspendues ou être modifiées afin d'assurer la
                maintenance, la sécurité ou l'amélioration du service.
              </p>

              <p className="mt-4 text-sm leading-7 text-slate-400">
                Les règles particulières propres à une fonctionnalité peuvent
                compléter les présentes conditions.
              </p>
            </section>

            {/* Paiements */}
            <section
              id="paiements"
              className="border-b border-white/10 p-6 md:p-10"
            >
              <SectionTitle icon={WalletCards}>
                6. Paiements, crédits et opérations financières
              </SectionTitle>

              <p className="text-sm leading-7 text-slate-400">
                Lorsqu'une fonctionnalité implique des crédits, paiements,
                récompenses ou opérations financières, des règles spécifiques
                peuvent s'appliquer.
              </p>

              <div className="mt-5 rounded-2xl border border-amber-400/15 bg-amber-400/5 p-5">
                <div className="flex gap-3">
                  <AlertTriangle
                    size={20}
                    className="mt-0.5 shrink-0 text-amber-400"
                  />

                  <div>
                    <p className="font-bold text-amber-300">
                      Informations à compléter
                    </p>

                    <p className="mt-2 text-xs leading-6 text-amber-100/60">
                      Les méthodes de paiement, conditions de remboursement,
                      éventuels frais, délais, vérifications d'identité,
                      restrictions géographiques et conditions de retrait
                      doivent être décrits exactement selon le fonctionnement
                      réel du service et les règles applicables.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Suspension */}
            <section
              id="suspension"
              className="border-b border-white/10 p-6 md:p-10"
            >
              <SectionTitle icon={Ban}>7. Suspension et fermeture</SectionTitle>

              <p className="text-sm leading-7 text-slate-400">
                Un compte peut faire l'objet de restrictions lorsque cela est
                nécessaire pour la sécurité du service, le respect des
                conditions ou la prévention des abus.
              </p>

              <p className="mt-4 text-sm leading-7 text-slate-400">
                Lorsqu'une procédure de restriction ou de fermeture est
                appliquée, les modalités correspondantes doivent être
                communiquées conformément aux règles du service et aux
                obligations applicables.
              </p>
            </section>

            {/* Contact */}
            <section id="contact" className="p-6 md:p-10">
              <SectionTitle icon={Mail}>8. Contact</SectionTitle>

              <p className="text-sm leading-7 text-slate-400">
                Pour toute question concernant les présentes conditions :
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
                  href="/confidentialite"
                  className="text-slate-500 hover:text-emerald-400"
                >
                  Confidentialité
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
    <div className="mt-6 rounded-2xl border border-emerald-400/15 bg-emerald-400/5 px-4 py-4 text-xs leading-6 text-slate-400">
      <strong className="text-emerald-300">À retenir :</strong> {children}
    </div>
  );
}
