import type { Metadata } from "next";
import { fontVars } from "./_ui/fonts";
import { ManagerProvider } from "./_ui/ManagerContext";
import { Shell } from "./_ui/Shell";
import "./manager.css";
import "./motion3d.css";
import "./cinematics.css";

export const metadata: Metadata = {
  title: "FC Career 27 - Carrière Manager",
  description: "Dirigez un club : tactique, mercato, finances, stade.",
};

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={fontVars}>
    <ManagerProvider>
      <Shell>{children}</Shell>
    </ManagerProvider>
    </div>
  );
}
