import React, { useState, useEffect } from 'react';
import { User, Smartphone, Key, Check, AlertCircle, Copy, Globe, X } from 'lucide-react';
import { UserProfile, updateDisplayName, createSyncCode, claimSyncCode } from '../api/client.js';
import { Language, TRANSLATIONS } from '../i18n/translations.js';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  onProfileUpdated: (updated: UserProfile) => void;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onProfileUpdated,
  lang,
  onLanguageChange,
}) => {
  const t = TRANSLATIONS[lang];

  // Display Name editing
  const [nameInput, setNameInput] = useState(userProfile?.displayName || '');
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [nameError, setNameError] = useState('');

  // Sync Code generation
  const [generatedCode, setGeneratedCode] = useState<{
    code: string;
    expiresAt: string;
    expiresInSeconds: number;
  } | null>(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Sync Code claim
  const [claimInput, setClaimInput] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [claimError, setClaimError] = useState('');

  useEffect(() => {
    if (userProfile?.displayName) {
      setNameInput(userProfile.displayName);
    }
  }, [userProfile?.displayName]);

  if (!isOpen) return null;

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    setIsSavingName(true);
    setNameError('');
    setNameSuccess(false);

    const updated = await updateDisplayName(nameInput.trim());
    setIsSavingName(false);
    if (updated) {
      onProfileUpdated(updated);
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 3000);
    } else {
      setNameError('Failed to update name (2-24 characters required)');
    }
  };

  const handleGenerateCode = async () => {
    setIsGeneratingCode(true);
    const result = await createSyncCode();
    setIsGeneratingCode(false);
    if (result) {
      setGeneratedCode(result);
    }
  };

  const handleCopyCode = () => {
    if (!generatedCode) return;
    navigator.clipboard.writeText(generatedCode.code).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    });
  };

  const handleClaimCode = async () => {
    if (!claimInput.trim()) return;
    setIsClaiming(true);
    setClaimError('');
    setClaimSuccess(false);

    const res = await claimSyncCode(claimInput.trim());
    setIsClaiming(false);
    if (res.success && res.user) {
      onProfileUpdated(res.user);
      setClaimSuccess(true);
      setClaimInput('');
      setTimeout(() => setClaimSuccess(false), 3000);
    } else {
      setClaimError(res.error || t.linkError);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 pointer-events-auto">
      <div className="glass-panel w-full max-w-xl max-h-[88vh] rounded-3xl p-6 md:p-8 flex flex-col shadow-2xl border border-white/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">{t.profileTitle}</h2>
              <p className="text-xs text-slate-400">{t.profileDesc}</p>
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
        <div className="overflow-y-auto my-4 space-y-6 pr-1">
          {/* Language Selector */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
              <Globe className="w-4 h-4 text-sky-400" />
              <span>Language / Langue</span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => onLanguageChange('en')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  lang === 'en'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                🇬🇧 English
              </button>
              <button
                onClick={() => onLanguageChange('fr')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  lang === 'fr'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                🇫🇷 Français
              </button>
            </div>
          </div>

          {/* Edit Display Name */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
              <span>{t.displayNameLabel}</span>
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={24}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/15 text-sm text-white focus:outline-none focus:border-indigo-400 font-medium"
              />
              <button
                onClick={handleSaveName}
                disabled={isSavingName}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-xs text-white shadow transition disabled:opacity-50"
              >
                {isSavingName ? t.saving : t.saveName}
              </button>
            </div>
            {nameSuccess && (
              <div className="flex items-center space-x-1.5 text-xs text-emerald-400">
                <Check className="w-3.5 h-3.5" />
                <span>{t.nameUpdated}</span>
              </div>
            )}
            {nameError && (
              <div className="flex items-center space-x-1.5 text-xs text-rose-400">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{nameError}</span>
              </div>
            )}
            {userProfile?.createdAt && (
              <p className="text-[11px] text-slate-500">
                {t.accountCreated}: {new Date(userProfile.createdAt).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Cross-Device Sync */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4">
            <div className="flex items-center space-x-2">
              <Smartphone className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white">{t.syncTitle}</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{t.syncDesc}</p>

            {/* 1. Generate Sync Code */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  {t.generateCode}
                </span>
                <button
                  onClick={handleGenerateCode}
                  disabled={isGeneratingCode}
                  className="px-3.5 py-1.5 rounded-lg bg-purple-600/80 hover:bg-purple-500 text-xs font-bold text-white shadow transition disabled:opacity-50"
                >
                  {isGeneratingCode ? '...' : t.generateCode}
                </button>
              </div>

              {generatedCode && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-purple-950/40 border border-purple-500/30">
                  <div>
                    <div className="font-mono text-2xl font-black tracking-widest text-purple-300">
                      {generatedCode.code}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {t.codeExpiresIn} 10 min
                    </div>
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 transition"
                  >
                    {copiedCode ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* 2. Claim Code on this device */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/10 space-y-2.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Key className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t.claimCodeLabel}</span>
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder={t.claimCodePlaceholder}
                  value={claimInput}
                  onChange={(e) => setClaimInput(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-white/15 text-sm text-white font-mono tracking-wider focus:outline-none focus:border-indigo-400"
                />
                <button
                  onClick={handleClaimCode}
                  disabled={isClaiming || claimInput.length < 6}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-xs text-white shadow transition disabled:opacity-50"
                >
                  {isClaiming ? t.linking : t.claimButton}
                </button>
              </div>

              {claimSuccess && (
                <div className="flex items-center space-x-1.5 text-xs text-emerald-400">
                  <Check className="w-3.5 h-3.5" />
                  <span>{t.linkSuccess}</span>
                </div>
              )}
              {claimError && (
                <div className="flex items-center space-x-1.5 text-xs text-rose-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{claimError}</span>
                </div>
              )}
            </div>
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
