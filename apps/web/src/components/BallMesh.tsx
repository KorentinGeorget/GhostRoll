import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { BALL_RADIUS } from '@ghostroll/shared';

interface BallMeshProps {
  position: [number, number, number];
  velocity: [number, number, number];
}

export const BallMesh: React.FC<BallMeshProps> = ({ position, velocity }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.position.set(position[0], position[1], position[2]);

      // Roll ball according to linear velocity: dtheta = (v / R) * dt
      const vx = velocity[0];
      const vz = velocity[2];

      // Rotation around Z axis caused by movement along X: -vx / R
      meshRef.current.rotation.z -= (vx / BALL_RADIUS) * delta;
      // Rotation around X axis caused by movement along Z: vz / R
      meshRef.current.rotation.x += (vz / BALL_RADIUS) * delta;
    }
  });

  return (
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
  );
};
