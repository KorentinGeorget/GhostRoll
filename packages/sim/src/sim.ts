import RAPIER from '@dimforge/rapier3d-deterministic-compat';
import {
  BALL_RADIUS,
  FIXED_DT,
  GRAVITY_MAGNITUDE,
  InputFrame,
  LevelDefinition,
  SimState,
  SimStatus,
} from '@ghostroll/shared';
import { computeDeterministicGravity } from './math.js';
import { computeStateHash } from './state-hash.js';

let rapierReady: Promise<void> | null = null;

export async function initPhysics(): Promise<void> {
  if (!rapierReady) {
    rapierReady = RAPIER.init();
  }
  return rapierReady;
}

export interface Simulation {
  step(input: InputFrame): SimState;
  getState(): SimState;
  reset(): void;
  destroy(): void;
}

export function createSimulation(level: LevelDefinition): Simulation {
  // World with standard gravity initially
  const gravity = { x: 0.0, y: -GRAVITY_MAGNITUDE, z: 0.0 };
  const world = new RAPIER.World(gravity);
  world.timestep = FIXED_DT;

  // Build static level colliders
  for (const col of level.colliders) {
    const [px, py, pz] = col.position ?? [0, 0, 0];
    const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(px, py, pz);

    if (col.type === 'box' && col.rotation) {
      bodyDesc.setRotation({
        x: col.rotation[0],
        y: col.rotation[1],
        z: col.rotation[2],
        w: col.rotation[3],
      });
    }

    const body = world.createRigidBody(bodyDesc);

    let colDesc: RAPIER.ColliderDesc;
    if (col.type === 'box') {
      colDesc = RAPIER.ColliderDesc.cuboid(
        col.halfExtents[0],
        col.halfExtents[1],
        col.halfExtents[2]
      );
    } else if (col.type === 'cylinder') {
      colDesc = RAPIER.ColliderDesc.cylinder(col.halfHeight, col.radius);
    } else if (col.type === 'trimesh') {
      colDesc = RAPIER.ColliderDesc.trimesh(
        new Float32Array(col.vertices),
        new Uint32Array(col.indices)
      );
    } else {
      continue;
    }

    colDesc.setFriction(col.friction ?? 0.5);
    colDesc.setRestitution(col.restitution ?? 0.2);
    world.createCollider(colDesc, body);
  }

  // Create ball body
  function spawnBall(): RAPIER.RigidBody {
    const ballDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(level.spawn[0], level.spawn[1], level.spawn[2])
      .setCcdEnabled(true)
      .setLinearDamping(0.15)
      .setAngularDamping(0.2);

    const ball = world.createRigidBody(ballDesc);
    const colDesc = RAPIER.ColliderDesc.ball(BALL_RADIUS)
      .setFriction(0.6)
      .setRestitution(0.2)
      .setDensity(1.5);
    world.createCollider(colDesc, ball);
    return ball;
  }

  let ballBody = spawnBall();
  let tick = 0;
  let status: SimStatus = 'ready';

  function buildState(): SimState {
    const pos = ballBody.translation();
    const vel = ballBody.linvel();
    const ang = ballBody.angvel();

    const hash = computeStateHash(
      tick,
      pos.x,
      pos.y,
      pos.z,
      vel.x,
      vel.y,
      vel.z,
      ang.x,
      ang.y,
      ang.z
    );

    return {
      tick,
      status,
      ball: {
        position: [pos.x, pos.y, pos.z],
        velocity: [vel.x, vel.y, vel.z],
        angularVelocity: [ang.x, ang.y, ang.z],
      },
      hash,
    };
  }

  return {
    step(input: InputFrame): SimState {
      if (status === 'won' || status === 'dead') {
        return buildState();
      }

      if (status === 'ready') {
        if (input.tiltX !== 0 || input.tiltZ !== 0 || input.jump) {
          status = 'playing';
        } else {
          return buildState();
        }
      }

      // Compute and apply deterministic gravity
      const g = computeDeterministicGravity(input, GRAVITY_MAGNITUDE);
      world.gravity = { x: g.x, y: g.y, z: g.z };

      // Handle jump impulse if grounded
      if (input.jump) {
        const curPos = ballBody.translation();
        const curVel = ballBody.linvel();
        if (curVel.y < 2.0) {
          const ray = new RAPIER.Ray(
            { x: curPos.x, y: curPos.y - (BALL_RADIUS + 0.01), z: curPos.z },
            { x: 0.0, y: -1.0, z: 0.0 }
          );
          const hit = world.castRay(ray, 0.15, true);
          if (hit !== null) {
            ballBody.applyImpulse({ x: 0.0, y: 5.5, z: 0.0 }, true);
          }
        }
      }

      world.step();
      tick++;

      const pos = ballBody.translation();

      // Check win condition (sphere vs cylinder/circle around goal)
      const dx = pos.x - level.goal.position[0];
      const dy = pos.y - level.goal.position[1];
      const dz = pos.z - level.goal.position[2];
      const distHorizontalSq = dx * dx + dz * dz;

      if (
        distHorizontalSq <= level.goal.radius * level.goal.radius &&
        Math.abs(dy) <= 1.5
      ) {
        status = 'won';
      } else if (pos.y < level.deathY) {
        status = 'dead';
      }

      return buildState();
    },

    getState(): SimState {
      return buildState();
    },

    reset(): void {
      world.removeRigidBody(ballBody);
      ballBody = spawnBall();
      tick = 0;
      status = 'ready';
      world.gravity = { x: 0.0, y: -GRAVITY_MAGNITUDE, z: 0.0 };
    },

    destroy(): void {
      world.free();
    },
  };
}
