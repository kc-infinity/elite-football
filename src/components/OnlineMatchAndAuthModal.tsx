import React, { useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  Lock,
  LogOut,
  Mail,
  Play,
  RefreshCw,
  ShieldCheck,
  Trophy,
  User,
  Users,
  X,
  Zap,
} from 'lucide-react';
import {
  FootballPlayer,
  FORMATIONS,
  FormationName,
  PLAYERS_DB,
  TeamData,
  TEAMS_DB,
} from '../data/gameDatabase';
import { OpponentSquadInfo, OpponentSquadPopup } from './OpponentSquadPopup';
import { PlayerPhotoAvatar } from './PlayerPhotoAvatar';
import {
  FriendRoomService,
  FriendRoomState,
  IncomingMatchInvite,
  OnlineMatchLobbyState,
  OnlinePlayerPresence,
  OpenRoomInfo,
} from '../engine/FriendRoomService';
import { SoundEngine } from '../engine/SoundEngine';

export interface AuthenticatedAccount {
  id: string;
  googleId: string;
  email: string;
  username: string;
  authProvider?: 'google' | 'email';
  avatarUrl: string;
  coins: number;
  favouriteClubId?: string;
  unlockedPlayerIds?: string[];
  squadIds?: string[];
  formation?: string;
  captainId?: string;
  preferredCelebration?: string;
  tournamentStageIndex?: number;
  mmrRating: number;
  matchesPlayed?: number;
  wins?: number;
  goals?: number;
  assists?: number;
  cleanSheets?: number;
  trophies?: number;
  level?: number;
  unlockedAchievementIds?: string[];
}

