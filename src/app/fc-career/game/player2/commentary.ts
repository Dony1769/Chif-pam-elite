/**
 * FC CAREER 27 — Le commentateur : une phrase vivante pour chaque temps fort,
 * variée mais déterministe (même match, mêmes mots), avec votre célébration
 * quand vous marquez.
 */

import type { MatchEvent } from "../manager/types";
import { celebrationLine } from "./identity";

export interface CommentCtx {
  name: (id?: string) => string | undefined;
  team: (side: "home" | "away") => string;
  meId: string;
  mySide: "home" | "away";
  celebration?: string;
  score?: { home: number; away: number };
}

const pick = (arr: string[], seed: number) => arr[Math.abs(seed) % arr.length];

export function commentLine(e: MatchEvent, c: CommentCtx): string {
  const who = c.name(e.playerId) ?? "le joueur";
  const team = c.team(e.side);
  const ours = e.side === c.mySide;
  const me = e.playerId === c.meId;
  const seed = e.minute * 7 + e.type.length;
  switch (e.type) {
    case "goal": {
      const assist = c.name(e.assistId);
      const how = e.setPiece === "corner" ? "sur corner" : e.setPiece === "freekick" ? "sur coup franc" : assist ? `sur un service de ${assist}` : "";
      const base = me
        ? pick([`BUUUT ! ${who} ! Quelle frappe ${how} !`, `Il l'a fait ! ${who} trompe le gardien ${how} !`, `${who} au bout de l'action ${how}, c'est le but !`], seed)
        : ours
          ? pick([`But pour ${team} ! ${who} conclut ${how}.`, `${who} fait trembler les filets ${how} !`, `Et c'est ${who} qui marque ${how} !`], seed)
          : pick([`Coup dur… ${who} marque pour ${team} ${how}.`, `${team} frappe : ${who} ne laisse aucune chance ${how}.`, `Silence dans votre camp, ${who} a marqué ${how}.`], seed);
      const cel = me ? celebrationLine(c.celebration) : undefined;
      return cel ? `${base.replace(/\s+!/g, " !").replace(/\s+\./g, ".")} ${who} ${cel} !` : base.replace(/\s+!/g, " !").replace(/\s+\./g, ".");
    }
    case "save": {
      const sh = c.name(e.shooterId) ?? "l'attaquant";
      return pick([`Quel arrêt de ${who} devant ${sh} !`, `${who} s'interpose, la frappe de ${sh} est repoussée.`, `${sh} y croyait, mais ${who} a la parade !`], seed);
    }
    case "shot":
      return e.result === "saved"
        ? pick([`${who} cadre, le gardien capte sans trembler.`, `Tentative de ${who}, bien captée.`], seed)
        : pick([`${who} tente sa chance… à côté !`, `La frappe de ${who} passe au-dessus.`, `${who} manque le cadre de peu, le public a cru au but.`], seed);
    case "chance":
      return pick([`Énorme occasion pour ${team} ! ${who} tout proche.`, `${who} trouve le poteau !`, `Ça chauffe devant le but, ${who} n'a pas pu conclure.`], seed);
    case "corner":
      return pick([`Corner pour ${team}, tout le monde monte.`, `${team} obtient un corner, ${who} se place.`], seed);
    case "freekick":
      return pick([`Coup franc dangereux pour ${team}. ${who} prend le ballon.`, `Faute aux abords de la surface : coup franc, ${who} s'en charge.`], seed);
    case "yellow":
      return pick([`Carton jaune pour ${who}, l'arbitre ne transige pas.`, `${who} est averti.`], seed);
    case "red":
      return `Carton rouge ! ${who} laisse ${team} à dix.`;
    case "injury":
      return `${who} reste au sol… il semble touché.`;
    case "sub":
      return `Changement pour ${team} : ${c.name(e.inPlayerId) ?? "un remplaçant"} remplace ${who}.`;
    case "half_time":
      return c.score ? `C'est la pause, ${c.score.home}-${c.score.away}.` : "C'est la pause.";
    case "full_time":
      return c.score ? `Coup de sifflet final ! ${c.score.home}-${c.score.away}.` : "Coup de sifflet final !";
    default:
      return e.text;
  }
}
