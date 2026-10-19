import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Mentions légales de ChifPam : éditeur, hébergement et contact.",
  alternates: { canonical: "/legal/mention-legales" },
  openGraph: { title: "Mentions légales · ChifPam", description: "Mentions légales de ChifPam : éditeur, hébergement et contact.", url: "/legal/mention-legales" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
