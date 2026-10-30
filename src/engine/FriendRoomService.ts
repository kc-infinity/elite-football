export type RoomConnectionStatus =
  | 'waiting_for_opponent'
  | 'opponent_connected'
  | 'match_starting'
  | 'in_match'
  | 'opponent_disconnected';

export interface FriendRoomPlayer {
  clientId: string;
  username: string;
  clubId: string;
  clubName: string;
  starPlayerId?: string;
  starPlayerName: string;
  squadIds?: string[];
  formation?: string;
  matchFormat?: '11v11' | '1v1';
  role: 'host' | 'guest';
  teamSide?: 'home' | 'away';
  assignedSlotIdx?: number;
  isReady?: boolean;
}

export interface FriendRoomState {
  roomCode: string;
  expectedOpponentUsername?: string;
  members: FriendRoomPlayer[];
  matchStarted: boolean;
  matchFormat?: '11v11' | '1v1';
  requiredPlayers?: number;
  status: RoomConnectionStatus;
  statusLabel: string;
}

export interface OpenRoomInfo {
  roomCode: string;
  hostUsername: string;
  expectedOpponentUsername?: string;
  hostClubName: string;
  hostStarPlayer: string;
  createdAt: number;
}

export interface OnlinePlayerPresence {
  clientId: string;
  username: string;
  clubId: string;
  clubName: string;
  starPlayerName: string;
  rating: number;
  squadIds?: string[];
  formation?: string;
  status: 'online' | 'in_lobby' | 'in_match';
}

export interface IncomingMatchInvite {
  inviteId: string;
  lobbyId: string;
  roomCode: string;
  fromClientId: string;
  fromUserId?: string;
  fromUsername: string;
  fromEmail?: string;
  fromAvatarUrl?: string;
  fromClubId?: string;
  fromClubName: string;
  fromStarPlayer: string;
  fromSquadIds?: string[];
  fromFormation?: string;
  customMessage?: string;
  matchFormat?: '1v1' | '11v11';
  createdAt?: number;
  expiresAt?: number;
}

export interface FriendListItem {
  friendshipId?: string;
  userId: string;
  username: string;
  displayName?: string;
  email: string;
  avatarUrl: string;
  clubId: string;
  mmrRating: number;
  status: 'online' | 'in_lobby' | 'in_match' | 'offline';
  since?: string;
  isFriend?: boolean;
  requestPending?: boolean;
}

export interface FriendRequestItem {
  id: string;
  fromUserId: string;
  fromUsername: string;
  fromEmail: string;
  fromAvatarUrl: string;
  toUserId: string;
  toUsername: string;
  toEmail: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: number;
}

export interface MatchInvitationItem {
  id: string;
  lobbyId: string;
  roomCode: string;
  fromUserId: string;
  fromUsername: string;
  fromEmail: string;
  fromAvatarUrl: string;
  fromClubId: string;
  fromClubName: string;
  fromStarPlayer: string;
  fromSquadIds?: string[];
  fromFormation?: string;
  toUserId: string;
  toUsername: string;
  toEmail: string;
  customMessage: string;
  matchFormat: '1v1' | '11v11';
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  emailDeliveryStatus: 'sent' | 'not_configured' | 'failed';
  createdAt: number;
  expiresAt: number;
}

export interface MatchHistoryItem {
  id: string;
  lobbyId: string;
  roomCode: string;
  matchFormat: '1v1' | '11v11';
  homeUserId: string;
  homeUsername: string;
  homeClubName: string;
  homeScore: number;
  awayUserId: string;
  awayUsername: string;
  awayClubName: string;
  awayScore: number;
  winnerUsername: string;
  playedAt: string;
}

export interface OnlineLobbySettings {
  stadiumName: string;
  weather: 'Clear' | 'Rain' | 'Overcast';
  halfDurationMinutes: number;
  aiDifficulty: 'World Class' | 'Legendary';
}

export interface OnlineLobbyPlayer {
  userId?: string;
  clientId: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  clubId: string;
  clubName: string;
  starPlayerId?: string;
  starPlayerName: string;
  rating: number;
  squadIds?: string[];
  formation?: string;
  teamSide?: 'home' | 'away';
  isReady: boolean;
  connected?: boolean;
  disconnectedAt?: number;
}

export interface OnlineMatchLobbyState {
  lobbyId: string;
  roomCode: string;
  matchFormat?: '1v1' | '11v11';
  customMessage?: string;
  settings?: OnlineLobbySettings;
  host: OnlineLobbyPlayer;
  guest: OnlineLobbyPlayer | null;
  status: 'waiting' | 'ready_check' | 'in_match' | 'completed';
  createdAt?: number;
  lastResult?: {
    homeScore: number;
    awayScore: number;
    winnerUsername: string;
  };
}

export interface OnlineGuestInputPacket {
  roomCode: string;
  clientId: string;
  seq: number;
  controlledIdx?: number;
  moveX: number;
  moveZ: number;
  isSprinting: boolean;
  isPressing: boolean;
  mouseWorldX: number;
  mouseWorldZ: number;
  guestX?: number;
  guestZ?: number;
  guestVx?: number;
  guestVz?: number;
  guestFacing?: number;
  discreteAction?: {
    action:
      | 'pass'
      | 'through'
      | 'cross'
      | 'shoot'
      | 'curve'
      | 'chip'
      | 'skill'
      | 'rainbow'
      | 'bicycle'
      | 'tackle'
      | 'gk_dive';
    powerPct?: number;
    aimX?: number;
    aimZ?: number;
  };
}

export interface OnlineMatchStateSyncPacket {
  roomCode: string;
  seq: number;
  timestamp: number;
  ball: {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    spinZ: number;
    ownerIdx: number; // -1 if loose
  };
  players: {
    x: number;
    y: number;
    z: number;
    vx: number;
    vz: number;
    facingAngle: number;
    animPhase: number;
    kickTimer: number;
    tackleTimer: number;
    skillTimer: number;
    rainbowTimer: number;
    bicycleTimer?: number;
    diveTimer: number;
    diveDirZ: number;
    celebrationTimer: number;
    stamina: number;
    activeSkillName: string;
  }[];
  match: {
    homeScore: number;
    awayScore: number;
    elapsedRealSeconds: number;
    celebrationGlobalTimer: number;
    celebrationScorerName: string;
    activeSkillBanner: string;
    skillBannerTimer: number;
    commentaryBanner: string;
    commentaryTimer: number;
    isMatchOver: boolean;
    homePossessionFrames: number;
    awayPossessionFrames: number;
    activeSetPiece?: 'none' | 'throw_in' | 'corner_kick' | 'goal_kick' | 'free_kick' | 'penalty_kick';
    setPieceTeam?: 'home' | 'away';
    setPieceLabel?: string;
    stats: {
      homeShots: number;
      awayShots: number;
      homeShotsOnTarget: number;
      awayShotsOnTarget: number;
      homePasses: number;
      awayPasses: number;
      homeTackles: number;
      awayTackles: number;
      homeSaves: number;
      awaySaves: number;
      homeCorners: number;
      awayCorners: number;
      homeFouls: number;
      awayFouls: number;
      homeOffsides: number;
      awayOffsides: number;
      homeYellowCards: number;
      awayYellowCards: number;
    };
  };
  soundEvent?:
    | 'goal_home'
    | 'goal_away'
    | 'kick'
    | 'pass'
    | 'save'
    | 'post'
    | 'whistle_foul'
    | 'whistle_fulltime';
}

