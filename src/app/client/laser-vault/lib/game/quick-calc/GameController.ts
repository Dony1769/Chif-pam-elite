/**
 * Main game controller orchestrating engines and state transitions
 */

import { GameConfig, GameResult, GameState, Question } from './types';

export class GameController {
  private state: GameState = {
    status: 'idle',
    score: 0,
    multiplier: 1,
    combo: 0,
    questionsAnswered: 0,
    timeRemaining: 0,
    currentQuestion: null,
    difficulty: 'intermédiaire',
  };

  constructor(private config: GameConfig) {}

  start(question: Question): void {
    this.state = {
      ...this.state,
      status: 'playing',
      currentQuestion: question,
      timeRemaining: 8,
    };
  }

  pause(): void {
    if (this.state.status === 'playing') {
      this.state.status = 'paused';
    }
  }

  resume(): void {
    if (this.state.status === 'paused') {
      this.state.status = 'playing';
    }
  }

  finish(result: GameResult): void {
    this.state = {
      ...this.state,
      status: result.finalScore > 0 ? 'won' : 'lost',
      score: result.finalScore,
      multiplier: result.finalMultiplier,
      combo: result.finalCombo,
      questionsAnswered: result.questionsAnswered,
    };
  }

  getState(): GameState {
    return this.state;
  }

  setQuestion(question: Question): void {
    this.state.currentQuestion = question;
  }

  setTimeRemaining(timeRemaining: number): void {
    this.state.timeRemaining = timeRemaining;
  }

  setScore(score: number): void {
    this.state.score = score;
  }

  setMultiplier(multiplier: number): void {
    this.state.multiplier = multiplier;
  }

  setCombo(combo: number): void {
    this.state.combo = combo;
  }

  setQuestionsAnswered(count: number): void {
    this.state.questionsAnswered = count;
  }
}

export const gameController = new GameController({
  initialBet: 10,
  challengeId: null,
  challengeFee: null,
  difficulty: 'intermédiaire',
});
