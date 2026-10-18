/** Moments forts de carrière et messagerie allégée. */

import { createPlayerCareer, starterClubs } from "../../player2/engine";
import { ensureCareer } from "../../player2/career";
import { detectMoments } from "../../player2/moments";
import { playerStep } from "../../player2/reducer";
import type { PlayerCareerState } from "../../player2/types";

const SEED = "moments";
const club = starterClubs(SEED, "cp")[0];
const base = ensureCareer(createPlayerCareer({ seed: SEED, clubId: club.id, firstName: "Léo", lastName: "Moment", nationality: "FRA", position: "ST", foot: "right", now: 0 }));
const line = (apps: number, goals: number) => ({ season: 1, clubId: club.id, leagueId: club.leagueId, apps, starts: apps, goals, assists: 0, ratingSum: apps * 7, motm: 0 });

test("premier match, premier but, paliers", () => {
  const a: PlayerCareerState = { ...base, seasons: [] };
  const b: PlayerCareerState = { ...base, seasons: [line(1, 1)] };
  const ids = detectMoments(a, b).map(m => m.id.split("-").slice(-2).join("-"));
  expect(ids).toEqual(expect.arrayContaining(["first-app", "first-goal"]));
  const c: PlayerCareerState = { ...base, seasons: [line(49, 24)] };
  const d: PlayerCareerState = { ...base, seasons: [line(50, 25)] };
  const t = detectMoments(c, d).map(m => m.title);
  expect(t).toEqual(expect.arrayContaining(["25 buts en carrière", "50 matchs en carrière"]));
});

test("première sélection et signature", () => {
  const a = base;
  const b: PlayerCareerState = { ...base, career: { ...base.career!, national: { ...base.career!.national, caps: 1 } } };
  expect(detectMoments(a, b).some(m => m.title === "Première sélection")).toBe(true);
  const other = base.shadow.world.clubs.find(c => c.id !== club.id)!;
  const c: PlayerCareerState = { ...base, contract: { ...base.contract, clubId: other.id }, career: { ...base.career!, lastMove: { clubId: other.id, fee: 9e12 } } };
  const m = detectMoments(a, c).find(x => x.id.includes("sign"));
  expect(m?.title).toBe("Transfert record !");
});

test("le reducer enregistre les moments une seule fois", () => {
  const s: PlayerCareerState = { ...base, seasons: [] };
  const r = playerStep(s, { type: "MARK_ALL_READ" });
  expect(r.state!.career!.moments ?? []).toHaveLength(0);
});
