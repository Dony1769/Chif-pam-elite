import type { Metadata } from "next";
import { ManagerProvider } from "./_ui/ManagerContext";
import { Shell } from "./_ui/Shell";
import "./manager.css";

export const metadata: Metadata = {
  title: "FC Career 27 - Carrière Manager",
  description: "Dirigez un club : tactique, mercato, finances, stade.",
};

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <ManagerProvider>
      <Shell>{children}</Shell>
    </ManagerProvider>
  );
}
