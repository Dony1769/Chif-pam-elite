"use client";

/** FC CAREER 27 — Mode Manager : mercato (recherche, offres, négociations, libres, ventes). */

import React, { useMemo, useState } from "react";
import { useGame } from "../_ui/ManagerContext";
import { Crest, Empty, MoneyInput, Ovr, Pos, Section, playerName } from "../_ui/kit";
import { formatMoney, getSquad } from "../../game/manager/engine";
import {
  askingPrice, currentWageBill, isWindowOpen, knownRating, searchMarket, wageDemand, windowLabel,
} from "../../game/manager/market";
import type { MarketFilter } from "../../game/manager/market";
import type { WorldPlayerPosition } from "../../game/data/worldPlayers";
import { POS_FR } from "../_ui/kit";

type Tab = "search" | "deals" | "offers" | "free";
const POSITIONS: WorldPlayerPosition[] = ["GK", "CB", "LB", "RB", "DM", "CM", "AM", "LW", "RW", "ST"];

export default function MercatoPage() {
  const { state } = useGame();
  const m = state.market!;
  const [tab, setTab] = useState<Tab>("search");
  const open = isWindowOpen(state);
  const tabs: { id: Tab; label: string }[] = [
    { id: "search", label: "Recherche" },
    { id: "deals", label: `Négociations (${m.pendingDeals.length})` },
    { id: "offers", label: `Offres reçues (${m.offers.length})` },
    { id: "free", label: `Joueurs libres (${m.freeAgents.length})` },
  ];

  return (
    <div className="mg-stack">
      <div className="mg-pagehead">
        <div>
          <h1>Mercato</h1>
          <p className={open ? "" : "mg-warn"}>{windowLabel(state)}</p>
        </div>
        <div className="mg-kpis" style={{ minWidth: 0, flex: "1 1 360px", maxWidth: 520 }}>
          <div className="mg-kpi"><span>Budget transferts</span><b>{formatMoney(state.finances.transferBudget)}</b></div>
          <div className="mg-kpi"><span>Masse salariale</span><b>{formatMoney(currentWageBill(state))}</b><span>sur {formatMoney(state.finances.wageBudget)}/sem</span></div>
          <div className="mg-kpi"><span>Effectif</span><b>{getSquad(state).length}</b><span>16 à 28 joueurs</span></div>
        </div>
      </div>
      <div className="mg-seg" role="tablist" aria-label="Sections du mercato">
        {tabs.map(t => <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>
      {tab === "search" && <Search />}
      {tab === "deals" && <Deals />}
      {tab === "offers" && <Offers />}
      {tab === "free" && <FreeAgents />}
    </div>
  );
}

function Search() {
  const { state, run } = useGame();
  const [f, setF] = useState<MarketFilter>({});
  const [sel, setSel] = useState<string | null>(null);
  const [fee, setFee] = useState(0);
  const list = useMemo(() => searchMarket(state, f, 50).filter(l => !l.free), [state, f]);
  const clubOf = (id: string) => state.world.clubs.find(c => c.id === id);
  const picked = list.find(l => l.player.id === sel);
  const scouting = new Set(state.market!.scouting.map(a => a.playerId));

  return (
    <Section>
      <div className="mg-filters" style={{ marginBottom: 12 }}>
        <label className="mg-field"><span>Nom</span><input className="mg-input" value={f.query ?? ""} onChange={e => setF({ ...f, query: e.target.value })} placeholder="Rechercher…" /></label>
        <label className="mg-field"><span>Poste</span>
          <select className="mg-select" value={f.position ?? ""} onChange={e => setF({ ...f, position: (e.target.value || undefined) as WorldPlayerPosition | undefined })}>
            <option value="">Tous</option>{POSITIONS.map(p => <option key={p} value={p}>{POS_FR[p]}</option>)}
          </select>
        </label>
        <label className="mg-field"><span>Âge max</span><input className="mg-input" type="number" min={16} max={40} value={f.maxAge ?? ""} onChange={e => setF({ ...f, maxAge: e.target.value ? Number(e.target.value) : undefined })} /></label>
        <label className="mg-field"><span>Prix max</span>
          <select className="mg-select" value={f.maxPrice ?? ""} onChange={e => setF({ ...f, maxPrice: e.target.value ? Number(e.target.value) : undefined })}>
            <option value="">Sans limite</option>
            <option value={state.finances.transferBudget}>Mon budget ({formatMoney(state.finances.transferBudget)})</option>
            {[500_000, 1_000_000, 2_000_000, 5_000_000].map(v => <option key={v} value={v}>{formatMoney(v)}</option>)}
          </select>
        </label>
      </div>
      <div className="mg-tablewrap">
        <table className="mg-table">
          <thead><tr><th>Poste</th><th>Joueur</th><th>Club</th><th className="num">Âge</th><th className="num">Note</th><th className="num">Pot.</th><th className="num">Prix</th><th className="num">Salaire</th></tr></thead>
          <tbody>
            {list.map(l => (
              <tr key={l.player.id} className={`is-click${sel === l.player.id ? " is-selected" : ""}`} tabIndex={0}
                onClick={() => { setSel(l.player.id); setFee(l.price); }}
                onKeyDown={e => { if (e.key === "Enter") { setSel(l.player.id); setFee(l.price); } }}>
                <td><Pos pos={l.player.position} /></td>
                <td><b>{playerName(l.player)}</b>{state.market!.scouted[l.player.id] && <span className="mg-tag mg-tag--gold" style={{ marginLeft: 6 }}>Observé</span>}</td>
                <td><span className="mg-pname"><Crest club={clubOf(l.player.clubId)} size={16} />{clubOf(l.player.clubId)?.shortName}</span></td>
                <td className="num">{l.player.age}</td>
                <td className="num"><Ovr value={l.known.overall} small /></td>
                <td className="num">{l.known.potential ?? "?"}</td>
                <td className="num">{formatMoney(l.price)}</td>
                <td className="num">{formatMoney(l.wage)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <Empty>Aucun joueur ne correspond à ces critères.</Empty>}
      </div>
      {picked && (
        <div className="mg-panel-detail mg-stack">
          <div className="mg-row mg-row--between">
            <div>
              <strong style={{ fontSize: 17 }}>{playerName(picked.player)}</strong>
              <p className="mg-small" style={{ margin: 0 }}>{clubOf(picked.player.clubId)?.name} · prix demandé {formatMoney(askingPrice(state, picked.player))} · salaire souhaité {formatMoney(wageDemand(state, picked.player))}/sem</p>
            </div>
            <button type="button" className="mg-btn mg-btn--sm mg-btn--ghost" onClick={() => setSel(null)}>Fermer</button>
          </div>
          <div className="mg-row" style={{ alignItems: "flex-end" }}>
            <div style={{ width: 200 }}><MoneyInput id="bid-fee" label="Montant de l'offre" value={fee} onChange={setFee} /></div>
            <button type="button" className="mg-btn mg-btn--gold" onClick={() => run({ type: "BID", playerId: picked.player.id, fee })}>Faire une offre</button>
            {!knownRating(state, picked.player).exact && (
              <button type="button" className="mg-btn" disabled={scouting.has(picked.player.id)} onClick={() => run({ type: "SCOUT", playerId: picked.player.id })}>
                {scouting.has(picked.player.id) ? "Scout en mission" : "Envoyer un scout"}
              </button>
            )}
          </div>
        </div>
      )}
    </Section>
  );
}

function Deals() {
  const { state, run } = useGame();
  const deals = state.market!.pendingDeals;
  if (deals.length === 0) return <Section><Empty>Aucune négociation. Faites une offre acceptée par un club, ou approchez un joueur libre.</Empty></Section>;
  return <div className="mg-stack">{deals.map(d => <DealCard key={d.playerId} deal={d} onRun={run} />)}</div>;
}

function DealCard({ deal, onRun }: { deal: NonNullable<ReturnType<typeof useGame>["state"]["market"]>["pendingDeals"][number]; onRun: ReturnType<typeof useGame>["run"] }) {
  const { state } = useGame();
  const p = state.world.players.find(x => x.id === deal.playerId) ?? state.market!.freeAgents.find(x => x.id === deal.playerId);
  const [wage, setWage] = useState(deal.wageDemand);
  const [seasons, setSeasons] = useState(3);
  if (!p) return null;
  return (
    <Section title={playerName(p)} aside={<span className="mg-small">{deal.fee ? `Indemnité ${formatMoney(deal.fee)}` : "Joueur libre"} · {deal.attemptsLeft} tentative(s)</span>}>
      <p className="mg-small" style={{ marginTop: 0 }}>Il demande environ {formatMoney(deal.wageDemand)} par semaine. Un contrat long fait légèrement baisser ses exigences.</p>
      <div className="mg-row" style={{ alignItems: "flex-end" }}>
        <div style={{ width: 200 }}><MoneyInput id={`deal-${p.id}`} label="Salaire / semaine" value={wage} step={500} onChange={setWage} /></div>
        <label className="mg-field" style={{ width: 130 }}><span>Durée</span>
          <select className="mg-select" value={seasons} onChange={e => setSeasons(Number(e.target.value))}>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} saison{n > 1 ? "s" : ""}</option>)}</select>
        </label>
        <button type="button" className="mg-btn mg-btn--gold" onClick={() => onRun({ type: "OFFER_CONTRACT", playerId: p.id, wage, seasons })}>Proposer le contrat</button>
        <button type="button" className="mg-btn mg-btn--ghost" onClick={() => onRun({ type: "CANCEL_DEAL", playerId: p.id })}>Abandonner</button>
      </div>
    </Section>
  );
}

function Offers() {
  const { state, run } = useGame();
  const m = state.market!;
  const clubOf = (id: string) => state.world.clubs.find(c => c.id === id);
  const listed = getSquad(state).filter(p => m.transferList[p.id]);
  return (
    <div className="mg-stack">
      <Section title="Offres reçues">
        {m.offers.length === 0 ? <Empty>Aucune offre. Mettez des joueurs en vente depuis l&apos;effectif pour attirer les clubs.</Empty> : (
          <table className="mg-table">
            <tbody>
              {m.offers.map(o => {
                const p = getSquad(state).find(x => x.id === o.playerId);
                return p ? (
                  <tr key={o.id}>
                    <td><span className="mg-pname"><Crest club={clubOf(o.fromClubId)} size={20} />{clubOf(o.fromClubId)?.name}</span></td>
                    <td><b>{playerName(p)}</b></td>
                    <td className="num"><b>{formatMoney(o.fee)}</b></td>
                    <td className="num">
                      <span className="mg-row" style={{ justifyContent: "flex-end" }}>
                        <button type="button" className="mg-btn mg-btn--sm mg-btn--green" onClick={() => run({ type: "ACCEPT_OFFER", offerId: o.id })}>Accepter</button>
                        <button type="button" className="mg-btn mg-btn--sm mg-btn--ghost" onClick={() => run({ type: "REJECT_OFFER", offerId: o.id })}>Refuser</button>
                      </span>
                    </td>
                  </tr>
                ) : null;
              })}
            </tbody>
          </table>
        )}
      </Section>
      <Section title="Mes joueurs en vente">
        {listed.length === 0 ? <Empty>Aucun joueur sur la liste des transferts.</Empty> : (
          <table className="mg-table"><tbody>
            {listed.map(p => (
              <tr key={p.id}><td><Pos pos={p.position} /></td><td><b>{playerName(p)}</b></td><td className="num">{formatMoney(m.transferList[p.id])}</td>
                <td className="num"><button type="button" className="mg-btn mg-btn--sm mg-btn--ghost" onClick={() => run({ type: "UNLIST_PLAYER", playerId: p.id })}>Retirer</button></td></tr>
            ))}
          </tbody></table>
        )}
      </Section>
    </div>
  );
}

function FreeAgents() {
  const { state, run } = useGame();
  const m = state.market!;
  return (
    <Section aside={<span className="mg-small">Signables même mercato fermé, sans indemnité</span>} title="Joueurs libres">
      <div className="mg-tablewrap">
        <table className="mg-table">
          <thead><tr><th>Poste</th><th>Joueur</th><th className="num">Âge</th><th className="num">Note</th><th className="num">Salaire souhaité</th><th /></tr></thead>
          <tbody>
            {m.freeAgents.map(p => {
              const talking = m.pendingDeals.some(d => d.playerId === p.id);
              return (
                <tr key={p.id}>
                  <td><Pos pos={p.position} /></td><td><b>{playerName(p)}</b></td><td className="num">{p.age}</td>
                  <td className="num"><Ovr value={p.overall} small /></td><td className="num">{formatMoney(wageDemand(state, p))}</td>
                  <td className="num"><button type="button" className="mg-btn mg-btn--sm" disabled={talking} onClick={() => run({ type: "APPROACH_FREE", playerId: p.id })}>{talking ? "En discussion" : "Approcher"}</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
