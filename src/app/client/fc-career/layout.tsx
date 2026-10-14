import type { Metadata } from "next";
import FcCareerGuard from "./components/FcCareerGuard";
import "./fc-career.css";
import "./game/design/design-vars.css";
import "./game/design/game.css";

export const metadata: Metadata = {
  title: "FC Career - Ma carriere",
  description: "Construisez votre carriere de footballeur.",
};

export default function FcCareerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Polices FC Career */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="preconnect"
        href="https://fonts.googleapis.com"
      />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,400;0,600;0,700;0,800;1,700;1,800&family=Inter:wght@400;500;600&display=swap"
        rel="stylesheet"
      />
      <div className="fcl-fonts">
        <FcCareerGuard>{children}</FcCareerGuard>
      </div>
    </>
  );
}
