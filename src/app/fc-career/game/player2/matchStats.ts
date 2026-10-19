/**
 * FC CAREER 27 — Statistiques individuelles d'un match (façon fiche FC) :
 * minutes, tirs, passes, dribbles, duels, distance. Les actions vécues
 * (buts, tirs, moments clés) sont exactes ; le volume de jeu autour est
 * dérivé du poste, des attributs et de la note, de façon déterministe.
 */

import type { PlayerLive } from "./live";
import type { ManagerMatchReport } from "../manager/types";
import { createRng, seedFromString } from "../utils/random";

export interface PlayerMatchStats {
  minutes: number; rating: number | null; goals: number; assists: number;
  shots: number; shotsOnTarget: number;
  passes: number; passesDone: number; keyPasses: number;
  dribbles: number; dribblesDone: number;
  duels: number; duelsWon: number; tackles: number;
  km: number; saves: number; decisions: number; decisionsWon: number;
}

const PASSES: Record<string, number> = { GK: 26, CB: 48, LB: 42, RB: 42, DM: 55, CM: 58, AM: 44, LW: 30, RW: 30, ST: 22 };
const DUELS: Record<string, number> = { GK: 3, CB: 14, LB: 11, RB: 11, DM: 14, CM: 11, AM: 9, LW: 12, RW: 12, ST: 13 };
const KM: Record<string, number> = { GK: 5.4, CB: 9.8, LB: 10.6, RB: 10.6, DM: 11.2, CM: 11.6, AM: 10.9, LW: 10.4, RW: 10.4, ST: 9.9 };

export function playerMatchStats(live: PlayerLive, report: ManagerMatchReport | null): PlayerMatchStats {
  const id = live.playerId, m = live.match;
  const evs = m.events;
  const inAt = evs.find(e => e.type === "sub" && e.inPlayerId === id)?.minute;
  const outAt = evs.find(e => (e.type === "sub" && e.playerId === id) || (e.type === "red" && e.playerId === id) || (e.type === "injury" && e.playerId === id))?.minute;
  const appeared = m[m.managedSide].appeared.includes(id);
  const minutes = !appeared ? 0 : Math.max(1, (outAt ?? 90) - (inAt ?? 0));
  const rating = report?.ratings[id] ?? null;
  const goals = evs.filter(e => e.type === "goal" && e.playerId === id).length;
  const assists = evs.filter(e => e.type === "goal" && e.assistId === id).length;
  const shotEvs = evs.filter(e => (e.type === "shot" || e.type === "chance" || e.type === "goal") && e.playerId === id || (e.type === "save" && e.shooterId === id));
  const shotsOnTarget = shotEvs.filter(e => e.type === "goal" || e.type === "save" || e.result === "saved").length;
  const saves = evs.filter(e => e.type === "save" && e.playerId === id).length;
  const dec = live.decisions;
  const decWon = dec.filter(d => d.success).length;
  const pos = live.position;
  const sub = live.sub;
  const DRI = ["dribble", "flair"], DEF = ["tackle", "slide", "intercept", "block", "contain", "aerial"];
  const isDri = (d: { option: string }) => DRI.includes(d.option), isDef = (d: { option: string }) => DEF.includes(d.option);
  const rng = createRng(seedFromString(`${m.seed}-stats-${id}`));
  const f = minutes / 90;
  const form = rating === null ? 0 : (rating - 6.5) / 3; // -0.3 … +1
  const passes = Math.round((PASSES[pos] ?? 35) * f * rng.float(0.85, 1.15));
  const pAcc = Math.min(0.96, Math.max(0.55, 0.58 + (sub?.shortPassing ?? live.attrs.pas) * 0.0035 + form * 0.05));
  const dribbleBase = ["LW", "RW", "AM", "ST"].includes(pos) ? 4 : pos === "CM" ? 2 : 1;
  const dribbles = Math.round(dribbleBase * f * rng.float(0.6, 1.4)) + dec.filter(isDri).length;
  const dAcc = Math.min(0.9, Math.max(0.25, 0.3 + (sub?.dribbling ?? live.attrs.dri) * 0.004 + form * 0.08));
  const duels = Math.round((DUELS[pos] ?? 10) * f * rng.float(0.8, 1.2));
  const wAcc = Math.min(0.85, Math.max(0.3, 0.38 + (live.attrs.phy + live.attrs.def) * 0.0015 + form * 0.1));
  const tacklesBase = ["CB", "LB", "RB", "DM"].includes(pos) ? 3 : pos === "CM" ? 2 : 0.6;
  return {
    minutes, rating, goals, assists,
    shots: shotEvs.length, shotsOnTarget,
    passes, passesDone: Math.round(passes * pAcc), keyPasses: assists + Math.round(f * rng.float(0, ["AM", "CM", "LW", "RW"].includes(pos) ? 2.5 : 1)),
    dribbles, dribblesDone: Math.min(dribbles, Math.round(dribbles * dAcc) + dec.filter(d => isDri(d) && d.success).length),
    duels, duelsWon: Math.round(duels * wAcc), tackles: Math.round(tacklesBase * f * rng.float(0.6, 1.4)) + dec.filter(d => isDef(d) && d.success).length,
    km: Math.round((KM[pos] ?? 10) * f * rng.float(0.93, 1.08) * (0.9 + (sub?.stamina ?? 70) / 700) * 10) / 10,
    saves, decisions: dec.length, decisionsWon: decWon,
  };
}
