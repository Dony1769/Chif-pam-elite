import type { Metadata } from "next";
import { Club } from "../lib/components";

export const metadata: Metadata = { title: "Club et contrats · FC Career", description: "Gérez votre salaire, votre solde et les offres de transfert." };

export default function Page() {
  return <Club />;
}
