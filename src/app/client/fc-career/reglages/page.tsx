"use client";

/** FC CAREER 27 — Réglages : espace de stockage et réinitialisation complète de carrière. */

import React, { useEffect, useState } from "react";
import { GameBar } from "../manager/_ui/GameNav";
import { resetCareers, storageReport, type ResetScope, type StorageReport } from "../game/persistence/gameStore";
import "../manager/manager.css";

const LABELS: Record<string, string> = {
  "fc-career-v3:player": "Carrière Joueur",
  "fc-career-v3:player:backup": "Carrière Joueur — copie de secours",
  "fc-career-v2:manager": "Carrière Manager",
  "fc-career-v2:manager:backup": "Carrière Manager — copie de secours",
  "fc-career-v2:save": "Ancienne carrière (v1)",
};

const SCOPES: { scope: ResetScope; title: string; text: string }[] = [
  { scope: "player", title: "Réinitialiser la Carrière Joueur", text: "Efface ton joueur et sa copie de secours. Le mode Manager n'est pas touché." },
  { scope: "manager", title: "Réinitialiser la Carrière Manager", text: "Efface ta partie manager et sa copie de secours. La Carrière Joueur n'est pas touchée." },
  { scope: "all", title: "Tout réinitialiser", text: "Efface toutes les carrières (Joueur, Manager, ancienne v1) et toutes les copies de secours." },
];

function fmt(bytes?: number) {
  if (bytes === undefined) return "—";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} Ko`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} Mo`;
  return `${(bytes / 1024 ** 3).toFixed(1)} Go`;
}

export default function ReglagesPage() {
  const [report, setReport] = useState<StorageReport | null>(null);
  const [confirm, setConfirm] = useState<ResetScope | null>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => { storageReport().then(setReport); }, []);

  async function doReset() {
    if (!confirm) return;
    setBusy(true);
    const ok = await resetCareers(confirm);
    setBusy(false);
    setConfirm(null); setTyped("");
    setMsg(ok ? { ok: true, text: "Carrière réinitialisée. Tu peux repartir de zéro." } : { ok: false, text: "La réinitialisation a échoué. Réessaie dans un instant." });
    setReport(await storageReport());
  }

  const total = report ? Object.values(report.sizes).reduce((a, b) => a + b, 0) : 0;
  const active = SCOPES.find(s => s.scope === confirm);

  return (
    <div className="mg-app">
      <GameBar />
      <main className="mg-main" style={{ maxWidth: 760 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900 }}>Réglages</h1>

        <section className="mg-card">
          <header className="mg-card__head"><h2>Stockage</h2></header>
          <p className="mg-muted" style={{ marginTop: 0 }}>
            {report?.backend === "idb"
              ? "Tes carrières sont enregistrées dans la base de données du navigateur (IndexedDB) : bien plus d'espace que l'ancien stockage limité à 5 Mo."
              : report?.backend === "local"
                ? "Ce navigateur ne propose pas IndexedDB : stockage classique limité (~5 Mo)."
                : "Lecture du stockage…"}
          </p>
          {report?.quota !== undefined && (
            <div style={{ display: "grid", gap: 6 }}>
              <div className="mg-storage"><i style={{ width: `${Math.max(1, Math.min(100, ((report.usage ?? 0) / report.quota) * 100))}%` }} /></div>
              <span className="mg-muted" style={{ fontSize: 13 }}>{fmt(report.usage)} utilisés sur {fmt(report.quota)} disponibles</span>
            </div>
          )}
          <dl className="mg-dl" style={{ marginTop: 12 }}>
            {report && Object.keys(report.sizes).length === 0 && <><dt>Aucune sauvegarde</dt><dd>—</dd></>}
            {report && Object.entries(report.sizes).map(([k, v]) => (<React.Fragment key={k}><dt>{LABELS[k] ?? k}</dt><dd>{fmt(v)}</dd></React.Fragment>))}
            {total > 0 && <><dt><b>Total carrières</b></dt><dd>{fmt(total)}</dd></>}
          </dl>
        </section>

        <section className="mg-card mg-danger">
          <header className="mg-card__head"><h2>Réinitialiser ma carrière</h2></header>
          <p className="mg-muted" style={{ marginTop: 0 }}>Effacement définitif, sans copie de secours. Il est impossible de revenir en arrière.</p>
          <div style={{ display: "grid", gap: 10 }}>
            {SCOPES.map(s => (
              <div key={s.scope} style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ minWidth: 0, flex: "1 1 260px" }}><b>{s.title}</b><br /><span className="mg-muted" style={{ fontSize: 13 }}>{s.text}</span></div>
                <button type="button" className="mg-btn mg-btn--danger" onClick={() => { setConfirm(s.scope); setTyped(""); setMsg(null); }}>Réinitialiser</button>
              </div>
            ))}
          </div>
          {msg && <p role={msg.ok ? "status" : "alert"} style={{ color: msg.ok ? "var(--mg-accent)" : "#FF6B72", fontWeight: 600 }}>{msg.text}</p>}
        </section>
      </main>

      {active && (
        <>
          <div className="mg-sheet__scrim" style={{ display: "block", zIndex: 70 }} onClick={() => !busy && setConfirm(null)} aria-hidden />
          <div role="dialog" aria-modal="true" aria-labelledby="reset-title" className="mg-card mg-danger"
            style={{ position: "fixed", zIndex: 71, left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: "min(92vw, 420px)", display: "grid", gap: 12 }}>
            <h2 id="reset-title" style={{ fontSize: 18 }}>{active.title}</h2>
            <p className="mg-muted" style={{ margin: 0 }}>{active.text} Tape <b>EFFACER</b> pour confirmer.</p>
            <input autoFocus value={typed} onChange={e => setTyped(e.target.value)} aria-label="Tape EFFACER pour confirmer"
              style={{ minHeight: 44, borderRadius: 12, border: "1px solid var(--mg-line-2)", background: "var(--mg-bg)", color: "var(--mg-text)", padding: "0 12px", fontSize: 16 }} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" className="mg-btn mg-btn--ghost" disabled={busy} onClick={() => setConfirm(null)}>Annuler</button>
              <button type="button" className="mg-btn mg-btn--danger" disabled={busy || typed.trim().toUpperCase() !== "EFFACER"} onClick={doReset}>
                {busy ? "Effacement…" : "Effacer définitivement"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
