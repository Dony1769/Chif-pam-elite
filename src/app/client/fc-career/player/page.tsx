"use client";

/**
 * FC CAREER — Étape 6 : Fiche joueur
 * Profil complet : identité, OVR/potentiel, tous les attributs par famille,
 * condition, stats de carrière, historique de progression.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useGame }  from "../game/hooks/useGame";
import { Button }   from "../game/components/Button";
import { StatBar }  from "../game/components/StatBar";
import { pageFade, stagger, itemFade } from "../game/design/animations";
import { positionFamily } from "../game/domain/player";
import { ATTRIBUTE_GROUPS, GK_ATTRIBUTE_GROUP, ATTRIBUTE_LABELS } from "../game/domain/training";
import type { PlayerAttributes } from "../game/domain/player";

/* ── Onglets ─────────────────────────────────────────────────────── */
type Tab = "attributs" | "condition" | "stats" | "historique";
const TABS: { id: Tab; label: string }[] = [
  { id: "attributs",  label: "Attributs" },
  { id: "condition",  label: "Condition" },
  { id: "stats",      label: "Stats" },
  { id: "historique", label: "Historique" },
];

/* ── Nationalité → drapeau ───────────────────────────────────────── */
const FLAGS: Record<string, string> = {
  BR:"🇧🇷", FR:"🇫🇷", ES:"🇪🇸", AR:"🇦🇷", DE:"🇩🇪",
  PT:"🇵🇹", NG:"🇳🇬", IT:"🇮🇹", HT:"🇭🇹", SN:"🇸🇳",
  CM:"🇨🇲", MA:"🇲🇦", GB:"🏴󠁧󠁢󠁥󠁮󠁧󠁿", US:"🇺🇸", JP:"🇯🇵",
};

/* ── Composant principal ─────────────────────────────────────────── */

export default function PlayerPage() {
  const { state } = useGame();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("attributs");

  const save   = state.save;
  const player = save?.player;

  if (!save || !player) {
    return (
      <div style={{ padding: "var(--fc-space-6)", textAlign: "center", color: "var(--fc-text-2)" }}>
        <p>Aucune sauvegarde.</p>
        <Button variant="primary" onClick={() => router.push("/client/fc-career/create-player")} style={{ marginTop: "var(--fc-space-4)" }}>
          Nouvelle carrière
        </Button>
      </div>
    );
  }

  const family = positionFamily(player.position);
  const flag   = FLAGS[player.nationality] ?? "🌍";

  return (
    <motion.div
      variants={pageFade}
      initial="hidden"
      animate="visible"
      style={{ padding: "var(--fc-space-5) var(--fc-space-4)", maxWidth: 680, margin: "0 auto" }}
    >
      {/* ── Identité hero ─────────────────────────────────────────── */}
      <motion.div variants={stagger} initial="hidden" animate="visible">
        <motion.div variants={itemFade} style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "var(--fc-space-5)",
          marginBottom: "var(--fc-space-5)",
        }}>
          {/* OVR box */}
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            background: "var(--fc-emerald-10)",
            border: "1px solid rgba(55,217,154,0.3)",
            borderRadius: "var(--fc-radius)",
            padding: "var(--fc-space-3) var(--fc-space-4)",
            minWidth: 80,
          }}>
            <span style={{
              fontFamily: "var(--fc-font-display)",
              fontWeight: 900, fontSize: "2.8rem", lineHeight: 1,
              color: "var(--fc-emerald)",
            }}>
              {player.overall}
            </span>
            <span style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", marginTop: 2 }}>OVR</span>
          </div>

          {/* Identité */}
          <div style={{ flex: 1 }}>
            <h1 style={{
              fontFamily: "var(--fc-font-display)",
              fontWeight: 800, fontSize: "var(--fc-text-2xl)",
              lineHeight: 1.1, color: "var(--fc-text)",
              marginBottom: "var(--fc-space-2)",
            }}>
              {player.firstName}<br />{player.lastName.toUpperCase()}
            </h1>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--fc-space-2)" }}>
              <Badge>{player.position}</Badge>
              <Badge color="amber">{flag} {player.nationality}</Badge>
              <Badge color="surface">{player.foot === "right" ? "Pied D." : player.foot === "left" ? "Pied G." : "Ambidextre"}</Badge>
              <Badge color="surface">{player.heightCm} cm · {player.weightKg} kg</Badge>
            </div>
          </div>
        </motion.div>

        {/* ── Stats rapides ─────────────────────────────────────── */}
        <motion.div variants={itemFade} style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          gap: "var(--fc-space-3)", marginBottom: "var(--fc-space-5)",
        }}>
          <QuickStat label="Potentiel" value={player.potential} accent="emerald" />
          <QuickStat label="Âge" value={player.age} />
          <QuickStat label="PA" value={player.paPoints} accent="amber" />
        </motion.div>

        {/* ── Onglets ───────────────────────────────────────────── */}
        <motion.div variants={itemFade} style={{
          display: "flex", borderBottom: "1px solid var(--fc-border)",
          marginBottom: "var(--fc-space-5)", overflowX: "auto",
        }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "var(--fc-space-2) var(--fc-space-4)",
                background: "none", border: "none",
                borderBottom: `2px solid ${tab === t.id ? "var(--fc-emerald)" : "transparent"}`,
                color: tab === t.id ? "var(--fc-emerald)" : "var(--fc-text-2)",
                fontSize: "var(--fc-text-sm)", fontWeight: 600,
                cursor: "pointer", whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              {t.label}
            </button>
          ))}
        </motion.div>

        {/* ── Contenu de l'onglet ───────────────────────────────── */}
        {tab === "attributs" && (
          <AttributesTab
            attributes={player.attributes}
            position={player.position}
            potential={player.potential}
          />
        )}
        {tab === "condition" && (
          <ConditionTab player={player} />
        )}
        {tab === "stats" && (
          <StatsTab player={player} career={save.career} />
        )}
        {tab === "historique" && (
          <HistoriqueTab player={player} />
        )}
      </motion.div>
    </motion.div>
  );
}

