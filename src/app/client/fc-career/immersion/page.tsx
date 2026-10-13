"use client";

/**
 * FC CAREER — Étape 17 : Motion Design & Immersion
 * Route: /client/fc-career/immersion
 */

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Zap,
  Eye,
  PartyPopper,
  HeartCrack,
  Armchair,
  TrendingDown,
  Plane,
} from "lucide-react";
import { Shell, PageTitle, StatCard } from "../lib/components";
import { Button } from "../lib/ui";
import { loadGame, saveGame } from "../utils/storage";
import type { FullSave } from "../utils/storage";
import type { ImmersionState, ImmersionEventType } from "../types/immersion";
import {
  createImmersionState,
  triggerEvent,
  markEventSeen,
  clearEffect,
  generateConfetti,
} from "../engine/immersion-engine";

type Tab = "events" | "effects";

const TABS: { id: Tab; label: string; icon: typeof Sparkles }[] = [
  { id: "events", label: "Moments clés", icon: Eye },
  { id: "effects", label: "Effets", icon: Sparkles },
];

const ease4 = [0.22, 1, 0.36, 1] as [number, number, number, number];

const EVENT_TRIGGERS: { type: ImmersionEventType; label: string; description: string; icon: typeof Sparkles }[] = [
  { type: "finale-victory", label: "Victoire en finale", description: "L'équipe remporte le trophée !", icon: PartyPopper },
  { type: "severe-injury", label: "Blessure grave", description: "Rupture des ligaments croisés...", icon: HeartCrack },
  { type: "benched", label: "Sur le banc", description: "Le coach ne te fait pas confiance.", icon: Armchair },
  { type: "relegation", label: "Relégation", description: "Le club descend en division inférieure.", icon: TrendingDown },
  { type: "big-transfer", label: "Transfert majeur", description: "Présentation officielle dans un grand club !", icon: Plane },
  { type: "first-goal", label: "Premier but", description: "Le premier d'une longue série !", icon: Zap },
];

const EFFECT_BG: Record<string, string> = {
  "red-flash": "radial-gradient(circle, rgba(239,68,68,0.3) 0%, transparent 70%)",
  "gold-confetti": "radial-gradient(circle, rgba(255,215,0,0.2) 0%, transparent 70%)",
  "grey-rain": "linear-gradient(to bottom, rgba(100,100,100,0.3) 0%, transparent 100%)",
  "camera-flash": "radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 60%)",
  "none": "none",
};

