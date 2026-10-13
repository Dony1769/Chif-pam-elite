"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity, ArrowRight, CalendarDays, FastForward, Flag,
  Play, Sparkles, Trophy, Zap, Clock, Star, AlertTriangle,
} from "lucide-react";
import { Shell, Crest, PageTitle } from "../lib/components";
import { Button, Link } from "../lib/ui";
import { loadGame, saveGame } from "../utils/storage";
import { toCareerState, toFullSave, type CareerRuntimeState } from "../types/career";
import { getClub, getClubsByDivision } from "../constants/clubs";
import { nextUserFixture, advanceSeason } from "../engine/season-manager";
import {
  simulateMatch,
  generateLiveTimeline,
  generateChoiceMoments,
  resolveChoice,
  computeMatchRating,
  applyRitualPreMatch,
  createRitualState,
  type LiveMatchTick,
} from "../engine/match-engine";
import { createRng } from "../engine/player-generator";
import { endOfWeek } from "../engine/progression";
import { emptyWallet, computeMatchBonuses, processWeeklyPayroll } from "../engine/economic-engine";
import { DIVISION_INFO } from "../types/club";
import { formatDate, formatRating } from "../utils/formatters";
import type { SimulatedMatch, MatchChoiceMoment, MatchChoice, RitualId, CelebrationId } from "../types/match";
import { RITUALS, CELEBRATIONS } from "../types/match";
import type { Player, SeasonStatLine } from "../types/player";

/* --- Persistance --- */
const MATCH_STATE_KEY = "fc-career:match-state";
const RITUAL_STATE_KEY = "fc-career:ritual-state";

interface MatchInProgress {
  fixtureId: string;
  startedAt: number;
  result?: SimulatedMatch;
}

