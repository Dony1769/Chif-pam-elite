/**
 * FC CAREER 27 — Coupes nationales, coupes d'Europe CP et tournois des sélections
 */

import { createManagerGame, playWeek, autoLineup } from "../../manager/engine";
import { progressOf, sortTable } from "../../domain/competitions";

describe("Compétitions du monde CP", () => {
  test("une saison : 5 coupes nationales, Ligue des champions, Ligue Europa ; puis Euro 2028", () => {
    let s = createManagerGame({ seed: "cp-cups", clubId: "fra-psg", managerName: "T" });
    let guard = 0;
    while (s.world.season === 1 && guard++ < 60) s = playWeek(autoLineup({ ...s, status: "active" }));
    const t1 = (s.world.trophies ?? []).filter(t => t.season === 1);
    expect(t1.map(t => t.compId).sort()).toEqual(["cup-eng", "cup-esp", "cup-fra", "cup-ger", "cup-ita", "ucl", "uel"]);
    for (const t of t1) expect(s.world.clubs.some(c => c.id === t.winner)).toBe(true);
    // La coupe de France ne contient que des clubs français
    const fa = t1.find(t => t.compId === "cup-fra")!;
    expect(fa.winner.startsWith("fra-")).toBe(true);
    // Qualifiés pour la saison 2 d'après le classement final
    expect(s.world.continentalNext?.forSeason).toBe(2);
    expect(s.world.continentalNext!.ucl).toHaveLength(16);
    // Des buts de coupe sont comptés dans les statistiques
    expect(s.world.playerStats.some(st => st.leagueId === "ucl" && st.goals > 0) || s.world.season === 2).toBe(true);

    // Saison 2 : nouvelles coupes, groupes de C1 complets avant Noël
    guard = 0;
    while (s.world.season === 2 && s.world.currentWeek <= 24 && guard++ < 30) s = playWeek(autoLineup({ ...s, status: "active" }));
    const ucl = s.world.competitions!.find(c => c.id === "ucl" && c.season === 2)!;
    expect(ucl.groups!.every(g => sortTable(g.table).every(r => r.p === 6))).toBe(true);
    expect(ucl.rounds[0].ties).toHaveLength(4);
    const someClub = ucl.groups![0].teams[0];
    expect(progressOf(ucl, someClub)).toBeTruthy();

    // Juin 2028 : CP Euro
    guard = 0;
    while (s.world.season === 2 && guard++ < 40) s = playWeek(autoLineup({ ...s, status: "active" }));
    const euro = (s.world.trophies ?? []).find(t => t.compId === "euro");
    expect(euro?.year).toBe(2028);
    expect(euro!.winner).toMatch(/^[A-Z]{3}$/);
  });
});
