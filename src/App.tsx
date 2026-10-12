/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  Check,
  ChevronRight,
  CloudRain,
  Coins,
  Eye,
  Moon,
  Play,
  Settings as SettingsIcon,
  Shield,
  Sliders,
  Sparkles,
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
  PlayerRarity,
  PLAYERS_DB,
  STADIUMS,
  StadiumInfo,
  TeamData,
  TEAMS_DB,
  UpgradeCardItem,
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
  PaymentCheckoutItem,
  PaymentCheckoutModal,
} from './components/OnlineMatchAndAuthModal';
import { useAppIcon } from './data/appIconStore';
import heroStadiumImg from './assets/images/hero_stadium_backdrop_1791305638088.jpg';

type ActiveScreen =
  | 'welcome'
  | 'home'
  | 'play_setup'
  | 'in_match'
  | 'world_cup'
  | 'tournaments'
  | 'my_team'
  | 'transfer_market'
  | 'upgrades'
  | 'packs'
  | 'spin_roulette'
  | 'profile'
  | 'leaderboard'
  | 'settings';

interface SavedPlayerBoost {
  speed?: number;
  shooting?: number;
  shotPower?: number;
  shotAccuracy?: number;
  passing?: number;
  dribbling?: number;
  ballControl?: number;
  physical?: number;
  stamina?: number;
  defending?: number;
  rating?: number;
  weakFoot?: number;
  skillMoves?: number;
  rarity?: PlayerRarity;
}

