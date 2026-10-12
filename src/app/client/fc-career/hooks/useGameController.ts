/**
 * FC CAREER — GameController : orchestrateur des actions du hub.
 *
 * Point d'entrée unique des composants Dashboard / TrainingCenter / MatchCenter :
 * - lit l'état global via useGameContext (hydraté + auto-sauvegardé par GameProvider)
 * - applique les moteurs purs (progression, season-manager, match-engine, économie)
 * - dispatch les actions réductrices correspondantes
 * - notifie l'utilisateur via UIContext (toasts animés)
 *
 * Les composants d'UI n'appellent donc JAMAIS directement le moteur : ils passent
 * par ce contrôleur (séparation moteur / état / vue de FC-CAREER-ARCHITECTURE.md).
 */

"use client";

import { useCallback, useMemo } from "react";
import { useGameContext } from "../context/GameContext";
import { useUIContext } from "../context/UIContext";
import type { Player, SeasonStatLine } from "../types/player";
import type { SimulatedMatch } from "../types/match";
import type { MatchDay } from "../types/game";
import type { SalaryOffer } from "../types/economy";
import { TRAINING_SESSIONS, runTrainingSession, applyRest, endOfWeek, type TrainingType } from "../engine/progression";
import { createSeason, advanceSeason, nextUserFixture, playMatchday } from "../engine/season-manager";
import { simulateMatch } from "../engine/match-engine";
import { emptyWallet, processWeeklyPayroll, computeMatchBonuses } from "../engine/economic-engine";
import { isTransferWindowOpen } from "../engine/transfer-system";
import { getClub, getClubsByDivision } from "../constants/clubs";
import { formatRating } from "../utils/formatters";
import { useTransfers } from "./useTransfers";

/** Ligne de stats vierge pour une saison donnée. */
function emptyStatLine(seasonYear: number, clubId: string, competitionId: string): SeasonStatLine {
  return {
    seasonYear,
    clubId,
    competitionId,
    matches: 0,
    starts: 0,
    minutes: 0,
    goals: 0,
    assists: 0,
    yellowCards: 0,
    redCards: 0,
    averageRating: 0,
    overallAtSeasonEnd: 0,
  };
}

export interface PlayMatchOutcome {
  sim: SimulatedMatch;
  message: string;
}

export interface GameController {
  /** Crée et persiste la saison si absente (idempotent). */
  ensureSeason: () => void;
  /** Prochaine rencontre du joueur (undefined si saison finie/absente). */
  upcomingFixture: () => MatchDay | undefined;
  /** Lance une séance d'entraînement ; retourne un message de résultat. */
  train: (focus: TrainingType) => string | null;
  /** Journée de repos (fatigue -25). */
  rest: () => string;
  /** Simule la prochaine journée complète + le match du joueur, paie les primes. */
  playNextMatch: () => PlayMatchOutcome | null;
  /** Avance la saison d'une journée sans impliquer le joueur (matchs IA uniquement). */
  skipMatchday: () => string | null;
  /* ---------- Transferts (Phase 3.12) ---------- */
  /** Le mercato est-il ouvert ? */
  transferWindowOpen: boolean;
  /** Offres entrantes valides pour la journée courante. */
  transferOffers: SalaryOffer[];
  /** Force la régénération des offres. */
  refreshOffers: () => SalaryOffer[];
  /** Accepte une offre (contrat + prime à la signature). */
  acceptTransfer: (offer: SalaryOffer) => { ok: boolean; message: string };
  /** Envoie une contre-offre (salaire/bonus améliorés). */
  negotiateOffer: (offer: SalaryOffer) => SalaryOffer;
}

