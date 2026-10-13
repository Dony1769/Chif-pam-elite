import type { Metadata } from "next";
import { MatchCenter } from "../lib/components";

export const metadata: Metadata = { title: "Centre de match · FC Career", description: "Disputez vos rencontres avec une simulation en direct." };

export default function Page() {
  return <MatchCenter />;
}
