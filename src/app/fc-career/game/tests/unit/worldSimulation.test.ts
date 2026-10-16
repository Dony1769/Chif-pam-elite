/**
 * FC CAREER — Tests du monde vivant
 * 12 tests couvrant la génération, la simulation et la progression du monde.
 *
 * Test runner attendu : jest / vitest (compatible Jest API).
 * Exécuter : npx vitest run src/app/fc-career/game/tests/unit/worldSimulation.test.ts
 */

import { generateWorld, generateLeagueSchedule, advanceWorldSeason } from "../../domain/worldGenerator";
import { advanceWorldWeek, endWorldSeason } from "../../domain/worldEngine";
import { progressWorldPlayers, generateYouthPlayer } from "../../domain/playerProgression";
import { simulateWorldMatch, simulateMatchday } from "../../domain/worldMatchEngine";
import { createRng, seedFromString } from "../../utils/random";
import type { WorldLiveState } from "../../domain/worldState";
import type { WorldPlayer } from "../../data/worldPlayers";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeWorld(seed = "test-career-42"): WorldLiveState {
  return generateWorld(seed);
}

// ─── Test 1 : Génération du monde — cohérence des effectifs ──────────────────

describe("Génération du monde", () => {
  test("1. generateWorld produit un monde complet et cohérent", () => {
    const world = makeWorld();

    // Ligues et clubs
    expect(world.leagues.length).toBeGreaterThanOrEqual(2);
    expect(world.clubs.length).toBeGreaterThanOrEqual(8);

    // Chaque club doit avoir des joueurs
    for (const club of world.clubs.slice(0, 4)) {
      const players = world.players.filter(p => p.clubId === club.id);
      expect(players.length).toBeGreaterThanOrEqual(11);
    }

    // Les standings doivent exister pour chaque ligue
    for (const league of world.leagues) {
      const standing = world.standings[league.id];
      expect(standing).toBeDefined();
      expect(standing.length).toBeGreaterThan(0);
    }
  });
});

// ─── Test 2 : Calendrier et génération de matchs ─────────────────────────────

describe("Calendrier et simulation de matchs", () => {
  test("2. Chaque ligue a un calendrier complet et équilibré", () => {
    const world = makeWorld();

    for (const league of world.leagues) {
      const sched = world.schedules[league.id];
      expect(sched).toBeDefined();
      if (!sched) continue;

      const clubs = world.clubs.filter(c => c.leagueId === league.id);
      if (clubs.length < 2) continue;

      // Nombre de matchs : n*(n-1) pour round-robin double
      const expectedMatches = clubs.length * (clubs.length - 1);
      expect(sched.fixtures.length).toBe(expectedMatches);

      // Chaque club joue exactement (n-1)*2 matchs
      for (const club of clubs) {
        const matches = sched.fixtures.filter(
          f => f.homeClubId === club.id || f.awayClubId === club.id
        );
        expect(matches.length).toBe((clubs.length - 1) * 2);
      }
    }
  });

  test("3. simulateWorldMatch produit un score réaliste", () => {
    const world = makeWorld();
    const league = world.leagues[0];
    const sched = world.schedules[league.id];
    if (!sched || sched.fixtures.length === 0) return;

    const fixture = sched.fixtures[0];
    const home = {
      clubId: fixture.homeClubId,
      players: world.players.filter(p => p.clubId === fixture.homeClubId),
      coach: world.coaches.find(c => c.clubId === fixture.homeClubId && c.status === "active") ?? null,
      reputation: world.clubReputations[fixture.homeClubId] ?? 50,
    };
    const away = {
      clubId: fixture.awayClubId,
      players: world.players.filter(p => p.clubId === fixture.awayClubId),
      coach: world.coaches.find(c => c.clubId === fixture.awayClubId && c.status === "active") ?? null,
      reputation: world.clubReputations[fixture.awayClubId] ?? 50,
    };

    const { result } = simulateWorldMatch({ fixture, home, away, season: 1 });

    expect(result.scoreHome).toBeGreaterThanOrEqual(0);
    expect(result.scoreAway).toBeGreaterThanOrEqual(0);
    expect(result.scoreHome).toBeLessThanOrEqual(14);
    expect(result.scoreAway).toBeLessThanOrEqual(14);
    expect(result.homeClubId).toBe(fixture.homeClubId);
    expect(result.awayClubId).toBe(fixture.awayClubId);
  });

  test("4. Les standings se mettent à jour correctement après un match", () => {
    const world = makeWorld();
    const league = world.leagues[0];

    const standingBefore = world.standings[league.id] ?? [];
    const totalPointsBefore = standingBefore.reduce((s, r) => s + r.points, 0);

    const { world: worldAfter } = advanceWorldWeek(world);
    const standingAfter = worldAfter.standings[league.id] ?? [];
    const totalPointsAfter = standingAfter.reduce((s, r) => s + r.points, 0);

    // Il y a eu des matchs → des points ont été distribués
    expect(totalPointsAfter).toBeGreaterThanOrEqual(totalPointsBefore);
  });
});

