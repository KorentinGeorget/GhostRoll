import { LevelPalette } from '@ghostroll/shared';
import { SeededRNG } from './prng.js';

export type { LevelPalette };


const ADJECTIVES = [
  'Aurora', 'Solar', 'Cosmic', 'Nebula', 'Glacial', 'Emerald', 'Velvet',
  'Obsidian', 'Quantum', 'Prismatic', 'Vapor', 'Echo', 'Zenith', 'Abyssal'
];

const NOUNS = [
  'Ridge', 'Circuit', 'Pass', 'Run', 'Horizon', 'Spire', 'Ascent',
  'Valley', 'Drift', 'Nexus', 'Sector', 'Loop', 'Canyon', 'Way'
];

function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function generateDailyPalette(seed: string): LevelPalette {
  const rng = new SeededRNG(`palette-${seed}`);

  const baseHue = rng.nextInt(0, 359);
  const adj = rng.choice(ADJECTIVES);
  const noun = rng.choice(NOUNS);

  const bgHue = (baseHue + 210) % 360;

  return {
    name: `${adj} ${noun}`,
    background: hslToHex(bgHue, 35, 6),
    fog: hslToHex(bgHue, 35, 6),
    trackPrimary: hslToHex(baseHue, 65, 45),
    trackSecondary: hslToHex((baseHue + 35) % 360, 75, 52),
    bridge: hslToHex((baseHue + 180) % 360, 85, 55),
    bumper: hslToHex((baseHue + 290) % 360, 90, 60),
    goal: '#10b981',
  };
}
