"use client";

/**
 * FC CAREER — Composants UI unifies (design carriere + engine principal).
 * Shell, Crest, PageTitle, Stat.
 */

import { Button, Dialog, DialogContent, DialogDescription, DialogTitle, Link, useCareerPath } from './ui';
import { Activity, Bell, Brain, Briefcase, CalendarDays, ChevronRight, Dumbbell, Flag, Globe, Heart, House, Phone, Settings, Shield, Sparkles, Trophy, User, Earth } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { getClub } from '../constants/clubs';
import { loadGame } from '../utils/storage';

const links = [
  { to: '/dashboard', label: "Vue d'ensemble", icon: House },
  { to: '/joueur', label: 'Mon joueur', icon: User },
  { to: '/entrainement', label: 'Entrainement', icon: Dumbbell },
  { to: '/saison', label: 'Ma saison', icon: CalendarDays },
  { to: '/match', label: 'Centre de match', icon: Flag },
  { to: '/agent', label: 'Agent & transferts', icon: Briefcase },
  { to: '/lifestyle', label: 'Vie privée', icon: Sparkles },
  { to: '/wellness', label: 'Santé & médias', icon: Brain },
  { to: '/awards', label: 'Récompenses', icon: Trophy },
  { to: '/international', label: 'Sélection', icon: Globe },
  { to: '/phone', label: 'Téléphone', icon: Phone },
  { to: '/world', label: 'Monde vivant', icon: Earth },
  { to: '/fans', label: 'Fans & vestiaire', icon: Heart },
  { to: '/club', label: 'Club & contrats', icon: Shield },
  { to: '/parametres', label: 'Parametres', icon: Settings },
] as const;

export function Crest({ name, clubId, small = false }: { name: string; clubId?: string; small?: boolean }) {
  const club = clubId ? getClub(clubId) : null;
  const initials = club?.shortName
    ? club.shortName.split(' ').map(w => w[0]).join('').slice(0, 3)
    : name.split(' ').map(w => w[0]).join('').slice(0, 3);
  return (
    <div className={`crest ${small ? 'small' : ''} other`}>
      <Shield aria-hidden="true" />
      <strong>{initials}</strong>
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const path = useCareerPath();
  const [notifications, setNotifications] = useState(false);
  const save = typeof window !== 'undefined' ? loadGame() : null;
  const player = save?.player;
  const club = player ? getClub(player.contract.clubId) : null;
  const seasonYear = save?.meta?.season?.seasonYear ?? 1;

  return (
    <div className="fcl app-shell">
      <aside className="sidebar">
        <Link to="/dashboard" className="brand">
          <span className="brand-symbol">FC<span>&uarr;</span></span>
          <span>FC CAREER<small>ECRIVEZ VOTRE HISTOIRE</small></span>
        </Link>
        <div className="nav-caption">VOTRE CARRIERE</div>
        <nav>
          {links.map(({ to, icon: Icon, label }) => (
            <Button key={to} asChild variant="ghost" className={`nav-item ${path === to || (path === '/' && to === '/dashboard') ? 'selected' : ''}`}>
              <Link to={to} aria-label={label} title={label}>
                <Icon />{label}{(path === to || (path === '/' && to === '/dashboard')) && <span className="nav-dot" />}
              </Link>
            </Button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="academy-tag">
            <Sparkles />
            <div>
              Le debut d&apos;une legende
              <small>{club?.name ?? 'Club'} &middot; Saison {seasonYear}</small>
            </div>
          </div>
          <span className="version">FC CAREER <span>v2.0</span></span>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Ma carriere</span>
            <ChevronRight />
            <strong>{links.find(l => l.to === path || (path === '/' && l.to === '/dashboard'))?.label ?? 'Accueil'}</strong>
          </div>
          <div className="topbar-right">
            <span className="season-pill"><span />SAISON {String(seasonYear).padStart(2, '0')}</span>
            <Button variant="ghost" size="icon" aria-label="Notifications" onClick={() => setNotifications(true)} className="notification-button">
              <Bell /><i />
            </Button>
          </div>
        </header>

        <main>{children}</main>

        <footer>
          <span><span className="save-dot" />Carriere sauvegardee sur cet appareil</span>
          <span>FC CAREER &middot; VOTRE PROCHAINE LEGENDE</span>
        </footer>
      </div>

      <Dialog open={notifications} onOpenChange={setNotifications}>
        <DialogContent>
          <DialogTitle>Actualites de votre carriere</DialogTitle>
          <DialogDescription>Saison {seasonYear}</DialogDescription>
          <div className="news-list">
            <div><Activity /><p>Bienvenue dans FC Career. Votre aventure commence ici.</p></div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export function PageTitle({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: ReactNode }) {
  return (
    <div className="page-title">
      <div>
        <div className="eyebrow"><span />{eyebrow}</div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

export function StatCard({ icon, value, label, tone = 'blue' }: { icon: ReactNode; value: ReactNode; label: string; tone?: string }) {
  return (
    <div className={`metric ${tone}`}>
      <div className="metric-icon">{icon}</div>
      <div>
        <strong key={String(value)} className="animated-value">{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}
