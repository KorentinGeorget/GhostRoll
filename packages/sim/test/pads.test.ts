import { describe, it, expect, beforeAll } from 'vitest';
import { initPhysics, createSimulation } from '../src/index.js';
import { LevelDefinition, SIM_VERSION } from '@ghostroll/shared';

describe('Interactive Trackmania Pads (Boost & Jump)', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  const BOOST_LEVEL: LevelDefinition = {
    id: 'test-boost-level',
    name: 'Test Boost Level',
    simVersion: SIM_VERSION,
    spawn: [0, 1.6, 0],
    goal: { position: [0, 0, 50], radius: 2.0 },
    deathY: -10,
    colliders: [
      {
        type: 'box',
        halfExtents: [5, 0.25, 25],
        position: [0, 0.5, 20],
      },
      // Boost pad at z = 1.5
      {
        type: 'box',
        halfExtents: [2, 0.26, 2],
        position: [0, 0.5, 1.5],
        isBoost: true,
        boostDirection: [0, 0, 1],
        boostSpeed: 30.0,
      },
    ],
    visuals: [],
  };

  it('accelerates marble forward when rolling over boost pad', () => {
    const sim = createSimulation(BOOST_LEVEL);
    let reachedHighSpeed = false;
    let maxVz = 0;

    for (let i = 0; i < 50; i++) {
      const state = sim.step({ tiltX: 0, tiltZ: 80 });
      const vz = state.ball.velocity[2];
      if (vz > maxVz) maxVz = vz;
      if (vz > 15.0 && state.activeEffects?.boost) {
        reachedHighSpeed = true;
      }
    }

    expect(reachedHighSpeed).toBe(true);
    expect(maxVz).toBeGreaterThan(15.0);
    sim.destroy();
  });

  const JUMP_LEVEL: LevelDefinition = {
    id: 'test-jump-level',
    name: 'Test Jump Level',
    simVersion: SIM_VERSION,
    spawn: [0, 1.6, 0],
    goal: { position: [0, 0, 50], radius: 2.0 },
    deathY: -10,
    colliders: [
      {
        type: 'box',
        halfExtents: [5, 0.25, 25],
        position: [0, 0.5, 20],
      },
      // Jump pad at z = 1.2
      {
        type: 'box',
        halfExtents: [2, 0.26, 2],
        position: [0, 0.5, 1.2],
        isJumpPad: true,
        jumpImpulse: 18.0,
      },
    ],
    visuals: [],
  };

  it('launches marble high into the air when rolling over super-jump pad', () => {
    const sim = createSimulation(JUMP_LEVEL);
    let launched = false;
    let maxY = 0;

    for (let i = 0; i < 50; i++) {
      const state = sim.step({ tiltX: 0, tiltZ: 80 });
      const y = state.ball.position[1];
      if (y > maxY) maxY = y;
      if (state.ball.velocity[1] > 12.0 && state.activeEffects?.jump) {
        launched = true;
      }
    }

    expect(launched).toBe(true);
    expect(maxY).toBeGreaterThan(5.0);
    sim.destroy();
  });
});
