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
  { href: `${BASE}/coach`,      label: "Coach",       icon: <IconCoach /> },
  { href: `${BASE}/agent`,      label: "Agent",       icon: <IconAgent /> },
  { href: `${BASE}/career`,     label: "Carrière",    icon: <IconTrophy /> },
  { href: `${BASE}/player`,     label: "Fiche joueur",icon: <IconUser /> },
  { href: `${BASE}/world`,      label: "Monde",       icon: <IconGlobe /> },
  { href: `${BASE}/settings`,   label: "Paramètres",  icon: <IconSettings /> },
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
function IconGlobe()    { return <svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 2c.55 0 1.3.6 1.9 1.8A9.5 9.5 0 0112.5 8h-5a9.5 9.5 0 01.6-2.2C8.7 4.6 9.45 4 10 4zm-4.4 4h8.8a9.5 9.5 0 010 4H5.6a9.5 9.5 0 010-4zm.5 6h7.8c-.6 1.4-1.7 2.6-3.9 2.6S6.7 15.4 6.1 14z"/></svg>; }
function IconTrophy()   { return <svg viewBox="0 0 20 20" fill="currentColor"><path d="M5 2h10v2h1a2 2 0 012 2v1a4 4 0 01-4 4H6a4 4 0 01-4-4V6a2 2 0 012-2h1V2zm0 4H4v1a2 2 0 002 2h.17A4 4 0 015 8V6zm10 0v2a4 4 0 01-.17 1H15a2 2 0 002-2V6h-2zm-5 8a3 3 0 003 3H7a3 3 0 003-3v-1h0v1z"/></svg>; }
function IconMenu()     { return <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M2 5h16v2H2V5zm0 4h16v2H2V9zm0 4h16v2H2v-2z"/></svg>; }
function IconSettings() { return <svg viewBox="0 0 20 20" fill="currentColor"><path d="M8.325 2.317a1 1 0 011.35 0l.823.755c.33.303.78.43 1.22.344l1.1-.214a1 1 0 011.155.676l.37 1.07c.147.425.48.756.9.9l1.07.37a1 1 0 01.676 1.155l-.214 1.1c-.086.44.04.89.344 1.22l.755.823a1 1 0 010 1.35l-.755.823a1.5 1.5 0 00-.344 1.22l.214 1.1a1 1 0 01-.676 1.155l-1.07.37a1.5 1.5 0 00-.9.9l-.37 1.07a1 1 0 01-1.155.676l-1.1-.214a1.5 1.5 0 00-1.22.344l-.823.755a1 1 0 01-1.35 0l-.823-.755a1.5 1.5 0 00-1.22-.344l-1.1.214a1 1 0 01-1.155-.676l-.37-1.07a1.5 1.5 0 00-.9-.9l-1.07-.37a1 1 0 01-.676-1.155l.214-1.1a1.5 1.5 0 00-.344-1.22l-.755-.823a1 1 0 010-1.35l.755-.823a1.5 1.5 0 00.344-1.22l-.214-1.1a1 1 0 01.676-1.155l1.07-.37a1.5 1.5 0 00.9-.9l.37-1.07a1 1 0 011.155-.676l1.1.214a1.5 1.5 0 001.22-.344l.823-.755zM10 13a3 3 0 100-6 3 3 0 000 6z"/></svg>; }
function IconCoach()    { return <svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a3 3 0 100 6 3 3 0 000-6zM4 13a6 6 0 1112 0v1H4v-1zm-1 2h14v1a1 1 0 01-1 1H4a1 1 0 01-1-1v-1z"/></svg>; }
function IconAgent()    { return <svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a3 3 0 100 6 3 3 0 000-6zm0 8a7 7 0 00-7 7h2a5 5 0 015-5 5 5 0 015 5h2a7 7 0 00-7-7z"/><rect x="13" y="8" width="5" height="2" rx="1"/><rect x="14" y="11" width="4" height="2" rx="1"/></svg>; }
