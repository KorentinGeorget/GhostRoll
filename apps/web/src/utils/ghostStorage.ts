import { GhostData, GhostSample, ReplayPayload } from '@ghostroll/shared';

const STORAGE_PREFIX = 'ghostroll_pb_';

export interface StoredPB {
  levelId: string;
  ticks: number;
  timeSeconds: number;
  date: string;
  finalHash: string;
  samples: GhostSample[];
  replay: ReplayPayload;
}

export function getStoredPB(levelId: string): StoredPB | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${levelId}`);
    if (!raw) return null;
    return JSON.parse(raw) as StoredPB;
  } catch (err) {
    console.warn('Failed to load PB from localStorage', err);
    return null;
  }
}

export function saveStoredPB(pb: StoredPB): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${pb.levelId}`, JSON.stringify(pb));
  } catch (err) {
    console.warn('Failed to save PB to localStorage', err);
  }
}

export function clearStoredPB(levelId: string): void {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${levelId}`);
  } catch (err) {
    console.warn('Failed to clear PB', err);
  }
}

/**
 * Returns interpolated [x, y, z] position for a ghost at the specified simulation tick.
 */
export function sampleGhostPosition(
  samples: GhostSample[],
  targetTick: number
): [number, number, number] | null {
  if (!samples || samples.length === 0) return null;

  if (targetTick <= samples[0][0]) {
    return [samples[0][1], samples[0][2], samples[0][3]];
  }

  const last = samples[samples.length - 1];
  if (targetTick >= last[0]) {
    return [last[1], last[2], last[3]];
  }

  // Binary search to find adjacent samples
  let low = 0;
  let high = samples.length - 1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (samples[mid][0] === targetTick) {
      return [samples[mid][1], samples[mid][2], samples[mid][3]];
    }
    if (samples[mid][0] < targetTick) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const prev = samples[Math.max(0, high)];
  const next = samples[Math.min(samples.length - 1, low)];

  const tSpan = next[0] - prev[0];
  if (tSpan <= 0) return [prev[1], prev[2], prev[3]];

  const factor = (targetTick - prev[0]) / tSpan;
  const x = prev[1] + (next[1] - prev[1]) * factor;
  const y = prev[2] + (next[2] - prev[2]) * factor;
  const z = prev[3] + (next[3] - prev[3]) * factor;

  return [x, y, z];
}
