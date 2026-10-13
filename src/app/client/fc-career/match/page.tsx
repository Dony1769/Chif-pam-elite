"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, ArrowRight, CalendarDays, Play, Sparkles, Trophy } from "lucide-react";
import { Shell, Crest, PageTitle } from "../lib/components";
import { Button, Link } from "../lib/ui";
import { loadGame, saveGame } from "../utils/storage";
import { toCareerState, toFullSave, type CareerRuntimeState } from "../types/career";
import { getClub, getClubsByDivision } from "../constants/clubs";
import { nextUserFixture, advanceSeason } from "../engine/season-manager";
import { simulateMatch } from "../engine/match-engine";
import { endOfWeek } from "../engine/progression";
import { emptyWallet, computeMatchBonuses, processWeeklyPayroll } from "../engine/economic-engine";
import { DIVISION_INFO } from "../types/club";
import { formatDate, formatRating } from "../utils/formatters";
import type { SimulatedMatch } from "../types/match";
import type { Player, SeasonStatLine } from "../types/player";

function emptyStatLine(seasonYear: number, clubId: string, competitionId: string): SeasonStatLine {
  return { seasonYear, clubId, competitionId, matches: 0, starts: 0, minutes: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0, averageRating: 0, overallAtSeasonEnd: 0 };
}

export default function MatchPage() {
  const router = useRouter();
  const [career, setCareer] = useState<CareerRuntimeState | null>(null);
  const [lastMatch, setLastMatch] = useState<SimulatedMatch | null>(null);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    const save = loadGame();
    if (!save?.player) { router.replace("/client/fc-career/create-player"); return; }
    setCareer(toCareerState(save));
  }, [router]);

  const persist = useCallback((next: CareerRuntimeState) => {
    setCareer(next);
    saveGame(toFullSave(next));
  }, []);

  if (!career?.player) {
    return <Shell><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 200px)', opacity: .6, gap: 8 }}><Sparkles className="animate-pulse" size={16} /><span style={{ fontSize: 12 }}>Chargement...</span></div></Shell>;
  }

  const player = career.player;
  const club = getClub(player.contract.clubId)!;
  const season = career.meta.season;
  const divisionName = DIVISION_INFO[club.division]?.name ?? club.division;
  const fixture = season ? nextUserFixture(season, club.id) : undefined;

  function playMatch() {
    if (!career || !player || !club || !season || !fixture) return;
    setSimulating(true);
    const home = getClub(fixture.homeClubId)!;
    const away = getClub(fixture.awayClubId)!;
    const sim = simulateMatch(home, away, player);
    const line = { ...(player.seasonStats[0] ?? emptyStatLine(season.seasonYear, club.id, fixture.competitionId)) };
    line.matches += 1;
    if (sim.userPlayed) line.starts += 1;
    line.minutes += sim.userMinutes;
    line.goals += sim.userRating.goals;
    line.assists += sim.userRating.assists;
    line.averageRating = (line.averageRating * (line.matches - 1) + sim.userRating.rating) / line.matches;
    const updatedPlayer: Player = {
      ...player,
      seasonStats: [line, ...player.seasonStats.slice(1)],
      fatigue: Math.min(100, player.fatigue + 22),
      form: Math.max(0, Math.min(100, player.form + (sim.userRating.rating >= 7 ? 4 : sim.userRating.rating <= 5 ? -3 : 0))),
    };
    const advanced = advanceSeason(season, [{ dayId: fixture.id, homeScore: sim.homeScore, awayScore: sim.awayScore }]);
    const wallet = career.wallet ?? emptyWallet();
    const bonuses = computeMatchBonuses(updatedPlayer, sim);
    const payroll = processWeeklyPayroll(wallet, updatedPlayer, advanced.currentDay, bonuses, [], updatedPlayer.seasonStats[0]?.minutes ?? 0, 200);
    persist({
      ...career,
      player: endOfWeek(updatedPlayer),
      wallet: payroll.wallet,
      meta: { ...career.meta, season: advanced },
      lastMatch: sim,
    });
    setLastMatch(sim);
    setSimulating(false);
  }

  return (
    <Shell>
      <PageTitle
        eyebrow="CENTRE DE MATCH"
        title={lastMatch ? 'Le coup de sifflet final.' : 'Le rendez-vous du terrain.'}
        subtitle={fixture ? `${divisionName} · Journee ${fixture.dayNumber}` : 'Tous les matchs ont ete disputes.'}
      />
      <section className="match-arena">
        <div className="arena-content" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 32, textAlign: 'center' }}>
          {fixture ? (
            <>
              <div className="competition" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24, fontSize: 11, color: 'var(--muted-foreground)' }}>
                <Trophy size={14} />{divisionName}<span>J{fixture.dayNumber}</span>
              </div>
              <div className="versus" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
                <div style={{ textAlign: 'center' }}>
                  <Crest name={getClub(fixture.homeClubId)?.shortName ?? ''} clubId={fixture.homeClubId} />
                  <strong style={{ display: 'block', marginTop: 8, fontSize: 14 }}>{getClub(fixture.homeClubId)?.shortName ?? '?'}</strong>
                  <span style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>{fixture.homeClubId === club.id ? 'DOMICILE' : ''}</span>
                </div>
                <span style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Barlow', sans-serif", color: 'var(--muted-foreground)' }}>VS</span>
                <div style={{ textAlign: 'center' }}>
                  <Crest name={getClub(fixture.awayClubId)?.shortName ?? ''} clubId={fixture.awayClubId} />
                  <strong style={{ display: 'block', marginTop: 8, fontSize: 14 }}>{getClub(fixture.awayClubId)?.shortName ?? '?'}</strong>
                  <span style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>{fixture.awayClubId === club.id ? 'EXTERIEUR' : ''}</span>
                </div>
              </div>
              <div style={{ marginTop: 20, fontSize: 11, color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <CalendarDays size={12} />{formatDate(fixture.date)}
              </div>
              <Button variant="career" className="full-width" style={{ marginTop: 24 }} onClick={playMatch} disabled={simulating}>
                <Play />{simulating ? 'Simulation...' : 'Jouer le match'}<ArrowRight />
              </Button>
            </>
          ) : (
            <div className="empty-state" style={{ padding: 40 }}>
              <Trophy size={32} style={{ opacity: .4 }} />
              <h2 style={{ marginTop: 16 }}>Saison terminee</h2>
              <p style={{ color: 'var(--muted-foreground)', fontSize: 12 }}>Tous les matchs de cette saison ont ete disputes.</p>
            </div>
          )}
        </div>
      </section>

      {lastMatch && (
        <section style={{ marginTop: 24, padding: 20, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <h2 style={{ textAlign: 'center', fontSize: 24, fontWeight: 700, fontFamily: "'Barlow', sans-serif" }}>
            {getClub(lastMatch.homeClubId)?.shortName} {lastMatch.homeScore} - {lastMatch.awayScore} {getClub(lastMatch.awayClubId)?.shortName}
          </h2>
          <div style={{ textAlign: 'center', fontSize: 12, marginTop: 10, color: 'var(--muted-foreground)' }}>
            Note : <strong style={{ color: 'var(--primary)' }}>{formatRating(lastMatch.userRating.rating)}</strong>
            {' '}&middot; {lastMatch.userRating.goals} but(s), {lastMatch.userRating.assists} passe(s) dec.
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
            <Button asChild variant="outline">
              <Link to="/dashboard">Retour au tableau de bord<ArrowRight /></Link>
            </Button>
          </div>
        </section>
      )}
    </Shell>
  );
}
