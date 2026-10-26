'use client';

import React, { useState } from 'react';
import { ShieldCheck, Sparkles, CheckCircle2, X, Lock, ExternalLink } from 'lucide-react';

export interface DiscordUser {
  id: string;
  username: string;
  discriminator?: string;
  avatarUrl?: string;
  isAuthorized: boolean;
  joinedAt: string;
}

interface DiscordAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthorize: (user: DiscordUser) => void;
}

export const DiscordAuthModal: React.FC<DiscordAuthModalProps> = ({
  isOpen,
  onClose,
  onAuthorize,
}) => {
  const [loading, setLoading] = useState(false);
  const [customUsername, setCustomUsername] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  if (!isOpen) return null;

  const handleAuthorizeDiscord = () => {
    setLoading(true);

    // Simulate authenticating via Discord OAuth2
    setTimeout(() => {
      const username = customUsername.trim() || 'DiscordDev_' + Math.floor(1000 + Math.random() * 9000);
      const user: DiscordUser = {
        id: `discord-${Date.now()}`,
        username,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
        isAuthorized: true,
        joinedAt: new Date().toISOString(),
      };

      localStorage.setItem('mapdev_discord_user', JSON.stringify(user));
      onAuthorize(user);
      setLoading(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-700 bg-[#101014] p-6 sm:p-8 shadow-2xl z-10 overflow-hidden">
        
        {/* Discord Top Banner Glow */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#5865F2] via-[#7983f5] to-[#5865F2]" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg border border-transparent hover:border-zinc-700 transition-colors"
          title="Tutup Modal"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Discord Brand Icon & Header */}
        <div className="text-center mb-6">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#5865F2]/10 border border-[#5865F2]/30 mb-3 shadow-inner">
            <svg className="h-8 w-8 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
          </div>
          <h2 className="text-xl font-extrabold text-white uppercase font-mono tracking-wide">
            Authorize with Discord
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
            Hubungkan akun Discord kamu untuk mendapatkan akses penuh ke aset map, dev tools, dan fitur premium.
          </p>
        </div>

        {/* Benefits Checklist */}
        <div className="rounded-xl border border-zinc-800 bg-black/50 p-4 space-y-2.5 mb-6 text-xs font-mono">
          <div className="flex items-center gap-2.5 text-zinc-300">
            <CheckCircle2 className="h-4 w-4 text-[#5865F2] shrink-0" />
            <span>Akses Direct Download File Map (.rbxm / .zip)</span>
          </div>
          <div className="flex items-center gap-2.5 text-zinc-300">
            <CheckCircle2 className="h-4 w-4 text-[#5865F2] shrink-0" />
            <span>Gunakan 5 Developer Engines & Tools Luau</span>
          </div>
          <div className="flex items-center gap-2.5 text-zinc-300">
            <CheckCircle2 className="h-4 w-4 text-[#5865F2] shrink-0" />
            <span>Sinkronisasi Role & Status Komunitas Discord</span>
          </div>
          <div className="flex items-center gap-2.5 text-zinc-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Siap untuk Fitur Premium User (Tier Khusus)</span>
          </div>
        </div>

        {/* Manual Discord Username Option */}
        {showManualInput && (
          <div className="mb-4">
            <label className="block text-xs font-mono text-zinc-300 mb-1">
              Masukkan Username Discord Kamu:
            </label>
            <input
              type="text"
              value={customUsername}
              onChange={(e) => setCustomUsername(e.target.value)}
              placeholder="e.g. riki_developer"
              className="w-full rounded-xl border border-zinc-700 bg-black px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:border-[#5865F2] focus:outline-none font-mono"
            />
          </div>
        )}

        {/* Action Button: Authorize Discord */}
        <div className="space-y-3">
          <button
            onClick={handleAuthorizeDiscord}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] py-3 px-4 text-xs font-bold font-mono text-white transition-all shadow-lg active:scale-98 disabled:opacity-50"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            <span>{loading ? 'Mengotorisasi Akun Discord...' : 'Authorize with Discord'}</span>
          </button>

          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-1">
            <button
              type="button"
              onClick={() => setShowManualInput(!showManualInput)}
              className="hover:text-zinc-300 underline"
            >
              {showManualInput ? 'Sembunyikan Username' : 'Kustom Username Discord'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="hover:text-zinc-300"
            >
              Lanjutkan sebagai Tamu
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
