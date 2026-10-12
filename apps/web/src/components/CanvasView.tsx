import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from '@react-three/drei';
import { LevelDefinition, LevelPalette } from '@ghostroll/shared';
import { LiveRenderState } from '../types/render.js';
import { BoardMesh } from './BoardMesh.js';
import { BallMesh } from './BallMesh.js';
import { GhostMesh } from './GhostMesh.js';
import { SkyEnvironment } from './SkyEnvironment.js';

interface CanvasViewProps {
  level: LevelDefinition;
  palette?: LevelPalette;
  liveRenderRef?: React.RefObject<LiveRenderState>;
  ballPos?: [number, number, number];
  ballVel?: [number, number, number];
  ghostPos?: [number, number, number] | null;
  tilt: { x: number; z: number };
  mode?: 'race' | 'editor';
  editorTarget?: [number, number, number];
}

function CameraRig({
  liveRenderRef,
  target = [0, 1, 0],
  velocity = [0, 0, 0],
  tilt,
  levelId,
}: {
  liveRenderRef?: React.RefObject<LiveRenderState>;
  target?: [number, number, number];
  velocity?: [number, number, number];
  tilt: { x: number; z: number };
  levelId?: string;
}) {
  const lastLevelId = useRef(levelId);
  const currentCamPos = useRef(
    new THREE.Vector3(target[0] - 6, target[1] + 11, target[2] - 11)
  );
  const currentLookAt = useRef(
    new THREE.Vector3(target[0], target[1] + 0.3, target[2])
  );
  const currentBank = useRef(0);
  const currentPitch = useRef(0);

  useFrame((state, delta) => {
    let tx: number;
    let ty: number;
    let tz: number;
    let vx: number;
    let vz: number;

    const live = liveRenderRef?.current;
    if (live) {
      const a = live.alpha;
      tx = live.prevPos[0] * (1 - a) + live.currPos[0] * a;
      ty = live.prevPos[1] * (1 - a) + live.currPos[1] * a;
      tz = live.prevPos[2] * (1 - a) + live.currPos[2] * a;
      vx = live.velocity[0];
      vz = live.velocity[2];
    } else {
      tx = target[0];
      ty = target[1];
      tz = target[2];
      vx = velocity[0];
      vz = velocity[2];
    }

    // Snap camera instantly on level change
    if (levelId && lastLevelId.current !== levelId) {
      lastLevelId.current = levelId;
      currentLookAt.current.set(tx, ty + 0.3, tz);
      currentCamPos.current.set(tx - 6, ty + 11, tz - 11);
      currentBank.current = 0;
      currentPitch.current = 0;
    }

    // Snap instantly on reset or huge teleport
    const distToTarget = currentLookAt.current.distanceTo(
      new THREE.Vector3(tx, ty, tz)
    );
    if (distToTarget > 15) {
      currentLookAt.current.set(tx, ty + 0.3, tz);
      currentCamPos.current.set(tx - 6, ty + 11, tz - 11);
      currentBank.current = 0;
      currentPitch.current = 0;
    }

    // Velocity-based lookahead (leads into turns smoothly)
    const lookaheadX = Math.max(-2, Math.min(2, vx * 0.15));
    const lookaheadZ = Math.max(-2, Math.min(2, vz * 0.15));
    const targetLookAt = new THREE.Vector3(
      tx + lookaheadX,
      ty + 0.3,
      tz + lookaheadZ
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
    const horizontalSpeed = Math.sqrt(vx * vx + vz * vz);
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

    // Trackmania Dynamic Speed FOV expansion (widens view at high speed for dramatic speed feel)
    if (state.camera instanceof THREE.PerspectiveCamera) {
      const targetFov = 50 + Math.min(15, horizontalSpeed * 0.7);
      state.camera.fov = THREE.MathUtils.damp(state.camera.fov, targetFov, 4.0, delta);
      state.camera.updateProjectionMatrix();
    }
  });

  return null;
}

function DynamicSun({
  liveRenderRef,
  fallbackPos = [0, 1, 0],
}: {
  liveRenderRef?: React.RefObject<LiveRenderState>;
  fallbackPos?: [number, number, number];
}) {
  const lightRef = useRef<THREE.DirectionalLight>(null);

  useFrame(() => {
    let px = fallbackPos[0];
    let py = fallbackPos[1];
    let pz = fallbackPos[2];

    const live = liveRenderRef?.current;
    if (live) {
      const a = live.alpha;
      px = live.prevPos[0] * (1 - a) + live.currPos[0] * a;
      py = live.prevPos[1] * (1 - a) + live.currPos[1] * a;
      pz = live.prevPos[2] * (1 - a) + live.currPos[2] * a;
    }

    if (lightRef.current) {
      lightRef.current.position.set(px + 12, py + 20, pz + 10);
      lightRef.current.target.position.set(px, py, pz);
      lightRef.current.target.updateMatrixWorld();
    }
  });

  return (
    <directionalLight
      ref={lightRef}
      position={[fallbackPos[0] + 12, fallbackPos[1] + 20, fallbackPos[2] + 10]}
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
  );
}

export const CanvasView: React.FC<CanvasViewProps> = ({
  level,
  palette,
  liveRenderRef,
  ballPos,
  ballVel,
  ghostPos,
  tilt,
  mode = 'race',
  editorTarget,
}) => {
  const bg = palette?.background || '#090d16';
  const fogColor = palette?.fog || '#090d16';

  return (
    <Canvas
      shadows
      camera={{ position: [-6, 12, -10], fov: 42, near: 0.1, far: 350 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      style={{ background: bg }}
    >
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={[fogColor, 65, 230]} />

      <ambientLight intensity={0.6} />
      <DynamicSun liveRenderRef={liveRenderRef} fallbackPos={ballPos} />
      <directionalLight position={[-15, 12, -10]} intensity={0.5} color="#818cf8" />
      <directionalLight position={[18, -8, 15]} intensity={0.25} color="#38bdf8" />

      {/* Atmospheric Horizon & Sky Environment (Cloud Sea, Horizon Spires, Celestial Core, Star Dust) */}
      <SkyEnvironment palette={palette} />

      {/* Track & props (stationary, exactly matching physics colliders) */}
      <BoardMesh level={level} palette={palette} tilt={tilt} />

      {mode === 'editor' ? (
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          target={
            editorTarget || [
              level.goal.position[0] * 0.7,
              level.goal.position[1] * 0.7,
              level.goal.position[2] * 0.7,
            ]
          }
          maxPolarAngle={Math.PI / 2 - 0.05}
          minDistance={4}
          maxDistance={220}
        />
      ) : (
        <>
          {/* Active player ball with drop shadow and depth indicator */}
          <BallMesh
            liveRenderRef={liveRenderRef}
            position={ballPos}
            velocity={ballVel}
            colliders={level.colliders}
          />

          {/* Ghost */}
          <GhostMesh liveRenderRef={liveRenderRef} position={ghostPos} />

          {/* Dynamic Camera tracking */}
          <CameraRig
            liveRenderRef={liveRenderRef}
            target={ballPos}
            velocity={ballVel}
            tilt={tilt}
            levelId={level.id}
          />
        </>
      )}
    </Canvas>
  );
};
