/**
 * Haptic feedback manager
 */

export class HapticManager {
  private enabled = true;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  trigger(pattern: 'light' | 'medium' | 'heavy' | 'success' | 'failure' = 'light'): void {
    if (!this.enabled || typeof navigator === 'undefined' || !('vibrate' in navigator)) return;

    const patterns: Record<string, number | number[]> = {
      light: 10,
      medium: 20,
      heavy: 35,
      success: [10, 20, 10],
      failure: [20, 10, 20],
    };

    navigator.vibrate(patterns[pattern]);
  }
}

export const hapticManager = new HapticManager();
