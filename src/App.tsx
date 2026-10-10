/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  Award,
  Check,
  ChevronRight,
  CloudRain,
  Coins,
  Copy,
  Eye,
  Globe,
  KeyRound,
  Moon,
  Play,
  Settings as SettingsIcon,
  Shield,
  Sliders,
  Sun,
  Trophy,
  User,
  Users,
  Zap,
} from 'lucide-react';
import {
  CelebrationType,
  FootballPlayer,
  FormationName,
  MATCH_MODES,
  MatchModeId,
  PackDefinition,
  PLAYERS_DB,
  STADIUMS,
  StadiumInfo,
  TeamData,
  TEAMS_DB,
  WeatherType,
} from './data/gameDatabase';
import {
  AutoSwitchMode,
  CameraMode,
  ControlScheme,
  DEFAULT_KEY_BINDINGS,
  DifficultyLevel,
  KeyBindings,
  MatchHUDState,
} from './engine/FootballEngine3D';
import { SoundEngine } from './engine/SoundEngine';
import { PlayerPhotoAvatar } from './components/PlayerPhotoAvatar';
import {
  FriendRoomService,
  FriendRoomState,
  IncomingMatchInvite,
  OnlineMatchLobbyState,
  OnlinePlayerPresence,
} from './engine/FriendRoomService';
import { MatchViewport3D } from './components/MatchViewport3D';
import { OpponentSquadInfo, OpponentSquadPopup } from './components/OpponentSquadPopup';
import { WorldCupAndTournaments } from './components/WorldCupAndTournaments';
import { MyTeamAndMarket } from './components/MyTeamAndMarket';
import {
  ProfileLeaderboardSettings,
  UserProfileStats,
} from './components/ProfileLeaderboardSettings';
import { WelcomeOnboardingScreen } from './components/WelcomeOnboardingScreen';
import {
  AuthenticatedAccount,
  GoogleAuthModal,
  IncomingInviteModal,
  OnlineMatchCenter,
  PaymentCheckoutItem,
  PaymentCheckoutModal,
} from './components/OnlineMatchAndAuthModal';
import { useAppIcon } from './data/appIconStore';
import heroStadiumImg from './assets/images/hero_stadium_backdrop_1791305638088.jpg';

type ActiveScreen =
  | 'welcome'
  | 'home'
  | 'online_match'
  | 'play_setup'
  | 'in_match'
  | 'world_cup'
  | 'tournaments'
  | 'my_team'
  | 'transfer_market'
  | 'packs'
  | 'spin_roulette'
  | 'profile'
  | 'leaderboard'
  | 'settings';

