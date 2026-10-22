import { createPlayerCareer, starterClubs } from "../../player2/engine";
import { ensureCareer, simulateCareerSeason } from "../../player2/career";
import { buyAsset, invest, lifeOf, lifeWeek, netWorth, relationAction, sellAsset, setLifestyle } from "../../player2/life";
import type { PlayerCareerState } from "../../player2/types";

const SEED = "life-test";
const club = starterClubs(SEED)[2];
const fresh = (bank = 0): PlayerCareerState => {
  const s = ensureCareer(createPlayerCareer({ seed: SEED, clubId: club.id, firstName: "Léo", lastName: "Vie", nationality: "FRA", position: "ST", foot: "right" }));
  return { ...s, career: { ...s.career!, bank } };
};

describe("Vie hors du terrain", () => {
  test("semaine : impôts, commission, train de vie ; le patrimoine net compte tout", () => {
    const s = lifeWeek({ ...fresh(10_000) }, 2_000);
    const lines = lifeOf(s).last!.lines;
    expect(lines.find(l => l.label.startsWith("Impôts"))!.amount).toBe(-500);
    expect(lines.find(l => l.label.startsWith("Commission"))!.amount).toBe(-100);
    expect(s.career!.bank).toBeLessThan(10_000);
    expect(netWorth(s)).toBe(s.career!.bank);
  });

  test("achat, loyers, revente ; argent insuffisant refusé", () => {
    expect(buyAsset(fresh(1_000), "studio").ok).toBe(false);
    let s = buyAsset(fresh(200_000), "rent-studio").state;
    expect(lifeOf(s).assets).toHaveLength(1);
    expect(s.career!.bank).toBe(50_000);
    s = lifeWeek(s, 0);
    expect(lifeOf(s).last!.lines.some(l => l.label.startsWith("Loyers"))).toBe(true);
    const r = sellAsset(s, lifeOf(s).assets[0].uid);
    expect(r.ok).toBe(true);
    expect(r.state.career!.bank).toBeGreaterThan(s.career!.bank + 140_000);
  });

  test("placements : marché commun et déterministe, retraits plafonnés", () => {
    let s = invest(fresh(100_000), "index", 50_000).state;
    expect(invest(s, "index", -80_000).ok).toBe(false);
    const a = lifeWeek(s, 0), b = lifeWeek(s, 0);
    expect(lifeOf(a).inv.index).toBe(lifeOf(b).inv.index);
    s = invest(a, "index", -lifeOf(a).inv.index).state;
    expect(lifeOf(s).inv.index).toBe(0);
  });

  test("découvert : placements vendus puis train de vie réduit", () => {
    let s = setLifestyle(fresh(0), "excess").state;
    s = lifeWeek(s, 0);
    // Sans placement ni bien à vendre, le découvert reste possible mais le train de vie est réduit d'office
    expect(lifeOf(s).lifestyle).toBe("modest");
    const t = lifeWeek(invest(setLifestyle(fresh(5_000), "excess").state, "savings", 5_000).state, 0);
    expect(lifeOf(t).inv.savings).toBeLessThan(5_000);
  });

  test("vie privée : étapes dans l'ordre", () => {
    const s = fresh(100_000);
    expect(relationAction(s, "propose").ok).toBe(false);
    const d = relationAction(s, "date");
    expect(d.ok).toBe(true);
    expect(lifeOf(d.state).relation.status).toBe("dating");
    expect(relationAction(d.state, "commit").ok).toBe(false); // trop tôt
  });

  test("une saison de jeune pro : on peut épargner en vivant confortablement", () => {
    const s = simulateCareerSeason(fresh(0), false);
    expect(s.career!.bank).toBeGreaterThan(0);
    expect(lifeOf(s).history.length).toBeGreaterThan(2);
  });
});
