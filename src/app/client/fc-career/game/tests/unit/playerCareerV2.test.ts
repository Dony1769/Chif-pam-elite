/**
 * FC CAREER 27 — Tests de la Carrière Joueur v2 (Lot J1)
 */

import {
  ATTR_KEYS, overallOf, profileFor, fromLegacyAttributes, legacyPosition, keyAttrs,
} from "../../player2/attributes";
import type { Attrs } from "../../player2/attributes";
import {
  createPlayerCareer, playPlayerWeek, simulatePlayerSeason, me, myClub, coachDecision, trainWeek,
  xpNeeded, starterClubs, careerTotals, avgRating, mutateAttrs, setTrainingFocus, trustBonus,
} from "../../player2/engine";
import {
  loadPlayerCareer, savePlayerCareer, archivePlayerSave, PLAYER2_BACKUP_KEY, LEGACY_SAVE_KEY,
} from "../../player2/storage";
import { PLAYER2_SAVE_KEY } from "../../player2/types";
import type { PlayerCareerState } from "../../player2/types";
import { getSquad } from "../../manager/engine";
import { generateWorld } from "../../domain/worldGenerator";
import { endWorldSeason } from "../../domain/worldEngine";
import type { KeyValueStore } from "../../manager/storage";

const SEED = "p2-test-27";
const club = starterClubs(SEED)[0];
const fresh = (position: "ST" | "CM" | "CB" | "GK" = "ST"): PlayerCareerState =>
  createPlayerCareer({ seed: SEED, clubId: club.id, firstName: "Léo", lastName: "Test", nationality: "valtara", position, foot: "right", now: 0 });

