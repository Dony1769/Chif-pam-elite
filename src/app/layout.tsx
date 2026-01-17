import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

// CORRECTION : Le themeColor doit être dans viewport maintenant
export const viewport: Viewport = {
  themeColor: "#10B981",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // SUPPRESSION DU CODE JS ICI. C'est le rôle de PWARegister.
  
  return (
    <html lang="fr">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <PWARegister />
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