/* ── Badge ────────────────────────────────────────────────────────── */

function Badge({ children, color = "emerald" }: { children: React.ReactNode; color?: "emerald" | "amber" | "surface" }) {
  const colors = {
    emerald: { bg: "var(--fc-emerald-10)", border: "rgba(55,217,154,0.25)", text: "var(--fc-emerald)" },
    amber:   { bg: "var(--fc-amber-10)",   border: "rgba(245,189,88,0.25)",  text: "var(--fc-amber)" },
    surface: { bg: "var(--fc-surface-3)",  border: "var(--fc-border)",       text: "var(--fc-text-2)" },
  }[color];

  return (
    <span style={{
      fontSize: "var(--fc-text-xs)", fontWeight: 700,
      padding: "3px 8px", borderRadius: 99,
      background: colors.bg, border: `1px solid ${colors.border}`,
      color: colors.text,
    }}>
      {children}
    </span>
  );
}

/* ── QuickStat ────────────────────────────────────────────────────── */

function QuickStat({ label, value, accent }: { label: string; value: number; accent?: "emerald" | "amber" }) {
  const color = accent === "emerald" ? "var(--fc-emerald)" : accent === "amber" ? "var(--fc-amber)" : "var(--fc-text)";
  return (
    <div style={{
      background: "var(--fc-surface-2)",
      border: "1px solid var(--fc-border)",
      borderRadius: "var(--fc-radius)",
      padding: "var(--fc-space-3)",
      textAlign: "center",
    }}>
      <div style={{
        fontFamily: "var(--fc-font-display)",
        fontWeight: 800, fontSize: "var(--fc-text-xl)", color,
      }}>{value}</div>
      <div style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>{label}</div>
    </div>
  );
}

/* ── Onglet : Attributs ───────────────────────────────────────────── */

