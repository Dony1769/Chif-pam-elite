"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Dumbbell, Moon, Play, Sparkles } from "lucide-react";
import { Shell, PageTitle } from "../lib/components";
import { Button } from "../lib/ui";
import { loadGame, saveGame } from "../utils/storage";
import { toCareerState, toFullSave, type CareerRuntimeState } from "../types/career";
import { TRAINING_SESSIONS, runTrainingSession, applyRest } from "../engine/progression";
import type { TrainingType } from "../engine/progression";

/* --- B1: Persistance de la progression d'entrainement --- */
const TRAINING_PROGRESS_KEY = "fc-career:training-progress";

interface TrainingProgress {
  sessionId: TrainingType;
  startedAt: number;
  durationMs: number;
}

function saveTrainingProgress(tp: TrainingProgress) {
  try { localStorage.setItem(TRAINING_PROGRESS_KEY, JSON.stringify(tp)); } catch {}
}

function loadTrainingProgress(): TrainingProgress | null {
  try {
    const raw = localStorage.getItem(TRAINING_PROGRESS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function clearTrainingProgress() {
  try { localStorage.removeItem(TRAINING_PROGRESS_KEY); } catch {}
}

/* --- B2: Verrouillage de session (1 entrainement par jour) --- */
const TRAINING_LOCK_KEY = "fc-career:training-lock";

function getTrainingLockDate(): string | null {
  try { return localStorage.getItem(TRAINING_LOCK_KEY); } catch { return null; }
}

function lockTrainingForToday() {
  try { localStorage.setItem(TRAINING_LOCK_KEY, new Date().toDateString()); } catch {}
}

function isTrainingLocked(): boolean {
  return getTrainingLockDate() === new Date().toDateString();
}

export default function EntrainementPage() {
  const router = useRouter();
  const [career, setCareer] = useState<CareerRuntimeState | null>(null);
  const [session, setSession] = useState<TrainingType>("shooting");
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    const save = loadGame();
    if (!save?.player) { router.replace("/client/fc-career/create-player"); return; }
    setCareer(toCareerState(save));
    setLocked(isTrainingLocked());

    // B1: Resume training progress on reload
    const tp = loadTrainingProgress();
    if (tp) {
      const elapsed = Date.now() - tp.startedAt;
      if (elapsed < tp.durationMs) {
        setSession(tp.sessionId);
        setProgress((elapsed / tp.durationMs) * 100);
        setRunning(true);
      } else {
        // Session was completed while away — apply it now
        const sessionDef = TRAINING_SESSIONS.find(s => s.id === tp.sessionId);
        if (sessionDef && save.player) {
          const result = runTrainingSession(save.player, sessionDef);
          const updated = { meta: save.meta, player: result.player, wallet: save.wallet };
          setCareer(updated);
          saveGame(toFullSave(updated));
          setDone(true);
          lockTrainingForToday();
          setLocked(true);
        }
        clearTrainingProgress();
      }
    }
  }, [router]);

  const persist = useCallback((next: CareerRuntimeState) => {
    setCareer(next);
    saveGame(toFullSave(next));
  }, []);

  const DURATION_MS = 900;

  useEffect(() => {
    if (!running || !career) return;

    // B1: Load or create training progress
    let tp = loadTrainingProgress();
    if (!tp || tp.sessionId !== session) {
      tp = { sessionId: session, startedAt: Date.now(), durationMs: DURATION_MS };
      saveTrainingProgress(tp);
    }

    const timer = setInterval(() => {
      const elapsed = Date.now() - tp.startedAt;
      const p = Math.min(100, (elapsed / tp.durationMs) * 100);
      setProgress(p);
      // B1: Save progress at each tick
      saveTrainingProgress(tp);
      if (p >= 100) {
        clearInterval(timer);
        clearTrainingProgress();
        setRunning(false);
        setDone(true);
        // B2: Lock training for today
        lockTrainingForToday();
        setLocked(true);
        const c = career!;
        const sessionDef = TRAINING_SESSIONS.find(s => s.id === session)!;
        const result = runTrainingSession(c.player!, sessionDef);
        persist({ ...c, player: result.player });
      }
    }, 100);
    return () => clearInterval(timer);
  }, [running, session, career, persist]);

  if (!career?.player) {
    return <Shell><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 200px)', opacity: .6, gap: 8 }}><Sparkles className="animate-pulse" size={16} /><span style={{ fontSize: 12 }}>Chargement...</span></div></Shell>;
  }

  const player = career.player;
  const def = TRAINING_SESSIONS.find(s => s.id === session)!;
  const tooTired = player.fatigue >= 85;

  function startSession() {
    if (locked || running || tooTired) return;
    setDone(false);
    setProgress(0);
    setRunning(true);
  }

  return (
    <Shell>
      <PageTitle eyebrow="LE TRAVAIL PAIE" title="Terrain d'entrainement." subtitle={`Condition physique ${Math.max(0, 100 - player.fatigue)}% · Fatigue ${Math.round(player.fatigue)}`} />
      <div className="training-layout">
        <section>
          <h2>Choisissez votre session</h2>
          <div className="session-grid">
            {TRAINING_SESSIONS.filter(s => s.id !== "recovery" && s.id !== "match-prep").map((s, i) => (
              <Button key={s.id} variant="action" disabled={running || locked} className={`session-option ${s.id === session ? 'active' : ''}`} onClick={() => { setSession(s.id); setDone(false); }}>
                <span className={`session-number tone-${i}`}>0{i + 1}</span>
                <strong>{s.label}</strong>
                <span>+{s.fatigueCost} fatigue</span>
                {s.id === session ? <Check /> : <ArrowRight />}
              </Button>
            ))}
          </div>
        </section>
        <section className="session-panel">
          <div className="eyebrow">SESSION {def.label.toUpperCase()}</div>
          <div className={`training-ring ${running ? 'spinning' : ''}`}><Dumbbell /></div>
          <h2>{done ? 'Le travail porte ses fruits.' : running ? 'Gardez le rythme.' : locked ? 'Session terminee pour aujourd\'hui.' : 'Pret a progresser ?'}</h2>
          {running && <><strong className="session-percent">{Math.round(progress)}%</strong><progress max={100} value={progress} /></>}
          <div className="attribute-list">
            {def.targets.slice(0, 5).map(k => {
              const val = Math.round(player.attributes[k] ?? 0);
              return (
                <div key={k}>
                  <div><span>{k}</span><strong>{val}</strong></div>
                  <progress max={99} value={val} />
                </div>
              );
            })}
          </div>
          {tooTired && !locked && <p className="warning">Trop de fatigue. Prenez une journee de repos.</p>}
          {locked && !running && <p className="warning" style={{ color: 'var(--primary)' }}>Vous avez deja fait votre session aujourd&apos;hui. Revenez demain.</p>}
          <Button variant="career" className="full-width" disabled={running || tooTired || locked} onClick={startSession}>
            <Play />{running ? 'Session en cours...' : locked ? 'Session verrouilee' : 'Commencer la session'}<ArrowRight />
          </Button>
          <Button variant="ghost" disabled={running} onClick={() => { persist({ ...career, player: applyRest(player) }); setNotice("Repos complet - condition restauree."); setDone(false); }}>
            <Moon />Repos complet
          </Button>
        </section>
      </div>
      {notice && <div className="toast"><Check />{notice}<Button variant="ghost" size="icon" aria-label="Fermer" onClick={() => setNotice(null)}>×</Button></div>}
    </Shell>
  );
}
