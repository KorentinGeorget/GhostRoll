import React from 'react';
import { LeaderboardEntry } from '../api/client.js';
import { Trophy, X, Play, CheckCircle2 } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md pointer-events-auto">
      <div className="glass-panel w-full max-w-lg rounded-3xl p-6 md:p-8 flex flex-col max-h-[85vh] shadow-2xl border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">Global Leaderboard</h2>
              <p className="text-xs text-slate-400">Server-verified deterministic runs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
              <p className="text-xs text-slate-400">Fetching verified times...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No verified times yet today. Be the first to set a record!
            </div>
          ) : (
            entries.map((entry) => {
              const isSelected = selectedGhostRunId === entry.runId;
              const hasGhost = !!entry.ghostSamples;

              return (
                <div
                  key={entry.runId}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition ${
                    isSelected
                      ? 'bg-purple-950/40 border-purple-500/40'
                      : 'bg-slate-900/40 border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    {/* Rank Badge */}
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold font-mono text-xs ${
                        entry.rank === 1
                          ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                          : entry.rank === 2
                          ? 'bg-slate-300/20 text-slate-200 border border-slate-300/30'
                          : entry.rank === 3
                          ? 'bg-amber-700/20 text-amber-500 border border-amber-700/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {entry.rank}
                    </div>

                    <div>
                      <div className="text-sm font-bold text-slate-200 flex items-center space-x-1.5">
                        <span>{entry.displayName}</span>
                        <span title="Verified by server">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Hash {entry.finalHash}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="font-mono font-bold text-sm text-sky-300">
                        {formatLeaderboardTime(entry.ticks)}
                      </div>
                    </div>

                    {hasGhost && (
                      <button
                        onClick={() => onSelectGhost(entry)}
                        title={isSelected ? 'Ghost active' : 'Race this ghost'}
                        className={`p-2 rounded-xl text-xs font-semibold flex items-center space-x-1 transition ${
                          isSelected
                            ? 'bg-purple-500 text-white shadow-lg'
                            : 'bg-white/5 hover:bg-white/10 text-slate-300'
                        }`}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Top ghost replays load automatically</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
