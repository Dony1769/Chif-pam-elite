/**
 * FC CAREER 27 — Portrait SVG déterministe d'un joueur : teint, coupe,
 * barbe tirés de son identifiant, maillot aux couleurs de son club.
 */

import React from "react";

const SKIN = ["#f6d7c3", "#eac0a0", "#d9a27c", "#c18560", "#9c6644", "#7a4b2f", "#5b3720"];
const HAIR = ["#1d1611", "#3b2a1e", "#6b4a2b", "#a8763e", "#d9b26a", "#8a8a8a", "#b4472e"];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function Avatar({ id, kit = "#2b5d9b", trim = "#ffffff", size = 48, age, label }: { id: string; kit?: string; trim?: string; size?: number; age?: number; label?: string }) {
  const h = hash(id);
  const pick = <T,>(a: T[], shift: number) => a[(h >>> shift) % a.length];
  const skin = pick(SKIN, 0);
  const hair = age && age >= 34 && (h >>> 20) % 3 === 0 ? "#9a9a9a" : pick(HAIR, 4);
  const style = (h >>> 8) % 5; // 0 ras, 1 court, 2 mèche, 3 boucles, 4 chignon
  const beard = (h >>> 12) % 4 === 0 || (age !== undefined && age > 26 && (h >>> 12) % 3 === 0);
  const brow = (h >>> 16) % 3;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={label ?? "Portrait"} className="mg-avatar">
      <rect width="64" height="64" rx="10" fill="var(--mg-avatar-bg, #e8ece4)" />
      {/* Maillot */}
      <path d="M8 64c2-12 10-17 24-17s22 5 24 17z" fill={kit} />
      <path d="M25 47l7 7 7-7" fill="none" stroke={trim} strokeWidth="2.5" />
      {/* Cou et tête */}
      <rect x="27" y="38" width="10" height="10" rx="3" fill={skin} />
      <ellipse cx="32" cy="28" rx="12" ry="14" fill={skin} />
      <ellipse cx="20" cy="29" rx="2" ry="3" fill={skin} /><ellipse cx="44" cy="29" rx="2" ry="3" fill={skin} />
      {/* Cheveux */}
      {style === 0 && <path d="M20.5 24c0-9 5-13 11.5-13s11.5 4 11.5 13c-2-4-6-6-11.5-6s-9.5 2-11.5 6z" fill={hair} opacity=".85" />}
      {style === 1 && <path d="M19.5 26c-1-11 5-16 12.5-16s13.5 5 12.5 16c-1-5-4-8-12.5-8s-11.5 3-12.5 8z" fill={hair} />}
      {style === 2 && <path d="M19.5 27c-1-12 6-17 13-17s12 4 12 12c-4-1-8-4-11-8-2 5-8 9-14 13z" fill={hair} />}
      {style === 3 && <g fill={hair}>{[20, 25, 30, 35, 40, 44].map((x, k) => <circle key={x} cx={x} cy={k % 2 ? 14 : 17} r="5" />)}<circle cx="19.5" cy="22" r="3.5" /><circle cx="44.5" cy="22" r="3.5" /></g>}
      {style === 4 && <g fill={hair}><path d="M20 26c-1-11 5-15 12-15s13 4 12 15c-1-5-4-8-12-8s-11 3-12 8z" /><circle cx="32" cy="9" r="4.5" /></g>}
      {/* Visage */}
      <path d={brow === 0 ? "M25 25h5M34 25h5" : brow === 1 ? "M25 25.5l5-1M34 24.5l5 1" : "M25 24.5l5 1M34 25.5l5-1"} stroke={hair} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="27.5" cy="29" r="1.4" fill="#1d1611" /><circle cx="36.5" cy="29" r="1.4" fill="#1d1611" />
      <path d="M32 30v4.5h-1.5" fill="none" stroke="rgba(0,0,0,.25)" strokeWidth="1.2" strokeLinecap="round" />
      {beard
        ? <path d="M21 30c0 9 5 13 11 13s11-4 11-13c-1 4-3 6-5 6-2-2-4-2-6-2s-4 0-6 2c-2 0-4-2-5-6z" fill={hair} opacity=".8" />
        : null}
      <path d="M28.5 37.5c2 1.3 5 1.3 7 0" fill="none" stroke={beard ? skin : "rgba(0,0,0,.35)"} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
