"use client";

/** FC CAREER 27 — Mode Manager : coquille (en-tête club, onglets, notifications). */

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useManager } from "./ManagerContext";
import { Crest } from "./kit";
import { formatMoney, getManagedClub } from "../../game/manager/engine";
import { isWindowOpen } from "../../game/manager/market";

const BASE = "/client/fc-career/manager";
const TABS = [
  { href: BASE, label: "Accueil" },
  { href: `${BASE}/effectif`, label: "Effectif" },
  { href: `${BASE}/tactique`, label: "Tactique" },
  { href: `${BASE}/match`, label: "Match" },
  { href: `${BASE}/competition`, label: "Compétition" },
  { href: `${BASE}/mercato`, label: "Mercato" },
  { href: `${BASE}/finances`, label: "Finances" },
  { href: `${BASE}/club`, label: "Club" },
  { href: `${BASE}/messages`, label: "Messages" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const { state, ready, loadProblem, toasts } = useManager();
  const pathname = usePathname();
  const onNewGame = pathname === `${BASE}/nouvelle`;
  const appRef = useRef<HTMLDivElement>(null);

  // Les onglets collent sous l'en-tête collant du site chifpam (hauteur variable)
  useEffect(() => {
    const host = document.querySelector<HTMLElement>("header.sticky");
    const app = appRef.current;
    if (!host || !app) return;
    const update = () => {
      const top = parseFloat(getComputedStyle(host).top) || 0;
      app.style.setProperty("--mg-sticky-top", `${Math.round(top + host.offsetHeight + 8)}px`);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  let body: React.ReactNode = children;
  if (!ready) body = <div className="mg-center"><p className="mg-muted">Chargement de la partie…</p></div>;
  else if (!state && !onNewGame) body = <NoGame problem={loadProblem} />;

  const club = state ? getManagedClub(state) : undefined;
  const unread = state?.inbox.filter(m => !m.read).length ?? 0;

  return (
    <div className="mg-app" ref={appRef}>
      {state && club && !onNewGame && (
        <>
          <header className="mg-top" style={{ ["--club" as string]: club.colors.primary }}>
            <div className="mg-top__club">
              <Crest club={club} size={34} />
              <div className="mg-top__id">
                <strong>{club.name}</strong>
                <span>Saison {state.world.season} · semaine {state.world.currentWeek} · {state.managerName}</span>
              </div>
            </div>
            <dl className="mg-top__kpis">
              <div><dt>Trésorerie</dt><dd className={state.finances.balance < 0 ? "is-neg" : ""}>{formatMoney(state.finances.balance)}</dd></div>
              <div><dt>Transferts</dt><dd>{formatMoney(state.finances.transferBudget)}</dd></div>
              <div><dt>Mercato</dt><dd className={isWindowOpen(state) ? "is-open" : "is-closed"}>{isWindowOpen(state) ? "Ouvert" : "Fermé"}</dd></div>
            </dl>
          </header>
          <nav className="mg-tabs" aria-label="Sections du mode manager">
            {TABS.map(t => {
              const active = t.href === BASE ? pathname === BASE : pathname.startsWith(t.href);
              return (
                <Link key={t.href} href={t.href} className={`mg-tab${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined}>
                  {t.label}
                  {t.label === "Messages" && unread > 0 && <span className="mg-tab__badge">{unread}</span>}
                </Link>
              );
            })}
            <Link href="/client/fc-career/modes" className="mg-tab mg-tab--exit">Changer de mode</Link>
          </nav>
        </>
      )}
      <main className="mg-main">{body}</main>
      <div className="mg-toasts" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`mg-toast ${t.ok ? "is-ok" : "is-err"}`}>{t.text}</div>
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
        <Link href="/client/fc-career/modes" className="mg-link">Retour au choix du mode</Link>
      </div>
    </div>
  );
}