export function useGameController(): GameController {
  const { state, dispatch } = useGameContext();
  const { notify } = useUIContext();
  const transfers = useTransfers();

  const { player, season, wallet } = state;
  const club = player ? getClub(player.contract.clubId) ?? null : null;

  /* ---------------- Saison ---------------- */

  const ensureSeason = useCallback(() => {
    if (!player || !club || state.season) return;
    const s = createSeason(getClubsByDivision(club.division), new Date().getFullYear() + 1, club);
    dispatch({ type: "SET_SEASON", payload: s });
  }, [player, club, state.season, dispatch]);

  const upcomingFixture = useCallback(
    () => (season && club ? nextUserFixture(season, club.id) : undefined),
    [season, club],
  );

  /* ---------------- Entraînement / repos ---------------- */

  const train = useCallback(
    (focus: TrainingType): string | null => {
      if (!player) return null;
      const session = TRAINING_SESSIONS.find((s) => s.id === focus);
      if (!session) return null;
      const { player: updated, result } = runTrainingSession(player, session);
      dispatch({ type: "SET_PLAYER", payload: updated });
      return result.improved.length > 0
        ? `+${result.improved.length} attribut(s) amélioré(s) ! Overall ${result.overallAfter}`
        : "Séance terminée — progression minimale (fatigue ou plafond).";
    },
    [player, dispatch],
  );

  const rest = useCallback((): string => {
    if (!player) return "";
    dispatch({ type: "SET_PLAYER", payload: applyRest(player) });
    return "Repos : fatigue -25.";
  }, [player, dispatch]);

  /* ---------------- Match ---------------- */

  const playNextMatch = useCallback((): PlayMatchOutcome | null => {
    if (!player || !club || !season) return null;
    const fixture = nextUserFixture(season, club.id);
    if (!fixture) return null;

    const home = getClub(fixture.homeClubId);
    const away = getClub(fixture.awayClubId);
    if (!home || !away) return null;

    const seed = Date.now();
    const raw = simulateMatch(home, away, player, { seed });
    // Le moteur ne connaît pas la journée : on complète id / journée / compétition.
    const sim: SimulatedMatch = {
      ...raw,
      id: `${fixture.id}-${raw.id}`,
      dayNumber: fixture.dayNumber,
      competitionId: fixture.competitionId,
    };

    // 1) Stats saison du joueur
    const line: SeasonStatLine = {
      ...(player.seasonStats[0] ?? emptyStatLine(season.seasonYear, club.id, fixture.competitionId)),
    };
    line.matches += 1;
    if (sim.userPlayed) line.starts += 1;
    line.minutes += sim.userMinutes;
    line.goals += sim.userRating.goals;
    line.assists += sim.userRating.assists;
    line.averageRating =
      (line.averageRating * (line.matches - 1) + sim.userRating.rating) / line.matches;

    // 2) État physique / forme du joueur
    let updatedPlayer: Player = {
      ...player,
      seasonStats: [line, ...player.seasonStats.slice(1)],
      fatigue: Math.min(100, player.fatigue + 22),
      form: Math.max(
        0,
        Math.min(100, player.form + (sim.userRating.rating >= 7 ? 4 : sim.userRating.rating <= 5 ? -3 : 0)),
      ),
    };

    // 3) Journée complète simulée (matchs des autres clubs inclus)
    const advanced = advanceSeason(season, [
      { dayId: fixture.id, homeScore: sim.homeScore, awayScore: sim.awayScore },
    ]);

    // 4) Paie hebdomadaire (salaire + primes de match)
    const w = wallet ?? emptyWallet();
    const bonuses = computeMatchBonuses(updatedPlayer, sim);
    const payroll = processWeeklyPayroll(
      w,
      updatedPlayer,
      advanced.currentDay,
      bonuses,
      [],
      updatedPlayer.seasonStats[0]?.minutes ?? 0,
      200,
    );
    updatedPlayer = endOfWeek(updatedPlayer);

    dispatch({ type: "SET_PLAYER", payload: updatedPlayer });
    dispatch({ type: "SET_SEASON", payload: advanced });
    dispatch({ type: "SET_WALLET", payload: payroll.wallet });
    dispatch({ type: "SET_LAST_MATCH", payload: sim });

    const verdict = sim.userPlayed
      ? `Match joué · note ${formatRating(sim.userRating.rating)} · ${sim.homeScore}-${sim.awayScore}`
      : `Pas sélectionné · ${sim.homeScore}-${sim.awayScore}`;
    notify({ kind: sim.userRating.rating >= 7 ? "success" : "info", title: "Match terminé", message: verdict });

    return { sim, message: verdict };
  }, [player, club, season, wallet, dispatch, notify]);

  const skipMatchday = useCallback((): string | null => {
    if (!club || !season || season.isOver) return null;
    const { season: next } = playMatchday(season, club.id);
    dispatch({ type: "SET_SEASON", payload: next });
    return next.isOver ? "Saison terminée !" : `Journée ${season.currentDay} jouée.`;
  }, [club, season, dispatch]);

  return useMemo(
    () => ({
      ensureSeason,
      upcomingFixture,
      train,
      rest,
      playNextMatch,
      skipMatchday,
      transferWindowOpen: transfers.windowOpen,
      transferOffers: transfers.offers,
      refreshOffers: transfers.refreshOffers,
      acceptTransfer: transfers.acceptTransfer,
      negotiateOffer: transfers.negotiate,
    }),
    [ensureSeason, upcomingFixture, train, rest, playNextMatch, skipMatchday, transfers],
  );
}
