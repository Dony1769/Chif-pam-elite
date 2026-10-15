/**
 * FC CAREER 27 — Carrière Joueur v2 : décisions clés en direct (Lot J2).
 *
 * Le match avance minute par minute avec le moteur commun. Quand notre joueur
 * est sur le terrain, des « moments clés » surgissent selon son poste : le
 * match se met en pause, le joueur choisit une action, la réussite dépend de
 * ses caractéristiques face à la ligne adverse concernée, et le résultat est
 * inscrit dans le match réel (but, passe décisive, arrêt…) et dans sa note.
 * « Simuler le reste » termine le match en laissant le joueur décider seul.
 */

import type { WorldPlayerPosition } from "../data/worldPlayers";
import type { LiveMatch } from "../manager/matchSim";
import { simulateMinute } from "../manager/matchSim";
import { computeTeamRatings } from "../manager/tactics";
import type { MatchEvent } from "../manager/types";
import { createRng, seedFromString } from "../utils/random";
import type { AttrKey, Attrs } from "./attributes";

export type MomentKind = "box" | "wing" | "build" | "long" | "defend" | "keeper";

export interface MomentOption {
  id: "shoot" | "pass" | "dribble" | "cross" | "through" | "longshot" | "tackle" | "intercept" | "contain" | "dive" | "stand" | "rush";
  label: string;
  attr: AttrKey;
  /** Probabilité de réussite (0-1), affichée au joueur */
  chance: number;
  /** Probabilité de but si l'action réussit (attaque) ou d'en encaisser si elle échoue (défense) */
  payoff: number;
}

export interface KeyMoment {
  minute: number;
  kind: MomentKind;
  text: string;
  options: MomentOption[];
}

export interface DecisionLog {
  minute: number;
  kind: MomentKind;
  option: MomentOption["id"];
  success: boolean;
  outcome: "goal" | "assist" | "chance" | "lost" | "stopped" | "conceded" | "saved";
  text: string;
}

export interface PlayerLive {
  match: LiveMatch;
  playerId: string;
  playerName: string;
  attrs: Attrs;
  position: WorldPlayerPosition;
  moment: KeyMoment | null;
  decisions: DecisionLog[];
  /** Nombre de moments déjà proposés (plafonné selon le poste) */
  momentsSeen: number;
}

