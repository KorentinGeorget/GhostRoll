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

interface BoundingBox2D {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

function boxOverlap(a: BoundingBox2D, b: BoundingBox2D): boolean {
  return !(a.maxX <= b.minX || a.minX >= b.maxX || a.maxZ <= b.minZ || a.minZ >= b.maxZ);
}

export function generateDailyLevel(seed: string, options?: GenerateOptions): GeneratedDailyLevel {
  const rng = new SeededRNG(`daily-level-${seed}`);
  const palette = generateDailyPalette(seed);

  const colliders: ColliderDef[] = [];
  const visuals: TileVisual[] = [];
  const occupiedBoxes: BoundingBox2D[] = [];
  const checkpoints: CheckpointDef[] = [];

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

  visuals.push({
    id: 'vis-start',
    type: 'pad',
    position: [0, curY, 0],
    scale: [5.0, 0.5, 5.0],
    color: palette.trackPrimary,
  });

  occupiedBoxes.push({ minX: -2.8, maxX: 2.8, minZ: -2.8, maxZ: 2.8 });

  const baseSegments =
    options?.difficulty === 'extreme'
      ? rng.nextInt(26, 30)
      : options?.difficulty === 'hard'
      ? rng.nextInt(23, 27)
      : rng.nextInt(21, 25);
  const numSegments = options?.segments ?? baseSegments;
  let prevPieceType = 'start';
  let segmentsSinceBooster = 99;
  let segmentsSinceDrop = 99;
  let segmentsSinceCorner = 99;
  let segmentsSinceJump = 99;
  let tileIndex = 1;

  for (let s = 0; s < numSegments; s++) {
    segmentsSinceBooster++;
    segmentsSinceDrop++;
    segmentsSinceCorner++;
    segmentsSinceJump++;

    // Choose segment type according to fair, solvable racing transition rules
    let possibleTypes: Array<
      'straight' | 'ramp' | 'corner_right' | 'corner_left' | 'bridge' | 'jump_gap' | 'chicane' | 'booster' | 'ice' | 'drop'
    > = ['straight', 'ramp'];

    if (s > 0) {
      const runwaySafe =
        segmentsSinceBooster >= 4 && segmentsSinceDrop >= 3 && segmentsSinceJump >= 3;
      const cornerStabilized = segmentsSinceCorner >= 3;

      if (runwaySafe && cornerStabilized) {
        possibleTypes.push('corner_right', 'corner_left', 'chicane');
      }
      if (cornerStabilized && segmentsSinceJump >= 2) {
        possibleTypes.push('bridge', 'ice');
      }
      if (runwaySafe) {
        possibleTypes.push('booster', 'drop', 'jump_gap');
      }
    }

    // Shuffle candidates deterministically using seeded RNG
    const candidates: typeof possibleTypes = [];
    while (possibleTypes.length > 0) {
      const idx = rng.nextInt(0, possibleTypes.length - 1);
      candidates.push(possibleTypes.splice(idx, 1)[0]);
    }

    let placed = false;

    for (const pieceType of candidates) {
      if (pieceType === 'straight' || pieceType === 'ramp') {
        const length = 7.0;
        const isRamp = pieceType === 'ramp';
        const dY = isRamp ? -0.35 : -0.15;

        const posX = curX + heading.dx * (length / 2);
        const posZ = curZ + heading.dz * (length / 2);
        const posY = curY + dY / 2;

        const hx = heading.dx !== 0 ? length / 2 : 2.2;
        const hz = heading.dz !== 0 ? length / 2 : 2.2;

        const box: BoundingBox2D = {
          minX: posX - hx - 0.2,
          maxX: posX + hx + 0.2,
          minZ: posZ - hz - 0.2,
          maxZ: posZ + hz + 0.2,
        };

        // Self-intersection check against all non-adjacent previous tiles
        if (occupiedBoxes.slice(0, -1).some((b) => boxOverlap(b, box))) {
          continue;
        }

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

        occupiedBoxes.push(box);
        curX += heading.dx * length;
        curZ += heading.dz * length;
        curY += dY;
        prevPieceType = pieceType;
        placed = true;
        break;
      } else if (pieceType === 'bridge') {
        const length = 7.0;
        const dY = -0.2;

        const posX = curX + heading.dx * (length / 2);
        const posZ = curZ + heading.dz * (length / 2);
        const posY = curY + dY / 2;

        const hx = heading.dx !== 0 ? length / 2 : 1.45;
        const hz = heading.dz !== 0 ? length / 2 : 1.45;

        const box: BoundingBox2D = {
          minX: posX - hx - 0.2,
          maxX: posX + hx + 0.2,
          minZ: posZ - hz - 0.2,
          maxZ: posZ + hz + 0.2,
        };

        if (occupiedBoxes.slice(0, -1).some((b) => boxOverlap(b, box))) {
          continue;
        }

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

        occupiedBoxes.push(box);
        curX += heading.dx * length;
        curZ += heading.dz * length;
        curY += dY;
        prevPieceType = 'bridge';
        placed = true;
        break;
      } else if (pieceType === 'corner_right' || pieceType === 'corner_left') {
        const isRight = pieceType === 'corner_right';
        const turnSize = 6.0;
        const dY = -0.2;

        const cornerX = curX + heading.dx * (turnSize / 2);
        const cornerZ = curZ + heading.dz * (turnSize / 2);
        const cornerY = curY + dY;

        const box: BoundingBox2D = {
          minX: cornerX - turnSize / 2 - 0.2,
          maxX: cornerX + turnSize / 2 + 0.2,
          minZ: cornerZ - turnSize / 2 - 0.2,
          maxZ: cornerZ + turnSize / 2 + 0.2,
        };

        if (occupiedBoxes.slice(0, -1).some((b) => boxOverlap(b, box))) {
          continue;
        }

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

        if (isRight) {
          const oldDx = heading.dx;
          heading.dx = heading.dz;
          heading.dz = -oldDx;
        } else {
          const oldDx = heading.dx;
          heading.dx = -heading.dz;
          heading.dz = oldDx;
        }

        occupiedBoxes.push(box);
        curX = cornerX + heading.dx * (turnSize / 2);
        curZ = cornerZ + heading.dz * (turnSize / 2);
        curY = cornerY;
        prevPieceType = pieceType;
        segmentsSinceCorner = 0;
        placed = true;
        break;
      } else if (pieceType === 'jump_gap') {
        const launchLength = 4.5;
        const gapDistance = 3.0;
        const landingLength = 8.5;
        const totalSpan = launchLength + gapDistance + landingLength;
        const totalHx = heading.dx !== 0 ? totalSpan / 2 : 2.8;
        const totalHz = heading.dz !== 0 ? totalSpan / 2 : 2.8;
        const midX = curX + heading.dx * (totalSpan / 2);
        const midZ = curZ + heading.dz * (totalSpan / 2);

        const box: BoundingBox2D = {
          minX: midX - totalHx - 0.4,
          maxX: midX + totalHx + 0.4,
          minZ: midZ - totalHz - 0.4,
          maxZ: midZ + totalHz + 0.4,
        };

        if (occupiedBoxes.slice(0, -1).some((b) => boxOverlap(b, box))) {
          continue;
        }

        const dYLaunch = -0.15;
        const dYGap = -0.45;
        const dYLanding = -0.15;

        // Launch Ramp
        const launchPosX = curX + heading.dx * (launchLength / 2);
        const launchPosZ = curZ + heading.dz * (launchLength / 2);
        const launchPosY = curY + dYLaunch / 2;
        const hxLaunch = heading.dx !== 0 ? launchLength / 2 : 2.2;
        const hzLaunch = heading.dz !== 0 ? launchLength / 2 : 2.2;

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

        // Launch Lip Jump Pad
        const lipX = curX + heading.dx * (launchLength - 0.2);
        const lipZ = curZ + heading.dz * (launchLength - 0.2);
        const lipHx = heading.dx !== 0 ? 0.6 : 2.0;
        const lipHz = heading.dz !== 0 ? 0.6 : 2.0;

        colliders.push({
          type: 'box',
          halfExtents: [lipHx, 0.15, lipHz],
          position: [lipX, launchPosY + 0.22, lipZ],
          friction: 0.2,
          restitution: 0.3,
          isJumpPad: true,
          jumpImpulse: 4.5,
        });

        visuals.push({
          id: `vis-jump-${tileIndex++}`,
          type: 'jump',
          position: [lipX, launchPosY + 0.22, lipZ],
          scale: [lipHx * 2, 0.2, lipHz * 2],
          color: palette.jumpPad ?? '#fbbf24',
        });

        // Landing Platform
        const afterGapX = curX + heading.dx * (launchLength + gapDistance);
        const afterGapZ = curZ + heading.dz * (launchLength + gapDistance);
        const afterGapY = curY + dYLaunch + dYGap;

        const landingPosX = afterGapX + heading.dx * (landingLength / 2);
        const landingPosZ = afterGapZ + heading.dz * (landingLength / 2);
        const landingPosY = afterGapY + dYLanding / 2;
        const hxLanding = heading.dx !== 0 ? landingLength / 2 : 2.7;
        const hzLanding = heading.dz !== 0 ? landingLength / 2 : 2.7;

        colliders.push({
          type: 'box',
          halfExtents: [hxLanding, 0.25, hzLanding],
          position: [landingPosX, landingPosY, landingPosZ],
          friction: 0.5,
          restitution: 0.2,
        });

        visuals.push({
          id: `vis-landing-${tileIndex++}`,
          type: 'straight',
          position: [landingPosX, landingPosY, landingPosZ],
          scale: [hxLanding * 2, 0.5, hzLanding * 2],
          color: palette.trackPrimary,
        });

        occupiedBoxes.push(box);
        curX = afterGapX + heading.dx * landingLength;
        curZ = afterGapZ + heading.dz * landingLength;
        curY = afterGapY + dYLanding;
        prevPieceType = 'jump_gap';
        segmentsSinceJump = 0;
        placed = true;
        break;
      } else if (pieceType === 'chicane') {
        const isRightFirst = rng.nextFloat() > 0.5;
        const length = 7.5;
        const dY = -0.2;
        const perpX = -heading.dz;
        const perpZ = heading.dx;
        const jog = isRightFirst ? 1.4 : -1.4;

        const posX = curX + heading.dx * (length / 2) + perpX * (jog / 2);
        const posZ = curZ + heading.dz * (length / 2) + perpZ * (jog / 2);
        const posY = curY + dY / 2;

        const hx = heading.dx !== 0 ? length / 2 : 2.5;
        const hz = heading.dz !== 0 ? length / 2 : 2.5;

        const box: BoundingBox2D = {
          minX: posX - hx - 0.2,
          maxX: posX + hx + 0.2,
          minZ: posZ - hz - 0.2,
          maxZ: posZ + hz + 0.2,
        };

        if (occupiedBoxes.slice(0, -1).some((b) => boxOverlap(b, box))) {
          continue;
        }

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

        occupiedBoxes.push(box);
        curX += heading.dx * length + perpX * jog;
        curZ += heading.dz * length + perpZ * jog;
        curY += dY;
        prevPieceType = 'chicane';
        segmentsSinceCorner = 0;
        placed = true;
        break;
      } else if (pieceType === 'booster') {
        const length = 6.5;
        const dY = -0.15;
        const posX = curX + heading.dx * (length / 2);
        const posZ = curZ + heading.dz * (length / 2);
        const posY = curY + dY / 2;

        const hx = heading.dx !== 0 ? length / 2 : 2.2;
        const hz = heading.dz !== 0 ? length / 2 : 2.2;

        const box: BoundingBox2D = {
          minX: posX - hx - 0.2,
          maxX: posX + hx + 0.2,
          minZ: posZ - hz - 0.2,
          maxZ: posZ + hz + 0.2,
        };

        if (occupiedBoxes.slice(0, -1).some((b) => boxOverlap(b, box))) {
          continue;
        }

        colliders.push({
          type: 'box',
          halfExtents: [hx, 0.25, hz],
          position: [posX, posY, posZ],
          friction: 0.05,
          restitution: 0.3,
          isBoost: true,
          boostDirection: [heading.dx, 0, heading.dz],
          boostSpeed: 18.0,
        });

        visuals.push({
          id: `vis-booster-${tileIndex++}`,
          type: 'boost',
          position: [posX, posY, posZ],
          scale: [hx * 2, 0.5, hz * 2],
          color: palette.boost ?? '#f43f5e',
        });

        occupiedBoxes.push(box);
        curX += heading.dx * length;
        curZ += heading.dz * length;
        curY += dY;
        prevPieceType = 'booster';
        segmentsSinceBooster = 0;
        placed = true;
        break;
      } else if (pieceType === 'ice') {
        const length = 7.5;
        const dY = -0.15;
        const posX = curX + heading.dx * (length / 2);
        const posZ = curZ + heading.dz * (length / 2);
        const posY = curY + dY / 2;

        const hx = heading.dx !== 0 ? length / 2 : 2.3;
        const hz = heading.dz !== 0 ? length / 2 : 2.3;

        const box: BoundingBox2D = {
          minX: posX - hx - 0.2,
          maxX: posX + hx + 0.2,
          minZ: posZ - hz - 0.2,
          maxZ: posZ + hz + 0.2,
        };

        if (occupiedBoxes.slice(0, -1).some((b) => boxOverlap(b, box))) {
          continue;
        }

        colliders.push({
          type: 'box',
          halfExtents: [hx, 0.25, hz],
          position: [posX, posY, posZ],
          friction: 0.04, // Low-friction slick ice drift
          restitution: 0.15,
          isIce: true,
        });

        visuals.push({
          id: `vis-ice-${tileIndex++}`,
          type: 'ice',
          position: [posX, posY, posZ],
          scale: [hx * 2, 0.5, hz * 2],
          color: palette.ice ?? '#c7d2fe',
        });

        occupiedBoxes.push(box);
        curX += heading.dx * length;
        curZ += heading.dz * length;
        curY += dY;
        prevPieceType = 'ice';
        placed = true;
        break;
      } else if (pieceType === 'drop') {
        const length = 7.5;
        const dY = -0.6;
        const posX = curX + heading.dx * (length / 2);
        const posZ = curZ + heading.dz * (length / 2);
        const posY = curY + dY / 2;

        const hx = heading.dx !== 0 ? length / 2 : 2.8;
        const hz = heading.dz !== 0 ? length / 2 : 2.8;

        const box: BoundingBox2D = {
          minX: posX - hx - 0.2,
          maxX: posX + hx + 0.2,
          minZ: posZ - hz - 0.2,
          maxZ: posZ + hz + 0.2,
        };

        if (occupiedBoxes.slice(0, -1).some((b) => boxOverlap(b, box))) {
          continue;
        }

        colliders.push({
          type: 'box',
          halfExtents: [hx, 0.25, hz],
          position: [posX, posY, posZ],
          friction: 0.35,
          restitution: 0.2,
        });

        visuals.push({
          id: `vis-drop-${tileIndex++}`,
          type: 'ramp',
          position: [posX, posY, posZ],
          scale: [hx * 2, 0.5, hz * 2],
          color: palette.trackSecondary,
        });

        occupiedBoxes.push(box);
        curX += heading.dx * length;
        curZ += heading.dz * length;
        curY += dY;
        prevPieceType = 'drop';
        segmentsSinceDrop = 0;
        placed = true;
        break;
      }
    }

    if (!placed) {
      // Guaranteed safe fallback straight if turns/jumps were constrained
      const length = 6.0;
      const posX = curX + heading.dx * (length / 2);
      const posZ = curZ + heading.dz * (length / 2);
      const posY = curY - 0.1;
      const hx = heading.dx !== 0 ? length / 2 : 2.2;
      const hz = heading.dz !== 0 ? length / 2 : 2.2;

      colliders.push({
        type: 'box',
        halfExtents: [hx, 0.25, hz],
        position: [posX, posY, posZ],
        friction: 0.45,
        restitution: 0.2,
      });

      visuals.push({
        id: `vis-seg-${tileIndex++}`,
        type: 'straight',
        position: [posX, posY, posZ],
        scale: [hx * 2, 0.5, hz * 2],
        color: palette.trackPrimary,
      });

      curX += heading.dx * length;
      curZ += heading.dz * length;
      curY -= 0.1;
      prevPieceType = 'straight';
    }

    if (curY < lowestY) {
      lowestY = curY;
    }
  }

  // Final Goal Arena (7.5 x 7.5m with backstop and safety retention rails)
  const goalPadSize = 7.5;
  const goalX = curX + heading.dx * (goalPadSize / 2);
  const goalZ = curZ + heading.dz * (goalPadSize / 2);
  const goalY = curY - 0.25;

  colliders.push({
    type: 'box',
    halfExtents: [goalPadSize / 2, 0.25, goalPadSize / 2],
    position: [goalX, goalY, goalZ],
    friction: 0.5,
    restitution: 0.2,
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
      radius: 2.4,
    },
    checkpoints,
    deathY: Math.min(lowestY, goalY) - 10.0,
    colliders,
    visuals,
  };

  return { level, palette };
}
