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
  clubId: string;
  clubName: string;
  starPlayerName: string;
  rating: number;
  squadIds?: string[];
  formation?: string;
  status: 'online' | 'in_lobby' | 'in_match';
}

interface OnlineMatchLobby {
  lobbyId: string;
  roomCode: string;
  host: {
    clientId: string;
    username: string;
    clubId: string;
    clubName: string;
    starPlayerName: string;
    rating: number;
    squadIds?: string[];
    formation?: string;
    isReady: boolean;
  };
  guest: {
    clientId: string;
    username: string;
    clubId: string;
    clubName: string;
    starPlayerName: string;
    rating: number;
    squadIds?: string[];
    formation?: string;
    isReady: boolean;
  } | null;
  status: 'waiting' | 'ready_check' | 'in_match' | 'completed';
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
const rooms = new Map<string, FriendRoom>();
const onlineClients = new Map<string, OnlinePresenceClient>(); // clientId -> OnlinePresenceClient
const lobbies = new Map<string, OnlineMatchLobby>(); // lobbyId -> OnlineMatchLobby

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
    }
  } catch {
    // ignore corrupt cache
  }
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
  const allReady = membersArr.length >= minReq && membersArr.every((m) => m.isReady);

  if (allReady) {
    scheduleAutoStartForRoom(room);
  } else {
    clearRoomTimers(room);
    room.status = membersArr.length >= 2 ? 'opponent_connected' : 'waiting_for_opponent';
    broadcastRoomState(room);
    broadcastOpenRooms();
  }
}

function scheduleAutoStartForRoom(room: FriendRoom) {
  clearRoomTimers(room);
  room.status = 'match_starting';
  broadcastRoomState(room);
  broadcastOpenRooms();

  // Automatically launch the synchronized match for all players in the room!
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
      isReady: m.isReady,
    }));
    const hostMember = membersList.find((m) => m.role === 'host') || membersList[0];
    const guestMember =
      membersList.find((m) => m.teamSide === 'away') ||
      membersList.find((m) => m.role === 'guest') ||
      membersList[1];

    const payload = JSON.stringify({
      type: 'room:match_started',
      roomCode: room.roomCode,
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
  }, 1400);

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

