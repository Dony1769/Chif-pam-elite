import type { Metadata } from "next";
import Link from "next/link";
import { ChifPamMark } from "@/components/portal/ChifPamMark";
import { FcEmblem } from "@/components/portal/FcEmblem";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, SUPPORT_EMAIL } from "@/lib/site";
import { fontVars } from "./fc-career/manager/_ui/fonts";
import "./portal.css";

export const metadata: Metadata = {
  title: { absolute: "ChifPam : jeux en ligne, défis, marché P2P et FC Career 27" },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
};

/** Données structurées : l'organisation, le site et le jeu FC Career 27. */
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": `${SITE_URL}/#org`, name: SITE_NAME, url: SITE_URL, logo: `${SITE_URL}/icons/icon-192.png`, email: SUPPORT_EMAIL },
    { "@type": "WebSite", "@id": `${SITE_URL}/#site`, name: SITE_NAME, url: SITE_URL, inLanguage: "fr", publisher: { "@id": `${SITE_URL}/#org` }, description: SITE_DESCRIPTION },
    {
      "@type": "VideoGame", name: "FC Career 27", url: `${SITE_URL}/fc-career`, inLanguage: "fr", genre: ["Sport", "Simulation", "Football"],
      gamePlatform: "Navigateur web", applicationCategory: "Game", operatingSystem: "Web", publisher: { "@id": `${SITE_URL}/#org` },
      description: "Jeu de carrière de football : crée ton joueur ou dirige un club, matchs en direct, transferts, sélection nationale.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    },
  ],
};

const DOORS = [
  {
    href: "/accueil", key: "chifpam", mark: <ChifPamMark size={64} />, kicker: "Plateforme", title: "ChifPam",
    lead: "Jeux instantanés, défis quotidiens et marché P2P communautaire, dans un espace membre sécurisé.",
    points: ["Défis et classements entre membres", "Marché P2P avec transactions encadrées", "Support et aide intégrés"],
    meta: "Compte gratuit · 18 ans et plus", cta: "Entrer sur ChifPam",
  },
  {
    href: "/fc-career", key: "fc", mark: <FcEmblem size={56} />, kicker: "Jeu de football", title: "FC Career 27",
    lead: "Le mode carrière dans ton navigateur : crée ton joueur ou dirige un club, du premier contrat à la Coupe du monde.",
    points: ["Carrière Joueur et Carrière Manager", "Matchs en direct et moments clés à jouer", "Mercato, contrats et sélection nationale"],
    meta: "Gratuit · sans installation · code d'accès", cta: "Lancer FC Career 27",
  },
] as const;

/** Portail d'entrée : deux univers, ChifPam et FC Career 27. */
export default function PortalPage() {
  return (
    <div className={`portal ${fontVars}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="portal__bar">
        <Link href="/" className="portal__brand" aria-label="ChifPam, accueil">
          <ChifPamMark size={34} /><span>CHIF<b>PAM</b></span>
        </Link>
        <nav className="portal__nav" aria-label="Compte">
          <Link href="/connexion">Se connecter</Link>
          <Link href="/inscription" className="portal__nav-cta">Créer un compte</Link>
        </nav>
      </header>

      <main className="portal__main">
        <section className="portal__hero">
          <h1>Deux univers, une seule adresse.</h1>
          <p>ChifPam rassemble une plateforme de jeux et d&apos;échanges entre membres, et FC Career 27, un jeu de carrière de football gratuit. Choisis par où commencer.</p>
        </section>

        <div className="portal__doors">
          {DOORS.map(d => (
            <Link key={d.key} href={d.href} className={`portal__door portal__door--${d.key}`}>
              <span className="portal__door-head">
                <span className="portal__mark" aria-hidden="true">{d.mark}</span>
                <span>
                  <span className="portal__kicker">{d.kicker}</span>
                  <span className="portal__name">{d.title}</span>
                </span>
              </span>
              <span className="portal__lead">{d.lead}</span>
              <ul className="portal__points">{d.points.map(p => <li key={p}>{p}</li>)}</ul>
              <span className="portal__foot">
                <span className="portal__meta">{d.meta}</span>
                <span className="portal__cta">{d.cta}<span aria-hidden="true"> ›</span></span>
              </span>
            </Link>
          ))}
        </div>

        <ul className="portal__trust" aria-label="Engagements">
          <li><b>Accès sécurisés</b>Espaces protégés par compte et par rôle.</li>
          <li><b>Jeu responsable</b>Fonctionnalités adultes réservées aux 18 ans et plus.</li>
          <li><b>Support réactif</b>Une question ? <span className="portal__mail">{SUPPORT_EMAIL}</span></li>
        </ul>
      </main>

      <footer className="portal__footer">
        <span>© {new Date().getFullYear()} ChifPam</span>
        <nav aria-label="Informations légales">
          <Link href="/legal/conditions">Conditions d&apos;utilisation</Link>
          <Link href="/legal/confidentialite">Confidentialité</Link>
          <Link href="/legal/mention-legales">Mentions légales</Link>
        </nav>
      </footer>
    </div>
  );
}