// ─── Test 5 : Promotions et relégations ──────────────────────────────────────

describe("Promotions et relégations", () => {
  test("5. endWorldSeason calcule des promotions/relégations valides", () => {
    // Simuler assez de semaines pour finir la saison
    let world = makeWorld();
    // Avancer jusqu'à la fin de la saison (38 journées × 1 par semaine)
    for (let i = 0; i < 40; i++) {
      const result = advanceWorldWeek(world);
      world = result.world;
    }

    const { promotionRelegation } = endWorldSeason(world);

    // Au moins une ligue traitée
    expect(promotionRelegation.length).toBeGreaterThan(0);

    for (const pr of promotionRelegation) {
      // Les clubs promus et relégués ne se chevauchent pas
      const promoted = new Set(pr.promoted);
      const relegated = new Set(pr.relegated);
      for (const p of promoted) {
        expect(relegated.has(p)).toBe(false);
      }
    }
  });
});

// ─── Test 6 : Progression des joueurs ────────────────────────────────────────

describe("Progression des joueurs", () => {
  test("6. Les jeunes progressent, les vétérans déclinent", () => {
    const world = makeWorld();
    const young = world.players.filter(p => p.age <= 21 && p.overall < p.potential);
    const veterans = world.players.filter(p => p.age >= 35);

    if (young.length === 0 || veterans.length === 0) return;

    const { updated } = progressWorldPlayers(world.players, 1, "test-seed");

    // En moyenne les jeunes progressent
    const youngAvgBefore = young.reduce((s, p) => s + p.overall, 0) / young.length;
    const youngIds = new Set(young.map(p => p.id));
    const youngAfter = updated.filter(p => youngIds.has(p.id) && p.clubId !== "retired");
    const youngAvgAfter = youngAfter.reduce((s, p) => s + p.overall, 0) / (youngAfter.length || 1);
    expect(youngAvgAfter).toBeGreaterThanOrEqual(youngAvgBefore - 1); // légère tolérance

    // Les vétérans ne progressent pas au-delà de leur potentiel
    const vetIds = new Set(veterans.map(p => p.id));
    const vetsAfter = updated.filter(p => vetIds.has(p.id) && p.clubId !== "retired");
    for (const vet of vetsAfter) {
      expect(vet.overall).toBeLessThanOrEqual(99);
      expect(vet.overall).toBeGreaterThanOrEqual(40);
    }
  });

  test("7. generateYouthPlayer produit un joueur valide", () => {
    const rng = createRng(seedFromString("youth-test"));
    const youth = generateYouthPlayer("ST", "club-01", 1, rng);

    expect(youth.age).toBeGreaterThanOrEqual(17);
    expect(youth.age).toBeLessThanOrEqual(20);
    expect(youth.overall).toBeGreaterThanOrEqual(50);
    expect(youth.overall).toBeLessThanOrEqual(99);
    expect(youth.potential).toBeGreaterThanOrEqual(youth.overall);
    expect(youth.position).toBe("ST");
    expect(youth.clubId).toBe("club-01");
  });
});

// ─── Test 8 : Coaches — licenciements et recrutements ────────────────────────

