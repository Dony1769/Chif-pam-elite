import type { Metadata } from "next";
import { fontVars } from "../manager/_ui/fonts";
import { PlayerProvider } from "./_ui/PlayerContext";
import { PlayerShell } from "./_ui/PlayerShell";
import "../manager/manager.css";
import "../manager/motion3d.css";
import "./joueur.css";

export const metadata: Metadata = {
  title: "FC Career 27 - Carrière Joueur",
  description: "Crée ton joueur, gagne ta place, deviens une légende.",
};

export default function JoueurLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={fontVars}>
    <PlayerProvider>
      <PlayerShell>{children}</PlayerShell>
    </PlayerProvider>
    </div>
  );
}
