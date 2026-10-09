import React from 'react';
import { SimStatus, TICKS_PER_SECOND } from '@ghostroll/shared';
import { StoredPB } from '../utils/ghostStorage.js';
import { RotateCcw, Trophy, Eye, EyeOff, Hash, Zap } from 'lucide-react';

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
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-6">
      {/* Top Header */}
      <div className="flex items-start justify-between">
        {/* Game Title & Track */}
        <div className="glass-panel rounded-2xl px-5 py-3 pointer-events-auto flex items-center space-x-4">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl md:text-2xl font-extrabold tracking-wider bg-gradient-to-r from-indigo-400 via-sky-300 to-purple-400 bg-clip-text text-transparent">
                GHOSTROLL
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                v0.1
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Trial Track: Neon Dawn</p>
          </div>
        </div>

        {/* Live Timer */}
        <div className="glass-panel rounded-2xl px-6 py-3 flex flex-col items-center">
          <div className="text-xs uppercase font-bold tracking-widest text-slate-400 mb-0.5">
            Time
          </div>
          <div className="text-2xl md:text-3xl font-bold font-mono tracking-wider text-sky-300">
            {formatTime(tick)}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
            {tick === 0 ? (
              <span className="text-emerald-400 font-semibold animate-pulse">
                Tilt with arrows / WASD to start
              </span>
            ) : (
              <span>
                Tick {tick} • {(speed * 3.6).toFixed(1)} km/h
              </span>
            )}
          </div>
        </div>

        {/* PB & Determinism Card */}
        <div className="glass-panel rounded-2xl p-3 md:p-4 pointer-events-auto flex flex-col space-y-2 min-w-[160px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-xs text-amber-300 font-bold">
              <Trophy className="w-3.5 h-3.5" />
              <span>Personal Best</span>
            </div>
            {personalBest && (
              <button
                onClick={onToggleGhost}
                title={showGhost ? 'Hide ghost' : 'Show ghost'}
                className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition"
              >
                {showGhost ? <Eye className="w-3.5 h-3.5 text-purple-400" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>

          <div className="font-mono text-sm font-semibold text-slate-200">
            {personalBest ? formatTime(personalBest.ticks) : '— No time yet —'}
          </div>

          {/* Engine Determinism Hash Badge */}
          <div className="pt-1.5 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span className="flex items-center space-x-1">
              <Hash className="w-3 h-3 text-indigo-400" />
              <span>State Hash</span>
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
            {isNewPB ? 'NEW PERSONAL BEST!' : 'GOAL REACHED!'}
          </h2>
          <p className="text-slate-300 text-sm mb-4">Course completed smoothly.</p>

          <div className="bg-slate-900/60 rounded-xl p-4 mb-6 border border-white/5">
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">
              Final Time
            </div>
            <div className="text-4xl font-extrabold font-mono text-emerald-300 mb-1">
              {formatTime(tick)}
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Replay validated with {tick} frames (hash {stateHash})
            </div>
          </div>

          <button
            onClick={onRestart}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 font-bold text-white shadow-lg transition flex items-center justify-center space-x-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Again (R)</span>
          </button>
        </div>
      )}

      {status === 'dead' && (
        <div className="self-center glass-panel rounded-3xl p-8 max-w-sm w-full text-center pointer-events-auto border-rose-500/30">
          <div className="text-4xl mb-2">💥</div>
          <h2 className="text-2xl font-extrabold text-white mb-2">Fell off the track!</h2>
          <p className="text-slate-400 text-sm mb-6">Keep balance on the narrow bridges.</p>
          <button
            onClick={onRestart}
            className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 font-bold text-white shadow-lg transition flex items-center justify-center space-x-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retry (R)</span>
          </button>
        </div>
      )}

      {/* Bottom Bar: Instructions & Quick Actions */}
      <div className="flex items-center justify-between">
        <div className="glass-pill rounded-xl px-4 py-2 pointer-events-auto flex items-center space-x-4 text-xs text-slate-300">
          <span className="flex items-center space-x-1.5">
            <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-white">
              ▲▼◄►
            </kbd>
            <span className="text-slate-400">or</span>
            <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-white">
              WASD / ZQSD
            </kbd>
            <span className="text-slate-400">to tilt board</span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center space-x-1">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-white">
              R
            </kbd>
            <span className="text-slate-400">Restart</span>
          </span>
        </div>

        <button
          onClick={onRestart}
          className="glass-pill rounded-xl px-4 py-2 pointer-events-auto hover:bg-white/10 text-xs font-semibold text-slate-200 transition flex items-center space-x-2"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset run</span>
        </button>
      </div>
    </div>
  );
};
