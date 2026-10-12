import React, { useState } from 'react';
import { FIXED_DT, formatShareCard, SimStatus, TICKS_PER_SECOND } from '@ghostroll/shared';
import { StoredPB } from '../utils/ghostStorage.js';
import { Language, TRANSLATIONS } from '../i18n/translations.js';
import {
  RotateCcw,
  Trophy,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  User as UserIcon,
  Compass,
  ChevronDown,
  Share2,
  Check,
  Smartphone,
  Gamepad2,
  Volume2,
  VolumeX,
  Gauge,
  Flag,
  PenTool,
} from 'lucide-react';

export interface SplitBadgeData {
  sector: number;
  deltaSec?: number;
  currentSec: number;
}

interface HUDProps {
  status: SimStatus;
  tick: number;
  stateHash: string;
  speed: number;
  personalBest: StoredPB | null;
  showGhost: boolean;
  onToggleGhost: () => void;
  onRestart: () => void;
  isNewPB: boolean;
  userDisplayName?: string;
  userAvatarUrl?: string;
  isGoogleLinked?: boolean;
  onOpenLeaderboard: () => void;
  onOpenProfile: () => void;
  submitStatus?: 'idle' | 'submitting' | 'verified' | 'rejected';
  submitMessage?: string;
  activeGhostName?: string;
  levelName: string;
  levelId: string;
  dateStr?: string;
  onOpenTrackSelector: () => void;
  leaderboardRank?: number;
  lang: Language;
  gyroSupported?: boolean;
  gyroActive?: boolean;
  onToggleGyro?: () => void;
  onCalibrateGyro?: () => void;
  isCalibrated?: boolean;
  isMuted?: boolean;
  onToggleMute?: () => void;
  onOpenEditor?: () => void;
  isTestDrive?: boolean;
  onBackToEditor?: () => void;
  splitBadge?: SplitBadgeData | null;
}

const cleanName = (n: string) => n.replace(/\s*\(Daily[^)]*\)\s*$/, '');

function formatTime(ticks: number): string {
  const totalSeconds = ticks / TICKS_PER_SECOND;
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  const millis = Math.floor((totalSeconds % 1) * 1000);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
}

