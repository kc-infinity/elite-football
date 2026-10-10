import React, { useState } from 'react';
import { Check, ChevronRight, User } from 'lucide-react';
import { FootballPlayer, TeamData } from '../data/gameDatabase';
import { useAppIcon } from '../data/appIconStore';
import { SoundEngine } from '../engine/SoundEngine';
import heroStadiumImg from '../assets/images/hero_stadium_backdrop_1791305638088.jpg';

interface WelcomeOnboardingScreenProps {
  initialUsername: string;
  initialEmail?: string;
  initialClub: TeamData;
  starterSquad: FootballPlayer[];
  coins: number;
  isGoogleLinked?: boolean;
  onOpenGoogleAuth?: () => void;
  onCompleteOnboarding: (username: string, favouriteClub: TeamData, email?: string) => void;
}

export const WelcomeOnboardingScreen: React.FC<WelcomeOnboardingScreenProps> = ({
  initialUsername,
  initialEmail = '',
  initialClub,
  isGoogleLinked,
  onOpenGoogleAuth,
  onCompleteOnboarding,
}) => {
  const [username, setUsername] = useState(() => {
    const saved = localStorage.getItem('fe_username');
    return saved && saved !== 'ChampionElite_10' ? saved : initialUsername || '';
  });
  const [googleSignedIn, setGoogleSignedIn] = useState<boolean>(Boolean(isGoogleLinked));
  const [googleEmail, setGoogleEmail] = useState<string>(
    () => localStorage.getItem('fe_user_email') || initialEmail || ''
  );
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { iconUrl } = useAppIcon();

  const handleGoogleSignInClick = () => {
    SoundEngine.playUIClick();
    setErrorMsg('');
    const cleanName = username.trim() || 'Player_' + Math.floor(100 + Math.random() * 900);
    if (!username.trim()) {
      setUsername(cleanName);
    }
    const resolvedEmail =
      googleEmail.trim() && googleEmail.includes('@')
        ? googleEmail.trim().toLowerCase()
        : `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'player'}@gmail.com`;

    setIsSigningIn(true);
    setTimeout(() => {
      setGoogleEmail(resolvedEmail);
      setGoogleSignedIn(true);
      setIsSigningIn(false);
      // If username is already provided, complete sign-in and enter smoothly
      if (username.trim()) {
        onCompleteOnboarding(username.trim(), initialClub, resolvedEmail);
      } else if (onOpenGoogleAuth) {
        // Account is linked; user can now confirm or customize username and enter
      }
    }, 260);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) {
      setErrorMsg('Please enter your Username to continue.');
      return;
    }
    SoundEngine.playUIClick();
    const resolvedEmail =
      googleEmail.trim() && googleEmail.includes('@')
        ? googleEmail.trim().toLowerCase()
        : `${trimmed.toLowerCase().replace(/[^a-z0-9]/g, '') || 'player'}@gmail.com`;
    onCompleteOnboarding(trimmed, initialClub, resolvedEmail);
  };

  return (
    <div className="min-h-screen bg-[#070A0E] text-[#F1F5F9] relative flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Stadium Background with Smooth Atmospheric Scrim */}
      <img
        src={heroStadiumImg}
        alt="Football Elite Stadium"
        referrerPolicy="no-referrer"
        className="fixed inset-0 w-full h-full object-cover opacity-35 pointer-events-none scale-105 transition-transform duration-1000"
      />
      <div className="fixed inset-0 bg-gradient-to-b from-[#070A0E]/85 via-[#070A0E]/90 to-[#070A0E] pointer-events-none" />

      {/* Simple, Modern, Smooth & Responsive Welcome Card */}
      <main className="relative z-10 w-full max-w-md">
        <div className="bg-[#111722]/95 backdrop-blur-2xl border border-white/15 rounded-3xl p-7 sm:p-9 shadow-2xl space-y-7 transition-all">
          {/* Brand Header */}
          <div className="text-center space-y-2.5">
            <div className="flex flex-col items-center">
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-[#070A0E] border-2 border-[#F59E0B]/60 shadow-[0_0_40px_rgba(245,158,11,0.28)] flex items-center justify-center overflow-hidden mb-1">
                <img
                  src={iconUrl}
                  alt="Football Elite App Logo"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover scale-105"
                />
              </div>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] font-mono text-[11px] font-bold tracking-wider">
              ONLINE 1V1 & 11V11 MULTIPLAYER
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white">
              FOOTBALL ELITE
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Sign in with Google and choose your username to play
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 1. Google Sign-In Button */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleGoogleSignInClick}
                disabled={isSigningIn}
                className={`w-full py-3.5 px-5 rounded-2xl font-display font-bold text-sm transition-all flex items-center justify-center gap-3 shadow-lg cursor-pointer ${
                  googleSignedIn || isGoogleLinked
                    ? 'bg-[#10B981]/20 border-2 border-[#10B981] text-[#10B981]'
                    : 'bg-white hover:bg-slate-100 text-[#070A0E] border border-white'
                }`}
              >
                {/* Google Multi-Color G SVG */}
                <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
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
                  {isSigningIn
                    ? 'Connecting Google Account...'
                    : googleSignedIn || isGoogleLinked
                    ? 'Signed in with Google ✓'
                    : 'Sign in with Google'}
                </span>
                {(googleSignedIn || isGoogleLinked) && <Check className="w-4 h-4 ml-auto" />}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-px bg-white/10 flex-1" />
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-widest">
                Player Profile
              </span>
              <div className="h-px bg-white/10 flex-1" />
            </div>

            {/* 2. Username Field */}
            <div className="space-y-2">
              <label className="block text-xs font-mono text-slate-300 tracking-wide">
                USERNAME
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#10B981] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="Enter your username..."
                  maxLength={24}
                  autoFocus
                  className="w-full bg-[#070A0E] border-2 border-white/15 focus:border-[#10B981] rounded-2xl pl-11 pr-4 py-3.5 font-display text-sm font-bold text-white placeholder:text-slate-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-400 font-medium text-center">{errorMsg}</p>
            )}

            {/* Submit / Enter Button */}
            <button
              type="submit"
              className="w-full py-4 bg-[#10B981] hover:bg-[#059669] text-[#070A0E] font-display font-bold text-sm rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl cursor-pointer"
            >
              <span>CONTINUE TO GAME</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};
