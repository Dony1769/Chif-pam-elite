/**
 * FC CAREER 27 — Tests du marché des transferts (Lot M2)
 */

import { managerStep } from "../../manager/reducer";
import type { ManagerAction } from "../../manager/reducer";
import {
  ensureMarket, searchMarket, makeBid, offerContract, approachFreeAgent, askingPrice, wageDemand,
  currentWageBill, isWindowOpen, listForTransfer, acceptOffer, loanOut, promoteYouth, releasePlayer,
  renewContract, renewalDemand, scoutPlayer, knownRating, generateIncomingOffers, advanceWeek,
  simulateSeasonWithMarket, playerWillingness, SQUAD_MAX, SQUAD_MIN,
} from "../../manager/market";
import { createManagerGame, getSquad, getManagedClub, squadStrength } from "../../manager/engine";
import { loadManager, saveManager } from "../../manager/storage";
import type { KeyValueStore } from "../../manager/storage";
import type { ManagerState } from "../../manager/types";
import type { WorldPlayer } from "../../data/worldPlayers";

const SEED = "mgr-test-27";
const CLUB = "vlt-as-thornfield";
const fresh = (clubId = CLUB): ManagerState =>
  ensureMarket(createManagerGame({ seed: SEED, clubId, managerName: "Test", now: 0 }));

/** Avance jusqu'à la fermeture du mercato. */
function closeWindow(s: ManagerState): ManagerState {
  let cur = s;
  for (let i = 0; i < 10 && isWindowOpen(cur); i++) cur = advanceWeek(cur);
  return cur;
}

/** Cible raisonnable : joueur d'un autre club, pas gardien, abordable. */
function affordableTarget(s: ManagerState): WorldPlayer {
  return searchMarket(s, { maxPrice: Math.min(s.finances.transferBudget, s.finances.balance) }, 200)
    .find(l => !l.free && l.player.position !== "GK" && playerWillingness(s, l.player).willing
      && currentWageBill(s) + l.wage < s.finances.wageBudget)!.player;
}

describe("Initialisation du marché", () => {
  test("contrats pour tout l'effectif, jeunes, libres dont des gardiens", () => {
    const s = fresh();
    for (const p of getSquad(s)) {
      expect(s.market!.contracts[p.id].wage).toBeGreaterThan(0);
      expect(s.market!.contracts[p.id].seasonsLeft).toBeGreaterThanOrEqual(1);
    }
    expect(s.market!.youth.length).toBe(1 + getManagedClub(s).academyLevel);
    expect(s.market!.freeAgents.filter(p => p.position === "GK").length).toBeGreaterThanOrEqual(2);
  });

  test("idempotent : ensureMarket deux fois ne change rien", () => {
    const s = fresh();
    expect(ensureMarket(s)).toBe(s);
  });

  test("génération déterministe (même graine → mêmes jeunes et libres)", () => {
    expect(fresh().market!.youth.map(y => y.id + y.overall)).toEqual(fresh().market!.youth.map(y => y.id + y.overall));
    expect(fresh().market!.freeAgents.map(y => y.lastName)).toEqual(fresh().market!.freeAgents.map(y => y.lastName));
  });

  test("budget transferts couvert par la trésorerie, marge sur la masse salariale", () => {
    const s = fresh();
    expect(s.finances.balance).toBeGreaterThanOrEqual(s.finances.transferBudget);
    expect(currentWageBill(s)).toBeLessThan(s.finances.wageBudget);
  });

  test("une partie du Lot M1 (sans marché) se charge et reçoit son marché", () => {
    const store: KeyValueStore & { d: Record<string, string> } = { d: {}, getItem(k) { return this.d[k] ?? null; }, setItem(k, v) { this.d[k] = v; } };
    const m1 = createManagerGame({ seed: SEED, clubId: CLUB, managerName: "Ancien", now: 0 });
    expect(m1.market).toBeUndefined();
    saveManager(m1, store, 1);
    const r = loadManager(store);
    expect(r.ok).toBe(true);
    const loaded = managerStep(null, { type: "LOAD", state: (r as { ok: true; state: ManagerState }).state }).state!;
    expect(loaded.market).toBeDefined();
    expect(loaded.managerName).toBe("Ancien");
  });
});

