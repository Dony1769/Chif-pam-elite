/**
 * FC CAREER 27 — Tests de la carrière autour des matchs (Lot J3)
 */

import { createPlayerCareer, starterClubs, me, myClub, mutateAttrs, coachDecision, playPlayerWeek } from "../../player2/engine";
import {
  ensureCareer, advancePlayerWeek, acceptOffer, rejectOffer, requestTransfer, negotiateRenewal, renewalDemand,
  clubWageCap, generateOffers, roleAt, nationalRank, seasonAwards, marketValue, wageFor, simulateCareerSeason,
} from "../../player2/career";
import { isWindowOpen } from "../../manager/market";
import type { PlayerCareerState, ClubOffer } from "../../player2/types";

const SEED = "j3-test";
const club = starterClubs(SEED)[2];
const fresh = (pos: "ST" | "GK" = "ST"): PlayerCareerState =>
  ensureCareer(createPlayerCareer({ seed: SEED, clubId: club.id, firstName: "Léo", lastName: "Test", nationality: "corenthia", position: pos, foot: "right", now: 0 }));
const strong = (s: PlayerCareerState, v = 80) => coachDecision({ ...mutateAttrs(s, { pac: v, sho: v, pas: v, dri: v, def: v, phy: v }), coachTrust: 80 });
const weekIdx = (s: PlayerCareerState) => s.shadow.world.season * 100 + s.shadow.world.currentWeek;

function withOffer(s: PlayerCareerState, kind: ClubOffer["kind"], clubId?: string): { s: PlayerCareerState; offer: ClubOffer } {
  const target = clubId ?? s.shadow.world.clubs.find(c => c.id !== myClub(s).id && c.tier === 1)!.id;
  const offer: ClubOffer = { id: `t-${kind}`, clubId: target, kind, fee: kind === "transfer" ? 500_000 : 0, wage: 5_000, seasons: 4, role: "starter", expiresAt: weekIdx(s) + 2 };
  return { s: { ...s, career: { ...s.career!, offers: [offer] } }, offer };
}

describe("Initialisation et argent", () => {
  test("carrière complétée, nationalité reconnue, idempotent", () => {
    const s = fresh();
    expect(s.career!.national.countryId).toBe("corenthia");
    expect(ensureCareer(s)).toBe(s);
    const odd = ensureCareer({ ...createPlayerCareer({ seed: SEED, clubId: club.id, firstName: "A", lastName: "B", nationality: "inconnu", position: "ST", foot: "left", now: 0 }) });
    expect(odd.career!.national.countryId).toBe(myClub(odd).countryId);
  });

  test("salaire versé chaque semaine, primes de but", () => {
    const s0 = strong(fresh(), 85);
    const s1 = advancePlayerWeek(s0);
    const goals = s1.lastMatch?.goals ?? 0;
    expect(s1.career!.bank).toBe(s0.contract.wage + goals * Math.round(s0.contract.wage * 0.15) + (s1.lastMatch?.assists ?? 0) * Math.round(s0.contract.wage * 0.08));
  });

  test("valeur et salaires cohérents", () => {
    const s = fresh();
    expect(marketValue(strong(s, 85))).toBeGreaterThan(marketValue(s));
    expect(wageFor(myClub(s), "key", 50)).toBeGreaterThan(wageFor(myClub(s), "prospect", 50));
  });
});

describe("Rôle et offres", () => {
  test("rôle sensible au poste : un gardien derrière le titulaire n'est pas titulaire", () => {
    const s = fresh("GK");
    const best = Math.max(...s.shadow.world.players.filter(p => p.clubId === club.id && p.position === "GK" && p.id !== s.profile.id).map(p => p.overall));
    if (me(s).overall < best) expect(["rotation", "prospect"]).toContain(roleAt(s, club.id));
  });

  test("offres seulement pendant le mercato (ou joueur libre), jamais pendant un prêt", () => {
    let s = strong(fresh(), 80);
    while (isWindowOpen(s.shadow)) s = playPlayerWeek(s);
    expect(generateOffers(s)).toEqual([]);
    const onLoan = { ...s, career: { ...s.career!, loan: { parentClubId: "x", untilSeason: 1, parentWage: 1, parentSeasonsLeft: 1 }, freeAgentSince: weekIdx(s) } };
    expect(generateOffers(onLoan)).toEqual([]);
  });

  test("un joueur qui brille et demande à partir reçoit des offres pendant le mercato", () => {
    let s = requestTransfer(strong(fresh(), 78), true).state;
    s = { ...s, profile: { ...s.profile, reputation: 40 } };
    let got = 0;
    for (let i = 0; i < 3 && isWindowOpen(s.shadow); i++) { s = advancePlayerWeek(s); got += s.career!.offers.length; }
    expect(got).toBeGreaterThan(0);
    expect(s.inbox.some(m => /^Offre de|^Proposition de prêt/.test(m.title))).toBe(true);
  });

  test("accepter un transfert : nouveau club dans le monde, contrat, coach, message", () => {
    const { s, offer } = withOffer(fresh(), "transfer");
    const r = acceptOffer(s, offer.id);
    expect(r.ok).toBe(true);
    expect(myClub(r.state).id).toBe(offer.clubId);
    expect(me(r.state).clubId).toBe(offer.clubId);
    expect(r.state.contract).toMatchObject({ clubId: offer.clubId, wage: 5_000, seasonsLeft: 4 });
    expect(r.state.career!.offers).toHaveLength(0);
    expect(r.state.inbox[0].title).toMatch(/Signature/);
    // La semaine suivante se joue avec le nouveau club
    const next = advancePlayerWeek(r.state);
    expect(next.lastMatch?.report.homeClubId === offer.clubId || next.lastMatch?.report.awayClubId === offer.clubId || next.lastMatch === null).toBe(true);
  });

  test("refuser ou laisser expirer une offre", () => {
    const { s, offer } = withOffer(fresh(), "transfer");
    expect(rejectOffer(s, offer.id).career!.offers).toHaveLength(0);
    const late = { ...s, career: { ...s.career!, offers: [{ ...offer, expiresAt: weekIdx(s) - 1 }] } };
    expect(acceptOffer(late, offer.id).ok).toBe(false);
  });

  test("demander un transfert agace le coach", () => {
    const s = fresh();
    expect(requestTransfer(s, true).state.coachTrust).toBeLessThan(s.coachTrust);
  });
});

