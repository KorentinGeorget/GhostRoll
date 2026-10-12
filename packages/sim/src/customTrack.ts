import {
  CheckpointDef,
  ColliderDef,
  LevelDefinition,
  LevelPalette,
  SIM_VERSION,
  TileVisual,
} from '@ghostroll/shared';
import { generateDailyPalette } from './palette.js';

export type TrackPieceType =
  | 'straight'
  | 'ramp'
  | 'drop'
  | 'corner_right'
  | 'corner_left'
  | 'booster'
  | 'ice'
  | 'jump_gap'
  | 'bridge'
  | 'checkpoint';

export interface CustomTrackDef {
  id: string;
  name: string;
  author?: string;
  theme?: string;
  pieces: TrackPieceType[];
}

export const PIECE_CODE_MAP: Record<TrackPieceType, string> = {
  straight: 'S',
  ramp: 'M',
  drop: 'D',
  corner_right: 'R',
  corner_left: 'L',
  booster: 'B',
  ice: 'I',
  jump_gap: 'J',
  bridge: 'G',
  checkpoint: 'K',
};

export const CODE_PIECE_MAP: Record<string, TrackPieceType> = Object.entries(
  PIECE_CODE_MAP
).reduce(
  (acc, [type, code]) => {
    acc[code] = type as TrackPieceType;
    return acc;
  },
  {} as Record<string, TrackPieceType>
);

export const TRACK_THEMES: Record<string, LevelPalette> = {
  cyberpunk: {
    name: 'Cyberpunk Neon',
    background: '#090a16',
    fog: '#0c0e1f',
    trackPrimary: '#6366f1',
    trackSecondary: '#06b6d4',
    bridge: '#ec4899',
    bumper: '#f43f5e',
    boost: '#38bdf8',
    jumpPad: '#fbbf24',
    ice: '#a5b4fc',
    goal: '#10b981',
  },
  solar: {
    name: 'Solar Flare',
    background: '#160b07',
    fog: '#210e08',
    trackPrimary: '#ea580c',
    trackSecondary: '#f59e0b',
    bridge: '#ef4444',
    bumper: '#e11d48',
    boost: '#fb923c',
    jumpPad: '#facc15',
    ice: '#fed7aa',
    goal: '#22c55e',
  },
  glacier: {
    name: 'Glacial Drift',
    background: '#06131f',
    fog: '#091c2e',
    trackPrimary: '#0284c7',
    trackSecondary: '#38bdf8',
    bridge: '#818cf8',
    bumper: '#f472b6',
    boost: '#0ea5e9',
    jumpPad: '#e0e7ff',
    ice: '#c7d2fe',
    goal: '#34d399',
  },
  emerald: {
    name: 'Emerald Matrix',
    background: '#051610',
    fog: '#082118',
    trackPrimary: '#059669',
    trackSecondary: '#10b981',
    bridge: '#14b8a6',
    bumper: '#ec4899',
    boost: '#34d399',
    jumpPad: '#a7f3d0',
    ice: '#a7f3d0',
    goal: '#4ade80',
  },
  obsidian: {
    name: 'Obsidian Crimson',
    background: '#14080a',
    fog: '#1c0c0f',
    trackPrimary: '#dc2626',
    trackSecondary: '#f87171',
    bridge: '#d97706',
    bumper: '#fb7185',
    boost: '#ef4444',
    jumpPad: '#fbbf24',
    ice: '#fecaca',
    goal: '#10b981',
  },
};

export const TRACK_PRESETS: Array<{ id: string; name: string; theme: string; pieces: TrackPieceType[] }> = [
  {
    id: 'grand-prix',
    name: 'Grand Prix Circuit',
    theme: 'cyberpunk',
    pieces: [
      'straight',
      'ramp',
      'corner_right',
      'straight',
      'booster',
      'corner_right',
      'ice',
      'drop',
      'corner_right',
      'straight',
      'checkpoint',
      'corner_right',
      'straight',
    ],
  },
  {
    id: 'roller-coaster',
    name: 'Roller Coaster Extreme',
    theme: 'solar',
    pieces: [
      'straight',
      'booster',
      'drop',
      'ramp',
      'corner_left',
      'jump_gap',
      'straight',
      'drop',
      'corner_left',
      'booster',
      'straight',
    ],
  },
  {
    id: 'ice-drift',
    name: 'Glacier Drift Master',
    theme: 'glacier',
    pieces: [
      'straight',
      'ice',
      'corner_right',
      'ice',
      'corner_left',
      'straight',
      'checkpoint',
      'ice',
      'corner_right',
      'booster',
      'ice',
      'corner_left',
      'straight',
    ],
  },
  {
    id: 'daredevil',
    name: 'Daredevil Skyway',
    theme: 'obsidian',
    pieces: [
      'straight',
      'booster',
      'jump_gap',
      'bridge',
      'corner_right',
      'straight',
      'drop',
      'corner_right',
      'jump_gap',
      'straight',
    ],
  },
];

