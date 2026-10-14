"use client";

/**
 * FC CAREER — Calendrier de la saison
 * Vue en lecture seule de tous les matchs de la saison.
 * Les matchs se jouent depuis le Dashboard (un match par semaine).
 */

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useGame }   from "../game/hooks/useGame";
import { Button }    from "../game/components/Button";
import { pageFade, stagger, itemFade } from "../game/design/animations";
import type { Fixture } from "../game/domain/season";
import type { MatchResult } from "../game/domain/match";
import { formatGameDateShort } from "../game/utils/dates";
import { YOUTH_LEAGUE_OPPONENTS } from "../game/domain/academySchedule";

/** Le championnat commence à la semaine 5 (semaines 1-4 = pré-saison) */
function matchdayToWeek(matchday: number): number {
  return 4 + matchday;
}

/* ── Composant principal ─────────────────────────────────────────── */

export default function CalendarPage() {
  const { state } = useGame();
  const router    = useRouter();

  const save   = state.save;
  const player = save?.player;
  const career = save?.career;

  // Tous les schedules de la saison (youth-league + academy-cup pour les joueurs académie, championnat pour les pros)
  const seasonSchedules = (save?.world.schedules ?? []).filter(s => s.season === career?.season);
  const fixtures = seasonSchedules.flatMap(s => s.fixtures).sort((a, b) => a.matchday - b.matchday);
  const completedIds = new Set((career?.completedMatchIds ?? []) as string[]);
  const clubs      = save?.world.clubs ?? [];

  // Résolution des noms de clubs : clubs monde + adversaires académie
  const clubLabel = (id: string) => {
    const worldClub = clubs.find(c => c.id === id);
    if (worldClub) return worldClub.shortName ?? worldClub.name ?? id;
    const youthOpp = YOUTH_LEAGUE_OPPONENTS.find(o => o.id === id);
    if (youthOpp) return youthOpp.name;
    // Identifiants lisibles pour les clubs académie génériques
    if (id.startsWith("youth-")) return id.replace("youth-", "Youth ").replace(/-/g, " ");
    return id;
  };

  const played   = fixtures.filter(f => completedIds.has(f.id));
  const upcoming = fixtures.filter(f => !completedIds.has(f.id));
  const nextFixture = upcoming[0] ?? null;

  /* ── Guard ───────────────────────────────────────────────────── */
  if (!save || !player || !career) {
    return (
      <div style={{ padding: "var(--fc-space-6)", textAlign: "center", color: "var(--fc-text-2)" }}>
        <p>Aucune sauvegarde.</p>
        <Button variant="primary" onClick={() => router.push("/client/fc-career/create-player")} style={{ marginTop: "var(--fc-space-4)" }}>
          Nouvelle carrière
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      variants={pageFade}
      initial="hidden"
      animate="visible"
      style={{ padding: "var(--fc-space-5) var(--fc-space-4)", maxWidth: 680, margin: "0 auto" }}
    >
      {/* Header */}
      <div className="fc-page-header">
        <h1 className="fc-page-title">Calendrier</h1>
        <p className="fc-page-meta">
          Saison {career.season} · {played.length} / {fixtures.length} matchs joués
        </p>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="visible">

        {/* ── Prochain match ──────────────────────────────────────── */}
        {nextFixture && (
          <motion.section className="fc-panel" variants={itemFade} style={{ marginBottom: "var(--fc-space-4)", borderColor: "rgba(55,217,154,0.35)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--fc-space-3)" }}>
              <p className="fc-panel__label" style={{ margin: 0 }}>Prochain match — J{nextFixture.matchday}</p>
              <span style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-emerald)", fontWeight: 600 }}>
                {formatGameDateShort(matchdayToWeek(nextFixture.matchday), career.season)}
              </span>
            </div>
            <FixtureRow fixture={nextFixture} playerClubId={player.contract.clubId} clubLabel={clubLabel} season={career.season} highlight />
            <Button
              variant="primary"
              fullWidth
              onClick={() => router.push("/client/fc-career/dashboard")}
              style={{ marginTop: "var(--fc-space-3)" }}
            >
              ⚽ Jouer depuis le tableau de bord
            </Button>
          </motion.section>
        )}

        {/* ── Fin de saison ─────────────────────────────────────── */}
        {!nextFixture && fixtures.length > 0 && (
          <motion.div variants={itemFade} className="fc-panel" style={{ textAlign: "center", marginBottom: "var(--fc-space-4)" }}>
            <p style={{ fontSize: "var(--fc-text-lg)", fontWeight: 700, color: "var(--fc-emerald)" }}>🏆 Saison terminée</p>
            <p style={{ fontSize: "var(--fc-text-sm)", color: "var(--fc-text-2)", marginTop: "var(--fc-space-2)" }}>
              Tous les matchs de la saison {career.season} ont été joués.
            </p>
          </motion.div>
        )}

        {/* ── À venir (après le prochain) ─────────────────────── */}
        {upcoming.length > 1 && (
          <motion.section variants={itemFade} style={{ marginBottom: "var(--fc-space-4)" }}>
            <p style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", letterSpacing: "0.05em", marginBottom: "var(--fc-space-2)" }}>
              À VENIR
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-1)" }}>
              {upcoming.slice(1, 8).map(f => (
                <FixtureRow key={f.id} fixture={f} playerClubId={player.contract.clubId} clubLabel={clubLabel} season={career.season} />
              ))}
              {upcoming.length > 8 && (
                <p style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", textAlign: "center", marginTop: "var(--fc-space-2)" }}>
                  + {upcoming.length - 8} matchs à venir
                </p>
              )}
            </div>
          </motion.section>
        )}

        {/* ── Matchs joués ────────────────────────────────────── */}
        {played.length > 0 && (
          <motion.section variants={itemFade}>
            <p style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", letterSpacing: "0.05em", marginBottom: "var(--fc-space-2)" }}>
              MATCHS JOUÉS
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-1)" }}>
              {[...played].reverse().map(f => {
                const matchResult = (save.world.lastMatchResults ?? []).find(r => r.matchId === f.id);
                return (
                  <FixtureRow
                    key={f.id}
                    fixture={f}
                    playerClubId={player.contract.clubId}
                    clubLabel={clubLabel}
                    matchResult={matchResult}
                    season={career.season}
                  />
                );
              })}
            </div>
          </motion.section>
        )}

        {/* ── Aucun match planifié ────────────────────────────── */}
        {fixtures.length === 0 && (
          <motion.div variants={itemFade} style={{ textAlign: "center", padding: "var(--fc-space-8)", color: "var(--fc-text-3)" }}>
            <p style={{ fontSize: "2rem", marginBottom: "var(--fc-space-2)" }}>📅</p>
            <p>Aucun match planifié pour cette saison.</p>
            <p style={{ fontSize: "var(--fc-text-sm)", marginTop: "var(--fc-space-1)" }}>
              Le calendrier sera généré au démarrage de la saison.
            </p>
          </motion.div>
        )}
      </motion.div>

      <div style={{ height: "var(--fc-space-6)" }} />
    </motion.div>
  );
}

