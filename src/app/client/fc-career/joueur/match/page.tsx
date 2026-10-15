"use client";

/**
 * FC CAREER 27 — Carrière Joueur v2 : match en direct avec décisions clés.
 * Le match se met en pause à chaque moment clé ; « Simuler le reste » laisse
 * le joueur décider seul jusqu'au coup de sifflet.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePlayerGame } from "../_ui/PlayerContext";
import { Crest, Empty, Section } from "../../manager/_ui/kit";
import { SELECTION_LABEL, myNextFixture, preparePlayerMatch } from "../../game/player2/engine";
import { decide, onPitch, simulateRest, startPlayerLive, stepPlayerLive } from "../../game/player2/live";
import type { MomentOption } from "../../game/player2/live";
import { finishMatch } from "../../game/manager/matchSim";
import { attrLabel } from "../../game/player2/attributes";
import type { PlayerCareerState } from "../../game/player2/types";

const SPEEDS = [{ label: "Normal", ms: 260 }, { label: "Rapide", ms: 60 }];
const ICON: Record<string, string> = { goal: "⚽", yellow: "🟨", red: "🟥", injury: "✚", sub: "⇄", save: "🧤", chance: "◎", half_time: "⏸", full_time: "■" };

export default function PlayerMatchPage() {
  const { state, run, live, setLive } = usePlayerGame();
  const router = useRouter();
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(0);
  const fx = myNextFixture(state);
  const preparedFor = useRef<PlayerCareerState | null>(null);
  const eligible = state.selection === "starter" || state.selection === "bench";

  // Préparer le match de la semaine (la compo du coach peut changer jusqu'au coup d'envoi)
  useEffect(() => {
    if (!eligible) return;
    const stale = !live || !fx || live.match.fixtureId !== fx.id;
    const notStarted = !!live && live.match.minute === 0 && preparedFor.current !== state;
    if (!stale && !notStarted) return;
    preparedFor.current = state;
    const m = preparePlayerMatch(state);
    setLive(m ? startPlayerLive(m, { id: state.profile.id, name: `${state.profile.firstName.charAt(0)}. ${state.profile.lastName}`, attrs: state.profile.attrs, position: state.profile.position }) : null);
  }, [state, fx, live, setLive, eligible]);

  // Horloge : pause automatique sur un moment clé, à la mi-temps et à la fin
  useEffect(() => {
    if (!playing || !live || live.match.finished || live.moment) return;
    const t = setTimeout(() => {
      const next = stepPlayerLive(live);
      setLive(next);
      if (next.moment || next.match.minute === 45 || next.match.finished) setPlaying(false);
    }, SPEEDS[speed].ms);
    return () => clearTimeout(t);
  }, [playing, live, speed, setLive]);

  const report = useMemo(() => (live?.match.finished ? finishMatch(live.match) : null), [live]);
  const clubOf = (id: string) => state.shadow.world.clubs.find(c => c.id === id);

  if (!eligible || !fx || !live) {
    return (
      <div className="mg-center">
        <div className="mg-card mg-nogame">
          <h1>{fx ? SELECTION_LABEL[state.selection] : "Pas de match"}</h1>
          <p className="mg-muted">{!fx ? "Aucun match cette semaine." : state.selection === "out" ? "Le coach ne vous a pas retenu cette semaine. Progressez à l'entraînement pour gagner sa confiance." : "Vous ne pouvez pas jouer cette semaine."}</p>
          <button type="button" className="mg-btn mg-btn--gold" onClick={() => { run({ type: "PLAY_WEEK" }); router.push("/client/fc-career/joueur"); }}>Passer la semaine</button>
          <Link href="/client/fc-career/joueur" className="mg-link">Retour à l&apos;accueil</Link>
        </div>
      </div>
    );
  }

  const m = live.match;
  const started = m.minute > 0;
  const lastDecision = live.decisions[live.decisions.length - 1];
  const myRating = report?.ratings[live.playerId];

  function choose(o: MomentOption) {
    if (!live) return;
    setLive(decide(live, o.id));
    setPlaying(true);
  }
  function validate() {
    if (!live) return;
    const done = live.match.finished ? live : simulateRest(live);
    run({ type: "PLAY_WEEK", live: done.match });
    setLive(null);
    router.push("/client/fc-career/joueur");
  }

  return (
    <div className="mg-grid">
      <div className="mg-col-8 mg-stack">
        <div className="mg-score" aria-live="polite">
          <div className="mg-score__team"><Crest club={clubOf(m.home.clubId)} size={48} /><strong>{m.home.name}</strong></div>
          <div className="mg-score__mid">
            <div className="mg-score__goals">{m.home.goals} - {m.away.goals}</div>
            <span className={`mg-score__min${m.finished ? " is-ft" : ""}`}>{m.finished ? "Terminé" : started ? `${m.minute}'` : "Coup d'envoi"}</span>
          </div>
          <div className="mg-score__team"><Crest club={clubOf(m.away.clubId)} size={48} /><strong>{m.away.name}</strong></div>
        </div>

        {live.moment ? (
          <div className="pc-moment" role="dialog" aria-label="Moment clé">
            <div className="pc-moment__head"><b>Moment clé · {live.moment.minute}&apos;</b><span className="mg-small">À vous de choisir</span></div>
            <p style={{ margin: 0 }}>{live.moment.text}</p>
            <div className="pc-options">
              {live.moment.options.map(o => (
                <button key={o.id} type="button" className="pc-option" onClick={() => choose(o)}>
                  <span className="pc-chance">{Math.round(o.chance * 100)} %</span>
                  <b>{o.label}</b>
                  <span>{attrLabel(o.attr, state.profile.position)} {state.profile.attrs[o.attr]}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mg-row">
            {!m.finished && (
              <button type="button" className="mg-btn mg-btn--gold" onClick={() => setPlaying(p => !p)}>
                {playing ? "Pause" : started ? (m.minute === 45 ? "Seconde période" : "Reprendre") : "Coup d'envoi"}
              </button>
            )}
            {!m.finished && (
              <div className="mg-seg" role="group" aria-label="Vitesse">
                {SPEEDS.map((s, i) => <button key={s.label} type="button" aria-pressed={speed === i} onClick={() => setSpeed(i)}>{s.label}</button>)}
              </div>
            )}
            {!m.finished && <button type="button" className="mg-btn mg-btn--ghost" onClick={() => { setPlaying(false); setLive(simulateRest(live)); }}>Simuler le reste</button>}
            {m.finished && <button type="button" className="mg-btn mg-btn--gold" onClick={validate}>Valider et continuer</button>}
          </div>
        )}

        {lastDecision && !live.moment && (
          <p className={`pc-decision ${lastDecision.success ? "is-ok" : "is-ko"}`} style={{ margin: 0 }}>
            <b>{lastDecision.minute}&apos; · {lastDecision.success ? "Réussi" : "Raté"}</b> — {lastDecision.text}
          </p>
        )}

        <Section title="Direct">
          <div className="mg-feed">
            {[...m.events].reverse().map((e, i) => (
              <div key={`${e.minute}-${i}`} className={`mg-ev mg-ev--${e.type}`}>
                <span className="mg-ev__min">{e.minute}&apos;</span><span aria-hidden>{ICON[e.type] ?? "·"}</span><span className="mg-ev__txt">{e.text}</span>
              </div>
            ))}
            {m.events.length === 0 && <Empty>Coup d&apos;envoi imminent. Les moments clés vous mettront à contribution.</Empty>}
          </div>
        </Section>
      </div>

      <div className="mg-col-4 mg-stack">
        <Section title="Votre match">
          <dl className="mg-dl">
            <dt>Statut</dt><dd>{m.finished ? (report?.ratings[live.playerId] !== undefined ? "A joué" : "Pas entré") : onPitch(live) ? "Sur le terrain" : "Sur le banc"}</dd>
            <dt>Moments clés</dt><dd>{live.decisions.length}</dd>
            <dt>Décisions réussies</dt><dd>{live.decisions.filter(d => d.success).length}</dd>
            {myRating !== undefined && <><dt>Note</dt><dd className={myRating >= 7 ? "mg-pos-num" : myRating < 6 ? "mg-neg-num" : ""}>{myRating.toFixed(1)}</dd></>}
          </dl>
        </Section>
        <Section title="Vos décisions">
          {live.decisions.length === 0 ? <Empty>Aucune pour l&apos;instant.</Empty> : live.decisions.map((d, i) => (
            <div key={i} className={`pc-decision ${d.success ? "is-ok" : "is-ko"}`}><b>{d.minute}&apos;</b> {d.text}</div>
          ))}
        </Section>
      </div>
    </div>
  );
}
