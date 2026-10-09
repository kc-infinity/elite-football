import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Eye,
  FastForward,
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
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<FootballEngine3D | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [tipIndex, setTipIndex] = useState(0);
  const [showControlGuideModal, setShowControlGuideModal] = useState(false);
  const [showOpponentSquadPopup, setShowOpponentSquadPopup] = useState(false);
  const [showTouchControls, setShowTouchControls] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 1024 || 'ontouchstart' in window;
  });
  const [touchKnob, setTouchKnob] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [touchSprinting, setTouchSprinting] = useState<boolean>(false);
  const joystickCenterRef = useRef<{ x: number; y: number } | null>(null);
  const [muted, setMuted] = useState(SoundEngine.settings.muted);
  const [matchRecorded, setMatchRecorded] = useState(false);
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
      const winBonus = hud.homeScore > hud.awayScore ? 3500 : hud.homeScore === hud.awayScore ? 1500 : 800;
      const goalBonus = hud.homeScore * 600;
      onMatchComplete({
        homeScore: hud.homeScore,
        awayScore: hud.awayScore,
        stats: hud.stats,
        coinsEarned: winBonus + goalBonus,
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

  const passAccuracyHome = Math.min(
    98,
    82 + Math.round((hud.stats.homePasses / Math.max(1, hud.stats.homePasses + 3)) * 14)
  );
  const passAccuracyAway = Math.min(
    96,
    79 + Math.round((hud.stats.awayPasses / Math.max(1, hud.stats.awayPasses + 4)) * 14)
  );

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

          <div className="w-full grid grid-cols-2 md:grid-cols-5 gap-3 text-xs text-slate-300 border-t border-white/10 pt-4 font-mono">
            <div>[P] Short Pass · [U] Through</div>
            <div>[S] Shoot · [C] Curve Shot</div>
            <div>[K] Skill Move · [I] Sprint</div>
            <div>[W/O/A/D] Move · [Mouse] Aim</div>
            <div>[D/T] Defend · [V] GK Save</div>
          </div>
        </div>
      )}

      {/* TOP BROADCAST SCOREBUG & CONTROLS OVERLAY */}
      {!isLoading && (
        <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-start justify-between gap-4 pointer-events-none">
          {/* Scorebug */}
          <div className="pointer-events-auto flex items-center bg-[#070A0E]/85 backdrop-blur-md border border-white/15 rounded-lg overflow-hidden shadow-2xl">
            <div className="px-3 py-2 bg-[#10B981] text-[#070A0E] font-display font-bold text-xs tracking-wider flex items-center gap-1.5">
              {onlineMatchInfo?.isOnline && <Wifi className="w-3.5 h-3.5" />}
              {tournamentStageLabel ||
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
              <div className="px-3 py-0.5 bg-white/10 rounded font-mono font-bold text-base text-white tabular-nums">
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
            <div className="px-3.5 py-2 border-l border-white/10 font-mono text-sm text-[#10B981] tabular-nums flex items-center gap-2.5">
              <span>{mode === 'practice' ? 'TRAINING' : formatMatchTime(hud.matchClockSeconds)}</span>
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

          {/* Top-Right Camera Switcher & Quick Actions */}
          <div className="pointer-events-auto flex flex-wrap items-center gap-2">
            {/* Camera Selector */}
            <div className="flex items-center bg-[#070A0E]/85 backdrop-blur-md border border-white/15 rounded-lg p-1">
              <Camera className="w-3.5 h-3.5 text-slate-400 ml-2 mr-1.5" />
              {CAMERA_MODES.map((cam) => (
                <button
                  key={cam}
                  onClick={() => handleCameraSwitch(cam)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                    hud.cameraMode === cam
                      ? 'bg-[#10B981] text-[#070A0E] font-semibold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {cam}
                </button>
              ))}
            </div>

            {/* View Opponent Squad (Starting XI & Formation) Without Interrupting Match */}
            <button
              type="button"
              onClick={() => {
                SoundEngine.playUIClick();
                setShowOpponentSquadPopup((v) => !v);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                showOpponentSquadPopup
                  ? 'bg-[#38BDF8] text-[#070A0E] border-[#38BDF8] font-semibold shadow-lg'
                  : 'bg-[#070A0E]/85 text-[#38BDF8] border-[#38BDF8]/40 hover:border-[#38BDF8]'
              }`}
              title="View Opponent Starting XI, Formation & Player Ratings (Shortcut: Tab)"
            >
              <Users className="w-3.5 h-3.5" />
              Opponent XI (Tab)
            </button>

            {/* Auto Player Switch Option Toggle */}
            <button
              type="button"
              onClick={handleCycleAutoSwitch}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                hud.autoSwitchMode === 'auto'
                  ? 'bg-[#10B981] text-[#070A0E] border-[#10B981] font-semibold'
                  : hud.autoSwitchMode === 'air_balls'
                  ? 'bg-[#38BDF8] text-[#070A0E] border-[#38BDF8] font-semibold'
                  : 'bg-[#070A0E]/85 text-slate-200 border-white/15 hover:border-white/30'
              }`}
              title="Click to cycle Auto Player Switch mode (Auto Always / Air Balls / Manual Q)"
            >
              <Zap className="w-3.5 h-3.5" />
              {hud.autoSwitchMode === 'auto'
                ? 'Auto Switch: ON'
                : hud.autoSwitchMode === 'air_balls'
                ? 'Auto Switch: Air Balls'
                : 'Auto Switch: Manual [Q]'}
            </button>

            {/* Manual GK Toggle */}
            <button
              onClick={() => engineRef.current?.toggleManualGK()}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                hud.manualGKActive
                  ? 'bg-[#F59E0B] text-[#070A0E] border-[#F59E0B] font-semibold'
                  : 'bg-[#070A0E]/85 text-slate-200 border-white/15 hover:border-white/30'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              {hud.manualGKActive ? 'GK Control: ON (V)' : 'Control GK (G)'}
            </button>

            {/* Instant Replay Button */}
            <button
              onClick={() => engineRef.current?.triggerInstantReplay('INSTANT REPLAY')}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#070A0E]/85 text-slate-200 border border-white/15 hover:border-white/30 transition-colors whitespace-nowrap flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5 text-[#38BDF8]" />
              Replay
            </button>

            {/* Controls Help Toggle */}
            <button
              onClick={() => setShowControlGuideModal((v) => !v)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#070A0E]/85 text-slate-200 border border-white/15 hover:border-white/30 transition-colors whitespace-nowrap"
            >
              Controls
            </button>

            {/* Touch Pad Toggle (Desktop & Mobile) */}
            <button
              onClick={() => setShowTouchControls((v) => !v)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                showTouchControls
                  ? 'bg-[#10B981] text-[#070A0E] border-[#10B981] font-semibold'
                  : 'bg-[#070A0E]/85 text-slate-200 border-white/15 hover:border-white/30'
              }`}
            >
              Touch Pad
            </button>

            {/* Audio Mute */}
            <button
              onClick={handleToggleMute}
              className="p-2 rounded-lg bg-[#070A0E]/85 text-slate-200 border border-white/15 hover:border-white/30 transition-colors"
              aria-label="Toggle Mute"
            >
              {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-[#10B981]" />}
            </button>

            {/* Exit Match */}
            <button
              onClick={onExitToMenu}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-500/20 text-rose-200 border border-rose-500/40 hover:bg-rose-500/30 transition-colors whitespace-nowrap"
            >
              Exit Match
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
                    PLAYERS_DB.find((p) => p.name === hud.controlledPlayerName) || {
                      id: 'hud_active',
                      name: hud.controlledPlayerName,
                      position: (hud.controlledPlayerRole as FootballPlayer['position']) || 'ST',
                      rating: hud.controlledPlayerRating,
                    }
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

            {/* Shot Power Meter */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1 font-mono">
                <span>SHOT POWER (S / C)</span>
                <span>{hud.shotPower}%</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-75 ${
                    hud.shotPower > 80
                      ? 'bg-rose-500'
                      : hud.shotPower > 45
                      ? 'bg-[#F59E0B]'
                      : 'bg-[#38BDF8]'
                  }`}
                  style={{ width: `${hud.shotPower}%` }}
                />
              </div>
            </div>
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

          {/* Bottom-Right: Unobtrusive Control Bar + Instant Bicycle Kick [B] & Rainbow Flick Actions */}
          <div className="pointer-events-auto bg-[#070A0E]/85 backdrop-blur-md border border-white/15 rounded-xl px-4 py-3 text-xs text-slate-300 font-mono space-y-1.5 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-slate-400 font-sans font-semibold">
                ACTIVE CONTROLS ({controlScheme.toUpperCase()})
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => engineRef.current?.triggerBicycleKick()}
                  className="px-2.5 py-1 bg-[#10B981] hover:bg-[#059669] text-[#070A0E] font-display font-bold text-[11px] rounded transition-colors cursor-pointer whitespace-nowrap"
                >
                  🚲 BICYCLE KICK [B]
                </button>
                <button
                  onClick={() => engineRef.current?.triggerRainbowFlick()}
                  className="px-2.5 py-1 bg-[#F59E0B] hover:bg-[#D97706] text-[#070A0E] font-display font-bold text-[11px] rounded transition-colors cursor-pointer whitespace-nowrap"
                >
                  🌈 RAINBOW [F]
                </button>
              </div>
            </div>
            <div>
              <span className="text-[#10B981] font-bold">P</span> Accurate Pass ·{' '}
              <span className="text-[#10B981] font-bold">S</span> Shoot ·{' '}
              <span className="text-[#F59E0B] font-bold">B</span> Bicycle Kick ·{' '}
              <span className="text-[#38BDF8] font-bold">K</span> Skill
            </div>
            <div>
              <span className="text-white font-bold">W/O/A/D</span> Move ·{' '}
              <span className="text-white font-bold">I</span> Sprint ·{' '}
              <span className="text-white font-bold">F</span> Rainbow ·{' '}
              <span className="text-white font-bold">V</span> GK Save
            </div>
            <div>
              <span className="text-white font-bold">U</span> Through ·{' '}
              <span className="text-white font-bold">X</span> Cross ·{' '}
              <span className="text-white font-bold">Q</span> Switch ·{' '}
              <span className="text-white font-bold">Mouse</span> Aim
            </div>
            <div className="pt-1 border-t border-white/10 text-[10px] text-slate-400 flex items-center justify-between gap-2">
              <span>
                🚩 Corners: <strong className="text-white">{hud.stats.homeCorners}-{hud.stats.awayCorners}</strong>
              </span>
              <span>
                Fouls: <strong className="text-white">{hud.stats.homeFouls}-{hud.stats.awayFouls}</strong>
              </span>
              <span>
                Offsides: <strong className="text-white">{hud.stats.homeOffsides}-{hud.stats.awayOffsides}</strong>
              </span>
              <span>
                🟨 <strong className="text-[#F59E0B]">{hud.stats.homeYellowCards}-{hud.stats.awayYellowCards}</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE & TOUCH GAMEPAD OVERLAY (VIRTUAL JOYSTICK + ACTION PAD) */}
      {!isLoading && !hud.isMatchOver && showTouchControls && (
        <div className="fixed inset-x-4 bottom-36 sm:bottom-32 z-30 flex items-end justify-between pointer-events-none select-none">
          {/* Left: Virtual 360° Thumbstick */}
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
              const maxR = 44;
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
            className="pointer-events-auto w-28 h-28 rounded-full bg-[#070A0E]/75 border-2 border-white/25 backdrop-blur-md flex items-center justify-center relative touch-none shadow-2xl"
          >
            <div className="text-[9px] font-mono text-white/40 absolute top-2">MOVE</div>
            <div
              className="w-12 h-12 rounded-full bg-[#10B981]/90 border-2 border-white shadow-lg transition-transform duration-75"
              style={{
                transform: `translate(${touchKnob.x}px, ${touchKnob.y}px)`,
              }}
            />
          </div>

          {/* Right: Touch Action Pad (Pass, Through, Shoot, Bicycle [B], Sprint, Switch/Tackle) */}
          <div className="pointer-events-auto grid grid-cols-3 gap-2">
            <button
              type="button"
              onPointerDown={() => engineRef.current?.triggerMobileThroughBall()}
              className="w-16 h-12 rounded-xl bg-[#38BDF8]/85 active:scale-95 text-[#070A0E] font-display font-bold text-[11px] shadow-lg border border-white/30"
            >
              THROUGH
            </button>
            <button
              type="button"
              onPointerDown={() => engineRef.current?.triggerBicycleKick()}
              className="w-16 h-12 rounded-xl bg-[#F59E0B] active:scale-95 text-[#070A0E] font-display font-bold text-[11px] shadow-lg border border-white/30"
            >
              BICYCLE [B]
            </button>
            <button
              type="button"
              onPointerDown={() => engineRef.current?.triggerMobileShoot(78)}
              className="w-16 h-12 rounded-xl bg-rose-500 active:scale-95 text-white font-display font-bold text-[11px] shadow-lg border border-white/30"
            >
              SHOOT
            </button>
            <button
              type="button"
              onPointerDown={() => engineRef.current?.triggerMobileSwitchOrTackle()}
              className="w-16 h-12 rounded-xl bg-[#111722]/90 active:scale-95 text-white font-display font-bold text-[10px] shadow-lg border border-white/25"
            >
              SWITCH/TKL
            </button>
            <button
              type="button"
              onPointerDown={() => {
                const next = !touchSprinting;
                setTouchSprinting(next);
                engineRef.current?.setTouchMovement(
                  touchKnob.x / 44,
                  touchKnob.y / 44,
                  next
                );
              }}
              className={`w-16 h-12 rounded-xl font-display font-bold text-[11px] shadow-lg border ${
                touchSprinting
                  ? 'bg-[#10B981] text-[#070A0E] border-white'
                  : 'bg-[#111722]/90 text-[#10B981] border-[#10B981]/50'
              }`}
            >
              SPRINT
            </button>
            <button
              type="button"
              onPointerDown={() => engineRef.current?.triggerMobilePass()}
              className="w-16 h-12 rounded-xl bg-[#10B981] active:scale-95 text-[#070A0E] font-display font-bold text-[11px] shadow-lg border border-white/30"
            >
              PASS
            </button>
          </div>
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
              <div className="p-2.5 bg-white/5 rounded">P = Accurate Teammate Pass</div>
              <div className="p-2.5 bg-white/5 rounded">S = Shoot (Hold Power)</div>
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

      {/* FULL-TIME MATCH RESULT OVERLAY */}
      {!isLoading && hud.isMatchOver && (
        <div className="absolute inset-0 z-40 bg-[#070A0E]/92 backdrop-blur-xl flex items-center justify-center p-6 overflow-y-auto">
          <div className="bg-[#111722] border border-white/15 rounded-2xl max-w-2xl w-full p-8 shadow-2xl">
            <div className="text-center border-b border-white/10 pb-6 mb-6">
              <div className="text-xs font-mono text-[#10B981] tracking-widest mb-1">
                FULL TIME · FINAL SCORE
              </div>
              <div className="flex items-center justify-center gap-8 my-4">
                <div className="text-right">
                  <div className="font-display text-2xl font-bold text-white">{homeTeam.name}</div>
                  <div className="text-xs text-slate-400">{homeFormation}</div>
                </div>
                <div className="px-6 py-3 bg-[#070A0E] border border-white/15 rounded-xl font-mono text-4xl font-bold text-white tabular-nums">
                  {hud.homeScore} : {hud.awayScore}
                </div>
                <div className="text-left">
                  <div className="font-display text-2xl font-bold text-white">{awayTeam.name}</div>
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
                className="px-6 py-3 bg-white/10 hover:bg-white/15 text-white font-display font-bold text-sm rounded-lg transition-colors flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                PLAY AGAIN
              </button>
              {onNextMatch && (
                <button
                  onClick={onNextMatch}
                  className="px-6 py-3 bg-[#10B981] hover:bg-[#059669] text-[#070A0E] font-display font-bold text-sm rounded-lg transition-colors flex items-center gap-2"
                >
                  <Trophy className="w-4 h-4" />
                  NEXT MATCH
                </button>
              )}
              <button
                onClick={onExitToMenu}
                className="px-6 py-3 bg-[#38BDF8] hover:bg-[#0284C7] text-[#070A0E] font-display font-bold text-sm rounded-lg transition-colors"
              >
                RETURN TO HOME
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
