/**
 * FC CAREER 27 — Monde CP : construction des joueurs.
 *
 * - Vrais joueurs (listes par ligue) : une voyelle du prénom et une du nom sont
 *   modifiées ; carte (6 caractéristiques), pied faible, gestes et PlayStyles
 *   conservés.
 * - Effectifs complétés par des joueurs inventés jusqu'à 24-25 joueurs.
 * - Régénérés : un retraité renvoie un jeune de même nationalité, poste et profil.
 */

import type { WorldPlayer, WorldPlayerPersonality, WorldPlayerPosition } from "../worldPlayers";
import { CP_CLUBS } from "./clubs";
import { NAME_POOLS, IMPORT_MIX } from "./names";
import { ENG1 } from "./players/eng1";
import { ESP1 } from "./players/esp1";
import { ITA1 } from "./players/ita1";
import { GER1 } from "./players/ger1";
import { FRA1 } from "./players/fra1";
import { D2 } from "./players/d2";
import { FC27_ROSTERS } from "./fc27";
import { faceOf, overallFromSubs, subsForTarget, subsFromFace } from "../../player2/subAttributes";
import { playStylesFor } from "../../player2/playstyles";
import { createRng, seedFromString } from "../../utils/random";

export const CP_SEASON_YEAR = 2026;

type Face = { pac: number; sho: number; pas: number; dri: number; def: number; phy: number };
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ─── Noms modifiés ───────────────────────────────────────────────────────────

const VOWEL_SWAP: Record<string, string> = {
  a: "e", e: "i", i: "a", o: "u", u: "o",
  á: "é", à: "è", â: "ê", ã: "e", ä: "e",
  é: "í", è: "i", ê: "i", ë: "i",
  í: "á", ì: "a", î: "a", ï: "a",
  ó: "ú", ò: "u", ô: "u", õ: "u", ö: "u", ø: "u",
  ú: "ó", ù: "o", û: "o", ü: "o",
};
const isVowel = (c: string) => c.toLowerCase() in VOWEL_SWAP;
const swapChar = (c: string) => {
  const low = c.toLowerCase();
  const r = VOWEL_SWAP[low] ?? low;
  return c === low ? r : r.toUpperCase();
};

/** Change une voyelle d'un mot : la première (mode "first") ou la dernière (mode "last"). */
function swapOne(word: string, mode: "first" | "last"): string {
  if (!word) return word;
  const chars = [...word];
  const idx = mode === "first"
    ? chars.findIndex((c, i) => isVowel(c) && i > 0 || (i === 0 && isVowel(c) && chars.length <= 3))
    : chars.map((c, i) => (isVowel(c) ? i : -1)).filter(i => i >= 0).pop() ?? -1;
  const at = idx >= 0 ? idx : chars.findIndex(isVowel);
  if (at < 0) return word;
  chars[at] = swapChar(chars[at]);
  return chars.join("");
}

/**
 * Nom modifié d'un vrai joueur : première voyelle du prénom (hors initiale),
 * dernière voyelle du nom. « Kylian Mbappé » → « Kylaan Mbappí ».
 */
export function alterName(first: string, last: string): { firstName: string; lastName: string } {
  const lastParts = last.split(" ");
  // Particules (van, de, da, di, el…) laissées intactes : on modifie le dernier mot
  const li = lastParts.length - 1;
  lastParts[li] = swapOne(lastParts[li], "last");
  return { firstName: first ? swapOne(first, "first") : "", lastName: lastParts.join(" ") };
}

// ─── Valeurs à l'échelle réelle ──────────────────────────────────────────────

/** Valeur marchande (€) : ~0,7 M€ à 60, ~25 M€ à 80, ~150 M€ à 90 (âge et potentiel compris). */
export function cpValue(overall: number, age: number, potential: number): number {
  const base = 700_000 * Math.pow(6, (overall - 60) / 10);
  const ageF = age <= 21 ? 1.5 : age <= 25 ? 1.25 : age <= 29 ? 1 : age <= 31 ? 0.7 : age <= 33 ? 0.4 : 0.2;
  const potF = potential - overall >= 8 ? 1.3 : 1;
  return Math.max(25_000, Math.round((base * ageF * potF) / 50_000) * 50_000);
}

// ─── Lecture des listes ──────────────────────────────────────────────────────

export interface RealLine {
  pos: WorldPlayerPosition; first: string; last: string; nat: string; yob: number;
  ovr: number; pot: number; face: Face; wf: number; sm: number; foot: "left" | "right";
}

const POS = new Set(["GK", "CB", "LB", "RB", "DM", "CM", "AM", "LW", "RW", "ST"]);

