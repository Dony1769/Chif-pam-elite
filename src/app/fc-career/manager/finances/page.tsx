"use client";

/** FC CAREER 27 — Mode Manager : finances (bilan de saison, grand livre). */

import React from "react";
import { useGame } from "../_ui/ManagerContext";
import { Empty, Section } from "../_ui/kit";
import { formatMoney } from "../../game/manager/engine";
import { currentWageBill } from "../../game/manager/market";
import type { LedgerCategory } from "../../game/manager/types";

const CAT: Record<LedgerCategory, string> = {
  tickets: "Billetterie", tv: "Droits TV", sponsor: "Sponsors", prize: "Primes", transfer_in: "Ventes de joueurs",
  transfer_out: "Achats de joueurs", wages: "Salaires", staff: "Staff", facilities: "Installations et travaux", other: "Divers",
};

export default function FinancesPage() {
  const { state } = useGame();
  const season = state.world.season;
  const lines = state.finances.ledger.filter(e => e.season === season);
  const byCat = new Map<LedgerCategory, number>();
  for (const e of lines) byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount);
  const income = [...byCat].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const costs = [...byCat].filter(([, v]) => v < 0).sort((a, b) => a[1] - b[1]);
  const totalIn = income.reduce((a, [, v]) => a + v, 0);
  const totalOut = costs.reduce((a, [, v]) => a + v, 0);
  const net = totalIn + totalOut;
  const maxAbs = Math.max(1, ...[...byCat.values()].map(Math.abs));

  return (
    <div className="mg-stack">
      <div className="mg-pagehead"><div><h1>Finances</h1><p>Saison {season} · {lines.length} opération(s) enregistrée(s)</p></div></div>
      <div className="mg-kpis">
        <div className="mg-kpi"><span>Trésorerie</span><b className={state.finances.balance < 0 ? "mg-neg-num" : ""}>{formatMoney(state.finances.balance)}</b></div>
        <div className="mg-kpi"><span>Résultat de la saison</span><b className={net >= 0 ? "mg-pos-num" : "mg-neg-num"}>{net >= 0 ? "+" : ""}{formatMoney(net)}</b></div>
        <div className="mg-kpi"><span>Budget transferts</span><b>{formatMoney(state.finances.transferBudget)}</b></div>
        <div className="mg-kpi"><span>Masse salariale / sem</span><b>{state.market ? formatMoney(currentWageBill(state)) : "-"}</b><span>plafond {formatMoney(state.finances.wageBudget)}</span></div>
      </div>
      <div className="mg-grid">
        <div className="mg-col-6">
          <Section title={`Revenus · ${formatMoney(totalIn)}`}>
            {income.length === 0 ? <Empty>Pas encore de revenus cette saison.</Empty> : <Bars rows={income} max={maxAbs} tone="green" />}
          </Section>
        </div>
        <div className="mg-col-6">
          <Section title={`Dépenses · ${formatMoney(-totalOut)}`}>
            {costs.length === 0 ? <Empty>Pas encore de dépenses cette saison.</Empty> : <Bars rows={costs} max={maxAbs} tone="red" />}
          </Section>
        </div>
      </div>
      <Section title="Grand livre">
        <div className="mg-tablewrap">
          <table className="mg-table">
            <thead><tr><th>Sem.</th><th>Poste</th><th>Libellé</th><th className="num">Montant</th></tr></thead>
            <tbody>
              {state.finances.ledger.slice(0, 60).map((e, i) => (
                <tr key={i}>
                  <td className="mg-small">S{e.season}·{e.week}</td>
                  <td className="mg-small">{CAT[e.category]}</td>
                  <td>{e.label}</td>
                  <td className={`num ${e.amount >= 0 ? "mg-pos-num" : "mg-neg-num"}`}>{e.amount >= 0 ? "+" : ""}{formatMoney(e.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {state.finances.ledger.length === 0 && <Empty>Aucune opération. Jouez une semaine pour voir les premiers mouvements.</Empty>}
        </div>
      </Section>
    </div>
  );
}

function Bars({ rows, max, tone }: { rows: [LedgerCategory, number][]; max: number; tone: "green" | "red" }) {
  return (
    <div className="mg-stack">
      {rows.map(([c, v]) => (
        <div key={c} className="mg-stack" style={{ gap: 4 }}>
          <div className="mg-row mg-row--between"><span>{CAT[c]}</span><b className={tone === "green" ? "mg-pos-num" : "mg-neg-num"}>{formatMoney(Math.abs(v))}</b></div>
          <span className="mg-meter" style={{ width: "100%" }}><span className={`mg-meter__fill mg-meter__fill--${tone}`} style={{ width: `${(Math.abs(v) / max) * 100}%` }} /></span>
        </div>
      ))}
    </div>
  );
}
