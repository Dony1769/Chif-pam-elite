"use client";

/** FC CAREER 27 — Mode Manager : petits composants d'interface partagés. */

import React from "react";
import type { Club } from "../../game/domain/club";
import type { WorldPlayer } from "../../game/data/worldPlayers";
import { fullName, shortName } from "../../game/utils/names";

/** Écusson aux couleurs du club (fictif, généré). */
export function Crest({ club, size = 36 }: { club: Pick<Club, "shortName" | "colors"> | undefined; size?: number }) {
  if (!club) return <span style={{ width: size, height: size, display: "inline-block" }} />;
  const { primary, secondary } = club.colors;
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 40 46" role="img" aria-label={club.shortName} className="mg-crest">
      <path d="M20 1 L38 7 V22 C38 34 30 41 20 45 C10 41 2 34 2 22 V7 Z" fill={primary} stroke={secondary} strokeWidth="2" />
      <path d="M2 22 C2 34 10 41 20 45 V7 L2 7 Z" fill={secondary} opacity="0.18" />
      <text x="20" y="27" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontWeight="800" fontSize="10.5" fill={secondary}>
        {club.shortName}
      </text>
    </svg>
  );
}

const POS_LINE: Record<string, "gk" | "def" | "mid" | "att"> = {
  GK: "gk", CB: "def", LB: "def", RB: "def", DM: "mid", CM: "mid", AM: "mid", LW: "att", RW: "att", ST: "att",
};
export const POS_FR: Record<string, string> = {
  GK: "G", CB: "DC", LB: "DG", RB: "DD", DM: "MDC", CM: "MC", AM: "MOC", LW: "AG", RW: "AD", ST: "BU",
};

export function Pos({ pos }: { pos: string }) {
  return <span className={`mg-pos mg-pos--${POS_LINE[pos] ?? "mid"}`}>{POS_FR[pos] ?? pos}</span>;
}

/** Note OVR colorée par paliers. */
export function Ovr({ value, small }: { value: number | [number, number]; small?: boolean }) {
  const v = Array.isArray(value) ? (value[0] + value[1]) / 2 : value;
  const tier = v >= 75 ? "elite" : v >= 65 ? "good" : v >= 55 ? "ok" : "low";
  return (
    <span className={`mg-ovr mg-ovr--${tier}${small ? " mg-ovr--sm" : ""}`}>
      {Array.isArray(value) ? `${value[0]}-${value[1]}` : value}
    </span>
  );
}

/** Jauge horizontale 0-100. */
export function Meter({ value, tone = "auto", label }: { value: number; tone?: "auto" | "gold" | "green" | "red"; label?: string }) {
  const t = tone === "auto" ? (value >= 60 ? "green" : value >= 35 ? "gold" : "red") : tone;
  return (
    <span className="mg-meter" role="meter" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <span className={`mg-meter__fill mg-meter__fill--${t}`} style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
    </span>
  );
}

export function playerName(p: Pick<WorldPlayer, "firstName" | "lastName">, short = false) {
  return short ? `${shortName(p)}` : `${fullName(p)}`;
}

export function Section({ title, aside, children, className }: { title?: string; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`mg-card${className ? ` ${className}` : ""}`}>
      {(title || aside) && (
        <header className="mg-card__head">
          {title && <h2>{title}</h2>}
          {aside}
        </header>
      )}
      {children}
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="mg-empty">{children}</p>;
}

/** Champ numérique en euros (milliers). */
export function MoneyInput({ value, onChange, step = 10_000, label, id }: { value: number; onChange: (v: number) => void; step?: number; label: string; id: string }) {
  return (
    <label className="mg-field" htmlFor={id}>
      <span>{label}</span>
      <input id={id} type="number" inputMode="numeric" min={0} step={step} value={Number.isFinite(value) ? value : 0}
        onChange={e => onChange(Math.max(0, Math.round(Number(e.target.value) || 0)))} />
    </label>
  );
}
