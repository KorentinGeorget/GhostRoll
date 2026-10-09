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
  tilt,
}: {
  target: [number, number, number];
  tilt: { x: number; z: number };
}) {
  const currentLookAt = useRef(new THREE.Vector3(target[0], target[1], target[2]));

  useFrame((state, delta) => {
    const targetVec = new THREE.Vector3(target[0], target[1], target[2]);

    // Smoothly track target with slight lookahead
    currentLookAt.current.lerp(targetVec, Math.min(1, delta * 8));

    // Dynamic camera banking and pitch from player tilt
    const bankAngle = -(tilt.x / 127) * 0.04;
    const pitchOffset = (tilt.z / 127) * 0.5;

    // Isometric chase camera offset (behind and above ball)
    const desiredCamPos = new THREE.Vector3(
      currentLookAt.current.x - 6,
      currentLookAt.current.y + 11,
      currentLookAt.current.z - 11 + pitchOffset
    );

    state.camera.position.lerp(desiredCamPos, Math.min(1, delta * 6));
    state.camera.lookAt(
      currentLookAt.current.x,
      currentLookAt.current.y + 0.5,
      currentLookAt.current.z + 1.5
    );
    state.camera.rotation.z += bankAngle;
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
      <CameraRig target={ballPos} tilt={tilt} />
    </Canvas>
  );
};