export function encodeTrackPieces(pieces: TrackPieceType[]): string {
  return pieces.map((p) => PIECE_CODE_MAP[p] || 'S').join('');
}

export function decodeTrackPieces(code: string): TrackPieceType[] {
  if (!code) return [];
  const pieces: TrackPieceType[] = [];
  for (let i = 0; i < code.length; i++) {
    const ch = code[i].toUpperCase();
    if (CODE_PIECE_MAP[ch]) {
      pieces.push(CODE_PIECE_MAP[ch]);
    }
  }
  return pieces;
}

export function encodeCustomTrack(def: {
  name: string;
  theme?: string;
  pieces: TrackPieceType[];
}): string {
  const code = encodeTrackPieces(def.pieces);
  const theme = def.theme || 'cyberpunk';
  const nameSafe = encodeURIComponent(def.name.trim() || 'Custom Track');
  return `${nameSafe}:${theme}:${code}`;
}

export function decodeCustomTrack(str: string): {
  name: string;
  theme: string;
  pieces: TrackPieceType[];
} {
  if (!str) {
    return { name: 'Custom Track', theme: 'cyberpunk', pieces: [] };
  }

  // Format can be name:theme:code or just code
  const parts = str.split(':');
  if (parts.length === 3) {
    const name = decodeURIComponent(parts[0]);
    const theme = TRACK_THEMES[parts[1]] ? parts[1] : 'cyberpunk';
    const pieces = decodeTrackPieces(parts[2]);
    return { name, theme, pieces };
  }

  // Fallback: check if it's just a raw piece code string
  const pieces = decodeTrackPieces(str);
  return {
    name: 'Custom Track',
    theme: 'cyberpunk',
    pieces,
  };
}

