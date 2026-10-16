"use client";

/** FC CAREER 27 — Mode Manager : club (stade, installations, staff, sponsor). */

import React, { useState } from "react";
import { useGame } from "../_ui/ManagerContext";
import { Empty, Section } from "../_ui/kit";
import { formatMoney, getManagedClub } from "../../game/manager/engine";
import { nextMatchAtHome, previewAttendance, ticketPriceBounds } from "../../game/manager/club";
import {
  EXPANSION_SEATS, FACILITY_LABEL, MAX_CAPACITY, MAX_FACILITY_LEVEL, STAFF_ROLE_LABEL, expansionCost, facilityUpgradeCost,
} from "../../game/manager/clubMath";
import type { FacilityId, StaffRole } from "../../game/manager/types";

const FAC_EFFECT: Record<FacilityId, string> = {
  training: "Progression des joueurs à l'entraînement.",
  academy: "Nombre et potentiel des jeunes de chaque génération.",
  medical: "Récupération et guérison plus rapides.",
};
const STAFF_EFFECT: Record<StaffRole, string> = {
  coach: "Progression à l'entraînement",
  fitness: "Récupération de la fatigue",
  physio: "Guérison des blessures",
  youth: "Potentiel des jeunes",
  scout: "Coût des missions de scouting",
};
const SPONSOR_STYLE = { safe: "Sûre", balanced: "Équilibrée", ambitious: "Ambitieuse" } as const;

function Level({ value }: { value: number }) {
  return <span className="mg-level" aria-label={`Niveau ${value} sur ${MAX_FACILITY_LEVEL}`}>{Array.from({ length: MAX_FACILITY_LEVEL }, (_, i) => <i key={i} className={i < value ? "on" : ""} />)}</span>;
}

