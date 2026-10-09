import { describe, it, expect, beforeAll } from 'vitest';
import { initPhysics, createSimulation, LEVEL_1 } from '../src/index.js';
import { InputFrame } from '@ghostroll/shared';

describe('Deterministic Physics & Golden Replay', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('runs deterministically across multiple simulation runs', () => {
    // Generate a fixed sequence of 180 ticks (3 seconds) of inputs
    const inputs: InputFrame[] = [];
    for (let i = 0; i < 180; i++) {
      if (i < 60) {
        inputs.push({ tiltX: 0, tiltZ: 80 }); // roll forward
      } else if (i < 120) {
        inputs.push({ tiltX: 45, tiltZ: 50 }); // steer right into turn
      } else {
        inputs.push({ tiltX: 10, tiltZ: 30 }); // stabilize
      }
    }

    // Run 1
    const sim1 = createSimulation(LEVEL_1);
    const hashesRun1: string[] = [];
    for (const input of inputs) {
      const state = sim1.step(input);
      hashesRun1.push(state.hash);
    }
    const finalState1 = sim1.getState();
    sim1.destroy();

    // Run 2 (fresh world)
    const sim2 = createSimulation(LEVEL_1);
    const hashesRun2: string[] = [];
    for (const input of inputs) {
      const state = sim2.step(input);
      hashesRun2.push(state.hash);
    }
    const finalState2 = sim2.getState();
    sim2.destroy();

    // Frame-by-frame exact match
    expect(hashesRun1).toEqual(hashesRun2);
    expect(finalState1.ball.position).toEqual(finalState2.ball.position);
    expect(finalState1.ball.velocity).toEqual(finalState2.ball.velocity);
    expect(finalState1.ball.angularVelocity).toEqual(finalState2.ball.angularVelocity);
    expect(finalState1.hash).toEqual(finalState2.hash);

    // Ball moved forward and downward on track
    expect(finalState1.ball.position[2]).toBeGreaterThan(2.0);
    expect(finalState1.ball.position[1]).toBeLessThan(2.5);

    // Verify golden hash matches exact baseline
    expect(finalState1.hash).toBe('fa590fc3');
  });

  it('detects divergence when even a single input differs', () => {
    const simA = createSimulation(LEVEL_1);
    const simB = createSimulation(LEVEL_1);

    for (let i = 0; i < 50; i++) {
      simA.step({ tiltX: 0, tiltZ: 50 });
      // Single tick divergence on simB at tick 10
      simB.step({ tiltX: i === 10 ? 1 : 0, tiltZ: 50 });
    }

    const stateA = simA.getState();
    const stateB = simB.getState();

    simA.destroy();
    simB.destroy();

    expect(stateA.hash).not.toEqual(stateB.hash);
  });

  it('applies deterministic jump impulse when grounded and ignores mid-air jumps', () => {
    const sim = createSimulation(LEVEL_1);

    // Roll until grounded on track (30 ticks)
    for (let i = 0; i < 30; i++) {
      sim.step({ tiltX: 0, tiltZ: 30 });
    }

    const stateBeforeJump = sim.getState();
    const yBefore = stateBeforeJump.ball.position[1];

    // Trigger jump
    const stateJump = sim.step({ tiltX: 0, tiltZ: 30, jump: true });
    expect(stateJump.ball.velocity[1]).toBeGreaterThan(4.0);

    // Let ball rise in air for 10 ticks
    for (let i = 0; i < 10; i++) {
      sim.step({ tiltX: 0, tiltZ: 30 });
    }

    const stateInAir = sim.getState();
    expect(stateInAir.ball.position[1]).toBeGreaterThan(yBefore + 0.5);

    // Mid-air jump attempt must be rejected (no double jump)
    const velBeforeMidAir = stateInAir.ball.velocity[1];
    const stateMidAirAttempt = sim.step({ tiltX: 0, tiltZ: 30, jump: true });
    // Velocity must decrease due to gravity, not receive new upward boost
    expect(stateMidAirAttempt.ball.velocity[1]).toBeLessThan(velBeforeMidAir);

    sim.destroy();
  });
});