export function normalizeClientRoomCode(raw: string): string {
  const cleaned = String(raw || '')
    .toUpperCase()
    .trim()
    .replace(/\s+/g, '');
  if (!cleaned) return 'PLAY-7492';
  if (/^\d{3,6}$/.test(cleaned)) {
    return `PLAY-${cleaned}`;
  }
  const playNoDash = cleaned.match(/^PLAY(\d{3,6})$/);
  if (playNoDash) {
    return `PLAY-${playNoDash[1]}`;
  }
  return cleaned;
}

type RoomListener = (state: FriendRoomState) => void;
type MatchStartListener = (
  roomCode: string,
  role: 'host' | 'guest',
  hostPlayer?: FriendRoomPlayer,
  guestPlayer?: FriendRoomPlayer,
  lobbyId?: string
) => void;
type OnlinePlayersListener = (players: OnlinePlayerPresence[]) => void;
type OpenRoomsListener = (rooms: OpenRoomInfo[]) => void;
type InviteListener = (invite: IncomingMatchInvite) => void;
type LobbyListener = (lobby: OnlineMatchLobbyState | null) => void;
type StateSyncListener = (packet: OnlineMatchStateSyncPacket) => void;
type GuestInputListener = (packet: OnlineGuestInputPacket) => void;
type DisconnectListener = (roomCode: string, disconnectedUsername: string) => void;
type ReconnectListener = (roomCode: string, reconnectedUsername: string) => void;
type SocialEventListener = (event: {
  type: 'friend_request' | 'friend_accepted' | 'invite_received' | 'invite_declined' | 'presence_updated';
  payload?: any;
}) => void;

class FriendRoomServiceManager {
  private ws: WebSocket | null = null;
  private bc: BroadcastChannel | null = null;
  private clientId: string;
  private currentUserId = '';
  private currentUserEmail = '';
  private currentAvatarUrl = '';
  private currentUsername = 'ChampionElite_10';
  private currentClubId = 'club_real_madrid';
  private currentClubName = 'Real Madrid';
  private currentStarPlayerId = 'wc_mbappe_96';
  private currentStarPlayer = 'Kylian Mbappé';
  private currentRating = 94;
  private currentSquadIds: string[] = [];
  private currentFormation = '4-3-3';

  private currentRoomCode = '';
  private currentState: FriendRoomState = {
    roomCode: '',
    members: [],
    matchStarted: false,
    status: 'waiting_for_opponent',
    statusLabel: 'Waiting for Opponent',
  };

  private onlinePlayers: OnlinePlayerPresence[] = [];
  private openRooms: OpenRoomInfo[] = [];
  private activeLobby: OnlineMatchLobbyState | null = null;
  private latencyMs = 18;
  private pingIntervalId: number | null = null;
  private bcTimers: number[] = [];

  private listeners = new Set<RoomListener>();
  private matchStartListeners = new Set<MatchStartListener>();
  private onlinePlayersListeners = new Set<OnlinePlayersListener>();
  private openRoomsListeners = new Set<OpenRoomsListener>();
  private inviteListeners = new Set<InviteListener>();
  private lobbyListeners = new Set<LobbyListener>();
  private stateSyncListeners = new Set<StateSyncListener>();
  private guestInputListeners = new Set<GuestInputListener>();
  private disconnectListeners = new Set<DisconnectListener>();
  private reconnectListeners = new Set<ReconnectListener>();
  private socialEventListeners = new Set<SocialEventListener>();

