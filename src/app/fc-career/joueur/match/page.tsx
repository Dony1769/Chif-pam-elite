"use client";

/**
 * FC CAREER 27 — Carrière Joueur v2 : match en direct avec décisions clés.
 * Le match se met en pause à chaque moment clé ; « Simuler le reste » laisse
 * le joueur décider seul jusqu'au coup de sifflet.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePlayerGame } from "../_ui/PlayerContext";
import { MatchPitch, isVisualEvent } from "../_ui/MatchPitch";
import type { Step } from "../_ui/MatchPitch";
import { goalRoar, kick, ooh, post, save, setSoundOn, soundOn, startCrowd, stopCrowd, whistle } from "../_ui/sound";
import { minuteFrames, phaseFrames } from "../../game/player2/pitchPlay";
import type { MinuteInput } from "../../game/player2/pitchPlay";
import type { PitchAction } from "../_ui/MatchPitch";
import { Crest, Empty, Section } from "../../manager/_ui/kit";
import { SELECTION_LABEL, effSubs, myNextFixture, preparePlayerMatch } from "../../game/player2/engine";
import { cupLabel, myCupMatch, shootout, startCupLive } from "../../game/player2/cup";
import { Shootout } from "../_ui/Shootout";
import { TimingMeter } from "../_ui/TimingMeter";
import { commentLine } from "../../game/player2/commentary";
import type { CommentCtx } from "../../game/player2/commentary";
import { MatchReportCard } from "../_ui/MatchReportCard";
import { isNation, teamName } from "../../game/domain/competitions";
import { NATION_BY_ID } from "../../game/data/cp/nations";
import { decide, onPitch, simulateRest, startPlayerLive, stepPlayerLive } from "../../game/player2/live";
import type { MomentOption, PlayerLive } from "../../game/player2/live";
import { finishMatch } from "../../game/manager/matchSim";
import { attrLabel } from "../../game/player2/attributes";
import type { PlayerCareerState } from "../../game/player2/types";
import { shortName } from "../../game/utils/names";

/** Durée d'une phase de jeu (une minute) : normale ou rapide. */
const SPEEDS = [{ label: "Normal", ms: 260, phase: 2200 }, { label: "Rapide", ms: 60, phase: 900 }];
const ICON: Record<string, string> = { corner: "⚑", freekick: "◔", shot: "↗", goal: "⚽", yellow: "🟨", red: "🟥", injury: "✚", sub: "⇄", save: "🧤", chance: "◎", half_time: "⏸", full_time: "■" };

