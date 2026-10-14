"use client";

/**
 * FC CAREER — Page de démonstration du Design System
 * Accessible sur /client/fc-career/design-demo (contourne FcCareerGuard)
 * À supprimer avant la production.
 */

import { useState } from "react";
import "../../fc-career/game/design/game.css";
import { Button }       from "../../fc-career/game/components/Button";
import { StatBar }      from "../../fc-career/game/components/StatBar";
import { PlayerCard }   from "../../fc-career/game/components/PlayerCard";
import { Modal }        from "../../fc-career/game/components/Modal";
import { EmptyState }   from "../../fc-career/game/components/EmptyState";
import { Skeleton, Spinner } from "../../fc-career/game/components/LoadingState";
import { ToastProvider, useToast } from "../../fc-career/game/components/Toast";
import type { Player }  from "../../fc-career/game/domain/player";

/* ── Fixture joueur ─────────────────────────────────────────────── */
const demoPlayer: Player = {
  id: "demo-001",
  firstName: "Luca",
  lastName: "Ferreira",
  nationality: "BR",
  birthAge: 16,
  age: 17,
  foot: "right",
  position: "ST",
  heightCm: 178,
  weightKg: 73,
  overall: 64,
  potential: 89,
  condition: { form: 72, fatigue: 25, morale: 80, injury: null },
  contract: { clubId: "albion-city", salary: 600, bonusGoal: 100, bonusAssist: 50, startSeason: 1, endSeason: 3, role: "squad" },
  playStyles: [],
  traits: [],
  paPoints: 7,
  progressionHistory: [],
  reputation: 12,
  popularity: 8,
  attributes: {
    ballControl: 64, dribbling: 62, crossing: 42, finishing: 65, freeKick: 45,
    longPassing: 50, shortPassing: 58, longShot: 55, curve: 52, volleys: 58,
    acceleration: 74, sprintSpeed: 72, agility: 70, balance: 66, jumping: 62,
    stamina: 68, strength: 60, reactions: 64,
    aggression: 57, composure: 60, interceptions: 42, positioning: 63,
    vision: 54, penalties: 57, marking: 40,
    standingTackle: 36, slidingTackle: 33, headingAccuracy: 60,
    defAwareness: 42, defWork: 47, defLine: 40,
    attPositioning: 65, attWork: 70, shotPower: 63, weakFoot: 57,
    skillMoves: 52, offside: 57,
    gkDiving: 10, gkHandling: 10, gkKicking: 25, gkPositioning: 10,
    gkReflexes: 10, gkSpeed: 35, gkDistribution: 20, gkSweeper: 10,
    gkComesOff: 10, gkCross: 10, gkOneonOne: 10, gkPenalty: 10,
    gkDirectFreeKick: 10, gkPlaymake: 10,
  },
  stats: {
    totalAppearances: 3, totalGoals: 2, totalAssists: 1,
    totalYellowCards: 0, totalRedCards: 0, totalMinutes: 270,
    peakOverall: 64, seasons: [],
  },
};

/* ── Composant principal ─────────────────────────────────────────── */
export default function DesignDemo() {
  return (
    <ToastProvider>
      <DemoInner />
    </ToastProvider>
  );
}

