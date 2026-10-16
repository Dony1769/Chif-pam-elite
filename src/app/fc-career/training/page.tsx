"use client";

/**
 * FC CAREER — Entraînement
 * Choisir l'intensité de la semaine + investir les PA.
 * N'avance PAS le temps — c'est le Dashboard qui termine la semaine.
 */

import { useState, useCallback, useMemo } from "react";
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

/* ── Types internes ─────────────────────────────────────────────── */

/** Panier de distribution : attribut → nombre de points ajoutés (en attente) */
type InvestCart = Partial<Record<keyof PlayerAttributes, number>>;

/** Calcule le coût total d'ajouter `n` points sur un attribut partant de `base` */
function costForPoints(base: number, n: number): number {
  let total = 0;
  for (let i = 0; i < n; i++) total += paCostForAttribute(base + i);
  return total;
}

/** Coût total du panier par rapport aux attributs courants */
function cartTotalCost(
  cart: InvestCart,
  attributes: PlayerAttributes,
): number {
  return Object.entries(cart).reduce((sum, [k, n]) => {
    const key = k as keyof PlayerAttributes;
    const base = attributes[key] ?? 50;
    return sum + costForPoints(base, n ?? 0);
  }, 0);
}

/* ── Composant principal ─────────────────────────────────────────── */

