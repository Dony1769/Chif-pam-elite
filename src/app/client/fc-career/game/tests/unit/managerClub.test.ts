/**
 * FC CAREER 27 — Tests du club : stade, installations, staff, sponsors (Lot M3)
 */

import { managerStep } from "../../manager/reducer";
import {
  ensureInfra, setTicketPrice, previewAttendance, ticketPriceBounds, expandStadium, upgradeFacility,
  hireStaff, chooseSponsor, generateSponsorOffers, nextMatchAtHome,
} from "../../manager/club";
import {
  attendance, initialCapacity, referencePrice, expansionCost, facilityUpgradeCost, facilitiesUpkeep,
  staffBill, trainingGainChance, extraRecovery, EXPANSION_SEATS, MAX_FACILITY_LEVEL,
} from "../../manager/clubMath";
import { advanceWeek, ensureMarket, simulateSeasonWithMarket, generateYouthIntake, scoutCost } from "../../manager/market";
import { createManagerGame, getSquad } from "../../manager/engine";
import type { ManagerState } from "../../manager/types";

const SEED = "mgr-test-27";
const CLUB = "vlt-as-thornfield";
const fresh = (clubId = CLUB): ManagerState =>
  managerStep(null, { type: "NEW_GAME", seed: SEED, clubId, managerName: "Test", now: 0 }).state!;
const rich = (s: ManagerState): ManagerState => ({ ...s, finances: { ...s.finances, balance: 1e9 } });
const weeks = (s: ManagerState, n: number) => { let c = s; for (let i = 0; i < n; i++) c = advanceWeek(c); return c; };

describe("Formules", () => {
  test("affluence : plus le billet est cher, moins il y a de monde", () => {
    const base = { capacity: 10_000, refPrice: 10, reputation: 60, position: 4, leagueSize: 8, lastWon: null };
    const cheap = attendance({ ...base, price: 5 });
    const ref = attendance({ ...base, price: 10 });
    const dear = attendance({ ...base, price: 30 });
    expect(cheap.fill).toBeGreaterThanOrEqual(ref.fill);
    expect(ref.fill).toBeGreaterThan(dear.fill);
    expect(dear.spectators).toBeLessThanOrEqual(10_000);
    expect(ref.revenue).toBe(ref.spectators * 10);
  });

  test("grand club au stade plein : monter le billet augmente la recette", () => {
    const base = { capacity: 12_000, refPrice: 12, reputation: 88, position: 1, leagueSize: 8, lastWon: true };
    expect(attendance({ ...base, price: 12 }).fill).toBe(1);
    expect(attendance({ ...base, price: 16 }).revenue).toBeGreaterThan(attendance({ ...base, price: 12 }).revenue);
  });

  test("prix de référence ≈ recette calibrée du Lot M1", () => {
    const cap = initialCapacity(80);
    expect(referencePrice(95_000, cap) * cap).toBeGreaterThan(95_000 * 1.1);
    expect(referencePrice(95_000, cap) * cap).toBeLessThan(95_000 * 1.4);
  });

  test("coûts croissants avec le niveau", () => {
    expect(facilityUpgradeCost(100_000, 3).cost).toBeGreaterThan(facilityUpgradeCost(100_000, 1).cost);
    expect(expansionCost(100_000).cost).toBeGreaterThan(0);
  });

  test("les jeunes progressent plus vite que les anciens, et mieux avec un bon centre", () => {
    const s = fresh();
    const inf = s.infra!;
    expect(trainingGainChance(inf, 19, false)).toBeGreaterThan(trainingGainChance(inf, 31, false));
    const better = { ...inf, facilities: { ...inf.facilities, training: 5 } };
    expect(trainingGainChance(better, 19, false)).toBeGreaterThan(trainingGainChance(inf, 19, false));
  });
});

describe("Initialisation", () => {
  test("stade, installations, 5 membres du staff, 3 offres de sponsor", () => {
    const s = fresh();
    expect(s.infra!.stadium.capacity).toBe(initialCapacity(s.world.clubs.find(c => c.id === CLUB)!.reputation));
    expect(s.infra!.staff.map(m => m.role).sort()).toEqual(["coach", "fitness", "physio", "scout", "youth"]);
    expect(s.infra!.sponsorOffers.map(o => o.style)).toEqual(["safe", "balanced", "ambitious"]);
    expect(s.infra!.staffMarket.length).toBe(10);
  });

  test("idempotent et déterministe", () => {
    const s = fresh();
    expect(ensureInfra(s)).toBe(s);
    expect(generateSponsorOffers(s)).toEqual(generateSponsorOffers(fresh()));
  });

  test("partie M1/M2 sans infra : complétée au chargement, sans rien perdre", () => {
    const old = ensureMarket(createManagerGame({ seed: SEED, clubId: CLUB, managerName: "Ancien", now: 0 }));
    expect(old.infra).toBeUndefined();
    const loaded = managerStep(null, { type: "LOAD", state: old }).state!;
    expect(loaded.infra).toBeDefined();
    expect(loaded.market).toEqual(old.market);
    expect(loaded.finances.balance).toBe(old.finances.balance);
  });
});