export const HUD: React.FC<HUDProps> = ({
  status,
  tick,
  stateHash,
  speed,
  personalBest,
  showGhost,
  onToggleGhost,
  onRestart,
  isNewPB,
  userDisplayName,
  userAvatarUrl,
  isGoogleLinked,
  onOpenLeaderboard,
  onOpenProfile,
  submitStatus = 'idle',
  submitMessage,
  activeGhostName,
  levelName,
  levelId: _levelId,
  dateStr,
  onOpenTrackSelector,
  leaderboardRank,
  lang,
  gyroSupported,
  gyroActive,
  onToggleGyro,
  onCalibrateGyro,
  isCalibrated: _isCalibrated,
  isMuted = false,
  onToggleMute,
  onOpenEditor,
  isTestDrive,
  onBackToEditor,
  splitBadge,
}) => {
  const t = TRANSLATIONS[lang];
  const [copiedShare, setCopiedShare] = useState(false);

  const speedKmh = Math.round(speed * 3.6);

  const handleShare = () => {
    const shareText = formatShareCard({
      levelName,
      date: dateStr || new Date().toISOString().slice(0, 10),
      ticks: tick,
      timeSeconds: tick * FIXED_DT,
      rank: leaderboardRank,
      finalHash: stateHash,
      url:
        typeof window !== 'undefined'
          ? `${window.location.origin}${_levelId ? `?seed=${encodeURIComponent(_levelId.replace(/^(daily-|seed-|custom-|random-)/, ''))}` : ''}`
          : '',
    });

    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText).then(() => {
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2500);
      });
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-6 select-none overflow-hidden">
      {/* =========================================================================
          TOP NAVIGATION BAR
         ========================================================================= */}
      <header className="flex items-start justify-between w-full pointer-events-auto gap-3">
        {/* Left: Clean Brandmark + Track Quick-Pill */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="glass-panel rounded-2xl px-3.5 py-2 flex items-center space-x-2.5">
            <h1 className="text-sm sm:text-base font-extrabold tracking-widest text-white flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shadow-sm" />
              <span>GHOSTROLL</span>
            </h1>

            <span className="text-white/15 hidden sm:inline">|</span>

            {/* Course Selector Pill */}
            <button
              onClick={onOpenTrackSelector}
              className="hidden sm:flex items-center space-x-1.5 text-xs text-zinc-300 hover:text-white font-medium transition cursor-pointer group"
              title={t.courseSelector}
            >
              <span className="text-zinc-400 font-normal">{t.track}:</span>
              <span className="font-semibold text-zinc-100 group-hover:text-white transition">
                {cleanName(levelName)}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-y-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* Right: Unified Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* User Profile */}
          <button
            onClick={onOpenProfile}
            className="glass-pill px-3 py-2 rounded-xl flex items-center space-x-2 text-xs font-semibold text-zinc-200 hover:text-white transition cursor-pointer"
            title={t.profile}
          >
            {userAvatarUrl ? (
              <img
                src={userAvatarUrl}
                alt={userDisplayName || 'Player'}
                className="w-4 h-4 rounded-full ring-1 ring-white/30"
              />
            ) : (
              <UserIcon className="w-3.5 h-3.5 text-zinc-300" />
            )}
            <span className="hidden sm:inline truncate max-w-[120px]">
              {userDisplayName || t.profile}
            </span>
            {isGoogleLinked && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Google account linked" />
            )}
          </button>

          {/* Courses Browser */}
          <button
            onClick={onOpenTrackSelector}
            className="glass-pill px-3 py-2 rounded-xl flex items-center space-x-1.5 text-xs font-semibold text-zinc-200 hover:text-white transition cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">{t.courses}</span>
          </button>

          {/* Leaderboard */}
          <button
            onClick={onOpenLeaderboard}
            className="glass-pill px-3 py-2 rounded-xl flex items-center space-x-1.5 text-xs font-semibold text-zinc-200 hover:text-white transition cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">{t.leaderboard}</span>
          </button>

          {/* Track Editor Button */}
          {onOpenEditor && (
            <button
              onClick={onOpenEditor}
              className="glass-pill px-3 py-2 rounded-xl flex items-center space-x-1.5 text-xs font-semibold text-cyan-300 hover:text-white hover:bg-cyan-500/10 transition cursor-pointer border border-cyan-500/30 shadow-sm shadow-cyan-500/10"
              title={t.trackEditor}
            >
              <PenTool className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">{t.trackEditor}</span>
            </button>
          )}

          {/* Audio Mute/Unmute */}
          {onToggleMute && (
            <button
              onClick={onToggleMute}
              className="glass-pill p-2 rounded-xl text-zinc-300 hover:text-white transition cursor-pointer"
              title={isMuted ? 'Activer le son' : 'Couper le son'}
              aria-label="Toggle mute"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-zinc-300" />
              )}
            </button>
          )}

          {/* Quick Restart */}
          <button
            onClick={onRestart}
            className="glass-pill p-2 rounded-xl text-zinc-300 hover:text-white transition cursor-pointer"
            title={`${t.resetRun} (R)`}
            aria-label="Restart"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Floating Test Drive Banner */}
      {isTestDrive && (
        <div className="absolute top-16 sm:top-20 left-1/2 -translate-x-1/2 z-40 glass-panel-elevated px-4 py-2 rounded-2xl flex items-center space-x-3 border border-emerald-400/50 shadow-2xl pointer-events-auto animate-in fade-in">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs sm:text-sm font-bold text-white tracking-tight">
            {t.testModeBanner}
          </span>
          {onBackToEditor && (
            <button
              onClick={onBackToEditor}
              className="px-3 py-1 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-white font-bold text-xs transition active:scale-95 flex items-center space-x-1 shadow-md cursor-pointer"
            >
              <span>{t.backToEditor}</span>
              <span className="font-mono text-[10px] opacity-75">[Échap]</span>
            </button>
          )}
        </div>
      )}

      {/* =========================================================================
          TOP CENTER: Precision Digital Stopwatch & Telemetry
         ========================================================================= */}
      <div className="absolute left-1/2 -translate-x-1/2 top-20 lg:top-5 flex flex-col items-center pointer-events-auto z-10">
        <div className="glass-panel rounded-2xl px-6 py-2.5 flex flex-col items-center shadow-xl border border-white/10">
          {/* Label: Chrono / Time */}
          <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 mb-0.5">
            {t.time}
          </div>

          {/* Large Clean Stopwatch */}
          <div
            className={`font-mono text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums transition-colors duration-150 ${
              isNewPB ? 'text-emerald-400' : 'text-white'
            }`}
          >
            {formatTime(tick)}
          </div>

          {/* Sleek Sub-Telemetry Bar */}
          <div className="flex items-center space-x-3 mt-1 text-xs font-mono text-zinc-400 whitespace-nowrap">
            {/* Live Speed */}
            <span className="flex items-center space-x-1 text-zinc-300">
              <Gauge className="w-3 h-3 text-zinc-400" />
              <span className="tabular-nums font-semibold">{speedKmh}</span>
              <span className="text-[10px] text-zinc-400">{t.kmh}</span>
            </span>

            <span className="text-zinc-600">•</span>

            {/* PB Comparison */}
            <div className="flex items-center space-x-1 text-zinc-300">
              <span className="text-[10px] text-zinc-400 font-semibold uppercase">PB:</span>
              <span className="tabular-nums font-semibold text-zinc-200">
                {personalBest ? formatTime(personalBest.ticks) : t.noRecordYet}
              </span>
              <button
                onClick={onToggleGhost}
                className="ml-1 text-zinc-500 hover:text-zinc-200 cursor-pointer p-0.5 transition"
                title={showGhost ? 'Masquer le fantôme' : 'Afficher le fantôme'}
                aria-label="Toggle ghost"
              >
                {showGhost ? (
                  <Eye className="w-3 h-3 text-purple-400" />
                ) : (
                  <EyeOff className="w-3 h-3 text-zinc-600" />
                )}
              </button>
            </div>

            {activeGhostName && showGhost && (
              <>
                <span className="text-zinc-600">•</span>
                <span className="flex items-center space-x-1 text-cyan-300 font-sans text-[11px] font-medium" title={activeGhostName}>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                  <span className="truncate max-w-[120px]">{activeGhostName}</span>
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sector Split Time Notification Badge (Trackmania style) */}
      {splitBadge && (
        <div
          key={`split-${splitBadge.sector}-${splitBadge.currentSec}`}
          className={`absolute left-1/2 -translate-x-1/2 top-44 lg:top-28 z-30 pointer-events-none flex flex-col items-center px-4 py-2 rounded-2xl backdrop-blur-md shadow-2xl border transition-all duration-300 animate-in zoom-in-90 fade-in ${
            splitBadge.deltaSec !== undefined
              ? splitBadge.deltaSec <= 0
                ? 'bg-emerald-950/85 border-emerald-400/60 shadow-emerald-500/25 text-emerald-300'
                : 'bg-rose-950/85 border-rose-400/60 shadow-rose-500/25 text-rose-300'
              : 'bg-zinc-900/85 border-cyan-400/60 shadow-cyan-500/25 text-cyan-300'
          }`}
        >
          <div className="text-[10px] uppercase font-mono font-bold tracking-widest opacity-90 mb-0.5">
            {splitBadge.sector === 1
              ? t.sector1
              : splitBadge.sector === 2
              ? t.sector2
              : `${lang === 'fr' ? 'SECTEUR' : 'SECTOR'} ${splitBadge.sector}`}
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-black tabular-nums tracking-tight flex items-center space-x-1">
            {splitBadge.deltaSec !== undefined ? (
              <>
                <span>{splitBadge.deltaSec <= 0 ? '-' : '+'}</span>
                <span>{Math.abs(splitBadge.deltaSec).toFixed(2)}s</span>
              </>
            ) : (
              <span>{splitBadge.currentSec.toFixed(2)}s</span>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          PRE-RUN PROMPT (Centered, Clean, Unobtrusive)
         ========================================================================= */}
      {tick === 0 && status === 'ready' && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-20 md:bottom-12 pointer-events-none animate-in fade-in duration-300 z-10">
          <div className="glass-panel rounded-full px-5 py-2.5 text-xs text-zinc-200 shadow-xl border border-white/10 flex items-center space-x-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium">
              {lang === 'fr'
                ? 'Flèches ou ZQSD pour rouler • Espace pour sauter'
                : 'Arrow keys or WASD to roll • Space to jump'}
            </span>
          </div>
        </div>
      )}

      {/* =========================================================================
          VICTORY MODAL (Clean, Human, High-End Card)
         ========================================================================= */}
      {status === 'won' && (
        <div className="self-center my-auto glass-panel-elevated rounded-3xl p-6 sm:p-8 max-w-md w-full text-center pointer-events-auto shadow-2xl border border-white/15 relative overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <Flag className="w-6 h-6" />
          </div>

          <h2 className="text-2xl font-black text-white mb-1 tracking-tight">
            {isNewPB ? t.newPB : t.goalReached}
          </h2>
          <p className="text-zinc-400 text-xs sm:text-sm mb-4 font-normal">
            {t.courseCompleted}
          </p>

          {/* Time Display Card */}
          <div className="bg-black/40 rounded-2xl p-4 mb-4 border border-white/10">
            <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 mb-0.5">
              {t.finalTime}
            </div>
            <div className="font-mono text-4xl sm:text-5xl font-black tabular-nums text-white my-1">
              {formatTime(tick)}
            </div>
            <div className="text-[11px] font-mono text-zinc-400 mt-1 flex items-center justify-center space-x-2">
              <span>{tick} frames</span>
              <span>•</span>
              <span className="text-zinc-300">60Hz</span>
            </div>
          </div>

          {/* Verification Status Banner */}
          <div className="mb-4 p-3 rounded-xl border text-xs flex items-center justify-center space-x-2 bg-white/[0.03] border-white/10">
            {submitStatus === 'submitting' && (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-zinc-400 border-t-transparent animate-spin" />
                <span className="text-zinc-300 font-medium">{t.validatingServer}</span>
              </>
            )}
            {submitStatus === 'verified' && (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300 font-medium font-mono text-xs">
                  {submitMessage || t.verifiedServer}
                </span>
              </>
            )}
            {submitStatus === 'rejected' && (
              <>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span className="text-rose-300 font-medium font-mono text-xs">
                  {t.rejectedServer}: {submitMessage}
                </span>
              </>
            )}
            {submitStatus === 'idle' && (
              <span className="text-zinc-400 font-medium">Replay enregistré</span>
            )}
          </div>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="w-full mb-3 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 active:scale-[0.98] font-semibold text-white transition flex items-center justify-center space-x-2 border border-white/10 cursor-pointer"
          >
            {copiedShare ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300">{t.cardCopied}</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-zinc-300" />
                <span>{t.shareCard}</span>
              </>
            )}
          </button>

          {/* Action Row */}
          <div className="flex space-x-2.5">
            <button
              onClick={onOpenLeaderboard}
              className="flex-1 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 active:scale-[0.98] font-semibold text-white transition flex items-center justify-center space-x-2 border border-white/10 cursor-pointer text-xs sm:text-sm"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>{t.leaderboard}</span>
            </button>
            <button
              onClick={onRestart}
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] font-bold text-zinc-950 transition flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 cursor-pointer text-xs sm:text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{t.playAgain} (R)</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          OFF-TRACK / DEATH MODAL
         ========================================================================= */}
      {status === 'dead' && (
        <div className="self-center my-auto glass-panel-elevated rounded-3xl p-6 sm:p-7 max-w-xs w-full text-center pointer-events-auto border border-rose-500/25 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-xl">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-white mb-1 tracking-tight">{t.fellOff}</h2>
          <p className="text-zinc-400 text-xs mb-5 font-normal">{t.keepBalance}</p>
          <button
            onClick={onRestart}
            className="w-full py-3 px-5 rounded-xl bg-white hover:bg-zinc-200 active:scale-[0.98] font-bold text-zinc-950 transition flex items-center justify-center space-x-2 cursor-pointer shadow-lg"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t.retry} (R)</span>
          </button>
        </div>
      )}

      {/* =========================================================================
          BOTTOM FOOTNOTE / DESKTOP BAR
         ========================================================================= */}
      <footer className="hidden md:flex items-center justify-between pointer-events-auto w-full">
        <div className="text-[11px] font-mono text-zinc-400">
          <span>{cleanName(levelName)}</span>
          <span className="mx-2 text-zinc-600">•</span>
          <span>60Hz WASM</span>
        </div>

        <button
          onClick={onRestart}
          className="glass-pill px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white transition flex items-center space-x-1.5 cursor-pointer"
          title={`${t.resetRun} (R)`}
        >
          <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
          <span>{t.resetRun}</span>
          <span className="text-zinc-400 text-[10px] font-mono">(R)</span>
        </button>
      </footer>

      {/* Mobile Gyroscope Toggle */}
      {gyroSupported && onToggleGyro && (
        <div className="md:hidden absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center space-x-1.5 pointer-events-auto z-20">
          <button
            onClick={onToggleGyro}
            className={`glass-pill rounded-2xl p-3 transition cursor-pointer active:scale-95 ${
              gyroActive ? 'glass-pill-active text-purple-200' : 'text-zinc-300'
            }`}
            title={gyroActive ? t.gyroMode : t.touchMode}
          >
            {gyroActive ? (
              <Smartphone className="w-5 h-5 text-purple-300" />
            ) : (
              <Gamepad2 className="w-5 h-5 text-zinc-300" />
            )}
          </button>
          {gyroActive && onCalibrateGyro && (
            <button
              onClick={onCalibrateGyro}
              className="glass-pill rounded-2xl p-3 text-emerald-300 transition cursor-pointer active:scale-95"
              title={t.calibrateGyro}
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
