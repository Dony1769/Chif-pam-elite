import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Créer un compte",
  description: "Créez gratuitement votre compte ChifPam : jeux en ligne, défis communautaires et marché P2P encadré. Réservé aux 18 ans et plus pour certaines fonctionnalités.",
  alternates: { canonical: "/inscription" },
  openGraph: { title: "Créer un compte · ChifPam", description: "Créez gratuitement votre compte ChifPam : jeux en ligne, défis communautaires et marché P2P encadré. Réservé aux 18 ans et plus pour certaines fonctionnalités.", url: "/inscription" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
