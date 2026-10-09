import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { BALL_RADIUS } from '@ghostroll/shared';
import { LiveRenderState } from '../types/render.js';

interface GhostMeshProps {
  liveRenderRef?: React.RefObject<LiveRenderState>;
  position?: [number, number, number] | null;
  name?: string;
}

export const GhostMesh: React.FC<GhostMeshProps> = ({
  liveRenderRef,
  position,
  name = 'Personal Best',
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    const activePos = liveRenderRef?.current ? liveRenderRef.current.ghostPos : position;
    if (!activePos) {
      if (meshRef.current) meshRef.current.visible = false;
      if (ringRef.current) ringRef.current.visible = false;
      return;
    }

    if (meshRef.current) {
      meshRef.current.visible = true;
      meshRef.current.position.set(activePos[0], activePos[1], activePos[2]);
    }

    if (ringRef.current) {
      ringRef.current.visible = true;
      ringRef.current.position.set(activePos[0], activePos[1], activePos[2]);
      ringRef.current.rotation.y += delta * 2;
      ringRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 3) * 0.2;
    }
  });

  if (!position) return null;

  return (
    <group>
      <mesh ref={meshRef} position={position}>
        <sphereGeometry args={[BALL_RADIUS * 0.95, 24, 24]} />
        <meshStandardMaterial
          color="#a855f7"
          emissive="#c084fc"
          emissiveIntensity={0.8}
          roughness={0.1}
          metalness={0.1}
          transparent
          opacity={0.45}
          wireframe={false}
        />
      </mesh>

      {/* Hologram orbit ring */}
      <mesh ref={ringRef} position={position}>
        <torusGeometry args={[BALL_RADIUS * 1.3, 0.02, 12, 32]} />
        <meshBasicMaterial color="#e879f9" transparent opacity={0.6} />
      </mesh>
    </group>
  );
};
