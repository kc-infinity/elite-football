import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Eye,
  EyeOff,
  FastForward,
  Gamepad2,
  Play,
  RotateCcw,
  Shield,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react';
import { OpponentSquadInfo, OpponentSquadPopup } from './OpponentSquadPopup';
import { PlayerPhotoAvatar } from './PlayerPhotoAvatar';
import {
  CelebrationType,
  FootballPlayer,
  FormationName,
  MatchModeId,
  PLAYERS_DB,
  StadiumInfo,
  TeamData,
  WeatherType,
} from '../data/gameDatabase';
import {
  AutoSwitchMode,
  CameraMode,
  ControlScheme,
  DifficultyLevel,
  FootballEngine3D,
  KeyBindings,
  MatchHUDState,
  PracticeDrill,
} from '../engine/FootballEngine3D';
import { FriendRoomService } from '../engine/FriendRoomService';
import { SoundEngine } from '../engine/SoundEngine';

export interface OnlineMatchViewportInfo {
  isOnline: boolean;
  role: 'host' | 'guest';
  roomCode: string;
  hostUsername: string;
  guestUsername: string;
  matchFormat?: '11v11' | '1v1';
  myTeamSide?: 'home' | 'away';
  myAssignedSlotIdx?: number;
  lockToAssignedPlayer?: boolean;
  opponentStarPlayerId?: string;
  opponentSquadIds?: string[];
  opponentFormation?: FormationName;
}

interface MatchViewport3DProps {
  username?: string;
  homeTeam: TeamData;
  awayTeam: TeamData;
  homeSquad: FootballPlayer[];
  homeFormation: FormationName;
  stadium: StadiumInfo;
  weather: WeatherType;
  mode: MatchModeId;
  difficulty: DifficultyLevel;
  initialCamera: CameraMode;
  controlScheme: ControlScheme;
  graphicsQuality: 'Low' | 'Medium' | 'High' | 'Ultra';
  preferredCelebration: CelebrationType;
  keyBindings: KeyBindings;
  mouseSensitivity: number;
  cameraSensitivity: number;
  autoSwitchMode?: AutoSwitchMode;
  onChangeAutoSwitchMode?: (mode: AutoSwitchMode) => void;
  joinCodeLabel?: string;
  tournamentStageLabel?: string;
  onlineMatchInfo?: OnlineMatchViewportInfo;
  onMatchComplete: (result: {
    homeScore: number;
    awayScore: number;
    stats: MatchHUDState['stats'];
    coinsEarned: number;
  }) => void;
  onNextMatch?: () => void;
  onExitToMenu: () => void;
  onReturnToOnlineLobby?: () => void;
  onInviteFriendsAgain?: (opponentUsername?: string) => void;
}

const LOADING_TIPS = [
  'Press P to pass accurately toward your mouse cursor or movement direction.',
  'Hold S to charge the Shot Power meter for thunderous strikes.',
  'Hold C to unleash a Magnus Curve Shot that bends around goalkeepers.',
  'Press K while dribbling to execute Skill Moves like Roulette, Elastico, and Rainbow Flick.',
  'Use the mouse to aim passes and shots with pinpoint precision.',
  'Press V when controlling the Goalkeeper to perform diving saves.',
  'Hold I to Sprint past defenders and R to command teammate pressing.',
];

const CAMERA_MODES: CameraMode[] = ['Broadcast', 'Player', 'Action', 'Goalkeeper', 'Free'];
const PRACTICE_DRILLS: PracticeDrill[] = [
  'Free Play',
  'Passing',
  'Shooting',
  'Dribbling & Skills',
  'Free Kicks',
  'Penalties',
  'Goalkeeper Saves',
];

