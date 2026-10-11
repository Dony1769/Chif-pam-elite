/**
 * Particle manager for scene effects
 */

import { Particle } from './types';

export class ParticleManager {
  createBurst(count: number, x: number, y: number): Particle[] {
    return Array.from({ length: count }, (_, index) => ({
      id: `p-${Date.now()}-${index}`,
      x,
      y,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8,
      lifespan: 700 + Math.random() * 400,
      type: index % 2 === 0 ? 'spark' : 'score',
    }));
  }
}
