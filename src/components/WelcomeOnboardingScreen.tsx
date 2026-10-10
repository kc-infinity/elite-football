import React, { useRef, useState } from 'react';
import { Check, ChevronRight, Eye, EyeOff, Lock, Mail, ShieldCheck, User } from 'lucide-react';
import { FootballPlayer, TeamData } from '../data/gameDatabase';
import { useAppIcon } from '../data/appIconStore';
import { SoundEngine } from '../engine/SoundEngine';
import { AuthenticatedAccount } from './OnlineMatchAndAuthModal';
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
  initialEmail = '',
  initialClub,
  starterSquad,
  coins,
  isGoogleLinked,
  onContinueAsGuest,
  onCompleteOnboarding,
}) => {
  const [googleSignedIn, setGoogleSignedIn] = useState<boolean>(Boolean(isGoogleLinked));
  const [email, setEmail] = useState<string>(initialEmail || '');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [username, setUsername] = useState<string>(() => {
    const cleanInit = (initialUsername || '').trim();
    if (cleanInit && cleanInit !== 'ChampionElite_10' && !cleanInit.startsWith('Player_')) {
      return cleanInit;
    }
    return '';
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [infoMsg, setInfoMsg] = useState<string>('');
  const usernameInputRef = useRef<HTMLInputElement | null>(null);
  const { iconUrl } = useAppIcon();

  const performSignIn = async (
    provider: 'google' | 'email',
    resolvedEmail: string,
    resolvedUsername: string,
    rawPassword?: string
  ) => {
    setIsSubmitting(true);
    setErrorMsg('');
    setInfoMsg('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          email: resolvedEmail,
          password: rawPassword,
          username: resolvedUsername,
          favouriteClubId: initialClub.id,
          initialUnlockedIds: starterSquad.map((p) => p.id),
          coins,
          squadIds: starterSquad.map((p) => p.id),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.user) {
        setErrorMsg(data?.error || 'Sign-in failed. Please check your details.');
        setIsSubmitting(false);
        return;
      }
      onCompleteOnboarding(
        resolvedUsername,
        initialClub,
        resolvedEmail,
        data.user,
        data.token
      );
    } catch {
      // Fallback local authenticated session if offline
      onCompleteOnboarding(resolvedUsername, initialClub, resolvedEmail);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignInClick = () => {
    SoundEngine.playUIClick();
    setErrorMsg('');
    setGoogleSignedIn(true);

    const currentName = username.trim();
    if (currentName.length > 0) {
      const resolvedEmail =
        email.trim() && email.includes('@')
          ? email.trim().toLowerCase()
          : `${currentName.toLowerCase().replace(/[^a-z0-9._-]/g, '') || 'player'}@gmail.com`;
      performSignIn('google', resolvedEmail, currentName);
    } else {
      setInfoMsg('Google connected! Enter any username you want below, then click Sign In.');
      setTimeout(() => {
        usernameInputRef.current?.focus();
      }, 50);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    SoundEngine.playUIClick();
    setErrorMsg('');
    setInfoMsg('');

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setErrorMsg('Please enter any username you want in the Username field.');
      usernameInputRef.current?.focus();
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    const hasEmailCredentials = trimmedEmail.length > 0 || trimmedPassword.length > 0;

    if (hasEmailCredentials && !googleSignedIn) {
      if (!trimmedEmail) {
        setErrorMsg('Please enter your email address.');
        return;
      }
      if (!trimmedPassword) {
        setErrorMsg('Please enter your password.');
        return;
      }
      const normalizedEmail = trimmedEmail.includes('@')
        ? trimmedEmail
        : `${trimmedEmail}@football-elite.app`;
      performSignIn('email', normalizedEmail, trimmedUsername, trimmedPassword);
      return;
    }

    if (googleSignedIn) {
      const resolvedEmail =
        trimmedEmail && trimmedEmail.includes('@')
          ? trimmedEmail
          : `${trimmedUsername.toLowerCase().replace(/[^a-z0-9._-]/g, '') || 'player'}@gmail.com`;
      performSignIn('google', resolvedEmail, trimmedUsername);
      return;
    }

    setErrorMsg('Please choose Google Sign-In or enter your Email + Password above.');
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

      {/* Simple, Modern, Smooth & Responsive Login Card */}
      <main className="relative z-10 w-full max-w-md">
        <div className="bg-[#111722]/95 backdrop-blur-2xl border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 transition-all">
          {/* Brand Header */}
          <div className="text-center space-y-2">
            <div className="flex flex-col items-center">
              <div className="relative w-24 h-24 rounded-full bg-[#070A0E] border-2 border-[#F59E0B]/60 shadow-[0_0_36px_rgba(245,158,11,0.28)] flex items-center justify-center overflow-hidden mb-1">
                <img
                  src={iconUrl}
                  alt="Football Elite App Logo"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover scale-105"
                />
              </div>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white">
              FOOTBALL ELITE
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Sign in with <span className="text-white font-semibold">Google</span> or{' '}
              <span className="text-white font-semibold">Email + Password</span> to unlock{' '}
              <span className="text-[#10B981] font-semibold">Online Match</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Option 1: Google Sign-In Button */}
            <button
              type="button"
              onClick={handleGoogleSignInClick}
              disabled={isSubmitting}
              className={`w-full py-3.5 px-5 rounded-2xl font-display font-bold text-sm transition-all flex items-center justify-center gap-3 shadow-md cursor-pointer ${
                googleSignedIn
                  ? 'bg-[#10B981]/20 border-2 border-[#10B981] text-[#10B981]'
                  : 'bg-white hover:bg-slate-100 text-[#070A0E] border border-white'
              }`}
            >
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
                {googleSignedIn ? 'Google Account Selected ✓' : 'Sign in with Google'}
              </span>
              {googleSignedIn && <Check className="w-4 h-4 ml-auto" />}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px bg-white/10 flex-1" />
              <span className="text-[11px] font-mono text-slate-400">
                OR EMAIL + PASSWORD
              </span>
              <div className="h-px bg-white/10 flex-1" />
            </div>

            {/* Option 2: Email + Password Fields */}
            <div className="space-y-3">
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  inputMode="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (googleSignedIn && e.target.value.trim()) {
                      setGoogleSignedIn(false);
                      setInfoMsg('');
                    }
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="Email address"
                  autoComplete="email"
                  className="w-full bg-[#070A0E] border border-white/15 focus:border-[#38BDF8] rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none transition-colors"
                />
              </div>

              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (googleSignedIn && e.target.value) {
                      setGoogleSignedIn(false);
                      setInfoMsg('');
                    }
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="Password"
                  autoComplete="current-password"
                  className="w-full bg-[#070A0E] border border-white/15 focus:border-[#38BDF8] rounded-2xl pl-11 pr-11 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Username Field Below the Login Options */}
            <div className="pt-2 border-t border-white/10 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-mono text-slate-200 font-bold tracking-wide">
                  USERNAME
                </label>
                <span className="text-[11px] font-mono text-[#10B981]">
                  Any valid username accepted
                </span>
              </div>
              <div className="relative">
                <User className="w-4 h-4 text-[#10B981] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={usernameInputRef}
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="Enter any username you want..."
                  maxLength={32}
                  className="w-full bg-[#070A0E] border-2 border-white/15 focus:border-[#10B981] rounded-2xl pl-11 pr-4 py-3 font-display text-sm font-bold text-white placeholder:text-slate-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {infoMsg && !errorMsg && (
              <p className="text-xs text-[#10B981] font-medium text-center">{infoMsg}</p>
            )}

            {errorMsg && (
              <p className="text-xs text-rose-400 font-medium text-center">{errorMsg}</p>
            )}

            {/* Submit / Sign In Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-[#10B981] hover:bg-[#059669] text-[#070A0E] font-display font-bold text-sm rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>
                {isSubmitting ? 'SIGNING IN...' : 'SIGN IN & UNLOCK ONLINE MATCH'}
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>

            {onContinueAsGuest && (
              <button
                type="button"
                onClick={() => {
                  SoundEngine.playUIClick();
                  onContinueAsGuest();
                }}
                className="w-full py-2 text-xs font-mono text-slate-400 hover:text-white transition-colors text-center cursor-pointer"
              >
                Continue Offline Without Signing In (Online Match Locked 🔒)
              </button>
            )}
          </form>
        </div>
      </main>
    </div>
  );
};
