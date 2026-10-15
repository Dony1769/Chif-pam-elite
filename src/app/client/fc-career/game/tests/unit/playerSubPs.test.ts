/**
 * FC CAREER 27 — Sous-attributs, entraînement ciblé, PlayStyles, retraite (Lot A)
 */

import {
  ALL_SUBS, OUTFIELD_SUBS, faceOf, overallFromSubs, subsForTarget, subsFromFace, shiftSubs,
} from "../../player2/subAttributes";
import {
  PLAYSTYLES, emptyPlayStyles, psBonus, optionAvailable, unlockPlayStyles, playStylesFor, MAX_PS_PLUS, MAX_PS_OWNED, psCountFor,
} from "../../player2/playstyles";
import {
  createPlayerCareer, starterClubs, coachDecision, me, mutateSubs, preparePlayerMatch, profileOverall,
  setTrainingFocus, trainWeek, upgradeProfile, applyPlayStyleProgress, specialXpNeeded,
} from "../../player2/engine";
import { retirePlayer } from "../../player2/career";
import { startPlayerLive, stepPlayerLive } from "../../player2/live";
import type { PlayerLive } from "../../player2/live";
import { progressWorldPlayers } from "../../domain/playerProgression";
import type { PlayerCareerState } from "../../player2/types";
import type { WorldPlayerPosition } from "../../data/worldPlayers";

const SEED = "lotA";
const club = starterClubs(SEED)[0];
const fresh = (pos: WorldPlayerPosition = "ST") =>
  createPlayerCareer({ seed: SEED, clubId: club.id, firstName: "Léo", lastName: "Sub", nationality: "x", position: pos, foot: "right", now: 0 });

const POSITIONS: WorldPlayerPosition[] = ["GK", "CB", "LB", "RB", "DM", "CM", "AM", "LW", "RW", "ST"];

describe("Sous-attributs", () => {
  test("34 sous-attributs, profil de départ exactement sur la note visée pour chaque poste", () => {
    expect(ALL_SUBS).toHaveLength(34);
    expect(OUTFIELD_SUBS).toHaveLength(29);
    for (const pos of POSITIONS) {
      for (const target of [48, 65, 82]) expect(overallFromSubs(subsForTarget(pos, target, `t-${pos}`), pos)).toBe(target);
    }
  });

  test("les 6 caractéristiques d'une carte sont retrouvées depuis les sous-attributs", () => {
    const face = { pac: 91, sho: 88, pas: 74, dri: 86, def: 38, phy: 77 };
    const sub = subsFromFace(face, "ST", "card");
    expect(faceOf(sub, "ST")).toEqual(face);
    const gk = { pac: 86, sho: 84, pas: 75, dri: 89, def: 87, phy: 52 };
    expect(faceOf(subsFromFace(gk, "GK", "gk"), "GK")).toEqual(gk);
  });

  test("un buteur et un défenseur ne pèsent pas les mêmes sous-attributs", () => {
    const sniper = subsFromFace({ pac: 85, sho: 90, pas: 70, dri: 84, def: 30, phy: 70 }, "ST", "a");
    expect(overallFromSubs(sniper, "ST")).toBeGreaterThan(overallFromSubs(sniper, "CB") + 15);
  });

  test("shiftSubs déplace la note globale en gardant le profil", () => {
    const s = subsForTarget("CM", 70, "x");
    const up = shiftSubs(s, "CM", 76);
    expect(overallFromSubs(up, "CM")).toBe(76);
    expect(up.shortPassing).toBeGreaterThanOrEqual(s.shortPassing);
  });

  test("le profil créé contient sous-attributs, pied faible, gestes et PlayStyles vides", () => {
    const s = fresh();
    expect(Object.keys(s.profile.sub)).toHaveLength(34);
    expect(s.profile.weakFoot).toBeGreaterThanOrEqual(2);
    expect(s.profile.skillMoves).toBeGreaterThanOrEqual(2);
    expect(s.profile.playStyles.owned).toEqual([]);
    expect(me(s).overall).toBe(profileOverall(s.profile));
    expect(me(s).protected).toBe(true);
  });

  test("une ancienne sauvegarde sans sous-attributs est complétée au chargement", () => {
    const s = fresh();
    const old = { ...s, profile: { ...s.profile, trainingFocus: "sho" } } as unknown as PlayerCareerState;
    delete (old.profile as Partial<PlayerCareerState["profile"]>).sub;
    delete (old.profile as Partial<PlayerCareerState["profile"]>).playStyles;
    const up = upgradeProfile(old);
    expect(Object.keys(up.profile.sub)).toHaveLength(34);
    expect(up.profile.trainingFocus).toBe("group:sho");
    expect(up.profile.playStyles.owned).toEqual([]);
  });
});

