/** Négociation de contrat, accord du club actuel et vitrine des trophées. */

import { createPlayerCareer, starterClubs } from "../../player2/engine";
import { ensureCareer, releaseDecision, signOffer, wageCeiling, marketValue, MAX_ROUNDS } from "../../player2/career";
import { trophyCabinet, totalTrophies } from "../../player2/cabinet";
import type { ClubOffer, PlayerCareerState } from "../../player2/types";

const SEED = "contract";
const clubs = starterClubs(SEED, "cp");
const base = () => ensureCareer(createPlayerCareer({ seed: SEED, clubId: clubs[0].id, firstName: "Léo", lastName: "Signe", nationality: "FRA", position: "ST", foot: "right", now: 0 }));
const withOffer = (s: PlayerCareerState, o: Partial<ClubOffer> = {}): [PlayerCareerState, ClubOffer] => {
  const offer: ClubOffer = { id: "of-x", clubId: clubs[5].id, kind: "transfer", fee: marketValue(s) * 3, wage: 20_000, seasons: 4, role: "starter", expiresAt: 9999, ...o };
  return [{ ...s, career: { ...s.career!, offers: [offer] } }, offer];
};

describe("Contrat", () => {
  test("le club actuel fixe le prix ; il bloque si l'acheteur ne suit pas", () => {
    const s = base();
    const [s1, ok] = withOffer(s);
    expect(releaseDecision(s1, ok).allowed).toBe(true);
    const [s2, low] = withOffer(s, { fee: 10_000 });
    const r = releaseDecision(s2, low);
    expect(r.allowed).toBe(false);
    expect(signOffer(s2, low.id, low.wage, 4).ok).toBe(false);
    // Demander à partir fait baisser le prix
    const asked = { ...s2, career: { ...s2.career!, transferRequested: true } };
    expect(releaseDecision(asked, low).askingFee).toBeLessThan(r.askingFee);
  });

  test("salaire demandé : accepté sous le plafond, contre-proposition au-dessus, retrait après 3 refus", () => {
    const [s, o] = withOffer(base());
    const ceiling = wageCeiling(s, o);
    const r1 = signOffer(s, o.id, ceiling * 2, 4);
    expect(r1.ok).toBe(false);
    expect(r1.state.career!.offers[0].wage).toBe(ceiling);
    let cur = r1.state;
    for (let i = 1; i < MAX_ROUNDS; i++) cur = signOffer(cur, o.id, ceiling * 2, 4).state;
    expect(cur.career!.offers).toHaveLength(0);
    const good = signOffer(s, o.id, ceiling, 5);
    expect(good.ok).toBe(true);
    expect(good.state.contract.clubId).toBe(o.clubId);
    expect(good.state.contract.wage).toBe(ceiling);
    expect(good.state.contract.seasonsLeft).toBe(5);
  });
});

describe("Vitrine", () => {
  test("trophées regroupés avec saison, club et stats", () => {
    const s = base();
    const club = s.contract.clubId;
    const st: PlayerCareerState = {
      ...s,
      seasons: [{ season: 1, clubId: club, leagueId: "x", apps: 40, starts: 38, goals: 27, assists: 9, ratingSum: 290, motm: 5 }],
      career: { ...s.career!, awards: [
        { season: 1, id: "league_top_scorer", label: "Meilleur buteur (27 buts)", value: 27 },
        { season: 1, id: "ballon_dor", label: "Ballon d'Or CP", clubId: club },
        { season: 1, id: "cup_win", compId: "ucl", label: "CP Ligue des champions", clubId: club },
      ] },
    };
    const shelves = trophyCabinet(st);
    expect(totalTrophies(shelves)).toBe(3);
    const top = shelves.find(x => x.key === "top_scorer")!;
    expect(top.entries[0]).toMatchObject({ season: 1, clubId: club, goals: 27, assists: 9, apps: 40 });
    expect(shelves.find(x => x.key === "ucl")!.entries).toHaveLength(1);
    expect(shelves.find(x => x.key === "kopa")!.entries).toHaveLength(0);
    expect(shelves.some(x => x.key === "yachine")).toBe(false);
  });
});
