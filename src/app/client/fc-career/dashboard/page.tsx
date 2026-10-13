"use client";

/**
 * FC CAREER — Dashboard (hub principal)
 * Route: /client/fc-career/dashboard
 * Design unifie (style carriere).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Dumbbell,
  FastForward,
  Flag,
  Moon,
  Play,
  Shield,
  Sparkles,
  Target,
  Trophy,
  Wallet,
  X,
  Zap,
  ChevronRight,
} from "lucide-react";
import { Shell, Crest, PageTitle, StatCard } from "../lib/components";
import { Button, Link } from "../lib/ui";
import type { CareerRuntimeState } from "../types/career";
import { toCareerState, toFullSave } from "../types/career";
import { loadGame, saveGame } from "../utils/storage";
import { getClub, getClubsByDivision } from "../constants/clubs";
import { createSeason, advanceSeason, nextUserFixture, computeStandings } from "../engine/season-manager";
import { simulateMatch } from "../engine/match-engine";
import { TRAINING_SESSIONS, runTrainingSession, applyRest, endOfWeek } from "../engine/progression";
import type { TrainingType } from "../engine/progression";
import { emptyWallet, processWeeklyPayroll, computeMatchBonuses } from "../engine/economic-engine";
import { formatMoneyCompact, formatDate, formatRating } from "../utils/formatters";
import { STAGE_LABELS } from "../engine/academy-engine";
import { buildPostMatchState, isMatchLocked, lockMatchForToday, clearMatchState } from "../utils/match-result";
import type { SimulatedMatch, MatchEvent } from "../types/match";
import type { Player, SeasonStatLine } from "../types/player";
import { DIVISION_INFO } from "../types/club";

function Meter({ label, value, invert = false }: { label: string; value: number; invert?: boolean }) {
  const pct = Math.max(0, Math.min(100, value));
  const good = invert ? pct <= 40 : pct >= 60;
  const bad = invert ? pct >= 75 : pct <= 30;
  const color = good ? "var(--primary)" : bad ? "var(--coral)" : "oklch(.8 .15 80)";
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10 }}>
      <span style={{ width: 50, opacity: .6 }}>{label}</span>
      <span style={{ height: 4, width: 60, overflow: 'hidden', borderRadius: 3, background: 'var(--secondary)' }}>
        <span style={{ display: 'block', height: '100%', borderRadius: 3, background: color, width: `${pct}%`, transition: 'width .6s var(--motion)' }} />
      </span>
      <span style={{ width: 24, textAlign: 'right', fontWeight: 600 }}>{Math.round(pct)}</span>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [career, setCareer] = useState<CareerRuntimeState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [lastMatch, setLastMatch] = useState<SimulatedMatch | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const save = loadGame();
    if (!save || !save.player) {
      router.replace("/client/fc-career/create-player");
      return;
    }
    setCareer(toCareerState(save));
    setLoaded(true);
  }, [router]);

  const persist = useCallback((next: CareerRuntimeState) => {
    setCareer(next);
    saveGame(toFullSave(next));
  }, []);

  const player = career?.player ?? null;
  const club = player ? getClub(player.contract.clubId) ?? null : null;

  useEffect(() => {
    if (!career || !player || !club) return;
    if (career.meta.season) return;
    const clubsInDivision = getClubsByDivision(club.division);
    const createdYear = new Date(career.meta.createdAt).getFullYear();
    const seasonYear = Number.isFinite(createdYear) ? createdYear + 1 : new Date().getFullYear() + 1;
    const season = createSeason(clubsInDivision, seasonYear, club);
    persist({ ...career, meta: { ...career.meta, season } });
  }, [career, player, club, persist]);

  const season = career?.meta.season ?? null;
  const nextFixture = useMemo(
    () => (season && club ? nextUserFixture(season, club.id) : undefined),
    [season, club],
  );

  function flash(msg: string) {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 4000);
  }

  function doRest() {
    if (!career || !player) return;
    persist({ ...career, player: applyRest(player) });
    flash("Repos complet - condition physique restauree.");
  }

  function playNextMatch() {
    if (!career || !player || !club || !season || !nextFixture || isMatchLocked()) return;
    const home = getClub(nextFixture.homeClubId)!;
    const away = getClub(nextFixture.awayClubId)!;
    const sim = simulateMatch(home, away, player);
    const next = buildPostMatchState({ career, player, clubId: club.id, fixture: nextFixture, sim });
    persist(next);
    clearMatchState();
    lockMatchForToday();
    setLastMatch(sim);
  }

  if (!loaded || !player || !club || !career) {
    return (
      <Shell>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 200px)', opacity: .6, gap: 8 }}>
          <Sparkles className="animate-pulse" size={16} />
          <span style={{ fontSize: 12 }}>Chargement de la carriere...</span>
        </div>
      </Shell>
    );
  }

  const standings = season ? computeStandings(season, getClubsByDivision(club.division)) : [];
  const myRow = standings.find((r) => r.clubId === club.id);
  const divisionName = DIVISION_INFO[club.division]?.name ?? club.division;
  const seasonStats = player.seasonStats[0];

  return (
    <Shell>
      <PageTitle
        eyebrow={`SAISON ${season?.seasonYear ?? ''} / ${divisionName}`}
        title={`A vous de jouer, ${player.firstName}.`}
        subtitle={`${player.academy ? STAGE_LABELS[player.academy.stage] + ' · ' : ''}Chaque jour compte. Chaque decision construit votre legende.`}
        action={
          <div className="today">
            <CalendarDays />
            <div>
              <strong>{season ? formatDate(new Date().toISOString()) : ''}</strong>
              <span>Journee {season?.currentDay ?? 0}</span>
            </div>
          </div>
        }
      />

      <div className="dashboard-grid">
        {/* Carte joueur */}
        <section className="player-card">
          <div className="player-image" style={{ height: 200, background: `linear-gradient(135deg, ${club.colors.primary}44, ${club.colors.accent}22)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="player-position">{player.position}</span>
            <div className="overall"><strong>{player.overall}</strong><span>GENERAL</span></div>
            <div className="player-identity">
              <span>LE PROCHAIN CHAPITRE</span>
              <h2>{player.firstName} {player.lastName}</h2>
              <p>{player.age} ans <i /> {player.position} <i /> {club.shortName}</p>
            </div>
          </div>
          <div className="player-info">
            <div className="club-line">
              <Crest name={club.shortName} clubId={club.id} small />
              <div>
                <strong>{club.name}</strong>
                <span>{divisionName}</span>
              </div>
              <span className="status-tag">ESPOIR</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 16 }}>
              <Meter label="Forme" value={player.form} />
              <Meter label="Fatigue" value={player.fatigue} invert />
              <Meter label="Moral" value={player.morale} />
            </div>
            <div className="player-details">
              <span>Potentiel<strong>{player.potential}<Sparkles /></strong></span>
              <span>Pied fort<strong>{player.foot === 'left' ? 'Gauche' : player.foot === 'right' ? 'Droit' : 'Les deux'}</strong></span>
              <span>Valeur<strong>{formatMoneyCompact(player.marketValue)}</strong></span>
            </div>
            <Button asChild variant="outline" className="full-width">
              <Link to="/joueur">Voir mon profil<ArrowRight /></Link>
            </Button>
          </div>
        </section>

        {/* Colonne centrale */}
        <div className="center-column">
          <div className="section-heading">
            <h2>Votre prochain defi</h2>
            <span className="live-label"><span />{nextFixture ? 'PROCHAIN MATCH' : 'PAS DE MATCH'}</span>
          </div>
          {nextFixture && (
            <section className="match-card" style={{ background: 'var(--card)', height: 'auto', minHeight: 250 }}>
              <div className="match-card-content" style={{ position: 'relative' }}>
                <div className="competition"><Trophy />{divisionName}<span>J{nextFixture.dayNumber}</span></div>
                <div className="versus">
                  <div>
                    <Crest name={getClub(nextFixture.homeClubId)?.shortName ?? ''} clubId={nextFixture.homeClubId} />
                    <strong>{getClub(nextFixture.homeClubId)?.shortName ?? '?'}</strong>
                    <span>{nextFixture.homeClubId === club.id ? 'DOMICILE' : 'EXTERIEUR'}</span>
                  </div>
                  <span className="vs-label">VS</span>
                  <div>
                    <Crest name={getClub(nextFixture.awayClubId)?.shortName ?? ''} clubId={nextFixture.awayClubId} />
                    <strong>{getClub(nextFixture.awayClubId)?.shortName ?? '?'}</strong>
                    <span>{nextFixture.awayClubId === club.id ? 'DOMICILE' : 'EXTERIEUR'}</span>
                  </div>
                </div>
                <div className="match-date"><CalendarDays />{formatDate(nextFixture.date)}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="career" className="full-width" asChild>
                    <Link to="/match"><Play />Jouer le match</Link>
                  </Button>
                  <Button variant="outline" className="full-width" onClick={playNextMatch}>
                    <FastForward />Simuler
                  </Button>
                </div>
              </div>
            </section>
          )}

          {lastMatch && (
            <div style={{ marginTop: 16, padding: 16, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 7 }}>
              <div style={{ textAlign: 'center', fontSize: 24, fontWeight: 700, fontFamily: "'Barlow', sans-serif" }}>
                {getClub(lastMatch.homeClubId)?.shortName} {lastMatch.homeScore} - {lastMatch.awayScore} {getClub(lastMatch.awayClubId)?.shortName}
              </div>
              <div style={{ textAlign: 'center', fontSize: 11, marginTop: 8, color: 'var(--muted-foreground)' }}>
                Note : <strong style={{ color: 'var(--primary)' }}>{formatRating(lastMatch.userRating.rating)}</strong>
                {' '}&middot; {lastMatch.userRating.goals} but(s), {lastMatch.userRating.assists} passe(s) dec.
              </div>
            </div>
          )}

          <div className="section-heading actions-heading">
            <h2>Faites la difference</h2>
            <span>UN JOUR, UNE ACTION</span>
          </div>
          <div className="quick-actions">
            <Button asChild variant="action" className="training-action">
              <Link to="/entrainement">
                <div className="action-icon"><Dumbbell /></div>
                <div><strong>S&apos;entrainer</strong><span>Repoussez vos limites</span></div>
                <ArrowRight />
              </Link>
            </Button>
            <Button variant="action" className="rest-action" onClick={doRest}>
              <div className="action-icon"><Moon /></div>
              <div><strong>Recuperer</strong><span>Revenez plus fort</span></div>
              <ArrowRight />
            </Button>
          </div>

          <div className="coach-note">
            <span><Sparkles /></span>
            <p>&laquo; Le talent vous fait commencer.<br /><strong>La regularite vous fait reussir. &raquo;</strong></p>
            <small>LE MOT DU COACH</small>
          </div>
        </div>

        {/* Colonne droite */}
        <div className="right-column">
          <div className="section-heading">
            <h2>Cette saison</h2>
            <span className="tiny-tag">{player.position}</span>
          </div>
          <div className="season-metrics">
            <StatCard icon={<Flag />} value={seasonStats?.matches ?? 0} label="Matchs joues" tone="blue" />
            <StatCard icon={<Target />} value={seasonStats?.goals ?? 0} label="Buts marques" tone="coral" />
            <StatCard icon={<Zap />} value={seasonStats?.assists ?? 0} label="Passes decisives" tone="yellow" />
            <StatCard icon={<Activity />} value={seasonStats?.averageRating ? seasonStats.averageRating.toFixed(1) : '-'} label="Note moyenne" tone="ice" />
          </div>

          {myRow && (
            <div className="season-progress" style={{ marginTop: 20 }}>
              <div><span>Classement {divisionName}</span><strong>{myRow.position}e / {standings.length}</strong></div>
              <progress value={standings.length - myRow.position + 1} max={standings.length} />
              <div className="progress-label"><span>{myRow.points} pts</span><span>{myRow.won}V {myRow.drawn}N {myRow.lost}D</span></div>
            </div>
          )}

          <div className="section-heading calendar-heading">
            <h2>A l&apos;horizon</h2>
            <Button asChild variant="ghost" size="icon" aria-label="Voir le calendrier">
              <Link to="/saison"><ArrowRight /></Link>
            </Button>
          </div>
          <div className="upcoming">
            {season?.fixtures
              .filter(f => !f.played && (f.homeClubId === club.id || f.awayClubId === club.id))
              .slice(1, 4)
              .map(f => {
                const opponent = f.homeClubId === club.id ? f.awayClubId : f.homeClubId;
                const oppClub = getClub(opponent);
                return (
                  <div className="fixture-row" key={f.id}>
                    <div className="fixture-date">
                      <strong>{new Date(f.date).getUTCDate()}</strong>
                      <span>{new Date(f.date).toLocaleDateString('fr-FR', { month: 'short', timeZone: 'UTC' })}</span>
                    </div>
                    <Crest name={oppClub?.shortName ?? '?'} clubId={opponent} small />
                    <div>
                      <strong>{oppClub?.shortName ?? '?'}</strong>
                      <span>J{f.dayNumber} &middot; {f.homeClubId === club.id ? 'Dom' : 'Ext'}</span>
                    </div>
                    <ChevronRight />
                  </div>
                );
              })}
          </div>

          <div className="wallet-box">
            <Wallet />
            <div>
              <span>Votre solde</span>
              <strong>{formatMoneyCompact(career.wallet?.balance ?? 0)}</strong>
            </div>
            <Button asChild variant="ghost" size="icon" aria-label="Voir les finances">
              <Link to="/club"><ArrowRight /></Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="bottom-strip">
        <div>
          <span className="strip-icon"><Trophy /></span>
          <p>
            <span>VOTRE OBJECTIF DE SAISON</span>
            <strong>Progresser et s&apos;imposer en {divisionName}</strong>
          </p>
        </div>
        <span className="objective-tag">EN COURS <span /></span>
      </div>

      {notice && (
        <div className="toast">
          <Activity />{notice}
          <Button variant="ghost" size="icon" aria-label="Fermer" onClick={() => setNotice(null)}><X /></Button>
        </div>
      )}
    </Shell>
  );
}
