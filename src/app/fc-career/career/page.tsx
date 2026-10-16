"use client";

/**
 * FC CAREER — Page : Historique de carrière
 * Résumé multi-saisons, progression OVR, palmarès.
 */

import { motion } from "framer-motion";
import { useGame }   from "../game/hooks/useGame";
import { Spinner }   from "../game/components/LoadingState";
import { selectPlayer, selectCareer, selectIsLoading } from "../game/state/selectors";
import { pageFade, stagger, itemFade } from "../game/design/animations";
import { formatMoney } from "../game/utils/formatters";
import type { SeasonSummary, CareerPhase } from "../game/domain/career";
import { formatGameDateShort, seasonLabel } from "../game/utils/dates";

/* ── Phase label ──────────────────────────────────────────────────── */

const PHASE_LABELS: Record<CareerPhase, string> = {
  academy:      "Académie",
  reserve:      "Réserve",
  professional: "Professionnel",
  elite:        "Élite",
  legend:       "Légende",
  retired:      "Retraité",
};

const PHASE_COLORS: Record<CareerPhase, string> = {
  academy:      "var(--fc-amber)",
  reserve:      "var(--fc-text-2)",
  professional: "var(--fc-emerald)",
  elite:        "var(--fc-emerald)",
  legend:       "#f59e0b",
  retired:      "var(--fc-text-3)",
};

/* ── Carte résumé de saison ────────────────────────────────────────── */

