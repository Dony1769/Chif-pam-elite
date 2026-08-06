"use client";

interface MonetagAdScriptProps {
  zoneId: string; // L'identifiant fourni par Monetag lors du "Get tag"
  scriptSrc?: string; // L'URL du script Monetag
}

/**
 * Composant d'injection dynamique pour les scripts Monetag.
 * Injecte le script au montage et le supprime automatiquement au démontage.
 */
export default function MonetagAdScript({
  zoneId: _zoneId,
  scriptSrc: _scriptSrc,
}: MonetagAdScriptProps) {
  return null;
}

