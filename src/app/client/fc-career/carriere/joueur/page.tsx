import type { Metadata } from "next";
import { Profile } from "../lib/components";

export const metadata: Metadata = { title: "Mon joueur · FC Career", description: "Consultez les 51 attributs, le potentiel et l’histoire de votre joueur." };

export default function Page() {
  return <Profile />;
}
