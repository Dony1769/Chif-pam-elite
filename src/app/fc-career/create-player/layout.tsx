import { GameProvider } from "../game/state/GameProvider";
import { ToastProvider } from "../game/components/Toast";
import type { ReactNode } from "react";

export default function CreatePlayerLayout({ children }: { children: ReactNode }) {
  return (
    <GameProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </GameProvider>
  );
}
