"use client";

/**
 * FC CAREER — Étape 18 : Journal de Carrière & Autobiographie
 * Route: /client/fc-career/journal
 */

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  ScrollText,
  PenLine,
  ChevronRight,
} from "lucide-react";
import { Shell, PageTitle, StatCard } from "../lib/components";
import { Button } from "../lib/ui";
import { loadGame, saveGame } from "../utils/storage";
import type { FullSave } from "../utils/storage";
import type { JournalState, JournalEventType } from "../types/legacy";
import {
  createJournalState,
  addJournalEntry,
  generateAutobiography,
  generateFirstMatchNarrative,
  generateFirstGoalNarrative,
  generateSeasonSummary,
  generateCallUpNarrative,
  generateAwardNarrative,
  generateCaptainNarrative,
} from "../engine/legacy-engine";
import { getClub } from "../constants/clubs";

type Tab = "journal" | "autobiography";

const TABS: { id: Tab; label: string; icon: typeof BookOpen }[] = [
  { id: "journal", label: "Journal", icon: ScrollText },
  { id: "autobiography", label: "Autobiographie", icon: BookOpen },
];

const ease4 = [0.22, 1, 0.36, 1] as [number, number, number, number];

const SAMPLE_EVENTS: { type: JournalEventType; title: string; narrativeFn: (name: string, club: string, age: number) => string }[] = [
  { type: "first-match", title: "Premier match pro", narrativeFn: (name, club) => generateFirstMatchNarrative(name, club, 17) },
  { type: "first-goal", title: "Premier but", narrativeFn: (name) => generateFirstGoalNarrative(name, "l'adversaire", 78) },
  { type: "first-callup", title: "Sélection nationale", narrativeFn: (name) => generateCallUpNarrative(name, "la Gallia") },
  { type: "individual-award", title: "Récompense individuelle", narrativeFn: (name) => generateAwardNarrative(name, "Meilleur jeune") },
  { type: "captain-appointed", title: "Nommé capitaine", narrativeFn: (name, club) => generateCaptainNarrative(name, club) },
  { type: "season-summary", title: "Bilan de saison", narrativeFn: (name) => generateSeasonSummary(name, 1, 12, 8, 34, 7.2) },
];