export function buildCustomLevel(
  pieces: TrackPieceType[],
  options?: {
    id?: string;
    name?: string;
    author?: string;
    theme?: string;
  }
): { level: LevelDefinition; palette: LevelPalette } {
  const themeKey = options?.theme || 'cyberpunk';
  const palette = TRACK_THEMES[themeKey] || generateDailyPalette('custom-default');

  const colliders: ColliderDef[] = [];
  const visuals: TileVisual[] = [];
  const checkpoints: CheckpointDef[] = [];

  let curX = 0;
  let curY = 0;
  let curZ = 3.5;
  let lowestY = 0;
  const heading = { dx: 0, dz: 1 };
  let tileIndex = 1;
  let cpIndex = 1;

  // 1. Starting pad
  colliders.push({
    type: 'box',
    halfExtents: [3.5, 0.25, 3.5],
    position: [0, 0, 0],
    friction: 0.6,
    restitution: 0.2,
  });

  visuals.push({
    id: 'spawn-pad',
    type: 'pad',
    position: [0, 0, 0],
    scale: [7, 0.5, 7],
    color: palette.trackPrimary,
  });

  // 2. Chained modular track pieces
  for (const piece of pieces) {
    if (piece === 'straight') {
      const length = 7.0;
      const dY = -0.15;
      const posX = curX + heading.dx * (length / 2);
      const posZ = curZ + heading.dz * (length / 2);
      const posY = curY + dY / 2;
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
        id: `vis-track-${tileIndex++}`,
        type: 'straight',
        position: [posX, posY, posZ],
        scale: [hx * 2, 0.5, hz * 2],
        color: palette.trackPrimary,
      });

      curX += heading.dx * length;
      curZ += heading.dz * length;
      curY += dY;
    } else if (piece === 'ramp') {
      const length = 7.0;
      const dY = -0.45;
      const posX = curX + heading.dx * (length / 2);
      const posZ = curZ + heading.dz * (length / 2);
      const posY = curY + dY / 2;
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
        id: `vis-ramp-${tileIndex++}`,
        type: 'ramp',
        position: [posX, posY, posZ],
        scale: [hx * 2, 0.5, hz * 2],
        color: palette.trackSecondary,
      });

      curX += heading.dx * length;
      curZ += heading.dz * length;
      curY += dY;
    } else if (piece === 'drop') {
      const length = 7.5;
      const dY = -0.85;
      const posX = curX + heading.dx * (length / 2);
      const posZ = curZ + heading.dz * (length / 2);
      const posY = curY + dY / 2;
      const hx = heading.dx !== 0 ? length / 2 : 2.4;
      const hz = heading.dz !== 0 ? length / 2 : 2.4;

      colliders.push({
        type: 'box',
        halfExtents: [hx, 0.25, hz],
        position: [posX, posY, posZ],
        friction: 0.35,
        restitution: 0.2,
      });

      const perpX = -heading.dz;
      const perpZ = heading.dx;
      const railOffset = 2.4;
      const railHalfL = length / 2;
      const railHx = heading.dx !== 0 ? railHalfL : 0.15;
      const railHz = heading.dz !== 0 ? railHalfL : 0.15;

      colliders.push(
        {
          type: 'box',
          halfExtents: [railHx, 0.45, railHz],
          position: [posX + perpX * railOffset, posY + 0.55, posZ + perpZ * railOffset],
          friction: 0.15,
          restitution: 0.2,
        },
        {
          type: 'box',
          halfExtents: [railHx, 0.45, railHz],
          position: [posX - perpX * railOffset, posY + 0.55, posZ - perpZ * railOffset],
          friction: 0.15,
          restitution: 0.2,
        }
      );

      visuals.push({
        id: `vis-drop-${tileIndex++}`,
        type: 'ramp',
        position: [posX, posY, posZ],
        scale: [hx * 2, 0.5, hz * 2],
        color: palette.trackSecondary,
      });

      curX += heading.dx * length;
      curZ += heading.dz * length;
      curY += dY;
    } else if (piece === 'corner_right' || piece === 'corner_left') {
      const isRight = piece === 'corner_right';
      const turnSize = 5.6;
      const dY = -0.2;
      const cornerX = curX + heading.dx * (turnSize / 2);
      const cornerZ = curZ + heading.dz * (turnSize / 2);
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

      // Outer safety retention barrier
      const outRailX = cornerX + heading.dx * (turnSize / 2 - 0.15);
      const outRailZ = cornerZ + heading.dz * (turnSize / 2 - 0.15);
      const rHx = heading.dx !== 0 ? 0.15 : turnSize / 2;
      const rHz = heading.dz !== 0 ? 0.15 : turnSize / 2;

      colliders.push({
        type: 'box',
        halfExtents: [rHx, 0.45, rHz],
        position: [outRailX, cornerY + 0.55, outRailZ],
        friction: 0.15,
        restitution: 0.2,
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

      curX = cornerX + heading.dx * (turnSize / 2);
      curZ = cornerZ + heading.dz * (turnSize / 2);
      curY = cornerY;
    } else if (piece === 'booster') {
      const length = 7.5;
      const dY = -0.15;
      const posX = curX + heading.dx * (length / 2);
      const posZ = curZ + heading.dz * (length / 2);
      const posY = curY + dY / 2;
      const hx = heading.dx !== 0 ? length / 2 : 2.2;
      const hz = heading.dz !== 0 ? length / 2 : 2.2;

      colliders.push({
        type: 'box',
        halfExtents: [hx, 0.25, hz],
        position: [posX, posY, posZ],
        friction: 0.45,
        restitution: 0.2,
      });

      const padLength = 4.0;
      const padWidth = 2.0;
      const padHx = heading.dx !== 0 ? padLength / 2 : padWidth / 2;
      const padHz = heading.dz !== 0 ? padLength / 2 : padWidth / 2;

      colliders.push({
        type: 'box',
        halfExtents: [padHx, 0.1, padHz],
        position: [posX, posY + 0.26, posZ],
        friction: 0.1,
        restitution: 0.2,
        isBoost: true,
        boostSpeed: 20.0,
        boostDirection: [heading.dx, 0, heading.dz],
      });

      visuals.push({
        id: `vis-boost-${tileIndex++}`,
        type: 'boost',
        position: [posX, posY, posZ],
        scale: [hx * 2, 0.5, hz * 2],
        color: palette.boost ?? '#38bdf8',
      });

      curX += heading.dx * length;
      curZ += heading.dz * length;
      curY += dY;
    } else if (piece === 'ice') {
      const length = 7.5;
      const dY = -0.15;
      const posX = curX + heading.dx * (length / 2);
      const posZ = curZ + heading.dz * (length / 2);
      const posY = curY + dY / 2;
      const hx = heading.dx !== 0 ? length / 2 : 2.3;
      const hz = heading.dz !== 0 ? length / 2 : 2.3;

      colliders.push({
        type: 'box',
        halfExtents: [hx, 0.25, hz],
        position: [posX, posY, posZ],
        friction: 0.04,
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

      curX += heading.dx * length;
      curZ += heading.dz * length;
      curY += dY;
    } else if (piece === 'jump_gap') {
      const launchLength = 4.5;
      const gapDistance = 4.0;
      const landingLength = 8.5;
      const dYLaunch = -0.15;
      const dYGap = -0.45;
      const dYLanding = -0.15;

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
        jumpImpulse: 3.8,
      });

      visuals.push({
        id: `vis-jump-${tileIndex++}`,
        type: 'jump',
        position: [lipX, launchPosY + 0.22, lipZ],
        scale: [lipHx * 2, 0.2, lipHz * 2],
        color: palette.jumpPad ?? '#fbbf24',
      });

      const afterGapX = curX + heading.dx * (launchLength + gapDistance);
      const afterGapZ = curZ + heading.dz * (launchLength + gapDistance);
      const afterGapY = curY + dYLaunch + dYGap;

      const landPosX = afterGapX + heading.dx * (landingLength / 2);
      const landPosZ = afterGapZ + heading.dz * (landingLength / 2);
      const landPosY = afterGapY + dYLanding / 2;
      const hxLand = heading.dx !== 0 ? landingLength / 2 : 2.7;
      const hzLand = heading.dz !== 0 ? landingLength / 2 : 2.7;

      colliders.push({
        type: 'box',
        halfExtents: [hxLand, 0.25, hzLand],
        position: [landPosX, landPosY, landPosZ],
        friction: 0.55,
        restitution: 0.15,
      });

      visuals.push({
        id: `vis-land-${tileIndex++}`,
        type: 'straight',
        position: [landPosX, landPosY, landPosZ],
        scale: [hxLand * 2, 0.5, hzLand * 2],
        color: palette.trackPrimary,
      });

      curX = afterGapX + heading.dx * landingLength;
      curZ = afterGapZ + heading.dz * landingLength;
      curY = afterGapY + dYLanding;
    } else if (piece === 'bridge') {
      const length = 7.0;
      const dY = -0.2;
      const posX = curX + heading.dx * (length / 2);
      const posZ = curZ + heading.dz * (length / 2);
      const posY = curY + dY / 2;
      const hx = heading.dx !== 0 ? length / 2 : 1.45;
      const hz = heading.dz !== 0 ? length / 2 : 1.45;

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
    } else if (piece === 'checkpoint') {
      // Split timing checkpoint with road segment
      const length = 7.0;
      const dY = -0.15;
      const posX = curX + heading.dx * (length / 2);
      const posZ = curZ + heading.dz * (length / 2);
      const posY = curY + dY / 2;
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
        id: `vis-cp-road-${tileIndex++}`,
        type: 'straight',
        position: [posX, posY, posZ],
        scale: [hx * 2, 0.5, hz * 2],
        color: palette.trackPrimary,
      });

      checkpoints.push({
        index: cpIndex,
        position: [posX, posY + 0.35, posZ],
        radius: 3.5,
      });

      visuals.push({
        id: `vis-cp-${cpIndex}`,
        type: 'checkpoint',
        position: [posX, posY + 0.26, posZ],
        scale: [4.4, 0.05, 0.4],
        checkpointIndex: cpIndex,
      });
      cpIndex++;

      curX += heading.dx * length;
      curZ += heading.dz * length;
      curY += dY;
    }

    if (curY < lowestY) {
      lowestY = curY;
    }
  }

  // 3. Goal Finish Pad at track terminal
  const goalDist = 3.5;
  const goalX = curX + heading.dx * goalDist;
  const goalZ = curZ + heading.dz * goalDist;
  const goalY = curY;

  colliders.push({
    type: 'box',
    halfExtents: [2.5, 0.25, 2.5],
    position: [goalX, goalY, goalZ],
    friction: 0.6,
    restitution: 0.2,
  });

  visuals.push({
    id: 'vis-goal',
    type: 'goal',
    position: [goalX, goalY, goalZ],
    scale: [5.0, 0.5, 5.0],
    color: palette.goal,
  });

  const levelName = options?.name?.trim() || 'Custom Circuit';
  const customId = options?.id || `custom-${Date.now().toString(36)}`;

  const level: LevelDefinition = {
    id: customId,
    name: levelName,
    simVersion: SIM_VERSION,
    spawn: [0, 2.2, 0],
    goal: {
      position: [goalX, goalY + 0.5, goalZ],
      radius: 2.4,
    },
    checkpoints: checkpoints.length > 0 ? checkpoints : undefined,
    deathY: Math.min(lowestY, goalY) - 10.0,
    colliders,
    visuals,
  };

  return { level, palette };
}
