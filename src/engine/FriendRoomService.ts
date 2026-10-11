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
  fromUsername: string;
  fromClubName: string;
  fromStarPlayer: string;
  fromSquadIds?: string[];
  fromFormation?: string;
}

export interface OnlineLobbyPlayer {
  clientId: string;
  username: string;
  clubId: string;
  clubName: string;
  starPlayerName: string;
  rating: number;
  squadIds?: string[];
  formation?: string;
  isReady: boolean;
}

export interface OnlineMatchLobbyState {
  lobbyId: string;
  roomCode: string;
  host: OnlineLobbyPlayer;
  guest: OnlineLobbyPlayer | null;
  status: 'waiting' | 'ready_check' | 'in_match' | 'completed';
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

class FriendRoomServiceManager {
  private ws: WebSocket | null = null;
  private bc: BroadcastChannel | null = null;
  private clientId: string;
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
    username: string;
    clubId: string;
    clubName: string;
    starPlayerId?: string;
    starPlayerName: string;
    rating?: number;
    squadIds?: string[];
    formation?: string;
  }) {
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

  public sendInviteByUsername(targetUsername: string) {
    const cleanTarget = targetUsername.trim();
    if (!cleanTarget) return;

    const msg = {
      type: 'invite:send',
      fromClientId: this.clientId,
      fromUsername: this.currentUsername,
      clubId: this.currentClubId,
      clubName: this.currentClubName,
      starPlayerName: this.currentStarPlayer,
      squadIds: this.currentSquadIds,
      formation: this.currentFormation,
      targetUsername: cleanTarget,
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
      lobbyId,
      accept,
      guestClientId: this.clientId,
      guestUsername: this.currentUsername,
      guestClubId: this.currentClubId,
      guestClubName: this.currentClubName,
      guestStarPlayer: this.currentStarPlayer,
      guestSquadIds: this.currentSquadIds,
      guestFormation: this.currentFormation,
    };

    if (accept && invite) {
      const joinedLobby: OnlineMatchLobbyState = {
        lobbyId: invite.lobbyId,
        roomCode: invite.roomCode,
        host: {
          clientId: invite.fromClientId,
          username: invite.fromUsername,
          clubId: 'club_real_madrid',
          clubName: invite.fromClubName,
          starPlayerName: invite.fromStarPlayer,
          rating: 95,
          squadIds: invite.fromSquadIds,
          formation: invite.fromFormation || '4-3-3',
          isReady: false,
        },
        guest: {
          clientId: this.clientId,
          username: this.currentUsername,
          clubId: this.currentClubId,
          clubName: this.currentClubName,
          starPlayerName: this.currentStarPlayer,
          rating: this.currentRating,
          squadIds: this.currentSquadIds,
          formation: this.currentFormation,
          isReady: false,
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
      });
    }

    this.bc?.postMessage(msg);
    this.ensureWebSocket(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(msg));
      }
    });
  }

  public setLobbyReady(lobbyId: string, isReady: boolean) {
    if (this.activeLobby && this.activeLobby.lobbyId === lobbyId) {
      if (this.activeLobby.host.clientId === this.clientId) {
        this.activeLobby.host.isReady = isReady;
      } else if (this.activeLobby.guest && this.activeLobby.guest.clientId === this.clientId) {
        this.activeLobby.guest.isReady = isReady;
      }
      this.notifyLobbyListeners();
      this.bc?.postMessage({ type: 'lobby:update', lobby: this.activeLobby });
    }

    const msg = {
      type: 'lobby:ready',
      lobbyId,
      clientId: this.clientId,
      isReady,
    };
    this.bc?.postMessage(msg);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
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
      isReady: params.isReady ?? existingMe?.isReady ?? false,
    };

    if (this.currentState.roomCode !== cleanCode) {
      this.currentState = {
        roomCode: cleanCode,
        members: [selfMember],
        matchStarted: false,
        matchFormat: params.matchFormat || '11v11',
        requiredPlayers: params.requiredPlayers || 2,
        status: 'waiting_for_opponent',
        statusLabel: 'Waiting for Opponent',
      };
    } else {
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
      isReady: params.isReady,
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
        };
        this.inviteListeners.forEach((cb) => cb(inv));
      }
    } else if (msg.type === 'invite:sent_status' && msg.lobby) {
      this.activeLobby = msg.lobby;
      this.notifyLobbyListeners();
    } else if (msg.type === 'lobby:update' && msg.lobby) {
      if (
        msg.lobby.host.clientId === this.clientId ||
        msg.lobby.guest?.clientId === this.clientId
      ) {
        this.activeLobby = msg.lobby;
        this.notifyLobbyListeners();
      }
    } else if (msg.type === 'lobby:match_starting' && msg.lobby) {
      const lob = msg.lobby as OnlineMatchLobbyState;
      if (lob.host.clientId === this.clientId || lob.guest?.clientId === this.clientId) {
        this.activeLobby = lob;
        this.notifyLobbyListeners();
        const isHost = lob.host.clientId === this.clientId;
        const myRole: 'host' | 'guest' = isHost ? 'host' : 'guest';
        const hostPlayer: FriendRoomPlayer = {
          clientId: lob.host.clientId,
          username: lob.host.username,
          clubId: lob.host.clubId,
          clubName: lob.host.clubName,
          starPlayerName: lob.host.starPlayerName,
          squadIds: lob.host.squadIds,
          formation: lob.host.formation,
          role: 'host',
        };
        const guestPlayer: FriendRoomPlayer | undefined = lob.guest
          ? {
              clientId: lob.guest.clientId,
              username: lob.guest.username,
              clubId: lob.guest.clubId,
              clubName: lob.guest.clubName,
              starPlayerName: lob.guest.starPlayerName,
              squadIds: lob.guest.squadIds,
              formation: lob.guest.formation,
              role: 'guest',
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
        if (!exists) {
          this.currentState.members.push({
            clientId: msg.clientId,
            username: msg.username,
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
            isReady: Boolean(msg.isReady),
          });
          this.currentState.status = 'opponent_connected';
          this.currentState.statusLabel = 'Opponent Connected';
          this.notifyListeners();
          this.bc?.postMessage({
            type: 'room:state',
            roomCode: this.currentRoomCode,
            members: this.currentState.members,
            matchStarted: false,
            matchFormat: this.currentState.matchFormat,
            requiredPlayers: this.currentState.requiredPlayers,
            status: 'opponent_connected',
            statusLabel: 'Opponent Connected',
          });
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
