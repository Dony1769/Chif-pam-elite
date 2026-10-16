import type { Metadata } from "next";
import Link from "next/link";
import { ChifPamMark } from "@/components/portal/ChifPamMark";
import { FcEmblem } from "@/components/portal/FcEmblem";
import "./portal.css";

export const metadata: Metadata = {
  title: "ChifPam · FC Career 27",
  description: "Choisis ton entrée : la plateforme ChifPam ou le jeu FC Career 27.",
};

/** Portail : deux portes, la plateforme ChifPam et le jeu FC Career 27 (indépendant). */
export default function PortalPage() {
  return (
    <main className="portal">
      <h1 className="portal__title">Où vas-tu ?</h1>
      <div className="portal__doors">
        <Link href="/accueil" className="portal__door portal__door--chifpam" aria-label="Entrer sur ChifPam">
          <span className="portal__glow" aria-hidden="true" />
          <span className="portal__logo"><ChifPamMark size={150} /></span>
          <span className="portal__name">CHIF<b>PAM</b></span>
          <span className="portal__desc">Jeux, défis et marché P2P · compte requis</span>
          <span className="portal__cta">Entrer sur ChifPam</span>
        </Link>
        <Link href="/fc-career" className="portal__door portal__door--fc" aria-label="Entrer dans FC Career 27">
          <span className="portal__glow" aria-hidden="true" />
          <span className="portal__logo"><FcEmblem size={140} /></span>
          <span className="portal__name">FC CAREER <b>27</b></span>
          <span className="portal__desc">Carrière Joueur et Manager · code d&apos;accès</span>
          <span className="portal__cta">Lancer le jeu</span>
        </Link>
      </div>
    </main>
  );
}
