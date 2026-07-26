/**
 * Statistics tracker
 */

import { StatisticsSnapshot } from './types';

export class Statistics {
  private totalQuestions = 0;
  private correctAnswers = 0;
  private wrongAnswers = 0;
  private maxCombo = 0;
  private totalTime = 0;

  recordAnswer(correct: boolean, timeTakenMs: number): void {
    this.totalQuestions++;
    if (correct) {
      this.correctAnswers++;
    } else {
      this.wrongAnswers++;
    }
    this.totalTime += timeTakenMs;
  }

  updateMaxCombo(combo: number): void {
    this.maxCombo = Math.max(this.maxCombo, combo);
  }

  snapshot(): StatisticsSnapshot {
    return {
      totalQuestions: this.totalQuestions,
      correctAnswers: this.correctAnswers,
      wrongAnswers: this.wrongAnswers,
      maxCombo: this.maxCombo,
      averageTime: this.totalQuestions > 0 ? Math.round(this.totalTime / this.totalQuestions) : 0,
      totalTime: this.totalTime,
    };
  }

  reset(): void {
    this.totalQuestions = 0;
    this.correctAnswers = 0;
    this.wrongAnswers = 0;
    this.maxCombo = 0;
    this.totalTime = 0;
  }
}
