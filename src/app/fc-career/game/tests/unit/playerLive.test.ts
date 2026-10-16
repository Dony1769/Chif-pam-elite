/**
 * FC CAREER 27 — Tests des décisions clés en direct (Lot J2)
 */

import {
  createPlayerCareer, starterClubs, preparePlayerMatch, mutateAttrs, coachDecision, playPlayerWeek,
} from "../../player2/engine";
import {
  startPlayerLive, stepPlayerLive, decide, simulateRest, bestOption, onPitch, MOMENTS_PER_MATCH,
} from "../../player2/live";
import type { PlayerLive, KeyMoment } from "../../player2/live";
import { finishMatch } from "../../manager/matchSim";
import type { PlayerCareerState } from "../../player2/types";
import type { WorldPlayerPosition } from "../../data/worldPlayers";

const SEED = "j2-test";
const club = starterClubs(SEED)[0];

function career(pos: WorldPlayerPosition = "ST", level = 60): PlayerCareerState {
  let s = createPlayerCareer({ seed: SEED, clubId: club.id, firstName: "Léo", lastName: "Test", nationality: "x", position: pos, foot: "right", now: 0 });
  s = mutateAttrs(s, { pac: level, sho: level, pas: level, dri: level, def: level, phy: level });
  return coachDecision({ ...s, coachTrust: 100 });
}

function live(s: PlayerCareerState, salt = ""): PlayerLive {
  const m = preparePlayerMatch(s)!;
  return startPlayerLive({ ...m, seed: m.seed + salt }, { id: s.profile.id, name: "L. Test", attrs: s.profile.attrs, position: s.profile.position });
}

/** Avance jusqu'au premier moment clé (ou la fin). */
function untilMoment(pl: PlayerLive): PlayerLive {
  let cur = pl;
  while (!cur.moment && !cur.match.finished) cur = stepPlayerLive(cur);
  return cur;
}

describe("Moments clés", () => {
  test("un moment met le match en pause jusqu'à la décision", () => {
    const pl = untilMoment(live(career()));
    expect(pl.moment).not.toBeNull();
    const minute = pl.match.minute;
    expect(stepPlayerLive(pl)).toBe(pl); // pas d'avance tant que rien n'est décidé
    const after = decide(pl, pl.moment!.options[0].id);
    expect(after.moment).toBeNull();
    expect(after.decisions).toHaveLength(1);
    expect(after.match.minute).toBe(minute);
  });

  test("options adaptées au poste, probabilités entre 8 % et 92 %", () => {
    for (const pos of ["ST", "CB", "GK", "CM", "LW"] as WorldPlayerPosition[]) {
      const pl = untilMoment(live(career(pos)));
      if (!pl.moment) continue;
      const k = pl.moment.kind;
      if (pos === "GK") expect(["keeper", "keepercross", "gkbuild"]).toContain(k);
      if (pos === "ST") expect(["box", "long", "air", "setpiece", "penalty"]).toContain(k);
      for (const o of pl.moment.options) {
        expect(o.chance).toBeGreaterThanOrEqual(0.08);
        expect(o.chance).toBeLessThanOrEqual(0.92);
      }
    }
  });

  test("un joueur plus fort a de meilleures chances de réussite", () => {
    const weak = untilMoment(live(career("ST", 45)));
    const strong = untilMoment(live(career("ST", 90)));
    const avg = (m: KeyMoment | null) => (m ? m.options.reduce((a, o) => a + o.chance, 0) / m.options.length : 0);
    expect(avg(strong.moment)).toBeGreaterThan(avg(weak.moment));
  });

  test("score toujours cohérent avec les buts inscrits au direct", () => {
    for (let i = 0; i < 20; i++) {
      const pl = simulateRest(live(career(), `-coh-${i}`));
      const r = finishMatch(pl.match);
      expect(r.events.filter(e => e.type === "goal" && e.side === "home").length).toBe(r.home.goals);
      expect(r.events.filter(e => e.type === "goal" && e.side === "away").length).toBe(r.away.goals);
    }
  });

  test("simuler le reste termine le match, quota de moments respecté", () => {
    const pl = simulateRest(live(career()));
    expect(pl.match.finished).toBe(true);
    expect(pl.decisions.length).toBeLessThanOrEqual(MOMENTS_PER_MATCH.ST + 2);
  });

  test("déterministe : mêmes choix → même match", () => {
    const a = simulateRest(live(career(), "-det"));
    const b = simulateRest(live(career(), "-det"));
    expect(finishMatch(a.match)).toEqual(finishMatch(b.match));
  });

  test("bien décider rapporte plus que mal décider (note moyenne sur 60 matchs)", () => {
    const worst = (m: KeyMoment) => [...m.options].sort((x, y) => x.chance * (0.4 + x.payoff) - y.chance * (0.4 + y.payoff))[0];
    let good = 0, bad = 0, n = 0;
    for (let i = 0; i < 60; i++) {
      const base = live(career("ST", 60), `-q-${i}`);
      let g = base, b = base;
      while (!g.match.finished) g = g.moment ? decide(g, bestOption(g.moment).id) : stepPlayerLive(g);
      while (!b.match.finished) b = b.moment ? decide(b, worst(b.moment).id) : stepPlayerLive(b);
      const rg = finishMatch(g.match).ratings[g.playerId], rb = finishMatch(b.match).ratings[b.playerId];
      if (rg !== undefined && rb !== undefined) { good += rg; bad += rb; n++; }
    }
    expect(n).toBeGreaterThan(20);
    expect(good / n).toBeGreaterThan(bad / n);
  });

  test("remplaçant non entré : aucun moment", () => {
    const s = career("ST", 60);
    const m = preparePlayerMatch(s)!;
    const side = m.managedSide;
    const benched = { ...m, [side]: { ...m[side], pitch: m[side].pitch.map(p => (p?.id === s.profile.id ? null : p)) } };
    let pl = startPlayerLive(benched, { id: s.profile.id, name: "L", attrs: s.profile.attrs, position: "ST" });
    expect(onPitch(pl)).toBe(false);
    for (let i = 0; i < 90 && !pl.match.finished; i++) pl = stepPlayerLive(pl);
    expect(pl.decisions).toHaveLength(0);
  });
});

describe("Intégration à la carrière", () => {
  test("le direct joué compte dans la saison (buts, note) via playPlayerWeek", () => {
    const s = career("ST", 70);
    const pl = simulateRest(live(s));
    const r = finishMatch(pl.match);
    const myGoals = r.events.filter(e => e.type === "goal" && e.playerId === s.profile.id).length;
    const next = playPlayerWeek(s, pl.match);
    expect(next.lastMatch?.report.fixtureId).toBe(pl.match.fixtureId);
    expect(next.lastMatch?.goals).toBe(myGoals);
    expect(next.seasons[0].goals).toBe(myGoals);
    expect(next.lastMatch?.rating).toBe(r.ratings[s.profile.id]);
  });
});
