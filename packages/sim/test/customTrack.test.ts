import { describe, it, expect, beforeAll } from 'vitest';
import {
  buildCustomLevel,
  createSimulation,
  decodeCustomTrack,
  decodeTrackPieces,
  encodeCustomTrack,
  encodeTrackPieces,
  initPhysics,
  TRACK_PRESETS,
  TrackPieceType,
} from '../src/index.js';

describe('Custom Track Compiler & Encoders', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('correctly encodes and decodes track piece sequences', () => {
    const pieces: TrackPieceType[] = [
      'straight',
      'ramp',
      'corner_right',
      'booster',
      'ice',
      'drop',
      'corner_left',
      'jump_gap',
      'bridge',
      'checkpoint',
    ];

    const encoded = encodeTrackPieces(pieces);
    expect(encoded).toBe('SMRBIDLJGK');

    const decoded = decodeTrackPieces(encoded);
    expect(decoded).toEqual(pieces);
  });

  it('correctly serializes full custom track configurations into shareable codes', () => {
    const original = {
      name: 'Drift & Speed',
      theme: 'glacier',
      pieces: ['straight', 'ice', 'corner_right', 'booster', 'drop'] as TrackPieceType[],
    };

    const code = encodeCustomTrack(original);
    expect(code).toContain('Drift');
    expect(code).toContain('glacier');

    const decoded = decodeCustomTrack(code);
    expect(decoded.name).toBe('Drift & Speed');
    expect(decoded.theme).toBe('glacier');
    expect(decoded.pieces).toEqual(original.pieces);
  });

  it('compiles valid LevelDefinition with spawn, colliders, visuals and goal', () => {
    const pieces: TrackPieceType[] = ['straight', 'ramp', 'booster', 'drop'];
    const { level, palette } = buildCustomLevel(pieces, {
      name: 'Test Runway',
      theme: 'cyberpunk',
    });

    expect(level.name).toBe('Test Runway');
    expect(level.spawn).toEqual([0, 2.2, 0]);
    expect(level.goal.position).toBeDefined();
    expect(level.colliders.length).toBeGreaterThan(4);
    expect(level.visuals.length).toBeGreaterThan(4);
    expect(palette.trackPrimary).toBeDefined();
  });

  it('simulates custom tracks smoothly in Rapier physics', () => {
    // Grand Prix preset
    const preset = TRACK_PRESETS[0];
    const { level } = buildCustomLevel(preset.pieces, {
      name: preset.name,
      theme: preset.theme,
    });

    const sim = createSimulation(level);
    expect(sim.getState().status).toBe('ready');

    // Run 60 ticks with forward tilt
    for (let i = 0; i < 60; i++) {
      const state = sim.step({ tiltX: 0, tiltZ: 100 });
      expect(state.status).toBe('playing');
    }

    const state = sim.getState();
    expect(state.ball.velocity[2]).toBeGreaterThan(0); // Ball moving forward
    sim.destroy();
  });
});
