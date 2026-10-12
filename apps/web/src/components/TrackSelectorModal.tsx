import React, { useState, useEffect } from 'react';
import { Calendar, Check, Compass, Dices, Flame, Sparkles, Swords, Share2, X, PenTool, Users, Trophy } from 'lucide-react';
import { ArchiveItem, CommunityTrackItem, fetchCommunityTracks } from '../api/client.js';
import { Language, TRANSLATIONS } from '../i18n/translations.js';

interface TrackSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLevelId: string;
  dailyLevelId?: string;
  dailyName?: string;
  dailyDate?: string;
  archive: ArchiveItem[];
  loading: boolean;
  onSelectLevel: (levelId: string) => void;
  onOpenEditor?: () => void;
  lang?: Language;
}

const cleanName = (n: string) => n.replace(/\s*\(Daily[^)]*\)\s*$/, '');

export const TrackSelectorModal: React.FC<TrackSelectorModalProps> = ({
  isOpen,
  onClose,
  currentLevelId,
  dailyLevelId,
  dailyName,
  dailyDate,
  archive,
  loading,
  onSelectLevel,
  onOpenEditor,
  lang = 'en',
}) => {
  const t = TRANSLATIONS[lang];
  const [customSeedInput, setCustomSeedInput] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [communityTracks, setCommunityTracks] = useState<CommunityTrackItem[]>([]);
  const [communityLoading, setCommunityLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCommunityLoading(true);
      fetchCommunityTracks()
        .then((tracks) => setCommunityTracks(tracks))
        .finally(() => setCommunityLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRollRandom = () => {
    const prefixes = ['TITAN', 'NEON', 'VORTEX', 'ZENITH', 'CYBER', 'HYPER', 'PULSE', 'APEX', 'DRIFT', 'NOVA'];
    const p = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(100 + Math.random() * 900);
    const newSeed = `seed-${p}-${num}`;
    onSelectLevel(newSeed);
    onClose();
  };

  const handleLaunchCustomSeed = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customSeedInput.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '-');
    if (!clean) return;
    onSelectLevel(`seed-${clean}`);
    onClose();
  };

  const handleCopyLink = () => {
    const seed = customSeedInput.trim().toUpperCase() || currentLevelId.replace(/^(daily-|seed-|custom-|random-)/, '');
    const url = `${window.location.origin}/?seed=${encodeURIComponent(seed)}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 pointer-events-auto">
      <div className="glass-panel-elevated w-full max-w-2xl max-h-[85vh] rounded-2xl p-6 sm:p-7 flex flex-col shadow-2xl border border-white/10 overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 text-zinc-300 flex items-center justify-center">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white tracking-tight">{t.courseSelector}</h2>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/[0.06] text-zinc-300 border border-white/10">
                  Daily Seed
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-normal">{t.courseSelectorDesc}</p>
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

        {/* Scrollable list */}
        <div className="overflow-y-auto my-4 space-y-4 pr-1 custom-scrollbar">
          {/* Quick Actions: Track Studio, Random Level & Friend Challenge */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* 3D Track Studio Card */}
            {onOpenEditor && (
              <button
                onClick={() => {
                  onClose();
                  onOpenEditor();
                }}
                className="md:col-span-2 p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 via-indigo-950/30 to-purple-950/40 hover:from-cyan-900/50 hover:to-purple-900/50 border border-cyan-400/30 hover:border-cyan-400/60 transition text-left flex items-center justify-between group cursor-pointer active:scale-[0.99] shadow-lg shadow-cyan-950/20"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 flex items-center justify-center group-hover:scale-105 transition-transform shadow-md shadow-cyan-500/20">
                    <PenTool className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm tracking-tight flex items-center space-x-2">
                      <span>{t.trackEditor}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 font-mono font-bold uppercase">
                        3D Studio
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400 font-normal">{t.trackEditorDesc}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-cyan-300 group-hover:translate-x-1 transition-transform">
                  →
                </span>
              </button>
            )}

            {/* Random Track Roll */}
            <button
              onClick={handleRollRandom}
              className="p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/15 transition text-left flex items-center space-x-3.5 group cursor-pointer active:scale-[0.99]"
            >
              <div className="w-10 h-10 rounded-lg bg-white/[0.06] text-zinc-200 border border-white/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Dices className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm tracking-tight flex items-center space-x-1.5">
                  <span>{t.randomTrack}</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-zinc-300 border border-white/10 font-mono">
                    INF
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 font-normal">{t.generateRandom}</p>
              </div>
            </button>

            {/* Friend Challenge Card */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-300">
                  <Swords className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{t.challengeFriend}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="text-[11px] font-medium text-zinc-300 hover:text-white flex items-center space-x-1 px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/10 transition active:scale-95 cursor-pointer"
                  title={t.copyLink}
                >
                  <Share2 className="w-3 h-3" />
                  <span>{copiedLink ? t.linkCopied : t.copyLink}</span>
                </button>
              </div>

              <form onSubmit={handleLaunchCustomSeed} className="flex space-x-2">
                <input
                  type="text"
                  value={customSeedInput}
                  onChange={(e) => setCustomSeedInput(e.target.value)}
                  placeholder={t.enterSeed}
                  className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 font-mono uppercase"
                />
                <button
                  type="submit"
                  disabled={!customSeedInput.trim()}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-200 disabled:opacity-40 disabled:hover:bg-white text-zinc-950 font-bold text-xs transition active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  {t.playSeed}
                </button>
              </form>
            </div>
          </div>

          {/* Today's Daily Section */}
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.todayRace}</span>
            </div>

            {dailyLevelId && (
              <button
                onClick={() => {
                  onSelectLevel(dailyLevelId);
                  onClose();
                }}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-150 flex items-center justify-between cursor-pointer active:scale-[0.99] ${
                  currentLevelId === dailyLevelId
                    ? 'bg-zinc-800/80 border-emerald-500/40 ring-1 ring-emerald-500/30'
                    : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.08] hover:border-white/15'
                }`}
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-lg bg-amber-400/10 text-amber-400 border border-amber-400/20 flex items-center justify-center">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="font-bold text-white text-base tracking-tight">
                        {cleanName(dailyName || 'Daily Challenge')}
                      </span>
                      <span className="flex items-center space-x-1 whitespace-nowrap shrink-0 text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>{t.activeToday}</span>
                      </span>
                      <span className="flex items-center space-x-1 whitespace-nowrap shrink-0 text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        <Flame className="w-3 h-3 text-amber-400" />
                        <span>{t.hardTrack}</span>
                      </span>
                    </div>
                    <span className="text-xs text-zinc-400 font-mono">
                      Seed: {dailyDate || 'today'}
                    </span>
                  </div>
                </div>

                {currentLevelId === dailyLevelId && (
                  <div className="flex items-center space-x-1.5 whitespace-nowrap shrink-0 text-xs font-semibold text-emerald-300 bg-emerald-500/15 px-3 py-1 rounded-lg border border-emerald-500/30">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>{t.selected}</span>
                  </div>
                )}
              </button>
            )}
          </div>

          {/* Community Published Tracks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t.communityTracks}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {communityTracks.length}
                </span>
              </div>
              {onOpenEditor && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenEditor();
                  }}
                  className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 transition cursor-pointer"
                >
                  + {t.trackEditor}
                </button>
              )}
            </div>

            {communityLoading ? (
              <div className="py-6 flex flex-col items-center justify-center space-y-2 text-zinc-400 text-xs">
                <div className="w-5 h-5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
              </div>
            ) : communityTracks.length === 0 ? (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center text-xs text-zinc-400">
                {lang === 'fr'
                  ? 'Aucun circuit communautaire pour l’instant. Soyez le premier à en publier un dans l’Éditeur !'
                  : 'No community tracks yet. Be the first to build and publish one!'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {communityTracks.map((ct) => (
                  <button
                    key={ct.id}
                    onClick={() => {
                      onSelectLevel(ct.id);
                      onClose();
                    }}
                    className={`p-3 rounded-xl border text-left transition flex items-center justify-between group cursor-pointer active:scale-[0.99] ${
                      currentLevelId === ct.id
                        ? 'bg-zinc-800/80 border-cyan-400/50 ring-1 ring-cyan-400/40'
                        : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.08] hover:border-white/15'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white text-sm truncate">
                          {ct.name}
                        </span>
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                          {ct.pieceCount}p
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-[11px] text-zinc-400 mt-0.5">
                        <span className="truncate">{ct.authorName}</span>
                        <span>•</span>
                        <span className="font-mono text-cyan-300 font-semibold">
                          ⏱ {ct.clearTimeSeconds.toFixed(2)}s
                        </span>
                      </div>
                    </div>
                    {currentLevelId === ct.id ? (
                      <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                    ) : (
                      <span className="text-xs text-zinc-500 group-hover:text-white transition shrink-0">
                        →
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Past 7 Days Archive */}
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <span>{t.pastArchive}</span>
            </div>

            {loading ? (
              <div className="py-8 flex flex-col items-center justify-center space-y-2 text-zinc-400 text-xs">
                <div className="w-6 h-6 rounded-full border-2 border-zinc-400 border-t-white animate-spin" />
                <span className="font-mono">{t.loadingArchive}</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {archive
                  .filter((item) => item.levelId !== dailyLevelId)
                  .map((item) => {
                    const isSelected = currentLevelId === item.levelId;
                    return (
                      <button
                        key={item.levelId}
                        onClick={() => {
                          onSelectLevel(item.levelId);
                          onClose();
                        }}
                        className={`p-3 rounded-xl border text-left transition-all duration-150 flex items-center justify-between cursor-pointer active:scale-[0.99] ${
                          isSelected
                            ? 'bg-zinc-800/80 border-emerald-500/40 ring-1 ring-emerald-500/30'
                            : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.06] hover:border-white/12'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block border border-white/20"
                              style={{ backgroundColor: item.palette.trackPrimary }}
                            />
                            <span className="font-semibold text-sm text-zinc-100">
                              {cleanName(item.name)}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 font-mono pl-4.5">
                            {item.date}
                          </p>
                        </div>

                        {isSelected && (
                          <div className="flex items-center space-x-1 text-xs font-semibold text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-500/30">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          </div>
                        )}
                      </button>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Trial Track (Baseline benchmark) */}
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
              <span>{t.baselineTrial}</span>
            </div>
            <button
              onClick={() => {
                onSelectLevel('trial-level-1');
                onClose();
              }}
              className={`w-full text-left p-3.5 rounded-xl border transition-all duration-150 flex items-center justify-between cursor-pointer active:scale-[0.99] ${
                currentLevelId === 'trial-level-1' || currentLevelId === 'daily-2026-10-09-seed01'
                  ? 'bg-zinc-800/80 border-emerald-500/40 ring-1 ring-emerald-500/30'
                  : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.06] hover:border-white/12'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="w-3 h-3 rounded-full bg-emerald-400 border border-white/20" />
                <div>
                  <div className="font-semibold text-white text-sm">Neon Dawn</div>
                  <p className="text-xs text-zinc-400 font-normal">
                    {t.baselineDesc}
                  </p>
                </div>
              </div>

              {(currentLevelId === 'trial-level-1' || currentLevelId === 'daily-2026-10-09-seed01') && (
                <div className="flex items-center space-x-1.5 whitespace-nowrap shrink-0 text-xs font-semibold text-emerald-300 bg-emerald-500/15 px-3 py-1 rounded-lg border border-emerald-500/30">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{t.selected}</span>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/[0.08] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition active:scale-95 cursor-pointer border border-white/10"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
