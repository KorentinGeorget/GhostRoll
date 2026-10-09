import React from 'react';
import { LeaderboardEntry } from '../api/client.js';
import { Trophy, X, Play, CheckCircle2, Award, Flame } from 'lucide-react';
import { TICKS_PER_SECOND } from '@ghostroll/shared';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: LeaderboardEntry[];
  loading: boolean;
  selectedGhostRunId?: string;
  onSelectGhost: (entry: LeaderboardEntry) => void;
}

function formatLeaderboardTime(ticks: number): string {
  const totalSeconds = ticks / TICKS_PER_SECOND;
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  const millis = Math.floor((totalSeconds % 1) * 1000);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  entries,
  loading,
  selectedGhostRunId,
  onSelectGhost,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl pointer-events-auto animate-in fade-in duration-200">
      <div className="glass-panel-elevated w-full max-w-lg rounded-3xl p-6 md:p-8 flex flex-col max-h-[85vh] shadow-2xl border border-white/10 relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-300 to-indigo-500" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/25 to-yellow-500/10 text-amber-300 border border-amber-500/30 shadow-lg shadow-amber-500/15">
              <Trophy className="w-6 h-6 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl md:text-2xl font-black text-white tracking-wide">Global Leaderboard</h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Live
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Server-verified deterministic runs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition active:scale-90 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1.5 custom-scrollbar">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 rounded-full border-3 border-indigo-400 border-t-transparent animate-spin shadow-lg shadow-indigo-500/20" />
              <p className="text-xs text-slate-400 font-medium animate-pulse">Fetching verified times...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="py-14 text-center px-4">
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-400">
                <Award className="w-6 h-6" />
              </div>
              <p className="text-white font-bold text-sm mb-1">No verified times yet today</p>
              <p className="text-xs text-slate-400">Be the first to cross the finish line and set a record!</p>
            </div>
          ) : (
            entries.map((entry) => {
              const isSelected = selectedGhostRunId === entry.runId;
              const hasGhost = !!entry.ghostSamples;
              const isFirst = entry.rank === 1;
              const isSecond = entry.rank === 2;
              const isThird = entry.rank === 3;

              return (
                <div
                  key={entry.runId}
                  className={`flex items-center justify-between p-3.5 md:p-4 rounded-2xl border transition-all duration-200 ${
                    isSelected
                      ? 'bg-purple-950/50 border-purple-400/60 shadow-lg shadow-purple-500/20 ring-1 ring-purple-500/30'
                      : isFirst
                      ? 'bg-gradient-to-r from-amber-950/30 to-slate-900/40 border-amber-500/30 hover:border-amber-500/50 shadow-md'
                      : 'bg-slate-900/45 border-white/5 hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    {/* Rank Badge */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-black font-mono text-xs shadow-md ${
                        isFirst
                          ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 border border-amber-300 shadow-amber-500/30'
                          : isSecond
                          ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-950 border border-slate-200 shadow-slate-300/20'
                          : isThird
                          ? 'bg-gradient-to-br from-amber-700 to-amber-800 text-amber-100 border border-amber-600 shadow-amber-800/30'
                          : 'bg-slate-800/90 text-slate-300 border border-white/5'
                      }`}
                    >
                      {entry.rank}
                    </div>

                    <div>
                      <div className="text-sm font-bold text-slate-100 flex items-center space-x-1.5">
                        <span className="truncate max-w-[130px] md:max-w-[160px]">{entry.displayName}</span>
                        {isFirst && <Flame className="w-3.5 h-3.5 text-amber-400 inline-block shrink-0" />}
                        <span title="Verified by server" className="shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono tracking-tight">
                        Hash {entry.finalHash}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="font-mono font-black text-sm md:text-base text-cyan-300 drop-shadow-[0_0_8px_rgba(56,189,248,0.3)]">
                        {formatLeaderboardTime(entry.ticks)}
                      </div>
                    </div>

                    {hasGhost && (
                      <button
                        onClick={() => onSelectGhost(entry)}
                        title={isSelected ? 'Ghost active' : 'Race this ghost'}
                        className={`p-2.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition active:scale-90 cursor-pointer ${
                          isSelected
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400'
                            : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5'
                        }`}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span className="hidden sm:inline text-[11px]">{isSelected ? 'Active' : 'Race'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3.5 border-t border-white/10 text-[11px] text-slate-400 font-medium flex items-center justify-between">
          <span className="flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            <span>Top ghost replays load automatically</span>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold transition active:scale-95 cursor-pointer border border-white/10 shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
