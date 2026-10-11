/**
 * FC CAREER — Garde de session (verrou PIN)
 *
 * Enveloppe les pages protégées : si la session n'a pas le marqueur
 * `sessionStorage` (PIN validé), on redirige vers l'écran du code.
 * Aucune vérification côté serveur => aucun blocage / aucune demande
 * d'autorisation sur Vercel, et le rendu est identique au client et au
 * serveur (pas d'erreur d'hydratation).
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isSessionUnlocked } from "../utils/session";

export default function FcCareerGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (isSessionUnlocked()) {
      setAuthorized(true);
    } else {
      router.replace("/client/fc-career");
    }
    setChecking(false);
  }, [router]);

  if (checking || !authorized) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#020617] text-slate-400">
        <p className="text-sm">Vérification du code d&apos;accès…</p>
      </main>
    );
  }

  return <>{children}</>;
}