function AttributesTab({ attributes, position, potential }: {
  attributes: PlayerAttributes;
  position: string;
  potential: number;
}) {
  const groups = position === "GK"
    ? [GK_ATTRIBUTE_GROUP, ATTRIBUTE_GROUPS[1], ATTRIBUTE_GROUPS[2]]
    : ATTRIBUTE_GROUPS;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-4)" }}>
      {groups.map(group => {
        const avg = Math.round(group.keys.reduce((s, k) => s + (attributes[k as keyof PlayerAttributes] ?? 0), 0) / group.keys.length);
        return (
          <div key={group.id} className="fc-panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--fc-space-3)" }}>
              <span style={{ fontSize: "var(--fc-text-sm)", fontWeight: 700, color: "var(--fc-text)" }}>{group.label}</span>
              <span style={{
                fontFamily: "var(--fc-font-display)", fontWeight: 800,
                fontSize: "var(--fc-text-lg)", color: "var(--fc-emerald)",
              }}>{avg}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-2)" }}>
              {group.keys.map(key => {
                const atKey = key as keyof PlayerAttributes;
                const val = attributes[atKey] ?? 0;
                const atPot = val >= potential;
                return (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: "var(--fc-space-2)" }}>
                    <div style={{ flex: 1 }}>
                      <StatBar label={ATTRIBUTE_LABELS[atKey]} value={val} showValue />
                    </div>
                    {atPot && (
                      <span style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-emerald)", fontWeight: 700 }}>MAX</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Onglet : Condition ───────────────────────────────────────────── */

function ConditionTab({ player }: { player: ReturnType<typeof useGame>["state"]["save"] extends null ? never : NonNullable<ReturnType<typeof useGame>["state"]["save"]>["player"] }) {
  const c = player.condition;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-4)" }}>
      <div className="fc-panel">
        <p className="fc-panel__label">État physique & mental</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-3)", marginTop: "var(--fc-space-3)" }}>
          <StatBar label="Forme"     value={c.form}           showValue />
          <StatBar label="Fraîcheur" value={100 - c.fatigue}  showValue />
          <StatBar label="Moral"     value={c.morale}         showValue />
        </div>
      </div>

      {c.injury ? (
        <div className="fc-panel" style={{ borderColor: "rgba(241,107,115,0.3)" }}>
          <p className="fc-panel__label" style={{ color: "var(--fc-coral)" }}>Blessure active</p>
          <p style={{ fontSize: "var(--fc-text-sm)", color: "var(--fc-text)", marginTop: "var(--fc-space-2)" }}>
            {c.injury.type} — Sévérité : <strong>{c.injury.severity}</strong>
          </p>
          <p style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", marginTop: "var(--fc-space-1)" }}>
            {c.injury.daysRemaining} jours restants
          </p>
        </div>
      ) : (
        <div className="fc-panel" style={{ background: "var(--fc-emerald-10)", borderColor: "rgba(55,217,154,0.2)", textAlign: "center" }}>
          <span style={{ fontSize: "1.5rem" }}>✅</span>
          <p style={{ fontSize: "var(--fc-text-sm)", color: "var(--fc-emerald)", fontWeight: 600, marginTop: "var(--fc-space-1)" }}>
            En pleine forme — aucune blessure
          </p>
        </div>
      )}

      <div className="fc-panel">
        <p className="fc-panel__label">Contrat</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-2)", marginTop: "var(--fc-space-3)" }}>
          <Row label="Club" value={player.contract.clubId === "academy" ? "Académie" : player.contract.clubId} />
          <Row label="Rôle" value={player.contract.role} />
          <Row label="Salaire" value={`${player.contract.salary} €/sem`} />
          <Row label="Fin de contrat" value={`Saison ${player.contract.endSeason}`} />
        </div>
      </div>
    </div>
  );
}

/* ── Onglet : Stats ───────────────────────────────────────────────── */

