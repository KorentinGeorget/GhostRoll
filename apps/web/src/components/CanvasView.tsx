import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LevelDefinition, LevelPalette } from '@ghostroll/shared';
import { BoardMesh } from './BoardMesh.js';
import { BallMesh } from './BallMesh.js';
import { GhostMesh } from './GhostMesh.js';

interface CanvasViewProps {
  level: LevelDefinition;
  palette?: LevelPalette;
  ballPos: [number, number, number];
  ballVel: [number, number, number];
  ghostPos: [number, number, number] | null;
  tilt: { x: number; z: number };
}

function CameraRig({
  target,
  velocity,
  tilt,
}: {
  target: [number, number, number];
  velocity: [number, number, number];
  tilt: { x: number; z: number };
}) {
  const currentCamPos = useRef(
    new THREE.Vector3(target[0] - 6, target[1] + 11, target[2] - 11)
  );
  const currentLookAt = useRef(
    new THREE.Vector3(target[0], target[1] + 0.3, target[2])
  );
  const currentBank = useRef(0);
  const currentPitch = useRef(0);

  useFrame((state, delta) => {
    // Snap instantly on reset or huge teleport
    const distToTarget = currentLookAt.current.distanceTo(
      new THREE.Vector3(target[0], target[1], target[2])
    );
    if (distToTarget > 15) {
      currentLookAt.current.set(target[0], target[1] + 0.3, target[2]);
      currentCamPos.current.set(target[0] - 6, target[1] + 11, target[2] - 11);
      currentBank.current = 0;
      currentPitch.current = 0;
    }

    // Velocity-based lookahead (leads into turns smoothly)
    const lookaheadX = Math.max(-2, Math.min(2, velocity[0] * 0.15));
    const lookaheadZ = Math.max(-2, Math.min(2, velocity[2] * 0.15));
    const targetLookAt = new THREE.Vector3(
      target[0] + lookaheadX,
      target[1] + 0.3,
      target[2] + lookaheadZ
    );

    currentLookAt.current.x = THREE.MathUtils.damp(
      currentLookAt.current.x,
      targetLookAt.x,
      6.0,
      delta
    );
    currentLookAt.current.y = THREE.MathUtils.damp(
      currentLookAt.current.y,
      targetLookAt.y,
      7.0,
      delta
    );
    currentLookAt.current.z = THREE.MathUtils.damp(
      currentLookAt.current.z,
      targetLookAt.z,
      6.0,
      delta
    );

    // Smooth banking & pitch from tilt input (damped to prevent snapping on key press/release)
    const targetBank = -(tilt.x / 127) * 0.035;
    const targetPitch = (tilt.z / 127) * 0.4;
    currentBank.current = THREE.MathUtils.damp(currentBank.current, targetBank, 4.5, delta);
    currentPitch.current = THREE.MathUtils.damp(currentPitch.current, targetPitch, 4.5, delta);

    // Dynamic speed zoom: slightly pull back at high velocity for better situational awareness
    const horizontalSpeed = Math.sqrt(velocity[0] * velocity[0] + velocity[2] * velocity[2]);
    const speedZoom = Math.min(2.5, horizontalSpeed * 0.12);

    const targetCamPos = new THREE.Vector3(
      currentLookAt.current.x - 6 - speedZoom * 0.35,
      currentLookAt.current.y + 11 + speedZoom * 0.5,
      currentLookAt.current.z - 11 - speedZoom * 0.5 + currentPitch.current
    );

    currentCamPos.current.x = THREE.MathUtils.damp(
      currentCamPos.current.x,
      targetCamPos.x,
      5.0,
      delta
    );
    currentCamPos.current.y = THREE.MathUtils.damp(
      currentCamPos.current.y,
      targetCamPos.y,
      5.0,
      delta
    );
    currentCamPos.current.z = THREE.MathUtils.damp(
      currentCamPos.current.z,
      targetCamPos.z,
      5.0,
      delta
    );

    state.camera.position.copy(currentCamPos.current);
    state.camera.lookAt(currentLookAt.current);
    state.camera.rotation.z += currentBank.current;
  });

  return null;
}

export const CanvasView: React.FC<CanvasViewProps> = ({
  level,
  palette,
  ballPos,
  ballVel,
  ghostPos,
  tilt,
}) => {
  const bg = palette?.background || '#090d16';
  const fogColor = palette?.fog || '#090d16';

  return (
    <Canvas
      shadows
      camera={{ position: [-6, 12, -10], fov: 42, near: 0.1, far: 200 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      style={{ background: bg }}
    >
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={[fogColor, 30, 80]} />

      <ambientLight intensity={0.7} />
      <directionalLight
        position={[ballPos[0] + 12, ballPos[1] + 20, ballPos[2] + 10]}
        intensity={1.8}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
        shadow-camera-near={1}
        shadow-camera-far={60}
        shadow-bias={-0.0001}
      />
      <directionalLight position={[-15, 10, -10]} intensity={0.4} color="#6366f1" />

      {/* Track & props (stationary, exactly matching physics colliders) */}
      <BoardMesh level={level} palette={palette} tilt={tilt} />

      {/* Active player ball with drop shadow and depth indicator */}
      <BallMesh position={ballPos} velocity={ballVel} colliders={level.colliders} />

      {/* Ghost */}
      <GhostMesh position={ghostPos} />

      {/* Dynamic Camera tracking */}
      <CameraRig target={ballPos} velocity={ballVel} tilt={tilt} />
    </Canvas>
  );
};
