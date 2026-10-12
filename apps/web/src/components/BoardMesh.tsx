import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { LevelDefinition, LevelPalette, TileVisual } from '@ghostroll/shared';

interface BoardMeshProps {
  level: LevelDefinition;
  palette?: LevelPalette;
  tilt: { x: number; z: number };
}

const CheckpointGate: React.FC<{ vis: TileVisual }> = ({ vis }) => {
  const hologramRef = useRef<THREE.Mesh>(null);
  const [width, height] = [vis.scale?.[0] ?? 4.0, vis.scale?.[1] ?? 2.2];
  const color = vis.color || '#38bdf8';

  useFrame((state) => {
    if (hologramRef.current) {
      const mat = hologramRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = 0.22 + 0.08 * Math.sin(state.clock.elapsedTime * 4.5);
      }
    }
  });

  return (
    <group position={vis.position} rotation={vis.rotation ? new THREE.Euler(...vis.rotation) : undefined}>
      {/* Left Pillar */}
      <mesh position={[-width / 2 + 0.12, height / 2, 0]} castShadow>
        <boxGeometry args={[0.24, height, 0.24]} />
        <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} emissive={color} emissiveIntensity={0.3} />
      </mesh>
      {/* Right Pillar */}
      <mesh position={[width / 2 - 0.12, height / 2, 0]} castShadow>
        <boxGeometry args={[0.24, height, 0.24]} />
        <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} emissive={color} emissiveIntensity={0.3} />
      </mesh>
      {/* Top Crossbar Arch */}
      <mesh position={[0, height + 0.1, 0]} castShadow>
        <boxGeometry args={[width, 0.26, 0.26]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} roughness={0.2} />
      </mesh>
      {/* Hologram Curtain */}
      <mesh ref={hologramRef} position={[0, height / 2, 0]}>
        <planeGeometry args={[width - 0.3, height]} />
        <meshBasicMaterial color={color} transparent opacity={0.25} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
};

const BoostPad: React.FC<{ vis: TileVisual; defaultColor?: string }> = ({ vis, defaultColor = '#f43f5e' }) => {
  const [w, h, d] = vis.scale || [4, 0.5, 6];
  const color = vis.color || defaultColor;

  return (
    <group position={vis.position} rotation={vis.rotation ? new THREE.Euler(...vis.rotation) : undefined}>
      {/* Base dark metallic platform */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#1e1b4b" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Glowing Neon Chevrons / Forward Boost Strips */}
      {[-d * 0.25, 0, d * 0.25].map((zOffset, i) => (
        <group key={i} position={[0, h / 2 + 0.02, zOffset]}>
          <mesh rotation={[0, Math.PI / 4, 0]}>
            <boxGeometry args={[w * 0.32, 0.04, 0.18]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.8} />
          </mesh>
          <mesh rotation={[0, -Math.PI / 4, 0]}>
            <boxGeometry args={[w * 0.32, 0.04, 0.18]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

const JumpPad: React.FC<{ vis: TileVisual; defaultColor?: string }> = ({ vis, defaultColor = '#fbbf24' }) => {
  const [w, h, d] = vis.scale || [3.5, 0.3, 3.5];
  const color = vis.color || defaultColor;

  return (
    <group position={vis.position} rotation={vis.rotation ? new THREE.Euler(...vis.rotation) : undefined}>
      {/* Base platform */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#2d2204" metalness={0.85} roughness={0.25} />
      </mesh>
      {/* Glowing target launch rings */}
      <mesh position={[0, h / 2 + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[Math.min(w, d) * 0.2, Math.min(w, d) * 0.38, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, h / 2 + 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[Math.min(w, d) * 0.12, 24]} />
        <meshStandardMaterial color="#ffffff" emissive={color} emissiveIntensity={2.2} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

const IceTile: React.FC<{ vis: TileVisual }> = ({ vis }) => {
  const [w, h, d] = vis.scale || [4, 0.5, 6];

  return (
    <group position={vis.position} rotation={vis.rotation ? new THREE.Euler(...vis.rotation) : undefined}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color="#bae6fd"
          emissive="#38bdf8"
          emissiveIntensity={0.25}
          roughness={0.04}
          metalness={0.15}
          transparent
          opacity={0.88}
        />
      </mesh>
    </group>
  );
};

export const BoardMesh: React.FC<BoardMeshProps> = ({ level, palette, tilt: _tilt }) => {
  const goalRingRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (goalRingRef.current) {
      goalRingRef.current.rotation.z += delta * 1.5;
    }
  });

  return (
    <group>
      {/* Visual Level Tiles */}
      {level.visuals.map((vis) => {
        if (vis.type === 'checkpoint') {
          return <CheckpointGate key={vis.id} vis={vis} />;
        }

        if (vis.type === 'boost') {
          return <BoostPad key={vis.id} vis={vis} defaultColor={palette?.boost} />;
        }

        if (vis.type === 'jump') {
          return <JumpPad key={vis.id} vis={vis} defaultColor={palette?.jumpPad} />;
        }

        if (vis.type === 'ice') {
          return <IceTile key={vis.id} vis={vis} />;
        }

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
