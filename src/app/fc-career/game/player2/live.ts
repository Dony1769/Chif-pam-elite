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
import type { SubAttrs, SubKey } from "./subAttributes";
import { SUB_LABEL, subsFromFace } from "./subAttributes";
import type { OptionId, PlayStyleState } from "./playstyles";
import { optionAvailable, psBonus } from "./playstyles";
import { shortName } from "../utils/names";

export type MomentKind = "box" | "wing" | "build" | "long" | "defend" | "keeper"
  | "air" | "setpiece" | "penalty" | "keepercross" | "gkbuild";

export interface MomentOption {
  id: OptionId;
  label: string;
  attr: AttrKey;
  /** Sous-attribut principal sollicité et sa valeur (affichage) */
  skill?: string;
  level?: number;
  /** Bonus PlayStyle appliqué */
  ps?: number;
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
  sub?: SubAttrs;
  ps?: PlayStyleState;
  weakFoot?: number;
  skillMoves?: number;
  /** Réussites par action pendant ce match (progression des PlayStyles) */
  psGain?: Partial<Record<OptionId, number>>;
}

/** Nombre moyen de moments clés par match selon le poste. */
export const MOMENTS_PER_MATCH: Record<WorldPlayerPosition, number> = {
  ST: 5, LW: 5, RW: 5, AM: 4, CM: 3, DM: 3, LB: 3, RB: 3, CB: 2, GK: 2,
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const r2 = (v: number) => Math.round(v * 100) / 100;

export function startPlayerLive(match: LiveMatch, p: {
  id: string; name: string; attrs: Attrs; position: WorldPlayerPosition;
  sub?: SubAttrs; ps?: PlayStyleState; weakFoot?: number; skillMoves?: number;
}): PlayerLive {
  return {
    match, playerId: p.id, playerName: p.name, attrs: p.attrs, position: p.position, moment: null, decisions: [], momentsSeen: 0,
    sub: p.sub, ps: p.ps, weakFoot: p.weakFoot, skillMoves: p.skillMoves, psGain: {},
  };
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

type Mix = Partial<Record<SubKey, number>>;
const SHOTS: OptionId[] = ["shoot", "longshot", "finesse", "chip", "acrobatic", "header", "lowdriven", "powershot", "trivela", "freekick", "penalty"];
const isKeeperKind = (k: MomentKind) => k === "keeper" || k === "keepercross";
const isDefensiveKind = (k: MomentKind) => k === "defend" || isKeeperKind(k);

function buildMoment(pl: PlayerLive, minute: number, kind: MomentKind): KeyMoment {
  const sub = pl.sub ?? subsFromFace(pl.attrs, pl.position, pl.playerId);
  const o = opposition(pl);
  const wf = pl.weakFoot ?? 3, sm = pl.skillMoves ?? 3;
  const opts: MomentOption[] = [];
  const add = (id: OptionId, label: string, attr: AttrKey, mix: Mix, versus: number, payoff: number, base = 0.5) => {
    if (!optionAvailable(pl.ps, id)) return;
    const entries = Object.entries(mix) as [SubKey, number][];
    const total = entries.reduce((t, [, w]) => t + w, 0) || 1;
    const value = entries.reduce((t, [k, w]) => t + (sub[k] ?? 50) * w, 0) / total;
    const main = entries.sort((a, b) => b[1] - a[1])[0][0];
    let chance = chanceOf(value, versus, base);
    // Pied faible : une partie des frappes part du mauvais pied
    if (SHOTS.includes(id) && id !== "header") chance -= (5 - wf) * 0.01;
    if (id === "dribble" || id === "flair") chance += (sm - 3) * 0.015;
    const bonus = psBonus(pl.ps, id);
    chance = r2(clamp(chance + bonus, 0.05, 0.95));
    opts.push({ id, label, attr, skill: SUB_LABEL[main], level: sub[main], ps: bonus || undefined, chance, payoff });
  };
  let text = "";
  switch (kind) {
    case "box":
      text = "Ballon dans la surface, un défenseur au contact.";
      add("shoot", "Frapper", "sho", { finishing: 0.6, positioning: 0.2, composure: 0.2 }, o.keeper, 0.13, 0.48);
      add("finesse", "Enrouler au second poteau", "sho", { finishing: 0.5, curve: 0.5 }, o.keeper, 0.15, 0.44);
      add("lowdriven", "Frappe rasante appuyée", "sho", { shotPower: 0.5, finishing: 0.5 }, o.keeper, 0.14, 0.46);
      add("chip", "Piquer au-dessus du gardien", "sho", { finishing: 0.4, composure: 0.6 }, o.keeper, 0.16, 0.38);
      add("dribble", "Éliminer son défenseur", "dri", { dribbling: 0.5, agility: 0.3, ballControl: 0.2 }, o.defense, 0.1, 0.45);
      add("pass", "Servir un partenaire démarqué", "pas", { shortPassing: 0.6, vision: 0.4 }, o.defense, 0.09, 0.55);
      break;
    case "air":
      text = "Corner : le ballon arrive au point de penalty.";
      add("header", "Reprendre de la tête", "sho", { headingAccuracy: 0.6, jumping: 0.25, strength: 0.15 }, o.defense, 0.17, 0.44);
      add("acrobatic", "Retourné acrobatique", "sho", { volleys: 0.6, agility: 0.4 }, o.keeper, 0.2, 0.3);
      add("pass", "Remiser de la tête", "pas", { headingAccuracy: 0.6, vision: 0.4 }, o.defense, 0.08, 0.5);
      break;
    case "wing":
      text = "Lancé dans le couloir, de l'espace devant vous.";
      add("cross", "Centrer", "pas", { crossing: 0.7, curve: 0.3 }, o.defense, 0.1, 0.52);
      add("dribble", "Repiquer dans l'axe", "dri", { dribbling: 0.6, acceleration: 0.4 }, o.defense, 0.1, 0.45);
      add("shoot", "Frapper en angle fermé", "sho", { finishing: 0.7, shotPower: 0.3 }, o.keeper, 0.08, 0.4);
      add("trivela", "Frappe de l'extérieur du pied", "sho", { curve: 0.5, longShots: 0.5 }, o.keeper, 0.12, 0.38);
      add("longthrow", "Longue touche dans la surface", "phy", { strength: 0.7, shotPower: 0.3 }, o.defense, 0.07, 0.5);
      break;
    case "build":
      text = "Le ballon arrive au milieu, l'adversaire est désorganisé.";
      add("through", "Passe en profondeur", "pas", { vision: 0.6, shortPassing: 0.4 }, o.defense, 0.1, 0.45);
      add("longball", "Ouverture lobée", "pas", { longPassing: 0.7, vision: 0.3 }, o.defense, 0.11, 0.42);
      add("outside", "Passe de l'extérieur du pied", "pas", { vision: 0.5, curve: 0.5 }, o.defense, 0.12, 0.4);
      add("dribble", "Percer balle au pied", "dri", { dribbling: 0.5, ballControl: 0.3, agility: 0.2 }, o.midfield, 0.07, 0.48);
      add("flair", "Geste technique (sombrero)", "dri", { dribbling: 0.5, agility: 0.5 }, o.midfield, 0.09, 0.42);
      add("pass", "Jouer simple et garder le ballon", "pas", { shortPassing: 0.7, composure: 0.3 }, o.midfield - 15, 0.02, 0.6);
      break;
    case "long":
      text = "Espace à 25 mètres, la défense recule.";
      add("longshot", "Frappe lointaine", "sho", { longShots: 0.7, shotPower: 0.3 }, o.keeper + 8, 0.1, 0.4);
      add("powershot", "Frappe en force", "sho", { shotPower: 0.6, longShots: 0.4 }, o.keeper + 6, 0.13, 0.36);
      add("through", "Glisser entre les lignes", "pas", { vision: 0.6, shortPassing: 0.4 }, o.defense, 0.09, 0.45);
      add("pass", "Temporiser", "pas", { shortPassing: 0.7, composure: 0.3 }, o.midfield - 15, 0.02, 0.62);
      break;
    case "setpiece":
      text = "Coup franc à 22 mètres, légèrement excentré.";
      add("freekick", "Tenter le coup franc direct", "pas", { freeKick: 0.6, curve: 0.4 }, o.keeper + 10, 0.2, 0.38);
      add("cross", "Brosser dans la surface", "pas", { crossing: 0.5, curve: 0.5 }, o.defense, 0.1, 0.5);
      add("pass", "Combinaison à deux", "pas", { shortPassing: 0.7, vision: 0.3 }, o.defense, 0.05, 0.55);
      break;
    case "penalty":
      text = "Penalty ! Vous prenez le ballon.";
      add("penalty", "Placer au ras du poteau", "sho", { penalties: 0.7, composure: 0.3 }, o.keeper - 20, 1, 0.62);
      add("shoot", "Frapper en force", "sho", { penalties: 0.4, shotPower: 0.6 }, o.keeper - 20, 1, 0.58);
      add("chip", "Panenka", "sho", { composure: 0.7, penalties: 0.3 }, o.keeper - 20, 1, 0.5);
      break;
    case "defend":
      text = "Un attaquant adverse fonce vers la surface.";
      add("tackle", "Tacler debout", "def", { standingTackle: 0.7, defAwareness: 0.3 }, o.attack, 0.18, 0.52);
      add("slide", "Tacle glissé", "def", { slidingTackle: 0.8, aggression: 0.2 }, o.attack, 0.2, 0.48);
      add("intercept", "Couper la trajectoire", "def", { interceptions: 0.6, reactions: 0.2, acceleration: 0.2 }, o.attack, 0.16, 0.5);
      add("block", "Se jeter pour contrer", "def", { defAwareness: 0.5, reactions: 0.5 }, o.attack, 0.12, 0.5);
      add("contain", "Temporiser et fermer l'angle", "def", { defAwareness: 0.6, strength: 0.2, acceleration: 0.2 }, o.attack, 0.1, 0.58);
      if (pl.position === "CB" || pl.position === "DM") add("aerial", "Duel aérien", "phy", { jumping: 0.4, headingAccuracy: 0.3, strength: 0.3 }, o.attack, 0.14, 0.54);
      break;
    case "keeper":
      text = "Face-à-face : l'attaquant arrive seul devant vous.";
      add("dive", "Plonger au bon moment", "pac", { gkDiving: 0.6, gkReflexes: 0.4 }, o.attack, 0.28, 0.52);
      add("stand", "Rester grand, fermer l'angle", "def", { gkPositioning: 0.6, gkReflexes: 0.4 }, o.attack, 0.25, 0.54);
      add("rush", "Sortir dans ses pieds", "def", { gkPositioning: 0.4, acceleration: 0.3, composure: 0.3 }, o.attack, 0.3, 0.48);
      add("footsave", "Arrêt du pied", "dri", { gkReflexes: 0.8, agility: 0.2 }, o.attack, 0.22, 0.55);
      break;
    case "keepercross":
      text = "Centre adverse tendu dans votre surface.";
      add("claim", "Capter le centre", "sho", { gkHandling: 0.7, jumping: 0.3 }, o.attack, 0.2, 0.55);
      add("rush", "Sortir aux poings", "sho", { gkHandling: 0.5, jumping: 0.5 }, o.attack, 0.22, 0.5);
      add("stand", "Rester sur sa ligne", "def", { gkPositioning: 0.7, gkReflexes: 0.3 }, o.attack, 0.18, 0.5);
      break;
    case "gkbuild":
      text = "Ballon capté : à vous de relancer.";
      add("pass", "Relance courte", "pas", { gkKicking: 0.7, composure: 0.3 }, o.midfield - 15, 0.02, 0.62);
      add("quickthrow", "Relance rapide à la main", "pas", { gkKicking: 0.6, strength: 0.4 }, o.midfield, 0.06, 0.5);
      break;
  }
  return { minute, kind, text, options: opts };
}

function kindsFor(pos: WorldPlayerPosition): MomentKind[] {
  switch (pos) {
    case "GK": return ["keeper", "keeper", "keepercross", "gkbuild"];
    case "CB": return ["defend", "defend", "defend", "build", "air"];
    case "LB": case "RB": return ["defend", "defend", "wing"];
    case "DM": return ["defend", "build", "build"];
    case "CM": return ["build", "build", "long", "defend"];
    case "AM": return ["build", "long", "box"];
    case "LW": case "RW": return ["wing", "wing", "box"];
    case "ST": return ["box", "box", "box", "long", "air"];
  }
}

/** Situation du moment : coups de pied arrêtés pour les tireurs désignés, sinon selon le poste. */
function pickKind(pl: PlayerLive, rng: ReturnType<typeof createRng>): MomentKind {
  const sub = pl.sub;
  if (sub && pl.position !== "GK") {
    const deadBall = pl.ps?.owned.includes("dead_ball") ?? false;
    if (sub.penalties >= 68 && rng.chance(0.045)) return "penalty";
    if ((sub.freeKick >= 70 || deadBall) && rng.chance(0.08)) return "setpiece";
  }
  return rng.pick(kindsFor(pl.position));
}

/** Avance d'une minute ; peut ouvrir un moment clé (le match est alors en pause). */
export function stepPlayerLive(pl: PlayerLive): PlayerLive {
  if (pl.moment || pl.match.finished) return pl;
  const match = simulateMinute(pl.match);
  let next: PlayerLive = { ...pl, match };
  if (match.finished || !onPitch(next)) return next;
  const quota = MOMENTS_PER_MATCH[pl.position] + (pl.ps?.owned.includes("relentless") ? 1 : 0);
  if (next.momentsSeen >= quota + 2) return next;
  const rng = createRng(seedFromString(`${match.seed}-moment-${match.minute}-${pl.playerId}`));
  if (rng.chance(quota / 88)) {
    const kind = pickKind(next, rng);
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

  const defensive = isDefensiveKind(mo.kind);
  const psGain = success ? { ...(pl.psGain ?? {}), [option.id]: ((pl.psGain ?? {})[option.id] ?? 0) + 1 } : (pl.psGain ?? {});
  if (!defensive) {
    const direct = SHOTS.includes(option.id) || option.id === "dribble" || option.id === "flair";
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
          const solo = mo.kind === "penalty" || mo.kind === "setpiece" || option.id === "dribble" || option.id === "flair";
          ev({ type: "goal", side: me, playerId: pl.playerId, assistId: solo ? undefined : mate?.id,
            text: mo.kind === "penalty" ? `BUT ! ${pl.playerName} transforme le penalty. ${score()}.`
              : mo.kind === "setpiece" ? `BUT ! Coup franc magnifique de ${pl.playerName}. ${score()}.`
              : `BUT ! ${pl.playerName} marque${!solo && mate ? ` après un service de ${mate.lastName}` : ""}. ${score()}.` });
          text = `But ! ${option.label} : ça fait mouche.`;
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
      const shot = SHOTS.includes(option.id);
      text = mo.kind === "penalty" ? "Penalty manqué !" : shot ? "Frappe non cadrée." : "Ballon perdu, l'adversaire récupère.";
      if (shot) { team.shots += 1; team.xg += Math.min(0.8, option.payoff) * 0.5; }
      if (mo.kind === "penalty") ev({ type: "chance", side: me, playerId: pl.playerId, text: `Penalty manqué par ${pl.playerName}.` });
    }
  } else {
    if (success) {
      const gk = isKeeperKind(mo.kind);
      bonus(gk ? 0.25 : 0.15);
      outcome = gk ? "saved" : "stopped";
      if (gk) { team.saves += 1; m[them].shots += 1; m[them].shotsOnTarget += 1; }
      ev({ type: "save", side: me, playerId: pl.playerId, text: gk ? `Parade décisive de ${pl.playerName} !` : `Intervention décisive de ${pl.playerName}.` });
      text = gk ? (mo.kind === "keepercross" ? "Centre maîtrisé !" : "Arrêt décisif !") : "Vous stoppez l'action.";
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
        ev({ type: "goal", side: them, playerId: s?.id, text: `BUT ! ${s ? `${shortName(s)}` : "L'adversaire"} marque pour ${opp.name}. ${score()}.` });
        text = "L'adversaire en profite et marque.";
      } else {
        outcome = "lost";
        text = "Vous êtes passé, mais l'action adverse n'aboutit pas.";
      }
    }
  }

  const log: DecisionLog = { minute: mo.minute, kind: mo.kind, option: option.id, success, outcome, text };
  return { ...pl, match: m, moment: null, decisions: [...pl.decisions, log], psGain };
}

/** Choix automatique : meilleure espérance (réussite × gain, ou risque évité en défense). */
export function bestOption(mo: KeyMoment): MomentOption {
  const value = (o: MomentOption) => (isDefensiveKind(mo.kind) ? o.chance + (1 - o.payoff) * 0.3 : o.chance * (0.4 + Math.min(1, o.payoff)));
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
