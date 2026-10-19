import type { Metadata } from "next";
import Link from "next/link";
import FcCareerGuard from "./components/FcCareerGuard";
import "./fc-career.css";
import "./game/design/design-vars.css";
import "./game/design/game.css";

export const metadata: Metadata = {
  title: { default: "FC Career 27 : jeu de carrière de football gratuit", template: "%s · FC Career 27" },
  description: "FC Career 27 : crée ton joueur ou dirige un club. Matchs en direct, transferts, contrats, sélection nationale, Euro et Coupe du monde. Gratuit, dans le navigateur, sans installation.",
  keywords: ["FC Career 27", "jeu de football", "mode carrière", "carrière joueur", "carrière manager", "jeu de foot gratuit", "football manager navigateur"],
  alternates: { canonical: "/fc-career" },
  openGraph: { title: "FC Career 27 : jeu de carrière de football", description: "Crée ton joueur ou dirige un club : matchs en direct, mercato, sélection nationale. Gratuit dans le navigateur.", url: "/fc-career" },
};

export default function FcCareerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Polices FC Career */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="preconnect"
        href="https://fonts.googleapis.com"
      />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,400;0,600;0,700;0,800;1,700;1,800&family=Inter:wght@400;500;600&display=swap"
        rel="stylesheet"
      />
      <div className="fcl-fonts">
        {/* Retour à l'accueil du site (les modes v2 ont le leur dans leur barre) */}
        <Link href="/" className="fcl-home" aria-label="Retour au portail">‹ Accueil</Link>
        <FcCareerGuard>{children}</FcCareerGuard>
      </div>
    </>
  );
}
