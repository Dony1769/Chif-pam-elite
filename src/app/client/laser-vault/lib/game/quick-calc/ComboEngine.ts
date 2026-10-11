/**
 * Combo Engine
 * Tracks consecutive correct answers and combo multipliers
 */

export class ComboEngine {
  private currentCombo = 0;
  private maxCombo = 0;
  private comboThresholds = [5, 10, 20, 50];
  private onComboChange: ((combo: number) => void) | null = null;
  private onComboMilestone: ((milestone: number) => void) | null = null;

  addCorrect(): void {
    const previousCombo = this.currentCombo;
    this.currentCombo++;
    this.maxCombo = Math.max(this.maxCombo, this.currentCombo);

    if (this.onComboChange) {
      this.onComboChange(this.currentCombo);
    }

    // Check for milestone
    if (this.comboThresholds.includes(this.currentCombo) && this.onComboMilestone) {
      this.onComboMilestone(this.currentCombo);
    }
  }

  addWrong(): void {
    this.currentCombo = 0;
    if (this.onComboChange) {
      this.onComboChange(0);
    }
  }

  getCurrentCombo(): number {
    return this.currentCombo;
  }

  getMaxCombo(): number {
    return this.maxCombo;
  }

  getComboMultiplier(): number {
    if (this.currentCombo < 5) return 1.0;
    if (this.currentCombo < 10) return 1.25;
    if (this.currentCombo < 20) return 1.5;
    if (this.currentCombo < 50) return 2.0;
    return 3.0;
  }

  reset(): void {
    this.currentCombo = 0;
    this.maxCombo = 0;
  }

  onComboChangeEvent(callback: (combo: number) => void): void {
    this.onComboChange = callback;
  }

  onMilestone(callback: (milestone: number) => void): void {
    this.onComboMilestone = callback;
  }
}

export const comboEngine = new ComboEngine();
