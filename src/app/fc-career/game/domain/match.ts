/**
 * FC CAREER — Domaine : Match
 * Types du moteur de match. Aucune dépendance React.
 */

export type MatchEventType =
  | "goal"
  | "assist"
  | "save"
  | "shot_on_target"
  | "shot_off_target"
  | "yellow_card"
  | "red_card"
  | "foul"
  | "dribble_success"
  | "interception"
  | "header"
  | "key_pass"
  | "own_goal"
  | "penalty_scored"
  | "penalty_missed"
  | "substitution"
  | "injury"
  | "tactical_change";

export interface MatchEvent {
  id: string;
  minute: number;
  type: MatchEventType;
  /** true = événement lié au joueur contrôlé */
  isPlayer: boolean;
  description: string;
}

export type TacticalDecisionId = "press" | "hold" | "attack_space" | "defend_deep";

export interface TacticalDecision {
  id: TacticalDecisionId;
  label: string;
  description: string;
  /** Modificateurs appliqués à la simulation */
  effects: {
    attackBonus?: number;   // +/- probabilité de but
    defenseBonus?: number;
    fatigueExtra?: number;
  };
}

export type MatchPhase = "pre" | "first_half" | "half_time" | "second_half" | "result";

export interface MatchConfig {
  id: string;
  season: number;
  matchday: number;
  playerClubId: string;
  opponentClubId: string;
  isHome: boolean;
  competitionId: string;
  objectives: MatchObjective[];
}

export interface MatchObjective {
  id: string;
  description: string;
  type: "win" | "score" | "clean_sheet" | "rating" | "motm";
  target?: number;
  rewardPA: number;
}

export interface MatchStats {
  goals: number;
  assists: number;
  shotsOnTarget: number;
  shotsOffTarget: number;
  saves: number;
  tackles: number;
  interceptions: number;
  foulsCommitted: number;
  yellowCards: number;
  redCards: number;
  minutesPlayed: number;
  keyPasses: number;
  dribbles: number;
}

export interface MatchResult {
  matchId: string;
  season: number;
  matchday: number;
  playerClubId: string;
  opponentClubId: string;
  isHome: boolean;
  competitionId: string;

  scoreHome: number;
  scoreAway: number;

  /** Évaluation du joueur 1.0–10.0 */
  playerRating: number;
  playerStats: MatchStats;
  events: MatchEvent[];

  /** Points d'attribut gagnés */
  paEarned: number;
  objectivesCompleted: string[];

  /** Clé idempotente : empêche la double validation */
  lockKey: string;
  /** Timestamp de fin de match */
  completedAt: number;
}
