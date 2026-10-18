/** Histoire (personnages, dilemmes, récit de saison) et niveaux de difficulté. */

import { createPlayerCareer, starterClubs, trainWeek } from "../../player2/engine";
import { advancePlayerWeek, ensureCareer } from "../../player2/career";
import { chooseStory, ensureStory } from "../../player2/story";
import { playerStep } from "../../player2/reducer";
import type { PlayerCareerState } from "../../player2/types";

const club = starterClubs("story", "cp")[0];
const make = (difficulty: "amateur" | "pro" | "legend" = "pro") =>
  ensureCareer(createPlayerCareer({ seed: "story", clubId: club.id, firstName: "Léo", lastName: "Récit", nationality: "FRA", position: "ST", foot: "right", now: 0, difficulty }));

test("personnages : agent, capitaine du club, rival de la même génération", () => {
  const s = ensureStory(make());
  const st = s.career!.story!;
  expect(st.agent.length).toBeGreaterThan(3);
  const cap = s.shadow.world.players.find(p => p.id === st.captainId)!;
  expect(cap.clubId).toBe(club.id);
  const rival = s.shadow.world.players.find(p => p.id === st.rivalId)!;
  expect(rival.position).toBe("ST");
  expect(Math.abs(rival.age - 17)).toBeLessThanOrEqual(1);
  expect(rival.clubId).not.toBe(club.id);
});

test("une saison : dilemmes avec conséquences, journal, récit de fin de saison", () => {
  let s: PlayerCareerState = make();
  const season = s.shadow.world.season;
  let answered = 0;
  for (let i = 0; i < 60 && s.shadow.world.season === season; i++) {
    s = advancePlayerWeek(s);
    const d = s.career!.story?.pending;
    if (d) {
      const r = chooseStory(s, d.choices[0].id);
      expect(r.ok).toBe(true);
      expect(r.state.career!.story!.pending).toBeNull();
      s = r.state; answered++;
    }
  }
  expect(answered).toBeGreaterThan(0);
  const recap = s.career!.story!.recap!;
  expect(recap.season).toBe(season);
  expect(recap.title.length).toBeGreaterThan(5);
  expect(recap.lines.length).toBeGreaterThan(1);
  expect(playerStep(s, { type: "DISMISS_RECAP" }).state!.career!.story!.recap).toBeNull();
}, 300000);

test("difficulté : Légende progresse moins vite qu'Amateur", () => {
  const gain = (d: "amateur" | "legend") => {
    const s = make(d);
    const t = trainWeek(s, true, 7);
    return Object.values(t.state.profile.subXp).reduce((a, b) => a + (b ?? 0), 0) + t.gains.length * 100;
  };
  expect(gain("legend")).toBeLessThan(gain("amateur"));
});
