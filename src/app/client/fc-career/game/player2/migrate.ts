/**
 * FC CAREER 27 — Migration de la carrière v1 vers la Carrière Joueur v2 (Lot J5).
 *
 * Lit la sauvegarde v1 SANS la modifier et construit une carrière v2 :
 * identité, âge, poste (15 → 10), 51 attributs → 6 caractéristiques,
 * potentiel, réputation, club, contrat et statistiques cumulées.
 */

import type { WorldPlayerPosition } from "../data/worldPlayers";
import { createManagerGame, squadStrength } from "../manager/engine";
import { fromLegacyAttributes, legacyPosition } from "./attributes";
import type { SubAttrs, SubKey } from "./subAttributes";
import { ALL_SUBS, faceOf, overallFromSubs, subsFromFace } from "./subAttributes";

/** Les sous-attributs v1 portent presque les mêmes noms : on les reprend tels quels. */
function subsFromLegacy(old: Record<string, number>, position: WorldPlayerPosition, seed: string): SubAttrs {
  const base = subsFromFace(fromLegacyAttributes(old, position === "GK"), position, seed);
  const alias: Partial<Record<SubKey, string>> = { positioning: "attPositioning", longShots: "longShot" };
  const out = { ...base };
  for (const k of ALL_SUBS) {
    const v = old[alias[k] ?? k];
    if (typeof v === "number" && v > 0) out[k] = clamp(Math.round(v), 1, 99);
  }
  return out;
}
import { coachDecision, createPlayerCareer, pmsg, pushPlayerInbox, syncWorldPlayer } from "./engine";
import { ensureCareer } from "./career";
import type { PlayerCareerState } from "./types";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export interface LegacySummary {
  careerId: string;
  name: string;
  position: string;
  overall: number;
  age: number;
  clubId: string;
  season: number;
  apps: number;
  goals: number;
  assists: number;
}

interface LegacyLike {
  meta?: { careerId?: string };
  player?: {
    firstName?: string; lastName?: string; nationality?: string; age?: number; foot?: string; position?: string;
    attributes?: Record<string, number>; overall?: number; potential?: number; reputation?: number;
    contract?: { clubId?: string; salary?: number; endSeason?: number };
    stats?: { totalAppearances?: number; totalGoals?: number; totalAssists?: number; seasons?: unknown[] };
  };
  career?: { season?: number };
}

/** Vérifie et résume une sauvegarde v1 (null si inutilisable). */
export function readLegacy(raw: unknown): LegacySummary | null {
  const v = raw as LegacyLike;
  const p = v?.player;
  if (!p || typeof p.firstName !== "string" || typeof p.lastName !== "string" || !p.attributes) return null;
  return {
    careerId: v.meta?.careerId ?? `v1-${p.firstName}-${p.lastName}`,
    name: `${p.firstName} ${p.lastName}`.trim(),
    position: p.position ?? "CM",
    overall: p.overall ?? 0,
    age: p.age ?? 17,
    clubId: p.contract?.clubId ?? "",
    season: v.career?.season ?? 1,
    apps: p.stats?.totalAppearances ?? 0,
    goals: p.stats?.totalGoals ?? 0,
    assists: p.stats?.totalAssists ?? 0,
  };
}

/** Convertit la sauvegarde v1 en carrière v2. La v1 n'est jamais modifiée. */
export function migrateLegacy(raw: unknown, now = Date.now()): PlayerCareerState | null {
  const sum = readLegacy(raw);
  if (!sum) return null;
  const v = raw as LegacyLike;
  const p = v.player!;
  const position: WorldPlayerPosition = legacyPosition(p.position ?? "CM");
  const seed = `migr-${sum.careerId}`;
  const sub = subsFromLegacy(p.attributes!, position, seed);
  const attrs = faceOf(sub, position);

  // Club : celui du contrat v1 s'il existe dans le monde, sinon un club de D2 accessible
  // Club v1 du monde fictif : on garde ce monde ; sinon, le monde CP réel
  const dataset = sum.clubId.startsWith("vlt-") || sum.clubId.startsWith("cor-") || sum.clubId.startsWith("sol-") || sum.clubId.startsWith("nor-") ? "fictional" : "cp";
  const probe = createManagerGame({ seed, clubId: dataset === "cp" ? "eng-ars" : "vlt-fc-meridian", managerName: "IA", now, dataset });
  const known = probe.world.clubs.find(c => c.id === sum.clubId);
  const ovr = overallFromSubs(sub, position);
  const fallback = [...probe.world.clubs].filter(c => c.tier >= 2)
    .sort((a, b) => Math.abs(squadStrength(probe.world, a.id) - ovr) - Math.abs(squadStrength(probe.world, b.id) - ovr))[0];
  const club = known ?? fallback;
  // En v1, un joueur encore au centre de formation a pour club « academy »
  const fromAcademy = !known && (sum.clubId === "academy" || sum.clubId === "");

  let s = createPlayerCareer({
    seed, clubId: club.id, firstName: p.firstName!, lastName: p.lastName!,
    nationality: p.nationality ?? club.countryId, position,
    foot: p.foot === "left" ? "left" : p.foot === "both" ? "both" : "right", now,
  });

  const age = clamp(Math.round(p.age ?? 17), 16, 40);
  const potential = clamp(Math.max(p.potential ?? 0, ovr + (age <= 23 ? 4 : 0)), ovr, 99);
  const seasonsLeft = clamp((p.contract?.endSeason ?? sum.season + 2) - sum.season + 1, 1, 5);
  const wage = Math.max(200, Math.round(p.contract?.salary ?? s.contract.wage));
  const players = s.shadow.world.players.map(w => (w.id === s.profile.id ? { ...w, age } : w));

  s = {
    ...s,
    shadow: { ...s.shadow, world: { ...s.shadow.world, players } },
    profile: { ...s.profile, attrs, sub, potential, reputation: clamp(p.reputation ?? s.profile.reputation, 1, 100) },
    contract: { ...s.contract, wage, seasonsLeft },
    coachTrust: 50,
    inbox: [],
    legacy: {
      careerId: sum.careerId, importedAt: now,
      apps: sum.apps, goals: sum.goals, assists: sum.assists,
      seasonsPlayed: Array.isArray(p.stats?.seasons) ? p.stats!.seasons!.length : Math.max(0, sum.season - 1),
    },
  };
  s = coachDecision(syncWorldPlayer(ensureCareer(s)));
  return pushPlayerInbox(s, pmsg(s, "welcome", "Carrière importée",
    `${sum.name} ${fromAcademy ? `sort du centre de formation et signe son premier contrat pro à ${club.name}` : `reprend sa carrière à ${club.name}${known ? "" : " (son ancien club n'existe plus dans ce monde)"}`}. ` +
    `${sum.apps} match(s), ${sum.goals} but(s) et ${sum.assists} passe(s) décisive(s) conservés. Note ${ovr}, potentiel ${potential}.`));
}
