/** Recruteurs à objectifs et postes secondaires (Carrière Joueur v2, monde CP). */

import { createPlayerCareer, starterClubs, mutateSubs, coachDecision, setPrimaryPosition, upgradeProfile } from "../../player2/engine";
import { advancePlayerWeek, ensureCareer } from "../../player2/career";
import { buildObjectives, interestDone, nextDeadline, objectiveProgress, weeksBetween } from "../../player2/scouting";
import { familiarityPenalty, gainFamiliarity, positionRatings, switchPrimary } from "../../player2/positions";
import type { PlayerCareerState } from "../../player2/types";
import { FORMATIONS } from "../../manager/tactics";
import type { WorldPlayerPosition } from "../../data/worldPlayers";

const SEED = "scout";
const clubs = starterClubs(SEED, "cp");
const fresh = (pos: WorldPlayerPosition = "ST", clubId = clubs[0].id) =>
  ensureCareer(createPlayerCareer({ seed: SEED, clubId, firstName: "Léo", lastName: "Scout", nationality: "fra", position: pos, foot: "right", now: 0 }));

describe("Postes secondaires", () => {
  test("familiarité de départ, pénalité et note par poste", () => {
    const s = fresh("RW");
    expect(s.profile.familiarity?.LW).toBe(60);
    expect(familiarityPenalty(60)).toBe(4);
    expect(familiarityPenalty(100)).toBe(0);
    const r = positionRatings(s.profile.sub, "RW", s.profile.familiarity!);
    expect(r.RW).toBeDefined();
    expect(r.LW).toBeLessThanOrEqual(r.RW! + 5);
    const wp = s.shadow.world.players.find(p => p.id === s.profile.id)!;
    expect(wp.posRatings?.RW).toBe(r.RW);
  });

  test("jouer à un poste fait progresser la familiarité ; à 80 il peut devenir principal", () => {
    let fam = { LW: 60 } as Partial<Record<WorldPlayerPosition, number>>;
    fam = gainFamiliarity(fam, "RW", "LW");
    expect(fam.LW).toBe(66);
    let s = fresh("RW");
    expect(setPrimaryPosition(s, "LW").ok).toBe(false);
    s = { ...s, profile: { ...s.profile, familiarity: { ...s.profile.familiarity, LW: 85 } } };
    const r = setPrimaryPosition(s, "LW");
    expect(r.ok).toBe(true);
    expect(r.state.profile.position).toBe("LW");
    expect(r.state.profile.familiarity?.RW).toBe(100);
    expect(switchPrimary({ LW: 85 }, "RW", "LW").LW).toBeUndefined();
  });

  test("barré à son poste, le joueur est décalé là où il est meilleur", () => {
    const s0 = coachDecision(fresh("RW"));
    const slots = FORMATIONS[s0.shadow.tactic.formation].map(x => x.pos);
    const target = slots.find(p => p !== "RW" && p !== "GK")!;
    const players = s0.shadow.world.players.map(p => (p.id === s0.profile.id ? { ...p, posRatings: { RW: 40, [target]: 99 } } : p));
    const s = coachDecision({ ...s0, shadow: { ...s0.shadow, world: { ...s0.shadow.world, players } } });
    expect(s.selection).toBe("starter");
    expect(s.playedAs).toBe(target);
  });

  test("anciennes sauvegardes : familiarité ajoutée", () => {
    const s = fresh("ST");
    const old = { ...s, profile: { ...s.profile, familiarity: undefined } } as PlayerCareerState;
    expect(upgradeProfile(old).profile.familiarity?.AM).toBe(40);
  });
});

describe("Recruteurs à objectifs", () => {
  test("échéance au prochain mercato, avec au moins 8 semaines de suivi", () => {
    expect(nextDeadline(112)).toBe(131);
    expect(nextDeadline(126)).toBe(209);
    expect(weeksBetween(140, 209)).toBe(21);
  });

  test("objectifs adaptés au poste et plus exigeants pour un grand club", () => {
    const st = fresh("ST");
    const small = buildObjectives(st, 55, 20, "a");
    const big = buildObjectives(st, 85, 20, "a");
    expect(small.some(o => o.kind === "goals")).toBe(true);
    const goals = (l: typeof small) => l.find(o => o.kind === "goals")!.target;
    expect(goals(big)).toBeGreaterThan(goals(small));
    const gk = buildObjectives(fresh("GK"), 70, 20, "b");
    expect(gk.some(o => o.kind === "cleanSheets")).toBe(true);
    expect(gk.some(o => o.kind === "goals")).toBe(false);
    const cb = buildObjectives(fresh("CB"), 70, 20, "c");
    expect(cb.some(o => o.kind === "cleanSheets")).toBe(true);
  });

  test("avancement depuis le début du suivi", () => {
    const s = fresh("ST");
    const base = { apps: 2, starts: 2, goals: 3, assists: 0, cleanSheets: 0, bigGames: 0, ratingSum: 14 };
    const it = { id: "i", clubId: clubs[1].id, since: 100, deadline: 131, role: "rotation" as const, base, ready: false,
      objectives: [{ kind: "goals" as const, target: 2 }, { kind: "sub" as const, sub: "finishing" as const, target: 99 }] };
    const now = { ...s, career: { ...s.career!, tally: { ...base, goals: 5, apps: 6, ratingSum: 42 } } };
    expect(objectiveProgress(now, it, it.objectives[0])).toEqual({ value: 2, target: 2, done: true });
    expect(interestDone(now, it)).toBe(false);
    const strong = mutateSubs(now, { finishing: 99 });
    expect(interestDone(strong, it)).toBe(true);
  });

  test("une saison : des clubs suivent le joueur, aucune offre de transfert sans objectifs remplis", () => {
    let s = mutateSubs(fresh("ST"), { finishing: 88, positioning: 86, shotPower: 85, ballControl: 84, reactions: 84 });
    const season = s.shadow.world.season;
    let sawInterest = false;
    const followed = new Set<string>();
    for (let i = 0; i < 60 && s.shadow.world.season === season; i++) {
      (s.career!.interests ?? []).forEach(x => followed.add(x.clubId));
      s = advancePlayerWeek(s);
      if ((s.career!.interests ?? []).length) sawInterest = true;
      // Une offre de transfert vient toujours d'un club qui suivait le joueur
      for (const o of s.career!.offers.filter(x => x.kind === "transfer")) expect(followed.has(o.clubId)).toBe(true);
    }
    expect(sawInterest).toBe(true);
    expect(s.inbox.some(m => /vous observe/.test(m.title))).toBe(true);
  }, 120000);
});
