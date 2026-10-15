"use client";

/** FC CAREER 27 — Carrière Joueur v2 : contrat, offres, prêt, sélection, trophées. */

import React, { useState } from "react";
import { usePlayerGame } from "../_ui/PlayerContext";
import { Crest, Empty, MoneyInput, Section } from "../../manager/_ui/kit";
import { formatMoney } from "../../game/manager/engine";
import { careerTotals, myClub } from "../../game/player2/engine";
import { ROLE_LABEL, clubWageCap, marketValue, nationalRank, renewalDemand } from "../../game/player2/career";
import { isWindowOpen, windowLabel } from "../../game/manager/market";

export default function CareerPage() {
  const { state, run } = usePlayerGame();
  const c = state.career!;
  const club = myClub(state);
  const clubOf = (id: string) => state.shadow.world.clubs.find(x => x.id === id);
  const demand = renewalDemand(state);
  const [wage, setWage] = useState(demand);
  const [seasons, setSeasons] = useState(3);
  const totals = careerTotals(state);
  const country = state.shadow.world.countries.find(k => k.id === c.national.countryId);
  const rank = nationalRank(state);

  return (
    <div className="mg-grid">
      <div className="mg-col-8 mg-stack">
        <Section title={`Offres (${c.offers.length})`} aside={<span className={`mg-small${isWindowOpen(state.shadow) ? "" : ""}`}>{c.freeAgentSince !== null ? "Joueur libre" : windowLabel(state.shadow)}</span>}>
          {c.offers.length === 0 ? (
            <Empty>{c.loan ? "Vous êtes en prêt : pas d'offre avant votre retour." : "Aucune offre pour l'instant. Brillez sur le terrain, ou demandez à partir."}</Empty>
          ) : c.offers.map(o => {
            const target = clubOf(o.clubId);
            const league = state.shadow.world.leagues.find(l => l.id === target?.leagueId);
            return (
              <div key={o.id} className="mg-row mg-row--between" style={{ padding: "10px 0", borderBottom: "1px solid var(--mg-line)" }}>
                <div className="mg-row" style={{ minWidth: 0 }}>
                  <Crest club={target} size={34} />
                  <div style={{ minWidth: 0 }}>
                    <b>{target?.name}</b> <span className="mg-tag">{o.kind === "loan" ? "Prêt" : o.kind === "free" ? "Libre" : "Transfert"}</span>
                    <p className="mg-small" style={{ margin: "2px 0 0" }}>
                      {league?.name} · rôle {ROLE_LABEL[o.role].toLowerCase()} · {formatMoney(o.wage)}/sem{o.kind !== "loan" ? ` · ${o.seasons} saisons` : " · jusqu'à la fin de saison"}{o.fee ? ` · indemnité ${formatMoney(o.fee)}` : ""}
                    </p>
                  </div>
                </div>
                <span className="mg-row">
                  <button type="button" className="mg-btn mg-btn--sm mg-btn--gold" onClick={() => run({ type: "ACCEPT_OFFER", offerId: o.id })}>Accepter</button>
                  <button type="button" className="mg-btn mg-btn--sm mg-btn--ghost" onClick={() => run({ type: "REJECT_OFFER", offerId: o.id })}>Refuser</button>
                </span>
              </div>
            );
          })}
          {!c.loan && (
            <div className="mg-row" style={{ marginTop: 12 }}>
              <button type="button" className={`mg-btn mg-btn--sm${c.transferRequested ? " mg-btn--danger" : ""}`} onClick={() => run({ type: "REQUEST_TRANSFER", on: !c.transferRequested })}>
                {c.transferRequested ? "Annuler la demande de départ" : "Demander à partir"}
              </button>
              <span className="mg-small">{c.transferRequested ? "Votre agent cherche un club. Le coach n'apprécie pas." : "Plus d'offres, mais le coach perd un peu confiance."}</span>
            </div>
          )}
        </Section>

        <Section title="Contrat">
          <dl className="mg-dl">
            <dt>Club</dt><dd>{club.name}{c.loan ? ` (prêt de ${clubOf(c.loan.parentClubId)?.name})` : ""}</dd>
            <dt>Salaire</dt><dd>{formatMoney(state.contract.wage)} / semaine</dd>
            <dt>Saisons restantes</dt><dd>{state.contract.seasonsLeft}</dd>
            <dt>Rôle</dt><dd>{ROLE_LABEL[state.contract.role]}</dd>
            <dt>Valeur marchande</dt><dd>{formatMoney(marketValue(state))}</dd>
            <dt>Économies</dt><dd>{formatMoney(c.bank)}</dd>
          </dl>
          {!c.loan && (
            <div className="mg-panel-detail mg-stack">
              <b>Prolongation</b>
              <span className="mg-small">Demande de votre agent : {formatMoney(demand)}/sem · le club peut aller jusqu&apos;à {formatMoney(clubWageCap(state))}/sem. Possible à partir de 2 saisons restantes.</span>
              <div className="mg-row" style={{ alignItems: "flex-end" }}>
                <div style={{ width: 200 }}><MoneyInput id="renew-wage" label="Salaire / semaine" value={wage} step={100} onChange={setWage} /></div>
                <label className="mg-field" style={{ width: 130 }}><span>Durée</span>
                  <select className="mg-select" value={seasons} onChange={e => setSeasons(Number(e.target.value))}>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} saison{n > 1 ? "s" : ""}</option>)}</select>
                </label>
                <button type="button" className="mg-btn mg-btn--green" onClick={() => run({ type: "RENEW", wage, seasons })}>Proposer au club</button>
              </div>
            </div>
          )}
        </Section>
      </div>

      <div className="mg-col-4 mg-stack">
        <Section title={`Sélection · ${country?.name ?? ""}`}>
          <dl className="mg-dl">
            <dt>Statut</dt><dd>{c.national.called ? "Convoqué" : "Non convoqué"}</dd>
            <dt>Rang dans le pays</dt><dd>{rank}e {rank <= 23 ? "(sélectionnable)" : "(top 23 requis)"}</dd>
            <dt>Sélections</dt><dd>{c.national.caps}</dd>
            <dt>Buts</dt><dd>{c.national.goals}</dd>
          </dl>
          <p className="mg-small" style={{ marginBottom: 0 }}>Trêve internationale toutes les 5 semaines, à partir de 18 ans.</p>
        </Section>
        <Section title={`Trophées (${c.awards.length})`}>
          {c.awards.length === 0 ? <Empty>Aucun trophée pour l&apos;instant. Meilleur buteur, révélation, titre, Étoile d&apos;Or… tout reste à gagner.</Empty> : (
            <table className="mg-table"><tbody>
              {[...c.awards].reverse().map((a, i) => <tr key={i}><td className="mg-small">S{a.season}</td><td><b>{a.id === "golden_star" ? "★ " : ""}{a.label}</b></td></tr>)}
            </tbody></table>
          )}
        </Section>
        <Section title="Totaux de carrière">
          <dl className="mg-dl">
            <dt>Matchs</dt><dd>{totals.apps}</dd><dt>Buts</dt><dd>{totals.goals}</dd><dt>Passes décisives</dt><dd>{totals.assists}</dd>
            <dt>Réputation</dt><dd>{Math.round(state.profile.reputation)}/100</dd>
            {state.legacy && <><dt>Importé de la v1</dt><dd>{state.legacy.apps} m · {state.legacy.goals} b</dd></>}
          </dl>
        </Section>
      </div>
    </div>
  );
}