export default function ImmersionPage() {
  const [save, setSave] = useState<FullSave | null>(null);
  const [tab, setTab] = useState<Tab>("events");
  const [confetti, setConfetti] = useState<ReturnType<typeof generateConfetti>>([]);

  useEffect(() => { setSave(loadGame()); }, []);

  const immersion: ImmersionState = save?.meta?.immersionState ?? createImmersionState();
  const currentDay = save?.meta?.season?.currentDay ?? 1;

  const persist = useCallback((updated: ImmersionState) => {
    setSave(prev => {
      if (!prev) return prev;
      const next: FullSave = { ...prev, meta: { ...prev.meta, immersionState: updated } };
      saveGame(next);
      return next;
    });
  }, []);

  const handleTrigger = useCallback((type: ImmersionEventType, description: string) => {
    const updated = triggerEvent(immersion, type, description, currentDay);
    persist(updated);
    if (updated.confettiActive) {
      setConfetti(generateConfetti(40));
      setTimeout(() => setConfetti([]), 3000);
    }
  }, [immersion, currentDay, persist]);

  const handleMarkSeen = useCallback((eventId: string) => {
    persist(markEventSeen(immersion, eventId));
  }, [immersion, persist]);

  const handleClearEffect = useCallback(() => {
    persist(clearEffect(immersion));
    setConfetti([]);
  }, [immersion, persist]);

  if (!save) {
    return (
      <Shell>
        <PageTitle eyebrow="ÉTAPE 17" title="Immersion" subtitle="Chargement..." />
      </Shell>
    );
  }

  const unseenCount = immersion.events.filter(e => !e.seen).length;

  return (
    <Shell>
      {/* Screen effect overlay */}
      <AnimatePresence>
        {immersion.screenEffect !== "none" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              position: "fixed", inset: 0, zIndex: 50, pointerEvents: "none",
              background: EFFECT_BG[immersion.screenEffect],
            }}
          />
        )}
      </AnimatePresence>

      {/* Confetti */}
      <AnimatePresence>
        {confetti.length > 0 && (
          <div style={{ position: "fixed", inset: 0, zIndex: 51, pointerEvents: "none", overflow: "hidden" }}>
            {confetti.map(p => (
              <motion.div
                key={p.id}
                initial={{ x: `${p.x}vw`, y: "-10vh", rotate: 0, scale: p.scale }}
                animate={{ y: "110vh", rotate: p.rotation + 720 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2.5 + p.delay, ease: "easeIn", delay: p.delay }}
                style={{
                  position: "absolute",
                  width: 10, height: 10,
                  background: p.color,
                  borderRadius: Math.random() > 0.5 ? "50%" : "2px",
                }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      <PageTitle
        eyebrow="ÉTAPE 17"
        title="Immersion"
        subtitle="Le jeu respire. Chaque moment a une âme."
        action={
          immersion.screenEffect !== "none" ? (
            <Button variant="outline" onClick={handleClearEffect}>
              Effacer effet
            </Button>
          ) : undefined
        }
      />

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <StatCard icon={<Eye />} value={immersion.events.length} label="Moments" tone="blue" />
        <StatCard icon={<Sparkles />} value={unseenCount} label="Non vus" tone={unseenCount > 0 ? "red" : "green"} />
        <StatCard icon={<Zap />} value={immersion.screenEffect === "none" ? "—" : "Actif"} label="Effet" tone={immersion.screenEffect !== "none" ? "amber" : "blue"} />
      </div>

      {/* Notification toast */}
      <AnimatePresence>
        {immersion.lastNotification && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.3, ease: ease4 }}
            style={{
              padding: "0.75rem 1rem", background: "var(--primary)", color: "white",
              borderRadius: "0.5rem", marginBottom: "1.5rem", fontSize: "0.9rem", fontWeight: 500,
            }}
          >
            {immersion.lastNotification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {TABS.map(t => (
          <Button key={t.id} variant={tab === t.id ? "career" : "ghost"} onClick={() => setTab(t.id)}>
            <t.icon /> {t.label}
          </Button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25, ease: ease4 }}>

          {/* ---- EVENTS ---- */}
          {tab === "events" && (
            <div style={{ display: "grid", gap: "1rem" }}>
              {/* Trigger buttons */}
              <div className="card" style={{ padding: "1.25rem" }}>
                <strong style={{ marginBottom: "0.75rem", display: "block" }}>Simuler un moment</strong>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "0.5rem" }}>
                  {EVENT_TRIGGERS.map(t => (
                    <Button key={t.type} variant="outline" onClick={() => handleTrigger(t.type, t.description)} style={{ justifyContent: "flex-start" }}>
                      <t.icon /> {t.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Event history */}
              {immersion.events.length === 0 ? (
                <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
                  <Sparkles style={{ width: 48, height: 48, margin: "0 auto 1rem", opacity: 0.3 }} />
                  <p>Aucun moment enregistré. Simulez un événement.</p>
                </div>
              ) : (
                <div style={{ display: "grid", gap: "0.5rem" }}>
                  {[...immersion.events].reverse().map(event => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="card"
                      style={{ padding: "1rem", opacity: event.seen ? 0.6 : 1, cursor: !event.seen ? "pointer" : "default" }}
                      onClick={() => !event.seen && handleMarkSeen(event.id)}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <span style={{ fontSize: "1.5rem" }}>{event.emoji}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <strong>{event.title}</strong>
                            {!event.seen && (
                              <span style={{ background: "var(--destructive)", color: "white", fontSize: "0.7rem", padding: "0.15rem 0.5rem", borderRadius: "1rem" }}>Nouveau</span>
                            )}
                          </div>
                          <p style={{ fontSize: "0.85rem", opacity: 0.7, marginTop: "0.25rem" }}>{event.description}</p>
                          <span style={{ fontSize: "0.75rem", opacity: 0.4 }}>Jour {event.day}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ---- EFFECTS SHOWCASE ---- */}
          {tab === "effects" && (
            <div style={{ display: "grid", gap: "1rem" }}>
              <div className="card" style={{ padding: "1.25rem" }}>
                <strong style={{ marginBottom: "0.75rem", display: "block" }}>Effets visuels</strong>
                <p style={{ fontSize: "0.85rem", opacity: 0.7, marginBottom: "1rem" }}>
                  Chaque moment de la carrière déclenche un effet unique.
                </p>
                <div style={{ display: "grid", gap: "0.75rem" }}>
                  {([
                    { label: "🏆 Confettis dorés", desc: "Victoire en finale, premier but, record", effect: "gold-confetti" as const },
                    { label: "🔴 Flash rouge", desc: "Blessure grave, moment dramatique", effect: "red-flash" as const },
                    { label: "🌧️ Pluie grise", desc: "Relégation, défaite cuisante", effect: "grey-rain" as const },
                    { label: "📸 Flash photo", desc: "Transfert, présentation officielle", effect: "camera-flash" as const },
                  ]).map(fx => (
                    <div key={fx.effect} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", background: "var(--muted)", borderRadius: "0.5rem" }}>
                      <div>
                        <span style={{ fontWeight: 500 }}>{fx.label}</span>
                        <p style={{ fontSize: "0.8rem", opacity: 0.6 }}>{fx.desc}</p>
                      </div>
                      <div style={{
                        width: 40, height: 40, borderRadius: "0.5rem",
                        background: EFFECT_BG[fx.effect],
                        border: "1px solid var(--muted)",
                      }} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="card" style={{ padding: "1.25rem" }}>
                <strong style={{ marginBottom: "0.75rem", display: "block" }}>Micro-interactions</strong>
                <div style={{ display: "grid", gap: "0.5rem", fontSize: "0.875rem" }}>
                  <div style={{ padding: "0.5rem", background: "var(--muted)", borderRadius: "0.5rem" }}>
                    🖱️ Clic bouton — Ripple + scale 0.95→1.0 (100ms)
                  </div>
                  <div style={{ padding: "0.5rem", background: "var(--muted)", borderRadius: "0.5rem" }}>
                    📈 Stat monte — Nombre animé + flash vert (400ms)
                  </div>
                  <div style={{ padding: "0.5rem", background: "var(--muted)", borderRadius: "0.5rem" }}>
                    ⚡ Fatigue — Barre smooth + couleur gradient (600ms)
                  </div>
                  <div style={{ padding: "0.5rem", background: "var(--muted)", borderRadius: "0.5rem" }}>
                    🔔 Notification — Toast slide-in + shake (200ms)
                  </div>
                  <div style={{ padding: "0.5rem", background: "var(--muted)", borderRadius: "0.5rem" }}>
                    ⭐ Record — Éclat doré + confettis mini (500ms)
                  </div>
                  <div style={{ padding: "0.5rem", background: "var(--muted)", borderRadius: "0.5rem" }}>
                    📱 Message — Vibration + badge (150ms)
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </Shell>
  );
}
