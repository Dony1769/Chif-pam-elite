/**
 * Animation helpers used by scenes and HUD
 */

export class AnimationManager {
  getEntranceClass(phase: 'enter' | 'exit' | 'idle' = 'idle'): string {
    switch (phase) {
      case 'enter':
        return 'opacity-100 translate-y-0 scale-100';
      case 'exit':
        return 'opacity-0 -translate-y-4 scale-95';
      default:
        return 'opacity-100 translate-y-0 scale-100';
    }
  }

  getCameraShake(intensity: number): string {
    if (intensity <= 0) return 'translate-x-0 translate-y-0';
    if (intensity <= 1) return 'translate-x-1 translate-y-1';
    return 'translate-x-2 translate-y-0';
  }

  getGlowClass(intensity: number): string {
    if (intensity > 0.8) return 'shadow-[0_0_48px_rgba(34,211,238,0.45)]';
    if (intensity > 0.4) return 'shadow-[0_0_24px_rgba(34,211,238,0.25)]';
    return 'shadow-[0_0_10px_rgba(34,211,238,0.12)]';
  }
}
