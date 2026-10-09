import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LevelDefinition } from '@ghostroll/shared';
import { BoardMesh } from './BoardMesh.js';
import { BallMesh } from './BallMesh.js';
import { GhostMesh } from './GhostMesh.js';

interface CanvasViewProps {
  level: LevelDefinition;
  ballPos: [number, number, number];
  ballVel: [number, number, number];
  ghostPos: [number, number, number] | null;
  tilt: { x: number; z: number };
}

function CameraRig({ target }: { target: [number, number, number] }) {
  const currentLookAt = useRef(new THREE.Vector3(target[0], target[1], target[2]));

  useFrame((state, delta) => {
    const targetVec = new THREE.Vector3(target[0], target[1], target[2]);

    // Smoothly track target with slight lookahead
    currentLookAt.current.lerp(targetVec, Math.min(1, delta * 8));

    // Isometric chase camera offset (behind and above ball)
    const desiredCamPos = new THREE.Vector3(
      currentLookAt.current.x - 6,
      currentLookAt.current.y + 11,
      currentLookAt.current.z - 11
    );

    state.camera.position.lerp(desiredCamPos, Math.min(1, delta * 6));
    state.camera.lookAt(
      currentLookAt.current.x,
      currentLookAt.current.y + 0.5,
      currentLookAt.current.z + 1.5
    );
  });

  return null;
}

export const CanvasView: React.FC<CanvasViewProps> = ({
  level,
  ballPos,
  ballVel,
  ghostPos,
  tilt,
}) => {
  return (
    <Canvas
      shadows
      camera={{ position: [-6, 12, -10], fov: 42, near: 0.1, far: 200 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      style={{ background: '#090d16' }}
    >
      <color attach="background" args={['#090d16']} />
      <fog attach="fog" args={['#090d16', 30, 80]} />

      <ambientLight intensity={0.7} />
      <directionalLight
        position={[15, 25, 10]}
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

      {/* Track & props */}
      <BoardMesh level={level} tilt={tilt} />

      {/* Active player ball */}
      <BallMesh position={ballPos} velocity={ballVel} />

      {/* Ghost */}
      <GhostMesh position={ghostPos} />

      {/* Dynamic Camera tracking */}
      <CameraRig target={ballPos} />
    </Canvas>
  );
};