export function parseLines(block: string): RealLine[] {
  const out: RealLine[] = [];
  for (const raw of block.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const [pos, first, last, nat, yob, ovr, pot, faces, wf, sm, foot] = line.split("|");
    if (!POS.has(pos) || !Number(ovr)) continue; // 0 = joueur parti / incertain
    const f = faces.split(",").map(Number);
    // Gardien : PLO,PRI,PIE,RÉF,VIT,PLA → cases internes (pac=PLO, sho=PRI, pas=PIE, dri=RÉF, def=PLA, phy=VIT)
    const face: Face = pos === "GK"
      ? { pac: f[0], sho: f[1], pas: f[2], dri: f[3], def: f[5], phy: f[4] }
      : { pac: f[0], sho: f[1], pas: f[2], dri: f[3], def: f[4], phy: f[5] };
    out.push({
      pos: pos as WorldPlayerPosition, first, last, nat, yob: Number(yob), ovr: Number(ovr),
      pot: Math.max(Number(ovr), Number(pot)), face, wf: Number(wf) || 3, sm: Number(sm) || 2, foot: foot === "L" ? "left" : "right",
    });
  }
  return out;
}

export const REAL_ROSTERS: Record<string, string> = { ...ENG1, ...ESP1, ...ITA1, ...GER1, ...FRA1, ...D2 };

// ─── Listes officielles FC 27 ────────────────────────────────────────────────

const EA_POS: Record<string, WorldPlayerPosition> = {
  GK: "GK", CB: "CB", LB: "LB", LWB: "LB", RB: "RB", RWB: "RB", CDM: "DM", CM: "CM", CAM: "AM",
  LM: "LW", LW: "LW", RM: "RW", RW: "RW", CF: "ST", ST: "ST",
};
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z ]/g, "").trim();
let legacyIndex: Map<string, RealLine> | null = null;
/** Anciennes listes indexées par nom complet : on y reprend année de naissance, potentiel, pied faible, gestes. */
function legacy(): Map<string, RealLine> {
  if (legacyIndex) return legacyIndex;
  legacyIndex = new Map();
  for (const block of Object.values(REAL_ROSTERS)) {
    for (const l of parseLines(block)) {
      legacyIndex.set(norm(`${l.first} ${l.last}`), l);
      if (!l.first) legacyIndex.set(norm(l.last), l);
    }
  }
  return legacyIndex;
}
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

/** Âge plausible quand l'année de naissance est inconnue (selon la note). */
function guessAge(ovr: number, h: number): number {
  const [lo, hi] = ovr >= 80 ? [24, 31] : ovr >= 72 ? [21, 31] : ovr >= 65 ? [19, 30] : [17, 22];
  return lo + (h % (hi - lo + 1));
}
function guessPot(ovr: number, age: number, h: number): number {
  if (age <= 20) return Math.min(94, ovr + clamp((23 - age) * 3 + (h % 5), 4, 18));
  if (age <= 23) return Math.min(94, ovr + 2 + (h % 6));
  if (age <= 26) return ovr + (h % 4);
  return ovr;
}

/** Lignes « POSTE EA|Nom complet|NAT|année|note|6 cases ». */
export function parseFc27(block: string): RealLine[] {
  const out: RealLine[] = [];
  const idx = legacy();
  for (const raw of block.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const [eaPos, name, nat, yobS, ovrS, faces] = line.split("|");
    const pos = EA_POS[eaPos];
    const ovr = Number(ovrS);
    if (!pos || !ovr || !faces) continue;
    const f = faces.split(",").map(Number);
    const face: Face = pos === "GK"
      ? { pac: f[0], sho: f[1], pas: f[2], dri: f[3], def: f[5], phy: f[4] }
      : { pac: f[0], sho: f[1], pas: f[2], dri: f[3], def: f[4], phy: f[5] };
    const words = name.trim().split(/\s+/);
    const first = words.length > 1 ? words[0] : "";
    const last = words.length > 1 ? words.slice(1).join(" ") : words[0];
    const old = idx.get(norm(name));
    const h = hash(name);
    const yob = Number(yobS) || old?.yob || CP_SEASON_YEAR - guessAge(ovr, h);
    const age = CP_SEASON_YEAR - yob;
    const wide = ["LB", "LW"].includes(pos);
    out.push({
      pos, first, last, nat, yob, ovr,
      pot: Math.max(ovr, old ? old.pot + (ovr - old.ovr) : guessPot(ovr, age, h)),
      face,
      wf: old?.wf ?? 2 + (h % 3),
      sm: old?.sm ?? (pos === "GK" ? 1 : ["LW", "RW", "AM", "ST"].includes(pos) ? (face.dri >= 82 ? 4 : 3) : face.dri >= 80 ? 3 : 2),
      foot: old?.foot ?? (wide && h % 3 !== 0 ? "left" : h % 5 === 0 ? "left" : "right"),
    });
  }
  return out;
}

