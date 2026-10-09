import { GRAVITY_MAGNITUDE, InputFrame } from '@ghostroll/shared';

export interface GravityVector {
  x: number;
  y: number;
  z: number;
}

/**
 * Computes deterministic gravity vector from quantized int8 tilt.
 * Uses only +, -, *, /, and Math.sqrt to ensure strict IEEE-754 cross-engine determinism.
 * No Math.sin, Math.cos, or Math.tan!
 */
export function computeDeterministicGravity(
  input: InputFrame,
  magnitude = GRAVITY_MAGNITUDE
): GravityVector {
  // Max tilt tangent ratio (0.5 ~= 26.5 degrees max tilt)
  const TILT_RATIO = 0.5;

  // Clamp input values defensively to [-127, 127]
  const tx = Math.max(-127, Math.min(127, Math.trunc(input.tiltX)));
  const tz = Math.max(-127, Math.min(127, Math.trunc(input.tiltZ)));

  const vx = (tx / 127.0) * TILT_RATIO;
  const vz = (tz / 127.0) * TILT_RATIO;
  const vy = -1.0;

  // Euclidean norm
  const lengthSq = vx * vx + vy * vy + vz * vz;
  const length = Math.sqrt(lengthSq);

  const invLen = 1.0 / length;

  return {
    x: vx * invLen * magnitude,
    y: vy * invLen * magnitude,
    z: vz * invLen * magnitude,
  };
}