describe("Stade", () => {
  test("prix du billet : bornes, aperçu, recette réelle la semaine à domicile", () => {
    let s = fresh();
    const b = ticketPriceBounds(s);
    expect(setTicketPrice(s, b.max + 1).ok).toBe(false);
    expect(setTicketPrice(s, b.min - 1).ok).toBe(false);
    const r = setTicketPrice(s, b.ref + 3);
    expect(r.ok).toBe(true);
    s = r.state;
    expect(s.infra!.stadium.ticketPrice).toBe(b.ref + 3);
    // Jouer jusqu'à un match à domicile
    for (let i = 0; i < 4 && !nextMatchAtHome(s); i++) s = advanceWeek(s);
    expect(nextMatchAtHome(s)).toBe(true);
    s = advanceWeek(s);
    const line = s.finances.ledger.find(e => e.category === "tickets" && e.season === s.world.season);
    expect(line?.label).toMatch(/spectateurs/);
    expect(s.infra!.lastAttendance!.revenue).toBe(line!.amount);
    expect(s.infra!.lastAttendance!.spectators).toBeLessThanOrEqual(s.infra!.stadium.capacity);
  });

  test("aperçu d'affluence cohérent avec le prix choisi", () => {
    const s = fresh();
    const b = ticketPriceBounds(s);
    expect(previewAttendance(s, b.min).fill).toBeGreaterThanOrEqual(previewAttendance(s, b.max).fill);
  });

  test("agrandissement : payé, livré après les travaux, un seul chantier à la fois", () => {
    let s = rich(fresh());
    const cap = s.infra!.stadium.capacity;
    const r = expandStadium(s);
    expect(r.ok).toBe(true);
    expect(expandStadium(r.state).ok).toBe(false);
    s = r.state;
    expect(s.finances.ledger[0].category).toBe("facilities");
    s = weeks(s, expansionCost(s.world.clubs.find(c => c.id === CLUB)!.wagesBudget).weeks);
    expect(s.infra!.stadium.capacity).toBe(cap + EXPANSION_SEATS);
    expect(s.infra!.projects).toHaveLength(0);
    expect(s.inbox.some(m => m.title === "Stade agrandi")).toBe(true);
  });

  test("trésorerie insuffisante : refus", () => {
    const s = fresh();
    expect(expandStadium({ ...s, finances: { ...s.finances, balance: 0 } }).ok).toBe(false);
  });
});

describe("Installations et staff", () => {
  test("amélioration : niveau +1 à la livraison, entretien en hausse, plafond niveau 5", () => {
    let s = rich(fresh());
    const lvl = s.infra!.facilities.training;
    const upkeep = facilitiesUpkeep(s.infra!, 95_000);
    s = upgradeFacility(s, "training").state;
    s = weeks(s, 4 + lvl + 1);
    expect(s.infra!.facilities.training).toBe(lvl + 1);
    expect(facilitiesUpkeep(s.infra!, 95_000)).toBeGreaterThan(upkeep);
    const maxed = { ...s, infra: { ...s.infra!, facilities: { ...s.infra!.facilities, medical: MAX_FACILITY_LEVEL } } };
    expect(upgradeFacility(maxed, "medical").ok).toBe(false);
  });

  test("embauche : remplace le titulaire du poste, indemnité payée, masse du staff à jour", () => {
    const s = rich(fresh());
    const cand = s.infra!.staffMarket.find(m => m.role === "fitness")!;
    const r = hireStaff(s, cand.id);
    expect(r.ok).toBe(true);
    expect(r.state.infra!.staff.filter(m => m.role === "fitness")).toEqual([cand]);
    expect(r.state.infra!.staffMarket.some(m => m.id === cand.id)).toBe(false);
    expect(r.state.finances.balance).toBeLessThan(s.finances.balance);
    expect(staffBill(r.state.infra!)).toBe(r.state.infra!.staff.reduce((a, m) => a + m.wage, 0));
  });

  test("préparateur physique de haut niveau : meilleure récupération", () => {
    const s = fresh();
    const best = s.infra!.staffMarket.filter(m => m.role === "fitness").sort((a, b) => b.quality - a.quality)[0];
    const after = hireStaff(rich(s), best.id).state;
    if (best.quality > 2) expect(extraRecovery(after.infra)).toBeGreaterThan(extraRecovery(s.infra));
  });

  test("centre de formation : plus de jeunes, mieux notés au niveau supérieur", () => {
    const s = fresh();
    const up = { ...s, infra: { ...s.infra!, facilities: { ...s.infra!.facilities, academy: 5 } } };
    const a = generateYouthIntake(s), b = generateYouthIntake(up);
    expect(b.length).toBeGreaterThan(a.length);
    const avg = (xs: { potential: number }[]) => xs.reduce((x, y) => x + y.potential, 0) / xs.length;
    expect(avg(b)).toBeGreaterThan(avg(a));
  });

  test("chef scout de haut niveau : missions moins chères", () => {
    const s = fresh();
    const top = { ...s, infra: { ...s.infra!, staff: s.infra!.staff.map(m => (m.role === "scout" ? { ...m, quality: 5 } : m)) } };
    expect(scoutCost(top)).toBeLessThan(scoutCost(s));
  });
});

