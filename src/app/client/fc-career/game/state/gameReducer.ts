/**
 * FC CAREER — Réducteur central
 * Fonction pure : (state, action) → state
 * Aucune dépendance React, testable isolément.
 */

import type { GameAction } from "./actions";
import type { GameSaveV1 } from "../persistence/saveSchema";
import { computeOverall, positionFamily } from "../domain/player";
import { clamp } from "../utils/validation";
import type { SeasonSchedule } from "../domain/season";
import { applyResultsToSchedule, updateStanding } from "../domain/worldSimulator";

export interface GameState {
  save: GameSaveV1 | null;
  /** La sauvegarde a-t-elle été modifiée depuis le dernier write ? */
  isDirty: boolean;
  isLoading: boolean;
  error: string | null;
}

export const initialState: GameState = {
  save: null,
  isDirty: false,
  isLoading: true,
  error: null,
};

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {

    case "LOAD_SAVE":
    case "NEW_GAME":
      return {
        ...state,
        save: action.save,
        isDirty: false,
        isLoading: false,
        error: null,
      };

    case "SAVE_GAME":
      return { ...state, isDirty: false };

    case "DELETE_SAVE":
      return { ...initialState, isLoading: false };

    case "UPDATE_PLAYER": {
      if (!state.save) return state;
      const updated = { ...state.save.player, ...action.player };
      // Recalcul de l'overall si les attributs ont changé
      if (action.player.attributes) {
        updated.overall = computeOverall(
          updated.attributes,
          positionFamily(updated.position),
        );
      }
      return {
        ...state,
        save: { ...state.save, player: updated },
        isDirty: true,
      };
    }

    case "INVEST_ATTRIBUTE": {
      if (!state.save) return state;
      const { attribute, amount } = action;
      const player = state.save.player;
      if (player.paPoints < amount) return state; // pas assez de PA
      const newVal = clamp((player.attributes[attribute] ?? 50) + amount, 1, player.potential);
      const newAttrs = { ...player.attributes, [attribute]: newVal };
      const newOverall = computeOverall(newAttrs, positionFamily(player.position));
      return {
        ...state,
        save: {
          ...state.save,
          player: {
            ...player,
            attributes: newAttrs,
            overall: newOverall,
            paPoints: player.paPoints - amount,
          },
        },
        isDirty: true,
      };
    }

    case "UPDATE_CONDITION": {
      if (!state.save) return state;
      return {
        ...state,
        save: {
          ...state.save,
          player: {
            ...state.save.player,
            condition: { ...state.save.player.condition, ...action.condition },
          },
        },
        isDirty: true,
      };
    }

    case "APPLY_MATCH_RESULT": {
      if (!state.save) return state;
      const { result } = action;
      const ids = state.save.career.completedMatchIds as unknown as string[];
      // Idempotence : résultat déjà appliqué
      if (ids.includes(result.matchId)) return state;

      const player = state.save.player;
      const oldStats = player.stats;
      const lastSeasonStats = oldStats.seasons.find(
        (s) => s.season === state.save!.career.season,
      );

      const updatedSeasonStats = lastSeasonStats
        ? {
            ...lastSeasonStats,
            appearances: lastSeasonStats.appearances + 1,
            goals: lastSeasonStats.goals + result.playerStats.goals,
            assists: lastSeasonStats.assists + result.playerStats.assists,
            minutesPlayed: lastSeasonStats.minutesPlayed + result.playerStats.minutesPlayed,
            yellowCards: lastSeasonStats.yellowCards + result.playerStats.yellowCards,
            redCards: lastSeasonStats.redCards + result.playerStats.redCards,
            avgRating: parseFloat(
              (
                (lastSeasonStats.avgRating * lastSeasonStats.appearances + result.playerRating) /
                (lastSeasonStats.appearances + 1)
              ).toFixed(2),
            ),
          }
        : {
            season: state.save.career.season,
            clubId: player.contract.clubId,
            appearances: 1,
            starts: result.playerStats.minutesPlayed > 45 ? 1 : 0,
            goals: result.playerStats.goals,
            assists: result.playerStats.assists,
            yellowCards: result.playerStats.yellowCards,
            redCards: result.playerStats.redCards,
            minutesPlayed: result.playerStats.minutesPlayed,
            avgRating: result.playerRating,
            motmCount: 0,
          };

      const updatedSeasons = lastSeasonStats
        ? oldStats.seasons.map((s) =>
            s.season === state.save!.career.season ? updatedSeasonStats : s,
          )
        : [...oldStats.seasons, updatedSeasonStats];

      const updatedCareerStats = {
        ...oldStats,
        totalAppearances: oldStats.totalAppearances + 1,
        totalGoals: oldStats.totalGoals + result.playerStats.goals,
        totalAssists: oldStats.totalAssists + result.playerStats.assists,
        totalMinutes: oldStats.totalMinutes + result.playerStats.minutesPlayed,
        totalYellowCards: oldStats.totalYellowCards + result.playerStats.yellowCards,
        totalRedCards: oldStats.totalRedCards + result.playerStats.redCards,
        seasons: updatedSeasons,
      };

      // Ajouter les résultats de match à l'historique world (20 max)
      const lastResults = [result, ...state.save.world.lastMatchResults].slice(0, 20);

      return {
        ...state,
        save: {
          ...state.save,
          player: {
            ...player,
            stats: updatedCareerStats,
            paPoints: player.paPoints + result.paEarned,
          },
          career: {
            ...state.save.career,
            completedMatchIds: [...ids, result.matchId] as unknown as string[],
          },
          world: { ...state.save.world, lastMatchResults: lastResults },
        },
        isDirty: true,
      };
    }

    case "ADVANCE_WEEK": {
      if (!state.save) return state;
      const career = state.save.career;
      const newWeek = career.week + 1;
      const newMatchday = career.matchday + 1;
      // Salaire hebdomadaire
      const wallet = state.save.wallet;
      return {
        ...state,
        save: {
          ...state.save,
          career: { ...career, week: newWeek, matchday: newMatchday },
          wallet: {
            ...wallet,
            balance: wallet.balance + wallet.weeklyWage,
            totalEarned: wallet.totalEarned + wallet.weeklyWage,
          },
          meta: { ...state.save.meta, savedAt: Date.now() },
        },
        isDirty: true,
      };
    }

    case "ADVANCE_SEASON": {
      if (!state.save) return state;
      return {
        ...state,
        save: {
          ...state.save,
          career: {
            ...state.save.career,
            season: state.save.career.season + 1,
            week: 1,
            matchday: 1,
          },
        },
        isDirty: true,
      };
    }

    case "END_SEASON": {
      if (!state.save) return state;
      const { setup, summary, paBonus } = action;
      const save = state.save;
      const career = save.career;

      // Nouveau calendrier
      const newSchedules: SeasonSchedule[] = setup.newSchedule
        ? [...save.world.schedules, setup.newSchedule]
        : save.world.schedules;

      // Nouveau state académie
      const newAcademy = setup.newAcademyStage
        ? {
            stage: setup.newAcademyStage as NonNullable<typeof career.academy>["stage"],
            evaluationScore: 50,
            promotionThreshold: 80,
            weeksInStage: 0,
          }
        : null;

      return {
        ...state,
        save: {
          ...save,
          player: {
            ...save.player,
            age: setup.newAge,
            paPoints: save.player.paPoints + paBonus,
            progressionHistory: [
              ...save.player.progressionHistory,
              {
                season: career.season,
                overall: save.player.overall,
                potential: save.player.potential,
                paPoints: save.player.paPoints,
              },
            ],
          },
          career: {
            ...career,
            season: career.season + 1,
            week: 1,
            matchday: 1,
            phase: setup.newPhase,
            academy: newAcademy,
            completedMatchIds: [],
            seasonSummaries: [...career.seasonSummaries, summary],
          },
          world: {
            ...save.world,
            schedules: newSchedules,
          },
          meta: { ...save.meta, savedAt: Date.now() },
        },
        isDirty: true,
      };
    }

    case "SIMULATE_WORLD_MATCHDAY": {
      if (!state.save) return state;
      const { matchday, results, leagueId } = action;

      // Mise à jour des fixtures du schedule de ligue
      const updatedSchedules = state.save.world.schedules.map((s) =>
        s.competitionId === leagueId
          ? applyResultsToSchedule(s, results)
          : s,
      );

      // Mise à jour du classement de la ligue
      const playerClubId = state.save.player.contract.clubId;
      const currentStanding = state.save.world.standings[leagueId] ?? [];
      const newStanding = updateStanding(currentStanding, results, playerClubId);

      return {
        ...state,
        save: {
          ...state.save,
          world: {
            ...state.save.world,
            schedules: updatedSchedules,
            standings: {
              ...state.save.world.standings,
              [leagueId]: newStanding,
            },
          },
        },
        isDirty: true,
      };
    }

    case "CREDIT_WALLET": {
      if (!state.save) return state;
      const w = state.save.wallet;
      return {
        ...state,
        save: {
          ...state.save,
          wallet: { ...w, balance: w.balance + action.amount, totalEarned: w.totalEarned + action.amount },
        },
        isDirty: true,
      };
    }

    case "DEBIT_WALLET": {
      if (!state.save) return state;
      const w = state.save.wallet;
      return {
        ...state,
        save: {
          ...state.save,
          wallet: { ...w, balance: w.balance - action.amount, totalSpent: w.totalSpent + action.amount },
        },
        isDirty: true,
      };
    }

    case "SET_ERROR":
      return { ...state, error: action.message };

    case "CLEAR_ERROR":
      return { ...state, error: null };

    default:
      return state;
  }
}