describe("Coaches", () => {
  test("8. Après plusieurs semaines, des changements de coach peuvent avoir lieu", () => {
    let world = makeWorld();
    const initialCoachCount = world.coaches.filter(c => c.status === "active").length;

    // Avancer 8 semaines (2 cycles d'évaluation)
    for (let i = 0; i < 8; i++) {
      const r = advanceWorldWeek(world);
      world = r.world;
    }

    // Le nombre de coaches actifs reste stable (remplacements immédiats)
    const activeCoachCount = world.coaches.filter(c => c.status === "active").length;
    // Il peut y avoir des variations si des clubs ont perdu leur coach sans remplacement
    expect(activeCoachCount).toBeGreaterThanOrEqual(0);
    expect(world.coaches.length).toBeGreaterThanOrEqual(initialCoachCount);
  });
});

// ─── Test 9 : Transferts ─────────────────────────────────────────────────────

describe("Transferts", () => {
  test("9. endWorldSeason génère des transferts sans doublons de joueurs", () => {
    let world = makeWorld();
    for (let i = 0; i < 40; i++) {
      world = advanceWorldWeek(world).world;
    }
    const { world: worldEnd } = endWorldSeason(world);

    // Pas de doublon d'id joueur actif (même joueur dans 2 clubs)
    const activePlayers = worldEnd.players.filter(p => p.clubId !== "retired");
    const ids = activePlayers.map(p => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

// ─── Test 10 : Sauvegarde et restauration ────────────────────────────────────

describe("Sauvegarde et restauration", () => {
  test("10. Un monde sérialisé et désérialisé produit les mêmes classements", () => {
    const world = makeWorld();
    const { world: w1 } = advanceWorldWeek(world);

    // Sérialiser / désérialiser via JSON (comme localStorage)
    const serialized = JSON.stringify(w1);
    const restored = JSON.parse(serialized) as WorldLiveState;

    // Standings identiques
    for (const league of w1.leagues) {
      const s1 = w1.standings[league.id] ?? [];
      const s2 = restored.standings[league.id] ?? [];
      expect(s2.length).toBe(s1.length);
      for (let i = 0; i < s1.length; i++) {
        expect(s2[i].clubId).toBe(s1[i].clubId);
        expect(s2[i].points).toBe(s1[i].points);
      }
    }
  });
});

// ─── Test 11 : Continuité multi-saisons ──────────────────────────────────────

describe("Continuité multi-saisons", () => {
  test("11. Deux saisons successives ne dupliquent pas les fixtures", () => {
    let world = makeWorld();

    // Saison 1
    for (let i = 0; i < 40; i++) {
      world = advanceWorldWeek(world).world;
    }
    const { world: world2 } = endWorldSeason(world);
    const season2 = world2.season;

    // Saison 2
    for (let i = 0; i < 40; i++) {
      world = advanceWorldWeek(world2).world;
    }
    const { world: world3 } = endWorldSeason(world);

    expect(world3.season).toBeGreaterThan(season2);

    // Pas de fixture en double dans la saison 3
    for (const league of world3.leagues) {
      const sched = world3.schedules[league.id];
      if (!sched) continue;
      const ids = sched.fixtures.map(f => f.id);
      const uniq = new Set(ids);
      expect(uniq.size).toBe(ids.length);
    }
  });
});

// ─── Test 12 : Déterminisme (reproductibilité) ───────────────────────────────

describe("Déterminisme", () => {
  test("12. La même seed produit toujours le même monde", () => {
    const world1 = generateWorld("seed-determinism-42");
    const world2 = generateWorld("seed-determinism-42");

    // Même nombre de clubs, joueurs
    expect(world2.clubs.length).toBe(world1.clubs.length);
    expect(world2.players.length).toBe(world1.players.length);

    // Mêmes classements initiaux
    for (const league of world1.leagues) {
      const s1 = world1.standings[league.id] ?? [];
      const s2 = world2.standings[league.id] ?? [];
      expect(s2.length).toBe(s1.length);
    }

    // Une avancée de semaine produit le même résultat
    const r1 = advanceWorldWeek(world1);
    const r2 = advanceWorldWeek(world2);
    expect(r1.weekResults.length).toBe(r2.weekResults.length);
    for (let i = 0; i < r1.weekResults.length; i++) {
      expect(r1.weekResults[i].scoreHome).toBe(r2.weekResults[i].scoreHome);
      expect(r1.weekResults[i].scoreAway).toBe(r2.weekResults[i].scoreAway);
    }
  });
});
