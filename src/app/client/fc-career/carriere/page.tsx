import type { Metadata } from "next";
import { Dashboard } from "./lib/components";

export const metadata: Metadata = { title: "Ma carrière · FC Career", description: "Construisez votre carrière de footballeur jour après jour." };

export default function Page() {
  return <Dashboard />;
}
