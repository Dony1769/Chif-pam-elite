"use client";

/**
 * FC CAREER — Page : Paramètres & Sauvegarde
 * Sauvegarde manuelle, backup, et effacement complet de carrière.
 */

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useGame }  from "../game/hooks/useGame";
import { Button }   from "../game/components/Button";
import { Spinner }  from "../game/components/LoadingState";
import { useToast } from "../game/components/Toast";
import { pageFade, itemFade, stagger } from "../game/design/animations";
import {
  selectPlayer, selectCareer, selectIsLoading, selectHasSave,
} from "../game/state/selectors";
import { writeSave, deleteSave, backupSave } from "../game/persistence/saveRepository";

/* ── Utilitaires ────────────────────────────────────────────────── */

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function estimateSize(obj: unknown): string {
  try {
    const bytes = new TextEncoder().encode(JSON.stringify(obj)).length;
    if (bytes < 1024) return `${bytes} o`;
    return `${(bytes / 1024).toFixed(1)} Ko`;
  } catch {
    return "—";
  }
}

/* ── Modale de confirmation d'effacement ────────────────────────── */

function EraseConfirmModal({
  playerName,
  onConfirm,
  onCancel,
}: {
  playerName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [input, setInput] = useState("");
  const required = "EFFACER";
  const canConfirm = input.trim().toUpperCase() === required;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "var(--fc-space-5)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        style={{
          background: "var(--fc-surface)",
          border: "1px solid #ef444440",
          borderRadius: "var(--fc-radius-lg)",
          padding: "var(--fc-space-6)",
          maxWidth: 380,
          width: "100%",
        }}
      >
        <div style={{ fontSize: "2rem", marginBottom: "var(--fc-space-3)", textAlign: "center" }}>⚠️</div>
        <h2 style={{
          fontFamily: "var(--fc-font-display)", fontWeight: 800,
          fontSize: "var(--fc-text-lg)", color: "#ef4444",
          textAlign: "center", marginBottom: "var(--fc-space-3)",
        }}>
          Effacer la carrière de {playerName} ?
        </h2>
        <p style={{
          fontSize: "var(--fc-text-sm)", color: "var(--fc-text-2)",
          textAlign: "center", marginBottom: "var(--fc-space-4)",
          lineHeight: 1.5,
        }}>
          Cette action est <strong style={{ color: "#ef4444" }}>irréversible</strong>.
          Toute la progression, les stats et l'historique seront perdus définitivement.
        </p>

        <div style={{ marginBottom: "var(--fc-space-4)" }}>
          <p style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", marginBottom: "var(--fc-space-2)" }}>
            Tapez <strong style={{ color: "var(--fc-text)", letterSpacing: 1 }}>{required}</strong> pour confirmer
          </p>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={required}
            autoFocus
            style={{
              width: "100%",
              background: "var(--fc-surface-2)",
              border: `1px solid ${canConfirm ? "#ef4444" : "var(--fc-border)"}`,
              borderRadius: "var(--fc-radius)",
              color: "var(--fc-text)",
              padding: "var(--fc-space-3)",
              fontSize: "var(--fc-text-sm)",
              fontFamily: "var(--fc-font-display)",
              fontWeight: 700,
              letterSpacing: 2,
              outline: "none",
              transition: "border-color 0.2s",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "var(--fc-space-3)" }}>
          <Button variant="secondary" fullWidth onClick={onCancel}>
            Annuler
          </Button>
          <Button
            variant="danger"
            fullWidth
            disabled={!canConfirm}
            onClick={onConfirm}
          >
            Effacer
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Page principale ─────────────────────────────────────────────── */