function DemoInner() {
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading]     = useState(false);

  function simulateLoad() {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  }

  return (
    <div style={{ background: "var(--fc-surface-0)", minHeight: "100dvh", padding: "16px", color: "var(--fc-text)" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="fc-page-header">
          <h1 className="fc-page-title">Design Demo</h1>
          <p className="fc-page-meta">FC Career · Système de design</p>
        </div>

        {/* ── Carte joueur ────────────────────────────────────────── */}
        <section className="fc-section">
          <h2 className="fc-label" style={{ marginBottom: 8 }}>Carte joueur</h2>
          <PlayerCard player={demoPlayer} />
          <div style={{ marginTop: 12 }}>
            <PlayerCard player={demoPlayer} showStats />
          </div>
        </section>

        <div className="fc-divider" />

        {/* ── Stat bars ───────────────────────────────────────────── */}
        <section className="fc-section">
          <h2 className="fc-label" style={{ marginBottom: 12 }}>Attributs</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <StatBar label="Finition"     value={65} />
            <StatBar label="Vitesse"      value={72} />
            <StatBar label="Dribble"      value={62} />
            <StatBar label="Passes C."    value={58} />
            <StatBar label="Endurance"    value={68} />
            <StatBar label="Marquage"     value={30} />
          </div>
        </section>

        <div className="fc-divider" />

        {/* ── Boutons ─────────────────────────────────────────────── */}
        <section className="fc-section">
          <h2 className="fc-label" style={{ marginBottom: 12 }}>Boutons</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
            <Button variant="primary">Jouer le match</Button>
            <Button variant="secondary">Entraîner</Button>
            <Button variant="ghost">Voir détails</Button>
            <Button variant="danger">Quitter</Button>
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <Button variant="primary" size="sm">Petit</Button>
            <Button variant="primary">Normal</Button>
            <Button variant="primary" size="lg">Grand</Button>
          </div>
          <Button variant="primary" loading={loading} fullWidth onClick={simulateLoad}>
            {loading ? "Chargement…" : "Simuler chargement"}
          </Button>
        </section>

        <div className="fc-divider" />

        {/* ── Badges ─────────────────────────────────────────────── */}
        <section className="fc-section">
          <h2 className="fc-label" style={{ marginBottom: 12 }}>Badges</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="fc-badge fc-badge--pos">ST</span>
            <span className="fc-badge fc-badge--neutral">BR</span>
            <span className="fc-badge fc-badge--warning">Blessé</span>
            <span className="fc-badge fc-badge--danger">Suspendu</span>
          </div>
        </section>

        <div className="fc-divider" />

        {/* ── Score ──────────────────────────────────────────────── */}
        <section className="fc-section">
          <h2 className="fc-label" style={{ marginBottom: 12 }}>Score</h2>
          <div className="fc-panel">
            <p style={{ fontSize: "var(--fc-text-sm)", color: "var(--fc-text-3)", marginBottom: 8 }}>Albion City vs Riverside FC</p>
            <div className="fc-score">
              <span className="fc-score__num">2</span>
              <span className="fc-score__sep">–</span>
              <span className="fc-score__num">1</span>
            </div>
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <span className="fc-rating fc-rating--high">8.5</span>
              <span className="fc-rating">Note match</span>
            </div>
          </div>
        </section>

        <div className="fc-divider" />

        {/* ── Toasts ─────────────────────────────────────────────── */}
        <section className="fc-section">
          <h2 className="fc-label" style={{ marginBottom: 12 }}>Toasts</h2>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button variant="secondary" size="sm" onClick={() => toast("But marqué ! +3 PA gagnés", "success")}>
              Succès
            </Button>
            <Button variant="secondary" size="sm" onClick={() => toast("Objectif en danger", "warning")}>
              Avertissement
            </Button>
            <Button variant="secondary" size="sm" onClick={() => toast("Sauvegarde échouée", "error")}>
              Erreur
            </Button>
          </div>
        </section>

        <div className="fc-divider" />

        {/* ── Modale ─────────────────────────────────────────────── */}
        <section className="fc-section">
          <h2 className="fc-label" style={{ marginBottom: 12 }}>Modale</h2>
          <Button variant="secondary" onClick={() => setModalOpen(true)}>Ouvrir la modale</Button>
        </section>

        <div className="fc-divider" />

        {/* ── Skeleton ───────────────────────────────────────────── */}
        <section className="fc-section">
          <h2 className="fc-label" style={{ marginBottom: 12 }}>Skeleton</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Skeleton variant="title" />
            <Skeleton variant="text" />
            <Skeleton variant="text" width="70%" />
          </div>
        </section>

        <div className="fc-divider" />

        {/* ── Empty state ────────────────────────────────────────── */}
        <section className="fc-section">
          <h2 className="fc-label" style={{ marginBottom: 12 }}>Empty state</h2>
          <EmptyState
            title="Aucun match à venir"
            description="Votre calendrier est vide. Commencez une nouvelle saison pour programmer des matchs."
            action={{ label: "Nouvelle saison", onClick: () => toast("Fonctionnalité à venir", "warning") }}
          />
        </section>

        <div className="fc-divider" />

        {/* ── Progress ───────────────────────────────────────────── */}
        <section className="fc-section">
          <h2 className="fc-label" style={{ marginBottom: 12 }}>Progression académie</h2>
          <div className="fc-panel">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: "var(--fc-text-sm)", color: "var(--fc-text-2)" }}>Score d&apos;évaluation</span>
              <span style={{ fontFamily: "var(--fc-font-display)", fontWeight: 700, color: "var(--fc-emerald)" }}>72 / 100</span>
            </div>
            <div className="fc-progress">
              <div className="fc-progress__fill" style={{ width: "72%" }} />
            </div>
          </div>
        </section>

        {/* ── Spinner ────────────────────────────────────────────── */}
        <Spinner />

        <div style={{ height: 48 }} />
      </div>

      {/* ── Modale ───────────────────────────────────────────────── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Investir des PA"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button variant="primary" onClick={() => { setModalOpen(false); toast("PA investis !", "success"); }}>Confirmer</Button>
          </>
        }
      >
        <p style={{ color: "var(--fc-text-2)", fontSize: "var(--fc-text-sm)", marginBottom: 16 }}>
          Vous avez <strong style={{ color: "var(--fc-emerald)" }}>7 PA</strong> disponibles.
        </p>
        <div className="fc-pa-row">
          <span className="fc-pa-row__label">Finition</span>
          <span className="fc-pa-row__current">65</span>
          <button className="fc-pa-row__btn" aria-label="Investir 1 PA en Finition">+</button>
        </div>
        <div className="fc-pa-row">
          <span className="fc-pa-row__label">Passe courte</span>
          <span className="fc-pa-row__current">58</span>
          <button className="fc-pa-row__btn" aria-label="Investir 1 PA en Passe courte">+</button>
        </div>
      </Modal>
    </div>
  );
}
