import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { LevelPalette } from '@ghostroll/shared';

interface SkyEnvironmentProps {
  palette?: LevelPalette;
}

// Deterministic pseudo-random helper
function pseudoRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Creates an elegant atmospheric vertical gradient canvas texture for the SkyDome
 */
function createSkyDomeTexture(primaryHex: string, secondaryHex: string, bgHex: string) {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  // Top / Zenith: Deep cosmic void
  grad.addColorStop(0.0, '#030611');
  grad.addColorStop(0.3, '#080d22');
  // Upper atmosphere: Tinted by background / primary
  grad.addColorStop(0.55, bgHex);
  // Horizon: Vibrant luminous atmospheric glow
  grad.addColorStop(0.72, primaryHex);
  grad.addColorStop(0.78, secondaryHex);
  // Lower horizon mist
  grad.addColorStop(0.85, '#0b1126');
  // Floor / Nadir
  grad.addColorStop(1.0, '#02040a');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

export const SkyEnvironment: React.FC<SkyEnvironmentProps> = ({ palette }) => {
  const primaryColor = palette?.trackPrimary || '#6366f1';
  const secondaryColor = palette?.trackSecondary || '#ec4899';
  const fogColor = palette?.fog || '#0f172a';
  const bgColor = palette?.background || '#090d16';

  // 1. SkyDome Atmosphere Gradient Texture
  const skyTexture = useMemo(() => {
    return createSkyDomeTexture(primaryColor, secondaryColor, bgColor);
  }, [primaryColor, secondaryColor, bgColor]);

  // 2. Colossal Celestial Starfield (Spherical Distribution)
  const starfieldCount = 550;
  const starPositions = useMemo(() => {
    const pos = new Float32Array(starfieldCount * 3);
    for (let i = 0; i < starfieldCount; i++) {
      // Uniform spherical coordinates
      const u = pseudoRandom(i * 3);
      const v = pseudoRandom(i * 3 + 1);
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 240 + pseudoRandom(i * 3 + 2) * 15;

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = Math.max(-10, r * Math.cos(phi)); // Keep mostly above floor
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    return pos;
  }, []);

  // 3. Deep horizon floating monoliths & geometric crystal spires (safely distant from track)
  const spires = useMemo(() => {
    const list = [];
    const count = 32;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + pseudoRandom(i * 13) * 0.25;
      const dist = 195 + pseudoRandom(i * 17) * 45;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const height = 55 + pseudoRandom(i * 23) * 85;
      const radius = 6 + pseudoRandom(i * 29) * 8;
      const y = -36 + height / 2;
      const isHex = i % 3 === 0;
      const isCrystal = i % 4 === 1;

      list.push({
        id: i,
        x,
        y,
        baseY: y,
        z,
        radius,
        height,
        isHex,
        isCrystal,
        phase: pseudoRandom(i * 47) * Math.PI * 2,
        speed: 0.4 + pseudoRandom(i * 53) * 0.4,
      });
    }
    return list;
  }, []);

  // 4. Low floating air dust / speed particles around the track
  const dustCount = 260;
  const { dustPositions, dustVelocities } = useMemo(() => {
    const pos = new Float32Array(dustCount * 3);
    const vel = new Float32Array(dustCount * 3);

    for (let i = 0; i < dustCount; i++) {
      pos[i * 3] = (pseudoRandom(i * 7) - 0.5) * 110 + 10;
      pos[i * 3 + 1] = pseudoRandom(i * 7 + 1) * 36 - 6;
      pos[i * 3 + 2] = (pseudoRandom(i * 7 + 2) - 0.5) * 150 + 30;

      vel[i * 3] = (pseudoRandom(i * 11) - 0.5) * 0.3;
      vel[i * 3 + 1] = 0.3 + pseudoRandom(i * 13) * 0.6;
      vel[i * 3 + 2] = (pseudoRandom(i * 17) - 0.5) * 0.3;
    }
    return { dustPositions: pos, dustVelocities: vel };
  }, []);

  // Animation Refs
  const dustRef = useRef<THREE.Points>(null);
  const orbitalRingRef = useRef<THREE.Group>(null);
  const cloudSeaRef = useRef<THREE.Mesh>(null);
  const cyberGridRef = useRef<THREE.Mesh>(null);
  const auroraWaveRef = useRef<THREE.Mesh>(null);
  const spiresGroupRef = useRef<THREE.Group>(null);
  const celestialCoreRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();

    // 1. Dust motes flow upward for kinetic speed feel
    if (dustRef.current) {
      const attr = dustRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const array = attr.array as Float32Array;

      for (let i = 0; i < dustCount; i++) {
        array[i * 3 + 1] += dustVelocities[i * 3 + 1] * delta;
        if (array[i * 3 + 1] > 32) {
          array[i * 3 + 1] = -5;
        }
      }
      attr.needsUpdate = true;
    }

    // 2. Colossal Orbital Mega-Ring rotation
    if (orbitalRingRef.current) {
      orbitalRingRef.current.rotation.z += delta * 0.025;
    }

    // 3. Celestial Star / Sun gentle pulse
    if (celestialCoreRef.current) {
      celestialCoreRef.current.rotation.y += delta * 0.08;
      const scale = 1.0 + Math.sin(time * 1.5) * 0.04;
      celestialCoreRef.current.scale.set(scale, scale, scale);
    }

    // 4. Undulating Cloud Sea & Grid
    if (cloudSeaRef.current) {
      cloudSeaRef.current.rotation.z += delta * 0.01;
    }
    if (cyberGridRef.current) {
      cyberGridRef.current.rotation.z += delta * 0.006;
    }

    // 5. Translucent Aurora wave breathing
    if (auroraWaveRef.current) {
      auroraWaveRef.current.rotation.y = Math.sin(time * 0.25) * 0.08;
      auroraWaveRef.current.position.y = 48 + Math.sin(time * 0.5) * 3;
    }

    // 6. Subtle buoyant floating motion for distant spires
    if (spiresGroupRef.current) {
      const children = spiresGroupRef.current.children;
      for (let i = 0; i < children.length; i++) {
        const item = spires[i];
        if (item) {
          children[i].position.y = item.baseY + Math.sin(time * item.speed + item.phase) * 1.2;
        }
      }
    }
  });

  return (
    <group>
      {/* =========================================================================
          1. SKY DOME BACKDROP (Smooth atmospheric horizon gradient)
         ========================================================================= */}
      {skyTexture && (
        <mesh>
          <sphereGeometry args={[270, 32, 20]} />
          <meshBasicMaterial map={skyTexture} side={THREE.BackSide} depthWrite={false} fog={false} />
        </mesh>
      )}

      {/* =========================================================================
          2. DISTANT STARFIELD CONSTELLATIONS
         ========================================================================= */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[starPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.45}
          color="#f8fafc"
          transparent
          opacity={0.8}
          sizeAttenuation
          fog={false}
        />
      </points>

      {/* =========================================================================
          3. COLOSSAL ORBITAL MEGA-RING (Sci-Fi Halo Mega-Structure in deep sky)
         ========================================================================= */}
      <group
        ref={orbitalRingRef}
        position={[0, 160, 160]}
        rotation={[Math.PI / 3, 0.2, -0.1]}
      >
        {/* Main massive structural torus */}
        <mesh>
          <torusGeometry args={[145, 2.4, 16, 96]} />
          <meshStandardMaterial
            color="#0b101e"
            roughness={0.25}
            metalness={0.9}
            emissive={primaryColor}
            emissiveIntensity={0.2}
          />
        </mesh>
        {/* Inner high-energy glowing laser ribbon */}
        <mesh>
          <torusGeometry args={[144, 0.5, 8, 96]} />
          <meshBasicMaterial
            color={secondaryColor}
            transparent
            opacity={0.7}
          />
        </mesh>
      </group>

      {/* =========================================================================
          4. RADIANT CELESTIAL CORE / HORIZON SUN & CORONA
         ========================================================================= */}
      <group ref={celestialCoreRef} position={[70, 75, 175]}>
        {/* Inner incandescent core */}
        <mesh>
          <sphereGeometry args={[13, 24, 24]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        {/* Secondary radiant halo */}
        <mesh>
          <sphereGeometry args={[18, 24, 24]} />
          <meshBasicMaterial
            color={secondaryColor}
            transparent
            opacity={0.5}
            side={THREE.BackSide}
          />
        </mesh>
        {/* Outer atmospheric aura */}
        <mesh>
          <sphereGeometry args={[26, 24, 24]} />
          <meshBasicMaterial
            color={primaryColor}
            transparent
            opacity={0.25}
            side={THREE.BackSide}
          />
        </mesh>
      </group>

      {/* =========================================================================
          5. AURORA BOREALIS / CELESTIAL ENERGY WAVE (y = 48)
         ========================================================================= */}
      <mesh
        ref={auroraWaveRef}
        position={[0, 48, 30]}
        rotation={[-Math.PI / 2, 0, 0.2]}
      >
        <planeGeometry args={[280, 80, 16, 8]} />
        <meshBasicMaterial
          color={primaryColor}
          transparent
          opacity={0.12}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* =========================================================================
          6. STRATOSPHERIC CLOUD SEA & CYBER SPEED GRID (y = -22 to -25)
         ========================================================================= */}
      <group position={[10, -22, 35]}>
        {/* Upper dense mist / cloud sea */}
        <mesh ref={cloudSeaRef} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[380, 380, 20, 20]} />
          <meshStandardMaterial
            color={fogColor}
            emissive={primaryColor}
            emissiveIntensity={0.18}
            roughness={0.9}
            metalness={0.1}
            transparent
            opacity={0.92}
          />
        </mesh>

        {/* Retro-futuristic perspective speed grid */}
        <mesh
          ref={cyberGridRef}
          position={[0, 0.4, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[360, 360, 36, 36]} />
          <meshBasicMaterial
            color={secondaryColor}
            wireframe
            transparent
            opacity={0.14}
          />
        </mesh>
      </group>

      {/* =========================================================================
          7. DISTANT FLOATING GEOMETRIC SPIRES & CRYSTAL CITADELS
         ========================================================================= */}
      <group ref={spiresGroupRef}>
        {spires.map((s) => (
          <group key={s.id} position={[s.x, s.y, s.z]}>
            {s.isHex ? (
              // Hexagonal architectural pylon
              <mesh>
                <cylinderGeometry args={[s.radius * 0.7, s.radius, s.height, 6]} />
                <meshStandardMaterial
                  color="#0c1222"
                  metalness={0.8}
                  roughness={0.3}
                />
              </mesh>
            ) : s.isCrystal ? (
              // Faceted floating crystal spire
              <mesh>
                <octahedronGeometry args={[s.radius * 1.5, 0]} />
                <meshStandardMaterial
                  color="#1e1b4b"
                  emissive={secondaryColor}
                  emissiveIntensity={0.25}
                  metalness={0.85}
                  roughness={0.2}
                />
              </mesh>
            ) : (
              // Sleek monolith column with glowing vertical tech slit
              <group>
                <mesh>
                  <boxGeometry args={[s.radius, s.height, s.radius]} />
                  <meshStandardMaterial
                    color="#090e1c"
                    metalness={0.85}
                    roughness={0.25}
                  />
                </mesh>
                {/* Neon vertical edge seam */}
                <mesh position={[s.radius * 0.51, 0, 0]}>
                  <boxGeometry args={[0.08, s.height * 0.85, s.radius * 0.25]} />
                  <meshBasicMaterial
                    color={s.id % 2 === 0 ? primaryColor : secondaryColor}
                    transparent
                    opacity={0.65}
                  />
                </mesh>
              </group>
            )}

            {/* Glowing beacon cap on spires */}
            <mesh position={[0, s.height * 0.5 + 0.4, 0]}>
              <sphereGeometry args={[0.6, 12, 12]} />
              <meshBasicMaterial
                color={s.id % 2 === 0 ? secondaryColor : primaryColor}
                transparent
                opacity={0.85}
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* =========================================================================
          8. KINETIC AIR DUST & VELOCITY PARTICLES
         ========================================================================= */}
      <points ref={dustRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[dustPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.26}
          color="#c7d2fe"
          transparent
          opacity={0.75}
          sizeAttenuation
        />
      </points>
    </group>
  );
};
