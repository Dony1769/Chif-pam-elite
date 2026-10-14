"use client";

/**
 * FC CAREER — GameShell
 * Sidebar + Topbar + layout principal pour toutes les pages du jeu.
 */

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useGame }   from "../hooks/useGame";
import { selectPlayer, selectCareer } from "../state/selectors";
import { sidebarSlide, backdrop } from "../design/animations";
import { overallTier } from "../utils/formatters";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

const BASE = "/client/fc-career";

const NAV: NavItem[] = [
  { href: `${BASE}/dashboard`,  label: "Accueil",     icon: <IconHome /> },
  { href: `${BASE}/training`,   label: "Entraînement",icon: <IconDumbbell /> },
  { href: `${BASE}/calendar`,   label: "Calendrier",  icon: <IconCalendar /> },
  { href: `${BASE}/player`,     label: "Fiche joueur",icon: <IconUser /> },
];

export function GameShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { state } = useGame();
  const player = selectPlayer(state);
  const career = selectCareer(state);

  const pageTitle = NAV.find(n => pathname.startsWith(n.href))?.label ?? "FC Career";

  return (
    <div className="fc-shell">
      {/* ── Sidebar mobile overlay ────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fc-sidebar-overlay"
            variants={backdrop}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar ──────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.aside
            className="fc-sidebar is-open"
            variants={sidebarSlide}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <SidebarContent
              nav={NAV}
              pathname={pathname}
              player={player}
              career={career}
              onClose={() => setOpen(false)}
            />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Sidebar desktop (toujours visible) */}
      <aside className="fc-sidebar" style={{ display: "flex" }}>
        <SidebarContent
          nav={NAV}
          pathname={pathname}
          player={player}
          career={career}
        />
      </aside>

      {/* ── Main ─────────────────────────────────────────────── */}
      <div className="fc-main">
        {/* Topbar mobile */}
        <header className="fc-topbar">
          <button
            className="fc-topbar__menu-btn"
            onClick={() => setOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <IconMenu />
          </button>
          <span className="fc-topbar__title">{pageTitle}</span>
          {player && (
            <span className="fc-badge fc-badge--pos">{player.overall}</span>
          )}
        </header>

        {children}
      </div>
    </div>
  );
}

/* ── Sidebar content ─────────────────────────────────────────────── */
function SidebarContent({
  nav, pathname, player, career, onClose,
}: {
  nav: NavItem[];
  pathname: string;
  player: ReturnType<typeof selectPlayer>;
  career: ReturnType<typeof selectCareer>;
  onClose?: () => void;
}) {
  return (
    <>
      <div className="fc-sidebar__header">
        <div className="fc-sidebar__logo">FC Career</div>
        {career && (
          <div className="fc-sidebar__sub">
            Saison {career.season} · Sem. {career.week}
          </div>
        )}
      </div>

      {player && (
        <div style={{ padding: "var(--fc-space-4)", borderBottom: "1px solid var(--fc-border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--fc-space-3)" }}>
            <div style={{
              width: 44, height: 44, borderRadius: "var(--fc-radius)",
              background: "var(--fc-emerald-10)",
              border: "1px solid rgba(55,217,154,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--fc-font-display)", fontWeight: 800,
              fontSize: "var(--fc-text-lg)", color: "var(--fc-emerald)",
            }}>
              {player.overall}
            </div>
            <div>
              <div style={{
                fontFamily: "var(--fc-font-display)", fontWeight: 700,
                fontSize: "var(--fc-text-md)", color: "var(--fc-text)",
                lineHeight: 1.1,
              }}>
                {player.firstName} {player.lastName}
              </div>
              <div style={{ display: "flex", gap: "var(--fc-space-1)", marginTop: 3 }}>
                <span className="fc-badge fc-badge--pos">{player.position}</span>
                <span className="fc-badge fc-badge--neutral">{player.nationality}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <nav className="fc-sidebar__nav" aria-label="Navigation principale">
        {nav.map(item => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`fc-nav-item${active ? " is-active" : ""}`}
              onClick={onClose}
            >
              <span className="fc-nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="fc-sidebar__footer">
        <Link
          href="/client/fc-career"
          className="fc-nav-item"
          style={{ color: "var(--fc-text-3)", fontSize: "var(--fc-text-xs)" }}
        >
          ← Quitter le jeu
        </Link>
      </div>
    </>
  );
}

/* ── Icônes SVG inline ──────────────────────────────────────────── */
function IconHome()     { return <svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2L2 9h2v9h5v-5h2v5h5V9h2L10 2z"/></svg>; }
function IconDumbbell() { return <svg viewBox="0 0 20 20" fill="currentColor"><rect x="1" y="8" width="3" height="4" rx="1"/><rect x="16" y="8" width="3" height="4" rx="1"/><rect x="3" y="9" width="14" height="2" rx="1"/><rect x="4" y="6" width="2" height="8" rx="1"/><rect x="14" y="6" width="2" height="8" rx="1"/></svg>; }
function IconCalendar() { return <svg viewBox="0 0 20 20" fill="currentColor"><path d="M6 2v2H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2V2h-2v2H8V2H6zm-2 6h12v8H4V8z"/></svg>; }
function IconUser()     { return <svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 10a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 1114 0H3z"/></svg>; }
function IconMenu()     { return <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M2 5h16v2H2V5zm0 4h16v2H2V9zm0 4h16v2H2v-2z"/></svg>; }
