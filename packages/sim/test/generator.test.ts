import { describe, it, expect, beforeAll } from 'vitest';
import {
  generateDailyLevel,
  generateDailyPalette,
  initPhysics,
  createSimulation,
} from '../src/index.js';

describe('Procedural Daily Level Generator', () => {
  beforeAll(async () => {
    await initPhysics();
  });

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

  it('guarantees today level (2026-10-12) is physically beatable by an automated driver', () => {
    const { level } = generateDailyLevel('2026-10-12');
    const sim = createSimulation(level);

    const waypoints = level.visuals
      .filter((v) => v.type !== 'bumper')
      .map((v) => v.position);
    waypoints.push(level.goal.position);

    let wp = 0;
    let won = false;

    for (let t = 0; t < 3000; t++) {
      const state = sim.getState();
      const pos = state.ball.position;
      const vel = state.ball.velocity;
      const target = waypoints[wp];
      const dx = target[0] - pos[0];
      const dz = target[2] - pos[2];
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < 3.0 && wp < waypoints.length - 1) {
        wp++;
      }

      const targetVx = Math.max(-12, Math.min(12, dx * 3.0));
      const targetVz = Math.max(-12, Math.min(12, dz * 3.0));
      const tiltX = Math.round(Math.max(-127, Math.min(127, (targetVx - vel[0]) * 35)));
      const tiltZ = Math.round(Math.max(-127, Math.min(127, (targetVz - vel[2]) * 35)));

      const nextState = sim.step({ tiltX, tiltZ, jump: false });
      if (nextState.status === 'won') {
        won = true;
        break;
      }
      if (nextState.status === 'dead') {
        break;
      }
    }
    sim.destroy();

    expect(won).toBe(true);
  });

  it('guarantees 100% of generated daily levels are physically solvable across multiple dates', () => {
    const testSeeds = [
      '2026-10-01',
      '2026-10-05',
      '2026-10-10',
      '2026-10-12',
      '2026-10-15',
      '2026-10-20',
      '2026-10-25',
      '2026-10-31',
    ];

    for (const seed of testSeeds) {
      const { level } = generateDailyLevel(seed);
      const sim = createSimulation(level);

      const waypoints = level.visuals
        .filter((v) => v.type !== 'bumper')
        .map((v) => v.position);
      waypoints.push(level.goal.position);

      let wp = 0;
      let won = false;

      for (let t = 0; t < 3000; t++) {
        const state = sim.getState();
        const pos = state.ball.position;
        const vel = state.ball.velocity;
        const target = waypoints[wp];
        const dx = target[0] - pos[0];
        const dz = target[2] - pos[2];
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < 3.0 && wp < waypoints.length - 1) {
          wp++;
        }

        const targetVx = Math.max(-12, Math.min(12, dx * 3.0));
        const targetVz = Math.max(-12, Math.min(12, dz * 3.0));
        const tiltX = Math.round(Math.max(-127, Math.min(127, (targetVx - vel[0]) * 35)));
        const tiltZ = Math.round(Math.max(-127, Math.min(127, (targetVz - vel[2]) * 35)));

        const nextState = sim.step({ tiltX, tiltZ, jump: false });
        if (nextState.status === 'won') {
          won = true;
          break;
        }
        if (nextState.status === 'dead') {
          break;
        }
      }
      sim.destroy();

      expect(won, `Level for seed ${seed} must be physically completable`).toBe(true);
    }
  });
});