export default function App() {
  const { iconUrl } = useAppIcon();
  const [screen, setScreen] = useState<ActiveScreen>(() => {
    const isSignedIn =
      Boolean(localStorage.getItem('fe_auth_token_v3')) ||
      Boolean(localStorage.getItem('fe_saved_account_v3'));
    return isSignedIn ? 'home' : 'welcome';
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

  // Persistent Player Upgrades & Boosts
  const [playerUpgrades, setPlayerUpgrades] = useState<Record<string, SavedPlayerBoost>>(() => {
    try {
      const raw = localStorage.getItem('fe_player_upgrades_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {
      // ignore parse errors
    }
    return {};
  });

  const applyBoostToPlayer = (p: FootballPlayer, boosts: Record<string, SavedPlayerBoost>): FootballPlayer => {
    const b = boosts[p.id];
    if (!b) return p;
    const clampStat = (val: number) => Math.min(99, Math.max(40, val));
    return {
      ...p,
      rating: clampStat(p.rating + (b.rating || 0)),
      rarity: b.rarity || p.rarity,
      weakFoot: Math.min(5, Math.max(1, (p.weakFoot ?? 4) + (b.weakFoot || 0))) as 1 | 2 | 3 | 4 | 5,
      skillMoves: Math.min(5, Math.max(1, (p.skillMoves ?? 4) + (b.skillMoves || 0))) as 1 | 2 | 3 | 4 | 5,
      stats: {
        ...p.stats,
        speed: clampStat(p.stats.speed + (b.speed || 0)),
        shooting: clampStat(p.stats.shooting + (b.shooting || 0)),
        shotPower: clampStat((p.stats.shotPower ?? p.stats.shooting) + (b.shotPower || 0)),
        shotAccuracy: clampStat((p.stats.shotAccuracy ?? p.stats.shooting) + (b.shotAccuracy || 0)),
        passing: clampStat(p.stats.passing + (b.passing || 0)),
        dribbling: clampStat(p.stats.dribbling + (b.dribbling || 0)),
        ballControl: clampStat((p.stats.ballControl ?? p.stats.dribbling) + (b.ballControl || 0)),
        physical: clampStat(p.stats.physical + (b.physical || 0)),
        stamina: clampStat((p.stats.stamina ?? p.stats.physical) + (b.stamina || 0)),
        defending: clampStat(p.stats.defending + (b.defending || 0)),
      },
    };
  };

  const allPlayers = useMemo(
    () => PLAYERS_DB.map((p) => applyBoostToPlayer(p, playerUpgrades)),
    [playerUpgrades]
  );

  const boostedUserSquad = useMemo(
    () => userSquad.map((p) => applyBoostToPlayer(p, playerUpgrades)),
    [userSquad, playerUpgrades]
  );

  // Pre-match Control Guide Modal
  const [showPreMatchGuide, setShowPreMatchGuide] = useState<boolean>(false);
  const [hasSeenControlGuide, setHasSeenControlGuide] = useState<boolean>(false);
  const [inspectedOpponentSquad, setInspectedOpponentSquad] = useState<OpponentSquadInfo | null>(
    null
  );

  // Google Auth & App Payment State
  const [authToken, setAuthToken] = useState<string | null>(() =>
    localStorage.getItem('fe_auth_token_v3')
  );
  const [account, setAccount] = useState<AuthenticatedAccount | null>(() => {
    try {
      const raw = localStorage.getItem('fe_saved_account_v3');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [showGoogleAuthModal, setShowGoogleAuthModal] = useState<boolean>(false);
  const [checkoutItem, setCheckoutItem] = useState<PaymentCheckoutItem | null>(null);

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
    localStorage.setItem('fe_saved_account_v3', JSON.stringify(user));
    if (user.email) {
      localStorage.setItem('fe_user_email_v3', user.email);
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
    enteredEmail?: string,
    authenticatedUser?: AuthenticatedAccount,
    token?: string
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

    if (authenticatedUser && token) {
      setAuthToken(token);
      localStorage.setItem('fe_auth_token_v3', token);
      applyServerUserProgress(authenticatedUser);
      setScreen('home');
      return;
    }

    const resolvedEmail =
      enteredEmail && enteredEmail.includes('@')
        ? enteredEmail.trim().toLowerCase()
        : `${enteredUsername.toLowerCase().replace(/[^a-z0-9]/g, '') || 'player'}@gmail.com`;

    const fallbackAccount: AuthenticatedAccount = {
      id: `usr_${Date.now()}`,
      googleId: `google_${enteredUsername}`,
      email: resolvedEmail,
      username: enteredUsername,
      avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(enteredUsername)}`,
      coins,
      favouriteClubId: chosenClub.id,
      unlockedPlayerIds,
      mmrRating: 1500,
    };
    applyServerUserProgress(fallbackAccount);

    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'google',
        email: resolvedEmail,
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
          localStorage.setItem('fe_auth_token_v3', data.token);
          applyServerUserProgress(data.user);
        }
      })
      .catch(() => {});

    setScreen('home');
  };

  const handleUpdateUsername = (nextUsername: string) => {
    const clean = nextUsername.trim().slice(0, 32);
    if (!clean) return;
    localStorage.setItem('fe_username', clean);
    setProfile((prev) => ({ ...prev, username: clean }));
    if (account) {
      const updatedAcc = { ...account, username: clean };
      setAccount(updatedAcc);
      localStorage.setItem('fe_saved_account_v3', JSON.stringify(updatedAcc));
    }
  };

  const navigateTo = (target: ActiveScreen) => {
    SoundEngine.playUIClick();
    setScreen(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLaunchMatch = (
    modeOverride?: MatchModeId,
    opponentOverride?: TeamData,
    tourneyLabel?: string
  ) => {
    SoundEngine.playUIClick();
    if (modeOverride) setSelectedMode(modeOverride);
    if (opponentOverride) setAwayTeam(opponentOverride);
    setActiveTournamentLabel(tourneyLabel);

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

  // Restore Account session if token or saved email exists (keeps user permanently logged in)
  useEffect(() => {
    const savedEmail = localStorage.getItem('fe_user_email_v3') || account?.email || '';
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
      localStorage.setItem('fe_player_upgrades_v1', JSON.stringify(playerUpgrades));
    } catch {
      // ignore storage quota errors
    }

    const savedEmail = localStorage.getItem('fe_user_email_v3') || account?.email || '';
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
    playerUpgrades,
  ]);

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
  };

  const handleApplyUpgradeCard = (card: UpgradeCardItem, targetPlayerId: string) => {
    if (coins < card.price) return;
    SoundEngine.playPackOpen();
    setCoins((c) => Math.max(0, c - card.price));
    setPlayerUpgrades((prev) => {
      const curr = prev[targetPlayerId] || {};
      return {
        ...prev,
        [targetPlayerId]: {
          speed: (curr.speed || 0) + (card.statBoosts.speed || 0),
          shooting: (curr.shooting || 0) + (card.statBoosts.shooting || 0),
          shotPower: (curr.shotPower || 0) + (card.statBoosts.shotPower || 0),
          shotAccuracy: (curr.shotAccuracy || 0) + (card.statBoosts.shotAccuracy || 0),
          passing: (curr.passing || 0) + (card.statBoosts.passing || 0),
          dribbling: (curr.dribbling || 0) + (card.statBoosts.dribbling || 0),
          ballControl: (curr.ballControl || 0) + (card.statBoosts.ballControl || 0),
          physical: (curr.physical || 0) + (card.statBoosts.physical || 0),
          stamina: (curr.stamina || 0) + (card.statBoosts.stamina || 0),
          defending: (curr.defending || 0) + (card.statBoosts.defending || 0),
          rating: (curr.rating || 0) + (card.statBoosts.rating || 0),
          weakFoot: (curr.weakFoot || 0) + (card.statBoosts.weakFoot || 0),
          skillMoves: (curr.skillMoves || 0) + (card.statBoosts.skillMoves || 0),
          rarity: card.upgradeToSpecialEdition ? 'Special Edition' : curr.rarity,
        },
      };
    });
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
          onContinueAsGuest={() => setScreen('home')}
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
            localStorage.setItem('fe_auth_token_v3', token);
            applyServerUserProgress(acc);
            setScreen('home');
          }}
          onLogout={() => {
            setAccount(null);
            setAuthToken(null);
            localStorage.removeItem('fe_auth_token_v3');
            localStorage.removeItem('fe_user_email_v3');
            localStorage.removeItem('fe_saved_account_v3');
          }}
        />
      </>
    );
  }

  // Fullscreen 3D Match Viewport when playing
  if (screen === 'in_match') {
    return (
      <MatchViewport3D
        username={profile.username}
        homeTeam={userTeam}
        awayTeam={awayTeam}
        homeSquad={boostedUserSquad}
        homeFormation={userFormation}
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
        tournamentStageLabel={activeTournamentLabel}
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
        onExitToMenu={() => {
          navigateTo('home');
        }}
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
            onClick={() => navigateTo('transfer_market')}
            className={`hover:text-white transition-colors whitespace-nowrap cursor-pointer ${
              screen === 'transfer_market' || screen === 'packs'
                ? 'text-[#F59E0B] font-semibold'
                : ''
            }`}
          >
            Player Market ({allPlayers.length})
          </button>
          <button
            onClick={() => navigateTo('upgrades')}
            className={`hover:text-white transition-colors whitespace-nowrap cursor-pointer ${
              screen === 'upgrades' ? 'text-[#EC4899] font-semibold' : ''
            }`}
          >
            Cards & Upgrades
          </button>
          <button
            onClick={() => navigateTo('spin_roulette')}
            className={`hover:text-white transition-colors whitespace-nowrap cursor-pointer ${
              screen === 'spin_roulette' ? 'text-[#F59E0B] font-semibold' : 'text-[#F59E0B]'
            }`}
          >
            Spin / Draw
          </button>
          <button
            onClick={() => navigateTo('my_team')}
            className={`hover:text-white transition-colors whitespace-nowrap cursor-pointer ${
              screen === 'my_team' ? 'text-[#10B981] font-semibold' : ''
            }`}
          >
            Dream Team (11v11)
          </button>
          <button
            onClick={() => navigateTo('world_cup')}
            className={`hover:text-white transition-colors whitespace-nowrap cursor-pointer ${
              screen === 'world_cup' || screen === 'tournaments'
                ? 'text-[#F59E0B] font-semibold'
                : ''
            }`}
          >
            World Cup
          </button>
        </nav>

        {/* Zone 3: 2 Primary Actions (Sign-In + PLAY MATCH) */}
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111722] border border-[#F59E0B]/30 text-xs font-mono font-bold text-[#F59E0B]">
            <Coins className="w-3.5 h-3.5" />
            {coins.toLocaleString()}
          </div>
          <button
            onClick={() => setShowGoogleAuthModal(true)}
            className="px-3.5 py-2 text-xs font-display font-bold text-white bg-[#111722] border border-white/15 rounded-lg hover:border-[#10B981] transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer"
          >
            <span className="w-4 h-4 rounded-full bg-white text-[#070A0E] flex items-center justify-center text-[10px] font-bold">
              G
            </span>
            {account ? `@${account.username} ✓` : 'Sign In'}
          </button>
          <button
            onClick={() => navigateTo('play_setup')}
            className="px-4 py-2 text-xs font-display font-bold text-[#070A0E] bg-[#10B981] rounded-lg hover:bg-[#059669] transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            PLAY MATCH
          </button>
        </div>
      </header>

      {/* Mobile-Friendly Quick Nav Strip */}
      <div className="lg:hidden flex items-center gap-2 overflow-x-auto px-4 py-2.5 bg-[#111722] border-b border-white/10 text-xs font-display font-bold">
        <button
          onClick={() => navigateTo('play_setup')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
            screen === 'play_setup' ? 'bg-[#10B981] text-[#070A0E]' : 'text-slate-300'
          }`}
        >
          Play Match
        </button>
        <button
          onClick={() => navigateTo('transfer_market')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
            screen === 'transfer_market' ? 'bg-[#F59E0B] text-[#070A0E]' : 'text-slate-300'
          }`}
        >
          Player Market ({allPlayers.length})
        </button>
        <button
          onClick={() => navigateTo('upgrades')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
            screen === 'upgrades' ? 'bg-[#EC4899] text-white' : 'text-[#EC4899]'
          }`}
        >
          Cards & Upgrades
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
                    Experience authentic 3D stadium football with realistic player faces, precision passing & through balls, Magnus finesse shots, overhead volleys, player upgrade cards, and a full Coin Transfer Market.
                  </p>

                  {/* Primary Hero CTA Grid (Neatly arranged 4-column layout) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <button
                      onClick={() => navigateTo('play_setup')}
                      className="col-span-1 sm:col-span-2 py-3.5 px-5 bg-[#10B981] hover:bg-[#059669] text-[#070A0E] font-display font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg whitespace-nowrap cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      PLAY MATCH NOW
                    </button>

                    <button
                      onClick={() => navigateTo('world_cup')}
                      className="col-span-1 sm:col-span-2 py-3.5 px-5 bg-[#F59E0B] hover:bg-[#D97706] text-[#070A0E] font-display font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg whitespace-nowrap cursor-pointer"
                    >
                      <Trophy className="w-4 h-4" />
                      WORLD CUP TOURNAMENT
                    </button>

                    <button
                      onClick={() => handleLaunchMatch('quick_match')}
                      className="py-3 px-4 bg-[#111722]/90 hover:bg-[#192231] border border-white/15 rounded-xl font-display font-semibold text-xs text-white transition-colors whitespace-nowrap cursor-pointer"
                    >
                      QUICK MATCH
                    </button>

                    <button
                      onClick={() => navigateTo('transfer_market')}
                      className="py-3 px-4 bg-[#111722]/90 hover:bg-[#192231] border border-[#F59E0B]/40 rounded-xl font-display font-semibold text-xs text-[#F59E0B] transition-colors whitespace-nowrap cursor-pointer"
                    >
                      PLAYER MARKET ({allPlayers.length})
                    </button>

                    <button
                      onClick={() => navigateTo('upgrades')}
                      className="py-3 px-4 bg-[#111722]/90 hover:bg-[#192231] border border-[#EC4899]/50 rounded-xl font-display font-semibold text-xs text-[#EC4899] transition-colors whitespace-nowrap cursor-pointer"
                    >
                      CARDS & UPGRADES
                    </button>

                    <button
                      onClick={() => navigateTo('my_team')}
                      className="py-3 px-4 bg-[#111722]/90 hover:bg-[#192231] border border-[#10B981]/50 rounded-xl font-display font-semibold text-xs text-[#10B981] transition-colors whitespace-nowrap cursor-pointer"
                    >
                      DREAM TEAM (11V11)
                    </button>

                    <button
                      onClick={() => navigateTo('spin_roulette')}
                      className="py-3 px-4 bg-gradient-to-r from-[#F59E0B]/20 to-[#F59E0B]/10 hover:from-[#F59E0B] hover:to-[#D97706] border border-[#F59E0B] rounded-xl font-display font-bold text-xs text-[#F59E0B] hover:text-[#070A0E] transition-all whitespace-nowrap cursor-pointer"
                    >
                      SPIN / DRAW CARDS
                    </button>

                    <button
                      onClick={() => navigateTo('tournaments')}
                      className="py-3 px-4 bg-[#111722]/90 hover:bg-[#192231] border border-white/15 rounded-xl font-display font-semibold text-xs text-white transition-colors whitespace-nowrap cursor-pointer"
                    >
                      TOURNAMENTS
                    </button>

                    <button
                      onClick={() => navigateTo('packs')}
                      className="py-3 px-4 bg-[#111722]/90 hover:bg-[#192231] border border-white/15 rounded-xl font-display font-semibold text-xs text-[#F59E0B] transition-colors whitespace-nowrap cursor-pointer"
                    >
                      PLAYER PACKS
                    </button>

                    <button
                      onClick={() => navigateTo('profile')}
                      className="py-3 px-4 bg-[#111722]/90 hover:bg-[#192231] border border-white/15 rounded-xl font-display font-semibold text-xs text-[#38BDF8] transition-colors whitespace-nowrap cursor-pointer"
                    >
                      PLAYER PROFILE
                    </button>
                  </div>
                </div>

                {/* Right 5 Cols: DREAM SQUAD & MARKET SHOWCASE CARD */}
                <div className="lg:col-span-5">
                  <div className="bg-[#111722]/95 backdrop-blur-xl border border-white/15 rounded-2xl p-6 space-y-4 shadow-2xl">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
                      <div>
                        <div className="text-xs font-mono text-[#F59E0B] flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
                          ACTIVE CLUB & LEAD SUPERSTAR
                        </div>
                        <h2 className="font-display text-xl font-bold text-white">
                          {userTeam.name} ({userFormation})
                        </h2>
                      </div>
                      <div className="px-3 py-1.5 rounded-lg bg-[#070A0E] border border-[#F59E0B]/40 font-mono text-xs font-bold text-[#F59E0B] flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5" />
                        {coins.toLocaleString()} Coins
                      </div>
                    </div>

                    {/* Active Lead Superstar Preview */}
                    {(() => {
                      const star = boostedUserSquad[9] || allPlayers[0];
                      return (
                        <div className="p-4 rounded-xl bg-[#070A0E] border border-white/10 flex items-center gap-4">
                          <PlayerPhotoAvatar
                            player={star}
                            className="w-20 h-20 rounded-xl border border-[#F59E0B]/50 shrink-0 shadow-lg"
                            showPositionBadge={true}
                            showRatingBadge={true}
                          />
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-display text-lg font-bold text-white truncate">
                                {star.name}
                              </span>
                              <span className="text-[11px] font-mono font-bold text-[#10B981]">
                                {star.rarity.toUpperCase()}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400">
                              {star.nationality} · {star.club} · #{star.number}
                            </div>
                            <div className="grid grid-cols-4 gap-1.5 pt-1 font-mono text-[11px]">
                              <div className="bg-[#111722] rounded px-2 py-1 text-center">
                                <span className="text-slate-400 block text-[9px]">SPD</span>
                                <span className="text-[#10B981] font-bold">{star.stats.speed}</span>
                              </div>
                              <div className="bg-[#111722] rounded px-2 py-1 text-center">
                                <span className="text-slate-400 block text-[9px]">SHO</span>
                                <span className="text-[#F59E0B] font-bold">{star.stats.shooting}</span>
                              </div>
                              <div className="bg-[#111722] rounded px-2 py-1 text-center">
                                <span className="text-slate-400 block text-[9px]">PAS</span>
                                <span className="text-[#38BDF8] font-bold">{star.stats.passing}</span>
                              </div>
                              <div className="bg-[#111722] rounded px-2 py-1 text-center">
                                <span className="text-slate-400 block text-[9px]">DRI</span>
                                <span className="text-white font-bold">{star.stats.dribbling}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Quick Squad & Market Actions */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        onClick={() => navigateTo('transfer_market')}
                        className="py-2.5 px-3 bg-[#F59E0B]/15 hover:bg-[#F59E0B] text-[#F59E0B] hover:text-[#070A0E] border border-[#F59E0B]/40 rounded-xl font-display font-bold text-xs transition-colors cursor-pointer"
                      >
                        BUY PLAYERS IN MARKET
                      </button>
                      <button
                        onClick={() => navigateTo('upgrades')}
                        className="py-2.5 px-3 bg-[#EC4899]/15 hover:bg-[#EC4899] text-[#EC4899] hover:text-white border border-[#EC4899]/40 rounded-xl font-display font-bold text-xs transition-colors cursor-pointer"
                      >
                        UPGRADE PLAYER STATS
                      </button>
                    </div>

                    <button
                      onClick={() => handleLaunchMatch('quick_match', awayTeam)}
                      className="w-full py-3.5 bg-[#10B981] hover:bg-[#059669] text-[#070A0E] font-display font-bold text-xs sm:text-sm rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      KICK OFF 3D STADIUM MATCH ({userTeam.shortName} VS {awayTeam.shortName})
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* ALL PLAYABLE MATCH MODES SECTION */}
            <section className="max-w-7xl mx-auto px-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
                <div>
                  <div className="text-xs font-mono text-[#10B981] mb-1">
                    {MATCH_MODES.length} PLAYABLE 3D GAMEPLAY MODES
                  </div>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
                    SELECT YOUR MATCH MODE
                  </h2>
                </div>
                <div className="text-xs text-slate-400">
                  Click any mode to jump directly into 3D stadium gameplay
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
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
                      className="w-full py-2.5 bg-white/10 hover:bg-[#10B981] text-white hover:text-[#070A0E] font-display font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
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
                    Control your footballers with responsive keyboard movement while using the mouse to aim short passes, through balls, lofted crosses, power shots, finesse curlers, chip shots, and overhead volleys.
                  </p>
                  <div className="pt-2">
                    <button
                      onClick={() => navigateTo('settings')}
                      className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-xs font-display font-bold text-white rounded-lg transition-colors cursor-pointer"
                    >
                      CUSTOMIZE KEYBINDINGS & CAMERA
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
                  {[
                    { key: 'P / E', action: 'Short & Through Pass', sub: 'Pinpoint Pass / Through Ball' },
                    { key: 'S', action: 'Normal & Power Shot', sub: 'Hold for Power Bar Timing' },
                    { key: 'C / L', action: 'Finesse & Chip Shot', sub: 'Magnus Curl / Lob Keeper' },
                    { key: 'B', action: 'Volley & Overhead Kick', sub: 'Acrobatic Aerial Finish' },
                    { key: 'F / K', action: 'Rainbow Flick & Skills', sub: 'Stepovers, Roulette, Fake Shot' },
                    { key: 'O', action: 'Lofted Cross / Header', sub: 'Whipped Cross Into The Box' },
                    { key: 'I', action: 'Sprint Boost', sub: 'Explosive Pace Breakaway' },
                    { key: 'W / A / S / D', action: '360° Movement', sub: 'Natural Stride & Turning' },
                    { key: 'V / Q', action: 'GK Dive & Switch', sub: 'Manual GK Save / Switch Player' },
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
                            setInspectedOpponentSquad({
                              username: awayTeam.name,
                              clubName: awayTeam.name,
                              clubPrimaryColor: awayTeam.primaryColor,
                              clubSecondaryColor: awayTeam.secondaryColor,
                              formation: awayTeam.defaultFormation || '4-3-3',
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
                      {allPlayers.filter((p) => unlockedPlayerIds.includes(p.id) && p.position !== 'GK').map(
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
                    {allPlayers.some((p) => !unlockedPlayerIds.includes(p.id)) && (
                      <div>
                        <div className="text-xs font-mono text-[#F59E0B] font-bold mb-2">
                          UNLOCK FAMOUS WORLD CUP STARS WITH IN-GAME MONEY:
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {allPlayers.filter((p) => !unlockedPlayerIds.includes(p.id))
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

        {/* SCREEN 5, 6, 7, 7B: MY TEAM (DREAM TEAM 11V11), PLAYER MARKET, UPGRADES, 50-STAR SPIN & PLAYER PACKS */}
        {(screen === 'my_team' ||
          screen === 'transfer_market' ||
          screen === 'upgrades' ||
          screen === 'packs' ||
          screen === 'spin_roulette') && (
          <MyTeamAndMarket
            initialSection={screen}
            coins={coins}
            userTeam={userTeam}
            userFormation={userFormation}
            userSquad={boostedUserSquad}
            allPlayers={allPlayers}
            unlockedPlayerIds={unlockedPlayerIds}
            captainId={captainId}
            preferredCelebration={preferredCelebration}
            onSelectTeam={setUserTeam}
            onSelectFormation={setUserFormation}
            onUpdateSquadOrder={setUserSquad}
            onSelectCaptain={setCaptainId}
            onSelectCelebration={setPreferredCelebration}
            onBuyPlayer={handleBuyPlayer}
            onApplyUpgradeCard={handleApplyUpgradeCard}
            onOpenPack={handleOpenPack}
            onSpinRoulette={handleSpinRoulette}
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

      {/* GLOBAL MODALS: GOOGLE SIGN-IN AND APP PAYMENT CHECKOUT */}
      <GoogleAuthModal
        isOpen={showGoogleAuthModal}
        currentUsername={profile.username}
        currentClubId={userTeam.id}
        unlockedPlayerIds={unlockedPlayerIds}
        account={account}
        onClose={() => setShowGoogleAuthModal(false)}
        onSuccessAuth={(acc, token) => {
          setAuthToken(token);
          localStorage.setItem('fe_auth_token_v3', token);
          applyServerUserProgress(acc);
        }}
        onLogout={() => {
          setAccount(null);
          setAuthToken(null);
          localStorage.removeItem('fe_auth_token_v3');
          localStorage.removeItem('fe_user_email_v3');
          localStorage.removeItem('fe_saved_account_v3');
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
