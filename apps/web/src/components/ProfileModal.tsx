import React, { useState, useEffect } from 'react';
import { User, Smartphone, Key, Check, AlertCircle, Copy, Globe, X, LogOut } from 'lucide-react';
import { UserProfile, updateDisplayName, createSyncCode, claimSyncCode, fetchGoogleAuthUrl, logoutUser } from '../api/client.js';
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

  // Google OAuth
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

  const handleGoogleLogin = async () => {
    const authUrl = await fetchGoogleAuthUrl();
    if (authUrl?.url) {
      window.location.href = authUrl.url;
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const updated = await logoutUser();
    setIsLoggingOut(false);
    if (updated) {
      onProfileUpdated(updated);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl animate-in fade-in duration-200 pointer-events-auto">
      <div className="glass-panel-elevated w-full max-w-xl max-h-[88vh] rounded-3xl p-6 md:p-8 flex flex-col shadow-2xl border border-white/10 overflow-hidden relative">
        {/* Top ambient glow */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-400 to-pink-500" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500/25 to-purple-500/10 text-indigo-400 border border-indigo-500/30 shadow-lg shadow-indigo-500/15">
              <User className="w-6 h-6 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg md:text-xl font-black text-white tracking-wide">{t.profileTitle}</h2>
              </div>
              <p className="text-xs text-slate-400 font-medium">{t.profileDesc}</p>
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
        <div className="overflow-y-auto my-4 space-y-5 pr-1.5 custom-scrollbar">
          {/* Language Selector */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/40 border border-white/10 shadow-sm">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-300">
              <Globe className="w-4 h-4 text-cyan-400" />
              <span>Language / Langue</span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => onLanguageChange('en')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition active:scale-95 cursor-pointer ${
                  lang === 'en'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20 border border-indigo-400/50'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/5'
                }`}
              >
                🇬🇧 English
              </button>
              <button
                onClick={() => onLanguageChange('fr')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition active:scale-95 cursor-pointer ${
                  lang === 'fr'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20 border border-indigo-400/50'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/5'
                }`}
              >
                🇫🇷 Français
              </button>
            </div>
          </div>

          {/* Google Account Authentication */}
          <div className="p-4 md:p-5 rounded-2xl bg-slate-900/40 border border-white/10 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center p-1.5 shadow-sm">
                  <svg className="w-full h-full" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">{t.googleAuthTitle}</h3>
                  <p className="text-[11px] text-slate-400 font-medium">{t.googleAuthDesc}</p>
                </div>
              </div>
            </div>

            {userProfile?.isGoogleLinked ? (
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
                <div className="flex items-center space-x-3">
                  {userProfile.avatarUrl ? (
                    <img
                      src={userProfile.avatarUrl}
                      alt={userProfile.displayName}
                      className="w-10 h-10 rounded-full border border-emerald-400/50 shadow"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-600/30 text-emerald-300 font-black flex items-center justify-center">
                      {userProfile.displayName[0]}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-bold text-sm text-white">{userProfile.displayName}</span>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <span className="text-xs text-slate-400 font-mono">{userProfile.email}</span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-rose-500/20 hover:text-rose-300 text-xs font-bold text-slate-300 transition active:scale-95 cursor-pointer border border-white/10"
                >
                  {isLoggingOut ? t.disconnecting : t.disconnectGoogle}
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleLogin}
                className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-black text-xs md:text-sm shadow-lg transition active:scale-98 flex items-center justify-center space-x-2.5 cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{t.connectGoogle}</span>
              </button>
            )}
          </div>

          {/* Edit Display Name */}
          <div className="p-4 md:p-5 rounded-2xl bg-slate-900/40 border border-white/10 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                <span>{t.displayNameLabel}</span>
              </label>
              <span className="text-[11px] font-mono text-slate-400">
                {nameInput.length}/24
              </span>
            </div>
            <div className="flex space-x-2.5">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={24}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950/80 border border-white/15 text-sm text-white focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/25 font-bold transition"
              />
              <button
                onClick={handleSaveName}
                disabled={isSavingName}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-95 font-bold text-xs text-white shadow-lg shadow-indigo-500/20 transition disabled:opacity-50 cursor-pointer border border-indigo-400/40"
              >
                {isSavingName ? t.saving : t.saveName}
              </button>
            </div>
            {nameSuccess && (
              <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                <Check className="w-4 h-4" />
                <span>{t.nameUpdated}</span>
              </div>
            )}
            {nameError && (
              <div className="flex items-center space-x-1.5 text-xs font-bold text-rose-400 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                <AlertCircle className="w-4 h-4" />
                <span>{nameError}</span>
              </div>
            )}
            {userProfile?.createdAt && (
              <p className="text-[11px] text-slate-400 font-mono">
                {t.accountCreated}: {new Date(userProfile.createdAt).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Cross-Device Sync */}
          <div className="p-4 md:p-5 rounded-2xl bg-slate-900/40 border border-white/10 space-y-4 shadow-sm">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300">
                <Smartphone className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black text-white">{t.syncTitle}</h3>
            </div>
            <p className="text-xs text-slate-300/80 leading-relaxed font-medium">{t.syncDesc}</p>

            {/* 1. Generate Sync Code */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">
                  {t.generateCode}
                </span>
                <button
                  onClick={handleGenerateCode}
                  disabled={isGeneratingCode}
                  className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 active:scale-95 text-xs font-black text-white shadow-md shadow-purple-600/30 transition disabled:opacity-50 cursor-pointer border border-purple-400/40"
                >
                  {isGeneratingCode ? '...' : t.generateCode}
                </button>
              </div>

              {generatedCode && (
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-purple-950/60 border border-purple-500/40 shadow-inner">
                  <div>
                    <div className="font-mono text-2xl font-black tracking-[0.25em] text-purple-200 drop-shadow-[0_0_8px_rgba(192,132,252,0.4)]">
                      {generatedCode.code}
                    </div>
                    <div className="text-[11px] text-purple-300/80 font-medium mt-0.5">
                      {t.codeExpiresIn} 10 min
                    </div>
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-90 text-slate-200 transition border border-white/10 cursor-pointer"
                    title="Copy code"
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
            <div className="p-4 rounded-xl bg-slate-950/70 border border-white/10 space-y-3">
              <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                <Key className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t.claimCodeLabel}</span>
              </label>
              <div className="flex space-x-2.5">
                <input
                  type="text"
                  placeholder={t.claimCodePlaceholder}
                  value={claimInput}
                  onChange={(e) => setClaimInput(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-sm text-white font-mono tracking-widest focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/25 font-bold"
                />
                <button
                  onClick={handleClaimCode}
                  disabled={isClaiming || claimInput.length < 6}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 font-bold text-xs text-white shadow-lg shadow-emerald-500/20 transition disabled:opacity-50 cursor-pointer border border-emerald-400/40"
                >
                  {isClaiming ? t.linking : t.claimButton}
                </button>
              </div>

              {claimSuccess && (
                <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                  <Check className="w-4 h-4" />
                  <span>{t.linkSuccess}</span>
                </div>
              )}
              {claimError && (
                <div className="flex items-center space-x-1.5 text-xs font-bold text-rose-400 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                  <AlertCircle className="w-4 h-4" />
                  <span>{claimError}</span>
                </div>
              )}
            </div>
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
