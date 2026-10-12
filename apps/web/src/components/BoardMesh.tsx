import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { LevelDefinition, LevelPalette, TileVisual } from '@ghostroll/shared';

interface BoardMeshProps {
  level: LevelDefinition;
  palette?: LevelPalette;
  tilt: { x: number; z: number };
}

/**
 * Standard High-Tech Racing Platform
 * Features a central dark asphalt speedway, Trackmania-style neon racing kerbs,
 * and a beveled structural undercarriage for architectural depth.
 */
const TrackPlatform: React.FC<{
  vis: TileVisual;
  palette?: LevelPalette;
  isSpawn?: boolean;
}> = ({ vis, palette, isSpawn }) => {
  const [w, h, d] = vis.scale || [4, 0.5, 4];
  const isBridge = vis.id.includes('bridge');
  const isRamp = vis.type === 'ramp';

  const primaryColor =
    vis.color ||
    (isBridge ? palette?.bridge || '#f59e0b' : palette?.trackPrimary || '#4f46e5');
  const accentColor = palette?.trackSecondary || '#06b6d4';

  const curbWidth = Math.min(0.38, w * 0.1);
  const roadWidth = w - curbWidth * 2;

  return (
    <group
      position={vis.position}
      rotation={vis.rotation ? new THREE.Euler(...vis.rotation) : undefined}
    >
      {/* 1. Main Central Dark Asphalt Roadway */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[roadWidth, h, d]} />
        <meshStandardMaterial
          color="#111827"
          roughness={0.45}
          metalness={0.2}
        />
      </mesh>

      {/* 2. Center Track Dash Line */}
      {d >= 3 && !isSpawn && (
        <mesh position={[0, h / 2 + 0.005, 0]} receiveShadow>
          <planeGeometry args={[0.08, d * 0.85]} />
          <meshBasicMaterial
            color={accentColor}
            transparent
            opacity={0.35}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* 3. Left Racing Kerb / Border Rail */}
      <mesh position={[-w / 2 + curbWidth / 2, 0.01, 0]} castShadow receiveShadow>
        <boxGeometry args={[curbWidth, h + 0.02, d]} />
        <meshStandardMaterial
          color={primaryColor}
          emissive={primaryColor}
          emissiveIntensity={0.65}
          roughness={0.3}
          metalness={0.5}
        />
      </mesh>

      {/* 4. Right Racing Kerb / Border Rail */}
      <mesh position={[w / 2 - curbWidth / 2, 0.01, 0]} castShadow receiveShadow>
        <boxGeometry args={[curbWidth, h + 0.02, d]} />
        <meshStandardMaterial
          color={primaryColor}
          emissive={primaryColor}
          emissiveIntensity={0.65}
          roughness={0.3}
          metalness={0.5}
        />
      </mesh>

      {/* 5. Sleek Floating Undercarriage (Beveled Architectural Keel) */}
      <mesh position={[0, -h * 0.45, 0]} receiveShadow>
        <boxGeometry args={[w * 0.86, h * 0.8, d * 0.94]} />
        <meshStandardMaterial
          color="#090d16"
          metalness={0.85}
          roughness={0.25}
        />
      </mesh>

      {/* Glowing undercarriage seam */}
      <mesh position={[0, -h * 0.8, 0]}>
        <boxGeometry args={[w * 0.75, 0.04, d * 0.85]} />
        <meshBasicMaterial
          color={accentColor}
          transparent
          opacity={0.3}
        />
      </mesh>

      {/* 6. Ramp Directional Upward Chevrons */}
      {isRamp && (
        <group position={[0, h / 2 + 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          {[-1, 0, 1].map((idx) => (
            <mesh key={idx} position={[0, idx * (d * 0.22), 0]}>
              <ringGeometry args={[0.25, 0.4, 3, 1, 0, Math.PI]} />
              <meshBasicMaterial color={accentColor} transparent opacity={0.7} />
            </mesh>
          ))}
        </group>
      )}

      {/* 7. Spawn Launch Pad Grid */}
      {isSpawn && (
        <group position={[0, h / 2 + 0.01, 0]}>
          {/* Starting line striped pattern */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[roadWidth * 0.85, 0.4]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
          </mesh>
          {/* Launch Ready Flanking Pylons */}
          <mesh position={[-w * 0.46, 0.35, 0]}>
            <cylinderGeometry args={[0.07, 0.09, 0.7, 16]} />
            <meshStandardMaterial
              color="#10b981"
              emissive="#10b981"
              emissiveIntensity={1.8}
            />
          </mesh>
          <mesh position={[w * 0.46, 0.35, 0]}>
            <cylinderGeometry args={[0.07, 0.09, 0.7, 16]} />
            <meshStandardMaterial
              color="#10b981"
              emissive="#10b981"
              emissiveIntensity={1.8}
            />
          </mesh>
        </group>
      )}
    </group>
  );
};

const BoostPad: React.FC<{ vis: TileVisual; defaultColor?: string }> = ({
  vis,
  defaultColor = '#f43f5e',
}) => {
  const [w, h, d] = vis.scale || [4, 0.5, 6];
  const color = vis.color || defaultColor;

  return (
    <group
      position={vis.position}
      rotation={vis.rotation ? new THREE.Euler(...vis.rotation) : undefined}
    >
      {/* Base dark metallic platform */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#181824" metalness={0.85} roughness={0.25} />
      </mesh>
      {/* Luminous boost border rails */}
      <mesh position={[-w / 2 + 0.12, 0.01, 0]}>
        <boxGeometry args={[0.24, h + 0.02, d]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} />
      </mesh>
      <mesh position={[w / 2 - 0.12, 0.01, 0]}>
        <boxGeometry args={[0.24, h + 0.02, d]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} />
      </mesh>

      {/* Glowing Neon Chevrons / Forward Boost Strips */}
      {[-d * 0.28, -d * 0.09, d * 0.1, d * 0.29].map((zOffset, i) => (
        <group key={i} position={[0, h / 2 + 0.02, zOffset]}>
          <mesh rotation={[0, Math.PI / 4, 0]}>
            <boxGeometry args={[w * 0.3, 0.04, 0.2]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.2} />
          </mesh>
          <mesh rotation={[0, -Math.PI / 4, 0]}>
            <boxGeometry args={[w * 0.3, 0.04, 0.2]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.2} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

const JumpPad: React.FC<{ vis: TileVisual; defaultColor?: string }> = ({
  vis,
  defaultColor = '#fbbf24',
}) => {
  const [w, h, d] = vis.scale || [3.5, 0.3, 3.5];
  const color = vis.color || defaultColor;

  return (
    <group
      position={vis.position}
      rotation={vis.rotation ? new THREE.Euler(...vis.rotation) : undefined}
    >
      {/* Base platform */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#1f1a10" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Glowing target launch rings */}
      <mesh position={[0, h / 2 + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[Math.min(w, d) * 0.22, Math.min(w, d) * 0.4, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.8}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, h / 2 + 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[Math.min(w, d) * 0.14, 24]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive={color}
          emissiveIntensity={2.5}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};

const IceTile: React.FC<{ vis: TileVisual }> = ({ vis }) => {
  const [w, h, d] = vis.scale || [4, 0.5, 6];

  return (
    <group
      position={vis.position}
      rotation={vis.rotation ? new THREE.Euler(...vis.rotation) : undefined}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color="#c7d2fe"
          emissive="#38bdf8"
          emissiveIntensity={0.3}
          roughness={0.03}
          metalness={0.2}
          transparent
          opacity={0.88}
        />
      </mesh>
    </group>
  );
};

/**
 * Goal Platform with celestial sky beacon and dual rotating aura rings
 */
const GoalPlatform: React.FC<{
  vis: TileVisual;
  goalRadius: number;
  palette?: LevelPalette;
}> = ({ vis, goalRadius, palette }) => {
  const goalColor = palette?.goal || '#10b981';
  const outerRingRef = useRef<THREE.Mesh>(null);
  const innerRingRef = useRef<THREE.Mesh>(null);
  const beaconRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (outerRingRef.current) {
      outerRingRef.current.rotation.z += delta * 1.2;
    }
    if (innerRingRef.current) {
      innerRingRef.current.rotation.z -= delta * 1.8;
    }
    if (beaconRef.current) {
      beaconRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <group position={vis.position}>
      {/* Base platform */}
      <mesh receiveShadow>
        <boxGeometry args={vis.scale || [7, 0.5, 7]} />
        <meshStandardMaterial color="#064e3b" roughness={0.35} metalness={0.4} />
      </mesh>

      {/* Architectural beveled under-chassis */}
      <mesh position={[0, -0.4, 0]} receiveShadow>
        <boxGeometry args={[(vis.scale?.[0] || 7) * 0.88, 0.5, (vis.scale?.[2] || 7) * 0.88]} />
        <meshStandardMaterial color="#022c22" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Target Disc on surface */}
      <mesh position={[0, 0.28, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[goalRadius, 36]} />
        <meshStandardMaterial
          color={goalColor}
          emissive={goalColor}
          emissiveIntensity={1.0}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Concentric target ring */}
      <mesh position={[0, 0.29, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[goalRadius * 0.45, goalRadius * 0.55, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>

      {/* Dual Floating Animated Aura Rings */}
      <mesh ref={outerRingRef} position={[0, 1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[goalRadius * 0.88, 0.08, 16, 48]} />
        <meshStandardMaterial color={goalColor} emissive={goalColor} emissiveIntensity={1.4} />
      </mesh>
      <mesh ref={innerRingRef} position={[0, 1.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[goalRadius * 0.6, 0.06, 16, 36]} />
        <meshStandardMaterial color="#a7f3d0" emissive="#34d399" emissiveIntensity={1.8} />
      </mesh>

      {/* Iconic Trackmania Celestial Sky Beacon (Vertical Beam of Light) */}
      <mesh ref={beaconRef} position={[0, 18, 0]}>
        <cylinderGeometry args={[goalRadius * 0.7, goalRadius * 0.7, 36, 24, 1, true]} />
        <meshBasicMaterial
          color={goalColor}
          transparent
          opacity={0.18}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* High-intensity inner core beam */}
      <mesh position={[0, 18, 0]}>
        <cylinderGeometry args={[goalRadius * 0.2, goalRadius * 0.2, 36, 16, 1, true]} />
        <meshBasicMaterial
          color="#a7f3d0"
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};

export const BoardMesh: React.FC<BoardMeshProps> = ({ level, palette, tilt: _tilt }) => {
  return (
    <group>
      {/* Visual Level Tiles */}
      {level.visuals.map((vis) => {
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
                emissiveIntensity={0.8}
                roughness={0.2}
                metalness={0.8}
              />
            </mesh>
          );
        }

        if (vis.type === 'goal') {
          return (
            <GoalPlatform
              key={vis.id}
              vis={vis}
              goalRadius={level.goal.radius}
              palette={palette}
            />
          );
        }

        // Standard racing track tiles (pads, straightaways, ramps, bridges, corners)
        const isSpawn = vis.id === 'spawn-pad' || vis.id === 'tile-0';
        return (
          <TrackPlatform
            key={vis.id}
            vis={vis}
            palette={palette}
            isSpawn={isSpawn}
          />
        );
      })}
    </group>
  );
};
