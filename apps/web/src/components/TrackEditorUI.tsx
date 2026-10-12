import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  AlertCircle,
  CloudUpload,
  Copy,
  Download,
  Flame,
  Layers,
  Palette,
  Play,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import {
  decodeCustomTrack,
  encodeCustomTrack,
  TRACK_PRESETS,
  TRACK_THEMES,
  TrackPieceType,
} from '@ghostroll/sim';
import { Language, TRANSLATIONS } from '../i18n/translations.js';

interface TrackEditorUIProps {
  pieces: TrackPieceType[];
  trackName: string;
  theme: string;
  onPiecesChange: (pieces: TrackPieceType[]) => void;
  onTrackNameChange: (name: string) => void;
  onThemeChange: (theme: string) => void;
  onTestDrive: () => void;
  onExit: () => void;
  lang?: Language;
  isVerified?: boolean;
  clearCheckSeconds?: number;
  onPublish?: () => Promise<void>;
  isPublishing?: boolean;
  publishedTrackId?: string | null;
}

const PIECE_CONFIGS: Array<{
  type: TrackPieceType;
  labelKey: keyof (typeof TRANSLATIONS)['en'];
  icon: string;
  hotkey: string;
  color: string;
  desc: string;
}> = [
  {
    type: 'straight',
    labelKey: 'pieceStraight',
    icon: '┃',
    hotkey: '1',
    color: 'from-blue-600/30 to-indigo-600/30 border-blue-500/40 text-blue-300',
    desc: '7m standard speedway',
  },
  {
    type: 'corner_right',
    labelKey: 'pieceCornerRight',
    icon: '┓',
    hotkey: '2',
    color: 'from-cyan-600/30 to-teal-600/30 border-cyan-500/40 text-cyan-300',
    desc: '90° clockwise with safety rail',
  },
  {
    type: 'corner_left',
    labelKey: 'pieceCornerLeft',
    icon: '┏',
    hotkey: '3',
    color: 'from-cyan-600/30 to-teal-600/30 border-cyan-500/40 text-cyan-300',
    desc: '90° counter-clockwise with rail',
  },
  {
    type: 'ramp',
    labelKey: 'pieceRamp',
    icon: '▲',
    hotkey: '4',
    color: 'from-amber-600/30 to-orange-600/30 border-amber-500/40 text-amber-300',
    desc: 'Smooth downhill elevation',
  },
  {
    type: 'drop',
    labelKey: 'pieceDrop',
    icon: '▼',
    hotkey: '5',
    color: 'from-red-600/30 to-rose-600/30 border-red-500/40 text-red-300',
    desc: 'Roller-coaster steep drop',
  },
  {
    type: 'booster',
    labelKey: 'pieceBooster',
    icon: '⚡',
    hotkey: '6',
    color: 'from-yellow-500/30 to-amber-600/30 border-yellow-400/50 text-yellow-300',
    desc: 'Turbo acceleration plate (+20m/s)',
  },
  {
    type: 'ice',
    labelKey: 'pieceIce',
    icon: '❄',
    hotkey: '7',
    color: 'from-sky-500/30 to-blue-600/30 border-sky-400/50 text-sky-200',
    desc: 'Ultra slick drift surface (friction 0.04)',
  },
  {
    type: 'jump_gap',
    labelKey: 'pieceJump',
    icon: '⤻',
    hotkey: '8',
    color: 'from-purple-600/30 to-fuchsia-600/30 border-purple-500/40 text-purple-300',
    desc: 'Launch lip + void gap + landing',
  },
  {
    type: 'bridge',
    labelKey: 'pieceBridge',
    icon: '╎',
    hotkey: '9',
    color: 'from-emerald-600/30 to-teal-600/30 border-emerald-500/40 text-emerald-300',
    desc: 'Narrow suspension catwalk',
  },
  {
    type: 'checkpoint',
    labelKey: 'pieceCheckpoint',
    icon: '⏱',
    hotkey: '0',
    color: 'from-sky-400/30 to-indigo-500/30 border-sky-300/40 text-sky-300',
    desc: 'Intermediate split timing line',
  },
];

