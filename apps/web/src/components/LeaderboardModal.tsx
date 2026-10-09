import React from 'react';
import { LeaderboardEntry } from '../api/client.js';
import { Trophy, X, Play, CheckCircle2, Award, Flame } from 'lucide-react';
import { TICKS_PER_SECOND } from '@ghostroll/shared';
import { Language } from '../i18n/translations.js';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: LeaderboardEntry[];
  loading: boolean;
  selectedGhostRunId?: string;
  onSelectGhost: (entry: LeaderboardEntry) => void;
  lang?: Language;
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
  lang = 'en',
}) => {
  if (!isOpen) return null;
  const fr = lang === 'fr';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md pointer-events-auto animate-in fade-in duration-150">
      <div className="glass-panel-elevated w-full max-w-lg rounded-2xl p-6 sm:p-7 flex flex-col max-h-[85vh] shadow-2xl border border-white/10 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-amber-400 border border-amber-400/20 flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white tracking-tight">{fr ? 'Classement mondial' : 'Global Leaderboard'}</h2>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/[0.06] text-zinc-300 border border-white/10">
                  Live
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-normal">{fr ? 'Temps déterministes vérifiés par le serveur' : 'Server-verified deterministic runs'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition active:scale-95 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-zinc-400 border-t-white animate-spin" />
              <p className="text-xs text-zinc-400 font-mono">{fr ? 'Chargement des temps vérifiés...' : 'Fetching verified times...'}</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="py-14 text-center px-4">
              <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-400">
                <Award className="w-5 h-5" />
              </div>
              <p className="text-white font-bold text-sm mb-1">{fr ? 'Aucun temps vérifié pour le moment' : 'No verified times yet today'}</p>
              <p className="text-xs text-zinc-400">{fr ? 'Franchis la ligne en premier et pose un record !' : 'Be the first to cross the finish line and set a record!'}</p>
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
                  className={`flex items-center justify-between p-3 sm:p-3.5 rounded-xl border transition-all duration-150 ${
                    isSelected
                      ? 'bg-zinc-800/80 border-emerald-500/40 ring-1 ring-emerald-500/30'
                      : isFirst
                      ? 'bg-white/[0.04] border-amber-400/25 hover:border-amber-400/40'
                      : 'bg-white/[0.02] border-white/[0.06] hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {/* Rank Badge */}
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold font-mono text-xs ${
                        isFirst
                          ? 'bg-amber-400 text-zinc-950 shadow-sm'
                          : isSecond
                          ? 'bg-zinc-200 text-zinc-950'
                          : isThird
                          ? 'bg-amber-700 text-amber-100'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {entry.rank}
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-zinc-100 flex items-center space-x-1.5">
                        <span className="truncate max-w-[130px] md:max-w-[160px]">{entry.displayName}</span>
                        {isFirst && <Flame className="w-3.5 h-3.5 text-amber-400 inline-block shrink-0" />}
                        <span title="Verified by server" className="shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono tracking-tight">
                        Hash {entry.finalHash}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="font-mono font-bold text-sm sm:text-base text-zinc-100 tabular-nums">
                        {formatLeaderboardTime(entry.ticks)}
                      </div>
                    </div>

                    {hasGhost && (
                      <button
                        onClick={() => onSelectGhost(entry)}
                        title={isSelected ? 'Ghost active' : 'Race this ghost'}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition active:scale-95 cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500 text-zinc-950 font-bold'
                            : 'bg-white/10 hover:bg-white/15 text-zinc-200 border border-white/10'
                        }`}
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span className="hidden sm:inline text-[11px]">{isSelected ? (fr ? 'Actif' : 'Active') : (fr ? 'Défier' : 'Race')}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-white/[0.08] text-[11px] text-zinc-400 font-medium flex items-center justify-between">
          <span className="flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            <span>{fr ? 'Fantômes automatiques' : 'Top ghosts auto-load'}</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition active:scale-95 cursor-pointer border border-white/10"
          >
            {fr ? 'Fermer' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
