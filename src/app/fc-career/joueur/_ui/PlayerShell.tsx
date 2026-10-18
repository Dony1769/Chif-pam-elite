"use client";

/** FC CAREER 27 — Carrière Joueur v2 : coquille (en-tête joueur, onglets, notifications). */

import { Backdrop } from "../../manager/_ui/Backdrop";
import { CinematicHost } from "../../manager/_ui/cinematics/CinematicHost";
import React, { useMemo, useRef } from "react";
import type { Cinematic } from "../../manager/_ui/cinematics/events";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePlayer } from "./PlayerContext";
import { Crest } from "../../manager/_ui/kit";
import { Avatar } from "../../manager/_ui/Avatar";
import { SheetsProvider } from "../../manager/_ui/PlayerSheet";
import { GameBar, GameNav } from "../../manager/_ui/GameNav";
import { formatMoney } from "../../game/manager/engine";
import { me, myClub } from "../../game/player2/engine";
import { worldCalendar } from "../../game/domain/calendar";

const BASE = "/fc-career/joueur";
const TABS = [
  { href: BASE, label: "Accueil", icon: "home" },
  { href: `${BASE}/match`, label: "Match", icon: "ball" },
  { href: `${BASE}/progression`, label: "Progression", icon: "chart" },
  { href: `${BASE}/carriere`, label: "Carrière", icon: "doc" },
  { href: `${BASE}/messages`, label: "Messages", icon: "mail" },
  { href: `${BASE}/monde`, label: "Compétitions", icon: "trophy" },
];

export function PlayerShell({ children }: { children: React.ReactNode }) {
  const { state, ready, loadProblem, toasts } = usePlayer();
  const pathname = usePathname();
  const onNew = pathname === `${BASE}/nouveau`;
  const appRef = useRef<HTMLDivElement>(null);

  // Les onglets collent sous l'en-tête collant du site chifpam

  let body: React.ReactNode = children;
  if (!ready) body = <div className="mg-center"><p className="mg-muted">Chargement de la carrière…</p></div>;
  else if (!state && !onNew) body = <NoCareer problem={loadProblem} />;

  const club = state ? myClub(state) : undefined;
  const p = state ? me(state) : undefined;
  const cal = state ? worldCalendar(state.shadow.world) : null;
  const unread = state?.inbox.filter(m => !m.read).length ?? 0;
  const rawMoments = state?.career?.moments;
  const playerName = state ? `${state.profile.firstName} ${state.profile.lastName}` : "";
  const moments = useMemo<Cinematic[] | undefined>(() => rawMoments?.map(m => ({
    kind: "final" as const, id: m.id, title: m.title, subtitle: m.subtitle, trophy: m.trophy,
    winner: { id: m.id, name: playerName, isMe: true }, runnerUp: "", score: m.detail,
  })), [rawMoments, playerName]);

  return (
    <div className="mg-app" ref={appRef}>
      <Backdrop club={club?.colors.primary} />
      {state && club && !onNew && <CinematicHost world={state.shadow.world} me={{ clubId: club.id, playerId: state.profile.id, nation: state.profile.nationality }} storageKey={`joueur-${state.profile.id}`} extra={moments} paused={pathname.startsWith(`${BASE}/contrat`)} />}
      <GameBar />
      {state && club && p && !onNew && (
        <>
          <header className="mg-top" style={{ ["--club" as string]: club.colors.primary }}>
            <div className="mg-top__club">
              <Avatar id={state.profile.id} age={p.age} kit={club.colors.primary} trim={club.colors.secondary} size={38} label="Votre portrait" />
              <div className="mg-top__id">
                <strong>{state.profile.firstName} {state.profile.lastName}</strong>
                <span>{club.name} · {cal ? `${cal.date} · ${cal.season}` : `saison ${state.shadow.world.season} · semaine ${state.shadow.world.currentWeek}`} · {p.age} ans</span>
              </div>
            </div>
            <dl className="mg-top__kpis">
              <div><dt>Note</dt><dd>{p.overall}</dd></div>
              <div><dt>Confiance</dt><dd className={state.coachTrust >= 55 ? "is-open" : ""}>{state.coachTrust}</dd></div>
              <div><dt>Économies</dt><dd>{formatMoney(state.career?.bank ?? 0)}</dd></div>
            </dl>
          </header>
          <GameNav base={BASE} label="Sections de la carrière"
            items={TABS.map(t => ({ ...t, badge: t.label === "Messages" ? unread : t.label === "Carrière" ? (state.career?.offers.length ?? 0) : undefined }))} />
        </>
      )}
      <main className="mg-main">
        {state ? <SheetsProvider world={state.shadow.world} highlight={state.profile.id} meClub={club?.id}>{body}</SheetsProvider> : body}
      </main>
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
        <Link href="/fc-career/modes" className="mg-link">Retour au choix du mode</Link>
      </div>
    </div>
  );
}
