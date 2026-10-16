import { GameProvider }  from "../game/state/GameProvider";
import { ToastProvider } from "../game/components/Toast";
import { GameShell }    from "../game/components/GameShell";
import type { ReactNode } from "react";

export default function SeasonEndLayout({ children }: { children: ReactNode }) {
  return (
    <GameProvider>
      <ToastProvider>
        <GameShell>
          {children}
        </GameShell>
      </ToastProvider>
    </GameProvider>
  );
}
