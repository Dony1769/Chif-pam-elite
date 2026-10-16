/**
 * FC CAREER — Formateurs d'affichage
 * Fonctions pures, sans dépendances navigateur.
 */

/** Formate un montant en euros compact : 1 500 000 → "1,5M€" */
export function formatMoney(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1).replace(".0", "")}M€`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(0)}K€`;
  return `${sign}${abs}€`;
}

/** Formate une note de match : 7.5 → "7.5" */
export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

/** Formate un pourcentage : 0.756 → "76%" */
export function formatPct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/** Formate un âge : 17 → "17 ans" */
export function formatAge(age: number): string {
  return `${age} an${age > 1 ? "s" : ""}`;
}

/** Formate une durée en minutes : 90 → "90'" */
export function formatMinute(minute: number): string {
  return `${minute}'`;
}

/** Formate un salaire hebdomadaire */
export function formatWage(weeklyWage: number): string {
  return `${formatMoney(weeklyWage)}/sem`;
}

/** Initiales d'un club : "FC Athènes" → "FCA" */
export function clubInitials(name: string, max = 3): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, max);
}

/** Formate une note globale avec couleur sémantique */
export function overallTier(overall: number): "elite" | "high" | "mid" | "low" {
  if (overall >= 85) return "elite";
  if (overall >= 72) return "high";
  if (overall >= 60) return "mid";
  return "low";
}
