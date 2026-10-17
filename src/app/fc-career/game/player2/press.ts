/**
 * FC CAREER 27 — Carrière Joueur v2 : presse et conférences.
 *
 * Après certains matchs (grand match, doublé, contre-performance, banc
 * prolongé, rumeur de transfert), un journaliste pose une question. Le joueur
 * choisit sa réponse : humble, confiant, piquant ou évasif. Chaque ton agit
 * sur la confiance du coach, la réputation, le moral et la cote auprès des
 * supporters, et la presse en tire un titre.
 */

import { createRng, seedFromString } from "../utils/random";
import type { PlayerCareerState } from "./types";
import { myClub, pmsg, pushPlayerInbox } from "./engine";

export type Tone = "humble" | "confident" | "spicy" | "deflect";
export interface PressAnswer { id: Tone; text: string }
export interface PressQuestion {
  id: string;
  topic: "hero" | "flop" | "bench" | "rumour" | "bigwin" | "heavyloss";
  journalist: string;
  question: string;
  answers: PressAnswer[];
  /** Index absolu de semaine après lequel la question tombe (pas de commentaire) */
  expiresAt: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const weekIndex = (s: PlayerCareerState) => s.shadow.world.season * 100 + s.shadow.world.currentWeek;
const MEDIA = ["Le Kop Hebdo", "Foot Direct", "L'Équipe CP", "Gazzetta CP", "Marca CP", "Kicker CP", "The Athletic CP", "So Foot CP"];

export const TONE_EFFECT: Record<Tone, { trust: number; rep: number; morale: number; fans: number; label: string }> = {
  humble: { trust: 3, rep: 0.5, morale: 2, fans: 2, label: "humble" },
  confident: { trust: 0, rep: 1.5, morale: 4, fans: 3, label: "confiant" },
  spicy: { trust: -4, rep: 2.5, morale: 5, fans: -1, label: "piquant" },
  deflect: { trust: 1, rep: 0, morale: 0, fans: -1, label: "évasif" },
};

function bank(topic: PressQuestion["topic"], club: string, opp: string): { q: string; a: Record<Tone, string> } {
  switch (topic) {
    case "hero": return { q: `Quel match face à ${opp} ! Vous êtes devenu indispensable à ${club} ?`, a: {
      humble: "C'est le travail de toute l'équipe, je ne fais que finir les actions.", confident: "Je sais ce que je vaux. Et ce n'est qu'un début.",
      spicy: "Il fallait bien que quelqu'un se réveille dans cette équipe.", deflect: "On verra en fin de saison, on prend match après match." } };
    case "flop": return { q: `Soirée compliquée contre ${opp}. Comment l'expliquez-vous ?`, a: {
      humble: "Je n'ai pas été bon, je dois travailler plus. Je m'excuse auprès des supporters.", confident: "Un match raté, ça arrive. Je serai là la semaine prochaine.",
      spicy: "Je ne suis pas le seul à avoir mal joué ce soir.", deflect: "Je préfère ne pas commenter, on analysera la vidéo." } };
    case "bench": return { q: "Vous jouez peu en ce moment. Êtes-vous frustré ?", a: {
      humble: "Le coach fait ses choix, à moi de lui prouver qu'il peut compter sur moi.", confident: "Je suis prêt. Quand j'aurai ma chance, je ne la laisserai pas passer.",
      spicy: "Bien sûr que je suis frustré. Je mérite de jouer.", deflect: "Je me concentre sur l'entraînement." } };
    case "rumour": return { q: "On parle d'intérêts de plusieurs clubs pour vous. Votre avenir est-il ici ?", a: {
      humble: `Je suis heureux à ${club}, je ne pense qu'au prochain match.`, confident: "Les grands clubs regardent les bons joueurs, c'est flatteur.",
      spicy: "Si un projet plus ambitieux arrive, je l'étudierai.", deflect: "Il faut demander à mon agent." } };
    case "bigwin": return { q: `Grosse victoire contre ${opp}. ${club} peut-il viser plus haut ?`, a: {
      humble: "On reste humbles, le chemin est encore long.", confident: "On a les moyens d'aller chercher quelque chose de grand.",
      spicy: "Tout le monde nous sous-estimait. Plus maintenant.", deflect: "On savoure ce soir, on verra demain." } };
    case "heavyloss": return { q: `Lourde défaite face à ${opp}. Le vestiaire est-il touché ?`, a: {
      humble: "On a été mauvais collectivement, on doit se relever ensemble.", confident: "Une défaite ne fait pas une saison. On réagira.",
      spicy: "Certains devront se remettre en question.", deflect: "Pas de commentaire à chaud." } };
  }
}

/** Question après le match de la semaine (ou rien). */
export function maybePress(prev: PlayerCareerState, s: PlayerCareerState): PlayerCareerState {
  const c = s.career;
  if (!c || s.retired || s.shadow.world.dataset !== "cp") return s;
  const now = weekIndex(s);
  const sum = s.lastMatch !== prev.lastMatch ? s.lastMatch : null;
  // Une question en attente non répondue : « pas de commentaire »
  let cur = s;
  if (c.press && c.press.expiresAt < now) {
    cur = { ...cur, career: { ...c, press: null, fans: clamp((c.fans ?? 50) - 1, 0, 100) } };
  }
  if (cur.career!.press || !sum) return cur;
  const rng = createRng(seedFromString(`${s.shadow.world.seed}-press-${now}-${s.profile.id}`));
  const club = myClub(s).name;
  const r = sum.report;
  const mine = r.managedSide === "home" ? r.home.goals : r.away.goals, theirs = r.managedSide === "home" ? r.away.goals : r.home.goals;
  const oppId = r.managedSide === "home" ? r.awayClubId : r.homeClubId;
  const opp = s.shadow.world.clubs.find(x => x.id === oppId)?.name ?? "l'adversaire";
  const line = s.seasons.find(l => l.season === s.shadow.world.season);
  let topic: PressQuestion["topic"] | null = null;
  if (sum.played && ((sum.rating ?? 0) >= 8 || sum.goals >= 2)) topic = "hero";
  else if (sum.played && (sum.rating ?? 7) < 5.9) topic = "flop";
  else if (!sum.played && (line?.apps ?? 0) <= 3 && s.selection !== "injured" && rng.chance(0.3)) topic = "bench";
  else if (mine - theirs >= 3) topic = "bigwin";
  else if (theirs - mine >= 3) topic = "heavyloss";
  else if ((c.interests ?? []).length && rng.chance(0.3)) topic = "rumour";
  if (!topic || !rng.chance(topic === "hero" || topic === "flop" ? 0.85 : 0.55)) return cur;
  const b = bank(topic, club, opp);
  const press: PressQuestion = {
    id: `press-${now}`, topic, journalist: MEDIA[rng.int(0, MEDIA.length - 1)], question: b.q, expiresAt: now + 1,
    answers: (Object.keys(b.a) as Tone[]).map(id => ({ id, text: b.a[id] })),
  };
  return { ...cur, career: { ...cur.career!, press } };
}

/** Réponse du joueur : effets et titre de presse. */
export function answerPress(s: PlayerCareerState, tone: Tone): { ok: boolean; state: PlayerCareerState; message: string } {
  const c = s.career;
  const q = c?.press;
  if (!c || !q) return { ok: false, state: s, message: "Aucune question en attente." };
  const e = TONE_EFFECT[tone];
  const answer = q.answers.find(a => a.id === tone)?.text ?? "";
  const players = s.shadow.world.players.map(p => (p.id === s.profile.id ? { ...p, morale: clamp(p.morale + e.morale, 5, 100) } : p));
  const fans = clamp((c.fans ?? 50) + e.fans + (q.topic === "flop" && tone === "humble" ? 3 : 0) + (q.topic === "rumour" && tone === "spicy" ? -5 : 0), 0, 100);
  const next: PlayerCareerState = {
    ...s, coachTrust: clamp(s.coachTrust + e.trust, 0, 100),
    profile: { ...s.profile, reputation: clamp(Math.round((s.profile.reputation + e.rep) * 10) / 10, 1, 100) },
    shadow: { ...s.shadow, world: { ...s.shadow.world, players } },
    career: { ...c, press: null, fans },
  };
  const headline = tone === "spicy" ? `« ${answer} » : ${s.profile.lastName} met les pieds dans le plat`
    : tone === "confident" ? `${s.profile.lastName}, l'assurance d'un grand`
    : tone === "humble" ? `${s.profile.lastName} garde les pieds sur terre`
    : `${s.profile.lastName} reste discret`;
  return { ok: true, state: pushPlayerInbox(next, pmsg(next, "board", `${q.journalist} : ${headline}`, `« ${answer} » Ton ${e.label}. Supporters : ${fans}/100.`)), message: "Réponse publiée." };
}