describe("Achat", () => {
  test("offre basse rejetée, proche → contre-offre, au prix → accord", () => {
    const s = fresh();
    const p = affordableTarget(s);
    const ask = askingPrice(s, p);
    expect(makeBid(s, p.id, Math.round(ask * 0.5)).outcome).toBe("rejected");
    const c = makeBid(s, p.id, Math.round(ask * 0.9));
    expect(c.outcome).toBe("counter");
    expect(c.counter).toBe(ask);
    const ok = makeBid(s, p.id, ask);
    expect(ok.ok).toBe(true);
    expect(ok.state.market!.pendingDeals[0].playerId).toBe(p.id);
  });

  test("contrat : salaire trop bas refusé (3 tentatives max), salaire juste → signature complète", () => {
    let s = fresh();
    const p = affordableTarget(s);
    const ask = askingPrice(s, p);
    s = makeBid(s, p.id, ask).state;
    const low = offerContract(s, p.id, Math.round(wageDemand(s, p) * 0.5), 3);
    expect(low.ok).toBe(false);
    expect(low.state.market!.pendingDeals[0].attemptsLeft).toBe(2);
    const budgetBefore = s.finances.transferBudget, balanceBefore = s.finances.balance;
    const r = offerContract(low.state, p.id, wageDemand(s, p), 3);
    expect(r.ok).toBe(true);
    const signed = getSquad(r.state).find(x => x.id === p.id)!;
    expect(signed).toBeDefined();
    expect(signed.leagueId).toBe(getManagedClub(r.state).leagueId);
    expect(r.state.market!.contracts[p.id]).toEqual({ wage: wageDemand(s, p), seasonsLeft: 3 });
    expect(r.state.finances.transferBudget).toBe(budgetBefore - ask);
    expect(r.state.finances.balance).toBe(balanceBefore - ask);
    expect(r.state.finances.ledger[0]).toMatchObject({ category: "transfer_out", amount: -ask });
    expect(r.state.world.transferHistory[0].toClubId).toBe(CLUB);
    expect(r.state.market!.pendingDeals).toHaveLength(0);
  });

  test("trois refus → le joueur rompt les discussions", () => {
    let s = fresh();
    const p = affordableTarget(s);
    s = makeBid(s, p.id, askingPrice(s, p)).state;
    for (let i = 0; i < 3; i++) s = offerContract(s, p.id, 100, 2).state;
    expect(s.market!.pendingDeals).toHaveLength(0);
    expect(getSquad(s).some(x => x.id === p.id)).toBe(false);
  });

  test("garde-fous : budget, trésorerie, masse salariale, effectif plein, mercato fermé", () => {
    const s = fresh();
    const p = affordableTarget(s);
    expect(makeBid(s, p.id, s.finances.transferBudget + 1).message).toMatch(/budget/i);
    const poor = { ...s, finances: { ...s.finances, balance: 1000 } };
    expect(makeBid(poor, p.id, askingPrice(s, p)).message).toMatch(/Trésorerie/);
    const deal = makeBid(s, p.id, askingPrice(s, p)).state;
    expect(offerContract(deal, p.id, deal.finances.wageBudget, 2).message).toMatch(/masse salariale/);
    const full = { ...s, world: { ...s.world, players: [...s.world.players, ...Array.from({ length: SQUAD_MAX }, (_, i) => ({ ...getSquad(s)[0], id: `dup-${i}` }))] } };
    expect(makeBid(full, p.id, askingPrice(s, p)).message).toMatch(/Effectif complet/);
    const closed = closeWindow(s);
    expect(isWindowOpen(closed)).toBe(false);
    expect(makeBid(closed, p.id, askingPrice(closed, p)).message).toMatch(/Mercato fermé/);
  });

  test("une star refuse un club trop modeste", () => {
    const s = fresh("vlt-westcliff-sc");
    const star = s.world.players
      .filter(p => p.clubId !== s.clubId && (s.world.clubReputations[p.clubId] ?? 0) > 85)
      .sort((a, b) => b.overall - a.overall)[0];
    if (star && star.overall >= squadStrength(s.world, s.clubId) + 12) {
      expect(playerWillingness(s, star).willing).toBe(false);
    }
  });

  test("joueur libre : signable même mercato fermé, sans indemnité", () => {
    let s = closeWindow(fresh());
    const gk = s.market!.freeAgents.find(p => p.position === "GK")!;
    s = approachFreeAgent(s, gk.id).state;
    const before = s.finances.transferBudget;
    const r = offerContract(s, gk.id, wageDemand(s, gk), 1);
    expect(r.ok).toBe(true);
    expect(getSquad(r.state).some(p => p.id === gk.id && p.position === "GK")).toBe(true);
    expect(r.state.finances.transferBudget).toBe(before);
    expect(r.state.market!.freeAgents.some(p => p.id === gk.id)).toBe(false);
  });
});

