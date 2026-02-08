import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import PWARegister from "@/components/PWARegister";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chif Pam",
  description: "Plateforme sécurisée",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#10B981",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <meta
          name="google-site-verification"
          content="0DKoujhMc_f-hx6jkLpCVG5DC1apsfHK8VtM-do5Mf0"
        />

        {/* 🔔 Propeller Push Script */}
        <Script
          src="https://5gvci.com/act/files/tag.min.js?z=10584237"
          strategy="afterInteractive"
        />

        {/* 💰 MultiTag Luminous Script */}
        <Script
          src="https://quge5.com/88/tag.min.js"
          data-zone="209451"
          strategy="afterInteractive"
        />
      </head>

      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <PWARegister />
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
