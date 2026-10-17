/** Feuilles de match, zones des classements, histoire des clubs, presse, étoiles. */

import { createPlayerCareer, starterClubs, profileOverall } from "../../player2/engine";
import { advancePlayerWeek, ensureCareer } from "../../player2/career";
import { answerPress } from "../../player2/press";
import { leagueZones } from "../../domain/competitions";
import { clubHistory } from "../../domain/clubHistory";
import { archiveClubRecords } from "../../domain/worldGenerator";
import { starSubs } from "../../player2/subAttributes";
import type { PlayerCareerState } from "../../player2/types";

const SEED = "immersion";
const club = starterClubs(SEED, "cp")[0];
let s: PlayerCareerState = ensureCareer(createPlayerCareer({ seed: SEED, clubId: club.id, firstName: "Léo", lastName: "Presse", nationality: "FRA", position: "ST", foot: "right", now: 0 }));
for (let i = 0; i < 12; i++) s = advancePlayerWeek(s);

test("feuilles de match de la semaine : compositions, buteurs, stats", () => {
  const sheets = s.shadow.world.weekSheets ?? [];
  expect(sheets.length).toBeGreaterThan(20);
  const sh = sheets.find(x => x.hs + x.as > 0)!;
  expect(sh.home.xi).toHaveLength(11);
  expect(sh.away.xi.length).toBeGreaterThanOrEqual(10);
  expect(sh.goals).toHaveLength(sh.hs + sh.as);
  expect(sh.home.possession + sh.away.possession).toBe(100);
  const weeks = new Set(sheets.map(x => x.weekIdx));
  expect(weeks.size).toBeLessThanOrEqual(2);
}, 120000);

test("zones : C1, C3 et relégation en D1, montée et barrages en D2", () => {
  const w = s.shadow.world;
  const z1 = leagueZones(w, "eng-1");
  expect(z1.slice(0, 4).every(z => z === "ucl")).toBe(true);
  expect(z1[4]).toBe("uel");
  expect(z1.slice(-3).every(z => z === "releg")).toBe(true);
  const z2 = leagueZones(w, "eng-2");
  expect(z2.slice(0, 2)).toEqual(["promo", "promo"]);
  expect(z2.slice(2, 4)).toEqual(["playoff", "playoff"]);
});

test("histoire du club : records archivés + saison, titres et entraîneur", () => {
  const w0 = s.shadow.world;
  const pid = w0.players.find(p => p.clubId === club.id && p.position === "ST")!.id;
  const w = {
    ...w0,
    clubRecords: archiveClubRecords(undefined, [{ playerId: pid, clubId: club.id, leagueId: "x", season: -5, goals: 200, assists: 10, appearances: 300, yellowCards: 0, redCards: 0, avgRating: 7 }]),
    leagueTitles: [{ leagueId: club.leagueId, season: 0, clubId: club.id, coachId: "coach-x" }, { leagueId: club.leagueId, season: -1, clubId: club.id, coachId: "coach-x" }],
  };
  const h = clubHistory(w, club.id);
  expect(h.scorers[0]).toMatchObject({ playerId: pid });
  expect(h.scorers[0].value).toBeGreaterThanOrEqual(200);
  expect(h.total).toBe(2);
  expect(h.bestCoach).toEqual({ coachId: "coach-x", titles: 2 });
});

test("presse : réponse et effets", () => {
  const q = { id: "q", topic: "hero" as const, journalist: "Foot Direct", question: "?", expiresAt: 9999, answers: [{ id: "spicy" as const, text: "Pique" }, { id: "humble" as const, text: "Merci" }] };
  const base = { ...s, career: { ...s.career!, press: q, fans: 50 } };
  const r = answerPress(base, "spicy");
  expect(r.ok).toBe(true);
  expect(r.state.career!.press).toBeNull();
  expect(r.state.coachTrust).toBe(Math.max(0, base.coachTrust - 4));
  expect(r.state.inbox[0].title).toContain("Foot Direct");
  expect(answerPress(r.state, "humble").ok).toBe(false);
});

test("étoiles : pied faible et gestes modifient les sous-attributs concernés", () => {
  const sub = s.profile.sub;
  const up = starSubs(sub, 5, 5);
  expect(up.finishing).toBe(Math.min(99, sub.finishing + 2));
  expect(up.dribbling).toBe(Math.min(99, sub.dribbling + 2));
  expect(up.standingTackle).toBe(sub.standingTackle);
  expect(profileOverall({ ...s.profile, weakFoot: 5, skillMoves: 5 })).toBeGreaterThanOrEqual(profileOverall({ ...s.profile, weakFoot: 1, skillMoves: 1 }));
});
