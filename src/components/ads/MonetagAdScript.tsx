"use client";

import { useEffect } from "react";

interface MonetagAdScriptProps {
  zoneId: string; // L'identifiant fourni par Monetag lors du "Get tag"
  scriptSrc?: string; // L'URL du script Monetag
}

/**
 * Composant d'injection dynamique pour les scripts Monetag.
 * Injecte le script au montage et le supprime automatiquement au démontage.
 */
export default function MonetagAdScript({
  zoneId,
  scriptSrc = "https://nap5k.com/tag.min.js",
}: MonetagAdScriptProps) {
  useEffect(() => {
    // 1. Création de la balise script
    const script = document.createElement("script");
    script.dataset.zone = zoneId;
    script.src = scriptSrc;
    script.async = true;

    // 2. Ajout au DOM
    const targetElement = document.body || document.documentElement;
    targetElement.appendChild(script);

    // 3. Nettoyage strict dès que l'utilisateur quitte la page de jeu
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [zoneId, scriptSrc]);

  return null; // Ce composant n'affiche pas d'élément HTML visible directement
}