export default function TrainingPage() {
  const { state, dispatch } = useGame();
  const { toast } = useToast();
  const router = useRouter();

  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [cart, setCart] = useState<InvestCart>({});

  const save      = state.save;
  const player    = save?.player;
  const weekState = save?.weekState;

  const currentIntensity = weekState?.trainingIntensity ?? null;
  const trainingDone     = weekState?.trainingDone ?? false;

  /* — Choisir l'intensité ----------------------------------------- */
  const handleChooseIntensity = useCallback((intensity: "light" | "normal" | "intense") => {
    dispatch({ type: "SET_TRAINING_CHOICE", intensity });
    const labels = { light: "Légère", normal: "Normale", intense: "Intense" };
    toast(`Entraînement ${labels[intensity]} planifié pour cette semaine`, "success");
  }, [dispatch, toast]);

  /* — Panier : ajouter/retirer un point sur un attribut ----------- */
  const addToCart = useCallback((key: keyof PlayerAttributes) => {
    if (!player) return;
    const currentInCart = cart[key] ?? 0;
    const baseVal = player.attributes[key] ?? 50;
    const valAfterCart = baseVal + currentInCart;

    if (valAfterCart >= player.potential) return; // attribut au max

    // Coût du point suivant
    const nextPointCost = paCostForAttribute(valAfterCart);
    // PA restants après le panier actuel
    const paAfterCart = player.paPoints - cartTotalCost(cart, player.attributes);

    if (paAfterCart < nextPointCost) {
      toast("PA insuffisants pour ce point supplémentaire", "error");
      return;
    }

    setCart(prev => ({ ...prev, [key]: (prev[key] ?? 0) + 1 }));
  }, [player, cart, toast]);

  const removeFromCart = useCallback((key: keyof PlayerAttributes) => {
    setCart(prev => {
      const cur = prev[key] ?? 0;
      if (cur <= 0) return prev;
      const next = { ...prev, [key]: cur - 1 };
      if (next[key] === 0) delete next[key];
      return next;
    });
  }, []);

  /* — Confirmer la distribution (tout le panier d'un coup) -------- */
  const confirmCart = useCallback(() => {
    if (!player) return;
    const investments = Object.entries(cart)
      .filter(([, n]) => (n ?? 0) > 0)
      .map(([k, n]) => ({ attribute: k as keyof PlayerAttributes, amount: n ?? 0 }));

    if (investments.length === 0) return;

    dispatch({ type: "BATCH_INVEST_ATTRIBUTES", investments });
    const total = cartTotalCost(cart, player.attributes);
    const lines = investments.map(inv => `${ATTRIBUTE_LABELS[inv.attribute]} +${inv.amount}`).join(", ");
    toast(`${lines} — ${total} PA dépensés`, "success");
    setCart({});
  }, [cart, player, dispatch, toast]);

  /* — Guard ------------------------------------------------------- */
  if (!save || !player) {
    return (
      <div style={{ padding: "var(--fc-space-6)", textAlign: "center", color: "var(--fc-text-2)" }}>
        <p>Aucune sauvegarde.</p>
        <Button variant="primary" onClick={() => router.push("/fc-career/create-player")} style={{ marginTop: "var(--fc-space-4)" }}>
          Nouvelle carrière
        </Button>
      </div>
    );
  }

  const groups    = getAttributeGroups(player.position);
  const condition = player.condition;
  const previewIntensity = currentIntensity ?? "normal";
  const weekDelta = computeWeeklyCondition(condition.fatigue, condition.form, previewIntensity);

  // Section 6 : limiter l'entraînement selon la fatigue
  // Fatigue > 85 → repos obligatoire (seulement "light" possible)
  // Fatigue > 60 → "intense" bloqué
  const isForcedRest   = condition.fatigue > 85;
  const isIntenseBlocked = condition.fatigue > 60;

  const intensityAvailable = (lvl: "light" | "normal" | "intense"): boolean => {
    if (condition.injury) return lvl === "light"; // blessé → light seulement
    if (isForcedRest)     return lvl === "light";
    if (isIntenseBlocked) return lvl !== "intense";
    return true;
  };

  const totalCost  = cartTotalCost(cart, player.attributes);
  const cartSize   = Object.values(cart).reduce((s, n) => s + (n ?? 0), 0);
  const paAfterCart = player.paPoints - totalCost;

  return (
    <motion.div
      variants={pageFade}
      initial="hidden"
      animate="visible"
      style={{ padding: "var(--fc-space-5) var(--fc-space-4)", maxWidth: 680, margin: "0 auto" }}
    >
      {/* Bannière blessure */}
      {condition.injury && (
        <div style={{
          padding: "var(--fc-space-3) var(--fc-space-4)",
          borderRadius: "var(--fc-radius-sm)",
          background: "rgba(255,107,107,0.1)",
          border: "1px solid var(--fc-coral)",
          marginBottom: "var(--fc-space-4)",
          display: "flex", gap: "var(--fc-space-2)", alignItems: "center",
        }}>
          <span>🤕</span>
          <div>
            <p style={{ fontWeight: 700, color: "var(--fc-coral)", fontSize: "var(--fc-text-sm)", margin: 0 }}>
              Blessé — {condition.injury.type}
            </p>
            <p style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", margin: 0 }}>
              Guérison dans ~{condition.injury.daysRemaining} jours · Entraînement limité conseillé
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="fc-page-header">
        <h1 className="fc-page-title">Entraînement</h1>
        <p className="fc-page-meta">
          Saison {save.career.season} · Semaine {save.career.week} ·{" "}
          <span style={{ color: "var(--fc-emerald)" }}>{player.paPoints} PA disponibles</span>
        </p>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="visible">

        {/* ── Condition actuelle ────────────────────────────────────── */}
        <motion.section className="fc-panel" variants={itemFade} style={{ marginBottom: "var(--fc-space-4)" }}>
          <p className="fc-panel__label">Condition physique</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-3)", marginTop: "var(--fc-space-3)" }}>
            <StatBar label="Forme"     value={condition.form}            showValue />
            <StatBar label="Fraîcheur" value={100 - condition.fatigue}   showValue />
            <StatBar label="Moral"     value={condition.morale}          showValue />
          </div>
        </motion.section>

        {/* ── Choix de l'intensité ─────────────────────────────────── */}
        <motion.section className="fc-panel" variants={itemFade} style={{ marginBottom: "var(--fc-space-4)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--fc-space-3)" }}>
            <p className="fc-panel__label" style={{ marginBottom: 0 }}>Intensité de la semaine</p>
            {trainingDone && (
              <span style={{
                fontSize: "var(--fc-text-xs)",
                color: "var(--fc-emerald)",
                fontWeight: 700,
                background: "var(--fc-emerald-10)",
                padding: "2px 8px",
                borderRadius: 99,
              }}>
                ✓ Planifié
              </span>
            )}
          </div>

          {/* Bannière fatigue si repos forcé */}
          {isForcedRest && (
            <div style={{
              padding: "var(--fc-space-2) var(--fc-space-3)",
              borderRadius: "var(--fc-radius-sm)",
              background: "rgba(255,107,107,0.1)",
              border: "1px solid var(--fc-coral)",
              marginBottom: "var(--fc-space-3)",
              fontSize: "var(--fc-text-xs)",
              color: "var(--fc-coral)",
              fontWeight: 600,
            }}>
              😮‍💨 Fatigue extrême ({condition.fatigue}/100) — repos obligatoire. Seule l&apos;intensité légère est disponible.
            </div>
          )}
          {!isForcedRest && isIntenseBlocked && (
            <div style={{
              padding: "var(--fc-space-2) var(--fc-space-3)",
              borderRadius: "var(--fc-radius-sm)",
              background: "rgba(255,170,0,0.1)",
              border: "1px solid var(--fc-amber)",
              marginBottom: "var(--fc-space-3)",
              fontSize: "var(--fc-text-xs)",
              color: "var(--fc-amber)",
              fontWeight: 600,
            }}>
              ⚠️ Fatigue élevée ({condition.fatigue}/100) — entraînement intense déconseillé et bloqué.
            </div>
          )}

          <div style={{ display: "flex", gap: "var(--fc-space-2)" }}>
            {(["light", "normal", "intense"] as const).map(lvl => {
              const cfg = {
                light:   { label: "Légère",  sub: "+1 PA · peu de fatigue",   icon: "🌱" },
                normal:  { label: "Normale", sub: "+2 PA · fatigue modérée",  icon: "⚽" },
                intense: { label: "Intense", sub: "+3 PA · grosse fatigue",   icon: "🔥" },
              }[lvl];
              const active    = currentIntensity === lvl;
              const available = intensityAvailable(lvl);
              return (
                <button
                  key={lvl}
                  onClick={() => available && handleChooseIntensity(lvl)}
                  disabled={!available}
                  style={{
                    flex: 1,
                    padding: "var(--fc-space-3) var(--fc-space-2)",
                    borderRadius: "var(--fc-radius)",
                    border: `2px solid ${active ? "var(--fc-emerald)" : available ? "var(--fc-border-mid)" : "var(--fc-border)"}`,
                    background: active ? "var(--fc-emerald-10)" : available ? "var(--fc-surface-3)" : "var(--fc-surface-2)",
                    cursor: available ? "pointer" : "not-allowed",
                    textAlign: "center",
                    transition: "border-color 0.15s, background 0.15s",
                    opacity: available ? 1 : 0.4,
                  }}
                >
                  <div style={{ fontSize: "1.4rem", marginBottom: 4 }}>{cfg.icon}</div>
                  <div style={{
                    fontSize: "var(--fc-text-sm)",
                    fontWeight: 700,
                    color: active ? "var(--fc-emerald)" : available ? "var(--fc-text)" : "var(--fc-text-3)",
                  }}>
                    {cfg.label}
                  </div>
                  <div style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", marginTop: 2 }}>
                    {available ? cfg.sub : "Indisponible"}
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
            <span>Fatigue <span style={{ color: "var(--fc-coral)" }}>+{weekDelta.fatigueGain}</span></span>
            <span>Forme <span style={{ color: weekDelta.formDelta >= 0 ? "var(--fc-emerald)" : "var(--fc-coral)" }}>
              {weekDelta.formDelta >= 0 ? "+" : ""}{weekDelta.formDelta}
            </span></span>
            <span>Moral <span style={{ color: weekDelta.moraleDelta >= 0 ? "var(--fc-emerald)" : "var(--fc-coral)" }}>
              {weekDelta.moraleDelta >= 0 ? "+" : ""}{weekDelta.moraleDelta}
            </span></span>
            <span>PA <span style={{ color: "var(--fc-emerald)" }}>+{weekDelta.paGained}</span></span>
          </div>

          {/* Retour au Dashboard */}
          <Button
            variant="secondary"
            fullWidth
            onClick={() => router.push("/fc-career/dashboard")}
            style={{ marginTop: "var(--fc-space-4)" }}
          >
            ← Retour au tableau de bord
          </Button>

          {!trainingDone && (
            <p style={{
              marginTop: "var(--fc-space-2)",
              fontSize: "var(--fc-text-xs)",
              color: "var(--fc-text-3)",
              textAlign: "center",
            }}>
              Choisissez une intensité ci-dessus pour planifier votre entraînement de la semaine
            </p>
          )}
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
              animate={{ boxShadow: ["0 0 0px rgba(55,217,154,0)", "0 0 20px rgba(55,217,154,0.4)", "0 0 0px rgba(55,217,154,0)"] }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              style={{
                fontSize: "var(--fc-text-sm)", fontWeight: 800,
                color: "var(--fc-emerald)", fontFamily: "var(--fc-font-display)",
              }}
            >
              {player.paPoints} PA
            </motion.span>
          </div>

          {/* Info panier courant */}
          <AnimatePresence>
            {cartSize > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                style={{
                  marginBottom: "var(--fc-space-3)",
                  padding: "var(--fc-space-3) var(--fc-space-4)",
                  background: "var(--fc-emerald-10)",
                  border: "1px solid rgba(55,217,154,0.3)",
                  borderRadius: "var(--fc-radius)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "var(--fc-space-3)",
                }}
              >
                <div>
                  <div style={{ fontSize: "var(--fc-text-sm)", fontWeight: 700, color: "var(--fc-emerald)" }}>
                    {cartSize} point{cartSize > 1 ? "s" : ""} sélectionné{cartSize > 1 ? "s" : ""} · {totalCost} PA
                  </div>
                  <div style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", marginTop: 2 }}>
                    Il vous restera {paAfterCart} PA après confirmation
                  </div>
                </div>
                <div style={{ display: "flex", gap: "var(--fc-space-2)" }}>
                  <button
                    onClick={() => setCart({})}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "var(--fc-radius-sm)",
                      border: "1px solid var(--fc-border)",
                      background: "var(--fc-surface-2)",
                      color: "var(--fc-text-2)",
                      fontSize: "var(--fc-text-xs)",
                      cursor: "pointer",
                    }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={confirmCart}
                    style={{
                      padding: "4px 14px",
                      borderRadius: "var(--fc-radius-sm)",
                      border: "none",
                      background: "var(--fc-emerald)",
                      color: "#000",
                      fontSize: "var(--fc-text-xs)",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Confirmer
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {groups.map(group => (
            <AttributeGroupPanel
              key={group.id}
              group={group}
              attributes={player.attributes}
              potential={player.potential}
              paLeft={paAfterCart}
              cart={cart}
              expanded={expandedGroup === group.id}
              onToggle={() => setExpandedGroup(prev => prev === group.id ? null : group.id)}
              onAdd={addToCart}
              onRemove={removeFromCart}
            />
          ))}
        </motion.section>
      </motion.div>
    </motion.div>
  );
}

/* ── Panneau d'un groupe d'attributs ─────────────────────────────── */

function AttributeGroupPanel({
  group, attributes, potential, paLeft, cart, expanded, onToggle, onAdd, onRemove,
}: {
  group: AttributeGroup;
  attributes: PlayerAttributes;
  potential: number;
  paLeft: number;
  cart: InvestCart;
  expanded: boolean;
  onToggle: () => void;
  onAdd: (key: keyof PlayerAttributes) => void;
  onRemove: (key: keyof PlayerAttributes) => void;
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
    <div className="fc-panel" style={{ marginBottom: "var(--fc-space-3)", overflow: "hidden" }}>
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
          <span style={{ fontFamily: "var(--fc-font-display)", fontWeight: 800, fontSize: "var(--fc-text-lg)", color: colorVar }}>
            {avg}
          </span>
          <span style={{
            fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease", display: "inline-block",
          }}>▾</span>
        </div>
      </button>

      <div style={{ marginTop: "var(--fc-space-2)" }}>
        <StatBar label="" value={avg} />
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ marginTop: "var(--fc-space-4)", display: "flex", flexDirection: "column", gap: "var(--fc-space-3)" }}>
              {group.keys.map(key => {
                const baseVal     = attributes[key] ?? 50;
                const inCart      = cart[key] ?? 0;
                const displayVal  = baseVal + inCart;
                const atPotential = displayVal >= potential;
                const nextCost    = paCostForAttribute(displayVal);
                const canAdd      = !atPotential && paLeft >= nextCost;

                return (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: "var(--fc-space-2)" }}>
                    <div style={{ flex: 1 }}>
                      <StatBar
                        label={ATTRIBUTE_LABELS[key]}
                        value={displayVal}
                        showValue
                        // léger highlight si modifié
                      />
                    </div>

                    {/* Indicateur de points ajoutés */}
                    {inCart > 0 && (
                      <span style={{
                        fontSize: "var(--fc-text-xs)", fontWeight: 800,
                        color: "var(--fc-emerald)",
                        minWidth: 24, textAlign: "center",
                      }}>
                        +{inCart}
                      </span>
                    )}

                    {/* Bouton retirer */}
                    <button
                      onClick={() => onRemove(key)}
                      disabled={inCart === 0}
                      style={{
                        width: 28, height: 28,
                        borderRadius: "var(--fc-radius-sm)",
                        border: `1px solid ${inCart > 0 ? "var(--fc-border)" : "transparent"}`,
                        background: inCart > 0 ? "var(--fc-surface-2)" : "transparent",
                        color: inCart > 0 ? "var(--fc-text-2)" : "var(--fc-text-3)",
                        fontSize: "1rem", fontWeight: 700,
                        cursor: inCart > 0 ? "pointer" : "not-allowed",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      −
                    </button>

                    {/* Bouton ajouter */}
                    <button
                      onClick={() => onAdd(key)}
                      disabled={!canAdd}
                      style={{
                        width: 36, height: 36,
                        borderRadius: "var(--fc-radius-sm)",
                        border: `1px solid ${canAdd ? "var(--fc-emerald)" : "var(--fc-border)"}`,
                        background: canAdd ? "var(--fc-emerald-10)" : "var(--fc-surface-3)",
                        color: canAdd ? "var(--fc-emerald)" : "var(--fc-text-3)",
                        fontSize: "var(--fc-text-xs)", fontWeight: 700,
                        cursor: canAdd ? "pointer" : "not-allowed",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexDirection: "column", lineHeight: 1, gap: 1,
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ fontSize: "0.6rem" }}>{atPotential ? "MAX" : `${nextCost}PA`}</span>
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