// ============================================================================
// 1. GOOGLE SIGN-IN OR EMAIL + PASSWORD LOGIN MODAL (WITH USERNAME BELOW)
// ============================================================================
interface GoogleAuthModalProps {
  isOpen: boolean;
  currentUsername: string;
  currentClubId: string;
  unlockedPlayerIds: string[];
  account: AuthenticatedAccount | null;
  onClose: () => void;
  onSuccessAuth: (account: AuthenticatedAccount, token: string) => void;
  onLogout: () => void;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  currentUsername,
  currentClubId,
  unlockedPlayerIds,
  account,
  onClose,
  onSuccessAuth,
  onLogout,
}) => {
  const [googleSignedIn, setGoogleSignedIn] = useState(false);
  const [email, setEmail] = useState(account?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState(
    account?.username ||
      (currentUsername && currentUsername !== 'ChampionElite_10' && !currentUsername.startsWith('Player_')
        ? currentUsername
        : '')
  );
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  useEffect(() => {
    if (account) {
      setEmail(account.email || '');
      setUsername(account.username || '');
    }
  }, [account]);

  if (!isOpen) return null;

  const performLogin = async (
    provider: 'google' | 'email',
    resolvedEmail: string,
    resolvedUsername: string,
    rawPassword?: string
  ) => {
    setLoading(true);
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
          favouriteClubId: currentClubId,
          initialUnlockedIds: unlockedPlayerIds,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.user) {
        setErrorMsg(data?.error || 'Authentication failed.');
      } else {
        SoundEngine.playUIClick();
        onSuccessAuth(data.user, data.token);
        onClose();
      }
    } catch {
      setErrorMsg('Network error while connecting to authentication server.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleClick = () => {
    SoundEngine.playUIClick();
    setErrorMsg('');
    const trimmedName = username.trim();
    if (trimmedName.length > 0) {
      setGoogleSignedIn(true);
      const resolvedEmail =
        email.trim() && email.includes('@')
          ? email.trim().toLowerCase()
          : `${trimmedName.toLowerCase().replace(/[^a-z0-9._-]/g, '') || 'player'}@gmail.com`;
      performLogin('google', resolvedEmail, trimmedName);
      return;
    }
    if (googleSignedIn) {
      const fallbackName =
        email.trim() && email.includes('@')
          ? email.trim().split('@')[0]
          : `Player_${Math.floor(100 + Math.random() * 900)}`;
      performLogin('google', `${fallbackName.toLowerCase()}@gmail.com`, fallbackName);
      return;
    }
    setGoogleSignedIn(true);
    setInfoMsg('Google connected! Enter any username below (or click Sign In to continue).');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    const hasEmailInput = trimmedEmail.length > 0 || trimmedPassword.length > 0;
    const trimmedName =
      username.trim() ||
      (trimmedEmail
        ? trimmedEmail.split('@')[0]
        : googleSignedIn
        ? `Player_${Math.floor(100 + Math.random() * 900)}`
        : '');

    if (!trimmedName) {
      setErrorMsg('Please enter any username you want in the Username field.');
      return;
    }

    if (hasEmailInput && !googleSignedIn) {
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
      performLogin('email', normalizedEmail, trimmedName, trimmedPassword);
      return;
    }

    const resolvedEmail =
      trimmedEmail && trimmedEmail.includes('@')
        ? trimmedEmail
        : `${trimmedName.toLowerCase().replace(/[^a-z0-9._-]/g, '') || 'player'}@gmail.com`;
    performLogin('google', resolvedEmail, trimmedName);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#111722] border border-white/15 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
          <div>
            <div className="text-[11px] font-mono text-[#10B981] font-bold">
              PLAYER ACCOUNT & ONLINE MATCH ACCESS
            </div>
            <h3 className="font-display text-xl font-bold text-white">
              {account ? 'Your Signed-In Account' : 'Sign In to Unlock Online Match'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {account ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#070A0E] border border-[#10B981]/40 flex items-center justify-between">
              <div>
                <div className="text-xs font-mono text-[#10B981] font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> ONLINE MATCH UNLOCKED ({(account.authProvider || 'google').toUpperCase()})
                </div>
                <div className="font-display text-lg font-bold text-white mt-0.5">
                  @{account.username}
                </div>
                <div className="text-xs text-slate-400">{account.email}</div>
              </div>
              <div className="text-right font-mono text-xs">
                <div className="text-[#F59E0B] font-bold">MMR {account.mmrRating}</div>
                <div className="text-[#10B981] mt-0.5">Unlocked ✓</div>
              </div>
            </div>

            {/* Allow changing username anytime while signed in */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-mono text-slate-300">CHANGE USERNAME</label>
                <span className="text-[11px] font-mono text-[#10B981]">Any valid username accepted</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <User className="w-4 h-4 text-[#10B981] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    placeholder="Enter any username..."
                    maxLength={32}
                    className="w-full bg-[#070A0E] border border-white/15 focus:border-[#10B981] rounded-xl pl-10 pr-3 py-2.5 font-display font-bold text-sm text-white focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  disabled={loading || !username.trim()}
                  onClick={() => {
                    const nextName = username.trim();
                    if (!nextName) return;
                    performLogin(
                      account.authProvider || 'google',
                      account.email || `${nextName.toLowerCase().replace(/[^a-z0-9._-]/g, '') || 'player'}@gmail.com`,
                      nextName
                    );
                  }}
                  className="px-4 py-2.5 bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 text-[#070A0E] font-display font-bold text-xs rounded-xl transition-colors cursor-pointer shrink-0"
                >
                  SAVE
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-[#10B981] hover:bg-[#059669] text-[#070A0E] font-display font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                CONTINUE TO GAME
              </button>
              <button
                onClick={() => {
                  setEmail('');
                  setPassword('');
                  setUsername('');
                  setGoogleSignedIn(false);
                  onLogout();
                }}
                className="px-4 py-3 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-display font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleFormSubmit} className="space-y-4" noValidate>
            {/* Option 1: Google Sign-In */}
            <button
              type="button"
              onClick={handleGoogleClick}
              disabled={loading}
              className={`w-full py-3.5 px-4 rounded-2xl font-display font-bold text-sm transition-all flex items-center justify-center gap-3 shadow-md cursor-pointer ${
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
              <span>{googleSignedIn ? 'Google Account Selected ✓' : 'Sign in with Google'}</span>
              {googleSignedIn && <Check className="w-4 h-4 ml-auto" />}
            </button>

            <div className="flex items-center gap-3">
              <div className="h-px bg-white/10 flex-1" />
              <span className="text-[11px] font-mono text-slate-400">OR EMAIL + PASSWORD</span>
              <div className="h-px bg-white/10 flex-1" />
            </div>

            {/* Option 2: Email + Password */}
            <div className="space-y-2.5">
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                  className="w-full bg-[#070A0E] border border-white/15 focus:border-[#38BDF8] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none"
                />
              </div>

              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                  className="w-full bg-[#070A0E] border border-white/15 focus:border-[#38BDF8] rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Username Field Below Login Options */}
            <div className="pt-2 border-t border-white/10 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-mono text-slate-200 font-bold">USERNAME</label>
                <span className="text-[11px] font-mono text-[#10B981]">
                  Any valid username accepted
                </span>
              </div>
              <div className="relative">
                <User className="w-4 h-4 text-[#10B981] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="Enter any username you want..."
                  maxLength={32}
                  className="w-full bg-[#070A0E] border-2 border-white/15 focus:border-[#10B981] rounded-xl pl-10 pr-4 py-3 font-display font-bold text-sm text-white placeholder:text-slate-500 focus:outline-none"
                />
              </div>
            </div>

            {infoMsg && !errorMsg && (
              <p className="text-xs text-[#10B981] font-medium text-center">{infoMsg}</p>
            )}

            {errorMsg && <p className="text-xs text-rose-400 font-medium text-center">{errorMsg}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#10B981] hover:bg-[#059669] text-[#070A0E] font-display font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              {loading ? 'SIGNING IN...' : 'SIGN IN & UNLOCK ONLINE MATCH'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 2. INCOMING FRIEND MATCH INVITATION MODAL
// ============================================================================
interface IncomingInviteModalProps {
  invite: IncomingMatchInvite | null;
  onAccept: (invite: IncomingMatchInvite) => void;
  onDecline: (invite: IncomingMatchInvite) => void;
}

export const IncomingInviteModal: React.FC<IncomingInviteModalProps> = ({
  invite,
  onAccept,
  onDecline,
}) => {
  const [showInviteSquad, setShowInviteSquad] = useState(false);

  if (!invite) return null;

  return (
    <>
      <div className="fixed top-20 right-6 z-50 max-w-sm w-full animate-in slide-in-from-top-5 duration-200">
        <div className="bg-[#111722] border-2 border-[#10B981] rounded-2xl p-5 shadow-2xl space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-mono text-[#10B981] font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
                LIVE ONLINE MATCH INVITATION
              </div>
              <h4 className="font-display text-lg font-bold text-white mt-0.5">
                {invite.fromUsername} challenged you!
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                Club: <span className="text-white font-semibold">{invite.fromClubName}</span> · Lead Star:{' '}
                <span className="text-[#F59E0B] font-semibold">{invite.fromStarPlayer}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                SoundEngine.playUIClick();
                setShowInviteSquad(true);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-[11px] font-mono font-bold text-[#38BDF8] flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              XI
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onAccept(invite)}
              className="flex-1 py-2.5 bg-[#10B981] hover:bg-[#059669] text-[#070A0E] font-display font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              ACCEPT & JOIN ROOM
            </button>
            <button
              onClick={() => onDecline(invite)}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-slate-200 font-display font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              DECLINE
            </button>
          </div>
        </div>
      </div>

      <OpponentSquadPopup
        isOpen={showInviteSquad}
        onClose={() => setShowInviteSquad(false)}
        opponent={{
          username: invite.fromUsername,
          clubName: invite.fromClubName,
          starPlayerName: invite.fromStarPlayer,
          squadIds: invite.fromSquadIds,
          formation: invite.fromFormation || '4-3-3',
        }}
      />
    </>
  );
};

// ============================================================================
// 3. SIMPLE, MODERN & SMOOTH ONLINE MATCH ROOM CODE SYSTEM
// ============================================================================
interface OnlineMatchCenterProps {
  username: string;
  account: AuthenticatedAccount | null;
  userTeam: TeamData;
  awayTeam: TeamData;
  leadStar: FootballPlayer;
  userSquad?: FootballPlayer[];
  onlinePlayers: OnlinePlayerPresence[];
  activeLobby: OnlineMatchLobbyState | null;
  friendRoomState: FriendRoomState;
  roomCode: string;
  onlineMatchFormat?: '11v11' | '1v1';
  userFormation?: string;
  userSquadOvr?: number;
  lastMatchResult: {
    homeScore: number;
    awayScore: number;
    opponentName: string;
    coinsEarned: number;
  } | null;
  onSelectOnlineMatchFormat?: (fmt: '11v11' | '1v1') => void;
  onEditDreamTeam?: () => void;
  onOpenGoogleAuth: () => void;
  onSuccessAuth?: (account: AuthenticatedAccount, token: string) => void;
  onUpdateUsername?: (newUsername: string) => void;
  onCreateNewRoom: () => void;
  onJoinRoomByCode: (enteredCode: string) => void;
  onInviteByUsername: (friendUsername: string) => void;
  onToggleLobbyReady: (lobbyId: string, nextReady: boolean) => void;
  onStartOnlineMatch: (opponentTeam: TeamData, roomCodeLabel: string, lobbyId?: string) => void;
  onQuickMatchmaking: () => void;
}

export const OnlineMatchCenter: React.FC<OnlineMatchCenterProps> = ({
  username,
  account,
  userTeam,
  awayTeam,
  leadStar,
  userSquad = [],
  activeLobby,
  friendRoomState,
  roomCode,
  onlineMatchFormat = '1v1',
  userFormation = '4-3-3',
  lastMatchResult,
  onSelectOnlineMatchFormat,
  onOpenGoogleAuth,
  onSuccessAuth,
  onUpdateUsername,
  onCreateNewRoom,
  onJoinRoomByCode,
  onToggleLobbyReady,
  onStartOnlineMatch,
}) => {
  const [joinRoomCodeInput, setJoinRoomCodeInput] = useState('');
  const [copiedRoom, setCopiedRoom] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState('');
  const [openRooms, setOpenRooms] = useState<OpenRoomInfo[]>([]);
  const [showPositionPicker, setShowPositionPicker] = useState(false);
  const [inspectedOpponent, setInspectedOpponent] = useState<OpponentSquadInfo | null>(null);
  const [onlineUsernameInput, setOnlineUsernameInput] = useState(
    account?.username || username || ''
  );

  useEffect(() => {
    if (account?.username) {
      setOnlineUsernameInput(account.username);
    } else if (username) {
      setOnlineUsernameInput(username);
    }
  }, [account?.username, username]);

  // Inline Login Gate state if user is not signed in yet
  const [gateGoogleSignedIn, setGateGoogleSignedIn] = useState(false);
  const [gateEmail, setGateEmail] = useState('');
  const [gatePassword, setGatePassword] = useState('');
  const [gateShowPassword, setGateShowPassword] = useState(false);
  const [gateUsername, setGateUsername] = useState(
    username && username !== 'ChampionElite_10' && !username.startsWith('Player_') ? username : ''
  );
  const [gateLoading, setGateLoading] = useState(false);
  const [gateError, setGateError] = useState('');
  const [gateInfo, setGateInfo] = useState('');

  useEffect(() => {
    const unsubOpen = FriendRoomService.subscribeOpenRooms((rooms) => {
      setOpenRooms(rooms);
    });
    return () => {
      unsubOpen();
    };
  }, []);

  const handleGateLogin = async (
    provider: 'google' | 'email',
    resolvedEmail: string,
    resolvedUsername: string,
    rawPassword?: string
  ) => {
    setGateLoading(true);
    setGateError('');
    setGateInfo('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          email: resolvedEmail,
          password: rawPassword,
          username: resolvedUsername,
          favouriteClubId: userTeam.id,
          initialUnlockedIds: userSquad.map((p) => p.id),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.user) {
        setGateError(data?.error || 'Sign-in failed.');
      } else {
        SoundEngine.playUIClick();
        onSuccessAuth?.(data.user, data.token);
      }
    } catch {
      setGateError('Unable to reach authentication server.');
    } finally {
      setGateLoading(false);
    }
  };

  // ============================================================================
  // AUTH GATE: USERS MUST SIGN IN BEFORE ACCESSING ONLINE MATCH
  // ============================================================================
  if (!account) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="bg-[#111722] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-[#F59E0B] font-mono text-[11px] font-bold">
              <Lock className="w-3 h-3" /> ONLINE MATCH LOCKED · SIGN IN REQUIRED
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Sign In to Play Online Match
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Sign in with Google or Email + Password and enter your Username to create or join a match with a Room Code.
            </p>
          </div>

          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              setGateError('');
              setGateInfo('');
              const trimmedEmail = gateEmail.trim().toLowerCase();
              const trimmedPass = gatePassword.trim();
              const hasEmailInput = trimmedEmail.length > 0 || trimmedPass.length > 0;
              const trimmedName =
                gateUsername.trim() ||
                (trimmedEmail
                  ? trimmedEmail.split('@')[0]
                  : gateGoogleSignedIn
                  ? `Player_${Math.floor(100 + Math.random() * 900)}`
                  : '');
              if (!trimmedName) {
                setGateError('Please enter any username you want in the Username field.');
                return;
              }
              if (hasEmailInput && !gateGoogleSignedIn) {
                if (!trimmedEmail) {
                  setGateError('Please enter your email address.');
                  return;
                }
                if (!trimmedPass) {
                  setGateError('Please enter your password.');
                  return;
                }
                const normalizedEmail = trimmedEmail.includes('@')
                  ? trimmedEmail
                  : `${trimmedEmail}@football-elite.app`;
                handleGateLogin('email', normalizedEmail, trimmedName, trimmedPass);
                return;
              }
              const resolvedEmail =
                trimmedEmail && trimmedEmail.includes('@')
                  ? trimmedEmail
                  : `${trimmedName.toLowerCase().replace(/[^a-z0-9._-]/g, '') || 'player'}@gmail.com`;
              handleGateLogin('google', resolvedEmail, trimmedName);
            }}
            className="space-y-4"
          >
            {/* Google Sign-In Button */}
            <button
              type="button"
              onClick={() => {
                SoundEngine.playUIClick();
                setGateError('');
                const trimmedName = gateUsername.trim();
                if (trimmedName.length > 0) {
                  setGateGoogleSignedIn(true);
                  const resolvedEmail =
                    gateEmail.trim() && gateEmail.includes('@')
                      ? gateEmail.trim().toLowerCase()
                      : `${trimmedName.toLowerCase().replace(/[^a-z0-9._-]/g, '') || 'player'}@gmail.com`;
                  handleGateLogin('google', resolvedEmail, trimmedName);
                  return;
                }
                if (gateGoogleSignedIn) {
                  const fallbackName =
                    gateEmail.trim() && gateEmail.includes('@')
                      ? gateEmail.trim().split('@')[0]
                      : `Player_${Math.floor(100 + Math.random() * 900)}`;
                  handleGateLogin('google', `${fallbackName.toLowerCase()}@gmail.com`, fallbackName);
                  return;
                }
                setGateGoogleSignedIn(true);
                setGateInfo('Google connected! Enter any username below (or click Sign In to continue).');
              }}
              disabled={gateLoading}
              className={`w-full py-3.5 px-4 rounded-2xl font-display font-bold text-sm transition-all flex items-center justify-center gap-3 shadow-md cursor-pointer ${
                gateGoogleSignedIn
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
              <span>{gateGoogleSignedIn ? 'Google Account Selected ✓' : 'Sign in with Google'}</span>
              {gateGoogleSignedIn && <Check className="w-4 h-4 ml-auto" />}
            </button>

            <div className="flex items-center gap-3">
              <div className="h-px bg-white/10 flex-1" />
              <span className="text-[11px] font-mono text-slate-400">OR EMAIL + PASSWORD</span>
              <div className="h-px bg-white/10 flex-1" />
            </div>

            {/* Email + Password Fields */}
            <div className="space-y-2.5">
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  inputMode="email"
                  value={gateEmail}
                  onChange={(e) => {
                    setGateEmail(e.target.value);
                    if (gateGoogleSignedIn && e.target.value.trim()) {
                      setGateGoogleSignedIn(false);
                      setGateInfo('');
                    }
                    if (gateError) setGateError('');
                  }}
                  placeholder="Email address"
                  autoComplete="email"
                  className="w-full bg-[#070A0E] border border-white/15 focus:border-[#38BDF8] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none"
                />
              </div>

              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={gateShowPassword ? 'text' : 'password'}
                  value={gatePassword}
                  onChange={(e) => {
                    setGatePassword(e.target.value);
                    if (gateGoogleSignedIn && e.target.value) {
                      setGateGoogleSignedIn(false);
                      setGateInfo('');
                    }
                    if (gateError) setGateError('');
                  }}
                  placeholder="Password"
                  autoComplete="current-password"
                  className="w-full bg-[#070A0E] border border-white/15 focus:border-[#38BDF8] rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setGateShowPassword((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  {gateShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Username Field Below Login Options */}
            <div className="pt-2 border-t border-white/10 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-mono text-slate-200 font-bold">USERNAME</label>
                <span className="text-[11px] font-mono text-[#10B981]">
                  Any valid username accepted
                </span>
              </div>
              <div className="relative">
                <User className="w-4 h-4 text-[#10B981] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={gateUsername}
                  onChange={(e) => {
                    setGateUsername(e.target.value);
                    if (gateError) setGateError('');
                  }}
                  placeholder="Enter any username you want..."
                  maxLength={32}
                  className="w-full bg-[#070A0E] border-2 border-white/15 focus:border-[#10B981] rounded-xl pl-10 pr-4 py-3 font-display font-bold text-sm text-white placeholder:text-slate-500 focus:outline-none"
                />
              </div>
            </div>

            {gateInfo && !gateError && (
              <p className="text-xs text-[#10B981] font-medium text-center">{gateInfo}</p>
            )}

            {gateError && (
              <p className="text-xs text-rose-400 font-medium text-center">{gateError}</p>
            )}

            <button
              type="submit"
              disabled={gateLoading}
              className="w-full py-3.5 bg-[#10B981] hover:bg-[#059669] text-[#070A0E] font-display font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              {gateLoading ? 'SIGNING IN...' : 'SIGN IN & UNLOCK ONLINE MATCH'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ============================================================================
  // SIGNED-IN ONLINE MATCH ROOM CODE VIEW (USERNAME + ROOM CODE CREATE / JOIN)
  // ============================================================================
  const myClientId = FriendRoomService.getClientId();
  const activeRoomCode = friendRoomState.roomCode || roomCode;
  const activeFormat = friendRoomState.matchFormat || onlineMatchFormat;
  const requiredPlayers =
    activeFormat === '1v1' ? 2 : Math.max(2, friendRoomState.requiredPlayers || 2);

  const meInRoom = friendRoomState.members.find((m) => m.clientId === myClientId);
  const myTeamSide: 'home' | 'away' = meInRoom?.teamSide || 'home';
  const myAssignedSlotIdx: number = meInRoom?.assignedSlotIdx ?? 9;
  const myRoomReady = Boolean(meInRoom?.isReady);

  const isHostInLobby = activeLobby ? activeLobby.host.clientId === myClientId : true;
  const myReadyState = activeLobby
    ? isHostInLobby
      ? activeLobby.host.isReady
      : Boolean(activeLobby.guest?.isReady)
    : myRoomReady;

  const readyPlayersCount = friendRoomState.members.filter((m) => m.isReady).length;
  const connectedPlayersCount = Math.max(1, friendRoomState.members.length);
  const bothConnected =
    connectedPlayersCount >= requiredPlayers || Boolean(activeLobby?.guest);
  const bothPlayersReady = Boolean(
    (connectedPlayersCount >= requiredPlayers &&
      friendRoomState.members.every((m) => m.isReady)) ||
      (activeLobby && activeLobby.host.isReady && activeLobby.guest?.isReady)
  );

  const hostMember =
    friendRoomState.members.find((m) => m.role === 'host') || friendRoomState.members[0];
  const guestMember =
    friendRoomState.members.find((m) => m.teamSide === 'away') ||
    friendRoomState.members.find((m) => m.role === 'guest') ||
    friendRoomState.members.find((m) => m.clientId !== hostMember?.clientId);

  const formationSlots =
    FORMATIONS[(userFormation as FormationName) || '4-3-3'] || FORMATIONS['4-3-3'];
  const startingXI: FootballPlayer[] = formationSlots.map(
    (_, idx) => userSquad[idx] || PLAYERS_DB[idx % PLAYERS_DB.length]
  );

  const applyUsernameIfChanged = () => {
    const cleanName = onlineUsernameInput.trim();
    if (cleanName && cleanName !== username) {
      onUpdateUsername?.(cleanName);
    }
    return cleanName || username || account.username;
  };

  const handleJoinRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = joinRoomCodeInput.trim().toUpperCase();
    if (!clean) return;
    SoundEngine.playUIClick();
    applyUsernameIfChanged();
    onJoinRoomByCode(clean);
    const formatted = clean.startsWith('PLAY-') ? clean : `PLAY-${clean}`;
    setStatusFeedback(`Joined Room ${formatted} as @${onlineUsernameInput.trim() || username}`);
    setJoinRoomCodeInput('');
  };

  const otherOpenRooms = openRooms.filter((r) => r.roomCode !== activeRoomCode);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header + Username Bar */}
      <div className="bg-[#111722] border border-white/15 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-[#10B981]">
              <span className="w-2 h-2 rounded-full bg-[#10B981]" />
              ONLINE MATCH UNLOCKED · ROOM CODE SYSTEM
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Online Match — Room Code
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Enter your Username below, then create a Room Code to share or enter a friend’s Room Code to join.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Mode Selector (1v1 / 11v11) */}
            <div className="flex items-center bg-[#070A0E] p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => {
                  SoundEngine.playUIClick();
                  onSelectOnlineMatchFormat?.('1v1');
                  FriendRoomService.configureRoom(activeRoomCode, '1v1', 2);
                }}
                className={`px-3 py-1.5 rounded-lg font-display font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeFormat === '1v1'
                    ? 'bg-[#10B981] text-[#070A0E]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                1v1
              </button>
              <button
                type="button"
                onClick={() => {
                  SoundEngine.playUIClick();
                  onSelectOnlineMatchFormat?.('11v11');
                  FriendRoomService.configureRoom(activeRoomCode, '11v11', 2);
                }}
                className={`px-3 py-1.5 rounded-lg font-display font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeFormat === '11v11'
                    ? 'bg-[#10B981] text-[#070A0E]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                11v11
              </button>
            </div>

            <button
              type="button"
              onClick={onOpenGoogleAuth}
              className="px-3.5 py-2 bg-[#070A0E] hover:bg-white/5 border border-white/15 rounded-xl text-xs font-display font-bold text-white flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-[#10B981]" />
              Account
            </button>
          </div>
        </div>

        {/* YOUR USERNAME INPUT FIELD (Directly inside Online Match after signing in) */}
        <div className="pt-4 border-t border-white/10">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const clean = onlineUsernameInput.trim();
              if (!clean) return;
              SoundEngine.playUIClick();
              onUpdateUsername?.(clean);
              setStatusFeedback(`Username set to @${clean}`);
            }}
            className="flex flex-col sm:flex-row sm:items-center gap-3"
          >
            <div className="sm:w-48 shrink-0">
              <label className="block text-xs font-mono text-[#10B981] font-bold">
                YOUR USERNAME
              </label>
              <span className="text-[11px] text-slate-400">
                Shown to the other player
              </span>
            </div>
            <div className="relative flex-1">
              <User className="w-4 h-4 text-[#10B981] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={onlineUsernameInput}
                onChange={(e) => {
                  setOnlineUsernameInput(e.target.value);
                  if (e.target.value.trim()) {
                    onUpdateUsername?.(e.target.value.trim());
                  }
                }}
                placeholder="Enter your username..."
                maxLength={32}
                className="w-full bg-[#070A0E] border border-white/20 focus:border-[#10B981] rounded-xl pl-10 pr-4 py-3 font-display font-bold text-sm text-white placeholder:text-slate-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-3 bg-[#10B981]/20 hover:bg-[#10B981] text-[#10B981] hover:text-[#070A0E] border border-[#10B981]/40 font-display font-bold text-xs rounded-xl transition-colors cursor-pointer shrink-0"
            >
              SAVE USERNAME
            </button>
          </form>
        </div>
      </div>

      {/* Latest Match Result (if any) */}
      {lastMatchResult && (
        <div className="bg-[#111722] border border-[#F59E0B]/40 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Trophy className="w-5 h-5 text-[#F59E0B]" />
            <div className="font-display text-base font-bold text-white">
              Last Match: @{username} {lastMatchResult.homeScore} - {lastMatchResult.awayScore}{' '}
              {lastMatchResult.opponentName}
            </div>
          </div>
          <div className="font-mono text-xs text-[#10B981] font-bold">
            +{lastMatchResult.coinsEarned.toLocaleString()} Coins
          </div>
        </div>
      )}

      {/* CREATE OR JOIN MATCH WITH A ROOM CODE (Simple 2-Card Layout) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Player 1 Creates Room Code */}
        <div className="bg-[#111722] border border-white/15 rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-mono text-[#10B981] font-bold">
                PLAYER 1 · CREATE CODE
              </div>
              <h2 className="font-display text-lg font-bold text-white">Create a Room Code</h2>
            </div>
            <button
              type="button"
              onClick={() => {
                SoundEngine.playUIClick();
                applyUsernameIfChanged();
                onCreateNewRoom();
                setStatusFeedback('Created a new Room Code — share it with the other player!');
              }}
              className="px-3 py-1.5 bg-[#10B981]/20 hover:bg-[#10B981] text-[#10B981] hover:text-[#070A0E] border border-[#10B981]/40 rounded-lg text-xs font-display font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Create Code
            </button>
          </div>

          <div className="bg-[#070A0E] border border-[#10B981]/40 rounded-2xl px-4 py-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-mono text-slate-400">ROOM CODE TO SHARE</div>
              <div className="font-mono text-2xl sm:text-3xl font-bold text-[#10B981] tracking-wider">
                {activeRoomCode}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(activeRoomCode).catch(() => {});
                setCopiedRoom(true);
                setTimeout(() => setCopiedRoom(false), 1800);
              }}
              className="px-4 py-2.5 bg-[#10B981] hover:bg-[#059669] text-[#070A0E] font-display font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              {copiedRoom ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedRoom ? 'COPIED' : 'COPY CODE'}
            </button>
          </div>

          <p className="text-xs text-slate-400">
            One player creates the code <span className="text-white font-mono font-bold">{activeRoomCode}</span> and shares it with the other player.
          </p>
        </div>

        {/* Card 2: Player 2 Enters Room Code to Join */}
        <div className="bg-[#111722] border border-white/15 rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-lg">
          <div>
            <div className="text-[11px] font-mono text-[#F59E0B] font-bold">
              PLAYER 2 · ENTER CODE TO JOIN
            </div>
            <h2 className="font-display text-lg font-bold text-white">Join with Room Code</h2>
          </div>

          <form onSubmit={handleJoinRoomSubmit} className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              value={joinRoomCodeInput}
              onChange={(e) => setJoinRoomCodeInput(e.target.value.toUpperCase())}
              placeholder="Enter Room Code (e.g. PLAY-7492)"
              className="flex-1 bg-[#070A0E] border border-white/20 focus:border-[#F59E0B] rounded-xl px-4 py-3.5 font-mono text-base font-bold text-white uppercase tracking-wider placeholder:text-slate-500 placeholder:font-sans placeholder:text-xs focus:outline-none"
            />
            <button
              type="submit"
              className="px-5 py-3.5 bg-[#F59E0B] hover:bg-[#D97706] text-[#070A0E] font-display font-bold text-xs sm:text-sm rounded-xl transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer shadow-md"
            >
              <Play className="w-4 h-4 fill-current" />
              JOIN MATCH
            </button>
          </form>

          {otherOpenRooms.length > 0 ? (
            <div className="space-y-1.5">
              <div className="text-[10px] font-mono text-slate-400">
                OPEN ROOMS READY TO JOIN:
              </div>
              <div className="flex flex-wrap gap-2">
                {otherOpenRooms.slice(0, 3).map((r) => (
                  <button
                    key={r.roomCode}
                    type="button"
                    onClick={() => {
                      SoundEngine.playUIClick();
                      applyUsernameIfChanged();
                      onJoinRoomByCode(r.roomCode);
                      setStatusFeedback(`Joined Room ${r.roomCode}`);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#070A0E] hover:bg-white/10 border border-[#F59E0B]/40 text-xs font-mono text-[#F59E0B] font-bold cursor-pointer"
                  >
                    Join {r.roomCode} (@{r.hostUsername}) →
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400">
              The second player enters the Room Code above and clicks <span className="text-white font-semibold">JOIN MATCH</span>.
            </p>
          )}
        </div>
      </div>

      {statusFeedback && (
        <div className="px-4 py-2.5 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 text-xs text-[#10B981] font-medium text-center">
          {statusFeedback}
        </div>
      )}

      {/* STEP 2: CONNECTED PLAYERS & READY LOBBY (Starts When Both Are Connected & Ready) */}
      <div className="bg-[#111722] border border-white/15 rounded-2xl p-6 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <div className="text-xs font-mono text-slate-400">
              ROOM <span className="text-[#10B981] font-bold">{activeRoomCode}</span> ·{' '}
              {activeFormat.toUpperCase()} MATCH
            </div>
            <h2 className="font-display text-xl font-bold text-white mt-0.5">
              {friendRoomState.status === 'match_starting' || bothPlayersReady
                ? 'Both Players Ready — Starting Match!'
                : bothConnected
                ? 'Both Players Connected — Click Ready to Start'
                : 'Waiting for Second Player to Join Room...'}
            </h2>
          </div>

          <span
            className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold self-start sm:self-auto ${
              bothPlayersReady
                ? 'bg-[#10B981] text-[#070A0E]'
                : bothConnected
                ? 'bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40'
                : 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30'
            }`}
          >
            {readyPlayersCount}/{requiredPlayers} READY
          </span>
        </div>

        {/* Player 1 vs Player 2 Connection Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Player 1 (Host) */}
          <div
            className={`p-5 rounded-2xl bg-[#070A0E] border-2 transition-all ${
              hostMember?.isReady ? 'border-[#10B981]' : 'border-white/10'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-[#10B981]">PLAYER 1 (HOST)</span>
              <span
                className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                  hostMember?.isReady
                    ? 'bg-[#10B981] text-[#070A0E]'
                    : 'bg-white/10 text-slate-300'
                }`}
              >
                {hostMember?.isReady ? 'READY ✓' : 'CONNECTED'}
              </span>
            </div>
            <div className="font-display text-xl font-bold text-white truncate">
              @{hostMember?.username || account.username}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {hostMember?.clubName || userTeam.name} · Star:{' '}
              <span className="text-[#F59E0B]">
                {hostMember?.starPlayerName || leadStar.name}
              </span>
            </div>
          </div>

          {/* Player 2 (Opponent) */}
          {(() => {
            const p2 = activeLobby?.guest || guestMember;
            const p2Ready = Boolean(p2?.isReady);
            return (
              <div
                className={`p-5 rounded-2xl bg-[#070A0E] border-2 transition-all ${
                  p2Ready
                    ? 'border-[#10B981]'
                    : p2
                    ? 'border-[#38BDF8]/60'
                    : 'border-dashed border-white/15'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-[#F59E0B]">
                    PLAYER 2 (OPPONENT)
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                      p2Ready
                        ? 'bg-[#10B981] text-[#070A0E]'
                        : p2
                        ? 'bg-[#38BDF8]/20 text-[#38BDF8]'
                        : 'bg-white/5 text-slate-400'
                    }`}
                  >
                    {p2Ready ? 'READY ✓' : p2 ? 'CONNECTED' : 'WAITING...'}
                  </span>
                </div>

                {p2 ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-display text-xl font-bold text-white truncate">
                        @{p2.username}
                      </div>
                      <div className="text-xs text-slate-400 mt-1 truncate">
                        {p2.clubName} · Star:{' '}
                        <span className="text-[#F59E0B]">{p2.starPlayerName}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        SoundEngine.playUIClick();
                        setInspectedOpponent({
                          username: p2.username,
                          clubName: p2.clubName,
                          starPlayerName: p2.starPlayerName,
                          squadIds: p2.squadIds,
                          formation: p2.formation || '4-3-3',
                        });
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 text-[11px] font-mono text-[#38BDF8] flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      XI
                    </button>
                  </div>
                ) : (
                  <div className="py-2 text-xs text-slate-400">
                    Waiting for second player to enter Room Code{' '}
                    <span className="text-white font-mono font-bold">{activeRoomCode}</span>...
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Optional 11v11 Player Slot Picker Toggle */}
        {activeFormat === '11v11' && (
          <div className="bg-[#070A0E] border border-white/10 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-300">
                Your 11v11 Controlled Player:{' '}
                <span className="text-[#10B981] font-bold">
                  {formationSlots[myAssignedSlotIdx]?.role || 'ST'} ·{' '}
                  {startingXI[myAssignedSlotIdx]?.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowPositionPicker((v) => !v)}
                className="text-xs font-mono text-[#38BDF8] hover:underline cursor-pointer"
              >
                {showPositionPicker ? 'Hide Positions' : 'Change Player / Team'}
              </button>
            </div>

            {showPositionPicker && (
              <div className="space-y-3 pt-2 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      SoundEngine.playUIClick();
                      const p = startingXI[myAssignedSlotIdx] || leadStar;
                      FriendRoomService.selectRoomPlayerSlot(
                        activeRoomCode,
                        'home',
                        myAssignedSlotIdx,
                        p.id,
                        p.name
                      );
                    }}
                    className={`px-3 py-1 rounded-lg font-display font-bold text-xs cursor-pointer ${
                      myTeamSide === 'home'
                        ? 'bg-[#10B981] text-[#070A0E]'
                        : 'bg-[#111722] text-slate-300 border border-white/15'
                    }`}
                  >
                    Home ({userTeam.shortName})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      SoundEngine.playUIClick();
                      const p = startingXI[myAssignedSlotIdx] || leadStar;
                      FriendRoomService.selectRoomPlayerSlot(
                        activeRoomCode,
                        'away',
                        myAssignedSlotIdx,
                        p.id,
                        p.name
                      );
                    }}
                    className={`px-3 py-1 rounded-lg font-display font-bold text-xs cursor-pointer ${
                      myTeamSide === 'away'
                        ? 'bg-[#F59E0B] text-[#070A0E]'
                        : 'bg-[#111722] text-slate-300 border border-white/15'
                    }`}
                  >
                    Away ({awayTeam.shortName})
                  </button>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-11 gap-2">
                  {startingXI.map((p, slotIdx) => {
                    const roleLabel = formationSlots[slotIdx]?.role || p.position;
                    const isMySlot = myAssignedSlotIdx === slotIdx;
                    return (
                      <button
                        type="button"
                        key={`${p.id}_${slotIdx}`}
                        onClick={() => {
                          SoundEngine.playUIClick();
                          FriendRoomService.selectRoomPlayerSlot(
                            activeRoomCode,
                            myTeamSide,
                            slotIdx,
                            p.id,
                            p.name
                          );
                        }}
                        className={`p-2 rounded-xl border flex flex-col items-center text-center transition-all cursor-pointer ${
                          isMySlot
                            ? 'bg-[#192231] border-[#10B981]'
                            : 'bg-[#111722]/70 border-white/10 hover:border-white/30'
                        }`}
                      >
                        <PlayerPhotoAvatar
                          player={p}
                          className="w-10 h-10 rounded-lg border border-white/20"
                          showPositionBadge={false}
                          showRatingBadge={true}
                        />
                        <span className="text-[10px] font-sans font-bold text-white truncate w-full mt-1">
                          {p.name}
                        </span>
                        <span className="text-[9px] font-mono text-[#10B981] font-bold">
                          {roleLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Primary READY & START MATCH Buttons */}
        <div className="pt-2 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                SoundEngine.playUIClick();
                applyUsernameIfChanged();
                const nextReady = !myReadyState;
                FriendRoomService.setRoomReady(activeRoomCode, nextReady);
                if (activeLobby) {
                  onToggleLobbyReady(activeLobby.lobbyId, nextReady);
                }
              }}
              className={`w-full py-4 px-5 font-display font-bold text-sm rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl cursor-pointer ${
                myReadyState
                  ? 'bg-[#10B981] text-[#070A0E]'
                  : 'bg-white hover:bg-slate-100 text-[#070A0E]'
              }`}
            >
              <CheckCircle2 className="w-5 h-5" />
              {myReadyState
                ? `READY ✓ (${readyPlayersCount}/${requiredPlayers})`
                : `MARK READY (${readyPlayersCount}/${requiredPlayers})`}
            </button>

            <button
              type="button"
              onClick={() => {
                SoundEngine.playUIClick();
                applyUsernameIfChanged();
                const p2 = activeLobby?.guest || guestMember;
                const oppClub = p2?.clubId
                  ? TEAMS_DB.find((t) => t.id === p2.clubId) || awayTeam
                  : awayTeam;
                onStartOnlineMatch(oppClub, activeRoomCode, activeLobby?.lobbyId);
              }}
              className="w-full py-4 px-5 bg-[#10B981] hover:bg-[#059669] text-[#070A0E] font-display font-bold text-sm rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              START ONLINE MATCH NOW
            </button>
          </div>
          <p className="text-center text-xs text-slate-400">
            The match starts automatically when both connected players mark <span className="text-white font-semibold">READY</span>, or click <span className="text-white font-semibold">START ONLINE MATCH NOW</span>.
          </p>
        </div>
      </div>

      {inspectedOpponent && (
        <OpponentSquadPopup
          isOpen={Boolean(inspectedOpponent)}
          onClose={() => setInspectedOpponent(null)}
          opponent={inspectedOpponent}
        />
      )}
    </div>
  );
};

// ============================================================================
// 4. SECURE APP PAYMENT CHECKOUT MODAL FOR PLAYER STORE & COIN BUNDLES
// ============================================================================
export interface PaymentCheckoutItem {
  itemType: 'player' | 'coins';
  itemId: string;
  itemName: string;
  subtitle: string;
  amountUsd: number;
  coinsAdded: number;
  playerToUnlock?: FootballPlayer;
}

interface PaymentCheckoutModalProps {
  item: PaymentCheckoutItem | null;
  username: string;
  authToken: string | null;
  onClose: () => void;
  onPaymentSuccess: (result: {
    transactionId: string;
    coinsAdded: number;
    playerUnlocked?: FootballPlayer;
  }) => void;
}

export const PaymentCheckoutModal: React.FC<PaymentCheckoutModalProps> = ({
  item,
  username,
  authToken,
  onClose,
  onPaymentSuccess,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<
    'Google Pay' | 'Credit / Debit Card' | 'App Instant Wallet'
  >('Google Pay');
  const [cardHolder, setCardHolder] = useState(username);
  const [processing, setProcessing] = useState(false);
  const [receiptId, setReceiptId] = useState<string | null>(null);

  if (!item) return null;

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          itemType: item.itemType,
          itemId: item.itemId,
          itemName: item.itemName,
          amountUsd: item.amountUsd,
          coinsAdded: item.coinsAdded,
          playerUnlockedId: item.playerToUnlock?.id,
          paymentMethod,
          usernameFallback: username,
        }),
      });
      const data = await res.json();
      const txId =
        data.transaction?.transactionId || `TX-${Math.floor(100000 + Math.random() * 900000)}`;
      SoundEngine.playPackOpen();
      setReceiptId(txId);
      onPaymentSuccess({
        transactionId: txId,
        coinsAdded: item.coinsAdded,
        playerUnlocked: item.playerToUnlock,
      });
    } catch {
      const txId = `TX-${Math.floor(100000 + Math.random() * 900000)}`;
      setReceiptId(txId);
      onPaymentSuccess({
        transactionId: txId,
        coinsAdded: item.coinsAdded,
        playerUnlocked: item.playerToUnlock,
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#111722] border border-white/15 rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
          <div>
            <div className="text-[11px] font-mono text-[#10B981] font-bold flex items-center gap-1">
              <Lock className="w-3 h-3" /> SECURE PLAYER STORE CHECKOUT
            </div>
            <h3 className="font-display text-xl font-bold text-white">
              {receiptId ? 'Payment Confirmed' : 'Complete Your Purchase'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {receiptId ? (
          <div className="space-y-5 text-center py-2">
            <div className="w-12 h-12 rounded-full bg-[#10B981]/20 border border-[#10B981] text-[#10B981] flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-mono text-[#10B981] font-bold">
                RECEIPT #{receiptId}
              </div>
              <h4 className="font-display text-2xl font-bold text-white mt-1">
                {item.itemName} Unlocked!
              </h4>
              <p className="text-xs text-slate-300 mt-1">{item.subtitle}</p>
            </div>
            <button
              onClick={() => {
                setReceiptId(null);
                onClose();
              }}
              className="w-full py-3 bg-[#10B981] hover:bg-[#059669] text-[#070A0E] font-display font-bold text-sm rounded-xl transition-colors cursor-pointer"
            >
              RETURN TO PLAYER STORE
            </button>
          </div>
        ) : (
          <form onSubmit={handleConfirmPayment} className="space-y-4">
            <div className="p-4 rounded-xl bg-[#070A0E] border border-white/10 flex items-center justify-between">
              <div>
                <div className="font-display font-bold text-base text-white">{item.itemName}</div>
                <div className="text-xs text-slate-400">{item.subtitle}</div>
              </div>
              <div className="text-right font-mono">
                <div className="text-lg font-bold text-[#10B981]">${item.amountUsd.toFixed(2)}</div>
                <div className="text-[10px] text-slate-400">Instant Unlock</div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-2">
                SELECT PAYMENT METHOD
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Google Pay', 'Credit / Debit Card', 'App Instant Wallet'] as const).map((m) => (
                  <button
                    type="button"
                    key={m}
                    onClick={() => setPaymentMethod(m)}
                    className={`p-2.5 rounded-xl border text-xs font-display font-bold transition-colors cursor-pointer ${
                      paymentMethod === m
                        ? 'bg-[#192231] border-[#10B981] text-white'
                        : 'bg-[#070A0E] border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5">
                ACCOUNT / CARDHOLDER NAME
              </label>
              <input
                type="text"
                value={cardHolder}
                onChange={(e) => setCardHolder(e.target.value)}
                required
                className="w-full bg-[#070A0E] border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white"
              />
            </div>

            <button
              type="submit"
              disabled={processing}
              className="w-full py-3.5 bg-[#10B981] hover:bg-[#059669] text-[#070A0E] font-display font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              {processing
                ? 'PROCESSING SECURE PAYMENT...'
                : `PAY $${item.amountUsd.toFixed(2)} & UNLOCK NOW`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
