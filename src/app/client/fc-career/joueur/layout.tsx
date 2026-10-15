import type { Metadata } from "next";
import { PlayerProvider } from "./_ui/PlayerContext";
import { PlayerShell } from "./_ui/PlayerShell";
import "../manager/manager.css";
import "./joueur.css";

export const metadata: Metadata = {
  title: "FC Career 27 - Carrière Joueur",
  description: "Crée ton joueur, gagne ta place, deviens une légende.",
};

export default function JoueurLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlayerProvider>
      <PlayerShell>{children}</PlayerShell>
    </PlayerProvider>
  );
}
