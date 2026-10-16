/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { ChevronRight, ShieldCheck, User } from 'lucide-react';
import { FootballPlayer, TeamData } from '../data/gameDatabase';
import { useAppIcon } from '../data/appIconStore';
import { SoundEngine } from '../engine/SoundEngine';
import { AuthenticatedAccount } from './AuthAndCheckoutModal';
import heroStadiumImg from '../assets/images/hero_stadium_backdrop_1791305638088.jpg';

interface WelcomeOnboardingScreenProps {
  initialUsername: string;
  initialEmail?: string;
  initialClub: TeamData;
  starterSquad: FootballPlayer[];
  coins: number;
  isGoogleLinked?: boolean;
  onOpenGoogleAuth?: () => void;
  onContinueAsGuest?: () => void;
  onCompleteOnboarding: (
    username: string,
    favouriteClub: TeamData,
    email?: string,
    authenticatedUser?: AuthenticatedAccount,
    token?: string
  ) => void;
}

export const WelcomeOnboardingScreen: React.FC<WelcomeOnboardingScreenProps> = ({
  initialUsername,
  initialClub,
  starterSquad,
  coins,
  onContinueAsGuest,
  onCompleteOnboarding,
}) => {
  const [username, setUsername] = useState<string>(() => {
    const clean = (initialUsername || '').trim();
    if (clean && clean !== 'ChampionElite_10' && !clean.startsWith('Player_')) {
      return clean;
    }
    return '';
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const usernameInputRef = useRef<HTMLInputElement | null>(null);
  const { iconUrl } = useAppIcon();

  const handleSignInWithGoogle = async (customName?: string) => {
    SoundEngine.playUIClick();
    setErrorMsg('');

    const resolvedName = (customName !== undefined ? customName : username).trim();
    if (!resolvedName) {
      setErrorMsg('Please enter your username first.');
      usernameInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    const sanitizedEmail = `${resolvedName.toLowerCase().replace(/[^a-z0-9._-]/g, '') || 'player'}@gmail.com`;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'google',
          email: sanitizedEmail,
          username: resolvedName,
          favouriteClubId: initialClub.id,
          initialUnlockedIds: starterSquad.map((p) => p.id),
          coins,
          squadIds: starterSquad.map((p) => p.id),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.user) {
        // Fallback local session if server returned error
        onCompleteOnboarding(resolvedName, initialClub, sanitizedEmail);
        return;
      }

      onCompleteOnboarding(
        resolvedName,
        initialClub,
        sanitizedEmail,
        data.user,
        data.token
      );
    } catch {
      // Offline fallback
      onCompleteOnboarding(resolvedName, initialClub, sanitizedEmail);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSignInWithGoogle();
  };

  return (
    <div className="min-h-screen bg-[#070A0E] text-[#F1F5F9] relative flex items-center justify-center p-4 sm:p-6 overflow-hidden select-none">
      {/* Realistic Stadium Floodlight Background */}
      <img
        src={heroStadiumImg}
        alt="Football Elite Stadium"
        referrerPolicy="no-referrer"
        className="fixed inset-0 w-full h-full object-cover opacity-40 pointer-events-none scale-105 transition-transform duration-1000"
      />
      <div className="fixed inset-0 bg-gradient-to-b from-[#070A0E]/80 via-[#070A0E]/90 to-[#070A0E] pointer-events-none" />

      {/* Clean, Simple, Modern Login Card */}
      <main className="relative z-10 w-full max-w-md">
        <div className="bg-[#111722]/95 backdrop-blur-2xl border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 transition-all">
          {/* Header Brand */}
          <div className="text-center space-y-3">
            <div className="flex flex-col items-center">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#070A0E] border-2 border-[#F59E0B]/60 shadow-[0_0_36px_rgba(245,158,11,0.3)] flex items-center justify-center overflow-hidden mb-1">
                <img
                  src={iconUrl}
                  alt="Football Elite App Logo"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover scale-105"
                />
              </div>
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#10B981] font-bold mb-1">
                ONLINE MULTIPLAYER · 3D FOOTBALL
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
                FOOTBALL ELITE
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-300">
              Sign in with Google to save your squad and play online matches.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* USERNAME INPUT FIELD */}
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-mono text-slate-300 font-bold tracking-wider">
                USERNAME
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#38BDF8] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={usernameInputRef}
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="Enter your username..."
                  maxLength={24}
                  autoFocus
                  className="w-full bg-[#070A0E] border-2 border-white/15 focus:border-[#38BDF8] rounded-2xl pl-11 pr-4 py-3.5 font-display text-sm font-bold text-white placeholder:text-slate-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-400 font-medium text-center animate-fade-in">
                {errorMsg}
              </p>
            )}

            {/* GOOGLE SIGN-IN BUTTON */}
            <button
              type="button"
              onClick={() => handleSignInWithGoogle()}
              disabled={isSubmitting}
              className="w-full py-3.5 px-5 bg-white hover:bg-slate-100 text-[#070A0E] font-display font-bold text-sm rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg cursor-pointer border border-white hover:shadow-xl active:scale-[0.99]"
            >
              <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
                  />
                </svg>
              </span>
              <span>
                {isSubmitting ? 'Connecting...' : 'Sign in with Google'}
              </span>
              <ChevronRight className="w-4 h-4 ml-auto text-slate-500" />
            </button>

            {onContinueAsGuest && (
              <button
                type="button"
                onClick={() => {
                  SoundEngine.playUIClick();
                  const finalName = username.trim() || `Player_${Math.floor(100 + Math.random() * 900)}`;
                  onCompleteOnboarding(finalName, initialClub);
                }}
                className="w-full py-2.5 text-xs font-mono text-slate-400 hover:text-white transition-colors text-center cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                Continue with username & enter stadium →
              </button>
            )}
          </form>
        </div>
      </main>
    </div>
  );
};
