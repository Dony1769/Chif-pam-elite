"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Dumbbell, Moon, Play, Sparkles, Lock, Zap } from "lucide-react";
import { Shell, PageTitle } from "../lib/components";
import { Button } from "../lib/ui";
import { loadGame, saveGame } from "../utils/storage";
import { toCareerState, toFullSave, type CareerRuntimeState } from "../types/career";
import { NEW_SESSIONS, runTrainingSession, applyRest, canTrainSession } from "../engine/progression";
import type { TrainingType, WeeklyTrainingLog, CoachTier } from "../engine/progression";
import { getClub } from "../constants/clubs";
import { getAttributeDef } from "../constants/attributes";

/* --- Persistance de la progression d'entrainement --- */
const TRAINING_PROGRESS_KEY = "fc-career:training-progress";
const TRAINING_LOCK_KEY = "fc-career:training-lock";
const WEEKLY_LOG_KEY = "fc-career:weekly-training-log";

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

function getTrainingLockDate(): string | null {
  try { return localStorage.getItem(TRAINING_LOCK_KEY); } catch { return null; }
}

function lockTrainingForToday() {
  try { localStorage.setItem(TRAINING_LOCK_KEY, new Date().toDateString()); } catch {}
}

function isTrainingLocked(): boolean {
  return getTrainingLockDate() === new Date().toDateString();
}

