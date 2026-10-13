import type { Metadata } from "next";
import { GameProvider } from "./lib/context";
import { Shell } from "./lib/components";
import "./carriere.css";

// Font variables définies dans carriere.css (system fallback, pas de Google Fonts au build).

export const metadata: Metadata = {
  title: "FC Career · Ma carrière",
  description: "Construisez votre carrière de footballeur : entraînements, matchs, progression et contrats.",
};

export default function CarriereLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fcl-fonts">
      <GameProvider>
        <Shell>{children}</Shell>
      </GameProvider>
    </div>
  );
}
