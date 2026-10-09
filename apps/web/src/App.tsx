import React, { useEffect, useState, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  FIXED_DT,
  GhostSample,
  InputFrame,
  LevelDefinition,
  ReplayPayload,
  SimState,
  SimStatus,
} from '@ghostroll/shared';
import {
  createSimulation,
  initPhysics,
  LEVEL_1,
  Simulation,
} from '@ghostroll/sim';
import { CanvasView } from './components/CanvasView.js';
import { HUD } from './components/HUD.js';
import { VirtualJoystick } from './components/VirtualJoystick.js';
import { useControls } from './hooks/useControls.js';
import {
  getStoredPB,
  saveStoredPB,
  sampleGhostPosition,
  StoredPB,
} from './utils/ghostStorage.js';

export const App: React.FC = () => {
  const [physicsReady, setPhysicsReady] = useState(false);
  const [level] = useState<LevelDefinition>(LEVEL_1);

  // Live simulation UI state
  const [simState, setSimState] = useState<SimState | null>(null);
  const [personalBest, setPersonalBest] = useState<StoredPB | null>(null);
  const [showGhost, setShowGhost] = useState(true);
  const [isNewPB, setIsNewPB] = useState(false);

  // Active rendering interpolated values
  const [renderPos, setRenderPos] = useState<[number, number, number]>(level.spawn);
  const [renderVel, setRenderVel] = useState<[number, number, number]>([0, 0, 0]);
  const [ghostRenderPos, setGhostRenderPos] = useState<[number, number, number] | null>(null);

  // Controls hook
  const { getInput, setVirtualTilt, rawTilt } = useControls();

  // References for the loop
  const simRef = useRef<Simulation | null>(null);
  const recordedInputs = useRef<InputFrame[]>([]);
  const recordedSamples = useRef<GhostSample[]>([]);
  const hasWonRef = useRef(false);

  // Initialize Physics & Load PB
  useEffect(() => {
    let mounted = true;
    initPhysics().then(() => {
      if (!mounted) return;
      const sim = createSimulation(level);
      simRef.current = sim;
      setSimState(sim.getState());
      setRenderPos(sim.getState().ball.position);
      setRenderVel(sim.getState().ball.velocity);
      setPhysicsReady(true);
    });

    const pb = getStoredPB(level.id);
    setPersonalBest(pb);

    return () => {
      mounted = false;
      simRef.current?.destroy();
    };
  }, [level]);

  // Restart function
  const handleRestart = useCallback(() => {
    if (!simRef.current) return;
    simRef.current.reset();
    recordedInputs.current = [];
    recordedSamples.current = [];
    hasWonRef.current = false;
    setIsNewPB(false);
    const initial = simRef.current.getState();
    setSimState(initial);
    setRenderPos(initial.ball.position);
    setRenderVel(initial.ball.velocity);
    setGhostRenderPos(null);
  }, []);

  // Keyboard shortcut 'R' for restart
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyR') {
        handleRestart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRestart]);

  // High-performance fixed-timestep game loop
  useEffect(() => {
    if (!physicsReady) return;

    let animId: number;
    let lastTime = performance.now();
    let accumulator = 0;

    const loop = (currentTime: number) => {
      const deltaSec = Math.min((currentTime - lastTime) / 1000, 0.1); // Clamp to prevent spiral of death
      lastTime = currentTime;
      accumulator += deltaSec;

      const sim = simRef.current;
      if (!sim) {
        animId = requestAnimationFrame(loop);
        return;
      }

      let state = sim.getState();

      // Step simulation for all accumulated 60Hz ticks
      while (accumulator >= FIXED_DT) {
        if (state.status !== 'won' && state.status !== 'dead') {
          const input = getInput();
          recordedInputs.current.push(input);

          state = sim.step(input);

          // Sample ghost trajectory at 20Hz (every 3 ticks)
          if (state.tick % 3 === 0) {
            recordedSamples.current.push([
              state.tick,
              state.ball.position[0],
              state.ball.position[1],
              state.ball.position[2],
            ]);
          }

          // Handle Win celebration & PB check
          if (state.status === 'won' && !hasWonRef.current) {
            hasWonRef.current = true;
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#38bdf8', '#818cf8', '#34d399', '#f43f5e'],
            });

            // Check Personal Best
            const currentTicks = state.tick;
            const currentPB = getStoredPB(level.id);

            const isBetter = !currentPB || currentTicks < currentPB.ticks;
            if (isBetter) {
              setIsNewPB(true);
              const newPB: StoredPB = {
                levelId: level.id,
                ticks: currentTicks,
                timeSeconds: currentTicks * FIXED_DT,
                date: new Date().toISOString(),
                finalHash: state.hash,
                samples: recordedSamples.current,
                replay: {
                  magic: 'GRRP',
                  formatVersion: 1,
                  simVersion: level.simVersion,
                  levelId: level.id,
                  tickCount: currentTicks,
                  finalHash: state.hash,
                  inputs: recordedInputs.current,
                },
              };
              saveStoredPB(newPB);
              setPersonalBest(newPB);
            }
          }
        }
        accumulator -= FIXED_DT;
      }

      // Update positions for R3F Canvas
      setRenderPos(state.ball.position);
      setRenderVel(state.ball.velocity);

      // Interpolate Ghost
      if (showGhost && personalBest) {
        const ghostP = sampleGhostPosition(personalBest.samples, state.tick);
        setGhostRenderPos(ghostP);
      } else {
        setGhostRenderPos(null);
      }

      // Sync React HUD state
      setSimState(state);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [physicsReady, getInput, level, showGhost, personalBest]);

  if (!physicsReady || !simState) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#090d16] text-white space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
        <p className="text-sm font-semibold tracking-wider text-slate-300">
          INITIALIZING DETERMINISTIC WASM ENGINE...
        </p>
      </div>
    );
  }

  const speedMagnitude = Math.sqrt(
    renderVel[0] * renderVel[0] + renderVel[1] * renderVel[1] + renderVel[2] * renderVel[2]
  );

  return (
    <div className="relative w-full h-full select-none overflow-hidden">
      {/* 3D Scene View */}
      <CanvasView
        level={level}
        ballPos={renderPos}
        ballVel={renderVel}
        ghostPos={ghostRenderPos}
        tilt={rawTilt}
      />

      {/* Head-Up Display */}
      <HUD
        status={simState.status}
        tick={simState.tick}
        stateHash={simState.hash}
        speed={speedMagnitude}
        personalBest={personalBest}
        showGhost={showGhost}
        onToggleGhost={() => setShowGhost((v) => !v)}
        onRestart={handleRestart}
        isNewPB={isNewPB}
      />

      {/* Touch Joystick on Mobile */}
      <VirtualJoystick onTiltChange={setVirtualTilt} />
    </div>
  );
};
