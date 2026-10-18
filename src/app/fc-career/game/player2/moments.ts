/**
 * FC CAREER 27 — Carrière Joueur v2 : moments forts de la carrière.
 *
 * Premier match et premier but pro, paliers de buts et de matchs, triplé,
 * première sélection et premier but international, signature dans un
 * nouveau club (transfert record compris), fin de carrière. Chaque moment
 * est mis en scène par les séquences animées, une seule fois.
 */

import type { PlayerCareerState } from "./types";
import { careerTotals, myClub } from "./engine";
import { seasonLabel } from "../domain/calendar";

export type MomentTrophy = "ballon" | "boot" | "star" | "globe" | "shield" | "cup";
export interface CareerMoment {
  id: string;
  title: string;
  /** Contexte : saison, club, adversaire */
  subtitle: string;
  /** Détail affiché sous le titre (score, chiffre, indemnité) */
  detail?: string;
  trophy: MomentTrophy;
  season: number;
  week: number;
}

const GOAL_STEPS = [25, 50, 100, 150, 200, 250, 300, 400, 500, 600, 700];
const APP_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800];
const money = (v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1).replace(".", ",")} M€` : `${Math.round(v / 1000)} k€`);

/** Moments survenus entre deux états de la carrière. */
export function detectMoments(prev: PlayerCareerState, next: PlayerCareerState): CareerMoment[] {
  if (!next.career || next.shadow.world.dataset !== "cp") return [];
  const w = next.shadow.world;
  const season = w.season, week = w.currentWeek;
  const label = w.startYear ? seasonLabel(w.startYear + season - 1) : `Saison ${season}`;
  const club = myClub(next).name;
  const out: CareerMoment[] = [];
  const add = (key: string, m: Omit<CareerMoment, "id" | "season" | "week">) => out.push({ ...m, id: `moment-${next.profile.id}-${key}`, season, week });
  const a = careerTotals(prev), b = careerTotals(next);
  const last = next.lastMatch !== prev.lastMatch ? next.lastMatch : null;
  const opp = last ? w.clubs.find(c => c.id === (last.report.managedSide === "home" ? last.report.awayClubId : last.report.homeClubId))?.name : undefined;
  const vs = opp ? ` · contre ${opp}` : "";

  if (a.apps === 0 && b.apps > 0) add("first-app", { title: "Premier match pro", subtitle: `${club} · ${label}`, detail: last?.rating ? `Note ${last.rating.toFixed(1)}${vs}` : undefined, trophy: "star" });
  if (a.goals === 0 && b.goals > 0) add("first-goal", { title: "Premier but pro", subtitle: `${club} · ${label}`, detail: `Le premier d'une longue série${vs}`, trophy: "ballon" });
  for (const n of GOAL_STEPS) if (a.goals < n && b.goals >= n) add(`goals-${n}`, { title: `${n} buts en carrière`, subtitle: `${club} · ${label}`, detail: `${b.goals} buts en ${b.apps} matchs`, trophy: "boot" });
  for (const n of APP_STEPS) if (a.apps < n && b.apps >= n) add(`apps-${n}`, { title: `${n} matchs en carrière`, subtitle: `${club} · ${label}`, detail: `${b.goals} buts · ${b.assists} passes décisives`, trophy: "shield" });
  if (last && last.goals >= 3) add(`hattrick-${season}-${week}`, { title: last.goals >= 4 ? "Quadruplé !" : "Triplé !", subtitle: `${club} · ${label}`, detail: `${last.goals} buts${vs}`, trophy: "ballon" });

  const na = prev.career?.national, nb = next.career.national;
  const nation = w.countries.find(c => c.id === nb.countryId)?.name ?? "votre pays";
  if (na && na.caps === 0 && nb.caps > 0) add("first-cap", { title: "Première sélection", subtitle: `${nation} · ${label}`, detail: "Le maillot national, enfin", trophy: "globe" });
  if (na && na.goals === 0 && nb.goals > 0) add("first-intl-goal", { title: "Premier but en sélection", subtitle: `${nation} · ${label}`, detail: `${nb.caps} sélection${nb.caps > 1 ? "s" : ""}`, trophy: "globe" });

  // Nouveau club : présentation officielle (transfert record si l'indemnité dépasse tout le monde)
  if (prev.contract.clubId !== next.contract.clubId && !next.career.loan) {
    const fee = next.career.lastMove?.clubId === next.contract.clubId ? next.career.lastMove.fee : 0;
    const best = Math.max(0, ...w.transferHistory.map(x => x.fee));
    const record = fee > 0 && fee > best;
    add(`sign-${next.contract.clubId}-${season}-${week}`, {
      title: record ? "Transfert record !" : "Présentation officielle", subtitle: `${club} · ${label}`,
      detail: fee ? `Indemnité ${money(fee)} · ${next.contract.seasonsLeft} saisons` : `Contrat de ${next.contract.seasonsLeft} saisons`, trophy: record ? "cup" : "star",
    });
  }
  if (!prev.retired && next.retired) add("retire", { title: "Fin de carrière", subtitle: `${b.apps} matchs · ${b.goals} buts · ${b.assists} passes`, detail: `${next.career.awards.length} trophée${next.career.awards.length > 1 ? "s" : ""} · ${nb.caps} sélection${nb.caps > 1 ? "s" : ""}`, trophy: "cup" });
  return out;
}

/** Ajoute les moments détectés à la carrière (les 60 derniers sont gardés). */
export function recordMoments(prev: PlayerCareerState, next: PlayerCareerState): PlayerCareerState {
  const fresh = detectMoments(prev, next);
  if (!fresh.length || !next.career) return next;
  const have = new Set((next.career.moments ?? []).map(m => m.id));
  const add = fresh.filter(m => !have.has(m.id));
  return add.length ? { ...next, career: { ...next.career, moments: [...(next.career.moments ?? []), ...add].slice(-60) } } : next;
}