describe("Sponsor", () => {
  test("choix du sponsor : revenu hebdomadaire au nom du sponsor, un seul par saison", () => {
    let s = fresh();
    const offer = s.infra!.sponsorOffers[0];
    const r = chooseSponsor(s, offer.id);
    expect(r.ok).toBe(true);
    expect(chooseSponsor(r.state, s.infra!.sponsorOffers[1].id).ok).toBe(false);
    s = advanceWeek(r.state);
    expect(s.finances.ledger.some(e => e.label === `Sponsor maillot : ${offer.name}` && e.amount === offer.weekly)).toBe(true);
  });

  test("sans décision, le conseil signe l'offre équilibrée à la 3e semaine", () => {
    let s = fresh();
    const balanced = s.infra!.sponsorOffers.find(o => o.style === "balanced")!;
    s = weeks(s, 3);
    expect(s.infra!.sponsor?.id).toBe(balanced.id);
    expect(s.inbox.some(m => m.title.startsWith("Sponsor signé par le conseil"))).toBe(true);
  });

  test("nouvelle saison : contrat terminé, nouvelles offres, prime d'objectif si atteint", () => {
    let s = chooseSponsor(fresh(), fresh().infra!.sponsorOffers[2].id).state;
    const sponsor = s.infra!.sponsor!;
    s = simulateSeasonWithMarket(s);
    if (s.status !== "active") return;
    expect(s.infra!.sponsor).toBeNull();
    expect(s.infra!.sponsorOffers).toHaveLength(3);
    expect(s.infra!.sponsorOffers[0].id).toContain("s2");
    const bonus = s.finances.ledger.some(e => e.label === `Prime d'objectif ${sponsor.name}`);
    expect(bonus).toBe(s.history[0].objectiveMet);
  });
});

describe("Effets en jeu", () => {
  test("progression à l'entraînement : jamais au-delà du potentiel", () => {
    let s = fresh();
    s = { ...s, infra: { ...s.infra!, facilities: { ...s.infra!.facilities, training: 5 } } };
    const before = new Map(getSquad(s).map(p => [p.id, p.overall]));
    s = weeks(s, 10);
    for (const p of getSquad(s)) {
      expect(p.overall).toBeLessThanOrEqual(Math.max(p.potential, before.get(p.id) ?? p.overall));
    }
    expect(getSquad(s).some(p => (before.get(p.id) ?? 99) < p.overall)).toBe(true);
  });

  test("finances de la semaine : staff et entretien issus du club", () => {
    const s0 = fresh();
    const s = advanceWeek(s0);
    const staff = s.finances.ledger.find(e => e.category === "staff" && e.label === "Staff technique")!;
    expect(staff.amount).toBe(-staffBill(s0.infra!));
    const upkeep = s.finances.ledger.find(e => e.label === "Entretien des installations")!;
    expect(upkeep.amount).toBe(-facilitiesUpkeep(s0.infra!, s0.world.clubs.find(c => c.id === CLUB)!.wagesBudget));
  });

  test("reducer : actions du club avec message", () => {
    const s = rich(fresh());
    const step = managerStep(s, { type: "UPGRADE_FACILITY", facility: "medical" });
    expect(step.message?.ok).toBe(true);
    expect(step.message?.text).toMatch(/Centre médical/);
    expect(managerStep(s, { type: "SET_TICKET_PRICE", price: -5 }).message?.ok).toBe(false);
  });
});
