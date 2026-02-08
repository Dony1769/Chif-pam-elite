import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import PWARegister from "@/components/PWARegister";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Chif Pam",
  description: "Plateforme sécurisée",
  manifest: "/manifest.json",
};

export const viewport: Viewport = { themeColor: "#10B981" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <meta
          name="google-site-verification"
          content="0DKoujhMc_f-hx6jkLpCVG5DC1apsfHK8VtM-do5Mf0"
        />
        {/* ExoClick verification */}
  <meta
    name="6a97888e-site-verification"
    content="5e81fa45aafa6f5cc66cc432be3668ca"
  />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* PWARegister global si tu veux juste Propeller */}
        <PWARegister propeller={true} />
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