describe("Entraînement ciblé", () => {
  const weeks = (s: PlayerCareerState, n: number) => { let c = s; for (let i = 0; i < n; i++) c = trainWeek(c, true, 7).state; return c; };

  test("un sous-attribut travaillé seul progresse plus vite que les autres", () => {
    const s0 = setTrainingFocus(fresh(), "finishing");
    const s1 = weeks(s0, 12);
    const d = (k: keyof typeof s0.profile.sub) => s1.profile.sub[k] - s0.profile.sub[k];
    expect(d("finishing")).toBeGreaterThan(d("volleys"));
    expect(d("finishing")).toBeGreaterThanOrEqual(3);
  });

  test("une famille entière progresse ensemble", () => {
    const s0 = setTrainingFocus(fresh(), "pac");
    expect(s0.profile.trainingFocus).toBe("group:pac");
    const s1 = weeks(s0, 12);
    expect(s1.profile.sub.acceleration).toBeGreaterThan(s0.profile.sub.acceleration);
    expect(s1.profile.sub.sprintSpeed).toBeGreaterThan(s0.profile.sub.sprintSpeed);
  });

  test("le pied faible gagne une étoile avec l'entraînement spécial", () => {
    const s0 = setTrainingFocus(fresh(), "weakFoot");
    const wf = s0.profile.weakFoot;
    let s = s0;
    for (let i = 0; i < 60 && s.profile.weakFoot === wf; i++) s = trainWeek(s, true, 7).state;
    expect(s.profile.weakFoot).toBe(wf + 1);
    expect(specialXpNeeded(4)).toBeGreaterThan(specialXpNeeded(2));
  });

  test("la note globale ne dépasse jamais le potentiel", () => {
    let s = fresh();
    s = { ...s, profile: { ...s.profile, potential: profileOverall(s.profile) } };
    s = weeks(s, 30);
    expect(profileOverall(s.profile)).toBeLessThanOrEqual(s.profile.potential);
  });
});

