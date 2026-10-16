/**
 * FC CAREER 27 — Monde CP réel et calendrier (Lots B et C)
 */

import { generateWorld } from "../../domain/worldGenerator";
import { alterName, cpValue, parseFc27, parseLines, regenFrom, REAL_ROSTERS } from "../../data/cp/cpWorld";
import { CP_CLUBS, CP_LEAGUES } from "../../data/cp/clubs";
import {
  buildLeagueWeeks, FIFA_WEEKS, formatDate, matchDate, seasonLabel, seasonStart, transferWindow, weekDays,
} from "../../domain/calendar";
import { createManagerGame, playWeek, autoLineup, isSeasonOver, managedMatchdaysThisWeek } from "../../manager/engine";
import { isWindowOpen } from "../../manager/market";

const world = generateWorld("cp-test", "cp");

describe("Monde CP", () => {
  test("5 pays, 10 ligues, 198 clubs préfixés CP, tailles réelles", () => {
    expect(CP_LEAGUES).toHaveLength(10);
    expect(world.clubs).toHaveLength(198);
    expect(world.clubs.every(c => c.name.startsWith("CP "))).toBe(true);
    expect(world.leagues.every(l => l.name.startsWith("CP "))).toBe(true);
    for (const l of CP_LEAGUES) expect(world.clubs.filter(c => c.leagueId === l.id)).toHaveLength(l.clubCount);
    expect(new Set(CP_CLUBS.map(c => c.id)).size).toBe(198);
  });

  test("vrais joueurs : une voyelle du prénom et une du nom changent", () => {
    expect(alterName("Kylian", "Mbappé")).toEqual({ firstName: "Kylaan", lastName: "Mbappí" });
    expect(alterName("Erling", "Haaland")).toEqual({ firstName: "Erlang", lastName: "Haalend" });
    expect(alterName("Virgil", "van Dijk").lastName).toBe("van Dajk");
    expect(alterName("", "Pedri")).toEqual({ firstName: "", lastName: "Pedra" });
    const star = world.players.find(p => p.lastName === "Haalend")!;
    expect(star.clubId).toBe("eng-mci");
    expect(star.overall).toBe(91); // note officielle FC 27
    expect(star.face?.sho).toBe(92);
    expect(star.playStyles!.length).toBeGreaterThanOrEqual(5);
    expect(world.players.some(p => p.firstName === "Erling" && p.lastName === "Haaland")).toBe(false);
  });

  test("effectifs complets (24-26), niveaux cohérents avec la réputation", () => {
    const sizes = world.clubs.map(c => world.players.filter(p => p.clubId === c.id).length);
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(24);
    expect(Math.max(...sizes)).toBeLessThanOrEqual(30);
    const top11 = (id: string) => world.players.filter(p => p.clubId === id).map(p => p.overall).sort((a, b) => b - a).slice(0, 11).reduce((a, b) => a + b, 0) / 11;
    expect(top11("esp-rma")).toBeGreaterThan(84);
    expect(top11("fra-usb")).toBeLessThan(62);
    expect(world.players.every(p => p.face && p.birthDay)).toBe(true);
  });

  test("listes : lignes à 0 (joueurs partis) ignorées, gardien lu dans l'ordre PLO,PRI,PIE,RÉF,VIT,PLA", () => {
    const lines = parseLines(REAL_ROSTERS["esp-rma"]);
    const gk = lines.find(l => l.last === "Courtois")!;
    expect(gk.face.def).toBe(89); // placement
    expect(gk.face.phy).toBe(47); // vitesse
    expect(parseLines("CM|X|Y|ESP|2000|0|0|0,0,0,0,0,0|0|0|R")).toHaveLength(0);
  });

  test("FC 27 : postes EA convertis, nom complet découpé, âge repris ou déduit", () => {
    const [a, b, c] = parseFc27("CDM|Declan Rice|ENG|1999|88|72,75,86,81,85,84\nLM|Kevin|BRA|?|76|82,70,70,82,33,58\nGK|Jan Oblak|SVN|?|88|85,90,79,87,46,86");
    expect(a).toMatchObject({ pos: "DM", first: "Declan", last: "Rice", yob: 1999, ovr: 88 });
    expect(b).toMatchObject({ pos: "LW", first: "", last: "Kevin" });
    expect(2026 - b.yob).toBeGreaterThanOrEqual(21);
    expect(c.face.def).toBe(86); // placement du gardien
  });

  test("saison 2026-27 : promus et relégués de 2026", () => {
    const league = (id: string) => world.clubs.find(c => c.id === id)?.leagueId;
    expect(league("eng-cov")).toBe("eng-1");
    expect(league("eng-whu")).toBe("eng-2");
    expect(league("esp-rac")).toBe("esp-1");
    expect(league("ita-ver")).toBe("ita-2");
    expect(league("ger-s04")).toBe("ger-1");
    expect(league("fra-fcn")).toBe("fra-2");
    expect(league("eng-lei")).toBeUndefined();
  });

  test("valeurs à l'échelle réelle", () => {
    expect(cpValue(90, 25, 92)).toBeGreaterThan(100_000_000);
    expect(cpValue(80, 26, 82)).toBeGreaterThan(15_000_000);
    expect(cpValue(65, 30, 65)).toBeLessThan(3_000_000);
  });

  test("régénéré : même nationalité, même poste, 16-17 ans, potentiel proche du pic", () => {
    const old = { ...world.players.find(p => p.lastName === "Modrać" || p.lastName.startsWith("Modr"))! };
    const r = regenFrom(old, "ita-mil", "ita-1", "ita", 3);
    expect(r.nationality).toBe(old.nationality);
    expect(r.position).toBe(old.position);
    expect(r.age).toBeLessThanOrEqual(17);
    expect(r.potential).toBeGreaterThanOrEqual(old.potential - 6);
    expect(r.regenOf).toBe(old.id);
  });
});

