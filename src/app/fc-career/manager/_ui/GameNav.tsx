"use client";

/**
 * FC CAREER 27 — Navigation partagée des modes Joueur et Manager.
 * Ordinateur : barre d'onglets. Mobile : barre inférieure (5 destinations max,
 * la 5e ouvre « Plus » quand il y a davantage de sections).
 */

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem { href: string; label: string; icon: string; badge?: number }

const ICONS: Record<string, string> = {
  home: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z",
  ball: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 4l3 2.2-1.1 3.6h-3.8L9 9.2z",
  chart: "M4 20V10m6 10V4m6 16v-7m4 7H2",
  doc: "M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6",
  mail: "M3 6h18v12H3zM3 6l9 7 9-7",
  team: "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20c0-3 3-5 6-5s6 2 6 5m0-5c1-.6 2-.9 3-.9 3 0 5 2 5 5",
  board: "M4 4h16v16H4zM12 4v16M4 12h16",
  trophy: "M7 4h10v5a5 5 0 0 1-10 0zM5 5H3v2a3 3 0 0 0 3 3m13-5h2v2a3 3 0 0 1-3 3M12 14v4m-4 3h8",
  swap: "M4 8h14l-3-3m5 11H6l3 3",
  coin: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 4v10m3-8h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9",
  stadium: "M3 10c0-3 4-5 9-5s9 2 9 5v6c0 2-4 4-9 4s-9-2-9-4zM3 10c0 2 4 4 9 4s9-2 9-4",
  more: "M5 12h.01M12 12h.01M19 12h.01",
};

function Icon({ name }: { name: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={ICONS[name] ?? ICONS.more} />
    </svg>
  );
}

/** Barre supérieure : retour à l'accueil du site, changement de mode, réglages. */
export function GameBar() {
  return (
    <div className="mg-bar">
      <Link href="/" className="mg-bar__home" aria-label="Retour au portail">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M15 18l-6-6 6-6" /></svg>
        Accueil
      </Link>
      <span className="mg-bar__brand">FC Career 27</span>
      <div className="mg-bar__end">
        <Link href="/fc-career/modes" className="mg-bar__btn">Modes</Link>
        <Link href="/fc-career/reglages" className="mg-bar__btn" aria-label="Réglages et sauvegardes">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
          <span className="mg-bar__label">Réglages</span>
        </Link>
      </div>
    </div>
  );
}

export function GameNav({ items, base, label }: { items: NavItem[]; base: string; label: string }) {
  const pathname = usePathname();
  const [more, setMore] = useState(false);
  const isActive = (href: string) => (href === base ? pathname === base : pathname.startsWith(href));

  const primary = items.length <= 5 ? items : items.slice(0, 4);
  const rest = items.length <= 5 ? [] : items.slice(4);
  const restActive = rest.some(i => isActive(i.href));
  const restBadge = rest.reduce((n, i) => n + (i.badge ?? 0), 0);

  return (
    <>
      <nav className="mg-tabs" aria-label={label}>
        {items.map(t => (
          <Link key={t.href} href={t.href} className={`mg-tab${isActive(t.href) ? " is-active" : ""}`} aria-current={isActive(t.href) ? "page" : undefined}>
            {t.label}
            {!!t.badge && <span className="mg-tab__badge">{t.badge}</span>}
          </Link>
        ))}
      </nav>

      <nav className="mg-bottom" aria-label={`${label} (mobile)`}>
        {primary.map(t => (
          <Link key={t.href} href={t.href} onClick={() => setMore(false)} className={`mg-bottom__item${isActive(t.href) ? " is-active" : ""}`} aria-current={isActive(t.href) ? "page" : undefined}>
            <Icon name={t.icon} />
            <span>{t.label}</span>
            {!!t.badge && <i className="mg-bottom__badge">{t.badge}</i>}
          </Link>
        ))}
        {rest.length > 0 && (
          <button type="button" className={`mg-bottom__item${restActive || more ? " is-active" : ""}`} aria-expanded={more} aria-controls="mg-more" onClick={() => setMore(m => !m)}>
            <Icon name="more" />
            <span>Plus</span>
            {restBadge > 0 && <i className="mg-bottom__badge">{restBadge}</i>}
          </button>
        )}
      </nav>
      {more && (
        <>
          <div className="mg-sheet__scrim" onClick={() => setMore(false)} aria-hidden />
          <div id="mg-more" className="mg-sheet" role="dialog" aria-label="Autres sections">
            {rest.map(t => (
              <Link key={t.href} href={t.href} className={`mg-sheet__item${isActive(t.href) ? " is-active" : ""}`} onClick={() => setMore(false)}>
                <Icon name={t.icon} />
                <span>{t.label}</span>
                {!!t.badge && <i className="mg-bottom__badge">{t.badge}</i>}
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  );
}
