import React from 'react';
import { Calendar, Check, Compass, Sparkles, X } from 'lucide-react';
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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-2xl max-h-[85vh] rounded-3xl p-6 md:p-8 flex flex-col shadow-2xl border border-white/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">{t.courseSelector}</h2>
              <p className="text-xs text-slate-400">{t.courseSelectorDesc}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable list */}
        <div className="overflow-y-auto my-4 space-y-4 pr-1">
          {/* Today's Daily Section */}
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-amber-300 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t.todayRace}</span>
            </div>

            {dailyLevelId && (
              <button
                onClick={() => {
                  onSelectLevel(dailyLevelId);
                  onClose();
                }}
                className={`w-full text-left p-4 rounded-2xl border transition flex items-center justify-between ${
                  currentLevelId === dailyLevelId
                    ? 'bg-gradient-to-r from-indigo-950/80 to-purple-950/80 border-indigo-400/80 shadow-lg shadow-indigo-500/10'
                    : 'bg-white/5 hover:bg-white/10 border-white/10'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-amber-400/20 text-amber-300">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-base">
                        {dailyName || 'Daily Challenge'}
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {t.activeToday}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      Seed: {dailyDate || 'today'}
                    </span>
                  </div>
                </div>

                {currentLevelId === dailyLevelId && (
                  <div className="flex items-center space-x-1.5 text-xs font-semibold text-indigo-300">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>{t.selected}</span>
                  </div>
                )}
              </button>
            )}
          </div>

          {/* Past 7 Days Archive */}
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>{t.pastArchive}</span>
            </div>

            {loading ? (
              <div className="py-6 flex flex-col items-center justify-center space-y-2 text-slate-400 text-xs">
                <div className="w-6 h-6 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                <span>{t.loadingArchive}</span>
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
                        className={`p-3 rounded-2xl border text-left transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-indigo-950/70 border-indigo-400/80 shadow'
                            : 'bg-white/5 hover:bg-white/10 border-white/5'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block shadow-sm"
                              style={{ backgroundColor: item.palette.trackPrimary }}
                            />
                            <span className="font-semibold text-sm text-white">
                              {item.name}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono pl-4.5">
                            {item.date}
                          </p>
                        </div>

                        {isSelected && (
                          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Trial Track (Baseline benchmark) */}
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              <span>{t.baselineTrial}</span>
            </div>
            <button
              onClick={() => {
                onSelectLevel('trial-level-1');
                onClose();
              }}
              className={`w-full text-left p-3.5 rounded-2xl border transition flex items-center justify-between ${
                currentLevelId === 'trial-level-1' || currentLevelId === 'daily-2026-10-09-seed01'
                  ? 'bg-indigo-950/70 border-indigo-400/80 shadow'
                  : 'bg-white/5 hover:bg-white/10 border-white/5'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="w-3 h-3 rounded-full bg-indigo-500 shadow-sm" />
                <div>
                  <div className="font-bold text-white text-sm">Neon Dawn</div>
                  <p className="text-xs text-slate-400">
                    {t.baselineDesc}
                  </p>
                </div>
              </div>

              {(currentLevelId === 'trial-level-1' || currentLevelId === 'daily-2026-10-09-seed01') && (
                <div className="flex items-center space-x-1.5 text-xs font-semibold text-indigo-300">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{t.selected}</span>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-semibold text-white transition"
          >
            {t.close}
          </button>
        </div>

      </div>
    </div>
  );
};
