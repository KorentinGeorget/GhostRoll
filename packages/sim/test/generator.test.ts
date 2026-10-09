import { describe, it, expect } from 'vitest';
import { generateDailyLevel, generateDailyPalette } from '../src/index.js';

describe('Procedural Daily Level Generator', () => {
  it('generates bit-exact identical level definitions for the same seed', () => {
    const run1 = generateDailyLevel('2026-10-09');
    const run2 = generateDailyLevel('2026-10-09');

    expect(run1.level.id).toBe('daily-2026-10-09');
    expect(run1.level.colliders).toEqual(run2.level.colliders);
    expect(run1.level.visuals).toEqual(run2.level.visuals);
    expect(run1.level.goal).toEqual(run2.level.goal);
    expect(run1.palette).toEqual(run2.palette);
  });

  it('generates distinct tracks and palettes for different dates', () => {
    const dayA = generateDailyLevel('2026-10-09');
    const dayB = generateDailyLevel('2026-10-10');

    expect(dayA.level.id).not.toBe(dayB.level.id);
    expect(dayA.level.name).not.toBe(dayB.level.name);
    expect(dayA.level.colliders.length).toBeGreaterThan(5);
    expect(dayB.level.colliders.length).toBeGreaterThan(5);
    expect(dayA.palette.trackPrimary).not.toBe(dayB.palette.trackPrimary);
  });

  it('generates valid bounds, goal, and death plane for physics', () => {
    const { level, palette } = generateDailyLevel('2026-10-15');

    expect(level.spawn).toEqual([0, 2.2, 0]);
    expect(level.goal.radius).toBeGreaterThan(1.5);
    expect(level.deathY).toBeLessThan(level.goal.position[1]);
    expect(palette.name).toBeDefined();
    expect(palette.background).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
