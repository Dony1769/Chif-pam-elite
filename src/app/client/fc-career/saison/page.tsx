"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, Flag, Sparkles, Trophy, Star } from "lucide-react";
import { Shell, Crest, PageTitle } from "../lib/components";
import { Button, Link } from "../lib/ui";
import { loadGame } from "../utils/storage";
import { toCareerState, type CareerRuntimeState } from "../types/career";
import { getClub, getClubsByDivision } from "../constants/clubs";
import { computeStandings } from "../engine/season-manager";
import { DIVISION_INFO } from "../types/club";
import { formatDate } from "../utils/formatters";
import { getPhaseForDay, getEuroCompetitionForPosition } from "../engine/calendar";
import { getCompetition } from "../constants/competitions";
import type { Country } from "../types/club";

const FORM_COLORS: Record<string, string> = {
  W: "var(--success, #4ade80)",
  D: "var(--warning, #facc15)",
  L: "var(--danger, #f87171)",
};

export default function SaisonPage() {
  const router = useRouter();
  const [career, setCareer] = useState<CareerRuntimeState | null>(null);
  const [filter, setFilter] = useState<'upcoming' | 'results' | 'all'>('upcoming');

  useEffect(() => {
    const save = loadGame();
    if (!save?.player) { router.replace("/client/fc-career/create-player"); return; }
    setCareer(toCareerState(save));
  }, [router]);

  if (!career?.player) {
    return <Shell><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 200px)', opacity: .6, gap: 8 }}><Sparkles className="animate-pulse" size={16} /><span style={{ fontSize: 12 }}>Chargement...</span></div></Shell>;
  }

  const player = career.player;
  const club = getClub(player.contract.clubId);
  const season = career.meta.season;
  const divisionName = club ? (DIVISION_INFO[club.division]?.name ?? club.division) : '';
  const currentDay = season?.currentDay ?? 0;
  const phase = getPhaseForDay(currentDay);

  const fixtures = useMemo(() => {
    if (!season || !club) return [];
    return season.fixtures
      .filter(f => f.homeClubId === club.id || f.awayClubId === club.id)
      .filter(f => filter === 'all' ? true : filter === 'upcoming' ? !f.played : f.played);
  }, [season, club, filter]);

  const standings = useMemo(() => {
    if (!season || !club) return [];
    return computeStandings(season, getClubsByDivision(club.division));
  }, [season, club]);

  const country: Country = club ? DIVISION_INFO[club.division]?.country ?? "gallia" : "gallia";

  return (
    <Shell>
      <PageTitle
        eyebrow={`SAISON ${season?.seasonYear ?? ''} · ${divisionName}`}
        title="Le chemin vers le sommet."
        subtitle={`Jour ${currentDay} · ${phase.label} · ${fixtures.length} matchs affichés`}
      />

      {/* Phase indicator */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {phase.events.map(ev => (
          <span key={ev} style={{
            fontSize: 10, padding: '3px 8px', borderRadius: 4,
            background: 'var(--card)', color: 'var(--text-secondary, #999)',
            fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>{ev}</span>
        ))}
      </div>

      <div className="tabs">
        <Button variant="ghost" className={filter === 'upcoming' ? 'active' : ''} onClick={() => setFilter('upcoming')}>À venir</Button>
        <Button variant="ghost" className={filter === 'results' ? 'active' : ''} onClick={() => setFilter('results')}>Résultats</Button>
        <Button variant="ghost" className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Tout</Button>
      </div>
      <div className="season-table">
        <div className="table-head"><span>DATE</span><span>RENCONTRE</span><span>COMPÉTITION</span><span>SCORE</span></div>
        {fixtures.map(f => {
          const opp = f.homeClubId === club!.id ? f.awayClubId : f.homeClubId;
          const oppClub = getClub(opp);
          const isHome = f.homeClubId === club!.id;
          const won = f.played && (
            (isHome && (f.homeScore ?? 0) > (f.awayScore ?? 0)) ||
            (!isHome && (f.awayScore ?? 0) > (f.homeScore ?? 0))
          );
          const lost = f.played && (
            (isHome && (f.homeScore ?? 0) < (f.awayScore ?? 0)) ||
            (!isHome && (f.awayScore ?? 0) < (f.homeScore ?? 0))
          );
          return (
            <div className={`calendar-row ${won ? 'highlight' : ''}`} key={f.id}>
              <span>{formatDate(f.date)}</span>
              <div>
                <Crest name={oppClub?.shortName ?? '?'} clubId={opp} small />
                <strong>{oppClub?.shortName ?? '?'}</strong>
                <span className="tiny-tag">{isHome ? 'DOM' : 'EXT'}</span>
              </div>
              <span>{divisionName} · J{f.dayNumber}</span>
              <strong style={{ color: won ? 'var(--success, #4ade80)' : lost ? 'var(--danger, #f87171)' : 'inherit' }}>
                {f.played ? `${f.homeScore ?? 0} - ${f.awayScore ?? 0}` : '—'}
              </strong>
            </div>
          );
        })}
        {fixtures.length === 0 && (
          <div className="empty-state">
            <Flag /><h2>{filter === 'results' ? 'Aucun résultat pour le moment.' : 'Calendrier en attente.'}</h2>
          </div>
        )}
      </div>

      {standings.length > 0 && (
        <>
          <h2 style={{ margin: '32px 0 16px', fontFamily: "'Barlow', sans-serif", fontSize: 16, fontWeight: 700 }}>
            <Trophy size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Classement {divisionName}
          </h2>
          <div className="season-table">
            <div className="table-head">
              <span>#</span><span>CLUB</span><span>MJ</span><span>V</span><span>N</span><span>D</span>
              <span>BP</span><span>BC</span><span>DIFF</span><span>PTS</span><span>FORME</span>
            </div>
            {standings.map(row => {
              const rc = getClub(row.clubId);
              const euroComp = getEuroCompetitionForPosition(country, row.position);
              const euroLabel = euroComp ? getCompetition(euroComp)?.shortName : null;
              return (
                <div className={`calendar-row ${row.clubId === club!.id ? 'highlight' : ''}`} key={row.clubId}>
                  <strong style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {row.position}
                    {euroLabel && (
                      <span style={{
                        fontSize: 8, padding: '1px 4px', borderRadius: 3,
                        background: euroComp === 'champions-europa' ? '#fbbf24' : '#60a5fa',
                        color: '#000', fontWeight: 700,
                      }}>{euroLabel}</span>
                    )}
                  </strong>
                  <div>
                    <Crest name={rc?.shortName ?? '?'} clubId={row.clubId} small />
                    <strong>{rc?.shortName ?? '?'}</strong>
                  </div>
                  <span>{row.played}</span>
                  <span>{row.won}</span>
                  <span>{row.drawn}</span>
                  <span>{row.lost}</span>
                  <span>{row.goalsFor}</span>
                  <span>{row.goalsAgainst}</span>
                  <span style={{ color: row.goalDifference > 0 ? 'var(--success, #4ade80)' : row.goalDifference < 0 ? 'var(--danger, #f87171)' : 'inherit' }}>
                    {row.goalDifference > 0 ? '+' : ''}{row.goalDifference}
                  </span>
                  <strong>{row.points}</strong>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {row.form.map((f, i) => (
                      <span key={i} style={{
                        width: 14, height: 14, borderRadius: '50%',
                        background: FORM_COLORS[f], display: 'inline-flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: 8, fontWeight: 700, color: '#000',
                      }}>{f}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Shell>
  );
}