function StatsTab({ player, career }: {
  player: NonNullable<ReturnType<typeof useGame>["state"]["save"]>["player"];
  career: NonNullable<ReturnType<typeof useGame>["state"]["save"]>["career"];
}) {
  const s = player.stats;
  const currentSeason = s.seasons.find(ss => ss.season === career.season);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-4)" }}>
      {/* Stats cette saison */}
      {currentSeason ? (
        <div className="fc-panel">
          <p className="fc-panel__label">Saison {career.season}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--fc-space-3)", marginTop: "var(--fc-space-3)" }}>
            <MiniStat label="Matchs"  value={currentSeason.appearances} />
            <MiniStat label="Buts"    value={currentSeason.goals} />
            <MiniStat label="Passes D." value={currentSeason.assists} />
            <MiniStat label="Note moy." value={currentSeason.avgRating.toFixed(1)} />
            <MiniStat label="Minutes" value={currentSeason.minutesPlayed} />
            <MiniStat label="Jaunes"  value={currentSeason.yellowCards} />
          </div>
        </div>
      ) : (
        <div className="fc-panel" style={{ textAlign: "center", color: "var(--fc-text-3)" }}>
          <p>Aucun match joué cette saison.</p>
        </div>
      )}

      {/* Stats de carrière */}
      <div className="fc-panel">
        <p className="fc-panel__label">Carrière totale</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--fc-space-3)", marginTop: "var(--fc-space-3)" }}>
          <MiniStat label="Matchs"   value={s.totalAppearances} />
          <MiniStat label="Buts"     value={s.totalGoals} accent />
          <MiniStat label="Passes D." value={s.totalAssists} accent />
          <MiniStat label="Minutes"  value={s.totalMinutes} />
          <MiniStat label="Pic OVR"  value={s.peakOverall} />
          <MiniStat label="Cartons R." value={s.totalRedCards} />
        </div>
      </div>
    </div>
  );
}

/* ── Onglet : Historique ──────────────────────────────────────────── */

function HistoriqueTab({ player }: { player: NonNullable<ReturnType<typeof useGame>["state"]["save"]>["player"] }) {
  const history = [...player.progressionHistory].reverse();

  if (history.length === 0) {
    return (
      <div className="fc-panel" style={{ textAlign: "center", color: "var(--fc-text-3)", padding: "var(--fc-space-8)" }}>
        <p style={{ fontSize: "1.5rem", marginBottom: "var(--fc-space-2)" }}>📈</p>
        <p>Aucun historique de progression encore.</p>
        <p style={{ fontSize: "var(--fc-text-sm)", marginTop: "var(--fc-space-1)" }}>
          Jouez des matchs et avancez en saison pour voir évoluer votre carrière.
        </p>
      </div>
    );
  }

  return (
    <div className="fc-panel">
      <p className="fc-panel__label">Progression par saison</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-3)", marginTop: "var(--fc-space-3)" }}>
        {history.map(entry => (
          <div key={entry.season} style={{
            display: "flex", alignItems: "center",
            justifyContent: "space-between",
            padding: "var(--fc-space-2) var(--fc-space-3)",
            background: "var(--fc-surface-2)",
            borderRadius: "var(--fc-radius-sm)",
          }}>
            <span style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>S{entry.season}</span>
            <span style={{ fontFamily: "var(--fc-font-display)", fontWeight: 800, fontSize: "var(--fc-text-lg)", color: "var(--fc-emerald)" }}>
              {entry.overall}
            </span>
            <span style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>
              POT {entry.potential}
            </span>
            <span style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-amber)" }}>
              {entry.paPoints} PA
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Petits composants utilitaires ───────────────────────────────── */

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: "var(--fc-text-sm)", color: "var(--fc-text-2)" }}>{label}</span>
      <span style={{ fontSize: "var(--fc-text-sm)", fontWeight: 600, color: "var(--fc-text)" }}>{value}</span>
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        fontFamily: "var(--fc-font-display)", fontWeight: 800,
        fontSize: "var(--fc-text-xl)",
        color: accent ? "var(--fc-emerald)" : "var(--fc-text)",
      }}>
        {value}
      </div>
      <div style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>{label}</div>
    </div>
  );
}
