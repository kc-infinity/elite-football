/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Globe,
  Loader2,
  Play,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Swords,
  UserCheck,
  Users,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import { FootballPlayer, FormationName, PLAYERS_DB, TeamData, TEAMS_DB } from '../data/gameDatabase';
import {
  FriendRoomPlayer,
  FriendRoomService,
  FriendRoomState,
  IncomingMatchInvite,
  OpenRoomInfo,
} from '../engine/FriendRoomService';
import { SoundEngine } from '../engine/SoundEngine';
import { PlayerPhotoAvatar } from './PlayerPhotoAvatar';

export interface OnlineMatchLaunchPayload {
  roomCode: string;
  role: 'host' | 'guest';
  hostUsername: string;
  guestUsername: string;
  matchFormat: '11v11' | '1v1';
  opponentClubId?: string;
  opponentStarPlayerId?: string;
  opponentSquadIds?: string[];
  opponentFormation?: FormationName;
}

interface OnlineMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsername: string;
  onUpdateUsername?: (newName: string) => void;
  userTeam: TeamData;
  userSquad: FootballPlayer[];
  userFormation: FormationName;
  onLaunchMatch: (payload: OnlineMatchLaunchPayload) => void;
}

function generateCleanRoomCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const prefix =
    letters[Math.floor(Math.random() * letters.length)] +
    letters[Math.floor(Math.random() * letters.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `PLAY-${prefix}${num}`;
}

const SUGGESTED_RIVALS = [
  'ValenStrike_99',
  'SambaKing_BR',
  'TikiTakaMaestro',
  'NeoTokyo_Ace',
  'DerKaiser_FX',
  'Albiceleste10',
  'AzzurriWall_GK',
  'AtlasLion_MAR',
];

export const OnlineMatchModal: React.FC<OnlineMatchModalProps> = ({
  isOpen,
  onClose,
  currentUsername,
  onUpdateUsername,
  userTeam,
  userSquad,
  userFormation,
  onLaunchMatch,
}) => {
  // Primary feature: Start match directly by username
  const [activeTab, setActiveTab] = useState<'username_match' | 'create_join' | 'quick_match'>('username_match');
  const [usernameInput, setUsernameInput] = useState<string>(currentUsername || 'Player1');
  const [targetUsernameInput, setTargetUsernameInput] = useState<string>('');
  const [isEditingUsername, setIsEditingUsername] = useState<boolean>(false);

  // Room parameters
  const [roomCodeInput, setRoomCodeInput] = useState<string>('');
  const [generatedCode, setGeneratedCode] = useState<string>(generateCleanRoomCode());
  const [matchFormat, setMatchFormat] = useState<'11v11' | '1v1'>('11v11');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Connection and Room Status
  const [isInRoom, setIsInRoom] = useState<boolean>(false);
  const [roomState, setRoomState] = useState<FriendRoomState | null>(null);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [activeChallengeTarget, setActiveChallengeTarget] = useState<string>('');
  const [incomingInvite, setIncomingInvite] = useState<IncomingMatchInvite | null>(null);

  // Open Rooms list from server
  const [openRooms, setOpenRooms] = useState<OpenRoomInfo[]>([]);

  // Keep local username in sync
  useEffect(() => {
    if (currentUsername) {
      setUsernameInput(currentUsername);
    }
  }, [currentUsername]);

  // Subscribe to FriendRoomService open rooms, incoming invites & room events
  useEffect(() => {
    if (!isOpen) return;

    // Register presence immediately so user is visible to server and gets room list
    const starPlayer = userSquad[9] || userSquad[0] || PLAYERS_DB[0];
    FriendRoomService.registerPresence({
      username: usernameInput,
      clubId: userTeam.id,
      clubName: userTeam.name,
      starPlayerId: starPlayer.id,
      starPlayerName: starPlayer.name,
      rating: userTeam.rating,
      squadIds: userSquad.slice(0, 11).map((p) => p.id),
      formation: userFormation,
    });

    const unsubRooms = FriendRoomService.subscribeOpenRooms((rooms) => {
      setOpenRooms(rooms);
    });

    const unsubInvites = FriendRoomService.subscribeInvites((invite) => {
      if (invite && invite.fromUsername !== usernameInput) {
        SoundEngine.playWhistle();
        setIncomingInvite(invite);
      }
    });

    const unsubRoom = FriendRoomService.subscribe((state) => {
      setRoomState(state);
      if (state.roomCode && state.members.length > 0) {
        setIsInRoom(true);

        if (state.members.length >= 2) {
          setStatusMessage('Opponent Connected! Match Starting Automatically...');
        } else {
          setStatusMessage(
            state.expectedOpponentUsername
              ? `Waiting for @${state.expectedOpponentUsername} to connect... (Room: ${state.roomCode})`
              : `Waiting for opponent to join Room Code: ${state.roomCode}`
          );
        }
      }
    });

    // Auto-Start handler: when server or broadcast signals match started
    const unsubMatchStart = FriendRoomService.onMatchStart(
      (roomCode, role, hostPlayer, guestPlayer) => {
        SoundEngine.playWhistle();

        const myRole = role;
        const opponent = myRole === 'host' ? guestPlayer : hostPlayer;

        setTimeout(() => {
          onLaunchMatch({
            roomCode,
            role: myRole,
            hostUsername: hostPlayer?.username || 'Host',
            guestUsername: guestPlayer?.username || activeChallengeTarget || 'Opponent',
            matchFormat: (hostPlayer?.matchFormat as '11v11' | '1v1') || matchFormat,
            opponentClubId: opponent?.clubId,
            opponentStarPlayerId: opponent?.starPlayerId,
            opponentSquadIds: opponent?.squadIds,
            opponentFormation: opponent?.formation as FormationName | undefined,
          });
        }, 350);
      }
    );

    return () => {
      unsubRooms();
      unsubInvites();
      unsubRoom();
      unsubMatchStart();
    };
  }, [isOpen, usernameInput, userTeam, userSquad, userFormation, matchFormat, activeChallengeTarget, onLaunchMatch]);

  if (!isOpen) return null;

  const effectiveUsername = usernameInput.trim() || 'Player';
  const starPlayer = userSquad[9] || userSquad[0] || PLAYERS_DB[0];

  const handleSaveUsername = () => {
    setIsEditingUsername(false);
    if (onUpdateUsername && usernameInput.trim()) {
      onUpdateUsername(usernameInput.trim());
    }
  };

  const handleCopyCode = (code: string) => {
    SoundEngine.playUIClick();
    navigator.clipboard?.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2200);
  };

  // 1. INITIATE ONLINE MATCH BY USERNAME
  const handleStartMatchByUsername = (targetName: string) => {
    const cleanTarget = targetName.trim();
    if (!cleanTarget) return;

    SoundEngine.playUIClick();
    setIsJoining(true);
    setActiveChallengeTarget(cleanTarget);
    setStatusMessage(`Initiating match with @${cleanTarget}... Waiting for opponent...`);

    const code = FriendRoomService.startMatchByUsername({
      opponentUsername: cleanTarget,
      username: effectiveUsername,
      clubId: userTeam.id,
      clubName: userTeam.name,
      starPlayerId: starPlayer.id,
      starPlayerName: starPlayer.name,
      squadIds: userSquad.slice(0, 11).map((p) => p.id),
      formation: userFormation,
      matchFormat,
    });

    setIsInRoom(true);
    setIsJoining(false);
  };

  // Accept incoming invite
  const handleAcceptInvite = (invite: IncomingMatchInvite) => {
    SoundEngine.playUIClick();
    setIncomingInvite(null);
    setIsJoining(true);
    setActiveChallengeTarget(invite.fromUsername);
    setStatusMessage(`Connecting to match with @${invite.fromUsername}...`);

    FriendRoomService.joinRoom({
      roomCode: invite.roomCode,
      username: effectiveUsername,
      clubId: userTeam.id,
      clubName: userTeam.name,
      starPlayerId: starPlayer.id,
      starPlayerName: starPlayer.name,
      squadIds: userSquad.slice(0, 11).map((p) => p.id),
      formation: userFormation,
      matchFormat: invite.matchFormat || matchFormat,
      isReady: true,
    });

    setIsInRoom(true);
    setIsJoining(false);
  };

  // Launch instant match if opponent is not currently online (AI / Simulated online match)
  const handleForceLaunchMatchNow = () => {
    SoundEngine.playWhistle();
    const opponentName = activeChallengeTarget || 'Opponent_Online';
    const cleanRoomCode = roomState?.roomCode || `USER-${effectiveUsername}-VS-${opponentName}`.toUpperCase();

    onLaunchMatch({
      roomCode: cleanRoomCode,
      role: 'host',
      hostUsername: effectiveUsername,
      guestUsername: opponentName,
      matchFormat,
      opponentClubId: 'club_real_madrid',
      opponentStarPlayerId: 'wc_mbappe_96',
      opponentFormation: '4-3-3',
    });
  };

  const handleCreateRoom = () => {
    SoundEngine.playUIClick();
    setIsJoining(true);
    setStatusMessage(`Creating Room ${generatedCode}...`);

    FriendRoomService.joinRoom({
      roomCode: generatedCode,
      username: effectiveUsername,
      clubId: userTeam.id,
      clubName: userTeam.name,
      starPlayerId: starPlayer.id,
      starPlayerName: starPlayer.name,
      squadIds: userSquad.slice(0, 11).map((p) => p.id),
      formation: userFormation,
      matchFormat,
      isReady: true,
    });

    setIsInRoom(true);
    setIsJoining(false);
  };

  const handleJoinWithCode = (codeToJoin: string) => {
    const clean = codeToJoin.trim().toUpperCase();
    if (!clean) return;

    SoundEngine.playUIClick();
    setIsJoining(true);
    setStatusMessage(`Connecting to Room ${clean}...`);

    FriendRoomService.joinRoom({
      roomCode: clean,
      username: effectiveUsername,
      clubId: userTeam.id,
      clubName: userTeam.name,
      starPlayerId: starPlayer.id,
      starPlayerName: starPlayer.name,
      squadIds: userSquad.slice(0, 11).map((p) => p.id),
      formation: userFormation,
      matchFormat,
      isReady: true,
    });

    setIsInRoom(true);
    setIsJoining(false);
  };

  const handleQuickMatchmaking = () => {
    SoundEngine.playUIClick();
    setStatusMessage('Searching for online opponent...');

    FriendRoomService.findMatchmakingOpponent({
      username: effectiveUsername,
      clubId: userTeam.id,
      clubName: userTeam.name,
      starPlayerId: starPlayer.id,
      starPlayerName: starPlayer.name,
      squadIds: userSquad.slice(0, 11).map((p) => p.id),
      formation: userFormation,
      matchFormat,
    });

    setIsInRoom(true);
  };

  const handleLeaveCurrentRoom = () => {
    SoundEngine.playUIClick();
    if (roomState?.roomCode) {
      FriendRoomService.leaveRoom(roomState.roomCode);
    }
    setIsInRoom(false);
    setStatusMessage('');
    setActiveChallengeTarget('');
  };

  const handleClose = () => {
    if (isInRoom) {
      handleLeaveCurrentRoom();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#111722] border-2 border-[#38BDF8]/40 rounded-3xl max-w-2xl w-full shadow-[0_0_60px_rgba(56,189,248,0.25)] overflow-hidden flex flex-col my-auto max-h-[94vh]">
        {/* MODAL HEADER */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#192231] via-[#111722] to-[#192231] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#38BDF8]/20 border border-[#38BDF8]/50 flex items-center justify-center text-[#38BDF8] shadow-md">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#38BDF8] bg-[#38BDF8]/10 px-2 py-0.5 rounded border border-[#38BDF8]/30">
                  REAL-TIME ONLINE MATCHES · 60 FPS
                </span>
                <span className="flex items-center gap-1 text-[11px] font-mono text-[#10B981]">
                  <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse inline-block" />
                  Live Server
                </span>
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-white tracking-wide">
                ONLINE MATCH LOBBY
              </h2>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* INCOMING CHALLENGE FLOATING NOTIFICATION BANNER */}
        {incomingInvite && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/25 via-emerald-500/20 to-blue-500/25 border-2 border-amber-400 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xl animate-bounce">
            <div className="flex items-center gap-2.5 text-left">
              <Zap className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
              <div>
                <div className="text-xs font-mono font-bold text-amber-400 uppercase">
                  ⚡ Incoming Match Challenge!
                </div>
                <div className="text-sm font-display font-bold text-white">
                  @{incomingInvite.fromUsername} challenged you to a match!
                </div>
                <div className="text-[11px] text-slate-300">
                  {incomingInvite.fromClubName} · Star: {incomingInvite.fromStarPlayer}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleAcceptInvite(incomingInvite)}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-display font-extrabold text-xs shadow-lg cursor-pointer"
              >
                ACCEPT & PLAY NOW!
              </button>
              <button
                onClick={() => setIncomingInvite(null)}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs cursor-pointer"
              >
                Decline
              </button>
            </div>
          </div>
        )}

        {/* MODAL BODY */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* USER IDENTITY STRIP */}
          <div className="p-4 rounded-xl bg-[#070A0E] border border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <PlayerPhotoAvatar
                player={starPlayer}
                className="w-12 h-12 rounded-xl border border-[#F59E0B]/50 shrink-0 shadow"
                showPositionBadge={false}
                showRatingBadge={false}
              />
              <div>
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  Your Online Username
                </div>
                {isEditingUsername ? (
                  <div className="flex items-center gap-2 mt-0.5">
                    <input
                      type="text"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value.slice(0, 20))}
                      placeholder="Enter Username"
                      className="px-2.5 py-1 text-xs font-bold text-white bg-[#111722] border border-[#38BDF8] rounded focus:outline-none"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveUsername();
                      }}
                    />
                    <button
                      onClick={handleSaveUsername}
                      className="px-2 py-1 bg-[#10B981] hover:bg-[#059669] text-[#070A0E] font-bold text-xs rounded cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-base text-white">
                      @{effectiveUsername}
                    </span>
                    <button
                      onClick={() => setIsEditingUsername(true)}
                      className="text-[10px] text-[#38BDF8] hover:underline cursor-pointer"
                    >
                      (Edit Name)
                    </button>
                  </div>
                )}
                <div className="text-xs text-slate-400 mt-0.5">
                  <span className="text-white font-semibold">{userTeam.name}</span> ({userFormation}) · Star:{' '}
                  <span className="text-[#F59E0B] font-semibold">{starPlayer.name}</span>
                </div>
              </div>
            </div>

            {/* Match Mode Selection */}
            <div className="flex items-center gap-2 bg-[#111722] p-1.5 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => {
                  SoundEngine.playUIClick();
                  setMatchFormat('11v11');
                }}
                disabled={isInRoom}
                className={`px-3 py-1.5 rounded-lg text-xs font-display font-bold transition-all cursor-pointer ${
                  matchFormat === '11v11'
                    ? 'bg-[#10B981] text-[#070A0E] shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                11 vs 11 Match
              </button>
              <button
                type="button"
                onClick={() => {
                  SoundEngine.playUIClick();
                  setMatchFormat('1v1');
                }}
                disabled={isInRoom}
                className={`px-3 py-1.5 rounded-lg text-xs font-display font-bold transition-all cursor-pointer ${
                  matchFormat === '1v1'
                    ? 'bg-[#38BDF8] text-[#070A0E] shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                1 vs 1 Duel
              </button>
            </div>
          </div>

          {/* ACTIVE ROOM OR MATCH WAITING STATE */}
          {isInRoom ? (
            <div className="p-6 rounded-2xl bg-gradient-to-b from-[#192231] to-[#070A0E] border-2 border-[#38BDF8] text-center space-y-5 animate-in fade-in duration-200">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#38BDF8]/20 border border-[#38BDF8]/50 text-[#38BDF8] text-xs font-mono font-bold">
                <Wifi className="w-3.5 h-3.5 animate-pulse" />
                {activeChallengeTarget
                  ? `DIRECT CHALLENGE: @${effectiveUsername} VS @${activeChallengeTarget}`
                  : `ROOM CODE ACTIVE: ${roomState?.roomCode || generatedCode}`}
              </div>

              {/* Members in Room */}
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto pt-2">
                <div className="p-3.5 rounded-xl bg-[#070A0E] border border-[#10B981]/50 text-left">
                  <div className="text-[10px] font-mono text-[#10B981] font-bold">
                    HOST (YOU)
                  </div>
                  <div className="font-display font-bold text-white text-sm truncate">
                    @{effectiveUsername}
                  </div>
                  <div className="text-xs text-slate-400 truncate">{userTeam.name}</div>
                  <div className="text-[10px] text-[#10B981] font-mono font-bold mt-1">
                    ✓ READY IN MATCH
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#070A0E] border border-dashed border-white/20 text-left">
                  <div className="text-[10px] font-mono text-slate-400 font-bold">
                    OPPONENT
                  </div>
                  {roomState && roomState.members.length >= 2 ? (
                    (() => {
                      const opp =
                        roomState.members.find((m) => m.clientId !== FriendRoomService.getClientId()) ||
                        roomState.members[1];
                      return (
                        <>
                          <div className="font-display font-bold text-[#38BDF8] text-sm truncate">
                            @{opp?.username || activeChallengeTarget || 'Opponent'}
                          </div>
                          <div className="text-xs text-slate-300 truncate">
                            {opp?.clubName || 'Opponent Club'}
                          </div>
                          <div className="text-[10px] text-[#10B981] font-mono font-bold mt-1">
                            ✓ JOINED! STARTING...
                          </div>
                        </>
                      );
                    })()
                  ) : (
                    <>
                      <div className="font-display font-bold text-amber-400 text-sm truncate">
                        @{activeChallengeTarget || 'Waiting for Rival...'}
                      </div>
                      <div className="text-xs text-slate-400">
                        {activeChallengeTarget ? 'Invitation sent' : 'Waiting to connect'}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-[#F59E0B] font-mono font-bold mt-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Listening for player...
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Status Message */}
              <div className="p-3.5 rounded-xl bg-[#070A0E]/80 border border-white/10 text-xs text-slate-300">
                <span className="text-[#38BDF8] font-bold">Status:</span>{' '}
                {statusMessage || 'Waiting for opponent to connect...'}
                <div className="text-[11px] text-slate-400 mt-1">
                  ⚡ Match starts automatically as soon as the opponent enters your username or accepts!
                </div>
              </div>

              {/* Fast Action Buttons: Launch Now or Cancel */}
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={handleForceLaunchMatchNow}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-400 to-[#10B981] hover:brightness-110 text-slate-950 font-display font-extrabold text-xs rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  START MATCH IMMEDIATELY (VS @{activeChallengeTarget || 'OPPONENT'})
                </button>

                <button
                  onClick={handleLeaveCurrentRoom}
                  className="px-4 py-3 bg-rose-500/15 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/40 rounded-xl text-xs font-display font-bold transition-all cursor-pointer"
                >
                  Cancel Match
                </button>
              </div>
            </div>
          ) : (
            /* TABBED INTERFACE */
            <div className="space-y-5">
              {/* Tab Selector */}
              <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                <button
                  onClick={() => {
                    SoundEngine.playUIClick();
                    setActiveTab('username_match');
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-display font-bold text-xs transition-colors cursor-pointer ${
                    activeTab === 'username_match'
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-lg'
                      : 'text-slate-300 hover:text-white bg-white/5'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  MATCH BY USERNAME
                </button>

                <button
                  onClick={() => {
                    SoundEngine.playUIClick();
                    setActiveTab('create_join');
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-display font-bold text-xs transition-colors cursor-pointer ${
                    activeTab === 'create_join'
                      ? 'bg-[#38BDF8] text-[#070A0E] shadow'
                      : 'text-slate-300 hover:text-white bg-white/5'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Room Code
                </button>

                <button
                  onClick={() => {
                    SoundEngine.playUIClick();
                    setActiveTab('quick_match');
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-display font-bold text-xs transition-colors cursor-pointer ${
                    activeTab === 'quick_match'
                      ? 'bg-[#10B981] text-[#070A0E] shadow'
                      : 'text-slate-300 hover:text-white bg-white/5'
                  }`}
                >
                  <Swords className="w-4 h-4" />
                  Quick Match
                </button>
              </div>

              {/* ======================================================= */}
              {/* TAB 1: INITIATE MATCH BY OPPONENT USERNAME */}
              {/* ======================================================= */}
              {activeTab === 'username_match' && (
                <div className="p-6 rounded-2xl bg-[#070A0E] border-2 border-amber-500/50 space-y-5">
                  <div>
                    <div className="text-[10px] font-mono text-amber-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5 mb-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      DIRECT 1-ON-1 ONLINE MATCH INITIATION
                    </div>
                    <h3 className="font-display text-xl sm:text-2xl font-extrabold text-white">
                      Enter Opponent's Username to Play
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Simply type the other player's username below and tap{' '}
                      <span className="text-amber-400 font-semibold">Start Online Match</span>. Both players will be paired directly into the live match!
                    </p>
                  </div>

                  {/* Username Input Field */}
                  <div className="space-y-2">
                    <label className="block text-xs font-mono font-bold text-slate-300">
                      OPPONENT USERNAME
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 text-amber-400">
                        <Search className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        value={targetUsernameInput}
                        onChange={(e) => setTargetUsernameInput(e.target.value)}
                        placeholder="Enter rival's username (e.g. ValenStrike_99)..."
                        className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-[#111722] border-2 border-white/20 text-white font-mono text-sm sm:text-base font-bold placeholder:text-slate-600 focus:outline-none focus:border-amber-400 transition-colors shadow-inner"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleStartMatchByUsername(targetUsernameInput);
                        }}
                      />
                    </div>
                  </div>

                  {/* Big Primary Start Button */}
                  <button
                    disabled={!targetUsernameInput.trim() || isJoining}
                    onClick={() => handleStartMatchByUsername(targetUsernameInput)}
                    className={`w-full py-4 rounded-xl font-display font-extrabold text-sm sm:text-base transition-all flex items-center justify-center gap-2.5 shadow-2xl cursor-pointer ${
                      targetUsernameInput.trim()
                        ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:brightness-115 text-slate-950 scale-100 hover:scale-[1.01]'
                        : 'bg-white/10 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Swords className="w-5 h-5 fill-current" />
                    {targetUsernameInput.trim()
                      ? `START ONLINE MATCH WITH @${targetUsernameInput.trim()}`
                      : 'ENTER USERNAME ABOVE TO START'}
                  </button>

                  {/* Suggested Active Online Rival Badges */}
                  <div className="pt-2 border-t border-white/10">
                    <div className="text-[11px] font-mono text-slate-400 mb-2">
                      QUICK CHALLENGE POPULAR RIVALS & LEADERBOARD STARS:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {SUGGESTED_RIVALS.map((rival) => (
                        <button
                          key={rival}
                          onClick={() => {
                            SoundEngine.playUIClick();
                            setTargetUsernameInput(rival);
                            handleStartMatchByUsername(rival);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-[#111722] hover:bg-amber-400/20 border border-white/15 hover:border-amber-400 text-xs font-mono text-slate-300 hover:text-amber-300 transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Zap className="w-3 h-3 text-amber-400" />
                          @{rival}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ======================================================= */}
              {/* TAB 2: ROOM CODE (CREATE OR JOIN WITH CODE) */}
              {/* ======================================================= */}
              {activeTab === 'create_join' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* CREATE ROOM */}
                  <div className="p-5 rounded-2xl bg-[#070A0E] border border-white/10 space-y-4 flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] font-mono text-[#F59E0B] font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1">
                        <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
                        HOST NEW MATCH
                      </div>
                      <h3 className="font-display text-lg font-bold text-white">Create Room Code</h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Generate a 6-character room code to give to your friend.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#111722] border border-white/10 flex items-center justify-between">
                      <div className="font-mono text-2xl font-bold text-[#F59E0B] tracking-wider">
                        {generatedCode}
                      </div>
                      <button
                        onClick={() => {
                          SoundEngine.playUIClick();
                          setGeneratedCode(generateCleanRoomCode());
                        }}
                        className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      onClick={handleCreateRoom}
                      disabled={isJoining}
                      className="w-full py-3.5 bg-[#F59E0B] hover:bg-[#D97706] text-[#070A0E] font-display font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      CREATE ROOM ({generatedCode})
                    </button>
                  </div>

                  {/* JOIN ROOM */}
                  <div className="p-5 rounded-2xl bg-[#070A0E] border border-white/10 space-y-4 flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] font-mono text-[#38BDF8] font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1">
                        <Users className="w-3.5 h-3.5 text-[#38BDF8]" />
                        JOIN WITH CODE
                      </div>
                      <h3 className="font-display text-lg font-bold text-white">Enter Friend's Code</h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Paste or type a room code to connect immediately.
                      </p>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={roomCodeInput}
                        onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                        placeholder="ENTER ROOM CODE"
                        className="w-full px-3.5 py-3 rounded-xl bg-[#111722] border border-white/15 text-white font-mono text-base font-bold placeholder:text-slate-600 focus:outline-none focus:border-[#38BDF8]"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleJoinWithCode(roomCodeInput);
                        }}
                      />
                    </div>

                    <button
                      onClick={() => handleJoinWithCode(roomCodeInput)}
                      disabled={!roomCodeInput.trim() || isJoining}
                      className={`w-full py-3.5 font-display font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                        roomCodeInput.trim()
                          ? 'bg-[#38BDF8] hover:bg-[#0284C7] text-[#070A0E]'
                          : 'bg-white/10 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Play className="w-4 h-4 fill-current" />
                      JOIN ROOM & START
                    </button>
                  </div>
                </div>
              )}

              {/* ======================================================= */}
              {/* TAB 3: QUICK MATCHMAKING */}
              {/* ======================================================= */}
              {activeTab === 'quick_match' && (
                <div className="p-6 rounded-2xl bg-[#070A0E] border border-[#10B981]/40 text-center space-y-5">
                  <div className="w-16 h-16 rounded-full bg-[#10B981]/20 border-2 border-[#10B981] flex items-center justify-center text-[#10B981] mx-auto shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                    <Swords className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-display text-2xl font-bold text-white">
                      Instant Online Matchmaking
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto mt-1 leading-relaxed">
                      Click below to automatically search and pair with any other online player.
                    </p>
                  </div>

                  <button
                    onClick={handleQuickMatchmaking}
                    className="px-8 py-4 bg-[#10B981] hover:bg-[#059669] text-[#070A0E] font-display font-bold text-sm rounded-xl transition-all shadow-xl inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    FIND OPPONENT NOW ({matchFormat === '11v11' ? '11v11 MATCH' : '1v1 DUEL'})
                  </button>
                </div>
              )}

              {/* OPEN ROOMS LIST */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-display font-bold text-white flex items-center gap-2">
                    <Wifi className="w-3.5 h-3.5 text-[#10B981]" />
                    OPEN ROOMS SEARCHING FOR PLAYERS ({openRooms.length})
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Live Server List</span>
                </div>

                {openRooms.length === 0 ? (
                  <div className="p-3.5 rounded-xl bg-[#070A0E] border border-white/5 text-center text-xs text-slate-500">
                    No open rooms waiting right now. Enter a username above to start a match!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-36 overflow-y-auto pr-1">
                    {openRooms.map((r) => (
                      <div
                        key={r.roomCode}
                        className="p-3 rounded-xl bg-[#070A0E] border border-white/10 hover:border-[#38BDF8]/50 flex items-center justify-between gap-2.5 transition-colors"
                      >
                        <div>
                          <div className="font-mono text-xs font-bold text-[#F59E0B]">
                            {r.roomCode}
                          </div>
                          <div className="text-xs font-display font-semibold text-white">
                            Host: @{r.hostUsername}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {r.hostClubName} · {r.hostStarPlayer}
                          </div>
                        </div>

                        <button
                          onClick={() => handleJoinWithCode(r.roomCode)}
                          className="px-3 py-1.5 bg-[#38BDF8] hover:bg-[#0284C7] text-[#070A0E] font-display font-bold text-xs rounded-lg transition-colors cursor-pointer shrink-0"
                        >
                          Join
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-4 bg-[#070A0E] border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Fast WebSocket peer sync with input prediction & zero lag.</span>
          </div>
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
