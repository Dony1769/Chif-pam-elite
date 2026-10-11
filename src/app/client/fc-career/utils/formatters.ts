/**
 * FC CAREER — Formatters : nombres, argent, dates, notes
 */

const eur = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const eurCompact = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatMoney(amount: number): string {
  return eur.format(amount);
}

/** 12 500 000 -> "12,5 M€" (idéal pour les cartes). */
export function formatMoneyCompact(amount: number): string {
  return eurCompact.format(amount);
}

export function formatSalaryWeekly(amount: number): string {
  return `${formatMoneyCompact(amount)} / sem.`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

/** "J12 · Dim. 17h" */
export function formatMatchDay(dayNumber: number, iso?: string): string {
  const d = iso ? ` · ${new Date(iso).toLocaleDateString("fr-FR", { weekday: "short" })}` : "";
  return `J${dayNumber}${d}`;
}

export function formatRating(rating: number): string {
  if (!rating) return "—";
  return rating.toFixed(1).replace(".", ",");
}

export function formatPercent(value: number, digits = 0): string {
  return `${value.toFixed(digits).replace(".", ",")} %`;
}

export function formatMinutes(mins: number): string {
  if (mins <= 0) return "Non utilisé";
  return `${mins}'`;
}

/** Âge lisible à partir de la date de naissance. */
export function ageLabel(birthISO: string): string {
  const years = Math.floor((Date.now() - new Date(birthISO).getTime()) / (365.25 * 24 * 3600 * 1000));
  return `${years} ans`;
}

/** Couleur associée à une note (design system). */
export function ratingColor(rating: number): string {
  if (rating >= 8) return "var(--fc-rating-elite)";
  if (rating >= 7) return "var(--fc-rating-good)";
  if (rating >= 6) return "var(--fc-rating-ok)";
  if (rating > 0) return "var(--fc-rating-bad)";
  return "var(--fc-text-muted)";
}
