import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Comment ChifPam collecte, utilise et protège vos données personnelles, et comment exercer vos droits.",
  alternates: { canonical: "/legal/confidentialite" },
  openGraph: { title: "Politique de confidentialité · ChifPam", description: "Comment ChifPam collecte, utilise et protège vos données personnelles, et comment exercer vos droits.", url: "/legal/confidentialite" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
