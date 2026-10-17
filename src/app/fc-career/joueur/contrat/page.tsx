"use client";

/**
 * FC CAREER 27 — Carrière Joueur : négociation du contrat proposé par un club,
 * accord du club actuel (prix de vente), puis signature manuscrite animée.
 */

import React, { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { usePlayerGame } from "../_ui/PlayerContext";
import { Crest, Empty, MoneyInput, Section } from "../../manager/_ui/kit";
import { script } from "../../manager/_ui/fonts";
import { formatMoney } from "../../game/manager/engine";
import { MAX_ROUNDS, ROLE_LABEL, releaseDecision } from "../../game/player2/career";
import { myClub } from "../../game/player2/engine";
import type { ClubOffer } from "../../game/player2/types";

export default function ContractPage() {
  return <Suspense fallback={null}><Contract /></Suspense>;
}

function Contract() {
  const { state, run } = usePlayerGame();
  const router = useRouter();
  const id = useSearchParams().get("offre") ?? "";
  const offer = state.career?.offers.find(o => o.id === id);
  const [signed, setSigned] = useState<{ offer: ClubOffer; clubName: string; wage: number; seasons: number; fee: number } | null>(null);

  if (signed) return <Signature {...signed} name={`${state.profile.firstName} ${state.profile.lastName}`} onDone={() => router.push("/fc-career/joueur")} />;
  if (!offer) {
    return (
      <div className="mg-center"><div className="mg-card mg-nogame">
        <h1>Offre introuvable</h1>
        <p className="mg-muted">Cette offre a expiré ou a été retirée.</p>
        <Link href="/fc-career/joueur/carriere" className="mg-btn mg-btn--gold">Retour à la carrière</Link>
      </div></div>
    );
  }
  return <Negotiation key={offer.id + (offer.rounds ?? 0)} offer={offer} onSigned={setSigned} run={run} />;
}

function Negotiation({ offer, onSigned, run }: {
  offer: ClubOffer;
  onSigned: (x: { offer: ClubOffer; clubName: string; wage: number; seasons: number; fee: number }) => void;
  run: ReturnType<typeof usePlayerGame>["run"];
}) {
  const { state } = usePlayerGame();
  const w = state.shadow.world;
  const club = w.clubs.find(c => c.id === offer.clubId);
  const cur = myClub(state);
  const league = w.leagues.find(l => l.id === club?.leagueId);
  const rel = useMemo(() => releaseDecision(state, offer), [state, offer]);
  const [wage, setWage] = useState(offer.wage);
  const [seasons, setSeasons] = useState(offer.seasons);
  const loan = offer.kind === "loan";
  const left = MAX_ROUNDS - (offer.rounds ?? 0);
  const ratio = wage / Math.max(1, offer.wage);

  function sign() {
    const msg = run({ type: "SIGN_OFFER", offerId: offer.id, wage, seasons });
    if (msg?.ok) onSigned({ offer, clubName: club?.name ?? "", wage, seasons: loan ? 1 : seasons, fee: rel.askingFee });
  }

  return (
    <div className="mg-grid">
      <div className="mg-col-8 mg-stack">
        <Section className="mg-card--accent">
          <div className="pc-contract__head">
            <Crest club={club} size={56} />
            <div style={{ minWidth: 0 }}>
              <span className="mg-small">{loan ? "Proposition de prêt" : offer.kind === "free" ? "Contrat libre" : "Offre de transfert"}</span>
              <h1 className="pc-contract__club">{club?.name}</h1>
              <p className="mg-small" style={{ margin: 0 }}>{league?.name} · rôle envisagé {ROLE_LABEL[offer.role].toLowerCase()}</p>
            </div>
          </div>
        </Section>

        <Section title="Accord entre les clubs">
          <div className={`pc-release ${rel.allowed ? "is-ok" : "is-ko"}`}>
            <b>{rel.allowed ? (loan || offer.kind === "free" ? "Départ possible" : `${cur.name} accepte le transfert`) : `${cur.name} bloque le départ`}</b>
            <span>{rel.reason}</span>
          </div>
          {!loan && offer.kind === "transfer" && (
            <dl className="mg-dl" style={{ marginTop: 10 }}>
              <dt>Prix fixé par {cur.name}</dt><dd>{formatMoney(rel.askingFee)}</dd>
              <dt>Plafond de {club?.name}</dt><dd>{formatMoney(rel.buyerMax)}</dd>
            </dl>
          )}
          {!rel.allowed && !state.career?.transferRequested && (
            <button type="button" className="mg-btn mg-btn--sm" style={{ marginTop: 10 }} onClick={() => run({ type: "REQUEST_TRANSFER", on: true })}>Demander à partir</button>
          )}
        </Section>

        <Section title="Vos conditions" aside={!loan ? <span className="mg-small">{left} tentative{left > 1 ? "s" : ""} avant retrait de l&apos;offre</span> : undefined}>
          {loan ? (
            <p className="mg-muted" style={{ marginTop: 0 }}>Prêt jusqu&apos;à la fin de la saison. Votre salaire reste {formatMoney(offer.wage)} par semaine.</p>
          ) : (
            <div className="mg-stack">
              <p className="mg-small" style={{ margin: 0 }}>Proposition du club : <b>{formatMoney(offer.wage)}/sem</b> sur {offer.seasons} saisons. Demandez plus, ou moins : au-delà de son budget, le club refuse et contre-propose.</p>
              <div className="mg-row" style={{ alignItems: "flex-end", flexWrap: "wrap" }}>
                <div style={{ width: 210 }}><MoneyInput id="sign-wage" label="Salaire / semaine" value={wage} step={500} onChange={v => setWage(Math.max(0, v))} /></div>
                <label className="mg-field" style={{ width: 140 }}><span>Durée</span>
                  <select className="mg-select" value={seasons} onChange={e => setSeasons(Number(e.target.value))}>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} saison{n > 1 ? "s" : ""}</option>)}</select>
                </label>
              </div>
              <div className="mg-seg" role="group" aria-label="Ajuster le salaire">
                {[0.9, 1, 1.1, 1.2, 1.35].map(f => (
                  <button key={f} type="button" aria-pressed={Math.abs(ratio - f) < 0.005} onClick={() => setWage(Math.round((offer.wage * f) / 50) * 50)}>
                    {f === 1 ? "Offre" : `${f > 1 ? "+" : "−"}${Math.round(Math.abs(f - 1) * 100)} %`}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="mg-row" style={{ marginTop: 14 }}>
            <button type="button" className="mg-btn mg-btn--gold" disabled={!rel.allowed} onClick={sign}>Signer le contrat</button>
            <button type="button" className="mg-btn mg-btn--ghost" onClick={() => { run({ type: "REJECT_OFFER", offerId: offer.id }); }}>Refuser l&apos;offre</button>
            <Link href="/fc-career/joueur/carriere" className="mg-link">Retour</Link>
          </div>
        </Section>
      </div>
      <div className="mg-col-4 mg-stack">
        <Section title="Votre situation">
          <dl className="mg-dl">
            <dt>Club actuel</dt><dd>{cur.name}</dd>
            <dt>Salaire actuel</dt><dd>{formatMoney(state.contract.wage)}/sem</dd>
            <dt>Contrat</dt><dd>{state.contract.seasonsLeft} saison(s)</dd>
            <dt>Rôle</dt><dd>{ROLE_LABEL[state.contract.role]}</dd>
          </dl>
          {state.contract.seasonsLeft >= 3 && state.contract.role === "key" ? <p className="mg-small" style={{ marginBottom: 0 }}>Joueur clé sous contrat long : votre club vous vend cher.</p> : null}
        </Section>
        {offer.kind !== "loan" && <Section title="Écart avec l'offre"><Empty>{ratio > 1 ? `Vous demandez ${Math.round((ratio - 1) * 100)} % de plus que l'offre.` : ratio < 1 ? `Vous demandez ${Math.round((1 - ratio) * 100)} % de moins : accepté à coup sûr.` : "Vous acceptez l'offre telle quelle."}</Empty></Section>}
      </div>
    </div>
  );
}

function Signature({ offer, clubName, wage, seasons, fee, name, onDone }: {
  offer: ClubOffer; clubName: string; wage: number; seasons: number; fee: number; name: string; onDone: () => void;
}) {
  const { state } = usePlayerGame();
  const club = state.shadow.world.clubs.find(c => c.id === offer.clubId);
  return (
    <div className={`pc-sign ${script.variable}`}>
      <div className="pc-sign__paper">
        <div className="pc-sign__top"><Crest club={club} size={52} /><div><span className="pc-sign__kicker">Contrat professionnel</span><h1>{clubName}</h1></div></div>
        <p className="pc-sign__terms">
          {offer.kind === "loan" ? "Prêt jusqu'à la fin de la saison" : `${seasons} saison${seasons > 1 ? "s" : ""}`} · {formatMoney(wage)} par semaine
          {offer.kind === "transfer" ? ` · indemnité de transfert ${formatMoney(fee)}` : ""} · rôle {ROLE_LABEL[offer.role].toLowerCase()}
        </p>
        <svg className="pc-sign__svg" viewBox="0 0 600 140" role="img" aria-label={`Signature : ${name}`}>
          <text x="300" y="92" textAnchor="middle" className="pc-sign__ink">{name}</text>
          <line x1="70" y1="112" x2="530" y2="112" className="pc-sign__line" />
        </svg>
        <span className="pc-sign__caption">Signature du joueur</span>
        <button type="button" className="mg-btn mg-btn--gold pc-sign__go" onClick={onDone}>Rejoindre {clubName.replace(/^CP /, "")}</button>
      </div>
    </div>
  );
}
