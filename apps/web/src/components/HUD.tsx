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
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-6 select-none">
      {/* Top Header */}
      <div className="flex items-start justify-between">
        {/* Game Title, Track & User Profile */}
        <div className="flex flex-col space-y-2 pointer-events-auto">
          <div className="glass-panel rounded-2xl px-5 py-3 flex items-center space-x-4">
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl md:text-2xl font-extrabold tracking-wider bg-gradient-to-r from-indigo-400 via-sky-300 to-purple-400 bg-clip-text text-transparent">
                  GHOSTROLL
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  v0.4
                </span>
              </div>
              <button
                onClick={onOpenTrackSelector}
                className="text-xs text-slate-300 font-medium flex items-center space-x-1.5 hover:text-white transition group mt-0.5"
              >
                <span>{t.track}: {levelName}</span>
                <ChevronDown className="w-3.5 h-3.5 text-indigo-400 group-hover:translate-y-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* User profile, Course Selector & Leaderboard Button */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenProfile}
              className="glass-pill rounded-xl px-3 py-1.5 flex items-center space-x-1.5 text-xs text-slate-300 hover:bg-white/10 transition shadow cursor-pointer"
            >
              <UserIcon className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-semibold">{userDisplayName || t.profile}</span>
            </button>
            <button
              onClick={onOpenTrackSelector}
              className="glass-pill rounded-xl px-3.5 py-1.5 flex items-center space-x-1.5 text-xs font-semibold text-sky-300 hover:bg-white/10 transition shadow cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>{t.courses}</span>
            </button>
            <button
              onClick={onOpenLeaderboard}
              className="glass-pill rounded-xl px-3.5 py-1.5 flex items-center space-x-1.5 text-xs font-semibold text-amber-300 hover:bg-white/10 transition shadow cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>{t.leaderboard}</span>
            </button>
            {onToggleMute && (
              <button
                onClick={onToggleMute}
                className="glass-pill rounded-xl px-2.5 py-1.5 flex items-center space-x-1 text-xs text-slate-300 hover:bg-white/10 transition shadow cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? (
                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                )}
              </button>
            )}
          </div>
        </div>


        {/* Live Timer */}
        <div className="glass-panel rounded-2xl px-6 py-3 flex flex-col items-center">
          <div className="text-xs uppercase font-bold tracking-widest text-slate-400 mb-0.5">
            {t.time}
          </div>
          <div className="text-2xl md:text-3xl font-bold font-mono tracking-wider text-sky-300">
            {formatTime(tick)}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
            {tick === 0 ? (
              <span className="text-emerald-400 font-semibold animate-pulse">
                {t.tiltToStart}
              </span>
            ) : (
              <span>
                {t.tick} {tick} • {(speed * 3.6).toFixed(1)} {t.kmh}
              </span>
            )}
          </div>
        </div>

        {/* PB, Ghost & Determinism Card */}
        <div className="glass-panel rounded-2xl p-3 md:p-4 pointer-events-auto flex flex-col space-y-2 min-w-[170px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-xs text-purple-300 font-bold truncate max-w-[130px]">
              <Trophy className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{activeGhostName}</span>
            </div>
            <button
              onClick={onToggleGhost}
              title={showGhost ? 'Hide ghost' : 'Show ghost'}
              className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition"
            >
              {showGhost ? <Eye className="w-3.5 h-3.5 text-purple-400" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="font-mono text-sm font-semibold text-slate-200">
            {personalBest ? formatTime(personalBest.ticks) : t.noRecordYet}
          </div>

          {/* Engine Determinism Hash Badge */}
          <div className="pt-1.5 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span className="flex items-center space-x-1">
              <Hash className="w-3 h-3 text-indigo-400" />
              <span>{t.stateHash}</span>
            </span>
            <span className="text-indigo-300 font-bold">{stateHash}</span>
          </div>
        </div>
      </div>

      {/* Center Modals: Win or Dead */}
      {status === 'won' && (
        <div className="self-center glass-panel rounded-3xl p-8 max-w-md w-full text-center pointer-events-auto animate-pulse-glow shadow-2xl border-emerald-500/30">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 mb-3 border border-emerald-500/30">
            <Zap className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-extrabold text-white mb-1">
            {isNewPB ? t.newPB : t.goalReached}
          </h2>
          <p className="text-slate-300 text-sm mb-4">{t.courseCompleted}</p>

          <div className="bg-slate-900/60 rounded-xl p-4 mb-4 border border-white/5">
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">
              {t.finalTime}
            </div>
            <div className="text-4xl font-extrabold font-mono text-emerald-300 mb-1">
              {formatTime(tick)}
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Replay: {tick} frames (hash {stateHash})
            </div>
          </div>

          {/* Server Verification Status Banner */}
          <div className="mb-4 p-3 rounded-xl border text-xs flex items-center justify-center space-x-2 bg-slate-900/50">
            {submitStatus === 'submitting' && (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                <span className="text-indigo-300 font-medium">{t.validatingServer}</span>
              </>
            )}
            {submitStatus === 'verified' && (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300 font-medium font-mono">
                  {submitMessage || t.verifiedServer}
                </span>
              </>
            )}
            {submitStatus === 'rejected' && (
              <>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span className="text-rose-300 font-medium font-mono">
                  {t.rejectedServer}: {submitMessage}
                </span>
              </>
            )}
            {submitStatus === 'idle' && (
              <span className="text-slate-400">Replay recorded</span>
            )}
          </div>

          {/* Share Result Button */}
          <button
            onClick={handleShare}
            className="w-full mb-3 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 font-bold text-white shadow-lg transition flex items-center justify-center space-x-2 border border-indigo-400/30"
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
              className="flex-1 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 font-semibold text-white transition flex items-center justify-center space-x-2"
            >
              <Trophy className="w-4 h-4 text-amber-300" />
              <span>{t.leaderboard}</span>
            </button>
            <button
              onClick={onRestart}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 font-bold text-white shadow-lg transition flex items-center justify-center space-x-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{t.playAgain} (R)</span>
            </button>
          </div>
        </div>
      )}

      {status === 'dead' && (
        <div className="self-center glass-panel rounded-3xl p-8 max-w-sm w-full text-center pointer-events-auto border-rose-500/30">
          <div className="text-4xl mb-2">💥</div>
          <h2 className="text-2xl font-extrabold text-white mb-2">{t.fellOff}</h2>
          <p className="text-slate-400 text-sm mb-6">{t.keepBalance}</p>
          <button
            onClick={onRestart}
            className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 font-bold text-white shadow-lg transition flex items-center justify-center space-x-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t.retry} (R)</span>
          </button>
        </div>
      )}

      {/* Bottom Bar: Instructions, Mobile Gyro Toggle & Quick Actions */}
      <div className="flex items-center justify-between pointer-events-auto">
        <div className="flex items-center space-x-2">
          {/* Keyboard info on desktop */}
          <div className="hidden md:flex glass-pill rounded-xl px-4 py-2 items-center space-x-4 text-xs text-slate-300">
            <span className="flex items-center space-x-1.5">
              <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-white">
                ▲▼◄►
              </kbd>
              <span className="text-slate-400">or</span>
              <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-white">
                WASD / ZQSD
              </kbd>
              <span className="text-slate-400">{t.controlsHelp}</span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="flex items-center space-x-1">
              <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-white">
                ESPACE
              </kbd>
              <span className="text-slate-400">{t.jumpKey}</span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-white">
                R
              </kbd>
              <span className="text-slate-400">{t.restartKey}</span>
            </span>
          </div>

          {/* Mobile Gyro Mode Toggle */}
          {gyroSupported && onToggleGyro && (
            <div className="flex items-center space-x-1.5">
              <button
                onClick={onToggleGyro}
                className={`glass-pill rounded-xl px-3.5 py-2 text-xs font-semibold transition flex items-center space-x-1.5 ${
                  gyroActive
                    ? 'bg-purple-600/30 text-purple-200 border-purple-500/40'
                    : 'text-slate-300 hover:bg-white/10'
                }`}
              >
                {gyroActive ? (
                  <>
                    <Smartphone className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
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
                  className="glass-pill rounded-xl px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-white/10 transition flex items-center space-x-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t.calibrateGyro}</span>
                </button>
              )}
            </div>
          )}
        </div>

        <button
          onClick={onRestart}
          className="glass-pill rounded-xl px-4 py-2 hover:bg-white/10 text-xs font-semibold text-slate-200 transition flex items-center space-x-2"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{t.resetRun}</span>
        </button>
      </div>
    </div>
  );
};
