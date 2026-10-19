/**
 * Identité publique du site pour le référencement (Search Console, partage,
 * annonces). L'URL canonique vient de NEXT_PUBLIC_SITE_URL, sinon le domaine
 * de production.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://chifpam.com").replace(/\/+$/, "");
export const SITE_NAME = "ChifPam";
export const SITE_DESCRIPTION =
  "ChifPam réunit des jeux en ligne, des défis communautaires et un marché P2P encadré, ainsi que FC Career 27, un jeu de carrière de football gratuit dans le navigateur.";
export const SUPPORT_EMAIL = "support@chifpam.com";

/** Pages publiques indexables (les espaces membres et le jeu après le code restent privés). */
export const PUBLIC_ROUTES: { path: string; priority: number; freq: "daily" | "weekly" | "monthly" | "yearly" }[] = [
  { path: "/", priority: 1, freq: "weekly" },
  { path: "/accueil", priority: 0.9, freq: "weekly" },
  { path: "/fc-career", priority: 0.9, freq: "weekly" },
  { path: "/inscription", priority: 0.7, freq: "monthly" },
  { path: "/connexion", priority: 0.5, freq: "monthly" },
  { path: "/legal/conditions", priority: 0.3, freq: "yearly" },
  { path: "/legal/confidentialite", priority: 0.3, freq: "yearly" },
  { path: "/legal/mention-legales", priority: 0.3, freq: "yearly" },
];

/** Zones privées : jamais indexées. */
export const PRIVATE_PREFIXES = ["/client", "/admin-chif-pam", "/agent", "/api", "/auth", "/live"];
export const FC_PRIVATE = ["/fc-career/joueur", "/fc-career/manager", "/fc-career/modes", "/fc-career/reglages", "/fc-career/world", "/fc-career/legacy", "/fc-career/design-demo"];

/** Compte éditeur Google AdSense (même identifiant que ads.txt). */
export const ADSENSE_CLIENT = "ca-pub-5900590603770169";