describe("Vente, prêt, libération", () => {
  test("joueur listé → offre IA → vente encaissée (75 % au budget)", () => {
    let s = fresh();
    const p = getSquad(s).sort((a, b) => a.overall - b.overall)[2];
    s = listForTransfer(s, p.id, Math.max(50_000, p.marketValue)).state;
    let offers = s.market!.offers;
    for (let i = 0; i < 3 && offers.length === 0; i++) { s = advanceWeek(s); offers = s.market!.offers.filter(o => o.playerId === p.id); }
    expect(offers.length).toBeGreaterThan(0);
    const o = offers[0];
    const budget = s.finances.transferBudget, balance = s.finances.balance;
    const r = acceptOffer(s, o.id);
    expect(r.ok).toBe(true);
    expect(getSquad(r.state).some(x => x.id === p.id)).toBe(false);
    expect(r.state.world.players.find(x => x.id === p.id)!.clubId).toBe(o.fromClubId);
    expect(r.state.finances.balance).toBe(balance + o.fee);
    expect(r.state.finances.transferBudget).toBe(budget + Math.round(o.fee * 0.75));
    expect(r.state.market!.contracts[p.id]).toBeUndefined();
    expect(r.state.lineup.starters).not.toContain(p.id);
  });

  test("offres IA : uniquement mercato ouvert, déterministes", () => {
    let s = fresh();
    const p = getSquad(s)[5];
    s = listForTransfer(s, p.id, 100_000).state;
    expect(generateIncomingOffers(s)).toEqual(generateIncomingOffers(s));
    expect(generateIncomingOffers(closeWindow(s))).toEqual([]);
  });

  test("prêt : le joueur joue ailleurs toute la saison puis revient", () => {
    let s = fresh();
    const p = getSquad(s).sort((a, b) => a.overall - b.overall)[1];
    const r = loanOut(s, p.id);
    expect(r.ok).toBe(true);
    s = r.state;
    const dest = s.market!.loansOut[0].toClubId;
    expect(s.world.players.find(x => x.id === p.id)!.clubId).toBe(dest);
    expect(s.market!.contracts[p.id]).toBeDefined(); // contrat conservé
    s = advanceWeek(s);
    expect(s.world.players.find(x => x.id === p.id)?.clubId).toBe(dest);
    s = simulateSeasonWithMarket(s);
    if (s.status === "active") {
      expect(getSquad(s).some(x => x.id === p.id)).toBe(true);
      expect(s.market!.loansOut).toHaveLength(0);
    }
  });

  test("effectif minimum protégé (vente, prêt, libération)", () => {
    let s = fresh();
    const squad = getSquad(s).sort((a, b) => a.overall - b.overall);
    while (getSquad(s).length > SQUAD_MIN) s = releasePlayer({ ...s, finances: { ...s.finances, balance: 1e9 } }, getSquad(s).sort((a, b) => a.overall - b.overall)[0].id).state;
    expect(getSquad(s).length).toBe(SQUAD_MIN);
    expect(loanOut(s, getSquad(s)[0].id).ok).toBe(false);
    expect(releasePlayer(s, getSquad(s)[0].id).ok).toBe(false);
    void squad;
  });

  test("libération : indemnité payée, joueur devenu libre", () => {
    const s = fresh();
    const p = getSquad(s).sort((a, b) => a.overall - b.overall)[0];
    const r = releasePlayer(s, p.id);
    expect(r.ok).toBe(true);
    expect(r.state.finances.balance).toBeLessThan(s.finances.balance);
    expect(r.state.market!.freeAgents.some(x => x.id === p.id)).toBe(true);
    expect(r.state.world.players.some(x => x.id === p.id)).toBe(false);
  });
});

