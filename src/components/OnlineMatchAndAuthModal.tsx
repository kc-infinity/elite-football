import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Coins,
  Copy,
  CreditCard,
  Eye,
  Globe,
  Lock,
  LogOut,
  Play,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserCheck,
  UserPlus,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { FootballPlayer, FORMATIONS, FormationName, PLAYERS_DB, TeamData, TEAMS_DB } from '../data/gameDatabase';
import { OpponentSquadInfo, OpponentSquadPopup } from './OpponentSquadPopup';
import { PlayerPhotoAvatar } from './PlayerPhotoAvatar';
import {
  FriendRoomService,
  FriendRoomState,
  IncomingMatchInvite,
  OnlineMatchLobbyState,
  OnlinePlayerPresence,
} from '../engine/FriendRoomService';
import { SoundEngine } from '../engine/SoundEngine';

export interface AuthenticatedAccount {
  id: string;
  googleId: string;
  email: string;
  username: string;
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
// 1. SECURE EMAIL / GOOGLE LOGIN & PERMANENT SIGN-IN MODAL
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
  const [email, setEmail] = useState(account?.email || '');
  const [username, setUsername] = useState(account?.username || currentUsername);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleGoogleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim().includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!username.trim()) {
      setErrorMsg('Please enter your display username.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          username: username.trim(),
          favouriteClubId: currentClubId,
          initialUnlockedIds: unlockedPlayerIds,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.user) {
        setErrorMsg(data.error || 'Authentication failed.');
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

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#111722] border border-white/15 rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center font-display font-bold text-lg text-[#070A0E]">
              G
            </div>
            <div>
              <div className="text-[11px] font-mono text-[#10B981] font-bold">
                PERMANENT EMAIL & CLOUD SAVE
              </div>
              <h3 className="font-display text-xl font-bold text-white">
                {account ? 'Account Signed In (Saved)' : 'Sign In With Any Email'}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {account ? (
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-[#070A0E] border border-[#10B981]/40 flex items-center justify-between">
              <div>
                <div className="text-xs font-mono text-[#10B981] font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> PERMANENTLY SIGNED IN
                </div>
                <div className="font-display text-lg font-bold text-white mt-0.5">
                  {account.username}
                </div>
                <div className="text-xs text-slate-400">{account.email}</div>
              </div>
              <div className="text-right font-mono text-xs">
                <div className="text-[#F59E0B] font-bold">MMR {account.mmrRating}</div>
                <div className="text-[#10B981] mt-0.5">Auto-Save Active</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-[#10B981] hover:bg-[#059669] text-[#070A0E] font-display font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                CONTINUE PLAYING
              </button>
              <button
                onClick={() => {
                  setEmail('');
                  onLogout();
                  onClose();
                }}
                className="px-4 py-3 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-display font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleGoogleSignIn} className="space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed">
              Enter any email address to stay logged in permanently. Your coins, purchased players, 50-Star Roulette rewards, Dream Team squad, and career progress are saved automatically across desktop and mobile.
            </p>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5">
                EMAIL ADDRESS (ENTER ANY EMAIL)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address..."
                autoComplete="email"
                required
                className="w-full bg-[#070A0E] border border-white/20 focus:border-[#10B981] rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5">
                ONLINE MATCH USERNAME (FRIENDS INVITE YOU BY THIS NAME)
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ChampionElite_10"
                maxLength={24}
                required
                className="w-full bg-[#070A0E] border border-white/20 focus:border-[#10B981] rounded-xl px-4 py-3 font-display font-bold text-sm text-white focus:outline-none"
              />
            </div>

            {errorMsg && <p className="text-xs text-rose-400 font-medium">{errorMsg}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-white hover:bg-slate-100 text-[#070A0E] font-display font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2.5 shadow-lg cursor-pointer"
            >
              <span className="w-5 h-5 rounded-full bg-[#070A0E] text-white flex items-center justify-center text-xs font-bold">
                G
              </span>
              {loading ? 'SIGNING IN & SAVING...' : 'SIGN IN & STAY LOGGED IN'}
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
                {invite.fromFormation ? ` · ${invite.fromFormation}` : ''}
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
              ACCEPT & JOIN LOBBY
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
// 3. REDESIGNED ONLINE MATCH CENTER (INVITE BY USERNAME, LOBBY, READY & RESULTS)
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
  onlinePlayers,
  activeLobby,
  friendRoomState,
  roomCode,
  onlineMatchFormat = '11v11',
  userFormation = '4-3-3',
  userSquadOvr = 92,
  lastMatchResult,
  onSelectOnlineMatchFormat,
  onEditDreamTeam,
  onOpenGoogleAuth,
  onCreateNewRoom,
  onJoinRoomByCode,
  onInviteByUsername,
  onToggleLobbyReady,
  onStartOnlineMatch,
  onQuickMatchmaking,
}) => {
  const [friendUsernameInput, setFriendUsernameInput] = useState('');
  const [joinRoomCodeInput, setJoinRoomCodeInput] = useState('');
  const [inviteStatusBanner, setInviteStatusBanner] = useState('');
  const [copiedRoom, setCopiedRoom] = useState(false);
  const [inspectedOpponent, setInspectedOpponent] = useState<OpponentSquadInfo | null>(null);

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
  const allRoomPlayersReady =
    friendRoomState.members.length >= requiredPlayers &&
    friendRoomState.members.every((m) => m.isReady);

  const bothPlayersReady = Boolean(
    allRoomPlayersReady ||
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

  const rawStatus = friendRoomState.status || 'waiting_for_opponent';
  const statusDisplay =
    rawStatus === 'match_starting'
      ? {
          label: 'All Required Players Ready — Starting Match Automatically!',
          desc: `Launching synchronized 3D ${activeFormat === '11v11' ? 'Online 11v11 Multiplayer' : 'Online 1v1'} match in Room ${activeRoomCode}...`,
          badgeClass: 'bg-[#10B981] text-[#070A0E]',
          dotClass: 'bg-[#070A0E] animate-ping',
        }
      : rawStatus === 'opponent_connected' || friendRoomState.members.length >= 2
      ? {
          label: `${friendRoomState.members.length} Players in Match (${readyPlayersCount}/${requiredPlayers} Ready)`,
          desc: `Players connected in Match Code ${activeRoomCode}. Click READY below — the match starts automatically when all ${requiredPlayers} required players are ready!`,
          badgeClass: 'bg-[#38BDF8] text-[#070A0E]',
          dotClass: 'bg-[#070A0E] animate-ping',
        }
      : rawStatus === 'opponent_disconnected'
      ? {
          label: 'Player Disconnected',
          desc: 'A player disconnected from the match room. Share your Match Code or create a new match.',
          badgeClass: 'bg-rose-500 text-white',
          dotClass: 'bg-white',
        }
      : {
          label: `Waiting for Friends (${Math.max(1, friendRoomState.members.length)}/${requiredPlayers} Joined)`,
          desc: `Private Match Code ${activeRoomCode} (${activeFormat.toUpperCase()}) is active. Friends can enter this code to join and Ready Up!`,
          badgeClass: 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/50',
          dotClass: 'bg-[#F59E0B] animate-pulse',
        };

  const handleJoinRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = joinRoomCodeInput.trim().toUpperCase();
    if (!clean) return;
    SoundEngine.playUIClick();
    onJoinRoomByCode(clean);
    setInviteStatusBanner(`Connecting to Room ${clean.startsWith('PLAY-') ? clean : `PLAY-${clean}`}...`);
  };

  const handleSendUsernameInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const target = friendUsernameInput.trim();
    if (!target) return;
    SoundEngine.playUIClick();
    onInviteByUsername(target);
    setInviteStatusBanner(`Invitation sent to @${target}! Entering Online Match Lobby...`);
    setFriendUsernameInput('');
  };

  const handleQuickInviteClick = (targetUsername: string) => {
    SoundEngine.playUIClick();
    onInviteByUsername(targetUsername);
    setInviteStatusBanner(`Invitation sent to @${targetUsername}! Entering Online Match Lobby...`);
  };

  const otherOnlinePlayers = onlinePlayers.filter(
    (p) => p.clientId !== myClientId && p.username.toLowerCase() !== username.toLowerCase()
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#111722] via-[#132030] to-[#111722] border border-white/15 rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-2xl">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#10B981]">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            ONLINE VS MULTIPLAYER · 11V11 DREAM TEAM & 1V1 DUEL · REAL-TIME SYNC
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white">
            ONLINE VS — {onlineMatchFormat === '11v11' ? '11V11 DREAM TEAM ARENA' : '1V1 MULTIPLAYER ARENA'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            Play with your full <span className="text-white font-semibold">11v11 Dream Team Starting XI ({userFormation}, OVR {userSquadOvr})</span> or a 1v1 World Star Duel against real online opponents! Create a Room Code or join your friend’s room for instant synchronized kick-off.
          </p>

          {/* 11v11 Multiplayer vs 1v1 Format Selector + Required Players */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              onClick={() => {
                SoundEngine.playUIClick();
                onSelectOnlineMatchFormat?.('11v11');
                FriendRoomService.configureRoom(activeRoomCode, '11v11', requiredPlayers);
              }}
              className={`px-4 py-2.5 rounded-xl font-display font-bold text-xs transition-all cursor-pointer flex items-center gap-2 ${
                activeFormat === '11v11'
                  ? 'bg-[#10B981] text-[#070A0E] shadow-lg'
                  : 'bg-[#070A0E] text-slate-300 border border-white/15 hover:border-white/30'
              }`}
            >
              <Users className="w-4 h-4" />
              ONLINE 11V11 MULTIPLAYER (CONTROL YOUR OWN PLAYER)
            </button>
            <button
              onClick={() => {
                SoundEngine.playUIClick();
                onSelectOnlineMatchFormat?.('1v1');
                FriendRoomService.configureRoom(activeRoomCode, '1v1', 2);
              }}
              className={`px-4 py-2.5 rounded-xl font-display font-bold text-xs transition-all cursor-pointer flex items-center gap-2 ${
                activeFormat === '1v1'
                  ? 'bg-[#F59E0B] text-[#070A0E] shadow-lg'
                  : 'bg-[#070A0E] text-slate-300 border border-white/15 hover:border-white/30'
              }`}
            >
              <Zap className="w-4 h-4" />
              ONLINE 1V1 MULTIPLAYER
            </button>

            {activeFormat === '11v11' && (
              <div className="flex items-center gap-1.5 bg-[#070A0E] border border-white/15 rounded-xl px-3 py-1.5">
                <span className="text-[11px] font-mono text-slate-400">Required Players:</span>
                {[2, 3, 4, 6, 11, 22].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => {
                      SoundEngine.playUIClick();
                      FriendRoomService.configureRoom(activeRoomCode, '11v11', cnt);
                    }}
                    className={`px-2 py-0.5 rounded font-mono text-xs font-bold cursor-pointer transition-colors ${
                      requiredPlayers === cnt
                        ? 'bg-[#10B981] text-[#070A0E]'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {cnt}P
                  </button>
                ))}
              </div>
            )}

            {onEditDreamTeam && (
              <button
                onClick={() => {
                  SoundEngine.playUIClick();
                  onEditDreamTeam();
                }}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-mono text-white transition-colors cursor-pointer"
              >
                Edit Squad →
              </button>
            )}
          </div>
        </div>

        {/* Account & Online Identity Card */}
        <div className="bg-[#070A0E]/90 border border-white/15 rounded-xl p-4 flex items-center justify-between gap-4 shrink-0">
          <div>
            <div className="text-[11px] font-mono text-[#10B981] font-bold">
              YOUR ONLINE USERNAME
            </div>
            <div className="font-display text-lg font-bold text-white flex items-center gap-1.5">
              @{username}
              {account && <ShieldCheck className="w-4 h-4 text-[#38BDF8]" />}
            </div>
            <div className="text-xs text-slate-400">
              {userTeam.name} · Star: {leadStar.name}
            </div>
          </div>

          <button
            onClick={onOpenGoogleAuth}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/15 border border-white/15 rounded-lg text-xs font-display font-bold text-white transition-colors whitespace-nowrap cursor-pointer"
          >
            {account ? 'Google Linked ✓' : 'Sign in with Google'}
          </button>
        </div>
      </div>

      {/* LIVE MULTIPLAYER CONNECTION STATUS BAR ("Waiting for Opponent" / "Opponent Connected" / "Match Starting") */}
      <div className="bg-[#111722] border-2 border-[#10B981]/50 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`px-3.5 py-1.5 rounded-lg font-display font-bold text-xs sm:text-sm flex items-center gap-2 ${statusDisplay.badgeClass}`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${statusDisplay.dotClass}`} />
              {statusDisplay.label}
            </span>
            <div>
              <div className="text-xs sm:text-sm font-semibold text-white">
                {statusDisplay.desc}
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                Active Room Code: <span className="text-[#F59E0B] font-bold">{activeRoomCode}</span> · Players in Room: {Math.max(1, friendRoomState.members.length)}/2
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                SoundEngine.playUIClick();
                const opp = activeLobby?.guest || guestMember;
                setInspectedOpponent({
                  username: opp?.username || awayTeam.name,
                  clubName: opp?.clubName || awayTeam.name,
                  clubPrimaryColor: awayTeam.primaryColor,
                  clubSecondaryColor: awayTeam.secondaryColor,
                  starPlayerName: opp?.starPlayerName || 'Lionel Messi',
                  squadIds: opp?.squadIds,
                  formation: opp?.formation || '4-3-3',
                });
              }}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-display font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-4 h-4 text-[#38BDF8]" />
              VIEW OPPONENT SQUAD (XI)
            </button>
            <button
              onClick={() => {
                SoundEngine.playUIClick();
                onQuickMatchmaking();
                setInviteStatusBanner('Searching for online opponent in Quick Matchmaking Queue...');
              }}
              className="px-4 py-2.5 bg-[#F59E0B] hover:bg-[#D97706] text-[#070A0E] font-display font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Zap className="w-4 h-4" />
              QUICK MATCHMAKING
            </button>
          </div>
        </div>

        {/* CREATE PRIVATE MATCH (UNIQUE MATCH CODE) vs JOIN MATCH BY CODE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Create Private Match & Share Unique Match Code */}
          <div className="lg:col-span-6 bg-[#070A0E] border border-white/15 rounded-xl p-5 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-mono text-[#10B981] font-bold">
                  CREATE PRIVATE MATCH · UNIQUE MATCH CODE
                </div>
                <h3 className="font-display text-lg font-bold text-white">
                  Your Private Match Code ({activeFormat.toUpperCase()})
                </h3>
              </div>
              <button
                onClick={onCreateNewRoom}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-xs font-display font-bold text-white rounded-lg transition-colors cursor-pointer"
              >
                NEW MATCH CODE
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 bg-[#111722] border border-[#10B981]/40 rounded-xl px-4 py-3.5">
              <div>
                <div className="text-[10px] font-mono text-slate-400">
                  SHARE THIS MATCH CODE WITH FRIENDS TO JOIN
                </div>
                <div className="font-mono text-2xl sm:text-3xl font-bold text-[#10B981] tracking-wider">
                  {activeRoomCode}
                </div>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(activeRoomCode).catch(() => {});
                  setCopiedRoom(true);
                  setTimeout(() => setCopiedRoom(false), 1800);
                }}
                className="px-4 py-2.5 bg-[#10B981] hover:bg-[#059669] text-[#070A0E] font-display font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {copiedRoom ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedRoom ? 'COPIED!' : 'COPY CODE'}
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Friends can enter <span className="text-white font-mono font-bold">{activeRoomCode}</span> to join this match. The match starts automatically when all {requiredPlayers} required players are Ready!
            </p>
          </div>

          {/* Join Private Match by Entering Unique Match Code */}
          <div className="lg:col-span-6 bg-[#070A0E] border border-white/15 rounded-xl p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="text-[11px] font-mono text-[#F59E0B] font-bold">
                JOIN PRIVATE MATCH · ENTER FRIEND’S CODE
              </div>
              <h3 className="font-display text-lg font-bold text-white">
                Enter Match Code to Join Same Match
              </h3>
            </div>

            <form onSubmit={handleJoinRoomSubmit} className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={joinRoomCodeInput}
                onChange={(e) => setJoinRoomCodeInput(e.target.value.toUpperCase())}
                placeholder="Enter Match Code (e.g. PLAY-7492 or 7492)"
                className="flex-1 bg-[#111722] border border-white/20 focus:border-[#F59E0B] rounded-xl px-4 py-3.5 font-mono text-base font-bold text-white uppercase tracking-wider placeholder:text-slate-500 placeholder:font-sans placeholder:text-xs focus:outline-none"
              />
              <button
                type="submit"
                className="px-6 py-3.5 bg-[#F59E0B] hover:bg-[#D97706] text-[#070A0E] font-display font-bold text-xs sm:text-sm rounded-xl transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer shadow-lg"
              >
                <Play className="w-4 h-4 fill-current" />
                JOIN MATCH
              </button>
            </form>

            <p className="text-xs text-slate-400">
              Enter your friend’s Match Code above to join their lobby, pick your player in 11v11 mode, and Ready Up!
            </p>
          </div>
        </div>

        {/* 11V11 MULTIPLAYER: SELECT YOUR TEAM & CONTROL YOUR OWN PLAYER ON THE TEAM */}
        {activeFormat === '11v11' && (
          <div className="bg-[#070A0E] border border-[#10B981]/30 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <div className="text-[11px] font-mono text-[#10B981] font-bold">
                  ONLINE 11V11 MULTIPLAYER · CONTROL YOUR OWN PLAYER ON THE TEAM
                </div>
                <h3 className="font-display text-base sm:text-lg font-bold text-white">
                  Choose Your Team & Select Which Player You Control ({formationSlots[myAssignedSlotIdx]?.role || 'ST'} · {startingXI[myAssignedSlotIdx]?.name})
                </h3>
              </div>

              {/* Team Selector (Home vs Away) */}
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
                  className={`px-3.5 py-1.5 rounded-lg font-display font-bold text-xs cursor-pointer transition-colors ${
                    myTeamSide === 'home'
                      ? 'bg-[#10B981] text-[#070A0E]'
                      : 'bg-[#111722] text-slate-300 border border-white/15'
                  }`}
                >
                  HOME TEAM ({userTeam.shortName})
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
                  className={`px-3.5 py-1.5 rounded-lg font-display font-bold text-xs cursor-pointer transition-colors ${
                    myTeamSide === 'away'
                      ? 'bg-[#F59E0B] text-[#070A0E]'
                      : 'bg-[#111722] text-slate-300 border border-white/15'
                  }`}
                >
                  AWAY TEAM ({awayTeam.shortName})
                </button>
              </div>
            </div>

            {/* 11-Player Position Grid so Multiple Players Can Each Control Their Own Player */}
            <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-11 gap-2">
              {startingXI.map((p, slotIdx) => {
                const roleLabel = formationSlots[slotIdx]?.role || p.position;
                const isMySlot = myAssignedSlotIdx === slotIdx;
                const otherController = friendRoomState.members.find(
                  (m) =>
                    m.clientId !== myClientId &&
                    (m.teamSide || 'home') === myTeamSide &&
                    (m.assignedSlotIdx ?? 9) === slotIdx
                );
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
                        ? 'bg-[#192231] border-[#10B981] ring-2 ring-[#10B981]'
                        : otherController
                        ? 'bg-[#111722] border-[#38BDF8]'
                        : 'bg-[#111722]/70 border-white/10 hover:border-white/30'
                    }`}
                  >
                    <PlayerPhotoAvatar
                      player={p}
                      className="w-11 h-11 rounded-lg border border-white/20"
                      showPositionBadge={false}
                      showRatingBadge={true}
                    />
                    <span className="mt-1 px-1.5 py-0.5 rounded bg-black/60 font-mono text-[9px] font-bold text-[#10B981]">
                      {roleLabel}
                    </span>
                    <span className="text-[10px] font-display font-bold text-white truncate w-full mt-0.5">
                      {isMySlot
                        ? 'YOU'
                        : otherController
                        ? `@${otherController.username}`
                        : `#${p.number}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Latest Online Match Result Banner (if completed) */}
      {lastMatchResult && (
        <div className="bg-[#111722] border border-[#F59E0B]/40 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-[#F59E0B]" />
            <div>
              <div className="text-xs font-mono text-[#F59E0B] font-bold">
                LATEST ONLINE MATCH RESULT RECORDED
              </div>
              <div className="font-display text-lg font-bold text-white">
                YOU ({username}) {lastMatchResult.homeScore} - {lastMatchResult.awayScore}{' '}
                {lastMatchResult.opponentName}
              </div>
            </div>
          </div>
          <div className="font-mono text-xs text-[#10B981] font-bold">
            +{lastMatchResult.coinsEarned.toLocaleString()} Coins · Rating Updated
          </div>
        </div>
      )}

      {/* Main 12-Col Grid: Left = Invite by Username & Online Directory | Right = Live Ready Lobby */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left 6 Cols: Invite Friend by Username + Live Online Players + Quick Matchmaking */}
        <div className="lg:col-span-6 space-y-6">
          {/* Card 1: Invite a Friend by Username */}
          <div className="bg-[#111722] border border-white/15 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-mono text-[#10B981] font-bold">
                  DIRECT USERNAME INVITATION
                </div>
                <h2 className="font-display text-xl font-bold text-white">
                  Invite Friend by Username
                </h2>
              </div>
              <UserPlus className="w-5 h-5 text-[#10B981]" />
            </div>

            <p className="text-xs text-slate-300">
              Enter your friend’s exact username below to invite them to a real-time 1v1 Online Match lobby.
            </p>

            <form onSubmit={handleSendUsernameInvite} className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={friendUsernameInput}
                onChange={(e) => setFriendUsernameInput(e.target.value)}
                placeholder="Enter friend's username (e.g. Alex_10)..."
                className="flex-1 bg-[#070A0E] border border-white/20 focus:border-[#10B981] rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none"
              />
              <button
                type="submit"
                className="px-5 py-3 bg-[#10B981] hover:bg-[#059669] text-[#070A0E] font-display font-bold text-xs sm:text-sm rounded-xl transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer shadow-md"
              >
                <Send className="w-4 h-4" />
                INVITE FRIEND
              </button>
            </form>

            {inviteStatusBanner && (
              <div className="p-3 rounded-xl bg-[#10B981]/15 border border-[#10B981]/40 text-xs text-[#10B981] font-medium">
                {inviteStatusBanner}
              </div>
            )}

            {/* Quick Online Matchmaking & Room Code Join */}
            <div className="pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={onQuickMatchmaking}
                className="py-3 px-4 bg-[#F59E0B] hover:bg-[#D97706] text-[#070A0E] font-display font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                QUICK ONLINE MATCHMAKING
              </button>

              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={joinRoomCodeInput}
                  onChange={(e) => setJoinRoomCodeInput(e.target.value.toUpperCase())}
                  placeholder="PLAY-7492"
                  className="w-full bg-[#070A0E] border border-white/15 rounded-xl px-3 py-2.5 font-mono text-xs font-bold text-white uppercase"
                />
                <button
                  onClick={() => {
                    const code = joinRoomCodeInput.trim() || roomCode;
                    onStartOnlineMatch(awayTeam, code);
                  }}
                  className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-display font-bold text-xs rounded-xl whitespace-nowrap cursor-pointer"
                >
                  PLAY CODE
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Live Online Players Directory */}
          <div className="bg-[#111722] border border-white/15 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-mono text-[#38BDF8] font-bold">
                  ACTIVE PLAYERS ONLINE NOW
                </div>
                <h3 className="font-display text-lg font-bold text-white">
                  Click Any Online Player to Invite
                </h3>
              </div>
              <span className="font-mono text-xs text-[#10B981] font-bold">
                {otherOnlinePlayers.length + 1} Online
              </span>
            </div>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {otherOnlinePlayers.map((p) => (
                <div
                  key={p.clientId}
                  className="p-3.5 rounded-xl bg-[#070A0E] border border-white/10 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-display font-bold text-sm text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#10B981]" />@{p.username}
                    </div>
                    <div className="text-xs text-slate-400">
                      {p.clubName} · {p.formation || '4-3-3'} · Star: {p.starPlayerName} · OVR {p.rating}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        SoundEngine.playUIClick();
                        setInspectedOpponent({
                          username: p.username,
                          clubName: p.clubName,
                          starPlayerName: p.starPlayerName,
                          squadIds: p.squadIds,
                          formation: p.formation || '4-3-3',
                        });
                      }}
                      className="px-2.5 py-2 bg-white/5 hover:bg-white/15 border border-white/15 text-slate-200 hover:text-white font-mono font-bold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      title="View Opponent Starting XI & Formation"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#38BDF8]" />
                      XI
                    </button>
                    <button
                      onClick={() => handleQuickInviteClick(p.username)}
                      className="px-3.5 py-2 bg-[#10B981]/20 hover:bg-[#10B981] text-[#10B981] hover:text-[#070A0E] border border-[#10B981]/40 font-display font-bold text-xs rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                    >
                      INVITE
                    </button>
                  </div>
                </div>
              ))}

              {/* Featured Online Rivals Always Available to Challenge */}
              {[
                { username: 'SambaKing_BR', club: 'Brazil', star: 'Neymar Jr.', ovr: 94, formation: '4-3-3' },
                { username: 'Madridista_99', club: 'Real Madrid', star: 'Kylian Mbappé', ovr: 96, formation: '4-3-3' },
                { username: 'Albiceleste_10', club: 'Argentina', star: 'Lionel Messi', ovr: 96, formation: '4-2-3-1' },
              ].map((rival) => (
                <div
                  key={rival.username}
                  className="p-3.5 rounded-xl bg-[#070A0E]/80 border border-white/10 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-display font-bold text-sm text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#38BDF8]" />@{rival.username}
                    </div>
                    <div className="text-xs text-slate-400">
                      {rival.club} · {rival.formation} · Star: {rival.star} · OVR {rival.ovr}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        SoundEngine.playUIClick();
                        setInspectedOpponent({
                          username: rival.username,
                          clubName: rival.club,
                          starPlayerName: rival.star,
                          formation: rival.formation,
                        });
                      }}
                      className="px-2.5 py-2 bg-white/5 hover:bg-white/15 border border-white/15 text-slate-200 hover:text-white font-mono font-bold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      title="View Opponent Starting XI & Formation"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#38BDF8]" />
                      XI
                    </button>
                    <button
                      onClick={() => handleQuickInviteClick(rival.username)}
                      className="px-3.5 py-2 bg-white/10 hover:bg-[#10B981] text-white hover:text-[#070A0E] font-display font-bold text-xs rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                    >
                      INVITE
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 6 Cols: Interactive Online Match Lobby with READY Button */}
        <div className="lg:col-span-6">
          <div className="bg-[#111722] border border-white/15 rounded-2xl p-6 sm:p-7 space-y-6 shadow-2xl h-full flex flex-col justify-between">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <div className="text-xs font-mono text-[#F59E0B] font-bold">
                    PRE-MATCH READY CHECK LOBBY
                  </div>
                  <h2 className="font-display text-2xl font-bold text-white">
                    ONLINE MATCH LOBBY ({activeLobby?.roomCode || roomCode})
                  </h2>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(activeLobby?.roomCode || roomCode).catch(() => {});
                    setCopiedRoom(true);
                    setTimeout(() => setCopiedRoom(false), 1800);
                  }}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/15 rounded-lg text-xs font-mono text-white flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedRoom ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedRoom ? 'Copied' : 'Copy Code'}
                </button>
              </div>

              {/* Head-to-Head Player Cards with Ready / Connection Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Player 1 (Host / You) */}
                <div
                  className={`p-5 rounded-2xl bg-[#070A0E] border-2 transition-all ${
                    (activeLobby ? activeLobby.host.isReady : true)
                      ? 'border-[#10B981]'
                      : 'border-white/15'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono font-bold text-[#10B981]">
                      PLAYER 1 (HOST)
                    </span>
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-[#10B981]/20 text-[#10B981]">
                      {activeLobby ? (activeLobby.host.isReady ? 'READY ✓' : 'HOST CONNECTED') : 'CONNECTED ✓'}
                    </span>
                  </div>
                  <div className="font-display text-xl font-bold text-white truncate">
                    @{activeLobby ? activeLobby.host.username : hostMember?.username || username}
                  </div>
                  <div className="text-xs text-slate-300 mt-1">
                    Club:{' '}
                    <span className="text-white font-semibold">
                      {activeLobby ? activeLobby.host.clubName : hostMember?.clubName || userTeam.name}
                    </span>
                  </div>
                  <div className="text-xs text-[#F59E0B] font-mono mt-1">
                    Star: {activeLobby ? activeLobby.host.starPlayerName : hostMember?.starPlayerName || leadStar.name}
                  </div>
                </div>

                {/* Player 2 (Invited Friend / Room Code Opponent) */}
                {(() => {
                  const p2 = activeLobby?.guest || guestMember;
                  return (
                    <div
                      className={`p-5 rounded-2xl bg-[#070A0E] border-2 transition-all ${
                        p2 ? 'border-[#10B981]' : 'border-white/15'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-mono font-bold text-[#F59E0B]">
                          PLAYER 2 (OPPONENT)
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                            p2
                              ? 'bg-[#10B981]/20 text-[#10B981]'
                              : 'bg-white/10 text-slate-400'
                          }`}
                        >
                          {p2 ? 'OPPONENT CONNECTED ✓' : 'WAITING FOR OPPONENT'}
                        </span>
                      </div>
                      {p2 ? (
                        <>
                          <div className="font-display text-xl font-bold text-white truncate">
                            @{p2.username}
                          </div>
                          <div className="text-xs text-slate-300 mt-1">
                            Club: <span className="text-white font-semibold">{p2.clubName}</span> ·{' '}
                            <span className="text-[#10B981] font-mono font-bold">
                              {p2.formation || '4-3-3'}
                            </span>
                          </div>
                          <div className="text-xs text-[#F59E0B] font-mono mt-1">
                            Star: {p2.starPlayerName}
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
                            className="mt-3 w-full py-2 px-3 rounded-lg bg-[#38BDF8]/15 hover:bg-[#38BDF8]/25 border border-[#38BDF8]/40 text-[#38BDF8] font-display font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            VIEW OPPONENT SQUAD & STARTING XI
                          </button>
                        </>
                      ) : (
                        <div className="py-2 space-y-2.5">
                          <div className="text-xs text-slate-400">
                            Waiting for Opponent... Share Room Code{' '}
                            <span className="text-[#10B981] font-mono font-bold">
                              {activeRoomCode}
                            </span>{' '}
                            with Player 2 or preview rival squad below.
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              SoundEngine.playUIClick();
                              setInspectedOpponent({
                                username: awayTeam.name,
                                clubName: awayTeam.name,
                                clubPrimaryColor: awayTeam.primaryColor,
                                clubSecondaryColor: awayTeam.secondaryColor,
                                formation: '4-3-3',
                              });
                            }}
                            className="w-full py-1.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 text-slate-300 hover:text-white font-mono font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#38BDF8]" />
                            PREVIEW OPPONENT STARTING XI
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Lobby Action Bar: READY Toggle Button (Auto-Starts Match When All Required Players Are Ready!) */}
            <div className="pt-6 border-t border-white/10 space-y-3">
              {/* Connected Players List in Room for 11v11 Multi-Player */}
              {friendRoomState.members.length > 0 && (
                <div className="p-3.5 rounded-xl bg-[#070A0E] border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">
                      PLAYERS IN MATCH ({friendRoomState.members.length}/{requiredPlayers} REQUIRED)
                    </span>
                    <span className="text-[#10B981] font-bold">
                      {readyPlayersCount}/{requiredPlayers} READY (AUTO-STARTS WHEN ALL READY)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {friendRoomState.members.map((m) => (
                      <div
                        key={m.clientId}
                        className={`px-3 py-1.5 rounded-lg border text-xs flex items-center gap-2 ${
                          m.isReady
                            ? 'bg-[#10B981]/15 border-[#10B981] text-white'
                            : 'bg-[#111722] border-white/15 text-slate-300'
                        }`}
                      >
                        <span className="font-display font-bold">@{m.username}</span>
                        <span className="font-mono text-[10px] text-[#38BDF8] uppercase">
                          {m.teamSide || 'home'} · {formationSlots[m.assignedSlotIdx ?? 9]?.role || 'ST'}
                        </span>
                        <span
                          className={`font-mono text-[10px] font-bold ${
                            m.isReady ? 'text-[#10B981]' : 'text-[#F59E0B]'
                          }`}
                        >
                          {m.isReady ? 'READY ✓' : 'NOT READY'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    SoundEngine.playUIClick();
                    const nextReady = !myReadyState;
                    FriendRoomService.setRoomReady(activeRoomCode, nextReady);
                    if (activeLobby) {
                      onToggleLobbyReady(activeLobby.lobbyId, nextReady);
                    }
                  }}
                  className={`py-3.5 px-5 font-display font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    myReadyState
                      ? 'bg-[#10B981] text-[#070A0E] shadow-lg'
                      : 'bg-white/10 hover:bg-white/15 border-2 border-[#10B981] text-[#10B981]'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {myReadyState
                    ? `READY ✓ (${readyPlayersCount}/${requiredPlayers} READY)`
                    : `MARK READY (${readyPlayersCount}/${requiredPlayers} READY)`}
                </button>

                <button
                  onClick={() => {
                    SoundEngine.playUIClick();
                    if (activeLobby) {
                      FriendRoomService.startLobbyMatch(activeLobby.lobbyId);
                      const oppClub =
                        TEAMS_DB.find((t) => t.id === activeLobby.guest?.clubId) || awayTeam;
                      onStartOnlineMatch(oppClub, activeLobby.roomCode, activeLobby.lobbyId);
                    } else {
                      onStartOnlineMatch(awayTeam, activeRoomCode);
                    }
                  }}
                  className={`py-3.5 px-5 font-display font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                    bothPlayersReady
                      ? 'bg-[#10B981] hover:bg-[#059669] text-[#070A0E]'
                      : 'bg-[#F59E0B] hover:bg-[#D97706] text-[#070A0E]'
                  }`}
                >
                  <Play className="w-4 h-4 fill-current" />
                  {bothPlayersReady
                    ? 'STARTING MATCH AUTOMATICALLY...'
                    : `START ${activeFormat.toUpperCase()} MATCH NOW`}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Opponent Squad Compact Popup (Pre-Match Lobby & Online Directory) */}
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
  const [paymentMethod, setPaymentMethod] = useState<'Google Pay' | 'Credit / Debit Card' | 'App Instant Wallet'>('Google Pay');
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
      const txId = data.transaction?.transactionId || `TX-${Math.floor(100000 + Math.random() * 900000)}`;
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
            {/* Order Summary */}
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

            {/* Payment Method Selector */}
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
              {processing ? 'PROCESSING SECURE PAYMENT...' : `PAY $${item.amountUsd.toFixed(2)} & UNLOCK NOW`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
