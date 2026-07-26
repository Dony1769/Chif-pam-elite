/**
 * Score Engine
 * Calculates and tracks game score and earnings
 */

export class ScoreEngine {
  private score = 0;
  private earnings = 0;
  private questionsAnswered = 0;
  private basePointsPerQuestion = 100;
  private onScoreChange: ((score: number) => void) | null = null;

  addPoints(points: number, multiplier: number = 1, comboMultiplier: number = 1): void {
    const totalPoints = Math.floor(points * multiplier * comboMultiplier);
    this.score += totalPoints;

    if (this.onScoreChange) {
      this.onScoreChange(this.score);
    }
  }

  addQuestionAnswer(): void {
    this.questionsAnswered++;
    this.addPoints(this.basePointsPerQuestion);
  }

  calculateEarnings(bet: number, multiplier: number, houseEdge: number = 0.15): number {
    if (multiplier < 1.0) return 0;
    const gross = Math.floor(bet * multiplier);
    const netPayout = Math.floor(gross * (1 - houseEdge));
    this.earnings = netPayout;
    return netPayout;
  }

  getScore(): number {
    return this.score;
  }

  getEarnings(): number {
    return this.earnings;
  }

  getQuestionsAnswered(): number {
    return this.questionsAnswered;
  }

  reset(): void {
    this.score = 0;
    this.earnings = 0;
    this.questionsAnswered = 0;
  }

  onScoreChangeEvent(callback: (score: number) => void): void {
    this.onScoreChange = callback;
  }
}

export const scoreEngine = new ScoreEngine();