export default function ClubPage() {
  const { state, run } = useGame();
  const inf = state.infra!;
  const club = getManagedClub(state);
  const W = club.wagesBudget;
  const bounds = ticketPriceBounds(state);
  const [price, setPrice] = useState(inf.stadium.ticketPrice);
  const preview = previewAttendance(state, price);
  const exp = expansionCost(W);
  const building = (k: string) => inf.projects.find(p => p.kind === k);
  const weeksLeft = (readyAt: number) => Math.max(0, readyAt - (state.world.season * 100 + state.world.currentWeek));

  return (
    <div className="mg-stack">
      <div className="mg-pagehead"><div><h1>Club</h1><p>{inf.stadium.name} · {inf.stadium.capacity.toLocaleString("fr-FR")} places</p></div></div>
      <div className="mg-grid">
        <div className="mg-col-6 mg-stack">
          <Section title="Billetterie">
            <div className="mg-stack">
              <label className="mg-field" htmlFor="ticket">
                <span>Prix du billet : <b style={{ color: "var(--mg-text)" }}>{price} €</b> (référence {bounds.ref} €)</span>
                <input id="ticket" type="range" min={bounds.min} max={bounds.max} step={1} value={price} onChange={e => setPrice(Number(e.target.value))} style={{ height: 28, padding: 0 }} />
              </label>
              <dl className="mg-dl">
                <dt>Affluence prévue</dt><dd>{preview.spectators.toLocaleString("fr-FR")} ({Math.round(preview.fill * 100)} %)</dd>
                <dt>Recette prévue par match</dt><dd>{formatMoney(preview.revenue)}</dd>
                {inf.lastAttendance && <><dt>Dernier match à domicile</dt><dd>{inf.lastAttendance.spectators.toLocaleString("fr-FR")} · {formatMoney(inf.lastAttendance.revenue)}</dd></>}
                <dt>Prochain match</dt><dd>{nextMatchAtHome(state) ? "à domicile" : "à l'extérieur"}</dd>
              </dl>
              <button type="button" className="mg-btn mg-btn--gold" disabled={price === inf.stadium.ticketPrice} onClick={() => run({ type: "SET_TICKET_PRICE", price })}>Appliquer ce prix</button>
            </div>
          </Section>
          <Section title="Stade">
            <div className="mg-stack">
              <p className="mg-muted">Agrandissement : +{EXPANSION_SEATS.toLocaleString("fr-FR")} places, {exp.weeks} semaines de travaux, {formatMoney(exp.cost)}.</p>
              {building("stadium")
                ? <span className="mg-tag mg-tag--amber">Travaux en cours · livraison dans {weeksLeft(building("stadium")!.readyAt)} sem.</span>
                : <button type="button" className="mg-btn" disabled={inf.stadium.capacity + EXPANSION_SEATS > MAX_CAPACITY} onClick={() => run({ type: "EXPAND_STADIUM" })}>Lancer l&apos;agrandissement</button>}
            </div>
          </Section>
          <Section title={inf.sponsor ? "Sponsor maillot" : "Choisir un sponsor maillot"}>
            {inf.sponsor ? (
              <dl className="mg-dl">
                <dt>Sponsor</dt><dd>{inf.sponsor.name}</dd>
                <dt>Par semaine</dt><dd>{formatMoney(inf.sponsor.weekly)}</dd>
                <dt>Prime par victoire</dt><dd>{formatMoney(inf.sponsor.winBonus)}</dd>
                <dt>Prime si objectif atteint</dt><dd>{formatMoney(inf.sponsor.objectiveBonus)}</dd>
              </dl>
            ) : inf.sponsorOffers.length === 0 ? <Empty>Aucune offre en cours.</Empty> : (
              <div className="mg-stack">
                <p className="mg-small" style={{ margin: 0 }}>Sans décision avant la 3e semaine, le conseil signe l&apos;offre équilibrée.</p>
                {inf.sponsorOffers.map(o => (
                  <div key={o.id} className="mg-row mg-row--between" style={{ padding: "8px 0", borderBottom: "1px solid var(--mg-line)" }}>
                    <div>
                      <b>{o.name}</b> <span className="mg-tag">{SPONSOR_STYLE[o.style]}</span>
                      <p className="mg-small" style={{ margin: "2px 0 0" }}>{formatMoney(o.weekly)}/sem · {formatMoney(o.winBonus)} par victoire · {formatMoney(o.objectiveBonus)} si objectif</p>
                    </div>
                    <button type="button" className="mg-btn mg-btn--sm mg-btn--gold" onClick={() => run({ type: "CHOOSE_SPONSOR", offerId: o.id })}>Signer</button>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        <div className="mg-col-6 mg-stack">
          <Section title="Installations">
            <div className="mg-stack">
              {(Object.keys(FACILITY_LABEL) as FacilityId[]).map(id => {
                const lvl = inf.facilities[id];
                const job = building(id);
                const cost = facilityUpgradeCost(W, lvl);
                return (
                  <div key={id} className="mg-row mg-row--between" style={{ padding: "6px 0", borderBottom: "1px solid var(--mg-line)" }}>
                    <div style={{ minWidth: 0 }}>
                      <b>{FACILITY_LABEL[id]}</b> <Level value={lvl} />
                      <p className="mg-small" style={{ margin: "2px 0 0" }}>{FAC_EFFECT[id]}</p>
                    </div>
                    {job ? <span className="mg-tag mg-tag--amber">Niveau {lvl + 1} dans {weeksLeft(job.readyAt)} sem.</span>
                      : lvl >= MAX_FACILITY_LEVEL ? <span className="mg-tag mg-tag--gold">Maximum</span>
                      : <button type="button" className="mg-btn mg-btn--sm" onClick={() => run({ type: "UPGRADE_FACILITY", facility: id })}>Niveau {lvl + 1} · {formatMoney(cost.cost)}</button>}
                  </div>
                );
              })}
            </div>
          </Section>
          <Section title="Staff">
            <div className="mg-tablewrap">
            <table className="mg-table">
              <tbody>
                {(Object.keys(STAFF_ROLE_LABEL) as StaffRole[]).map(role => {
                  const m = inf.staff.find(x => x.role === role);
                  return (
                    <tr key={role}>
                      <td><b>{STAFF_ROLE_LABEL[role]}</b><div className="mg-small">{STAFF_EFFECT[role]}</div></td>
                      <td>{m?.name ?? "Vacant"}</td>
                      <td><Level value={m?.quality ?? 0} /></td>
                      <td className="num">{m ? formatMoney(m.wage) : "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </Section>
          <Section title="Candidats">
            {inf.staffMarket.length === 0 ? <Empty>Plus de candidat cette saison.</Empty> : (
              <div className="mg-tablewrap">
                <table className="mg-table">
                  <tbody>
                    {inf.staffMarket.map(c => (
                      <tr key={c.id}>
                        <td><b>{c.name}</b><div className="mg-small">{STAFF_ROLE_LABEL[c.role]}</div></td>
                        <td><Level value={c.quality} /></td>
                        <td className="num">{formatMoney(c.wage)}/sem</td>
                        <td className="num"><button type="button" className="mg-btn mg-btn--sm" onClick={() => run({ type: "HIRE_STAFF", candidateId: c.id })}>Embaucher</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
