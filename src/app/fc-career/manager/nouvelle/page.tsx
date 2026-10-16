"use client";

/** FC CAREER 27 — Mode Manager : nouvelle carrière (choix du club). */

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { generateWorld } from "../../game/domain/worldGenerator";
import { OBJECTIVE_LABEL, formatMoney, realisticObjective, seedFor, squadStrength } from "../../game/manager/engine";
import { archiveCurrentSave, loadManager } from "../../game/manager/storage";
import { useManager } from "../_ui/ManagerContext";
import { Crest, Ovr } from "../_ui/kit";

const PHILO: Record<string, string> = {
  attacking: "Offensive", balanced: "Équilibrée", defensive: "Défensive", possession: "Possession", counter: "Contre-attaque",
};

export default function NewManagerGame() {
  const router = useRouter();
  const { run, state, notify } = useManager();
  const [seed, setSeed] = useState<string | null>(null);
  const [leagueId, setLeagueId] = useState<string>("");
  const [clubId, setClubId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);

  // Graine choisie côté navigateur uniquement (évite tout écart serveur/client)
  useEffect(() => { setSeed(seedFor(`fc27-${Date.now()}-${Math.random()}`)); }, []);

  // Monde CP réel : 10 championnats, 198 clubs
  const world = useMemo(() => (seed ? generateWorld(seed, "cp") : null), [seed]);
  const leagues = world?.leagues ?? [];
  const activeLeague = leagueId || leagues[0]?.id || "";
  const clubs = useMemo(() => {
    if (!world) return [];
    return world.clubs.filter(c => c.leagueId === activeLeague)
      .map(c => ({ club: c, strength: squadStrength(world, c.id), objective: realisticObjective(world, c.id) }))
      .sort((a, b) => b.strength - a.strength);
  }, [world, activeLeague]);
  const picked = world?.clubs.find(c => c.id === clubId);
  const existing = typeof window !== "undefined" ? loadManager() : { ok: false as const, reason: "empty" as const };
  const hasSave = existing.ok || (!existing.ok && existing.reason === "corrupt") || !!state;

  function start() {
    if (!seed || !clubId) return;
    if (hasSave && !confirmOverwrite) { setConfirmOverwrite(true); return; }
    // Jamais d'écrasement sans copie de secours
    if (!archiveCurrentSave()) {
      notify(false, "Impossible d'archiver la partie actuelle : nouvelle partie annulée pour ne rien perdre.");
      return;
    }
    run({ type: "NEW_GAME", seed, clubId, managerName: name.trim() || "Manager" });
    router.push("/fc-career/manager");
  }

  if (!world) return <div className="mg-center"><p className="mg-muted">Génération du monde…</p></div>;

  return (
    <div className="mg-stack">
      <div className="mg-pagehead">
        <div>
          <h1>Nouvelle carrière manager</h1>
          <p>Choisissez votre championnat et le club que vous allez diriger.</p>
        </div>
      </div>

      <div className="mg-card">
        <label className="mg-field" htmlFor="mg-name" style={{ maxWidth: 360 }}>
          <span>Votre nom de manager</span>
          <input id="mg-name" value={name} maxLength={28} placeholder="ex. Jean Guillaume" onChange={e => setName(e.target.value)} />
        </label>
      </div>

      <div className="mg-seg mg-seg--wrap" role="group" aria-label="Championnat">
        {leagues.map(l => (
          <button key={l.id} type="button" aria-pressed={l.id === activeLeague} onClick={() => { setLeagueId(l.id); setClubId(null); }}>
            {l.name}
          </button>
        ))}
      </div>

      <div className="mg-clubs">
        {clubs.map(({ club, strength, objective }) => (
          <button key={club.id} type="button" className="mg-clubpick" aria-pressed={club.id === clubId} onClick={() => { setClubId(club.id); setConfirmOverwrite(false); }}>
            <Crest club={club} size={40} />
            <span className="mg-clubpick__body">
              <strong>{club.name}</strong>
              <span>Effectif <Ovr value={Math.round(strength)} small /> · réputation {club.reputation}</span>
              <span>Objectif : {OBJECTIVE_LABEL[objective].toLowerCase()}</span>
            </span>
          </button>
        ))}
      </div>

      {picked && (
        <div className="mg-card mg-card--accent mg-stack" style={{ position: "sticky", bottom: 100 }}>
          <div className="mg-row mg-row--between">
            <div className="mg-row">
              <Crest club={picked} size={40} />
              <div>
                <strong style={{ fontSize: 17 }}>{picked.name}</strong>
                <p className="mg-small" style={{ margin: 0 }}>
                  Budget transferts {formatMoney(picked.transferBudget)} · masse salariale {formatMoney(picked.wagesBudget)}/sem · jeu {PHILO[picked.philosophy]}
                </p>
              </div>
            </div>
            <button type="button" className="mg-btn mg-btn--gold" onClick={start}>
              {confirmOverwrite ? "Confirmer et archiver l'ancienne" : `Prendre ${picked.shortName}`}
            </button>
          </div>
          {confirmOverwrite && (
            <p className="mg-warn">Une carrière manager existe déjà. Elle sera copiée dans une sauvegarde de secours avant d&apos;être remplacée.</p>
          )}
        </div>
      )}
    </div>
  );
}
