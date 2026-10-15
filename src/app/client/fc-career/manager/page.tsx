"use client";

/** FC CAREER 27 — Mode Manager : accueil (bureau du manager). */

import React from "react";
import Link from "next/link";
import { useGame } from "./_ui/ManagerContext";
import { Crest, Empty, Meter, Section } from "./_ui/kit";
import {
  OBJECTIVE_LABEL, formatMoney, getLeaguePosition, getLeagueSchedule, getManagedClub, getNextFixture,
  isSeasonOver, lineupIssues, objectiveMaxPosition,
} from "../game/manager/engine";
import { currentWageBill, windowLabel } from "../game/manager/market";

export default function ManagerHub() {
  const { state, run } = useGame();
  const club = getManagedClub(state);
  const fx = getNextFixture(state);
  const sch = getLeagueSchedule(state);
  const rows = state.world.standings[club.leagueId] ?? [];
  const pos = getLeaguePosition(state);
  const n = rows.length || 8;
  const target = objectiveMaxPosition(state.board.objective, n);
  const issues = lineupIssues(state);
  const clubOf = (id: string) => state.world.clubs.find(c => c.id === id);
  const league = state.world.leagues.find(l => l.id === club.leagueId);
  const last = state.lastMatch;
  const sacked = state.status === "sacked";
  const seasonOver = isSeasonOver(state);

  if (sacked) {
    return (
      <div className="mg-center">
        <div className="mg-card mg-nogame">
          <h1>Licencié</h1>
          <p className="mg-muted">{state.inbox[0]?.body}</p>
          <Link href="/client/fc-career/manager/nouvelle" className="mg-btn mg-btn--gold">Reprendre un club</Link>
        </div>
      </div>
    );
  }

  // Lignes visibles du classement : top 3 + voisins du club
  const myIdx = rows.findIndex(r => r.clubId === club.id);
  const visible = rows.map((r, i) => ({ r, i })).filter(({ i }) => i < 3 || Math.abs(i - myIdx) <= 1 || i === rows.length - 1);

  return (
    <div className="mg-grid">
      <div className="mg-col-8 mg-stack">
        <Section title={seasonOver ? "Fin de saison" : `Journée ${fx?.matchday ?? sch?.currentMatchday ?? "-"} · ${league?.name ?? ""}`} className="mg-card--accent">
          {fx && !seasonOver ? (
            <>
              <div className="mg-next">
                <div className="mg-next__team"><Crest club={clubOf(fx.homeClubId)} size={52} /><strong>{clubOf(fx.homeClubId)?.name}</strong></div>
                <div className="mg-next__vs">VS</div>
                <div className="mg-next__team"><Crest club={clubOf(fx.awayClubId)} size={52} /><strong>{clubOf(fx.awayClubId)?.name}</strong></div>
              </div>
              {issues.length > 0 && <p className="mg-warn" style={{ marginBottom: 10 }}>Composition à revoir : {issues[0].message} L&apos;adjoint complétera automatiquement si besoin.</p>}
              <div className="mg-row">
                <Link href="/client/fc-career/manager/match" className="mg-btn mg-btn--gold">Jouer le match en direct</Link>
                <button type="button" className="mg-btn" onClick={() => run({ type: "PLAY_WEEK" })}>Simuler la semaine</button>
                <Link href="/client/fc-career/manager/tactique" className="mg-btn mg-btn--ghost">Tactique</Link>
              </div>
            </>
          ) : (
            <div className="mg-stack">
              <p className="mg-muted">Le championnat est terminé. {club.name} finit {pos}e. Passez à l&apos;intersaison pour le bilan du conseil, les promotions et la nouvelle saison.</p>
              <button type="button" className="mg-btn mg-btn--gold" onClick={() => run({ type: "PLAY_WEEK" })}>Passer à la saison suivante</button>
            </div>
          )}
        </Section>

        {last && (
          <Section title="Dernier match">
            <div className="mg-row mg-row--between">
              <div className="mg-row"><Crest club={clubOf(last.homeClubId)} size={26} /><b>{clubOf(last.homeClubId)?.shortName}</b></div>
              <strong style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em" }}>{last.home.goals} - {last.away.goals}</strong>
              <div className="mg-row"><b>{clubOf(last.awayClubId)?.shortName}</b><Crest club={clubOf(last.awayClubId)} size={26} /></div>
            </div>
            <p className="mg-small" style={{ marginTop: 8 }}>
              {last.events.filter(e => e.type === "goal").map(e => {
                const p = state.world.players.find(x => x.id === e.playerId);
                return `${p ? `${p.firstName.charAt(0)}. ${p.lastName}` : "?"} ${e.minute}'`;
              }).join(" · ") || "Aucun but."}
            </p>
          </Section>
        )}

        <Section title="Messages" aside={<Link href="/client/fc-career/manager/messages" className="mg-link">Tout voir</Link>}>
          {state.inbox.slice(0, 4).map(m => (
            <div key={m.id} className={`mg-msg${m.read ? "" : " is-unread"}`}>
              <b>{m.title}</b>
              <span>{m.body}</span>
            </div>
          ))}
          {state.inbox.length === 0 && <Empty>Aucun message.</Empty>}
        </Section>
      </div>

      <div className="mg-col-4 mg-stack">
        <Section title="Conseil d'administration">
          <div className="mg-stack">
            <div><span className="mg-small">Objectif</span><p style={{ margin: "2px 0 0", fontWeight: 700 }}>{OBJECTIVE_LABEL[state.board.objective]}</p></div>
            <div className="mg-row mg-row--between">
              <span className="mg-small">Confiance</span>
              <span className="mg-row"><Meter value={state.board.confidence} label="Confiance du conseil" /><b>{state.board.confidence}</b></span>
            </div>
            <div className="mg-row mg-row--between">
              <span className="mg-small">Classement / visé</span>
              <b className={pos <= target ? "mg-pos-num" : "mg-neg-num"}>{pos}e / top {target}</b>
            </div>
          </div>
        </Section>

        <Section title="Classement" aside={<Link href="/client/fc-career/manager/competition" className="mg-link">Complet</Link>}>
          <table className="mg-table">
            <thead><tr><th>#</th><th>Club</th><th className="num">J</th><th className="num">Pts</th></tr></thead>
            <tbody>
              {visible.map(({ r, i }) => (
                <tr key={r.clubId} className={r.clubId === club.id ? "is-me" : ""}>
                  <td>{i + 1}</td>
                  <td><span className="mg-pname"><Crest club={clubOf(r.clubId)} size={18} />{clubOf(r.clubId)?.shortName}</span></td>
                  <td className="num">{r.played}</td>
                  <td className="num"><b>{r.points}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="Finances">
          <dl className="mg-dl">
            <dt>Trésorerie</dt><dd>{formatMoney(state.finances.balance)}</dd>
            <dt>Budget transferts</dt><dd>{formatMoney(state.finances.transferBudget)}</dd>
            <dt>Masse salariale</dt><dd>{state.market ? `${formatMoney(currentWageBill(state))} / ${formatMoney(state.finances.wageBudget)}` : "-"}</dd>
            <dt>Mercato</dt><dd>{windowLabel(state)}</dd>
          </dl>
        </Section>
      </div>
    </div>
  );
}
