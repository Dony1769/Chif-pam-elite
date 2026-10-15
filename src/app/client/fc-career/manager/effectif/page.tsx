"use client";

/** FC CAREER 27 — Mode Manager : effectif (liste, statut, contrats, actions). */

import React, { useMemo, useState } from "react";
import { useGame } from "../_ui/ManagerContext";
import { Empty, Meter, MoneyInput, Ovr, Pos, Section, playerName } from "../_ui/kit";
import { formatMoney, getSquad } from "../../game/manager/engine";
import { isWindowOpen, renewalDemand } from "../../game/manager/market";
import type { WorldPlayer } from "../../game/data/worldPlayers";

const ORDER = ["GK", "CB", "LB", "RB", "DM", "CM", "AM", "LW", "RW", "ST"];

export default function SquadPage() {
  const { state, run } = useGame();
  const squad = useMemo(() => getSquad(state).sort((a, b) => ORDER.indexOf(a.position) - ORDER.indexOf(b.position) || b.overall - a.overall), [state]);
  const [sel, setSel] = useState<string | null>(null);
  const m = state.market;
  const starters = new Set(state.lineup.starters);
  const bench = new Set(state.lineup.bench);
  const selected = squad.find(p => p.id === sel) ?? null;
  const youth = m?.youth ?? [];

  const status = (p: WorldPlayer) => {
    if (p.injury && p.injury.weeksRemaining > 0) return <span className="mg-tag mg-tag--red">Blessé {p.injury.weeksRemaining} sem.</span>;
    if ((state.suspensions[p.id] ?? 0) > 0) return <span className="mg-tag mg-tag--red">Suspendu</span>;
    if (starters.has(p.id)) return <span className="mg-tag mg-tag--green">{state.lineup.captainId === p.id ? "Titulaire (C)" : "Titulaire"}</span>;
    if (bench.has(p.id)) return <span className="mg-tag">Remplaçant</span>;
    return <span className="mg-tag" style={{ opacity: 0.6 }}>Tribune</span>;
  };

  return (
    <div className="mg-stack">
      <div className="mg-pagehead">
        <div>
          <h1>Effectif</h1>
          <p>{squad.length} joueurs · âge moyen {(squad.reduce((a, p) => a + p.age, 0) / Math.max(1, squad.length)).toFixed(1)} ans · touchez un joueur pour agir</p>
        </div>
        <button type="button" className="mg-btn" onClick={() => run({ type: "AUTO_LINEUP" })}>Compo auto</button>
      </div>

      <Section>
        <div className="mg-tablewrap">
          <table className="mg-table">
            <thead>
              <tr><th>Poste</th><th>Joueur</th><th className="num">Âge</th><th className="num">Note</th><th className="num">Pot.</th><th>Forme</th><th>Fatigue</th><th>Moral</th><th>Statut</th><th className="num">Salaire</th><th className="num">Contrat</th></tr>
            </thead>
            <tbody>
              {squad.map(p => (
                <tr key={p.id} className={`is-click${sel === p.id ? " is-selected" : ""}`} onClick={() => setSel(sel === p.id ? null : p.id)}
                  tabIndex={0} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSel(sel === p.id ? null : p.id); } }}
                  aria-selected={sel === p.id}>
                  <td><Pos pos={p.position} /></td>
                  <td><span className="mg-pname"><b>{playerName(p)}</b>{m?.transferList[p.id] ? <span className="mg-tag mg-tag--amber">À vendre</span> : null}</span></td>
                  <td className="num">{p.age}</td>
                  <td className="num"><Ovr value={p.overall} small /></td>
                  <td className="num">{p.potential}</td>
                  <td><Meter value={p.form} label="Forme" /></td>
                  <td><Meter value={100 - p.fatigue} label="Fraîcheur" /></td>
                  <td><Meter value={p.morale} label="Moral" /></td>
                  <td>{status(p)}</td>
                  <td className="num">{m?.contracts[p.id] ? formatMoney(m.contracts[p.id].wage) : "-"}</td>
                  <td className="num">{m?.contracts[p.id] ? `${m.contracts[p.id].seasonsLeft} saison${m.contracts[p.id].seasonsLeft > 1 ? "s" : ""}` : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {selected && <PlayerActions key={selected.id} player={selected} onDone={() => setSel(null)} />}
      </Section>

      <Section title="Centre de formation" aside={<span className="mg-small">{youth.length} jeune(s) · partent à 20 ans sans contrat</span>}>
        {youth.length === 0 ? <Empty>Aucun jeune en attente. Nouvelle génération à l&apos;intersaison.</Empty> : (
          <div className="mg-tablewrap">
            <table className="mg-table">
              <thead><tr><th>Poste</th><th>Jeune</th><th className="num">Âge</th><th className="num">Note</th><th className="num">Potentiel</th><th /></tr></thead>
              <tbody>
                {youth.map(y => (
                  <tr key={y.id}>
                    <td><Pos pos={y.position} /></td>
                    <td><b>{playerName(y)}</b>{y.personality === "prodigy" && <span className="mg-tag mg-tag--gold" style={{ marginLeft: 6 }}>Pépite</span>}</td>
                    <td className="num">{y.age}</td>
                    <td className="num"><Ovr value={y.overall} small /></td>
                    <td className="num"><b>{y.potential}</b></td>
                    <td className="num">
                      <span className="mg-row" style={{ justifyContent: "flex-end" }}>
                        <button type="button" className="mg-btn mg-btn--sm mg-btn--green" onClick={() => run({ type: "PROMOTE_YOUTH", youthId: y.id })}>Contrat pro</button>
                        <button type="button" className="mg-btn mg-btn--sm mg-btn--ghost" onClick={() => run({ type: "RELEASE_YOUTH", youthId: y.id })}>Libérer</button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

function PlayerActions({ player: p, onDone }: { player: WorldPlayer; onDone: () => void }) {
  const { state, run } = useGame();
  const m = state.market;
  const listed = m?.transferList[p.id];
  const [price, setPrice] = useState<number>(listed ?? Math.max(50_000, p.marketValue));
  const demand = renewalDemand(state, p.id);
  const [wage, setWage] = useState<number>(demand);
  const [seasons, setSeasons] = useState<number>(3);
  const [confirmRelease, setConfirmRelease] = useState(false);
  const isStarter = state.lineup.starters.includes(p.id);
  const windowOpen = isWindowOpen(state);
  const stats = state.world.playerStats.find(s => s.playerId === p.id && s.season === state.world.season);

  return (
    <div className="mg-panel-detail mg-stack">
      <div className="mg-row mg-row--between">
        <div>
          <strong style={{ fontSize: 17 }}>{playerName(p)}</strong>
          <p className="mg-small" style={{ margin: 0 }}>
            {p.age} ans · valeur {formatMoney(p.marketValue)} · saison : {stats?.appearances ?? 0} match(s), {stats?.goals ?? 0} but(s), {stats?.assists ?? 0} passe(s) déc.
          </p>
        </div>
        <div className="mg-row">
          {isStarter && <button type="button" className="mg-btn mg-btn--sm" onClick={() => run({ type: "SET_CAPTAIN", playerId: p.id })}>Nommer capitaine</button>}
          <button type="button" className="mg-btn mg-btn--sm mg-btn--ghost" onClick={onDone}>Fermer</button>
        </div>
      </div>

      <div className="mg-grid">
        <div className="mg-col-4 mg-stack">
          <b>Transfert</b>
          <MoneyInput id={`price-${p.id}`} label="Prix demandé" value={price} onChange={setPrice} />
          <div className="mg-row">
            {listed
              ? <button type="button" className="mg-btn mg-btn--sm" onClick={() => run({ type: "UNLIST_PLAYER", playerId: p.id })}>Retirer de la liste</button>
              : <button type="button" className="mg-btn mg-btn--sm" onClick={() => run({ type: "LIST_PLAYER", playerId: p.id, price })}>Mettre en vente</button>}
            <button type="button" className="mg-btn mg-btn--sm" disabled={!windowOpen} title={windowOpen ? "" : "Mercato fermé"} onClick={() => { if (run({ type: "LOAN_OUT", playerId: p.id })?.ok) onDone(); }}>Prêter</button>
          </div>
        </div>
        <div className="mg-col-4 mg-stack">
          <b>Prolongation</b>
          <span className="mg-small">Demande : {formatMoney(demand)}/sem (actuel {formatMoney(m?.contracts[p.id]?.wage ?? 0)})</span>
          <MoneyInput id={`wage-${p.id}`} label="Salaire proposé / semaine" value={wage} step={500} onChange={setWage} />
          <div className="mg-row">
            <select className="mg-select" style={{ width: 120 }} value={seasons} onChange={e => setSeasons(Number(e.target.value))} aria-label="Durée">
              {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} saison{n > 1 ? "s" : ""}</option>)}
            </select>
            <button type="button" className="mg-btn mg-btn--sm mg-btn--green" onClick={() => run({ type: "RENEW_CONTRACT", playerId: p.id, wage, seasons })}>Proposer</button>
          </div>
        </div>
        <div className="mg-col-4 mg-stack">
          <b>Libérer</b>
          <span className="mg-small">Indemnité : 50 % du salaire restant.</span>
          {confirmRelease
            ? <div className="mg-row">
                <button type="button" className="mg-btn mg-btn--sm mg-btn--danger" onClick={() => { if (run({ type: "RELEASE_PLAYER", playerId: p.id })?.ok) onDone(); }}>Confirmer le départ</button>
                <button type="button" className="mg-btn mg-btn--sm mg-btn--ghost" onClick={() => setConfirmRelease(false)}>Annuler</button>
              </div>
            : <button type="button" className="mg-btn mg-btn--sm mg-btn--danger" onClick={() => setConfirmRelease(true)}>Libérer le joueur</button>}
        </div>
      </div>
    </div>
  );
}
