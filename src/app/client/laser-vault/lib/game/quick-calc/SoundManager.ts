/**
 * Sound Manager
 * Manages game sound effects using Web Audio API
 */

import { SoundEffect } from './types';

export class SoundManager {
  private audioContext: AudioContext | null = null;
  private isMuted = false;

  constructor() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      console.warn('Web Audio API not available');
    }
  }

  play(effect: SoundEffect): void {
    if (!this.audioContext || this.isMuted) return;

    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;
      const duration = effect.duration ?? 0.2;

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      const frequencies: Record<string, number> = {
        correct: 800,
        incorrect: 400,
        combo: 1200,
        levelup: 1000,
        gameover: 200,
        beep: 600,
        win: 1000,
      };

      oscillator.frequency.value = frequencies[effect.type] ?? 600;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(effect.volume, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

      oscillator.start(now);
      oscillator.stop(now + duration);
    } catch (error) {
      console.warn('Sound playback error:', error);
    }
  }

  playCorrect(): void {
    this.play({ type: 'correct', volume: 0.3, duration: 0.15 });
  }

  playIncorrect(): void {
    this.play({ type: 'incorrect', volume: 0.2, duration: 0.3 });
  }

  playCombo(): void {
    this.play({ type: 'combo', volume: 0.25, duration: 0.1 });
  }

  playWin(): void {
    this.play({ type: 'win', volume: 0.4, duration: 0.5 });
  }

  playBeep(): void {
    this.play({ type: 'beep', volume: 0.15, duration: 0.05 });
  }

  mute(): void {
    this.isMuted = true;
  }

  unmute(): void {
    this.isMuted = false;
  }

  toggleMute(): void {
    this.isMuted = !this.isMuted;
  }

  isSoundMuted(): boolean {
    return this.isMuted;
  }
}

export const soundManager = new SoundManager();
