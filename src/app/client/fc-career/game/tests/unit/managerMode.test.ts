/**
 * FC CAREER 27 — Tests du mode Manager (Lot M1)
 * Moteur de match, tactique, semaine complète, finances, conseil, sauvegarde.
 */

import { generateWorld } from "../../domain/worldGenerator";
import {
  FORMATIONS, FORMATION_IDS, autoPickLineup, positionFit, validateLineup, computeTeamRatings,
} from "../../manager/tactics";
import {
  initMatch, simulateMinute, simulateToEnd, finishMatch, applySubstitution, changeTactic, MAX_SUBS,
} from "../../manager/matchSim";
import type { MatchTeamInput } from "../../manager/matchSim";
import {
  createManagerGame, playWeek, prepareMatch, simulateSeason, getSquad, getLeaguePosition,
  getNextFixture, lineupIssues, weeklyWages, getManagedClub, squadStrength, realisticObjective,
  objectiveMaxPosition,
} from "../../manager/engine";
import { managerReducer } from "../../manager/reducer";
import {
  loadManager, saveManager, archiveCurrentSave, isValidManagerSave, MANAGER_BACKUP_KEY,
} from "../../manager/storage";
import type { KeyValueStore } from "../../manager/storage";
import { MANAGER_SAVE_KEY } from "../../manager/types";
import type { ManagerState, Tactic } from "../../manager/types";

const SEED = "mgr-test-27";
const CLUB = "vlt-as-thornfield";
const world = generateWorld(SEED);
const BAL: Tactic = { formation: "4-4-2", mentality: "balanced", style: "balanced" };

function team(clubId: string, tactic: Tactic = BAL, autoSubs = true): MatchTeamInput {
  const squad = world.players.filter(p => p.clubId === clubId);
  const l = autoPickLineup(squad, tactic.formation);
  const byId = new Map(squad.map(p => [p.id, p]));
  return {
    clubId, name: clubId, tactic, autoSubs,
    starters: l.starters.map(id => byId.get(id)!),
    bench: l.bench.map(id => byId.get(id)!),
  };
}

function match(home: string, away: string, seed: string, th: Tactic = BAL, ta: Tactic = BAL) {
  return initMatch({ fixtureId: `fx-${seed}`, season: 1, matchday: 1, seed, home: team(home, th), away: team(away, ta), managedSide: "home" });
}

