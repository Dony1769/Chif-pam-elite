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
import { usePathname, useRouter } from "next/navigation";
import { isSessionUnlocked } from "../utils/session";

/** Chemin de l'écran du code PIN (non protégé). */
const PIN_SCREEN_PATH = "/client/fc-career";

export default function FcCareerGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  // Le garde s'exécute aussi sur l'écran du PIN : il ne doit JAMAIS
  // intercepter ni verrouiller cette page (sinon écran « Vérification du
  // code d'accès… » à la place du formulaire, et boucle infinie).
  const isPinScreen = pathname === PIN_SCREEN_PATH;

  useEffect(() => {
    if (isPinScreen) {
      setAuthorized(true);
      setChecking(false);
      return;
    }
    if (isSessionUnlocked()) {
      setAuthorized(true);
    } else {
      // Jamais déverrouillé dans cet onglet -> on renvoie vers l'écran du code.
      router.replace(PIN_SCREEN_PATH);
    }
    setChecking(false);
  }, [router, isPinScreen]);

  if (isPinScreen) return <>{children}</>;

  if (checking || !authorized) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#020617] text-slate-400">
        <p className="text-sm">Vérification du code d&apos;accès…</p>
      </main>
    );
  }

  return <>{children}</>;
}