export default function App() {
  const { iconUrl } = useAppIcon();
  const [screen, setScreen] = useState<ActiveScreen>(() => {
    const hasSession =
      Boolean(localStorage.getItem('fe_auth_token')) ||
      Boolean(localStorage.getItem('fe_user_email')) ||
      localStorage.getItem('fe_has_onboarded') === 'true';
    return hasSession ? 'home' : 'welcome';
  });

  // Persistent / Session Club & Match State
  const [coins, setCoins] = useState<number>(() => {
    const saved = localStorage.getItem('fe_coins');
    if (saved !== null && !Number.isNaN(Number(saved))) {
      return Math.max(0, Number(saved));
    }
    return 1250000;
  });
  const [userTeam, setUserTeam] = useState<TeamData>(() => {
    const savedClubId = localStorage.getItem('fe_favourite_club_id');
    return TEAMS_DB.find((t) => t.id === savedClubId) || TEAMS_DB[0]; // Real Madrid default
  });
  const [awayTeam, setAwayTeam] = useState<TeamData>(TEAMS_DB[1]); // FC Barcelona default
  const [userFormation, setUserFormation] = useState<FormationName>(() => {
    const saved = localStorage.getItem('fe_formation') as FormationName | null;
    return saved || '4-3-3';
  });
  const [unlockedPlayerIds, setUnlockedPlayerIds] = useState<string[]>(() => {
    const initialIds = PLAYERS_DB.filter((p) => p.initialUnlocked).map((p) => p.id);
    try {
      const savedRaw = localStorage.getItem('fe_unlocked_player_ids');
      if (savedRaw) {
        const parsed = JSON.parse(savedRaw);
        if (Array.isArray(parsed)) {
          return Array.from(new Set([...initialIds, ...parsed]));
        }
      }
    } catch {
      // ignore parse errors
    }
    return initialIds;
  });
  const [userSquad, setUserSquad] = useState<FootballPlayer[]>(() => {
    try {
      const savedRaw = localStorage.getItem('fe_squad_ids');
      if (savedRaw) {
        const parsed = JSON.parse(savedRaw);
        if (Array.isArray(parsed) && parsed.length >= 11) {
          const resolved = parsed
            .map((id: string) => PLAYERS_DB.find((p) => p.id === id))
            .filter((p): p is FootballPlayer => Boolean(p));
          if (resolved.length >= 11) return resolved;
        }
      }
    } catch {
      // ignore parse errors
    }
    return PLAYERS_DB.filter((p) => p.initialUnlocked);
  });
  const [captainId, setCaptainId] = useState<string>(() => {
    return (
      localStorage.getItem('fe_captain_id') ||
      PLAYERS_DB.find((p) => p.initialUnlocked)?.id ||
      PLAYERS_DB[0].id
    );
  });
  const [preferredCelebration, setPreferredCelebration] = useState<CelebrationType>(() => {
    return (
      (localStorage.getItem('fe_celebration') as CelebrationType) || 'Knee Slide Surge'
    );
  });

  // Match Configuration State
  const [selectedMode, setSelectedMode] = useState<MatchModeId>('quick_match');
  const [selectedStadium, setSelectedStadium] = useState<StadiumInfo>(STADIUMS[0]);
  const [selectedWeather, setSelectedWeather] = useState<WeatherType>('Night');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('Professional');
  const [cameraMode, setCameraMode] = useState<CameraMode>('Broadcast');
  const [controlScheme, setControlScheme] = useState<ControlScheme>('Hybrid');
  const [graphicsQuality, setGraphicsQuality] = useState<'Low' | 'Medium' | 'High' | 'Ultra'>(
    'High'
  );
  const [mouseSensitivity, setMouseSensitivity] = useState<number>(1.0);
  const [cameraSensitivity, setCameraSensitivity] = useState<number>(1.0);
  const [keyBindings, setKeyBindings] = useState<KeyBindings>(DEFAULT_KEY_BINDINGS);
  const [autoSwitchMode, setAutoSwitchMode] = useState<AutoSwitchMode>(() => {
    const saved = localStorage.getItem('fe_auto_switch_mode') as AutoSwitchMode | null;
    if (saved === 'auto' || saved === 'air_balls' || saved === 'manual') return saved;
    return 'auto';
  });

  // Pre-match Control Guide Modal
  const [showPreMatchGuide, setShowPreMatchGuide] = useState<boolean>(false);
  const [hasSeenControlGuide, setHasSeenControlGuide] = useState<boolean>(false);

  // Join Code ("PLAY-XXXX" + Online VS 11v11 Dream Team / 1v1 Room State)
  const [onlineMatchFormat, setOnlineMatchFormat] = useState<'11v11' | '1v1'>('11v11');
  const [inspectedOpponentSquad, setInspectedOpponentSquad] = useState<OpponentSquadInfo | null>(
    null
  );
  const [hostJoinCode, setHostJoinCode] = useState<string>(() => {
    const saved = sessionStorage.getItem('fe_room_code');
    if (saved) return saved;
    const code = `PLAY-${Math.floor(1000 + Math.random() * 9000)}`;
    sessionStorage.setItem('fe_room_code', code);
    return code;
  });
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [activeJoinCodeMatch, setActiveJoinCodeMatch] = useState<string | undefined>(undefined);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [friendRoomState, setFriendRoomState] = useState<FriendRoomState>(() => ({
    roomCode: sessionStorage.getItem('fe_room_code') || 'PLAY-7492',
    status: 'waiting_for_opponent',
    statusLabel: 'Waiting for Opponent',
    members: [],
    matchStarted: false,
  }));

  // Google Auth, Online Matchmaking by Username, Lobby & App Payment State
  const [authToken, setAuthToken] = useState<string | null>(() =>
    localStorage.getItem('fe_auth_token')
  );
  const [account, setAccount] = useState<AuthenticatedAccount | null>(() => {
    try {
      const raw = localStorage.getItem('fe_saved_account');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [showGoogleAuthModal, setShowGoogleAuthModal] = useState<boolean>(false);
  const [checkoutItem, setCheckoutItem] = useState<PaymentCheckoutItem | null>(null);
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayerPresence[]>([]);
  const [activeOnlineLobby, setActiveOnlineLobby] = useState<OnlineMatchLobbyState | null>(null);
  const [incomingInvite, setIncomingInvite] = useState<IncomingMatchInvite | null>(null);
  const [friendUsernameHomeInput, setFriendUsernameHomeInput] = useState<string>('');
  const [lastOnlineMatchResult, setLastOnlineMatchResult] = useState<{
    homeScore: number;
    awayScore: number;
    opponentName: string;
    coinsEarned: number;
  } | null>(null);

  // Tournament Progression State
  const [tournamentStageIndex, setTournamentStageIndex] = useState<number>(() => {
    const saved = localStorage.getItem('fe_tournament_stage');
    return saved !== null && !Number.isNaN(Number(saved)) ? Number(saved) : 0;
  });
  const [activeTournamentLabel, setActiveTournamentLabel] = useState<string | undefined>(
    undefined
  );

  // User Profile & Career Stats (loads saved profile from localStorage)
  const [profile, setProfile] = useState<UserProfileStats>(() => {
    try {
      const savedProfileRaw = localStorage.getItem('fe_profile_stats');
      if (savedProfileRaw) {
        const parsed = JSON.parse(savedProfileRaw);
        if (parsed && typeof parsed.username === 'string') {
          return parsed;
        }
      }
    } catch {
      // ignore parse error
    }
    const savedName = localStorage.getItem('fe_username') || 'ChampionElite_10';
    return {
      username: savedName,
      level: 14,
      matchesPlayed: 18,
      wins: 15,
      goals: 46,
      assists: 29,
      cleanSheets: 9,
      trophies: 2,
      unlockedAchievementIds: ['ach_speed_demon', 'ach_sniper', 'ach_champion'],
    };
  });

  const applyServerUserProgress = (user: AuthenticatedAccount) => {
    setAccount(user);
    localStorage.setItem('fe_saved_account', JSON.stringify(user));
    if (user.email) {
      localStorage.setItem('fe_user_email', user.email);
    }
    localStorage.setItem('fe_has_onboarded', 'true');
    if (user.username) {
      localStorage.setItem('fe_username', user.username);
    }
    if (typeof user.coins === 'number') {
      setCoins(user.coins);
    }
    if (user.favouriteClubId) {
      const club = TEAMS_DB.find((t) => t.id === user.favouriteClubId);
      if (club) setUserTeam(club);
    }
    if (Array.isArray(user.unlockedPlayerIds) && user.unlockedPlayerIds.length > 0) {
      setUnlockedPlayerIds((prev) =>
        Array.from(new Set([...prev, ...(user.unlockedPlayerIds || [])]))
      );
    }
    if (Array.isArray(user.squadIds) && user.squadIds.length >= 11) {
      const resolved = user.squadIds
        .map((id) => PLAYERS_DB.find((p) => p.id === id))
        .filter((p): p is FootballPlayer => Boolean(p));
      if (resolved.length >= 11) {
        setUserSquad(resolved);
      }
    }
    if (user.formation) {
      setUserFormation(user.formation as FormationName);
    }
    if (user.captainId) {
      setCaptainId(user.captainId);
    }
    if (user.preferredCelebration) {
      setPreferredCelebration(user.preferredCelebration as CelebrationType);
    }
    if (typeof user.tournamentStageIndex === 'number') {
      setTournamentStageIndex(user.tournamentStageIndex);
    }
    setProfile((prev) => ({
      ...prev,
      username: user.username || prev.username,
      matchesPlayed: typeof user.matchesPlayed === 'number' ? user.matchesPlayed : prev.matchesPlayed,
      wins: typeof user.wins === 'number' ? user.wins : prev.wins,
      goals: typeof user.goals === 'number' ? user.goals : prev.goals,
      assists: typeof user.assists === 'number' ? user.assists : prev.assists,
      cleanSheets: typeof user.cleanSheets === 'number' ? user.cleanSheets : prev.cleanSheets,
      trophies: typeof user.trophies === 'number' ? user.trophies : prev.trophies,
      level: typeof user.level === 'number' ? user.level : prev.level,
      unlockedAchievementIds: Array.isArray(user.unlockedAchievementIds)
        ? user.unlockedAchievementIds
        : prev.unlockedAchievementIds,
    }));
  };

  const handleCompleteOnboarding = (
    enteredUsername: string,
    chosenClub: TeamData,
    enteredEmail?: string
  ) => {
    localStorage.setItem('fe_has_onboarded', 'true');
    localStorage.setItem('fe_username', enteredUsername);
    localStorage.setItem('fe_favourite_club_id', chosenClub.id);
    setProfile((prev) => ({ ...prev, username: enteredUsername }));
    setUserTeam(chosenClub);
    if (awayTeam.id === chosenClub.id) {
      const alt = TEAMS_DB.find((t) => t.id !== chosenClub.id) || TEAMS_DB[1];
      setAwayTeam(alt);
    }
    if (enteredEmail && enteredEmail.includes('@')) {
      localStorage.setItem('fe_user_email', enteredEmail.trim());
      fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: enteredEmail.trim(),
          username: enteredUsername,
          favouriteClubId: chosenClub.id,
          initialUnlockedIds: unlockedPlayerIds,
          coins,
          squadIds: userSquad.map((p) => p.id),
          formation: userFormation,
          captainId,
          preferredCelebration,
          tournamentStageIndex,
        }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.user && data?.token) {
            setAuthToken(data.token);
            localStorage.setItem('fe_auth_token', data.token);
            applyServerUserProgress(data.user);
          }
        })
        .catch(() => {});
    }
    setScreen('home');
  };

  const navigateTo = (target: ActiveScreen) => {
    SoundEngine.playUIClick();
    setScreen(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLaunchMatch = (
    modeOverride?: MatchModeId,
    opponentOverride?: TeamData,
    tourneyLabel?: string,
    joinCode?: string
  ) => {
    SoundEngine.playUIClick();
    if (modeOverride === 'dream_team_11v11_online') {
      setOnlineMatchFormat('11v11');
      if (friendRoomState.members.length < 2 && !activeOnlineLobby?.guest) {
        FriendRoomService.joinMatchmakingQueue({
          username: profile.username,
          clubId: userTeam.id,
          clubName: userTeam.name,
          starPlayerId: userSquad[9]?.id,
          starPlayerName: userSquad[9]?.name || 'Mbappé',
          squadIds: userSquad.slice(0, 11).map((p) => p.id),
          formation: userFormation,
          matchFormat: '11v11',
        });
        setScreen('online_match');
        return;
      }
    }
    if (modeOverride) setSelectedMode(modeOverride);
    if (opponentOverride) setAwayTeam(opponentOverride);
    setActiveTournamentLabel(tourneyLabel);
    setActiveJoinCodeMatch(joinCode);

    if (!hasSeenControlGuide) {
      setShowPreMatchGuide(true);
    } else {
      setScreen('in_match');
    }
  };

  const handleConfirmGuideAndStart = () => {
    SoundEngine.playUIClick();
    setHasSeenControlGuide(true);
    setShowPreMatchGuide(false);
    setScreen('in_match');
  };

  const handlePlayWithJoinCode = () => {
    SoundEngine.playUIClick();
    const raw = joinCodeInput.trim().toUpperCase() || hostJoinCode;
    const formatted = raw.startsWith('PLAY-') ? raw : `PLAY-${raw}`;
    setJoinCodeInput(formatted);
    setHostJoinCode(formatted);
    sessionStorage.setItem('fe_room_code', formatted);
    FriendRoomService.joinRoom({
      roomCode: formatted,
      username: profile.username,
      clubId: userTeam.id,
      clubName: userTeam.name,
      starPlayerId: userSquad[9]?.id,
      starPlayerName: userSquad[9]?.name || 'Mbappé',
      squadIds: userSquad.slice(0, 11).map((p) => p.id),
      formation: userFormation,
      matchFormat: onlineMatchFormat,
    });
  };

  const handleJoinFriendRoomOnly = (customCode?: string, formatOverride?: '11v11' | '1v1') => {
    SoundEngine.playUIClick();
    const raw = (customCode ?? joinCodeInput).trim().toUpperCase();
    if (!raw) return;
    const formatted = raw.startsWith('PLAY-') ? raw : `PLAY-${raw}`;
    const fmt = formatOverride || onlineMatchFormat;
    if (formatOverride) setOnlineMatchFormat(formatOverride);
    setJoinCodeInput(formatted);
    setHostJoinCode(formatted);
    sessionStorage.setItem('fe_room_code', formatted);
    FriendRoomService.joinRoom({
      roomCode: formatted,
      username: profile.username,
      clubId: userTeam.id,
      clubName: userTeam.name,
      starPlayerId: userSquad[9]?.id,
      starPlayerName: userSquad[9]?.name || 'Mbappé',
      squadIds: userSquad.slice(0, 11).map((p) => p.id),
      formation: userFormation,
      matchFormat: fmt,
    });
  };

  const handleGenerateNewJoinCode = () => {
    SoundEngine.playUIClick();
    const nextCode = FriendRoomService.createRoom({
      username: profile.username,
      clubId: userTeam.id,
      clubName: userTeam.name,
      starPlayerId: userSquad[9]?.id,
      starPlayerName: userSquad[9]?.name || 'Mbappé',
      squadIds: userSquad.slice(0, 11).map((p) => p.id),
      formation: userFormation,
      matchFormat: onlineMatchFormat,
    });
    setHostJoinCode(nextCode);
    setJoinCodeInput('');
    sessionStorage.setItem('fe_room_code', nextCode);
  };

  useEffect(() => {
    FriendRoomService.registerPresence({
      username: profile.username,
      clubId: userTeam.id,
      clubName: userTeam.name,
      starPlayerId: userSquad[9]?.id,
      starPlayerName: userSquad[9]?.name || 'Kylian Mbappé',
      rating: userSquad[9]?.rating || 94,
      squadIds: userSquad.slice(0, 11).map((p) => p.id),
      formation: userFormation,
    });
    if (screen !== 'in_match') {
      FriendRoomService.joinRoom({
        roomCode: hostJoinCode,
        username: profile.username,
        clubId: userTeam.id,
        clubName: userTeam.name,
        starPlayerId: userSquad[9]?.id,
        starPlayerName: userSquad[9]?.name || 'Mbappé',
        squadIds: userSquad.slice(0, 11).map((p) => p.id),
        formation: userFormation,
        matchFormat: onlineMatchFormat,
      });
    }
  }, [
    screen,
    hostJoinCode,
    profile.username,
    userTeam.id,
    userTeam.name,
    userSquad,
    userFormation,
    onlineMatchFormat,
  ]);

  // Restore Account session if token or saved email exists (keeps user permanently logged in)
  useEffect(() => {
    const savedEmail = localStorage.getItem('fe_user_email') || account?.email || '';
    if (!authToken && !savedEmail) return;
    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    if (savedEmail) headers['x-user-email'] = savedEmail;

    fetch('/api/auth/me', { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) {
          applyServerUserProgress(data.user);
        }
      })
      .catch(() => {});
  }, [authToken]);

  // Save all progress permanently to localStorage & sync to backend whenever any state changes
  useEffect(() => {
    try {
      localStorage.setItem('fe_coins', String(coins));
      localStorage.setItem('fe_favourite_club_id', userTeam.id);
      localStorage.setItem('fe_formation', userFormation);
      localStorage.setItem('fe_unlocked_player_ids', JSON.stringify(unlockedPlayerIds));
      localStorage.setItem('fe_squad_ids', JSON.stringify(userSquad.map((p) => p.id)));
      localStorage.setItem('fe_captain_id', captainId);
      localStorage.setItem('fe_celebration', preferredCelebration);
      localStorage.setItem('fe_tournament_stage', String(tournamentStageIndex));
      localStorage.setItem('fe_profile_stats', JSON.stringify(profile));
      localStorage.setItem('fe_username', profile.username);
      localStorage.setItem('fe_auto_switch_mode', autoSwitchMode);
    } catch {
      // ignore storage quota errors
    }

    const savedEmail = localStorage.getItem('fe_user_email') || account?.email || '';
    if (!authToken && !savedEmail) return;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    if (savedEmail) headers['x-user-email'] = savedEmail;

    fetch('/api/user/sync', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email: savedEmail || undefined,
        username: profile.username,
        coins,
        favouriteClubId: userTeam.id,
        unlockedPlayerIds,
        squadIds: userSquad.map((p) => p.id),
        formation: userFormation,
        captainId,
        preferredCelebration,
        tournamentStageIndex,
        matchesPlayed: profile.matchesPlayed,
        wins: profile.wins,
        goals: profile.goals,
        assists: profile.assists,
        cleanSheets: profile.cleanSheets,
        trophies: profile.trophies,
        level: profile.level,
        unlockedAchievementIds: profile.unlockedAchievementIds,
      }),
    }).catch(() => {});
  }, [
    authToken,
    account?.email,
    profile,
    coins,
    userTeam.id,
    userFormation,
    unlockedPlayerIds,
    userSquad,
    captainId,
    preferredCelebration,
    tournamentStageIndex,
    autoSwitchMode,
  ]);

  useEffect(() => {
    const unsubRoom = FriendRoomService.subscribe((state) => {
      setFriendRoomState(state);
      const guest = state.members.find((m) => m.clientId !== FriendRoomService.getClientId());
      if (guest) {
        const guestClub = TEAMS_DB.find((t) => t.id === guest.clubId);
        if (guestClub) setAwayTeam(guestClub);
      }
    });
    const unsubOnline = FriendRoomService.subscribeOnlinePlayers((players) => {
      setOnlinePlayers(players);
    });
    const unsubInvites = FriendRoomService.subscribeInvites((invite) => {
      setIncomingInvite(invite);
    });
    const unsubLobby = FriendRoomService.subscribeLobby((lobby) => {
      setActiveOnlineLobby(lobby);
    });
    const unsubStart = FriendRoomService.onMatchStart((code, role, hostPlayer, guestPlayer) => {
      const oppPlayer = role === 'host' ? guestPlayer : hostPlayer;
      if (oppPlayer?.clubId) {
        const found = TEAMS_DB.find((t) => t.id === oppPlayer.clubId);
        if (found) setAwayTeam(found);
      }
      const resolvedFormat = hostPlayer?.matchFormat || guestPlayer?.matchFormat || '11v11';
      setOnlineMatchFormat(resolvedFormat);
      setHostJoinCode(code);
      setActiveJoinCodeMatch(code);
      setSelectedMode(resolvedFormat === '11v11' ? 'dream_team_11v11_online' : 'join_code_match');
      setShowPreMatchGuide(false);
      setScreen('in_match');
    });
    return () => {
      unsubRoom();
      unsubOnline();
      unsubInvites();
      unsubLobby();
      unsubStart();
    };
  }, []);

  const handleInviteFriendByUsername = (targetUsername: string) => {
    const clean = targetUsername.trim();
    if (!clean) return;
    FriendRoomService.sendInviteByUsername(clean);
    setScreen('online_match');
  };

  const handleCopyJoinCode = () => {
    navigator.clipboard?.writeText(hostJoinCode).catch(() => {});
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1800);
  };

  const handleMatchComplete = (result: {
    homeScore: number;
    awayScore: number;
    stats: MatchHUDState['stats'];
    coinsEarned: number;
  }) => {
    setCoins((c) => c + result.coinsEarned);
    const won = result.homeScore >= result.awayScore;

    setProfile((prev) => {
      const nextAch = new Set(prev.unlockedAchievementIds);
      if (result.homeScore >= 3) nextAch.add('ach_hat_trick');
      if (result.awayScore === 0 || result.stats.homeSaves >= 5) nextAch.add('ach_wall');
      if (activeTournamentLabel && tournamentStageIndex >= 6 && won) {
        nextAch.add('ach_world_champ');
      }

      return {
        ...prev,
        level: prev.level + 1,
        matchesPlayed: prev.matchesPlayed + 1,
        wins: prev.wins + (won ? 1 : 0),
        goals: prev.goals + result.homeScore,
        assists: prev.assists + Math.max(0, result.homeScore - 1),
        cleanSheets: prev.cleanSheets + (result.awayScore === 0 ? 1 : 0),
        trophies:
          prev.trophies + (activeTournamentLabel && tournamentStageIndex === 6 && won ? 1 : 0),
        unlockedAchievementIds: Array.from(nextAch),
      };
    });

    if (activeTournamentLabel && won) {
      setTournamentStageIndex((idx) => Math.min(7, idx + 1));
    }

    if (selectedMode === 'join_code_match' || activeJoinCodeMatch) {
      const oppName =
        activeOnlineLobby?.guest?.username || awayTeam.name;
      setLastOnlineMatchResult({
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        opponentName: oppName,
        coinsEarned: result.coinsEarned,
      });
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      fetch('/api/matches/result', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          homeScore: result.homeScore,
          awayScore: result.awayScore,
          coinsEarned: result.coinsEarned,
          lobbyId: activeOnlineLobby?.lobbyId,
        }),
      }).catch(() => {});
    }
  };

  const handleBuyPlayer = (player: FootballPlayer) => {
    if (coins < player.price || unlockedPlayerIds.includes(player.id)) return;
    SoundEngine.playPackOpen();
    setCoins((c) => c - player.price);
    setUnlockedPlayerIds((prev) => [...prev, player.id]);
    // Place newly unlocked superstar into Striker slot (#9) so they immediately lead the attack & 1v1!
    setUserSquad((prev) => {
      const copy = [...prev];
      const displaced = copy[9];
      copy[9] = player;
      if (displaced && !copy.some((p) => p.id === displaced.id)) {
        copy.push(displaced);
      }
      return copy;
    });
    setProfile((prev) => ({
      ...prev,
      unlockedAchievementIds: Array.from(
        new Set([...prev.unlockedAchievementIds, 'ach_transfer_mogul'])
      ),
    }));
  };

  const handleOpenPack = (pack: PackDefinition, pulledPlayer: FootballPlayer) => {
    setCoins((c) => Math.max(0, c - pack.price));
    if (!unlockedPlayerIds.includes(pulledPlayer.id)) {
      setUnlockedPlayerIds((prev) => [...prev, pulledPlayer.id]);
      setUserSquad((prev) => [pulledPlayer, ...prev.filter((p) => p.id !== pulledPlayer.id)]);
    }
  };

  const handleSpinRoulette = (costCoins: number, pulledPlayer: FootballPlayer) => {
    setCoins((c) => Math.max(0, c - costCoins));
    setUnlockedPlayerIds((prev) =>
      prev.includes(pulledPlayer.id) ? prev : [...prev, pulledPlayer.id]
    );
    setUserSquad((prev) => {
      const copy = [...prev];
      const existingIdx = copy.findIndex((p) => p.id === pulledPlayer.id);
      if (existingIdx >= 0) {
        return copy;
      }
      const displaced = copy[9];
      copy[9] = pulledPlayer;
      if (displaced && !copy.some((p) => p.id === displaced.id)) {
        copy.push(displaced);
      }
      return copy;
    });
  };

  // Show Welcome Username & Favourite Club Selection Screen at the very beginning
  if (screen === 'welcome') {
    return (
      <>
        <WelcomeOnboardingScreen
          initialUsername={profile.username}
          initialEmail=""
          initialClub={userTeam}
          starterSquad={userSquad}
          coins={coins}
          isGoogleLinked={Boolean(account)}
          onOpenGoogleAuth={() => setShowGoogleAuthModal(true)}
          onCompleteOnboarding={handleCompleteOnboarding}
        />
        <GoogleAuthModal
          isOpen={showGoogleAuthModal}
          currentUsername={profile.username}
          currentClubId={userTeam.id}
          unlockedPlayerIds={unlockedPlayerIds}
          account={account}
          onClose={() => setShowGoogleAuthModal(false)}
          onSuccessAuth={(acc, token) => {
            setAuthToken(token);
            localStorage.setItem('fe_auth_token', token);
            applyServerUserProgress(acc);
          }}
          onLogout={() => {
            setAccount(null);
            setAuthToken(null);
            localStorage.removeItem('fe_auth_token');
            localStorage.removeItem('fe_user_email');
            localStorage.removeItem('fe_saved_account');
          }}
        />
      </>
    );
  }

  // Fullscreen 3D Match Viewport when playing
  if (screen === 'in_match') {
    const myClientId = FriendRoomService.getClientId();
    const myMember = friendRoomState.members.find((m) => m.clientId === myClientId);
    const isOnline1v1 =
      (selectedMode === 'join_code_match' || selectedMode === 'dream_team_11v11_online') &&
      (friendRoomState.members.length >= 2 || Boolean(activeOnlineLobby?.guest));

    const hostMember =
      friendRoomState.members.find((m) => m.role === 'host') || friendRoomState.members[0];
    const guestMember =
      friendRoomState.members.find((m) => m.role === 'guest') ||
      friendRoomState.members.find((m) => m.clientId !== hostMember?.clientId);

    const myRole: 'host' | 'guest' =
      hostMember && hostMember.clientId !== myClientId ? 'guest' : 'host';

    const activeOnlineFormat: '11v11' | '1v1' =
      selectedMode === 'dream_team_11v11_online'
        ? '11v11'
        : friendRoomState.matchFormat || hostMember?.matchFormat || onlineMatchFormat;

    const myTeamSide: 'home' | 'away' =
      myMember?.teamSide || (myRole === 'host' ? 'home' : 'away');
    const myAssignedSlotIdx: number =
      typeof myMember?.assignedSlotIdx === 'number' ? myMember.assignedSlotIdx : 9;
    const lockToAssignedPlayer =
      activeOnlineFormat === '11v11' &&
      (friendRoomState.members.length > 2 || typeof myMember?.assignedSlotIdx === 'number');

    const resolvedHomeTeam =
      isOnline1v1 && myRole === 'guest' && hostMember
        ? TEAMS_DB.find((t) => t.id === hostMember.clubId) || awayTeam
        : userTeam;

    const resolvedAwayTeam =
      isOnline1v1 && myRole === 'host' && guestMember
        ? TEAMS_DB.find((t) => t.id === guestMember.clubId) || awayTeam
        : isOnline1v1 && myRole === 'guest'
        ? userTeam
        : awayTeam;

    const resolvedHomeFormation: FormationName =
      isOnline1v1 && myRole === 'guest' && hostMember?.formation
        ? (hostMember.formation as FormationName)
        : userFormation;

    const resolvedHomeSquad = (() => {
      if (isOnline1v1 && myRole === 'guest' && hostMember) {
        if (hostMember.squadIds && hostMember.squadIds.length >= 11) {
          return hostMember.squadIds.map(
            (id, idx) => PLAYERS_DB.find((p) => p.id === id) || PLAYERS_DB[idx % PLAYERS_DB.length]
          );
        }
        const hostStar =
          PLAYERS_DB.find(
            (p) => p.id === hostMember.starPlayerId || p.name === hostMember.starPlayerName
          ) || PLAYERS_DB[0];
        const copy = [...userSquad];
        copy[9] = hostStar;
        return copy;
      }
      return userSquad;
    })();

    const opponentStarPlayerId = isOnline1v1
      ? myRole === 'host'
        ? guestMember?.starPlayerId ||
          PLAYERS_DB.find((p) => p.name === guestMember?.starPlayerName)?.id
        : userSquad[9]?.id
      : undefined;

    const opponentSquadIds = isOnline1v1
      ? myRole === 'host'
        ? guestMember?.squadIds
        : userSquad.slice(0, 11).map((p) => p.id)
      : undefined;

    const opponentFormation: FormationName | undefined = isOnline1v1
      ? myRole === 'host'
        ? (guestMember?.formation as FormationName) || resolvedAwayTeam.defaultFormation
        : userFormation
      : undefined;

    return (
      <MatchViewport3D
        username={profile.username}
        homeTeam={resolvedHomeTeam}
        awayTeam={resolvedAwayTeam}
        homeSquad={resolvedHomeSquad}
        homeFormation={resolvedHomeFormation}
        stadium={selectedStadium}
        weather={selectedWeather}
        mode={selectedMode}
        difficulty={difficulty}
        initialCamera={cameraMode}
        controlScheme={controlScheme}
        graphicsQuality={graphicsQuality}
        preferredCelebration={preferredCelebration}
        keyBindings={keyBindings}
        mouseSensitivity={mouseSensitivity}
        cameraSensitivity={cameraSensitivity}
        autoSwitchMode={autoSwitchMode}
        onChangeAutoSwitchMode={setAutoSwitchMode}
        joinCodeLabel={activeJoinCodeMatch}
        tournamentStageLabel={activeTournamentLabel}
        onlineMatchInfo={
          isOnline1v1
            ? {
                isOnline: true,
                role: myRole,
                roomCode: activeJoinCodeMatch || friendRoomState.roomCode || hostJoinCode,
                hostUsername: hostMember?.username || profile.username,
                guestUsername:
                  guestMember?.username || activeOnlineLobby?.guest?.username || 'Opponent',
                matchFormat: activeOnlineFormat,
                myTeamSide,
                myAssignedSlotIdx,
                lockToAssignedPlayer,
                opponentStarPlayerId,
                opponentSquadIds,
                opponentFormation,
              }
            : undefined
        }
        onMatchComplete={handleMatchComplete}
        onNextMatch={
          activeTournamentLabel
            ? () => {
                setScreen('world_cup');
              }
            : () => {
                const others = TEAMS_DB.filter((t) => t.id !== awayTeam.id && t.id !== userTeam.id);
                const nextOpp = others[Math.floor(Math.random() * others.length)] || TEAMS_DB[2];
                setAwayTeam(nextOpp);
                setScreen('play_setup');
              }
        }
        onExitToMenu={() => navigateTo('home')}
        onReturnToOnlineLobby={() => navigateTo('online_match')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#070A0E] text-[#F1F5F9] flex flex-col">
      {/* STRICT 3-ZONE TOP BAR CONTRACT */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3.5 bg-[#070A0E]/90 backdrop-blur-md border-b border-white/10">
        {/* Zone 1: Brand App Icon + Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => navigateTo('home')}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className="w-11 h-11 rounded-full bg-[#111722] border border-[#F59E0B]/60 flex items-center justify-center overflow-hidden shadow-md shrink-0">
              <img
                src={iconUrl}
                alt="Football Elite Logo"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover scale-105"
              />
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-white text-left whitespace-nowrap shrink-0">
              FOOTBALL ELITE
            </span>
          </button>
        </div>

        {/* Zone 2: 5 single-line clean text navigation links */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-300">
          <button
            onClick={() => navigateTo('online_match')}
            className={`hover:text-white transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              screen === 'online_match' ? 'text-[#10B981] font-semibold' : ''
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            Online VS
          </button>
          <button
            onClick={() => navigateTo('transfer_market')}
            className={`hover:text-white transition-colors whitespace-nowrap ${
              screen === 'transfer_market' || screen === 'packs'
                ? 'text-[#F59E0B] font-semibold'
                : ''
            }`}
          >
            Player Cards ({PLAYERS_DB.length})
          </button>
          <button
            onClick={() => navigateTo('spin_roulette')}
            className={`hover:text-white transition-colors whitespace-nowrap ${
              screen === 'spin_roulette' ? 'text-[#F59E0B] font-semibold' : 'text-[#F59E0B]'
            }`}
          >
            Spin / Draw
          </button>
          <button
            onClick={() => navigateTo('my_team')}
            className={`hover:text-white transition-colors whitespace-nowrap ${
              screen === 'my_team' ? 'text-[#10B981] font-semibold' : ''
            }`}
          >
            Dream Team (11v11)
          </button>
          <button
            onClick={() => navigateTo('world_cup')}
            className={`hover:text-white transition-colors whitespace-nowrap ${
              screen === 'world_cup' || screen === 'tournaments'
                ? 'text-[#F59E0B] font-semibold'
                : ''
            }`}
          >
            World Cup
          </button>
          <button
            onClick={() => navigateTo('play_setup')}
            className={`hover:text-white transition-colors whitespace-nowrap ${
              screen === 'play_setup' ? 'text-[#10B981] font-semibold' : ''
            }`}
          >
            Play Modes
          </button>
        </nav>

        {/* Zone 3: 2 Primary Actions (Google Sign-In + ONLINE VS) */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowGoogleAuthModal(true)}
            className="px-3.5 py-2 text-xs font-display font-bold text-white bg-[#111722] border border-white/15 rounded-lg hover:border-[#10B981] transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer"
          >
            <span className="w-4 h-4 rounded-full bg-white text-[#070A0E] flex items-center justify-center text-[10px] font-bold">
              G
            </span>
            {account ? `@${account.username} ✓` : 'Sign in with Google'}
          </button>
          <button
            onClick={() => navigateTo('online_match')}
            className="px-4 py-2 text-xs font-display font-bold text-[#070A0E] bg-[#10B981] rounded-lg hover:bg-[#059669] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            ONLINE VS
          </button>
        </div>
      </header>

      {/* Mobile-Friendly Quick Nav Strip */}
      <div className="lg:hidden flex items-center gap-2 overflow-x-auto px-4 py-2.5 bg-[#111722] border-b border-white/10 text-xs font-display font-bold">
        <button
          onClick={() => navigateTo('online_match')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
            screen === 'online_match' ? 'bg-[#10B981] text-[#070A0E]' : 'text-slate-300'
          }`}
        >
          Online VS
        </button>
        <button
          onClick={() => navigateTo('transfer_market')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
            screen === 'transfer_market' ? 'bg-[#F59E0B] text-[#070A0E]' : 'text-slate-300'
          }`}
        >
          Player Cards ({PLAYERS_DB.length})
        </button>
        <button
          onClick={() => navigateTo('spin_roulette')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
            screen === 'spin_roulette' ? 'bg-[#F59E0B] text-[#070A0E]' : 'text-[#F59E0B]'
          }`}
        >
          Spin / Draw
        </button>
        <button
          onClick={() => navigateTo('my_team')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
            screen === 'my_team' ? 'bg-[#10B981] text-[#070A0E]' : 'text-slate-300'
          }`}
        >
          Dream Team (11v11)
        </button>
        <button
          onClick={() => navigateTo('world_cup')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
            screen === 'world_cup' ? 'bg-[#F59E0B] text-[#070A0E]' : 'text-slate-300'
          }`}
        >
          World Cup
        </button>
        <button
          onClick={() => navigateTo('play_setup')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
            screen === 'play_setup' ? 'bg-[#10B981] text-[#070A0E]' : 'text-slate-300'
          }`}
        >
          Play Modes
        </button>
        <button
          onClick={() => navigateTo('settings')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
            screen === 'settings' ? 'bg-white text-[#070A0E]' : 'text-slate-300'
          }`}
        >
          Controls
        </button>
      </div>

      {/* MAIN CONTENT ROUTER */}
      <main className="flex-1">
        {/* SCREEN 1: HOMEPAGE */}
        {screen === 'home' && (
          <div className="space-y-14 pb-16">
            {/* HERO SECTION */}
            <section className="relative min-h-[580px] flex items-center border-b border-white/10 overflow-hidden">
              {/* Stadium Floodlight Backdrop Image */}
              <img
                src={heroStadiumImg}
                alt="Football Elite Stadium at Night"
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover opacity-50"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#070A0E] via-[#070A0E]/85 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#070A0E] via-transparent to-transparent" />

              <div className="relative z-10 max-w-7xl mx-auto px-6 py-12 w-full grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                {/* Left 7 Cols: Brand Hero & Main Buttons */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#111722]/90 border-2 border-[#F59E0B]/60 shadow-[0_0_35px_rgba(245,158,11,0.3)] flex items-center justify-center overflow-hidden shrink-0">
                      <img
                        src={iconUrl}
                        alt="Football Elite App Logo"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover scale-105"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-[#10B981] tracking-widest">
                          WORLD OF CHAMPIONS · 60 FPS 3D WEBGL ENGINE
                        </span>
                      </div>
                      <h1 className="font-display text-5xl sm:text-6xl font-bold tracking-tight text-white leading-none">
                        FOOTBALL ELITE
                      </h1>
                    </div>
                  </div>

                  <p className="font-display text-xl sm:text-2xl font-semibold text-[#F59E0B] tracking-wide">
                    PLAY. COMPETE. CONQUER.
                  </p>

                  <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
                    Experience responsive 3D pitch gameplay with Magnus curved shots, fluid skill moves, manual goalkeeper saves, 8 international & club tournaments, and a live transfer market. Best experienced on Desktop with Keyboard + Mouse.
                  </p>

                  {/* Primary Hero CTA Grid (Including ONLINE VS) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <button
                      onClick={() => navigateTo('play_setup')}
                      className="py-3.5 px-4 bg-[#10B981] hover:bg-[#059669] text-[#070A0E] font-display font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg whitespace-nowrap cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      PLAY NOW
                    </button>

                    <button
                      onClick={() => navigateTo('online_match')}
                      className="py-3.5 px-4 bg-[#38BDF8] hover:bg-[#0284C7] text-[#070A0E] font-display font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg whitespace-nowrap cursor-pointer"
                    >
                      <Globe className="w-4 h-4" />
                      ONLINE VS
                    </button>

                    <button
                      onClick={() => navigateTo('world_cup')}
                      className="col-span-2 sm:col-span-2 py-3.5 px-5 bg-[#F59E0B] hover:bg-[#D97706] text-[#070A0E] font-display font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg whitespace-nowrap cursor-pointer"
                    >
                      <Trophy className="w-4 h-4" />
                      WORLD CUP
                    </button>

                    <button
                      onClick={() => handleLaunchMatch('quick_match')}
                      className="py-3 px-4 bg-[#111722]/90 hover:bg-[#192231] border border-white/15 rounded-xl font-display font-semibold text-xs text-white transition-colors whitespace-nowrap"
                    >
                      QUICK MATCH
                    </button>

                    <button
                      onClick={() => navigateTo('tournaments')}
                      className="py-3 px-4 bg-[#111722]/90 hover:bg-[#192231] border border-white/15 rounded-xl font-display font-semibold text-xs text-white transition-colors whitespace-nowrap"
                    >
                      TOURNAMENTS
                    </button>

                    <button
                      onClick={() => navigateTo('my_team')}
                      className="py-3 px-4 bg-[#111722]/90 hover:bg-[#192231] border border-[#10B981]/50 rounded-xl font-display font-semibold text-xs text-[#10B981] transition-colors whitespace-nowrap"
                    >
                      DREAM TEAM (11V11)
                    </button>

                    <button
                      onClick={() => navigateTo('transfer_market')}
                      className="py-3 px-4 bg-[#111722]/90 hover:bg-[#192231] border border-[#F59E0B]/40 rounded-xl font-display font-semibold text-xs text-[#F59E0B] transition-colors whitespace-nowrap cursor-pointer"
                    >
                      PLAYER CARDS ({PLAYERS_DB.length})
                    </button>

                    <button
                      onClick={() => navigateTo('spin_roulette')}
                      className="py-3 px-4 bg-gradient-to-r from-[#F59E0B]/20 to-[#F59E0B]/10 hover:from-[#F59E0B] hover:to-[#D97706] border border-[#F59E0B] rounded-xl font-display font-bold text-xs text-[#F59E0B] hover:text-[#070A0E] transition-all whitespace-nowrap cursor-pointer"
                    >
                      SPIN / DRAW CARDS
                    </button>

                    <button
                      onClick={() => navigateTo('leaderboard')}
                      className="py-3 px-4 bg-[#111722]/90 hover:bg-[#192231] border border-white/15 rounded-xl font-display font-semibold text-xs text-white transition-colors whitespace-nowrap"
                    >
                      LEADERBOARD
                    </button>

                    <button
                      onClick={() => navigateTo('packs')}
                      className="py-3 px-4 bg-[#111722]/90 hover:bg-[#192231] border border-white/15 rounded-xl font-display font-semibold text-xs text-[#F59E0B] transition-colors whitespace-nowrap"
                    >
                      PLAYER PACKS
                    </button>

                    <button
                      onClick={() => navigateTo('profile')}
                      className="py-3 px-4 bg-[#111722]/90 hover:bg-[#192231] border border-white/15 rounded-xl font-display font-semibold text-xs text-[#38BDF8] transition-colors whitespace-nowrap"
                    >
                      PLAYER PROFILE
                    </button>
                  </div>
                </div>

                {/* Right 5 Cols: ONLINE VS 1V1 MULTIPLAYER ROOM CODE & LIVE STATUS CARD */}
                <div className="lg:col-span-5">
                  <div className="bg-[#111722]/95 backdrop-blur-xl border border-white/15 rounded-2xl p-6 space-y-4 shadow-2xl">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
                      <div>
                        <div className="text-xs font-mono text-[#10B981] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                          ONLINE VS · {onlineMatchFormat === '11v11' ? '11V11 DREAM TEAM' : '1V1 DUEL'}
                        </div>
                        <h2 className="font-display text-xl font-bold text-white">
                          ONLINE VS ({onlineMatchFormat === '11v11' ? '11V11 DREAM TEAM' : '1V1 ROOM CODE'})
                        </h2>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() =>
                            setOnlineMatchFormat((f) => (f === '11v11' ? '1v1' : '11v11'))
                          }
                          className="px-2.5 py-1.5 bg-[#070A0E] border border-white/20 rounded-lg font-mono font-bold text-[11px] text-[#F59E0B] cursor-pointer"
                        >
                          {onlineMatchFormat.toUpperCase()}
                        </button>
                        <button
                          onClick={() => navigateTo('online_match')}
                          className="px-3 py-1.5 bg-[#10B981]/20 hover:bg-[#10B981] text-[#10B981] hover:text-[#070A0E] border border-[#10B981]/40 rounded-lg font-display font-bold text-xs transition-colors cursor-pointer"
                        >
                          ONLINE LOBBY
                        </button>
                      </div>
                    </div>

                    {/* Live Connection Status Banner ("Waiting for Opponent" / "Opponent Connected" / "Match Starting") */}
                    {(() => {
                      const st = friendRoomState.status || 'waiting_for_opponent';
                      const label =
                        st === 'match_starting'
                          ? 'Match Starting'
                          : st === 'opponent_connected' || friendRoomState.members.length >= 2
                          ? 'Opponent Connected'
                          : st === 'opponent_disconnected'
                          ? 'Opponent Disconnected'
                          : 'Waiting for Opponent';
                      const badgeColor =
                        st === 'match_starting'
                          ? 'bg-[#10B981] text-[#070A0E]'
                          : st === 'opponent_connected' || friendRoomState.members.length >= 2
                          ? 'bg-[#38BDF8] text-[#070A0E]'
                          : st === 'opponent_disconnected'
                          ? 'bg-rose-500 text-white'
                          : 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40';
                      return (
                        <div className="p-3 rounded-xl bg-[#070A0E] border border-white/10 flex items-center justify-between gap-2">
                          <span className={`px-2.5 py-1 rounded-md font-display font-bold text-xs flex items-center gap-1.5 ${badgeColor}`}>
                            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                            {label}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs text-white font-bold">
                              {friendRoomState.roomCode || hostJoinCode}
                            </span>
                            <button
                              onClick={handleCopyJoinCode}
                              className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-[11px] font-mono text-white cursor-pointer"
                            >
                              {copiedCode ? 'Copied!' : 'Copy'}
                            </button>
                            <button
                              onClick={handleGenerateNewJoinCode}
                              className="px-2 py-1 bg-[#10B981]/20 hover:bg-[#10B981]/30 text-[#10B981] rounded text-[11px] font-mono font-bold cursor-pointer"
                            >
                              New Room
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Player 2: Enter Room Code to Join Match */}
                    <div>
                      <label className="block text-xs text-slate-300 mb-1.5">
                        Player 2 — Enter Friend’s Room Code to Join 1v1 Match:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={joinCodeInput}
                          onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                          placeholder={`Enter Room Code (e.g. ${hostJoinCode})`}
                          className="w-full bg-[#070A0E] border border-white/20 rounded-lg px-3 py-2.5 font-mono text-xs font-bold text-white tracking-wider uppercase focus:outline-none focus:border-[#10B981]"
                        />
                        <button
                          onClick={() => handleJoinFriendRoomOnly()}
                          className="px-4 py-2.5 bg-[#F59E0B] hover:bg-[#D97706] text-[#070A0E] font-display font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shrink-0 whitespace-nowrap shadow-md cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          JOIN ROOM
                        </button>
                      </div>
                    </div>

                    {/* Invite Friend by Username Input */}
                    <div>
                      <label className="block text-xs text-slate-300 mb-1.5">
                        Or Invite Friend by Username:
                      </label>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!friendUsernameHomeInput.trim()) return;
                          SoundEngine.playUIClick();
                          handleInviteFriendByUsername(friendUsernameHomeInput);
                          setFriendUsernameHomeInput('');
                        }}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="text"
                          value={friendUsernameHomeInput}
                          onChange={(e) => setFriendUsernameHomeInput(e.target.value)}
                          placeholder="Enter friend's username (e.g. Alex_10)..."
                          className="w-full bg-[#070A0E] border border-white/20 focus:border-[#10B981] rounded-lg px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="px-3.5 py-2 bg-[#10B981] hover:bg-[#059669] text-[#070A0E] font-display font-bold text-xs rounded-lg transition-colors shrink-0 whitespace-nowrap shadow-md cursor-pointer"
                        >
                          INVITE
                        </button>
                      </form>
                    </div>

                    {/* Live Connected Friends in Private Room */}
                    <div className="p-3 bg-[#070A0E]/80 border border-white/10 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-400">
                          MATCH CODE ({friendRoomState.roomCode || hostJoinCode}) · {onlineMatchFormat.toUpperCase()}
                        </span>
                        <span className="text-[#10B981] font-bold">
                          {friendRoomState.members.filter((m) => m.isReady).length} /{' '}
                          {friendRoomState.requiredPlayers || 2} PLAYERS READY
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded-lg bg-[#111722] border border-[#10B981]/40">
                          <div className="text-[10px] font-mono text-[#10B981] font-bold">
                            HOST (YOU)
                          </div>
                          <div className="font-display font-bold text-white truncate">
                            @{profile.username}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {userTeam.name} · {userSquad[9]?.name}
                          </div>
                        </div>
                        {friendRoomState.members.find(
                          (m) => m.clientId !== FriendRoomService.getClientId()
                        ) ? (
                          <div className="p-2 rounded-lg bg-[#111722] border border-[#F59E0B]/50">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono text-[#F59E0B] font-bold">
                                FRIEND JOINED ({friendRoomState.members.length} IN ROOM)
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  SoundEngine.playUIClick();
                                  const opp = friendRoomState.members.find(
                                    (m) => m.clientId !== FriendRoomService.getClientId()
                                  );
                                  if (opp) {
                                    setInspectedOpponentSquad({
                                      username: opp.username,
                                      clubName: opp.clubName,
                                      starPlayerName: opp.starPlayerName,
                                      starPlayerId: opp.starPlayerId,
                                      squadIds: opp.squadIds,
                                      formation: opp.formation || '4-3-3',
                                    });
                                  }
                                }}
                                className="px-1.5 py-0.5 rounded bg-[#38BDF8]/20 text-[#38BDF8] font-mono text-[9px] font-bold flex items-center gap-0.5 cursor-pointer"
                              >
                                <Eye className="w-2.5 h-2.5" />
                                VIEW XI
                              </button>
                            </div>
                            <div className="font-display font-bold text-white truncate">
                              @
                              {
                                friendRoomState.members.find(
                                  (m) => m.clientId !== FriendRoomService.getClientId()
                                )?.username
                              }
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {
                                friendRoomState.members.find(
                                  (m) => m.clientId !== FriendRoomService.getClientId()
                                )?.clubName
                              }{' '}
                              ·{' '}
                              {
                                friendRoomState.members.find(
                                  (m) => m.clientId !== FriendRoomService.getClientId()
                                )?.starPlayerName
                              }
                            </div>
                          </div>
                        ) : (
                          <div className="p-2 rounded-lg bg-[#111722]/60 border border-white/10 flex flex-col justify-between gap-1">
                            <div>
                              <div className="text-[10px] font-mono text-slate-400">
                                SHARE MATCH CODE
                              </div>
                              <div className="text-[11px] text-slate-300 font-medium">
                                Friends enter <span className="text-[#10B981] font-mono font-bold">{friendRoomState.roomCode || hostJoinCode}</span> to join
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                SoundEngine.playUIClick();
                                setInspectedOpponentSquad({
                                  username: awayTeam.name,
                                  clubName: awayTeam.name,
                                  clubPrimaryColor: awayTeam.primaryColor,
                                  clubSecondaryColor: awayTeam.secondaryColor,
                                  formation: awayTeam.defaultFormation || '4-3-3',
                                });
                              }}
                              className="self-start px-2 py-0.5 rounded bg-white/10 hover:bg-white/15 text-[#38BDF8] font-mono text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              Scout Rival XI
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Ready Up & Auto-Start Match Bar */}
                      {(() => {
                        const myMemberInRoom = friendRoomState.members.find(
                          (m) => m.clientId === FriendRoomService.getClientId()
                        );
                        const amIReady = Boolean(myMemberInRoom?.isReady);
                        const readyCnt = friendRoomState.members.filter((m) => m.isReady).length;
                        const reqCnt = friendRoomState.requiredPlayers || 2;
                        return (
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                SoundEngine.playUIClick();
                                FriendRoomService.setRoomReady(
                                  friendRoomState.roomCode || hostJoinCode,
                                  !amIReady
                                );
                              }}
                              className={`py-2 px-3 rounded-lg font-display font-bold text-xs transition-all cursor-pointer ${
                                amIReady
                                  ? 'bg-[#10B981] text-[#070A0E]'
                                  : 'bg-white/10 hover:bg-white/15 border border-[#10B981] text-[#10B981]'
                              }`}
                            >
                              {amIReady
                                ? `READY ✓ (${readyCnt}/${reqCnt})`
                                : `READY UP (${readyCnt}/${reqCnt})`}
                            </button>
                            <button
                              type="button"
                              onClick={() => navigateTo('online_match')}
                              className="py-2 px-3 rounded-lg bg-[#38BDF8]/15 hover:bg-[#38BDF8]/25 border border-[#38BDF8]/40 text-[#38BDF8] font-display font-bold text-xs transition-colors cursor-pointer"
                            >
                              {onlineMatchFormat === '11v11'
                                ? 'PICK 11V11 PLAYER →'
                                : 'OPEN MATCH LOBBY →'}
                            </button>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Active Squad Quick Summary */}
                    <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
                      <div>
                        <span className="text-[#10B981] font-mono font-bold">YOU (@{profile.username})</span> ·{' '}
                        <span className="font-bold text-white">{userTeam.name}</span> ·{' '}
                        <button
                          onClick={() => navigateTo('welcome')}
                          className="text-[#38BDF8] hover:underline ml-1"
                        >
                          Change Club/Name
                        </button>
                      </div>
                      <div className="font-mono text-[#F59E0B] font-bold">
                        {coins.toLocaleString()} Coins
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ALL 9 PLAYABLE MATCH MODES SECTION */}
            <section className="max-w-7xl mx-auto px-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
                <div>
                  <div className="text-xs font-mono text-[#10B981] mb-1">
                    9 PLAYABLE 3D GAMEPLAY MODES
                  </div>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
                    SELECT YOUR MATCH MODE
                  </h2>
                </div>
                <div className="text-xs text-slate-400">
                  Click any mode to jump directly into 3D stadium gameplay
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {MATCH_MODES.map((m) => (
                  <div
                    key={m.id}
                    className="bg-[#111722] border border-white/10 hover:border-[#10B981]/50 rounded-2xl p-6 flex flex-col justify-between transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-2">
                        <span>
                          {m.playersPerSide} · {m.durationLabel}
                        </span>
                        <span className="text-[#F59E0B]">+{m.rewardCoins.toLocaleString()} Coins</span>
                      </div>
                      <h3 className="font-display text-xl font-bold text-white mb-1">
                        {m.title}
                      </h3>
                      <div className="text-xs text-[#10B981] font-medium mb-3">{m.subtitle}</div>
                      <p className="text-xs text-slate-300 leading-relaxed mb-6">
                        {m.description}
                      </p>
                    </div>

                    <button
                      onClick={() => handleLaunchMatch(m.id)}
                      className="w-full py-2.5 bg-white/10 hover:bg-[#10B981] text-white hover:text-[#070A0E] font-display font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      LAUNCH {m.title.toUpperCase()}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* CONTROLS & STADIUM ATMOSPHERE OVERVIEW */}
            <section className="max-w-7xl mx-auto px-6">
              <div className="bg-[#111722] border border-white/10 rounded-2xl p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 space-y-3">
                  <div className="text-xs font-mono text-[#38BDF8]">
                    PRECISION KEYBOARD + MOUSE HYBRID CONTROLS
                  </div>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
                    Instant To Learn, Deep Mastery On The Pitch
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Control your footballers with responsive keyboard movement while using the mouse to aim through-balls, crosses, and Magnus curved shots into the top corner.
                  </p>
                  <div className="pt-2">
                    <button
                      onClick={() => navigateTo('settings')}
                      className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-xs font-display font-bold text-white rounded-lg transition-colors"
                    >
                      CUSTOMIZE KEYBINDINGS & CAMERA
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
                  {[
                    { key: 'P', action: 'Accurate Pass', sub: 'Pinpoint Pass to Teammate' },
                    { key: 'S', action: 'Shoot (Hold Power)', sub: 'Normal & Power Shots' },
                    { key: 'B', action: 'Bicycle Kick', sub: 'Acrobatic Overhead Volley' },
                    { key: 'F / Middle-Click', action: 'Rainbow Flick', sub: 'Arc Ball Over Defender' },
                    { key: 'C', action: 'Curve Shot', sub: 'Magnus Spin Bending' },
                    { key: 'K', action: 'Skill Move', sub: 'Roulette, Elastico, Step-over' },
                    { key: 'I', action: 'Sprint Boost', sub: 'High-Speed Breakaway' },
                    { key: 'W / O / A / D', action: 'Move Footballer', sub: 'Desktop Keys or Mobile Pad' },
                    { key: 'V / Q', action: 'GK Save & Switch', sub: 'Manual GK Dive / Switch Player' },
                  ].map((ctrl) => (
                    <div
                      key={ctrl.key}
                      className="p-3.5 bg-[#070A0E] border border-white/10 rounded-xl"
                    >
                      <div className="text-[#10B981] font-bold text-sm mb-1">[{ctrl.key}]</div>
                      <div className="font-sans font-semibold text-white text-xs">
                        {ctrl.action}
                      </div>
                      <div className="font-sans text-[11px] text-slate-400 mt-0.5">{ctrl.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* SCREEN 1B: ONLINE VS 11V11 DREAM TEAM & 1V1 MULTIPLAYER ARENA */}
        {screen === 'online_match' && (
          <OnlineMatchCenter
            username={profile.username}
            account={account}
            userTeam={userTeam}
            awayTeam={awayTeam}
            leadStar={userSquad[9] || PLAYERS_DB[0]}
            userSquad={userSquad}
            onlinePlayers={onlinePlayers}
            activeLobby={activeOnlineLobby}
            friendRoomState={friendRoomState}
            roomCode={hostJoinCode}
            onlineMatchFormat={onlineMatchFormat}
            userFormation={userFormation}
            userSquadOvr={Math.round(
              userSquad.slice(0, 11).reduce((acc, p) => acc + p.rating, 0) / 11
            )}
            lastMatchResult={lastOnlineMatchResult}
            onSelectOnlineMatchFormat={(fmt) => setOnlineMatchFormat(fmt)}
            onEditDreamTeam={() => navigateTo('my_team')}
            onOpenGoogleAuth={() => setShowGoogleAuthModal(true)}
            onCreateNewRoom={handleGenerateNewJoinCode}
            onJoinRoomByCode={(enteredCode) => {
              handleJoinFriendRoomOnly(enteredCode);
            }}
            onInviteByUsername={handleInviteFriendByUsername}
            onToggleLobbyReady={(lobbyId, nextReady) => {
              FriendRoomService.setLobbyReady(lobbyId, nextReady);
            }}
            onStartOnlineMatch={(oppTeam, roomCodeLabel) => {
              FriendRoomService.triggerStartMatch(roomCodeLabel);
              handleLaunchMatch(
                onlineMatchFormat === '11v11' ? 'dream_team_11v11_online' : 'join_code_match',
                oppTeam,
                undefined,
                roomCodeLabel
              );
            }}
            onQuickMatchmaking={() => {
              FriendRoomService.joinMatchmakingQueue({
                username: profile.username,
                clubId: userTeam.id,
                clubName: userTeam.name,
                starPlayerId: userSquad[9]?.id,
                starPlayerName: userSquad[9]?.name || 'Mbappé',
                squadIds: userSquad.slice(0, 11).map((p) => p.id),
                formation: userFormation,
                matchFormat: onlineMatchFormat,
              });
            }}
          />
        )}

        {/* SCREEN 2: PLAY NOW / QUICK MATCH 3-STEP SETUP LOBBY */}
        {screen === 'play_setup' && (
          <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
              <div>
                <div className="text-xs font-mono text-[#10B981] mb-1">
                  STEP 1: SELECT TEAMS · STEP 2: SELECT MODE & STADIUM · STEP 3: KICK OFF
                </div>
                <h1 className="font-display text-3xl md:text-4xl font-bold text-white">
                  MATCH SETUP LOBBY
                </h1>
              </div>

              <button
                onClick={() => handleLaunchMatch(selectedMode, awayTeam)}
                className="px-8 py-4 bg-[#10B981] hover:bg-[#059669] text-[#070A0E] font-display font-bold text-base rounded-xl transition-all flex items-center gap-2 shadow-xl whitespace-nowrap"
              >
                <Play className="w-5 h-5 fill-current" />
                START 3D MATCH NOW
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Step 1: Select Home Team & Away Opponent */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-[#111722] border border-white/10 rounded-2xl p-6">
                  <h2 className="font-display text-xl font-bold text-white mb-4">
                    1. Choose Your Team & Opponent
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                    {/* Home Team Card */}
                    <div className="p-4 rounded-xl bg-[#070A0E] border border-[#10B981]/50">
                      <div className="text-xs font-mono text-[#10B981] mb-2">
                        YOUR TEAM (HOME)
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-5 h-5 rounded-sm border border-white/20"
                            style={{ backgroundColor: userTeam.primaryColor }}
                          />
                          <span className="font-display text-xl font-bold text-white">
                            {userTeam.name}
                          </span>
                        </div>
                        <span className="font-mono text-sm font-bold text-[#F59E0B]">
                          OVR {userTeam.rating}
                        </span>
                      </div>
                      <select
                        value={userTeam.id}
                        onChange={(e) => {
                          const found = TEAMS_DB.find((t) => t.id === e.target.value);
                          if (found) setUserTeam(found);
                        }}
                        className="w-full bg-[#111722] border border-white/15 rounded-lg px-3 py-2 text-xs text-white"
                      >
                        {TEAMS_DB.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.category} · OVR {t.rating})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Away Team Card */}
                    <div className="p-4 rounded-xl bg-[#070A0E] border border-white/15">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono text-[#F59E0B]">
                          OPPONENT TEAM (AWAY)
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            SoundEngine.playUIClick();
                            const opp = friendRoomState.members.find(
                              (m) => m.clientId !== FriendRoomService.getClientId()
                            );
                            setInspectedOpponentSquad({
                              username: opp?.username || awayTeam.name,
                              clubName: opp?.clubName || awayTeam.name,
                              clubPrimaryColor: awayTeam.primaryColor,
                              clubSecondaryColor: awayTeam.secondaryColor,
                              starPlayerName: opp?.starPlayerName,
                              starPlayerId: opp?.starPlayerId,
                              squadIds: opp?.squadIds,
                              formation: opp?.formation || awayTeam.defaultFormation || '4-3-3',
                            });
                          }}
                          className="px-2 py-0.5 rounded bg-[#38BDF8]/15 hover:bg-[#38BDF8]/25 border border-[#38BDF8]/40 text-[#38BDF8] font-mono text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          VIEW SQUAD (XI)
                        </button>
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-5 h-5 rounded-sm border border-white/20"
                            style={{ backgroundColor: awayTeam.primaryColor }}
                          />
                          <span className="font-display text-xl font-bold text-white">
                            {awayTeam.name}
                          </span>
                        </div>
                        <span className="font-mono text-sm font-bold text-[#F59E0B]">
                          OVR {awayTeam.rating}
                        </span>
                      </div>
                      <select
                        value={awayTeam.id}
                        onChange={(e) => {
                          const found = TEAMS_DB.find((t) => t.id === e.target.value);
                          if (found) setAwayTeam(found);
                        }}
                        className="w-full bg-[#111722] border border-white/15 rounded-lg px-3 py-2 text-xs text-white"
                      >
                        {TEAMS_DB.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.category} · OVR {t.rating})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Select Match Mode */}
                  <h3 className="font-display text-lg font-bold text-white mb-3">
                    2. Select Match Mode
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-6">
                    {MATCH_MODES.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          SoundEngine.playUIClick();
                          setSelectedMode(m.id);
                        }}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          selectedMode === m.id
                            ? 'bg-[#192231] border-[#10B981]'
                            : 'bg-[#070A0E] border-white/10 hover:border-white/25'
                        }`}
                      >
                        <div className="font-display font-bold text-xs text-white mb-0.5">
                          {m.title}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          {m.playersPerSide}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Select Lead Star From Unlocked World Cup Players + Unlock Legends */}
                  <div className="pt-5 border-t border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-display text-lg font-bold text-white">
                          3. Select Your Lead World Cup Footballer (YOU: {userSquad[9]?.name})
                        </h3>
                        <p className="text-xs text-slate-400">
                          Showing your {unlockedPlayerIds.length} currently unlocked players. Unlock more World Cup legends below with Coins!
                        </p>
                      </div>
                      <span className="font-mono text-xs text-[#F59E0B] font-bold">
                        {coins.toLocaleString()} Coins
                      </span>
                    </div>

                    {/* Unlocked Players (Realistic eFootball Player Photos on Player Selection Screen) */}
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                      {PLAYERS_DB.filter((p) => unlockedPlayerIds.includes(p.id) && p.position !== 'GK').map(
                        (p) => {
                          const isLead = userSquad[9]?.id === p.id;
                          return (
                            <button
                              key={p.id}
                              title={`${p.name} (${p.position} · OVR ${p.rating})`}
                              onClick={() => {
                                SoundEngine.playUIClick();
                                setUserSquad((prev) => {
                                  const copy = [...prev];
                                  const idx = copy.findIndex((item) => item.id === p.id);
                                  if (idx >= 0) {
                                    const tmp = copy[9];
                                    copy[9] = copy[idx];
                                    copy[idx] = tmp;
                                  } else {
                                    copy[9] = p;
                                  }
                                  return copy;
                                });
                              }}
                              className={`p-2 rounded-xl border flex flex-col items-center text-center transition-all cursor-pointer ${
                                isLead
                                  ? 'bg-[#192231] border-[#10B981] ring-2 ring-[#10B981]'
                                  : 'bg-[#070A0E] border-white/10 hover:border-white/30'
                              }`}
                            >
                              <PlayerPhotoAvatar
                                player={p}
                                className="w-15 h-15 rounded-xl border border-white/20 shadow-md"
                                showPositionBadge={true}
                                showRatingBadge={true}
                              />
                              <div className="text-xs font-sans font-bold text-white truncate mt-1.5 w-full leading-tight">
                                {p.name}
                              </div>
                              <div className="text-[10px] font-mono mt-0.5 truncate w-full">
                                {isLead ? (
                                  <span className="text-[#10B981] font-bold">ACTIVE STAR</span>
                                ) : (
                                  <span className="text-slate-300">#{p.number} · {p.nationality}</span>
                                )}
                              </div>
                            </button>
                          );
                        }
                      )}
                    </div>

                    {/* Locked World Cup Superstars (Messi, Mbappé, Ronaldo, Neymar, etc.) */}
                    {PLAYERS_DB.some((p) => !unlockedPlayerIds.includes(p.id)) && (
                      <div>
                        <div className="text-xs font-mono text-[#F59E0B] font-bold mb-2">
                          UNLOCK FAMOUS WORLD CUP STARS WITH IN-GAME MONEY:
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {PLAYERS_DB.filter((p) => !unlockedPlayerIds.includes(p.id))
                            .slice(0, 8)
                            .map((star) => {
                              const canAfford = coins >= star.price;
                              return (
                                <button
                                  key={star.id}
                                  disabled={!canAfford}
                                  title={`${star.name} (${star.position} · OVR ${star.rating})`}
                                  onClick={() => handleBuyPlayer(star)}
                                  className={`p-2.5 rounded-xl border flex flex-col items-center text-center transition-all ${
                                    canAfford
                                      ? 'bg-[#070A0E] border-[#F59E0B]/40 hover:border-[#F59E0B] cursor-pointer'
                                      : 'bg-[#070A0E]/50 border-white/5 opacity-60 cursor-not-allowed'
                                  }`}
                                >
                                  <PlayerPhotoAvatar
                                    player={star}
                                    className="w-13 h-13 rounded-xl border border-[#F59E0B]/40"
                                    showPositionBadge={true}
                                    showRatingBadge={true}
                                  />
                                  <div className="text-xs font-sans font-bold text-white truncate w-full mt-1.5 leading-tight">
                                    {star.name}
                                  </div>
                                  <div className="text-[10px] font-mono text-[#F59E0B] font-bold mt-0.5">
                                    {star.position} · OVR {star.rating}
                                  </div>
                                  <div className="text-[10px] text-slate-400 truncate w-full">
                                    {star.nationality}
                                  </div>
                                  <div className="text-[10px] font-mono text-[#10B981] font-bold mt-0.5">
                                    {star.price.toLocaleString()} Coins
                                  </div>
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 2: Stadium, Weather, Camera & Difficulty */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-[#111722] border border-white/10 rounded-2xl p-6 space-y-5">
                  <h2 className="font-display text-xl font-bold text-white">
                    3. Stadium, Weather & AI Difficulty
                  </h2>

                  <div>
                    <label className="block text-xs text-slate-400 mb-2">
                      3D Stadium Arena (8 Themes)
                    </label>
                    <select
                      value={selectedStadium.id}
                      onChange={(e) => {
                        const st = STADIUMS.find((s) => s.id === e.target.value);
                        if (st) {
                          setSelectedStadium(st);
                          setSelectedWeather(st.defaultWeather);
                        }
                      }}
                      className="w-full bg-[#070A0E] border border-white/15 rounded-lg px-3 py-2.5 text-xs text-white font-medium"
                    >
                      {STADIUMS.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name} · Capacity {st.capacity.toLocaleString()}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      {selectedStadium.description}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-2">
                      Weather Conditions
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['Sunny', 'Night', 'Cloudy', 'Rain'] as WeatherType[]).map((w) => (
                        <button
                          key={w}
                          onClick={() => setSelectedWeather(w)}
                          className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
                            selectedWeather === w
                              ? 'bg-[#38BDF8] text-[#070A0E] font-bold'
                              : 'bg-[#070A0E] text-slate-300 border border-white/10'
                          }`}
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-2">AI Difficulty</label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {(
                        ['Easy', 'Normal', 'Hard', 'Professional', 'World Class'] as DifficultyLevel[]
                      ).map((d) => (
                        <button
                          key={d}
                          onClick={() => setDifficulty(d)}
                          className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
                            difficulty === d
                              ? 'bg-[#F59E0B] text-[#070A0E] font-bold'
                              : 'bg-[#070A0E] text-slate-300 border border-white/10'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-2">Camera Perspective</label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {(['Broadcast', 'Player', 'Action', 'Goalkeeper', 'Free'] as CameraMode[]).map(
                        (cam) => (
                          <button
                            key={cam}
                            onClick={() => setCameraMode(cam)}
                            className={`py-2 rounded-lg text-[11px] font-semibold transition-colors ${
                              cameraMode === cam
                                ? 'bg-[#10B981] text-[#070A0E] font-bold'
                                : 'bg-[#070A0E] text-slate-300 border border-white/10'
                            }`}
                          >
                            {cam}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-2">
                      Auto Player Switch Option
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { id: 'auto', label: 'Auto Switch' },
                          { id: 'air_balls', label: 'Air Balls Only' },
                          { id: 'manual', label: 'Manual [Q]' },
                        ] as { id: AutoSwitchMode; label: string }[]
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            SoundEngine.playUIClick();
                            setAutoSwitchMode(opt.id);
                          }}
                          className={`py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                            autoSwitchMode === opt.id
                              ? 'bg-[#10B981] text-[#070A0E] font-bold'
                              : 'bg-[#070A0E] text-slate-300 border border-white/10'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 3 & 4: WORLD CUP & TOURNAMENTS */}
        {(screen === 'world_cup' || screen === 'tournaments') && (
          <WorldCupAndTournaments
            initialTab={screen === 'world_cup' ? 'world_cup' : 'tournaments'}
            userTeam={userTeam}
            userFormation={userFormation}
            userSquad={userSquad}
            onSelectUserTeam={setUserTeam}
            onSelectFormation={setUserFormation}
            tournamentStageIndex={tournamentStageIndex}
            onStartTournamentMatch={({ opponent, stageLabel, isFinal }) => {
              if (isFinal) {
                setSelectedStadium(STADIUMS[4]); // Crown of Champions Final Stadium
                setSelectedWeather('Night');
              }
              handleLaunchMatch('world_cup', opponent, stageLabel);
            }}
            onAdvanceStageSimulation={() => {
              SoundEngine.playGoalRoar();
              setTournamentStageIndex((idx) => Math.min(7, idx + 1));
              setCoins((c) => c + 4000);
            }}
            onResetTournament={() => {
              SoundEngine.playUIClick();
              setTournamentStageIndex(0);
            }}
          />
        )}

        {/* SCREEN 5, 6, 7, 7B: MY TEAM (DREAM TEAM 11V11), PLAYER STORE (TRANSFER MARKET), 50-STAR SPIN & PLAYER PACKS */}
        {(screen === 'my_team' ||
          screen === 'transfer_market' ||
          screen === 'packs' ||
          screen === 'spin_roulette') && (
          <MyTeamAndMarket
            initialSection={screen}
            coins={coins}
            userTeam={userTeam}
            userFormation={userFormation}
            userSquad={userSquad}
            unlockedPlayerIds={unlockedPlayerIds}
            captainId={captainId}
            preferredCelebration={preferredCelebration}
            onSelectTeam={setUserTeam}
            onSelectFormation={setUserFormation}
            onUpdateSquadOrder={setUserSquad}
            onSelectCaptain={setCaptainId}
            onSelectCelebration={setPreferredCelebration}
            onBuyPlayer={handleBuyPlayer}
            onOpenPack={handleOpenPack}
            onSpinRoulette={handleSpinRoulette}
            roomCode={friendRoomState.roomCode || hostJoinCode}
            friendRoomStatus={friendRoomState.statusLabel || 'Waiting for Opponent'}
            friendRoomMembersCount={Math.max(1, friendRoomState.members.length)}
            onPlayDreamTeamOnline={() => {
              setOnlineMatchFormat('11v11');
              navigateTo('online_match');
            }}
            onQuickMatchDreamTeamOnline={() => {
              setOnlineMatchFormat('11v11');
              FriendRoomService.joinMatchmakingQueue({
                username: profile.username,
                clubId: userTeam.id,
                clubName: userTeam.name,
                starPlayerId: userSquad[9]?.id,
                starPlayerName: userSquad[9]?.name || 'Mbappé',
                squadIds: userSquad.slice(0, 11).map((p) => p.id),
                formation: userFormation,
                matchFormat: '11v11',
              });
              navigateTo('online_match');
            }}
            onJoinDreamTeamRoomCode={(enteredCode) => {
              handleJoinFriendRoomOnly(enteredCode, '11v11');
            }}
            onPlayDreamTeamOffline={() => {
              handleLaunchMatch('quick_match', awayTeam);
            }}
            onTriggerPaymentCheckout={(item) => setCheckoutItem(item)}
          />
        )}

        {/* SCREEN 8, 9, 10: PROFILE, LEADERBOARD & SETTINGS */}
        {(screen === 'profile' || screen === 'leaderboard' || screen === 'settings') && (
          <ProfileLeaderboardSettings
            activeSection={screen}
            profile={profile}
            favoriteTeam={userTeam}
            bestPlayer={userSquad[0] || PLAYERS_DB[0]}
            onUpdateUsername={(username) => setProfile((prev) => ({ ...prev, username }))}
            graphicsQuality={graphicsQuality}
            onChangeGraphics={setGraphicsQuality}
            cameraMode={cameraMode}
            onChangeCamera={setCameraMode}
            controlScheme={controlScheme}
            onChangeControlScheme={setControlScheme}
            difficulty={difficulty}
            onChangeDifficulty={setDifficulty}
            mouseSensitivity={mouseSensitivity}
            onChangeMouseSens={setMouseSensitivity}
            cameraSensitivity={cameraSensitivity}
            onChangeCameraSens={setCameraSensitivity}
            keyBindings={keyBindings}
            onChangeKeyBindings={setKeyBindings}
            autoSwitchMode={autoSwitchMode}
            onChangeAutoSwitchMode={setAutoSwitchMode}
          />
        )}
      </main>

      {/* PRE-FIRST-MATCH CONTROL GUIDE MODAL (UX Requirement #37) */}
      {showPreMatchGuide && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111722] border border-[#10B981]/50 rounded-2xl max-w-lg w-full p-7 shadow-2xl">
            <div className="text-xs font-mono text-[#10B981] mb-1">
              READY FOR KICK-OFF · {userTeam.name.toUpperCase()} VS {awayTeam.name.toUpperCase()}
            </div>
            <h2 className="font-display text-2xl font-bold text-white mb-4">
              QUICK CONTROL GUIDE
            </h2>

            <div className="mb-4 p-3 rounded-xl bg-[#070A0E] border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-display font-bold text-white tracking-wider">
                  AUTO PLAYER SWITCH OPTION
                </span>
                <span className="text-[11px] font-mono text-[#10B981]">
                  {autoSwitchMode === 'auto'
                    ? 'AUTO (ALWAYS)'
                    : autoSwitchMode === 'air_balls'
                    ? 'AIR & LOOSE BALLS'
                    : 'MANUAL ONLY [Q]'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'auto', label: 'Auto Switch' },
                    { id: 'air_balls', label: 'Air Balls Only' },
                    { id: 'manual', label: 'Manual [Q]' },
                  ] as { id: AutoSwitchMode; label: string }[]
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      SoundEngine.playUIClick();
                      setAutoSwitchMode(opt.id);
                    }}
                    className={`py-2 px-2 rounded-lg text-xs font-display font-bold border transition-colors cursor-pointer ${
                      autoSwitchMode === opt.id
                        ? 'bg-[#10B981] text-[#070A0E] border-[#10B981]'
                        : 'bg-[#111722] text-slate-300 border-white/10 hover:border-white/30'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 font-mono text-xs text-slate-200 mb-6">
              <div className="p-2.5 bg-[#070A0E] border border-white/10 rounded-lg">
                <span className="text-[#10B981] font-bold">P</span> = Pass
              </div>
              <div className="p-2.5 bg-[#070A0E] border border-white/10 rounded-lg">
                <span className="text-[#10B981] font-bold">S</span> = Shoot (Hold Power)
              </div>
              <div className="p-2.5 bg-[#070A0E] border border-[#F59E0B]/40 rounded-lg">
                <span className="text-[#F59E0B] font-bold">B / F</span> = Rainbow Flick Skill
              </div>
              <div className="p-2.5 bg-[#070A0E] border border-white/10 rounded-lg">
                <span className="text-[#38BDF8] font-bold">K</span> = Skill Move
              </div>
              <div className="p-2.5 bg-[#070A0E] border border-white/10 rounded-lg">
                <span className="text-[#F59E0B] font-bold">C</span> = Curve Shot
              </div>
              <div className="p-2.5 bg-[#070A0E] border border-white/10 rounded-lg">
                <span className="text-white font-bold">I</span> = Sprint
              </div>
              <div className="p-2.5 bg-[#070A0E] border border-white/10 rounded-lg">
                <span className="text-white font-bold">R</span> = Press
              </div>
              <div className="p-2.5 bg-[#070A0E] border border-white/10 rounded-lg">
                <span className="text-white font-bold">D / T</span> = Defend / Tackle
              </div>
              <div className="p-2.5 bg-[#070A0E] border border-white/10 rounded-lg">
                <span className="text-white font-bold">W / O / A / D</span> = Movement
              </div>
              <div className="p-2.5 bg-[#070A0E] border border-white/10 rounded-lg">
                <span className="text-white font-bold">Mouse</span> = Aim / Camera
              </div>
              <div className="p-2.5 bg-[#070A0E] border border-white/10 rounded-lg">
                <span className="text-white font-bold">V</span> = Goalkeeper Save
              </div>
            </div>

            <button
              onClick={handleConfirmGuideAndStart}
              className="w-full py-3.5 bg-[#10B981] hover:bg-[#059669] text-[#070A0E] font-display font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              ENTER STADIUM & KICK OFF
            </button>
          </div>
        </div>
      )}

      {/* GLOBAL MODALS: GOOGLE SIGN-IN, INCOMING FRIEND INVITE, AND APP PAYMENT CHECKOUT */}
      <GoogleAuthModal
        isOpen={showGoogleAuthModal}
        currentUsername={profile.username}
        currentClubId={userTeam.id}
        unlockedPlayerIds={unlockedPlayerIds}
        account={account}
        onClose={() => setShowGoogleAuthModal(false)}
        onSuccessAuth={(acc, token) => {
          setAuthToken(token);
          localStorage.setItem('fe_auth_token', token);
          applyServerUserProgress(acc);
        }}
        onLogout={() => {
          setAccount(null);
          setAuthToken(null);
          localStorage.removeItem('fe_auth_token');
          localStorage.removeItem('fe_user_email');
          localStorage.removeItem('fe_saved_account');
        }}
      />

      <IncomingInviteModal
        invite={incomingInvite}
        onAccept={(inv) => {
          SoundEngine.playUIClick();
          FriendRoomService.respondToInvite(inv.lobbyId, true, inv);
          setIncomingInvite(null);
          setScreen('online_match');
        }}
        onDecline={(inv) => {
          SoundEngine.playUIClick();
          FriendRoomService.respondToInvite(inv.lobbyId, false, inv);
          setIncomingInvite(null);
        }}
      />

      <PaymentCheckoutModal
        item={checkoutItem}
        username={profile.username}
        authToken={authToken}
        onClose={() => setCheckoutItem(null)}
        onPaymentSuccess={({ coinsAdded, playerUnlocked }) => {
          if (coinsAdded > 0) {
            setCoins((c) => c + coinsAdded);
          }
          if (playerUnlocked && !unlockedPlayerIds.includes(playerUnlocked.id)) {
            setUnlockedPlayerIds((prev) => [...prev, playerUnlocked.id]);
            setUserSquad((prev) => {
              const copy = [...prev];
              const displaced = copy[9];
              copy[9] = playerUnlocked;
              if (displaced && !copy.some((p) => p.id === displaced.id)) {
                copy.push(displaced);
              }
              return copy;
            });
          }
        }}
      />

      {inspectedOpponentSquad && (
        <OpponentSquadPopup
          isOpen={Boolean(inspectedOpponentSquad)}
          onClose={() => setInspectedOpponentSquad(null)}
          opponent={inspectedOpponentSquad}
        />
      )}

      {/* QUIET FOOTER */}
      <footer className="border-t border-white/10 py-6 px-6 bg-[#070A0E] text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            FOOTBALL ELITE: WORLD OF CHAMPIONS · Original 3D Browser Football Platform
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => navigateTo('profile')} className="hover:text-white transition-colors">
              Profile
            </button>
            <button onClick={() => navigateTo('leaderboard')} className="hover:text-white transition-colors">
              Leaderboard
            </button>
            <button onClick={() => navigateTo('settings')} className="hover:text-white transition-colors">
              Controls & Settings
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
