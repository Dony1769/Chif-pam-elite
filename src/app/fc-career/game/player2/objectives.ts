/**
 * FC CAREER 27 — Objectifs de développement (façon FC 26) : trois défis
 * à la fois, sur une fenêtre de matchs, récompensés par des points dans un
 * sous-attribut clé du poste. Ratés, ils sont remplacés par d'autres.
 */

import type { PlayerCareerState, PlayerMatchSummary } from "./types";
import type { SubKey } from "./subAttributes";
import { SUB_LABEL, keySubs } from "./subAttributes";
import { createRng, seedFromString } from "../utils/random";
import { pmsg, pushPlayerInbox, syncWorldPlayer } from "./engine";

export type ObjectiveKind = "goals" | "assists" | "ga" | "rating" | "starts" | "motm";

export interface Objective {
  id: string;
  kind: ObjectiveKind;
  target: number;
  /** Nombre de matchs disponibles */
  window: number;
  played: number;
  /** Buts, passes, titularisations… ou somme des notes pour « rating » */
  progress: number;
  reward: { sub: SubKey; pts: number };
}

export interface ObjectivesState { active: Objective[]; done: number; failed: number; seq: number }

const KINDS: Record<string, ObjectiveKind[]> = {
  ST: ["goals", "goals", "ga", "motm"], LW: ["goals", "assists", "ga", "motm"], RW: ["goals", "assists", "ga", "motm"],
  AM: ["assists", "ga", "goals", "rating"], CM: ["assists", "rating", "starts", "ga"], DM: ["rating", "starts", "assists"],
  CB: ["rating", "starts", "motm"], LB: ["rating", "assists", "starts"], RB: ["rating", "assists", "starts"], GK: ["rating", "starts", "motm"],
};

export function objectiveText(o: Objective): string {
  const n = `${o.window} prochains matchs`;
  switch (o.kind) {
    case "goals": return `Marquer ${o.target} but${o.target > 1 ? "s" : ""} sur les ${n}`;
    case "assists": return `Délivrer ${o.target} passe${o.target > 1 ? "s" : ""} décisive${o.target > 1 ? "s" : ""} sur les ${n}`;
    case "ga": return `${o.target} buts + passes décisives sur les ${n}`;
    case "rating": return `Tenir ${(o.target / 10).toFixed(1).replace(".", ",")} de moyenne sur ${o.window} matchs joués`;
    case "starts": return `Être titulaire ${o.target} fois sur les ${n}`;
    case "motm": return `Être élu homme du match ${o.target > 1 ? `${o.target} fois` : "une fois"} sur les ${n}`;
  }
}

/** Avancement affiché : 0 à 1. */
export function objectiveRatio(o: Objective): number {
  if (o.kind === "rating") return o.played ? Math.min(1, o.progress / o.played / o.target * 10) : 0;
  return Math.min(1, o.progress / o.target);
}

function make(s: PlayerCareerState, seq: number): Objective {
  const pos = s.profile.position;
  const rng = createRng(seedFromString(`${s.profile.id}-obj-${seq}`));
  const kind = rng.pick(KINDS[pos] ?? KINDS.CM);
  const ovr = s.profile.attrs ? Math.round(Object.values(s.profile.attrs).reduce((a, b) => a + b, 0) / 6) : 65;
  const lvl = ovr >= 80 ? 2 : ovr >= 70 ? 1 : 0;
  const window = rng.int(5, 8);
  const target = kind === "goals" ? Math.max(1, Math.round(window * [0.35, 0.45, 0.6][lvl] * (pos === "ST" ? 1 : 0.7)))
    : kind === "assists" ? Math.max(1, Math.round(window * [0.2, 0.3, 0.4][lvl]))
      : kind === "ga" ? Math.max(2, Math.round(window * [0.45, 0.6, 0.8][lvl] * (["ST", "LW", "RW", "AM"].includes(pos) ? 1 : 0.6)))
        : kind === "rating" ? [68, 70, 72][lvl] + rng.int(0, 2)
          : kind === "starts" ? Math.max(2, window - rng.int(1, 3))
            : 1 + (window >= 7 && lvl === 2 ? 1 : 0);
  const subs = keySubs(pos).slice(0, 6);
  const pts = kind === "rating" || kind === "motm" ? 3 : 2;
  return { id: `obj-${seq}`, kind, target, window, played: 0, progress: 0, reward: { sub: rng.pick(subs), pts } };
}

const OS = (s: PlayerCareerState): ObjectivesState => s.career?.objectives ?? { active: [], done: 0, failed: 0, seq: 0 };
const withObj = (s: PlayerCareerState, o: ObjectivesState): PlayerCareerState => ({ ...s, career: { ...s.career!, objectives: o } });

/** Remplit jusqu'à trois objectifs actifs. */
export function refillObjectives(s: PlayerCareerState): PlayerCareerState {
  if (!s.career || s.retired) return s;
  let o = OS(s);
  while (o.active.length < 3) { o = { ...o, active: [...o.active, make(s, o.seq + 1)], seq: o.seq + 1 }; }
  return withObj(s, o);
}

/** Après un match de championnat : avance, valide ou abandonne chaque objectif. */
export function objectivesAfterMatch(s0: PlayerCareerState, sum: PlayerMatchSummary | null): PlayerCareerState {
  let s = refillObjectives(s0);
  if (!sum || !s.career) return s;
  const o = OS(s);
  const keep: Objective[] = [];
  let done = o.done, failed = o.failed;
  for (const x of o.active) {
    const played = x.kind === "starts" || sum.played ? x.played + 1 : x.played;
    const add = !sum.played ? 0 : x.kind === "goals" ? sum.goals : x.kind === "assists" ? sum.assists : x.kind === "ga" ? sum.goals + sum.assists
      : x.kind === "rating" ? Math.round((sum.rating ?? 0) * 10) : x.kind === "starts" ? (sum.started ? 1 : 0) : sum.motm ? 1 : 0;
    const y = { ...x, played, progress: x.progress + add };
    const success = y.kind === "rating" ? y.played >= y.window && y.progress / y.played >= y.target : y.progress >= y.target;
    if (success) {
      done++;
      const sub = { ...s.profile.sub, [y.reward.sub]: Math.min(99, (s.profile.sub[y.reward.sub] ?? 50) + y.reward.pts) };
      s = syncWorldPlayer({ ...s, profile: { ...s.profile, sub } });
      s = pushPlayerInbox(s, pmsg(s, "board", "Objectif réussi !", `${objectiveText(y)} : +${y.reward.pts} en ${SUB_LABEL[y.reward.sub]}.`));
    } else if (y.played >= y.window) {
      failed++;
    } else keep.push(y);
  }
  s = withObj(s, { ...OS(s), active: keep, done, failed });
  return refillObjectives(s);
}
