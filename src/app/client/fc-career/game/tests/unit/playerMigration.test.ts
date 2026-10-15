/**
 * FC CAREER 27 — Tests de la migration v1 → v2 (Lot J5)
 * Les sauvegardes v1 sont construites avec la vraie fabrique de joueur v1.
 */

import { createPlayer } from "../../domain/playerFactory";
import { CLUBS } from "../../data/world";
import { migrateLegacy, readLegacy } from "../../player2/migrate";
import { playerStep } from "../../player2/reducer";
import { me, myClub, careerTotals } from "../../player2/engine";
import { overallOf, legacyPosition } from "../../player2/attributes";
import { advancePlayerWeek } from "../../player2/career";

function v1Save(position: "ST" | "CAM" | "GK" | "RWB", clubId: string, extra: Partial<{ age: number; apps: number; goals: number; assists: number; season: number; endSeason: number; salary: number; reputation: number }> = {}) {
  const p = createPlayer({ firstName: "Ancien", lastName: "Joueur", nationality: "BR", position, foot: "left", potential: 84, seed: "v1-mig" });
  return {
    version: 1,
    meta: { careerId: "career-v1-test", createdAt: 0, savedAt: 0, playTime: 0 },
    player: {
      ...p,
      age: extra.age ?? 21,
      reputation: extra.reputation ?? 33,
      contract: { ...p.contract, clubId, salary: extra.salary ?? 2400, endSeason: extra.endSeason ?? 4 },
      stats: { ...p.stats, totalAppearances: extra.apps ?? 57, totalGoals: extra.goals ?? 21, totalAssists: extra.assists ?? 9, seasons: [{}, {}] },
    },
    career: { season: extra.season ?? 3 },
  };
}

const D1 = CLUBS.find(c => c.tier === 1)!.id;

describe("Migration v1 → v2", () => {
  test("lecture du résumé v1 ; sauvegarde illisible refusée", () => {
    const sum = readLegacy(v1Save("ST", D1));
    expect(sum).toMatchObject({ name: "Ancien Joueur", apps: 57, goals: 21, assists: 9, clubId: D1, season: 3 });
    expect(readLegacy(null)).toBeNull();
    expect(readLegacy({ player: { firstName: "X" } })).toBeNull();
    expect(migrateLegacy({ foo: 1 })).toBeNull();
  });

  test("identité, âge, poste, caractéristiques, club et contrat conservés", () => {
    const raw = v1Save("CAM", D1, { age: 21, season: 3, endSeason: 4, salary: 2400 });
    const s = migrateLegacy(raw, 0)!;
    expect(s.profile.firstName).toBe("Ancien");
    expect(s.profile.position).toBe(legacyPosition("CAM"));
    expect(me(s).age).toBe(21);
    expect(myClub(s).id).toBe(D1);
    expect(me(s).clubId).toBe(D1);
    expect(me(s).overall).toBe(overallOf(s.profile.attrs, "AM"));
    expect(s.profile.potential).toBeGreaterThanOrEqual(me(s).overall);
    expect(s.contract.wage).toBe(2400);
    expect(s.contract.seasonsLeft).toBe(2); // saisons 3 et 4
    expect(s.profile.reputation).toBe(33);
  });

  test("statistiques cumulées reprises dans les totaux de carrière", () => {
    const s = migrateLegacy(v1Save("ST", D1), 0)!;
    expect(s.legacy).toMatchObject({ careerId: "career-v1-test", apps: 57, goals: 21, assists: 9, seasonsPlayed: 2 });
    expect(careerTotals(s)).toEqual({ apps: 57, goals: 21, assists: 9 });
    const after = advancePlayerWeek(s);
    expect(careerTotals(after).apps).toBeGreaterThanOrEqual(57);
  });

  test("ancien club absent du monde : club de remplacement adapté, signalé", () => {
    const s = migrateLegacy(v1Save("ST", "club-qui-n-existe-pas"), 0)!;
    expect(myClub(s).tier).toBeGreaterThanOrEqual(2);
    expect(s.inbox[0].body).toMatch(/n'existe plus/);
  });

  test("joueur v1 encore au centre de formation : premier contrat pro", () => {
    const s = migrateLegacy(v1Save("ST", "academy"), 0)!;
    expect(s.inbox[0].body).toMatch(/sort du centre de formation/);
    expect(myClub(s).tier).toBeGreaterThanOrEqual(2);
  });

  test("gardien et latéral v1 correctement convertis", () => {
    const gk = migrateLegacy(v1Save("GK", D1), 0)!;
    expect(gk.profile.position).toBe("GK");
    const rwb = migrateLegacy(v1Save("RWB", D1), 0)!;
    expect(rwb.profile.position).toBe("RB");
  });

  test("le monde du joueur importé fonctionne : semaines jouables", () => {
    let s = migrateLegacy(v1Save("ST", D1), 0)!;
    for (let i = 0; i < 3; i++) s = advancePlayerWeek(s);
    expect(s.shadow.world.currentWeek).toBe(4);
    expect(s.inbox[s.inbox.length - 1].title).toBe("Carrière importée");
  });

  test("reducer : la sauvegarde v1 passée n'est jamais modifiée", () => {
    const raw = v1Save("ST", D1);
    const snapshot = JSON.stringify(raw);
    const step = playerStep(null, { type: "IMPORT_LEGACY", raw, now: 0 });
    expect(step.state).not.toBeNull();
    expect(step.message?.ok).toBe(true);
    expect(JSON.stringify(raw)).toBe(snapshot);
    expect(playerStep(null, { type: "IMPORT_LEGACY", raw: "pas une sauvegarde" }).message?.ok).toBe(false);
  });
});
