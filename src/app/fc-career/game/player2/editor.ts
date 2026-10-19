/** FC CAREER 27 — Éditeur du monde : renommer un club et changer ses couleurs. */

import type { PlayerCareerState } from "./types";

export interface ClubEdit { clubId: string; name: string; shortName: string; primary: string; secondary: string }

const HEX = /^#[0-9a-fA-F]{6}$/;

export function editClub(s: PlayerCareerState, e: ClubEdit): { ok: boolean; state: PlayerCareerState; message: string } {
  const name = e.name.trim().replace(/\s+/g, " ");
  const short = e.shortName.trim().toUpperCase();
  if (name.length < 2 || name.length > 32) return { ok: false, state: s, message: "Nom : 2 à 32 caractères." };
  if (!/^[A-Z0-9]{2,4}$/.test(short)) return { ok: false, state: s, message: "Abréviation : 2 à 4 lettres ou chiffres." };
  if (!HEX.test(e.primary) || !HEX.test(e.secondary)) return { ok: false, state: s, message: "Couleurs invalides." };
  const w = s.shadow.world;
  if (!w.clubs.some(c => c.id === e.clubId)) return { ok: false, state: s, message: "Club introuvable." };
  if (w.clubs.some(c => c.id !== e.clubId && c.name.toLowerCase() === name.toLowerCase())) return { ok: false, state: s, message: "Un autre club porte déjà ce nom." };
  const clubs = w.clubs.map(c => (c.id === e.clubId ? { ...c, name, shortName: short, colors: { ...c.colors, primary: e.primary.toLowerCase(), secondary: e.secondary.toLowerCase() } } : c));
  return { ok: true, state: { ...s, shadow: { ...s.shadow, world: { ...w, clubs } } }, message: `${name} enregistré.` };
}