export const TrackEditorUI: React.FC<TrackEditorUIProps> = ({
  pieces,
  trackName,
  theme,
  onPiecesChange,
  onTrackNameChange,
  onThemeChange,
  onTestDrive,
  onExit,
  lang = 'fr',
  isVerified = false,
  clearCheckSeconds,
  onPublish,
  isPublishing = false,
  publishedTrackId,
}) => {
  const t = TRANSLATIONS[lang];
  const [copiedLink, setCopiedLink] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [importCodeInput, setImportCodeInput] = useState('');
  const [importError, setImportError] = useState('');

  // Piece history for undo
  const [history, setHistory] = useState<TrackPieceType[][]>([]);

  // Add piece helper
  const addPiece = (type: TrackPieceType) => {
    setHistory((prev) => [...prev, [...pieces]]);
    onPiecesChange([...pieces, type]);
  };

  // Undo last piece
  const handleUndo = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory((h) => h.slice(0, -1));
      onPiecesChange(prev);
    } else if (pieces.length > 0) {
      onPiecesChange(pieces.slice(0, -1));
    }
  };

  // Clear all pieces
  const handleClear = () => {
    if (pieces.length === 0) return;
    setHistory((prev) => [...prev, [...pieces]]);
    onPiecesChange([]);
  };

  // Share link generator
  const handleShare = () => {
    const encoded = encodeCustomTrack({
      name: trackName,
      theme,
      pieces,
    });
    const url = `${window.location.origin}/?custom=${encodeURIComponent(encoded)}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      });
    }
  };

  // Import custom track from code string
  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    setImportError('');
    try {
      const clean = importCodeInput.trim();
      if (!clean) return;
      const decoded = decodeCustomTrack(clean);
      if (decoded.pieces.length === 0) {
        setImportError(lang === 'fr' ? 'Code de circuit invalide' : 'Invalid track code');
        return;
      }
      setHistory((prev) => [...prev, [...pieces]]);
      onTrackNameChange(decoded.name || trackName);
      onThemeChange(decoded.theme || theme);
      onPiecesChange(decoded.pieces);
      setShowExportModal(false);
      setImportCodeInput('');
    } catch {
      setImportError(lang === 'fr' ? 'Erreur de décodage' : 'Decoding failed');
    }
  };

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        onTestDrive();
        return;
      }

      if (e.key === 'Escape') {
        if (showPresets) setShowPresets(false);
        else if (showExportModal) setShowExportModal(false);
        else onExit();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }

      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Hotkeys 1 - 0
      const matched = PIECE_CONFIGS.find((cfg) => cfg.hotkey === e.key);
      if (matched) {
        e.preventDefault();
        addPiece(matched.type);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pieces, history, showPresets, showExportModal, onTestDrive, onExit]);

  // Estimated lap duration calculation
  const estSeconds = Math.max(3, Math.round((pieces.length * 1.5 + 4) * 10) / 10);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-5 select-none overflow-hidden z-30">
      {/* =========================================================================
          TOP TOOLBAR / HEADER
         ========================================================================= */}
      <header className="flex items-center justify-between w-full pointer-events-auto gap-2 flex-wrap">
        {/* Left: Back button & Title input */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={onExit}
            className="glass-panel px-3 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition active:scale-95 flex items-center space-x-1.5 cursor-pointer"
            title="Quitter l'éditeur (Échap)"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline text-xs font-semibold">
              {lang === 'fr' ? 'Retour' : 'Exit'}
            </span>
          </button>

          <div className="glass-panel rounded-xl px-3 py-1.5 flex items-center space-x-2 border border-white/10">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse inline-block shadow-sm shadow-cyan-400/50" />
            <input
              type="text"
              value={trackName}
              onChange={(e) => onTrackNameChange(e.target.value)}
              className="bg-transparent text-sm sm:text-base font-bold text-white focus:outline-none w-36 sm:w-56 tracking-tight placeholder-zinc-500"
              placeholder={t.trackName}
              maxLength={32}
            />
          </div>

          {/* Piece Counter Badge */}
          <div className="glass-panel hidden md:flex items-center space-x-2 px-3 py-2 rounded-xl text-xs text-zinc-300">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono font-medium">
              {pieces.length} {lang === 'fr' ? 'pièces' : 'pieces'} • ~{estSeconds}s
            </span>
          </div>

          {/* Clear Check Badge */}
          <div
            className={`glass-panel hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
              isVerified
                ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10'
                : 'border-amber-500/40 text-amber-300 bg-amber-500/10'
            }`}
            title={isVerified ? t.clearCheckPassed : t.clearCheckNeeded}
          >
            {isVerified ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t.clearCheckPassed}</span>
                {clearCheckSeconds && (
                  <span className="font-mono text-[10px] text-emerald-200">
                    ({clearCheckSeconds.toFixed(2)}s)
                  </span>
                )}
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] truncate max-w-[200px]">
                  {t.clearCheckNeeded}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right: Actions (Theme, Presets, Export/Share, Test Drive) */}
        <div className="flex items-center space-x-2 sm:space-x-2.5">
          {/* Theme Picker Dropdown */}
          <div className="relative">
            <select
              value={theme}
              onChange={(e) => onThemeChange(e.target.value)}
              className="glass-panel px-2.5 py-2 rounded-xl text-xs font-semibold text-zinc-200 bg-zinc-900/80 border border-white/10 focus:outline-none cursor-pointer hover:border-cyan-400/40 transition appearance-none pr-7 pl-8"
              aria-label={t.theme}
            >
              {Object.keys(TRACK_THEMES).map((k) => (
                <option key={k} value={k} className="bg-zinc-900 text-white">
                  {TRACK_THEMES[k].name}
                </option>
              ))}
            </select>
            <Palette className="w-3.5 h-3.5 text-cyan-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <span className="text-[10px] text-zinc-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
              ▼
            </span>
          </div>

          {/* Presets Button */}
          <div className="relative">
            <button
              onClick={() => setShowPresets((v) => !v)}
              className="glass-panel px-3 py-2 rounded-xl text-xs font-semibold text-zinc-200 hover:text-white hover:bg-white/10 transition active:scale-95 flex items-center space-x-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">{t.presets}</span>
            </button>

            {showPresets && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl glass-panel-elevated p-2 shadow-2xl border border-white/10 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-2 text-[11px] font-mono uppercase text-zinc-400 border-b border-white/10">
                  {lang === 'fr' ? 'Modèles prédéfinis' : 'Starter Templates'}
                </div>
                {TRACK_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setHistory((prev) => [...prev, [...pieces]]);
                      onTrackNameChange(preset.name);
                      onThemeChange(preset.theme);
                      onPiecesChange(preset.pieces);
                      setShowPresets(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs text-zinc-200 hover:bg-white/10 hover:text-white transition flex items-center justify-between cursor-pointer"
                  >
                    <span>{preset.name}</span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {preset.pieces.length}p
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Export / Import Modal Trigger */}
          <button
            onClick={() => setShowExportModal(true)}
            className="glass-panel px-3 py-2 rounded-xl text-xs font-semibold text-zinc-200 hover:text-white hover:bg-white/10 transition active:scale-95 flex items-center space-x-1.5 cursor-pointer"
            title={t.exportImport}
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden md:inline">{t.exportImport}</span>
          </button>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="glass-panel px-3 py-2 rounded-xl text-xs font-semibold text-cyan-300 hover:text-cyan-200 hover:bg-cyan-500/10 transition active:scale-95 flex items-center space-x-1.5 border border-cyan-500/30 cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">
                  {lang === 'fr' ? 'Copié !' : 'Copied!'}
                </span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>{t.shareTrack}</span>
              </>
            )}
          </button>

          {/* Publish to Community Button */}
          {onPublish && (
            <button
              onClick={onPublish}
              disabled={!isVerified || isPublishing}
              className={`glass-panel px-3 py-2 rounded-xl text-xs font-semibold transition active:scale-95 flex items-center space-x-1.5 cursor-pointer ${
                isVerified
                  ? 'border-indigo-400/50 bg-indigo-500/20 text-indigo-200 hover:bg-indigo-500/30 hover:text-white shadow-md shadow-indigo-500/20'
                  : 'opacity-40 cursor-not-allowed text-zinc-500 border-white/5'
              }`}
              title={isVerified ? t.publishToCommunity : t.clearCheckNeeded}
            >
              <CloudUpload className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">
                {isPublishing
                  ? t.publishing
                  : publishedTrackId
                  ? lang === 'fr'
                    ? 'Publié ✓'
                    : 'Published ✓'
                  : t.publishToCommunity}
              </span>
            </button>
          )}

          {/* Big Glowing TEST DRIVE Button */}
          <button
            onClick={onTestDrive}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-black text-xs sm:text-sm tracking-wide shadow-lg shadow-emerald-500/25 flex items-center space-x-2 transition active:scale-95 cursor-pointer ring-2 ring-emerald-400/40 animate-pulse hover:animate-none"
          >
            <Play className="w-4 h-4 fill-zinc-950" />
            <span>{t.testDrive}</span>
            <span className="hidden sm:inline text-[10px] font-mono font-normal opacity-70">
              [Espace]
            </span>
          </button>
        </div>
      </header>

      {/* =========================================================================
          MIDDLE: TRACK TIMELINE BREADCRUMB STRIP
         ========================================================================= */}
      <div className="pointer-events-auto self-center w-full max-w-4xl px-2 my-auto">
        <div className="glass-panel rounded-2xl p-2.5 border border-white/10 shadow-2xl flex items-center space-x-2 overflow-x-auto custom-scrollbar">
          {/* Start Tile */}
          <div className="flex-shrink-0 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center space-x-1">
            <span>🏁</span>
            <span>{lang === 'fr' ? 'DÉPART' : 'START'}</span>
          </div>

          <span className="text-zinc-600 font-bold">→</span>

          {/* Sequence of placed pieces */}
          {pieces.map((p, idx) => {
            const cfg = PIECE_CONFIGS.find((c) => c.type === p);
            return (
              <React.Fragment key={idx}>
                <div
                  className={`flex-shrink-0 px-2 py-1 rounded-lg text-[11px] font-medium border bg-gradient-to-r flex items-center space-x-1 shadow-sm ${
                    cfg?.color || 'bg-white/10 text-white'
                  }`}
                >
                  <span className="font-mono opacity-60 text-[9px]">{idx + 1}</span>
                  <span>{cfg?.icon}</span>
                  <span className="font-semibold">{t[cfg?.labelKey || 'pieceStraight']}</span>
                </div>
                {idx < pieces.length - 1 && (
                  <span className="text-zinc-600 font-bold">→</span>
                )}
              </React.Fragment>
            );
          })}

          <span className="text-zinc-600 font-bold">→</span>

          {/* Finish Tile */}
          <div className="flex-shrink-0 px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] font-bold flex items-center space-x-1">
            <span>🏆</span>
            <span>{lang === 'fr' ? 'ARRIVÉE' : 'GOAL'}</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          BOTTOM TOOLBAR: PIECE PALETTE & ACTIONS
         ========================================================================= */}
      <footer className="pointer-events-auto flex flex-col items-center space-y-2 w-full">
        {/* Pieces Grid */}
        <div className="glass-panel-elevated rounded-2xl p-2 sm:p-2.5 border border-white/10 shadow-2xl w-full max-w-5xl">
          <div className="grid grid-cols-5 md:grid-cols-10 gap-1.5 sm:gap-2">
            {PIECE_CONFIGS.map((cfg) => (
              <button
                key={cfg.type}
                onClick={() => addPiece(cfg.type)}
                className={`relative p-2 sm:p-2.5 rounded-xl border bg-gradient-to-b flex flex-col items-center justify-center transition active:scale-90 hover:brightness-125 cursor-pointer ${cfg.color}`}
                title={`${t[cfg.labelKey]} — ${cfg.desc}`}
              >
                <span className="text-base sm:text-lg leading-none mb-1">{cfg.icon}</span>
                <span className="text-[10px] sm:text-[11px] font-bold text-center leading-tight truncate w-full">
                  {t[cfg.labelKey]}
                </span>
                <span className="hidden sm:inline-block absolute top-1 right-1.5 text-[9px] font-mono font-bold opacity-60">
                  {cfg.hotkey}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons: Undo, Clear, Quick Help */}
        <div className="flex items-center space-x-3 text-xs">
          <button
            onClick={handleUndo}
            disabled={pieces.length === 0}
            className="glass-panel px-3.5 py-1.5 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>
              {t.undo} <span className="font-mono text-[10px] text-zinc-500">[Z]</span>
            </span>
          </button>

          <button
            onClick={handleClear}
            disabled={pieces.length === 0}
            className="glass-panel px-3.5 py-1.5 rounded-xl text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t.clearAll}</span>
          </button>

          <div className="hidden md:flex items-center text-[11px] text-zinc-400 space-x-2">
            <span>•</span>
            <span>
              {lang === 'fr'
                ? 'Clic-gauche souris pour faire pivoter la caméra 3D, Molette pour zoomer'
                : 'Left-click drag to orbit 3D camera, Scroll wheel to zoom'}
            </span>
          </div>
        </div>
      </footer>

      {/* =========================================================================
          EXPORT / IMPORT MODAL
         ========================================================================= */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in pointer-events-auto">
          <div className="glass-panel-elevated w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-white/10 flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Download className="w-4 h-4 text-cyan-400" />
                <span>{t.exportImport}</span>
              </h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Export Code String */}
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">
                {lang === 'fr' ? 'Code de partage compact' : 'Compact Share Code'}
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={encodeCustomTrack({ name: trackName, theme, pieces })}
                  className="w-full glass-panel px-3 py-2 rounded-xl text-xs font-mono text-cyan-300 bg-black/40 border border-white/10 focus:outline-none"
                />
                <button
                  onClick={handleShare}
                  className="glass-panel px-3 py-2 rounded-xl text-xs font-bold text-white hover:bg-white/10 transition active:scale-95 flex items-center space-x-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{lang === 'fr' ? 'Copier' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Import Form */}
            <form onSubmit={handleImport} className="space-y-2 pt-2 border-t border-white/10">
              <label className="text-xs font-semibold text-zinc-300 block">
                {lang === 'fr'
                  ? 'Coller un code de circuit ou un lien'
                  : 'Paste track code or URL'}
              </label>
              <input
                type="text"
                value={importCodeInput}
                onChange={(e) => {
                  setImportCodeInput(e.target.value);
                  setImportError('');
                }}
                placeholder={
                  lang === 'fr'
                    ? 'Collez le code (ex: MonDéfi:cyberpunk:SMRBDILJGK)...'
                    : 'Paste code here...'
                }
                className="w-full glass-panel px-3 py-2 rounded-xl text-xs font-mono text-white bg-black/40 border border-white/10 focus:outline-none focus:border-cyan-400/50"
              />

              {importError && (
                <p className="text-xs text-rose-400 font-semibold">{importError}</p>
              )}

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs tracking-wide transition active:scale-95 flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{lang === 'fr' ? 'Charger le circuit' : 'Load Track'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
