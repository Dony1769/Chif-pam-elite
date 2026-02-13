"use client";
import { useEffect } from 'react';

export default function MonetagPopunder() {
  useEffect(() => {
    // Vérification pour éviter les doublons
    const existingScript = document.querySelector('script[data-zone="10606214"]');
    if (existingScript) return;

    // Création du script Monetag
    const script = document.createElement('script');
    script.dataset.zone = '10606214';
    script.src = 'https://al5sm.com/tag.min.js';
    script.async = true;

    // Injection (logique originale du script adaptée)
    // Cela l'ajoute au <body> ou <documentElement>
    (document.documentElement || document.body).appendChild(script);

    return () => {
      // Nettoyage optionnel si on quitte la page
      try {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      } catch (e) {
        // Ignorer erreur de nettoyage
      }
    };
  }, []);

  return null; // Ce composant est invisible
}
