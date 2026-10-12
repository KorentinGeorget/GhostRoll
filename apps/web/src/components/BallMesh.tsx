import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { BALL_RADIUS, ColliderDef } from '@ghostroll/shared';
import { LiveRenderState } from '../types/render.js';

interface BallMeshProps {
  liveRenderRef?: React.RefObject<LiveRenderState>;
  position?: [number, number, number];
  velocity?: [number, number, number];
  colliders?: ColliderDef[];
}

function createBlobShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
    gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

function findGroundY(x: number, y: number, z: number, colliders?: ColliderDef[]): number | null {
  if (!colliders) return null;
  let highest = -999;
  for (const col of colliders) {
    if (col.type === 'box') {
      const [cx, cy, cz] = col.position || [0, 0, 0];
      const [hx, hy, hz] = col.halfExtents;
      if (x >= cx - hx && x <= cx + hx && z >= cz - hz && z <= cz + hz) {
        const topY = cy + hy;
        if (topY <= y + 0.1 && topY > highest) {
          highest = topY;
        }
      }
    }
  }
  return highest > -900 ? highest : null;
}

export const BallMesh: React.FC<BallMeshProps> = ({
  liveRenderRef,
  position = [0, 1, 0],
  velocity = [0, 0, 0],
  colliders,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const shadowMeshRef = useRef<THREE.Mesh>(null);
  const tetherMeshRef = useRef<THREE.Mesh>(null);

  const shadowTexture = useMemo(() => {
    if (typeof document !== 'undefined') {
      return createBlobShadowTexture();
    }
    return null;
  }, []);

  const TRAIL_LENGTH = 16;
  const trailPositions = useRef<THREE.Vector3[]>(
    Array.from({ length: 16 }, () => new THREE.Vector3(position[0], position[1], position[2]))
  );
  const lineGeometryRef = useRef<THREE.BufferGeometry>(null);
  const lineMatRef = useRef<THREE.LineBasicMaterial>(null);

  useFrame((_, delta) => {
    let px: number;
    let py: number;
    let pz: number;
    let vx: number;
    let vz: number;

    const live = liveRenderRef?.current;
    if (live) {
      const a = live.alpha;
      px = live.prevPos[0] * (1 - a) + live.currPos[0] * a;
      py = live.prevPos[1] * (1 - a) + live.currPos[1] * a;
      pz = live.prevPos[2] * (1 - a) + live.currPos[2] * a;
      vx = live.velocity[0];
      vz = live.velocity[2];
    } else {
      px = position[0];
      py = position[1];
      pz = position[2];
      vx = velocity[0];
      vz = velocity[2];
    }

    const horizontalSpeed = Math.sqrt(vx * vx + vz * vz);

    if (meshRef.current) {
      meshRef.current.position.set(px, py, pz);

      // Roll ball according to linear velocity: dtheta = (v / R) * dt
      meshRef.current.rotation.z -= (vx / BALL_RADIUS) * delta;
      meshRef.current.rotation.x += (vz / BALL_RADIUS) * delta;

      // Speed-scaled neon emissive glow
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.emissiveIntensity = 0.25 + Math.min(1.2, horizontalSpeed * 0.08);
      }
    }

    // Dynamic ground drop shadow & vertical tether
    const groundY = findGroundY(px, py, pz, colliders);
    const isOverGround = groundY !== null;
    const altitude = isOverGround ? Math.max(0, py - BALL_RADIUS - groundY) : 999;

    if (shadowMeshRef.current) {
      if (isOverGround && altitude < 15.0) {
        shadowMeshRef.current.visible = true;
        shadowMeshRef.current.position.set(px, groundY + 0.02, pz);

        // Scale shadow slightly larger and fade with altitude
        const scaleFactor = Math.min(2.2, 1.0 + altitude * 0.22);
        shadowMeshRef.current.scale.set(scaleFactor, scaleFactor, 1);

        const mat = shadowMeshRef.current.material as THREE.MeshBasicMaterial;
        if (mat) {
          mat.opacity = THREE.MathUtils.clamp(0.8 / (1.0 + altitude * 0.65), 0.15, 0.85);
        }
      } else {
        shadowMeshRef.current.visible = false;
      }
    }

    if (tetherMeshRef.current) {
      // Show vertical guide tether only when significantly airborne
      if (isOverGround && altitude > 0.25 && altitude < 10.0) {
        tetherMeshRef.current.visible = true;
        const tetherHeight = altitude;
        tetherMeshRef.current.scale.set(1, tetherHeight, 1);
        tetherMeshRef.current.position.set(px, groundY + tetherHeight / 2, pz);
      } else {
        tetherMeshRef.current.visible = false;
      }
    }

    // Update motion trail history
    const pts = trailPositions.current;
    for (let i = pts.length - 1; i > 0; i--) {
      pts[i].copy(pts[i - 1]);
    }
    pts[0].set(px, py, pz);

    if (lineGeometryRef.current) {
      const posAttr = lineGeometryRef.current.attributes.position as THREE.BufferAttribute;
      if (posAttr) {
        for (let i = 0; i < pts.length; i++) {
          posAttr.setXYZ(i, pts[i].x, pts[i].y, pts[i].z);
        }
        posAttr.needsUpdate = true;
      }
    }

    if (lineMatRef.current) {
      lineMatRef.current.opacity = horizontalSpeed > 2.5 ? Math.min(0.7, (horizontalSpeed - 2.5) * 0.07) : 0;
    }
  });

  return (
    <group>
      {/* 1. Main player sphere */}
      <mesh ref={meshRef} position={position} castShadow>
        <sphereGeometry args={[BALL_RADIUS, 32, 32]} />
        <meshStandardMaterial
          color="#38bdf8"
          roughness={0.15}
          metalness={0.85}
          emissive="#0284c7"
          emissiveIntensity={0.25}
        />
      </mesh>

      {/* 2. Projected Ground Blob Shadow */}
      <mesh
        ref={shadowMeshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[position[0], position[1] - BALL_RADIUS, position[2]]}
      >
        <planeGeometry args={[BALL_RADIUS * 2.2, BALL_RADIUS * 2.2]} />
        <meshBasicMaterial
          map={shadowTexture}
          transparent
          opacity={0.8}
          depthWrite={false}
        />
      </mesh>

      {/* 3. Airborne Vertical Altitude Tether / Laser Guide */}
      <mesh ref={tetherMeshRef} visible={false}>
        <cylinderGeometry args={[0.015, 0.015, 1, 8]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </mesh>

      {/* 4. Speed Ribbon Motion Trail */}
      <line>
        <bufferGeometry
          ref={lineGeometryRef}
          onUpdate={(geo) => {
            const positions = new Float32Array(TRAIL_LENGTH * 3);
            for (let i = 0; i < TRAIL_LENGTH; i++) {
              positions[i * 3] = position[0];
              positions[i * 3 + 1] = position[1];
              positions[i * 3 + 2] = position[2];
            }
            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          }}
        />
        <lineBasicMaterial
          ref={lineMatRef}
          color="#38bdf8"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </line>
    </group>
  );
};
