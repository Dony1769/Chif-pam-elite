import type { Metadata, Viewport } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import Script from "next/script";
import PWARegister from "@/components/PWARegister";
import WebVitalsReporter from "@/components/WebVitalsReporter";
import { SpeedInsights } from "@vercel/speed-insights/next";
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

        {/* Google AdSense account verification */}
        <meta
          name="google-adsense-account"
          content="ca-pub-5900590603770169"
        />

        {/* ExoClick verification */}
        <meta
          name="6a97888e-site-verification"
          content="5e81fa45aafa6f5cc66cc432be3668ca"
        />

      </head>

      <body className={`${spaceGrotesk.variable} ${ibmMono.variable} antialiased`}>
        <Script
          id="adsense-script"
          strategy="lazyOnload"
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5900590603770169"
          crossOrigin="anonymous"
        />
        {/* Monetag retiré d'ici pour éviter le spam */}
        
        <PWARegister propeller={true} />
        <WebVitalsReporter />
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
