/**
 * Seeded 32-bit PRNG (Mulberry32) for bit-exact procedural generation.
 */
export class SeededRNG {
  private state: number;

  constructor(seed: string | number) {
    if (typeof seed === 'number') {
      this.state = seed >>> 0;
    } else {
      // FNV-1a hash of the seed string into a 32-bit unsigned int
      let h = 0x811c9dc5;
      for (let i = 0; i < seed.length; i++) {
        h ^= seed.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
      }
      this.state = h;
    }
  }

  /** Returns float in [0, 1) */
  nextFloat(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let z = this.state;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns integer in [min, max] inclusive */
  nextInt(min: number, max: number): number {
    return Math.floor(this.nextFloat() * (max - min + 1)) + min;
  }

  /** Picks an element from an array */
  choice<T>(arr: T[]): T {
    const idx = this.nextInt(0, arr.length - 1);
    return arr[idx];
  }
}
