import type { Metadata } from "next";
import { Season } from "../lib/components";

export const metadata: Metadata = { title: "Ma saison · FC Career", description: "Suivez le calendrier de vos 48 matchs et vos résultats." };

export default function Page() {
  return <Season />;
}
