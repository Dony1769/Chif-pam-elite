import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connectez-vous à votre espace ChifPam pour retrouver vos jeux, vos défis et vos échanges P2P.",
  alternates: { canonical: "/connexion" },
  openGraph: { title: "Connexion · ChifPam", description: "Connectez-vous à votre espace ChifPam pour retrouver vos jeux, vos défis et vos échanges P2P.", url: "/connexion" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
