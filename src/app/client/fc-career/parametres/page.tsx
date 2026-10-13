"use client";

import { useState } from "react";
import { ArrowRight, RefreshCcw, Settings, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Shell, PageTitle } from "../lib/components";
import { Button } from "../lib/ui";
import { clearAllSaves, loadGame } from "../utils/storage";
import { getClub } from "../constants/clubs";

export default function ParametresPage() {
  const router = useRouter();
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const save = loadGame();
  const player = save?.player;
  const club = player ? getClub(player.contract.clubId) : null;

  function handleReset() {
    if (!confirmReset) return;
    clearAllSaves();
    setResetDone(true);
    setTimeout(() => {
      router.push("/client/fc-career/create-player");
    }, 800);
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

        {/* Reset */}
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
              <Button variant="career" className="full-width" disabled={!confirmReset} onClick={handleReset}
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
    </Shell>
  );
}