/** Effectif réel d'un club : FC 27 en priorité, sinon anciennes listes. */
export const realLinesFor = (clubId: string): RealLine[] =>
  FC27_ROSTERS[clubId] ? parseFc27(FC27_ROSTERS[clubId]) : parseLines(REAL_ROSTERS[clubId] ?? "");

// ─── Construction des joueurs ────────────────────────────────────────────────

const TEMPLATE: WorldPlayerPosition[] = ["GK", "GK", "GK", "CB", "CB", "CB", "CB", "LB", "LB", "RB", "RB", "DM", "DM", "CM", "CM", "CM", "AM", "AM", "LW", "LW", "RW", "RW", "ST", "ST", "ST"];
const PERSONALITIES: WorldPlayerPersonality[] = ["leader", "genius", "warrior", "showman", "introvert", "volatile", "veteran", "prodigy", "journeyman"];

/** Niveau moyen visé d'un effectif d'après la réputation du club. */
export const squadLevel = (rep: number) => Math.round(30 + rep * 0.6);

function basePlayer(p: {
  id: string; clubId: string; leagueId: string; firstName: string; lastName: string; nat: string; age: number;
  pos: WorldPlayerPosition; ovr: number; pot: number; face: Face; wf: number; sm: number; foot: "left" | "right";
  personality: WorldPlayerPersonality; contractWeeks: number; birthDay: number; regenOf?: string;
}): WorldPlayer {
  const sub = subsFromFace(p.face, p.pos, p.id, p.ovr);
  const ps = playStylesFor(sub, p.pos === "GK", p.ovr);
  return {
    id: p.id, clubId: p.clubId, leagueId: p.leagueId, countryId: p.nat, nationality: p.nat,
    firstName: p.firstName, lastName: p.lastName, age: p.age, position: p.pos, overall: p.ovr, potential: p.pot,
    personality: p.personality, traits: [], form: 70, fatigue: 0, morale: 70, injury: null,
    careerGoals: 0, careerAssists: 0, careerAppearances: 0, seasonStats: [],
    marketValue: cpValue(p.ovr, p.age, p.pot), contractWeeksLeft: p.contractWeeks,
    face: p.face, weakFoot: p.wf, skillMoves: p.sm, foot: p.foot,
    playStyles: ps.owned, playStylesPlus: ps.plus, birthDay: p.birthDay, regenOf: p.regenOf,
  };
}

function pickNation(countryId: string, rng: ReturnType<typeof createRng>): string {
  const mix = IMPORT_MIX[countryId] ?? IMPORT_MIX.eng;
  return rng.chance(mix.local_share) ? mix.local : rng.pick(mix.imports);
}

function poolFor(nat: string, countryId: string) {
  return NAME_POOLS[nat] ?? NAME_POOLS[(IMPORT_MIX[countryId] ?? IMPORT_MIX.eng).local];
}

/** Joueur inventé pour compléter un effectif. */
export function inventPlayer(o: {
  id: string; clubId: string; leagueId: string; countryId: string; pos: WorldPlayerPosition; ovr: number; age: number;
  pot: number; seed: string; nat?: string; regenOf?: string; faceHint?: Face;
}): WorldPlayer {
  const rng = createRng(seedFromString(o.seed));
  const nat = o.nat ?? pickNation(o.countryId, rng);
  const pool = poolFor(nat, o.countryId);
  let face: Face;
  if (o.faceHint) {
    // Même profil que le joueur d'origine, ramené au niveau visé
    const shift = o.ovr - Math.round((o.faceHint.pac + o.faceHint.sho + o.faceHint.pas + o.faceHint.dri + o.faceHint.def + o.faceHint.phy) / 6);
    const adj = (v: number) => clamp(Math.round(v + shift * 0.9 + (rng.next() - 0.5) * 6), 20, 95);
    face = { pac: adj(o.faceHint.pac), sho: adj(o.faceHint.sho), pas: adj(o.faceHint.pas), dri: adj(o.faceHint.dri), def: adj(o.faceHint.def), phy: adj(o.faceHint.phy) };
    // Recalage : la note est celle visée
    const sub = subsFromFace(face, o.pos, o.id);
    const real = overallFromSubs(sub, o.pos);
    if (Math.abs(real - o.ovr) > 2) face = faceOf(subsForTarget(o.pos, o.ovr, o.id), o.pos);
  } else {
    face = faceOf(subsForTarget(o.pos, o.ovr, o.id), o.pos);
  }
  const sm = o.pos === "GK" ? 1 : clamp((["LW", "RW", "AM", "ST"].includes(o.pos) ? 3 : 2) + (rng.chance(0.3) ? 1 : 0) - (rng.chance(0.2) ? 1 : 0), 1, 5);
  return basePlayer({
    id: o.id, clubId: o.clubId, leagueId: o.leagueId, firstName: rng.pick(pool.first), lastName: rng.pick(pool.last), nat,
    age: o.age, pos: o.pos, ovr: o.ovr, pot: o.pot, face, wf: rng.int(2, 4), sm, foot: rng.chance(0.25) ? "left" : "right",
    personality: o.age <= 20 ? "prodigy" : rng.pick(PERSONALITIES), contractWeeks: rng.int(1, 4) * 52, birthDay: rng.int(1, 365),
    regenOf: o.regenOf,
  });
}

