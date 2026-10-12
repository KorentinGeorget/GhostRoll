import { LevelDefinition, SIM_VERSION } from '@ghostroll/shared';

export const LEVEL_1: LevelDefinition = {
  id: 'daily-2026-10-09-seed01',
  name: 'Neon Dawn (Trial Track)',
  simVersion: SIM_VERSION,
  spawn: [0, 2.2, 0],
  goal: {
    position: [12, -1.6, 28],
    radius: 2.2,
  },
  checkpoints: [
    { index: 1, position: [0, 0.8, 8.5], radius: 2.5 },
    { index: 2, position: [7.5, -0.6, 15.0], radius: 2.8 },
  ],
  deathY: -10,
  colliders: [
    // 1. Start Platform
    {
      type: 'box',
      halfExtents: [2.5, 0.25, 2.5],
      position: [0, 1.0, 0],
      friction: 0.5,
      restitution: 0.2,
    },
    // Start rails (back, left, right)
    {
      type: 'box',
      halfExtents: [2.5, 0.4, 0.15],
      position: [0, 1.6, -2.4],
      friction: 0.2,
      restitution: 0.4,
    },
    {
      type: 'box',
      halfExtents: [0.15, 0.4, 2.5],
      position: [-2.4, 1.6, 0],
      friction: 0.2,
      restitution: 0.4,
    },
    {
      type: 'box',
      halfExtents: [0.15, 0.4, 2.5],
      position: [2.4, 1.6, 0],
      friction: 0.2,
      restitution: 0.4,
    },

    // 2. Straightaway 1
    {
      type: 'box',
      halfExtents: [2.0, 0.25, 3.5],
      position: [0, 0.8, 6.0],
      friction: 0.4,
      restitution: 0.2,
    },

    // Bumpers on Straightaway
    {
      type: 'cylinder',
      halfHeight: 0.4,
      radius: 0.5,
      position: [-1.4, 1.4, 5.0],
      restitution: 1.6,
      friction: 0.1,
      isBumper: true,
    },
    {
      type: 'cylinder',
      halfHeight: 0.4,
      radius: 0.5,
      position: [1.4, 1.4, 7.5],
      restitution: 1.6,
      friction: 0.1,
      isBumper: true,
    },

    // 3. Stepping / Slope ramp towards turn
    {
      type: 'box',
      halfExtents: [2.0, 0.25, 2.5],
      position: [0, 0.3, 11.8],
      friction: 0.4,
      restitution: 0.2,
    },

    // 4. Corner Turn (right turn)
    {
      type: 'box',
      halfExtents: [2.2, 0.25, 2.2],
      position: [2.5, -0.2, 15.0],
      friction: 0.4,
      restitution: 0.2,
    },
    {
      type: 'box',
      halfExtents: [2.5, 0.25, 2.5],
      position: [7.5, -0.6, 15.0],
      friction: 0.4,
      restitution: 0.2,
    },

    // Bumper near the corner inner apex
    {
      type: 'cylinder',
      halfHeight: 0.4,
      radius: 0.6,
      position: [4.5, 0.0, 12.6],
      restitution: 1.8,
      friction: 0.1,
      isBumper: true,
    },

    // 5. Narrow bridge (seamlessly connecting corner to goal)
    {
      type: 'box',
      halfExtents: [1.3, 0.25, 4.5],
      position: [9.5, -1.1, 20.5],
      friction: 0.5,
      restitution: 0.1,
    },

    // 6. Final Goal Arena
    {
      type: 'box',
      halfExtents: [3.5, 0.25, 3.5],
      position: [12.0, -1.8, 28.0],
      friction: 0.5,
      restitution: 0.2,
    },
    // Back & right borders on goal arena so ball doesn't overshoot easily
    {
      type: 'box',
      halfExtents: [3.5, 0.4, 0.15],
      position: [12.0, -1.2, 31.4],
      friction: 0.3,
      restitution: 0.3,
    },
    {
      type: 'box',
      halfExtents: [0.15, 0.4, 3.5],
      position: [15.4, -1.2, 28.0],
      friction: 0.3,
      restitution: 0.3,
    },
  ],
  visuals: [
    {
      id: 'vis-start',
      type: 'pad',
      position: [0, 1.0, 0],
      scale: [5.0, 0.5, 5.0],
      color: '#4f46e5',
    },
    {
      id: 'vis-straight-1',
      type: 'straight',
      position: [0, 0.8, 6.0],
      scale: [4.0, 0.5, 7.0],
      color: '#6366f1',
    },
    {
      id: 'vis-slope-1',
      type: 'ramp',
      position: [0, 0.3, 11.8],
      scale: [4.0, 0.5, 5.0],
      color: '#818cf8',
    },
    {
      id: 'vis-corner-1',
      type: 'corner',
      position: [2.5, -0.2, 15.0],
      scale: [4.4, 0.5, 4.4],
      color: '#6366f1',
    },
    {
      id: 'vis-corner-2',
      type: 'corner',
      position: [7.5, -0.6, 15.0],
      scale: [5.0, 0.5, 5.0],
      color: '#818cf8',
    },
    {
      id: 'vis-bridge',
      type: 'straight',
      position: [9.5, -1.1, 20.5],
      scale: [2.6, 0.5, 9.0],
      color: '#f59e0b',
    },
    {
      id: 'vis-goal-pad',
      type: 'goal',
      position: [12.0, -1.8, 28.0],
      scale: [7.0, 0.5, 7.0],
      color: '#10b981',
    },
    // Bumpers
    {
      id: 'vis-bumper-1',
      type: 'bumper',
      position: [-1.4, 1.4, 5.0],
      scale: [1.0, 0.8, 1.0],
      color: '#ec4899',
    },
    {
      id: 'vis-bumper-2',
      type: 'bumper',
      position: [1.4, 1.4, 7.5],
      scale: [1.0, 0.8, 1.0],
      color: '#ec4899',
    },
    {
      id: 'vis-bumper-3',
      type: 'bumper',
      position: [4.5, 0.0, 12.6],
      scale: [1.2, 0.8, 1.2],
      color: '#f43f5e',
    },
    // Checkpoints
    {
      id: 'vis-cp-1',
      type: 'checkpoint',
      position: [0, 1.3, 8.5],
      scale: [4.0, 2.2, 0.3],
      color: '#38bdf8',
      checkpointIndex: 1,
    },
    {
      id: 'vis-cp-2',
      type: 'checkpoint',
      position: [7.5, -0.1, 15.0],
      scale: [4.4, 2.2, 0.3],
      color: '#38bdf8',
      checkpointIndex: 2,
    },
  ],
};
