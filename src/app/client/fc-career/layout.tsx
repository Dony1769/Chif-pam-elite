import type { Metadata } from "next";
import FcCareerGuard from "./components/FcCareerGuard";
import "./fc-career.css";

export const metadata: Metadata = {
  title: "FC Career - Ma carriere",
  description: "Construisez votre carriere de footballeur.",
};

export default function FcCareerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fcl-fonts">
      <FcCareerGuard>{children}</FcCareerGuard>
    </div>
  );
}
