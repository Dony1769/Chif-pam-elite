import type { Metadata, Viewport } from "next";
import PWARegister from "@/components/PWARegister";
import WebVitalsReporter from "@/components/WebVitalsReporter";
import UISoundEffects from "@/components/ui/UISoundEffects";
import GlobalPageLoader from "@/components/ui/GlobalPageLoader";
import { AppFeedbackProvider } from "@/components/ui/AppFeedbackProvider";
import { SpeedInsights } from "@vercel/speed-insights/next";
import ThreeSurface from "@/components/three/ThreeSurface";
import "./globals.css";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "ChifPam : jeux en ligne, défis et FC Career 27", template: "%s · ChifPam" },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ["ChifPam", "Chif Pam", "jeux en ligne", "défis", "marché P2P", "FC Career 27", "jeu de football", "carrière joueur", "carrière manager", "Haïti"],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  manifest: "/manifest.json",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website", siteName: SITE_NAME, locale: "fr_FR", url: "/",
    title: "ChifPam : jeux en ligne, défis et FC Career 27", description: SITE_DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: "ChifPam : jeux en ligne, défis et FC Career 27", description: SITE_DESCRIPTION },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  icons: { icon: [{ url: "/favicon.ico" }, { url: "/icons/icon.svg", type: "image/svg+xml" }], apple: "/icons/icon-192.png" },
  // Google Search Console (même balise qu'avant, générée par Next)
  verification: { google: "0DKoujhMc_f-hx6jkLpCVG5DC1apsfHK8VtM-do5Mf0" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: "#06110f", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">

      <body className="antialiased">
        <ThreeSurface variant="ambient" className="fixed z-0 opacity-25" />
        <PWARegister />
        <WebVitalsReporter />
        <UISoundEffects />
        <GlobalPageLoader />
        <AppFeedbackProvider>{children}</AppFeedbackProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
