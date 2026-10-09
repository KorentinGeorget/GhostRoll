import React, { useEffect, useState, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  FIXED_DT,
  GhostSample,
  InputFrame,
  LevelDefinition,
  ReplayPayload,
  SimState,
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
import { LeaderboardModal } from './components/LeaderboardModal.js';
import { useControls } from './hooks/useControls.js';
import {
  getStoredPB,
  saveStoredPB,
  sampleGhostPosition,
  StoredPB,
} from './utils/ghostStorage.js';
import {
  fetchMe,
  fetchLeaderboard,
  submitRun,
  UserProfile,
  LeaderboardEntry,
} from './api/client.js';

if (typeof window !== 'undefined') {
  (window as any).__GHOSTROLL_SIM__ = {
    initPhysics,
    createSimulation,
    LEVEL_1,
  };
}

export const App: React.FC = () => {
  const [physicsReady, setPhysicsReady] = useState(false);
  const [level] = useState<LevelDefinition>(LEVEL_1);

  // User profile & Server sync state
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [activeGhostSource, setActiveGhostSource] = useState<'pb' | 'leaderboard'>('pb');
  const [selectedLeaderboardGhost, setSelectedLeaderboardGhost] = useState<LeaderboardEntry | null>(null);

  // Run submission status
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'verified' | 'rejected'>('idle');
  const [submitMessage, setSubmitMessage] = useState<string>('');

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

  // Load User & Leaderboard from Backend
  const refreshLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    const data = await fetchLeaderboard(level.id);
    if (data) {
      setLeaderboard(data.leaderboard);
      // If we don't have a PB yet but there's a World Record ghost, auto-target it!
      if (data.leaderboard.length > 0 && data.leaderboard[0].ghostSamples) {
        if (!getStoredPB(level.id)) {
          setSelectedLeaderboardGhost(data.leaderboard[0]);
          setActiveGhostSource('leaderboard');
        }
      }
    }
    setLeaderboardLoading(false);
  }, [level.id]);

  useEffect(() => {
    fetchMe().then((profile) => {
      if (profile) setUserProfile(profile);
    });
    refreshLeaderboard();
  }, [refreshLeaderboard]);

  // Initialize Physics & Load Local PB
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
    setSubmitStatus('idle');
    setSubmitMessage('');
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
      const deltaSec = Math.min((currentTime - lastTime) / 1000, 0.1);
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

          // Handle Win celebration, PB check, and Server Replay Verification
          if (state.status === 'won' && !hasWonRef.current) {
            hasWonRef.current = true;
            confetti({
              particleCount: 120,
              spread: 80,
              origin: { y: 0.6 },
              colors: ['#38bdf8', '#818cf8', '#34d399', '#f43f5e', '#fbbf24'],
            });

            const currentTicks = state.tick;
            const currentPB = getStoredPB(level.id);

            const isBetter = !currentPB || currentTicks < currentPB.ticks;
            const replayPayload: ReplayPayload = {
              magic: 'GRRP',
              formatVersion: 1,
              simVersion: level.simVersion,
              levelId: level.id,
              tickCount: currentTicks,
              finalHash: state.hash,
              inputs: [...recordedInputs.current],
            };

            if (isBetter) {
              setIsNewPB(true);
              const newPB: StoredPB = {
                levelId: level.id,
                ticks: currentTicks,
                timeSeconds: currentTicks * FIXED_DT,
                date: new Date().toISOString(),
                finalHash: state.hash,
                samples: recordedSamples.current,
                replay: replayPayload,
              };
              saveStoredPB(newPB);
              setPersonalBest(newPB);
            }

            // Submit replay to Fastify backend for server-side verification
            setSubmitStatus('submitting');
            submitRun(replayPayload).then((res) => {
              if (res.success) {
                setSubmitStatus('verified');
                setSubmitMessage(`Verified: ${res.timeSeconds}s (hash ${res.finalHash})`);
                refreshLeaderboard();
              } else {
                setSubmitStatus('rejected');
                setSubmitMessage(res.reason || res.error || 'Server validation rejected run');
              }
            });
          }
        }
        accumulator -= FIXED_DT;
      }

      // Update positions for R3F Canvas
      setRenderPos(state.ball.position);
      setRenderVel(state.ball.velocity);

      // Interpolate Ghost (from either PB or selected Leaderboard runner)
      if (showGhost) {
        let activeSamples: GhostSample[] | null = null;
        if (activeGhostSource === 'leaderboard' && selectedLeaderboardGhost?.ghostSamples) {
          activeSamples = selectedLeaderboardGhost.ghostSamples;
        } else if (personalBest?.samples) {
          activeSamples = personalBest.samples;
        }

        if (activeSamples) {
          const ghostP = sampleGhostPosition(activeSamples, state.tick);
          setGhostRenderPos(ghostP);
        } else {
          setGhostRenderPos(null);
        }
      } else {
        setGhostRenderPos(null);
      }

      // Sync React HUD state
      setSimState(state);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [
    physicsReady,
    getInput,
    level,
    showGhost,
    personalBest,
    activeGhostSource,
    selectedLeaderboardGhost,
    refreshLeaderboard,
  ]);

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

  const activeGhostName =
    activeGhostSource === 'leaderboard' && selectedLeaderboardGhost
      ? `#${selectedLeaderboardGhost.rank} ${selectedLeaderboardGhost.displayName}`
      : 'Personal Best';

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
        userDisplayName={userProfile?.displayName}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        submitStatus={submitStatus}
        submitMessage={submitMessage}
        activeGhostName={activeGhostName}
      />

      {/* Leaderboard Modal */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        entries={leaderboard}
        loading={leaderboardLoading}
        selectedGhostRunId={selectedLeaderboardGhost?.runId}
        onSelectGhost={(entry) => {
          setSelectedLeaderboardGhost(entry);
          setActiveGhostSource('leaderboard');
          setIsLeaderboardOpen(false);
          handleRestart();
        }}
      />

      {/* Touch Joystick on Mobile */}
      <VirtualJoystick onTiltChange={setVirtualTilt} />
    </div>
  );
};