describe("Calendrier réel", () => {
  test("année sportive du 1er juillet, saison 2026-27, samedis de match", () => {
    expect(seasonStart(2026).getUTCDay()).toBe(1);
    expect(seasonStart(2026).getUTCMonth()).toBe(6);
    expect(seasonLabel(2026)).toBe("2026-27");
    expect(matchDate(2026, 7).getUTCDay()).toBe(6);
    expect(formatDate(matchDate(2026, 7))).toMatch(/août 2026/);
    expect(formatDate(matchDate(2026, 47))).toMatch(/mai 2027/);
    expect(weekDays(2026, 1)).toHaveLength(7);
  });

  test("journées réparties sur la saison, trêves FIFA respectées en D1, matchs en semaine si besoin", () => {
    const pl = buildLeagueWeeks(38, 1, "eng");
    expect(pl).toHaveLength(38);
    expect(pl.some(w => FIFA_WEEKS.includes(w))).toBe(false);
    const ch = buildLeagueWeeks(46, 2, "eng");
    expect(ch).toHaveLength(46);
    expect(new Set(ch).size).toBeLessThan(46); // journées doublées
    const bl = buildLeagueWeeks(34, 1, "ger");
    expect(new Set(bl).size).toBe(34);
    expect(bl.includes(26)).toBe(false); // trêve hivernale
    for (const w of [...pl, ...ch, ...bl]) { expect(w).toBeGreaterThanOrEqual(7); expect(w).toBeLessThanOrEqual(47); }
  });

  test("mercato d'été et d'hiver", () => {
    expect(transferWindow(1)).toBe("summer");
    expect(transferWindow(12)).toBeNull();
    expect(transferWindow(28)).toBe("winter");
  });

  test("une saison CP complète : 52 semaines, championnats finis, anniversaires, montées et descentes", () => {
    let s = createManagerGame({ seed: "cp-season", clubId: "eng-bha", managerName: "T" });
    expect(s.world.dataset).toBe("cp");
    expect(isWindowOpen(s)).toBe(true); // semaine 1 = juillet
    expect(managedMatchdaysThisWeek(s)).toEqual([]); // intersaison
    const startAge = new Map(s.world.players.map(p => [p.id, p.age]));
    let weeks = 0, matches = 0;
    let finishedBeforeEnd = false;
    while (s.world.season === 1 && weeks < 60) {
      const before = s.world.currentWeek;
      s = playWeek(autoLineup(s));
      matches += s.weekReports?.length ?? 0;
      if (s.world.season === 1 && before === 48) finishedBeforeEnd = Object.values(s.world.schedules).every(sch => sch.currentMatchday > sch.totalMatchdays);
      weeks++;
    }
    expect(weeks).toBe(53); // 52 semaines + clôture
    expect(matches).toBe(38);
    expect(finishedBeforeEnd).toBe(true);
    expect(isSeasonOver(s)).toBe(false);
    const aged = s.world.players.filter(p => startAge.has(p.id) && p.age === startAge.get(p.id)! + 1).length;
    expect(aged).toBeGreaterThan(4000); // chacun a eu son anniversaire une fois
    const ger = s.world.promotionRelegationHistory.find(r => r.leagueId === "ger-1")!;
    expect(ger.relegated).toHaveLength(2);
    const eng = s.world.promotionRelegationHistory.find(r => r.leagueId === "eng-2")!;
    expect(eng.promoted).toHaveLength(3);
    for (const l of CP_LEAGUES) expect(s.world.clubs.filter(c => c.leagueId === l.id)).toHaveLength(l.clubCount);
  });
});

describe("Récompenses du monde CP", () => {
  test("buteurs, passeurs, équipe type, champion, Soulier d'Or, Ballon d'Or (30 nommés), Golden Boy, joueur du mois", () => {
    let s = createManagerGame({ seed: "cp-awards", clubId: "ita-nap", managerName: "T" });
    let guard = 0;
    while (!(s.world.season === 2 && s.world.currentWeek > 25) && guard++ < 90) s = playWeek(autoLineup({ ...s, status: "active" }));
    const aw = s.world.awards ?? [];
    for (const l of CP_LEAGUES) {
      expect(aw.filter(a => a.leagueId === l.id && a.season === 1 && a.id === "league_top_scorer")).toHaveLength(1);
      expect(aw.filter(a => a.leagueId === l.id && a.season === 1 && a.id === "tots")).toHaveLength(11);
      expect(aw.some(a => a.leagueId === l.id && a.id === "league_title")).toBe(true);
      expect(aw.filter(a => a.leagueId === l.id && a.id === "potm").length).toBeGreaterThanOrEqual(8);
    }
    expect(aw.filter(a => a.id === "golden_shoe")).toHaveLength(1);
    const bdo = aw.find(a => a.id === "ballon_dor")!;
    expect(bdo.season).toBe(1);
    expect(bdo.atWeek).toBe(17);
    expect(bdo.ranking).toHaveLength(30);
    expect(aw.some(a => a.id === "yachine")).toBe(true);
    const gb = aw.filter(a => a.id === "golden_boy");
    expect(gb).toHaveLength(2);
    for (const g of gb) expect(s.world.players.find(p => p.id === g.playerId)!.age).toBeLessThanOrEqual(22);
    // Le meilleur buteur d'une D1 doit être un joueur offensif crédible
    const scorer = s.world.players.find(p => p.id === aw.find(a => a.id === "league_top_scorer" && a.leagueId === "eng-1")!.playerId)!;
    expect(["ST", "LW", "RW", "AM"]).toContain(scorer.position);
  });
});
