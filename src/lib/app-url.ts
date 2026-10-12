// Résolution de l'URL publique de l'app, sans jamais bloquer le build :
// 1. NEXT_PUBLIC_SITE_URL si définie (recommandé sur Vercel)
// 2. VERCEL_PROJECT_PRODUCTION_URL / VERCEL_URL en build/déploiement Vercel
// 3. window.location.origin côté navigateur
// 4. repli local http://localhost:3000
function resolveSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured;

  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return 'http://localhost:3000';
}

export function getAppUrl(): string {
  return resolveSiteUrl().replace(/\/+$/, '');
}

export const appUrl = getAppUrl();
