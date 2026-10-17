/** Matchs de coupe jouables en Carrière Joueur (monde CP). */

import { createPlayerCareer, starterClubs, mutateSubs } from "../../player2/engine";
import { advancePlayerWeek, ensureCareer } from "../../player2/career";
import { applyCupMatch, myCupMatch, startCupLive } from "../../player2/cup";
import { simulateRest } from "../../player2/live";
import { playerStep } from "../../player2/reducer";
import { runCompetitions, tieKey } from "../../domain/competitions";
import type { PlayerCareerState } from "../../player2/types";

const SEED = "cups";
const club = starterClubs(SEED, "cp").find(c => c.leagueId.endsWith("-2"))!;

function toCupWeek(): PlayerCareerState {
  let s = mutateSubs(ensureCareer(createPlayerCareer({ seed: SEED, clubId: club.id, firstName: "Léo", lastName: "Coupe", nationality: "fra", position: "ST", foot: "right", now: 0 })),
    { finishing: 80, positioning: 80, shotPower: 78, ballControl: 78, reactions: 78 });
  for (let i = 0; i < 30 && !myCupMatch(s); i++) s = advancePlayerWeek(s);
  return s;
}

describe("Coupes jouables", () => {
  const s = toCupWeek();
  const cm = myCupMatch(s)!;

  test("le match de coupe du club est détecté la bonne semaine", () => {
    expect(cm).not.toBeNull();
    expect(cm.comp.kind).toBe("cup");
    expect([cm.tie.home, cm.tie.away]).toContain(club.id);
    expect(cm.stage).toMatch(/finale|Finale/);
  });

  test("joué en direct : résultat imposé au monde, match compté pour le joueur", () => {
    const pl = simulateRest(startCupLive(s, cm));
    const after = applyCupMatch(s, cm, pl.match, pl.psGain);
    expect(after.shadow.world.forcedTies?.[cm.key]).toBeDefined();
    expect(myCupMatch(after)?.key).not.toBe(cm.key);
    expect(after.inbox[0].title).toContain(cm.comp.name);
    const f = after.shadow.world.forcedTies![cm.key];
    const week = advancePlayerWeek(after);
    const comp = week.shadow.world.competitions!.find(c => c.id === cm.comp.id)!;
    const tie = comp.rounds.flatMap(r => r.ties).find(t => tieKey(comp, t) === cm.key)!;
    expect([tie.hs, tie.as]).toEqual([f.hs, f.as]);
    expect(tie.winner).toBeDefined();
    expect(week.shadow.world.forcedTies?.[cm.key]).toBeUndefined();
  }, 60000);

  test("action PLAY_CUP du reducer", () => {
    const pl = simulateRest(startCupLive(s, cm));
    const step = playerStep(s, { type: "PLAY_CUP", live: pl.match, psGain: pl.psGain });
    expect(step.state!.shadow.world.forcedTies?.[cm.key]).toBeDefined();
    const again = playerStep(step.state, { type: "PLAY_CUP", live: pl.match });
    expect(again.message?.ok).toBe(false);
  }, 60000);

  test("sans direct, le match est joué automatiquement avec le joueur", () => {
    const week = advancePlayerWeek(s);
    expect(week.inbox.some(m => m.title.startsWith(cm.comp.name))).toBe(true);
  }, 60000);
});

describe("Tournois de sélections jouables", () => {
  test("CP Euro : le joueur sélectionné joue les matchs de son pays", () => {
    let s = mutateSubs(ensureCareer(createPlayerCareer({ seed: SEED, clubId: club.id, firstName: "Léo", lastName: "Bleu", nationality: "FRA", position: "ST", foot: "right", now: 0 })),
      { finishing: 95, positioning: 95, shotPower: 95, ballControl: 95, reactions: 95, dribbling: 95, headingAccuracy: 95, strength: 92, sprintSpeed: 92, acceleration: 92, shortPassing: 90 });
    // Saison 2 (juin 2028 : année d'Euro), semaine 47 → création du tournoi
    let w: typeof s.shadow.world = { ...s.shadow.world, season: 2, currentWeek: 47, competitions: [] };
    w = runCompetitions(w, 47).world;
    w = { ...w, currentWeek: 48 };
    s = { ...s, shadow: { ...s.shadow, world: w } };
    const cm = myCupMatch(s);
    expect(cm?.national).toBe(true);
    expect(cm?.comp.id).toBe("euro");
    expect(cm?.team).toBe("FRA");
    expect(cm?.selection).toBe("starter");
    const pl = simulateRest(startCupLive(s, cm!));
    const after = applyCupMatch(s, cm!, pl.match, pl.psGain);
    expect(after.career!.national.caps).toBe(s.career!.national.caps + 1);
  }, 60000);
});