/** Tous les joueurs du monde CP au début de la saison 2026-27. */
export function buildCpPlayers(seed: string): WorldPlayer[] {
  const players: WorldPlayer[] = [];
  const seen = new Set<string>();
  for (const club of CP_CLUBS) {
    const rng = createRng(seedFromString(`${seed}-cp-${club.id}`));
    let real = realLinesFor(club.id).filter(l => {
      const key = `${l.first}|${l.last}|${l.yob}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    // Au plus 30 joueurs : les 3 meilleurs gardiens et les 27 meilleurs joueurs de champ
    if (real.length > 30) {
      const byOvr = [...real].sort((a, b) => b.ovr - a.ovr);
      const keep = new Set([...byOvr.filter(l => l.pos === "GK").slice(0, 3), ...byOvr.filter(l => l.pos !== "GK").slice(0, 27)]);
      real = real.filter(l => keep.has(l));
    }
    const squad: WorldPlayer[] = real.map((l, i) => {
      const { firstName, lastName } = alterName(l.first, l.last);
      return basePlayer({
        id: `cp-${club.id}-${i}`, clubId: club.id, leagueId: club.leagueId, firstName, lastName, nat: l.nat,
        age: CP_SEASON_YEAR - l.yob, pos: l.pos, ovr: l.ovr, pot: l.pot, face: l.face, wf: l.wf, sm: l.sm, foot: l.foot,
        personality: CP_SEASON_YEAR - l.yob <= 20 ? "prodigy" : CP_SEASON_YEAR - l.yob >= 33 ? "veteran" : rng.pick(PERSONALITIES),
        contractWeeks: rng.int(1, 5) * 52, birthDay: rng.int(1, 365),
      });
    });
    // Compléter selon le gabarit d'effectif (3 gardiens, 4 centraux…)
    const level = real.length >= 11
      ? Math.round([...real].sort((a, b) => b.ovr - a.ovr).slice(0, 11).reduce((t, l) => t + l.ovr, 0) / 11)
      : squadLevel(club.reputation);
    const need = [...TEMPLATE];
    for (const p of squad) { const k = need.indexOf(p.position); if (k >= 0) need.splice(k, 1); }
    let n = squad.length;
    for (const pos of need) {
      if (squad.length >= 25) break;
      const young = rng.chance(0.3);
      const age = young ? rng.int(17, 21) : rng.int(22, 33);
      const ovr = clamp(level - rng.int(3, 9) - (young ? rng.int(2, 6) : 0), 45, 88);
      const pot = clamp(ovr + (young ? rng.int(6, 16) : age <= 26 ? rng.int(1, 5) : 0), ovr, 92);
      squad.push(inventPlayer({
        id: `cp-${club.id}-g${n++}`, clubId: club.id, leagueId: club.leagueId, countryId: club.countryId,
        pos, ovr, age, pot, seed: `${seed}-${club.id}-gen-${n}`,
      }));
    }
    players.push(...squad);
  }
  return players;
}

/**
 * Régénéré : à la retraite d'un joueur, un jeune de 16-17 ans de même
 * nationalité, même poste et même profil apparaît (potentiel proche du pic du retraité).
 */
export function regenFrom(retiree: WorldPlayer, clubId: string, leagueId: string, countryId: string, season: number): WorldPlayer {
  const rng = createRng(seedFromString(`regen-${retiree.id}-${season}`));
  const peak = Math.max(retiree.potential ?? retiree.overall, retiree.overall);
  const pot = clamp(peak + rng.int(-5, 3), 60, 95);
  const ovr = clamp(Math.round(pot * 0.62) + rng.int(-3, 3), 44, 66);
  return inventPlayer({
    id: `rg-${retiree.id}-s${season}`, clubId, leagueId, countryId, pos: retiree.position, ovr, pot,
    age: rng.int(16, 17), seed: `regen-${retiree.id}-${season}-p`, nat: retiree.nationality, regenOf: retiree.id,
    faceHint: retiree.face,
  });
}