function SeasonCard({
  summary,
  clubs,
}: {
  summary: SeasonSummary;
  clubs: { id: string; shortName: string; name: string }[];
}) {
  const club = clubs.find(c => c.id === summary.clubId);
  const phaseColor = PHASE_COLORS[summary.phase] ?? "var(--fc-text-2)";
  const phaseLabel = PHASE_LABELS[summary.phase] ?? summary.phase;

  return (
    <motion.div
      variants={itemFade}
      style={{
        background: "var(--fc-surface-2)",
        borderRadius: "var(--fc-radius)",
        padding: "var(--fc-space-4)",
        border: "1px solid var(--fc-border)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--fc-space-3)" }}>
        <div>
          <p style={{
            fontFamily: "var(--fc-font-display)", fontWeight: 800,
            fontSize: "var(--fc-text-lg)", color: "var(--fc-text)",
            lineHeight: 1,
          }}>
            Saison {summary.season}
          </p>
          <p style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", marginTop: 2 }}>
            {club?.shortName ?? club?.name ?? summary.clubId}
          </p>
        </div>
        <span style={{
          fontSize: "var(--fc-text-xs)", fontWeight: 700,
          color: phaseColor,
          background: `${phaseColor}18`,
          padding: "2px 8px",
          borderRadius: 999,
          border: `1px solid ${phaseColor}40`,
        }}>
          {phaseLabel}
        </span>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--fc-space-2)", marginBottom: "var(--fc-space-3)" }}>
        {[
          { label: "Matchs",  value: summary.appearances },
          { label: "Buts",    value: summary.goals },
          { label: "Passes",  value: summary.assists },
          { label: "Moyenne", value: summary.avgRating > 0 ? summary.avgRating.toFixed(1) : "—" },
        ].map(s => (
          <div key={s.label} style={{ textAlign: "center" }}>
            <p style={{
              fontFamily: "var(--fc-font-display)", fontWeight: 800,
              fontSize: "var(--fc-text-md)", color: "var(--fc-text)",
            }}>
              {s.value}
            </p>
            <p style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Highlights */}
      {summary.highlights.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {summary.highlights.slice(0, 3).map((h, i) => (
            <p key={i} style={{
              fontSize: "var(--fc-text-xs)", color: "var(--fc-text-2)",
              padding: "3px 8px",
              background: "var(--fc-surface)",
              borderRadius: "var(--fc-radius-sm)",
              border: "1px solid var(--fc-border)",
            }}>
              {h}
            </p>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ── Graphique de progression OVR ──────────────────────────────────── */

function OvrProgressChart({
  history,
}: {
  history: { season: number; overall: number }[];
}) {
  if (history.length < 2) return null;

  const W = 280, H = 80, PAD = 10;
  const minOvr = Math.max(40, Math.min(...history.map(h => h.overall)) - 5);
  const maxOvr = Math.min(99, Math.max(...history.map(h => h.overall)) + 5);

  const pts = history.map((h, i) => {
    const x = PAD + (i / (history.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((h.overall - minOvr) / (maxOvr - minOvr)) * (H - PAD * 2);
    return { x, y, ovr: h.overall, season: h.season };
  });

  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaD = `${pathD} L ${pts[pts.length - 1].x} ${H - PAD} L ${PAD} ${H - PAD} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 80 }}>
      <defs>
        <linearGradient id="ovrGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--fc-emerald)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--fc-emerald)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#ovrGrad)" />
      <path d={pathD} fill="none" stroke="var(--fc-emerald)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3" fill="var(--fc-emerald)" />
          <text x={p.x} y={p.y - 6} textAnchor="middle" fontSize="8" fill="var(--fc-text-3)">{p.ovr}</text>
        </g>
      ))}
    </svg>
  );
}

/* ── Page principale ─────────────────────────────────────────────── */

export default function CareerPage() {
  const { state } = useGame();
  const isLoading  = selectIsLoading(state);
  const player     = selectPlayer(state);
  const career     = selectCareer(state);

  if (isLoading) return <Spinner />;
  if (!player || !career || !state.save) {
    return (
      <div className="fc-page">
        <p style={{ color: "var(--fc-text-3)", textAlign: "center", paddingTop: "var(--fc-space-8)" }}>
          Aucune carrière active.
        </p>
      </div>
    );
  }

  const save    = state.save;
  const clubs   = save.world.clubs;
  const history = player.progressionHistory ?? [];
  const summaries: SeasonSummary[] = career.seasonSummaries ?? [];

  /* Stats saison en cours */
  const currentSeasonStats = player.stats.seasons.find(s => s.season === career.season);

  /* Stats cumulées */
  const totalApps    = player.stats.totalAppearances;
  const totalGoals   = player.stats.totalGoals;
  const totalAssists = player.stats.totalAssists;
  const totalEarned  = save.wallet.totalEarned;

  const currentClub  = clubs.find(c => c.id === player.contract.clubId);
  const phaseLabel   = PHASE_LABELS[career.phase] ?? career.phase;
  const phaseColor   = PHASE_COLORS[career.phase] ?? "var(--fc-emerald)";

  return (
    <motion.div
      className="fc-page"
      variants={pageFade}
      initial="hidden"
      animate="visible"
    >
      {/* En-tête */}
      <div className="fc-section-header">
        <h1 className="fc-section-title">Carrière</h1>
        <span className="fc-badge fc-badge--neutral">{formatGameDateShort(career.week, career.season)}</span>
      </div>

      {/* Fiche actuelle */}
      <div className="fc-card" style={{ padding: "var(--fc-space-4) var(--fc-space-5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", marginBottom: 2 }}>
              {currentClub?.shortName ?? currentClub?.name ?? "—"} · Saison {career.season}
            </p>
            <p style={{
              fontFamily: "var(--fc-font-display)", fontWeight: 900,
              fontSize: "1.6rem", color: "var(--fc-text)", lineHeight: 1,
            }}>
              {player.firstName} {player.lastName}
            </p>
            <div style={{ display: "flex", gap: "var(--fc-space-2)", marginTop: "var(--fc-space-2)" }}>
              <span className="fc-badge fc-badge--pos">{player.position}</span>
              <span style={{
                fontSize: "var(--fc-text-xs)", fontWeight: 700,
                color: phaseColor,
                background: `${phaseColor}18`,
                padding: "2px 8px", borderRadius: 999,
                border: `1px solid ${phaseColor}40`,
              }}>
                {phaseLabel}
              </span>
            </div>
          </div>
          <div style={{
            fontFamily: "var(--fc-font-display)", fontWeight: 900,
            fontSize: "2.5rem", color: "var(--fc-emerald)", lineHeight: 1,
          }}>
            {player.overall}
          </div>
        </div>

        {/* Contrat */}
        {player.contract.endSeason > career.season && (
          <div style={{
            marginTop: "var(--fc-space-3)",
            paddingTop: "var(--fc-space-3)",
            borderTop: "1px solid var(--fc-border)",
            display: "flex", justifyContent: "space-between",
          }}>
            <div>
              <p style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>Salaire</p>
              <p style={{ fontSize: "var(--fc-text-sm)", fontWeight: 700, color: "var(--fc-emerald)" }}>
                {formatMoney(save.wallet.weeklyWage)}/sem.
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>Contrat jusqu&apos;en</p>
              <p style={{ fontSize: "var(--fc-text-sm)", fontWeight: 700, color: "var(--fc-text)" }}>
                {seasonLabel(player.contract.endSeason)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Stats carrière */}
      <div className="fc-card" style={{ padding: "var(--fc-space-4) var(--fc-space-5)" }}>
        <h2 style={{
          fontFamily: "var(--fc-font-display)", fontWeight: 700,
          fontSize: "var(--fc-text-md)", color: "var(--fc-text)",
          marginBottom: "var(--fc-space-4)",
        }}>
          Statistiques carrière
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--fc-space-3)" }}>
          {[
            { label: "Matchs",   value: totalApps },
            { label: "Buts",     value: totalGoals },
            { label: "Passes D", value: totalAssists },
          ].map(s => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <p style={{
                fontFamily: "var(--fc-font-display)", fontWeight: 900,
                fontSize: "1.8rem", color: "var(--fc-text)", lineHeight: 1,
              }}>
                {s.value}
              </p>
              <p style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", marginTop: 2 }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
        {totalEarned > 0 && (
          <div style={{
            marginTop: "var(--fc-space-3)", paddingTop: "var(--fc-space-3)",
            borderTop: "1px solid var(--fc-border)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>Total gagné</span>
            <span style={{ fontWeight: 700, fontSize: "var(--fc-text-sm)", color: "var(--fc-text)" }}>
              {formatMoney(totalEarned)}
            </span>
          </div>
        )}
      </div>

      {/* Stats saison en cours */}
      {currentSeasonStats && (
        <div className="fc-card" style={{ padding: "var(--fc-space-4) var(--fc-space-5)" }}>
          <h2 style={{
            fontFamily: "var(--fc-font-display)", fontWeight: 700,
            fontSize: "var(--fc-text-md)", color: "var(--fc-text)",
            marginBottom: "var(--fc-space-4)",
          }}>
            Saison {career.season} en cours
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--fc-space-3)" }}>
            {[
              { label: "Matchs",   value: currentSeasonStats.appearances },
              { label: "Buts",     value: currentSeasonStats.goals },
              { label: "Passes D", value: currentSeasonStats.assists },
              { label: "Moyenne",  value: currentSeasonStats.appearances > 0 ? currentSeasonStats.avgRating.toFixed(1) : "—" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <p style={{
                  fontFamily: "var(--fc-font-display)", fontWeight: 900,
                  fontSize: "1.5rem", color: "var(--fc-emerald)", lineHeight: 1,
                }}>
                  {s.value}
                </p>
                <p style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", marginTop: 2 }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progression OVR */}
      {history.length >= 2 && (
        <div className="fc-card" style={{ padding: "var(--fc-space-4) var(--fc-space-5)" }}>
          <h2 style={{
            fontFamily: "var(--fc-font-display)", fontWeight: 700,
            fontSize: "var(--fc-text-md)", color: "var(--fc-text)",
            marginBottom: "var(--fc-space-3)",
          }}>
            Progression OVR
          </h2>
          <OvrProgressChart history={history} />
        </div>
      )}

      {/* Historique des saisons */}
      {summaries.length > 0 && (
        <div>
          <h2 style={{
            fontFamily: "var(--fc-font-display)", fontWeight: 700,
            fontSize: "var(--fc-text-md)", color: "var(--fc-text)",
            marginBottom: "var(--fc-space-3)",
          }}>
            Saisons passées
          </h2>
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-3)" }}
          >
            {[...summaries].reverse().map(s => (
              <SeasonCard key={s.season} summary={s} clubs={clubs} />
            ))}
          </motion.div>
        </div>
      )}

      {summaries.length === 0 && (
        <div className="fc-card" style={{
          padding: "var(--fc-space-8)",
          textAlign: "center",
        }}>
          <p style={{ fontSize: "var(--fc-text-xl)", marginBottom: "var(--fc-space-2)" }}>⚽</p>
          <p style={{ color: "var(--fc-text-3)", fontSize: "var(--fc-text-sm)" }}>
            L'histoire commence maintenant.
          </p>
          <p style={{ color: "var(--fc-text-3)", fontSize: "var(--fc-text-xs)", marginTop: "var(--fc-space-1)" }}>
            Jouez des matchs et terminez une saison pour voir votre bilan.
          </p>
        </div>
      )}

      <div style={{ height: "var(--fc-space-8)" }} />
    </motion.div>
  );
}
