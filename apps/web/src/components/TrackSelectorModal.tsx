import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Check,
  Compass,
  Dices,
  Flame,
  Sparkles,
  Swords,
  Share2,
  X,
  PenTool,
  Users,
  Trophy,
  Trash2,
  Search,
  Star,
  Clock,
  Zap,
} from 'lucide-react';
import {
  ArchiveItem,
  CommunityTrackItem,
  fetchCommunityTracks,
  deleteCustomTrack,
  UserProfile,
} from '../api/client.js';
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
  userProfile?: UserProfile | null;
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
  userProfile,
  lang = 'en',
}) => {
  const t = TRANSLATIONS[lang];
  const [customSeedInput, setCustomSeedInput] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [communityTracks, setCommunityTracks] = useState<CommunityTrackItem[]>([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [communityTab, setCommunityTab] = useState<'all' | 'my'>('all');
  const [communitySort, setCommunitySort] = useState<'recent' | 'popular' | 'fastest'>('recent');
  const [communitySearch, setCommunitySearch] = useState('');
  const [copiedTrackId, setCopiedTrackId] = useState<string | null>(null);

  const loadCommunityTracks = useCallback(() => {
    setCommunityLoading(true);
    fetchCommunityTracks({
      authorId: communityTab === 'my' && userProfile ? userProfile.id : undefined,
      sort: communitySort,
      search: communitySearch.trim() || undefined,
    })
      .then((tracks) => setCommunityTracks(tracks))
      .finally(() => setCommunityLoading(false));
  }, [communityTab, communitySort, communitySearch, userProfile]);

  useEffect(() => {
    if (isOpen) {
      loadCommunityTracks();
    }
  }, [isOpen, loadCommunityTracks]);

  const handleCopyTrackLink = (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/?track=${encodeURIComponent(trackId)}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedTrackId(trackId);
        setTimeout(() => setCopiedTrackId(null), 2500);
      });
    }
  };

  const handleDeleteTrack = async (trackId: string, trackName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`${t.confirmDeleteTrack}\n("${trackName}")`)) return;
    const ok = await deleteCustomTrack(trackId);
    if (ok) {
      loadCommunityTracks();
    } else {
      alert(lang === 'fr' ? 'Impossible de supprimer ce circuit' : 'Failed to delete track');
    }
  };

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
          <div className="space-y-3">
            {/* Header & Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-white/[0.06]">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setCommunityTab('all')}
                  className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 cursor-pointer ${
                    communityTab === 'all'
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>{t.allTracks}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-zinc-300">
                    {communityTracks.length}
                  </span>
                </button>

                {userProfile && (
                  <button
                    type="button"
                    onClick={() => setCommunityTab('my')}
                    className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 cursor-pointer ${
                      communityTab === 'my'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <Star className="w-3.5 h-3.5" />
                    <span>{t.myTracks}</span>
                  </button>
                )}
              </div>

              {onOpenEditor && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenEditor();
                  }}
                  className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 transition cursor-pointer flex items-center space-x-1 self-start sm:self-auto"
                >
                  <PenTool className="w-3 h-3" />
                  <span>+ {t.trackEditor}</span>
                </button>
              )}
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={communitySearch}
                  onChange={(e) => setCommunitySearch(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="w-full bg-black/40 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400/50"
                />
              </div>

              {/* Sort Pills */}
              <div className="flex items-center space-x-1 shrink-0 bg-white/[0.03] p-1 rounded-lg border border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setCommunitySort('recent')}
                  title={t.sortRecent}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium flex items-center space-x-1 transition cursor-pointer ${
                    communitySort === 'recent'
                      ? 'bg-white/15 text-white font-bold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>{t.sortRecent}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCommunitySort('popular')}
                  title={t.sortPopular}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium flex items-center space-x-1 transition cursor-pointer ${
                    communitySort === 'popular'
                      ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Flame className="w-3 h-3 text-amber-400" />
                  <span>{t.sortPopular}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCommunitySort('fastest')}
                  title={t.sortFastest}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium flex items-center space-x-1 transition cursor-pointer ${
                    communitySort === 'fastest'
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Zap className="w-3 h-3 text-cyan-400" />
                  <span>{t.sortFastest}</span>
                </button>
              </div>
            </div>

            {/* List of Community Tracks */}
            {communityLoading ? (
              <div className="py-8 flex flex-col items-center justify-center space-y-2 text-zinc-400 text-xs">
                <div className="w-5 h-5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
              </div>
            ) : communityTracks.length === 0 ? (
              <div className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center space-y-2">
                <p className="text-xs text-zinc-400">
                  {communityTab === 'my'
                    ? t.noMyTracks
                    : communitySearch
                    ? (lang === 'fr' ? 'Aucun circuit trouvé pour cette recherche.' : 'No tracks found for this search.')
                    : (lang === 'fr'
                        ? 'Aucun circuit communautaire pour l’instant. Soyez le premier à en publier un dans l’Éditeur !'
                        : 'No community tracks yet. Be the first to build and publish one!')}
                </p>
                {communityTab === 'my' && onOpenEditor && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenEditor();
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-bold text-xs transition active:scale-95 shadow-md cursor-pointer"
                  >
                    {t.openStudioToCreate}
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                {communityTracks.map((ct) => {
                  const isOwner = userProfile && ct.authorId === userProfile.id;
                  const isCurrent = currentLevelId === ct.id;

                  return (
                    <div
                      key={ct.id}
                      onClick={() => {
                        onSelectLevel(ct.id);
                        onClose();
                      }}
                      className={`p-3 rounded-xl border text-left transition flex items-center justify-between group cursor-pointer active:scale-[0.99] ${
                        isCurrent
                          ? 'bg-zinc-800/80 border-cyan-400/50 ring-1 ring-cyan-400/40'
                          : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.08] hover:border-white/15'
                      }`}
                    >
                      <div className="min-w-0 pr-2 flex-1">
                        <div className="flex items-center space-x-1.5 flex-wrap">
                          <span className="font-bold text-white text-sm truncate max-w-[140px]">
                            {ct.name}
                          </span>
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                            {ct.pieceCount}p
                          </span>
                          {isOwner && (
                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-cyan-500/25 text-cyan-300 border border-cyan-400/40 shrink-0 flex items-center space-x-0.5">
                              <Star className="w-2.5 h-2.5 fill-current" />
                              <span>{t.youBadge}</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 text-[11px] text-zinc-400 mt-1 flex-wrap">
                          <span className="truncate max-w-[90px] text-zinc-300">{ct.authorName}</span>
                          <span>•</span>
                          <span className="font-mono text-cyan-300 font-semibold">
                            ⏱ {ct.clearTimeSeconds.toFixed(2)}s
                          </span>
                          <span>•</span>
                          <span className="text-zinc-400 flex items-center space-x-0.5">
                            <Flame className="w-3 h-3 text-amber-400 inline" />
                            <span>{ct.playCount}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0">
                        {/* Copy Direct URL Link */}
                        <button
                          type="button"
                          onClick={(e) => handleCopyTrackLink(ct.id, e)}
                          title={copiedTrackId === ct.id ? t.trackLinkCopied : t.copyTrackLink}
                          className={`p-1.5 rounded-lg border transition cursor-pointer active:scale-95 ${
                            copiedTrackId === ct.id
                              ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/40'
                              : 'bg-white/[0.04] hover:bg-white/10 text-zinc-400 hover:text-white border-white/10'
                          }`}
                        >
                          {copiedTrackId === ct.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Share2 className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Delete button (owner only) */}
                        {isOwner && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteTrack(ct.id, ct.name, e)}
                            title={t.deleteTrack}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 transition cursor-pointer active:scale-95"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {isCurrent ? (
                          <Check className="w-4 h-4 text-cyan-400 ml-0.5" />
                        ) : (
                          <span className="text-xs text-zinc-500 group-hover:text-white transition ml-0.5">
                            →
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
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
