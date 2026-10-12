import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { LevelPalette } from '@ghostroll/shared';

interface SkyEnvironmentProps {
  palette?: LevelPalette;
}

// Deterministic pseudo-random helper for static environment elements
function pseudoRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export const SkyEnvironment: React.FC<SkyEnvironmentProps> = ({ palette }) => {
  const primaryColor = palette?.trackPrimary || '#6366f1';
  const secondaryColor = palette?.trackSecondary || '#ec4899';
  const fogColor = palette?.fog || '#0f172a';

  // 1. Distant floating monoliths / spires on the horizon
  const monoliths = useMemo(() => {
    const list = [];
    const count = 28;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + pseudoRandom(i * 11) * 0.2;
      const dist = 75 + pseudoRandom(i * 17) * 90;
      const x = Math.cos(angle) * dist + 8;
      const z = Math.sin(angle) * dist + 25;
      const height = 30 + pseudoRandom(i * 23) * 65;
      const width = 4 + pseudoRandom(i * 29) * 8;
      const depth = 4 + pseudoRandom(i * 31) * 8;
      const y = -10 + height / 2 + (pseudoRandom(i * 37) - 0.5) * 15;
      const rotY = pseudoRandom(i * 41) * Math.PI;

      list.push({ id: i, x, y, z, width, height, depth, rotY });
    }
    return list;
  }, []);

  // 2. Star dust / floating atmospheric motes
  const particleCount = 240;
  const { particlePositions, particleVelocities } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (pseudoRandom(i * 3) - 0.5) * 100 + 10;
      positions[i * 3 + 1] = pseudoRandom(i * 3 + 1) * 35 - 5;
      positions[i * 3 + 2] = (pseudoRandom(i * 3 + 2) - 0.5) * 140 + 30;

      velocities[i * 3] = (pseudoRandom(i * 7) - 0.5) * 0.4;
      velocities[i * 3 + 1] = 0.2 + pseudoRandom(i * 11) * 0.5;
      velocities[i * 3 + 2] = (pseudoRandom(i * 13) - 0.5) * 0.4;
    }

    return { particlePositions: positions, particleVelocities: velocities };
  }, []);

  const particlesRef = useRef<THREE.Points>(null);
  const cloudSeaRef = useRef<THREE.Mesh>(null);
  const celestialRingRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    // Animate star dust motes
    if (particlesRef.current) {
      const posAttr = particlesRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const array = posAttr.array as Float32Array;

      for (let i = 0; i < particleCount; i++) {
        array[i * 3 + 1] += particleVelocities[i * 3 + 1] * delta;

        // Wrap around vertically
        if (array[i * 3 + 1] > 32) {
          array[i * 3 + 1] = -4;
        }
      }
      posAttr.needsUpdate = true;
    }

    // Slowly rotate distant celestial energy ring
    if (celestialRingRef.current) {
      celestialRingRef.current.rotation.z += delta * 0.05;
    }

    // Subtle drifting tide for cloud sea
    if (cloudSeaRef.current) {
      cloudSeaRef.current.rotation.z += delta * 0.015;
    }
  });

  return (
    <group>
      {/* Distant Celestial Sun / Glowing Core */}
      <group position={[55, 45, 130]}>
        {/* Core sphere */}
        <mesh>
          <sphereGeometry args={[14, 24, 24]} />
          <meshBasicMaterial color={secondaryColor} />
        </mesh>
        {/* Luminous corona aura */}
        <mesh>
          <sphereGeometry args={[20, 24, 24]} />
          <meshBasicMaterial
            color={primaryColor}
            transparent
            opacity={0.22}
            side={THREE.BackSide}
          />
        </mesh>
        {/* Rotating celestial planetary ring */}
        <mesh ref={celestialRingRef} rotation={[Math.PI / 3, 0.4, 0]}>
          <ringGeometry args={[24, 32, 48]} />
          <meshBasicMaterial
            color={secondaryColor}
            transparent
            opacity={0.35}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* Atmospheric Cloud Sea beneath the track (y = -22) */}
      <group position={[10, -22, 35]}>
        <mesh ref={cloudSeaRef} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[360, 360, 16, 16]} />
          <meshStandardMaterial
            color={fogColor}
            emissive={primaryColor}
            emissiveIntensity={0.12}
            roughness={0.9}
            transparent
            opacity={0.85}
          />
        </mesh>
        {/* Lower secondary vapor stratum */}
        <mesh position={[0, -5, 0]} rotation={[-Math.PI / 2, 0, 0.3]}>
          <planeGeometry args={[420, 420, 8, 8]} />
          <meshBasicMaterial
            color={fogColor}
            transparent
            opacity={0.95}
          />
        </mesh>
      </group>

      {/* Distant Geometric Monoliths & Sky Citadels */}
      {monoliths.map((m) => (
        <group key={m.id} position={[m.x, m.y, m.z]} rotation={[0, m.rotY, 0]}>
          {/* Main monolith column */}
          <mesh>
            <boxGeometry args={[m.width, m.height, m.depth]} />
            <meshStandardMaterial
              color="#0b0f19"
              metalness={0.8}
              roughness={0.3}
            />
          </mesh>
          {/* Glowing vertical cyber trim line */}
          <mesh position={[m.width * 0.51, 0, 0]}>
            <boxGeometry args={[0.08, m.height * 0.9, m.depth * 0.2]} />
            <meshBasicMaterial
              color={m.id % 2 === 0 ? primaryColor : secondaryColor}
              transparent
              opacity={0.45}
            />
          </mesh>
          {/* Top illuminated beacon cap */}
          <mesh position={[0, m.height * 0.5 + 0.3, 0]}>
            <boxGeometry args={[m.width * 0.8, 0.6, m.depth * 0.8]} />
            <meshBasicMaterial
              color={m.id % 2 === 0 ? secondaryColor : primaryColor}
              transparent
              opacity={0.6}
            />
          </mesh>
        </group>
      ))}

      {/* Floating Star Dust & Speed Motes */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[particlePositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.22}
          color="#e0e7ff"
          transparent
          opacity={0.7}
          sizeAttenuation
        />
      </points>
    </group>
  );
};
