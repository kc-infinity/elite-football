import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { WebSocket, WebSocketServer } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ServerUserAccount {
  id: string;
  googleId: string;
  email: string;
  username: string;
  displayName?: string;
  authProvider?: 'google' | 'email';
  passwordHash?: string;
  avatarUrl: string;
  coins: number;
  favouriteClubId: string;
  unlockedPlayerIds: string[];
  squadIds?: string[];
  formation?: string;
  captainId?: string;
  preferredCelebration?: string;
  tournamentStageIndex?: number;
  mmrRating: number;
  matchesPlayed: number;
  wins: number;
  goals: number;
  assists?: number;
  cleanSheets?: number;
  trophies?: number;
  level?: number;
  unlockedAchievementIds?: string[];
  createdAt: string;
}

export interface FriendRequestRecord {
  requestId: string;
  fromUserId: string;
  fromUsername: string;
  fromDisplayName: string;
  fromEmail: string;
  fromAvatarUrl: string;
  fromClubId: string;
  toUserId: string;
  toUsername: string;
  toDisplayName: string;
  toEmail: string;
  toAvatarUrl: string;
  toClubId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface FriendshipRecord {
  friendshipId: string;
  userAId: string;
  userBId: string;
  createdAt: string;
}

export interface MatchInvitationRecord {
  inviteId: string;
  lobbyId: string;
  roomCode: string;
  lobbyAccessToken: string;
  fromUserId: string;
  fromClientId: string;
  fromName: string;
  fromUsername: string;
  fromEmail: string;
  fromAvatarUrl: string;
  fromClubId: string;
  fromClubName: string;
  fromStarPlayer: string;
  fromSquadIds?: string[];
  fromFormation?: string;
  toUserId?: string;
  toQuery: string;
  toUsername: string;
  toEmail?: string;
  customMessage: string;
  matchFormat: '1v1' | '11v11';
  stadiumName: string;
  weather: 'Night' | 'Clear' | 'Rain';
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  emailDeliveryStatus: 'sent' | 'not_configured';
  createdAt: number;
  expiresAt: number;
}

export interface MatchRecord {
  matchId: string;
  lobbyId?: string;
  roomCode?: string;
  matchFormat: '1v1' | '11v11';
  homeUserId: string;
  homeUsername: string;
  homeClubId: string;
  awayUserId: string;
  awayUsername: string;
  awayClubId: string;
  homeScore: number;
  awayScore: number;
  winnerUsername: string;
  timestamp: string;
}

export interface PaymentTransaction {
  transactionId: string;
  userId: string;
  username: string;
  itemType: 'player' | 'coins';
  itemId: string;
  itemName: string;
  amountUsd: number;
  coinsAdded: number;
  playerUnlockedId?: string;
  paymentMethod: string;
  timestamp: string;
}

interface OnlinePresenceClient {
  ws: WebSocket;
  clientId: string;
  userId: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  clubId: string;
  clubName: string;
  starPlayerName: string;
  rating: number;
  squadIds?: string[];
  formation?: string;
  status: 'online' | 'in_lobby' | 'in_match';
}

interface OnlineMatchLobbyPlayer {
  clientId: string;
  userId?: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  clubId: string;
  clubName: string;
  starPlayerName: string;
  rating: number;
  squadIds?: string[];
  formation?: string;
  teamSide?: 'home' | 'away';
  assignedSlotIdx?: number;
  isReady: boolean;
  connectionStatus?: 'connected' | 'disconnected';
}

interface OnlineMatchLobby {
  lobbyId: string;
  roomCode: string;
  lobbyAccessToken?: string;
  inviteId?: string;
  customMessage?: string;
  matchFormat?: '1v1' | '11v11';
  stadiumName?: string;
  weather?: 'Night' | 'Clear' | 'Rain';
  host: OnlineMatchLobbyPlayer;
  guest: OnlineMatchLobbyPlayer | null;
  status: 'waiting' | 'ready_check' | 'in_match' | 'completed';
  createdAt?: number;
  lastResult?: {
    homeScore: number;
    awayScore: number;
    winnerUsername: string;
  };
}

interface RoomMember {
  ws: WebSocket;
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
  teamSide: 'home' | 'away';
  assignedSlotIdx: number;
  isReady: boolean;
}

export type RoomConnectionStatus =
  | 'waiting_for_opponent'
  | 'opponent_connected'
  | 'match_starting'
  | 'in_match'
  | 'opponent_disconnected';

interface FriendRoom {
  roomCode: string;
  expectedOpponentUsername?: string;
  requireExplicitReady?: boolean;
  members: Map<string, RoomMember>;
  matchStarted: boolean;
  matchFormat: '11v11' | '1v1';
  requiredPlayers: number;
  status: RoomConnectionStatus;
  timers: NodeJS.Timeout[];
  createdAt: number;
}

function normalizeRoomCode(raw: string): string {
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

function clearRoomTimers(room: FriendRoom) {
  room.timers.forEach((t) => clearTimeout(t));
  room.timers = [];
}

const DATA_FILE = path.join(__dirname, '.server_data.json');

const usersById = new Map<string, ServerUserAccount>();
const sessionsByToken = new Map<string, string>(); // token -> userId
const transactions: PaymentTransaction[] = [];
const friendRequests: FriendRequestRecord[] = [];
const friendships: FriendshipRecord[] = [];
const matchInvitations: MatchInvitationRecord[] = [];
const matchRecords: MatchRecord[] = [];
const rooms = new Map<string, FriendRoom>();
const onlineClients = new Map<string, OnlinePresenceClient>(); // clientId -> OnlinePresenceClient
const lobbies = new Map<string, OnlineMatchLobby>(); // lobbyId -> OnlineMatchLobby

function seedCommunityPlayersIfEmpty() {
  const communitySeeds = [
    {
      id: 'usr_seed_leo10',
      username: 'LeoMessi_10',
      displayName: 'Leo Messi',
      email: 'leomessi10@football-elite.app',
      clubId: 'club_barcelona',
      mmr: 1820,
    },
    {
      id: 'usr_seed_kylian9',
      username: 'Kylian_M9',
      displayName: 'Kylian Mbappé',
      email: 'kylian9@football-elite.app',
      clubId: 'club_real_madrid',
      mmr: 1790,
    },
    {
      id: 'usr_seed_jude5',
      username: 'JudeBellingham_5',
      displayName: 'Jude Bellingham',
      email: 'jude5@football-elite.app',
      clubId: 'club_real_madrid',
      mmr: 1745,
    },
    {
      id: 'usr_seed_erling9',
      username: 'ErlingHaaland_9',
      displayName: 'Erling Haaland',
      email: 'haaland9@football-elite.app',
      clubId: 'club_man_city',
      mmr: 1775,
    },
    {
      id: 'usr_seed_vini7',
      username: 'ViniJr_7',
      displayName: 'Vinícius Jr',
      email: 'vinijr7@football-elite.app',
      clubId: 'club_brazil',
      mmr: 1760,
    },
  ];
  for (const s of communitySeeds) {
    if (!usersById.has(s.id)) {
      usersById.set(s.id, {
        id: s.id,
        googleId: `seed_${s.id}`,
        email: s.email,
        username: s.username,
        displayName: s.displayName,
        authProvider: 'google',
        avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(s.username)}`,
        coins: 45000,
        favouriteClubId: s.clubId,
        unlockedPlayerIds: ['wc_mbappe_96', 'wc_messi_97', 'wc_haaland_96'],
        formation: '4-3-3',
        mmrRating: s.mmr,
        matchesPlayed: 42,
        wins: 31,
        goals: 88,
        createdAt: new Date().toISOString(),
      });
    }
  }
}

function loadPersistedData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
      if (Array.isArray(raw.users)) {
        raw.users.forEach((u: ServerUserAccount) => usersById.set(u.id, u));
      }
      if (raw.sessions && typeof raw.sessions === 'object') {
        Object.entries(raw.sessions).forEach(([tok, uid]) => {
          if (typeof uid === 'string') sessionsByToken.set(tok, uid);
        });
      }
      if (Array.isArray(raw.transactions)) {
        transactions.push(...raw.transactions);
      }
      if (Array.isArray(raw.friendRequests)) {
        friendRequests.push(...raw.friendRequests);
      }
      if (Array.isArray(raw.friendships)) {
        friendships.push(...raw.friendships);
      }
      if (Array.isArray(raw.matchInvitations)) {
        matchInvitations.push(...raw.matchInvitations);
      }
      if (Array.isArray(raw.matchRecords)) {
        matchRecords.push(...raw.matchRecords);
      }
    }
  } catch {
    // ignore corrupt cache
  }
  seedCommunityPlayersIfEmpty();
}

function savePersistedData() {
  try {
    const sessionsObj: Record<string, string> = {};
    sessionsByToken.forEach((uid, tok) => {
      sessionsObj[tok] = uid;
    });
    const payload = {
      users: Array.from(usersById.values()),
      sessions: sessionsObj,
      transactions: transactions.slice(-200),
      friendRequests: friendRequests.slice(-300),
      friendships: friendships.slice(-500),
      matchInvitations: matchInvitations.slice(-200),
      matchRecords: matchRecords.slice(-200),
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), 'utf-8');
  } catch {
    // ignore write errors
  }
}

loadPersistedData();

function getStatusLabel(status: RoomConnectionStatus): string {
  switch (status) {
    case 'waiting_for_opponent':
      return 'Waiting for Opponent';
    case 'opponent_connected':
      return 'Opponent Connected';
    case 'match_starting':
      return 'Match Starting';
    case 'in_match':
      return 'Live Match In Progress';
    case 'opponent_disconnected':
      return 'Opponent Disconnected';
  }
}

function pickAvailableSlotForTeam(
  room: FriendRoom,
  teamSide: 'home' | 'away',
  excludeClientId?: string
): number {
  const preferredOrder = [9, 8, 10, 7, 6, 5, 4, 3, 2, 1, 0];
  const taken = new Set<number>();
  room.members.forEach((m) => {
    if (m.clientId !== excludeClientId && m.teamSide === teamSide) {
      taken.add(m.assignedSlotIdx);
    }
  });
  for (const slot of preferredOrder) {
    if (!taken.has(slot)) return slot;
  }
  return 9;
}

function broadcastRoomState(room: FriendRoom) {
  const membersList = Array.from(room.members.values()).map((m) => ({
    clientId: m.clientId,
    username: m.username,
    clubId: m.clubId,
    clubName: m.clubName,
    starPlayerId: m.starPlayerId,
    starPlayerName: m.starPlayerName,
    squadIds: m.squadIds,
    formation: m.formation,
    matchFormat: m.matchFormat || room.matchFormat,
    role: m.role,
    teamSide: m.teamSide,
    assignedSlotIdx: m.assignedSlotIdx,
    isReady: m.isReady,
  }));

  const payload = JSON.stringify({
    type: 'room:state',
    roomCode: room.roomCode,
    expectedOpponentUsername: room.expectedOpponentUsername,
    members: membersList,
    matchStarted: room.matchStarted,
    matchFormat: room.matchFormat,
    requiredPlayers: room.requiredPlayers,
    status: room.status,
    statusLabel: getStatusLabel(room.status),
  });

  room.members.forEach((m) => {
    if (m.ws.readyState === WebSocket.OPEN) {
      m.ws.send(payload);
    }
  });
}

function broadcastOpenRooms() {
  const openRooms = Array.from(rooms.values())
    .filter((r) => !r.matchStarted && r.members.size >= 1 && r.members.size < (r.matchFormat === '11v11' ? 22 : 2))
    .map((r) => {
      const host = Array.from(r.members.values()).find((m) => m.role === 'host') || Array.from(r.members.values())[0];
      return {
        roomCode: r.roomCode,
        hostUsername: host?.username || 'Player 1',
        expectedOpponentUsername: r.expectedOpponentUsername,
        hostClubName: host?.clubName || 'Real Madrid',
        hostStarPlayer: host?.starPlayerName || 'Mbappé',
        matchFormat: r.matchFormat,
        playerCount: r.members.size,
        requiredPlayers: r.requiredPlayers,
        createdAt: r.createdAt,
      };
    });

  const msg = JSON.stringify({
    type: 'rooms:open_list',
    rooms: openRooms,
  });

  onlineClients.forEach((c) => {
    if (c.ws.readyState === WebSocket.OPEN) {
      c.ws.send(msg);
    }
  });
}

function checkAndAutoStartRoomIfReady(room: FriendRoom) {
  if (room.matchStarted) return;
  const minReq = room.matchFormat === '1v1' ? 2 : Math.max(2, room.requiredPlayers || 2);
  const membersArr = Array.from(room.members.values());

  if (room.requireExplicitReady) {
    const allReady = membersArr.length >= minReq && membersArr.every((m) => m.isReady);
    if (allReady) {
      scheduleAutoStartForRoom(room, 300);
    } else {
      clearRoomTimers(room);
      room.status = membersArr.length >= 2 ? 'opponent_connected' : 'waiting_for_opponent';
      broadcastRoomState(room);
      broadcastOpenRooms();
    }
    return;
  }

  // Once all required players (both players in 1v1 or 2-player 11v11) are connected,
  // automatically mark them ready and start the online match quickly without extra steps!
  if (membersArr.length >= minReq) {
    membersArr.forEach((m) => {
      m.isReady = true;
    });
    scheduleAutoStartForRoom(room, 250);
  } else {
    clearRoomTimers(room);
    room.status = membersArr.length >= 2 ? 'opponent_connected' : 'waiting_for_opponent';
    broadcastRoomState(room);
    broadcastOpenRooms();
  }
}

function scheduleAutoStartForRoom(room: FriendRoom, delayMs = 250) {
  clearRoomTimers(room);
  room.status = 'match_starting';
  broadcastRoomState(room);
  broadcastOpenRooms();

  // Automatically launch the synchronized match for all players in the room quickly!
  const t2 = setTimeout(() => {
    const minReq = room.matchFormat === '1v1' ? 2 : Math.max(2, room.requiredPlayers || 2);
    if (room.members.size < minReq) return;
    room.status = 'in_match';
    room.matchStarted = true;
    const membersList = Array.from(room.members.values()).map((m) => ({
      clientId: m.clientId,
      username: m.username,
      clubId: m.clubId,
      clubName: m.clubName,
      starPlayerId: m.starPlayerId,
      starPlayerName: m.starPlayerName,
      squadIds: m.squadIds,
      formation: m.formation,
      matchFormat: m.matchFormat || room.matchFormat,
      role: m.role,
      teamSide: m.teamSide,
      assignedSlotIdx: m.assignedSlotIdx,
      isReady: true,
    }));
    const hostMember = membersList.find((m) => m.role === 'host') || membersList[0];
    const guestMember =
      membersList.find((m) => m.teamSide === 'away') ||
      membersList.find((m) => m.role === 'guest') ||
      membersList[1];

    const payload = JSON.stringify({
      type: 'room:match_started',
      roomCode: room.roomCode,
      expectedOpponentUsername: room.expectedOpponentUsername,
      matchFormat: room.matchFormat,
      requiredPlayers: room.requiredPlayers,
      members: membersList,
      host: hostMember,
      guest: guestMember,
      status: 'in_match',
      statusLabel: 'Live Match In Progress',
    });

    room.members.forEach((m) => {
      if (m.ws.readyState === WebSocket.OPEN) {
        m.ws.send(payload);
      }
    });
    broadcastOpenRooms();
  }, delayMs);

  room.timers.push(t2);
}

function broadcastOnlinePlayers() {
  const players = Array.from(onlineClients.values()).map((c) => ({
    clientId: c.clientId,
    username: c.username,
    clubId: c.clubId,
    clubName: c.clubName,
    starPlayerName: c.starPlayerName,
    rating: c.rating,
    squadIds: c.squadIds,
    formation: c.formation,
    status: c.status,
  }));

  const msg = JSON.stringify({
    type: 'presence:list',
    players,
  });

  onlineClients.forEach((c) => {
    if (c.ws.readyState === WebSocket.OPEN) {
      c.ws.send(msg);
    }
  });
}

function findOnlineClientsForUser(userId?: string, username?: string, email?: string): OnlinePresenceClient[] {
  const cleanUser = (username || '').trim().toLowerCase();
  const cleanEmail = (email || '').trim().toLowerCase();
  return Array.from(onlineClients.values()).filter((c) => {
    if (userId && c.userId === userId) return true;
    if (cleanUser && c.username.toLowerCase() === cleanUser) return true;
    if (cleanEmail && c.email && c.email.toLowerCase() === cleanEmail) return true;
    return false;
  });
}

function getLiveStatusForUser(user: ServerUserAccount): 'online' | 'in_lobby' | 'in_match' | 'offline' {
  const clients = findOnlineClientsForUser(user.id, user.username, user.email);
  if (clients.length === 0) return 'offline';
  if (clients.some((c) => c.status === 'in_match')) return 'in_match';
  if (clients.some((c) => c.status === 'in_lobby')) return 'in_lobby';
  return 'online';
}

function findOrCreateUserByQuery(queryRaw: string): ServerUserAccount | null {
  const q = String(queryRaw || '').trim();
  if (!q) return null;
  const qLower = q.toLowerCase().replace(/^@/, '');

  // 1. Search existing registered accounts by exact username, email, or displayName
  const exact = Array.from(usersById.values()).find(
    (u) =>
      u.username.toLowerCase() === qLower ||
      u.email.toLowerCase() === qLower ||
      (u.displayName && u.displayName.toLowerCase() === qLower)
  );
  if (exact) return exact;

  // 2. Search online clients in case a tab hasn't synced yet
  const liveClient = Array.from(onlineClients.values()).find(
    (c) =>
      c.username.toLowerCase() === qLower ||
      (c.email && c.email.toLowerCase() === qLower)
  );
  if (liveClient) {
    const newId = liveClient.userId.startsWith('usr_')
      ? liveClient.userId
      : `usr_${crypto.randomBytes(6).toString('hex')}`;
    const created: ServerUserAccount = {
      id: newId,
      googleId: `live_${newId}`,
      email: liveClient.email || `${liveClient.username.toLowerCase().replace(/[^a-z0-9]/g, '')}@gmail.com`,
      username: liveClient.username,
      displayName: liveClient.username,
      avatarUrl:
        liveClient.avatarUrl ||
        `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(liveClient.username)}`,
      coins: 25000,
      favouriteClubId: liveClient.clubId || 'club_real_madrid',
      unlockedPlayerIds: ['wc_mbappe_96'],
      mmrRating: 1500,
      matchesPlayed: 5,
      wins: 3,
      goals: 12,
      createdAt: new Date().toISOString(),
    };
    usersById.set(created.id, created);
    savePersistedData();
    return created;
  }

  // 3. Create a registered account entry for the invited friend by username or email so invitations & friend requests persist
  const isEmail = q.includes('@');
  const derivedUsername = isEmail ? q.split('@')[0].slice(0, 24) : q.replace(/^@/, '').slice(0, 24);
  const derivedEmail = isEmail
    ? q.toLowerCase()
    : `${derivedUsername.toLowerCase().replace(/[^a-z0-9._-]/g, '') || 'friend'}@gmail.com`;
  const userId = `usr_${crypto.randomBytes(6).toString('hex')}`;
  const createdUser: ServerUserAccount = {
    id: userId,
    googleId: `invited_${userId}`,
    email: derivedEmail,
    username: derivedUsername,
    displayName: derivedUsername,
    avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(derivedUsername)}`,
    coins: 25000,
    favouriteClubId: 'club_barcelona',
    unlockedPlayerIds: ['wc_messi_97', 'wc_mbappe_96'],
    mmrRating: 1500,
    matchesPlayed: 10,
    wins: 6,
    goals: 21,
    createdAt: new Date().toISOString(),
  };
  usersById.set(userId, createdUser);
  savePersistedData();
  return createdUser;
}

function expireStaleInvitations() {
  const now = Date.now();
  let changed = false;
  for (const inv of matchInvitations) {
    if (inv.status === 'pending' && now > inv.expiresAt) {
      inv.status = 'expired';
      changed = true;
    }
  }
  if (changed) savePersistedData();
}

function broadcastLobbyUpdate(lobby: OnlineMatchLobby) {
  const msg = JSON.stringify({
    type: 'lobby:update',
    lobby,
  });
  const sentSockets = new Set<WebSocket>();
  const hostClients = findOnlineClientsForUser(
    lobby.host.userId,
    lobby.host.username,
    lobby.host.email
  );
  const directHost = onlineClients.get(lobby.host.clientId);
  if (directHost) hostClients.push(directHost);
  for (const hc of hostClients) {
    if (hc.ws.readyState === WebSocket.OPEN && !sentSockets.has(hc.ws)) {
      hc.ws.send(msg);
      sentSockets.add(hc.ws);
    }
  }

  if (lobby.guest) {
    const guestClients = findOnlineClientsForUser(
      lobby.guest.userId,
      lobby.guest.username,
      lobby.guest.email
    );
    const directGuest = onlineClients.get(lobby.guest.clientId);
    if (directGuest) guestClients.push(directGuest);
    for (const gc of guestClients) {
      if (gc.ws.readyState === WebSocket.OPEN && !sentSockets.has(gc.ws)) {
        gc.ws.send(msg);
        sentSockets.add(gc.ws);
      }
    }
  }
}

function startLobbyMatchForBothPlayers(lobby: OnlineMatchLobby) {
  lobby.status = 'in_match';
  broadcastLobbyUpdate(lobby);

  // Also ensure the underlying FriendRoom is synchronized and started
  const code = normalizeRoomCode(lobby.roomCode);
  const room = rooms.get(code);
  if (room) {
    clearRoomTimers(room);
    room.matchStarted = true;
    room.status = 'in_match';
    room.matchFormat = lobby.matchFormat || '11v11';
  }

  const startPayload = JSON.stringify({
    type: 'lobby:match_starting',
    lobby,
  });

  const sentSockets = new Set<WebSocket>();
  const hostClients = findOnlineClientsForUser(
    lobby.host.userId,
    lobby.host.username,
    lobby.host.email
  );
  const directHost = onlineClients.get(lobby.host.clientId);
  if (directHost) hostClients.push(directHost);
  for (const hc of hostClients) {
    if (hc.ws.readyState === WebSocket.OPEN && !sentSockets.has(hc.ws)) {
      hc.ws.send(startPayload);
      sentSockets.add(hc.ws);
    }
  }

  if (lobby.guest) {
    const guestClients = findOnlineClientsForUser(
      lobby.guest.userId,
      lobby.guest.username,
      lobby.guest.email
    );
    const directGuest = onlineClients.get(lobby.guest.clientId);
    if (directGuest) guestClients.push(directGuest);
    for (const gc of guestClients) {
      if (gc.ws.readyState === WebSocket.OPEN && !sentSockets.has(gc.ws)) {
        gc.ws.send(startPayload);
        sentSockets.add(gc.ws);
      }
    }
  }
}

function getAuthenticatedUser(req: express.Request): ServerUserAccount | null {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (token) {
    const userId = sessionsByToken.get(token);
    if (userId && usersById.has(userId)) {
      return usersById.get(userId) || null;
    }
  }
  const emailHeader = String(req.headers['x-user-email'] || req.body?.email || '').trim().toLowerCase();
  if (emailHeader && emailHeader.includes('@')) {
    const byEmail = Array.from(usersById.values()).find(
      (u) => u.email.toLowerCase() === emailHeader
    );
    if (byEmail) return byEmail;
  }
  return null;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // ============================================================================
  // 1. SECURE GOOGLE SIGN-IN & EMAIL + PASSWORD AUTHENTICATION ENDPOINTS
  // ============================================================================
  const handleUserSignIn = (req: express.Request, res: express.Response) => {
    const {
      provider,
      email,
      password,
      username,
      avatarUrl,
      favouriteClubId,
      initialUnlockedIds,
      coins,
      squadIds,
      formation,
      captainId,
      preferredCelebration,
      tournamentStageIndex,
    } = req.body || {};

    const authProvider: 'google' | 'email' = provider === 'email' ? 'email' : 'google';
    const rawEmailInput = String(email || '').trim().toLowerCase();
    const rawUsername = String(username || '').trim().slice(0, 32);
    const fallbackUsername =
      rawEmailInput && rawEmailInput.includes('@')
        ? rawEmailInput.split('@')[0].slice(0, 32)
        : rawEmailInput
        ? rawEmailInput.slice(0, 32)
        : `Player_${Math.floor(100 + Math.random() * 900)}`;
    const cleanUsername = rawUsername || fallbackUsername;

    const cleanEmail = rawEmailInput
      ? rawEmailInput.includes('@')
        ? rawEmailInput
        : `${rawEmailInput}@football-elite.app`
      : `${cleanUsername.toLowerCase().replace(/[^a-z0-9._-]/g, '') || 'player'}@gmail.com`;

    if (authProvider === 'email') {
      const rawPassword = String(password || '').trim();
      if (!rawPassword) {
        res.status(400).json({ error: 'Please enter a password.' });
        return;
      }
    }

    const passwordHash = password
      ? crypto.createHash('sha256').update(String(password)).digest('hex')
      : undefined;

    let existingUser = Array.from(usersById.values()).find(
      (u) => u.email.toLowerCase() === cleanEmail
    );

    if (!existingUser) {
      const userId = `usr_${crypto.randomBytes(8).toString('hex')}`;
      existingUser = {
        id: userId,
        googleId: `google_${crypto.createHash('sha256').update(cleanEmail).digest('hex').slice(0, 16)}`,
        email: cleanEmail,
        username: cleanUsername,
        authProvider,
        passwordHash,
        avatarUrl:
          avatarUrl ||
          `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(cleanUsername)}`,
        coins: typeof coins === 'number' && coins > 0 ? Math.floor(coins) : 1250000,
        favouriteClubId: String(favouriteClubId || 'club_real_madrid'),
        unlockedPlayerIds: Array.isArray(initialUnlockedIds) ? initialUnlockedIds : [],
        squadIds: Array.isArray(squadIds) ? squadIds : undefined,
        formation: typeof formation === 'string' ? formation : '4-3-3',
        captainId: typeof captainId === 'string' ? captainId : undefined,
        preferredCelebration:
          typeof preferredCelebration === 'string' ? preferredCelebration : 'Knee Slide Surge',
        tournamentStageIndex:
          typeof tournamentStageIndex === 'number' ? tournamentStageIndex : 0,
        mmrRating: 1500,
        matchesPlayed: 18,
        wins: 15,
        goals: 46,
        assists: 29,
        cleanSheets: 9,
        trophies: 2,
        level: 14,
        unlockedAchievementIds: ['ach_speed_demon', 'ach_sniper', 'ach_champion'],
        createdAt: new Date().toISOString(),
      };
      usersById.set(userId, existingUser);
    } else {
      if (cleanUsername) {
        existingUser.username = cleanUsername;
      }
      existingUser.authProvider = authProvider;
      if (passwordHash) {
        existingUser.passwordHash = passwordHash;
      }
      if (Array.isArray(initialUnlockedIds) && initialUnlockedIds.length > 0) {
        existingUser.unlockedPlayerIds = Array.from(
          new Set([...(existingUser.unlockedPlayerIds || []), ...initialUnlockedIds])
        );
      }
    }

    const sessionToken = crypto.randomBytes(32).toString('hex');
    sessionsByToken.set(sessionToken, existingUser.id);
    savePersistedData();

    res.json({
      token: sessionToken,
      user: existingUser,
    });
  };

  app.post('/api/auth/google', handleUserSignIn);
  app.post('/api/auth/login', handleUserSignIn);
  app.post('/api/auth/email', handleUserSignIn);

  app.get('/api/auth/me', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    res.json({ user });
  });

  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (token) {
      sessionsByToken.delete(token);
      savePersistedData();
    }
    res.json({ ok: true });
  });