describe("PlayStyles", () => {
  test("36 PlayStyles officiels FC 27, dont 6 de gardien", () => {
    expect(PLAYSTYLES).toHaveLength(36);
    expect(PLAYSTYLES.filter(p => p.gk)).toHaveLength(6);
    expect(new Set(PLAYSTYLES.map(p => p.name)).size).toBe(36);
  });

  test("déblocage : il faut les seuils ET des réussites en match", () => {
    const sub = { ...subsForTarget("ST", 80, "ps"), finishing: 85, curve: 80 };
    const none = unlockPlayStyles(emptyPlayStyles(), sub, false, 80);
    expect(none.ps.owned).not.toContain("finesse_shot");
    const used = unlockPlayStyles({ ...emptyPlayStyles(), progress: { shoot: 12 } }, sub, false, 80);
    expect(used.ps.owned).toContain("finesse_shot");
    expect(used.gained.some(g => g.id === "finesse_shot" && !g.plus)).toBe(true);
  });

  test("PlayStyle+ : seuils supérieurs, plus de réussites, 3 au maximum", () => {
    const sub = Object.fromEntries(ALL_SUBS.map(k => [k, 95])) as ReturnType<typeof subsForTarget>;
    const progress = Object.fromEntries(["shoot", "pass", "dribble", "cross", "through", "longshot", "tackle", "intercept", "contain", "header", "aerial"].map(k => [k, 200]));
    const r = unlockPlayStyles({ ...emptyPlayStyles(), progress }, sub, false, 90);
    expect(r.ps.plus.length).toBe(MAX_PS_PLUS);
    expect(r.ps.owned.length).toBe(MAX_PS_OWNED);
    expect(r.ps.owned.every(id => !PLAYSTYLES.find(p => p.id === id)!.gk)).toBe(true);
  });

  test("bonus de réussite et options réservées", () => {
    const ps = { owned: ["finesse_shot" as const], plus: [], progress: {} };
    expect(psBonus(ps, "finesse")).toBeCloseTo(0.05);
    expect(psBonus({ ...ps, plus: ["finesse_shot" as const] }, "finesse")).toBeCloseTo(0.1);
    expect(optionAvailable(emptyPlayStyles(), "finesse")).toBe(false);
    expect(optionAvailable(ps, "finesse")).toBe(true);
    expect(optionAvailable(emptyPlayStyles(), "shoot")).toBe(true);
  });

  test("en direct, l'option « Enrouler » n'apparaît qu'avec Tir en finesse", () => {
    const base = coachDecision({ ...mutateSubs(fresh(), { finishing: 85, curve: 85 }), coachTrust: 100 });
    const withPs = { ...base, profile: { ...base.profile, playStyles: { owned: ["finesse_shot" as const], plus: [], progress: {} } } };
    const firstBox = (s: PlayerCareerState) => {
      const m = preparePlayerMatch(s)!;
      for (let salt = 0; salt < 40; salt++) {
        let pl: PlayerLive = startPlayerLive({ ...m, seed: `${m.seed}-${salt}` }, {
          id: s.profile.id, name: "L", attrs: s.profile.attrs, position: "ST", sub: s.profile.sub, ps: s.profile.playStyles,
        });
        while (!pl.match.finished) {
          pl = stepPlayerLive(pl);
          if (pl.moment) { if (pl.moment.kind === "box") return pl.moment; pl = { ...pl, moment: null }; }
        }
      }
      return null;
    };
    expect(firstBox(base)?.options.map(o => o.id)).not.toContain("finesse");
    expect(firstBox(withPs)?.options.map(o => o.id)).toContain("finesse");
  });

  test("progression des réussites après le match et message de déblocage", () => {
    const s = mutateSubs(fresh(), { finishing: 85, curve: 80 });
    const r = applyPlayStyleProgress(s, { shoot: 12 });
    expect(r.state.profile.playStyles.owned).toContain("finesse_shot");
    expect(r.news[0].title).toMatch(/PlayStyle débloqué : Tir en finesse/);
    expect(me(r.state).playStyles).toContain("finesse_shot");
  });

  test("joueurs du monde : PlayStyles selon leur profil", () => {
    const sub = subsFromFace({ pac: 97, sho: 90, pas: 80, dri: 92, def: 36, phy: 76 }, "ST", "mbp");
    const ps = playStylesFor(sub, false, 91);
    expect(ps.owned.length).toBe(psCountFor(91));
    expect(ps.owned.some(id => id === "rapid" || id === "quick_step")).toBe(true);
    expect(ps.plus.length).toBeGreaterThanOrEqual(1);
    expect(playStylesFor(subsFromFace({ pac: 66, sho: 60, pas: 64, dri: 64, def: 62, phy: 66 }, "CM", "avg"), false, 64).owned.length).toBeLessThanOrEqual(1);
  });
});

describe("Retraite", () => {
  test("le monde ne met jamais à la retraite le joueur de l'utilisateur", () => {
    const s = fresh();
    const players = s.shadow.world.players.map(p => (p.id === s.profile.id ? { ...p, age: 40 } : p));
    let cur = players;
    for (let season = 1; season <= 5; season++) cur = progressWorldPlayers(cur, season, `ret-${season}`, false).updated;
    expect(cur.find(p => p.id === s.profile.id)!.clubId).not.toBe("retired");
  });

  test("retraite volontaire à partir de 32 ans ; la carrière s'arrête", () => {
    const s = fresh();
    expect(retirePlayer(s).ok).toBe(false);
    const old = { ...s, shadow: { ...s.shadow, world: { ...s.shadow.world, players: s.shadow.world.players.map(p => (p.id === s.profile.id ? { ...p, age: 35 } : p)) } } };
    const r = retirePlayer(old);
    expect(r.ok).toBe(true);
    expect(r.state.retired?.age).toBe(35);
    expect(me(r.state).clubId).toBe("retired");
  });
});
