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

const SESSION_LABELS: Record<TrainingType, string> = {
  shooting: "Finition",
  passing: "Passes",
  dribbling: "Dribble",
  physical: "Physique",
  tactical: "Tactique",
  recovery: "Recuperation",
  "match-prep": "Preparation",
};

export default function EntrainementPage() {
  const router = useRouter();
  const [career, setCareer] = useState<CareerRuntimeState | null>(null);
  const [session, setSession] = useState<TrainingType>("shooting");
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const save = loadGame();
    if (!save?.player) { router.replace("/client/fc-career/create-player"); return; }
    setCareer(toCareerState(save));
  }, [router]);

  const persist = useCallback((next: CareerRuntimeState) => {
    setCareer(next);
    saveGame(toFullSave(next));
  }, []);

  useEffect(() => {
    if (!running || !career) return;
    const start = Date.now();
    const timer = setInterval(() => {
      const p = Math.min(100, (Date.now() - start) / 900);
      setProgress(p);
      if (p >= 100) {
        clearInterval(timer);
        setRunning(false);
        setDone(true);
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

  return (
    <Shell>
      <PageTitle eyebrow="LE TRAVAIL PAIE" title="Terrain d'entrainement." subtitle={`Condition physique ${Math.max(0, 100 - player.fatigue)}% · Fatigue ${Math.round(player.fatigue)}`} />
      <div className="training-layout">
        <section>
          <h2>Choisissez votre session</h2>
          <div className="session-grid">
            {TRAINING_SESSIONS.filter(s => s.id !== "recovery" && s.id !== "match-prep").map((s, i) => (
              <Button key={s.id} variant="action" disabled={running} className={`session-option ${s.id === session ? 'active' : ''}`} onClick={() => { setSession(s.id); setDone(false); }}>
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
          <h2>{done ? 'Le travail porte ses fruits.' : running ? 'Gardez le rythme.' : 'Pret a progresser ?'}</h2>
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
          {tooTired && <p className="warning">Trop de fatigue. Prenez une journee de repos.</p>}
          <Button variant="career" className="full-width" disabled={running || tooTired} onClick={() => { setDone(false); setProgress(0); setRunning(true); }}>
            <Play />{running ? 'Session en cours...' : 'Commencer la session'}<ArrowRight />
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
