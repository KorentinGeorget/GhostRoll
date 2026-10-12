import {
  CheckpointDef,
  ColliderDef,
  LevelDefinition,
  SIM_VERSION,
  TileVisual,
} from '@ghostroll/shared';
import { SeededRNG } from './prng.js';
import { generateDailyPalette, LevelPalette } from './palette.js';

export interface GeneratedDailyLevel {
  level: LevelDefinition;
  palette: LevelPalette;
}

interface Heading {
  dx: number;
  dz: number;
}

export interface GenerateOptions {
  difficulty?: 'normal' | 'hard' | 'extreme';
  segments?: number;
}

export function generateDailyLevel(seed: string, options?: GenerateOptions): GeneratedDailyLevel {
  const rng = new SeededRNG(`daily-level-${seed}`);
  const palette = generateDailyPalette(seed);

  const colliders: ColliderDef[] = [];
  const visuals: TileVisual[] = [];

  // Start tile at origin
  let curX = 0;
  let curY = 1.0;
  let curZ = 2.5; // Leading edge of the 5x5 start platform
  let heading: Heading = { dx: 0, dz: 1 }; // facing forward along +Z
  let lowestY = curY;

  // 1. Start Platform (centered at [0, curY, 0])
  colliders.push({
    type: 'box',
    halfExtents: [2.5, 0.25, 2.5],
    position: [0, curY, 0],
    friction: 0.5,
    restitution: 0.2,
  });
  // Guard rails
  colliders.push(
    {
      type: 'box',
      halfExtents: [2.5, 0.4, 0.15],
      position: [0, curY + 0.6, -2.4],
      friction: 0.2,
      restitution: 0.4,
    },
    {
      type: 'box',
      halfExtents: [0.15, 0.4, 2.5],
      position: [-2.4, curY + 0.6, 0],
      friction: 0.2,
      restitution: 0.4,
    },
    {
      type: 'box',
      halfExtents: [0.15, 0.4, 2.5],
      position: [2.4, curY + 0.6, 0],
      friction: 0.2,
      restitution: 0.4,
    }
  );

  visuals.push({
    id: 'vis-start',
    type: 'pad',
    position: [0, curY, 0],
    scale: [5.0, 0.5, 5.0],
    color: palette.trackPrimary,
  });

  const baseSegments = options?.difficulty === 'extreme' ? rng.nextInt(13, 16) : options?.difficulty === 'hard' ? rng.nextInt(11, 14) : rng.nextInt(9, 12);
  const numSegments = options?.segments ?? baseSegments;
  let prevPieceType = 'start';
  let tileIndex = 1;

  for (let s = 0; s < numSegments; s++) {
    // Choose segment type
    let possibleTypes: Array<
      'straight' | 'ramp' | 'corner_right' | 'corner_left' | 'bridge' | 'jump_gap' | 'chicane' | 'booster'
    > = ['straight', 'ramp', 'bridge', 'jump_gap', 'booster'];

    if (prevPieceType !== 'corner_right' && prevPieceType !== 'corner_left') {
      possibleTypes.push('corner_right', 'corner_left', 'chicane');
    }

    if (prevPieceType === 'jump_gap') {
      // Must be straight or ramp after a jump gap to stabilize
      possibleTypes = ['straight', 'ramp'];
    }

    const pieceType = rng.choice(possibleTypes);

    if (pieceType === 'straight' || pieceType === 'ramp') {
      const length = rng.nextInt(6, 8);
      const isRamp = pieceType === 'ramp';
      const dY = isRamp ? -0.4 : -0.15;

      const posX = curX + heading.dx * (length / 2);
      const posZ = curZ + heading.dz * (length / 2);
      const posY = curY + dY / 2;

      const hx = heading.dx !== 0 ? length / 2 : 2.0;
      const hz = heading.dz !== 0 ? length / 2 : 2.0;

      colliders.push({
        type: 'box',
        halfExtents: [hx, 0.25, hz],
        position: [posX, posY, posZ],
        friction: 0.45,
        restitution: 0.2,
      });

      visuals.push({
        id: `vis-seg-${tileIndex++}`,
        type: isRamp ? 'ramp' : 'straight',
        position: [posX, posY, posZ],
        scale: [hx * 2, 0.5, hz * 2],
        color: isRamp ? palette.trackSecondary : palette.trackPrimary,
      });

      // Occasional bumper hazard on straightaways
      if (rng.nextFloat() > 0.45) {
        const perpX = -heading.dz;
        const perpZ = heading.dx;
        const sideOffset = rng.choice([-1.2, 1.2]);

        const bumperX = posX + perpX * sideOffset;
        const bumperZ = posZ + perpZ * sideOffset;
        const bumperY = posY + 0.45;

        colliders.push({
          type: 'cylinder',
          halfHeight: 0.35,
          radius: 0.45,
          position: [bumperX, bumperY, bumperZ],
          restitution: 1.2,
          friction: 0.1,
          isBumper: true,
        });

        visuals.push({
          id: `vis-bumper-${tileIndex++}`,
          type: 'bumper',
          position: [bumperX, bumperY, bumperZ],
          scale: [0.9, 0.7, 0.9],
          color: palette.bumper,
        });
      }

      curX += heading.dx * length;
      curZ += heading.dz * length;
      curY += dY;
      prevPieceType = pieceType;
    } else if (pieceType === 'bridge') {
      // Narrow balance beam
      const length = 7.0;
      const dY = -0.2;

      const posX = curX + heading.dx * (length / 2);
      const posZ = curZ + heading.dz * (length / 2);
      const posY = curY + dY / 2;

      const hx = heading.dx !== 0 ? length / 2 : 1.2;
      const hz = heading.dz !== 0 ? length / 2 : 1.2;

      colliders.push({
        type: 'box',
        halfExtents: [hx, 0.25, hz],
        position: [posX, posY, posZ],
        friction: 0.5,
        restitution: 0.1,
      });

      visuals.push({
        id: `vis-bridge-${tileIndex++}`,
        type: 'straight',
        position: [posX, posY, posZ],
        scale: [hx * 2, 0.5, hz * 2],
        color: palette.bridge,
      });

      curX += heading.dx * length;
      curZ += heading.dz * length;
      curY += dY;
      prevPieceType = 'bridge';
    } else if (pieceType === 'corner_right' || pieceType === 'corner_left') {
      // Turn corner platform
      const isRight = pieceType === 'corner_right';
      const turnSize = 5.0;
      const dY = -0.2;

      const cornerX = curX + heading.dx * 2.5;
      const cornerZ = curZ + heading.dz * 2.5;
      const cornerY = curY + dY;

      colliders.push({
        type: 'box',
        halfExtents: [turnSize / 2, 0.25, turnSize / 2],
        position: [cornerX, cornerY, cornerZ],
        friction: 0.45,
        restitution: 0.2,
      });

      visuals.push({
        id: `vis-corner-${tileIndex++}`,
        type: 'corner',
        position: [cornerX, cornerY, cornerZ],
        scale: [turnSize, 0.5, turnSize],
        color: palette.trackSecondary,
      });

      // Update heading: 90 deg rotation
      if (isRight) {
        // (dx, dz) -> (dz, -dx)
        const oldDx = heading.dx;
        heading.dx = heading.dz;
        heading.dz = -oldDx;
      } else {
        // (dx, dz) -> (-dz, dx)
        const oldDx = heading.dx;
        heading.dx = -heading.dz;
        heading.dz = oldDx;
      }

      // Exit edge of corner
      curX = cornerX + heading.dx * 2.5;
      curZ = cornerZ + heading.dz * 2.5;
      curY = cornerY;
      prevPieceType = pieceType;
    } else if (pieceType === 'jump_gap') {
      // Void jump: Launch ramp -> air gap -> landing pad with guide rails
      const launchLength = 4.5;
      const gapDistance = 4.0;
      const landingLength = 6.0;
      const dYLaunch = -0.2;
      const dYGap = -0.6; // Landing is slightly lower than launch for a smooth parabolic landing
      const dYLanding = -0.2;

      // 1. Launch Ramp
      const launchPosX = curX + heading.dx * (launchLength / 2);
      const launchPosZ = curZ + heading.dz * (launchLength / 2);
      const launchPosY = curY + dYLaunch / 2;
      const hxLaunch = heading.dx !== 0 ? launchLength / 2 : 2.0;
      const hzLaunch = heading.dz !== 0 ? launchLength / 2 : 2.0;

      colliders.push({
        type: 'box',
        halfExtents: [hxLaunch, 0.25, hzLaunch],
        position: [launchPosX, launchPosY, launchPosZ],
        friction: 0.45,
        restitution: 0.2,
      });

      visuals.push({
        id: `vis-launch-${tileIndex++}`,
        type: 'ramp',
        position: [launchPosX, launchPosY, launchPosZ],
        scale: [hxLaunch * 2, 0.5, hzLaunch * 2],
        color: palette.trackSecondary,
      });

      // Launch Lip / Super Jump Pad
      const lipX = curX + heading.dx * (launchLength - 0.2);
      const lipZ = curZ + heading.dz * (launchLength - 0.2);
      const lipHx = heading.dx !== 0 ? 0.6 : 1.8;
      const lipHz = heading.dz !== 0 ? 0.6 : 1.8;

      colliders.push({
        type: 'box',
        halfExtents: [lipHx, 0.15, lipHz],
        position: [lipX, launchPosY + 0.22, lipZ],
        friction: 0.2,
        restitution: 0.3,
        isJumpPad: true,
        jumpImpulse: 15.0,
      });

      visuals.push({
        id: `vis-jump-${tileIndex++}`,
        type: 'jump',
        position: [lipX, launchPosY + 0.22, lipZ],
        scale: [lipHx * 2, 0.2, lipHz * 2],
        color: palette.jumpPad ?? '#fbbf24',
      });

      // 2. Void Gap (ball flies through empty space)
      const afterGapX = curX + heading.dx * (launchLength + gapDistance);
      const afterGapZ = curZ + heading.dz * (launchLength + gapDistance);
      const afterGapY = curY + dYLaunch + dYGap;

      // 3. Landing Platform (generously wide with safety rails)
      const landingPosX = afterGapX + heading.dx * (landingLength / 2);
      const landingPosZ = afterGapZ + heading.dz * (landingLength / 2);
      const landingPosY = afterGapY + dYLanding / 2;
      const hxLanding = heading.dx !== 0 ? landingLength / 2 : 2.6;
      const hzLanding = heading.dz !== 0 ? landingLength / 2 : 2.6;

      colliders.push({
        type: 'box',
        halfExtents: [hxLanding, 0.25, hzLanding],
        position: [landingPosX, landingPosY, landingPosZ],
        friction: 0.5,
        restitution: 0.25,
      });

      // Side guide rails on landing pad
      const perpX = -heading.dz;
      const perpZ = heading.dx;
      const railOffset = 2.45;
      const railHalfL = landingLength / 2;
      const railHx = heading.dx !== 0 ? railHalfL : 0.15;
      const railHz = heading.dz !== 0 ? railHalfL : 0.15;

      colliders.push(
        {
          type: 'box',
          halfExtents: [railHx, 0.35, railHz],
          position: [landingPosX + perpX * railOffset, landingPosY + 0.45, landingPosZ + perpZ * railOffset],
          friction: 0.2,
          restitution: 0.3,
        },
        {
          type: 'box',
          halfExtents: [railHx, 0.35, railHz],
          position: [landingPosX - perpX * railOffset, landingPosY + 0.45, landingPosZ - perpZ * railOffset],
          friction: 0.2,
          restitution: 0.3,
        }
      );

      visuals.push({
        id: `vis-landing-${tileIndex++}`,
        type: 'straight',
        position: [landingPosX, landingPosY, landingPosZ],
        scale: [hxLanding * 2, 0.5, hzLanding * 2],
        color: palette.trackPrimary,
      });

      curX = afterGapX + heading.dx * landingLength;
      curZ = afterGapZ + heading.dz * landingLength;
      curY = afterGapY + dYLanding;
      prevPieceType = 'jump_gap';
    } else if (pieceType === 'chicane') {
      // S-curve chicane with slalom bumper
      const isRightFirst = rng.nextFloat() > 0.5;
      const length = 7.5;
      const dY = -0.25;
      const perpX = -heading.dz;
      const perpZ = heading.dx;
      const jog = isRightFirst ? 1.8 : -1.8;

      const posX = curX + heading.dx * (length / 2) + perpX * (jog / 2);
      const posZ = curZ + heading.dz * (length / 2) + perpZ * (jog / 2);
      const posY = curY + dY / 2;

      const hx = heading.dx !== 0 ? length / 2 : 2.4;
      const hz = heading.dz !== 0 ? length / 2 : 2.4;

      colliders.push({
        type: 'box',
        halfExtents: [hx, 0.25, hz],
        position: [posX, posY, posZ],
        friction: 0.45,
        restitution: 0.2,
      });

      visuals.push({
        id: `vis-chicane-${tileIndex++}`,
        type: 'straight',
        position: [posX, posY, posZ],
        scale: [hx * 2, 0.5, hz * 2],
        color: palette.trackSecondary,
      });

      // Center bumper obstacle to navigate around
      colliders.push({
        type: 'cylinder',
        halfHeight: 0.4,
        radius: 0.45,
        position: [posX, posY + 0.45, posZ],
        restitution: 1.4,
        friction: 0.1,
        isBumper: true,
      });

      visuals.push({
        id: `vis-bumper-${tileIndex++}`,
        type: 'bumper',
        position: [posX, posY + 0.45, posZ],
        scale: [0.9, 0.8, 0.9],
        color: palette.bumper,
      });

      curX += heading.dx * length + perpX * jog;
      curZ += heading.dz * length + perpZ * jog;
      curY += dY;
      prevPieceType = 'chicane';
    } else if (pieceType === 'booster') {
      // High-speed low-friction booster strip
      const length = 6.5;
      const dY = -0.2;
      const posX = curX + heading.dx * (length / 2);
      const posZ = curZ + heading.dz * (length / 2);
      const posY = curY + dY / 2;

      const hx = heading.dx !== 0 ? length / 2 : 2.0;
      const hz = heading.dz !== 0 ? length / 2 : 2.0;

      colliders.push({
        type: 'box',
        halfExtents: [hx, 0.25, hz],
        position: [posX, posY, posZ],
        friction: 0.05,
        restitution: 0.4,
        isBoost: true,
        boostDirection: [heading.dx, 0, heading.dz],
        boostSpeed: 28.0,
      });

      visuals.push({
        id: `vis-booster-${tileIndex++}`,
        type: 'boost',
        position: [posX, posY, posZ],
        scale: [hx * 2, 0.5, hz * 2],
        color: palette.boost ?? '#f43f5e',
      });

      curX += heading.dx * length;
      curZ += heading.dz * length;
      curY += dY;
      prevPieceType = 'booster';
    }

    if (curY < lowestY) {
      lowestY = curY;
    }
  }

  // Final Goal Arena
  const goalPadSize = 7.0;
  const goalX = curX + heading.dx * (goalPadSize / 2);
  const goalZ = curZ + heading.dz * (goalPadSize / 2);
  const goalY = curY - 0.3;

  colliders.push({
    type: 'box',
    halfExtents: [goalPadSize / 2, 0.25, goalPadSize / 2],
    position: [goalX, goalY, goalZ],
    friction: 0.5,
    restitution: 0.2,
  });

  // Back guard rail behind goal so ball doesn't overshoot
  const backRailX = goalX + heading.dx * (goalPadSize / 2 - 0.15);
  const backRailZ = goalZ + heading.dz * (goalPadSize / 2 - 0.15);
  const railHx = heading.dx !== 0 ? 0.2 : goalPadSize / 2;
  const railHz = heading.dz !== 0 ? 0.2 : goalPadSize / 2;

  colliders.push({
    type: 'box',
    halfExtents: [railHx, 0.4, railHz],
    position: [backRailX, goalY + 0.6, backRailZ],
    friction: 0.3,
    restitution: 0.3,
  });

  visuals.push({
    id: 'vis-goal-pad',
    type: 'goal',
    position: [goalX, goalY, goalZ],
    scale: [goalPadSize, 0.5, goalPadSize],
    color: palette.goal,
  });

  const level: LevelDefinition = {
    id: `daily-${seed}`,
    name: `${palette.name} (Daily #${seed})`,
    simVersion: SIM_VERSION,
    spawn: [0, 2.2, 0],
    goal: {
      position: [goalX, goalY + 0.5, goalZ],
      radius: 2.2,
    },
    deathY: Math.min(lowestY, goalY) - 10.0,
    colliders,
    visuals,
  };

  return { level, palette };
}
