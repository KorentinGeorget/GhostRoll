import { z } from 'zod';

export const SIM_VERSION = 1;
export const TICKS_PER_SECOND = 60;
export const FIXED_DT = 1 / 60; // 0.016666666666666666
export const GRAVITY_MAGNITUDE = 18.0; // Responsive marble gravity
export const BALL_RADIUS = 0.5;

export interface InputFrame {
  /** Tilt around X/Z axes clamped to [-127, 127] */
  tiltX: number;
  tiltZ: number;
  /** Optional jump trigger */
  jump?: boolean;
}

export type SimStatus = 'ready' | 'playing' | 'won' | 'dead';

export interface SimState {
  tick: number;
  status: SimStatus;
  ball: {
    position: [number, number, number];
    velocity: [number, number, number];
    angularVelocity: [number, number, number];
  };
  hash: string;
  isGrounded?: boolean;
  lastCheckpoint?: number;
  activeEffects?: {
    boost?: boolean;
    jump?: boolean;
  };
}

export interface BoxColliderDef {
  type: 'box';
  halfExtents: [number, number, number]; // [hx, hy, hz]
  position: [number, number, number];
  rotation?: [number, number, number, number]; // [qx, qy, qz, qw]
  restitution?: number;
  friction?: number;
  isBoost?: boolean;
  boostDirection?: [number, number, number];
  boostSpeed?: number;
  isJumpPad?: boolean;
  jumpImpulse?: number;
  isIce?: boolean;
}

export interface CylinderColliderDef {
  type: 'cylinder';
  halfHeight: number;
  radius: number;
  position: [number, number, number];
  restitution?: number;
  friction?: number;
  isBumper?: boolean;
}

export interface TrimeshColliderDef {
  type: 'trimesh';
  vertices: number[];
  indices: number[];
  position?: [number, number, number];
  restitution?: number;
  friction?: number;
}

export type ColliderDef = BoxColliderDef | CylinderColliderDef | TrimeshColliderDef;

export interface TileVisual {
  id: string;
  type: 'pad' | 'ramp' | 'straight' | 'corner' | 'bumper' | 'goal' | 'rail' | 'wall' | 'boost' | 'jump' | 'ice' | 'checkpoint';
  position: [number, number, number];
  rotation?: [number, number, number]; // Euler angles in radians for rendering
  scale?: [number, number, number];
  color?: string;
  checkpointIndex?: number;
}

export interface LevelPalette {
  name: string;
  background: string;
  fog: string;
  trackPrimary: string;
  trackSecondary: string;
  bridge: string;
  bumper: string;
  goal: string;
  boost?: string;
  jumpPad?: string;
  ice?: string;
}

export interface CheckpointDef {
  index: number;
  position: [number, number, number];
  radius: number;
}

export interface LevelDefinition {
  id: string;
  name: string;
  simVersion: number;
  spawn: [number, number, number];
  goal: {
    position: [number, number, number];
    radius: number;
  };
  checkpoints?: CheckpointDef[];
  deathY: number;
  colliders: ColliderDef[];
  visuals: TileVisual[];
}

export type GhostSample = [tick: number, x: number, y: number, z: number];

export interface GhostData {
  id: string;
  playerName: string;
  ticks: number;
  samples: GhostSample[]; // Sampled at fixed tick step (e.g. every 3 ticks = 20Hz)
}

export interface ReplayPayload {
  magic: 'GRRP';
  formatVersion: 1;
  simVersion: number;
  levelId: string;
  tickCount: number;
  finalHash: string;
  inputs: InputFrame[];
}

export const InputFrameSchema = z.object({
  tiltX: z.number().int().min(-127).max(127),
  tiltZ: z.number().int().min(-127).max(127),
  jump: z.boolean().optional(),
});

export const ReplayPayloadSchema = z.object({
  magic: z.literal('GRRP'),
  formatVersion: z.literal(1),
  simVersion: z.number().int().positive(),
  levelId: z.string().min(1),
  tickCount: z.number().int().nonnegative(),
  finalHash: z.string(),
  inputs: z.array(InputFrameSchema),
});