/* ── Ligne de fixture ─────────────────────────────────────────────── */

function FixtureRow({
  fixture, playerClubId, clubLabel, highlight, matchResult, season,
}: {
  fixture: Fixture;
  playerClubId: string;
  clubLabel: (id: string) => string;
  highlight?: boolean;
  matchResult?: MatchResult;
  season: number;
}) {
  const isHome   = fixture.homeClubId === playerClubId;
  const oppId    = isHome ? fixture.awayClubId : fixture.homeClubId;
  const r        = fixture.result;
  const played   = r !== null;

  let outcome: "win" | "loss" | "draw" | null = null;
  if (r) {
    const myScore  = isHome ? r.scoreHome : r.scoreAway;
    const oppScore = isHome ? r.scoreAway : r.scoreHome;
    outcome = myScore > oppScore ? "win" : myScore < oppScore ? "loss" : "draw";
  }

  const outcomeColor = outcome === "win" ? "var(--fc-emerald)" : outcome === "loss" ? "var(--fc-coral)" : "var(--fc-amber)";

  return (
    <div style={{
      padding: "var(--fc-space-2) var(--fc-space-3)",
      borderRadius: "var(--fc-radius-sm)",
      background: highlight ? "var(--fc-emerald-10)" : "var(--fc-surface-2)",
      border: `1px solid ${highlight ? "rgba(55,217,154,0.2)" : "var(--fc-border)"}`,
      display: "flex",
      alignItems: "center",
      gap: "var(--fc-space-3)",
    }}>
      {/* Journée + Date */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 52 }}>
        <span style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", fontFamily: "var(--fc-font-display)", fontWeight: 700 }}>
          J{fixture.matchday}
        </span>
        <span style={{ fontSize: 10, color: "var(--fc-text-3)", whiteSpace: "nowrap" }}>
          {formatGameDateShort(matchdayToWeek(fixture.matchday), season)}
        </span>
      </div>

      {/* Mon équipe */}
      <span style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-emerald)", fontWeight: 700, minWidth: 70 }}>
        {isHome ? "Domicile" : "Extérieur"}
      </span>

      {/* Adversaire */}
      <span style={{ flex: 1, fontSize: "var(--fc-text-sm)", color: "var(--fc-text-2)" }}>
        vs {clubLabel(oppId)}
      </span>

      {/* Score ou état */}
      {played && r ? (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--fc-space-2)" }}>
          <span style={{ fontFamily: "var(--fc-font-display)", fontWeight: 800, fontSize: "var(--fc-text-base)", color: outcomeColor }}>
            {isHome ? r.scoreHome : r.scoreAway} – {isHome ? r.scoreAway : r.scoreHome}
          </span>
          <span style={{
            fontSize: "var(--fc-text-xs)", fontWeight: 700, padding: "1px 7px",
            borderRadius: 99, color: "#fff", background: outcomeColor,
          }}>
            {outcome === "win" ? "V" : outcome === "loss" ? "D" : "N"}
          </span>
        </div>
      ) : (
        <span style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>À venir</span>
      )}
    </div>
  );
}
