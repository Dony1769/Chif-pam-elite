"use client";

/** FC CAREER 27 — Carrière Joueur : la vie hors du terrain (finances, patrimoine, placements, vie privée). */

import React, { useState } from "react";
import { usePlayerGame } from "../_ui/PlayerContext";
import { Empty, MoneyInput, Section } from "../../manager/_ui/kit";
import { formatMoney } from "../../game/manager/engine";
import { me } from "../../game/player2/engine";
import {
  CATALOG, ITEM, LIFESTYLE, PRODUCTS, VACATIONS, lifeOf, netWorth, sponsorIncome,
} from "../../game/player2/life";
import type { AssetKind, Lifestyle, Product } from "../../game/player2/life";

const KIND_LABEL: Record<AssetKind, string> = { home: "Résidences", car: "Voitures", rental: "Immobilier locatif", luxury: "Luxe", island: "Île", business: "Affaires" };
const KIND_ICON: Record<AssetKind, string> = { home: "🏠", car: "🚗", rental: "🏢", luxury: "⌚", island: "🏝️", business: "💼" };
const TABS = ["Résumé", "Patrimoine", "Boutique", "Placements", "Vie privée"] as const;

export default function LifePage() {
  const { state, run } = usePlayerGame();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Résumé");
  const [kind, setKind] = useState<AssetKind>("home");
  const [amounts, setAmounts] = useState<Record<Product, number>>({ savings: 10_000, index: 10_000, crypto: 5_000 });
  const l = lifeOf(state);
  const bank = state.career?.bank ?? 0;
  const worth = netWorth(state);
  const invTotal = l.inv.savings + l.inv.index + l.inv.crypto;
  const assetsTotal = l.assets.reduce((t, a) => t + a.value, 0);
  const rep = state.profile.reputation;
  const p = me(state);
  const wk = state.shadow.world.currentWeek;
  const r = l.relation;

  return (
    <div className="mg-stack">
      <div className="mg-pagehead">
        <div><h1>Ma vie</h1><p>Patrimoine net {formatMoney(worth)} · compte courant {formatMoney(bank)}</p></div>
      </div>
      <div className="mg-seg mg-seg--wrap" role="tablist" aria-label="Rubriques">
        {TABS.map(t => <button key={t} type="button" role="tab" aria-selected={tab === t} aria-pressed={tab === t} onClick={() => setTab(t)}>{t}</button>)}
      </div>

      {tab === "Résumé" && (
        <div className="mg-grid">
          <div className="mg-col-8 mg-stack">
            <Section title="Patrimoine">
              <div className="pc-recap__tiles">
                <div><b>{formatMoney(bank)}</b><span>compte courant</span></div>
                <div><b>{formatMoney(invTotal)}</b><span>placements</span></div>
                <div><b>{formatMoney(assetsTotal)}</b><span>biens</span></div>
                <div><b>{formatMoney(worth)}</b><span>net</span></div>
              </div>
              <WorthChart points={l.history} />
            </Section>
            <Section title="La semaine dernière" aside={l.last ? <span className={l.last.net >= 0 ? "mg-pos-num" : "mg-neg-num"}>{l.last.net >= 0 ? "+" : ""}{formatMoney(l.last.net)}</span> : undefined}>
              {!l.last ? <Empty>Le premier relevé arrive à la fin de la semaine.</Empty> : (
                <dl className="pc-mstats">
                  {l.last.lines.map((x, i) => <React.Fragment key={i}><dt>{x.label}</dt><dd className={x.amount >= 0 ? "mg-pos-num" : "mg-neg-num"}>{x.amount >= 0 ? "+" : ""}{formatMoney(x.amount)}</dd></React.Fragment>)}
                </dl>
              )}
            </Section>
          </div>
          <div className="mg-col-4 mg-stack">
            <Section title="Train de vie" aside={<span className="mg-small">{LIFESTYLE[l.lifestyle].desc}</span>}>
              <div className="mg-seg mg-seg--wrap" role="group" aria-label="Train de vie">
                {(Object.keys(LIFESTYLE) as Lifestyle[]).map(k => <button key={k} type="button" aria-pressed={l.lifestyle === k} onClick={() => run({ type: "LIFE_STYLE", lifestyle: k })}>{LIFESTYLE[k].label}</button>)}
              </div>
              <p className="mg-small" style={{ margin: "8px 0 0" }}>Moral, fatigue et confiance du coach en dépendent. Les impôts (25 %) et la commission de l&apos;agent (5 %) sont prélevés sur chaque salaire.</p>
            </Section>
            <Section title="Revenus annexes">
              <dl className="mg-dl">
                <dt>Sponsors personnels</dt><dd>{sponsorIncome(state) ? `${formatMoney(sponsorIncome(state))}/sem` : "Réputation 20 requise"}</dd>
                <dt>Loyers et affaires</dt><dd>{formatMoney(l.assets.reduce((t, a) => t + (ITEM.get(a.itemId)?.income ?? 0), 0))}/sem en moyenne</dd>
                <dt>Moral</dt><dd>{Math.round(p.morale)}/100</dd>
              </dl>
            </Section>
          </div>
        </div>
      )}

      {tab === "Patrimoine" && (
        <Section title={`Vos biens (${l.assets.length})`} aside={<span className="mg-small">Revente : 95 % de la valeur</span>}>
          {l.assets.length === 0 ? <Empty>Rien pour l&apos;instant. Passez par la boutique.</Empty> : (
            <div className="pc-assets">
              {l.assets.map(a => {
                const it = ITEM.get(a.itemId)!;
                const pl = a.value - a.paid;
                return (
                  <div key={a.uid} className="pc-asset">
                    <span className="pc-asset__icon" aria-hidden>{KIND_ICON[it.kind]}</span>
                    <div className="pc-asset__body">
                      <b>{it.name}</b>
                      <span className="mg-small">Valeur {formatMoney(a.value)} · <span className={pl >= 0 ? "mg-pos-num" : "mg-neg-num"}>{pl >= 0 ? "+" : ""}{formatMoney(pl)}</span> · entretien {formatMoney(it.upkeep)}/sem{it.income ? ` · revenu ~${formatMoney(it.income)}/sem` : ""}</span>
                    </div>
                    <button type="button" className="mg-btn mg-btn--sm" onClick={() => run({ type: "LIFE_SELL", uid: a.uid })}>Vendre {formatMoney(Math.round(a.value * 0.95))}</button>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      )}

      {tab === "Boutique" && (
        <Section title="Boutique" aside={<span className="mg-small">Disponible : {formatMoney(bank)}</span>}>
          <div className="mg-seg mg-seg--wrap" role="group" aria-label="Catégorie">
            {(Object.keys(KIND_LABEL) as AssetKind[]).map(k => <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>{KIND_ICON[k]} {KIND_LABEL[k]}</button>)}
          </div>
          <div className="pc-assets" style={{ marginTop: 12 }}>
            {CATALOG.filter(c => c.kind === kind).map(c => {
              const locked = (c.minRep ?? 0) > rep;
              const tooExpensive = bank < c.price;
              const fx = [c.income ? `+${formatMoney(c.income)}/sem` : "", c.morale ? `moral +${c.morale}` : "", c.recovery ? `récupération +${c.recovery}` : "", c.fans ? `supporters ${c.fans > 0 ? "+" : ""}${c.fans}` : "", c.rep ? `réputation +${c.rep}` : "", `${c.growth >= 0 ? "+" : ""}${Math.round(c.growth * 100)} %/an`].filter(Boolean).join(" · ");
              return (
                <div key={c.id} className={`pc-asset${locked ? " is-locked" : ""}`}>
                  <span className="pc-asset__icon" aria-hidden>{KIND_ICON[c.kind]}</span>
                  <div className="pc-asset__body">
                    <b>{c.name} · {formatMoney(c.price)}</b>
                    <span className="mg-small">{c.desc}</span>
                    <span className="mg-small">{fx} · entretien {formatMoney(c.upkeep)}/sem</span>
                  </div>
                  <button type="button" className="mg-btn mg-btn--sm mg-btn--green" disabled={locked || tooExpensive} onClick={() => run({ type: "LIFE_BUY", itemId: c.id })}>
                    {locked ? `Réputation ${c.minRep}` : tooExpensive ? "Trop cher" : "Acheter"}
                  </button>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {tab === "Placements" && (
        <div className="mg-grid">
          {(Object.keys(PRODUCTS) as Product[]).map(k => {
            const pr = PRODUCTS[k];
            const price = k === "index" ? l.market.index : k === "crypto" ? l.market.crypto : null;
            return (
              <div key={k} className="mg-col-4">
                <Section title={pr.label} aside={price !== null ? <span className="mg-small">Cours {price.toFixed(1).replace(".", ",")}</span> : undefined}>
                  <p className="mg-small" style={{ marginTop: 0 }}>{pr.desc}</p>
                  <p style={{ margin: "0 0 10px" }}>Détenu : <b>{formatMoney(l.inv[k])}</b></p>
                  <MoneyInput id={`inv-${k}`} label="Montant" value={amounts[k]} step={1000} onChange={v => setAmounts({ ...amounts, [k]: v })} />
                  <div className="mg-row" style={{ marginTop: 8 }}>
                    <button type="button" className="mg-btn mg-btn--sm mg-btn--green" onClick={() => run({ type: "LIFE_INVEST", product: k, amount: amounts[k] })}>Placer</button>
                    <button type="button" className="mg-btn mg-btn--sm" onClick={() => run({ type: "LIFE_INVEST", product: k, amount: -amounts[k] })}>Retirer</button>
                    {l.inv[k] > 0 && <button type="button" className="mg-btn mg-btn--sm mg-btn--ghost" onClick={() => run({ type: "LIFE_INVEST", product: k, amount: -l.inv[k] })}>Tout retirer</button>}
                  </div>
                </Section>
              </div>
            );
          })}
        </div>
      )}

      {tab === "Vie privée" && (
        <div className="mg-grid">
          <div className="mg-col-6 mg-stack">
            <Section title="Cœur">
              <p style={{ marginTop: 0 }}>
                {r.status === "single" ? "Célibataire." : r.status === "dating" ? `Vous fréquentez ${r.partner}.` : r.status === "couple" ? `En couple avec ${r.partner}.` : `Marié(e) à ${r.partner}.`}
                {r.children ? ` ${r.children} enfant${r.children > 1 ? "s" : ""}.` : ""}
              </p>
              <div className="mg-row">
                {r.status === "single" && <button type="button" className="mg-btn mg-btn--sm mg-btn--green" onClick={() => run({ type: "LIFE_RELATION", action: "date" })}>Faire une rencontre</button>}
                {r.status === "dating" && <button type="button" className="mg-btn mg-btn--sm mg-btn--green" onClick={() => run({ type: "LIFE_RELATION", action: "commit" })}>Officialiser</button>}
                {r.status === "couple" && <button type="button" className="mg-btn mg-btn--sm mg-btn--gold" onClick={() => run({ type: "LIFE_RELATION", action: "propose" })}>Demander en mariage</button>}
                {(r.status === "couple" || r.status === "married") && <button type="button" className="mg-btn mg-btn--sm" onClick={() => run({ type: "LIFE_RELATION", action: "child" })}>Agrandir la famille</button>}
                {r.status !== "single" && <button type="button" className="mg-btn mg-btn--sm mg-btn--ghost" onClick={() => run({ type: "LIFE_RELATION", action: "breakup" })}>{r.status === "married" ? "Divorcer" : "Rompre"}</button>}
              </div>
              <p className="mg-small" style={{ marginBottom: 0 }}>Une vie de couple stable et une famille font monter le moral chaque semaine. Un divorce coûte cher.</p>
            </Section>
          </div>
          <div className="mg-col-6 mg-stack">
            <Section title="Vacances" aside={<span className="mg-small">{wk >= 50 || wk <= 2 ? "Intersaison : c'est le moment" : "Pendant l'intersaison"}</span>}>
              <div className="pc-assets">
                {VACATIONS.map(v => (
                  <div key={v.id} className="pc-asset">
                    <span className="pc-asset__icon" aria-hidden>{v.id === "island" ? "🏝️" : "✈️"}</span>
                    <div className="pc-asset__body"><b>{v.name}</b><span className="mg-small">{v.cost ? formatMoney(v.cost) : "Gratuit"} · moral +{v.morale} · fatigue remise à zéro</span></div>
                    <button type="button" className="mg-btn mg-btn--sm" onClick={() => run({ type: "LIFE_VACATION", id: v.id })}>Partir</button>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}

/** Courbe du patrimoine net (un point toutes les quatre semaines). */
function WorthChart({ points }: { points: { week: number; worth: number }[] }) {
  if (points.length < 2) return <p className="mg-small" style={{ margin: "10px 0 0" }}>La courbe du patrimoine se dessine au fil des semaines.</p>;
  const W = 600, H = 140, pad = 6;
  const min = Math.min(...points.map(p => p.worth)), max = Math.max(...points.map(p => p.worth));
  const span = Math.max(1, max - min);
  const xy = points.map((p, i) => [pad + (i / (points.length - 1)) * (W - 2 * pad), H - pad - ((p.worth - min) / span) * (H - 2 * pad)]);
  const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="pc-worth" role="img" aria-label={`Patrimoine : de ${formatMoney(points[0].worth)} à ${formatMoney(points[points.length - 1].worth)}`}>
      <path d={`${d} L${xy[xy.length - 1][0]},${H} L${xy[0][0]},${H} Z`} className="pc-worth__area" />
      <path d={d} className="pc-worth__line" />
    </svg>
  );
}
