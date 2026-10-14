"use client";

/**
 * FC CAREER — Monde vivant
 * 4 pays, 8 ligues, 64 clubs.
 * Navigation par pays → ligue → classement.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { useGame }  from "../game/hooks/useGame";
import { Spinner }  from "../game/components/LoadingState";
import { selectPlayer, selectCareer, selectIsLoading } from "../game/state/selectors";
import { pageFade, stagger, itemFade } from "../game/design/animations";
import { COUNTRIES, LEAGUES, CLUBS } from "../game/data/world";
import type { StandingRow } from "../game/domain/club";
import { getTopScorers, getTopRated, POSITION_DISPLAY, PERSONALITY_LABELS } from "../game/data/worldPlayers";
import type { WorldPlayer } from "../game/data/worldPlayers";

/* ── Composant principal ─────────────────────────────────────────── */

export default function WorldPage() {
  const { state }     = useGame();
  const isLoading     = selectIsLoading(state);
  const player        = selectPlayer(state);
  const career        = selectCareer(state);

  const [activeCountryId, setActiveCountryId] = useState<string>(COUNTRIES[0].id);
  const [activeTier, setActiveTier]           = useState<1 | 2>(1);
  const [worldTab, setWorldTab]               = useState<"standings" | "scorers" | "players">("standings");
  const [mainTab, setMainTab]                 = useState<"leagues" | "transfers">("leagues");

  if (isLoading) return <Spinner />;

  const save = state.save;

  // Ligue active
  const activeLeague = LEAGUES.find(
    l => l.countryId === activeCountryId && l.tier === activeTier
  );
  const leagueClubs = activeLeague
    ? CLUBS.filter(c => c.leagueId === activeLeague.id)
    : [];

  // Classement stocké (ou vide)
  const standingRows: StandingRow[] = activeLeague
    ? (save?.world.standings[activeLeague.id] ?? [])
    : [];

  // Si pas de classement stocké, afficher les clubs sans stats
  const rows: StandingRow[] = standingRows.length > 0
    ? standingRows
    : leagueClubs.map((c, i) => ({
        clubId: c.id, position: i + 1, points: 0,
        played: 0, won: 0, drawn: 0, lost: 0,
        goalsFor: 0, goalsAgainst: 0, form: [],
      }));

  const activeCountry  = COUNTRIES.find(c => c.id === activeCountryId)!;
  const playerClubId   = player?.contract.clubId ?? "";

  return (
    <motion.div
      variants={pageFade} initial="hidden" animate="visible"
      style={{ padding: "var(--fc-space-5) var(--fc-space-4)", maxWidth: 720, margin: "0 auto" }}
    >
      {/* Header */}
      <div className="fc-page-header">
        <h1 className="fc-page-title">Monde</h1>
        <p className="fc-page-meta">
          4 pays · 8 championnats · 64 clubs
          {career && ` · Saison ${career.season}`}
        </p>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="visible">

        {/* ── Onglets principaux ─────────────────────────────────── */}
        <motion.div variants={itemFade} style={{ display: "flex", gap: "var(--fc-space-2)", marginBottom: "var(--fc-space-4)", borderBottom: "1px solid var(--fc-border)", paddingBottom: "var(--fc-space-3)" }}>
          {([
            { key: "leagues" as const, label: "🏆 Ligues" },
            { key: "transfers" as const, label: "🔄 Actualités" },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setMainTab(tab.key)}
              style={{
                padding: "8px 18px",
                borderRadius: "var(--fc-radius)",
                border: "none",
                background: mainTab === tab.key ? "var(--fc-text)" : "transparent",
                color: mainTab === tab.key ? "var(--fc-bg)" : "var(--fc-text-3)",
                fontWeight: mainTab === tab.key ? 700 : 500,
                fontSize: "var(--fc-text-sm)",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* ── Actualités transferts ────────────────────────────────── */}
        {mainTab === "transfers" && (() => {
          const history = (save as import("../game/persistence/saveSchema").GameSaveV1 & { worldTransferHistory?: import("../game/domain/worldTransfers").WorldTransferEvent[] })?.worldTransferHistory ?? [];
          const ICONS: Record<string, string> = {
            transfer: "↔️",
            loan: "🔁",
            retirement: "🎖️",
            promotion: "⬆️",
            youth_breakout: "⭐",
          };
          return (
            <motion.section variants={itemFade}>
              <p style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", marginBottom: "var(--fc-space-4)" }}>
                {history.length === 0
                  ? "Aucune actualité — le marché s'animera en fin de saison."
                  : `${history.length} événement${history.length > 1 ? "s" : ""} · Les 100 derniers mouvements`}
              </p>
              {history.length === 0 && (
                <div style={{
                  padding: "var(--fc-space-8)", textAlign: "center",
                  background: "var(--fc-surface-2)", borderRadius: "var(--fc-radius)",
                  border: "1px solid var(--fc-border)",
                }}>
                  <div style={{ fontSize: "2rem", marginBottom: "var(--fc-space-2)" }}>📋</div>
                  <p style={{ color: "var(--fc-text-2)", margin: 0, fontSize: "var(--fc-text-sm)" }}>
                    L'actualité du marché apparaîtra ici à la fin de la première saison.
                  </p>
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-2)" }}>
                {[...history].reverse().map((ev, idx) => (
                  <div key={`${ev.playerId}-${idx}`} style={{
                    padding: "var(--fc-space-3) var(--fc-space-4)",
                    background: "var(--fc-surface-2)",
                    borderRadius: "var(--fc-radius)",
                    border: "1px solid var(--fc-border)",
                    display: "flex", alignItems: "flex-start", gap: "var(--fc-space-3)",
                  }}>
                    <span style={{ fontSize: "1.2rem", flexShrink: 0, marginTop: 1 }}>
                      {ICONS[ev.type] ?? "📰"}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <p style={{
                        margin: 0, fontSize: "var(--fc-text-sm)", color: "var(--fc-text)",
                        lineHeight: 1.4,
                      }}>
                        {ev.description}
                      </p>
                      <p style={{ margin: 0, marginTop: 4, fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>
                        Saison {ev.season} ·{" "}
                        <span style={{
                          padding: "1px 7px", borderRadius: 99,
                          background: ev.type === "retirement" ? "var(--fc-surface-3)"
                            : ev.type === "youth_breakout" ? "rgba(245,158,11,0.12)"
                            : ev.type === "promotion" ? "rgba(16,185,129,0.12)"
                            : "var(--fc-surface-3)",
                          color: ev.type === "youth_breakout" ? "var(--fc-amber)"
                            : ev.type === "promotion" ? "var(--fc-emerald)"
                            : "var(--fc-text-3)",
                          fontSize: "var(--fc-text-xs)", fontWeight: 600,
                        }}>
                          {ev.type === "transfer" ? "Transfert"
                            : ev.type === "loan" ? "Prêt"
                            : ev.type === "retirement" ? "Retraite"
                            : ev.type === "promotion" ? "Promotion"
                            : "Révélation"}
                        </span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          );
        })()}

        {/* ── Contenu ligues ─────────────────────────────────────── */}
        {mainTab === "leagues" && <>

        {/* ── Onglets pays ────────────────────────────────────────── */}
        <motion.div variants={itemFade} style={{ display: "flex", gap: "var(--fc-space-2)", marginBottom: "var(--fc-space-4)", flexWrap: "wrap" }}>
          {COUNTRIES.map(country => {
            const active = country.id === activeCountryId;
            return (
              <button
                key={country.id}
                onClick={() => setActiveCountryId(country.id)}
                style={{
                  padding: "var(--fc-space-2) var(--fc-space-4)",
                  borderRadius: "var(--fc-radius)",
                  border: `1px solid ${active ? "var(--fc-emerald)" : "var(--fc-border-mid)"}`,
                  background: active ? "var(--fc-emerald-10)" : "var(--fc-surface-3)",
                  color: active ? "var(--fc-emerald)" : "var(--fc-text-2)",
                  fontWeight: active ? 700 : 400,
                  fontSize: "var(--fc-text-sm)",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "var(--fc-space-2)",
                  transition: "border-color 0.15s, background 0.15s",
                }}
              >
                <span>{country.flag}</span>
                <span>{country.name}</span>
              </button>
            );
          })}
        </motion.div>

        {/* ── Onglets division ────────────────────────────────────── */}
        <motion.div variants={itemFade} style={{ display: "flex", gap: "var(--fc-space-2)", marginBottom: "var(--fc-space-4)" }}>
          {([1, 2] as const).map(tier => {
            const leagueForTier = LEAGUES.find(l => l.countryId === activeCountryId && l.tier === tier);
            if (!leagueForTier) return null;
            const active = activeTier === tier;
            return (
              <button
                key={tier}
                onClick={() => setActiveTier(tier)}
                style={{
                  padding: "6px 16px",
                  borderRadius: "var(--fc-radius-sm)",
                  border: `1px solid ${active ? "var(--fc-text)" : "var(--fc-border)"}`,
                  background: active ? "var(--fc-surface-1)" : "var(--fc-surface-3)",
                  color: active ? "var(--fc-text)" : "var(--fc-text-3)",
                  fontWeight: active ? 700 : 400,
                  fontSize: "var(--fc-text-xs)",
                  cursor: "pointer",
                }}
              >
                {leagueForTier.name}
              </button>
            );
          })}
        </motion.div>

        {/* ── Info ligue ──────────────────────────────────────────── */}
        {activeLeague && (
          <motion.div variants={itemFade} style={{
            display: "flex", alignItems: "center", gap: "var(--fc-space-3)",
            marginBottom: "var(--fc-space-3)",
          }}>
            <span style={{ fontSize: "var(--fc-text-base)", fontWeight: 700, color: "var(--fc-text)" }}>
              {activeLeague.name}
            </span>
            <span style={{
              fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)",
              background: "var(--fc-surface-2)", padding: "2px 8px",
              borderRadius: 99, border: "1px solid var(--fc-border)",
            }}>
              {activeCountry.flag} {activeCountry.name}
            </span>
          </motion.div>
        )}

        {/* ── Onglets vue ligue ───────────────────────────────────── */}
        {activeLeague && (
          <motion.div variants={itemFade} style={{ display: "flex", gap: "var(--fc-space-2)", marginBottom: "var(--fc-space-4)" }}>
            {([
              { key: "standings", label: "Classement" },
              { key: "scorers",   label: "Top Buteurs" },
              { key: "players",   label: "Joueurs" },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setWorldTab(tab.key)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "var(--fc-radius-sm)",
                  border: `1px solid ${worldTab === tab.key ? "var(--fc-emerald)" : "var(--fc-border)"}`,
                  background: worldTab === tab.key ? "var(--fc-emerald-10)" : "var(--fc-surface-3)",
                  color: worldTab === tab.key ? "var(--fc-emerald)" : "var(--fc-text-2)",
                  fontWeight: worldTab === tab.key ? 700 : 400,
                  fontSize: "var(--fc-text-xs)",
                  cursor: "pointer",
                }}
              >
                {tab.label}
              </button>
            ))}
          </motion.div>
        )}

        {/* ── Top Buteurs ─────────────────────────────────────────── */}
        {worldTab === "scorers" && activeLeague && (() => {
          const season = career?.season ?? 1;
          const scorers = getTopScorers(activeLeague.id, season, 10);
          return (
            <motion.section variants={itemFade} className="fc-panel" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{
                display: "grid", gridTemplateColumns: "24px 1fr 48px 48px 48px",
                gap: "var(--fc-space-2)", padding: "var(--fc-space-2) var(--fc-space-4)",
                background: "var(--fc-surface-2)", borderBottom: "1px solid var(--fc-border)",
                fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", fontWeight: 700,
              }}>
                <span>#</span><span>Joueur</span><span style={{ textAlign: "center" }}>Buts</span><span style={{ textAlign: "center" }}>Pds</span><span style={{ textAlign: "center" }}>Ovr</span>
              </div>
              {scorers.length === 0 && (
                <p style={{ padding: "var(--fc-space-4)", color: "var(--fc-text-3)", textAlign: "center" }}>
                  Aucune donnée pour la saison {season}.
                </p>
              )}
              {scorers.map((wp, idx) => {
                const stats = wp.seasonStats.find(s => s.season === season);
                const club  = CLUBS.find(c => c.id === wp.clubId);
                return (
                  <div key={wp.id} style={{
                    display: "grid", gridTemplateColumns: "24px 1fr 48px 48px 48px",
                    gap: "var(--fc-space-2)", padding: "var(--fc-space-2) var(--fc-space-4)",
                    borderBottom: idx < scorers.length - 1 ? "1px solid var(--fc-border)" : "none",
                    alignItems: "center",
                  }}>
                    <span style={{ fontSize: "var(--fc-text-xs)", color: idx < 3 ? "var(--fc-amber)" : "var(--fc-text-3)", fontWeight: 700 }}>{idx + 1}</span>
                    <div>
                      <div style={{ fontSize: "var(--fc-text-sm)", color: "var(--fc-text)", fontWeight: 600 }}>
                        {wp.firstName} {wp.lastName}
                      </div>
                      <div style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>
                        {POSITION_DISPLAY[wp.position]} · {club?.shortName ?? wp.clubId}
                      </div>
                    </div>
                    <span style={{ textAlign: "center", fontWeight: 700, color: "var(--fc-text)" }}>{stats?.goals ?? 0}</span>
                    <span style={{ textAlign: "center", color: "var(--fc-text-2)" }}>{stats?.assists ?? 0}</span>
                    <span style={{ textAlign: "center", color: "var(--fc-text-3)" }}>{wp.overall}</span>
                  </div>
                );
              })}
            </motion.section>
          );
        })()}

        {/* ── Top Joueurs par note ─────────────────────────────────── */}
        {worldTab === "players" && activeLeague && (() => {
          const topPlayers = getTopRated(activeLeague.id, 15);
          return (
            <motion.section variants={itemFade} style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-2)" }}>
              {topPlayers.map((wp, idx) => {
                const club = CLUBS.find(c => c.id === wp.clubId);
                const isInjured = wp.injury !== null;
                return (
                  <div key={wp.id} style={{
                    display: "flex", alignItems: "center", gap: "var(--fc-space-3)",
                    padding: "var(--fc-space-3) var(--fc-space-4)",
                    borderRadius: "var(--fc-radius-sm)",
                    border: "1px solid var(--fc-border)",
                    background: "var(--fc-surface-2)",
                    opacity: isInjured ? 0.7 : 1,
                  }}>
                    <span style={{ fontFamily: "var(--fc-font-display)", fontWeight: 900, fontSize: "var(--fc-text-md)", color: idx < 3 ? "var(--fc-amber)" : "var(--fc-text-3)", minWidth: 24 }}>
                      {wp.overall}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: "var(--fc-text-sm)", color: "var(--fc-text)" }}>
                        {wp.firstName} {wp.lastName}
                        {isInjured && <span style={{ color: "var(--fc-coral)", marginLeft: 6, fontSize: "var(--fc-text-xs)" }}>🤕</span>}
                      </div>
                      <div style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>
                        {POSITION_DISPLAY[wp.position]} · {club?.shortName ?? wp.clubId} · {PERSONALITY_LABELS[wp.personality]}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>{wp.age} ans</div>
                      <div style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-emerald)", fontWeight: 600 }}>
                        {(wp.marketValue / 1000000).toFixed(1)}M€
                      </div>
                    </div>
                  </div>
                );
              })}
            </motion.section>
          );
        })()}

        {/* ── Tableau de classement ────────────────────────────────── */}
        {worldTab === "standings" && <motion.section variants={itemFade} className="fc-panel" style={{ padding: 0, overflow: "hidden" }}>
          {/* En-tête tableau */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "28px 1fr 32px 80px 32px",
            gap: "var(--fc-space-2)",
            padding: "var(--fc-space-2) var(--fc-space-4)",
            background: "var(--fc-surface-2)",
            borderBottom: "1px solid var(--fc-border)",
            fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", fontWeight: 700,
          }}>
            <span>#</span>
            <span>Club</span>
            <span style={{ textAlign: "center" }}>J</span>
            <span style={{ textAlign: "center" }}>V N D</span>
            <span style={{ textAlign: "center" }}>Pts</span>
          </div>

          {/* Lignes */}
          {rows.map((row, idx) => {
            const club    = CLUBS.find(c => c.id === row.clubId) ?? leagueClubs[idx];
            const isMe    = row.clubId === playerClubId;
            const pos     = idx + 1;
            const zoneColor =
              pos <= 2 ? "var(--fc-emerald)"          // promotion/champions
              : pos >= rows.length - 1 ? "var(--fc-coral)"  // relégation
              : "transparent";

            return (
              <div
                key={row.clubId}
                style={{
                  display: "grid",
                  gridTemplateColumns: "28px 1fr 32px 80px 32px",
                  gap: "var(--fc-space-2)",
                  padding: "var(--fc-space-2) var(--fc-space-4)",
                  borderBottom: idx < rows.length - 1 ? "1px solid var(--fc-border)" : "none",
                  background: isMe ? "var(--fc-emerald-10)" : "transparent",
                  borderLeft: `3px solid ${zoneColor}`,
                  alignItems: "center",
                }}
              >
                {/* Position */}
                <span style={{
                  fontSize: "var(--fc-text-xs)",
                  fontFamily: "var(--fc-font-display)",
                  fontWeight: 700,
                  color: pos <= 3 ? "var(--fc-emerald)" : "var(--fc-text-3)",
                }}>
                  {pos}
                </span>

                {/* Club */}
                <div style={{ display: "flex", alignItems: "center", gap: "var(--fc-space-2)", minWidth: 0 }}>
                  {/* Badge couleur club */}
                  <span style={{
                    width: 8, height: 8, borderRadius: 2, flexShrink: 0,
                    background: club?.colors.primary ?? "var(--fc-border)",
                  }} />
                  <span style={{
                    fontSize: "var(--fc-text-sm)",
                    fontWeight: isMe ? 800 : 500,
                    color: isMe ? "var(--fc-emerald)" : "var(--fc-text)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {club?.shortName ?? row.clubId}
                    {isMe && " ●"}
                  </span>
                </div>

                {/* Matchs joués */}
                <span style={{ textAlign: "center", fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>
                  {row.played}
                </span>

                {/* V / N / D */}
                <div style={{ display: "flex", justifyContent: "center", gap: 4 }}>
                  <span style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-emerald)", fontWeight: 600, minWidth: 18, textAlign: "center" }}>{row.won}</span>
                  <span style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-amber)",   fontWeight: 600, minWidth: 18, textAlign: "center" }}>{row.drawn}</span>
                  <span style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-coral)",   fontWeight: 600, minWidth: 18, textAlign: "center" }}>{row.lost}</span>
                </div>

                {/* Points */}
                <span style={{
                  textAlign: "center",
                  fontFamily: "var(--fc-font-display)", fontWeight: 900,
                  fontSize: "var(--fc-text-base)",
                  color: isMe ? "var(--fc-emerald)" : "var(--fc-text)",
                }}>
                  {row.points}
                </span>
              </div>
            );
          })}
        </motion.section>}

        {/* ── Légende zones ───────────────────────────────────────── */}
        {worldTab === "standings" && <motion.div variants={itemFade} style={{
          display: "flex", gap: "var(--fc-space-4)", marginTop: "var(--fc-space-3)",
          fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)",
        }}>
          <span><span style={{ color: "var(--fc-emerald)" }}>●</span> Promotion / Champions</span>
          <span><span style={{ color: "var(--fc-coral)" }}>●</span> Relégation</span>
        </motion.div>}

        {/* ── Clubs du monde (grid de vitrines) ───────────────────── */}
        <motion.section variants={itemFade} style={{ marginTop: "var(--fc-space-6)" }}>
          <h2 style={{ fontSize: "var(--fc-text-base)", fontWeight: 700, color: "var(--fc-text)", marginBottom: "var(--fc-space-3)" }}>
            Clubs du championnat
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--fc-space-2)" }}>
            {leagueClubs.map(club => {
              const isMe = club.id === playerClubId;
              return (
                <div
                  key={club.id}
                  style={{
                    padding: "var(--fc-space-3)",
                    borderRadius: "var(--fc-radius-sm)",
                    border: `1px solid ${isMe ? "rgba(55,217,154,0.4)" : "var(--fc-border)"}`,
                    background: isMe ? "var(--fc-emerald-10)" : "var(--fc-surface-2)",
                    display: "flex", alignItems: "center", gap: "var(--fc-space-2)",
                  }}
                >
                  {/* Bande couleur */}
                  <div style={{
                    width: 6, height: 36, borderRadius: 3, flexShrink: 0,
                    background: `linear-gradient(to bottom, ${club.colors.primary}, ${club.colors.secondary})`,
                  }} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{
                      fontWeight: isMe ? 800 : 600, fontSize: "var(--fc-text-sm)",
                      color: isMe ? "var(--fc-emerald)" : "var(--fc-text)",
                      margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {club.name}
                    </p>
                    <p style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", margin: 0, marginTop: 1 }}>
                      Rép. {club.reputation} · {club.philosophy}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* ── Aperçu tous pays ─────────────────────────────────────── */}
        <motion.section variants={itemFade} style={{ marginTop: "var(--fc-space-6)" }}>
          <h2 style={{ fontSize: "var(--fc-text-base)", fontWeight: 700, color: "var(--fc-text)", marginBottom: "var(--fc-space-3)" }}>
            Aperçu mondial
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--fc-space-3)" }}>
            {COUNTRIES.map(country => {
              const d1 = LEAGUES.find(l => l.countryId === country.id && l.tier === 1)!;
              const d1clubs = CLUBS.filter(c => c.leagueId === d1.id);
              const topClub = d1clubs.sort((a, b) => b.reputation - a.reputation)[0];
              return (
                <button
                  key={country.id}
                  onClick={() => { setActiveCountryId(country.id); setActiveTier(1); }}
                  style={{
                    padding: "var(--fc-space-3)",
                    borderRadius: "var(--fc-radius)",
                    border: `1px solid ${country.id === activeCountryId ? "var(--fc-emerald)" : "var(--fc-border)"}`,
                    background: "var(--fc-surface-2)",
                    cursor: "pointer", textAlign: "left",
                    transition: "border-color 0.15s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--fc-space-2)", marginBottom: "var(--fc-space-1)" }}>
                    <span style={{ fontSize: "1.2rem" }}>{country.flag}</span>
                    <span style={{ fontWeight: 700, fontSize: "var(--fc-text-sm)", color: "var(--fc-text)" }}>
                      {country.name}
                    </span>
                  </div>
                  <p style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", margin: 0 }}>
                    {d1.name}
                  </p>
                  <p style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-2)", margin: 0, marginTop: 2 }}>
                    Top club : {topClub?.shortName}
                  </p>
                </button>
              );
            })}
          </div>
        </motion.section>

        </>}

      </motion.div>

      <div style={{ height: "var(--fc-space-8)" }} />
    </motion.div>
  );
}