describe("Prêt", () => {
  test("prêt : joue ailleurs, revient au club d'origine à l'intersaison", () => {
    const base = fresh();
    const origin = myClub(base).id;
    const { s, offer } = withOffer(base, "loan", base.shadow.world.clubs.find(c => c.id !== origin && c.tier === 2)!.id);
    let cur = acceptOffer(s, offer.id).state;
    expect(myClub(cur).id).toBe(offer.clubId);
    expect(cur.career!.loan?.parentClubId).toBe(origin);
    expect(acceptOffer(withOffer(cur, "transfer").s, "t-transfer").ok).toBe(false); // pas de transfert pendant un prêt
    cur = simulateCareerSeason(cur, false);
    expect(myClub(cur).id).toBe(origin);
    expect(cur.career!.loan).toBeNull();
    expect(cur.inbox.some(m => m.title.startsWith("Retour à"))).toBe(true);
  });
});

describe("Contrat", () => {
  test("prolongation : trop tôt refusée, salaire plafonné, accord possible", () => {
    const s = fresh();
    expect(negotiateRenewal({ ...s, contract: { ...s.contract, seasonsLeft: 3 } }, renewalDemand(s), 3).ok).toBe(false);
    const late = { ...s, contract: { ...s.contract, seasonsLeft: 1 } };
    expect(negotiateRenewal(late, clubWageCap(late) + 1000, 3).ok).toBe(false);
    const r = negotiateRenewal(late, renewalDemand(late), 4);
    expect(r.ok).toBe(true);
    expect(r.state.contract.seasonsLeft).toBe(4);
  });

  test("fin de contrat : joueur libre, puis prolongé d'une saison sans accord ailleurs", () => {
    let s = fresh();
    s = { ...s, contract: { ...s.contract, seasonsLeft: 1 } };
    s = simulateCareerSeason(s, false);
    expect(s.career!.freeAgentSince).not.toBeNull();
    expect(s.inbox.some(m => m.title === "Fin de contrat")).toBe(true);
    for (let i = 0; i < 4; i++) s = advancePlayerWeek({ ...s, career: { ...s.career!, offers: [] } });
    expect(s.career!.freeAgentSince).toBeNull();
    expect(s.contract.seasonsLeft).toBe(1);
  });
});

describe("Sélection et trophées", () => {
  test("un joueur de très haut niveau est convoqué et accumule des sélections", () => {
    let s = strong(fresh(), 92);
    s = { ...s, profile: { ...s.profile, reputation: 80 } };
    // Âge minimum 18 : on avance d'une saison
    s = simulateCareerSeason(s, false);
    s = strong(s, 92);
    expect(nationalRank(s)).toBeLessThanOrEqual(23);
    for (let i = 0; i < 6; i++) s = advancePlayerWeek(s);
    expect(s.career!.national.caps).toBeGreaterThan(0);
    expect(s.inbox.some(m => /convocation|Sélection/.test(m.title))).toBe(true);
  });

  test("meilleur buteur du championnat récompensé en fin de saison", () => {
    const s = fresh();
    const season = s.shadow.world.season;
    const fake = { ...s, seasons: [{ season, clubId: club.id, leagueId: myClub(s).leagueId, apps: 14, starts: 14, goals: 99, assists: 0, ratingSum: 14 * 7.4, motm: 3 }] };
    const awards = seasonAwards(fake);
    expect(awards.some(a => a.id === "top_scorer")).toBe(true);
    expect(awards.some(a => a.id === "revelation")).toBe(true); // 17 ans, note 7,4
    expect(seasonAwards({ ...fake, seasons: [] })).toEqual([]);
  });
});
