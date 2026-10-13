import type { Metadata } from "next";
import { Barlow, Manrope } from "next/font/google";
import { GameProvider } from "./lib/context";
import { Shell } from "./lib/components";
import "./carriere.css";

const display = Barlow({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--fcl-display" });
const body = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--fcl-body" });

export const metadata: Metadata = {
  title: "FC Career · Ma carrière",
  description: "Construisez votre carrière de footballeur : entraînements, matchs, progression et contrats.",
};

export default function CarriereLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${display.variable} ${body.variable}`}>
      <GameProvider>
        <Shell>{children}</Shell>
      </GameProvider>
    </div>
  );
}
