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
    const activePos = liveRenderRef?.current?.ghostPos ?? position;
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
      ringRef.current.rotation.y += delta * 2.5;
      ringRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 3) * 0.25;
    }
  });

  return (
    <group>
      <mesh ref={meshRef} position={position || [0, 0, 0]} visible={false}>
        <sphereGeometry args={[BALL_RADIUS * 0.95, 24, 24]} />
        <meshStandardMaterial
          color="#a855f7"
          emissive="#c084fc"
          emissiveIntensity={1.2}
          roughness={0.1}
          metalness={0.1}
          transparent
          opacity={0.55}
          wireframe={false}
        />
      </mesh>

      {/* Hologram orbit ring */}
      <mesh ref={ringRef} position={position || [0, 0, 0]} visible={false}>
        <torusGeometry args={[BALL_RADIUS * 1.3, 0.025, 12, 32]} />
        <meshBasicMaterial color="#e879f9" transparent opacity={0.75} />
      </mesh>
    </group>
  );
};
