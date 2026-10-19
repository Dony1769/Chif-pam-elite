import { createPlayerCareer, starterClubs } from "../../player2/engine";
import { ensureCareer, simulateCareerSeason } from "../../player2/career";
import { refillObjectives, objectivesAfterMatch } from "../../player2/objectives";
import type { PlayerCareerState, PlayerMatchSummary } from "../../player2/types";

const SEED = "obj-test";
const club = starterClubs(SEED)[2];
const fresh = (): PlayerCareerState => ensureCareer(createPlayerCareer({ seed: SEED, clubId: club.id, firstName: "Léo", lastName: "Test", nationality: "FRA", position: "ST", foot: "right" }));

describe("Objectifs de développement", () => {
  test("trois objectifs actifs, réussite récompensée", () => {
    let s = refillObjectives(fresh());
    expect(s.career!.objectives!.active).toHaveLength(3);
    const before = s.profile.sub;
    const sum = { played: true, started: true, rating: 9, goals: 5, assists: 5, motm: true } as unknown as PlayerMatchSummary;
    for (let i = 0; i < 8; i++) s = objectivesAfterMatch(s, sum);
    expect(s.career!.objectives!.done).toBeGreaterThan(0);
    const gained = Object.keys(before).some(k => (s.profile.sub as unknown as Record<string, number>)[k] > (before as unknown as Record<string, number>)[k]);
    expect(gained).toBe(true);
    expect(s.career!.objectives!.active).toHaveLength(3);
  });

  test("une saison simulée fait vivre les objectifs", () => {
    const s = simulateCareerSeason(fresh(), false);
    const o = s.career!.objectives!;
    expect(o.done + o.failed).toBeGreaterThan(2);
  });
});
