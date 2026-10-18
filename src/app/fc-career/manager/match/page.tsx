"use client";

/**
 * FC CAREER 27 — Mode Manager : match en direct minute par minute.
 * Pause automatique à la mi-temps ; remplacements et consignes à tout moment.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useGame } from "../_ui/ManagerContext";
import { Crest, Empty, Ovr, Pos, Section, playerName } from "../_ui/kit";
import { getManagedClub, getNextFixture, prepareMatch } from "../../game/manager/engine";
import { MAX_SUBS, applySubstitution, changeTactic, finishMatch, simulateMinute, simulateToEnd } from "../../game/manager/matchSim";
import { FORMATIONS, MENTALITY_LABEL, STYLE_LABEL } from "../../game/manager/tactics";
import type { ManagerState, Mentality, PlayStyle } from "../../game/manager/types";

const SPEEDS = [
  { label: "Lent", ms: 700 },
  { label: "Normal", ms: 280 },
  { label: "Rapide", ms: 70 },
];
const ICON: Record<string, string> = { corner: "⚑", freekick: "◔", shot: "↗", goal: "⚽", yellow: "🟨", red: "🟥", injury: "✚", sub: "⇄", save: "🧤", chance: "◎", half_time: "⏸", full_time: "■" };

export default function LiveMatchPage() {
  const { state, run, live, setLive } = useGame();
  const router = useRouter();
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [outId, setOutId] = useState<string | null>(null);
  const [inId, setInId] = useState<string | null>(null);
  const fx = getNextFixture(state);

  // Préparer le match de la semaine ; tant qu'il n'a pas commencé, il suit la compo actuelle
  const preparedFor = useRef<ManagerState | null>(null);
  useEffect(() => {
    const stale = !live || !fx || live.fixtureId !== fx.id;
    const lineupChanged = !!live && live.minute === 0 && preparedFor.current !== state;
    if (!stale && !lineupChanged) return;
    preparedFor.current = state;
    setLive(prepareMatch(state, { autoSubs: false }));
  }, [state, fx, live, setLive]);

  // Horloge du match
  useEffect(() => {
    if (!playing || !live || live.finished) return;
    const t = setTimeout(() => {
      const next = simulateMinute(live);
      setLive(next);
      if (next.minute === 45 || next.finished) setPlaying(false);
    }, SPEEDS[speed].ms);
    return () => clearTimeout(t);
  }, [playing, live, speed, setLive]);

  const club = getManagedClub(state);
  const clubOf = (id: string) => state.world.clubs.find(c => c.id === id);
  const report = useMemo(() => (live?.finished ? finishMatch(live) : null), [live]);

  if (!live || !fx) {
    return (
      <div className="mg-center">
        <div className="mg-card mg-nogame">
          <h1>Pas de match</h1>
          <p className="mg-muted">Aucun match de championnat cette semaine{fx ? "" : " : la saison est terminée"}.</p>
          <Link href="/fc-career/manager" className="mg-btn mg-btn--gold">Retour à l&apos;accueil</Link>
        </div>
      </div>
    );
  }

  const side = live.managedSide;
  const mine = live[side];
  const total = Math.max(1, live.home.possessionMinutes + live.away.possessionMinutes);
  const poss = Math.round((live.home.possessionMinutes / total) * 100);
  const started = live.minute > 0;

  function sub() {
    if (!live || !outId || !inId) return;
    const next = applySubstitution(live, side, outId, inId);
    if (next !== live) { setLive(next); setOutId(null); setInId(null); }
  }
  function setTac(patch: { mentality?: Mentality; style?: PlayStyle }) {
    if (!live) return;
    setLive(changeTactic(live, side, { ...mine.tactic, ...patch }));
  }
  function validate() {
    if (!live) return;
    const done = live.finished ? live : simulateToEnd(live);
    run({ type: "PLAY_WEEK", live: done });
    setLive(null);
    router.push("/fc-career/manager");
  }

  const slots = FORMATIONS[mine.tactic.formation];

  return (
    <div className="mg-grid">
      <div className="mg-col-8 mg-stack">
        <div className="mg-score" aria-live="polite">
          <div className="mg-score__team"><Crest club={clubOf(live.home.clubId)} size={50} /><strong>{live.home.name}</strong></div>
          <div className="mg-score__mid">
            <div className="mg-score__goals">{live.home.goals} - {live.away.goals}</div>
            <span className={`mg-score__min${live.finished ? " is-ft" : ""}`}>{live.finished ? "Terminé" : started ? `${live.minute}'` : "Coup d'envoi"}</span>
          </div>
          <div className="mg-score__team"><Crest club={clubOf(live.away.clubId)} size={50} /><strong>{live.away.name}</strong></div>
        </div>

        <div className="mg-row">
          {!live.finished && (
            <button type="button" className="mg-btn mg-btn--gold" onClick={() => setPlaying(p => !p)}>
              {playing ? "Pause" : started ? (live.minute === 45 ? "Seconde période" : "Reprendre") : "Coup d'envoi"}
            </button>
          )}
          {!live.finished && (
            <div className="mg-seg" role="group" aria-label="Vitesse">
              {SPEEDS.map((s, i) => <button key={s.label} type="button" aria-pressed={speed === i} onClick={() => setSpeed(i)}>{s.label}</button>)}
            </div>
          )}
          {!live.finished && <button type="button" className="mg-btn mg-btn--ghost" onClick={() => { setPlaying(false); setLive(simulateToEnd(live)); }}>Aller au résultat</button>}
          {live.finished && <button type="button" className="mg-btn mg-btn--gold" onClick={validate}>Valider et continuer</button>}
        </div>

        <Section title="Statistiques">
          <div className="mg-stack">
            <StatBar label="Possession" l={poss} r={100 - poss} suffix="%" />
            <StatBar label="Tirs" l={live.home.shots} r={live.away.shots} />
            <StatBar label="Tirs cadrés" l={live.home.shotsOnTarget} r={live.away.shotsOnTarget} />
            <StatBar label="Buts attendus (xG)" l={Math.round(live.home.xg * 10) / 10} r={Math.round(live.away.xg * 10) / 10} />
          </div>
        </Section>

        <Section title="Direct">
          <div className="mg-feed">
            {[...live.events].reverse().map((e, i) => (
              <div key={`${e.minute}-${i}`} className={`mg-ev mg-ev--${e.type}`}>
                <span className="mg-ev__min">{e.minute}&apos;</span>
                <span aria-hidden>{ICON[e.type] ?? "·"}</span>
                <span className="mg-ev__txt">{e.text}</span>
              </div>
            ))}
            {live.events.length === 0 && <Empty>Le match n&apos;a pas commencé. Vérifiez votre composition puis donnez le coup d&apos;envoi.</Empty>}
          </div>
        </Section>

        {report && (
          <Section title={`Notes de ${club.name}`}>
            <div className="mg-tablewrap">
              <table className="mg-table">
                <tbody>
                  {Object.entries(report.ratings).sort((a, b) => b[1] - a[1]).map(([id, r]) => {
                    const p = state.world.players.find(x => x.id === id);
                    return p ? (
                      <tr key={id}><td><Pos pos={p.position} /></td><td><b>{playerName(p)}</b></td><td className="num"><b className={r >= 7 ? "mg-pos-num" : r < 6 ? "mg-neg-num" : ""}>{r.toFixed(1)}</b></td></tr>
                    ) : null;
                  })}
                </tbody>
              </table>
            </div>
          </Section>
        )}
      </div>

      <div className="mg-col-4 mg-stack">
        <Section title="Consignes">
          <div className="mg-stack">
            <div className="mg-seg" role="group" aria-label="Mentalité">
              {(["defensive", "balanced", "attacking", "very_attacking"] as Mentality[]).map(v => (
                <button key={v} type="button" disabled={live.finished} aria-pressed={mine.tactic.mentality === v} onClick={() => setTac({ mentality: v })}>{MENTALITY_LABEL[v]}</button>
              ))}
            </div>
            <div className="mg-seg" role="group" aria-label="Style">
              {(["balanced", "possession", "counter", "direct", "pressing"] as PlayStyle[]).map(v => (
                <button key={v} type="button" disabled={live.finished} aria-pressed={mine.tactic.style === v} onClick={() => setTac({ style: v })}>{STYLE_LABEL[v]}</button>
              ))}
            </div>
          </div>
        </Section>

        <Section title={`Remplacements ${mine.subsUsed}/${MAX_SUBS}`}>
          {live.finished ? <Empty>Match terminé.</Empty> : (
            <div className="mg-stack">
              <span className="mg-small">1. Joueur qui sort</span>
              <table className="mg-table">
                <tbody>
                  {mine.pitch.map((p, i) => p && (
                    <tr key={p.id} className={`is-click${outId === p.id ? " is-selected" : ""}`} onClick={() => setOutId(p.id)}>
                      <td><Pos pos={slots[i].pos} /></td>
                      <td><b>{playerName(p, true)}</b>{mine.yellows.includes(p.id) && <span aria-label="averti"> 🟨</span>}</td>
                      <td className="num"><span className={(mine.fatigue[p.id] ?? 0) > 70 ? "mg-neg-num" : "mg-small"}>{Math.round(100 - (mine.fatigue[p.id] ?? 0))} %</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <span className="mg-small">2. Joueur qui entre</span>
              <table className="mg-table">
                <tbody>
                  {mine.bench.map(p => (
                    <tr key={p.id} className={`is-click${inId === p.id ? " is-selected" : ""}`} onClick={() => setInId(p.id)}>
                      <td><Pos pos={p.position} /></td><td><b>{playerName(p, true)}</b></td><td className="num"><Ovr value={p.overall} small /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {mine.bench.length === 0 && <Empty>Plus de remplaçant disponible.</Empty>}
              <button type="button" className="mg-btn mg-btn--green" disabled={!outId || !inId || mine.subsUsed >= MAX_SUBS} onClick={sub}>Effectuer le changement</button>
            </div>
          )}
        </Section>
        {!started && <Link href="/fc-career/manager/tactique" className="mg-btn mg-btn--ghost">Modifier la composition</Link>}
      </div>
    </div>
  );
}

function StatBar({ label, l, r, suffix = "" }: { label: string; l: number; r: number; suffix?: string }) {
  const tot = l + r || 1;
  return (
    <div className="mg-statbar">
      <span className="mg-statbar__label">{label}</span>
      <span>{l}{suffix}</span>
      <span className="mg-statbar__track"><span style={{ width: `${(l / tot) * 100}%` }} /><span style={{ width: `${(r / tot) * 100}%` }} /></span>
      <span className="r">{r}{suffix}</span>
    </div>
  );
}

