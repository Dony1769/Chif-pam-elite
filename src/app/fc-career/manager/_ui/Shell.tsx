"use client";

/** FC CAREER 27 — Mode Manager : coquille (en-tête club, onglets, notifications). */

import { Backdrop } from "./Backdrop";
import { CinematicHost } from "./cinematics/CinematicHost";
import React, { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useManager } from "./ManagerContext";
import { Crest } from "./kit";
import { SheetsProvider } from "./PlayerSheet";
import { GameBar, GameNav } from "./GameNav";
import { formatMoney, getManagedClub } from "../../game/manager/engine";
import { isWindowOpen } from "../../game/manager/market";
import { worldCalendar } from "../../game/domain/calendar";

const BASE = "/fc-career/manager";
const TABS = [
  { href: BASE, label: "Accueil", icon: "home" },
  { href: `${BASE}/effectif`, label: "Effectif", icon: "team" },
  { href: `${BASE}/tactique`, label: "Tactique", icon: "board" },
  { href: `${BASE}/match`, label: "Match", icon: "ball" },
  { href: `${BASE}/competition`, label: "Compétition", icon: "trophy" },
  { href: `${BASE}/mercato`, label: "Mercato", icon: "swap" },
  { href: `${BASE}/finances`, label: "Finances", icon: "coin" },
  { href: `${BASE}/club`, label: "Club", icon: "stadium" },
  { href: `${BASE}/messages`, label: "Messages", icon: "mail" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const { state, ready, loadProblem, toasts } = useManager();
  const pathname = usePathname();
  const onNewGame = pathname === `${BASE}/nouvelle`;
  const appRef = useRef<HTMLDivElement>(null);

  // Les onglets collent sous l'en-tête collant du site chifpam (hauteur variable)

  let body: React.ReactNode = children;
  if (!ready) body = <div className="mg-center"><p className="mg-muted">Chargement de la partie…</p></div>;
  else if (!state && !onNewGame) body = <NoGame problem={loadProblem} />;

  const club = state ? getManagedClub(state) : undefined;
  const cal = state ? worldCalendar(state.world) : null;
  const unread = state?.inbox.filter(m => !m.read).length ?? 0;

  return (
    <div className="mg-app" ref={appRef}>
      <Backdrop club={club?.colors.primary} />
      {state && club && <CinematicHost world={state.world} me={{ clubId: club.id }} storageKey={`manager-${state.world.seed}`} />}
      <GameBar />
      {state && club && !onNewGame && (
        <>
          <header className="mg-top" style={{ ["--club" as string]: club.colors.primary }}>
            <div className="mg-top__club">
              <Crest club={club} size={34} />
              <div className="mg-top__id">
                <strong>{club.name}</strong>
                <span>{cal ? `${cal.date} · saison ${cal.season}` : `Saison ${state.world.season} · semaine ${state.world.currentWeek}`} · {state.managerName}</span>
              </div>
            </div>
            <dl className="mg-top__kpis">
              <div><dt>Trésorerie</dt><dd className={state.finances.balance < 0 ? "is-neg" : ""}>{formatMoney(state.finances.balance)}</dd></div>
              <div><dt>Transferts</dt><dd>{formatMoney(state.finances.transferBudget)}</dd></div>
              <div><dt>Mercato</dt><dd className={isWindowOpen(state) ? "is-open" : "is-closed"}>{isWindowOpen(state) ? "Ouvert" : "Fermé"}</dd></div>
            </dl>
          </header>
          <GameNav base={BASE} label="Sections du mode manager"
            items={TABS.map(t => ({ ...t, badge: t.label === "Messages" ? unread : undefined }))} />
        </>
      )}
      <main className="mg-main">
        {state ? <SheetsProvider world={state.world} meClub={club?.id}>{body}</SheetsProvider> : body}
      </main>
      <div className="mg-toasts" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} data-toast-id={t.id} className={`mg-toast ${t.ok ? "is-ok" : "is-err"}`} role={t.ok ? "status" : "alert"}>{t.text}</div>
        ))}
      </div>
    </div>
  );
}

function NoGame({ problem }: { problem: "corrupt" | "unavailable" | null }) {
  return (
    <div className="mg-center">
      <div className="mg-card mg-nogame">
        <h1>Carrière Manager</h1>
        {problem === "corrupt" && (
          <p className="mg-warn">Votre sauvegarde manager est illisible. Elle n&apos;a pas été effacée : une nouvelle partie l&apos;archivera d&apos;abord dans une copie de secours.</p>
        )}
        {problem === "unavailable" && <p className="mg-warn">Le stockage du navigateur est indisponible (navigation privée ?). La partie ne pourra pas être sauvegardée.</p>}
        <p className="mg-muted">Choisissez un club, fixez votre tactique et menez-le au sommet.</p>
        <Link href={`${BASE}/nouvelle`} className="mg-btn mg-btn--gold">Nouvelle carrière</Link>
        <Link href="/fc-career/modes" className="mg-link">Retour au choix du mode</Link>
      </div>
    </div>
  );
}
