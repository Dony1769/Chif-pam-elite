"use client";

interface SkeletonProps {
  variant?: "text" | "title" | "custom";
  width?: string;
  height?: string;
  className?: string;
}

export function Skeleton({ variant = "text", width, height, className = "" }: SkeletonProps) {
  const base = `fc-skeleton${variant !== "custom" ? ` fc-skeleton--${variant}` : ""}`;
  return (
    <div
      className={`${base} ${className}`.trim()}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

/** Squelette d'une page complète */
export function PageSkeleton() {
  return (
    <div className="fc-page" aria-busy="true" aria-label="Chargement…">
      <div className="fc-page-header">
        <Skeleton variant="title" />
        <div style={{ marginTop: "var(--fc-space-2)" }}><Skeleton variant="text" width="40%" /></div>
      </div>
      <div className="fc-panel" style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-3)" }}>
        <Skeleton variant="text" />
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="text" width="60%" />
      </div>
    </div>
  );
}

/** Spinner centré */
export function Spinner({ size = 28, color = "var(--fc-emerald)" }: { size?: number; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--fc-space-7)" }}>
      <svg
        width={size} height={size} viewBox="0 0 24 24"
        fill="none" aria-label="Chargement…"
        style={{ animation: "fc-spin 0.7s linear infinite" }}
      >
        <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2.5" strokeLinecap="round"
          strokeDasharray="44" strokeDashoffset="14" opacity="0.8" />
        <style>{`@keyframes fc-spin { to { transform: rotate(360deg); } }`}</style>
      </svg>
    </div>
  );
}
