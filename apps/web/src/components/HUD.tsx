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
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 md:p-6 select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
        {/* Game Title, Track & User Profile */}
        <div className="flex flex-col space-y-2 pointer-events-auto">
          <div className="glass-panel rounded-2xl px-4 py-2.5 md:px-5 md:py-3 flex items-center space-x-4 border border-white/10 shadow-xl">
            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-xl md:text-2xl font-black tracking-wider bg-gradient-to-r from-cyan-400 via-indigo-300 to-fuchsia-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(99,102,241,0.4)]">
                  GHOSTROLL
                </h1>
                <span className="flex items-center space-x-1 text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                  <span>v0.4</span>
                </span>
              </div>
              <button
                onClick={onOpenTrackSelector}
                className="text-xs text-slate-300/90 font-medium flex items-center space-x-1.5 hover:text-white transition group mt-0.5"
              >
                <span className="text-slate-400">{t.track}:</span>
                <span className="font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">{levelName}</span>
                <ChevronDown className="w-3.5 h-3.5 text-indigo-400 group-hover:translate-y-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* User profile, Course Selector & Leaderboard Button */}
          <div className="flex items-center space-x-1.5 md:space-x-2 overflow-x-auto max-w-full pb-1">
            <button
              onClick={onOpenProfile}
              className="glass-pill rounded-xl px-3 py-1.5 flex items-center space-x-1.5 text-xs text-slate-200 hover:text-white transition shadow cursor-pointer active:scale-95"
            >
              <UserIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-bold truncate max-w-[100px]">{userDisplayName || t.profile}</span>
            </button>
            <button
              onClick={onOpenTrackSelector}
              className="glass-pill rounded-xl px-3 py-1.5 flex items-center space-x-1.5 text-xs font-bold text-sky-300 hover:text-sky-200 transition shadow cursor-pointer active:scale-95"
            >
              <Compass className="w-3.5 h-3.5 text-sky-400" />
              <span>{t.courses}</span>
            </button>
            <button
              onClick={onOpenLeaderboard}
              className="glass-pill rounded-xl px-3 py-1.5 flex items-center space-x-1.5 text-xs font-bold text-amber-300 hover:text-amber-200 transition shadow cursor-pointer active:scale-95"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.leaderboard}</span>
            </button>
            {onToggleMute && (
              <button
                onClick={onToggleMute}
                className="glass-pill rounded-xl px-2.5 py-1.5 flex items-center space-x-1 text-xs text-slate-300 hover:text-white transition shadow cursor-pointer active:scale-95"
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

        {/* Live Timer & Telemetry Hub */}
        <div className="glass-panel rounded-2xl px-5 py-2.5 md:px-7 md:py-3.5 flex flex-col items-center border border-white/10 shadow-2xl relative overflow-hidden self-center sm:self-auto">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-75" />
          <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-0.5">
            {t.time}
          </div>
          <div className={`text-2xl md:text-3xl font-black font-mono tracking-wider transition-colors ${
            isNewPB ? 'text-emerald-300 drop-shadow-[0_0_12px_rgba(52,211,153,0.5)]' : 'text-cyan-300 drop-shadow-[0_0_12px_rgba(56,189,248,0.4)]'
          }`}>
            {formatTime(tick)}
          </div>
          <div className="text-[11px] text-slate-300 font-mono mt-0.5 flex items-center space-x-2">
            {tick === 0 ? (
              <span className="text-emerald-400 font-bold animate-pulse flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-ping" />
                <span>{t.tiltToStart}</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1.5">
                <span className="text-slate-400">{t.tick} {tick}</span>
                <span className="text-slate-600">•</span>
                <span className="text-cyan-400 font-bold">{(speed * 3.6).toFixed(1)} {t.kmh}</span>
              </span>
            )}
          </div>
        </div>

        {/* PB, Ghost & Determinism Card */}
        <div className="glass-panel rounded-2xl p-3 md:p-3.5 pointer-events-auto flex flex-col space-y-2 min-w-[170px] border border-white/10 shadow-xl self-end sm:self-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-xs text-purple-300 font-bold truncate max-w-[130px]">
              <Trophy className="w-3.5 h-3.5 shrink-0 text-purple-400" />
              <span className="truncate">{activeGhostName}</span>
            </div>
            <button
              onClick={onToggleGhost}
              title={showGhost ? 'Hide ghost' : 'Show ghost'}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition active:scale-90"
            >
              {showGhost ? <Eye className="w-3.5 h-3.5 text-purple-400" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="font-mono text-sm font-bold text-slate-100 flex items-center justify-between">
            <span>{personalBest ? formatTime(personalBest.ticks) : t.noRecordYet}</span>
            {leaderboardRank && (
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                #{leaderboardRank}
              </span>
            )}
          </div>

          {/* Engine Determinism Hash Badge */}
          <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span className="flex items-center space-x-1">
              <Hash className="w-3 h-3 text-indigo-400" />
              <span>{t.stateHash}</span>
            </span>
            <span className="text-indigo-300 font-bold tracking-tight">{stateHash}</span>
          </div>
        </div>
      </div>

      {/* Center Modals: Win or Dead */}
      {status === 'won' && (
        <div className="self-center glass-panel-elevated rounded-3xl p-6 md:p-8 max-w-md w-full text-center pointer-events-auto animate-pulse-glow shadow-2xl border-emerald-500/40 relative overflow-hidden">
          {/* Top radiant light */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-300 to-indigo-500" />

          <div className="inline-flex p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/25 to-teal-500/10 text-emerald-400 mb-3 border border-emerald-500/40 shadow-lg shadow-emerald-500/20">
            <Zap className="w-8 h-8 drop-shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
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
          <p className="text-slate-300/80 text-xs md:text-sm mb-4 font-medium">{t.courseCompleted}</p>

          <div className="bg-slate-900/80 rounded-2xl p-4 mb-4 border border-white/10 shadow-inner">
            <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">
              {t.finalTime}
            </div>
            <div className="text-4xl md:text-5xl font-black font-mono text-emerald-300 mb-1.5 drop-shadow-[0_0_15px_rgba(52,211,153,0.4)]">
              {formatTime(tick)}
            </div>
            <div className="text-[11px] text-slate-400 font-mono flex items-center justify-center space-x-2">
              <span>{tick} frames</span>
              <span>•</span>
              <span className="text-indigo-300 font-bold">Hash {stateHash}</span>
            </div>
          </div>

          {/* Server Verification Status Banner */}
          <div className="mb-4 p-3 rounded-xl border text-xs flex items-center justify-center space-x-2 bg-slate-900/60 border-white/10">
            {submitStatus === 'submitting' && (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
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
            className="w-full mb-3 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] font-bold text-white shadow-xl shadow-indigo-500/20 transition flex items-center justify-center space-x-2 border border-indigo-400/40 cursor-pointer"
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

          <div className="flex space-x-2.5">
            <button
              onClick={onOpenLeaderboard}
              className="flex-1 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 active:scale-[0.98] font-bold text-white transition flex items-center justify-center space-x-2 border border-white/10 cursor-pointer"
            >
              <Trophy className="w-4 h-4 text-amber-300" />
              <span>{t.leaderboard}</span>
            </button>
            <button
              onClick={onRestart}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.98] font-black text-white shadow-xl shadow-emerald-500/25 transition flex items-center justify-center space-x-2 border border-emerald-400/40 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{t.playAgain} (R)</span>
            </button>
          </div>
        </div>
      )}

      {status === 'dead' && (
        <div className="self-center glass-panel-elevated rounded-3xl p-6 md:p-8 max-w-sm w-full text-center pointer-events-auto border-rose-500/40 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-600 via-red-500 to-pink-600" />
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-2xl shadow-lg shadow-rose-500/20">
            💥
          </div>
          <h2 className="text-2xl font-black text-white mb-1.5 tracking-tight">{t.fellOff}</h2>
          <p className="text-slate-300/80 text-xs md:text-sm mb-5 font-medium">{t.keepBalance}</p>
          <button
            onClick={onRestart}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-rose-500 via-rose-600 to-pink-600 hover:from-rose-400 hover:to-pink-500 active:scale-[0.98] font-black text-white shadow-xl shadow-rose-500/30 transition flex items-center justify-center space-x-2 border border-rose-400/40 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t.retry} (R)</span>
          </button>
        </div>
      )}

      {/* Bottom Bar: Instructions, Mobile Gyro Toggle & Quick Actions */}
      <div className="flex items-center justify-between pointer-events-auto gap-2">
        <div className="flex items-center space-x-2">
          {/* Keyboard info on desktop */}
          <div className="hidden md:flex glass-panel rounded-xl px-4 py-2 items-center space-x-3 text-xs text-slate-300 border border-white/10 shadow-lg">
            <span className="flex items-center space-x-1.5">
              <kbd className="keycap px-2 py-0.5 rounded font-mono text-[11px] text-white">
                ▲▼◄►
              </kbd>
              <span className="text-slate-400">/</span>
              <kbd className="keycap px-2 py-0.5 rounded font-mono text-[11px] text-white">
                WASD
              </kbd>
              <span className="text-slate-400 text-[11px] font-medium">{t.controlsHelp}</span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="flex items-center space-x-1">
              <kbd className="keycap px-2 py-0.5 rounded font-mono text-[11px] text-white">
                SPACE
              </kbd>
              <span className="text-slate-400 text-[11px] font-medium">{t.jumpKey}</span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="flex items-center space-x-1">
              <kbd className="keycap px-1.5 py-0.5 rounded font-mono text-[11px] text-white">
                R
              </kbd>
              <span className="text-slate-400 text-[11px] font-medium">{t.restartKey}</span>
            </span>
          </div>

          {/* Mobile Gyro Mode Toggle */}
          {gyroSupported && onToggleGyro && (
            <div className="flex items-center space-x-1.5">
              <button
                onClick={onToggleGyro}
                className={`glass-pill rounded-xl px-3.5 py-2 text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer active:scale-95 ${
                  gyroActive
                    ? 'glass-pill-active text-purple-200'
                    : 'text-slate-300 hover:text-white'
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
                  className="glass-pill rounded-xl px-3 py-2 text-xs font-bold text-emerald-300 hover:text-emerald-200 transition flex items-center space-x-1.5 cursor-pointer active:scale-95"
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
          className="glass-pill rounded-xl px-4 py-2 hover:bg-white/10 text-xs font-bold text-slate-200 hover:text-white transition flex items-center space-x-2 border border-white/10 shadow-md cursor-pointer active:scale-95"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          <span>{t.resetRun}</span>
        </button>
      </div>
    </div>
  );
};
