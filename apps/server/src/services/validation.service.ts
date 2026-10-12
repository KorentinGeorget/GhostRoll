import {
  GhostSample,
  InputFrame,
  LevelDefinition,
} from '@ghostroll/shared';
import {
  createSimulation,
  initPhysics,
  LEVEL_1,
  generateDailyLevel,
  buildCustomLevel,
  decodeCustomTrack,
} from '@ghostroll/sim';

export interface ValidationRequest {
  levelId: string;
  simVersion: number;
  claimedTicks: number;
  finalHash: string;
  inputs: InputFrame[];
  level?: LevelDefinition;
}

export interface ValidationResult {
  verified: boolean;
  rejectionReason?: string;
  verifiedTicks?: number;
  finalHash?: string;
  ghostSamples?: GhostSample[];
}

export async function validateReplay(req: ValidationRequest): Promise<ValidationResult> {
  await initPhysics();

  const claimedTicks = req.claimedTicks ?? (req as any).tickCount;
  if (typeof claimedTicks !== 'number' || !Number.isFinite(claimedTicks)) {
    return {
      verified: false,
      rejectionReason: 'MISSING_TICKS: claimedTicks was not provided or invalid',
    };
  }

  // Resolve level
  let level: LevelDefinition | null = req.level || null;

  if (!level) {
    if (
      req.levelId === LEVEL_1.id ||
      req.levelId === 'trial-level-1' ||
      req.levelId === 'daily-2026-10-09-seed01'
    ) {
      level = LEVEL_1;
    } else if (req.levelId.startsWith('custom:')) {
      try {
        const decoded = decodeCustomTrack(req.levelId.slice(7));
        level = buildCustomLevel(decoded.pieces, {
          name: decoded.name,
          theme: decoded.theme,
        }).level;
      } catch {
        level = null;
      }
    } else if (
      req.levelId.startsWith('daily-') ||
      req.levelId.startsWith('seed-') ||
      req.levelId.startsWith('custom-') ||
      req.levelId.startsWith('random-')
    ) {
      const seed = req.levelId.replace(/^(daily-|seed-|custom-|random-)/, '');
      try {
        level = generateDailyLevel(seed).level;
      } catch {
        level = null;
      }
    } else {
      try {
        level = generateDailyLevel(req.levelId).level;
      } catch {
        level = null;
      }
    }
  }

  if (!level) {
    return {
      verified: false,
      rejectionReason: `UNKNOWN_LEVEL: level ${req.levelId} is not found`,
    };
  }

  if (req.simVersion !== level.simVersion) {
    return {
      verified: false,
      rejectionReason: `SIM_VERSION_MISMATCH: server requires version ${level.simVersion}, got ${req.simVersion}`,
    };
  }

  if (!req.inputs || req.inputs.length === 0) {
    return {
      verified: false,
      rejectionReason: 'EMPTY_INPUTS: replay contains no input frames',
    };
  }

  // Max 10 minutes limit (36000 ticks) to protect worker CPU
  if (req.inputs.length > 36000) {
    return {
      verified: false,
      rejectionReason: 'INPUT_LENGTH_EXCEEDED: replay exceeds maximum allowed duration',
    };
  }

  const sim = createSimulation(level);
  const ghostSamples: GhostSample[] = [];

  try {
    for (let i = 0; i < req.inputs.length; i++) {
      const frame = req.inputs[i];

      if (
        typeof frame?.tiltX !== 'number' ||
        typeof frame?.tiltZ !== 'number' ||
        !Number.isInteger(frame.tiltX) ||
        !Number.isInteger(frame.tiltZ)
      ) {
        return {
          verified: false,
          rejectionReason: `MALFORMED_FRAME: frame at index ${i} is not integer quantized`,
        };
      }

      const state = sim.step(frame);

      // Record ghost trajectory at 20 Hz
      if (state.tick % 3 === 0) {
        ghostSamples.push([
          state.tick,
          state.ball.position[0],
          state.ball.position[1],
          state.ball.position[2],
        ]);
      }

      if (state.status === 'won') {
        if (state.tick !== claimedTicks) {
          return {
            verified: false,
            rejectionReason: `TICK_MISMATCH: server reached goal at tick ${state.tick}, claimed ${claimedTicks}`,
          };
        }

        if (state.hash !== req.finalHash) {
          return {
            verified: false,
            rejectionReason: `HASH_MISMATCH: server computed hash ${state.hash}, claimed ${req.finalHash}`,
          };
        }

        return {
          verified: true,
          verifiedTicks: state.tick,
          finalHash: state.hash,
          ghostSamples,
        };
      }

      if (state.status === 'dead') {
        return {
          verified: false,
          rejectionReason: `BALL_DIED: fell off track at tick ${state.tick}`,
        };
      }
    }

    return {
      verified: false,
      rejectionReason: 'GOAL_NOT_REACHED: inputs ended before reaching the goal pad',
    };
  } finally {
    sim.destroy();
  }
}
