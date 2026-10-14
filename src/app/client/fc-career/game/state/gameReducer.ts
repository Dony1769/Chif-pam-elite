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
import { applyResultsToSchedule, updateStanding, simulateMatchday, computePromotionRelegation, updateClubReputation } from "../domain/worldSimulator";
import { generateAcademySchedule, buildInitialYouthLeagueStanding, YOUTH_LEAGUE_OPPONENTS, decideStartingStatus } from "../domain/academySchedule";
import { seedFromString, createRng } from "../utils/random";
import { computeTrustDelta, roleFromTrust } from "../domain/coach";
import { createInitialAgentState } from "../domain/agent";
import { computeWeeklyCondition, paCostForAttribute } from "../domain/training";
import { buildInitialChallenges, activateChallenge, updateChallengeProgress } from "../domain/challenges";
import { pickInitialRivals, updateRivalsEndOfSeason } from "../domain/rivals";
import { getAllWorldPlayers } from "../data/worldPlayers";
import { ageWorldPlayers, simulateWorldTransfers, generateTransferOffers } from "../domain/worldTransfers";
import { createInitialLockerRoom, updateLockerRoomWeekly, triggerLockerRoomEvent, resetLockerRoomEndOfSeason } from "../domain/lockerRoom";
import { createInitialPersonalLife, updatePersonalLifeWeekly, applyPersonalEvent, generatePersonalEvent } from "../domain/personalLife";
import { createInitialNationalTeam, updateNationalTeamEndOfSeason } from "../domain/nationalTeam";
import { advanceWorldWeek, endWorldSeason } from "../domain/worldEngine";
import { computeSeasonAwards, mergeAwards } from "../domain/awards";
import { updateSponsorMissions, buildMissionContext } from "../domain/sponsors";

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

    case "BATCH_INVEST_ATTRIBUTES": {
      if (!state.save) return state;
      let player = state.save.player;
      // Calcul du coût total et validation avant d'appliquer
      const totalCost = action.investments.reduce((sum, inv) => {
        let cost = 0;
        let val = player.attributes[inv.attribute] ?? 50;
        for (let i = 0; i < inv.amount; i++) {
          cost += paCostForAttribute(val + i);
        }
        return sum + cost;
      }, 0);
      if (player.paPoints < totalCost) return state;
      // Appliquer chaque investissement
      let newAttrs = { ...player.attributes };
      for (const inv of action.investments) {
        const currentVal = newAttrs[inv.attribute] ?? 50;
        const newVal = clamp(currentVal + inv.amount, 1, player.potential);
        newAttrs = { ...newAttrs, [inv.attribute]: newVal };
      }
      const newOverall = computeOverall(newAttrs, positionFamily(player.position));
      return {
        ...state,
        save: {
          ...state.save,
          player: {
            ...player,
            attributes: newAttrs,
            overall: newOverall,
            paPoints: player.paPoints - totalCost,
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

      // Mise à jour des missions sponsors après chaque match
      const updatedPlayerForMissions = { ...player, stats: updatedCareerStats };
      const missionCtx = buildMissionContext(
        updatedPlayerForMissions,
        state.save.career.season,
        state.save.world.standings as unknown as Record<string, { clubId: string }[]>,
        lastResults,
      );
      const updatedSponsorsAfterMatch = updateSponsorMissions(state.save.sponsors ?? [], missionCtx);

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
          sponsors: updatedSponsorsAfterMatch,
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

      // ── Relégation / Promotion dynamique ──────────────────────
      const seasonEndRng = createRng(seedFromString(`promo-relg-s${career.season}`));
      const promotionResults = Object.entries(save.world.standings).map(([leagueId, standing]) => {
        return computePromotionRelegation(leagueId, standing, standing.length, seasonEndRng);
      });

      // ── Réputation des clubs selon performances ────────────────
      const clubRepRng = createRng(seedFromString(`club-rep-s${career.season}`));
      const updatedClubs = save.world.clubs.map(club => {
        const leagueStanding = save.world.standings[club.leagueId];
        if (!leagueStanding) return club;
        return updateClubReputation(club, leagueStanding, career.season, clubRepRng);
      });

      // ── Vieillissement des joueurs monde ──────────────────────────
      const worldPlayers = (save as GameSaveV1 & { worldPlayers?: import("../data/worldPlayers").WorldPlayer[] }).worldPlayers ?? getAllWorldPlayers();
      const ageRng = createRng(seedFromString(`age-players-s${career.season}`));
      const { updated: agedPlayers, events: ageEvents } = ageWorldPlayers(worldPlayers, career.season, ageRng);

      // ── Transferts entre clubs du monde ───────────────────────────
      const transferRng = createRng(seedFromString(`world-transfers-s${career.season}`));
      const { updated: transferredPlayers, events: transferEvents } = simulateWorldTransfers(
        agedPlayers.filter(p => !(p as import("../data/worldPlayers").WorldPlayer & { retired?: boolean }).retired),
        updatedClubs,
        career.season,
        transferRng
      );

      // ── Offres de transfert pour le joueur humain ─────────────────
      const offerRng = createRng(seedFromString(`player-offers-s${career.season}`));
      const playerCurrentClub = updatedClubs.find(c => c.id === save.player.contract.clubId);
      const transferOffersForPlayer = playerCurrentClub
        ? generateTransferOffers(
            save.player.overall,
            save.player.age,
            playerCurrentClub.reputation,
            updatedClubs,
            career.season,
            offerRng,
          )
        : [];
      // Convertir en ContractOffer pour l'agentState
      const agentState = save.agentState ?? createInitialAgentState();
      const newContractOffers: import("../domain/agent").ContractOffer[] = transferOffersForPlayer.map((offer, i) => ({
        id: `auto-offer-s${career.season}-${i}`,
        clubId: offer.clubId,
        clubName: offer.clubName,
        season: career.season,
        week: 1,
        terms: {
          clubId: offer.clubId,
          salary: offer.proposedSalary,
          bonusGoal: 0,
          bonusAssist: 0,
          startSeason: career.season + 1,
          endSeason: offer.isLoan ? career.season + 2 : career.season + 3,
          role: "starter" as import("../domain/player").ContractRole,
        },
        transferFee: offer.transferFee,
        isLoan: offer.isLoan,
        loanEndSeason: offer.isLoan ? career.season + 2 : undefined,
        expiresInWeeks: 8,
        status: "pending" as const,
        message: offer.message,
      }));

      // ── Mise à jour des rivaux en fin de saison ───────────────────
      const allWorldPlayersForRivals = getAllWorldPlayers();
      const updatedRivals = updateRivalsEndOfSeason(
        save.rivals ?? [],
        allWorldPlayersForRivals,
        save.player.overall,
        save.player.contract.clubId,
        save.player.position,
        career.season,
      );

      // ── Récompenses de fin de saison (Section 9) ─────────────────
      const playerLeagueId = save.world.clubs.find(c => c.id === save.player.contract.clubId)?.leagueId ?? "";
      const newSeasonAwards = computeSeasonAwards({
        player: save.player,
        season: career.season,
        standings: save.world.standings,
        playerClubId: save.player.contract.clubId,
        playerLeagueId,
      });
      const allAwards = mergeAwards(save.awards ?? [], newSeasonAwards);

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
            clubs: updatedClubs,
          },
          worldPlayers: transferredPlayers,
          worldTransferHistory: [...((save as GameSaveV1 & { worldTransferHistory?: import("../domain/worldTransfers").WorldTransferEvent[] }).worldTransferHistory ?? []), ...ageEvents, ...transferEvents].slice(-100),
          agentState: {
            ...agentState,
            offers: [
              ...agentState.offers.filter(o => o.status === "pending"),
              ...newContractOffers,
            ],
          },
          rivals: updatedRivals,
          awards: allAwards,
          seasonPromotionResults: promotionResults,
          youthLeagueStanding: undefined, // réinitialise pour la nouvelle saison
          academyMatchContexts: [], // réinitialise pour la nouvelle saison
          weeksUninjured: 0,
          lockerRoom: resetLockerRoomEndOfSeason(save.lockerRoom ?? createInitialLockerRoom()),
          nationalTeam: (() => {
            const nationalRng = createRng(seedFromString(`national-s${career.season}`));
            const rngFn = () => nationalRng.float(0, 1);
            const currentNational = (save.nationalTeam as import("../domain/nationalTeam").NationalTeamState | undefined) ?? createInitialNationalTeam();
            return updateNationalTeamEndOfSeason(currentNational, save.player.overall, save.player.age, career.season, rngFn);
          })(),
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

      // Mettre à jour l'objectif selon son type — lié à l'événement réel du match
      const obj = coach.seasonObjective;
      const played = action.minutesPlayed > 0;
      const newCurrent = obj.completed ? obj.current
        : obj.type === "appearances" && played
          ? Math.min(obj.current + 1, obj.target)
        : obj.type === "goals"
          ? Math.min(obj.current + (action.goals ?? 0), obj.target)
        : obj.type === "assists"
          ? Math.min(obj.current + (action.assists ?? 0), obj.target)
        : obj.type === "rating"
          ? action.matchRating           // note du dernier match (pas cumulé)
        : obj.current;
      const newCompleted = obj.type === "rating"
        ? newCurrent >= obj.target
        : newCurrent >= obj.target;

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
      const fatigue = state.save.player.condition.fatigue;
      const injured = !!state.save.player.condition.injury;
      // Sécurité section 6 : limiter l'intensité selon la fatigue
      let safeIntensity = action.intensity;
      if (injured || fatigue > 85) safeIntensity = "light";
      else if (fatigue > 60 && safeIntensity === "intense") safeIntensity = "normal";
      return {
        ...state,
        save: {
          ...state.save,
          weekState: {
            ...weekState,
            trainingDone: true,
            trainingIntensity: safeIntensity,
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
      // Évaluer les missions sponsors à chaque fin de semaine (pour conditions de forme, classement, etc.)
      const weekMissionCtx = buildMissionContext(
        newPlayer,
        career.season,
        save.world.standings as unknown as Record<string, { clubId: string }[]>,
        save.world.lastMatchResults ?? [],
      );
      const updatedSponsors = updateSponsorMissions(
        (save.sponsors ?? []).map(s => s.weeksLeft > 0 ? { ...s, weeksLeft: s.weeksLeft - 1 } : s),
        weekMissionCtx,
      );

      // ── Simulation monde : avancer les autres clubs ──────────────
      const currentMatchday = career.matchday;
      const worldClubs = save.world.clubs ?? [];
      let newSchedules = save.world.schedules ?? [];
      let newStandings = { ...(save.world.standings ?? {}) };

      // Pendant les saisons académie, simuler quand même le monde avec la saison courante
      // ou la dernière saison disponible si la saison courante n'a pas encore de calendrier
      let scheduleIdx = newSchedules.findIndex(s => s.season === career.season);
      if (scheduleIdx < 0 && newSchedules.length > 0) {
        // Trouver la saison la plus récente dans les schedules
        scheduleIdx = newSchedules.reduce((best, s, i) =>
          s.season > (newSchedules[best]?.season ?? -1) ? i : best, 0);
      }
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

      // ── Mise à jour vestiaire ────────────────────────────────────
      const currentLockerRoom = save.lockerRoom ?? createInitialLockerRoom();
      // Récupérer le dernier résultat de match pour l'effet sur cohésion
      const lastMatchResult = weekState.matchPlayed && save.world.lastMatchResults.length > 0
        ? save.world.lastMatchResults[save.world.lastMatchResults.length - 1]
        : null;
      const lastMatchRating = lastMatchResult
        ? lastMatchResult.playerRating
        : null;
      const lastMatchWon = lastMatchResult
        ? (lastMatchResult.isHome
            ? lastMatchResult.scoreHome > lastMatchResult.scoreAway
            : lastMatchResult.scoreAway > lastMatchResult.scoreHome)
        : null;
      const updatedLockerRoom = updateLockerRoomWeekly(
        currentLockerRoom,
        lastMatchRating,
        lastMatchWon,
        career.week,
        career.season,
      );

      // Vie personnelle — mise à jour hebdomadaire
      const currentPersonalLife = save.personalLife ?? createInitialPersonalLife();
      const rngObj = createRng(seedFromString(`personal-${career.season}-${career.week}`));
      const rng = () => rngObj.float(0, 1);
      const newPersonalEvent = generatePersonalEvent(currentPersonalLife, save.player.age, career.season, career.week, rng);
      const updatedPersonalLife = newPersonalEvent
        ? applyPersonalEvent(updatePersonalLifeWeekly(currentPersonalLife), newPersonalEvent, true)
        : updatePersonalLifeWeekly(currentPersonalLife);

      // ── Sync challenges weekly ───────────────────────────────────
      const weeksUninjured = newPlayer.condition.injury ? 0 : (save.weeksUninjured ?? 0) + 1;
      const updatedChallenges = updateChallengeProgress(
        save.challenges ?? buildInitialChallenges(),
        {
          player: newPlayer,
          career: { season: career.season, week: newWeek },
          weeksUninjured,
          mediaRep: save.media?.mediaReputation,
          fanRating: save.fans?.fanRating,
        }
      );

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
          challenges: updatedChallenges,
          weeksUninjured,
          lockerRoom: updatedLockerRoom,
          personalLife: updatedPersonalLife,
          meta: { ...save.meta, savedAt: Date.now() },
        },
        isDirty: true,
      };
    }

    case "UPDATE_LOCKER_ROOM": {
      if (!state.save) return state;
      const prevLR = state.save.lockerRoom ?? createInitialLockerRoom();
      const newCohesion = Math.min(100, Math.max(0, prevLR.teamCohesion + (action.cohesionDelta ?? 0)));
      const newLP = Math.min(200, Math.max(0, prevLR.leadershipPoints + (action.leadershipDelta ?? 0)));
      return {
        ...state,
        save: {
          ...state.save,
          lockerRoom: {
            ...prevLR,
            teamCohesion: newCohesion,
            leadershipPoints: newLP,
            atmosphere: (newCohesion >= 85 ? "excellent" : newCohesion >= 65 ? "positive" : newCohesion >= 40 ? "neutral" : newCohesion >= 20 ? "tense" : "toxic") as import("../domain/lockerRoom").LockerRoomState["atmosphere"],
            recentEvents: action.event
              ? [action.event, ...prevLR.recentEvents].slice(0, 5)
              : prevLR.recentEvents,
          },
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

    case "UPDATE_FANS": {
      if (!state.save) return state;
      const prevFans = state.save.fans ?? { fanRating: 30, followers: 0, events: [] };
      const newFanRating = Math.max(0, Math.min(100, prevFans.fanRating + action.fanRatingDelta));
      const newFollowers = Math.max(0, prevFans.followers + action.followersDelta);
      const newEvents = action.event
        ? [...prevFans.events, action.event].slice(-20)
        : prevFans.events;
      return {
        ...state,
        save: {
          ...state.save,
          fans: { fanRating: newFanRating, followers: newFollowers, events: newEvents },
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

    case "ACTIVATE_CHALLENGE": {
      if (!state.save) return state;
      const currentChallenges = state.save.challenges ?? buildInitialChallenges();
      const updated = activateChallenge(currentChallenges, action.challengeId, state.save.career.season);
      return {
        ...state,
        save: { ...state.save, challenges: updated },
        isDirty: true,
      };
    }

    case "SYNC_CHALLENGES": {
      if (!state.save) return state;
      const challenges = state.save.challenges ?? buildInitialChallenges();
      const player = state.save.player;
      const career = state.save.career;
      const currentSeasonStats = player.stats.seasons.find(s => s.season === career.season);
      const updated = updateChallengeProgress(challenges, {
        player,
        career,
        weeklyGoals: 0,
        weeklyAssists: 0,
        weeklyAppearance: false,
        weeksUninjured: state.save.weeksUninjured ?? 0,
        mediaRep: state.save.media?.mediaReputation ?? 40,
        fanRating: state.save.fans?.fanRating ?? 30,
        caps: state.save.nationalTeam?.caps ?? 0,
        weeklyRating: currentSeasonStats?.avgRating,
      });
      return {
        ...state,
        save: { ...state.save, challenges: updated },
        isDirty: true,
      };
    }

    case "INIT_RIVALS": {
      if (!state.save || (state.save.rivals ?? []).length > 0) return state;
      const worldPlayers = getAllWorldPlayers();
      const player = state.save.player;
      const rivals = pickInitialRivals(
        worldPlayers,
        player.position,
        player.contract.clubId,
        player.overall,
        state.save.career.season,
      );
      return {
        ...state,
        save: { ...state.save, rivals },
        isDirty: true,
      };
    }

    case "SEASON_END_RIVALS": {
      if (!state.save) return state;
      const rivals = state.save.rivals ?? [];
      if (rivals.length === 0) return state;
      const worldPlayers = getAllWorldPlayers();
      const player = state.save.player;
      const updated = updateRivalsEndOfSeason(
        rivals,
        worldPlayers,
        player.overall,
        player.contract.clubId,
        player.position,
        state.save.career.season,
      );
      return {
        ...state,
        save: { ...state.save, rivals: updated },
        isDirty: true,
      };
    }

    /* ── Académie ─────────────────────────────────────────────── */

    case "INIT_ACADEMY_SCHEDULE": {
      if (!state.save) return state;
      const { career } = state.save;
      const schedule = generateAcademySchedule(career.id, career.season);
      const existingIdx = state.save.world.schedules.findIndex(
        s => s.competitionId === "youth-league" && s.season === career.season
      );
      const newSchedules = existingIdx >= 0
        ? state.save.world.schedules.map((s, i) => i === existingIdx ? schedule : s)
        : [...state.save.world.schedules, schedule];
      return {
        ...state,
        save: {
          ...state.save,
          world: { ...state.save.world, schedules: newSchedules },
          youthLeagueStanding: state.save.youthLeagueStanding ?? buildInitialYouthLeagueStanding(),
          academyMatchContexts: state.save.academyMatchContexts ?? [],
        },
        isDirty: true,
      };
    }

    case "SET_ACADEMY_MATCH_CONTEXT": {
      if (!state.save) return state;
      const existing = state.save.academyMatchContexts ?? [];
      // Remplacer si le fixtureId existe déjà, sinon ajouter
      const idx = existing.findIndex(c => c.fixtureId === action.context.fixtureId);
      const updated = idx >= 0
        ? existing.map((c, i) => i === idx ? action.context : c)
        : [...existing, action.context];
      return {
        ...state,
        save: { ...state.save, academyMatchContexts: updated },
        isDirty: true,
      };
    }

    case "APPLY_ACADEMY_MATCH_EVAL": {
      if (!state.save) return state;
      const contexts = state.save.academyMatchContexts ?? [];
      const academy = state.save.career.academy;
      const updated = contexts.map(c =>
        c.fixtureId === action.fixtureId
          ? { ...c, postMatchEval: action.eval }
          : c
      );
      // Mettre à jour le score d'évaluation académie
      const newEvalScore = academy
        ? Math.max(0, Math.min(100, academy.evaluationScore + action.eval.evalScoreDelta))
        : 50;
      return {
        ...state,
        save: {
          ...state.save,
          academyMatchContexts: updated,
          career: {
            ...state.save.career,
            academy: academy
              ? { ...academy, evaluationScore: newEvalScore }
              : null,
          },
        },
        isDirty: true,
      };
    }

    case "UPDATE_YOUTH_LEAGUE_STANDING": {
      if (!state.save) return state;
      const { scoreAcademy, scoreOpp, opponentId } = action;
      const standing = state.save.youthLeagueStanding ?? buildInitialYouthLeagueStanding();
      const updated = standing.map(row => {
        if (row.teamId === "academy") {
          const won = scoreAcademy > scoreOpp;
          const drawn = scoreAcademy === scoreOpp;
          return {
            ...row,
            played: row.played + 1,
            won: row.won + (won ? 1 : 0),
            drawn: row.drawn + (drawn ? 1 : 0),
            lost: row.lost + (!won && !drawn ? 1 : 0),
            goalsFor: row.goalsFor + scoreAcademy,
            goalsAgainst: row.goalsAgainst + scoreOpp,
            points: row.points + (won ? 3 : drawn ? 1 : 0),
          };
        }
        if (row.teamId === opponentId) {
          const won = scoreOpp > scoreAcademy;
          const drawn = scoreOpp === scoreAcademy;
          return {
            ...row,
            played: row.played + 1,
            won: row.won + (won ? 1 : 0),
            drawn: row.drawn + (drawn ? 1 : 0),
            lost: row.lost + (!won && !drawn ? 1 : 0),
            goalsFor: row.goalsFor + scoreOpp,
            goalsAgainst: row.goalsAgainst + scoreAcademy,
            points: row.points + (won ? 3 : drawn ? 1 : 0),
          };
        }
        return row;
      });
      // Trier
      const sorted = [...updated].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        const gdA = a.goalsFor - a.goalsAgainst;
        const gdB = b.goalsFor - b.goalsAgainst;
        if (gdB !== gdA) return gdB - gdA;
        return b.goalsFor - a.goalsFor;
      });
      return {
        ...state,
        save: { ...state.save, youthLeagueStanding: sorted },
        isDirty: true,
      };
    }

    /* ── Relégation / Promotion ────────────────────────────────── */

    case "APPLY_PROMOTION_RELEGATION": {
      if (!state.save) return state;
      return {
        ...state,
        save: {
          ...state.save,
          seasonPromotionResults: action.results,
        },
        isDirty: true,
      };
    }

    case "AGE_WORLD_PLAYERS": {
      if (!state.save) return state;
      const save = state.save;
      const worldPlayers = (save as GameSaveV1 & { worldPlayers?: import("../data/worldPlayers").WorldPlayer[] }).worldPlayers ?? getAllWorldPlayers();
      const rng = createRng(seedFromString(`age-players-s${save.career.season}`));
      const { updated, events } = ageWorldPlayers(worldPlayers, save.career.season, rng);
      return {
        ...state,
        save: {
          ...save,
          worldPlayers: updated,
          worldTransferHistory: [...((save as GameSaveV1 & { worldTransferHistory?: import("../domain/worldTransfers").WorldTransferEvent[] }).worldTransferHistory ?? []), ...events].slice(-100),
        },
        isDirty: true,
      };
    }

    case "SIMULATE_WORLD_TRANSFERS_SEASON": {
      if (!state.save) return state;
      const save = state.save;
      const worldPlayers = (save as GameSaveV1 & { worldPlayers?: import("../data/worldPlayers").WorldPlayer[] }).worldPlayers ?? getAllWorldPlayers();
      const rng = createRng(seedFromString(`world-transfers-s${save.career.season}`));
      const { updated, events } = simulateWorldTransfers(worldPlayers, save.world.clubs, save.career.season, rng);
      return {
        ...state,
        save: {
          ...save,
          worldPlayers: updated,
          worldTransferHistory: [...((save as GameSaveV1 & { worldTransferHistory?: import("../domain/worldTransfers").WorldTransferEvent[] }).worldTransferHistory ?? []), ...events].slice(-100),
        },
        isDirty: true,
      };
    }

    case "ADD_WORLD_TRANSFER_EVENTS": {
      if (!state.save) return state;
      return {
        ...state,
        save: {
          ...state.save,
          worldTransferHistory: [...((state.save as GameSaveV1 & { worldTransferHistory?: import("../domain/worldTransfers").WorldTransferEvent[] }).worldTransferHistory ?? []), ...action.events].slice(-100),
        },
        isDirty: true,
      };
    }

    case "UPDATE_CLUB_REPUTATION_END_SEASON": {
      if (!state.save) return state;
      const save = state.save;
      const rng = createRng(seedFromString(`club-rep-s${save.career.season}`));
      const updatedClubs = save.world.clubs.map(club => {
        const leagueStanding = save.world.standings[club.leagueId];
        if (!leagueStanding) return club;
        return updateClubReputation(club, leagueStanding, save.career.season, rng);
      });
      return {
        ...state,
        save: {
          ...state.save,
          world: { ...save.world, clubs: updatedClubs },
        },
        isDirty: true,
      };
    }

    case "TRIGGER_PERSONAL_EVENT": {
      if (!state.save) return state;
      const pl = state.save.personalLife ?? createInitialPersonalLife();
      // Store event without applying impacts yet (user will respond)
      return {
        ...state,
        save: {
          ...state.save,
          personalLife: {
            ...pl,
            events: [action.event, ...pl.events].slice(0, 50),
          },
        },
        isDirty: true,
      };
    }

    case "PERSONAL_EVENT_RESPONSE": {
      if (!state.save) return state;
      const pl = state.save.personalLife ?? createInitialPersonalLife();
      const ev = pl.events.find(e => e.id === action.eventId && e.season === state.save!.career.season);
      if (!ev) return state;
      return {
        ...state,
        save: {
          ...state.save,
          personalLife: applyPersonalEvent(pl, ev, action.accepted),
        },
        isDirty: true,
      };
    }

    // ── Monde vivant : avancer d'une semaine ─────────────────────
    case "ADVANCE_WORLD_WEEK": {
      if (!state.save?.worldLiveState) return state;
      const { world: newWorld, weekResults, newsItems } = advanceWorldWeek(state.save.worldLiveState);
      void newsItems; // disponible pour log si besoin
      return {
        ...state,
        save: {
          ...state.save,
          worldLiveState: newWorld,
        },
        isDirty: true,
      };
    }

    // ── Monde vivant : fin de saison ──────────────────────────────
    case "END_WORLD_SEASON": {
      if (!state.save?.worldLiveState) return state;
      const { world: newWorld } = endWorldSeason(state.save.worldLiveState);
      return {
        ...state,
        save: {
          ...state.save,
          worldLiveState: newWorld,
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
