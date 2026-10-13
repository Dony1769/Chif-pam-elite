import type { Metadata } from "next";
import { Training } from "../lib/components";

export const metadata: Metadata = { title: "Entraînement · FC Career", description: "Choisissez votre session et progressez en gérant votre fatigue." };

export default function Page() {
  return <Training />;
}