function loadWeeklyLog(): WeeklyTrainingLog {
  try {
    const raw = localStorage.getItem(WEEKLY_LOG_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveWeeklyLog(log: WeeklyTrainingLog) {
  try { localStorage.setItem(WEEKLY_LOG_KEY, JSON.stringify(log)); } catch {}
}

/** Détermine le coach tier depuis le club du joueur. */
function getCoachTier(clubId: string): CoachTier {
  try {
    const club = getClub(clubId);
    if (!club) return "d4";
    const div = club.division ?? "";
    if (div.includes("D1") || div.includes("Ligue 1")) return "d1";
    if (div.includes("D2") || div.includes("Ligue 2")) return "d2";
    if (div.includes("D3") || div.includes("National")) return "d3";
    return "d4";
  } catch { return "d4"; }
}

const SESSION_ICONS: Record<string, string> = {
  balanced: "⚖️",
  speed: "🏃",
  technique: "🎯",
  defense: "🛡️",
  finishing: "⚽",
  mental: "🧠",
  "skill-moves": "✨",
  goalkeeper: "🧤",
  "active-rest": "🧘",
  "full-rest": "😴",
};

export default function EntrainementPage() {
  const router = useRouter();
  const [career, setCareer] = useState<CareerRuntimeState | null>(null);
  const [session, setSession] = useState<TrainingType>("balanced");
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [weeklyLog, setWeeklyLog] = useState<WeeklyTrainingLog>({});

  useEffect(() => {
    const save = loadGame();
    if (!save?.player) { router.replace("/client/fc-career/create-player"); return; }
    setCareer(toCareerState(save));
    setLocked(isTrainingLocked());
    setWeeklyLog(loadWeeklyLog());

    // Resume training progress on reload
    const tp = loadTrainingProgress();
    if (tp) {
      const elapsed = Date.now() - tp.startedAt;
      if (elapsed < tp.durationMs) {
        setSession(tp.sessionId);
        setProgress((elapsed / tp.durationMs) * 100);
        setRunning(true);
      } else {
        const sessionDef = NEW_SESSIONS.find(s => s.id === tp.sessionId) ?? NEW_SESSIONS[0];
        if (save.player) {
          const coachTier = getCoachTier(save.player.contract.clubId);
          const result = runTrainingSession(save.player, sessionDef, coachTier);
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

    let tp = loadTrainingProgress();
    if (!tp || tp.sessionId !== session) {
      tp = { sessionId: session, startedAt: Date.now(), durationMs: DURATION_MS };
      saveTrainingProgress(tp);
    }

    const timer = setInterval(() => {
      const elapsed = Date.now() - tp.startedAt;
      const p = Math.min(100, (elapsed / tp.durationMs) * 100);
      setProgress(p);
      saveTrainingProgress(tp);
      if (p >= 100) {
        clearInterval(timer);
        clearTrainingProgress();
        setRunning(false);
        setDone(true);
        lockTrainingForToday();
        setLocked(true);

        const c = career!;
        const sessionDef = NEW_SESSIONS.find(s => s.id === session) ?? NEW_SESSIONS[0];
        const coachTier = getCoachTier(c.player!.contract.clubId);
        const result = runTrainingSession(c.player!, sessionDef, coachTier);
        persist({ ...c, player: result.player });

        // Update weekly log
        const newLog = { ...weeklyLog, [session]: (weeklyLog[session] ?? 0) + 1 };
        setWeeklyLog(newLog);
        saveWeeklyLog(newLog);
      }
    }, 100);
    return () => clearInterval(timer);
  }, [running, session, career, persist, weeklyLog]);

  if (!career?.player) {
    return <Shell><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 200px)', opacity: .6, gap: 8 }}><Sparkles className="animate-pulse" size={16} /><span style={{ fontSize: 12 }}>Chargement...</span></div></Shell>;
  }

  const player = career.player;
  const def = NEW_SESSIONS.find(s => s.id === session) ?? NEW_SESSIONS[0];
  const tooTired = player.fatigue >= 85 && !def.isRest;
  const canTrain = canTrainSession(def, weeklyLog, player);
  const isGk = player.position === "GK";

  // Filtrer les sessions disponibles pour ce joueur
  const availableSessions = NEW_SESSIONS.filter(s => !s.gkOnly || isGk);

  function startSession() {
    if (locked || running || tooTired || !canTrain.allowed) return;
    setDone(false);
    setProgress(0);
    setRunning(true);
  }

  return (
    <Shell>
      <PageTitle
        eyebrow="LE TRAVAIL PAIE"
        title="Terrain d'entrainement."
        subtitle={`Condition ${Math.max(0, 100 - player.fatigue)}% · Fatigue ${Math.round(player.fatigue)} · Moral ${Math.round(player.morale)}`}
      />
      <div className="training-layout">
        <section>
          <h2>Choisissez votre session</h2>
          <div className="session-grid">
            {availableSessions.map((s, i) => {
              const sessionCanTrain = canTrainSession(s, weeklyLog, player);
              const isActive = s.id === session;
              const limitInfo = s.weeklyLimit > 0 ? `${weeklyLog[s.id] ?? 0}/${s.weeklyLimit}` : '';
              return (
                <Button key={s.id} variant="action" disabled={running || locked || !sessionCanTrain.allowed} className={`session-option ${isActive ? 'active' : ''}`} onClick={() => { setSession(s.id); setDone(false); }}>
                  <span className={`session-number tone-${i % 10}`}>{SESSION_ICONS[s.id] ?? '📋'}</span>
                  <strong>{s.label}</strong>
                  <span>
                    {s.isRest ? `${Math.abs(s.fatigueCost)} récup` : `+${s.fatigueCost} fatigue`}
                    {limitInfo && <> · {limitInfo}</>}
                  </span>
                  {!sessionCanTrain.allowed ? <Lock size={14} /> : isActive ? <Check /> : <ArrowRight />}
                </Button>
              );
            })}
          </div>
        </section>
        <section className="session-panel">
          <div className="eyebrow">SESSION {def.label.toUpperCase()}</div>
          <div className={`training-ring ${running ? 'spinning' : ''}`}><Dumbbell /></div>
          <h2>
            {done ? 'Le travail porte ses fruits.' :
             running ? 'Gardez le rythme.' :
             locked ? 'Session terminée pour aujourd\'hui.' :
             !canTrain.allowed ? canTrain.reason :
             'Prêt à progresser ?'}
          </h2>
          {running && (
            <>
              <strong className="session-percent">{Math.round(progress)}%</strong>
              <progress max={100} value={progress} />
            </>
          )}
          <div className="attribute-list">
            {def.targets.slice(0, 5).map(k => {
              const val = Math.round(player.attributes[k] ?? 0);
              const attrDef = getAttributeDef(k);
              return (
                <div key={k}>
                  <div><span>{attrDef?.label ?? k}</span><strong>{val}</strong></div>
                  <progress max={99} value={val} />
                </div>
              );
            })}
          </div>
          {tooTired && !locked && <p className="warning"><Zap size={14} /> Trop de fatigue. Prenez du repos.</p>}
          {locked && !running && <p className="warning" style={{ color: 'var(--primary)' }}>Vous avez déjà fait votre session aujourd&apos;hui. Revenez demain.</p>}
          <Button variant="career" className="full-width" disabled={running || tooTired || locked || !canTrain.allowed} onClick={startSession}>
            <Play />{running ? 'Session en cours...' : locked ? 'Session verrouillée' : def.isRest ? 'Commencer le repos' : 'Commencer la session'}<ArrowRight />
          </Button>
          <Button variant="ghost" disabled={running} onClick={() => { persist({ ...career, player: applyRest(player) }); setNotice("Repos complet — fatigue -40."); setDone(false); }}>
            <Moon />Repos complet (-40 fatigue)
          </Button>
        </section>
      </div>
      {notice && (
        <div className="toast">
          <Check />{notice}
          <Button variant="ghost" size="icon" aria-label="Fermer" onClick={() => setNotice(null)}>×</Button>
        </div>
      )}
    </Shell>
  );
}
