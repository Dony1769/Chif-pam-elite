/** Phases de jeu positionnelles : vrais joueurs, possession réelle, fin de phase conforme au moteur. */

import { createPlayerCareer, starterClubs, preparePlayerMatch } from "../../player2/engine";
import { advancePlayerWeek, ensureCareer } from "../../player2/career";
import { minuteFrames, shape, anchors } from "../../player2/pitchPlay";

const club = starterClubs("phase", "cp")[0];
let s = ensureCareer(createPlayerCareer({ seed: "phase", clubId: club.id, firstName: "A", lastName: "B", nationality: "FRA", position: "ST", foot: "right", now: 0 }));
for (let i = 0; i < 12 && !preparePlayerMatch(s); i++) s = advancePlayerWeek(s);
const m = preparePlayerMatch(s)!;
const me = m.managedSide, them = me === "home" ? "away" : "home";
const base = { mine: m[me], theirs: m[them], mySide: me, minute: 10, seed: "x" } as const;

test("tous les joueurs placés, bloc qui suit le ballon", () => {
  const all = anchors(m[me], m[them]);
  expect(all).toHaveLength(22);
  const high = shape(all, { x: 50, y: 20 }, true), low = shape(all, { x: 50, y: 80 }, true);
  const cb = all.find(a => a.mine && a.line === "DEF")!;
  expect(high[cb.id].y).toBeLessThan(low[cb.id].y);
});

test("sans tir : circulation puis récupération par l'adversaire", () => {
  const f = minuteFrames({ ...base, possession: me, events: [] });
  expect(f.length).toBeGreaterThanOrEqual(3);
  expect(Object.keys(f[0].pos)).toHaveLength(22);
  const mineIds = new Set(m[me].pitch.filter(Boolean).map(p => p!.id));
  expect(mineIds.has(f[0].holder!)).toBe(true);
  expect(mineIds.has(f[f.length - 1].holder!)).toBe(false);
});

test("but : le vrai passeur puis le vrai buteur, ballon au fond", () => {
  const scorer = m[me].pitch.find(p => p && p.position === "ST")!;
  const assist = m[me].pitch.find(p => p && p.position !== "GK" && p.id !== scorer.id)!;
  const f = minuteFrames({ ...base, possession: them, events: [{ minute: 10, type: "goal", side: me, playerId: scorer.id, assistId: assist.id, text: "BUT !" }] });
  const last = f[f.length - 1];
  expect(last.flash?.text).toBe("BUT !");
  expect(last.ball.y).toBeLessThan(1);
  expect(f.some(x => x.holder === assist.id)).toBe(true);
  expect(f[f.length - 2].holder).toBe(scorer.id);
});