export default function JournalPage() {
  const [save, setSave] = useState<FullSave | null>(null);
  const [tab, setTab] = useState<Tab>("journal");
  const [selectedChapter, setSelectedChapter] = useState<number>(0);

  useEffect(() => { setSave(loadGame()); }, []);

  const journal: JournalState = save?.meta?.journalState ?? createJournalState();
  const player = save?.player;
  const seasonYear = save?.meta?.season?.seasonYear ?? 1;
  const currentDay = save?.meta?.season?.currentDay ?? 1;
  const clubName = player ? (getClub(player.contract.clubId)?.name ?? "Club") : "Club";
  const playerName = player ? `${player.firstName} ${player.lastName}` : "Joueur";

  const persist = useCallback((updated: JournalState) => {
    setSave(prev => {
      if (!prev) return prev;
      const next: FullSave = { ...prev, meta: { ...prev.meta, journalState: updated } };
      saveGame(next);
      return next;
    });
  }, []);

  const handleAddEntry = useCallback((type: JournalEventType, title: string, narrative: string) => {
    const updated = addJournalEntry(journal, type, title, narrative, currentDay, seasonYear, player?.age ?? 17);
    persist(updated);
  }, [journal, currentDay, seasonYear, player, persist]);

  const handleGenerateAutobiography = useCallback(() => {
    const auto = generateAutobiography(playerName, journal.entries);
    persist({ ...journal, autobiography: auto });
  }, [journal, playerName, persist]);

  if (!save) {
    return (
      <Shell>
        <PageTitle eyebrow="ÉTAPE 18" title="Journal" subtitle="Chargement..." />
      </Shell>
    );
  }

  const autobiography = journal.autobiography;
  const currentChapter = autobiography?.chapters[selectedChapter];

  return (
    <Shell>
      <PageTitle
        eyebrow="ÉTAPE 18"
        title="Journal de Carrière"
        subtitle="Ton histoire s'écrit toute seule"
      />

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <StatCard icon={<PenLine />} value={journal.entries.length} label="Entrées" tone="blue" />
        <StatCard icon={<BookOpen />} value={autobiography ? autobiography.chapters.length : 0} label="Chapitres" tone={autobiography ? "green" : "amber"} />
      </div>

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

          {/* ---- JOURNAL ---- */}
          {tab === "journal" && (
            <div style={{ display: "grid", gap: "1rem" }}>
              {/* Add entries */}
              <div className="card" style={{ padding: "1.25rem" }}>
                <strong style={{ marginBottom: "0.75rem", display: "block" }}>Ajouter un moment</strong>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "0.5rem" }}>
                  {SAMPLE_EVENTS.map(e => (
                    <Button
                      key={e.type}
                      variant="outline"
                      onClick={() => handleAddEntry(e.type, e.title, e.narrativeFn(playerName, clubName, player?.age ?? 17))}
                      style={{ justifyContent: "flex-start", fontSize: "0.85rem" }}
                    >
                      {e.title}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Timeline */}
              {journal.entries.length === 0 ? (
                <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
                  <ScrollText style={{ width: 48, height: 48, margin: "0 auto 1rem", opacity: 0.3 }} />
                  <p>Aucune entrée. Votre histoire commence maintenant.</p>
                </div>
              ) : (
                <div style={{ position: "relative", paddingLeft: "1.5rem" }}>
                  {/* Timeline line */}
                  <div style={{ position: "absolute", left: "0.5rem", top: 0, bottom: 0, width: 2, background: "var(--muted)" }} />

                  {[...journal.entries].reverse().map((entry, i) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05, ease: ease4 }}
                      style={{ position: "relative", marginBottom: "1rem" }}
                    >
                      {/* Timeline dot */}
                      <div style={{
                        position: "absolute", left: "-1.25rem", top: "1rem",
                        width: 12, height: 12, borderRadius: "50%",
                        background: "var(--primary)", border: "2px solid var(--background)",
                      }} />

                      <div className="card" style={{ padding: "1rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                          <span style={{ fontWeight: 600 }}>
                            {entry.emoji} {entry.title}
                          </span>
                          <span style={{ fontSize: "0.75rem", opacity: 0.5 }}>
                            Saison {entry.seasonYear} · {entry.playerAge} ans
                          </span>
                        </div>
                        <p style={{ fontSize: "0.9rem", lineHeight: 1.6, fontStyle: "italic", opacity: 0.85 }}>
                          {entry.narrative}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ---- AUTOBIOGRAPHY ---- */}
          {tab === "autobiography" && (
            <div style={{ display: "grid", gap: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Button variant="action" onClick={handleGenerateAutobiography}>
                  <BookOpen /> {autobiography ? "Régénérer" : "Générer"} l&apos;autobiographie
                </Button>
              </div>

              {!autobiography ? (
                <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
                  <BookOpen style={{ width: 48, height: 48, margin: "0 auto 1rem", opacity: 0.3 }} />
                  <p>Générez votre autobiographie pour lire votre histoire.</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "1rem" }}>
                  {/* Chapter list */}
                  <div style={{ display: "grid", gap: "0.25rem", alignContent: "start" }}>
                    <h3 style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.5rem", opacity: 0.6 }}>
                      {autobiography.title}
                    </h3>
                    {autobiography.chapters.map((ch, i) => (
                      <Button
                        key={ch.id}
                        variant={selectedChapter === i ? "career" : "ghost"}
                        onClick={() => setSelectedChapter(i)}
                        style={{ justifyContent: "flex-start", fontSize: "0.8rem" }}
                      >
                        <ChevronRight style={{ width: 14, height: 14, opacity: selectedChapter === i ? 1 : 0.3 }} />
                        Ch. {ch.number}
                      </Button>
                    ))}
                  </div>

                  {/* Chapter content */}
                  {currentChapter && (
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentChapter.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="card"
                        style={{ padding: "2rem" }}
                      >
                        <div style={{ marginBottom: "1.5rem" }}>
                          <span style={{ fontSize: "0.75rem", opacity: 0.5 }}>{currentChapter.seasonRange}</span>
                          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginTop: "0.25rem" }}>
                            Chapitre {currentChapter.number} : {currentChapter.title}
                          </h2>
                        </div>
                        <div style={{ fontSize: "0.95rem", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                          {currentChapter.content}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2rem" }}>
                          <Button
                            variant="ghost"
                            disabled={selectedChapter === 0}
                            onClick={() => setSelectedChapter(s => s - 1)}
                          >
                            ← Précédent
                          </Button>
                          <Button
                            variant="ghost"
                            disabled={selectedChapter === autobiography.chapters.length - 1}
                            onClick={() => setSelectedChapter(s => s + 1)}
                          >
                            Suivant →
                          </Button>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  )}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </Shell>
  );
}
