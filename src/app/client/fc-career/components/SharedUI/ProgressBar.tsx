/**
 * FC CAREER — SharedUI : barre de progression animée (fatigue, forme, potentiel).
 * Transition smooth CSS (600 ms ease-out) + couleur selon le seuil.
 */

"use client";

interface ProgressBarProps {
  /** Valeur 0-100 (ou 0-max). */
  value: number;
  max?: number;
  /** Libellé affiché à gauche (optionnel). */
  label?: string;
  /** Affiche la valeur numérique à droite (défaut : true). */
  showValue?: boolean;
  /** Palette : "default" (emerald), "fatigue" (vert→rouge), "danger". */
  tone?: "default" | "fatigue" | "danger" | "info";
  className?: string;
  height?: "sm" | "md" | "lg";
}

const HEIGHTS = { sm: "h-1.5", md: "h-2.5", lg: "h-4" } as const;

function fatigueColor(pct: number): string {
  if (pct < 40) return "bg-emerald-500";
  if (pct < 70) return "bg-amber-400";
  return "bg-rose-500";
}

function barClass(tone: ProgressBarProps["tone"], pct: number): string {
  switch (tone) {
    case "fatigue":
      return fatigueColor(pct);
    case "danger":
      return "bg-rose-500";
    case "info":
      return "bg-sky-400";
    default:
      return "bg-gradient-to-r from-emerald-500 to-teal-400";
  }
}

export default function ProgressBar({
  value,
  max = 100,
  label,
  showValue = true,
  tone = "default",
  className,
  height = "md",
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          <span>{label}</span>
          {showValue && <span className="tabular-nums text-slate-200">{Math.round(pct)}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        className={`w-full overflow-hidden rounded-full bg-white/10 ${HEIGHTS[height]}`}
      >
        <div
          className={`${HEIGHTS[height]} rounded-full transition-all duration-600 ease-out ${barClass(tone, pct)}`}
          style={{ width: `${pct}%`, transitionDuration: "600ms", transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
        />
      </div>
    </div>
  );
}
