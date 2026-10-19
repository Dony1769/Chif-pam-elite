import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions d'utilisation",
  description: "Conditions générales d'utilisation de la plateforme ChifPam : éligibilité, fair-play, unité virtuelle CP, paiements et retraits.",
  alternates: { canonical: "/legal/conditions" },
  openGraph: { title: "Conditions d'utilisation · ChifPam", description: "Conditions générales d'utilisation de la plateforme ChifPam : éligibilité, fair-play, unité virtuelle CP, paiements et retraits.", url: "/legal/conditions" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
