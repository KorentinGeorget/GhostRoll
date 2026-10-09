import React, { useEffect, useState, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  FIXED_DT,
  GhostSample,
  InputFrame,
  LevelDefinition,
  LevelPalette,
  ReplayPayload,
  SimState,
} from '@ghostroll/shared';
import {
  createSimulation,
  generateDailyPalette,
  initPhysics,
  LEVEL_1,
  Simulation,
} from '@ghostroll/sim';
import { CanvasView } from './components/CanvasView.js';
import { HUD } from './components/HUD.js';
import { VirtualJoystick } from './components/VirtualJoystick.js';
import { LeaderboardModal } from './components/LeaderboardModal.js';
import { TrackSelectorModal } from './components/TrackSelectorModal.js';
import { ProfileModal } from './components/ProfileModal.js';
import { useControls } from './hooks/useControls.js';
import { Language, getInitialLanguage } from './i18n/translations.js';
import { soundFX } from './utils/audio.js';

import {
  getStoredPB,
  saveStoredPB,
  sampleGhostPosition,
  StoredPB,
} from './utils/ghostStorage.js';
import {
  fetchMe,
  fetchLeaderboard,
  fetchDailyLevel,
  fetchArchive,
  fetchLevel,
  submitRun,
  UserProfile,
  LeaderboardEntry,
  ArchiveItem,
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
  const [level, setLevel] = useState<LevelDefinition>(LEVEL_1);
  const [palette, setPalette] = useState<LevelPalette>(() => generateDailyPalette('trial01'));

  // Language state (i18n)
  const [lang, setLang] = useState<Language>(getInitialLanguage());
  const [isMuted, setIsMuted] = useState(soundFX.muted);

  const handleLanguageChange = (newLang: Language) => {
    setLang(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('gr_lang', newLang);
    }
  };

  const handleToggleMute = () => {
    setIsMuted(soundFX.toggleMute());
  };


  // Daily info and Archive state
  const [dailyInfo, setDailyInfo] = useState<{ levelId: string; name: string; date: string } | null>(null);
  const [archive, setArchive] = useState<ArchiveItem[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [isTrackSelectorOpen, setIsTrackSelectorOpen] = useState(false);

  // User profile & Server sync state
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

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

  // Controls hook (keyboard, touch joystick & mobile gyroscope)
  const {
    getInput,
    setVirtualTilt,
    triggerJump,
    resetTilt,
    rawTilt,
    gyroSupported,
    gyroActive,
    isCalibrated,
    enableGyro,
    disableGyro,
    calibrateGyro,
  } = useControls();

  const handleToggleGyro = async () => {
    if (gyroActive) {
      disableGyro();
    } else {
      await enableGyro();
    }
  };

  // References for the loop
  const simRef = useRef<Simulation | null>(null);
  const recordedInputs = useRef<InputFrame[]>([]);
  const recordedSamples = useRef<GhostSample[]>([]);
  const hasWonRef = useRef(false);
  const hasDiedRef = useRef(false);

  // Restart function
  const handleRestart = useCallback(() => {
    if (!simRef.current) return;
    simRef.current.reset();
    resetTilt();
    recordedInputs.current = [];
    recordedSamples.current = [];
    hasWonRef.current = false;
    hasDiedRef.current = false;
    setIsNewPB(false);
    setSubmitStatus('idle');
    setSubmitMessage('');
    const initial = simRef.current.getState();
    setSimState(initial);
    setRenderPos(initial.ball.position);
    setRenderVel(initial.ball.velocity);
    setGhostRenderPos(null);
  }, [resetTilt]);


  // Track selection handler
  const handleSelectTrack = useCallback(async (trackId: string) => {
    if (trackId === level.id) return;
    if (trackId === LEVEL_1.id || trackId === 'trial-level-1') {
      setLevel(LEVEL_1);
      setPalette(generateDailyPalette('trial01'));
      return;
    }
    const data = await fetchLevel(trackId);
    if (data) {
      setLevel(data.level);
      setPalette(data.palette);
    }
  }, [level.id]);

  // Load User & Leaderboard from Backend
  const refreshLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    const data = await fetchLeaderboard(level.id);
    if (data) {
      setLeaderboard(data.leaderboard);
      // Auto-target world record ghost if player has no local PB
      if (data.leaderboard.length > 0 && data.leaderboard[0].ghostSamples) {
        if (!getStoredPB(level.id)) {
          setSelectedLeaderboardGhost(data.leaderboard[0]);
          setActiveGhostSource('leaderboard');
        }
      }
    }
    setLeaderboardLoading(false);
  }, [level.id]);

  // Initial user fetch & daily/archive loading
  useEffect(() => {
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    if (urlParams?.get('auth') === 'success') {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    fetchMe().then((profile) => {
      if (profile) setUserProfile(profile);
    });

    const requestedTrack = urlParams?.get('track') || urlParams?.get('level');

    setArchiveLoading(true);
    Promise.all([fetchDailyLevel(), fetchArchive()]).then(([dailyData, archiveData]) => {
      if (archiveData) {
        setArchive(archiveData.archive);
      }
      if (dailyData) {
        setDailyInfo({
          levelId: dailyData.level.id,
          name: dailyData.level.name,
          date: dailyData.date,
        });

        // If user didn't explicitly request trial track via URL param, default to today's daily
        if (requestedTrack !== 'trial-level-1' && requestedTrack !== LEVEL_1.id) {
          setLevel(dailyData.level);
          setPalette(dailyData.palette);
        }
      }
      setArchiveLoading(false);
    });
  }, []);

  // Refresh leaderboard whenever level changes
  useEffect(() => {
    refreshLeaderboard();
  }, [refreshLeaderboard]);

  // Initialize Physics & Load Local PB whenever level changes
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
      handleRestart();
    });

    const pb = getStoredPB(level.id);
    setPersonalBest(pb);
    setSelectedLeaderboardGhost(null);
    setActiveGhostSource('pb');

    return () => {
      mounted = false;
      simRef.current?.destroy();
    };
  }, [level, handleRestart]);

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

          if (input.jump) {
            soundFX.playJump();
          }

          const newState = sim.step(input);

          // Only record active frames (eliminates idle jitter before start)
          if (newState.status === 'playing' || newState.status === 'won') {
            recordedInputs.current.push(input);
          }

          state = newState;

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
            soundFX.playVictory();
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
          } else if (state.status === 'dead' && !hasDiedRef.current) {
            hasDiedRef.current = true;
            soundFX.playFall();
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

  const userRank = leaderboard.find((e) => e.displayName === userProfile?.displayName)?.rank;

  return (
    <div className="relative w-full h-full select-none overflow-hidden">
      {/* 3D Scene View */}
      <CanvasView
        level={level}
        palette={palette}
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
        userAvatarUrl={userProfile?.avatarUrl}
        isGoogleLinked={userProfile?.isGoogleLinked}
        onOpenLeaderboard={() => {
          refreshLeaderboard();
          setIsLeaderboardOpen(true);
        }}
        onOpenProfile={() => setIsProfileOpen(true)}
        submitStatus={submitStatus}
        submitMessage={submitMessage}
        activeGhostName={activeGhostName}
        levelName={level.name}
        levelId={level.id}
        dateStr={level.id.startsWith('daily-') ? level.id.replace('daily-', '') : dailyInfo?.date}
        onOpenTrackSelector={() => setIsTrackSelectorOpen(true)}
        leaderboardRank={userRank}
        lang={lang}
        gyroSupported={gyroSupported}
        gyroActive={gyroActive}
        onToggleGyro={handleToggleGyro}
        onCalibrateGyro={calibrateGyro}
        isCalibrated={isCalibrated}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />


      {/* Leaderboard Modal */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        entries={leaderboard}
        loading={leaderboardLoading}
        selectedGhostRunId={selectedLeaderboardGhost?.runId}
        lang={lang}
        onSelectGhost={(entry) => {
          setSelectedLeaderboardGhost(entry);
          setActiveGhostSource('leaderboard');
          setIsLeaderboardOpen(false);
          handleRestart();
        }}
      />

      {/* Track / Course Selector Modal */}
      <TrackSelectorModal
        isOpen={isTrackSelectorOpen}
        onClose={() => setIsTrackSelectorOpen(false)}
        currentLevelId={level.id}
        dailyLevelId={dailyInfo?.levelId}
        dailyName={dailyInfo?.name}
        dailyDate={dailyInfo?.date}
        archive={archive}
        loading={archiveLoading}
        onSelectLevel={handleSelectTrack}
        lang={lang}
      />

      {/* Player Profile & Cross-Device Sync Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        userProfile={userProfile}
        onProfileUpdated={(updated) => setUserProfile(updated)}
        lang={lang}
        onLanguageChange={handleLanguageChange}
      />

      {/* Touch Joystick on Mobile (only if Gyro is not active) */}
      {!gyroActive && <VirtualJoystick onTiltChange={setVirtualTilt} />}

      {/* Floating Jump Button for Mobile */}
      <button
        onClick={triggerJump}
        className="md:hidden absolute bottom-6 right-6 z-20 w-18 h-18 rounded-3xl glass-panel-elevated flex flex-col items-center justify-center pointer-events-auto active:scale-90 transition-transform bg-gradient-to-br from-cyan-500/25 to-indigo-600/30 border border-cyan-400/50 text-cyan-200 shadow-2xl shadow-cyan-500/20 select-none touch-none ring-2 ring-cyan-400/20 cursor-pointer"
        aria-label="Jump"
      >
        <span className="text-xl leading-none font-black drop-shadow-[0_0_6px_rgba(56,189,248,0.7)]">▲</span>
        <span className="text-[10px] font-black uppercase tracking-widest mt-1">
          {lang === 'fr' ? 'SAUT' : 'JUMP'}
        </span>
      </button>
    </div>
  );
};