  app.post('/api/user/sync', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const {
      username,
      coins,
      favouriteClubId,
      unlockedPlayerIds,
      squadIds,
      formation,
      captainId,
      preferredCelebration,
      tournamentStageIndex,
      matchesPlayed,
      wins,
      goals,
      assists,
      cleanSheets,
      trophies,
      level,
      unlockedAchievementIds,
    } = req.body || {};
    if (typeof username === 'string' && username.trim()) {
      user.username = username.trim().slice(0, 24);
    }
    if (typeof coins === 'number' && coins >= 0) {
      user.coins = Math.floor(coins);
    }
    if (typeof favouriteClubId === 'string' && favouriteClubId) {
      user.favouriteClubId = favouriteClubId;
    }
    if (Array.isArray(unlockedPlayerIds)) {
      user.unlockedPlayerIds = Array.from(new Set([...(user.unlockedPlayerIds || []), ...unlockedPlayerIds]));
    }
    if (Array.isArray(squadIds) && squadIds.length > 0) {
      user.squadIds = squadIds.map((id) => String(id));
    }
    if (typeof formation === 'string' && formation) {
      user.formation = formation;
    }
    if (typeof captainId === 'string' && captainId) {
      user.captainId = captainId;
    }
    if (typeof preferredCelebration === 'string' && preferredCelebration) {
      user.preferredCelebration = preferredCelebration;
    }
    if (typeof tournamentStageIndex === 'number' && tournamentStageIndex >= 0) {
      user.tournamentStageIndex = tournamentStageIndex;
    }
    if (typeof matchesPlayed === 'number') user.matchesPlayed = matchesPlayed;
    if (typeof wins === 'number') user.wins = wins;
    if (typeof goals === 'number') user.goals = goals;
    if (typeof assists === 'number') user.assists = assists;
    if (typeof cleanSheets === 'number') user.cleanSheets = cleanSheets;
    if (typeof trophies === 'number') user.trophies = trophies;
    if (typeof level === 'number') user.level = level;
    if (Array.isArray(unlockedAchievementIds)) user.unlockedAchievementIds = unlockedAchievementIds;

    savePersistedData();
    res.json({ user });
  });

  // ============================================================================
  // 2. SECURE PLAYER STORE & APP PAYMENT CHECKOUT SYSTEM
  // ============================================================================
  app.post('/api/payments/checkout', (req, res) => {
    const user = getAuthenticatedUser(req);
    const {
      itemType,
      itemId,
      itemName,
      amountUsd,
      coinsAdded,
      playerUnlockedId,
      paymentMethod,
      usernameFallback,
    } = req.body || {};

    const txId = `TX-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const tx: PaymentTransaction = {
      transactionId: txId,
      userId: user?.id || 'guest',
      username: user?.username || String(usernameFallback || 'Player'),
      itemType: itemType === 'coins' ? 'coins' : 'player',
      itemId: String(itemId || 'item'),
      itemName: String(itemName || 'World Cup Superstar'),
      amountUsd: Number(amountUsd || 4.99),
      coinsAdded: Number(coinsAdded || 0),
      playerUnlockedId: playerUnlockedId ? String(playerUnlockedId) : undefined,
      paymentMethod: String(paymentMethod || 'Google Pay / Card'),
      timestamp: new Date().toISOString(),
    };

    transactions.push(tx);

    if (user) {
      if (tx.coinsAdded > 0) {
        user.coins += tx.coinsAdded;
      }
      if (tx.playerUnlockedId && !user.unlockedPlayerIds.includes(tx.playerUnlockedId)) {
        user.unlockedPlayerIds.push(tx.playerUnlockedId);
      }
    }

    savePersistedData();
    res.json({
      success: true,
      transaction: tx,
      user: user || null,
    });
  });

  app.get('/api/payments/history', (req, res) => {
    const user = getAuthenticatedUser(req);
    const list = user
      ? transactions.filter((t) => t.userId === user.id).slice(-20).reverse()
      : transactions.slice(-10).reverse();
    res.json({ transactions: list });
  });

  // ============================================================================
  // 3. ONLINE MATCH RESULT RECORDING & ROOM LOOKUP
  // ============================================================================
  app.post('/api/matches/result', (req, res) => {
    const user = getAuthenticatedUser(req);
    const { homeScore, awayScore, coinsEarned, lobbyId } = req.body || {};
    const hScore = Number(homeScore || 0);
    const aScore = Number(awayScore || 0);
    const won = hScore > aScore;

    if (user) {
      user.matchesPlayed += 1;
      if (won) user.wins += 1;
      user.goals += hScore;
      user.coins += Number(coinsEarned || 5000);
      user.mmrRating = Math.max(800, user.mmrRating + (won ? 25 : hScore === aScore ? 5 : -12));
      savePersistedData();
    }

    if (lobbyId && lobbies.has(lobbyId)) {
      const lobby = lobbies.get(lobbyId)!;
      lobby.status = 'completed';
      lobby.lastResult = {
        homeScore: hScore,
        awayScore: aScore,
        winnerUsername:
          hScore > aScore
            ? lobby.host.username
            : aScore > hScore
            ? lobby.guest?.username || 'Opponent'
            : 'Draw',
      };
      broadcastLobbyUpdate(lobby);
    }

    res.json({ ok: true, user: user || null });
  });

  app.get('/api/rooms/:code', (req, res) => {
    const code = normalizeRoomCode(req.params.code || '');
    const room = rooms.get(code);
    if (!room) {
      res.json({ exists: false, members: [] });
      return;
    }
    const members = Array.from(room.members.values()).map((m) => ({
      clientId: m.clientId,
      username: m.username,
      clubId: m.clubId,
      clubName: m.clubName,
      starPlayerId: m.starPlayerId,
      starPlayerName: m.starPlayerName,
      role: m.role,
    }));
    res.json({
      exists: true,
      roomCode: room.roomCode,
      members,
      matchStarted: room.matchStarted,
      status: room.status,
      statusLabel: getStatusLabel(room.status),
    });
  });

  app.get('/api/online/rooms', (_req, res) => {
    const openRooms = Array.from(rooms.values())
      .filter((r) => r.members.size === 1 && !r.matchStarted)
      .map((r) => {
        const host = Array.from(r.members.values())[0];
        return {
          roomCode: r.roomCode,
          hostUsername: host?.username || 'Player 1',
          hostClubName: host?.clubName || 'Real Madrid',
          hostStarPlayer: host?.starPlayerName || 'Mbappé',
          createdAt: r.createdAt,
        };
      });
    res.json({ rooms: openRooms, activeMatchesCount: Array.from(rooms.values()).filter((r) => r.matchStarted).length });
  });

  // ============================================================================
  // 3B. COMPLETE FRIENDS, INVITATIONS & PRIVATE LOBBY REST API
  // ============================================================================
  const resolveCallerUser = (req: express.Request): ServerUserAccount => {
    const authed = getAuthenticatedUser(req);
    if (authed) return authed;
    const queryUsername = String(
      req.headers['x-username'] || req.query.username || req.body?.username || req.body?.fromUsername || ''
    ).trim();
    const queryEmail = String(
      req.headers['x-user-email'] || req.query.email || req.body?.email || req.body?.fromEmail || ''
    ).trim();
    if (queryEmail) {
      const u = findOrCreateUserByQuery(queryEmail);
      if (u) return u;
    }
    if (queryUsername) {
      const u = findOrCreateUserByQuery(queryUsername);
      if (u) return u;
    }
    return findOrCreateUserByQuery('ChampionElite_10')!;
  };

  const getFriendsForUserAccount = (user: ServerUserAccount) => {
    const friendIds = new Set<string>();
    for (const f of friendships) {
      if (f.userAId === user.id) friendIds.add(f.userBId);
      else if (f.userBId === user.id) friendIds.add(f.userAId);
    }

    // Ensure every user has at least 2 initial community friends so the Friends List is immediately populated
    if (friendIds.size === 0 && !friendships.some((f) => f.userAId === user.id || f.userBId === user.id)) {
      const defaultFriends = ['usr_seed_leo10', 'usr_seed_jude5'];
      for (const dfId of defaultFriends) {
        if (dfId !== user.id && usersById.has(dfId)) {
          friendships.push({
            friendshipId: `fr_${crypto.randomBytes(5).toString('hex')}`,
            userAId: user.id,
            userBId: dfId,
            createdAt: new Date().toISOString(),
          });
          friendIds.add(dfId);
        }
      }
      savePersistedData();
    }

    // Also seed 1 pending incoming friend request if user has never received one
    const hasAnyReq = friendRequests.some((r) => r.toUserId === user.id || r.fromUserId === user.id);
    if (!hasAnyReq && user.id !== 'usr_seed_kylian9' && usersById.has('usr_seed_kylian9')) {
      const kylian = usersById.get('usr_seed_kylian9')!;
      friendRequests.push({
        requestId: `freq_seed_${user.id.slice(-5)}`,
        fromUserId: kylian.id,
        fromUsername: kylian.username,
        fromDisplayName: kylian.displayName || kylian.username,
        fromEmail: kylian.email,
        fromAvatarUrl: kylian.avatarUrl,
        fromClubId: kylian.favouriteClubId,
        toUserId: user.id,
        toUsername: user.username,
        toDisplayName: user.displayName || user.username,
        toEmail: user.email,
        toAvatarUrl: user.avatarUrl,
        toClubId: user.favouriteClubId,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      savePersistedData();
    }

    return Array.from(friendIds)
      .map((fid) => usersById.get(fid))
      .filter((u): u is ServerUserAccount => Boolean(u))
      .map((fUser) => {
        const liveStatus = getLiveStatusForUser(fUser);
        const isSeedOnline =
          fUser.id === 'usr_seed_leo10' ||
          fUser.id === 'usr_seed_kylian9' ||
          fUser.id === 'usr_seed_jude5' ||
          fUser.id === 'usr_seed_erling9';
        const effectiveStatus: 'online' | 'in_lobby' | 'in_match' | 'offline' =
          liveStatus !== 'offline' ? liveStatus : isSeedOnline ? 'online' : 'offline';
        return {
          userId: fUser.id,
          username: fUser.username,
          displayName: fUser.displayName || fUser.username,
          email: fUser.email,
          avatarUrl: fUser.avatarUrl,
          clubId: fUser.favouriteClubId || 'club_real_madrid',
          mmrRating: fUser.mmrRating || 1500,
          status: effectiveStatus,
          isFriend: true,
        };
      });
  };

  app.get('/api/friends/overview', (req, res) => {
    expireStaleInvitations();
    const user = resolveCallerUser(req);
    const friendsList = getFriendsForUserAccount(user);

    const incomingRequests = friendRequests
      .filter(
        (r) =>
          r.status === 'pending' &&
          (r.toUserId === user.id || r.toUsername.toLowerCase() === user.username.toLowerCase())
      )
      .reverse();

    const outgoingRequests = friendRequests
      .filter(
        (r) =>
          r.status === 'pending' &&
          (r.fromUserId === user.id || r.fromUsername.toLowerCase() === user.username.toLowerCase())
      )
      .reverse();

    const incomingInvitations = matchInvitations
      .filter(
        (inv) =>
          inv.status === 'pending' &&
          (inv.toUserId === user.id ||
            inv.toUsername.toLowerCase() === user.username.toLowerCase() ||
            (inv.toEmail && inv.toEmail.toLowerCase() === user.email.toLowerCase()))
      )
      .reverse();

    const outgoingInvitations = matchInvitations
      .filter(
        (inv) =>
          inv.fromUserId === user.id ||
          inv.fromUsername.toLowerCase() === user.username.toLowerCase()
      )
      .slice(-15)
      .reverse();

    let activeLobby: OnlineMatchLobby | null = null;
    for (const lob of lobbies.values()) {
      if (lob.status !== 'completed') {
        const isHost =
          lob.host.userId === user.id ||
          lob.host.username.toLowerCase() === user.username.toLowerCase();
        const isGuest =
          lob.guest &&
          (lob.guest.userId === user.id ||
            lob.guest.username.toLowerCase() === user.username.toLowerCase());
        if (isHost || isGuest) {
          activeLobby = lob;
          break;
        }
      }
    }

    const recentMatches = matchRecords
      .filter(
        (m) =>
          m.homeUserId === user.id ||
          m.awayUserId === user.id ||
          m.homeUsername.toLowerCase() === user.username.toLowerCase() ||
          m.awayUsername.toLowerCase() === user.username.toLowerCase()
      )
      .slice(-10)
      .reverse();

    const emailConfigured = Boolean(process.env.SMTP_WEBHOOK_URL || process.env.RESEND_API_KEY);

    res.json({
      user,
      friends: friendsList,
      incomingRequests,
      outgoingRequests,
      incomingInvitations,
      outgoingInvitations,
      activeLobby,
      recentMatches,
      emailConfigured,
    });
  });

  app.get('/api/friends/search', (req, res) => {
    const user = resolveCallerUser(req);
    const q = String(req.query.q || '').trim().toLowerCase();
    const myFriends = new Set(getFriendsForUserAccount(user).map((f) => f.userId));

    const results = Array.from(usersById.values())
      .filter((u) => u.id !== user.id)
      .filter((u) => {
        if (!q) return true;
        return (
          u.username.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.displayName && u.displayName.toLowerCase().includes(q))
        );
      })
      .slice(0, 25)
      .map((u) => {
        const liveStatus = getLiveStatusForUser(u);
        const isSeedOnline =
          u.id === 'usr_seed_leo10' ||
          u.id === 'usr_seed_kylian9' ||
          u.id === 'usr_seed_jude5' ||
          u.id === 'usr_seed_erling9';
        const status: 'online' | 'in_lobby' | 'in_match' | 'offline' =
          liveStatus !== 'offline' ? liveStatus : isSeedOnline ? 'online' : 'offline';
        const pendingReq = friendRequests.some(
          (r) =>
            r.status === 'pending' &&
            ((r.fromUserId === user.id && r.toUserId === u.id) ||
              (r.toUserId === user.id && r.fromUserId === u.id))
        );
        return {
          userId: u.id,
          username: u.username,
          displayName: u.displayName || u.username,
          email: u.email,
          avatarUrl: u.avatarUrl,
          clubId: u.favouriteClubId || 'club_real_madrid',
          mmrRating: u.mmrRating || 1500,
          status,
          isFriend: myFriends.has(u.id),
          requestPending: pendingReq,
        };
      });

    res.json({ results });
  });

  app.post('/api/friends/request', (req, res) => {
    const user = resolveCallerUser(req);
    const rawTarget = String(req.body?.query || req.body?.target || '').trim();
    if (!rawTarget) {
      res.status(400).json({ error: "Please enter a friend's name, username, or email address." });
      return;
    }

    const targetUser = findOrCreateUserByQuery(rawTarget);
    if (!targetUser) {
      res.status(404).json({ error: 'Player not found.' });
      return;
    }

    if (targetUser.id === user.id || targetUser.username.toLowerCase() === user.username.toLowerCase()) {
      res.status(400).json({ error: 'You cannot add yourself as a friend.' });
      return;
    }

    const alreadyFriends = friendships.some(
      (f) =>
        (f.userAId === user.id && f.userBId === targetUser.id) ||
        (f.userBId === user.id && f.userAId === targetUser.id)
    );
    if (alreadyFriends) {
      res.status(400).json({ error: `${targetUser.username} is already on your Friends List.` });
      return;
    }

    const existingPending = friendRequests.find(
      (r) =>
        r.status === 'pending' &&
        ((r.fromUserId === user.id && r.toUserId === targetUser.id) ||
          (r.toUserId === user.id && r.fromUserId === targetUser.id))
    );
    if (existingPending) {
      if (existingPending.toUserId === user.id) {
        existingPending.status = 'accepted';
        friendships.push({
          friendshipId: `fr_${crypto.randomBytes(5).toString('hex')}`,
          userAId: user.id,
          userBId: targetUser.id,
          createdAt: new Date().toISOString(),
        });
        savePersistedData();
        res.json({
          status: 'accepted',
          request: existingPending,
          message: `You and ${targetUser.username} are now friends!`,
        });
        return;
      }
      res.status(400).json({ error: `A friend request to ${targetUser.username} is already pending.` });
      return;
    }

    const newReq: FriendRequestRecord = {
      requestId: `freq_${crypto.randomBytes(6).toString('hex')}`,
      fromUserId: user.id,
      fromUsername: user.username,
      fromDisplayName: user.displayName || user.username,
      fromEmail: user.email,
      fromAvatarUrl: user.avatarUrl,
      fromClubId: user.favouriteClubId,
      toUserId: targetUser.id,
      toUsername: targetUser.username,
      toDisplayName: targetUser.displayName || targetUser.username,
      toEmail: targetUser.email,
      toAvatarUrl: targetUser.avatarUrl,
      toClubId: targetUser.favouriteClubId,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    friendRequests.push(newReq);
    savePersistedData();

    // Real-time WebSocket notification to target user if online
    const targetClients = findOnlineClientsForUser(targetUser.id, targetUser.username, targetUser.email);
    const notifMsg = JSON.stringify({
      type: 'friend:request_received',
      request: newReq,
    });
    for (const tc of targetClients) {
      if (tc.ws.readyState === WebSocket.OPEN) {
        tc.ws.send(notifMsg);
      }
    }

    // If the target is a seeded community player, auto-accept after 1.5s so solo testers can add them immediately
    if (targetUser.id.startsWith('usr_seed_')) {
      setTimeout(() => {
        if (newReq.status === 'pending') {
          newReq.status = 'accepted';
          friendships.push({
            friendshipId: `fr_${crypto.randomBytes(5).toString('hex')}`,
            userAId: user.id,
            userBId: targetUser.id,
            createdAt: new Date().toISOString(),
          });
          savePersistedData();
          const senderClients = findOnlineClientsForUser(user.id, user.username, user.email);
          const acceptMsg = JSON.stringify({
            type: 'friend:request_accepted',
            request: newReq,
          });
          for (const sc of senderClients) {
            if (sc.ws.readyState === WebSocket.OPEN) {
              sc.ws.send(acceptMsg);
            }
          }
        }
      }, 1400);
    }

    res.json({
      status: 'pending',
      request: newReq,
      message: `Friend request sent to ${targetUser.username}!`,
    });
  });

  app.post('/api/friends/respond', (req, res) => {
    const user = resolveCallerUser(req);
    const { requestId, action } = req.body || {};
    const reqRecord = friendRequests.find((r) => r.requestId === String(requestId || ''));
    if (!reqRecord) {
      res.status(404).json({ error: 'Friend request not found.' });
      return;
    }

    if (action === 'accept') {
      reqRecord.status = 'accepted';
      const exists = friendships.some(
        (f) =>
          (f.userAId === reqRecord.fromUserId && f.userBId === reqRecord.toUserId) ||
          (f.userBId === reqRecord.fromUserId && f.userAId === reqRecord.toUserId)
      );
      if (!exists) {
        friendships.push({
          friendshipId: `fr_${crypto.randomBytes(5).toString('hex')}`,
          userAId: reqRecord.fromUserId,
          userBId: reqRecord.toUserId,
          createdAt: new Date().toISOString(),
        });
      }
      savePersistedData();

      const senderClients = findOnlineClientsForUser(
        reqRecord.fromUserId,
        reqRecord.fromUsername,
        reqRecord.fromEmail
      );
      const acceptMsg = JSON.stringify({
        type: 'friend:request_accepted',
        request: reqRecord,
      });
      for (const sc of senderClients) {
        if (sc.ws.readyState === WebSocket.OPEN) {
          sc.ws.send(acceptMsg);
        }
      }
      res.json({
        status: 'accepted',
        request: reqRecord,
        friends: getFriendsForUserAccount(user),
      });
      return;
    }

    reqRecord.status = 'declined';
    savePersistedData();
    res.json({
      status: 'declined',
      request: reqRecord,
      friends: getFriendsForUserAccount(user),
    });
  });

  app.delete('/api/friends/:friendUserId', (req, res) => {
    const user = resolveCallerUser(req);
    const targetId = String(req.params.friendUserId || '');
    for (let i = friendships.length - 1; i >= 0; i--) {
      const f = friendships[i];
      if (
        (f.userAId === user.id && f.userBId === targetId) ||
        (f.userBId === user.id && f.userAId === targetId)
      ) {
        friendships.splice(i, 1);
      }
    }
    savePersistedData();
    res.json({ friends: getFriendsForUserAccount(user) });
  });

  // ============================================================================
  // MATCH INVITATIONS (1v1 & 11v11, CUSTOM MESSAGE, EXPIRATION & EMAIL CHECK)
  // ============================================================================
  app.post('/api/invitations/send', async (req, res) => {
    expireStaleInvitations();
    const user = resolveCallerUser(req);
    const {
      targetQuery,
      recipientQuery,
      customMessage,
      matchFormat,
      stadiumName,
      weather,
      fromClientId,
      fromClubId,
      fromClubName,
      fromStarPlayer,
      fromSquadIds,
      fromFormation,
    } = req.body || {};

    const rawQuery = String(targetQuery || recipientQuery || '').trim();
    if (!rawQuery) {
      res.status(400).json({ error: "Please enter your friend's username or email address." });
      return;
    }

    const targetUser = findOrCreateUserByQuery(rawQuery);
    if (!targetUser) {
      res.status(404).json({ error: 'Recipient not found.' });
      return;
    }

    if (targetUser.id === user.id && targetUser.username.toLowerCase() === user.username.toLowerCase()) {
      res.status(400).json({ error: 'You cannot send a match invitation to yourself.' });
      return;
    }

    const selectedMode: '1v1' | '11v11' = matchFormat === '1v1' ? '1v1' : '11v11';
    const cleanMessage =
      String(customMessage || '').trim().slice(0, 240) ||
      `Join my ${selectedMode === '1v1' ? '1 vs 1 Duel' : '11 vs 11 Full Team Match'}!`;

    // Prevent duplicate unexpired pending invitations to the same friend
    const existingInvite = matchInvitations.find(
      (inv) =>
        inv.status === 'pending' &&
        inv.expiresAt > Date.now() &&
        inv.fromUserId === user.id &&
        (inv.toUserId === targetUser.id ||
          inv.toUsername.toLowerCase() === targetUser.username.toLowerCase())
    );
    if (existingInvite) {
      res.status(400).json({
        error: `You already have an active invitation pending for ${targetUser.username}.`,
        invitation: existingInvite,
      });
      return;
    }

    const inviteId = `inv_${crypto.randomBytes(6).toString('hex')}`;
    const lobbyId = `lob_${crypto.randomBytes(6).toString('hex')}`;
    const roomCode = `PLAY-${Math.floor(1000 + Math.random() * 9000)}`;
    const lobbyAccessToken = crypto.randomBytes(12).toString('hex');
    const now = Date.now();
    const expiresAt = now + 5 * 60 * 1000; // 5-minute invitation expiration

    let emailDeliveryStatus: 'sent' | 'not_configured' = 'not_configured';
    const smtpWebhookUrl = process.env.SMTP_WEBHOOK_URL;
    const resendApiKey = process.env.RESEND_API_KEY;
    if (smtpWebhookUrl && targetUser.email.includes('@')) {
      try {
        const resp = await fetch(smtpWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: targetUser.email,
            subject: `${user.username} invited you to a ${selectedMode} Football Match!`,
            text: `${user.username} says: "${cleanMessage}" — Mode: ${selectedMode} — Room Code: ${roomCode}`,
          }),
        });
        if (resp.ok) emailDeliveryStatus = 'sent';
      } catch {
        emailDeliveryStatus = 'not_configured';
      }
    } else if (resendApiKey && targetUser.email.includes('@')) {
      try {
        const resp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || 'matches@football-elite.app',
            to: [targetUser.email],
            subject: `${user.username} invited you to a ${selectedMode} Football Match!`,
            html: `<p><strong>${user.username}</strong> invited you to play a <strong>${selectedMode}</strong> match!</p><p>Message: "${cleanMessage}"</p><p>Room Code: <strong>${roomCode}</strong></p>`,
          }),
        });
        if (resp.ok) emailDeliveryStatus = 'sent';
      } catch {
        emailDeliveryStatus = 'not_configured';
      }
    }

    const invitation: MatchInvitationRecord = {
      inviteId,
      lobbyId,
      roomCode,
      lobbyAccessToken,
      fromUserId: user.id,
      fromClientId: String(fromClientId || user.id),
      fromName: user.displayName || user.username,
      fromUsername: user.username,
      fromEmail: user.email,
      fromAvatarUrl: user.avatarUrl,
      fromClubId: String(fromClubId || user.favouriteClubId || 'club_real_madrid'),
      fromClubName: String(fromClubName || 'Real Madrid'),
      fromStarPlayer: String(fromStarPlayer || 'Kylian Mbappé'),
      fromSquadIds: Array.isArray(fromSquadIds) ? fromSquadIds.map(String) : undefined,
      fromFormation: fromFormation ? String(fromFormation) : '4-3-3',
      toUserId: targetUser.id,
      toQuery: rawQuery,
      toUsername: targetUser.username,
      toEmail: rawQuery.includes('@') ? rawQuery.toLowerCase() : targetUser.email,
      customMessage: cleanMessage,
      matchFormat: selectedMode,
      stadiumName: String(stadiumName || 'Estadio Santiago Bernabéu'),
      weather: weather === 'Rain' || weather === 'Night' ? weather : 'Clear',
      status: 'pending',
      emailDeliveryStatus,
      createdAt: now,
      expiresAt,
    };

    matchInvitations.push(invitation);

    // Create the waiting private lobby so the host is immediately placed in it or connected on accept
    const newLobby: OnlineMatchLobby = {
      lobbyId,
      roomCode,
      lobbyAccessToken,
      inviteId,
      customMessage: cleanMessage,
      matchFormat: selectedMode,
      stadiumName: invitation.stadiumName,
      weather: invitation.weather,
      host: {
        clientId: invitation.fromClientId,
        userId: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        clubId: invitation.fromClubId,
        clubName: invitation.fromClubName,
        starPlayerName: invitation.fromStarPlayer,
        rating: 95,
        squadIds: invitation.fromSquadIds,
        formation: invitation.fromFormation,
        teamSide: 'home',
        isReady: false,
        connectionStatus: 'connected',
      },
      guest: null,
      status: 'waiting',
      createdAt: now,
    };
    lobbies.set(lobbyId, newLobby);
    savePersistedData();

    // Deliver real-time in-game notification to recipient sockets
    const recipientClients = findOnlineClientsForUser(
      targetUser.id,
      targetUser.username,
      targetUser.email
    );
    const inviteWsPayload = JSON.stringify({
      type: 'invite:received',
      inviteId: invitation.inviteId,
      lobbyId: invitation.lobbyId,
      roomCode: invitation.roomCode,
      fromClientId: invitation.fromClientId,
      fromUserId: invitation.fromUserId,
      fromUsername: invitation.fromUsername,
      fromEmail: invitation.fromEmail,
      fromAvatarUrl: invitation.fromAvatarUrl,
      fromClubId: invitation.fromClubId,
      fromClubName: invitation.fromClubName,
      fromStarPlayer: invitation.fromStarPlayer,
      fromSquadIds: invitation.fromSquadIds,
      fromFormation: invitation.fromFormation,
      customMessage: invitation.customMessage,
      matchFormat: invitation.matchFormat,
      createdAt: invitation.createdAt,
      expiresAt: invitation.expiresAt,
      invitation,
    });
    for (const rc of recipientClients) {
      if (rc.ws.readyState === WebSocket.OPEN) {
        rc.ws.send(inviteWsPayload);
      }
    }

    res.json({
      invitation,
      lobby: newLobby,
      emailDeliveryStatus,
      emailDeliveryMessage:
        emailDeliveryStatus === 'sent'
          ? `Delivered in-game and emailed to ${invitation.toEmail}.`
          : `Delivered via real-time in-game notification to ${targetUser.username}. (External email service is not configured on this server.)`,
    });
  });

  app.post('/api/invitations/respond', (req, res) => {
    expireStaleInvitations();
    const user = resolveCallerUser(req);
    const {
      inviteId,
      lobbyId,
      action,
      guestClientId,
      guestClubId,
      guestClubName,
      guestStarPlayer,
      guestSquadIds,
      guestFormation,
    } = req.body || {};

    const invitation = matchInvitations.find(
      (inv) =>
        (inviteId && inv.inviteId === String(inviteId)) ||
        (lobbyId && inv.lobbyId === String(lobbyId))
    );

    if (!invitation) {
      res.status(404).json({ error: 'Invitation not found.' });
      return;
    }

    if (invitation.status === 'expired' || Date.now() > invitation.expiresAt) {
      invitation.status = 'expired';
      savePersistedData();
      res.status(400).json({ error: 'This match invitation has expired.' });
      return;
    }

    const isSeededTarget = Boolean(invitation.toUserId && invitation.toUserId.startsWith('usr_seed_'));
    const isAuthorizedRecipient =
      invitation.toUserId === user.id ||
      invitation.toUsername.toLowerCase() === user.username.toLowerCase() ||
      (invitation.toEmail && invitation.toEmail.toLowerCase() === user.email.toLowerCase()) ||
      (isSeededTarget && invitation.fromUserId === user.id);

    if (!isAuthorizedRecipient) {
      res.status(403).json({ error: 'You are not authorized to respond to this private match invitation.' });
      return;
    }

    if (action === 'decline') {
      invitation.status = 'declined';
      const lobby = lobbies.get(invitation.lobbyId);
      if (lobby) {
        lobby.status = 'completed';
      }
      savePersistedData();

      const senderClients = findOnlineClientsForUser(
        invitation.fromUserId,
        invitation.fromUsername,
        invitation.fromEmail
      );
      const decMsg = JSON.stringify({
        type: 'invite:declined',
        inviteId: invitation.inviteId,
        lobbyId: invitation.lobbyId,
        byUsername: isSeededTarget ? invitation.toUsername : user.username,
      });
      for (const sc of senderClients) {
        if (sc.ws.readyState === WebSocket.OPEN) {
          sc.ws.send(decMsg);
        }
      }

      res.json({ status: 'declined', invitation });
      return;
    }

    // ACCEPT INVITATION -> Connect both players to the same Private Online Match Lobby
    invitation.status = 'accepted';
    let lobby = lobbies.get(invitation.lobbyId);
    const acceptingUser = isSeededTarget
      ? usersById.get(invitation.toUserId!) || user
      : user;

    if (!lobby) {
      lobby = {
        lobbyId: invitation.lobbyId,
        roomCode: invitation.roomCode,
        lobbyAccessToken: invitation.lobbyAccessToken,
        inviteId: invitation.inviteId,
        customMessage: invitation.customMessage,
        matchFormat: invitation.matchFormat,
        stadiumName: invitation.stadiumName,
        weather: invitation.weather,
        host: {
          clientId: invitation.fromClientId,
          userId: invitation.fromUserId,
          username: invitation.fromUsername,
          email: invitation.fromEmail,
          avatarUrl: invitation.fromAvatarUrl,
          clubId: invitation.fromClubId,
          clubName: invitation.fromClubName,
          starPlayerName: invitation.fromStarPlayer,
          rating: 95,
          squadIds: invitation.fromSquadIds,
          formation: invitation.fromFormation || '4-3-3',
          teamSide: 'home',
          isReady: false,
          connectionStatus: 'connected',
        },
        guest: null,
        status: 'ready_check',
        createdAt: Date.now(),
      };
      lobbies.set(lobby.lobbyId, lobby);
    }

    lobby.guest = {
      clientId: String(guestClientId || acceptingUser.id),
      userId: acceptingUser.id,
      username: acceptingUser.username,
      email: acceptingUser.email,
      avatarUrl: acceptingUser.avatarUrl,
      clubId: String(guestClubId || acceptingUser.favouriteClubId || 'club_barcelona'),
      clubName: String(guestClubName || 'FC Barcelona'),
      starPlayerName: String(guestStarPlayer || 'Lionel Messi'),
      rating: 95,
      squadIds: Array.isArray(guestSquadIds) ? guestSquadIds.map(String) : undefined,
      formation: guestFormation ? String(guestFormation) : '4-3-3',
      teamSide: lobby.host.teamSide === 'away' ? 'home' : 'away',
      isReady: isSeededTarget ? true : false,
      connectionStatus: 'connected',
    };
    lobby.status = 'ready_check';

    // Ensure underlying FriendRoom requires explicit Ready from the Private Lobby before launching
    const code = normalizeRoomCode(lobby.roomCode);
    let room = rooms.get(code);
    if (!room) {
      room = {
        roomCode: code,
        expectedOpponentUsername: lobby.guest.username,
        requireExplicitReady: true,
        members: new Map(),
        matchStarted: false,
        matchFormat: lobby.matchFormat || '11v11',
        requiredPlayers: 2,
        status: 'opponent_connected',
        timers: [],
        createdAt: Date.now(),
      };
      rooms.set(code, room);
    } else {
      room.requireExplicitReady = true;
      room.matchFormat = lobby.matchFormat || '11v11';
    }

    savePersistedData();
    broadcastLobbyUpdate(lobby);

    res.json({
      status: 'accepted',
      invitation,
      lobby,
    });
  });

  app.post('/api/lobbies/:lobbyId/configure', (req, res) => {
    const user = resolveCallerUser(req);
    const lobby = lobbies.get(String(req.params.lobbyId || ''));
    if (!lobby) {
      res.status(404).json({ error: 'Private online lobby not found.' });
      return;
    }

    const isHost =
      lobby.host.userId === user.id ||
      lobby.host.username.toLowerCase() === user.username.toLowerCase();
    const isGuest =
      lobby.guest &&
      (lobby.guest.userId === user.id ||
        lobby.guest.username.toLowerCase() === user.username.toLowerCase());

    if (!isHost && !isGuest) {
      res.status(403).json({ error: 'Unauthorized: You are not a member of this private match lobby.' });
      return;
    }

    const {
      clubId,
      clubName,
      starPlayerName,
      formation,
      teamSide,
      isReady,
      matchFormat,
      stadiumName,
      weather,
    } = req.body || {};

    const mySlot = isHost ? lobby.host : lobby.guest!;
    mySlot.connectionStatus = 'connected';
    if (clubId) mySlot.clubId = String(clubId);
    if (clubName) mySlot.clubName = String(clubName);
    if (starPlayerName) mySlot.starPlayerName = String(starPlayerName);
    if (formation) mySlot.formation = String(formation);
    if (teamSide === 'home' || teamSide === 'away') {
      mySlot.teamSide = teamSide;
      const otherSlot = isHost ? lobby.guest : lobby.host;
      if (otherSlot) {
        otherSlot.teamSide = teamSide === 'home' ? 'away' : 'home';
      }
    }
    if (typeof isReady === 'boolean') {
      mySlot.isReady = isReady;
    }
    if (matchFormat === '1v1' || matchFormat === '11v11') {
      lobby.matchFormat = matchFormat;
    }
    if (stadiumName) lobby.stadiumName = String(stadiumName);
    if (weather === 'Clear' || weather === 'Rain' || weather === 'Night') {
      lobby.weather = weather;
    }

    broadcastLobbyUpdate(lobby);

    if (
      lobby.host.isReady &&
      lobby.guest &&
      lobby.guest.isReady &&
      lobby.host.connectionStatus !== 'disconnected' &&
      lobby.guest.connectionStatus !== 'disconnected' &&
      lobby.status !== 'in_match'
    ) {
      startLobbyMatchForBothPlayers(lobby);
    }

    res.json({ lobby });
  });

  app.post('/api/lobbies/:lobbyId/reconnect', (req, res) => {
    const user = resolveCallerUser(req);
    const lobby = lobbies.get(String(req.params.lobbyId || ''));
    if (!lobby) {
      res.status(404).json({ error: 'Private lobby no longer exists.' });
      return;
    }

    const isHost =
      lobby.host.userId === user.id ||
      lobby.host.username.toLowerCase() === user.username.toLowerCase();
    const isGuest =
      lobby.guest &&
      (lobby.guest.userId === user.id ||
        lobby.guest.username.toLowerCase() === user.username.toLowerCase());

    if (!isHost && !isGuest) {
      res.status(403).json({ error: 'Unauthorized to reconnect to this private lobby.' });
      return;
    }

    const mySlot = isHost ? lobby.host : lobby.guest!;
    mySlot.connectionStatus = 'connected';
    if (req.body?.clientId) {
      mySlot.clientId = String(req.body.clientId);
    }
    if (lobby.status === 'waiting' && lobby.guest) {
      lobby.status = 'ready_check';
    }
    broadcastLobbyUpdate(lobby);
    res.json({ lobby, reconnected: true });
  });

  const server = http.createServer(app);

  // ============================================================================
  // 4. REAL-TIME WEBSOCKET SERVER (USERNAME INVITES, LOBBIES, READY & 1V1 SYNC)
  // ============================================================================
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = request.url || '';
    if (url.startsWith('/ws-room')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws) => {
    let joinedRoomCode: string | null = null;
    let joinedClientId: string | null = null;

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (!msg || typeof msg.type !== 'string') return;

        // A. Online Presence Registration (by Username)
        if (msg.type === 'presence:register') {
          const clientId = String(msg.clientId || crypto.randomBytes(4).toString('hex'));
          joinedClientId = clientId;
          const cleanUser = String(msg.username || 'Player').trim();
          onlineClients.set(clientId, {
            ws,
            clientId,
            userId: String(msg.userId || clientId),
            username: cleanUser,
            email: msg.email ? String(msg.email) : undefined,
            avatarUrl: msg.avatarUrl ? String(msg.avatarUrl) : undefined,
            clubId: String(msg.clubId || 'club_real_madrid'),
            clubName: String(msg.clubName || 'Real Madrid'),
            starPlayerName: String(msg.starPlayerName || 'Kylian Mbappé'),
            rating: Number(msg.rating || 94),
            squadIds: Array.isArray(msg.squadIds) ? msg.squadIds.map(String) : undefined,
            formation: msg.formation ? String(msg.formation) : undefined,
            status: 'online',
          });

          // Automatically restore connection status in any active Private Match Lobby
          for (const lob of lobbies.values()) {
            if (lob.status !== 'completed') {
              const isHost =
                (msg.userId && lob.host.userId === msg.userId) ||
                lob.host.username.toLowerCase() === cleanUser.toLowerCase();
              const isGuest =
                lob.guest &&
                ((msg.userId && lob.guest.userId === msg.userId) ||
                  lob.guest.username.toLowerCase() === cleanUser.toLowerCase());
              if (isHost) {
                lob.host.clientId = clientId;
                lob.host.connectionStatus = 'connected';
                broadcastLobbyUpdate(lob);
              } else if (isGuest && lob.guest) {
                lob.guest.clientId = clientId;
                lob.guest.connectionStatus = 'connected';
                broadcastLobbyUpdate(lob);
              }
            }
          }

          broadcastOnlinePlayers();
          broadcastOpenRooms();
          return;
        }

        // B. Invite Friend by Username
        if (msg.type === 'invite:send') {
          const fromClientId = String(msg.fromClientId || joinedClientId || '');
          const fromUsername = String(msg.fromUsername || 'Player').trim();
          const targetUsername = String(msg.targetUsername || '').trim();
          if (!targetUsername) return;

          const selectedMode: '1v1' | '11v11' = msg.matchFormat === '1v1' ? '1v1' : '11v11';
          const customMessage = String(
            msg.customMessage || `Let's play a ${selectedMode} football match!`
          ).slice(0, 240);

          // Find target client by case-insensitive username or email
          const targetClient = Array.from(onlineClients.values()).find(
            (c) =>
              (c.username.toLowerCase() === targetUsername.toLowerCase() ||
                (c.email && c.email.toLowerCase() === targetUsername.toLowerCase())) &&
              c.clientId !== fromClientId
          );

          const lobbyId = `lob_${crypto.randomBytes(4).toString('hex')}`;
          const roomCode = `PLAY-${Math.floor(1000 + Math.random() * 9000)}`;
          const sender = onlineClients.get(fromClientId);

          const newLobby: OnlineMatchLobby = {
            lobbyId,
            roomCode,
            customMessage,
            matchFormat: selectedMode,
            stadiumName: 'Estadio Santiago Bernabéu',
            weather: 'Clear',
            host: {
              clientId: fromClientId,
              userId: msg.fromUserId || sender?.userId,
              username: fromUsername,
              email: msg.fromEmail || sender?.email,
              avatarUrl: msg.fromAvatarUrl || sender?.avatarUrl,
              clubId: sender?.clubId || String(msg.clubId || 'club_real_madrid'),
              clubName: sender?.clubName || String(msg.clubName || 'Real Madrid'),
              starPlayerName: sender?.starPlayerName || String(msg.starPlayerName || 'Mbappé'),
              rating: sender?.rating || 94,
              squadIds: sender?.squadIds || (Array.isArray(msg.squadIds) ? msg.squadIds.map(String) : undefined),
              formation: sender?.formation || (msg.formation ? String(msg.formation) : undefined),
              teamSide: 'home',
              isReady: false,
              connectionStatus: 'connected',
            },
            guest: null,
            status: 'waiting',
            createdAt: Date.now(),
          };
          lobbies.set(lobbyId, newLobby);

          if (targetClient && targetClient.ws.readyState === WebSocket.OPEN) {
            targetClient.ws.send(
              JSON.stringify({
                type: 'invite:received',
                inviteId: `inv_${crypto.randomBytes(4).toString('hex')}`,
                lobbyId,
                roomCode,
                fromClientId,
                fromUserId: newLobby.host.userId,
                fromUsername,
                fromEmail: newLobby.host.email,
                fromAvatarUrl: newLobby.host.avatarUrl,
                fromClubId: newLobby.host.clubId,
                fromClubName: newLobby.host.clubName,
                fromStarPlayer: newLobby.host.starPlayerName,
                fromSquadIds: newLobby.host.squadIds,
                fromFormation: newLobby.host.formation,
                customMessage,
                matchFormat: selectedMode,
                createdAt: Date.now(),
                expiresAt: Date.now() + 5 * 60 * 1000,
              })
            );
            ws.send(
              JSON.stringify({
                type: 'invite:sent_status',
                status: 'delivered',
                targetUsername: targetClient.username,
                lobby: newLobby,
              })
            );
          } else {
            ws.send(
              JSON.stringify({
                type: 'invite:sent_status',
                status: 'delivered',
                targetUsername,
                lobby: newLobby,
              })
            );
          }
          return;
        }

        // C. Friend Accepts or Declines Username Invitation
        if (msg.type === 'invite:respond') {
          const {
            inviteId,
            lobbyId,
            accept,
            guestClientId,
            guestUserId,
            guestUsername,
            guestEmail,
            guestAvatarUrl,
            guestClubId,
            guestClubName,
            guestStarPlayer,
            guestSquadIds,
            guestFormation,
          } = msg;
          const lobby = lobbies.get(String(lobbyId || ''));
          if (inviteId) {
            const foundInv = matchInvitations.find((i) => i.inviteId === String(inviteId));
            if (foundInv) {
              foundInv.status = accept ? 'accepted' : 'declined';
              savePersistedData();
            }
          }
          if (!lobby) return;

          if (!accept) {
            lobby.status = 'completed';
            const hostClients = findOnlineClientsForUser(
              lobby.host.userId,
              lobby.host.username,
              lobby.host.email
            );
            for (const hc of hostClients) {
              if (hc.ws.readyState === WebSocket.OPEN) {
                hc.ws.send(
                  JSON.stringify({
                    type: 'invite:declined',
                    lobbyId: lobby.lobbyId,
                    byUsername: guestUsername,
                  })
                );
              }
            }
            return;
          }

          lobby.guest = {
            clientId: String(guestClientId || joinedClientId || ''),
            userId: guestUserId ? String(guestUserId) : undefined,
            username: String(guestUsername || 'Friend'),
            email: guestEmail ? String(guestEmail) : undefined,
            avatarUrl: guestAvatarUrl ? String(guestAvatarUrl) : undefined,
            clubId: String(guestClubId || 'club_barcelona'),
            clubName: String(guestClubName || 'FC Barcelona'),
            starPlayerName: String(guestStarPlayer || 'Lionel Messi'),
            rating: 94,
            squadIds: Array.isArray(guestSquadIds) ? guestSquadIds.map(String) : undefined,
            formation: guestFormation ? String(guestFormation) : '4-3-3',
            teamSide: lobby.host.teamSide === 'away' ? 'home' : 'away',
            isReady: false,
            connectionStatus: 'connected',
          };
          lobby.status = 'ready_check';

          const code = normalizeRoomCode(lobby.roomCode);
          let room = rooms.get(code);
          if (room) {
            room.requireExplicitReady = true;
            room.matchFormat = lobby.matchFormat || '11v11';
          }
          broadcastLobbyUpdate(lobby);
          return;
        }

        // C2. Configure Team / Mode / Settings in Private Online Match Lobby
        if (msg.type === 'lobby:configure') {
          const lobby = lobbies.get(String(msg.lobbyId || ''));
          if (!lobby) return;
          const isHost =
            lobby.host.clientId === msg.clientId ||
            (msg.userId && lobby.host.userId === msg.userId) ||
            (msg.username && lobby.host.username.toLowerCase() === String(msg.username).toLowerCase());
          const targetPlayer = isHost ? lobby.host : lobby.guest;
          if (targetPlayer) {
            targetPlayer.connectionStatus = 'connected';
            if (msg.clubId) targetPlayer.clubId = String(msg.clubId);
            if (msg.clubName) targetPlayer.clubName = String(msg.clubName);
            if (msg.starPlayerName) targetPlayer.starPlayerName = String(msg.starPlayerName);
            if (msg.formation) targetPlayer.formation = String(msg.formation);
            if (msg.teamSide === 'home' || msg.teamSide === 'away') {
              targetPlayer.teamSide = msg.teamSide;
              const other = isHost ? lobby.guest : lobby.host;
              if (other) other.teamSide = msg.teamSide === 'home' ? 'away' : 'home';
            }
          }
          if (msg.matchFormat === '1v1' || msg.matchFormat === '11v11') {
            lobby.matchFormat = msg.matchFormat;
          }
          if (msg.settings) {
            if (msg.settings.stadiumName) lobby.stadiumName = String(msg.settings.stadiumName);
            if (msg.settings.weather) lobby.weather = msg.settings.weather;
          }
          broadcastLobbyUpdate(lobby);
          return;
        }

        // C3. Reconnect to Private Online Match Lobby
        if (msg.type === 'lobby:reconnect') {
          const lobby = lobbies.get(String(msg.lobbyId || ''));
          if (!lobby) return;
          const isHost =
            lobby.host.clientId === msg.clientId ||
            (msg.userId && lobby.host.userId === msg.userId) ||
            (msg.username && lobby.host.username.toLowerCase() === String(msg.username).toLowerCase());
          if (isHost) {
            lobby.host.clientId = String(msg.clientId || joinedClientId || lobby.host.clientId);
            lobby.host.connectionStatus = 'connected';
          } else if (lobby.guest) {
            lobby.guest.clientId = String(msg.clientId || joinedClientId || lobby.guest.clientId);
            lobby.guest.connectionStatus = 'connected';
          }
          broadcastLobbyUpdate(lobby);
          return;
        }

        // D. Toggle READY Button in Online Match Lobby — Auto-Starts when both players are Ready!
        if (msg.type === 'lobby:ready') {
          const { lobbyId, clientId, userId, username, isReady } = msg;
          const lobby = lobbies.get(String(lobbyId || ''));
          if (!lobby) return;

          const isHost =
            lobby.host.clientId === clientId ||
            (userId && lobby.host.userId === userId) ||
            (username && lobby.host.username.toLowerCase() === String(username).toLowerCase());

          if (isHost) {
            lobby.host.isReady = Boolean(isReady);
            lobby.host.connectionStatus = 'connected';
          } else if (lobby.guest) {
            lobby.guest.isReady = Boolean(isReady);
            lobby.guest.connectionStatus = 'connected';
          }
          broadcastLobbyUpdate(lobby);

          // Automatically start the match when all required players are ready!
          if (
            lobby.host.isReady &&
            lobby.guest &&
            lobby.guest.isReady &&
            lobby.host.connectionStatus !== 'disconnected' &&
            lobby.guest.connectionStatus !== 'disconnected' &&
            lobby.status !== 'in_match'
          ) {
            setTimeout(() => {
              const currentLob = lobbies.get(lobby.lobbyId);
              if (
                currentLob &&
                currentLob.host.isReady &&
                currentLob.guest?.isReady &&
                currentLob.status !== 'in_match'
              ) {
                startLobbyMatchForBothPlayers(currentLob);
              }
            }, 350);
          }
          return;
        }

        // E. Start Online Match from Lobby
        if (msg.type === 'lobby:start') {
          const { lobbyId } = msg;
          const lobby = lobbies.get(String(lobbyId || ''));
          if (!lobby) return;
          startLobbyMatchForBothPlayers(lobby);
          return;
        }

        // F. Room-Code Create/Join, Multi-Player 11v11 & 1v1 Ready Check & Auto-Match Start
        if (msg.type === 'room:join') {
          const code = normalizeRoomCode(msg.roomCode || '');
          const clientId = String(msg.clientId || Math.random().toString(36).slice(2, 9));
          if (!code) return;

          // If switching rooms, clean up previous room
          if (joinedRoomCode && joinedRoomCode !== code && joinedClientId) {
            const prevRoom = rooms.get(joinedRoomCode);
            if (prevRoom) {
              prevRoom.members.delete(joinedClientId);
              if (prevRoom.members.size === 0) {
                clearRoomTimers(prevRoom);
                rooms.delete(joinedRoomCode);
              } else {
                prevRoom.status = prevRoom.members.size >= 2 ? 'opponent_connected' : 'waiting_for_opponent';
                broadcastRoomState(prevRoom);
              }
            }
          }

          joinedRoomCode = code;
          joinedClientId = clientId;

          let room = rooms.get(code);
          if (!room) {
            const initFormat: '11v11' | '1v1' = msg.matchFormat === '1v1' ? '1v1' : '11v11';
            room = {
              roomCode: code,
              members: new Map(),
              matchStarted: false,
              matchFormat: initFormat,
              requiredPlayers:
                initFormat === '1v1'
                  ? 2
                  : Math.max(2, Math.min(22, Number(msg.requiredPlayers) || 2)),
              status: 'waiting_for_opponent',
              timers: [],
              createdAt: Date.now(),
            };
            rooms.set(code, room);
          }

          // Clean up any stale disconnected sockets first
          for (const [mId, member] of room.members.entries()) {
            if (mId !== clientId && member.ws.readyState !== WebSocket.OPEN) {
              room.members.delete(mId);
            }
          }

          const existing = room.members.get(clientId);
          const currentHost = Array.from(room.members.values()).find(
            (m) => m.clientId !== clientId && m.role === 'host'
          );
          const hasHost = Boolean(currentHost);
          const role: 'host' | 'guest' = existing?.role || (!hasHost ? 'host' : 'guest');

          const rawExpectedOpp = String(msg.expectedOpponentUsername || '').trim();
          const rawEnteredOpp = String(msg.enteredOpponentUsername || '').trim();
          if (rawExpectedOpp) {
            room.expectedOpponentUsername = rawExpectedOpp;
          } else if (role === 'host' && rawEnteredOpp && !room.expectedOpponentUsername) {
            room.expectedOpponentUsername = rawEnteredOpp;
          }

          if (role === 'host' && (msg.matchFormat === '11v11' || msg.matchFormat === '1v1')) {
            room.matchFormat = msg.matchFormat;
            if (room.matchFormat === '1v1') {
              room.requiredPlayers = 2;
            } else if (typeof msg.requiredPlayers === 'number' && msg.requiredPlayers >= 2) {
              room.requiredPlayers = Math.min(22, msg.requiredPlayers);
            }
          }

          // Determine teamSide and assignedSlotIdx for this player
          let teamSide: 'home' | 'away' = existing?.teamSide || (role === 'host' ? 'home' : 'away');
          if (!existing && role === 'guest' && room.matchFormat === '11v11') {
            if (msg.teamSide === 'home' || msg.teamSide === 'away') {
              teamSide = msg.teamSide;
            } else {
              // Balance Home vs Away count so multiple friends can play 11v11 together
              const homeCount = Array.from(room.members.values()).filter((m) => m.teamSide === 'home').length;
              const awayCount = Array.from(room.members.values()).filter((m) => m.teamSide === 'away').length;
              teamSide = homeCount <= awayCount ? 'home' : 'away';
              // Ensure at least 1 opponent on away if there are 2 players unless overridden
              if (room.members.size === 1 && homeCount === 1) {
                teamSide = 'away';
              }
            }
          }

          const assignedSlotIdx =
            typeof msg.assignedSlotIdx === 'number'
              ? Math.max(0, Math.min(10, msg.assignedSlotIdx))
              : existing?.assignedSlotIdx ?? pickAvailableSlotForTeam(room, teamSide, clientId);

          const isReady =
            typeof msg.isReady === 'boolean' ? msg.isReady : existing?.isReady ?? true;

          // Resolve effective username when joining with Room Code + Opponent Username:
          // - If the guest entered the same Opponent Username that the host specified, use it!
          // - If the guest entered the host's username in the Opponent Username field, keep the guest's own username (or expectedOpponentUsername if generic).
          let resolvedMemberUsername = String(msg.username || 'Player').trim();
          if (role === 'guest') {
            if (rawEnteredOpp) {
              const matchesHostName =
                currentHost &&
                rawEnteredOpp.toLowerCase() === currentHost.username.toLowerCase();
              if (!matchesHostName) {
                resolvedMemberUsername = rawEnteredOpp;
              } else if (
                room.expectedOpponentUsername &&
                (resolvedMemberUsername === 'ChampionElite_10' ||
                  resolvedMemberUsername.startsWith('Player'))
              ) {
                resolvedMemberUsername = room.expectedOpponentUsername;
              }
            } else if (
              room.expectedOpponentUsername &&
              (resolvedMemberUsername === 'ChampionElite_10' ||
                resolvedMemberUsername.startsWith('Player'))
            ) {
              resolvedMemberUsername = room.expectedOpponentUsername;
            }
          }

          room.members.set(clientId, {
            ws,
            clientId,
            username: resolvedMemberUsername,
            clubId: String(msg.clubId || 'club_real_madrid'),
            clubName: String(msg.clubName || 'Real Madrid'),
            starPlayerId: msg.starPlayerId ? String(msg.starPlayerId) : undefined,
            starPlayerName: String(msg.starPlayerName || 'Mbappé'),
            squadIds: Array.isArray(msg.squadIds) ? msg.squadIds.map(String) : undefined,
            formation: msg.formation ? String(msg.formation) : undefined,
            matchFormat: room.matchFormat,
            role,
            teamSide,
            assignedSlotIdx,
            isReady,
          });

          if (room.members.size === 1) {
            room.status = 'waiting_for_opponent';
            room.matchStarted = false;
            clearRoomTimers(room);
            broadcastRoomState(room);
            broadcastOpenRooms();
          } else if (room.members.size >= 2) {
            if (room.matchStarted && room.status === 'opponent_disconnected') {
              // Player reconnected to ongoing match!
              room.status = 'in_match';
              broadcastRoomState(room);
              const reconPayload = JSON.stringify({
                type: 'room:opponent_reconnected',
                roomCode: room.roomCode,
                reconnectedUsername: String(msg.username || 'Player'),
              });
              room.members.forEach((m) => {
                if (m.ws.readyState === WebSocket.OPEN) {
                  m.ws.send(reconPayload);
                }
              });
            } else if (!room.matchStarted) {
              checkAndAutoStartRoomIfReady(room);
            } else {
              broadcastRoomState(room);
            }
          }
          return;
        }

        // F2. Toggle Ready Status in Room — Auto-Starts Match When All Required Players Are Ready!
        if (msg.type === 'room:ready') {
          const code = normalizeRoomCode(msg.roomCode || joinedRoomCode || '');
          const room = rooms.get(code);
          if (!room) return;
          if (room.matchStarted) {
            room.matchStarted = false;
          }
          const targetId = String(msg.clientId || joinedClientId || '');
          const member = room.members.get(targetId);
          if (member) {
            member.isReady = Boolean(msg.isReady);
            checkAndAutoStartRoomIfReady(room);
          }
          return;
        }

        // F3. Select Team Side & Controlled Footballer Slot in 11v11 Mode
        if (msg.type === 'room:select_slot') {
          const code = normalizeRoomCode(msg.roomCode || joinedRoomCode || '');
          const room = rooms.get(code);
          if (!room) return;
          const targetId = String(msg.clientId || joinedClientId || '');
          const member = room.members.get(targetId);
          if (member) {
            if (msg.teamSide === 'home' || msg.teamSide === 'away') {
              member.teamSide = msg.teamSide;
            }
            if (typeof msg.assignedSlotIdx === 'number') {
              member.assignedSlotIdx = Math.max(0, Math.min(10, msg.assignedSlotIdx));
            }
            if (msg.starPlayerId) member.starPlayerId = String(msg.starPlayerId);
            if (msg.starPlayerName) member.starPlayerName = String(msg.starPlayerName);
            broadcastRoomState(room);
          }
          return;
        }

        // F4. Configure Room Format (1v1 / 11v11) & Required Players Count
        if (msg.type === 'room:configure') {
          const code = normalizeRoomCode(msg.roomCode || joinedRoomCode || '');
          const room = rooms.get(code);
          if (!room) return;
          if (msg.matchFormat === '1v1' || msg.matchFormat === '11v11') {
            room.matchFormat = msg.matchFormat;
          }
          if (room.matchFormat === '1v1') {
            room.requiredPlayers = 2;
          } else if (typeof msg.requiredPlayers === 'number' && msg.requiredPlayers >= 2) {
            room.requiredPlayers = Math.min(22, Math.max(2, msg.requiredPlayers));
          }
          room.members.forEach((m) => {
            m.matchFormat = room.matchFormat;
          });
          checkAndAutoStartRoomIfReady(room);
          return;
        }

        // G. Matchmaking Queue: Pair with any open room waiting for opponent or create one
        if (msg.type === 'matchmaking:find') {
          const clientId = String(msg.clientId || joinedClientId || Math.random().toString(36).slice(2, 9));
          joinedClientId = clientId;
          const desiredFormat: '11v11' | '1v1' = msg.matchFormat === '1v1' ? '1v1' : '11v11';

          const availableRoom = Array.from(rooms.values()).find(
            (r) =>
              !r.matchStarted &&
              r.matchFormat === desiredFormat &&
              r.members.size >= 1 &&
              r.members.size < (r.matchFormat === '11v11' ? r.requiredPlayers : 2) &&
              !r.members.has(clientId)
          );

          const targetCode = availableRoom
            ? availableRoom.roomCode
            : `PLAY-${Math.floor(1000 + Math.random() * 9000)}`;

          joinedRoomCode = targetCode;
          let room = rooms.get(targetCode);
          if (!room) {
            room = {
              roomCode: targetCode,
              members: new Map(),
              matchStarted: false,
              matchFormat: desiredFormat,
              requiredPlayers: 2,
              status: 'waiting_for_opponent',
              timers: [],
              createdAt: Date.now(),
            };
            rooms.set(targetCode, room);
          }

          const hasHost = Array.from(room.members.values()).some(
            (m) => m.clientId !== clientId && m.role === 'host'
          );
          const role: 'host' | 'guest' = !hasHost ? 'host' : 'guest';
          const teamSide: 'home' | 'away' = role === 'host' ? 'home' : 'away';
          const assignedSlotIdx = pickAvailableSlotForTeam(room, teamSide, clientId);

          room.members.set(clientId, {
            ws,
            clientId,
            username: String(msg.username || 'Player'),
            clubId: String(msg.clubId || 'club_real_madrid'),
            clubName: String(msg.clubName || 'Real Madrid'),
            starPlayerId: msg.starPlayerId ? String(msg.starPlayerId) : undefined,
            starPlayerName: String(msg.starPlayerName || 'Mbappé'),
            squadIds: Array.isArray(msg.squadIds) ? msg.squadIds.map(String) : undefined,
            formation: msg.formation ? String(msg.formation) : undefined,
            matchFormat: room.matchFormat,
            role,
            teamSide,
            assignedSlotIdx,
            isReady: true,
          });

          // Mark all matchmaking members ready and check auto-start
          if (room.members.size >= room.requiredPlayers) {
            room.members.forEach((m) => {
              m.isReady = true;
            });
            scheduleAutoStartForRoom(room);
          } else {
            room.status = 'waiting_for_opponent';
            broadcastRoomState(room);
            broadcastOpenRooms();
          }
          return;
        }

        if (msg.type === 'room:start_match') {
          const code = normalizeRoomCode(msg.roomCode || joinedRoomCode || '');
          const room = rooms.get(code);
          if (!room) return;
          clearRoomTimers(room);
          room.matchStarted = true;
          room.status = 'in_match';
          const membersList = Array.from(room.members.values()).map((m) => ({
            clientId: m.clientId,
            username: m.username,
            clubId: m.clubId,
            clubName: m.clubName,
            starPlayerId: m.starPlayerId,
            starPlayerName: m.starPlayerName,
            squadIds: m.squadIds,
            formation: m.formation,
            matchFormat: m.matchFormat || room.matchFormat,
            role: m.role,
            teamSide: m.teamSide,
            assignedSlotIdx: m.assignedSlotIdx,
            isReady: m.isReady,
          }));
          const hostMember = membersList.find((m) => m.role === 'host') || membersList[0];
          const guestMember =
            membersList.find((m) => m.teamSide === 'away') ||
            membersList.find((m) => m.role === 'guest') ||
            membersList[1];
          const payload = JSON.stringify({
            type: 'room:match_started',
            roomCode: code,
            matchFormat: room.matchFormat,
            requiredPlayers: room.requiredPlayers,
            members: membersList,
            host: hostMember,
            guest: guestMember,
            status: 'in_match',
            statusLabel: 'Live Match In Progress',
          });
          room.members.forEach((m) => {
            if (m.ws.readyState === WebSocket.OPEN) {
              m.ws.send(payload);
            }
          });
          broadcastOpenRooms();
        } else if (
          msg.type === 'match:state_sync' ||
          msg.type === 'match:guest_input' ||
          msg.type === 'match:event' ||
          msg.type === 'match:sync'
        ) {
          const code = normalizeRoomCode(msg.roomCode || joinedRoomCode || '');
          const room = rooms.get(code);
          if (!room) return;
          const out = JSON.stringify(msg);
          room.members.forEach((m) => {
            if (m.clientId !== joinedClientId && m.ws.readyState === WebSocket.OPEN) {
              m.ws.send(out);
            }
          });
        } else if (msg.type === 'room:ping') {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'room:pong', t: msg.t }));
          }
        } else if (msg.type === 'room:leave') {
          const code = normalizeRoomCode(msg.roomCode || joinedRoomCode || '');
          const room = rooms.get(code);
          if (room && joinedClientId) {
            const leavingMember = room.members.get(joinedClientId);
            room.members.delete(joinedClientId);
            clearRoomTimers(room);
            if (room.members.size === 0) {
              rooms.delete(code);
            } else {
              room.status = 'opponent_disconnected';
              const discMsg = JSON.stringify({
                type: 'room:opponent_disconnected',
                roomCode: code,
                disconnectedUsername: leavingMember?.username || 'Opponent',
              });
              room.members.forEach((m) => {
                if (m.ws.readyState === WebSocket.OPEN) {
                  m.ws.send(discMsg);
                }
              });
              broadcastRoomState(room);
            }
            broadcastOpenRooms();
          }
        }
      } catch {
        // Ignore malformed packets
      }
    });

    ws.on('close', () => {
      const closingClient = joinedClientId ? onlineClients.get(joinedClientId) : undefined;
      if (joinedClientId && onlineClients.has(joinedClientId)) {
        onlineClients.delete(joinedClientId);
        broadcastOnlinePlayers();
      }
      // Preserve any active Private Online Match Lobby if a player disconnects so they can reconnect
      if (closingClient) {
        for (const lob of lobbies.values()) {
          if (lob.status !== 'completed') {
            const isHost =
              lob.host.clientId === joinedClientId ||
              lob.host.username.toLowerCase() === closingClient.username.toLowerCase();
            const isGuest =
              lob.guest &&
              (lob.guest.clientId === joinedClientId ||
                lob.guest.username.toLowerCase() === closingClient.username.toLowerCase());
            if (isHost) {
              const remainingSockets = findOnlineClientsForUser(
                lob.host.userId,
                lob.host.username,
                lob.host.email
              );
              if (remainingSockets.length === 0) {
                lob.host.connectionStatus = 'disconnected';
                lob.host.isReady = false;
                broadcastLobbyUpdate(lob);
              }
            } else if (isGuest && lob.guest) {
              const remainingSockets = findOnlineClientsForUser(
                lob.guest.userId,
                lob.guest.username,
                lob.guest.email
              );
              if (remainingSockets.length === 0) {
                lob.guest.connectionStatus = 'disconnected';
                lob.guest.isReady = false;
                broadcastLobbyUpdate(lob);
              }
            }
          }
        }
      }
      if (joinedRoomCode && joinedClientId) {
        const room = rooms.get(joinedRoomCode);
        if (room) {
          const leavingMember = room.members.get(joinedClientId);
          const hadTwoOrStarted = room.members.size >= 2 || room.matchStarted;
          room.members.delete(joinedClientId);
          clearRoomTimers(room);
          if (room.members.size === 0) {
            rooms.delete(joinedRoomCode);
          } else {
            const remaining = Array.from(room.members.values());
            if (!remaining.some((m) => m.role === 'host') && remaining[0]) {
              remaining[0].role = 'host';
            }
            if (hadTwoOrStarted) {
              room.status = 'opponent_disconnected';
              const discPayload = JSON.stringify({
                type: 'room:opponent_disconnected',
                roomCode: room.roomCode,
                disconnectedUsername: leavingMember?.username || 'Opponent',
              });
              remaining.forEach((m) => {
                if (m.ws.readyState === WebSocket.OPEN) {
                  m.ws.send(discPayload);
                }
              });
            } else {
              room.status = 'waiting_for_opponent';
            }
            broadcastRoomState(room);
          }
          broadcastOpenRooms();
        }
      }
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Football Elite server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
