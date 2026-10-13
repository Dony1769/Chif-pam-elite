"use client";

import { useRef, useState } from "react";
import { ArrowRight, Check, Download, RefreshCcw, Settings, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { Shell, PageTitle } from "../lib/components";
import { Button, Dialog, DialogContent, DialogTitle, DialogDescription } from "../lib/ui";
import { clearAllSaves, loadGame, exportSaveJson, importSaveJson, saveGame } from "../utils/storage";
import { getClub } from "../constants/clubs";

export default function ParametresPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  /* B6: Confirmation modal state */
  const [showResetModal, setShowResetModal] = useState(false);

  const save = loadGame();
  const player = save?.player;
  const club = player ? getClub(player.contract.clubId) : null;

  /* B6: Reset goes through confirmation modal */
  function handleResetRequest() {
    if (!confirmReset) return;
    setShowResetModal(true);
  }

  function confirmAndReset() {
    clearAllSaves();
    setShowResetModal(false);
    setResetDone(true);
    setTimeout(() => {
      router.push("/client/fc-career/create-player");
    }, 800);
  }

  /* B5: Export save as JSON file */
  function handleExport() {
    if (!save) return;
    const json = exportSaveJson(save);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fc-career-save-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setNotice("Sauvegarde exportee avec succes.");
  }

  /* B5: Import save from JSON file */
  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const imported = importSaveJson(text);
      if (imported && imported.player) {
        saveGame(imported);
        setNotice("Sauvegarde importee. Rechargement...");
        setTimeout(() => window.location.reload(), 800);
      } else {
        setNotice("Fichier invalide ou corrompu.");
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  }

  return (
    <Shell>
      <PageTitle
        eyebrow="PARAMETRES"
        title="Gerez votre carriere."
        subtitle="Sauvegarde, preferences et reinitialisation."
      />
      <div style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Info carrière */}
        <section style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, fontFamily: "'Barlow', sans-serif" }}>
            <Settings size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />
            Carriere en cours
          </h2>
          {player ? (
            <div style={{ fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 2 }}>
              <div>Joueur : <strong style={{ color: 'var(--foreground)' }}>{player.firstName} {player.lastName}</strong></div>
              <div>Club : <strong style={{ color: 'var(--foreground)' }}>{club?.name ?? 'Inconnu'}</strong></div>
              <div>Overall : <strong style={{ color: 'var(--foreground)' }}>{player.overall}</strong></div>
              <div>Saison : <strong style={{ color: 'var(--foreground)' }}>{save?.meta?.season?.seasonYear ?? '—'}</strong></div>
              <div>Sauvegarde : <strong style={{ color: 'var(--foreground)' }}>localStorage</strong></div>
            </div>
          ) : (
            <p style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>Aucune carriere en cours.</p>
          )}
        </section>

        {/* B5: Export / Import */}
        <section style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, fontFamily: "'Barlow', sans-serif" }}>
            <Download size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />
            Sauvegarde manuelle
          </h2>
          <p style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 16, lineHeight: 1.6 }}>
            Exportez votre progression en fichier JSON pour la conserver, ou importez une sauvegarde existante.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Button variant="outline" onClick={handleExport} disabled={!save?.player}>
              <Download size={14} />Exporter la sauvegarde
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload size={14} />Importer une sauvegarde
            </Button>
            <input ref={fileRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
          </div>
        </section>

        {/* Reset with B6 confirmation modal */}
        <section style={{ background: 'var(--card)', border: '1px solid oklch(.55 .2 25 / .3)', borderRadius: 12, padding: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, fontFamily: "'Barlow', sans-serif", color: 'var(--coral, oklch(.75 .18 25))' }}>
            <Trash2 size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />
            Recommencer une carriere
          </h2>
          <p style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 16, lineHeight: 1.6 }}>
            Cela supprimera definitivement votre sauvegarde actuelle et vous redirigera vers la creation de joueur. Cette action est irreversible.
          </p>

          {resetDone ? (
            <p style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>
              <RefreshCcw size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />
              Reinitialisation... Redirection vers la creation.
            </p>
          ) : (
            <>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--muted-foreground)', cursor: 'pointer', marginBottom: 12 }}>
                <input
                  type="checkbox"
                  checked={confirmReset}
                  onChange={e => setConfirmReset(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: 'oklch(.65 .2 25)' }}
                />
                Je confirme vouloir supprimer ma carriere et recommencer.
              </label>
              <Button variant="career" className="full-width" disabled={!confirmReset} onClick={handleResetRequest}
                style={confirmReset ? { background: 'linear-gradient(135deg, oklch(.6 .2 25), oklch(.55 .18 15))' } : undefined}
              >
                Recommencer depuis zero <ArrowRight />
              </Button>
            </>
          )}
        </section>

        {/* Version */}
        <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--muted-foreground)', paddingTop: 8 }}>
          FC CAREER v2.0 · Sauvegarde locale · TypeScript strict
        </div>
      </div>

      {/* B6: Confirmation modal */}
      <Dialog open={showResetModal} onOpenChange={setShowResetModal}>
        <DialogContent>
          <DialogTitle>Confirmer la reinitialisation</DialogTitle>
          <DialogDescription>
            Votre sauvegarde sera definitivement supprimee. Cette action est irreversible. Voulez-vous vraiment recommencer ?
          </DialogDescription>
          <div style={{ display: 'flex', gap: 12, marginTop: 16, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowResetModal(false)}>Annuler</Button>
            <Button variant="career" onClick={confirmAndReset}
              style={{ background: 'linear-gradient(135deg, oklch(.6 .2 25), oklch(.55 .18 15))' }}
            >
              <Trash2 size={14} />Supprimer et recommencer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {notice && (
        <div className="toast">
          <Check />{notice}
          <Button variant="ghost" size="icon" aria-label="Fermer" onClick={() => setNotice(null)}>×</Button>
        </div>
      )}
    </Shell>
  );
}