  constructor() {
    this.clientId = `fe_${Math.random().toString(36).slice(2, 10)}`;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.bc = new BroadcastChannel('fe_friend_room_channel');
      this.bc.onmessage = (ev) => {
        this.handleIncomingMessage(ev.data, true);
      };
    }
  }

  public getClientId(): string {
    return this.clientId;
  }

  public getLatencyMs(): number {
    return this.latencyMs;
  }

  public getCurrentRoomState(): FriendRoomState {
    return this.currentState;
  }

  public getMyRoleInRoom(): 'host' | 'guest' {
    const me = this.currentState.members.find((m) => m.clientId === this.clientId);
    if (me) return me.role;
    return this.currentState.members.length === 0 ? 'host' : 'guest';
  }

  public registerPresence(params: {
    userId?: string;
    email?: string;
    avatarUrl?: string;
    username: string;
    clubId: string;
    clubName: string;
    starPlayerId?: string;
    starPlayerName: string;
    rating?: number;
    squadIds?: string[];
    formation?: string;
  }) {
    if (params.userId) this.currentUserId = params.userId;
    if (params.email) this.currentUserEmail = params.email;
    if (params.avatarUrl) this.currentAvatarUrl = params.avatarUrl;
    this.currentUsername = params.username.trim() || 'Player';
    this.currentClubId = params.clubId;
    this.currentClubName = params.clubName;
    if (params.starPlayerId) this.currentStarPlayerId = params.starPlayerId;
    this.currentStarPlayer = params.starPlayerName;
    this.currentRating = params.rating || 94;
    if (params.squadIds) this.currentSquadIds = params.squadIds;
    if (params.formation) this.currentFormation = params.formation;

    const msg = {
      type: 'presence:register',
      clientId: this.clientId,
      userId: this.currentUserId || undefined,
      email: this.currentUserEmail || undefined,
      avatarUrl: this.currentAvatarUrl || undefined,
      username: this.currentUsername,
      clubId: this.currentClubId,
      clubName: this.currentClubName,
      starPlayerId: this.currentStarPlayerId,
      starPlayerName: this.currentStarPlayer,
      rating: this.currentRating,
      squadIds: this.currentSquadIds,
      formation: this.currentFormation,
    };

    this.bc?.postMessage(msg);
    this.ensureWebSocket(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(msg));
      }
    });
  }

  public sendInviteByUsername(
    targetUsername: string,
    options?: {
      customMessage?: string;
      matchFormat?: '1v1' | '11v11';
    }
  ) {
    const cleanTarget = targetUsername.trim();
    if (!cleanTarget) return;

    const msg = {
      type: 'invite:send',
      fromClientId: this.clientId,
      fromUserId: this.currentUserId || undefined,
      fromUsername: this.currentUsername,
      fromEmail: this.currentUserEmail || undefined,
      fromAvatarUrl: this.currentAvatarUrl || undefined,
      clubId: this.currentClubId,
      clubName: this.currentClubName,
      starPlayerId: this.currentStarPlayerId,
      starPlayerName: this.currentStarPlayer,
      squadIds: this.currentSquadIds,
      formation: this.currentFormation,
      targetUsername: cleanTarget,
      customMessage: options?.customMessage || `Let's play a ${options?.matchFormat || '11v11'} match!`,
      matchFormat: options?.matchFormat || '11v11',
    };

    this.bc?.postMessage(msg);
    this.ensureWebSocket(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(msg));
      }
    });
  }

  public respondToInvite(lobbyId: string, accept: boolean, invite?: IncomingMatchInvite) {
    const msg = {
      type: 'invite:respond',
      inviteId: invite?.inviteId,
      lobbyId,
      accept,
      guestClientId: this.clientId,
      guestUserId: this.currentUserId || undefined,
      guestUsername: this.currentUsername,
      guestEmail: this.currentUserEmail || undefined,
      guestAvatarUrl: this.currentAvatarUrl || undefined,
      guestClubId: this.currentClubId,
      guestClubName: this.currentClubName,
      guestStarPlayerId: this.currentStarPlayerId,
      guestStarPlayer: this.currentStarPlayer,
      guestSquadIds: this.currentSquadIds,
      guestFormation: this.currentFormation,
    };

    if (accept && invite) {
      const joinedLobby: OnlineMatchLobbyState = {
        lobbyId: invite.lobbyId,
        roomCode: invite.roomCode,
        matchFormat: invite.matchFormat || '11v11',
        customMessage: invite.customMessage,
        settings: {
          stadiumName: 'Estadio Santiago Bernabéu',
          weather: 'Clear',
          halfDurationMinutes: 4,
          aiDifficulty: 'Legendary',
        },
        host: {
          userId: invite.fromUserId,
          clientId: invite.fromClientId,
          username: invite.fromUsername,
          email: invite.fromEmail,
          avatarUrl: invite.fromAvatarUrl,
          clubId: invite.fromClubId || 'club_real_madrid',
          clubName: invite.fromClubName,
          starPlayerName: invite.fromStarPlayer,
          rating: 95,
          squadIds: invite.fromSquadIds,
          formation: invite.fromFormation || '4-3-3',
          teamSide: 'home',
          isReady: false,
          connected: true,
        },
        guest: {
          userId: this.currentUserId || undefined,
          clientId: this.clientId,
          username: this.currentUsername,
          email: this.currentUserEmail || undefined,
          avatarUrl: this.currentAvatarUrl || undefined,
          clubId: this.currentClubId,
          clubName: this.currentClubName,
          starPlayerId: this.currentStarPlayerId,
          starPlayerName: this.currentStarPlayer,
          rating: this.currentRating,
          squadIds: this.currentSquadIds,
          formation: this.currentFormation,
          teamSide: 'away',
          isReady: false,
          connected: true,
        },
        status: 'ready_check',
      };
      this.activeLobby = joinedLobby;
      this.notifyLobbyListeners();
      this.bc?.postMessage({ type: 'lobby:update', lobby: joinedLobby });
      // Also join the underlying room code so 1v1 / 11v11 sync is ready!
      this.joinRoom({
        roomCode: invite.roomCode,
        username: this.currentUsername,
        clubId: this.currentClubId,
        clubName: this.currentClubName,
        starPlayerId: this.currentStarPlayerId,
        starPlayerName: this.currentStarPlayer,
        squadIds: this.currentSquadIds,
        formation: this.currentFormation,
        matchFormat: invite.matchFormat || '11v11',
        isReady: false,
      });
    }

    this.bc?.postMessage(msg);
    this.ensureWebSocket(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(msg));
      }
    });
  }

  public setActiveLobbyState(lobby: OnlineMatchLobbyState | null) {
    this.activeLobby = lobby;
    if (lobby && lobby.roomCode) {
      this.joinRoom({
        roomCode: lobby.roomCode,
        username: this.currentUsername,
        clubId: this.currentClubId,
        clubName: this.currentClubName,
        starPlayerId: this.currentStarPlayerId,
        starPlayerName: this.currentStarPlayer,
        squadIds: this.currentSquadIds,
        formation: this.currentFormation,
        matchFormat: lobby.matchFormat || '11v11',
        isReady: false,
      });
    }
    this.notifyLobbyListeners();
  }

  public getActiveLobbyState(): OnlineMatchLobbyState | null {
    return this.activeLobby;
  }

  public configureLobby(params: {
    lobbyId: string;
    clubId?: string;
    clubName?: string;
    starPlayerId?: string;
    starPlayerName?: string;
    formation?: string;
    teamSide?: 'home' | 'away';
    matchFormat?: '1v1' | '11v11';
    settings?: Partial<OnlineLobbySettings>;
  }) {
    if (this.activeLobby && this.activeLobby.lobbyId === params.lobbyId) {
      const isHost =
        this.activeLobby.host.clientId === this.clientId ||
        (this.currentUserId && this.activeLobby.host.userId === this.currentUserId) ||
        this.activeLobby.host.username.toLowerCase() === this.currentUsername.toLowerCase();
      const targetPlayer = isHost ? this.activeLobby.host : this.activeLobby.guest;
      if (targetPlayer) {
        if (params.clubId) targetPlayer.clubId = params.clubId;
        if (params.clubName) targetPlayer.clubName = params.clubName;
        if (params.starPlayerId) targetPlayer.starPlayerId = params.starPlayerId;
        if (params.starPlayerName) targetPlayer.starPlayerName = params.starPlayerName;
        if (params.formation) targetPlayer.formation = params.formation;
        if (params.teamSide) {
          targetPlayer.teamSide = params.teamSide;
          const otherPlayer = isHost ? this.activeLobby.guest : this.activeLobby.host;
          if (otherPlayer) {
            otherPlayer.teamSide = params.teamSide === 'home' ? 'away' : 'home';
          }
        }
      }
      if (params.matchFormat) {
        this.activeLobby.matchFormat = params.matchFormat;
      }
      if (params.settings) {
        this.activeLobby.settings = {
          stadiumName:
            params.settings.stadiumName ||
            this.activeLobby.settings?.stadiumName ||
            'Estadio Santiago Bernabéu',
          weather:
            params.settings.weather || this.activeLobby.settings?.weather || 'Clear',
          halfDurationMinutes:
            params.settings.halfDurationMinutes ||
            this.activeLobby.settings?.halfDurationMinutes ||
            4,
          aiDifficulty:
            params.settings.aiDifficulty ||
            this.activeLobby.settings?.aiDifficulty ||
            'Legendary',
        };
      }
      this.notifyLobbyListeners();
      this.bc?.postMessage({ type: 'lobby:update', lobby: this.activeLobby });
    }

    const msg = {
      type: 'lobby:configure',
      lobbyId: params.lobbyId,
      clientId: this.clientId,
      userId: this.currentUserId || undefined,
      username: this.currentUsername,
      clubId: params.clubId,
      clubName: params.clubName,
      starPlayerId: params.starPlayerId,
      starPlayerName: params.starPlayerName,
      formation: params.formation,
      teamSide: params.teamSide,
      matchFormat: params.matchFormat,
      settings: params.settings,
    };
    this.bc?.postMessage(msg);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  public setLobbyReady(lobbyId: string, isReady: boolean) {
    if (this.activeLobby && this.activeLobby.lobbyId === lobbyId) {
      const isHost =
        this.activeLobby.host.clientId === this.clientId ||
        (this.currentUserId && this.activeLobby.host.userId === this.currentUserId) ||
        this.activeLobby.host.username.toLowerCase() === this.currentUsername.toLowerCase();
      if (isHost) {
        this.activeLobby.host.isReady = isReady;
      } else if (this.activeLobby.guest) {
        this.activeLobby.guest.isReady = isReady;
      }
      this.notifyLobbyListeners();
      this.bc?.postMessage({ type: 'lobby:update', lobby: this.activeLobby });
    }

    const msg = {
      type: 'lobby:ready',
      lobbyId,
      clientId: this.clientId,
      userId: this.currentUserId || undefined,
      username: this.currentUsername,
      isReady,
    };
    this.bc?.postMessage(msg);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  public reconnectLobby(lobbyId: string) {
    const msg = {
      type: 'lobby:reconnect',
      lobbyId,
      clientId: this.clientId,
      userId: this.currentUserId || undefined,
      username: this.currentUsername,
    };
    this.bc?.postMessage(msg);
    this.ensureWebSocket(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(msg));
      }
    });
  }

  public startLobbyMatch(lobbyId: string) {
    if (this.activeLobby && this.activeLobby.lobbyId === lobbyId) {
      this.activeLobby.status = 'in_match';
      this.notifyLobbyListeners();
      this.bc?.postMessage({
        type: 'lobby:match_starting',
        lobby: this.activeLobby,
      });
    }
    const msg = {
      type: 'lobby:start',
      lobbyId,
    };
    this.bc?.postMessage(msg);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  public leaveLobby() {
    this.activeLobby = null;
    this.notifyLobbyListeners();
  }

  public joinRoom(params: {
    roomCode: string;
    username: string;
    expectedOpponentUsername?: string;
    enteredOpponentUsername?: string;
    clubId: string;
    clubName: string;
    starPlayerId?: string;
    starPlayerName: string;
    squadIds?: string[];
    formation?: string;
    matchFormat?: '11v11' | '1v1';
    requiredPlayers?: number;
    teamSide?: 'home' | 'away';
    assignedSlotIdx?: number;
    isReady?: boolean;
  }) {
    const cleanCode = normalizeClientRoomCode(params.roomCode);
    this.currentRoomCode = cleanCode;
    this.currentUsername = params.username;
    this.currentClubId = params.clubId;
    this.currentClubName = params.clubName;
    if (params.starPlayerId) this.currentStarPlayerId = params.starPlayerId;
    this.currentStarPlayer = params.starPlayerName;

    const existingMe = this.currentState.members.find((m) => m.clientId === this.clientId);
    const selfMember: FriendRoomPlayer = {
      clientId: this.clientId,
      username: params.username,
      clubId: params.clubId,
      clubName: params.clubName,
      starPlayerId: this.currentStarPlayerId,
      starPlayerName: params.starPlayerName,
      squadIds: params.squadIds,
      formation: params.formation,
      matchFormat: params.matchFormat || this.currentState.matchFormat || '11v11',
      role: existingMe?.role || 'host',
      teamSide: params.teamSide || existingMe?.teamSide || 'home',
      assignedSlotIdx:
        params.assignedSlotIdx ?? existingMe?.assignedSlotIdx ?? 9,
      isReady: params.isReady ?? existingMe?.isReady ?? true,
    };

    if (this.currentState.roomCode !== cleanCode) {
      this.currentState = {
        roomCode: cleanCode,
        expectedOpponentUsername:
          params.expectedOpponentUsername ?? params.enteredOpponentUsername,
        members: [selfMember],
        matchStarted: false,
        matchFormat: params.matchFormat || '11v11',
        requiredPlayers: params.requiredPlayers || 2,
        status: 'waiting_for_opponent',
        statusLabel: 'Waiting for Opponent',
      };
    } else {
      if (params.expectedOpponentUsername !== undefined) {
        this.currentState.expectedOpponentUsername = params.expectedOpponentUsername;
      }
      if (params.matchFormat) {
        this.currentState.matchFormat = params.matchFormat;
      }
      if (params.requiredPlayers) {
        this.currentState.requiredPlayers = params.requiredPlayers;
      }
      const exists = this.currentState.members.some((m) => m.clientId === this.clientId);
      if (!exists) {
        this.currentState.members.push({
          ...selfMember,
          role: this.currentState.members.length === 0 ? 'host' : 'guest',
          teamSide: this.currentState.members.length === 0 ? 'home' : 'away',
        });
      } else {
        this.currentState.members = this.currentState.members.map((m) =>
          m.clientId === this.clientId
            ? {
                ...m,
                username: params.username,
                clubId: params.clubId,
                clubName: params.clubName,
                starPlayerId: this.currentStarPlayerId,
                starPlayerName: params.starPlayerName,
                squadIds: params.squadIds,
                formation: params.formation,
              }
            : m
        );
      }
    }
    this.notifyListeners();

    const joinMsg = {
      type: 'room:join',
      roomCode: cleanCode,
      clientId: this.clientId,
      username: params.username,
      expectedOpponentUsername: params.expectedOpponentUsername,
      enteredOpponentUsername: params.enteredOpponentUsername,
      clubId: params.clubId,
      clubName: params.clubName,
      starPlayerId: this.currentStarPlayerId,
      starPlayerName: params.starPlayerName,
      squadIds: params.squadIds,
      formation: params.formation,
      matchFormat: params.matchFormat || this.currentState.matchFormat || '11v11',
      requiredPlayers: params.requiredPlayers || this.currentState.requiredPlayers || 2,
      teamSide: params.teamSide,
      assignedSlotIdx: params.assignedSlotIdx,
      isReady: params.isReady ?? true,
    };

    this.bc?.postMessage(joinMsg);

    this.ensureWebSocket(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(joinMsg));
      }
    });
  }

  public setRoomReady(roomCode: string, isReady: boolean) {
    const cleanCode = normalizeClientRoomCode(roomCode || this.currentRoomCode);
    const me = this.currentState.members.find((m) => m.clientId === this.clientId);
    if (me) {
      me.isReady = isReady;
      this.notifyListeners();
    }
    const msg = {
      type: 'room:ready',
      roomCode: cleanCode,
      clientId: this.clientId,
      isReady,
    };
    this.bc?.postMessage(msg);
    this.ensureWebSocket(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(msg));
      }
    });
  }

  public selectRoomPlayerSlot(
    roomCode: string,
    teamSide: 'home' | 'away',
    assignedSlotIdx: number,
    starPlayerId?: string,
    starPlayerName?: string
  ) {
    const cleanCode = normalizeClientRoomCode(roomCode || this.currentRoomCode);
    const me = this.currentState.members.find((m) => m.clientId === this.clientId);
    if (me) {
      me.teamSide = teamSide;
      me.assignedSlotIdx = assignedSlotIdx;
      if (starPlayerId) me.starPlayerId = starPlayerId;
      if (starPlayerName) me.starPlayerName = starPlayerName;
      this.notifyListeners();
    }
    const msg = {
      type: 'room:select_slot',
      roomCode: cleanCode,
      clientId: this.clientId,
      teamSide,
      assignedSlotIdx,
      starPlayerId,
      starPlayerName,
    };
    this.bc?.postMessage(msg);
    this.ensureWebSocket(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(msg));
      }
    });
  }

  public configureRoom(
    roomCode: string,
    matchFormat: '11v11' | '1v1',
    requiredPlayers: number
  ) {
    const cleanCode = normalizeClientRoomCode(roomCode || this.currentRoomCode);
    this.currentState.matchFormat = matchFormat;
    this.currentState.requiredPlayers = matchFormat === '1v1' ? 2 : requiredPlayers;
    this.notifyListeners();

    const msg = {
      type: 'room:configure',
      roomCode: cleanCode,
      clientId: this.clientId,
      matchFormat,
      requiredPlayers: matchFormat === '1v1' ? 2 : requiredPlayers,
    };
    this.bc?.postMessage(msg);
    this.ensureWebSocket(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(msg));
      }
    });
  }

  public createRoom(params: {
    username: string;
    clubId: string;
    clubName: string;
    starPlayerId?: string;
    starPlayerName: string;
    squadIds?: string[];
    formation?: string;
    matchFormat?: '11v11' | '1v1';
  }): string {
    const nextCode = `PLAY-${Math.floor(1000 + Math.random() * 9000)}`;
    this.joinRoom({
      ...params,
      roomCode: nextCode,
    });
    return nextCode;
  }

  public joinMatchmakingQueue(params: {
    username: string;
    clubId: string;
    clubName: string;
    starPlayerId?: string;
    starPlayerName: string;
    squadIds?: string[];
    formation?: string;
    matchFormat?: '11v11' | '1v1';
  }) {
    this.findMatchmakingOpponent(params);
  }

  public findMatchmakingOpponent(params: {
    username: string;
    clubId: string;
    clubName: string;
    starPlayerId?: string;
    starPlayerName: string;
    squadIds?: string[];
    formation?: string;
    matchFormat?: '11v11' | '1v1';
  }) {
    this.currentUsername = params.username;
    this.currentClubId = params.clubId;
    this.currentClubName = params.clubName;
    if (params.starPlayerId) this.currentStarPlayerId = params.starPlayerId;
    this.currentStarPlayer = params.starPlayerName;

    const msg = {
      type: 'matchmaking:find',
      clientId: this.clientId,
      username: params.username,
      clubId: params.clubId,
      clubName: params.clubName,
      starPlayerId: this.currentStarPlayerId,
      starPlayerName: params.starPlayerName,
      squadIds: params.squadIds,
      formation: params.formation,
      matchFormat: params.matchFormat || '11v11',
    };

    this.ensureWebSocket(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(msg));
      }
    });
  }

  public startMatchByUsername(params: {
    opponentUsername: string;
    username: string;
    clubId: string;
    clubName: string;
    starPlayerId?: string;
    starPlayerName: string;
    squadIds?: string[];
    formation?: string;
    matchFormat?: '11v11' | '1v1';
  }): string {
    const oppClean = params.opponentUsername.trim();
    const myClean = params.username.trim() || 'Player';
    const pair = [myClean.toLowerCase(), oppClean.toLowerCase()].sort();
    const directCode = `VS-${pair[0].replace(/[^a-z0-9]/g, '')}-${pair[1].replace(/[^a-z0-9]/g, '')}`.toUpperCase().slice(0, 24);

    this.joinRoom({
      ...params,
      roomCode: directCode,
      expectedOpponentUsername: oppClean,
      enteredOpponentUsername: oppClean,
    });

    // Send direct challenge broadcast
    this.sendInviteByUsername(oppClean, {
      matchFormat: params.matchFormat || '11v11',
      customMessage: `@${myClean} challenged you to an Online Match!`,
    });

    return directCode;
  }

  public leaveRoom(roomCode?: string) {
    const code = normalizeClientRoomCode(roomCode || this.currentRoomCode);
    const msg = {
      type: 'room:leave',
      roomCode: code,
      clientId: this.clientId,
      username: this.currentUsername,
    };
    this.bc?.postMessage(msg);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  public triggerStartMatch(roomCode: string) {
    const cleanCode = normalizeClientRoomCode(roomCode);
    const startMsg = {
      type: 'room:start_match',
      roomCode: cleanCode,
      clientId: this.clientId,
    };
    this.bc?.postMessage(startMsg);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(startMsg));
    }
  }

  // ============================================================================
  // REAL-TIME 1V1 GAMEPLAY STATE & INPUT SYNCHRONIZATION
  // ============================================================================
  public sendMatchStateSync(packet: OnlineMatchStateSyncPacket) {
    const msg = {
      type: 'match:state_sync',
      roomCode: packet.roomCode,
      clientId: this.clientId,
      packet,
    };
    this.bc?.postMessage(msg);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  public sendGuestInput(packet: OnlineGuestInputPacket) {
    const msg = {
      type: 'match:guest_input',
      roomCode: packet.roomCode,
      clientId: this.clientId,
      packet,
    };
    this.bc?.postMessage(msg);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  public subscribe(listener: RoomListener): () => void {
    this.listeners.add(listener);
    if (this.currentRoomCode) {
      listener(this.currentState);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  public subscribeOnlinePlayers(listener: OnlinePlayersListener): () => void {
    this.onlinePlayersListeners.add(listener);
    listener(this.onlinePlayers);
    return () => {
      this.onlinePlayersListeners.delete(listener);
    };
  }

  public subscribeOpenRooms(listener: OpenRoomsListener): () => void {
    this.openRoomsListeners.add(listener);
    listener(this.openRooms);
    return () => {
      this.openRoomsListeners.delete(listener);
    };
  }

  public subscribeInvites(listener: InviteListener): () => void {
    this.inviteListeners.add(listener);
    return () => {
      this.inviteListeners.delete(listener);
    };
  }

  public subscribeLobby(listener: LobbyListener): () => void {
    this.lobbyListeners.add(listener);
    listener(this.activeLobby);
    return () => {
      this.lobbyListeners.delete(listener);
    };
  }

  public onMatchStart(listener: MatchStartListener): () => void {
    this.matchStartListeners.add(listener);
    return () => {
      this.matchStartListeners.delete(listener);
    };
  }

  public onMatchStateSync(listener: StateSyncListener): () => void {
    this.stateSyncListeners.add(listener);
    return () => {
      this.stateSyncListeners.delete(listener);
    };
  }

  public onGuestInput(listener: GuestInputListener): () => void {
    this.guestInputListeners.add(listener);
    return () => {
      this.guestInputListeners.delete(listener);
    };
  }

  public onOpponentDisconnected(listener: DisconnectListener): () => void {
    this.disconnectListeners.add(listener);
    return () => {
      this.disconnectListeners.delete(listener);
    };
  }

  public onOpponentReconnected(listener: ReconnectListener): () => void {
    this.reconnectListeners.add(listener);
    return () => {
      this.reconnectListeners.delete(listener);
    };
  }

  public subscribeSocialEvents(listener: SocialEventListener): () => void {
    this.socialEventListeners.add(listener);
    return () => {
      this.socialEventListeners.delete(listener);
    };
  }

  private ensureWebSocket(onOpenCallback?: () => void) {
    if (typeof window === 'undefined') return;
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
    ) {
      if (this.ws.readyState === WebSocket.OPEN && onOpenCallback) {
        onOpenCallback();
      } else if (onOpenCallback) {
        this.ws.addEventListener('open', onOpenCallback, { once: true });
      }
      return;
    }

    try {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${proto}//${window.location.host}/ws-room`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        if (onOpenCallback) onOpenCallback();
        if (this.pingIntervalId !== null) window.clearInterval(this.pingIntervalId);
        this.pingIntervalId = window.setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'room:ping', t: performance.now() }));
          }
        }, 2500);
      };

      this.ws.onmessage = (ev) => {
        try {
          const parsed = JSON.parse(ev.data);
          this.handleIncomingMessage(parsed, false);
        } catch {
          // ignore
        }
      };

      this.ws.onclose = () => {
        if (this.pingIntervalId !== null) {
          window.clearInterval(this.pingIntervalId);
          this.pingIntervalId = null;
        }
      };
    } catch {
      // Fallback to BroadcastChannel if WS unavailable
    }
  }

  private handleIncomingMessage(msg: any, fromBroadcastChannel = false) {
    if (!msg || typeof msg.type !== 'string') return;

    if (msg.type === 'room:pong' && typeof msg.t === 'number') {
      this.latencyMs = Math.max(4, Math.min(250, Math.round(performance.now() - msg.t)));
      return;
    }

    if (msg.type === 'rooms:open_list') {
      this.openRooms = Array.isArray(msg.rooms) ? msg.rooms : [];
      this.openRoomsListeners.forEach((cb) => cb(this.openRooms));
      return;
    }

    if (msg.type === 'presence:list') {
      this.onlinePlayers = Array.isArray(msg.players) ? msg.players : [];
      this.onlinePlayersListeners.forEach((cb) => cb(this.onlinePlayers));
      this.socialEventListeners.forEach((cb) =>
        cb({ type: 'presence_updated', payload: this.onlinePlayers })
      );
    } else if (msg.type === 'friend:request_received') {
      this.socialEventListeners.forEach((cb) =>
        cb({ type: 'friend_request', payload: msg.request })
      );
    } else if (msg.type === 'friend:request_accepted') {
      this.socialEventListeners.forEach((cb) =>
        cb({ type: 'friend_accepted', payload: msg.request })
      );
    } else if (msg.type === 'presence:register') {
      if (msg.clientId && !this.onlinePlayers.some((p) => p.clientId === msg.clientId)) {
        this.onlinePlayers.push({
          clientId: msg.clientId,
          username: msg.username,
          clubId: msg.clubId,
          clubName: msg.clubName,
          starPlayerName: msg.starPlayerName,
          rating: msg.rating || 94,
          status: 'online',
        });
        this.onlinePlayersListeners.forEach((cb) => cb([...this.onlinePlayers]));
      }
    } else if (msg.type === 'invite:received') {
      this.inviteListeners.forEach((cb) => cb(msg as IncomingMatchInvite));
      this.socialEventListeners.forEach((cb) =>
        cb({ type: 'invite_received', payload: msg })
      );
    } else if (msg.type === 'invite:declined') {
      this.socialEventListeners.forEach((cb) =>
        cb({ type: 'invite_declined', payload: msg })
      );
    } else if (msg.type === 'invite:send') {
      if (
        msg.targetUsername &&
        msg.targetUsername.toLowerCase() === this.currentUsername.toLowerCase() &&
        msg.fromClientId !== this.clientId
      ) {
        const inv: IncomingMatchInvite = {
          inviteId: `inv_${Math.random().toString(36).slice(2, 7)}`,
          lobbyId: `lob_${Math.random().toString(36).slice(2, 7)}`,
          roomCode: `PLAY-${Math.floor(1000 + Math.random() * 9000)}`,
          fromClientId: msg.fromClientId,
          fromUsername: msg.fromUsername,
          fromClubName: msg.clubName,
          fromStarPlayer: msg.starPlayerName,
          customMessage: msg.customMessage,
          matchFormat: msg.matchFormat || '11v11',
          createdAt: Date.now(),
          expiresAt: Date.now() + 5 * 60 * 1000,
        };
        this.inviteListeners.forEach((cb) => cb(inv));
        this.socialEventListeners.forEach((cb) =>
          cb({ type: 'invite_received', payload: inv })
        );
      }
    } else if (msg.type === 'invite:sent_status' && msg.lobby) {
      this.activeLobby = msg.lobby;
      this.notifyLobbyListeners();
    } else if (msg.type === 'lobby:update' && msg.lobby) {
      const lob = msg.lobby as OnlineMatchLobbyState;
      const isParticipant =
        lob.host.clientId === this.clientId ||
        lob.guest?.clientId === this.clientId ||
        (this.currentUserId &&
          (lob.host.userId === this.currentUserId ||
            lob.guest?.userId === this.currentUserId)) ||
        lob.host.username.toLowerCase() === this.currentUsername.toLowerCase() ||
        (lob.guest &&
          lob.guest.username.toLowerCase() === this.currentUsername.toLowerCase());
      if (isParticipant) {
        this.activeLobby = lob;
        if (lob.roomCode && this.currentRoomCode !== lob.roomCode) {
          this.joinRoom({
            roomCode: lob.roomCode,
            username: this.currentUsername,
            clubId: this.currentClubId,
            clubName: this.currentClubName,
            starPlayerId: this.currentStarPlayerId,
            starPlayerName: this.currentStarPlayer,
            squadIds: this.currentSquadIds,
            formation: this.currentFormation,
            matchFormat: lob.matchFormat || '11v11',
            isReady: false,
          });
        }
        this.notifyLobbyListeners();
      }
    } else if (msg.type === 'lobby:match_starting' && msg.lobby) {
      const lob = msg.lobby as OnlineMatchLobbyState;
      const isHost =
        lob.host.clientId === this.clientId ||
        (this.currentUserId && lob.host.userId === this.currentUserId) ||
        lob.host.username.toLowerCase() === this.currentUsername.toLowerCase();
      const isGuest =
        lob.guest?.clientId === this.clientId ||
        (this.currentUserId && lob.guest?.userId === this.currentUserId) ||
        (lob.guest &&
          lob.guest.username.toLowerCase() === this.currentUsername.toLowerCase());

      if (isHost || isGuest) {
        this.activeLobby = lob;
        this.notifyLobbyListeners();
        const myRole: 'host' | 'guest' = isHost ? 'host' : 'guest';
        const hostPlayer: FriendRoomPlayer = {
          clientId: lob.host.clientId,
          username: lob.host.username,
          clubId: lob.host.clubId,
          clubName: lob.host.clubName,
          starPlayerId: lob.host.starPlayerId,
          starPlayerName: lob.host.starPlayerName,
          squadIds: lob.host.squadIds,
          formation: lob.host.formation,
          matchFormat: lob.matchFormat || '11v11',
          role: 'host',
          teamSide: lob.host.teamSide || 'home',
          isReady: true,
        };
        const guestPlayer: FriendRoomPlayer | undefined = lob.guest
          ? {
              clientId: lob.guest.clientId,
              username: lob.guest.username,
              clubId: lob.guest.clubId,
              clubName: lob.guest.clubName,
              starPlayerId: lob.guest.starPlayerId,
              starPlayerName: lob.guest.starPlayerName,
              squadIds: lob.guest.squadIds,
              formation: lob.guest.formation,
              matchFormat: lob.matchFormat || '11v11',
              role: 'guest',
              teamSide: lob.guest.teamSide || 'away',
              isReady: true,
            }
          : undefined;
        this.matchStartListeners.forEach((cb) =>
          cb(lob.roomCode, myRole, hostPlayer, guestPlayer, lob.lobbyId)
        );
      }
    } else if (msg.type === 'room:state') {
      if (!this.currentRoomCode || msg.roomCode === this.currentRoomCode) {
        this.currentRoomCode = msg.roomCode;
        this.currentState = {
          roomCode: msg.roomCode,
          expectedOpponentUsername:
            msg.expectedOpponentUsername ?? this.currentState.expectedOpponentUsername,
          members: msg.members || [],
          matchStarted: Boolean(msg.matchStarted),
          matchFormat: msg.matchFormat || this.currentState.matchFormat || '11v11',
          requiredPlayers: msg.requiredPlayers || this.currentState.requiredPlayers || 2,
          status: (msg.status as RoomConnectionStatus) || 'waiting_for_opponent',
          statusLabel: String(msg.statusLabel || 'Waiting for Opponent'),
        };
        this.notifyListeners();
      }
    } else if (msg.type === 'room:ready' && fromBroadcastChannel) {
      if (msg.roomCode === this.currentRoomCode) {
        const mem = this.currentState.members.find((m) => m.clientId === msg.clientId);
        if (mem) {
          mem.isReady = Boolean(msg.isReady);
          this.notifyListeners();
          const minReq =
            this.currentState.matchFormat === '1v1'
              ? 2
              : Math.max(2, this.currentState.requiredPlayers || 2);
          const allReady =
            this.currentState.members.length >= minReq &&
            this.currentState.members.every((m) => m.isReady);
          if (allReady && (!this.ws || this.ws.readyState !== WebSocket.OPEN)) {
            this.currentState.status = 'match_starting';
            this.currentState.statusLabel = 'Match Starting';
            this.notifyListeners();
            const t = window.setTimeout(() => {
              this.currentState.matchStarted = true;
              this.currentState.status = 'in_match';
              this.currentState.statusLabel = 'Live Match In Progress';
              this.notifyListeners();
              const myRole = this.getMyRoleInRoom();
              this.matchStartListeners.forEach((cb) =>
                cb(
                  this.currentRoomCode,
                  myRole,
                  this.currentState.members.find((m) => m.role === 'host'),
                  this.currentState.members.find((m) => m.role === 'guest')
                )
              );
            }, 1200);
            this.bcTimers.push(t);
          }
        }
      }
    } else if (msg.type === 'room:select_slot' && fromBroadcastChannel) {
      if (msg.roomCode === this.currentRoomCode) {
        const mem = this.currentState.members.find((m) => m.clientId === msg.clientId);
        if (mem) {
          if (msg.teamSide) mem.teamSide = msg.teamSide;
          if (typeof msg.assignedSlotIdx === 'number') mem.assignedSlotIdx = msg.assignedSlotIdx;
          if (msg.starPlayerId) mem.starPlayerId = msg.starPlayerId;
          if (msg.starPlayerName) mem.starPlayerName = msg.starPlayerName;
          this.notifyListeners();
        }
      }
    } else if (msg.type === 'room:join' && fromBroadcastChannel) {
      // Cross-tab fallback if WebSocket isn't handling it
      if (msg.roomCode === this.currentRoomCode && msg.clientId !== this.clientId) {
        const exists = this.currentState.members.some((m) => m.clientId === msg.clientId);
        const resolvedGuestUsername =
          msg.enteredOpponentUsername &&
          msg.enteredOpponentUsername.toLowerCase() !== this.currentUsername.toLowerCase()
            ? msg.enteredOpponentUsername
            : msg.username;
        if (!exists) {
          this.currentState.members.push({
            clientId: msg.clientId,
            username: resolvedGuestUsername,
            clubId: msg.clubId,
            clubName: msg.clubName,
            starPlayerId: msg.starPlayerId,
            starPlayerName: msg.starPlayerName,
            squadIds: msg.squadIds,
            formation: msg.formation,
            matchFormat: msg.matchFormat,
            role: 'guest',
            teamSide: msg.teamSide || 'away',
            assignedSlotIdx: msg.assignedSlotIdx ?? 9,
            isReady: true,
          });
          this.currentState.members.forEach((m) => {
            m.isReady = true;
          });
          this.currentState.status = 'match_starting';
          this.currentState.statusLabel = 'Match Starting';
          this.notifyListeners();
          this.bc?.postMessage({
            type: 'room:state',
            roomCode: this.currentRoomCode,
            expectedOpponentUsername: this.currentState.expectedOpponentUsername,
            members: this.currentState.members,
            matchStarted: false,
            matchFormat: this.currentState.matchFormat,
            requiredPlayers: this.currentState.requiredPlayers,
            status: 'match_starting',
            statusLabel: 'Match Starting',
          });
          if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            const t = window.setTimeout(() => {
              this.currentState.matchStarted = true;
              this.currentState.status = 'in_match';
              this.currentState.statusLabel = 'Live Match In Progress';
              this.notifyListeners();
              const hostP = this.currentState.members.find((m) => m.role === 'host');
              const guestP = this.currentState.members.find((m) => m.role === 'guest');
              this.bc?.postMessage({
                type: 'room:match_started',
                roomCode: this.currentRoomCode,
                matchFormat: this.currentState.matchFormat,
                members: this.currentState.members,
                host: hostP,
                guest: guestP,
              });
              const myRole = this.getMyRoleInRoom();
              this.matchStartListeners.forEach((cb) =>
                cb(this.currentRoomCode, myRole, hostP, guestP)
              );
            }, 250);
            this.bcTimers.push(t);
          }
        }
      }
    } else if (msg.type === 'room:match_started' || msg.type === 'room:start_match') {
      const code = normalizeClientRoomCode(msg.roomCode || this.currentRoomCode);
      if (code === this.currentRoomCode) {
        if (Array.isArray(msg.members) && msg.members.length > 0) {
          this.currentState.members = msg.members;
        }
        if (msg.matchFormat) {
          this.currentState.matchFormat = msg.matchFormat;
        }
        this.currentState.matchStarted = true;
        this.currentState.status = 'in_match';
        this.currentState.statusLabel = 'Live Match In Progress';
        this.notifyListeners();
        const hostPlayer =
          msg.host || this.currentState.members.find((m) => m.role === 'host');
        const guestPlayer =
          msg.guest ||
          this.currentState.members.find((m) => m.teamSide === 'away') ||
          this.currentState.members.find((m) => m.role === 'guest');
        const meInRoom = this.currentState.members.find((m) => m.clientId === this.clientId);
        const myRole: 'host' | 'guest' =
          meInRoom?.role === 'host'
            ? 'host'
            : guestPlayer && guestPlayer.clientId === this.clientId
            ? 'guest'
            : meInRoom
            ? 'guest'
            : 'host';
        this.matchStartListeners.forEach((cb) =>
          cb(code, myRole, hostPlayer, guestPlayer)
        );
      }
    } else if (msg.type === 'match:state_sync' && msg.packet) {
      if (msg.clientId !== this.clientId && msg.packet.roomCode === this.currentRoomCode) {
        this.stateSyncListeners.forEach((cb) => cb(msg.packet as OnlineMatchStateSyncPacket));
      }
    } else if (msg.type === 'match:guest_input' && msg.packet) {
      if (msg.clientId !== this.clientId && msg.packet.roomCode === this.currentRoomCode) {
        this.guestInputListeners.forEach((cb) => cb(msg.packet as OnlineGuestInputPacket));
      }
    } else if (msg.type === 'room:opponent_disconnected') {
      const code = normalizeClientRoomCode(msg.roomCode || this.currentRoomCode);
      if (code === this.currentRoomCode) {
        this.currentState.status = 'opponent_disconnected';
        this.currentState.statusLabel = 'Opponent Disconnected';
        this.notifyListeners();
        this.disconnectListeners.forEach((cb) =>
          cb(code, String(msg.disconnectedUsername || 'Opponent'))
        );
      }
    } else if (msg.type === 'room:opponent_reconnected') {
      const code = normalizeClientRoomCode(msg.roomCode || this.currentRoomCode);
      if (code === this.currentRoomCode) {
        this.currentState.status = 'in_match';
        this.currentState.statusLabel = 'Live Match In Progress';
        this.notifyListeners();
        this.reconnectListeners.forEach((cb) =>
          cb(code, String(msg.reconnectedUsername || 'Opponent'))
        );
      }
    }
  }

  private notifyListeners() {
    this.listeners.forEach((cb) =>
      cb({ ...this.currentState, members: [...this.currentState.members] })
    );
  }

  private notifyLobbyListeners() {
    this.lobbyListeners.forEach((cb) =>
      cb(this.activeLobby ? { ...this.activeLobby } : null)
    );
  }
}

export const FriendRoomService = new FriendRoomServiceManager();
