/**
 * FC CAREER — Générateur aléatoire testable (Mulberry32 PRNG)
 * Reproductible avec la même graine — essentiel pour les tests de match.
 */

/** Crée un générateur à partir d'une graine entière */
export function createRng(seed: number) {
  let s = seed >>> 0;
  return {
    /** Flottant dans [0, 1) */
    next(): number {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) >>> 0;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    /** Entier dans [min, max] */
    int(min: number, max: number): number {
      return min + Math.floor(this.next() * (max - min + 1));
    },
    /** Flottant dans [min, max) */
    float(min: number, max: number): number {
      return min + this.next() * (max - min);
    },
    /** Tirage booléen avec probabilité p ∈ [0,1] */
    chance(p: number): boolean {
      return this.next() < p;
    },
    /** Élément aléatoire d'un tableau */
    pick<T>(arr: T[]): T {
      return arr[this.int(0, arr.length - 1)];
    },
    /** Mélange d'un tableau (copie) */
    shuffle<T>(arr: T[]): T[] {
      const out = [...arr];
      for (let i = out.length - 1; i > 0; i--) {
        const j = this.int(0, i);
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
  };
}

export type Rng = ReturnType<typeof createRng>;

/** Graine dérivée d'une chaîne (ex: matchId) */
export function seedFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}
