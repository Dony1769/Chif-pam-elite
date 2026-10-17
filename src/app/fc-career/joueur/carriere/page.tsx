"use client";

/** FC CAREER 27 — Carrière Joueur v2 : contrat, offres, prêt, sélection, trophées. */

import React, { useState } from "react";
import Link from "next/link";
import { usePlayerGame } from "../_ui/PlayerContext";
import { TrophyCabinet } from "../_ui/TrophyCabinet";
import { Crest, Empty, Meter, MoneyInput, Section } from "../../manager/_ui/kit";
import { MAX_INTERESTS, objectiveLabel, objectiveProgress, weekIndex, weeksBetween } from "../../game/player2/scouting";
import { formatMoney } from "../../game/manager/engine";
import { careerTotals, me, myClub } from "../../game/player2/engine";
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
  const [confirmRetire, setConfirmRetire] = useState(false);
  const age = me(state).age;
  const interests = c.interests ?? [];
  const nowIdx = weekIndex(state);

  return (
    <div className="mg-grid">
      <div className="mg-col-12"><TrophyCabinet state={state} /></div>
      <div className="mg-col-8 mg-stack">
        <Section title={`Clubs qui vous suivent (${interests.length})`} aside={<span className="mg-small">{MAX_INTERESTS} au maximum</span>}>
          {interests.length === 0 ? (
            <Empty>{c.loan ? "Pendant un prêt, les recruteurs attendent votre retour." : "Aucun recruteur ne vous suit pour l'instant. Enchaînez les bons matchs : un club peut se manifester à tout moment avec ses objectifs."}</Empty>
          ) : interests.map(it => {
            const target = clubOf(it.clubId);
            const weeks = Math.max(0, weeksBetween(nowIdx, it.deadline));
            const win = it.deadline % 100 <= 9 ? "mercato d'été" : "mercato d'hiver";
            return (
              <div key={it.id} className="pc-scout">
                <div className="mg-row mg-row--between">
                  <span className="mg-row" style={{ minWidth: 0 }}>
                    <Crest club={target} size={30} />
                    <span style={{ minWidth: 0 }}><b>{target?.name}</b><span className="mg-small"> · {state.shadow.world.leagues.find(l => l.id === target?.leagueId)?.name} · rôle envisagé {ROLE_LABEL[it.role].toLowerCase()}</span></span>
                  </span>
                  {it.ready ? <span className="mg-tag">Objectifs remplis : offre au {win}</span> : <span className="mg-small">Fin du {win} · {weeks} sem.</span>}
                </div>
                {it.objectives.map((o, i) => {
                  const pg = objectiveProgress(state, it, o);
                  const pct = o.kind === "rating" ? (pg.value ? Math.min(100, (pg.value / pg.target) * 100) : 0) : Math.min(100, (pg.value / Math.max(1, pg.target)) * 100);
                  const val = o.kind === "rating" ? `${pg.value ? pg.value.toFixed(2).replace(".", ",") : "–"} / ${pg.target.toFixed(1).replace(".", ",")}` : `${pg.value} / ${pg.target}`;
                  return (
                    <div key={i} className={`pc-scout__goal${pg.done ? " is-done" : ""}`}>
                      <span>{pg.done ? "✓ " : ""}{objectiveLabel(o)}</span>
                      <Meter value={pct} tone={pg.done ? "green" : "auto"} label={objectiveLabel(o)} />
                      <span className="pc-scout__val">{val}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </Section>

        <Section title={`Offres (${c.offers.length})`} aside={<span className={`mg-small${isWindowOpen(state.shadow) ? "" : ""}`}>{c.freeAgentSince !== null ? "Joueur libre" : windowLabel(state.shadow)}</span>}>
          {c.offers.length === 0 ? (
            <Empty>{c.loan ? "Vous êtes en prêt : pas d'offre avant votre retour." : "Aucune offre pour l'instant. Un club fait son offre au mercato quand vous avez rempli ses objectifs. Demander à partir attire plus de recruteurs."}</Empty>
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
                  <Link href={`/fc-career/joueur/contrat?offre=${encodeURIComponent(o.id)}`} className="mg-btn mg-btn--sm mg-btn--gold">Voir le contrat</Link>
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
              <span className="mg-small">{c.transferRequested ? "Votre agent prévient les clubs. Le coach n'apprécie pas." : "Plus de recruteurs, mais le coach perd un peu confiance."}</span>
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
        <Section title="Totaux de carrière">
          <dl className="mg-dl">
            <dt>Matchs</dt><dd>{totals.apps}</dd><dt>Buts</dt><dd>{totals.goals}</dd><dt>Passes décisives</dt><dd>{totals.assists}</dd>
            <dt>Réputation</dt><dd>{Math.round(state.profile.reputation)}/100</dd>
            {state.legacy && <><dt>Importé de la v1</dt><dd>{state.legacy.apps} m · {state.legacy.goals} b</dd></>}
          </dl>
        </Section>
        <Section title="Fin de carrière">
          {state.retired ? (
            <p className="mg-muted" style={{ margin: 0 }}>Vous avez pris votre retraite à {state.retired.age} ans (saison {state.retired.season}).</p>
          ) : confirmRetire ? (
            <div className="mg-stack">
              <p className="mg-warn" style={{ margin: 0 }}>Annoncer votre retraite met fin à la carrière. Ce choix est définitif.</p>
              <div className="mg-row">
                <button type="button" className="mg-btn mg-btn--ghost" onClick={() => setConfirmRetire(false)}>Annuler</button>
                <button type="button" className="mg-btn mg-btn--danger" onClick={() => { run({ type: "RETIRE" }); setConfirmRetire(false); }}>Prendre ma retraite</button>
              </div>
            </div>
          ) : (
            <>
              <p className="mg-small" style={{ marginTop: 0 }}>{age >= 32 ? "Vous pouvez annoncer votre retraite quand vous le souhaitez." : `Possible à partir de 32 ans (vous en avez ${age}).`}</p>
              <button type="button" className="mg-btn" disabled={age < 32} onClick={() => setConfirmRetire(true)}>Annoncer ma retraite</button>
            </>
          )}
        </Section>
      </div>
    </div>
  );
}
