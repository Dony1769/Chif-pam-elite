import type { Metadata, Viewport } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import PWARegister from "@/components/PWARegister";
import WebVitalsReporter from "@/components/WebVitalsReporter";
import UISoundEffects from "@/components/ui/UISoundEffects";
import GlobalPageLoader from "@/components/ui/GlobalPageLoader";
import { AppFeedbackProvider } from "@/components/ui/AppFeedbackProvider";
import { SpeedInsights } from "@vercel/speed-insights/next";
import ThreeSurface from "@/components/three/ThreeSurface";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});
const ibmMono = IBM_Plex_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "Chif Pam",
  description: "Plateforme sécurisée",
  manifest: "/manifest.json",
};

export const viewport: Viewport = { themeColor: "#6EE7C8" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        {/* Google Search Console */}
        <meta
          name="google-site-verification"
          content="0DKoujhMc_f-hx6jkLpCVG5DC1apsfHK8VtM-do5Mf0"
        />

      </head>

      <body className={`${spaceGrotesk.variable} ${ibmMono.variable} antialiased`}>
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