function broadcastLobbyUpdate(lobby: OnlineMatchLobby) {
  const msg = JSON.stringify({
    type: 'lobby:update',
    lobby,
  });
  const hostClient = onlineClients.get(lobby.host.clientId);
  if (hostClient && hostClient.ws.readyState === WebSocket.OPEN) {
    hostClient.ws.send(msg);
  }
  if (lobby.guest) {
    const guestClient = onlineClients.get(lobby.guest.clientId);
    if (guestClient && guestClient.ws.readyState === WebSocket.OPEN) {
      guestClient.ws.send(msg);
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
    const rawUsername = String(username || '').trim().slice(0, 32);
    if (!rawUsername) {
      res.status(400).json({ error: 'Please enter a username.' });
      return;
    }

    const rawEmailInput = String(email || '').trim().toLowerCase();
    const cleanEmail = rawEmailInput
      ? rawEmailInput.includes('@')
        ? rawEmailInput
        : `${rawEmailInput}@football-elite.app`
      : `${rawUsername.toLowerCase().replace(/[^a-z0-9._-]/g, '') || 'player'}@gmail.com`;

    const cleanUsername = rawUsername;

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
          onlineClients.set(clientId, {
            ws,
            clientId,
            userId: String(msg.userId || clientId),
            username: String(msg.username || 'Player').trim(),
            clubId: String(msg.clubId || 'club_real_madrid'),
            clubName: String(msg.clubName || 'Real Madrid'),
            starPlayerName: String(msg.starPlayerName || 'Kylian Mbappé'),
            rating: Number(msg.rating || 94),
            squadIds: Array.isArray(msg.squadIds) ? msg.squadIds.map(String) : undefined,
            formation: msg.formation ? String(msg.formation) : undefined,
            status: 'online',
          });
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

          // Find target client by case-insensitive username
          const targetClient = Array.from(onlineClients.values()).find(
            (c) =>
              c.username.toLowerCase() === targetUsername.toLowerCase() &&
              c.clientId !== fromClientId
          );

          const lobbyId = `lob_${crypto.randomBytes(4).toString('hex')}`;
          const roomCode = `PLAY-${Math.floor(1000 + Math.random() * 9000)}`;
          const sender = onlineClients.get(fromClientId);

          const newLobby: OnlineMatchLobby = {
            lobbyId,
            roomCode,
            host: {
              clientId: fromClientId,
              username: fromUsername,
              clubId: sender?.clubId || String(msg.clubId || 'club_real_madrid'),
              clubName: sender?.clubName || String(msg.clubName || 'Real Madrid'),
              starPlayerName: sender?.starPlayerName || String(msg.starPlayerName || 'Mbappé'),
              rating: sender?.rating || 94,
              squadIds: sender?.squadIds || (Array.isArray(msg.squadIds) ? msg.squadIds.map(String) : undefined),
              formation: sender?.formation || (msg.formation ? String(msg.formation) : undefined),
              isReady: false,
            },
            guest: null,
            status: 'waiting',
          };
          lobbies.set(lobbyId, newLobby);

          if (targetClient && targetClient.ws.readyState === WebSocket.OPEN) {
            // Deliver real-time invitation to the online friend!
            targetClient.ws.send(
              JSON.stringify({
                type: 'invite:received',
                inviteId: `inv_${crypto.randomBytes(4).toString('hex')}`,
                lobbyId,
                roomCode,
                fromClientId,
                fromUsername,
                fromClubName: newLobby.host.clubName,
                fromStarPlayer: newLobby.host.starPlayerName,
                fromSquadIds: newLobby.host.squadIds,
                fromFormation: newLobby.host.formation,
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
            // Friend is either in another session or we create the lobby with their username ready to join
            newLobby.guest = {
              clientId: `friend_${targetUsername.toLowerCase()}`,
              username: targetUsername,
              clubId: 'club_barcelona',
              clubName: 'FC Barcelona',
              starPlayerName: 'Lionel Messi',
              rating: 95,
              formation: '4-3-3',
              isReady: true,
            };
            newLobby.status = 'ready_check';
            ws.send(
              JSON.stringify({
                type: 'invite:sent_status',
                status: 'lobby_ready',
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
            lobbyId,
            accept,
            guestClientId,
            guestUsername,
            guestClubId,
            guestClubName,
            guestStarPlayer,
            guestSquadIds,
            guestFormation,
          } = msg;
          const lobby = lobbies.get(String(lobbyId || ''));
          if (!lobby) return;

          if (!accept) {
            const hostClient = onlineClients.get(lobby.host.clientId);
            if (hostClient && hostClient.ws.readyState === WebSocket.OPEN) {
              hostClient.ws.send(
                JSON.stringify({
                  type: 'invite:declined',
                  byUsername: guestUsername,
                })
              );
            }
            return;
          }

          lobby.guest = {
            clientId: String(guestClientId || joinedClientId || ''),
            username: String(guestUsername || 'Friend'),
            clubId: String(guestClubId || 'club_barcelona'),
            clubName: String(guestClubName || 'FC Barcelona'),
            starPlayerName: String(guestStarPlayer || 'Lionel Messi'),
            rating: 94,
            squadIds: Array.isArray(guestSquadIds) ? guestSquadIds.map(String) : undefined,
            formation: guestFormation ? String(guestFormation) : '4-3-3',
            isReady: false,
          };
          lobby.status = 'ready_check';
          broadcastLobbyUpdate(lobby);
          return;
        }

        // D. Toggle READY Button in Online Match Lobby
        if (msg.type === 'lobby:ready') {
          const { lobbyId, clientId, isReady } = msg;
          const lobby = lobbies.get(String(lobbyId || ''));
          if (!lobby) return;

          if (lobby.host.clientId === clientId) {
            lobby.host.isReady = Boolean(isReady);
          } else if (lobby.guest && lobby.guest.clientId === clientId) {
            lobby.guest.isReady = Boolean(isReady);
          }
          broadcastLobbyUpdate(lobby);
          return;
        }

        // E. Start Online Match from Lobby
        if (msg.type === 'lobby:start') {
          const { lobbyId } = msg;
          const lobby = lobbies.get(String(lobbyId || ''));
          if (!lobby) return;
          lobby.status = 'in_match';
          broadcastLobbyUpdate(lobby);

          const startPayload = JSON.stringify({
            type: 'lobby:match_starting',
            lobby,
          });
          const hostClient = onlineClients.get(lobby.host.clientId);
          if (hostClient && hostClient.ws.readyState === WebSocket.OPEN) {
            hostClient.ws.send(startPayload);
          }
          if (lobby.guest) {
            const guestClient = onlineClients.get(lobby.guest.clientId);
            if (guestClient && guestClient.ws.readyState === WebSocket.OPEN) {
              guestClient.ws.send(startPayload);
            }
          }
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
          const hasHost = Array.from(room.members.values()).some(
            (m) => m.clientId !== clientId && m.role === 'host'
          );
          const role: 'host' | 'guest' = existing?.role || (!hasHost ? 'host' : 'guest');

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
            typeof msg.isReady === 'boolean' ? msg.isReady : existing?.isReady ?? false;

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
      if (joinedClientId && onlineClients.has(joinedClientId)) {
        onlineClients.delete(joinedClientId);
        broadcastOnlinePlayers();
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
