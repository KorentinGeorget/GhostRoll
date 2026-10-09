import React, { useState } from 'react';
import { FIXED_DT, formatShareCard, SimStatus, TICKS_PER_SECOND } from '@ghostroll/shared';
import { StoredPB } from '../utils/ghostStorage.js';
import { Language, TRANSLATIONS } from '../i18n/translations.js';
import {
  RotateCcw,
  Trophy,
  Eye,
  EyeOff,
  Hash,
  Zap,
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
} from 'lucide-react';

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
}

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
  activeGhostName = 'Personal Best',
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
}) => {
  const t = TRANSLATIONS[lang];
  const [copiedShare, setCopiedShare] = useState(false);

  const speedKmh = speed * 3.6;
  const speedNormalized = Math.min(100, (speedKmh / 80) * 100);

  const handleShare = () => {
    const shareText = formatShareCard({
      levelName,
      date: dateStr || new Date().toISOString().slice(0, 10),
      ticks: tick,
      timeSeconds: tick * FIXED_DT,
      rank: leaderboardRank,
      finalHash: stateHash,
      url: window.location.origin,
    });

    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText).then(() => {
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 3000);
      });
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-6 select-none overflow-hidden">
      {/* =========================================================================
          TOP BAR: Spacious floating capsules (Left: Brand/Course | Right: Actions)
         ========================================================================= */}
      <div className="flex items-start justify-between w-full pointer-events-auto gap-3">
        {/* TOP LEFT: Brand & Course Capsule */}
        <div className="flex items-center space-x-2">
          <div className="glass-panel-elevated rounded-2xl px-4 py-2 flex items-center space-x-3 border border-white/10 shadow-xl">
            <div className="flex items-center space-x-2">
              <h1 className="text-lg md:text-xl font-black tracking-wider bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(56,189,248,0.5)]">
                GHOSTROLL
              </h1>
              <span className="flex items-center space-x-1 text-[9px] uppercase font-black px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>v0.4</span>
              </span>
            </div>

            <span className="text-white/20">|</span>

            {/* Course Selector Dropdown Button */}
            <button
              onClick={onOpenTrackSelector}
              className="flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white font-semibold transition group cursor-pointer"
            >
              <span className="text-slate-400 hidden sm:inline">{t.track}:</span>
              <span className="text-cyan-300 font-bold group-hover:text-cyan-200">{levelName}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:translate-y-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* TOP RIGHT: Player Profile & Quick Navigation Pills */}
        <div className="flex items-center space-x-2">
          {/* User Profile Pill (Google or Guest) */}
          <button
            onClick={onOpenProfile}
            className="glass-panel-elevated rounded-2xl px-3.5 py-2 flex items-center space-x-2 text-xs font-bold text-slate-200 hover:text-white transition shadow-lg cursor-pointer border border-white/10 active:scale-95"
          >
            {userAvatarUrl ? (
              <img
                src={userAvatarUrl}
                alt={userDisplayName || 'Player'}
                className="w-5 h-5 rounded-full ring-2 ring-emerald-400/60 shadow"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-indigo-500/25 border border-indigo-400/40 flex items-center justify-center text-cyan-300">
                <UserIcon className="w-3 h-3" />
              </div>
            )}
            <span className="truncate max-w-[110px] md:max-w-[150px]">
              {userDisplayName || t.profile}
            </span>
            {isGoogleLinked && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" title="Google Account Connected" />
            )}
          </button>

          {/* Courses Browser */}
          <button
            onClick={onOpenTrackSelector}
            className="glass-panel rounded-2xl px-3 py-2 flex items-center space-x-1.5 text-xs font-bold text-sky-300 hover:text-sky-200 transition shadow-md cursor-pointer border border-white/10 active:scale-95"
            title={t.courses}
          >
            <Compass className="w-4 h-4 text-sky-400" />
            <span className="hidden sm:inline">{t.courses}</span>
          </button>

          {/* Leaderboard Button */}
          <button
            onClick={onOpenLeaderboard}
            className="glass-panel rounded-2xl px-3 py-2 flex items-center space-x-1.5 text-xs font-bold text-amber-300 hover:text-amber-200 transition shadow-md cursor-pointer border border-white/10 active:scale-95"
            title={t.leaderboard}
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">{t.leaderboard}</span>
          </button>

          {/* Sound Toggle */}
          {onToggleMute && (
            <button
              onClick={onToggleMute}
              className="glass-panel rounded-2xl p-2 text-slate-300 hover:text-white transition shadow-md cursor-pointer border border-white/10 active:scale-95"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-indigo-400" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          TOP CENTER: Pure Athletic Chrono & Dynamic Telemetry Halo
         ========================================================================= */}
      <div className="self-center flex flex-col items-center mt-2 pointer-events-auto">
        <div className="glass-panel-elevated rounded-3xl px-8 py-3.5 flex flex-col items-center border border-white/10 shadow-2xl relative overflow-hidden backdrop-blur-2xl">
          {/* Subtle Ambient Accent Beam */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />

          {/* Label: Chrono / Time */}
          <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-0.5">
            {t.time}
          </div>

          {/* Large Athletic Chronometer Display */}
          <div
            className={`text-3xl md:text-5xl font-black font-mono tracking-wider transition-colors duration-200 ${
              isNewPB
                ? 'text-emerald-300 drop-shadow-[0_0_20px_rgba(52,211,153,0.7)]'
                : 'text-cyan-300 drop-shadow-[0_0_20px_rgba(56,189,248,0.5)]'
            }`}
          >
            {formatTime(tick)}
          </div>

          {/* Live Speed Bar & Telemetry Sub-capsule */}
          <div className="flex items-center space-x-3 mt-1.5 text-xs font-mono">
            <span className="text-cyan-400 font-black flex items-center space-x-1">
              <span>⚡</span>
              <span>{speedKmh.toFixed(1)} {t.kmh}</span>
            </span>

            <span className="text-slate-600">•</span>

            {/* Personal Best comparison chip */}
            <div className="flex items-center space-x-1 text-slate-300">
              <span className="text-[10px] text-slate-400 font-bold uppercase">PB:</span>
              <span className="font-bold text-slate-200">
                {personalBest ? formatTime(personalBest.ticks) : t.noRecordYet}
              </span>
              <button
                onClick={onToggleGhost}
                className="ml-1 text-slate-400 hover:text-white cursor-pointer active:scale-90"
                title={showGhost ? 'Masquer fantôme' : 'Afficher fantôme'}
              >
                {showGhost ? <Eye className="w-3 h-3 text-purple-400" /> : <EyeOff className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* Micro Speed Bar */}
          <div className="w-full h-1 bg-slate-800 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-500 transition-all duration-75 rounded-full shadow-[0_0_8px_rgba(56,189,248,0.8)]"
              style={{ width: `${speedNormalized}%` }}
            />
          </div>
        </div>
      </div>

      {/* =========================================================================
          CENTER / LOWER-THIRD: Pre-game "Ready?" Prompt (Disappears when rolling)
         ========================================================================= */}
      {tick === 0 && status === 'ready' && (
        <div className="self-center my-auto glass-panel-elevated rounded-3xl p-6 md:p-8 max-w-md w-full text-center pointer-events-auto border border-cyan-400/30 shadow-2xl animate-in fade-in duration-300 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-500" />
          <div className="text-3xl mb-2">⚡</div>
          <h2 className="text-2xl font-black text-white tracking-wide mb-1">
            {lang === 'fr' ? 'PRÊT ?' : 'READY?'}
          </h2>
          <p className="text-cyan-300 text-sm font-bold animate-pulse mb-4">
            {t.tiltToStart}
          </p>

          <div className="hidden md:flex items-center justify-center space-x-3 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-2xl border border-white/10">
            <span className="flex items-center space-x-1.5">
              <kbd className="keycap px-2 py-0.5 rounded font-mono text-[11px] text-white">WASD</kbd>
              <span className="text-slate-400">/</span>
              <kbd className="keycap px-2 py-0.5 rounded font-mono text-[11px] text-white">▲▼◄►</kbd>
            </span>
            <span className="text-slate-600">|</span>
            <span className="flex items-center space-x-1">
              <kbd className="keycap px-2 py-0.5 rounded font-mono text-[11px] text-white">SPACE</kbd>
              <span className="text-slate-400 text-[11px] font-medium">{t.jumpKey}</span>
            </span>
          </div>
        </div>
      )}

      {/* =========================================================================
          CENTER MODAL: Goal Reached / Win Screen
         ========================================================================= */}
      {status === 'won' && (
        <div className="self-center my-auto glass-panel-elevated rounded-3xl p-6 md:p-10 max-w-lg w-full text-center pointer-events-auto shadow-2xl border border-emerald-400/40 relative overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-300 to-indigo-500" />

          <div className="inline-flex p-4 rounded-3xl bg-emerald-500/20 text-emerald-300 mb-3 border border-emerald-400/40 shadow-xl shadow-emerald-500/25">
            <Zap className="w-10 h-10 drop-shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
          </div>

          <h2 className="text-2xl md:text-3xl font-black text-white mb-1 tracking-tight">
            {isNewPB ? (
              <span className="bg-gradient-to-r from-amber-300 via-emerald-300 to-cyan-300 bg-clip-text text-transparent">
                {t.newPB}
              </span>
            ) : (
              t.goalReached
            )}
          </h2>
          <p className="text-slate-300/80 text-xs md:text-sm mb-5 font-medium">{t.courseCompleted}</p>

          <div className="bg-slate-950/80 rounded-2xl p-5 mb-5 border border-white/10 shadow-inner">
            <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">
              {t.finalTime}
            </div>
            <div className="text-4xl md:text-5xl font-black font-mono text-emerald-300 mb-2 drop-shadow-[0_0_20px_rgba(52,211,153,0.5)]">
              {formatTime(tick)}
            </div>
            <div className="text-[11px] text-slate-400 font-mono flex items-center justify-center space-x-2">
              <span>{tick} frames</span>
              <span>•</span>
              <span className="text-indigo-300 font-bold">Hash {stateHash}</span>
            </div>
          </div>

          {/* Server Verification Status Banner */}
          <div className="mb-5 p-3.5 rounded-2xl border text-xs flex items-center justify-center space-x-2 bg-slate-900/60 border-white/10">
            {submitStatus === 'submitting' && (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                <span className="text-indigo-300 font-bold">{t.validatingServer}</span>
              </>
            )}
            {submitStatus === 'verified' && (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300 font-bold font-mono">
                  {submitMessage || t.verifiedServer}
                </span>
              </>
            )}
            {submitStatus === 'rejected' && (
              <>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span className="text-rose-300 font-bold font-mono">
                  {t.rejectedServer}: {submitMessage}
                </span>
              </>
            )}
            {submitStatus === 'idle' && (
              <span className="text-slate-400 font-medium">Replay recorded</span>
            )}
          </div>

          {/* Share Result Button */}
          <button
            onClick={handleShare}
            className="w-full mb-3.5 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] font-bold text-white shadow-xl shadow-indigo-500/25 transition flex items-center justify-center space-x-2 border border-indigo-400/40 cursor-pointer"
          >
            {copiedShare ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span className="text-emerald-200">{t.cardCopied}</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-indigo-200" />
                <span>{t.shareCard}</span>
              </>
            )}
          </button>

          <div className="flex space-x-3">
            <button
              onClick={onOpenLeaderboard}
              className="flex-1 py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-[0.98] font-bold text-white transition flex items-center justify-center space-x-2 border border-white/10 cursor-pointer"
            >
              <Trophy className="w-4 h-4 text-amber-300" />
              <span>{t.leaderboard}</span>
            </button>
            <button
              onClick={onRestart}
              className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.98] font-black text-white shadow-xl shadow-emerald-500/30 transition flex items-center justify-center space-x-2 border border-emerald-400/40 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{t.playAgain} (R)</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          CENTER MODAL: Off Track / Death Screen
         ========================================================================= */}
      {status === 'dead' && (
        <div className="self-center my-auto glass-panel-elevated rounded-3xl p-6 md:p-8 max-w-sm w-full text-center pointer-events-auto border border-rose-500/40 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-600 via-red-500 to-pink-600" />
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-2xl shadow-lg shadow-rose-500/20">
            💥
          </div>
          <h2 className="text-2xl font-black text-white mb-1.5 tracking-tight">{t.fellOff}</h2>
          <p className="text-slate-300/80 text-xs md:text-sm mb-5 font-medium">{t.keepBalance}</p>
          <button
            onClick={onRestart}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-pink-600 hover:from-rose-400 hover:to-pink-500 active:scale-[0.98] font-black text-white shadow-xl shadow-rose-500/30 transition flex items-center justify-center space-x-2 border border-rose-400/40 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t.retry} (R)</span>
          </button>
        </div>
      )}

      {/* =========================================================================
          BOTTOM BAR: Discreet security fingerprint & quick restart
         ========================================================================= */}
      <div className="flex items-center justify-between pointer-events-auto w-full gap-2">
        {/* Left: Engine Determinism & Cryptographic Hash Fingerprint */}
        <div className="flex items-center space-x-2">
          <div className="glass-panel rounded-xl px-3 py-1.5 flex items-center space-x-2 text-[10px] text-slate-400 font-mono border border-white/5">
            <Hash className="w-3 h-3 text-cyan-400" />
            <span className="text-slate-400 hidden sm:inline">{t.stateHash}:</span>
            <span className="text-cyan-300 font-bold tracking-tight">{stateHash}</span>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400 font-bold">60Hz</span>
          </div>

          {/* Mobile Gyro Controls */}
          {gyroSupported && onToggleGyro && (
            <div className="flex items-center space-x-1.5">
              <button
                onClick={onToggleGyro}
                className={`glass-pill rounded-xl px-3 py-1.5 text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer active:scale-95 ${
                  gyroActive ? 'glass-pill-active text-purple-200' : 'text-slate-300 hover:text-white'
                }`}
              >
                {gyroActive ? (
                  <>
                    <Smartphone className="w-3.5 h-3.5 text-purple-300 animate-pulse" />
                    <span>{t.gyroMode}</span>
                  </>
                ) : (
                  <>
                    <Gamepad2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t.touchMode}</span>
                  </>
                )}
              </button>

              {gyroActive && onCalibrateGyro && (
                <button
                  onClick={onCalibrateGyro}
                  className="glass-pill rounded-xl px-2.5 py-1.5 text-xs font-bold text-emerald-300 hover:text-emerald-200 transition flex items-center space-x-1 cursor-pointer active:scale-95"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{t.calibrateGyro}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: Quick Restart Button */}
        <button
          onClick={onRestart}
          className="glass-panel rounded-xl px-3.5 py-1.5 hover:bg-white/10 text-xs font-bold text-slate-300 hover:text-white transition flex items-center space-x-1.5 border border-white/10 shadow-md cursor-pointer active:scale-95"
          title={`${t.resetRun} (R)`}
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          <span>{t.resetRun}</span>
          <span className="hidden sm:inline text-slate-500 font-mono text-[10px]">(R)</span>
        </button>
      </div>
    </div>
  );
};