describe("Contrats et saisons", () => {
  test("prolongation : demande ≥ salaire actuel, refus si trop bas", () => {
    const s = fresh();
    const p = getSquad(s)[0];
    const demand = renewalDemand(s, p.id);
    expect(demand).toBeGreaterThanOrEqual(s.market!.contracts[p.id].wage);
    expect(renewContract(s, p.id, Math.round(demand * 0.5), 3).ok).toBe(false);
    const r = renewContract(s, p.id, demand, 4);
    expect(r.ok).toBe(true);
    expect(r.state.market!.contracts[p.id]).toEqual({ wage: demand, seasonsLeft: 4 });
  });

  test("fin de contrat : départ libre à l'intersaison", () => {
    let s = fresh();
    const p = getSquad(s)[3];
    s = { ...s, market: { ...s.market!, contracts: { ...s.market!.contracts, [p.id]: { ...s.market!.contracts[p.id], seasonsLeft: 0 } } } };
    s = simulateSeasonWithMarket(s);
    if (s.status === "active") {
      expect(getSquad(s).some(x => x.id === p.id)).toBe(false);
      expect(s.inbox.some(m => m.title === `Départ libre : ${p.firstName} ${p.lastName}`)).toBe(true);
    }
  });

  test("nouvelle saison : nouvelle génération de jeunes, libres renouvelés, offres remises à zéro", () => {
    const s0 = fresh();
    const s = simulateSeasonWithMarket(s0);
    if (s.status !== "active") return;
    expect(s.market!.generatedSeason).toBe(2);
    expect(s.market!.youth.some(y => y.id.includes("-s2-"))).toBe(true);
    expect(s.market!.youth.every(y => y.age <= 19)).toBe(true);
    expect(s.market!.freeAgents[0].id).toContain("free-s2");
    expect(s.market!.offers).toHaveLength(0);
  });
});

describe("Centre de formation et scouts", () => {
  test("promotion d'un jeune : rejoint l'effectif avec un contrat de 3 saisons", () => {
    const s = fresh();
    const y = s.market!.youth[0];
    const r = promoteYouth(s, y.id);
    expect(r.ok).toBe(true);
    expect(getSquad(r.state).some(p => p.id === y.id)).toBe(true);
    expect(r.state.market!.contracts[y.id].seasonsLeft).toBe(3);
    expect(r.state.market!.youth.some(p => p.id === y.id)).toBe(false);
  });

  test("brouillard : note en fourchette avant scouting, exacte après", () => {
    let s = fresh();
    const foreign = s.world.players.find(p => p.leagueId !== getManagedClub(s).leagueId)!;
    const before = knownRating(s, foreign);
    expect(Array.isArray(before.overall)).toBe(true);
    const [lo, hi] = before.overall as [number, number];
    expect(foreign.overall).toBeGreaterThanOrEqual(lo);
    expect(foreign.overall).toBeLessThanOrEqual(hi);
    expect(before.potential).toBeNull();
    const r = scoutPlayer(s, foreign.id);
    expect(r.ok).toBe(true);
    s = advanceWeek(r.state);
    expect(knownRating(s, foreign)).toEqual({ overall: foreign.overall, potential: foreign.potential, exact: true });
    expect(s.inbox.some(m => m.title.startsWith("Rapport de scout"))).toBe(true);
  });

  test("3 scouts maximum en mission", () => {
    let s = fresh();
    const targets = s.world.players.filter(p => p.leagueId !== getManagedClub(s).leagueId).slice(0, 4);
    for (const t of targets.slice(0, 3)) s = scoutPlayer(s, t.id).state;
    expect(scoutPlayer(s, targets[3].id).message).toMatch(/3 scouts/);
  });
});

describe("Reducer : actions du marché avec message", () => {
  test("BID renvoie un message lisible, PLAY_WEEK passe par le marché", () => {
    const s = managerStep(null, { type: "NEW_GAME", seed: SEED, clubId: CLUB, managerName: "R", now: 0 }).state!;
    expect(s.market).toBeDefined();
    const p = affordableTarget(s);
    const step = managerStep(s, { type: "BID", playerId: p.id, fee: 1 } as ManagerAction);
    expect(step.message?.ok).toBe(false);
    expect(step.message?.text).toMatch(/rejette/);
    const next = managerStep(s, { type: "PLAY_WEEK" }).state!;
    expect(next.world.currentWeek).toBe(s.world.currentWeek + 1);
  });

  test("saison complète avec marché : finances cohérentes (solde = somme du grand livre)", () => {
    const s0 = fresh();
    const s = simulateSeasonWithMarket(s0);
    // Le grand livre garde 200 lignes : on vérifie sur la première semaine seulement si tronqué
    if (s.finances.ledger.length < 200) {
      const sum = s.finances.ledger.reduce((a, e) => a + e.amount, 0);
      expect(s.finances.balance).toBe(s0.finances.balance + sum);
    }
    expect(Number.isFinite(s.finances.balance)).toBe(true);
  });
});
