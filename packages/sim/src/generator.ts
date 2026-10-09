import {
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

export function generateDailyLevel(seed: string): GeneratedDailyLevel {
  const rng = new SeededRNG(`daily-level-${seed}`);
  const palette = generateDailyPalette(seed);

  const colliders: ColliderDef[] = [];
  const visuals: TileVisual[] = [];

  // Start tile at origin
  let curX = 0;
  let curY = 1.0;
  let curZ = 2.5; // Leading edge of the 5x5 start platform
  let heading: Heading = { dx: 0, dz: 1 }; // facing forward along +Z

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

  const numSegments = rng.nextInt(7, 9);
  let prevPieceType = 'start';
  let tileIndex = 1;

  for (let s = 0; s < numSegments; s++) {
    // Choose segment type
    const possibleTypes: Array<'straight' | 'ramp' | 'corner_right' | 'corner_left' | 'bridge'> = [
      'straight',
      'ramp',
      'bridge',
    ];

    if (prevPieceType !== 'corner_right' && prevPieceType !== 'corner_left') {
      possibleTypes.push('corner_right', 'corner_left');
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
    deathY: goalY - 8.0,
    colliders,
    visuals,
  };

  return { level, palette };
}
