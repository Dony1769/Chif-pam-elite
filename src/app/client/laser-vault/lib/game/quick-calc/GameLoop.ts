/**
 * Game Loop engine
 */

export class GameLoop {
  private rafId: number | null = null;
  private running = false;
  private lastTime = 0;
  private tickMs = 100;
  private callback: ((delta: number) => void) | null = null;

  start(callback: (delta: number) => void): void {
    if (this.running) return;
    this.callback = callback;
    this.running = true;
    this.lastTime = performance.now();
    this.rafId = window.requestAnimationFrame(this.step);
  }

  stop(): void {
    this.running = false;
    if (this.rafId) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private step = (time: number): void => {
    if (!this.running) return;
    const delta = time - this.lastTime;
    this.lastTime = time;
    if (this.callback) {
      this.callback(delta);
    }
    this.rafId = window.requestAnimationFrame(this.step);
  };
}
