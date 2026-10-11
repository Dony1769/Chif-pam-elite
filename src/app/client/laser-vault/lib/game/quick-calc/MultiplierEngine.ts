/**
 * Multiplier Engine
 * Manages multiplier progression and calculation
 */

export class MultiplierEngine {
  private multiplierProgression: number[] = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.2, 1.5, 2.0, 2.5, 3.0];
  private currentIndex = 0;
  private onMultiplierChange: ((multiplier: number) => void) | null = null;

  getCurrentMultiplier(): number {
    return this.multiplierProgression[this.currentIndex] ?? 0.5;
  }

  getNextMultiplier(): number {
    if (this.currentIndex + 1 < this.multiplierProgression.length) {
      return this.multiplierProgression[this.currentIndex + 1];
    }
    return this.multiplierProgression[this.multiplierProgression.length - 1];
  }

  advance(): void {
    if (this.currentIndex < this.multiplierProgression.length - 1) {
      this.currentIndex++;
      if (this.onMultiplierChange) {
        this.onMultiplierChange(this.getCurrentMultiplier());
      }
    }
  }

  getProgress(): number {
    return (this.currentIndex / (this.multiplierProgression.length - 1)) * 100;
  }

  getStepsRemaining(): number {
    return this.multiplierProgression.length - 1 - this.currentIndex;
  }

  isMaxMultiplier(): boolean {
    return this.currentIndex === this.multiplierProgression.length - 1;
  }

  reset(): void {
    this.currentIndex = 0;
  }

  setMultiplierProgression(progression: number[]): void {
    this.multiplierProgression = progression;
    this.currentIndex = Math.min(this.currentIndex, progression.length - 1);
  }

  onMultiplierChangeEvent(callback: (multiplier: number) => void): void {
    this.onMultiplierChange = callback;
  }
}

export const multiplierEngine = new MultiplierEngine();
