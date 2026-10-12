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

  function driveTrackToCompletion(level: ReturnType<typeof generateDailyLevel>['level'], maxTicks = 3500): boolean {
    const sim = createSimulation(level);
    const waypoints = level.visuals
      .filter((v) => v.type !== 'bumper')
      .map((v) => v.position);
    waypoints.push(level.goal.position);

    let wp = 0;
    let won = false;

    for (let t = 0; t < maxTicks; t++) {
      const state = sim.getState();
      const pos = state.ball.position;
      const vel = state.ball.velocity;

      const target = waypoints[wp];
      const dx = target[0] - pos[0];
      const dz = target[2] - pos[2];
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < 2.5 && wp < waypoints.length - 1) {
        wp++;
      }

      let maxSpeed = 10.0;
      for (let k = wp; k < Math.min(wp + 3, waypoints.length - 1); k++) {
        const pA = waypoints[k];
        const pB = waypoints[k + 1];
        const v1x = pA[0] - pos[0];
        const v1z = pA[2] - pos[2];
        const v2x = pB[0] - pA[0];
        const v2z = pB[2] - pA[2];
        const l1 = Math.hypot(v1x, v1z) || 1;
        const l2 = Math.hypot(v2x, v2z) || 1;
        const dot = (v1x * v2x + v1z * v2z) / (l1 * l2);
        const distToTurn = Math.hypot(pA[0] - pos[0], pA[2] - pos[2]);
        if (dot < 0.7) {
          if (distToTurn < 5.0) {
            maxSpeed = Math.min(maxSpeed, 3.2);
          } else if (distToTurn < 10.0) {
            maxSpeed = Math.min(maxSpeed, 4.8);
          } else if (distToTurn < 16.0) {
            maxSpeed = Math.min(maxSpeed, 7.0);
          }
        }
      }

      const dirX = dx / (dist || 1);
      const dirZ = dz / (dist || 1);
      const speed = Math.min(maxSpeed, Math.max(2.0, dist * 2.0));

      const targetVx = dirX * speed;
      const targetVz = dirZ * speed;

      const tiltX = Math.round(Math.max(-127, Math.min(127, (targetVx - vel[0]) * 45)));
      const tiltZ = Math.round(Math.max(-127, Math.min(127, (targetVz - vel[2]) * 45)));

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
    return won;
  }

  it('guarantees today level (2026-10-12) is physically beatable by an automated driver', () => {
    const { level } = generateDailyLevel('2026-10-12');
    const won = driveTrackToCompletion(level);
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
      const won = driveTrackToCompletion(level);
      expect(won, `Level for seed ${seed} must be physically completable`).toBe(true);
    }
  });
});
