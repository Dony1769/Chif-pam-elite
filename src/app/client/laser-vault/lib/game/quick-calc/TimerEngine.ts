/**
 * Timer Engine
 * Manages game timer and time-based events
 */

import { TimerConfig } from './types';

export class TimerEngine {
  private timeRemaining: number;
  private initialTime: number;
  private timerInterval: NodeJS.Timeout | null = null;
  private onTickCallback: ((timeRemaining: number) => void) | null = null;
  private onTimeoutCallback: (() => void) | null = null;
  private config: TimerConfig;
  private isPaused = false;

  constructor(config: Partial<TimerConfig> = {}) {
    this.config = {
      initialSeconds: config.initialSeconds ?? 8,
      decrementMs: config.decrementMs ?? 100,
      minSeconds: config.minSeconds ?? 3,
    };

    this.initialTime = this.config.initialSeconds * 1000;
    this.timeRemaining = this.initialTime;
  }

  start(): void {
    this.stop();
    this.timerInterval = setInterval(() => this.tick(), this.config.decrementMs);
  }

  stop(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  pause(): void {
    this.isPaused = true;
    this.stop();
  }

  resume(): void {
    this.isPaused = false;
    this.start();
  }

  reset(questionNumber?: number): void {
    this.stop();
    const seconds = Math.max(
      this.config.minSeconds,
      this.config.initialSeconds - ((questionNumber ?? 1) - 1) * 0.5,
    );
    this.initialTime = Math.round(seconds * 1000);
    this.timeRemaining = this.initialTime;
  }

  private tick(): void {
    this.timeRemaining = Math.max(0, this.timeRemaining - this.config.decrementMs);

    if (this.onTickCallback) {
      this.onTickCallback(this.timeRemaining);
    }

    if (this.timeRemaining <= 0) {
      this.stop();
      if (this.onTimeoutCallback) {
        this.onTimeoutCallback();
      }
    }
  }

  onTick(callback: (timeRemaining: number) => void): void {
    this.onTickCallback = callback;
  }

  onTimeout(callback: () => void): void {
    this.onTimeoutCallback = callback;
  }

  getTimeRemaining(): number {
    return this.timeRemaining;
  }

  getInitialTime(): number {
    return this.initialTime;
  }

  getProgress(): number {
    return Math.max(0, (this.timeRemaining / this.initialTime) * 100);
  }

  isWarning(): boolean {
    return this.getProgress() < 20;
  }

  destroy(): void {
    this.stop();
    this.onTickCallback = null;
    this.onTimeoutCallback = null;
  }
}

export const timerEngine = new TimerEngine();