export default function SettingsPage() {
  const { state, dispatch } = useGame();
  const router = useRouter();
  const { toast } = useToast();
  const isLoading = selectIsLoading(state);
  const hasSave   = selectHasSave(state);
  const player    = selectPlayer(state);
  const career    = selectCareer(state);

  const [saving,  setSaving]  = useState(false);
  const [showErase, setShowErase] = useState(false);

  /* ── Sauvegarde manuelle ────────────────────────────────────────── */
  const handleSave = useCallback(async () => {
    if (!state.save) return;
    setSaving(true);
    try {
      const updated = {
        ...state.save,
        meta: { ...state.save.meta, savedAt: Date.now() },
      };
      writeSave(updated);
      backupSave(updated);
      dispatch({ type: "SAVE_GAME" });
      toast("✅ Carrière sauvegardée", "success");
    } catch {
      toast("❌ Erreur lors de la sauvegarde", "error");
    } finally {
      setSaving(false);
    }
  }, [state.save, dispatch, toast]);

  /* ── Effacement ─────────────────────────────────────────────────── */
  const handleErase = useCallback(() => {
    deleteSave();
    dispatch({ type: "DELETE_SAVE" });
    toast("🗑️ Carrière effacée", "warning");
    router.push("/fc-career/create-player");
  }, [dispatch, toast, router]);

  if (isLoading) return <Spinner />;

  return (
    <>
      {showErase && player && (
        <EraseConfirmModal
          playerName={`${player.firstName} ${player.lastName}`}
          onConfirm={() => { setShowErase(false); handleErase(); }}
          onCancel={() => setShowErase(false)}
        />
      )}

      <motion.div
        className="fc-page"
        variants={pageFade}
        initial="hidden"
        animate="visible"
      >
        {/* En-tête */}
        <div className="fc-section-header">
          <h1 className="fc-section-title">Paramètres</h1>
          {career && (
            <span className="fc-badge fc-badge--neutral">Saison {career.season}</span>
          )}
        </div>

        {!hasSave ? (
          <div className="fc-card" style={{ padding: "var(--fc-space-8)", textAlign: "center" }}>
            <p style={{ color: "var(--fc-text-3)", fontSize: "var(--fc-text-sm)" }}>
              Aucune carrière active.
            </p>
          </div>
        ) : (
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-4)" }}
          >
            {/* ── Infos de la sauvegarde ───────────────────────── */}
            <motion.div variants={itemFade} className="fc-card" style={{ padding: "var(--fc-space-4) var(--fc-space-5)" }}>
              <h2 style={{
                fontFamily: "var(--fc-font-display)", fontWeight: 700,
                fontSize: "var(--fc-text-md)", color: "var(--fc-text)",
                marginBottom: "var(--fc-space-4)",
              }}>
                Informations
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-2)" }}>
                {[
                  { label: "Joueur",         value: player ? `${player.firstName} ${player.lastName}` : "—" },
                  { label: "Sauvegardée le", value: state.save?.meta.savedAt ? formatDate(state.save.meta.savedAt) : "—" },
                  { label: "Créée le",       value: state.save?.meta.createdAt ? formatDate(state.save.meta.createdAt) : "—" },
                  { label: "Taille estimée", value: estimateSize(state.save) },
                  { label: "Version",        value: `v${state.save?.version ?? 1}` },
                ].map(row => (
                  <div key={row.label} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "var(--fc-space-2) 0",
                    borderBottom: "1px solid var(--fc-border)",
                  }}>
                    <span style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>{row.label}</span>
                    <span style={{ fontSize: "var(--fc-text-sm)", fontWeight: 600, color: "var(--fc-text)" }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* ── Sauvegarde manuelle ─────────────────────────── */}
            <motion.div variants={itemFade} className="fc-card" style={{ padding: "var(--fc-space-4) var(--fc-space-5)" }}>
              <h2 style={{
                fontFamily: "var(--fc-font-display)", fontWeight: 700,
                fontSize: "var(--fc-text-md)", color: "var(--fc-text)",
                marginBottom: "var(--fc-space-2)",
              }}>
                Sauvegarde manuelle
              </h2>
              <p style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", marginBottom: "var(--fc-space-4)", lineHeight: 1.5 }}>
                Le jeu sauvegarde automatiquement après chaque action importante.
                Vous pouvez aussi créer une sauvegarde manuelle à tout moment,
                ainsi qu'une copie de secours.
              </p>
              <Button
                variant="primary"
                fullWidth
                loading={saving}
                onClick={handleSave}
              >
                💾 Sauvegarder maintenant
              </Button>
              {state.isDirty && (
                <p style={{
                  fontSize: "var(--fc-text-xs)", color: "var(--fc-amber)",
                  marginTop: "var(--fc-space-2)", textAlign: "center",
                }}>
                  Des modifications non sauvegardées sont en attente.
                </p>
              )}
            </motion.div>

            {/* ── Zone danger ─────────────────────────────────── */}
            <motion.div
              variants={itemFade}
              className="fc-card"
              style={{
                padding: "var(--fc-space-4) var(--fc-space-5)",
                border: "1px solid rgba(239,68,68,0.25)",
                background: "rgba(239,68,68,0.04)",
              }}
            >
              <h2 style={{
                fontFamily: "var(--fc-font-display)", fontWeight: 700,
                fontSize: "var(--fc-text-md)", color: "#ef4444",
                marginBottom: "var(--fc-space-2)",
              }}>
                Zone dangereuse
              </h2>
              <p style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", marginBottom: "var(--fc-space-4)", lineHeight: 1.5 }}>
                Effacer votre carrière supprime définitivement toutes vos données de jeu.
                Cette action ne peut pas être annulée.
              </p>
              <Button
                variant="danger"
                fullWidth
                onClick={() => setShowErase(true)}
              >
                🗑️ Effacer complètement ma carrière
              </Button>
            </motion.div>
          </motion.div>
        )}

        {/* Espace bas */}
        <div style={{ height: "var(--fc-space-8)" }} />
      </motion.div>
    </>
  );
}