function memoryStore(): KeyValueStore & { data: Record<string, string> } {
  const data: Record<string, string> = {};
  return { data, getItem: k => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
}

const newGame = (clubId = CLUB): ManagerState => createManagerGame({ seed: SEED, clubId, managerName: "Test", now: 0 });

// ─── Tactique ────────────────────────────────────────────────────────────────

describe("Tactique et composition", () => {
  test("chaque formation a 11 postes et un seul gardien", () => {
    for (const id of FORMATION_IDS) {
      expect(FORMATIONS[id]).toHaveLength(11);
      expect(FORMATIONS[id].filter(s => s.line === "GK")).toHaveLength(1);
    }
  });

  test("compatibilité de poste : naturel > voisin > hors poste, gardien à part", () => {
    expect(positionFit("CB", "CB")).toBe(1);
    expect(positionFit("CB", "DM")).toBeGreaterThan(positionFit("CB", "ST"));
    expect(positionFit("GK", "ST")).toBeLessThan(0.5);
  });

  test("la compo automatique aligne 11 joueurs distincts, valides, avec un gardien", () => {
    // Club dont un gardien est disponible + club géré (ses deux gardiens sont blessés au départ)
    const withGk = world.clubs.find(c => world.players.some(p => p.clubId === c.id && p.position === "GK" && !p.injury))!.id;
    for (const clubId of [withGk, CLUB]) {
    const squad = world.players.filter(p => p.clubId === clubId && !p.injury);
    for (const f of FORMATION_IDS) {
      const l = autoPickLineup(squad, f);
      expect(l.starters).toHaveLength(11);
      expect(new Set([...l.starters, ...l.bench]).size).toBe(l.starters.length + l.bench.length);
      expect(validateLineup(l, squad, f)).toEqual([]);
      // Un vrai gardien dans les buts dès qu'il en existe un disponible
      const gk = squad.find(p => p.id === l.starters[FORMATIONS[f].findIndex(s => s.line === "GK")]);
      if (squad.some(p => p.position === "GK")) expect(gk?.position).toBe("GK");
    }
    }
  });

  test("validation : détecte un onze incomplet et un doublon", () => {
    const squad = world.players.filter(p => p.clubId === CLUB);
    const l = autoPickLineup(squad, "4-4-2");
    expect(validateLineup({ ...l, starters: l.starters.slice(0, 10) }, squad, "4-4-2").some(i => i.kind === "count")).toBe(true);
    expect(validateLineup({ ...l, bench: [l.starters[0]] }, squad, "4-4-2").some(i => i.kind === "duplicate")).toBe(true);
  });

  test("un carton rouge (poste vide) fait baisser la force de la ligne", () => {
    const t = team(CLUB);
    const full = computeTeamRatings(t.starters, "4-4-2");
    const ten = computeTeamRatings(t.starters.map((p, i) => (i === 2 ? null : p)), "4-4-2");
    expect(ten.defense).toBeLessThan(full.defense);
  });
});

// ─── Moteur de match ─────────────────────────────────────────────────────────

describe("Moteur de match minute par minute", () => {
  const clubs = world.clubs.filter(c => c.leagueId === "vlt-d1")
    .sort((a, b) => squadStrength(world, b.id) - squadStrength(world, a.id));
  const strong = clubs[0].id, weak = clubs[clubs.length - 1].id;

  test("déterministe : même graine → même match", () => {
    const a = finishMatch(simulateToEnd(match(strong, weak, "det-1")));
    const b = finishMatch(simulateToEnd(match(strong, weak, "det-1")));
    expect(a).toEqual(b);
  });

  test("le match dure 90 minutes, avec mi-temps et coup de sifflet final", () => {
    const m = simulateToEnd(match(strong, weak, "len-1"));
    expect(m.minute).toBe(90);
    expect(m.finished).toBe(true);
    expect(m.events.some(e => e.type === "half_time" && e.minute === 45)).toBe(true);
    expect(m.events[m.events.length - 1].type).toBe("full_time");
    expect(simulateMinute(m)).toBe(m); // plus rien ne bouge après la fin
  });

  test("statistiques réalistes sur 300 matchs (buts, tirs, cartons, nuls)", () => {
    let goals = 0, shots = 0, yellows = 0, draws = 0;
    const N = 300;
    for (let i = 0; i < N; i++) {
      const r = finishMatch(simulateToEnd(match(clubs[i % 8].id, clubs[(i + 3) % 8].id, `stat-${i}`)));
      goals += r.home.goals + r.away.goals;
      shots += r.home.shots + r.away.shots;
      yellows += r.events.filter(e => e.type === "yellow").length;
      if (r.home.goals === r.away.goals) draws++;
      expect(r.home.possession + r.away.possession).toBeGreaterThanOrEqual(99);
      expect(r.home.shotsOnTarget).toBeLessThanOrEqual(r.home.shots);
    }
    expect(goals / N).toBeGreaterThan(2.2);
    expect(goals / N).toBeLessThan(3.3);
    expect(shots / N).toBeGreaterThan(16);
    expect(yellows / N).toBeGreaterThan(2);
    expect(draws / N).toBeGreaterThan(0.15);
    expect(draws / N).toBeLessThan(0.35);
  });

  test("le niveau compte : le meilleur effectif bat le plus faible bien plus souvent", () => {
    let wins = 0, losses = 0;
    for (let i = 0; i < 200; i++) {
      const r = finishMatch(simulateToEnd(match(strong, weak, `lvl-${i}`)));
      if (r.home.goals > r.away.goals) wins++; else if (r.home.goals < r.away.goals) losses++;
    }
    expect(wins).toBeGreaterThan(losses * 3);
  });

  test("la tactique compte : très défensif réduit les buts, très offensif les augmente", () => {
    const total = (t: Tactic) => {
      let g = 0;
      for (let i = 0; i < 250; i++) {
        const r = finishMatch(simulateToEnd(match(clubs[i % 8].id, clubs[(i + 2) % 8].id, `tac-${i}`, t)));
        g += r.home.goals + r.away.goals;
      }
      return g;
    };
    const def = total({ formation: "5-3-2", mentality: "very_defensive", style: "counter" });
    const att = total({ formation: "4-3-3", mentality: "very_attacking", style: "direct" });
    expect(att).toBeGreaterThan(def * 1.15);
  });

  test("buts : chaque événement « but » correspond au score, buteur sur le terrain", () => {
    const m = simulateToEnd(match(strong, weak, "goals-1"));
    const r = finishMatch(m);
    const homeGoals = r.events.filter(e => e.type === "goal" && e.side === "home").length;
    const awayGoals = r.events.filter(e => e.type === "goal" && e.side === "away").length;
    expect(homeGoals).toBe(r.home.goals);
    expect(awayGoals).toBe(r.away.goals);
    for (const e of r.events.filter(x => x.type === "goal")) {
      expect(m[e.side].appeared).toContain(e.playerId);
      expect(e.assistId).not.toBe(e.playerId);
    }
  });

  test("remplacement manuel : quota de 5, l'entrant joue, le sortant ne revient pas", () => {
    let m = initMatch({ fixtureId: "sub", season: 1, matchday: 1, seed: "sub-1", home: team(strong, BAL, false), away: team(weak), managedSide: "home" });
    for (let i = 0; i < 30; i++) m = simulateMinute(m);
    const out = m.home.pitch[5]!.id, inn = m.home.bench[0].id;
    m = applySubstitution(m, "home", out, inn);
    expect(m.home.pitch.some(p => p?.id === inn)).toBe(true);
    expect(m.home.pitch.some(p => p?.id === out)).toBe(false);
    expect(m.home.appeared).toContain(inn);
    expect(m.events.some(e => e.type === "sub" && e.inPlayerId === inn)).toBe(true);
    // Le sortant n'est pas sur le banc : impossible de le refaire entrer
    expect(applySubstitution(m, "home", m.home.pitch[6]!.id, out)).toBe(m);
    // Quota
    let k = 0;
    while (m.home.bench.length > 0 && k < 10) { m = applySubstitution(m, "home", m.home.pitch[k + 1]!.id, m.home.bench[0].id); k++; }
    expect(m.home.subsUsed).toBe(Math.min(MAX_SUBS, 1 + k));
    expect(m.home.subsUsed).toBeLessThanOrEqual(MAX_SUBS);
  });

  test("changement tactique en cours de match pris en compte", () => {
    let m = match(strong, weak, "chg-1");
    m = changeTactic(m, "home", { formation: "4-3-3", mentality: "very_attacking", style: "pressing" });
    expect(m.home.tactic.mentality).toBe("very_attacking");
  });

  test("l'état reçu n'est jamais modifié (pureté)", () => {
    const m = match(strong, weak, "pure-1");
    const snapshot = JSON.stringify(m);
    simulateToEnd(m);
    expect(JSON.stringify(m)).toBe(snapshot);
  });
});

// ─── Semaine et saison ───────────────────────────────────────────────────────

describe("Semaine de manager", () => {
  test("nouvelle partie : club, objectif, budget, message de bienvenue", () => {
    const s = newGame();
    expect(s.clubId).toBe(CLUB);
    expect(s.status).toBe("active");
    expect(s.lineup.starters).toHaveLength(11);
    expect(s.finances.transferBudget).toBe(getManagedClub(s).transferBudget);
    expect(s.inbox[0].kind).toBe("welcome");
    expect(s.board.objective).toBe(realisticObjective(s.world, CLUB));
    expect(getNextFixture(s)?.matchday).toBe(1);
  });

  test("jouer une semaine : match enregistré, classement, calendrier, finances", () => {
    const s0 = newGame();
    const fx = getNextFixture(s0)!;
    const s1 = playWeek(s0);
    const sch = s1.world.schedules[getManagedClub(s1).leagueId];
    expect(sch.fixtures.find(f => f.id === fx.id)?.result).not.toBeNull();
    expect(sch.currentMatchday).toBe(2);
    // Toute la journée de la ligue est jouée, une seule fois par club
    const rows = s1.world.standings[getManagedClub(s1).leagueId];
    expect(rows.every(r => r.played === 1)).toBe(true);
    expect(s1.lastMatch?.fixtureId).toBe(fx.id);
    expect(s1.finances.ledger.some(e => e.category === "wages" && e.amount < 0)).toBe(true);
    expect(s1.finances.ledger.some(e => e.category === "tv" && e.amount > 0)).toBe(true);
    expect(s1.inbox.some(m => m.kind === "match")).toBe(true);
    // Le solde = ancien solde + somme des lignes de la semaine
    const delta = s1.finances.ledger.reduce((a, e) => a + e.amount, 0);
    expect(s1.finances.balance).toBe(s0.finances.balance + delta);
  });

  test("le match en direct fourni par l'interface est celui qui est enregistré", () => {
    const s0 = newGame();
    const live = simulateToEnd(prepareMatch(s0, { autoSubs: false })!);
    const s1 = playWeek(s0, live);
    expect(s1.lastMatch?.home.goals).toBe(live.home.goals);
    expect(s1.lastMatch?.away.goals).toBe(live.away.goals);
  });

  test("billetterie uniquement les semaines à domicile", () => {
    let s = newGame();
    for (let i = 0; i < 4; i++) {
      const home = getNextFixture(s)!.homeClubId === CLUB;
      s = playWeek(s);
      const week = s.finances.ledger.filter(e => e.week === s.finances.ledger[0].week && e.season === s.finances.ledger[0].season);
      expect(week.some(e => e.category === "tickets")).toBe(home);
    }
  });

  test("l'IA du monde ne vend ni n'achète les joueurs du club géré", () => {
    const s0 = newGame();
    const before = new Set(getSquad(s0).map(p => p.id));
    const s1 = simulateSeason(s0);
    const after = new Set(getSquad(s1).map(p => p.id));
    // Seules arrivées possibles : jeunes du centre de formation, inexistants avant
    const existed = new Set(s0.world.players.map(p => p.id));
    for (const id of after) if (!before.has(id)) expect(existed.has(id)).toBe(false);
    // Départs seulement par retraite (joueur disparu du monde)
    for (const id of before) if (!after.has(id)) expect(s1.world.players.some(p => p.id === id)).toBe(false);
  });

  test("blessés et suspendus sont retirés automatiquement du onze suivant", () => {
    let s = newGame();
    for (let i = 0; i < 8; i++) {
      s = playWeek(s);
      expect(lineupIssues(s)).toEqual([]);
    }
  });

  test("saison complète : fin de saison, bilan, nouvelle saison, historique", () => {
    const s = simulateSeason(newGame());
    if (s.status === "sacked") {
      expect(s.inbox[0].title).toMatch(/licencié/);
      return;
    }
    expect(s.world.season).toBe(2);
    expect(s.history).toHaveLength(1);
    expect(s.history[0].position).toBeGreaterThanOrEqual(1);
    expect(s.inbox.some(m => /Bilan de la saison 1/.test(m.title))).toBe(true);
    expect(s.finances.ledger.some(e => e.label.startsWith("Prime de classement"))).toBe(true);
    // Calendrier neuf, tout le monde à 0 match
    const rows = s.world.standings[getManagedClub(s).leagueId];
    expect(rows.every(r => r.played === 0)).toBe(true);
  });

  test("l'objectif suit le niveau réel de l'effectif", () => {
    const s = newGame();
    const league = s.world.clubs.filter(c => c.leagueId === "vlt-d1")
      .sort((a, b) => squadStrength(s.world, b.id) - squadStrength(s.world, a.id));
    expect(realisticObjective(s.world, league[0].id)).toBe("win_title");
    expect(realisticObjective(s.world, league[league.length - 1].id)).toBe("develop_youth");
    expect(objectiveMaxPosition("develop_youth", 8)).toBe(7);
  });

  test("salaires : la masse salariale respecte le plafond du club", () => {
    const s = newGame();
    const total = Object.values(weeklyWages(getSquad(s), getManagedClub(s))).reduce((a, b) => a + b, 0);
    expect(total).toBeLessThanOrEqual(getManagedClub(s).wagesBudget);
    expect(total).toBeGreaterThan(getManagedClub(s).wagesBudget * 0.8);
  });

  test("un manager licencié ne peut plus jouer", () => {
    const sacked: ManagerState = { ...newGame(), status: "sacked" };
    expect(playWeek(sacked)).toBe(sacked);
  });

  test("position au classement toujours entre 1 et 8", () => {
    let s = newGame();
    for (let i = 0; i < 5; i++) {
      s = playWeek(s);
      expect(getLeaguePosition(s)).toBeGreaterThanOrEqual(1);
      expect(getLeaguePosition(s)).toBeLessThanOrEqual(8);
    }
  });
});

// ─── Reducer ─────────────────────────────────────────────────────────────────

describe("Reducer manager", () => {
  test("NEW_GAME puis actions de base", () => {
    let s = managerReducer(null, { type: "NEW_GAME", seed: SEED, clubId: CLUB, managerName: "R", now: 0 })!;
    expect(s.managerName).toBe("R");
    s = managerReducer(s, { type: "SET_TACTIC", tactic: { formation: "4-3-3", mentality: "attacking", style: "pressing" } })!;
    expect(s.tactic.style).toBe("pressing");
    const [a] = s.lineup.starters; const [b] = s.lineup.bench;
    s = managerReducer(s, { type: "SWAP_PLAYERS", a, b })!;
    expect(s.lineup.starters).toContain(b);
    expect(s.lineup.bench).toContain(a);
    s = managerReducer(s, { type: "SET_CAPTAIN", playerId: b })!;
    expect(s.lineup.captainId).toBe(b);
    s = managerReducer(s, { type: "PLAY_WEEK" })!;
    expect(s.lastMatch).not.toBeNull();
    s = managerReducer(s, { type: "MARK_ALL_READ" })!;
    expect(s.inbox.every(m => m.read)).toBe(true);
  });

  test("actions sans partie : état nul conservé", () => {
    expect(managerReducer(null, { type: "PLAY_WEEK" })).toBeNull();
  });
});

// ─── Sauvegarde ──────────────────────────────────────────────────────────────

describe("Sauvegarde manager", () => {
  test("aller-retour sauvegarde / chargement", () => {
    const store = memoryStore();
    const s = playWeek(newGame());
    expect(saveManager(s, store, 123)).toBe(true);
    const r = loadManager(store);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state.clubId).toBe(s.clubId);
      expect(r.state.savedAt).toBe(123);
      expect(r.state.world.currentWeek).toBe(s.world.currentWeek);
    }
  });

  test("clé distincte de la carrière joueur", () => {
    expect(MANAGER_SAVE_KEY).not.toBe("fc-career-v2:save");
  });

  test("sauvegarde vide, corrompue ou invalide : signalée, jamais remplacée", () => {
    const store = memoryStore();
    expect(loadManager(store)).toEqual({ ok: false, reason: "empty" });
    store.setItem(MANAGER_SAVE_KEY, "{pas du json");
    expect(loadManager(store)).toEqual({ ok: false, reason: "corrupt" });
    expect(store.data[MANAGER_SAVE_KEY]).toBe("{pas du json");
    expect(isValidManagerSave({ version: 1 })).toBe(false);
  });

  test("nouvelle partie : l'ancienne sauvegarde est archivée avant tout écrasement", () => {
    const store = memoryStore();
    const old = newGame();
    saveManager(old, store, 1);
    const raw = store.data[MANAGER_SAVE_KEY];
    expect(archiveCurrentSave(store)).toBe(true);
    expect(store.data[MANAGER_BACKUP_KEY]).toBe(raw);
  });

  test("quota plein : échec signalé, ancienne sauvegarde intacte", () => {
    const store = memoryStore();
    saveManager(newGame(), store, 1);
    const before = store.data[MANAGER_SAVE_KEY];
    const full: KeyValueStore = { getItem: k => store.getItem(k), setItem: () => { throw new Error("QuotaExceeded"); } };
    expect(saveManager(playWeek(newGame()), full, 2)).toBe(false);
    expect(store.data[MANAGER_SAVE_KEY]).toBe(before);
  });
});