export const MatchViewport3D: React.FC<MatchViewport3DProps> = ({
  username = 'YOU',
  homeTeam,
  awayTeam,
  homeSquad,
  homeFormation,
  stadium,
  weather,
  mode,
  difficulty,
  initialCamera,
  controlScheme,
  graphicsQuality,
  preferredCelebration,
  keyBindings,
  mouseSensitivity,
  cameraSensitivity,
  autoSwitchMode = 'auto',
  onChangeAutoSwitchMode,
  joinCodeLabel,
  tournamentStageLabel,
  onlineMatchInfo,
  onMatchComplete,
  onNextMatch,
  onExitToMenu,
  onReturnToOnlineLobby,
  onInviteFriendsAgain,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<FootballEngine3D | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [tipIndex, setTipIndex] = useState(0);
  const [showControlGuideModal, setShowControlGuideModal] = useState(false);
  const [showOpponentSquadPopup, setShowOpponentSquadPopup] = useState(false);
  const [deviceFormFactor, setDeviceFormFactor] = useState<'mobile' | 'tablet' | 'desktop'>(() => {
    if (typeof window === 'undefined') return 'desktop';
    const w = window.innerWidth;
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (w <= 767) return 'mobile';
    if (w <= 1180 || (isTouch && w <= 1366)) return 'tablet';
    return 'desktop';
  });

  const [showTouchControls, setShowTouchControls] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('fe_show_touch_controls');
    if (saved !== null) {
      return saved === 'true';
    }
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    return window.innerWidth < 1180 || isTouch;
  });

  const toggleTouchControls = (visible?: boolean) => {
    setShowTouchControls((prev) => {
      const next = visible !== undefined ? visible : !prev;
      try {
        localStorage.setItem('fe_show_touch_controls', String(next));
      } catch {}
      SoundEngine.playUIClick();
      return next;
    });
  };

  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      if (w <= 767) setDeviceFormFactor('mobile');
      else if (w <= 1180 || (isTouch && w <= 1366)) setDeviceFormFactor('tablet');
      else setDeviceFormFactor('desktop');

      const saved = localStorage.getItem('fe_show_touch_controls');
      if (saved === null) {
        setShowTouchControls(w < 1180 || isTouch);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const [touchKnob, setTouchKnob] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [touchSprinting, setTouchSprinting] = useState<boolean>(false);
  const joystickCenterRef = useRef<{ x: number; y: number } | null>(null);
  const [muted, setMuted] = useState(SoundEngine.settings.muted);
  const [matchRecorded, setMatchRecorded] = useState(false);
  const [showPostMatchStats, setShowPostMatchStats] = useState(true);
  const [replayKey, setReplayKey] = useState(0);
  const [opponentDisconnected, setOpponentDisconnected] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [latencyMs, setLatencyMs] = useState(18);

  const [hud, setHud] = useState<MatchHUDState>({
    homeScore: 0,
    awayScore: 0,
    matchClockSeconds: 0,
    controlledPlayerName: homeSquad[9]?.name || 'Matheus Silva',
    controlledPlayerRole: 'ST',
    controlledPlayerStamina: 100,
    controlledPlayerRating: 94,
    shotPower: 0,
    shotTypeLabel: '',
    activeSkillBanner: '',
    commentaryBanner: '',
    activeSetPiece: 'none',
    setPieceTeam: 'home',
    setPieceLabel: '',
    isCelebrating: false,
    celebrationScorer: '',
    isReplaying: false,
    replayReason: '',
    isMatchOver: false,
    cameraMode: initialCamera,
    manualGKActive: mode === 'gk_challenge',
    autoPlay: false,
    autoSwitchMode,
    practiceDrill: 'Free Play',
    challengeScore: 0,
    challengeAttempts: 0,
    radarDots: [],
    ballRadar: { x: 0, z: 0 },
    stats: {
      homePossession: 50,
      awayPossession: 50,
      homeShots: 0,
      awayShots: 0,
      homeShotsOnTarget: 0,
      awayShotsOnTarget: 0,
      homePasses: 0,
      awayPasses: 0,
      homePassesCompleted: 0,
      awayPassesCompleted: 0,
      homeTackles: 0,
      awayTackles: 0,
      homeSaves: 0,
      awaySaves: 0,
      homeCorners: 0,
      awayCorners: 0,
      homeFouls: 0,
      awayFouls: 0,
      homeOffsides: 0,
      awayOffsides: 0,
      homeYellowCards: 0,
      awayYellowCards: 0,
    },
  });

  // Loading screen timer
  useEffect(() => {
    setIsLoading(true);
    setTipIndex(Math.floor(Math.random() * LOADING_TIPS.length));
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1150);
    return () => clearTimeout(timer);
  }, [replayKey]);

  // Initialize 3D Engine
  useEffect(() => {
    if (isLoading || !containerRef.current) return;

    const awayStarPlayer = onlineMatchInfo?.opponentStarPlayerId
      ? PLAYERS_DB.find((p) => p.id === onlineMatchInfo.opponentStarPlayerId)
      : undefined;

    const awaySquad =
      onlineMatchInfo?.opponentSquadIds && onlineMatchInfo.opponentSquadIds.length >= 11
        ? onlineMatchInfo.opponentSquadIds.map(
            (id, idx) =>
              PLAYERS_DB.find((p) => p.id === id) || PLAYERS_DB[(idx + 6) % PLAYERS_DB.length]
          )
        : undefined;

    const engine = new FootballEngine3D({
      container: containerRef.current,
      homeTeam,
      awayTeam,
      homeSquad,
      homeFormation,
      stadium,
      weather,
      mode,
      difficulty,
      cameraMode: hud.cameraMode,
      controlScheme,
      graphicsQuality,
      preferredCelebration,
      keyBindings,
      mouseSensitivity,
      cameraSensitivity,
      autoSwitchMode: hud.autoSwitchMode,
      onlineConfig: onlineMatchInfo?.isOnline
        ? {
            isOnline: true,
            role: onlineMatchInfo.role,
            roomCode: onlineMatchInfo.roomCode,
            hostUsername: onlineMatchInfo.hostUsername,
            guestUsername: onlineMatchInfo.guestUsername,
            matchFormat: onlineMatchInfo.matchFormat || '11v11',
            myTeamSide: onlineMatchInfo.myTeamSide,
            myAssignedSlotIdx: onlineMatchInfo.myAssignedSlotIdx,
            lockToAssignedPlayer: onlineMatchInfo.lockToAssignedPlayer,
            awayStarPlayer,
            awaySquad,
            awayFormation: onlineMatchInfo.opponentFormation,
          }
        : undefined,
      onHUDUpdate: (nextHud) => {
        setHud(nextHud);
      },
    });

    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [isLoading, replayKey]);

  // Listen for Opponent Disconnected / Reconnected events & update latency during Online 1v1
  useEffect(() => {
    if (!onlineMatchInfo?.isOnline) return;

    const unsubDisc = FriendRoomService.onOpponentDisconnected((_code, discUsername) => {
      setOpponentDisconnected(discUsername || 'Opponent');
      engineRef.current?.setPaused(true);
    });

    const unsubReconn = FriendRoomService.onOpponentReconnected(() => {
      setOpponentDisconnected(null);
      setReconnecting(false);
      engineRef.current?.setPaused(false);
    });

    const pingTimer = window.setInterval(() => {
      setLatencyMs(FriendRoomService.getLatencyMs());
    }, 1500);

    return () => {
      unsubDisc();
      unsubReconn();
      window.clearInterval(pingTimer);
    };
  }, [onlineMatchInfo?.isOnline]);

  // Allow toggling the compact Opponent Squad popup anytime with Tab without interrupting gameplay
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        SoundEngine.playUIClick();
        setShowOpponentSquadPopup((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const opponentSquadInfo: OpponentSquadInfo =
    onlineMatchInfo?.isOnline && onlineMatchInfo.role === 'guest'
      ? {
          username: onlineMatchInfo.hostUsername || homeTeam.name,
          clubName: homeTeam.name,
          clubPrimaryColor: homeTeam.primaryColor,
          clubSecondaryColor: homeTeam.secondaryColor,
          formation: homeFormation,
          squad: homeSquad,
          matchFormat: onlineMatchInfo.matchFormat || '11v11',
        }
      : {
          username: onlineMatchInfo?.isOnline
            ? onlineMatchInfo.guestUsername || awayTeam.name
            : awayTeam.name,
          clubName: awayTeam.name,
          clubPrimaryColor: awayTeam.primaryColor,
          clubSecondaryColor: awayTeam.secondaryColor,
          formation: onlineMatchInfo?.opponentFormation || awayTeam.defaultFormation || '4-3-3',
          squadIds: onlineMatchInfo?.opponentSquadIds,
          starPlayerId: onlineMatchInfo?.opponentStarPlayerId,
          matchFormat: onlineMatchInfo?.matchFormat || '11v11',
        };

  // Notify parent when match finishes
  useEffect(() => {
    if (hud.isMatchOver && !matchRecorded) {
      setMatchRecorded(true);
      // Realistic performance-based rewards calibrated for market prices
      const won = hud.homeScore > hud.awayScore;
      const draw = hud.homeScore === hud.awayScore;
      const baseReward = won ? 45000 : draw ? 20000 : 10000;
      const goalBonus = hud.homeScore * 12000;
      const cleanSheetBonus = hud.awayScore === 0 ? 25000 : 0;
      const hatTrickBonus = hud.homeScore >= 3 ? 35000 : 0;
      const totalEarned = baseReward + goalBonus + cleanSheetBonus + hatTrickBonus;

      onMatchComplete({
        homeScore: hud.homeScore,
        awayScore: hud.awayScore,
        stats: hud.stats,
        coinsEarned: totalEarned,
      });
    }
  }, [hud.isMatchOver, matchRecorded]);

  const formatMatchTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remSec = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(remSec).padStart(2, '0')}`;
  };

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    SoundEngine.updateSettings({ muted: next });
  };

  const handleCameraSwitch = (cam: CameraMode) => {
    SoundEngine.playUIClick();
    engineRef.current?.setCameraMode(cam);
    setHud((prev) => ({ ...prev, cameraMode: cam }));
  };

  const handleSetAutoSwitch = (nextMode: AutoSwitchMode) => {
    SoundEngine.playUIClick();
    engineRef.current?.setAutoSwitchMode(nextMode);
    setHud((prev) => ({ ...prev, autoSwitchMode: nextMode }));
    onChangeAutoSwitchMode?.(nextMode);
  };

  const handleCycleAutoSwitch = () => {
    SoundEngine.playUIClick();
    const order: AutoSwitchMode[] = ['auto', 'air_balls', 'manual'];
    const current = hud.autoSwitchMode || autoSwitchMode || 'auto';
    const next = order[(order.indexOf(current) + 1) % order.length];
    handleSetAutoSwitch(next);
  };

  const handleDrillSwitch = (drill: PracticeDrill) => {
    SoundEngine.playUIClick();
    engineRef.current?.setPracticeDrill(drill);
    setHud((prev) => ({ ...prev, practiceDrill: drill }));
  };

  const handlePlayAgain = () => {
    SoundEngine.playUIClick();
    setMatchRecorded(false);
    setReplayKey((k) => k + 1);
  };

  const passAccuracyHome =
    hud.stats.homePasses > 0
      ? Math.min(
          99,
          Math.max(
            75,
            Math.round(
              ((hud.stats.homePassesCompleted ?? Math.round(hud.stats.homePasses * 0.88)) /
                Math.max(1, hud.stats.homePasses)) *
                100
            )
          )
        )
      : 92;
  const passAccuracyAway =
    hud.stats.awayPasses > 0
      ? Math.min(
          98,
          Math.max(
            70,
            Math.round(
              ((hud.stats.awayPassesCompleted ?? Math.round(hud.stats.awayPasses * 0.85)) /
                Math.max(1, hud.stats.awayPasses)) *
                100
            )
          )
        )
      : 88;

  return (
    <div className="relative w-full h-screen bg-[#070A0E] overflow-hidden select-none">
      {/* 3D WebGL Canvas Mount */}
      <div ref={containerRef} className="w-full h-full cursor-crosshair" />

      {/* STYLISH LOADING SCREEN */}
      {isLoading && (
        <div className="absolute inset-0 z-50 bg-[#070A0E] flex flex-col items-center justify-between p-10">
          <div className="w-full flex items-center justify-between border-b border-white/10 pb-4">
            <span className="font-display text-lg font-bold tracking-wider text-white">
              FOOTBALL ELITE
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {stadium.name} · {weather} · {graphicsQuality} Graphics
            </span>
          </div>

          <div className="my-auto flex flex-col items-center text-center max-w-xl">
            <div className="w-20 h-20 rounded-full border-2 border-[#10B981] border-t-transparent animate-spin flex items-center justify-center mb-6">
              <div className="w-12 h-12 rounded-full bg-[#10B981]/20 flex items-center justify-center">
                <Zap className="w-6 h-6 text-[#10B981]" />
              </div>
            </div>
            <h1 className="font-display text-4xl font-bold tracking-tight text-white mb-2">
              LOADING MATCH...
            </h1>
            <p className="text-sm text-slate-300 mb-6">
              {homeTeam.name} vs {awayTeam.name}
              {tournamentStageLabel ? ` · ${tournamentStageLabel}` : ''}
              {joinCodeLabel ? ` · Lobby ${joinCodeLabel}` : ''}
            </p>
            <div className="w-full bg-[#111722] border border-white/10 rounded-lg p-4">
              <p className="text-xs text-[#10B981] font-semibold mb-1">PRO GAMEPLAY TIP</p>
              <p className="text-sm text-slate-200">{LOADING_TIPS[tipIndex]}</p>
            </div>
          </div>

          <div className="w-full flex items-center justify-between text-xs text-slate-400 border-t border-white/10 pt-4 font-mono">
            <span>OFFICIAL MATCH PREVIEW</span>
            <span className="text-[#10B981] font-bold">11V11 TOURNAMENT EDITION</span>
          </div>
        </div>
      )}

      {/* TOP BROADCAST SCOREBUG & CONTROLS OVERLAY (UPPER PLACE SCOREBOARD) */}
      {!isLoading && (
        <div className="absolute top-4 left-4 right-4 z-50 flex flex-wrap items-start justify-between gap-4 pointer-events-none">
          {/* Scorebug */}
          <div
            className={`pointer-events-auto flex items-center bg-[#070A0E]/90 backdrop-blur-md border rounded-xl overflow-hidden shadow-2xl transition-all ${
              hud.isMatchOver
                ? 'border-[#F59E0B] shadow-[0_0_35px_rgba(245,158,11,0.45)] ring-1 ring-[#F59E0B]'
                : 'border-white/15'
            }`}
          >
            <div
              className={`px-3 py-2 font-display font-bold text-xs tracking-wider flex items-center gap-1.5 ${
                hud.isMatchOver
                  ? 'bg-[#F59E0B] text-[#070A0E]'
                  : 'bg-[#10B981] text-[#070A0E]'
              }`}
            >
              {onlineMatchInfo?.isOnline && <Wifi className="w-3.5 h-3.5" />}
              {hud.isMatchOver
                ? 'FULL TIME · RESULT'
                : tournamentStageLabel ||
                  (onlineMatchInfo?.isOnline
                    ? `ONLINE ${onlineMatchInfo.matchFormat === '1v1' ? '1V1' : '11V11 DREAM TEAM'} · ${onlineMatchInfo.roomCode}`
                    : joinCodeLabel
                    ? `${joinCodeLabel}`
                    : mode.replace('_', ' ').toUpperCase())}
            </div>
            <div className="flex items-center gap-4 px-4 py-2">
              <div className="flex flex-col items-start">
                <span
                  className={`text-[10px] font-mono font-bold tracking-wider leading-none mb-0.5 ${
                    !onlineMatchInfo?.isOnline || onlineMatchInfo.role === 'host'
                      ? 'text-[#10B981]'
                      : 'text-[#38BDF8]'
                  }`}
                >
                  {onlineMatchInfo?.isOnline
                    ? onlineMatchInfo.role === 'host'
                      ? `YOU (${onlineMatchInfo.hostUsername})`
                      : `HOST (${onlineMatchInfo.hostUsername})`
                    : `YOU (${username})`}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-sm inline-block"
                    style={{ backgroundColor: homeTeam.primaryColor }}
                  />
                  <span className="font-display font-bold text-sm text-white tracking-wide">
                    {homeTeam.shortName}
                  </span>
                </div>
              </div>
              <div
                className={`px-3.5 py-0.5 rounded font-mono font-bold text-base tabular-nums ${
                  hud.isMatchOver
                    ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/50'
                    : 'bg-white/10 text-white'
                }`}
              >
                {hud.homeScore} - {hud.awayScore}
              </div>
              <button
                type="button"
                onClick={() => {
                  SoundEngine.playUIClick();
                  setShowOpponentSquadPopup((v) => !v);
                }}
                className="flex flex-col items-end group cursor-pointer"
                title="Click to View Opponent Squad & Starting XI (Tab)"
              >
                <span
                  className={`text-[10px] font-mono font-bold tracking-wider leading-none mb-0.5 flex items-center gap-1 ${
                    onlineMatchInfo?.isOnline && onlineMatchInfo.role === 'guest'
                      ? 'text-[#10B981]'
                      : 'text-slate-400 group-hover:text-[#38BDF8]'
                  }`}
                >
                  {onlineMatchInfo?.isOnline
                    ? onlineMatchInfo.role === 'guest'
                      ? `YOU (${onlineMatchInfo.guestUsername})`
                      : `OPPONENT (${onlineMatchInfo.guestUsername})`
                    : 'OPPONENT'}
                  <span className="px-1 py-0.2 rounded bg-white/10 text-[8px] text-[#38BDF8] font-mono">
                    XI
                  </span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-sm text-white tracking-wide group-hover:text-[#38BDF8] transition-colors">
                    {awayTeam.shortName}
                  </span>
                  <span
                    className="w-3 h-3 rounded-sm inline-block"
                    style={{ backgroundColor: awayTeam.primaryColor }}
                  />
                </div>
              </button>
            </div>
            <div
              className={`px-3.5 py-2 border-l border-white/10 font-mono text-sm tabular-nums flex items-center gap-2.5 ${
                hud.isMatchOver
                  ? 'text-[#F59E0B] font-bold bg-[#F59E0B]/15'
                  : 'text-[#10B981]'
              }`}
            >
              <span>
                {mode === 'practice'
                  ? 'TRAINING'
                  : hud.isMatchOver
                  ? 'FT 90:00 (TIME ELAPSED)'
                  : formatMatchTime(hud.matchClockSeconds)}
              </span>
              {onlineMatchInfo?.isOnline && (
                <span className="text-[10px] text-slate-400 border-l border-white/10 pl-2">
                  {latencyMs}ms
                </span>
              )}
            </div>
          </div>

          {/* Challenge Score Counter (For Practice / GK / Skill / Free Kick modes) */}
          {(mode === 'practice' ||
            mode === 'gk_challenge' ||
            mode === 'skill_challenge' ||
            mode === 'free_kick' ||
            mode === 'penalty_shootout') && (
            <div className="pointer-events-auto bg-[#070A0E]/85 backdrop-blur-md border border-white/15 rounded-lg px-4 py-2 flex items-center gap-4">
              <div>
                <div className="text-[11px] text-slate-400">CHALLENGE PTS</div>
                <div className="font-mono font-bold text-sm text-[#F59E0B] tabular-nums">
                  {hud.challengeScore.toLocaleString()}
                </div>
              </div>
              <div className="h-6 w-px bg-white/10" />
              <div>
                <div className="text-[11px] text-slate-400">ATTEMPTS</div>
                <div className="font-mono font-bold text-sm text-white tabular-nums">
                  {hud.challengeAttempts}
                </div>
              </div>
            </div>
          )}

          {/* Top-Right Camera Switcher & Streamlined Broadcast Quick Actions */}
          <div className="pointer-events-auto flex items-center gap-2">
            {/* Camera Selector */}
            <div className="flex items-center bg-[#070A0E]/90 backdrop-blur-md border border-white/15 rounded-xl p-1 shadow-lg">
              <Camera className="w-3.5 h-3.5 text-slate-400 ml-2 mr-1" />
              {(['Broadcast', 'Player', 'Action'] as CameraMode[]).map((cam) => (
                <button
                  key={cam}
                  onClick={() => handleCameraSwitch(cam)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    hud.cameraMode === cam
                      ? 'bg-[#10B981] text-[#070A0E]'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {cam}
                </button>
              ))}
            </div>

            {/* Auto Play Pill */}
            <button
              type="button"
              onClick={() => {
                SoundEngine.playUIClick();
                engineRef.current?.toggleAutoPlay();
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer shadow-lg ${
                hud.autoPlay
                  ? 'bg-emerald-500 text-[#070A0E] border-emerald-400 font-bold'
                  : 'bg-[#070A0E]/90 text-slate-300 border-white/15 hover:border-white/30'
              }`}
              title="Toggle Auto Play"
            >
              <Zap className="w-3.5 h-3.5" />
              {hud.autoPlay ? 'AUTO: ON' : 'AUTO'}
            </button>

            {/* Instant Replay */}
            <button
              onClick={() => engineRef.current?.triggerInstantReplay('INSTANT REPLAY')}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#070A0E]/90 text-slate-200 border border-white/15 hover:border-white/30 transition-colors whitespace-nowrap flex items-center gap-1.5 shadow-lg"
              title="Watch Replay"
            >
              <Eye className="w-3.5 h-3.5 text-[#38BDF8]" />
              Replay
            </button>

            {/* Opponent Starting XI Modal */}
            <button
              type="button"
              onClick={() => {
                SoundEngine.playUIClick();
                setShowOpponentSquadPopup((v) => !v);
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#070A0E]/90 text-[#38BDF8] border border-[#38BDF8]/40 hover:border-[#38BDF8] transition-colors whitespace-nowrap flex items-center gap-1.5 shadow-lg"
              title="View Opponent Lineup"
            >
              <Users className="w-3.5 h-3.5" />
              Lineups
            </button>

            {/* Sound Mute */}
            <button
              onClick={handleToggleMute}
              className="p-2 rounded-xl bg-[#070A0E]/90 text-slate-200 border border-white/15 hover:border-white/30 transition-colors shadow-lg cursor-pointer"
              aria-label="Toggle Audio Mute"
            >
              {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-[#10B981]" />}
            </button>

            {/* Option to Show / Hide Touch Controls */}
            <button
              type="button"
              onClick={() => toggleTouchControls()}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer shadow-lg ${
                showTouchControls
                  ? 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/50 font-bold'
                  : 'bg-[#070A0E]/90 text-slate-300 border-white/15 hover:border-white/30'
              }`}
              title={showTouchControls ? 'Hide on-screen touch joystick & buttons' : 'Show on-screen touch joystick & buttons'}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>TOUCH: {showTouchControls ? 'ON' : 'OFF'}</span>
            </button>

            {/* Toggle Full Time Stats / Inspect Scoreboard & Pitch */}
            {hud.isMatchOver && (
              <button
                type="button"
                onClick={() => {
                  SoundEngine.playUIClick();
                  setShowPostMatchStats((v) => !v);
                }}
                className="px-3 py-1.5 text-xs font-display font-bold rounded-xl bg-[#38BDF8]/20 hover:bg-[#38BDF8]/30 text-[#38BDF8] border border-[#38BDF8]/60 transition-colors whitespace-nowrap flex items-center gap-1.5 shadow-lg cursor-pointer"
                title="Toggle Match Stats"
              >
                <Eye className="w-3.5 h-3.5" />
                {showPostMatchStats ? 'Pitch' : 'Stats'}
              </button>
            )}

            {/* Match Exit / Pause */}
            <button
              onClick={onExitToMenu}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500 hover:text-white transition-colors shadow-lg cursor-pointer"
              title="Leave Match"
            >
              Exit
            </button>
          </div>
        </div>
      )}

      {/* PRACTICE DRILL BAR (Only in Practice Mode) */}
      {!isLoading && mode === 'practice' && (
        <div className="absolute top-18 left-4 z-20 flex flex-wrap items-center gap-1 bg-[#070A0E]/85 backdrop-blur-md border border-white/15 rounded-lg p-1">
          {PRACTICE_DRILLS.map((drill) => (
            <button
              key={drill}
              onClick={() => handleDrillSwitch(drill)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                hud.practiceDrill === drill
                  ? 'bg-[#38BDF8] text-[#070A0E] font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {drill}
            </button>
          ))}
        </div>
      )}

      {/* NON-INTERRUPTING COMPACT OPPONENT SQUAD POPUP (FLOATING HUD PANEL) */}
      <OpponentSquadPopup
        isOpen={showOpponentSquadPopup}
        onClose={() => setShowOpponentSquadPopup(false)}
        opponent={opponentSquadInfo}
        inMatchFloating={true}
      />

      {/* LIVE COMMENTARY, SET-PIECE (THROW-IN / CORNER / FREE KICK / OFFSIDE) & SKILL BANNER */}
      {!isLoading && (hud.commentaryBanner || hud.activeSkillBanner || hud.setPieceLabel) && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center gap-2 max-w-xl w-full px-4">
          {hud.setPieceLabel && (
            <div className="px-5 py-2 bg-[#10B981] text-[#070A0E] font-display font-bold text-xs sm:text-sm rounded-lg shadow-2xl tracking-wider text-center border border-white/30">
              {hud.setPieceLabel}
            </div>
          )}
          {hud.activeSkillBanner && (
            <div className="px-4 py-1.5 bg-[#F59E0B] text-[#070A0E] font-display font-bold text-sm rounded shadow-lg tracking-wider text-center">
              {hud.activeSkillBanner}
            </div>
          )}
          {hud.commentaryBanner && (
            <div className="px-5 py-2 bg-[#070A0E]/85 backdrop-blur-md border border-white/15 text-white font-medium text-xs md:text-sm rounded-lg shadow-xl text-center">
              {hud.commentaryBanner}
            </div>
          )}
        </div>
      )}

      {/* GOAL CELEBRATION BANNER WITH REPLAY & SKIP BUTTONS */}
      {!isLoading && hud.isCelebrating && (
        <div className="absolute inset-x-0 top-1/3 -translate-y-1/2 z-30 flex flex-col items-center pointer-events-auto">
          <div className="bg-[#070A0E]/90 backdrop-blur-xl border-y border-[#10B981]/50 w-full py-6 flex flex-col items-center text-center shadow-2xl">
            <div className="text-xs font-mono text-[#10B981] tracking-widest mb-1">
              STADIUM ERUPTS · {preferredCelebration.toUpperCase()}
            </div>
            <h2 className="font-display text-5xl md:text-6xl font-bold tracking-tight text-white mb-2">
              GOAL!
            </h2>
            <p className="text-base text-slate-200 font-medium mb-4">
              Scored by <span className="text-[#F59E0B] font-semibold">{hud.celebrationScorer}</span>
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => engineRef.current?.triggerInstantReplay('GOAL REPLAY')}
                className="px-5 py-2 bg-[#10B981] text-[#070A0E] font-display font-bold text-xs rounded-lg hover:bg-[#059669] transition-colors flex items-center gap-2"
              >
                <Play className="w-3.5 h-3.5" />
                REPLAY
              </button>
              <button
                onClick={() => engineRef.current?.skipReplay()}
                className="px-5 py-2 bg-white/10 text-white font-display font-bold text-xs rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2"
              >
                <FastForward className="w-3.5 h-3.5" />
                SKIP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INSTANT REPLAY OVERLAY */}
      {!isLoading && hud.isReplaying && (
        <div className="absolute inset-x-0 bottom-28 z-30 flex justify-center pointer-events-auto">
          <div className="bg-[#070A0E]/90 backdrop-blur-md border border-[#38BDF8]/50 rounded-xl px-6 py-3 flex items-center gap-6 shadow-2xl">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="font-display font-bold text-sm text-white tracking-wider">
                {hud.replayReason || 'ACTION REPLAY'}
              </span>
            </div>
            <button
              onClick={() => engineRef.current?.triggerInstantReplay(hud.replayReason)}
              className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-semibold text-white rounded-lg transition-colors"
            >
              REPLAY AGAIN
            </button>
            <button
              onClick={() => engineRef.current?.skipReplay()}
              className="px-4 py-1.5 bg-[#10B981] hover:bg-[#059669] text-xs font-bold text-[#070A0E] rounded-lg transition-colors"
            >
              SKIP
            </button>
          </div>
        </div>
      )}

      {/* BOTTOM HUD: PLAYER CARD, SHOT POWER, MINI-MAP RADAR, AND COMPACT KEY GUIDE */}
      {!isLoading && !hud.isMatchOver && (
        <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-col md:flex-row items-end justify-between gap-4 pointer-events-none">
          {/* Bottom-Left: Controlled Footballer & Shot Power Bar */}
          <div className="pointer-events-auto bg-[#070A0E]/85 backdrop-blur-md border border-white/15 rounded-xl p-3.5 w-76 shadow-2xl">
            <div className="flex items-center justify-between gap-2.5 mb-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <PlayerPhotoAvatar
                  player={
                    homeSquad.find((p) => p.name === hud.controlledPlayerName) ||
                    PLAYERS_DB.find((p) => p.name === hud.controlledPlayerName) ||
                    homeSquad[0] ||
                    PLAYERS_DB[0]
                  }
                  className="w-11 h-11 rounded-lg border border-[#10B981]/50"
                  showRatingBadge={true}
                />
                <div className="min-w-0">
                  <div className="text-[11px] font-mono text-[#10B981] font-bold">
                    YOU · {hud.controlledPlayerRole} · OVR {hud.controlledPlayerRating}
                  </div>
                  <div className="font-display font-bold text-sm text-white truncate">
                    {hud.controlledPlayerName}
                  </div>
                </div>
              </div>
              {hud.shotTypeLabel && (
                <span className="text-xs font-mono font-bold text-[#F59E0B] shrink-0">
                  {hud.shotTypeLabel}
                </span>
              )}
            </div>

            {/* Stamina Bar */}
            <div className="mb-2">
              <div className="flex justify-between text-[11px] text-slate-400 mb-1 font-mono">
                <span>STAMINA</span>
                <span>{hud.controlledPlayerStamina}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#10B981] transition-all duration-150"
                  style={{ width: `${hud.controlledPlayerStamina}%` }}
                />
              </div>
            </div>

            {/* Shot Power Gauge (Reveals when charging shot) */}
            {hud.shotPower > 0 && (
              <div className="mt-2 pt-2 border-t border-white/10 animate-fadeIn">
                <div className="flex justify-between text-[11px] text-slate-300 mb-1 font-mono">
                  <span className="font-bold text-rose-400">SHOT POWER</span>
                  <span className="font-bold text-[#F59E0B]">{Math.round(hud.shotPower)}%</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-75 ${
                      hud.shotPower > 80
                        ? 'bg-rose-500'
                        : hud.shotPower > 45
                        ? 'bg-[#F59E0B]'
                        : 'bg-[#10B981]'
                    }`}
                    style={{ width: `${hud.shotPower}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Bottom-Center: 2D Tactical Mini-Map Radar */}
          <div className="hidden sm:block pointer-events-auto bg-[#070A0E]/85 backdrop-blur-md border border-white/15 rounded-xl p-2 shadow-2xl">
            <div className="relative w-52 h-32 bg-[#0F4C28]/90 border border-white/30 rounded overflow-hidden">
              {/* Halfway line & center circle */}
              <div className="absolute inset-y-0 left-1/2 w-px bg-white/30" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border border-white/30" />
              {/* Dots */}
              {hud.radarDots.map((dot, idx) => (
                <div
                  key={idx}
                  className={`absolute w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                    dot.isControlled
                      ? ' ring-2 ring-white scale-125'
                      : ''
                  }`}
                  style={{
                    left: `${(dot.x + 1) * 50}%`,
                    top: `${(dot.z + 1) * 50}%`,
                    backgroundColor: dot.team === 'home' ? homeTeam.primaryColor : awayTeam.primaryColor,
                  }}
                />
              ))}
              {/* Ball dot */}
              <div
                className="absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow"
                style={{
                  left: `${(hud.ballRadar.x + 1) * 50}%`,
                  top: `${(hud.ballRadar.z + 1) * 50}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* MOBILE & TABLET RESPONSIVE TOUCH GAMEPAD OVERLAY */}
      {!isLoading && !hud.isMatchOver && showTouchControls && (
        <div className={`fixed inset-x-3 sm:inset-x-8 z-30 flex items-end justify-between pointer-events-none select-none ${
          deviceFormFactor === 'tablet' ? 'bottom-24 sm:bottom-20' : 'bottom-28 sm:bottom-24'
        }`}>
          {/* Left: Responsive 360° Virtual Joystick */}
          <div className="flex flex-col items-center">
            {/* Auto Play indicator above joystick */}
            {hud.autoPlay && (
              <div className="mb-2 px-3 py-1 rounded-full bg-[#10B981]/95 text-[#070A0E] font-mono text-[9px] sm:text-[10px] font-extrabold shadow-lg flex items-center gap-1.5 animate-pulse border border-white/40">
                <span className="w-1.5 h-1.5 rounded-full bg-[#070A0E]" />
                AI DRIVING · TOUCH TO OVERRIDE
              </div>
            )}
            <div
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                const rect = e.currentTarget.getBoundingClientRect();
                joystickCenterRef.current = {
                  x: rect.left + rect.width / 2,
                  y: rect.top + rect.height / 2,
                };
              }}
              onPointerMove={(e) => {
                if (!joystickCenterRef.current) return;
                const dx = e.clientX - joystickCenterRef.current.x;
                const dy = e.clientY - joystickCenterRef.current.y;
                const maxR = deviceFormFactor === 'tablet' ? 62 : 48;
                const dist = Math.hypot(dx, dy);
                const clampedDist = Math.min(maxR, dist);
                const angle = Math.atan2(dy, dx);
                const kx = Math.cos(angle) * clampedDist;
                const ky = Math.sin(angle) * clampedDist;
                setTouchKnob({ x: kx, y: ky });
                engineRef.current?.setTouchMovement(kx / maxR, ky / maxR, touchSprinting);
              }}
              onPointerUp={() => {
                joystickCenterRef.current = null;
                setTouchKnob({ x: 0, y: 0 });
                engineRef.current?.setTouchMovement(0, 0, false);
              }}
              onPointerCancel={() => {
                joystickCenterRef.current = null;
                setTouchKnob({ x: 0, y: 0 });
                engineRef.current?.setTouchMovement(0, 0, false);
              }}
              className={`pointer-events-auto rounded-full bg-[#070A0E]/85 border-2 border-emerald-400/40 backdrop-blur-md flex items-center justify-center relative touch-none shadow-2xl ring-1 ring-white/10 ${
                deviceFormFactor === 'tablet' ? 'w-44 h-44' : 'w-32 h-32 sm:w-36 sm:h-36'
              }`}
            >
              <div className="text-[9px] sm:text-[10px] font-mono font-bold text-white/50 absolute top-2.5">
                MOVE 360°
              </div>
              <div className={`rounded-full border border-white/10 absolute pointer-events-none ${
                deviceFormFactor === 'tablet' ? 'w-20 h-20' : 'w-14 h-14'
              }`} />
              <div
                className={`rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 border-2 border-white shadow-xl flex items-center justify-center transition-transform duration-75 ${
                  deviceFormFactor === 'tablet' ? 'w-18 h-18' : 'w-14 h-14'
                }`}
                style={{
                  transform: `translate(${touchKnob.x}px, ${touchKnob.y}px)`,
                }}
              >
                <div className="w-4 h-4 rounded-full bg-white/80 shadow-sm" />
              </div>
            </div>
          </div>

          {/* Right: eFootball Mobile & Tablet Action Cluster */}
          <div className="flex flex-col items-end gap-2.5">
            {/* Quick Actions Row above Radial Buttons: Hide Touch Controls & Auto Play */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleTouchControls(false)}
                className="pointer-events-auto px-3 py-1.5 rounded-full font-mono text-[10px] sm:text-xs font-bold border border-white/20 bg-[#070A0E]/85 hover:bg-black text-slate-300 hover:text-white flex items-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer"
                title="Hide on-screen touch joystick and buttons"
              >
                <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                <span>HIDE CONTROLS</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  SoundEngine.playUIClick();
                  engineRef.current?.toggleAutoPlay();
                }}
                className={`pointer-events-auto px-3.5 py-1.5 rounded-full font-mono text-[10px] sm:text-xs font-bold border flex items-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer ${
                  hud.autoPlay
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-[#070A0E] border-white ring-2 ring-emerald-300/60 shadow-emerald-500/25'
                    : 'bg-[#070A0E]/90 text-slate-300 border-white/25 hover:border-white/50'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    hud.autoPlay ? 'bg-[#070A0E] animate-ping' : 'bg-slate-500'
                  }`}
                />
                {hud.autoPlay ? 'AI PLAY: ON' : 'MANUAL'}
              </button>
            </div>

            {/* eFootball Radial Button Arc (Enlarged and well-spaced for tablets) */}
            <div className={`pointer-events-auto grid grid-cols-3 touch-none select-none ${
              deviceFormFactor === 'tablet' ? 'gap-4' : 'gap-2.5'
            }`}>
              {/* 1. THROUGH PASS */}
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  SoundEngine.playUIClick();
                  engineRef.current?.triggerMobileThroughBall();
                }}
                className={`rounded-full bg-gradient-to-br from-sky-400 to-sky-600 active:scale-90 text-slate-950 font-display font-extrabold shadow-2xl border-2 border-sky-300/80 flex flex-col items-center justify-center cursor-pointer transition-transform ${
                  deviceFormFactor === 'tablet'
                    ? 'w-20 h-20 text-xs sm:text-sm'
                    : 'w-16 h-16 text-[11px]'
                }`}
                title="Through Pass"
              >
                <span className="leading-none">THROUGH</span>
              </button>

              {/* 2. SKILL MOVE */}
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  SoundEngine.playUIClick();
                  engineRef.current?.triggerSkillMove();
                }}
                className={`rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 active:scale-90 text-white font-display font-extrabold shadow-2xl border-2 border-purple-300/80 flex flex-col items-center justify-center cursor-pointer transition-transform ${
                  deviceFormFactor === 'tablet'
                    ? 'w-20 h-20 text-xs sm:text-sm'
                    : 'w-16 h-16 text-[11px]'
                }`}
                title="Skill Move: Roulette / Rainbow / Elastico"
              >
                <span className="leading-none">SKILL</span>
              </button>

              {/* 3. SHOOT (Hold to charge power, release to fire strike) */}
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  engineRef.current?.startChargingShot('shoot');
                }}
                onPointerUp={(e) => {
                  e.preventDefault();
                  engineRef.current?.releaseChargedShot();
                }}
                onPointerLeave={() => {
                  if (hud.shotPower > 0) engineRef.current?.releaseChargedShot();
                }}
                className={`rounded-full bg-gradient-to-br from-rose-500 to-red-600 active:scale-90 text-white font-display font-extrabold shadow-2xl border-2 border-rose-300/80 flex flex-col items-center justify-center cursor-pointer transition-transform ring-2 ring-rose-500/30 ${
                  deviceFormFactor === 'tablet'
                    ? 'w-20 h-20 text-xs sm:text-sm'
                    : 'w-16 h-16 text-[12px]'
                }`}
                title="Hold to charge shot, release to shoot"
              >
                <span className="leading-none">SHOOT</span>
              </button>

              {/* 4. SWITCH PLAYER / TACKLE */}
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  SoundEngine.playUIClick();
                  engineRef.current?.triggerMobileSwitchOrTackle();
                }}
                className={`rounded-full bg-[#111722]/95 active:scale-90 text-sky-400 font-display font-extrabold shadow-2xl border-2 border-sky-500/50 flex flex-col items-center justify-center cursor-pointer transition-transform ${
                  deviceFormFactor === 'tablet'
                    ? 'w-20 h-20 text-xs sm:text-sm'
                    : 'w-16 h-16 text-[11px]'
                }`}
                title="Switch Player or Slide Tackle"
              >
                <span className="leading-none">SWITCH</span>
              </button>

              {/* 5. SPRINT (Toggle burst speed) */}
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  SoundEngine.playUIClick();
                  const next = !touchSprinting;
                  setTouchSprinting(next);
                  const maxR = deviceFormFactor === 'tablet' ? 62 : 48;
                  engineRef.current?.setTouchMovement(
                    touchKnob.x / maxR,
                    touchKnob.y / maxR,
                    next
                  );
                }}
                className={`rounded-full font-display font-extrabold shadow-2xl border-2 active:scale-90 flex flex-col items-center justify-center cursor-pointer transition-all ${
                  deviceFormFactor === 'tablet'
                    ? 'w-20 h-20 text-xs sm:text-sm'
                    : 'w-16 h-16 text-[11px]'
                } ${
                  touchSprinting
                    ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 border-white ring-4 ring-amber-400/50'
                    : 'bg-[#111722]/95 text-amber-400 border-amber-500/50'
                }`}
                title="Toggle Sprint"
              >
                <span className="leading-none">SPRINT</span>
                <span className={`text-[8px] font-mono mt-0.5 ${touchSprinting ? 'font-bold' : 'opacity-70'}`}>
                  {touchSprinting ? 'ON' : 'OFF'}
                </span>
              </button>

              {/* 6. PASS (Crisp Ground / Air Pass) */}
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  SoundEngine.playUIClick();
                  engineRef.current?.triggerMobilePass();
                }}
                className={`rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 active:scale-90 text-slate-950 font-display font-extrabold shadow-2xl border-2 border-emerald-300/80 flex flex-col items-center justify-center cursor-pointer transition-transform ring-2 ring-emerald-500/30 ${
                  deviceFormFactor === 'tablet'
                    ? 'w-20 h-20 text-xs sm:text-sm'
                    : 'w-16 h-16 text-[12px]'
                }`}
                title="Ground Pass"
              >
                <span className="leading-none">PASS</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING BUTTON TO RESTORE TOUCH CONTROLS WHEN HIDDEN */}
      {!isLoading && !hud.isMatchOver && !showTouchControls && (
        <div className="fixed bottom-6 right-6 z-30 pointer-events-auto animate-fadeIn">
          <button
            type="button"
            onClick={() => toggleTouchControls(true)}
            className="px-4 py-2.5 rounded-full bg-[#070A0E]/90 hover:bg-[#111722] text-[#10B981] border border-[#10B981]/50 shadow-[0_8px_25px_rgba(0,0,0,0.85)] backdrop-blur-md font-mono text-xs font-bold flex items-center gap-2 cursor-pointer transition-transform hover:scale-105 active:scale-95"
            title="Tap to restore on-screen virtual joystick and action buttons"
          >
            <Gamepad2 className="w-4 h-4 text-[#10B981]" />
            <span>SHOW TOUCH CONTROLS</span>
          </button>
        </div>
      )}

      {/* QUICK CONTROL GUIDE MODAL */}
      {showControlGuideModal && (
        <div className="absolute inset-0 z-40 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111722] border border-white/15 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <h3 className="font-display text-xl font-bold text-white">
                MATCH CONTROLS GUIDE
              </h3>
              <button
                onClick={() => setShowControlGuideModal(false)}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-xs text-white"
              >
                Close
              </button>
            </div>
            {/* Option to Show / Hide On-Screen Touch Controls */}
            <div className="mb-3 p-3 rounded-xl bg-[#070A0E] border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-xs font-display font-bold text-white tracking-wider block">
                  ON-SCREEN TOUCH CONTROLS
                </span>
                <span className="text-[11px] text-slate-400">
                  Virtual 360° joystick & action buttons on phones & tablets
                </span>
              </div>
              <button
                type="button"
                onClick={() => toggleTouchControls()}
                className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                  showTouchControls
                    ? 'bg-[#10B981] text-[#070A0E]'
                    : 'bg-white/10 text-slate-300 hover:text-white'
                }`}
              >
                {showTouchControls ? 'SHOWING (ON)' : 'HIDDEN (OFF)'}
              </button>
            </div>

            <div className="mb-4 p-3 rounded-xl bg-[#070A0E] border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-display font-bold text-white tracking-wider">
                  AUTO PLAYER SWITCH OPTION
                </span>
                <span className="text-[11px] font-mono text-[#10B981]">
                  {hud.autoSwitchMode === 'auto'
                    ? 'AUTO (ALWAYS)'
                    : hud.autoSwitchMode === 'air_balls'
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
                    onClick={() => handleSetAutoSwitch(opt.id)}
                    className={`py-2 px-2 rounded-lg text-xs font-display font-bold border transition-colors cursor-pointer ${
                      hud.autoSwitchMode === opt.id
                        ? 'bg-[#10B981] text-[#070A0E] border-[#10B981]'
                        : 'bg-[#111722] text-slate-300 border-white/10 hover:border-white/30'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs font-mono text-slate-200 mb-6">
              <div className="p-2.5 bg-[#10B981]/20 border-2 border-[#10B981] rounded-lg text-[#10B981] font-bold">
                PLAY CODE: S = SHOOT (Hold Power / Tap to Strike)
              </div>
              <div className="p-2.5 bg-white/5 rounded">P = Accurate Teammate Pass</div>
              <div className="p-2.5 bg-[#10B981]/15 border border-[#10B981]/40 rounded text-[#10B981] font-bold">
                B = Bicycle Kick (Acrobatic Overhead Volley)
              </div>
              <div className="p-2.5 bg-[#F59E0B]/15 border border-[#F59E0B]/40 rounded text-[#F59E0B] font-bold">
                F / Middle-Click = Rainbow Flick
              </div>
              <div className="p-2.5 bg-white/5 rounded">C = Curve Shot (Magnus)</div>
              <div className="p-2.5 bg-white/5 rounded">K = Skill Move</div>
              <div className="p-2.5 bg-white/5 rounded">I = Sprint</div>
              <div className="p-2.5 bg-white/5 rounded">R = Team Press</div>
              <div className="p-2.5 bg-white/5 rounded">W / O / A / D = Move</div>
              <div className="p-2.5 bg-white/5 rounded">D or T = Defend / Tackle</div>
              <div className="p-2.5 bg-white/5 rounded">U = Through Ball · X = Cross</div>
              <div className="p-2.5 bg-white/5 rounded">Q = Switch · V = GK Save</div>
            </div>
            <button
              onClick={() => setShowControlGuideModal(false)}
              className="w-full py-2.5 bg-[#10B981] text-[#070A0E] font-display font-bold text-sm rounded-lg"
            >
              RESUME MATCH
            </button>
          </div>
        </div>
      )}

      {/* FULL-TIME MATCH RESULT OVERLAY (POSITIONED BELOW UPPER PLACE SCOREBOARD) */}
      {!isLoading && hud.isMatchOver && showPostMatchStats && (
        <div className="absolute inset-0 z-40 bg-[#070A0E]/80 backdrop-blur-md flex flex-col items-center justify-start p-4 pt-24 sm:pt-28 pb-12 overflow-y-auto pointer-events-auto">
          <div className="bg-[#111722]/95 border-2 border-[#F59E0B]/70 rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative my-auto">
            {/* Top Scoreboard Notice & Minimize Button */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" />
                <span className="text-xs font-mono font-bold text-[#F59E0B] tracking-wider uppercase">
                  SCOREBOARD · MATCH TIME ELAPSED (90:00 FT)
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  SoundEngine.playUIClick();
                  setShowPostMatchStats(false);
                }}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-[#38BDF8] hover:text-white font-mono text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-white/15"
                title="Minimize stats to see upper scoreboard and pitch"
              >
                <Eye className="w-3.5 h-3.5 text-[#38BDF8]" />
                Hide Stats / View Upper Scoreboard
              </button>
            </div>

            <div className="text-center border-b border-white/10 pb-6 mb-6">
              <div className="text-xs font-mono text-[#10B981] tracking-widest mb-1">
                FULL TIME · FINAL SCORE
              </div>
              <div className="flex items-center justify-center gap-6 sm:gap-8 my-4">
                <div className="text-right">
                  <div className="font-display text-xl sm:text-2xl font-bold text-white">{homeTeam.name}</div>
                  <div className="text-xs text-slate-400">{homeFormation}</div>
                </div>
                <div className="px-5 sm:px-6 py-2.5 sm:py-3 bg-[#070A0E] border-2 border-[#F59E0B]/80 rounded-xl font-mono text-3xl sm:text-4xl font-bold text-[#F59E0B] tabular-nums shadow-inner">
                  {hud.homeScore} : {hud.awayScore}
                </div>
                <div className="text-left">
                  <div className="font-display text-xl sm:text-2xl font-bold text-white">{awayTeam.name}</div>
                  <div className="text-xs text-slate-400">{awayTeam.defaultFormation}</div>
                </div>
              </div>
              <div className="text-xs text-[#F59E0B] font-mono">
                Player of the Match: {homeSquad[9]?.name || 'Matheus Silva'} (Rating 9.4)
              </div>
            </div>

            {/* Match Statistics Table */}
            <div className="space-y-3 mb-8 font-mono text-xs">
              {[
                { label: 'Goals', home: hud.homeScore, away: hud.awayScore },
                { label: 'Possession', home: `${hud.stats.homePossession}%`, away: `${hud.stats.awayPossession}%` },
                { label: 'Shots', home: hud.stats.homeShots, away: hud.stats.awayShots },
                { label: 'Shots on Target', home: hud.stats.homeShotsOnTarget, away: hud.stats.awayShotsOnTarget },
                { label: 'Corner Kicks', home: hud.stats.homeCorners, away: hud.stats.awayCorners },
                { label: 'Pass Accuracy', home: `${passAccuracyHome}%`, away: `${passAccuracyAway}%` },
                { label: 'Tackles Won', home: hud.stats.homeTackles, away: hud.stats.awayTackles },
                { label: 'Fouls Committed', home: hud.stats.homeFouls, away: hud.stats.awayFouls },
                { label: 'Offsides', home: hud.stats.homeOffsides, away: hud.stats.awayOffsides },
                { label: 'Yellow Cards', home: hud.stats.homeYellowCards, away: hud.stats.awayYellowCards },
                { label: 'Goalkeeper Saves', home: hud.stats.homeSaves, away: hud.stats.awaySaves },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between py-2 border-b border-white/5 text-slate-200 tabular-nums"
                >
                  <span className="font-bold text-white w-16 text-left">{row.home}</span>
                  <span className="text-slate-400 font-sans">{row.label}</span>
                  <span className="font-bold text-white w-16 text-right">{row.away}</span>
                </div>
              ))}
            </div>

            {/* Post-Match Actions */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={handlePlayAgain}
                className="px-6 py-3 bg-white/10 hover:bg-white/15 text-white font-display font-bold text-sm rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                PLAY AGAIN
              </button>
              {onInviteFriendsAgain && (
                <button
                  onClick={() => {
                    SoundEngine.playUIClick();
                    const oppName =
                      onlineMatchInfo?.role === 'host'
                        ? onlineMatchInfo.guestUsername
                        : onlineMatchInfo?.hostUsername;
                    onInviteFriendsAgain(oppName);
                  }}
                  className="px-6 py-3 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-display font-bold text-sm rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  <Users className="w-4 h-4" />
                  INVITE FRIEND AGAIN
                </button>
              )}
              {onNextMatch && (
                <button
                  onClick={onNextMatch}
                  className="px-6 py-3 bg-[#10B981] hover:bg-[#059669] text-[#070A0E] font-display font-bold text-sm rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Trophy className="w-4 h-4" />
                  NEXT MATCH
                </button>
              )}
              <button
                onClick={onExitToMenu}
                className="px-6 py-3 bg-[#38BDF8] hover:bg-[#0284C7] text-[#070A0E] font-display font-bold text-sm rounded-lg transition-colors cursor-pointer"
              >
                RETURN TO HOME
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPACT FLOATING BAR WHEN STATS MODAL IS MINIMIZED (LEAVES UPPER SCOREBOARD AND 3D STADIUM FULLY VISIBLE) */}
      {!isLoading && hud.isMatchOver && !showPostMatchStats && (
        <div className="absolute inset-x-4 bottom-6 z-40 flex items-center justify-center pointer-events-auto animate-in fade-in slide-in-from-bottom duration-200">
          <div className="bg-[#111722]/95 backdrop-blur-xl border-2 border-[#F59E0B] rounded-2xl p-4 shadow-2xl flex flex-wrap items-center justify-between gap-4 max-w-2xl w-full">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-[#10B981] animate-pulse" />
              <div>
                <div className="text-[10px] font-mono text-[#F59E0B] font-bold uppercase tracking-wider">
                  FULL TIME RESULT (TIME ELAPSED)
                </div>
                <div className="font-display font-bold text-base text-white">
                  {homeTeam.shortName} <span className="text-[#10B981]">{hud.homeScore}</span> : <span className="text-[#38BDF8]">{hud.awayScore}</span> {awayTeam.shortName}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  SoundEngine.playUIClick();
                  setShowPostMatchStats(true);
                }}
                className="px-3.5 py-2 bg-[#38BDF8] hover:bg-[#0284C7] text-[#070A0E] font-display font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow"
              >
                <Eye className="w-3.5 h-3.5" />
                VIEW FULL STATS
              </button>
              <button
                onClick={handlePlayAgain}
                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-display font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                PLAY AGAIN
              </button>
              <button
                onClick={onExitToMenu}
                className="px-3.5 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 font-display font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                EXIT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OPPONENT DISCONNECTED MODAL (ONLINE MULTIPLAYER 1V1) */}
      {opponentDisconnected && !hud.isMatchOver && (
        <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-[#111722] border-2 border-rose-500/60 rounded-2xl max-w-md w-full p-7 text-center shadow-2xl space-y-5">
            <div className="w-14 h-14 rounded-full bg-rose-500/20 border border-rose-500 text-rose-400 flex items-center justify-center mx-auto">
              <WifiOff className="w-7 h-7" />
            </div>
            <div>
              <div className="text-xs font-mono text-rose-400 font-bold tracking-wider">
                ONLINE MULTIPLAYER CONNECTION ALERT
              </div>
              <h2 className="font-display text-3xl font-bold text-white mt-1">
                Opponent Disconnected
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                <span className="text-white font-semibold">@{opponentDisconnected}</span> has disconnected from Room{' '}
                <span className="font-mono text-[#F59E0B] font-bold">
                  {onlineMatchInfo?.roomCode || joinCodeLabel}
                </span>
                . You can wait to reconnect if they rejoin the room code, or return to the main menu.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={() => {
                  SoundEngine.playUIClick();
                  setReconnecting(true);
                  if (onlineMatchInfo?.roomCode) {
                    FriendRoomService.joinRoom({
                      roomCode: onlineMatchInfo.roomCode,
                      username,
                      clubId: homeTeam.id,
                      clubName: homeTeam.name,
                      starPlayerName: homeSquad[9]?.name || 'Mbappé',
                    });
                  }
                  setTimeout(() => setReconnecting(false), 2000);
                }}
                className="w-full py-3 px-4 bg-[#10B981] hover:bg-[#059669] text-[#070A0E] font-display font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className={`w-4 h-4 ${reconnecting ? 'animate-spin' : ''}`} />
                {reconnecting ? 'ATTEMPTING RECONNECT...' : 'RECONNECT TO ROOM'}
              </button>

              {onReturnToOnlineLobby && (
                <button
                  onClick={() => {
                    SoundEngine.playUIClick();
                    setOpponentDisconnected(null);
                    onReturnToOnlineLobby();
                  }}
                  className="w-full py-3 px-4 bg-white/10 hover:bg-white/15 text-white font-display font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  ONLINE VS LOBBY
                </button>
              )}

              <button
                onClick={() => {
                  SoundEngine.playUIClick();
                  setOpponentDisconnected(null);
                  onExitToMenu();
                }}
                className="w-full py-3 px-4 bg-[#38BDF8] hover:bg-[#0284C7] text-[#070A0E] font-display font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                RETURN TO MAIN MENU
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
