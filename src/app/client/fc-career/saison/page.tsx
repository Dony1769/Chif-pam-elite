"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, Flag, Sparkles } from "lucide-react";
import { Shell, Crest, PageTitle } from "../lib/components";
import { Button, Link } from "../lib/ui";
import { loadGame } from "../utils/storage";
import { toCareerState, type CareerRuntimeState } from "../types/career";
import { getClub, getClubsByDivision } from "../constants/clubs";
import { computeStandings } from "../engine/season-manager";
import { DIVISION_INFO } from "../types/club";
import { formatDate } from "../utils/formatters";

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

  return (
    <Shell>
      <PageTitle
        eyebrow={`SAISON ${season?.seasonYear ?? ''} · ${divisionName}`}
        title="Le chemin vers le sommet."
        subtitle={`Journee ${season?.currentDay ?? 0} · ${fixtures.length} matchs affiches`}
      />
      <div className="tabs">
        <Button variant="ghost" className={filter === 'upcoming' ? 'active' : ''} onClick={() => setFilter('upcoming')}>A venir</Button>
        <Button variant="ghost" className={filter === 'results' ? 'active' : ''} onClick={() => setFilter('results')}>Resultats</Button>
        <Button variant="ghost" className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Tout</Button>
      </div>
      <div className="season-table">
        <div className="table-head"><span>DATE</span><span>RENCONTRE</span><span>COMPETITION</span><span>SCORE</span></div>
        {fixtures.map(f => {
          const opp = f.homeClubId === club!.id ? f.awayClubId : f.homeClubId;
          const oppClub = getClub(opp);
          return (
            <div className="calendar-row" key={f.id}>
              <span>{formatDate(f.date)}</span>
              <div>
                <Crest name={oppClub?.shortName ?? '?'} clubId={opp} small />
                <strong>{oppClub?.shortName ?? '?'}</strong>
                <span className="tiny-tag">{f.homeClubId === club!.id ? 'DOM' : 'EXT'}</span>
              </div>
              <span>{divisionName} · J{f.dayNumber}</span>
              <strong>{f.played ? `${f.homeScore ?? 0} - ${f.awayScore ?? 0}` : '—'}</strong>
            </div>
          );
        })}
        {fixtures.length === 0 && (
          <div className="empty-state">
            <Flag /><h2>{filter === 'results' ? 'Aucun resultat pour le moment.' : 'Calendrier en attente.'}</h2>
          </div>
        )}
      </div>

      {standings.length > 0 && (
        <>
          <h2 style={{ margin: '32px 0 16px', fontFamily: "'Barlow', sans-serif", fontSize: 16, fontWeight: 700 }}>Classement {divisionName}</h2>
          <div className="season-table">
            <div className="table-head"><span>#</span><span>CLUB</span><span>MJ</span><span>V</span><span>N</span><span>D</span><span>PTS</span></div>
            {standings.map(row => {
              const rc = getClub(row.clubId);
              return (
                <div className={`calendar-row ${row.clubId === club!.id ? 'highlight' : ''}`} key={row.clubId}>
                  <strong>{row.position}</strong>
                  <div>
                    <Crest name={rc?.shortName ?? '?'} clubId={row.clubId} small />
                    <strong>{rc?.shortName ?? '?'}</strong>
                  </div>
                  <span>{row.played}</span>
                  <span>{row.won}</span>
                  <span>{row.drawn}</span>
                  <span>{row.lost}</span>
                  <strong>{row.points}</strong>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Shell>
  );
}
