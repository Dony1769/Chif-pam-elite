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
import { applyResultsToSchedule, updateStanding, simulateMatchday } from "../domain/worldSimulator";
import { computeTrustDelta, roleFromTrust } from "../domain/coach";
import { createInitialAgentState } from "../domain/agent";
import { computeWeeklyCondition } from "../domain/training";

const DEFAULT_WEEK_STATE = { trainingDone: false, trainingIntensity: null as null, matchPlayed: false };

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
      const lastResults = [result, ...(state.save.world.lastMatchResults ?? [])].slice(0, 20);

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

    case "UPDATE_COACH": {
      if (!state.save) return state;
      const currentCoach = state.save.coach;
      if (!currentCoach) return state;
      return {
        ...state,
        save: { ...state.save, coach: { ...currentCoach, ...action.coach } },
        isDirty: true,
      };
    }

    case "ADD_COACH_CONVERSATION": {
      if (!state.save) return state;
      const currentCoach = state.save.coach;
      if (!currentCoach) return state;
      // Appliquer l'effet de la conversation (trust, role)
      const effect = action.conversation.effect ?? {};
      const newTrust = clamp((currentCoach.trust) + (effect.trust ?? 0), 0, 100);
      const newRole  = effect.role ?? roleFromTrust(newTrust);
      return {
        ...state,
        save: {
          ...state.save,
          coach: {
            ...currentCoach,
            trust: newTrust,
            playerRole: newRole,
            conversations: [...currentCoach.conversations, action.conversation],
          },
        },
        isDirty: true,
      };
    }

    case "APPLY_MATCH_TRUST_DELTA": {
      if (!state.save?.coach) return state;
      const coach = state.save.coach;
      const delta = computeTrustDelta(coach.playerRole, action.matchRating, action.minutesPlayed);
      const newTrust = clamp(coach.trust + delta, 0, 100);
      const newRole  = roleFromTrust(newTrust);

      // Mettre à jour l'objectif appearances
      const obj = coach.seasonObjective;
      const newCurrent = obj.type === "appearances"
        ? Math.min(obj.current + 1, obj.target)
        : obj.type === "rating"
        ? action.matchRating
        : obj.current;
      const newCompleted = newCurrent >= obj.target;

      return {
        ...state,
        save: {
          ...state.save,
          coach: {
            ...coach,
            trust: newTrust,
            playerRole: newRole,
            seasonObjective: { ...obj, current: newCurrent, completed: newCompleted },
          },
        },
        isDirty: true,
      };
    }

    case "HIRE_AGENT": {
      if (!state.save) return state;
      const agentState = state.save.agentState ?? createInitialAgentState();
      return {
        ...state,
        save: {
          ...state.save,
          agentState: { ...agentState, agent: action.agent },
        },
        isDirty: true,
      };
    }

    case "FIRE_AGENT": {
      if (!state.save) return state;
      const agentState = state.save.agentState ?? createInitialAgentState();
      return {
        ...state,
        save: {
          ...state.save,
          agentState: { ...agentState, agent: null },
        },
        isDirty: true,
      };
    }

    case "ADD_CONTRACT_OFFER": {
      if (!state.save) return state;
      const agentState = state.save.agentState ?? createInitialAgentState();
      return {
        ...state,
        save: {
          ...state.save,
          agentState: {
            ...agentState,
            offers: [...agentState.offers, action.offer],
          },
        },
        isDirty: true,
      };
    }

    case "RESPOND_CONTRACT_OFFER": {
      if (!state.save) return state;
      const agentState = state.save.agentState ?? createInitialAgentState();
      const { offerId, accepted } = action;
      const offer = agentState.offers.find(o => o.id === offerId);
      if (!offer || offer.status !== "pending") return state;

      const updatedOffers = agentState.offers.map(o =>
        o.id === offerId ? { ...o, status: accepted ? "accepted" as const : "rejected" as const } : o
      );

      if (!accepted) {
        return {
          ...state,
          save: {
            ...state.save,
            agentState: { ...agentState, offers: updatedOffers },
          },
          isDirty: true,
        };
      }

      // Acceptation : mettre à jour le contrat du joueur et créer un transfert
      const newTransfer = {
        id: `transfer-${offerId}`,
        season: state.save.career.season,
        fromClubId: state.save.player.contract.clubId,
        toClubId: offer.clubId,
        fee: offer.transferFee,
        isLoan: offer.isLoan,
        loanEndSeason: offer.loanEndSeason,
      };

      return {
        ...state,
        save: {
          ...state.save,
          player: {
            ...state.save.player,
            contract: offer.terms,
          },
          agentState: {
            ...agentState,
            offers: updatedOffers,
            transfers: [...agentState.transfers, newTransfer],
          },
          wallet: {
            ...state.save.wallet,
            weeklyWage: offer.terms.salary,
          },
        },
        isDirty: true,
      };
    }

    case "REQUEST_OFFERS": {
      if (!state.save) return state;
      const agentState = state.save.agentState ?? createInitialAgentState();
      return {
        ...state,
        save: {
          ...state.save,
          agentState: {
            ...agentState,
            lastRequestWeek: state.save.career.week,
          },
        },
        isDirty: true,
      };
    }

    case "SET_TRAINING_CHOICE": {
      if (!state.save) return state;
      const weekState = state.save.weekState ?? { ...DEFAULT_WEEK_STATE };
      return {
        ...state,
        save: {
          ...state.save,
          weekState: {
            ...weekState,
            trainingDone: true,
            trainingIntensity: action.intensity,
          },
        },
        isDirty: true,
      };
    }

    case "MARK_MATCH_PLAYED": {
      if (!state.save) return state;
      const weekState = state.save.weekState ?? { ...DEFAULT_WEEK_STATE };
      return {
        ...state,
        save: {
          ...state.save,
          weekState: { ...weekState, matchPlayed: true },
        },
        isDirty: true,
      };
    }

    case "COMMIT_WEEK": {
      if (!state.save) return state;
      const save = state.save;
      const career = save.career;
      const player = save.player;
      const weekState = save.weekState ?? { ...DEFAULT_WEEK_STATE };

      // Appliquer l'entraînement si défini
      let newPlayer = player;
      if (weekState.trainingDone && weekState.trainingIntensity) {
        const delta = computeWeeklyCondition(
          player.condition.fatigue,
          player.condition.form,
          weekState.trainingIntensity,
        );
        const newFatigue = Math.min(100, player.condition.fatigue + delta.fatigueGain);
        const newForm    = Math.max(1, Math.min(100, player.condition.form + delta.formDelta));
        const newMorale  = Math.max(1, Math.min(100, player.condition.morale + delta.moraleDelta));
        newPlayer = {
          ...player,
          paPoints: player.paPoints + delta.paGained,
          condition: { ...player.condition, fatigue: newFatigue, form: newForm, morale: newMorale },
        };
      } else {
        // Récupération passive si pas d'entraînement
        const newFatigue = Math.max(0, player.condition.fatigue - 5);
        newPlayer = {
          ...player,
          condition: { ...player.condition, fatigue: newFatigue },
        };
      }

      // ── Guérison progressive des blessures ──────────────────────
      const currentInjury = newPlayer.condition.injury;
      if (currentInjury) {
        const remaining = currentInjury.daysRemaining - 7;
        if (remaining <= 0) {
          newPlayer = { ...newPlayer, condition: { ...newPlayer.condition, injury: null } };
        } else {
          newPlayer = { ...newPlayer, condition: { ...newPlayer.condition, injury: { ...currentInjury, daysRemaining: remaining } } };
        }
      }

      const newWeek     = career.week + 1;
      const newMatchday = career.matchday + 1;
      const wallet      = save.wallet;

      // ── Bonus sponsors actifs ────────────────────────────────────
      const activeSponsors = (save.sponsors ?? []).filter(s => s.weeksLeft > 0);
      const sponsorBonus = activeSponsors.reduce((sum, s) => sum + s.weeklyBonus, 0);
      const updatedSponsors = (save.sponsors ?? []).map(s =>
        s.weeksLeft > 0 ? { ...s, weeksLeft: s.weeksLeft - 1 } : s
      );

      // ── Simulation monde : avancer les autres clubs ──────────────
      const currentMatchday = career.matchday;
      const worldClubs = save.world.clubs ?? [];
      let newSchedules = save.world.schedules ?? [];
      let newStandings = { ...(save.world.standings ?? {}) };

      const scheduleIdx = newSchedules.findIndex(s => s.season === career.season);
      if (scheduleIdx >= 0 && worldClubs.length > 0) {
        const schedule = newSchedules[scheduleIdx];
        const seasonSeed = `s${career.season}`;
        const simResults = simulateMatchday(currentMatchday, schedule, worldClubs as import("../domain/club").Club[], seasonSeed);

        if (simResults.length > 0) {
          const updatedSchedule = applyResultsToSchedule(schedule, simResults);
          newSchedules = newSchedules.map((s, i) => i === scheduleIdx ? updatedSchedule : s);

          // Mise à jour des classements par ligue
          const leagueIds = Array.from(new Set(worldClubs.map((c) => (c as import("../domain/club").Club).leagueId)));
          for (const leagueId of leagueIds) {
            const leagueClubIds = worldClubs
              .filter((c) => (c as import("../domain/club").Club).leagueId === leagueId)
              .map((c) => (c as import("../domain/club").Club).id);
            const relevantResults = simResults.filter(r =>
              leagueClubIds.includes(r.homeClubId) || leagueClubIds.includes(r.awayClubId)
            );
            if (relevantResults.length > 0) {
              const currentRows = newStandings[leagueId] ?? leagueClubIds.map(id => ({
                clubId: id, position: 0, points: 0,
                played: 0, won: 0, drawn: 0, lost: 0,
                goalsFor: 0, goalsAgainst: 0, form: [],
              }));
              newStandings[leagueId] = updateStanding(currentRows, relevantResults, save.player.contract.clubId);
            }
          }
        }
      }

      return {
        ...state,
        save: {
          ...save,
          player: newPlayer,
          career: { ...career, week: newWeek, matchday: newMatchday },
          wallet: {
            ...wallet,
            balance:     wallet.balance + wallet.weeklyWage + sponsorBonus,
            totalEarned: wallet.totalEarned + wallet.weeklyWage + sponsorBonus,
          },
          sponsors: updatedSponsors,
          weekState: { trainingDone: false, trainingIntensity: null, matchPlayed: false },
          world: {
            ...save.world,
            schedules: newSchedules,
            standings: newStandings,
          },
          meta: { ...save.meta, savedAt: Date.now() },
        },
        isDirty: true,
      };
    }

    case "UPDATE_MEDIA": {
      if (!state.save) return state;
      const prev = state.save.media ?? { mediaReputation: 40, lastHeadline: null, pressConferences: [] };
      return {
        ...state,
        save: {
          ...state.save,
          media: {
            mediaReputation: Math.max(0, Math.min(100, prev.mediaReputation + action.mediaRepDelta)),
            lastHeadline: action.conference.answer,
            pressConferences: [...(prev.pressConferences ?? []), action.conference],
          },
        },
        isDirty: true,
      };
    }

    case "SIGN_SPONSOR": {
      if (!state.save) return state;
      return {
        ...state,
        save: {
          ...state.save,
          sponsors: [...(state.save.sponsors ?? []), action.contract],
        },
        isDirty: true,
      };
    }

    case "ADD_JOURNAL_ENTRY": {
      if (!state.save) return state;
      const current = state.save.journal ?? [];
      return {
        ...state,
        save: {
          ...state.save,
          journal: [...current, action.entry],
        },
        isDirty: true,
      };
    }

    case "APPLY_INJURY": {
      if (!state.save) return state;
      return {
        ...state,
        save: {
          ...state.save,
          player: {
            ...state.save.player,
            condition: {
              ...state.save.player.condition,
              injury: action.injury,
              fatigue: Math.min(100, state.save.player.condition.fatigue + 30),
              morale: Math.max(1, state.save.player.condition.morale - 20),
            },
          },
        },
        isDirty: true,
      };
    }

    case "HEAL_INJURY": {
      if (!state.save) return state;
      return {
        ...state,
        save: {
          ...state.save,
          player: {
            ...state.save.player,
            condition: {
              ...state.save.player.condition,
              injury: null,
            },
          },
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