/** Nombre moyen de moments clés par match selon le poste. */
export const MOMENTS_PER_MATCH: Record<WorldPlayerPosition, number> = {
  ST: 5, LW: 5, RW: 5, AM: 4, CM: 3, DM: 3, LB: 3, RB: 3, CB: 2, GK: 2,
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const r2 = (v: number) => Math.round(v * 100) / 100;

export function startPlayerLive(match: LiveMatch, p: { id: string; name: string; attrs: Attrs; position: WorldPlayerPosition }): PlayerLive {
  return { match, playerId: p.id, playerName: p.name, attrs: p.attrs, position: p.position, moment: null, decisions: [], momentsSeen: 0 };
}

const mySide = (pl: PlayerLive) => pl.match.managedSide;
const oppSide = (pl: PlayerLive) => (pl.match.managedSide === "home" ? "away" : "home");
export const onPitch = (pl: PlayerLive) => pl.match[mySide(pl)].pitch.some(p => p?.id === pl.playerId);

/** Ligne adverse (0-99) que l'action affronte. */
function opposition(pl: PlayerLive) {
  const t = pl.match[oppSide(pl)];
  const r = computeTeamRatings(t.pitch, t.tactic.formation);
  const atk = computeTeamRatings(pl.match[mySide(pl)].pitch, pl.match[mySide(pl)].tactic.formation);
  return { defense: r.defense, keeper: r.goalkeeping, attack: r.attack, midfield: r.midfield, ourAttack: atk.attack };
}

/** Réussite : 50 % à égalité, ±1,2 point par point d'écart, bornée. */
function chanceOf(attr: number, versus: number, base = 0.5): number {
  return r2(clamp(base + (attr - versus) * 0.012, 0.08, 0.92));
}

function buildMoment(pl: PlayerLive, minute: number, kind: MomentKind): KeyMoment {
  const a = pl.attrs;
  const o = opposition(pl);
  const opt = (id: MomentOption["id"], label: string, attr: AttrKey, versus: number, payoff: number, base = 0.5): MomentOption =>
    ({ id, label, attr, chance: chanceOf(a[attr], versus, base), payoff });
  switch (kind) {
    case "box":
      return { minute, kind, text: "Ballon dans la surface, un défenseur au contact.", options: [
        opt("shoot", "Frapper", "sho", o.keeper, 0.13, 0.48),
        opt("dribble", "Éliminer son défenseur", "dri", o.defense, 0.1, 0.45),
        opt("pass", "Servir un partenaire démarqué", "pas", o.defense, 0.09, 0.55),
      ] };
    case "wing":
      return { minute, kind, text: "Lancé dans le couloir, de l'espace devant vous.", options: [
        opt("cross", "Centrer", "pas", o.defense, 0.1, 0.52),
        opt("dribble", "Repiquer dans l'axe", "dri", o.defense, 0.1, 0.45),
        opt("shoot", "Frapper en angle fermé", "sho", o.keeper, 0.08, 0.4),
      ] };
    case "build":
      return { minute, kind, text: "Le ballon arrive au milieu, l'adversaire est désorganisé.", options: [
        opt("through", "Passe en profondeur", "pas", o.defense, 0.1, 0.45),
        opt("dribble", "Percer balle au pied", "dri", o.midfield, 0.07, 0.48),
        opt("pass", "Jouer simple et garder le ballon", "pas", o.midfield - 15, 0.02, 0.6),
      ] };
    case "long":
      return { minute, kind, text: "Espace à 25 mètres, la défense recule.", options: [
        opt("longshot", "Frappe lointaine", "sho", o.keeper + 8, 0.1, 0.4),
        opt("through", "Glisser entre les lignes", "pas", o.defense, 0.09, 0.45),
        opt("pass", "Temporiser", "pas", o.midfield - 15, 0.02, 0.62),
      ] };
    case "defend":
      return { minute, kind, text: "Un attaquant adverse fonce vers la surface.", options: [
        opt("tackle", "Tacler", "def", o.attack, 0.18, 0.52),
        opt("intercept", "Couper la trajectoire", "pac", o.attack, 0.16, 0.5),
        opt("contain", "Temporiser et fermer l'angle", "phy", o.attack, 0.1, 0.58),
      ] };
    case "keeper":
      return { minute, kind, text: "Face-à-face : l'attaquant arrive seul devant vous.", options: [
        opt("dive", "Plonger au bon moment", "pac", o.attack, 0.28, 0.52),
        opt("stand", "Rester grand, fermer l'angle", "def", o.attack, 0.25, 0.54),
        opt("rush", "Sortir dans ses pieds", "phy", o.attack, 0.3, 0.48),
      ] };
  }
}

function kindsFor(pos: WorldPlayerPosition): MomentKind[] {
  switch (pos) {
    case "GK": return ["keeper"];
    case "CB": return ["defend", "defend", "defend", "build"];
    case "LB": case "RB": return ["defend", "defend", "wing"];
    case "DM": return ["defend", "build", "build"];
    case "CM": return ["build", "build", "long", "defend"];
    case "AM": return ["build", "long", "box"];
    case "LW": case "RW": return ["wing", "wing", "box"];
    case "ST": return ["box", "box", "box", "long"];
  }
}

/** Avance d'une minute ; peut ouvrir un moment clé (le match est alors en pause). */
export function stepPlayerLive(pl: PlayerLive): PlayerLive {
  if (pl.moment || pl.match.finished) return pl;
  const match = simulateMinute(pl.match);
  let next: PlayerLive = { ...pl, match };
  if (match.finished || !onPitch(next)) return next;
  const quota = MOMENTS_PER_MATCH[pl.position];
  if (next.momentsSeen >= quota + 2) return next;
  const rng = createRng(seedFromString(`${match.seed}-moment-${match.minute}-${pl.playerId}`));
  if (rng.chance(quota / 88)) {
    const kind = rng.pick(kindsFor(pl.position));
    next = { ...next, moment: buildMoment(next, match.minute, kind), momentsSeen: next.momentsSeen + 1 };
  }
  return next;
}

/** Applique le choix du joueur au moment clé en cours. */
export function decide(pl: PlayerLive, optionId: MomentOption["id"]): PlayerLive {
  const mo = pl.moment;
  if (!mo) return pl;
  const option = mo.options.find(o => o.id === optionId);
  if (!option) return pl;
  const rng = createRng(seedFromString(`${pl.match.seed}-decide-${mo.minute}-${optionId}-${pl.playerId}`));
  const success = rng.chance(option.chance);
  const me = mySide(pl), them = oppSide(pl);
  const m: LiveMatch = {
    ...pl.match,
    home: { ...pl.match.home }, away: { ...pl.match.away },
    events: [...pl.match.events],
    ratingBonus: { ...(pl.match.ratingBonus ?? {}) },
  };
  const bonus = (v: number) => { m.ratingBonus![pl.playerId] = r2((m.ratingBonus![pl.playerId] ?? 0) + v); };
  const team = m[me];
  const mates = team.pitch.filter((p): p is NonNullable<typeof p> => !!p && p.id !== pl.playerId && p.position !== "GK");
  const mate = mates.length ? mates[rng.int(0, mates.length - 1)] : null;
  const ev = (e: Omit<MatchEvent, "minute">) => m.events.push({ minute: mo.minute, ...e });
  const score = () => `${m.home.goals}-${m.away.goals}`;
  let outcome: DecisionLog["outcome"];
  let text: string;

  const defensive = mo.kind === "defend" || mo.kind === "keeper";
  if (!defensive) {
    const direct = option.id === "shoot" || option.id === "longshot" || option.id === "dribble";
    if (success) {
      bonus(option.id === "pass" ? 0.03 : 0.08);
      const goal = rng.chance(option.payoff);
      team.shots += option.payoff > 0.1 ? 1 : 0;
      team.xg += option.payoff;
      if (goal && option.payoff > 0.1) {
        team.shotsOnTarget += 1;
        team.goals += 1;
        if (direct) {
          outcome = "goal";
          ev({ type: "goal", side: me, playerId: pl.playerId, assistId: mate?.id, text: `BUT ! ${pl.playerName} marque${mate ? ` après un service de ${mate.lastName}` : ""}. ${score()}.` });
          text = `But ! Votre ${option.label.toLowerCase()} fait mouche.`;
        } else {
          outcome = "assist";
          ev({ type: "goal", side: me, playerId: mate?.id ?? pl.playerId, assistId: mate ? pl.playerId : undefined, text: `BUT ! ${mate?.lastName ?? pl.playerName} conclut sur une offrande de ${pl.playerName}. ${score()}.` });
          text = "Passe décisive ! Votre partenaire conclut.";
        }
      } else if (option.payoff > 0.1) {
        outcome = "chance";
        team.shotsOnTarget += rng.chance(0.6) ? 1 : 0;
        m[them].saves += 1;
        ev({ type: "chance", side: me, playerId: direct ? pl.playerId : mate?.id, text: `Occasion pour ${team.name} : ${direct ? pl.playerName : mate?.lastName ?? "un partenaire"} est tout proche de marquer.` });
        text = "Bien joué, mais le gardien ou le poteau vous prive du but.";
      } else {
        outcome = "chance";
        text = "Ballon conservé proprement, l'équipe respire.";
      }
    } else {
      bonus(option.id === "pass" ? -0.03 : -0.08);
      outcome = "lost";
      text = option.id === "shoot" || option.id === "longshot" ? "Frappe non cadrée." : "Ballon perdu, l'adversaire récupère.";
      if (option.id === "shoot" || option.id === "longshot") { team.shots += 1; team.xg += option.payoff * 0.5; }
    }
  } else {
    if (success) {
      bonus(mo.kind === "keeper" ? 0.25 : 0.15);
      outcome = mo.kind === "keeper" ? "saved" : "stopped";
      if (mo.kind === "keeper") { team.saves += 1; m[them].shots += 1; m[them].shotsOnTarget += 1; }
      ev({ type: "save", side: me, playerId: pl.playerId, text: mo.kind === "keeper" ? `Parade décisive de ${pl.playerName} !` : `Intervention décisive de ${pl.playerName}.` });
      text = mo.kind === "keeper" ? "Arrêt décisif !" : "Vous stoppez l'action.";
    } else {
      bonus(-0.1);
      const opp = m[them];
      opp.shots += 1;
      opp.xg += option.payoff;
      if (rng.chance(option.payoff)) {
        opp.goals += 1;
        opp.shotsOnTarget += 1;
        const scorer = opp.pitch.filter((p): p is NonNullable<typeof p> => !!p && p.position !== "GK");
        const s = scorer.length ? scorer[rng.int(0, scorer.length - 1)] : null;
        outcome = "conceded";
        ev({ type: "goal", side: them, playerId: s?.id, text: `BUT ! ${s ? `${s.firstName.charAt(0)}. ${s.lastName}` : "L'adversaire"} marque pour ${opp.name}. ${score()}.` });
        text = "L'adversaire en profite et marque.";
      } else {
        outcome = "lost";
        text = "Vous êtes passé, mais l'action adverse n'aboutit pas.";
      }
    }
  }

  const log: DecisionLog = { minute: mo.minute, kind: mo.kind, option: option.id, success, outcome, text };
  return { ...pl, match: m, moment: null, decisions: [...pl.decisions, log] };
}

/** Choix automatique : meilleure espérance (réussite × gain, ou risque évité en défense). */
export function bestOption(mo: KeyMoment): MomentOption {
  const value = (o: MomentOption) => (mo.kind === "defend" || mo.kind === "keeper" ? o.chance + (1 - o.payoff) * 0.3 : o.chance * (0.4 + o.payoff));
  return [...mo.options].sort((a, b) => value(b) - value(a))[0];
}

/** Termine le match : le joueur décide seul les moments restants. */
export function simulateRest(pl: PlayerLive): PlayerLive {
  let cur = pl;
  let guard = 0;
  while (!cur.match.finished && guard++ < 400) {
    cur = cur.moment ? decide(cur, bestOption(cur.moment).id) : stepPlayerLive(cur);
  }
  return cur;
}
