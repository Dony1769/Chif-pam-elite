"use client";

/**
 * FC CAREER — Étape 4 : Entraînement
 * Investissement de PA par attribut + avancement de semaine.
 */

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useGame }   from "../game/hooks/useGame";
import { useToast }  from "../game/components/Toast";
import { Button }    from "../game/components/Button";
import { StatBar }   from "../game/components/StatBar";
import { pageFade, stagger, itemFade } from "../game/design/animations";
import {
  getAttributeGroups,
  paCostForAttribute,
  ATTRIBUTE_LABELS,
  computeWeeklyCondition,
} from "../game/domain/training";
import type { AttributeGroup } from "../game/domain/training";
import type { PlayerAttributes } from "../game/domain/player";
import { writeSave } from "../game/persistence/saveRepository";

/* ── Composant principal ─────────────────────────────────────────── */

export default function TrainingPage() {
  const { state, dispatch } = useGame();
  const { toast } = useToast();
  const router = useRouter();

  const [intensity, setIntensity] = useState<"light" | "normal" | "intense">("normal");
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [pendingInvest, setPendingInvest] = useState<{ key: keyof PlayerAttributes; cost: number } | null>(null);

  const save   = state.save;
  const player = save?.player;

  /* — Avancer la semaine ------------------------------------------ */
  const handleAdvanceWeek = useCallback(() => {
    if (!save || !player) return;

    const delta = computeWeeklyCondition(
      player.condition.fatigue,
      player.condition.form,
      intensity,
    );

    const newFatigue = Math.min(100, player.condition.fatigue + delta.fatigueGain);
    const newForm    = Math.max(1, Math.min(100, player.condition.form + delta.formDelta));
    const newMorale  = Math.max(1, Math.min(100, player.condition.morale + delta.moraleDelta));

    dispatch({ type: "UPDATE_CONDITION", condition: { fatigue: newFatigue, form: newForm, morale: newMorale } });

    // PA gagnés via l'entraînement
    if (delta.paGained > 0) {
      dispatch({ type: "UPDATE_PLAYER", player: { paPoints: player.paPoints + delta.paGained } });
    }

    dispatch({ type: "ADVANCE_WEEK" });

    // Persistance immédiate
    if (state.isDirty || delta.paGained > 0) {
      const updatedSave = {
        ...save,
        player: {
          ...player,
          paPoints: player.paPoints + delta.paGained,
          condition: { ...player.condition, fatigue: newFatigue, form: newForm, morale: newMorale },
        },
        career: { ...save.career, week: save.career.week + 1, matchday: save.career.matchday + 1 },
        wallet: {
          ...save.wallet,
          balance: save.wallet.balance + save.wallet.weeklyWage,
          totalEarned: save.wallet.totalEarned + save.wallet.weeklyWage,
        },
        meta: { ...save.meta, savedAt: Date.now() },
      };
      writeSave(updatedSave);
    }

    const pa = delta.paGained > 0 ? ` +${delta.paGained} PA` : "";
    toast(`Semaine ${save.career.week + 1} — Entraînement ${intensity}${pa}`, "success");
  }, [save, player, intensity, dispatch, state.isDirty, toast]);

  /* — Investir un attribut ---------------------------------------- */
  const handleInvest = useCallback((key: keyof PlayerAttributes) => {
    if (!player) return;
    const currentVal = player.attributes[key];
    const cost = paCostForAttribute(currentVal);
    if (player.paPoints < cost) {
      toast(`PA insuffisants — il faut ${cost} PA`, "error");
      return;
    }
    if (currentVal >= player.potential) {
      toast("Attribut au maximum de votre potentiel", "warning");
      return;
    }
    setPendingInvest({ key, cost });
  }, [player, toast]);

  const confirmInvest = useCallback(() => {
    if (!pendingInvest) return;
    dispatch({ type: "INVEST_ATTRIBUTE", attribute: pendingInvest.key, amount: 1 });
    toast(`${ATTRIBUTE_LABELS[pendingInvest.key]} +1`, "success");
    setPendingInvest(null);
  }, [pendingInvest, dispatch, toast]);

  /* — Guard -------------------------------------------------------- */
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

  const groups = getAttributeGroups(player.position);
  const condition = player.condition;
  const weekDelta = computeWeeklyCondition(condition.fatigue, condition.form, intensity);

  return (
    <motion.div
      variants={pageFade}
      initial="hidden"
      animate="visible"
      style={{ padding: "var(--fc-space-5) var(--fc-space-4)", maxWidth: 680, margin: "0 auto" }}
    >
      {/* Header */}
      <div className="fc-page-header">
        <h1 className="fc-page-title">Entraînement</h1>
        <p className="fc-page-meta">
          Saison {save.career.season} · Semaine {save.career.week} ·{" "}
          <span style={{ color: "var(--fc-emerald)" }}>{player.paPoints} PA disponibles</span>
        </p>
      </div>

      {/* ── Condition actuelle ──────────────────────────────────────── */}
      <motion.div variants={stagger} initial="hidden" animate="visible">
        <motion.section className="fc-panel" variants={itemFade} style={{ marginBottom: "var(--fc-space-4)" }}>
          <p className="fc-panel__label">Condition physique</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-3)", marginTop: "var(--fc-space-3)" }}>
            <StatBar label="Forme"     value={condition.form}            showValue />
            <StatBar label="Fraîcheur" value={100 - condition.fatigue}   showValue />
            <StatBar label="Moral"     value={condition.morale}          showValue />
          </div>
        </motion.section>

        {/* ── Intensité d'entraînement ─────────────────────────────── */}
        <motion.section className="fc-panel" variants={itemFade} style={{ marginBottom: "var(--fc-space-4)" }}>
          <p className="fc-panel__label">Intensité de la semaine</p>
          <div style={{ display: "flex", gap: "var(--fc-space-2)", marginTop: "var(--fc-space-3)" }}>
            {(["light", "normal", "intense"] as const).map(lvl => {
              const cfg = {
                light:   { label: "Légère",   sub: "+1 PA · peu de fatigue",  icon: "🌱" },
                normal:  { label: "Normale",  sub: "+2 PA · fatigue modérée", icon: "⚽" },
                intense: { label: "Intense",  sub: "+3 PA · grosse fatigue",  icon: "🔥" },
              }[lvl];
              const active = intensity === lvl;
              return (
                <button
                  key={lvl}
                  onClick={() => setIntensity(lvl)}
                  style={{
                    flex: 1,
                    padding: "var(--fc-space-3) var(--fc-space-2)",
                    borderRadius: "var(--fc-radius)",
                    border: `1px solid ${active ? "var(--fc-emerald)" : "var(--fc-border-mid)"}`,
                    background: active ? "var(--fc-emerald-10)" : "var(--fc-surface-3)",
                    cursor: "pointer",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "1.4rem", marginBottom: 4 }}>{cfg.icon}</div>
                  <div style={{
                    fontSize: "var(--fc-text-sm)",
                    fontWeight: 700,
                    color: active ? "var(--fc-emerald)" : "var(--fc-text)",
                  }}>
                    {cfg.label}
                  </div>
                  <div style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", marginTop: 2 }}>
                    {cfg.sub}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Preview impact */}
          <div style={{
            marginTop: "var(--fc-space-3)",
            padding: "var(--fc-space-2) var(--fc-space-3)",
            borderRadius: "var(--fc-radius-sm)",
            background: "var(--fc-surface-2)",
            fontSize: "var(--fc-text-xs)",
            color: "var(--fc-text-2)",
            display: "flex",
            gap: "var(--fc-space-4)",
          }}>
            <span>
              Fatigue <span style={{ color: "var(--fc-coral)" }}>+{weekDelta.fatigueGain}</span>
            </span>
            <span>
              Forme <span style={{ color: weekDelta.formDelta >= 0 ? "var(--fc-emerald)" : "var(--fc-coral)" }}>
                {weekDelta.formDelta >= 0 ? "+" : ""}{weekDelta.formDelta}
              </span>
            </span>
            <span>
              Moral <span style={{ color: weekDelta.moraleDelta >= 0 ? "var(--fc-emerald)" : "var(--fc-coral)" }}>
                {weekDelta.moraleDelta >= 0 ? "+" : ""}{weekDelta.moraleDelta}
              </span>
            </span>
            <span>
              PA <span style={{ color: "var(--fc-emerald)" }}>+{weekDelta.paGained}</span>
            </span>
          </div>

          <Button
            variant="primary"
            fullWidth
            size="lg"
            onClick={handleAdvanceWeek}
            style={{ marginTop: "var(--fc-space-4)" }}
          >
            Passer la semaine →
          </Button>
        </motion.section>

        {/* ── Investir les PA ──────────────────────────────────────── */}
        <motion.section variants={itemFade}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "var(--fc-space-3)",
          }}>
            <h2 style={{ fontSize: "var(--fc-text-base)", fontWeight: 700, color: "var(--fc-text)" }}>
              Investir les PA
            </h2>
            <motion.span
              key={player.paPoints}
              animate={{
                boxShadow: [
                  "0 0 0px rgba(55,217,154,0)",
                  "0 0 20px rgba(55,217,154,0.4)",
                  "0 0 0px rgba(55,217,154,0)",
                ],
              }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              style={{
                fontSize: "var(--fc-text-sm)",
                fontWeight: 800,
                color: "var(--fc-emerald)",
                fontFamily: "var(--fc-font-display)",
              }}
            >
              {player.paPoints} PA
            </motion.span>
          </div>

          {groups.map(group => (
            <AttributeGroupPanel
              key={group.id}
              group={group}
              attributes={player.attributes}
              potential={player.potential}
              paPoints={player.paPoints}
              expanded={expandedGroup === group.id}
              onToggle={() => setExpandedGroup(prev => prev === group.id ? null : group.id)}
              onInvest={handleInvest}
            />
          ))}
        </motion.section>
      </motion.div>

      {/* ── Modal confirmation investissement ────────────────────── */}
      <AnimatePresence>
        {pendingInvest && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPendingInvest(null)}
              style={{
                position: "fixed", inset: 0, zIndex: "var(--fc-z-modal)",
                background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
              }}
            />
            <motion.div
              key="sheet"
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              style={{
                position: "fixed", bottom: 0, left: 0, right: 0,
                zIndex: "var(--fc-z-modal)",
                background: "var(--fc-surface-1)",
                borderTopLeftRadius: "var(--fc-radius-lg)",
                borderTopRightRadius: "var(--fc-radius-lg)",
                padding: "var(--fc-space-6) var(--fc-space-5)",
                maxWidth: 480,
                margin: "0 auto",
              }}
            >
              <p style={{ fontWeight: 700, fontSize: "var(--fc-text-lg)", marginBottom: "var(--fc-space-2)" }}>
                Investir {pendingInvest.cost} PA ?
              </p>
              <p style={{ color: "var(--fc-text-2)", fontSize: "var(--fc-text-sm)", marginBottom: "var(--fc-space-5)" }}>
                <strong style={{ color: "var(--fc-emerald)" }}>{ATTRIBUTE_LABELS[pendingInvest.key]}</strong> +1 point
                &nbsp;·&nbsp;{player.paPoints - pendingInvest.cost} PA restants
              </p>
              <div style={{ display: "flex", gap: "var(--fc-space-3)" }}>
                <Button variant="ghost" fullWidth onClick={() => setPendingInvest(null)}>Annuler</Button>
                <Button variant="primary" fullWidth onClick={confirmInvest}>Confirmer</Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Panneau d'un groupe d'attributs ─────────────────────────────── */

function AttributeGroupPanel({
  group, attributes, potential, paPoints, expanded, onToggle, onInvest,
}: {
  group: AttributeGroup;
  attributes: PlayerAttributes;
  potential: number;
  paPoints: number;
  expanded: boolean;
  onToggle: () => void;
  onInvest: (key: keyof PlayerAttributes) => void;
}) {
  const avg = Math.round(
    group.keys.reduce((s, k) => s + attributes[k], 0) / group.keys.length,
  );

  const colorVar = ({
    emerald: "var(--fc-emerald)",
    amber:   "var(--fc-amber)",
    coral:   "var(--fc-coral)",
    sky:     "var(--fc-sky, #38bdf8)",
  } as Record<string, string>)[group.color] ?? "var(--fc-emerald)";

  return (
    <div
      className="fc-panel"
      style={{ marginBottom: "var(--fc-space-3)", overflow: "hidden" }}
    >
      {/* Header du groupe */}
      <button
        onClick={onToggle}
        style={{
          width: "100%", display: "flex", alignItems: "center",
          justifyContent: "space-between", background: "none",
          border: "none", cursor: "pointer", padding: 0,
        }}
      >
        <span style={{ fontWeight: 700, color: "var(--fc-text)", fontSize: "var(--fc-text-sm)" }}>
          {group.label}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--fc-space-3)" }}>
          <span style={{
            fontFamily: "var(--fc-font-display)",
            fontWeight: 800,
            fontSize: "var(--fc-text-lg)",
            color: colorVar,
          }}>
            {avg}
          </span>
          <span style={{
            fontSize: "var(--fc-text-xs)",
            color: "var(--fc-text-3)",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
            display: "inline-block",
          }}>
            ▾
          </span>
        </div>
      </button>

      {/* Barre globale du groupe */}
      <div style={{ marginTop: "var(--fc-space-2)" }}>
        <StatBar label="" value={avg} />
      </div>

      {/* Attributs individuels (expandable) */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ marginTop: "var(--fc-space-4)", display: "flex", flexDirection: "column", gap: "var(--fc-space-3)" }}>
              {group.keys.map(key => {
                const val  = attributes[key];
                const cost = paCostForAttribute(val);
                const canAfford  = paPoints >= cost;
                const atPotential = val >= potential;

                return (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: "var(--fc-space-3)" }}>
                    <div style={{ flex: 1 }}>
                      <StatBar
                        label={ATTRIBUTE_LABELS[key]}
                        value={val}
                        showValue
                      />
                    </div>
                    <button
                      onClick={() => onInvest(key)}
                      disabled={!canAfford || atPotential}
                      style={{
                        flexShrink: 0,
                        width: 40,
                        height: 36,
                        borderRadius: "var(--fc-radius-sm)",
                        border: `1px solid ${canAfford && !atPotential ? "var(--fc-emerald)" : "var(--fc-border)"}`,
                        background: canAfford && !atPotential ? "var(--fc-emerald-10)" : "var(--fc-surface-3)",
                        color: canAfford && !atPotential ? "var(--fc-emerald)" : "var(--fc-text-3)",
                        fontSize: "var(--fc-text-xs)",
                        fontWeight: 700,
                        cursor: canAfford && !atPotential ? "pointer" : "not-allowed",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexDirection: "column",
                        lineHeight: 1,
                        gap: 1,
                      }}
                    >
                      <span style={{ fontSize: "0.65rem" }}>{atPotential ? "MAX" : `${cost}PA`}</span>
                      <span style={{ fontSize: "0.9rem" }}>{atPotential ? "✓" : "+"}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