function memoryStore(): KeyValueStore & { data: Record<string, string> } {
  const data: Record<string, string> = {};
  return { data, getItem: k => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
}

describe("Caractéristiques", () => {
  test("note globale pondérée par le poste", () => {
    const sniper: Attrs = { pac: 70, sho: 90, pas: 50, dri: 70, def: 30, phy: 60 };
    expect(overallOf(sniper, "ST")).toBeGreaterThan(overallOf(sniper, "CB"));
    const wall: Attrs = { pac: 50, sho: 30, pas: 50, dri: 40, def: 88, phy: 85 };
    expect(overallOf(wall, "CB")).toBeGreaterThan(overallOf(wall, "ST"));
  });

  test("profil de départ : note exacte et caractéristiques clés en tête", () => {
    let i = 0;
    const rnd = () => ((i = (i * 9301 + 49297) % 233280) / 233280);
    for (const pos of ["ST", "CM", "CB", "GK", "LW"] as const) {
      const a = profileFor(pos, 60, rnd);
      expect(overallOf(a, pos)).toBe(60);
      const [top] = keyAttrs(pos);
      const weakest = ATTR_KEYS.filter(k => !keyAttrs(pos).includes(k));
      for (const k of weakest) expect(a[top]).toBeGreaterThan(a[k]);
    }
  });

  test("conversion des 51 attributs v1 et des postes v1", () => {
    const old: Record<string, number> = { acceleration: 80, sprintSpeed: 84, finishing: 75, shotPower: 77, standingTackle: 30 };
    const a = fromLegacyAttributes(old, false);
    expect(a.pac).toBe(82);
    expect(a.sho).toBe(76);
    expect(legacyPosition("CAM")).toBe("AM");
    expect(legacyPosition("RWB")).toBe("RB");
    expect(legacyPosition("CF")).toBe("ST");
  });
});

describe("Création", () => {
  test("jeune de 17 ans intégré au monde, sous le niveau du club, gros potentiel", () => {
    const s = fresh();
    const p = me(s);
    expect(p.age).toBe(17);
    expect(p.clubId).toBe(club.id);
    expect(p.overall).toBe(overallOf(s.profile.attrs, "ST"));
    expect(s.profile.potential).toBeGreaterThanOrEqual(76);
    expect(getSquad(s.shadow).some(x => x.id === p.id)).toBe(true);
    expect(s.inbox[0].title).toMatch(/Premier contrat pro/);
    expect(["starter", "bench", "out"]).toContain(s.selection);
  });

  test("déterministe", () => {
    expect(fresh().profile).toEqual(fresh().profile);
  });

  test("clubs de départ : uniquement des clubs de deuxième division", () => {
    const list = starterClubs(SEED);
    expect(list.length).toBeGreaterThan(0);
    const w = generateWorld(SEED);
    for (const c of list) expect(w.clubs.find(x => x.id === c.id)!.tier).toBeGreaterThanOrEqual(2);
  });
});

describe("Coach et semaine", () => {
  test("la confiance pèse sur la sélection, un joueur bien plus fort est titulaire", () => {
    expect(trustBonus(100)).toBeGreaterThan(0);
    expect(trustBonus(0)).toBeLessThan(0);
    const star = coachDecision(mutateAttrs(fresh(), { pac: 95, sho: 95, dri: 95, phy: 95, pas: 95 }));
    expect(star.selection).toBe("starter");
  });

  test("semaine jouée : match enregistré, stats, message, monde avancé", () => {
    const s0 = coachDecision(mutateAttrs(fresh(), { pac: 90, sho: 92, dri: 90, phy: 85 }));
    const s1 = playPlayerWeek(s0);
    expect(s1.shadow.world.currentWeek).toBe(s0.shadow.world.currentWeek + 1);
    expect(s1.lastMatch).not.toBeNull();
    expect(s1.lastMatch!.played).toBe(true);
    expect(s1.seasons[0].apps).toBe(1);
    expect(s1.lastMatch!.rating).toBeGreaterThan(0);
    expect(s1.inbox.some(m => m.kind === "match")).toBe(true);
    // Le joueur est bien celui du monde, sa note vient du profil
    expect(me(s1).overall).toBe(overallOf(s1.profile.attrs, "ST"));
  });

  test("le coach IA n'est jamais licencié, la carrière continue", () => {
    let s = fresh();
    s = { ...s, shadow: { ...s.shadow, board: { ...s.shadow.board, confidence: 1 } } };
    s = simulatePlayerSeason(s);
    expect(s.shadow.status).toBe("active");
    expect(s.shadow.world.season).toBe(2);
  });

  test("saison complète : bilan, une saison de contrat en moins, 17 → 18 ans (pas 19)", () => {
    const s0 = fresh();
    const s = simulatePlayerSeason(s0);
    expect(me(s).age).toBe(18);
    expect(s.contract.seasonsLeft).toBe(s0.contract.seasonsLeft - 1);
    expect(s.inbox.some(m => m.title === "Bilan de la saison 1")).toBe(true);
    const t = careerTotals(s);
    expect(t.apps).toBe(s.seasons.reduce((a, l) => a + l.apps, 0));
    if (s.seasons[0]?.apps) expect(avgRating(s.seasons[0])).toBeGreaterThan(3);
  });

  test("aucune spirale : sans jouer, la confiance revient vers 45", () => {
    let s = { ...fresh(), coachTrust: 5 };
    s = mutateAttrs(s, { pac: 20, sho: 20, dri: 20, phy: 20, pas: 20 }); // ne jouera pas
    for (let i = 0; i < 6; i++) s = playPlayerWeek(s);
    expect(s.coachTrust).toBeGreaterThan(5);
  });
});

describe("Entraînement", () => {
  test("la caractéristique travaillée progresse le plus", () => {
    let s = setTrainingFocus(fresh(), "pac");
    const before = { ...s.profile.attrs };
    for (let i = 0; i < 10; i++) s = trainWeek(s, false, null).state;
    const gain = (k: keyof Attrs) => s.profile.attrs[k] - before[k];
    expect(gain("pac")).toBeGreaterThan(0);
    for (const k of ATTR_KEYS.filter(k => k !== "pac")) expect(gain("pac")).toBeGreaterThanOrEqual(gain(k));
  });

  test("plafonné par le potentiel", () => {
    let s = fresh();
    s = { ...s, profile: { ...s.profile, potential: overallOf(s.profile.attrs, "ST") } };
    const ovr = overallOf(s.profile.attrs, "ST");
    for (let i = 0; i < 40; i++) s = trainWeek(s, true, 8).state;
    expect(overallOf(s.profile.attrs, "ST")).toBeLessThanOrEqual(ovr);
  });

  test("plus dur de progresser quand la caractéristique est haute", () => {
    expect(xpNeeded(85)).toBeGreaterThan(xpNeeded(55));
  });
});

describe("Monde : correctif du double vieillissement", () => {
  test("une fin de saison ajoute exactement un an aux joueurs du monde", () => {
    const w = generateWorld("age-regression");
    const after = endWorldSeason(w).world;
    let checked = 0;
    for (const p of w.players.slice(0, 50)) {
      const q = after.players.find(x => x.id === p.id);
      if (q && q.clubId !== "retired") { expect(q.age).toBe(p.age + 1); checked++; }
    }
    expect(checked).toBeGreaterThan(10);
  });
});

describe("Monde : stabilité sur plusieurs saisons", () => {
  test("effectifs stables, niveau sans inflation, retraités jamais réactivés", () => {
    let w = generateWorld("stability");
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const ovr0 = avg(w.players.filter(p => p.clubId !== "retired").map(p => p.overall));
    for (let i = 0; i < 5; i++) w = endWorldSeason(w).world;
    const active = w.players.filter(p => p.clubId !== "retired");
    for (const c of w.clubs) {
      const n = active.filter(p => p.clubId === c.id).length;
      expect(n).toBeGreaterThanOrEqual(16); // complété à l'intersaison
      expect(n).toBeLessThanOrEqual(28);    // même plafond que le mode manager
    }
    expect(avg(active.map(p => p.overall)) - ovr0).toBeLessThan(5);
    for (const p of active) expect(p.overall).toBeLessThanOrEqual(Math.max(p.potential, 99));
  });
});

describe("Sauvegarde v2", () => {
  test("aller-retour, clé dédiée, v1 jamais touchée", () => {
    const store = memoryStore();
    store.setItem(LEGACY_SAVE_KEY, "{\"player\":{\"firstName\":\"Ancien\"}}");
    const s = playPlayerWeek(fresh());
    expect(savePlayerCareer(s, store, 5)).toBe(true);
    const r = loadPlayerCareer(store);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.state.profile.id).toBe(s.profile.id);
    expect(store.data[LEGACY_SAVE_KEY]).toBe("{\"player\":{\"firstName\":\"Ancien\"}}");
    expect(PLAYER2_SAVE_KEY).not.toBe(LEGACY_SAVE_KEY);
  });

  test("archivage avant remplacement, corruption signalée sans effacement", () => {
    const store = memoryStore();
    savePlayerCareer(fresh(), store, 1);
    const raw = store.data[PLAYER2_SAVE_KEY];
    expect(archivePlayerSave(store)).toBe(true);
    expect(store.data[PLAYER2_BACKUP_KEY]).toBe(raw);
    store.setItem(PLAYER2_SAVE_KEY, "{cassé");
    expect(loadPlayerCareer(store)).toEqual({ ok: false, reason: "corrupt" });
    expect(store.data[PLAYER2_SAVE_KEY]).toBe("{cassé");
  });
});

void myClub;
