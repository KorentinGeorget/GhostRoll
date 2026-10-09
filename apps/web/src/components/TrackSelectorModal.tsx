import React, { useState } from 'react';
import { Calendar, Check, Compass, Dices, Flame, Sparkles, Swords, Share2, X } from 'lucide-react';
import { ArchiveItem } from '../api/client.js';
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
  lang = 'en',
}) => {
  const t = TRANSLATIONS[lang];
  const [customSeedInput, setCustomSeedInput] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl animate-in fade-in duration-200 pointer-events-auto">
      <div className="glass-panel-elevated w-full max-w-2xl max-h-[85vh] rounded-3xl p-6 md:p-8 flex flex-col shadow-2xl border border-white/10 overflow-hidden relative">
        {/* Top ambient glow */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 via-indigo-400 to-fuchsia-500" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500/25 to-sky-500/10 text-sky-400 border border-sky-500/30 shadow-lg shadow-sky-500/15">
              <Compass className="w-6 h-6 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl md:text-2xl font-black text-white tracking-wide">{t.courseSelector}</h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  Daily Seed
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">{t.courseSelectorDesc}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition active:scale-90 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable list */}
        <div className="overflow-y-auto my-4 space-y-4 pr-1.5 custom-scrollbar">
          {/* Quick Actions: Random Level & Friend Challenge */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Random Track Roll */}
            <button
              onClick={handleRollRandom}
              className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/70 via-indigo-950/60 to-slate-900/80 hover:from-purple-900/80 hover:to-indigo-900/80 border border-purple-500/30 hover:border-purple-400/60 transition shadow-lg text-left flex items-center space-x-3.5 group cursor-pointer active:scale-[0.98]"
            >
              <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/40 group-hover:rotate-12 transition-transform shadow-md">
                <Dices className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-white text-sm md:text-base tracking-tight flex items-center space-x-1.5">
                  <span>{t.randomTrack}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/40 font-mono">
                    INF
                  </span>
                </h3>
                <p className="text-xs text-slate-400 font-medium">{t.generateRandom}</p>
              </div>
            </button>

            {/* Friend Challenge Card */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-cyan-300">
                  <Swords className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{t.challengeFriend}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="text-[11px] font-bold text-cyan-300 hover:text-cyan-200 flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 hover:bg-cyan-500/25 transition active:scale-95 cursor-pointer"
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
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono uppercase"
                />
                <button
                  type="submit"
                  disabled={!customSeedInput.trim()}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:hover:bg-cyan-500 text-slate-950 font-black text-xs transition active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  {t.playSeed}
                </button>
              </form>
            </div>
          </div>

          {/* Today's Daily Section */}
          <div>
            <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-amber-300 mb-2.5">
              <Sparkles className="w-3.5 h-3.5 drop-shadow-[0_0_6px_rgba(252,211,77,0.6)]" />
              <span>{t.todayRace}</span>
            </div>

            {dailyLevelId && (
              <button
                onClick={() => {
                  onSelectLevel(dailyLevelId);
                  onClose();
                }}
                className={`w-full text-left p-4.5 rounded-2xl border transition-all duration-200 flex items-center justify-between cursor-pointer active:scale-[0.99] ${
                  currentLevelId === dailyLevelId
                    ? 'bg-gradient-to-r from-indigo-950/90 via-purple-950/80 to-slate-900/90 border-indigo-400 shadow-xl shadow-indigo-500/20 ring-1 ring-indigo-500/40'
                    : 'bg-slate-900/40 hover:bg-slate-900/70 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center space-x-3.5">
                  <div className="p-3 rounded-2xl bg-amber-400/20 text-amber-300 border border-amber-400/30 shadow-md">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="font-black text-white text-base md:text-lg tracking-tight">
                        {cleanName(dailyName || 'Daily Challenge')}
                      </span>
                      <span className="flex items-center space-x-1 whitespace-nowrap shrink-0 text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>{t.activeToday}</span>
                      </span>
                      <span className="flex items-center space-x-1 whitespace-nowrap shrink-0 text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        <Flame className="w-3 h-3 text-rose-400" />
                        <span>{t.hardTrack}</span>
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      Seed: {dailyDate || 'today'}
                    </span>
                  </div>
                </div>

                {currentLevelId === dailyLevelId && (
                  <div className="flex items-center space-x-1.5 whitespace-nowrap shrink-0 text-xs font-bold text-emerald-300 bg-emerald-500/15 px-3 py-1 rounded-xl border border-emerald-500/30">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>{t.selected}</span>
                  </div>
                )}
              </button>
            )}
          </div>

          {/* Past 7 Days Archive */}
          <div>
            <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-slate-400 mb-2.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>{t.pastArchive}</span>
            </div>

            {loading ? (
              <div className="py-8 flex flex-col items-center justify-center space-y-2 text-slate-400 text-xs">
                <div className="w-8 h-8 rounded-full border-3 border-indigo-400 border-t-transparent animate-spin" />
                <span className="animate-pulse font-medium">{t.loadingArchive}</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                        className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex items-center justify-between cursor-pointer active:scale-[0.98] ${
                          isSelected
                            ? 'bg-indigo-950/80 border-indigo-400 shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-500/30'
                            : 'bg-slate-900/40 hover:bg-slate-900/70 border-white/5 hover:border-white/15'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span
                              className="w-3 h-3 rounded-full inline-block shadow-md border border-white/20"
                              style={{ backgroundColor: item.palette.trackPrimary }}
                            />
                            <span className="font-bold text-sm text-white">
                              {cleanName(item.name)}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono pl-5">
                            {item.date}
                          </p>
                        </div>

                        {isSelected && (
                          <div className="flex items-center space-x-1 text-xs font-bold text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-lg border border-emerald-500/30">
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
            <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-slate-400 mb-2.5">
              <span>{t.baselineTrial}</span>
            </div>
            <button
              onClick={() => {
                onSelectLevel('trial-level-1');
                onClose();
              }}
              className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between cursor-pointer active:scale-[0.99] ${
                currentLevelId === 'trial-level-1' || currentLevelId === 'daily-2026-10-09-seed01'
                  ? 'bg-indigo-950/80 border-indigo-400 shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-500/30'
                  : 'bg-slate-900/40 hover:bg-slate-900/70 border-white/5 hover:border-white/15'
              }`}
            >
              <div className="flex items-center space-x-3.5">
                <span className="w-3.5 h-3.5 rounded-full bg-cyan-400 shadow-md shadow-cyan-400/50 border border-white/30" />
                <div>
                  <div className="font-bold text-white text-sm md:text-base">Neon Dawn</div>
                  <p className="text-xs text-slate-400 font-medium">
                    {t.baselineDesc}
                  </p>
                </div>
              </div>

              {(currentLevelId === 'trial-level-1' || currentLevelId === 'daily-2026-10-09-seed01') && (
                <div className="flex items-center space-x-1.5 whitespace-nowrap shrink-0 text-xs font-bold text-emerald-300 bg-emerald-500/15 px-3 py-1 rounded-xl border border-emerald-500/30">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{t.selected}</span>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3.5 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-bold text-white transition active:scale-95 cursor-pointer border border-white/10 shadow-sm"
          >
            {t.close}
          </button>
        </div>

      </div>
    </div>
  );
};
