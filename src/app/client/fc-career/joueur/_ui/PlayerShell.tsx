"use client";

/** FC CAREER 27 — Carrière Joueur v2 : coquille (en-tête joueur, onglets, notifications). */

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePlayer } from "./PlayerContext";
import { Crest } from "../../manager/_ui/kit";
import { formatMoney } from "../../game/manager/engine";
import { me, myClub } from "../../game/player2/engine";

const BASE = "/client/fc-career/joueur";
const TABS = [
  { href: BASE, label: "Accueil" },
  { href: `${BASE}/match`, label: "Match" },
  { href: `${BASE}/progression`, label: "Progression" },
  { href: `${BASE}/carriere`, label: "Carrière" },
  { href: `${BASE}/messages`, label: "Messages" },
];

export function PlayerShell({ children }: { children: React.ReactNode }) {
  const { state, ready, loadProblem, toasts } = usePlayer();
  const pathname = usePathname();
  const onNew = pathname === `${BASE}/nouveau`;
  const appRef = useRef<HTMLDivElement>(null);

  // Les onglets collent sous l'en-tête collant du site chifpam
  useEffect(() => {
    const host = document.querySelector<HTMLElement>("header.sticky");
    const app = appRef.current;
    if (!host || !app) return;
    const update = () => app.style.setProperty("--mg-sticky-top", `${Math.round((parseFloat(getComputedStyle(host).top) || 0) + host.offsetHeight + 8)}px`);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  let body: React.ReactNode = children;
  if (!ready) body = <div className="mg-center"><p className="mg-muted">Chargement de la carrière…</p></div>;
  else if (!state && !onNew) body = <NoCareer problem={loadProblem} />;

  const club = state ? myClub(state) : undefined;
  const p = state ? me(state) : undefined;
  const unread = state?.inbox.filter(m => !m.read).length ?? 0;

  return (
    <div className="mg-app" ref={appRef}>
      {state && club && p && !onNew && (
        <>
          <header className="mg-top" style={{ ["--club" as string]: club.colors.primary }}>
            <div className="mg-top__club">
              <Crest club={club} size={34} />
              <div className="mg-top__id">
                <strong>{state.profile.firstName} {state.profile.lastName}</strong>
                <span>{club.name} · saison {state.shadow.world.season} · semaine {state.shadow.world.currentWeek} · {p.age} ans</span>
              </div>
            </div>
            <dl className="mg-top__kpis">
              <div><dt>Note</dt><dd>{p.overall}</dd></div>
              <div><dt>Confiance</dt><dd className={state.coachTrust >= 55 ? "is-open" : ""}>{state.coachTrust}</dd></div>
              <div><dt>Économies</dt><dd>{formatMoney(state.career?.bank ?? 0)}</dd></div>
            </dl>
          </header>
          <nav className="mg-tabs" aria-label="Sections de la carrière">
            {TABS.map(t => {
              const active = t.href === BASE ? pathname === BASE : pathname.startsWith(t.href);
              return (
                <Link key={t.href} href={t.href} className={`mg-tab${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined}>
                  {t.label}
                  {t.label === "Messages" && unread > 0 && <span className="mg-tab__badge">{unread}</span>}
                  {t.label === "Carrière" && (state.career?.offers.length ?? 0) > 0 && <span className="mg-tab__badge">{state.career!.offers.length}</span>}
                </Link>
              );
            })}
            <Link href="/client/fc-career/modes" className="mg-tab mg-tab--exit">Changer de mode</Link>
          </nav>
        </>
      )}
      <main className="mg-main">{body}</main>
      <div className="mg-toasts" aria-live="polite">
        {toasts.map(t => <div key={t.id} data-toast-id={t.id} className={`mg-toast ${t.ok ? "is-ok" : "is-err"}`} role={t.ok ? "status" : "alert"}>{t.text}</div>)}
      </div>
    </div>
  );
}

function NoCareer({ problem }: { problem: "corrupt" | "unavailable" | null }) {
  return (
    <div className="mg-center">
      <div className="mg-card mg-nogame">
        <h1>Carrière Joueur</h1>
        {problem === "corrupt" && <p className="mg-warn">Votre sauvegarde est illisible. Elle n&apos;a pas été effacée : une nouvelle carrière l&apos;archivera d&apos;abord.</p>}
        {problem === "unavailable" && <p className="mg-warn">Le stockage du navigateur est indisponible : la carrière ne pourra pas être sauvegardée.</p>}
        <p className="mg-muted">Crée ton joueur, signe ton premier contrat pro et vise l&apos;Étoile d&apos;Or.</p>
        <Link href={`${BASE}/nouveau`} className="mg-btn mg-btn--gold">Créer mon joueur</Link>
        <Link href="/client/fc-career/modes" className="mg-link">Retour au choix du mode</Link>
      </div>
    </div>
  );
}
