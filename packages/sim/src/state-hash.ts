/**
 * Computes an FNV-1a hash of the ball's IEEE-754 64-bit float representations.
 * Any single bit flip or divergence will immediately result in a different hash.
 */
const FNV_PRIME_32 = 0x01000193;
const FNV_OFFSET_32 = 0x811c9dc5;

export function computeStateHash(
  tick: number,
  px: number,
  py: number,
  pz: number,
  vx: number,
  vy: number,
  vz: number,
  wx: number,
  wy: number,
  wz: number
): string {
  const floats = new Float64Array(9);
  floats[0] = px;
  floats[1] = py;
  floats[2] = pz;
  floats[3] = vx;
  floats[4] = vy;
  floats[5] = vz;
  floats[6] = wx;
  floats[7] = wy;
  floats[8] = wz;

  const bytes = new Uint8Array(floats.buffer);

  let hash = FNV_OFFSET_32 ^ (tick & 0xffffffff);
  hash = Math.imul(hash, FNV_PRIME_32) >>> 0;

  for (let i = 0; i < bytes.length; i++) {
    hash ^= bytes[i];
    hash = Math.imul(hash, FNV_PRIME_32) >>> 0;
  }

  return hash.toString(16).padStart(8, '0');
}
