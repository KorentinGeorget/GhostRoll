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
  generateDailyLevel,
  generateDailyPalette,
  initPhysics,
  LEVEL_1,
  Simulation,
  buildCustomLevel,
  decodeCustomTrack,
  encodeTrackPieces,
  TRACK_PRESETS,
  TrackPieceType,
} from '@ghostroll/sim';
import { CanvasView } from './components/CanvasView.js';
import { HUD, SplitBadgeData } from './components/HUD.js';
import { TrackEditorUI } from './components/TrackEditorUI.js';
import { VirtualJoystick } from './components/VirtualJoystick.js';
import { LeaderboardModal } from './components/LeaderboardModal.js';
import { TrackSelectorModal } from './components/TrackSelectorModal.js';
import { ProfileModal } from './components/ProfileModal.js';
import { useControls } from './hooks/useControls.js';
import { Language, TRANSLATIONS, getInitialLanguage } from './i18n/translations.js';
import { soundFX } from './utils/audio.js';
import { LiveRenderState } from './types/render.js';

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
  publishCustomTrack,
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

  // Track Editor state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isTestDrive, setIsTestDrive] = useState(false);
  const [customPieces, setCustomPieces] = useState<TrackPieceType[]>(
    () => TRACK_PRESETS[0].pieces
  );
  const [customTrackName, setCustomTrackName] = useState('Mon Grand Prix');
  const [customTrackTheme, setCustomTrackTheme] = useState('cyberpunk');
  const [isCustomVerified, setIsCustomVerified] = useState(false);
  const [clearCheckSeconds, setClearCheckSeconds] = useState<number | undefined>(undefined);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedTrackId, setPublishedTrackId] = useState<string | null>(null);
  const testDriveReplay = useRef<{
    claimedTicks: number;
    finalHash: string;
    inputs: Array<{ tiltX: number; tiltZ: number; jump?: boolean }>;
  } | null>(null);

  // Sector split timing telemetry
  const [splitBadge, setSplitBadge] = useState<SplitBadgeData | null>(null);
  const lastCheckpointRef = useRef(0);
  const splitBadgeTimerRef = useRef<any>(null);

  const customCompiled = React.useMemo(() => {
    return buildCustomLevel(customPieces, {
      name: customTrackName,
      theme: customTrackTheme,
    });
  }, [customPieces, customTrackName, customTrackTheme]);

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

  // References for Trackmania pad effects
  const lastBoostRef = useRef(false);
  const lastJumpPadRef = useRef(false);

  // Live decoupled rendering ref with sub-frame alpha interpolation
  const liveRenderRef = useRef<LiveRenderState>({
    prevPos: level.spawn,
    currPos: level.spawn,
    velocity: [0, 0, 0],
    alpha: 0,
    ghostPos: null,
  });

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
    lastBoostRef.current = false;
    lastJumpPadRef.current = false;
    soundFX.updateRolling(0, false);
    lastCheckpointRef.current = 0;
    if (splitBadgeTimerRef.current) clearTimeout(splitBadgeTimerRef.current);
    setSplitBadge(null);
    const initial = simRef.current.getState();
    liveRenderRef.current.prevPos = initial.ball.position;
    liveRenderRef.current.currPos = initial.ball.position;
    liveRenderRef.current.velocity = initial.ball.velocity;
    liveRenderRef.current.alpha = 0;
    liveRenderRef.current.ghostPos = null;
    setSimState(initial);
  }, [resetTilt]);


  // Track selection handler
  const handleSelectTrack = useCallback(async (trackId: string) => {
    if (!trackId) return;

    // Keep browser URL search in sync with current track immediately
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('track', trackId);
      url.searchParams.delete('seed');
      url.searchParams.delete('level');
      window.history.replaceState({}, '', url.toString());
    }

    let nextLevel: LevelDefinition | null = null;
    let nextPalette: LevelPalette | null = null;

    if (trackId === LEVEL_1.id || trackId === 'trial-level-1') {
      nextLevel = LEVEL_1;
      nextPalette = generateDailyPalette('trial01');
    } else if (trackId.startsWith('custom:')) {
      const decoded = decodeCustomTrack(trackId.slice(7));
      setCustomTrackName(decoded.name);
      setCustomTrackTheme(decoded.theme);
      setCustomPieces(decoded.pieces);
      const built = buildCustomLevel(decoded.pieces, {
        id: trackId,
        name: decoded.name,
        theme: decoded.theme,
      });
      nextLevel = built.level;
      nextPalette = built.palette;
    } else {
      const data = await fetchLevel(trackId);
      if (data) {
        nextLevel = data.level;
        nextPalette = data.palette;
      } else {
        // Local client-side generation fallback for custom seeds
        const seed = trackId.replace(/^(daily-|seed-|custom-|random-)/, '');
        const localGenerated = generateDailyLevel(seed);
        nextLevel = localGenerated.level;
        nextPalette = localGenerated.palette;
      }
    }

    if (nextLevel && nextPalette) {
      setLevel(nextLevel);
      setPalette(nextPalette);
    }
  }, []);

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

  // Initial user fetch & daily/archive loading (mount only)
  useEffect(() => {
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    if (urlParams?.get('auth') === 'success') {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    fetchMe().then((profile) => {
      if (profile) setUserProfile(profile);
    });

    const requestedSeed = urlParams?.get('seed');
    const customParam =
      urlParams?.get('custom') ||
      (urlParams?.get('track')?.startsWith('custom:')
        ? urlParams.get('track')!.slice(7)
        : null);
    const requestedTrack =
      urlParams?.get('track') ||
      urlParams?.get('level') ||
      (requestedSeed ? `seed-${requestedSeed}` : null);

    if (customParam) {
      const decoded = decodeCustomTrack(customParam);
      setCustomTrackName(decoded.name);
      setCustomTrackTheme(decoded.theme);
      setCustomPieces(decoded.pieces);
      const customBuilt = buildCustomLevel(decoded.pieces, {
        name: decoded.name,
        theme: decoded.theme,
      });
      setLevel(customBuilt.level);
      setPalette(customBuilt.palette);
    }

    if (urlParams?.get('editor') === '1' || urlParams?.get('editor') === 'true') {
      setIsEditorOpen(true);
    }

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

        if (!customParam) {
          if (requestedTrack) {
            handleSelectTrack(requestedTrack);
          } else {
            setLevel(dailyData.level);
            setPalette(dailyData.palette);
          }
        }
      }
      setArchiveLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const oldSim = simRef.current;
      simRef.current = null;
      oldSim?.destroy();

      const sim = createSimulation(level);
      simRef.current = sim;
      const initial = sim.getState();
      liveRenderRef.current.prevPos = initial.ball.position;
      liveRenderRef.current.currPos = initial.ball.position;
      liveRenderRef.current.velocity = initial.ball.velocity;
      liveRenderRef.current.alpha = 0;
      liveRenderRef.current.ghostPos = null;
      setSimState(initial);
      setPhysicsReady(true);
      handleRestart();
    });

    const pb = getStoredPB(level.id);
    setPersonalBest(pb);
    if (pb) {
      setActiveGhostSource('pb');
      setSelectedLeaderboardGhost(null);
    } else {
      setActiveGhostSource('leaderboard');
    }

    return () => {
      mounted = false;
      const oldSim = simRef.current;
      simRef.current = null;
      oldSim?.destroy();
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

  const handleStartTestDrive = useCallback(() => {
    setLevel(customCompiled.level);
    setPalette(customCompiled.palette);
    setIsTestDrive(true);
    setTimeout(() => {
      handleRestart();
    }, 15);
  }, [customCompiled, handleRestart]);

  const handleBackToEditor = useCallback(() => {
    setIsTestDrive(false);
  }, []);

  const handlePublishTrack = useCallback(async () => {
    if (!isCustomVerified || !testDriveReplay.current || isPublishing) return;
    setIsPublishing(true);
    try {
      const pieceCode = encodeTrackPieces(customPieces);
      const res = await publishCustomTrack({
        name: customTrackName,
        theme: customTrackTheme,
        pieceCode,
        replay: {
          simVersion: 1,
          claimedTicks: testDriveReplay.current.claimedTicks,
          finalHash: testDriveReplay.current.finalHash,
          inputs: testDriveReplay.current.inputs,
        },
      });
      if (res.success && res.track) {
        setPublishedTrackId(res.track.id);
        alert(TRANSLATIONS[lang].publishedSuccess);
      } else {
        const errorDetail = (res as any).reason ? ` : ${(res as any).reason}` : '';
        alert(((res as any).message || res.error || 'Erreur lors de la publication du circuit') + errorDetail);
      }
    } catch (err: any) {
      alert(err?.message || 'Erreur de connexion');
    } finally {
      setIsPublishing(false);
    }
  }, [isCustomVerified, isPublishing, customPieces, customTrackName, customTrackTheme, lang]);

  // Keyboard shortcut 'Escape' to exit test drive back to editor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isTestDrive) {
        setIsTestDrive(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTestDrive]);

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
          // Store previous position before tick step for sub-frame interpolation
          liveRenderRef.current.prevPos = [
            state.ball.position[0],
            state.ball.position[1],
            state.ball.position[2],
          ];

          const input = getInput();

          if (input.jump) {
            soundFX.playJump();
          }

          const newState = sim.step(input);

          // Only record active frames (eliminates idle jitter before start)
          if (newState.status === 'playing' || newState.status === 'won') {
            recordedInputs.current.push({
              tiltX: input.tiltX,
              tiltZ: input.tiltZ,
              ...(input.jump ? { jump: true } : {}),
            });
          }

          state = newState;

          // Trackmania Pad active effects (Boost & Super-Jump)
          if (newState.activeEffects?.boost && !lastBoostRef.current) {
            soundFX.playBoost();
          }
          lastBoostRef.current = !!newState.activeEffects?.boost;

          if (newState.activeEffects?.jump && !lastJumpPadRef.current) {
            soundFX.playJumpPad();
          }
          lastJumpPadRef.current = !!newState.activeEffects?.jump;

          // Sector split timing and audio feedback
          if (newState.lastCheckpoint && newState.lastCheckpoint > lastCheckpointRef.current) {
            const cpIndex = newState.lastCheckpoint;
            lastCheckpointRef.current = cpIndex;

            const currentSec = newState.tick * FIXED_DT;
            let deltaSec: number | undefined = undefined;

            let activeSamples: GhostSample[] | null = null;
            if (activeGhostSource === 'leaderboard' && selectedLeaderboardGhost?.ghostSamples?.length) {
              activeSamples = selectedLeaderboardGhost.ghostSamples;
            } else if (personalBest?.samples?.length) {
              activeSamples = personalBest.samples;
            } else if (selectedLeaderboardGhost?.ghostSamples?.length) {
              activeSamples = selectedLeaderboardGhost.ghostSamples;
            }

            const currentActiveLevel = isEditorOpen ? customCompiled.level : level;
            const cpDef = currentActiveLevel.checkpoints?.find((c) => c.index === cpIndex);
            if (activeSamples && activeSamples.length > 0 && cpDef) {
              let minDistSq = Infinity;
              let ghostTickAtCp: number | null = null;
              for (const sample of activeSamples) {
                const [gTick, gx, gy, gz] = sample;
                const dx = gx - cpDef.position[0];
                const dy = gy - cpDef.position[1];
                const dz = gz - cpDef.position[2];
                const distSq = dx * dx + dz * dz;
                if (distSq < minDistSq) {
                  minDistSq = distSq;
                  ghostTickAtCp = gTick;
                }
              }

              if (ghostTickAtCp !== null && minDistSq <= (cpDef.radius * 2) ** 2) {
                const ghostSec = ghostTickAtCp * FIXED_DT;
                deltaSec = currentSec - ghostSec;
              }
            }

            const isAhead = deltaSec !== undefined ? deltaSec <= 0 : true;
            soundFX.playCheckpoint(isAhead);

            setSplitBadge({
              sector: cpIndex,
              deltaSec,
              currentSec,
            });

            if (splitBadgeTimerRef.current) clearTimeout(splitBadgeTimerRef.current);
            splitBadgeTimerRef.current = setTimeout(() => {
              setSplitBadge(null);
            }, 3000);
          }

          // Update current position and velocity after tick step
          liveRenderRef.current.currPos = [
            state.ball.position[0],
            state.ball.position[1],
            state.ball.position[2],
          ];
          liveRenderRef.current.velocity = [
            state.ball.velocity[0],
            state.ball.velocity[1],
            state.ball.velocity[2],
          ];

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

            if (isTestDrive) {
              testDriveReplay.current = {
                claimedTicks: state.tick,
                finalHash: state.hash,
                inputs: [...recordedInputs.current],
              };
              setIsCustomVerified(true);
              setClearCheckSeconds(state.tick * FIXED_DT);
              setSubmitStatus('verified');
              setSubmitMessage(
                lang === 'fr'
                  ? 'Tracé validé pour publication !'
                  : 'Track verified for publication!'
              );
              return;
            }

            const activeLevel = isEditorOpen ? customCompiled.level : level;
            const currentTicks = state.tick;
            const currentPB = getStoredPB(activeLevel.id);

            const isBetter = !currentPB || currentTicks < currentPB.ticks;
            const replayPayload: ReplayPayload & { claimedTicks: number } = {
              magic: 'GRRP',
              formatVersion: 1,
              simVersion: activeLevel.simVersion,
              levelId: activeLevel.id,
              tickCount: currentTicks,
              claimedTicks: currentTicks,
              finalHash: state.hash,
              inputs: [...recordedInputs.current],
            };

            if (isBetter) {
              setIsNewPB(true);
              const newPB: StoredPB = {
                levelId: activeLevel.id,
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

      // Compute sub-tick interpolation alpha in [0, 1]
      const alpha = Math.min(1, Math.max(0, accumulator / FIXED_DT));
      liveRenderRef.current.alpha = alpha;

      // Sub-tick continuous ghost interpolation
      if (showGhost) {
        let activeSamples: GhostSample[] | null = null;
        if (activeGhostSource === 'leaderboard' && selectedLeaderboardGhost?.ghostSamples?.length) {
          activeSamples = selectedLeaderboardGhost.ghostSamples;
        } else if (personalBest?.samples?.length) {
          activeSamples = personalBest.samples;
        } else if (selectedLeaderboardGhost?.ghostSamples?.length) {
          activeSamples = selectedLeaderboardGhost.ghostSamples;
        }

        if (activeSamples && activeSamples.length > 0) {
          liveRenderRef.current.ghostPos = sampleGhostPosition(
            activeSamples,
            state.tick + alpha
          );
        } else {
          liveRenderRef.current.ghostPos = null;
        }
      } else {
        liveRenderRef.current.ghostPos = null;
      }

      // Sync React HUD state
      setSimState(state);

      // Procedural continuous rolling sound synthesis
      const isRollingActive = state.status === 'playing';
      const rollingSpeed = Math.sqrt(
        state.ball.velocity[0] ** 2 +
        state.ball.velocity[1] ** 2 +
        state.ball.velocity[2] ** 2
      );
      soundFX.updateRolling(
        isRollingActive ? rollingSpeed : 0,
        isRollingActive ? (state.isGrounded ?? true) : false
      );

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
    simState.ball.velocity[0] ** 2 +
    simState.ball.velocity[1] ** 2 +
    simState.ball.velocity[2] ** 2
  );

  const activeGhostName =
    activeGhostSource === 'leaderboard' && selectedLeaderboardGhost
      ? `#${selectedLeaderboardGhost.rank} ${selectedLeaderboardGhost.displayName}`
      : 'Personal Best';

  const userRank = leaderboard.find((e) => e.displayName === userProfile?.displayName)?.rank;

  const currentLevel = isEditorOpen ? customCompiled.level : level;
  const currentPalette = isEditorOpen ? customCompiled.palette : palette;
  const isEditingOnly = isEditorOpen && !isTestDrive;

  return (
    <div className="relative w-full h-full select-none overflow-hidden">
      {/* 3D Scene View */}
      <CanvasView
        level={currentLevel}
        palette={currentPalette}
        liveRenderRef={liveRenderRef}
        tilt={rawTilt}
        mode={isEditingOnly ? 'editor' : 'race'}
      />

      {/* Editor Overlay UI (when in editor mode without test drive) */}
      {isEditingOnly ? (
        <TrackEditorUI
          pieces={customPieces}
          trackName={customTrackName}
          theme={customTrackTheme}
          onPiecesChange={(newPieces) => {
            setCustomPieces(newPieces);
            setIsCustomVerified(false);
            setClearCheckSeconds(undefined);
            setPublishedTrackId(null);
            testDriveReplay.current = null;
          }}
          onTrackNameChange={setCustomTrackName}
          onThemeChange={setCustomTrackTheme}
          onTestDrive={handleStartTestDrive}
          onExit={() => setIsEditorOpen(false)}
          lang={lang}
          isVerified={isCustomVerified}
          clearCheckSeconds={clearCheckSeconds}
          onPublish={handlePublishTrack}
          isPublishing={isPublishing}
          publishedTrackId={publishedTrackId}
        />
      ) : (
        /* Head-Up Display (standard race or active test drive) */
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
          levelName={currentLevel.name}
          levelId={currentLevel.id}
          dateStr={currentLevel.id.startsWith('daily-') ? currentLevel.id.replace('daily-', '') : dailyInfo?.date}
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
          onOpenEditor={() => {
            setIsEditorOpen(true);
            setIsTestDrive(false);
          }}
          isTestDrive={isTestDrive}
          onBackToEditor={handleBackToEditor}
          splitBadge={splitBadge}
        />
      )}

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
        onOpenEditor={() => {
          setIsEditorOpen(true);
          setIsTestDrive(false);
        }}
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

      {/* Touch Joystick on Mobile (during race or test drive) */}
      {!isEditingOnly && !gyroActive && <VirtualJoystick onTiltChange={setVirtualTilt} />}

      {/* Floating Jump Button for Mobile (during race or test drive) */}
      {!isEditingOnly && (
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            triggerJump();
          }}
          onClick={triggerJump}
          className="md:hidden absolute bottom-6 right-6 z-20 w-18 h-18 rounded-3xl glass-panel-elevated flex flex-col items-center justify-center pointer-events-auto active:scale-90 transition-transform bg-gradient-to-br from-cyan-500/25 to-indigo-600/30 border border-cyan-400/50 text-cyan-200 shadow-2xl shadow-cyan-500/20 select-none touch-none ring-2 ring-cyan-400/20 cursor-pointer"
          aria-label="Jump"
        >
          <span className="text-xl leading-none font-black drop-shadow-[0_0_6px_rgba(56,189,248,0.7)]">▲</span>
          <span className="text-[10px] font-black uppercase tracking-widest mt-1">
            {lang === 'fr' ? 'SAUT' : 'JUMP'}
          </span>
        </button>
      )}
    </div>
  );
};