export default function PlayerMatchPage() {
  const { state, run, live, setLive } = usePlayerGame();
  const router = useRouter();
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [hot, setHot] = useState<MomentOption["id"] | null>(null);
  const [cam, setCam] = useState<"dynamic" | "fixed">("dynamic");
  const [mode, setMode] = useState<"direct" | "highlights" | "goals">("direct");
  // Rejeu synchronisé : le score, le fil et les stats restent sur `view` tant que l'action joue
  const [action, setAction] = useState<PitchAction | null>(null);
  const [view, setView] = useState<PlayerLive | null>(null);
  const [poss, setPoss] = useState<"home" | "away" | null>(null);
  const [aiming, setAiming] = useState<MomentOption | null>(null);
  const [control, setControl] = useState(() => { try { return localStorage.getItem("fc-career:control") !== "off"; } catch { return true; } });
  const endAction = useCallback(() => { setAction(null); setView(null); }, []);
  const lastBall = useRef<{ x: number; y: number } | undefined>(undefined);
  const [sound, setSound] = useState(true);
  useEffect(() => { setSound(soundOn()); return () => stopCrowd(); }, []);
  // Son de chaque étape : passes, frappes, filet, poteau, arrêt, sifflet
  const onStep = useCallback((st: Step) => {
    const f = st.flash?.text;
    if (f === "BUT !") { kick(true); window.setTimeout(() => goalRoar(st.flash!.tone !== "bad"), 350); }
    else if (f === "MI-TEMPS") whistle("long");
    else if (f === "FIN DU MATCH") { whistle("end"); stopCrowd(); }
    else if (f === "Poteau !") { kick(true); window.setTimeout(post, 300); }
    else if (st.badge?.kind === "glove") { kick(true); window.setTimeout(save, 300); }
    else if (st.badge?.kind === "yellow" || st.badge?.kind === "red") whistle("short");
    else if (st.caption && /tente|frappe|à côté/.test(st.caption)) { kick(true); window.setTimeout(ooh, 250); }
    else if (st.ball.length > 1) kick(false);
  }, []);
  const cup = myCupMatch(state);
  const fx0 = myNextFixture(state);
  const fx = cup ? null : fx0;
  const preparedFor = useRef<PlayerCareerState | null>(null);
  const eligible = cup ? cup.selection !== "out" : state.selection === "starter" || state.selection === "bench";
  const liveId = cup ? `cup:${cup.key}` : fx?.id;

  // Préparer le match de la semaine (la compo du coach peut changer jusqu'au coup d'envoi)
  useEffect(() => {
    if (!eligible) return;
    const stale = !live || !liveId || live.match.fixtureId !== liveId;
    const notStarted = !!live && live.match.minute === 0 && preparedFor.current !== state;
    if (!stale && !notStarted) return;
    preparedFor.current = state;
    if (cup) { setLive(startCupLive(state, cup)); return; }
    const m = preparePlayerMatch(state);
    setLive(m ? startPlayerLive(m, {
      id: state.profile.id, name: `${shortName(state.profile)}`, attrs: state.profile.attrs, position: state.playedAs ?? state.profile.position,
      sub: effSubs(state.profile), ps: state.profile.playStyles, weakFoot: state.profile.weakFoot, skillMoves: state.profile.skillMoves,
    }) : null);
  }, [state, cup, liveId, live, setLive, eligible]);

  // Horloge : pause automatique sur un moment clé, à la mi-temps et à la fin
  useEffect(() => {
    if (!playing || !live || live.match.finished || live.moment || action || view) return;
    // Direct : chaque minute ; Temps forts et Buts : les minutes calmes défilent
    const t = setTimeout(() => {
      const next = stepPlayerLive(live);
      const all = next.match.events.slice(live.match.events.length).filter(isVisualEvent);
      const fresh = all.filter(e => mode !== "goals" || e.type === "goal" || e.type === "half_time" || e.type === "full_time");
      const side = next.match.home.possessionMinutes > live.match.home.possessionMinutes ? "home" : "away";
      setPoss(side);
      // Direct : chaque minute est jouée ; Temps forts : les minutes avec une action ; Buts : les buts
      const show = mode === "direct" || fresh.length > 0;
      if (show) {
        const me = live.match.managedSide;
        const input: MinuteInput = {
          mine: live.match[me], theirs: live.match[me === "home" ? "away" : "home"], mySide: me, minute: next.match.minute,
          possession: side, events: fresh, seed: live.match.seed, from: lastBall.current,
        };
        // Phase réellement jouée par le moteur positionnel (sinon reconstruction)
        const ph = next.match.phase;
        const frames = ph && ph.minute === next.match.minute ? phaseFrames(ph, input) : minuteFrames(input);
        const shot = fresh.some(e => e.type === "goal" || e.type === "shot" || e.type === "save" || e.type === "chance");
        const last = frames[frames.length - 1];
        if (last) lastBall.current = last.ball;
        setView(live);
        setAction({ key: `m${next.match.minute}-${next.match.events.length}`, events: fresh, possession: side, frames, total: (SPEEDS[speed].phase + (shot ? 1400 : 0)) });
      }
      setLive(next);
      if (next.moment || next.match.minute === 45 || next.match.finished) setPlaying(false);
    }, mode === "direct" ? 30 : 20);
    return () => clearTimeout(t);
  }, [playing, live, speed, setLive, action, view, mode]);

  const report = useMemo(() => (live?.match.finished ? finishMatch(live.match) : null), [live]);
  const clubOf = (id: string) => state.shadow.world.clubs.find(c => c.id === id);

  if (cup && !eligible) {
    return (
      <div className="mg-center">
        <div className="mg-card mg-nogame">
          <h1>Non retenu</h1>
          <p className="mg-muted">{cupLabel(cup)} contre {teamName(state.shadow.world, cup.opponent)} : {cup.national ? "le sélectionneur" : "le coach"} ne vous a pas retenu pour ce match.</p>
          <button type="button" className="mg-btn mg-btn--gold" onClick={() => run({ type: "SKIP_CUP" })}>Suivre le match depuis la tribune</button>
        </div>
      </div>
    );
  }

  if (!eligible || !(fx || cup) || !live || live.match.fixtureId !== liveId) {
    return (
      <div className="mg-center">
        <div className="mg-card mg-nogame">
          <h1>{fx ? SELECTION_LABEL[state.selection] : "Pas de match"}</h1>
          <p className="mg-muted">{!fx ? "Aucun match cette semaine." : state.selection === "out" ? "Le coach ne vous a pas retenu cette semaine. Progressez à l'entraînement pour gagner sa confiance." : "Vous ne pouvez pas jouer cette semaine."}</p>
          <button type="button" className="mg-btn mg-btn--gold" onClick={() => { run({ type: "PLAY_WEEK" }); router.push("/fc-career/joueur"); }}>Passer la semaine</button>
          <Link href="/fc-career/joueur" className="mg-link">Retour à l&apos;accueil</Link>
        </div>
      </div>
    );
  }

  const shown = view ?? live;
  const m = shown.match;
  const started = m.minute > 0;
  const teamColors = (id: string, fallback: [string, string]): [string, string] => {
    const c = clubOf(id)?.colors;
    return c ? [c.primary, c.secondary] : fallback;
  };
  const myId = m[m.managedSide].clubId, oppId = m[m.managedSide === "home" ? "away" : "home"].clubId;
  const [mc, mc2] = teamColors(myId, ["#B9FF39", "#0A0C0F"]);
  let [tc, tc2] = teamColors(oppId, ["#FF6B72", "#ffffff"]);
  if (tc.toLowerCase() === mc.toLowerCase()) [tc, tc2] = [tc2, tc];
  const pitchColors = { mine: mc, mineAlt: mc2, theirs: tc, theirsAlt: tc2 };
  const lastDecision = live.decisions[live.decisions.length - 1];
  const pById = new Map(state.shadow.world.players.map(p => [p.id, p]));
  const cctx = (score?: { home: number; away: number }): CommentCtx => ({
    name: id => { const p = id ? pById.get(id) : undefined; return p ? p.lastName : undefined; },
    team: side => m[side].name, meId: live.playerId, mySide: m.managedSide, celebration: state.profile.celebration, score,
  });
  // Score à chaque événement, pour que le commentateur annonce le bon résultat
  const running: { home: number; away: number }[] = [];
  { let h = 0, a = 0; for (const e of m.events) { if (e.type === "goal") { if (e.side === "home") h++; else a++; } running.push({ home: h, away: a }); } }
  const lastBig = [...m.events].reverse().find(e => e.type !== "sub");
  const myRating = report?.ratings[live.playerId];

  function choose(o: MomentOption) {
    if (!live) return;
    // Mode geste : la jauge de timing précède l'exécution
    if (control && !aiming) { setAiming(o); setHot(null); return; }
    execute(o, 0);
  }
  function execute(o: MomentOption, skill: number) {
    if (!live) return;
    setAiming(null);
    // Le score attend la fin du rejeu de l'action
    setView(live);
    setLive(decide(live, o.id, skill));
    setHot(null);
    // Le temps de voir l'action rejouée sur le terrain
    setTimeout(() => { setView(null); setPlaying(true); }, 2600);
  }
  function validate() {
    if (!live) return;
    const done = live.match.finished ? live : simulateRest(live);
    setLive(null);
    // Match de coupe : le championnat de la semaine suit (s'il y en a un)
    if (cup) { run({ type: "PLAY_CUP", live: done.match, psGain: done.psGain }); router.push("/fc-career/joueur"); return; }
    run({ type: "PLAY_WEEK", live: done.match, psGain: done.psGain });
    router.push("/fc-career/joueur");
  }

  return (
    <div className="mg-grid">
      <div className="mg-col-8 mg-stack">
        {cup && (
          <div className={`pc-cupbanner${cup.stage === "Finale" ? " is-final" : ""}`}>
            <span className="mg-small">{cup.national ? "Sélection" : cup.comp.kind === "continental" ? "Coupe d'Europe" : "Coupe nationale"}{cup.knockout ? " · élimination directe, tirs au but en cas d'égalité" : ""}</span>
            <b>{cupLabel(cup)}</b>
          </div>
        )}
        <div className="mg-score" aria-live="polite">
          <div className="mg-score__team">{isNation(m.home.clubId) ? <span className="pc-flag" aria-hidden>{NATION_BY_ID[m.home.clubId]?.flag}</span> : <Crest club={clubOf(m.home.clubId)} size={48} />}<strong>{m.home.name}</strong></div>
          <div className="mg-score__mid">
            <div className="mg-score__goals">{m.home.goals} - {m.away.goals}</div>
            <span className={`mg-score__min${m.finished ? " is-ft" : ""}`}>{m.finished ? "Terminé" : started ? `${m.minute}'` : "Coup d'envoi"}</span>
          </div>
          <div className="mg-score__team">{isNation(m.away.clubId) ? <span className="pc-flag" aria-hidden>{NATION_BY_ID[m.away.clubId]?.flag}</span> : <Crest club={clubOf(m.away.clubId)} size={48} />}<strong>{m.away.name}</strong></div>
        </div>

        {cup?.knockout && m.finished && m.home.goals === m.away.goals && (() => {
          const sh = shootout(state, cup);
          const mineN = cup.side === "home" ? m.home.name : m.away.name, theirN = cup.side === "home" ? m.away.name : m.home.name;
          return <Shootout kicks={sh.kicks} mineName={mineN} theirName={theirN} />;
        })()}

        <MatchPitch live={live} board={shown.match} onStep={onStep} hoverOption={hot} colors={pitchColors} camera={cam} action={action} onActionDone={endAction} pace={1} possession={action ? null : poss} />

        {aiming && live.moment ? (
          <TimingMeter key={`${live.moment.minute}-${aiming.id}`} label={aiming.label} level={aiming.level ?? 60} onDone={b => execute(aiming, b)} />
        ) : live.moment && !action ? (
          <div className="pc-moment" role="dialog" aria-label="Moment clé">
            <div className="pc-moment__head"><b>Moment clé · {live.moment.minute}&apos;</b><span className="mg-small">À vous de choisir</span></div>
            <p style={{ margin: 0 }}>{live.moment.text}</p>
            <div className="pc-options">
              {live.moment.options.map(o => (
                <button key={o.id} type="button" className="pc-option" onClick={() => choose(o)} onPointerEnter={() => setHot(o.id)} onPointerLeave={() => setHot(null)} onFocus={() => setHot(o.id)} onBlur={() => setHot(null)}>
                  <span className="pc-chance">{Math.round(o.chance * 100)} %</span>
                  <b>{o.label}</b>
                  <span>{o.skill ?? attrLabel(o.attr, state.profile.position)} {o.level ?? state.profile.attrs[o.attr]}</span>
                  {o.ps ? <span className="pc-psbadge">PlayStyle +{Math.round(o.ps * 100)} %</span> : null}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mg-row">
            {!m.finished && (
              <button type="button" className="mg-btn mg-btn--gold" onClick={() => { if (!playing && (m.minute === 0 || m.minute === 45)) { whistle("short"); startCrowd(); } setPlaying(p => !p); }}>
                {playing ? "Pause" : started ? (m.minute === 45 ? "Seconde période" : "Reprendre") : "Coup d'envoi"}
              </button>
            )}
            {!m.finished && (
              <div className="mg-seg" role="group" aria-label="Vitesse">
                {SPEEDS.map((s, i) => <button key={s.label} type="button" aria-pressed={speed === i} onClick={() => setSpeed(i)}>{s.label}</button>)}
              </div>
            )}
            {!m.finished && <button type="button" className="mg-btn mg-btn--ghost" onClick={() => { setPlaying(false); endAction(); setLive(simulateRest(live)); }}>Simuler le reste</button>}
            <div className="mg-seg" role="group" aria-label="Déroulé">
              <button type="button" aria-pressed={mode === "direct"} onClick={() => setMode("direct")}>Direct</button>
              <button type="button" aria-pressed={mode === "highlights"} onClick={() => setMode("highlights")}>Temps forts</button>
              <button type="button" aria-pressed={mode === "goals"} onClick={() => setMode("goals")}>Buts</button>
            </div>
            <button type="button" className="mg-btn mg-btn--ghost" aria-pressed={control} title="Jauge de timing à chaque moment clé" onClick={() => { const on = !control; setControl(on); try { localStorage.setItem("fc-career:control", on ? "on" : "off"); } catch { /* stockage indisponible */ } }}>{control ? "🎯 Geste" : "🎯 Auto"}</button>
            <button type="button" className="mg-btn mg-btn--ghost" aria-pressed={sound} onClick={() => { const on = !sound; setSound(on); setSoundOn(on); if (on && playing) startCrowd(); }}>{sound ? "🔊 Son" : "🔇 Muet"}</button>
            <div className="mg-seg" role="group" aria-label="Caméra">
              <button type="button" aria-pressed={cam === "dynamic"} onClick={() => setCam("dynamic")}>Dynamique</button>
              <button type="button" aria-pressed={cam === "fixed"} onClick={() => setCam("fixed")}>Plan fixe</button>
            </div>
            {m.finished && <button type="button" className="mg-btn mg-btn--gold" onClick={validate}>Valider et continuer</button>}
          </div>
        )}

        {lastBig && !live.moment && (
          <p className="pc-commentator" aria-live="polite"><span aria-hidden>🎙</span> {commentLine(lastBig, cctx(running[m.events.lastIndexOf(lastBig)]))}</p>
        )}

        {m.finished && <MatchReportCard live={live} report={report} state={state} />}

        {lastDecision && !live.moment && (
          <p className={`pc-decision ${lastDecision.success ? "is-ok" : "is-ko"}`} style={{ margin: 0 }}>
            <b>{lastDecision.minute}&apos; · {lastDecision.success ? "Réussi" : "Raté"}</b> — {lastDecision.text}
          </p>
        )}

        <Section title="Direct">
          <div className="mg-feed">
            {m.events.map((e, i) => ({ e, i })).reverse().map(({ e, i }) => (
              <div key={`${e.minute}-${i}`} className={`mg-ev mg-ev--${e.type}${e.playerId === live.playerId ? " is-me" : ""}`}>
                <span className="mg-ev__min">{e.minute}&apos;</span><span aria-hidden>{ICON[e.type] ?? "·"}</span><span className="mg-ev__txt">{commentLine(e, cctx(running[i]))}</span>
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
        <Section title="Statistiques">
          {(() => {
            const me = m[m.managedSide], op = m[m.managedSide === "home" ? "away" : "home"];
            const tot = Math.max(1, me.possessionMinutes + op.possessionMinutes);
            const rows: [string, number, number, string][] = [
              ["Possession", Math.round((me.possessionMinutes / tot) * 100), 100 - Math.round((me.possessionMinutes / tot) * 100), " %"],
              ["Tirs", me.shots, op.shots, ""], ["Tirs cadrés", me.shotsOnTarget, op.shotsOnTarget, ""], ["xG", Math.round(me.xg * 100) / 100, Math.round(op.xg * 100) / 100, ""],
            ];
            return (
              <div className="pc-livestats">
                {rows.map(([l, a, b, u]) => (
                  <div key={l} className="pc-livestat">
                    <span className="pc-livestat__lbl">{l}</span>
                    <span>{a}{u}</span>
                    <span className="pc-livestat__bar"><i style={{ width: `${(a / Math.max(0.0001, a + b)) * 100}%` }} /></span>
                    <span>{b}{u}</span>
                  </div>
                ))}
              </div>
            );
          })()}
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
