import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { LevelDefinition, LevelPalette } from '@ghostroll/shared';

interface BoardMeshProps {
  level: LevelDefinition;
  palette?: LevelPalette;
  tilt: { x: number; z: number };
}

export const BoardMesh: React.FC<BoardMeshProps> = ({ level, palette, tilt }) => {
  const groupRef = useRef<THREE.Group>(null);
  const goalRingRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      // Smooth visual tilt of the board
      const targetRotZ = -(tilt.x / 127) * 0.08;
      const targetRotX = (tilt.z / 127) * 0.08;

      groupRef.current.rotation.z = THREE.MathUtils.damp(
        groupRef.current.rotation.z,
        targetRotZ,
        15,
        delta
      );
      groupRef.current.rotation.x = THREE.MathUtils.damp(
        groupRef.current.rotation.x,
        targetRotX,
        15,
        delta
      );
    }

    if (goalRingRef.current) {
      goalRingRef.current.rotation.z += delta * 1.5;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Visual Level Tiles */}
      {level.visuals.map((vis) => {
        if (vis.type === 'bumper') {
          const bumperColor = vis.color || palette?.bumper || '#ec4899';
          return (
            <mesh
              key={vis.id}
              position={vis.position}
              castShadow
              receiveShadow
            >
              <cylinderGeometry args={[0.5, 0.5, 0.6, 24]} />
              <meshStandardMaterial
                color={bumperColor}
                emissive={bumperColor}
                emissiveIntensity={0.6}
                roughness={0.2}
                metalness={0.8}
              />
            </mesh>
          );
        }

        if (vis.type === 'goal') {
          const goalColor = palette?.goal || '#10b981';
          return (
            <group key={vis.id} position={vis.position}>
              {/* Base platform */}
              <mesh receiveShadow>
                <boxGeometry args={vis.scale || [7, 0.5, 7]} />
                <meshStandardMaterial color="#064e3b" roughness={0.4} metalness={0.2} />
              </mesh>

              {/* Glowing goal target disc */}
              <mesh position={[0, 0.28, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <circleGeometry args={[level.goal.radius, 32]} />
                <meshStandardMaterial
                  color={goalColor}
                  emissive={goalColor}
                  emissiveIntensity={0.8}
                  transparent
                  opacity={0.85}
                />
              </mesh>

              {/* Floating animated aura ring */}
              <mesh ref={goalRingRef} position={[0, 1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <torusGeometry args={[level.goal.radius * 0.85, 0.08, 16, 48]} />
                <meshStandardMaterial
                  color={goalColor}
                  emissive={goalColor}
                  emissiveIntensity={1.2}
                />
              </mesh>
            </group>
          );
        }

        // Standard track tiles (pads, straightaways, ramps, bridges)
        const isBridge = vis.id.includes('bridge');
        const tileColor =
          vis.color ||
          (isBridge ? palette?.bridge || '#d97706' : palette?.trackPrimary || '#4338ca');

        return (
          <mesh
            key={vis.id}
            position={vis.position}
            castShadow
            receiveShadow
          >
            <boxGeometry args={vis.scale || [4, 0.5, 4]} />
            <meshStandardMaterial
              color={tileColor}
              roughness={0.35}
              metalness={0.25}
            />
          </mesh>
        );
      })}

      {/* Decorative track edge guides / rails */}
      <mesh position={[0, 0.9, 0]} receiveShadow>
        <boxGeometry args={[5.2, 0.1, 5.2]} />
        <meshStandardMaterial color={palette?.trackSecondary || '#312e81'} roughness={0.6} />
      </mesh>

    </group>
  );
};