function saveMatchState(ms: MatchInProgress) {
  try { localStorage.setItem(MATCH_STATE_KEY, JSON.stringify(ms)); } catch {}
}
function loadMatchState(): MatchInProgress | null {
  try { const r = localStorage.getItem(MATCH_STATE_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}
function clearMatchState() {
  try { localStorage.removeItem(MATCH_STATE_KEY); } catch {}
}
const MATCH_LOCK_KEY = "fc-career:match-lock";
function isMatchLocked(): boolean {
  try { return localStorage.getItem(MATCH_LOCK_KEY) === new Date().toDateString(); } catch { return false; }
}
function lockMatchForToday() {
  try { localStorage.setItem(MATCH_LOCK_KEY, new Date().toDateString()); } catch {}
}

function loadRitualState() {
  try { const r = localStorage.getItem(RITUAL_STATE_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}
function saveRitualState(s: ReturnType<typeof createRitualState>) {
  try { localStorage.setItem(RITUAL_STATE_KEY, JSON.stringify(s)); } catch {}
}

function emptyStatLine(seasonYear: number, clubId: string, competitionId: string): SeasonStatLine {
  return { seasonYear, clubId, competitionId, matches: 0, starts: 0, minutes: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0, averageRating: 0, overallAtSeasonEnd: 0 };
}

type MatchMode = "menu" | "ritual" | "live" | "simulating" | "result";

export default function MatchPage() {
  const router = useRouter();
  const [career, setCareer] = useState<CareerRuntimeState | null>(null);
  const [lastMatch, setLastMatch] = useState<SimulatedMatch | null>(null);
  const [matchLocked, setMatchLocked] = useState(false);
  const [mode, setMode] = useState<MatchMode>("menu");

  // Ritual
  const [ritualState, setRitualState] = useState(createRitualState);
  const [chosenRituals, setChosenRituals] = useState<RitualId[]>([]);

  // Live match state
  const [ticks, setTicks] = useState<LiveMatchTick[]>([]);
  const [tickIndex, setTickIndex] = useState(0);
  const [liveResult, setLiveResult] = useState<SimulatedMatch | null>(null);
  const [pendingChoice, setPendingChoice] = useState<MatchChoiceMoment | null>(null);
  const [choiceBonus, setChoiceBonus] = useState(0);
  const [choicesMade, setChoicesMade] = useState<{ choiceId: string; success: boolean; minute: number }[]>([]);
  const [varPending, setVarPending] = useState(false);
  const [varResult, setVarResult] = useState<string | null>(null);
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [eventLog, setEventLog] = useState<string[]>([]);

  // Celebration
  const [showCelebration, setShowCelebration] = useState(false);
  const [chosenCelebration, setChosenCelebration] = useState<CelebrationId | null>(null);

  useEffect(() => {
    const save = loadGame();
    if (!save?.player) { router.replace("/client/fc-career/create-player"); return; }
    const state = toCareerState(save)!;
    setCareer(state);
    setMatchLocked(isMatchLocked());
    const rs = loadRitualState();
    if (rs) setRitualState(rs);

    const ms = loadMatchState();
    if (ms?.result) { setLastMatch(ms.result); setMode("result"); clearMatchState(); }
  }, [router]);

  const persist = useCallback((next: CareerRuntimeState) => {
    setCareer(next);
    saveGame(toFullSave(next));
  }, []);

  if (!career?.player) {
    return <Shell><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 200px)', opacity: .6, gap: 8 }}><Sparkles className="animate-pulse" size={16} /><span style={{ fontSize: 12 }}>Chargement...</span></div></Shell>;
  }

  const player = career.player;
  const club = getClub(player.contract.clubId)!;
  const season = career.meta.season;
  const divisionName = DIVISION_INFO[club.division]?.name ?? club.division;
  const fixture = season ? nextUserFixture(season, club.id) : undefined;
  const currentTick: LiveMatchTick | undefined = ticks[tickIndex];

  /* ================================================================ */
  /* Apply match result to career state                                */
  /* ================================================================ */

  function applyMatchResult(sim: SimulatedMatch) {
    if (!career || !player || !club || !season || !fixture) return;

    const line = { ...(player.seasonStats[0] ?? emptyStatLine(season.seasonYear, club.id, fixture.competitionId)) };
    line.matches += 1;
    if (sim.userPlayed) line.starts += 1;
    line.minutes += sim.userMinutes;
    line.goals += sim.userRating.goals;
    line.assists += sim.userRating.assists;
    line.averageRating = (line.averageRating * (line.matches - 1) + sim.userRating.rating) / line.matches;

    const lastThree = [...player.lastThreeMatchRatings, sim.userRating.rating].slice(-3);

    const updatedPlayer: Player = {
      ...player,
      seasonStats: [line, ...player.seasonStats.slice(1)],
      fatigue: Math.min(100, player.fatigue + 22),
      form: Math.max(0, Math.min(100, player.form + (sim.userRating.rating >= 7 ? 4 : sim.userRating.rating <= 5 ? -3 : 0))),
      lastThreeMatchRatings: lastThree,
    };
    const advanced = advanceSeason(season, [{ dayId: fixture.id, homeScore: sim.homeScore, awayScore: sim.awayScore }]);
    const wallet = career.wallet ?? emptyWallet();
    const bonuses = computeMatchBonuses(updatedPlayer, sim);
    const payroll = processWeeklyPayroll(wallet, updatedPlayer, advanced.currentDay, bonuses, [], updatedPlayer.seasonStats[0]?.minutes ?? 0, 200);

    persist({
      ...career,
      player: endOfWeek(updatedPlayer),
      wallet: payroll.wallet,
      meta: { ...career.meta, season: advanced },
      lastMatch: sim,
    });

    clearMatchState();
    lockMatchForToday();
    setMatchLocked(true);
    setLastMatch(sim);
    setMode("result");
  }

  /* ================================================================ */
  /* SIMULER — résultat instantané                                     */
  /* ================================================================ */

  function handleSimulate() {
    if (!career || !player || !club || !season || !fixture || matchLocked) return;
    setMode("simulating");

    saveMatchState({ fixtureId: fixture.id, startedAt: Date.now() });

    const home = getClub(fixture.homeClubId)!;
    const away = getClub(fixture.awayClubId)!;
    const sim = simulateMatch(home, away, player);

    saveMatchState({ fixtureId: fixture.id, startedAt: Date.now(), result: sim });

    setTimeout(() => applyMatchResult(sim), 800);
  }

  /* ================================================================ */
  /* JOUER — match en live (1-1.5 min)                                 */
  /* ================================================================ */

  function startLiveMatch() {
    if (!career || !player || !club || !season || !fixture || matchLocked) return;

    // Apply ritual bonuses
    const ritualResult = applyRitualPreMatch(ritualState, chosenRituals);
    setRitualState(ritualResult.state);
    saveRitualState(ritualResult.state);

    const seed = Date.now();
    const rng = createRng(seed);
    const choiceMoments = generateChoiceMoments(rng);

    const home = getClub(fixture.homeClubId)!;
    const away = getClub(fixture.awayClubId)!;
    const { ticks: timeline, baseResult } = generateLiveTimeline(home, away, player, choiceMoments, seed);

    setTicks(timeline);
    setTickIndex(0);
    setLiveResult(baseResult);
    setChoiceBonus(ritualResult.ratingBonus);
    setChoicesMade([]);
    setEventLog([]);
    setMode("live");

    saveMatchState({ fixtureId: fixture.id, startedAt: Date.now() });

    // Start ticking — ~1 second per game minute ≈ 90s total
    startTicking();
  }

  function startTicking() {
    if (tickTimer.current) clearInterval(tickTimer.current);
    tickTimer.current = setInterval(() => {
      setTickIndex((prev) => {
        const next = prev + 1;
        return next;
      });
    }, 1000); // 1 tick per second
  }

  // Handle tick progression
  useEffect(() => {
    if (mode !== "live" || !ticks.length) return;

    const tick = ticks[tickIndex];
    if (!tick) {
      // Match finished
      if (tickTimer.current) clearInterval(tickTimer.current);
      finalizeLiveMatch();
      return;
    }

    // Log event
    if (tick.event) {
      const ev = tick.event;
      let msg = "";
      if (ev.type === "whistle") {
        const labels: Record<string, string> = { kickoff: "⚽ Coup d'envoi !", halftime: "Mi-temps", secondhalf: "Début de 2nde mi-temps", fulltime: "🏁 Coup de sifflet final !" };
        msg = labels[ev.half] ?? "";
      } else if (ev.type === "goal") {
        msg = `⚽ ${ev.minute}' — BUT ! ${ev.scorer} (${getClub(ev.clubId)?.shortName})`;
      } else if (ev.type === "card") {
        msg = `${ev.color === "red" ? "🟥" : "🟨"} ${ev.minute}' — Carton pour ${ev.player}`;
      } else if (ev.type === "var") {
        msg = `📺 ${ev.minute}' — VAR : ${ev.outcome}`;
      } else if (ev.type === "chance") {
        msg = `${ev.minute}' — ${ev.description}`;
      }
      if (msg) setEventLog((prev) => [...prev.slice(-8), msg]);

      // Show celebration if user scored
      if (ev.type === "goal" && ev.scorer === `${player.firstName} ${player.lastName}`) {
        if (tickTimer.current) clearInterval(tickTimer.current);
        setShowCelebration(true);
        return; // pause until celebration chosen
      }
    }

    // VAR moment
    if (tick.varMoment) {
      setVarPending(true);
      if (tickTimer.current) clearInterval(tickTimer.current);
      setTimeout(() => {
        setVarPending(false);
        const varEv = tick.event;
        if (varEv && varEv.type === "var") {
          setVarResult(varEv.outcome);
          setTimeout(() => { setVarResult(null); startTicking(); }, 2000);
        } else {
          startTicking();
        }
      }, 3000);
      return;
    }

    // Choice moment
    if (tick.choiceMoment && !pendingChoice) {
      if (tickTimer.current) clearInterval(tickTimer.current);
      setPendingChoice(tick.choiceMoment);
      return; // pause until user chooses
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickIndex, mode]);

  // Cleanup
  useEffect(() => {
    return () => { if (tickTimer.current) clearInterval(tickTimer.current); };
  }, []);

  function handleChoice(choice: MatchChoice) {
    if (!player) return;
    const rng = createRng(Date.now());
    const result = resolveChoice(choice, player, rng);

    const bonus = result.success ? choice.successRatingBonus : choice.failureRatingMalus;
    setChoiceBonus((prev) => prev + bonus);
    setChoicesMade((prev) => [...prev, { choiceId: choice.id, success: result.success, minute: pendingChoice?.minute ?? 0 }]);

    const outcomeMsg = result.success ? `✅ ${choice.successOutcome}` : `❌ ${choice.failureOutcome}`;
    setEventLog((prev) => [...prev.slice(-8), `${pendingChoice?.minute ?? 0}' — ${outcomeMsg}`]);

    if (result.goalScored) {
      setEventLog((prev) => [...prev.slice(-8), `⚽ ${pendingChoice?.minute ?? 0}' — BUT ! ${player.firstName} ${player.lastName} !`]);
      // Trigger celebration
      setPendingChoice(null);
      setShowCelebration(true);
      return;
    }

    if (result.cardGiven) {
      setEventLog((prev) => [...prev.slice(-8), `🟨 ${pendingChoice?.minute ?? 0}' — Carton jaune !`]);
    }

    setPendingChoice(null);
    startTicking();
  }

  function handleCelebration(celeb: CelebrationId) {
    setChosenCelebration(celeb);
    setShowCelebration(false);
    const def = CELEBRATIONS.find((c) => c.id === celeb);
    if (def) {
      setEventLog((prev) => [...prev.slice(-8), `${def.emoji} Célébration : ${def.label}`]);
    }
    // Resume
    startTicking();
  }

  function finalizeLiveMatch() {
    if (!liveResult || !fixture) return;

    // Recalculate rating with choices bonus
    const finalRating = Math.max(3.0, Math.min(10.0,
      Math.round((liveResult.userRating.rating + choiceBonus + 0.5) * 10) / 10, // +0.5 participation bonus for playing live
    ));

    const finalSim: SimulatedMatch = {
      ...liveResult,
      userRating: { ...liveResult.userRating, rating: liveResult.userPlayed ? finalRating : 0 },
      manOfTheMatch: finalRating >= 7.5 ? `${player.firstName} ${player.lastName}` : liveResult.manOfTheMatch,
      choicesMade: choicesMade as SimulatedMatch["choicesMade"],
      celebration: chosenCelebration ?? undefined,
    };

    saveMatchState({ fixtureId: fixture.id, startedAt: Date.now(), result: finalSim });
    applyMatchResult(finalSim);
  }

  /* ================================================================ */
  /* RENDER                                                            */
  /* ================================================================ */

  return (
    <Shell>
      <PageTitle
        eyebrow="CENTRE DE MATCH"
        title={mode === "result" ? "Le coup de sifflet final." : mode === "live" ? "En direct." : "Le rendez-vous du terrain."}
        subtitle={fixture ? `${divisionName} · Journée ${fixture.dayNumber}` : "Tous les matchs ont été disputés."}
      />

      {/* ---- MENU: Choisir Jouer ou Simuler ---- */}
      {mode === "menu" && fixture && (
        <section className="match-arena">
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 32, textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24, fontSize: 11, color: 'var(--muted-foreground)' }}>
              <Trophy size={14} />{divisionName}<span>J{fixture.dayNumber}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
              <div style={{ textAlign: 'center' }}>
                <Crest name={getClub(fixture.homeClubId)?.shortName ?? ''} clubId={fixture.homeClubId} />
                <strong style={{ display: 'block', marginTop: 8, fontSize: 14 }}>{getClub(fixture.homeClubId)?.shortName ?? '?'}</strong>
                <span style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>{fixture.homeClubId === club.id ? 'DOMICILE' : ''}</span>
              </div>
              <span style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Barlow', sans-serif", color: 'var(--muted-foreground)' }}>VS</span>
              <div style={{ textAlign: 'center' }}>
                <Crest name={getClub(fixture.awayClubId)?.shortName ?? ''} clubId={fixture.awayClubId} />
                <strong style={{ display: 'block', marginTop: 8, fontSize: 14 }}>{getClub(fixture.awayClubId)?.shortName ?? '?'}</strong>
                <span style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>{fixture.awayClubId === club.id ? 'EXTÉRIEUR' : ''}</span>
              </div>
            </div>
            <div style={{ marginTop: 20, fontSize: 11, color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <CalendarDays size={12} />{formatDate(fixture.date)}
            </div>

            {matchLocked ? (
              <p style={{ marginTop: 16, fontSize: 11, color: 'var(--primary)', fontWeight: 600 }}>
                Vous avez déjà joué un match aujourd&apos;hui. Revenez demain.
              </p>
            ) : (
              <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button variant="career" onClick={() => setMode("ritual")} disabled={matchLocked}>
                  <Play size={16} />Jouer le match<span style={{ fontSize: 10, opacity: .7 }}>~1min30</span>
                </Button>
                <Button variant="outline" onClick={handleSimulate} disabled={matchLocked}>
                  <FastForward size={16} />Simuler<span style={{ fontSize: 10, opacity: .7 }}>instantané</span>
                </Button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ---- SIMULER loading ---- */}
      {mode === "simulating" && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <FastForward size={32} className="animate-pulse" style={{ opacity: .5 }} />
          <p style={{ marginTop: 12, fontSize: 13, color: 'var(--muted-foreground)' }}>Simulation en cours...</p>
        </div>
      )}

      {/* ---- RITUEL PRÉ-MATCH ---- */}
      {mode === "ritual" && (
        <section style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Barlow', sans-serif", marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Star size={16} />Rituels d&apos;avant-match
          </h2>
          <p style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 16 }}>
            Choisis 1 à 2 rituels. Maintiens-les 10 matchs de suite pour un bonus permanent.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {RITUALS.map((r) => {
              const selected = chosenRituals.includes(r.id);
              const streak = ritualState.streaks[r.id] ?? 0;
              const permanent = ritualState.permanentBonuses.includes(r.id);
              return (
                <button
                  key={r.id}
                  onClick={() => {
                    if (selected) setChosenRituals((p) => p.filter((x) => x !== r.id));
                    else if (chosenRituals.length < 2) setChosenRituals((p) => [...p, r.id]);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                    background: selected ? 'var(--primary)' : 'var(--background)',
                    color: selected ? '#fff' : 'inherit',
                    border: `1px solid ${selected ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 8, cursor: 'pointer', fontSize: 13, textAlign: 'left',
                    transition: 'all .15s ease',
                  }}
                >
                  <span style={{ fontSize: 20 }}>{r.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <strong>{r.label}</strong>
                    <div style={{ fontSize: 10, opacity: .7 }}>
                      {r.bonus.attr !== "superstition" ? `+${r.bonus.value} ${r.bonus.attr}` : "Superstition active"}
                      {permanent && " ✨ Permanent !"}
                      {streak > 0 && !permanent && ` · Série: ${streak}/10`}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <Button variant="career" className="full-width" style={{ marginTop: 20 }} onClick={startLiveMatch}>
            <Play size={16} />Entrer sur le terrain<ArrowRight size={14} />
          </Button>
        </section>
      )}

      {/* ---- MATCH EN DIRECT ---- */}
      {mode === "live" && currentTick && (
        <section style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, position: 'relative' }}>
          {/* Scoreboard */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 24, marginBottom: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <Crest name={getClub(fixture!.homeClubId)?.shortName ?? ''} clubId={fixture!.homeClubId} small />
              <div style={{ fontSize: 11, fontWeight: 600, marginTop: 4 }}>{getClub(fixture!.homeClubId)?.shortName}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 800, fontFamily: "'Barlow', sans-serif", letterSpacing: 2 }}>
                {currentTick.homeScore} — {currentTick.awayScore}
              </div>
              <div style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <Clock size={12} />{currentTick.minute}&apos;
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Crest name={getClub(fixture!.awayClubId)?.shortName ?? ''} clubId={fixture!.awayClubId} small />
              <div style={{ fontSize: 11, fontWeight: 600, marginTop: 4 }}>{getClub(fixture!.awayClubId)?.shortName}</div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, marginBottom: 16 }}>
            <div style={{ height: '100%', background: 'var(--primary)', borderRadius: 2, width: `${Math.min(100, (currentTick.minute / 95) * 100)}%`, transition: 'width .3s ease' }} />
          </div>

          {/* VAR overlay */}
          {varPending && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,.85)', borderRadius: 12,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              zIndex: 10, color: '#fff',
            }}>
              <AlertTriangle size={32} className="animate-pulse" style={{ color: '#fbbf24' }} />
              <p style={{ fontSize: 18, fontWeight: 700, marginTop: 12 }}>VAR EN COURS...</p>
              <p style={{ fontSize: 12, opacity: .7, marginTop: 4 }}>L&apos;arbitre consulte la vidéo</p>
            </div>
          )}

          {/* VAR result flash */}
          {varResult && (
            <div style={{
              textAlign: 'center', padding: '8px 16px', marginBottom: 12,
              background: 'var(--primary)', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600,
            }}>
              📺 {varResult}
            </div>
          )}

          {/* Event log */}
          <div style={{ maxHeight: 200, overflow: 'auto', marginBottom: 16 }}>
            {eventLog.map((msg, i) => (
              <div key={i} style={{
                fontSize: 12, padding: '4px 0',
                borderBottom: '1px solid var(--border)',
                color: msg.includes("BUT") ? 'var(--success, #4ade80)' : msg.includes("Carton") ? '#f87171' : 'var(--foreground)',
                fontWeight: msg.includes("BUT") || msg.includes("sifflet") ? 600 : 400,
              }}>
                {msg}
              </div>
            ))}
            {eventLog.length === 0 && (
              <div style={{ fontSize: 12, opacity: .5, textAlign: 'center', padding: 20 }}>
                Le match commence...
              </div>
            )}
          </div>

          {/* Choice moment */}
          {pendingChoice && !showCelebration && (
            <div style={{
              background: 'var(--background)', border: '2px solid var(--primary)', borderRadius: 10,
              padding: 16, marginBottom: 12,
            }}>
              <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Zap size={14} style={{ color: 'var(--primary)' }} />{pendingChoice.prompt}
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                {pendingChoice.options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleChoice(opt)}
                    style={{
                      flex: 1, padding: '10px 8px', borderRadius: 8,
                      background: 'var(--card)', border: '1px solid var(--border)',
                      cursor: 'pointer', fontSize: 12, textAlign: 'center',
                      transition: 'all .15s ease',
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{opt.emoji}</span>
                    <div style={{ fontWeight: 600, marginTop: 4 }}>{opt.label}</div>
                    <div style={{ fontSize: 10, opacity: .6, marginTop: 2 }}>{opt.baseSuccessPct}% base</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Celebration picker */}
          {showCelebration && (
            <div style={{
              background: 'var(--background)', border: '2px solid var(--success, #4ade80)', borderRadius: 10,
              padding: 16, marginBottom: 12,
            }}>
              <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--success, #4ade80)', textAlign: 'center' }}>
                ⚽ BUUUUT ! Choisis ta célébration !
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {CELEBRATIONS.filter((c) => !c.unlockCondition).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleCelebration(c.id)}
                    style={{
                      padding: '8px 12px', borderRadius: 8,
                      background: 'var(--card)', border: '1px solid var(--border)',
                      cursor: 'pointer', fontSize: 11, textAlign: 'center',
                      minWidth: 80,
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{c.emoji}</span>
                    <div style={{ marginTop: 2, fontWeight: 600 }}>{c.label}</div>
                    {c.cardRisk > 0 && <div style={{ fontSize: 9, color: '#f87171' }}>⚠ Risque carton</div>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ---- No fixture ---- */}
      {mode === "menu" && !fixture && (
        <div style={{ textAlign: 'center', padding: 40, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <Trophy size={32} style={{ opacity: .4 }} />
          <h2 style={{ marginTop: 16 }}>Saison terminée</h2>
          <p style={{ color: 'var(--muted-foreground)', fontSize: 12 }}>Tous les matchs de cette saison ont été disputés.</p>
        </div>
      )}

      {/* ---- RÉSULTAT ---- */}
      {mode === "result" && lastMatch && (
        <section style={{ marginTop: 0, padding: 24, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 800, fontFamily: "'Barlow', sans-serif" }}>
            {getClub(lastMatch.homeClubId)?.shortName} {lastMatch.homeScore} — {lastMatch.awayScore} {getClub(lastMatch.awayClubId)?.shortName}
          </h2>

          {lastMatch.userPlayed ? (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 20px',
                background: lastMatch.userRating.rating >= 7 ? 'rgba(74,222,128,.12)' : lastMatch.userRating.rating < 5 ? 'rgba(248,113,113,.12)' : 'rgba(255,255,255,.06)',
                borderRadius: 20, fontSize: 14, fontWeight: 700,
                color: lastMatch.userRating.rating >= 7 ? 'var(--success, #4ade80)' : lastMatch.userRating.rating < 5 ? 'var(--danger, #f87171)' : 'inherit',
              }}>
                <Activity size={16} />Note : {formatRating(lastMatch.userRating.rating)}
                {lastMatch.manOfTheMatch === `${player.firstName} ${player.lastName}` && (
                  <span style={{ fontSize: 10, background: '#fbbf24', color: '#000', padding: '2px 6px', borderRadius: 8, fontWeight: 700 }}>⭐ HOMME DU MATCH</span>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 16, fontSize: 12, color: 'var(--muted-foreground)' }}>
                <span>⚽ {lastMatch.userRating.goals} but(s)</span>
                <span>🅰️ {lastMatch.userRating.assists} passe(s) D.</span>
                <span>🎯 {lastMatch.userRating.shotsOnTarget} tir(s) cadré(s)</span>
                <span>⏱️ {lastMatch.userMinutes} min</span>
              </div>

              {lastMatch.choicesMade && lastMatch.choicesMade.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <p style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 8 }}>Moments de choix</p>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {lastMatch.choicesMade.map((c, i) => (
                      <span key={i} style={{
                        fontSize: 10, padding: '3px 8px', borderRadius: 12,
                        background: c.success ? 'rgba(74,222,128,.15)' : 'rgba(248,113,113,.15)',
                        color: c.success ? 'var(--success, #4ade80)' : 'var(--danger, #f87171)',
                        fontWeight: 600,
                      }}>
                        {c.minute}&apos; {c.success ? "✅" : "❌"}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p style={{ textAlign: 'center', fontSize: 12, marginTop: 12, color: 'var(--muted-foreground)' }}>
              Tu n&apos;as pas joué ce match.
            </p>
          )}

          {/* Match events */}
          {lastMatch.events.length > 0 && (
            <div style={{ marginTop: 20, maxHeight: 160, overflow: 'auto' }}>
              {lastMatch.events.filter((e) => e.type === "goal" || e.type === "card" || e.type === "var").map((ev, i) => (
                <div key={i} style={{ fontSize: 11, padding: '3px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 28, textAlign: 'right', fontWeight: 600, color: 'var(--muted-foreground)' }}>{ev.minute}&apos;</span>
                  {ev.type === "goal" && <span>⚽ {ev.scorer} ({getClub(ev.clubId)?.shortName})</span>}
                  {ev.type === "card" && <span>{ev.color === "red" ? "🟥" : "🟨"} {ev.player}</span>}
                  {ev.type === "var" && <span>📺 {ev.outcome}</span>}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
            <Button asChild variant="outline">
              <Link to="/dashboard">Retour au tableau de bord<ArrowRight size={14} /></Link>
            </Button>
          </div>
        </section>
      )}
    </Shell>
  );
}
