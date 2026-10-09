import * as THREE from 'three';
import {
  CelebrationType,
  FootballPlayer,
  FormationName,
  FORMATIONS,
  MatchModeId,
  PLAYERS_DB,
  SKILL_MOVES,
  StadiumInfo,
  TeamData,
  WeatherType,
} from '../data/gameDatabase';
import {
  ArticulatedPlayer3D,
  createArticulatedPlayer3D,
  createFootballMesh,
} from './PlayerMeshBuilder3D';
import { SoundEngine } from './SoundEngine';
import {
  FriendRoomService,
  OnlineGuestInputPacket,
  OnlineMatchStateSyncPacket,
} from './FriendRoomService';
import {
  buildStadiumScene,
  GOAL_HEIGHT,
  GOAL_WIDTH,
  PITCH_DEPTH,
  PITCH_WIDTH,
  StadiumSceneObjects,
} from './StadiumBuilder3D';

export type CameraMode = 'Broadcast' | 'Player' | 'Action' | 'Goalkeeper' | 'Free';
export type DifficultyLevel = 'Easy' | 'Normal' | 'Hard' | 'Professional' | 'World Class';
export type ControlScheme = 'Hybrid' | 'Keyboard' | 'Mouse';
export type PracticeDrill = 'Free Play' | 'Passing' | 'Shooting' | 'Dribbling & Skills' | 'Free Kicks' | 'Penalties' | 'Goalkeeper Saves';

export interface KeyBindings {
  moveForward: string;
  moveBackward: string;
  moveLeft: string;
  moveRight: string;
  pass: string;
  throughPass: string;
  cross: string;
  shoot: string;
  curveShot: string;
  skillMove: string;
  rainbowFlick: string;
  sprint: string;
  press: string;
  tackle: string;
  switchPlayer: string;
  gkSave: string;
}

export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  moveForward: 'KeyW',
  moveBackward: 'KeyO',
  moveLeft: 'KeyA',
  moveRight: 'KeyD',
  pass: 'KeyP',
  throughPass: 'KeyU',
  cross: 'KeyX',
  shoot: 'KeyS',
  curveShot: 'KeyC',
  skillMove: 'KeyK',
  rainbowFlick: 'KeyB',
  sprint: 'KeyI',
  press: 'KeyR',
  tackle: 'KeyT',
  switchPlayer: 'KeyQ',
  gkSave: 'KeyV',
};

export interface RadarDot {
  x: number; // -1 to 1
  z: number; // -1 to 1
  team: 'home' | 'away';
  isControlled: boolean;
  isGK: boolean;
}

export type SetPieceType =
  | 'none'
  | 'throw_in'
  | 'corner_kick'
  | 'goal_kick'
  | 'free_kick'
  | 'penalty_kick';

export type AutoSwitchMode = 'auto' | 'air_balls' | 'manual';

export interface MatchHUDState {
  homeScore: number;
  awayScore: number;
  matchClockSeconds: number; // 0 to 5400 (90:00)
  controlledPlayerName: string;
  controlledPlayerRole: string;
  controlledPlayerStamina: number;
  controlledPlayerRating: number;
  shotPower: number; // 0 to 100
  shotTypeLabel: string;
  activeSkillBanner: string;
  commentaryBanner: string;
  activeSetPiece: SetPieceType;
  setPieceTeam: 'home' | 'away';
  setPieceLabel: string;
  isCelebrating: boolean;
  celebrationScorer: string;
  isReplaying: boolean;
  replayReason: string;
  isMatchOver: boolean;
  cameraMode: CameraMode;
  manualGKActive: boolean;
  autoSwitchMode: AutoSwitchMode;
  practiceDrill: PracticeDrill;
  challengeScore: number;
  challengeAttempts: number;
  radarDots: RadarDot[];
  ballRadar: { x: number; z: number };
  stats: {
    homePossession: number;
    awayPossession: number;
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
}

interface ReplayFrame {
  ballPos: { x: number; y: number; z: number };
  players: { x: number; y: number; z: number; angle: number; phase: number }[];
}

export interface OnlineMatchEngineConfig {
  isOnline: boolean;
  role: 'host' | 'guest';
  roomCode: string;
  matchFormat?: '11v11' | '1v1';
  myTeamSide?: 'home' | 'away';
  myAssignedSlotIdx?: number;
  lockToAssignedPlayer?: boolean;
  hostUsername?: string;
  guestUsername?: string;
  awayStarPlayer?: FootballPlayer;
  awaySquad?: FootballPlayer[];
  awayFormation?: FormationName;
}

export interface EngineConfig {
  container: HTMLElement;
  homeTeam: TeamData;
  awayTeam: TeamData;
  homeSquad: FootballPlayer[];
  homeFormation: FormationName;
  stadium: StadiumInfo;
  weather: WeatherType;
  mode: MatchModeId;
  difficulty: DifficultyLevel;
  cameraMode: CameraMode;
  controlScheme: ControlScheme;
  graphicsQuality: 'Low' | 'Medium' | 'High' | 'Ultra';
  preferredCelebration: CelebrationType;
  keyBindings: KeyBindings;
  mouseSensitivity: number;
  cameraSensitivity: number;
  autoSwitchMode?: AutoSwitchMode;
  onlineConfig?: OnlineMatchEngineConfig;
  onHUDUpdate: (hud: MatchHUDState) => void;
}

export class FootballEngine3D {
  private config: EngineConfig;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private stadiumObjs: StadiumSceneObjects;
  private players: ArticulatedPlayer3D[] = [];
  private controlledIdx = 9; // Default striker

  // Ball state
  private ballGroup: THREE.Group;
  private ballMesh: THREE.Mesh;
  private ballTrail: THREE.Line;
  private trailPositions: THREE.Vector3[];
  private ballPos = new THREE.Vector3(0, 0.36, 0);
  private ballVel = new THREE.Vector3(0, 0, 0);
  private ballSpinZ = 0; // Magnus horizontal curve spin
  private ballOwner: ArticulatedPlayer3D | null = null;
  private lastTouchTeam: 'home' | 'away' = 'home';
  private passTargetPlayer: ArticulatedPlayer3D | null = null;
  private passAssistTimer = 0;
  private passLeadX = 0;
  private ballCarrierOverlayEl: HTMLDivElement | null = null;

  // Input state
  private keysDown = new Set<string>();
  private touchMoveX = 0;
  private touchMoveZ = 0;
  private touchSprint = false;
  private mouseNDC = new THREE.Vector2(0, 0);
  private mouseWorldTarget = new THREE.Vector3(25, 0, 0);
  private raycaster = new THREE.Raycaster();
  private pitchPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private freeCamYaw = 0;
  private freeCamPitch = 0.45;

  // Charging shot / pass
  private chargingAction: 'none' | 'shoot' | 'curve' | 'chip' = 'none';
  private chargeLevel = 0; // 0 to 100

  // Match state & stats
  private homeScore = 0;
  private awayScore = 0;
  private elapsedRealSeconds = 0;
  private matchDurationRealSeconds = 180; // 3 mins real time = 90 mins match clock
  private isPaused = false;
  private isMatchOver = false;
  private manualGKActive = false;
  private autoSwitchMode: AutoSwitchMode = 'auto';
  private autoSwitchCooldown = 0;
  private practiceDrill: PracticeDrill = 'Free Play';
  private challengeScore = 0;
  private challengeAttempts = 0;
  private gkAutoShotTimer = 0;

  private homePossessionFrames = 1;
  private awayPossessionFrames = 1;
  private stats = {
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
  };

  // Football Rules & Set-Pieces State (Throw-In, Corner Kick, Goal Kick, Free Kick, Penalty, Offside)
  private activeSetPiece: SetPieceType = 'none';
  private setPieceTeam: 'home' | 'away' = 'home';
  private setPieceTakerIdx = -1;
  private setPieceTimer = 0;
  private setPieceCooldown = 0;
  private setPieceLabel = '';

  // Banners & Celebrations & Replays
  private activeSkillBanner = '';
  private skillBannerTimer = 0;
  private commentaryBanner = 'KICK OFF! Press P to Pass · S to Shoot · C for Curve Shot · K for Skill Move';
  private commentaryTimer = 4.5;
  private celebrationGlobalTimer = 0;
  private celebrationScorerName = '';

  private replayBuffer: ReplayFrame[] = [];
  private isReplaying = false;
  private replayPlayIndex = 0;
  private replayReason = '';

  private netRippleTimer = 0;
  private netRippleSide: 'left' | 'right' = 'right';

  private animFrameId = 0;
  private lastFrameTime = performance.now();
  private hudThrottleTimer = 0;

  // Online 1v1 & 11v11 Synchronization State
  private netSyncTimer = 0;
  private netSeq = 0;
  private lastReceivedSeq = -1;
  private unsubNetCallbacks: (() => void)[] = [];
  private remoteGuestInput: OnlineGuestInputPacket | null = null;
  private remoteGuestControlledIdx = -1;
  private remotePlayerInputs = new Map<string, OnlineGuestInputPacket>();
  private remotePlayerControlledMap = new Map<string, number>();
  private remoteTargetBallPos = new THREE.Vector3(0, 0.36, 0);
  private remoteTargetPlayers: {
    x: number;
    y: number;
    z: number;
    vx: number;
    vz: number;
    facingAngle: number;
  }[] = [];

  constructor(config: EngineConfig) {
    this.config = config;
    this.autoSwitchMode = config.autoSwitchMode || 'auto';
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      48,
      config.container.clientWidth / Math.max(1, config.container.clientHeight),
      0.5,
      320
    );
    this.camera.position.set(0, 28, 44);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: config.graphicsQuality !== 'Low',
      powerPreference: 'high-performance',
    });
    const maxPR = config.graphicsQuality === 'Ultra' ? 2 : config.graphicsQuality === 'High' ? 1.5 : 1;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPR));
    this.renderer.setSize(config.container.clientWidth, config.container.clientHeight);
    this.renderer.shadowMap.enabled = config.graphicsQuality !== 'Low';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    config.container.innerHTML = '';
    config.container.appendChild(this.renderer.domElement);

    // Floating medium-sized Ball Carrier Name label projected above the current ball carrier's head
    const carrierTag = document.createElement('div');
    carrierTag.style.position = 'absolute';
    carrierTag.style.pointerEvents = 'none';
    carrierTag.style.zIndex = '15';
    carrierTag.style.transform = 'translate(-50%, -100%)';
    carrierTag.style.padding = '3px 10px';
    carrierTag.style.borderRadius = '8px';
    carrierTag.style.background = 'rgba(7, 10, 14, 0.88)';
    carrierTag.style.border = '1.5px solid #10B981';
    carrierTag.style.color = '#FFFFFF';
    carrierTag.style.fontFamily = '"Plus Jakarta Sans", "Chakra Petch", sans-serif';
    carrierTag.style.fontSize = '15px';
    carrierTag.style.fontWeight = '700';
    carrierTag.style.letterSpacing = '0.02em';
    carrierTag.style.whiteSpace = 'nowrap';
    carrierTag.style.boxShadow = '0 4px 12px rgba(0,0,0,0.55)';
    carrierTag.style.display = 'none';
    config.container.appendChild(carrierTag);
    this.ballCarrierOverlayEl = carrierTag;

    // Build 3D Stadium
    this.stadiumObjs = buildStadiumScene(
      this.scene,
      config.stadium,
      config.weather,
      config.graphicsQuality
    );

    // Build 3D Match Ball
    const ballObjs = createFootballMesh();
    this.ballGroup = ballObjs.ballGroup;
    this.ballMesh = ballObjs.ballMesh;
    this.ballTrail = ballObjs.ballTrail;
    this.trailPositions = ballObjs.trailPositions;
    this.scene.add(this.ballGroup);
    this.scene.add(this.ballTrail);

    // Spawn Teams according to Match Mode
    this.spawnTeamsForMode();
    this.setupModePositions();

    // Attach Input Listeners
    this.bindEvents();

    // Attach Online 1v1 Network Listeners if in Online VS Mode
    if (this.config.onlineConfig?.isOnline) {
      if (this.config.onlineConfig.role === 'host') {
        const unsubInput = FriendRoomService.onGuestInput((packet) => {
          this.handleRemoteGuestInput(packet);
        });
        this.unsubNetCallbacks.push(unsubInput);
      } else {
        const unsubSync = FriendRoomService.onMatchStateSync((packet) => {
          this.handleRemoteStateSync(packet);
        });
        this.unsubNetCallbacks.push(unsubSync);
      }
    }

    // Start Stadium Ambience & Kick-Off Whistle
    SoundEngine.startStadiumAmbience();
    SoundEngine.playWhistle('kickoff');

    this.lastFrameTime = performance.now();
    this.loop();
  }

  private spawnTeamsForMode() {
    const mode = this.config.mode;
    const homeForm = FORMATIONS[this.config.homeFormation] || FORMATIONS['4-3-3'];
    const awayForm =
      FORMATIONS[this.config.onlineConfig?.awayFormation || this.config.awayTeam.defaultFormation] ||
      FORMATIONS['4-3-3'];

    const is1v1 =
      mode === '1v1' ||
      (mode === 'join_code_match' && this.config.onlineConfig?.matchFormat === '1v1');
    const isAttackVsDef = mode === 'attack_vs_defense';

    // Spawn Home Players (Attacking from Left -X toward Right +X)
    homeForm.forEach((slot, idx) => {
      if (is1v1 && idx !== 0 && idx !== 9) return;
      if (isAttackVsDef && idx > 0 && idx < 5) return; // GK + 6 attackers

      const pData = this.config.homeSquad[idx] || PLAYERS_DB[idx % PLAYERS_DB.length];
      const worldX = slot.x * (PITCH_WIDTH * 0.48);
      const worldZ = slot.z * (PITCH_DEPTH * 0.44);

      const p3d = createArticulatedPlayer3D(
        pData,
        'home',
        slot.role,
        worldX,
        worldZ,
        this.config.homeTeam.primaryColor,
        this.config.homeTeam.secondaryColor,
        this.config.homeTeam.shortsColor,
        this.config.homeTeam.gkColor
      );
      p3d.celebrationType = this.config.preferredCelebration || pData.celebration;
      this.scene.add(p3d.root);
      this.players.push(p3d);
    });

    // Spawn Away Players (Attacking from Right +X toward Left -X)
    if (mode !== 'skill_challenge') {
      awayForm.forEach((slot, idx) => {
        if (is1v1 && idx !== 0 && idx !== 9) return;
        if (mode === 'practice' && this.practiceDrill !== 'Free Play' && idx > 4) return;
        if (mode === 'penalty_shootout' && idx !== 0) return;
        if (mode === 'free_kick' && idx > 4) return;
        if (isAttackVsDef && idx > 5) return; // GK + 5 defenders

        const pData =
          is1v1 && idx === 9 && this.config.onlineConfig?.awayStarPlayer
            ? this.config.onlineConfig.awayStarPlayer
            : this.config.onlineConfig?.awaySquad?.[idx] ||
              (idx === 9 && this.config.onlineConfig?.awayStarPlayer
                ? this.config.onlineConfig.awayStarPlayer
                : PLAYERS_DB[(idx + 6) % PLAYERS_DB.length]);
        const worldX = -slot.x * (PITCH_WIDTH * 0.48);
        const worldZ = -slot.z * (PITCH_DEPTH * 0.44);

        const p3d = createArticulatedPlayer3D(
          pData,
          'away',
          slot.role,
          worldX,
          worldZ,
          this.config.awayTeam.primaryColor,
          this.config.awayTeam.secondaryColor,
          this.config.awayTeam.shortsColor,
          this.config.awayTeam.gkColor
        );
        this.scene.add(p3d.root);
        this.players.push(p3d);
      });
    }

    const defaultAwayStrikerIdx = this.players.findIndex(
      (p) => p.teamSide === 'away' && p.role === 'ST'
    );
    const fallbackAwayIdx = this.players.findIndex(
      (p) => p.teamSide === 'away' && p.role !== 'GK'
    );
    this.remoteGuestControlledIdx =
      defaultAwayStrikerIdx >= 0 ? defaultAwayStrikerIdx : fallbackAwayIdx;

    // Set initial controlled player
    const homePlayers = this.players.filter((p) => p.teamSide === 'home');
    const awayPlayers = this.players.filter((p) => p.teamSide === 'away');
    const mySide = this.getMyTeamSide();
    const assignedSlot = this.config.onlineConfig?.myAssignedSlotIdx;

    if (this.config.mode === 'gk_challenge') {
      this.manualGKActive = true;
      this.controlledIdx = this.players.findIndex((p) => p.teamSide === 'home' && p.role === 'GK');
    } else if (
      this.isOnlineMatch() &&
      typeof assignedSlot === 'number' &&
      !this.is1v1Match()
    ) {
      const teamPool = mySide === 'home' ? homePlayers : awayPlayers;
      const targetPlayer =
        teamPool[Math.max(0, Math.min(teamPool.length - 1, assignedSlot))] ||
        teamPool[teamPool.length - 1];
      const resolvedIdx = this.players.indexOf(targetPlayer);
      this.controlledIdx = resolvedIdx >= 0 ? resolvedIdx : 0;
    } else if (this.isOnlineGuest()) {
      this.controlledIdx =
        this.remoteGuestControlledIdx >= 0
          ? this.remoteGuestControlledIdx
          : this.players.length - 1;
    } else {
      const strikerIdx = this.players.findIndex((p) => p.teamSide === 'home' && p.role === 'ST');
      this.controlledIdx = strikerIdx >= 0 ? strikerIdx : this.players.indexOf(homePlayers[homePlayers.length - 1]);
    }
  }

  private isOnlineMatch(): boolean {
    return Boolean(this.config.onlineConfig?.isOnline);
  }

  private isOnlineHost(): boolean {
    return Boolean(this.config.onlineConfig?.isOnline && this.config.onlineConfig.role === 'host');
  }

  private isOnlineGuest(): boolean {
    return Boolean(this.config.onlineConfig?.isOnline && this.config.onlineConfig.role === 'guest');
  }

  private getMyTeamSide(): 'home' | 'away' {
    if (this.config.onlineConfig?.myTeamSide) {
      return this.config.onlineConfig.myTeamSide;
    }
    return this.isOnlineGuest() ? 'away' : 'home';
  }

  private setupModePositions() {
    const mode = this.config.mode;
    this.ballVel.set(0, 0, 0);
    this.ballSpinZ = 0;
    this.ballOwner = null;

    // Clear practice targets
    while (this.stadiumObjs.practiceTargetGroup.children.length > 0) {
      this.stadiumObjs.practiceTargetGroup.remove(this.stadiumObjs.practiceTargetGroup.children[0]);
    }

    if (mode === 'penalty_shootout' || (mode === 'practice' && this.practiceDrill === 'Penalties')) {
      // Penalty spot in front of Right Goal (+41.5, 0)
      this.ballPos.set(PITCH_WIDTH / 2 - 11, 0.36, 0);
      const shooter = this.getControlledPlayer();
      if (shooter) {
        shooter.x = PITCH_WIDTH / 2 - 13.5;
        shooter.z = -0.5;
        shooter.facingAngle = Math.PI / 2;
      }
      const awayGK = this.players.find((p) => p.teamSide === 'away' && p.role === 'GK');
      if (awayGK) {
        awayGK.x = PITCH_WIDTH / 2 - 0.6;
        awayGK.z = 0;
      }
      this.setCommentary('PENALTY SPOT KICK! Aim with Mouse/W-O-A-D · Hold S or C to Shoot!');
      return;
    }

    if (mode === 'free_kick' || (mode === 'practice' && this.practiceDrill === 'Free Kicks')) {
      const dist = 24 + (this.challengeAttempts % 3) * 3;
      const offsetZ = ((this.challengeAttempts % 3) - 1) * 8;
      this.ballPos.set(PITCH_WIDTH / 2 - dist, 0.36, offsetZ);
      const shooter = this.getControlledPlayer();
      if (shooter) {
        shooter.x = this.ballPos.x - 2.2;
        shooter.z = this.ballPos.z - 0.8;
        shooter.facingAngle = Math.PI / 2;
      }
      // Position 4-man defensive wall 9.15m from ball
      const awayOutfield = this.players.filter((p) => p.teamSide === 'away' && p.role !== 'GK');
      awayOutfield.slice(0, 4).forEach((wallP, idx) => {
        wallP.x = this.ballPos.x + 9.2;
        wallP.z = this.ballPos.z + (idx - 1.5) * 0.85;
      });
      this.setCommentary('FREE KICK! Aim and Hold C for Magnus Curve Shot around the wall!');
      return;
    }

    if (mode === 'gk_challenge' || (mode === 'practice' && this.practiceDrill === 'Goalkeeper Saves')) {
      this.manualGKActive = true;
      const homeGKIdx = this.players.findIndex((p) => p.teamSide === 'home' && p.role === 'GK');
      if (homeGKIdx >= 0) {
        this.controlledIdx = homeGKIdx;
        const gk = this.players[homeGKIdx];
        gk.x = -PITCH_WIDTH / 2 + 1.1;
        gk.z = 0;
        gk.facingAngle = Math.PI / 2;
      }
      const shooterX = -PITCH_WIDTH / 2 + 18 + (Math.random() * 6);
      const shooterZ = (Math.random() - 0.5) * 18;
      this.ballPos.set(shooterX, 0.36, shooterZ);
      this.gkAutoShotTimer = 1.6;
      this.setCommentary('GOALKEEPER CHALLENGE! Move with A/D or Mouse · Press V to Dive Save!');
      return;
    }

    if (mode === 'skill_challenge' || (mode === 'practice' && this.practiceDrill === 'Dribbling & Skills')) {
      this.buildSkillChallengeCourse();
      const p = this.getControlledPlayer();
      if (p) {
        p.x = -12;
        p.z = 0;
        this.ballPos.set(-11, 0.36, 0);
        this.ballOwner = p;
      }
      this.setCommentary('SKILL CHALLENGE! Dribble through glowing gates, press K for Skill Moves, and finish!');
      return;
    }

    // Standard Kick-off Reset
    this.players.forEach((p) => {
      p.x = p.baseX;
      p.z = p.baseZ;
      p.vx = 0;
      p.vz = 0;
      p.y = 0;
    });

    this.ballPos.set(0, 0.36, 0);
    this.activeSetPiece = 'none';
    this.setPieceLabel = '';
    this.setPieceCooldown = 0.5;
    const homeStriker = this.players.find((p) => p.teamSide === 'home' && p.role !== 'GK');
    const awayStriker = this.players.find((p) => p.teamSide === 'away' && p.role !== 'GK');
    if (homeStriker) {
      homeStriker.x = -1.4;
      homeStriker.z = 0;
      homeStriker.facingAngle = Math.PI / 2;
      this.ballOwner = homeStriker;
    }
    if (awayStriker) {
      awayStriker.x = 2.6;
      awayStriker.z = 0;
      awayStriker.facingAngle = -Math.PI / 2;
    }
  }

  private buildSkillChallengeCourse() {
    const gatePositions = [
      [0, -6],
      [12, 6],
      [24, -5],
      [34, 2],
    ];
    const torusGeo = new THREE.TorusGeometry(1.8, 0.14, 12, 28);
    const torusMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    gatePositions.forEach(([gx, gz]) => {
      const gate = new THREE.Mesh(torusGeo, torusMat);
      gate.position.set(gx, 1.6, gz);
      gate.rotation.y = Math.PI / 2;
      this.stadiumObjs.practiceTargetGroup.add(gate);
    });
  }

  public setPracticeDrill(drill: PracticeDrill) {
    this.practiceDrill = drill;
    this.manualGKActive = drill === 'Goalkeeper Saves';
    this.setupModePositions();
  }

  public setCameraMode(mode: CameraMode) {
    this.config.cameraMode = mode;
  }

  public setAutoSwitchMode(mode: AutoSwitchMode) {
    this.autoSwitchMode = mode;
    const label =
      mode === 'auto'
        ? 'AUTO PLAYER SWITCH: ON (ALWAYS)'
        : mode === 'air_balls'
        ? 'AUTO PLAYER SWITCH: AIR & LOOSE BALLS'
        : 'AUTO PLAYER SWITCH: MANUAL ONLY [Q]';
    this.setCommentary(label, 2.5);
    this.emitHUD();
  }

  public cycleAutoSwitchMode(): AutoSwitchMode {
    const order: AutoSwitchMode[] = ['auto', 'air_balls', 'manual'];
    const next = order[(order.indexOf(this.autoSwitchMode) + 1) % order.length];
    this.setAutoSwitchMode(next);
    return next;
  }

  public toggleManualGK() {
    this.manualGKActive = !this.manualGKActive;
    if (this.manualGKActive) {
      const gkIdx = this.players.findIndex((p) => p.teamSide === 'home' && p.role === 'GK');
      if (gkIdx >= 0) this.controlledIdx = gkIdx;
      this.setCommentary('MANUAL GOALKEEPER ACTIVE! Press V to Dive Save');
    } else {
      this.switchToNearestOutfieldPlayer();
      this.setCommentary('OUTFIELD CONTROL ACTIVE');
    }
  }

  public triggerInstantReplay(reason = 'HIGHLIGHT REPLAY') {
    if (this.replayBuffer.length < 20) return;
    this.isReplaying = true;
    this.replayPlayIndex = 0;
    this.replayReason = reason;
  }

  public setPaused(paused: boolean) {
    this.isPaused = paused;
    if (!paused) {
      this.lastFrameTime = performance.now();
    }
  }

  public skipReplay() {
    this.isReplaying = false;
    if (this.celebrationGlobalTimer > 0) {
      this.celebrationGlobalTimer = 0;
      this.setupModePositions();
    }
  }

  private setCommentary(text: string, duration = 3.6) {
    this.commentaryBanner = text;
    this.commentaryTimer = duration;
  }

  private getControlledPlayer(): ArticulatedPlayer3D | undefined {
    return this.players[this.controlledIdx];
  }

  private switchToNearestOutfieldPlayer() {
    const mySide = this.getMyTeamSide();
    let bestIdx = this.controlledIdx;
    let bestDist = Infinity;
    this.players.forEach((p, idx) => {
      if (p.teamSide !== mySide || p.role === 'GK') return;
      const d = Math.hypot(p.x - this.ballPos.x, p.z - this.ballPos.z);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = idx;
      }
    });
    this.controlledIdx = bestIdx;
  }

  private bindEvents() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.renderer.domElement.addEventListener('mousemove', this.handleMouseMove);
    this.renderer.domElement.addEventListener('mousedown', this.handleMouseDown);
    this.renderer.domElement.addEventListener('mouseup', this.handleMouseUp);
    this.renderer.domElement.addEventListener('contextmenu', this.handleContextMenu);
    window.addEventListener('resize', this.handleResize);
  }

  public dispose() {
    cancelAnimationFrame(this.animFrameId);
    SoundEngine.stopStadiumAmbience();
    this.unsubNetCallbacks.forEach((u) => u());
    this.unsubNetCallbacks = [];
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.renderer.domElement.removeEventListener('mousemove', this.handleMouseMove);
    this.renderer.domElement.removeEventListener('mousedown', this.handleMouseDown);
    this.renderer.domElement.removeEventListener('mouseup', this.handleMouseUp);
    this.renderer.domElement.removeEventListener('contextmenu', this.handleContextMenu);
    window.removeEventListener('resize', this.handleResize);
    this.renderer.dispose();
  }

  private handleResize = () => {
    const w = this.config.container.clientWidth;
    const h = Math.max(1, this.config.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  private handleMouseMove = (e: MouseEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouseNDC, this.camera);
    const hit = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.pitchPlane, hit)) {
      this.mouseWorldTarget.copy(hit);
    }

    if (this.config.cameraMode === 'Free' && e.buttons === 1) {
      this.freeCamYaw -= e.movementX * 0.006 * this.config.cameraSensitivity;
      this.freeCamPitch = THREE.MathUtils.clamp(
        this.freeCamPitch + e.movementY * 0.005 * this.config.cameraSensitivity,
        0.18,
        1.25
      );
    }
  };

  private handleMouseDown = (e: MouseEvent) => {
    if (this.isReplaying || this.isMatchOver) return;
    if (this.manualGKActive) {
      this.performGoalkeeperDive();
      return;
    }
    if (e.button === 0 && this.config.cameraMode !== 'Free') {
      // Left click: Pass if outside box, or charge normal shot if inside box
      const mySide = this.getMyTeamSide();
      const inAttackBox =
        mySide === 'home'
          ? this.ballPos.x > PITCH_WIDTH / 2 - 22
          : this.ballPos.x < -PITCH_WIDTH / 2 + 22;
      if (inAttackBox && this.ballOwner?.teamSide === mySide) {
        this.chargingAction = 'shoot';
        this.chargeLevel = 22;
      } else {
        this.executePass('short');
      }
    } else if (e.button === 1) {
      // Middle click: Rainbow Flick Skill Move
      e.preventDefault();
      this.executeRainbowFlick();
    } else if (e.button === 2) {
      // Right click: Curve Shot charge
      this.chargingAction = 'curve';
      this.chargeLevel = 25;
    }
  };

  private handleMouseUp = (e: MouseEvent) => {
    if (this.chargingAction !== 'none' && (e.button === 0 || e.button === 2)) {
      this.releaseChargedShot();
    }
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    this.keysDown.add(e.code);
    const kb = this.config.keyBindings;

    if (this.isReplaying) {
      if (e.code === 'Space' || e.code === 'Escape') {
        this.skipReplay();
      }
      return;
    }

    // Shoot charging (S)
    if (e.code === kb.shoot && this.chargingAction === 'none') {
      this.chargingAction = 'shoot';
      this.chargeLevel = 20;
    }
    // Curve Shot charging (C)
    if (e.code === kb.curveShot && this.chargingAction === 'none') {
      this.chargingAction = 'curve';
      this.chargeLevel = 24;
    }
    // Chip Shot (L)
    if (e.code === 'KeyL' && this.chargingAction === 'none') {
      this.chargingAction = 'chip';
      this.chargeLevel = 30;
    }

    // Pass (P)
    if (e.code === kb.pass) {
      this.executePass('short');
    }
    // Through Pass (U)
    if (e.code === kb.throughPass) {
      this.executePass('through');
    }
    // Cross / Lob (X)
    if (e.code === kb.cross) {
      this.executePass('cross');
    }
    // Bicycle Kick (B)
    if (e.code === 'KeyB' || e.code === kb.rainbowFlick) {
      this.executeBicycleKick();
      return;
    }
    // Rainbow Flick Skill Move (F or Shift+K)
    if (
      e.code === 'KeyF' ||
      (e.code === kb.skillMove && e.shiftKey)
    ) {
      this.executeRainbowFlick();
      return;
    }
    // Skill Move (K)
    if (e.code === kb.skillMove) {
      this.executeSkillMove();
    }
    // Goalkeeper Save (V)
    if (e.code === kb.gkSave) {
      this.performGoalkeeperDive();
    }
    // Switch Player (Q)
    if (e.code === kb.switchPlayer) {
      this.switchToNearestOutfieldPlayer();
      SoundEngine.playUIClick();
    }
    // Toggle Manual Goalkeeper (G)
    if (e.code === 'KeyG') {
      this.toggleManualGK();
    }
    // Tackle (T or Space or D when defending off-ball)
    const oppSide = this.getMyTeamSide() === 'home' ? 'away' : 'home';
    if (
      e.code === kb.tackle ||
      e.code === 'Space' ||
      (e.code === 'KeyD' && this.ballOwner?.teamSide === oppSide)
    ) {
      this.executeTackle();
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keysDown.delete(e.code);
    const kb = this.config.keyBindings;

    if (
      (e.code === kb.shoot && this.chargingAction === 'shoot') ||
      (e.code === kb.curveShot && this.chargingAction === 'curve') ||
      (e.code === 'KeyL' && this.chargingAction === 'chip')
    ) {
      this.releaseChargedShot();
    }
  };

  private getAimVectorFromPlayer(p: ArticulatedPlayer3D, defaultTargetX: number, defaultTargetZ: number): THREE.Vector2 {
    // Priority 1: Active directional keys or mobile thumbstick direction
    const isBehindCam = this.config.cameraMode === 'Player' || this.config.cameraMode === 'Goalkeeper';
    const kb = this.config.keyBindings;
    const upPressed = this.keysDown.has(kb.moveForward) || this.keysDown.has('ArrowUp');
    const downPressed = this.keysDown.has(kb.moveBackward) || this.keysDown.has('ArrowDown');
    const leftPressed = this.keysDown.has(kb.moveLeft) || this.keysDown.has('ArrowLeft');
    const rightPressed = this.keysDown.has(kb.moveRight) || this.keysDown.has('ArrowRight');

    let keyX = this.touchMoveX;
    let keyZ = this.touchMoveZ;
    if (keyX === 0 && keyZ === 0) {
      if (isBehindCam) {
        if (upPressed) keyX += 1;
        if (downPressed) keyX -= 1;
        if (leftPressed) keyZ -= 1;
        if (rightPressed) keyZ += 1;
      } else {
        if (upPressed) keyZ -= 1;
        if (downPressed) keyZ += 1;
        if (leftPressed) keyX -= 1;
        if (rightPressed) keyX += 1;
      }
    }
    if (Math.hypot(keyX, keyZ) > 0.15) {
      const kLen = Math.hypot(keyX, keyZ);
      return new THREE.Vector2(keyX / kLen, keyZ / kLen);
    }

    if (this.config.controlScheme !== 'Keyboard') {
      const dx = this.mouseWorldTarget.x - p.x;
      const dz = this.mouseWorldTarget.z - p.z;
      const len = Math.hypot(dx, dz);
      if (len > 1.0) {
        return new THREE.Vector2(dx / len, dz / len);
      }
    }
    const dx = defaultTargetX - p.x;
    const dz = defaultTargetZ - p.z;
    const len = Math.max(0.001, Math.hypot(dx, dz));
    return new THREE.Vector2(dx / len, dz / len);
  }

  private is1v1Match(): boolean {
    return (
      this.config.mode === '1v1' ||
      (this.config.mode === 'join_code_match' && this.config.onlineConfig?.matchFormat === '1v1') ||
      this.players.length <= 6
    );
  }

  private findBestTeammateForPass(
    passer: ArticulatedPlayer3D,
    aimDir: THREE.Vector2,
    type: 'short' | 'through' | 'cross'
  ): ArticulatedPlayer3D | null {
    const mySide = passer.teamSide;
    const attackDir = mySide === 'home' ? 1 : -1;
    let bestTeammate: ArticulatedPlayer3D | null = null;
    let bestScore = -Infinity;

    // First pass: evaluate all outfield teammates on the same side
    this.players.forEach((mate) => {
      if (mate.teamSide !== mySide || mate === passer || mate.role === 'GK') return;
      const dx = mate.x - passer.x;
      const dz = mate.z - passer.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 1.2) return;

      const dot = (dx / dist) * aimDir.x + (dz / dist) * aimDir.y;
      const forwardBonus = dx * attackDir > 0 ? (type === 'through' ? 1.15 : 0.55) : -0.15;
      const distPenalty = type === 'short' ? dist * 0.045 : dist * 0.022;
      const score = dot * 3.2 + forwardBonus - distPenalty;

      if (score > bestScore) {
        bestScore = score;
        bestTeammate = mate;
      }
    });

    // Fallback to Goalkeeper if in 1v1 or no outfield teammate exists
    if (!bestTeammate) {
      this.players.forEach((mate) => {
        if (mate.teamSide !== mySide || mate === passer) return;
        const d = Math.hypot(mate.x - passer.x, mate.z - passer.z);
        if (-d > bestScore) {
          bestScore = -d;
          bestTeammate = mate;
        }
      });
    }

    return bestTeammate;
  }

  private executePass(type: 'short' | 'through' | 'cross') {
    const p = this.getControlledPlayer();
    if (!p) return;

    if (this.isOnlineGuest()) {
      const aimDir = this.getAimVectorFromPlayer(p, p.x - 18, p.z);
      p.kickTimer = 0.32;
      SoundEngine.playPass();
      this.sendImmediateGuestAction({
        action: type === 'short' ? 'pass' : type,
        aimX: aimDir.x,
        aimZ: aimDir.y,
      });
      return;
    }

    const distToBall = Math.hypot(p.x - this.ballPos.x, p.z - this.ballPos.z);
    if (this.ballOwner !== p && distToBall > 3.2) return;

    const mySide = p.teamSide;
    const attackDir = mySide === 'home' ? 1 : -1;

    // Find best teammate in aimed direction (guaranteed to lock onto a teammate!)
    const aimDir = this.getAimVectorFromPlayer(p, p.x + 18 * attackDir, p.z);
    const bestTeammate = this.findBestTeammateForPass(p, aimDir, type);

    this.ballOwner = null;
    this.lastTouchTeam = mySide;
    const wasThrowIn = this.activeSetPiece === 'throw_in';
    if (this.activeSetPiece !== 'none') {
      this.activeSetPiece = 'none';
      this.setPieceLabel = '';
      this.setPieceCooldown = 1.25;
    }
    p.kickTimer = wasThrowIn ? 0.42 : 0.32;
    if (mySide === 'home') this.stats.homePasses++;
    else this.stats.awayPasses++;
    SoundEngine.playPass();

    if (bestTeammate) {
      const target = bestTeammate;

      // OFFICIAL FOOTBALL RULE: Offside Check (Active in all official 11v11 matches, DISABLED in 1v1 matches!)
      if (
        !wasThrowIn &&
        this.isMatchWithOfficialRules() &&
        !this.is1v1Match() &&
        this.setPieceCooldown <= 0 &&
        (target.x - p.x) * attackDir > 1.5 &&
        target.x * attackDir > 1.0
      ) {
        const oppsCloserToGoal = this.players.filter(
          (opp) => opp.teamSide !== mySide && (opp.x - target.x) * attackDir >= -0.65
        ).length;
        if (oppsCloserToGoal < 2) {
          this.passTargetPlayer = null;
          this.passAssistTimer = 0;
          if (mySide === 'home') this.stats.homeOffsides++;
          else this.stats.awayOffsides++;
          this.triggerFoulSetPiece(
            mySide === 'home' ? 'away' : 'home',
            target.x,
            target.z,
            false,
            true,
            target.data.name
          );
          return;
        }
      }

      const leadX = (type === 'through' ? 4.8 : type === 'cross' ? 2.2 : 0.4) * attackDir;
      const tx = THREE.MathUtils.clamp(target.x + leadX, -PITCH_WIDTH / 2 + 2, PITCH_WIDTH / 2 - 2);
      const tz = THREE.MathUtils.clamp(target.z, -PITCH_DEPTH / 2 + 2, PITCH_DEPTH / 2 - 2);
      const dx = tx - this.ballPos.x;
      const dz = tz - this.ballPos.z;
      const dist = Math.max(1, Math.hypot(dx, dz));
      const speed = wasThrowIn
        ? Math.min(28, Math.max(20, 15 + dist * 0.48))
        : type === 'through'
        ? Math.min(32, Math.max(24, 18 + dist * 0.52))
        : type === 'cross'
        ? Math.min(30, Math.max(23, 17 + dist * 0.48))
        : Math.min(31, Math.max(23, 17 + dist * 0.55));

      this.ballVel.x = (dx / dist) * speed;
      this.ballVel.z = (dz / dist) * speed;
      this.ballVel.y = wasThrowIn ? 3.4 : type === 'cross' ? 7.8 : 0.9;
      this.ballSpinZ = type === 'cross' ? -2.5 : 0;

      // Lock pass target so ball homes accurately to the teammate and receiver steps to meet it!
      this.passTargetPlayer = target;
      this.passLeadX = leadX;
      this.passAssistTimer = Math.min(2.1, Math.max(0.75, dist / 16));
      p.facingAngle = Math.atan2(dx, dz);

      // Switch control to receiver if Auto Switch is enabled ('auto' or 'air_balls' on crosses)
      const newIdx = this.players.indexOf(target);
      const shouldAutoSwitchOnPass =
        this.autoSwitchMode === 'auto' ||
        (this.autoSwitchMode === 'air_balls' && (type === 'cross' || wasThrowIn));
      if (
        shouldAutoSwitchOnPass &&
        newIdx >= 0 &&
        !this.manualGKActive &&
        mySide === 'home' &&
        target.role !== 'GK'
      ) {
        this.controlledIdx = newIdx;
        this.autoSwitchCooldown = 0.55;
      }
    } else {
      this.passTargetPlayer = null;
      this.passAssistTimer = 0;
      this.ballVel.x = aimDir.x * (wasThrowIn ? 20 : 24);
      this.ballVel.z = aimDir.y * (wasThrowIn ? 20 : 24);
      this.ballVel.y = wasThrowIn ? 3.4 : type === 'cross' ? 7.8 : 1.0;
    }

    if (this.isOnlineHost()) {
      this.broadcastAuthoritativeState('pass');
    }
  }

  private releaseChargedShot() {
    const action = this.chargingAction;
    const powerPct = THREE.MathUtils.clamp(this.chargeLevel, 20, 100) / 100;
    this.chargingAction = 'none';
    this.chargeLevel = 0;

    const p = this.getControlledPlayer();
    if (!p) return;

    let targetZ = THREE.MathUtils.clamp(this.mouseWorldTarget.z, -GOAL_WIDTH * 0.46, GOAL_WIDTH * 0.46);
    if (this.keysDown.has(this.config.keyBindings.moveLeft) || this.keysDown.has('ArrowLeft')) {
      targetZ = -GOAL_WIDTH * 0.38;
    } else if (this.keysDown.has(this.config.keyBindings.moveRight) || this.keysDown.has('ArrowRight')) {
      targetZ = GOAL_WIDTH * 0.38;
    }

    if (this.isOnlineGuest()) {
      p.kickTimer = 0.42;
      SoundEngine.playKick(powerPct, action === 'curve');
      this.sendImmediateGuestAction({
        action: action === 'none' ? 'shoot' : action,
        powerPct,
        aimZ: targetZ,
      });
      return;
    }

    this.performShotForPlayer(p, action === 'none' ? 'shoot' : action, powerPct, targetZ);
    if (this.isOnlineHost()) {
      this.broadcastAuthoritativeState('kick');
    }
  }

  private performShotForPlayer(
    p: ArticulatedPlayer3D,
    action: 'shoot' | 'curve' | 'chip',
    powerPct: number,
    targetZ: number
  ) {
    const distToBall = Math.hypot(p.x - this.ballPos.x, p.z - this.ballPos.z);
    if (this.ballOwner !== p && distToBall > 3.4) return;

    if (this.activeSetPiece === 'throw_in') {
      this.executePass('through');
      return;
    }
    if (this.activeSetPiece !== 'none') {
      this.activeSetPiece = 'none';
      this.setPieceLabel = '';
      this.setPieceCooldown = 1.25;
    }

    this.ballOwner = null;
    this.lastTouchTeam = p.teamSide;
    p.kickTimer = 0.42;
    if (p.teamSide === 'home') {
      this.stats.homeShots++;
      this.challengeAttempts++;
      if (Math.abs(targetZ) <= GOAL_WIDTH / 2) this.stats.homeShotsOnTarget++;
    } else {
      this.stats.awayShots++;
      if (Math.abs(targetZ) <= GOAL_WIDTH / 2) this.stats.awayShotsOnTarget++;
    }

    // Home shoots toward Right Goal (+PITCH_WIDTH/2), Away shoots toward Left Goal (-PITCH_WIDTH/2)
    const goalX = p.teamSide === 'home' ? PITCH_WIDTH / 2 : -PITCH_WIDTH / 2;
    const dx = goalX - this.ballPos.x;
    const dz = targetZ - this.ballPos.z;
    const dist = Math.max(1, Math.hypot(dx, dz));

    const shootStatBonus = p.data.attributes.shooting / 100;
    const baseSpeed = 28 + powerPct * 16 * shootStatBonus;

    if (action === 'curve') {
      const curveAttr = p.data.attributes.curve / 100;
      const curveSign = targetZ >= 0 ? -1 : 1;
      const initialZ = targetZ - curveSign * 5.2 * curveAttr;
      const cdz = initialZ - this.ballPos.z;
      const cDist = Math.max(1, Math.hypot(dx, cdz));

      this.ballVel.x = (dx / cDist) * (baseSpeed * 0.94);
      this.ballVel.z = (cdz / cDist) * (baseSpeed * 0.94);
      this.ballVel.y = 4.2 + powerPct * 4.8;
      this.ballSpinZ = curveSign * (9.5 + curveAttr * 6.5);
      SoundEngine.playKick(powerPct, true);
      this.setCommentary(`${p.data.name.toUpperCase()} UNLEASHES A MAGNUS CURVE SHOT!`);
    } else if (action === 'chip') {
      this.ballVel.x = (dx / dist) * (baseSpeed * 0.72);
      this.ballVel.z = (dz / dist) * (baseSpeed * 0.72);
      this.ballVel.y = 10.5 + powerPct * 3.5;
      this.ballSpinZ = 0;
      SoundEngine.playKick(powerPct, false);
      this.setCommentary(`${p.data.name.toUpperCase()} CHIPS THE KEEPER!`);
    } else {
      this.ballVel.x = (dx / dist) * baseSpeed;
      this.ballVel.z = (dz / dist) * baseSpeed;
      this.ballVel.y = 2.4 + powerPct * 5.8;
      this.ballSpinZ = 0;
      SoundEngine.playKick(powerPct, false);
      this.setCommentary(
        powerPct > 0.75
          ? `${p.data.name.toUpperCase()} FIRES A THUNDEROUS POWER SHOT!`
          : `${p.data.name.toUpperCase()} SHOOTS!`
      );
    }
  }

  public triggerRainbowFlick() {
    this.executeRainbowFlick();
  }

  public triggerBicycleKick() {
    this.executeBicycleKick();
  }

  public setTouchMovement(moveX: number, moveZ: number, sprinting: boolean) {
    this.touchMoveX = moveX;
    this.touchMoveZ = moveZ;
    this.touchSprint = sprinting;
  }

  public triggerPass(type: 'short' | 'through' | 'cross' = 'short') {
    this.executePass(type);
  }

  public triggerShot(type: 'shoot' | 'curve' | 'chip' = 'shoot', powerPct = 0.78) {
    const p = this.getControlledPlayer();
    if (!p) return;
    const targetZ = THREE.MathUtils.clamp(
      this.mouseWorldTarget.z,
      -GOAL_WIDTH * 0.42,
      GOAL_WIDTH * 0.42
    );
    if (this.isOnlineGuest()) {
      p.kickTimer = 0.42;
      SoundEngine.playKick(powerPct, type === 'curve');
      this.sendImmediateGuestAction({
        action: type,
        powerPct,
        aimZ: targetZ,
      });
      return;
    }
    this.performShotForPlayer(p, type, powerPct, targetZ);
    if (this.isOnlineHost()) {
      this.broadcastAuthoritativeState('kick');
    }
  }

  public triggerSkillMove() {
    this.executeSkillMove();
  }

  public triggerTackleOrPress() {
    this.executeTackle();
  }

  public triggerSwitchPlayer() {
    this.switchToNearestOutfieldPlayer();
    SoundEngine.playUIClick();
  }

  public triggerGKDive() {
    this.performGoalkeeperDive();
  }

  private executeBicycleKick(actorOverride?: ArticulatedPlayer3D) {
    let p = actorOverride || this.getControlledPlayer();
    if (!p || p.bicycleTimer > 0) return;

    // If controlled player isn't the closest teammate to a loose ball, switch to the closest teammate near the ball
    if (!actorOverride && this.ballOwner !== p) {
      const mySide = this.getMyTeamSide();
      let closestMate = p;
      let minDist = Math.hypot(p.x - this.ballPos.x, p.z - this.ballPos.z);
      this.players.forEach((mate, idx) => {
        if (mate.teamSide === mySide && mate.role !== 'GK') {
          const d = Math.hypot(mate.x - this.ballPos.x, mate.z - this.ballPos.z);
          if (d < minDist) {
            minDist = d;
            closestMate = mate;
            if (!this.isOnlineGuest()) this.controlledIdx = idx;
          }
        }
      });
      p = closestMate;
    }

    p.bicycleTimer = 0.85;
    p.skillTimer = 0.85;
    p.activeSkillName = 'Bicycle Kick';
    this.activeSkillBanner = `🚲 ${p.data.name.toUpperCase()}: ACROBATIC BICYCLE KICK!`;
    this.skillBannerTimer = 2.5;

    if (!actorOverride && this.isOnlineGuest()) {
      SoundEngine.playKick(0.95, true);
      this.sendImmediateGuestAction({ action: 'bicycle' });
      return;
    }

    const distToBall = Math.hypot(p.x - this.ballPos.x, p.z - this.ballPos.z);
    if (this.ballOwner === p || distToBall < 4.5) {
      if (this.activeSetPiece !== 'none') {
        this.activeSetPiece = 'none';
        this.setPieceLabel = '';
        this.setPieceCooldown = 1.25;
      }
      this.ballOwner = null;
      this.passTargetPlayer = null;
      this.passAssistTimer = 0;
      this.lastTouchTeam = p.teamSide;

      if (p.teamSide === 'home') {
        this.stats.homeShots++;
        this.stats.homeShotsOnTarget++;
        this.challengeAttempts++;
      } else {
        this.stats.awayShots++;
        this.stats.awayShotsOnTarget++;
      }

      const goalX = p.teamSide === 'home' ? PITCH_WIDTH / 2 : -PITCH_WIDTH / 2;
      let targetZ = THREE.MathUtils.clamp(
        this.mouseWorldTarget.z,
        -GOAL_WIDTH * 0.4,
        GOAL_WIDTH * 0.4
      );
      if (Math.abs(targetZ) < 0.8) {
        targetZ = (p.z >= 0 ? -1 : 1) * (GOAL_WIDTH * 0.32);
      }

      // Snap ball up to overhead scissor-kick contact height
      this.ballPos.set(p.x, Math.max(1.65, this.ballPos.y), p.z);
      const dx = goalX - this.ballPos.x;
      const dz = targetZ - this.ballPos.z;
      const dist = Math.max(1, Math.hypot(dx, dz));
      const shootBonus = p.data.attributes.shooting / 100;
      const speed = 34 + shootBonus * 10;

      this.ballVel.x = (dx / dist) * speed;
      this.ballVel.z = (dz / dist) * speed;
      this.ballVel.y = Math.min(7.5, Math.max(3.2, dist * 0.14));
      this.ballSpinZ = (targetZ >= 0 ? -1 : 1) * 4.8;
      (this.ballTrail.material as THREE.LineBasicMaterial).color.setHex(0x10b981);

      SoundEngine.playKick(0.95, true);
      SoundEngine.playCrowdReaction('cheer');
      this.setCommentary(
        `SPECTACULAR OVERHEAD BICYCLE KICK BY ${p.data.name.toUpperCase()}!`,
        3.8
      );
    } else {
      SoundEngine.playCrowdReaction('ooh');
      this.setCommentary(`${p.data.name.toUpperCase()} ATTEMPTS AN ACROBATIC BICYCLE KICK!`);
    }

    if (this.config.mode === 'skill_challenge') {
      this.challengeScore += 450;
    }
    if (this.isOnlineHost()) {
      this.broadcastAuthoritativeState('kick');
    }
  }

  private executeRainbowFlick(actorOverride?: ArticulatedPlayer3D) {
    const p = actorOverride || this.getControlledPlayer();
    if (!p || p.rainbowTimer > 0) return;

    p.rainbowTimer = 0.78;
    p.skillTimer = 0.78;
    p.activeSkillName = 'Rainbow Flick';
    this.activeSkillBanner = `🌈 ${p.data.name.toUpperCase()}: RAINBOW FLICK!`;
    this.skillBannerTimer = 2.2;

    if (!actorOverride && this.isOnlineGuest()) {
      this.sendImmediateGuestAction({ action: 'rainbow' });
      return;
    }

    const dirX = Math.sin(p.facingAngle);
    const dirZ = Math.cos(p.facingAngle);

    // Smooth forward acceleration as player flicks ball overhead
    p.vx = dirX * 14.2;
    p.vz = dirZ * 14.2;

    const distToBall = Math.hypot(p.x - this.ballPos.x, p.z - this.ballPos.z);
    if (this.ballOwner === p || distToBall < 3.0) {
      this.ballOwner = null;
      this.ballPos.set(p.x + dirX * 0.35, 0.95, p.z + dirZ * 0.35);
      this.ballVel.set(dirX * 12.8, 8.6, dirZ * 12.8);
      this.ballSpinZ = 0;
      (this.ballTrail.material as THREE.LineBasicMaterial).color.setHex(0xf59e0b);
      SoundEngine.playKick(0.55, true);
    }

    // Freeze / ankle-break nearby opponent defender watching the rainbow arc overhead
    this.players.forEach((opp) => {
      if (opp.teamSide !== p.teamSide && opp.role !== 'GK') {
        const d = Math.hypot(opp.x - p.x, opp.z - p.z);
        if (d < 4.8) {
          opp.vx *= 0.1;
          opp.vz *= 0.1;
          opp.tackleTimer = 0.65;
        }
      }
    });

    SoundEngine.playCrowdReaction('cheer');
    this.setCommentary(`RAINBOW FLICK! ${p.data.name.toUpperCase()} ARCS THE BALL OVER THE DEFENDER!`);
    if (this.config.mode === 'skill_challenge') {
      this.challengeScore += 350;
    }
    if (this.isOnlineHost()) {
      this.broadcastAuthoritativeState('kick');
    }
  }

  private executeSkillMove(actorOverride?: ArticulatedPlayer3D) {
    const p = actorOverride || this.getControlledPlayer();
    if (!p || p.skillTimer > 0) return;

    if (!actorOverride && this.isOnlineGuest()) {
      p.skillTimer = 0.65;
      p.activeSkillName = 'Roulette';
      this.sendImmediateGuestAction({ action: 'skill' });
      return;
    }

    const chosen = SKILL_MOVES[Math.floor(Math.random() * SKILL_MOVES.length)];
    if (chosen.name === 'Rainbow Flick') {
      this.executeRainbowFlick(p);
      return;
    }

    p.skillTimer = 0.65;
    p.activeSkillName = chosen.name;
    this.activeSkillBanner = `${p.data.name}: ${chosen.name.toUpperCase()}!`;
    this.skillBannerTimer = 1.8;

    const dirX = Math.sin(p.facingAngle);
    const dirZ = Math.cos(p.facingAngle);
    p.vx = dirX * 14.5;
    p.vz = dirZ * 14.5;

    if (this.ballOwner === p) {
      this.ballPos.x = p.x + dirX * 1.1;
      this.ballPos.z = p.z + dirZ * 1.1;
      if (chosen.name === 'Flick') {
        this.ballPos.y = 1.55;
        this.ballVel.y = 4.2;
      }
    }

    SoundEngine.playCrowdReaction('cheer');
    if (this.config.mode === 'skill_challenge') {
      this.challengeScore += 250;
    }
    if (this.isOnlineHost()) {
      this.broadcastAuthoritativeState();
    }
  }

  private executeTackle(actorOverride?: ArticulatedPlayer3D) {
    const p = actorOverride || this.getControlledPlayer();
    if (!p || p.tackleTimer > 0) return;

    p.tackleTimer = 0.45;
    const dirX = Math.sin(p.facingAngle);
    const dirZ = Math.cos(p.facingAngle);
    p.vx = dirX * 13;
    p.vz = dirZ * 13;

    if (!actorOverride && this.isOnlineGuest()) {
      this.sendImmediateGuestAction({ action: 'tackle' });
      return;
    }

    // Check if tackling an opponent or winning loose ball
    const distToBall = Math.hypot(p.x - this.ballPos.x, p.z - this.ballPos.z);
    if (distToBall < 2.55 && this.ballOwner?.teamSide !== p.teamSide) {
      this.ballOwner = p;
      this.lastTouchTeam = p.teamSide;
      if (p.teamSide === 'home') this.stats.homeTackles++;
      else this.stats.awayTackles++;
      SoundEngine.playPass();
      this.setCommentary(`CLEAN INTERCEPTION BY ${p.data.name.toUpperCase()}!`);
      if (this.isOnlineHost()) {
        this.broadcastAuthoritativeState('pass');
      }
      return;
    }

    // Football Rule: Check if reckless tackle missed the ball and fouled an opposing player!
    if (this.activeSetPiece === 'none' && this.setPieceCooldown <= 0 && this.celebrationGlobalTimer <= 0) {
      const fouledOpp = this.players.find(
        (opp) =>
          opp.teamSide !== p.teamSide &&
          opp.role !== 'GK' &&
          Math.hypot(p.x - opp.x, p.z - opp.z) < 1.85
      );
      if (fouledOpp) {
        if (p.teamSide === 'home') this.stats.homeFouls++;
        else this.stats.awayFouls++;
        fouledOpp.tackleTimer = 0.55;

        // Check for Yellow Card booking on late / reckless tackle
        const isReckless = fouledOpp === this.ballOwner || Math.random() < 0.35;
        if (isReckless) {
          if (p.teamSide === 'home') this.stats.homeYellowCards++;
          else this.stats.awayYellowCards++;
          this.activeSkillBanner = `🟨 YELLOW CARD — ${p.data.name.toUpperCase()} BOOKED FOR FOUL!`;
          this.skillBannerTimer = 3.2;
        }

        const halfW = PITCH_WIDTH / 2;
        const inHomePenaltyBox = fouledOpp.x < -halfW + 16.5 && Math.abs(fouledOpp.z) < 13.8;
        const inAwayPenaltyBox = fouledOpp.x > halfW - 16.5 && Math.abs(fouledOpp.z) < 13.8;
        const isPenalty =
          (p.teamSide === 'home' && inHomePenaltyBox) ||
          (p.teamSide === 'away' && inAwayPenaltyBox);

        this.triggerFoulSetPiece(
          fouledOpp.teamSide,
          fouledOpp.x,
          fouledOpp.z,
          isPenalty,
          false,
          p.data.name
        );
      }
    }
  }

  private isMatchWithOfficialRules(): boolean {
    const m = this.config.mode;
    return (
      m === 'quick_match' ||
      m === '11v11' ||
      m === 'world_cup' ||
      m === 'tournament' ||
      m === 'join_code_match' ||
      m === 'dream_team_11v11_online' ||
      m === '1v1' ||
      m === 'attack_vs_defense'
    );
  }

  private triggerThrowIn(throwingTeam: 'home' | 'away', rawX: number, rawZ: number) {
    SoundEngine.playWhistle('foul');
    const halfW = PITCH_WIDTH / 2;
    const halfD = PITCH_DEPTH / 2;
    const throwX = THREE.MathUtils.clamp(rawX, -halfW + 5, halfW - 5);
    const sideSign = rawZ >= 0 ? 1 : -1;
    const throwZ = sideSign * (halfD - 0.08);

    // Find nearest outfield player on throwingTeam to take the Throw-In
    let takerIdx = -1;
    let bestDist = Infinity;
    this.players.forEach((pl, idx) => {
      if (pl.teamSide === throwingTeam && pl.role !== 'GK') {
        const d = Math.hypot(pl.x - throwX, pl.z - throwZ);
        if (d < bestDist) {
          bestDist = d;
          takerIdx = idx;
        }
      }
    });
    if (takerIdx < 0) {
      takerIdx = this.players.findIndex((pl) => pl.teamSide === throwingTeam);
    }
    const taker = this.players[takerIdx];
    if (!taker) return;

    taker.x = throwX;
    taker.z = throwZ;
    taker.vx = 0;
    taker.vz = 0;
    taker.facingAngle = sideSign > 0 ? Math.PI : 0; // Face inside the pitch

    // Position 2 teammates nearby inside the pitch to receive the throw-in
    const attackDir = throwingTeam === 'home' ? 1 : -1;
    const teammates = this.players.filter(
      (pl, idx) => pl.teamSide === throwingTeam && idx !== takerIdx && pl.role !== 'GK'
    );
    if (teammates[0]) {
      teammates[0].x = THREE.MathUtils.clamp(throwX + attackDir * 9, -halfW + 4, halfW - 4);
      teammates[0].z = throwZ - sideSign * 8.5;
      teammates[0].vx = 0;
      teammates[0].vz = 0;
    }
    if (teammates[1]) {
      teammates[1].x = THREE.MathUtils.clamp(throwX - attackDir * 6, -halfW + 4, halfW - 4);
      teammates[1].z = throwZ - sideSign * 12;
      teammates[1].vx = 0;
      teammates[1].vz = 0;
    }

    this.ballOwner = taker;
    this.lastTouchTeam = throwingTeam;
    this.ballPos.set(throwX, 2.08, throwZ);
    this.ballVel.set(0, 0, 0);
    this.ballSpinZ = 0;

    this.activeSetPiece = 'throw_in';
    this.setPieceTeam = throwingTeam;
    this.setPieceTakerIdx = takerIdx;

    const teamName =
      throwingTeam === 'home'
        ? this.config.homeTeam.name.toUpperCase()
        : this.config.awayTeam.name.toUpperCase();
    const isHumanTaker =
      (throwingTeam === 'home' && !this.isOnlineGuest()) ||
      (throwingTeam === 'away' && this.isOnlineMatch());

    if (throwingTeam === 'home' && !this.isOnlineGuest()) {
      this.controlledIdx = takerIdx;
    } else if (throwingTeam === 'away' && this.isOnlineHost()) {
      this.remoteGuestControlledIdx = takerIdx;
    }

    this.setPieceTimer = isHumanTaker ? 4.8 : 1.25;
    this.setPieceLabel = `THROW-IN (${teamName}) · Press [P] Short Throw · [U] Long Throw`;
    this.setCommentary(`THROW-IN AWARDED TO ${teamName}!`, 3.0);

    if (this.isOnlineHost()) {
      this.broadcastAuthoritativeState('whistle_foul');
    }
  }

  private triggerCornerKick(attackingTeam: 'home' | 'away', goalLineX: number, rawZ: number) {
    SoundEngine.playWhistle('foul');
    if (attackingTeam === 'home') this.stats.homeCorners++;
    else this.stats.awayCorners++;

    const halfW = PITCH_WIDTH / 2;
    const halfD = PITCH_DEPTH / 2;
    const cornerX = Math.sign(goalLineX) * (halfW - 0.55);
    const cornerZ = (rawZ >= 0 ? 1 : -1) * (halfD - 0.55);

    // Pick corner taker
    let takerIdx = this.players.findIndex(
      (pl) =>
        pl.teamSide === attackingTeam &&
        (pl.role === 'LW' || pl.role === 'RW' || pl.role === 'CAM' || pl.role === 'CM')
    );
    if (takerIdx < 0) {
      takerIdx = this.players.findIndex((pl) => pl.teamSide === attackingTeam && pl.role !== 'GK');
    }
    const taker = this.players[takerIdx];
    if (!taker) return;

    const boxTargetX = Math.sign(goalLineX) * (halfW - 10.5);
    taker.x = cornerX;
    taker.z = cornerZ;
    taker.vx = 0;
    taker.vz = 0;
    taker.facingAngle = Math.atan2(boxTargetX - cornerX, 0 - cornerZ);

    // Pack the 18-yard penalty box with attackers and defenders for headers!
    let atkSlot = 0;
    let defSlot = 0;
    this.players.forEach((pl, idx) => {
      if (idx === takerIdx || pl.role === 'GK') return;
      pl.vx = 0;
      pl.vz = 0;
      if (pl.teamSide === attackingTeam) {
        if (atkSlot < 5) {
          pl.x = Math.sign(goalLineX) * (halfW - 6.5 - (atkSlot % 3) * 3.2);
          pl.z = ((atkSlot % 4) - 1.5) * 4.2;
          pl.facingAngle = Math.atan2(cornerX - pl.x, cornerZ - pl.z);
        }
        atkSlot++;
      } else {
        if (defSlot < 6) {
          pl.x = Math.sign(goalLineX) * (halfW - 5.5 - (defSlot % 3) * 2.8);
          pl.z = ((defSlot % 4) - 1.5) * 3.8;
          pl.facingAngle = Math.atan2(cornerX - pl.x, cornerZ - pl.z);
        }
        defSlot++;
      }
    });

    this.ballOwner = taker;
    this.lastTouchTeam = attackingTeam;
    this.ballPos.set(cornerX, 0.36, cornerZ);
    this.ballVel.set(0, 0, 0);
    this.ballSpinZ = 0;

    this.activeSetPiece = 'corner_kick';
    this.setPieceTeam = attackingTeam;
    this.setPieceTakerIdx = takerIdx;

    const teamName =
      attackingTeam === 'home'
        ? this.config.homeTeam.name.toUpperCase()
        : this.config.awayTeam.name.toUpperCase();
    const isHumanTaker =
      (attackingTeam === 'home' && !this.isOnlineGuest()) ||
      (attackingTeam === 'away' && this.isOnlineMatch());

    if (attackingTeam === 'home' && !this.isOnlineGuest()) {
      this.controlledIdx = takerIdx;
    } else if (attackingTeam === 'away' && this.isOnlineHost()) {
      this.remoteGuestControlledIdx = takerIdx;
    }

    this.setPieceTimer = isHumanTaker ? 5.2 : 1.35;
    this.setPieceLabel = `🚩 CORNER KICK (${teamName}) · Press [O] Aerial Cross · [P] Short · [C] Curve`;
    this.setCommentary(`CORNER KICK FOR ${teamName}! PLAYERS PACK THE PENALTY BOX!`, 3.5);

    if (this.isOnlineHost()) {
      this.broadcastAuthoritativeState('whistle_foul');
    }
  }

  private triggerGoalKick(defendingTeam: 'home' | 'away') {
    SoundEngine.playWhistle('foul');
    const halfW = PITCH_WIDTH / 2;
    const gkX = defendingTeam === 'home' ? -halfW + 5.6 : halfW - 5.6;
    const gkZ = 0;

    // Move outfield players back toward their tactical formation positions
    this.players.forEach((pl) => {
      if (pl.role !== 'GK') {
        pl.x = pl.baseX * 0.75;
        pl.z = pl.baseZ;
        pl.vx = 0;
        pl.vz = 0;
      }
    });

    let takerIdx = this.players.findIndex(
      (pl) => pl.teamSide === defendingTeam && pl.role !== 'GK'
    );
    if (takerIdx < 0) {
      takerIdx = this.players.findIndex((pl) => pl.teamSide === defendingTeam);
    }
    const taker = this.players[takerIdx];
    if (!taker) return;

    taker.x = gkX - (defendingTeam === 'home' ? 0.65 : -0.65);
    taker.z = gkZ;
    taker.vx = 0;
    taker.vz = 0;
    taker.facingAngle = defendingTeam === 'home' ? Math.PI / 2 : -Math.PI / 2;

    this.ballOwner = taker;
    this.lastTouchTeam = defendingTeam;
    this.ballPos.set(gkX, 0.36, gkZ);
    this.ballVel.set(0, 0, 0);
    this.ballSpinZ = 0;

    this.activeSetPiece = 'goal_kick';
    this.setPieceTeam = defendingTeam;
    this.setPieceTakerIdx = takerIdx;

    const teamName =
      defendingTeam === 'home'
        ? this.config.homeTeam.name.toUpperCase()
        : this.config.awayTeam.name.toUpperCase();
    const isHumanTaker =
      (defendingTeam === 'home' && !this.isOnlineGuest()) ||
      (defendingTeam === 'away' && this.isOnlineMatch());

    if (defendingTeam === 'home' && !this.isOnlineGuest()) {
      this.controlledIdx = takerIdx;
    } else if (defendingTeam === 'away' && this.isOnlineHost()) {
      this.remoteGuestControlledIdx = takerIdx;
    }

    this.setPieceTimer = isHumanTaker ? 4.5 : 1.25;
    this.setPieceLabel = `GOAL KICK (${teamName}) · Press [O / S] Long Kick · [P] Short Pass`;
    this.setCommentary(`GOAL KICK AWARDED TO ${teamName}!`, 2.8);

    if (this.isOnlineHost()) {
      this.broadcastAuthoritativeState('whistle_foul');
    }
  }

  private triggerFoulSetPiece(
    awardedTeam: 'home' | 'away',
    spotX: number,
    spotZ: number,
    isPenalty: boolean,
    isOffside: boolean,
    playerName: string
  ) {
    SoundEngine.playWhistle('foul');
    const halfW = PITCH_WIDTH / 2;
    const attackDir = awardedTeam === 'home' ? 1 : -1;
    const ballX = isPenalty
      ? attackDir * (halfW - 11.0)
      : THREE.MathUtils.clamp(spotX, -halfW + 8, halfW - 8);
    const ballZ = isPenalty ? 0 : THREE.MathUtils.clamp(spotZ, -PITCH_DEPTH / 2 + 4, PITCH_DEPTH / 2 - 4);

    let takerIdx = this.players.findIndex(
      (pl) => pl.teamSide === awardedTeam && (pl.role === 'ST' || pl.role === 'CAM' || pl.role === 'LW')
    );
    if (takerIdx < 0) {
      takerIdx = this.players.findIndex((pl) => pl.teamSide === awardedTeam && pl.role !== 'GK');
    }
    const taker = this.players[takerIdx];
    if (!taker) return;

    taker.x = ballX - attackDir * 1.1;
    taker.z = ballZ;
    taker.vx = 0;
    taker.vz = 0;
    taker.facingAngle = attackDir > 0 ? Math.PI / 2 : -Math.PI / 2;

    if (isPenalty) {
      // Clear everyone else outside the 18-yard box
      this.players.forEach((pl, idx) => {
        if (idx === takerIdx || pl.role === 'GK') return;
        pl.x = attackDir * (halfW - 18.5);
        pl.z = (idx - 10) * 1.6;
        pl.vx = 0;
        pl.vz = 0;
      });
    } else if (!isOffside) {
      // Set up a 3-player defensive wall 9.15m toward goal
      let wallCount = 0;
      this.players.forEach((pl) => {
        if (pl.teamSide !== awardedTeam && pl.role !== 'GK' && wallCount < 3) {
          pl.x = THREE.MathUtils.clamp(ballX + attackDir * 9.0, -halfW + 3, halfW - 3);
          pl.z = ballZ + (wallCount - 1) * 1.15;
          pl.vx = 0;
          pl.vz = 0;
          pl.facingAngle = attackDir > 0 ? -Math.PI / 2 : Math.PI / 2;
          wallCount++;
        }
      });
    }

    this.ballOwner = taker;
    this.lastTouchTeam = awardedTeam;
    this.ballPos.set(ballX, 0.36, ballZ);
    this.ballVel.set(0, 0, 0);
    this.ballSpinZ = 0;

    this.activeSetPiece = isPenalty ? 'penalty_kick' : 'free_kick';
    this.setPieceTeam = awardedTeam;
    this.setPieceTakerIdx = takerIdx;

    const teamName =
      awardedTeam === 'home'
        ? this.config.homeTeam.name.toUpperCase()
        : this.config.awayTeam.name.toUpperCase();
    const isHumanTaker =
      (awardedTeam === 'home' && !this.isOnlineGuest()) ||
      (awardedTeam === 'away' && this.isOnlineMatch());

    if (awardedTeam === 'home' && !this.isOnlineGuest()) {
      this.controlledIdx = takerIdx;
    } else if (awardedTeam === 'away' && this.isOnlineHost()) {
      this.remoteGuestControlledIdx = takerIdx;
    }

    this.setPieceTimer = isHumanTaker ? 5.2 : 1.4;
    if (isOffside) {
      this.setPieceLabel = `🚩 OFFSIDE (${playerName.toUpperCase()}) · INDIRECT FREE KICK FOR ${teamName}`;
      this.setCommentary(`OFFSIDE FLAG UP! ${playerName.toUpperCase()} CAUGHT PAST THE LAST DEFENDER!`, 3.5);
    } else if (isPenalty) {
      this.setPieceLabel = `⚽ PENALTY KICK (${teamName}) · Hold [S] or [C] to Shoot at Goal!`;
      this.setCommentary(`PENALTY KICK AWARDED TO ${teamName} AFTER FOUL IN THE BOX!`, 3.8);
    } else {
      this.setPieceLabel = `FREE KICK (${teamName}) · Press [C] Curve Shot · [S] Shoot · [P] Pass`;
      this.setCommentary(`FOUL BY ${playerName.toUpperCase()}! FREE KICK TO ${teamName}!`, 3.2);
    }

    if (this.isOnlineHost()) {
      this.broadcastAuthoritativeState('whistle_foul');
    }
  }

  private executeAutoSetPiece() {
    const taker = this.players[this.setPieceTakerIdx];
    const sp = this.activeSetPiece;
    const team = this.setPieceTeam;
    this.activeSetPiece = 'none';
    this.setPieceLabel = '';
    this.setPieceCooldown = 1.25;
    if (!taker) return;

    this.ballOwner = null;
    this.lastTouchTeam = team;
    taker.kickTimer = 0.4;
    const attackDir = team === 'home' ? 1 : -1;

    if (sp === 'throw_in') {
      const mate = this.players.find(
        (m, idx) => m.teamSide === team && idx !== this.setPieceTakerIdx && m.role !== 'GK'
      );
      const tx = mate ? mate.x : taker.x + attackDir * 10;
      const tz = mate ? mate.z : 0;
      const dx = tx - taker.x;
      const dz = tz - taker.z;
      const d = Math.max(1, Math.hypot(dx, dz));
      this.ballVel.set((dx / d) * 19, 3.6, (dz / d) * 19);
      SoundEngine.playPass();
    } else if (sp === 'corner_kick') {
      const boxX = attackDir * (PITCH_WIDTH / 2 - 9.5);
      const boxZ = (Math.random() - 0.5) * 6;
      const dx = boxX - this.ballPos.x;
      const dz = boxZ - this.ballPos.z;
      const d = Math.max(1, Math.hypot(dx, dz));
      this.ballVel.set((dx / d) * 24, 9.2, (dz / d) * 24);
      this.ballSpinZ = this.ballPos.z > 0 ? -4.5 : 4.5;
      SoundEngine.playKick(0.75, true);
      this.setCommentary(`${taker.data.name.toUpperCase()} WHIPS IN THE CORNER CROSS!`);
    } else if (sp === 'penalty_kick') {
      this.performShotForPlayer(
        taker,
        'shoot',
        0.78,
        (Math.random() - 0.5) * (GOAL_WIDTH * 0.72)
      );
    } else {
      // Goal Kick or Free Kick
      const mate = this.players.find(
        (m, idx) =>
          m.teamSide === team &&
          idx !== this.setPieceTakerIdx &&
          m.role !== 'GK' &&
          (m.x - taker.x) * attackDir > 4
      );
      if (mate) {
        const dx = mate.x - this.ballPos.x;
        const dz = mate.z - this.ballPos.z;
        const d = Math.max(1, Math.hypot(dx, dz));
        this.ballVel.set((dx / d) * 23, 3.2, (dz / d) * 23);
      } else {
        this.ballVel.set(attackDir * 24, 5.5, (Math.random() - 0.5) * 8);
      }
      SoundEngine.playKick(0.7, false);
    }

    if (this.isOnlineHost()) {
      this.broadcastAuthoritativeState('kick');
    }
  }

  private performGoalkeeperDive(teamSideOverride?: 'home' | 'away') {
    const side = teamSideOverride || this.getMyTeamSide();
    const gk = this.players.find((p) => p.teamSide === side && p.role === 'GK');
    if (!gk || gk.diveTimer > 0) return;

    if (!teamSideOverride && this.isOnlineGuest()) {
      gk.diveTimer = 0.75;
      this.sendImmediateGuestAction({ action: 'gk_dive' });
      return;
    }

    let diveZ = 0;
    if (this.keysDown.has(this.config.keyBindings.moveLeft) || this.keysDown.has('ArrowLeft')) {
      diveZ = -1;
    } else if (this.keysDown.has(this.config.keyBindings.moveRight) || this.keysDown.has('ArrowRight')) {
      diveZ = 1;
    } else if (Math.abs(this.ballPos.z - gk.z) > 0.4) {
      diveZ = Math.sign(this.ballPos.z - gk.z);
    } else {
      diveZ = Math.sign(this.mouseWorldTarget.z - gk.z);
    }

    gk.diveTimer = 0.75;
    gk.diveDirZ = diveZ || 1;
    gk.diveHeight = this.ballPos.y > 1.6 ? 1.4 : 0.4;
    gk.vz = gk.diveDirZ * 11.5;

    // Check if ball is near enough to parry
    const dist = Math.hypot(gk.x - this.ballPos.x, gk.z - this.ballPos.z);
    if (dist < 3.4) {
      this.ballOwner = null;
      const clearDir = side === 'home' ? 1 : -1;
      this.ballVel.x = clearDir * (Math.abs(this.ballVel.x) * 0.75 + 10);
      this.ballVel.z = gk.diveDirZ * 9;
      this.ballVel.y = 4.5;
      if (side === 'home') {
        this.stats.homeSaves++;
        this.challengeScore += 500;
      } else {
        this.stats.awaySaves++;
      }
      SoundEngine.playKick(0.85, false);
      SoundEngine.playCrowdReaction('cheer');
      this.setCommentary(`SPECTACULAR DIVING SAVE BY ${gk.data.name.toUpperCase()}!`);
      if (this.isOnlineHost()) {
        this.broadcastAuthoritativeState('save');
      }
    }
  }

  private triggerGoal(scoringTeam: 'home' | 'away') {
    if (this.celebrationGlobalTimer > 0) return;

    if (scoringTeam === 'home') {
      this.homeScore++;
      this.challengeScore += 1000;
    } else {
      this.awayScore++;
    }

    SoundEngine.playGoalRoar();
    SoundEngine.playWhistle('kickoff');

    const scorer =
      this.players
        .filter((p) => p.teamSide === scoringTeam)
        .sort((a, b) => Math.hypot(a.x - this.ballPos.x, a.z - this.ballPos.z) - Math.hypot(b.x - this.ballPos.x, b.z - this.ballPos.z))[0] ||
      this.players[0];

    this.celebrationScorerName = `${scorer.data.name} (${Math.min(90, Math.max(1, Math.floor((this.elapsedRealSeconds / this.matchDurationRealSeconds) * 90)))}')`;
    this.celebrationGlobalTimer = 3.8;
    scorer.celebrationTimer = 3.8;

    this.setCommentary(`GOAL! ${scorer.data.name.toUpperCase()} SCORES FOR ${scoringTeam === 'home' ? this.config.homeTeam.name.toUpperCase() : this.config.awayTeam.name.toUpperCase()}!`, 4.0);

    // Launch 3D Goal Confetti & Fireworks
    const goalX = scoringTeam === 'home' ? PITCH_WIDTH / 2 : -PITCH_WIDTH / 2;
    const posAttr = this.stadiumObjs.confettiSystem.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < posAttr.count; i++) {
      posAttr.setXYZ(
        i,
        goalX + (Math.random() - 0.5) * 18,
        2 + Math.random() * 6,
        (Math.random() - 0.5) * 20
      );
      this.stadiumObjs.confettiVelocities[i * 3] = (Math.random() - 0.5) * 8;
      this.stadiumObjs.confettiVelocities[i * 3 + 1] = 6 + Math.random() * 10;
      this.stadiumObjs.confettiVelocities[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    posAttr.needsUpdate = true;

    this.netRippleSide = scoringTeam === 'home' ? 'right' : 'left';
    this.netRippleTimer = 1.2;

    if (this.isOnlineHost()) {
      this.broadcastAuthoritativeState(scoringTeam === 'home' ? 'goal_home' : 'goal_away');
    }
  }

  private launchGoalConfettiFX(scoringTeam: 'home' | 'away') {
    const goalX = scoringTeam === 'home' ? PITCH_WIDTH / 2 : -PITCH_WIDTH / 2;
    const posAttr = this.stadiumObjs.confettiSystem.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < posAttr.count; i++) {
      posAttr.setXYZ(
        i,
        goalX + (Math.random() - 0.5) * 18,
        2 + Math.random() * 6,
        (Math.random() - 0.5) * 20
      );
      this.stadiumObjs.confettiVelocities[i * 3] = (Math.random() - 0.5) * 8;
      this.stadiumObjs.confettiVelocities[i * 3 + 1] = 6 + Math.random() * 10;
      this.stadiumObjs.confettiVelocities[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    posAttr.needsUpdate = true;
    this.netRippleSide = scoringTeam === 'home' ? 'right' : 'left';
    this.netRippleTimer = 1.2;
  }

  private sendImmediateGuestAction(
    discreteAction: NonNullable<OnlineGuestInputPacket['discreteAction']>
  ) {
    if (!this.config.onlineConfig?.roomCode) return;
    const controlled = this.getControlledPlayer();
    this.netSeq++;
    FriendRoomService.sendGuestInput({
      roomCode: this.config.onlineConfig.roomCode,
      clientId: FriendRoomService.getClientId(),
      seq: this.netSeq,
      controlledIdx: this.controlledIdx,
      moveX: 0,
      moveZ: 0,
      isSprinting: false,
      isPressing: false,
      mouseWorldX: this.mouseWorldTarget.x,
      mouseWorldZ: this.mouseWorldTarget.z,
      guestX: controlled?.x,
      guestZ: controlled?.z,
      guestVx: controlled?.vx,
      guestVz: controlled?.vz,
      guestFacing: controlled?.facingAngle,
      discreteAction,
    });
  }

  private handleRemoteGuestInput(packet: OnlineGuestInputPacket) {
    const cid = packet.clientId || 'guest_default';
    this.remotePlayerInputs.set(cid, packet);
    this.remoteGuestInput = packet;

    if (
      typeof packet.controlledIdx === 'number' &&
      this.players[packet.controlledIdx] &&
      this.players[packet.controlledIdx].role !== 'GK' &&
      packet.controlledIdx !== this.controlledIdx
    ) {
      this.remotePlayerControlledMap.set(cid, packet.controlledIdx);
      if (this.players[packet.controlledIdx].teamSide === 'away') {
        this.remoteGuestControlledIdx = packet.controlledIdx;
      }
    }

    const mappedIdx = this.remotePlayerControlledMap.get(cid) ?? this.remoteGuestControlledIdx;
    const awayControlled =
      this.players[mappedIdx] ||
      this.players.find((p) => p.teamSide === 'away' && p.role !== 'GK');

    if (awayControlled && typeof packet.guestX === 'number' && typeof packet.guestZ === 'number') {
      const drift = Math.hypot(awayControlled.x - packet.guestX, awayControlled.z - packet.guestZ);
      if (drift > 4.2) {
        awayControlled.x = packet.guestX;
        awayControlled.z = packet.guestZ;
      } else {
        awayControlled.x = THREE.MathUtils.lerp(awayControlled.x, packet.guestX, 0.45);
        awayControlled.z = THREE.MathUtils.lerp(awayControlled.z, packet.guestZ, 0.45);
      }
      if (typeof packet.guestVx === 'number') awayControlled.vx = packet.guestVx;
      if (typeof packet.guestVz === 'number') awayControlled.vz = packet.guestVz;
      if (typeof packet.guestFacing === 'number') awayControlled.facingAngle = packet.guestFacing;
    }

    if (packet.discreteAction && awayControlled) {
      const act = packet.discreteAction;
      const pSide = awayControlled.teamSide;
      const attackDir = pSide === 'home' ? 1 : -1;

      if (act.action === 'shoot' || act.action === 'curve' || act.action === 'chip') {
        this.performShotForPlayer(
          awayControlled,
          act.action,
          act.powerPct ?? 0.65,
          act.aimZ ?? 0
        );
        this.broadcastAuthoritativeState('kick');
      } else if (act.action === 'pass' || act.action === 'through' || act.action === 'cross') {
        const distToBall = Math.hypot(awayControlled.x - this.ballPos.x, awayControlled.z - this.ballPos.z);
        if (this.ballOwner === awayControlled || distToBall < 3.0) {
          const wasThrowIn = this.activeSetPiece === 'throw_in';
          if (this.activeSetPiece !== 'none') {
            this.activeSetPiece = 'none';
            this.setPieceLabel = '';
            this.setPieceCooldown = 1.25;
          }
          this.ballOwner = null;
          this.lastTouchTeam = pSide;
          awayControlled.kickTimer = wasThrowIn ? 0.42 : 0.32;
          if (pSide === 'home') this.stats.homePasses++;
          else this.stats.awayPasses++;

          // Find best open Dream Team teammate in aimed direction (for 11v11 Online!)
          const aimX = typeof act.aimX === 'number' ? act.aimX : attackDir;
          const aimZ = typeof act.aimZ === 'number' ? act.aimZ : 0;
          const passType = act.action === 'pass' ? 'short' : act.action;
          const bestMate = this.findBestTeammateForPass(
            awayControlled,
            new THREE.Vector2(aimX, aimZ),
            passType
          );

          if (bestMate) {
            const targetMate = bestMate;

            // Official Offside Rule in 11v11 Online (Disabled in 1v1!)
            if (
              !wasThrowIn &&
              this.isMatchWithOfficialRules() &&
              !this.is1v1Match() &&
              this.setPieceCooldown <= 0 &&
              (targetMate.x - awayControlled.x) * attackDir > 1.5 &&
              targetMate.x * attackDir > 1.0
            ) {
              const oppSide: 'home' | 'away' = pSide === 'home' ? 'away' : 'home';
              const oppsCloserToGoal = this.players.filter(
                (opp) => opp.teamSide === oppSide && (opp.x - targetMate.x) * attackDir >= -0.65
              ).length;
              if (oppsCloserToGoal < 2) {
                this.passTargetPlayer = null;
                this.passAssistTimer = 0;
                if (pSide === 'home') this.stats.homeOffsides++;
                else this.stats.awayOffsides++;
                this.triggerFoulSetPiece(
                  oppSide,
                  targetMate.x,
                  targetMate.z,
                  false,
                  true,
                  targetMate.data.name
                );
                return;
              }
            }

            const leadX = (act.action === 'through' ? 4.8 : act.action === 'cross' ? 2.2 : 0.4) * attackDir;
            const dx = targetMate.x + leadX - awayControlled.x;
            const dz = targetMate.z - awayControlled.z;
            const d = Math.max(1, Math.hypot(dx, dz));
            const speed =
              act.action === 'through'
                ? Math.min(32, Math.max(24, 18 + d * 0.52))
                : Math.min(31, Math.max(23, 17 + d * 0.55));
            this.ballVel.set((dx / d) * speed, act.action === 'cross' ? 7.8 : 0.9, (dz / d) * speed);
            this.passTargetPlayer = targetMate;
            this.passLeadX = leadX;
            this.passAssistTimer = Math.min(2.1, Math.max(0.75, d / 16));
            const targetIdx = this.players.indexOf(targetMate);
            if (!this.config.onlineConfig?.lockToAssignedPlayer && targetIdx !== this.controlledIdx) {
              this.remotePlayerControlledMap.set(cid, targetIdx);
              if (pSide === 'away') this.remoteGuestControlledIdx = targetIdx;
            }
          } else {
            this.passTargetPlayer = null;
            this.passAssistTimer = 0;
            const dx = (PITCH_WIDTH / 2) * attackDir - awayControlled.x;
            const dz = (act.aimZ ?? 0) - awayControlled.z;
            const d = Math.max(1, Math.hypot(dx, dz));
            const speed = act.action === 'through' ? 26 : 23;
            this.ballVel.set((dx / d) * speed, act.action === 'cross' ? 7.8 : 1.0, (dz / d) * speed);
          }
          SoundEngine.playPass();
          this.broadcastAuthoritativeState('pass');
        }
      } else if (act.action === 'bicycle') {
        this.executeBicycleKick(awayControlled);
      } else if (act.action === 'rainbow') {
        this.executeRainbowFlick(awayControlled);
      } else if (act.action === 'skill') {
        this.executeSkillMove(awayControlled);
      } else if (act.action === 'tackle') {
        this.executeTackle(awayControlled);
      } else if (act.action === 'gk_dive') {
        this.performGoalkeeperDive(pSide);
      }
    }
  }

  private broadcastAuthoritativeState(
    soundEvent?: OnlineMatchStateSyncPacket['soundEvent']
  ) {
    if (!this.config.onlineConfig?.roomCode) return;
    this.netSeq++;
    const ownerIdx = this.ballOwner ? this.players.indexOf(this.ballOwner) : -1;
    const packet: OnlineMatchStateSyncPacket = {
      roomCode: this.config.onlineConfig.roomCode,
      seq: this.netSeq,
      timestamp: performance.now(),
      ball: {
        x: this.ballPos.x,
        y: this.ballPos.y,
        z: this.ballPos.z,
        vx: this.ballVel.x,
        vy: this.ballVel.y,
        vz: this.ballVel.z,
        spinZ: this.ballSpinZ,
        ownerIdx,
      },
      players: this.players.map((p) => ({
        x: p.x,
        y: p.y,
        z: p.z,
        vx: p.vx,
        vz: p.vz,
        facingAngle: p.facingAngle,
        animPhase: p.animPhase,
        kickTimer: p.kickTimer,
        tackleTimer: p.tackleTimer,
        skillTimer: p.skillTimer,
        rainbowTimer: p.rainbowTimer,
        bicycleTimer: p.bicycleTimer,
        diveTimer: p.diveTimer,
        diveDirZ: p.diveDirZ,
        celebrationTimer: p.celebrationTimer,
        stamina: p.stamina,
        activeSkillName: p.activeSkillName,
      })),
      match: {
        homeScore: this.homeScore,
        awayScore: this.awayScore,
        elapsedRealSeconds: this.elapsedRealSeconds,
        celebrationGlobalTimer: this.celebrationGlobalTimer,
        celebrationScorerName: this.celebrationScorerName,
        activeSkillBanner: this.activeSkillBanner,
        skillBannerTimer: this.skillBannerTimer,
        commentaryBanner: this.commentaryBanner,
        commentaryTimer: this.commentaryTimer,
        isMatchOver: this.isMatchOver,
        homePossessionFrames: this.homePossessionFrames,
        awayPossessionFrames: this.awayPossessionFrames,
        activeSetPiece: this.activeSetPiece,
        setPieceTeam: this.setPieceTeam,
        setPieceLabel: this.setPieceLabel,
        stats: { ...this.stats },
      },
      soundEvent,
    };
    FriendRoomService.sendMatchStateSync(packet);
  }

  private handleRemoteStateSync(packet: OnlineMatchStateSyncPacket) {
    if (packet.seq <= this.lastReceivedSeq && packet.seq > 5) return;
    this.lastReceivedSeq = packet.seq;

    // Synchronize Match Score, Timer, Commentary & Banners
    this.homeScore = packet.match.homeScore;
    this.awayScore = packet.match.awayScore;
    this.elapsedRealSeconds = packet.match.elapsedRealSeconds;
    this.celebrationGlobalTimer = packet.match.celebrationGlobalTimer;
    this.celebrationScorerName = packet.match.celebrationScorerName;
    this.activeSkillBanner = packet.match.activeSkillBanner;
    this.skillBannerTimer = packet.match.skillBannerTimer;
    this.commentaryBanner = packet.match.commentaryBanner;
    this.commentaryTimer = packet.match.commentaryTimer;
    this.isMatchOver = packet.match.isMatchOver;
    this.homePossessionFrames = packet.match.homePossessionFrames;
    this.awayPossessionFrames = packet.match.awayPossessionFrames;
    this.activeSetPiece = packet.match.activeSetPiece || 'none';
    this.setPieceTeam = packet.match.setPieceTeam || 'home';
    this.setPieceLabel = packet.match.setPieceLabel || '';
    this.stats = { ...this.stats, ...packet.match.stats };

    // Synchronize Ball Target & Velocity
    this.remoteTargetBallPos.set(packet.ball.x, packet.ball.y, packet.ball.z);
    const ballDrift = this.ballPos.distanceTo(this.remoteTargetBallPos);
    if (ballDrift > 4.2 || packet.soundEvent === 'goal_home' || packet.soundEvent === 'goal_away') {
      this.ballPos.copy(this.remoteTargetBallPos);
    }
    this.ballVel.set(packet.ball.vx, packet.ball.vy, packet.ball.vz);
    this.ballSpinZ = packet.ball.spinZ;
    this.ballOwner =
      packet.ball.ownerIdx >= 0 && packet.ball.ownerIdx < this.players.length
        ? this.players[packet.ball.ownerIdx]
        : null;
    if (
      this.isOnlineGuest() &&
      packet.ball.ownerIdx >= 0 &&
      this.players[packet.ball.ownerIdx]?.teamSide === 'away' &&
      this.players[packet.ball.ownerIdx]?.role !== 'GK'
    ) {
      this.controlledIdx = packet.ball.ownerIdx;
    }

    // Synchronize Players
    this.remoteTargetPlayers = packet.players.map((ps) => ({
      x: ps.x,
      y: ps.y,
      z: ps.z,
      vx: ps.vx,
      vz: ps.vz,
      facingAngle: ps.facingAngle,
    }));

    packet.players.forEach((ps, idx) => {
      const p = this.players[idx];
      if (!p) return;
      p.kickTimer = Math.max(p.kickTimer, ps.kickTimer);
      p.tackleTimer = Math.max(p.tackleTimer, ps.tackleTimer);
      p.skillTimer = Math.max(p.skillTimer, ps.skillTimer);
      p.rainbowTimer = Math.max(p.rainbowTimer, ps.rainbowTimer);
      p.bicycleTimer = Math.max(p.bicycleTimer, ps.bicycleTimer || 0);
      p.diveTimer = Math.max(p.diveTimer, ps.diveTimer);
      p.diveDirZ = ps.diveDirZ;
      p.celebrationTimer = ps.celebrationTimer;
      p.activeSkillName = ps.activeSkillName;

      // For non-controlled players (or during kickoff/celebration), reconcile positions
      if (idx !== this.controlledIdx || this.celebrationGlobalTimer > 0) {
        const d = Math.hypot(p.x - ps.x, p.z - ps.z);
        if (d > 4.5) {
          p.x = ps.x;
          p.z = ps.z;
        }
        p.vx = ps.vx;
        p.vz = ps.vz;
        p.facingAngle = ps.facingAngle;
      } else {
        // Gentle rubber-band reconciliation for controlled guest player if severe desync (> 5.5m)
        const d = Math.hypot(p.x - ps.x, p.z - ps.z);
        if (d > 5.5) {
          p.x = THREE.MathUtils.lerp(p.x, ps.x, 0.5);
          p.z = THREE.MathUtils.lerp(p.z, ps.z, 0.5);
        }
      }
    });

    // Trigger Synchronized Match Sound & Visual Events on Guest
    if (packet.soundEvent === 'goal_home') {
      SoundEngine.playGoalRoar();
      SoundEngine.playWhistle('kickoff');
      this.launchGoalConfettiFX('home');
    } else if (packet.soundEvent === 'goal_away') {
      SoundEngine.playGoalRoar();
      SoundEngine.playWhistle('kickoff');
      this.launchGoalConfettiFX('away');
    } else if (packet.soundEvent === 'kick') {
      SoundEngine.playKick(0.75, false);
    } else if (packet.soundEvent === 'pass') {
      SoundEngine.playPass();
    } else if (packet.soundEvent === 'save') {
      SoundEngine.playKick(0.85, false);
      SoundEngine.playCrowdReaction('cheer');
    } else if (packet.soundEvent === 'post') {
      SoundEngine.playPostHit();
    } else if (packet.soundEvent === 'whistle_foul') {
      SoundEngine.playWhistle('foul');
    } else if (packet.soundEvent === 'whistle_fulltime') {
      SoundEngine.playWhistle('fulltime');
    }
  }

  private updatePhysics(dt: number) {
    // 1. Charge shot meter if active
    if (this.chargingAction !== 'none') {
      this.chargeLevel = Math.min(100, this.chargeLevel + dt * 115);
    }

    // 1B. Set-Piece Cooldown & Active Set-Piece Timer
    if (this.setPieceCooldown > 0) {
      this.setPieceCooldown = Math.max(0, this.setPieceCooldown - dt);
    }
    if (this.autoSwitchCooldown > 0) {
      this.autoSwitchCooldown = Math.max(0, this.autoSwitchCooldown - dt);
    }
    if (this.activeSetPiece !== 'none' && !this.isOnlineGuest()) {
      this.setPieceTimer -= dt;
      if (this.setPieceTimer <= 0) {
        this.executeAutoSetPiece();
      }
    }

    // 1C. Automatic Player Switching (When Defending or Chasing Loose / Air Balls)
    if (
      !this.config.onlineConfig?.lockToAssignedPlayer &&
      this.autoSwitchMode !== 'manual' &&
      this.autoSwitchCooldown <= 0 &&
      this.activeSetPiece === 'none' &&
      this.celebrationGlobalTimer <= 0 &&
      !this.manualGKActive &&
      this.chargingAction === 'none'
    ) {
      const mySide = this.getMyTeamSide();
      const currentControlled = this.getControlledPlayer();
      const myTeamHasBall = this.ballOwner?.teamSide === mySide;

      if (!myTeamHasBall && currentControlled) {
        const isAirOrLoose =
          this.ballOwner === null && (this.ballPos.y > 0.8 || this.passAssistTimer > 0);
        const allowSwitch =
          this.autoSwitchMode === 'auto' ||
          (this.autoSwitchMode === 'air_balls' && isAirOrLoose);

        if (allowSwitch) {
          const currDist = Math.hypot(
            currentControlled.x - this.ballPos.x,
            currentControlled.z - this.ballPos.z
          );
          let bestIdx = this.controlledIdx;
          let bestDist = currDist;

          this.players.forEach((pl, idx) => {
            if (pl.teamSide !== mySide || pl.role === 'GK') return;
            const d = Math.hypot(pl.x - this.ballPos.x, pl.z - this.ballPos.z);
            if (d < bestDist) {
              bestDist = d;
              bestIdx = idx;
            }
          });

          // Switch if another teammate is meaningfully closer to the ball
          if (bestIdx !== this.controlledIdx && currDist - bestDist > 2.65) {
            this.controlledIdx = bestIdx;
            this.autoSwitchCooldown = 0.6;
          }
        }
      }
    }

    // 2. Handle Celebration Timer
    if (this.celebrationGlobalTimer > 0) {
      this.celebrationGlobalTimer -= dt;
      if (this.celebrationGlobalTimer <= 0) {
        this.setupModePositions();
      }
    }

    // 3. Goalkeeper Challenge Auto-Shooter
    if (
      (this.config.mode === 'gk_challenge' || (this.config.mode === 'practice' && this.practiceDrill === 'Goalkeeper Saves')) &&
      this.celebrationGlobalTimer <= 0
    ) {
      if (this.gkAutoShotTimer > 0) {
        this.gkAutoShotTimer -= dt;
        if (this.gkAutoShotTimer <= 0) {
          // Fire AI shot toward Home Goal (-PITCH_WIDTH/2)
          const targetZ = (Math.random() - 0.5) * (GOAL_WIDTH * 0.85);
          const dx = -PITCH_WIDTH / 2 - this.ballPos.x;
          const dz = targetZ - this.ballPos.z;
          const dist = Math.max(1, Math.hypot(dx, dz));
          const speed = 29 + Math.random() * 9;
          this.ballVel.set((dx / dist) * speed, 2.5 + Math.random() * 3.8, (dz / dist) * speed);
          this.ballSpinZ = (Math.random() - 0.5) * 10;
          this.challengeAttempts++;
          SoundEngine.playKick(0.85, true);
          this.setCommentary('INCOMING STRIKE! PRESS V OR CLICK TO DIVE SAVE!');
        }
      } else if (Math.hypot(this.ballVel.x, this.ballVel.z) < 1.5 || this.ballPos.x > -10) {
        this.setupModePositions();
      }
    }

    // 4. Controlled Player Movement
    const controlled = this.getControlledPlayer();
    const kb = this.config.keyBindings;

    if (controlled && this.celebrationGlobalTimer <= 0) {
      let moveX = 0;
      let moveZ = 0;

      // W = Forward (toward opponent goal +X, or Up-pitch -Z depending on camera; let's make W/Up move North -Z and D/Right move +X in Broadcast, EXCEPT in GK mode where W/S/A/D moves along goal line!)
      // Wait: Let's check the user prompt carefully:
      // W = Move Forward, O = Move Backward, A = Move Left, D = Move Right
      // In Broadcast view (left-to-right pitch), players naturally use W/Up for North (-Z), O/Down for South (+Z), A/Left for West (-X), D/Right for East (+X), OR in Player/GK camera W moves forward (+X) and A/D moves left/right (-Z/+Z). Let's map camera-relative movement so W ALWAYS moves forward relative to the active camera or toward the attacking goal!
      const isBehindCam = this.config.cameraMode === 'Player' || this.config.cameraMode === 'Goalkeeper';

      const upPressed = this.keysDown.has(kb.moveForward) || this.keysDown.has('ArrowUp');
      const downPressed = this.keysDown.has(kb.moveBackward) || this.keysDown.has('ArrowDown');
      const leftPressed = this.keysDown.has(kb.moveLeft) || this.keysDown.has('ArrowLeft');
      const rightPressed = this.keysDown.has(kb.moveRight) || this.keysDown.has('ArrowRight');

      if (isBehindCam) {
        if (upPressed) moveX += 1;
        if (downPressed) moveX -= 1;
        if (leftPressed) moveZ -= 1;
        if (rightPressed) moveZ += 1;
      } else {
        if (upPressed) moveZ -= 1;
        if (downPressed) moveZ += 1;
        if (leftPressed) moveX -= 1;
        if (rightPressed) moveX += 1;
      }

      // Mobile / Touch Thumbstick Movement Support
      if (moveX === 0 && moveZ === 0 && (this.touchMoveX !== 0 || this.touchMoveZ !== 0)) {
        moveX = this.touchMoveX;
        moveZ = this.touchMoveZ;
      }

      // Mouse-only movement support if ControlScheme === 'Mouse'
      if (this.config.controlScheme === 'Mouse' && moveX === 0 && moveZ === 0) {
        const mdx = this.mouseWorldTarget.x - controlled.x;
        const mdz = this.mouseWorldTarget.z - controlled.z;
        if (Math.hypot(mdx, mdz) > 1.8) {
          moveX = mdx;
          moveZ = mdz;
        }
      }

      const isSprinting =
        (this.keysDown.has(kb.sprint) || this.keysDown.has('ShiftLeft') || this.touchSprint) &&
        controlled.stamina > 8;
      const paceFactor = 0.8 + (controlled.data.attributes.pace / 100) * 0.35;
      const baseSpeed = (isSprinting ? 12.2 : 8.6) * paceFactor * (controlled.skillTimer > 0 ? 1.25 : 1.0);

      if (moveX !== 0 || moveZ !== 0) {
        const len = Math.hypot(moveX, moveZ);
        const nx = moveX / len;
        const nz = moveZ / len;
        controlled.vx = THREE.MathUtils.lerp(controlled.vx, nx * baseSpeed, dt * 12);
        controlled.vz = THREE.MathUtils.lerp(controlled.vz, nz * baseSpeed, dt * 12);
        controlled.facingAngle = Math.atan2(nx, nz);

        if (isSprinting) {
          controlled.stamina = Math.max(0, controlled.stamina - dt * 6.5);
        }
      } else {
        controlled.vx *= Math.pow(0.08, dt);
        controlled.vz *= Math.pow(0.08, dt);
        controlled.stamina = Math.min(100, controlled.stamina + dt * 3.5);
      }
    }

    // 5. AI Tactical Movement for Teammates & Opponents
    const diffMult =
      this.config.difficulty === 'World Class'
        ? 1.12
        : this.config.difficulty === 'Professional'
        ? 1.02
        : this.config.difficulty === 'Hard'
        ? 0.94
        : this.config.difficulty === 'Normal'
        ? 0.85
        : 0.74;

    const isPressing = this.keysDown.has(kb.press);

    // Find closest AI player on each team to the ball
    let closestHomeAI: ArticulatedPlayer3D | null = null;
    let closestHomeDist = Infinity;
    let closestAwayAI: ArticulatedPlayer3D | null = null;
    let closestAwayDist = Infinity;

    this.players.forEach((p, idx) => {
      if (p.role === 'GK') return;
      const d = Math.hypot(p.x - this.ballPos.x, p.z - this.ballPos.z);
      if (p.teamSide === 'home' && idx !== this.controlledIdx && d < closestHomeDist) {
        closestHomeDist = d;
        closestHomeAI = p;
      }
      if (p.teamSide === 'away' && d < closestAwayDist) {
        closestAwayDist = d;
        closestAwayAI = p;
      }
    });

    this.players.forEach((p, idx) => {
      // Decrement action timers
      if (p.kickTimer > 0) p.kickTimer = Math.max(0, p.kickTimer - dt);
      if (p.tackleTimer > 0) p.tackleTimer = Math.max(0, p.tackleTimer - dt);
      if (p.skillTimer > 0) p.skillTimer = Math.max(0, p.skillTimer - dt);
      if (p.rainbowTimer > 0) p.rainbowTimer = Math.max(0, p.rainbowTimer - dt);
      if (p.bicycleTimer > 0) p.bicycleTimer = Math.max(0, p.bicycleTimer - dt);
      if (p.diveTimer > 0) p.diveTimer = Math.max(0, p.diveTimer - dt);
      if (p.celebrationTimer > 0) p.celebrationTimer = Math.max(0, p.celebrationTimer - dt);

      // Update floor rings & 3D floating "YOU" badge above controlled player
      const isControlled = idx === this.controlledIdx;
      const isBallCarrier = this.ballOwner === p;
      (p.indicatorRing.material as THREE.MeshBasicMaterial).opacity = isControlled ? 0.85 : 0.0;
      (p.sprintHalo.material as THREE.MeshBasicMaterial).opacity =
        isControlled && (p.skillTimer > 0 || this.chargingAction !== 'none') ? 0.75 : 0.0;
      // Hide "YOU" sprite when this player is the ball carrier so the medium-sized Ball Carrier Name is unobstructed
      p.youSprite.visible = isControlled && !isBallCarrier;
      p.carrierNameSprite.visible = false;

      // Celebration behaviour: teammates run toward scorer
      if (this.celebrationGlobalTimer > 0) {
        p.x += p.vx * dt;
        p.z += p.vz * dt;
        p.vx *= 0.92;
        p.vz *= 0.92;
        this.animateArticulatedLimbs(p, dt);
        return;
      }

      if (isControlled) {
        // If this controlled player is the active set-piece taker, keep them anchored at the set-piece spot until they pass/shoot/throw!
        if (this.activeSetPiece !== 'none' && idx === this.setPieceTakerIdx) {
          p.vx = 0;
          p.vz = 0;
          if (this.config.controlScheme !== 'Keyboard') {
            const aimDx = this.mouseWorldTarget.x - p.x;
            const aimDz = this.mouseWorldTarget.z - p.z;
            if (Math.hypot(aimDx, aimDz) > 1.0) {
              p.facingAngle = Math.atan2(aimDx, aimDz);
            }
          }
          this.animateArticulatedLimbs(p, dt);
          return;
        }
        // Apply controlled velocity
        p.x = THREE.MathUtils.clamp(p.x + p.vx * dt, -PITCH_WIDTH / 2 + 0.5, PITCH_WIDTH / 2 - 0.5);
        p.z = THREE.MathUtils.clamp(p.z + p.vz * dt, -PITCH_DEPTH / 2 + 0.5, PITCH_DEPTH / 2 - 0.5);
        this.animateArticulatedLimbs(p, dt);
        return;
      }

      // Freeze non-controlled players in their set-piece positions during active set pieces
      if (this.activeSetPiece !== 'none') {
        p.vx = 0;
        p.vz = 0;
        this.animateArticulatedLimbs(p, dt);
        return;
      }

      // Online 1v1 & 11v11: Remote Players (Home Co-Op or Away Opponents) controlled by Live Network Input on Host!
      let remoteControllingClientId: string | null = null;
      for (const [cid, rIdx] of this.remotePlayerControlledMap.entries()) {
        if (rIdx === idx) {
          remoteControllingClientId = cid;
          break;
        }
      }
      if (
        this.isOnlineHost() &&
        (remoteControllingClientId !== null ||
          (idx === this.remoteGuestControlledIdx && p.teamSide === 'away')) &&
        p.role !== 'GK'
      ) {
        const gi =
          (remoteControllingClientId
            ? this.remotePlayerInputs.get(remoteControllingClientId)
            : null) || this.remoteGuestInput;
        if (gi) {
          const paceFactor = 0.8 + (p.data.attributes.pace / 100) * 0.35;
          const baseSpeed = (gi.isSprinting ? 12.2 : 8.6) * paceFactor * (p.skillTimer > 0 ? 1.25 : 1.0);
          if (gi.moveX !== 0 || gi.moveZ !== 0) {
            const len = Math.hypot(gi.moveX, gi.moveZ);
            const nx = gi.moveX / len;
            const nz = gi.moveZ / len;
            p.vx = THREE.MathUtils.lerp(p.vx, nx * baseSpeed, dt * 14);
            p.vz = THREE.MathUtils.lerp(p.vz, nz * baseSpeed, dt * 14);
            p.facingAngle = Math.atan2(nx, nz);
          } else {
            p.vx *= Math.pow(0.08, dt);
            p.vz *= Math.pow(0.08, dt);
          }
        }
        p.x = THREE.MathUtils.clamp(p.x + p.vx * dt, -PITCH_WIDTH / 2 + 0.5, PITCH_WIDTH / 2 - 0.5);
        p.z = THREE.MathUtils.clamp(p.z + p.vz * dt, -PITCH_DEPTH / 2 + 0.5, PITCH_DEPTH / 2 - 0.5);
        this.animateArticulatedLimbs(p, dt);
        return;
      }

      // Online 1v1 Guest: Smooth Dead-Reckoning + Authoritative Interpolation for Remote Players
      if (this.isOnlineGuest() && !isControlled) {
        const target = this.remoteTargetPlayers[idx];
        if (target) {
          p.x = THREE.MathUtils.lerp(p.x + p.vx * dt, target.x, dt * 14);
          p.z = THREE.MathUtils.lerp(p.z + p.vz * dt, target.z, dt * 14);
          p.facingAngle = THREE.MathUtils.lerp(p.facingAngle, target.facingAngle, dt * 14);
        } else {
          p.x += p.vx * dt;
          p.z += p.vz * dt;
        }
        this.animateArticulatedLimbs(p, dt);
        return;
      }

      // Goalkeeper AI
      if (p.role === 'GK') {
        const goalX = p.teamSide === 'home' ? -PITCH_WIDTH / 2 + 1.2 : PITCH_WIDTH / 2 - 1.2;
        const targetZ = THREE.MathUtils.clamp(this.ballPos.z * 0.55, -GOAL_WIDTH * 0.42, GOAL_WIDTH * 0.42);
        const gkSpeed = 6.8 * diffMult;
        p.x = THREE.MathUtils.lerp(p.x, goalX, dt * 5);
        p.z = THREE.MathUtils.lerp(p.z, targetZ, dt * gkSpeed);
        p.facingAngle = p.teamSide === 'home' ? Math.PI / 2 : -Math.PI / 2;

        // AI Goalkeeper Save Reaction
        const distBall = Math.hypot(p.x - this.ballPos.x, p.z - this.ballPos.z);
        const ballComingAtGoal =
          (p.teamSide === 'away' && this.ballVel.x > 6 && this.ballPos.x > PITCH_WIDTH / 2 - 14) ||
          (p.teamSide === 'home' && this.ballVel.x < -6 && this.ballPos.x < -PITCH_WIDTH / 2 + 14);

        if (ballComingAtGoal && distBall < 5.2 && p.diveTimer <= 0) {
          p.diveTimer = 0.65;
          p.diveDirZ = Math.sign(this.ballPos.z - p.z) || 1;
        }

        if (distBall < 1.85 && this.celebrationGlobalTimer <= 0) {
          // Keeper parry or catch!
          this.ballOwner = null;
          this.lastTouchTeam = p.teamSide;
          const clearDirX = p.teamSide === 'home' ? 1 : -1;
          this.ballVel.set(clearDirX * (18 + Math.random() * 6), 5.5, (Math.random() - 0.5) * 14);
          this.ballSpinZ = 0;
          if (p.teamSide === 'home') this.stats.homeSaves++;
          else this.stats.awaySaves++;
          SoundEngine.playKick(0.8, false);
          SoundEngine.playCrowdReaction('ooh');
          this.setCommentary(`GREAT SAVE BY ${p.data.name.toUpperCase()}!`);
        }

        this.animateArticulatedLimbs(p, dt);
        return;
      }

      // Free Kick defensive wall stays in place until ball is kicked
      if (
        (this.config.mode === 'free_kick' || (this.config.mode === 'practice' && this.practiceDrill === 'Free Kicks')) &&
        p.teamSide === 'away' &&
        Math.hypot(this.ballVel.x, this.ballVel.z) < 1
      ) {
        p.facingAngle = -Math.PI / 2;
        this.animateArticulatedLimbs(p, dt);
        return;
      }

      // Outfield AI Decision Making
      let targetX = p.baseX + this.ballPos.x * 0.32;
      let targetZ = p.baseZ + this.ballPos.z * 0.25;
      let speed = 7.2 * diffMult;

      if (this.ballOwner === p) {
        // AI has the ball!
        if (p.teamSide === 'away') {
          targetX = -PITCH_WIDTH / 2;
          targetZ = this.ballPos.z * 0.5;
          speed = 8.4 * diffMult;

          // Shoot if within range of Home Goal
          if (p.x < -PITCH_WIDTH / 2 + 21 && Math.abs(p.z) < 14) {
            this.ballOwner = null;
            p.kickTimer = 0.4;
            this.stats.awayShots++;
            this.stats.awayShotsOnTarget++;
            const aimZ = (Math.random() - 0.5) * (GOAL_WIDTH * 0.78);
            const dx = -PITCH_WIDTH / 2 - p.x;
            const dz = aimZ - p.z;
            const d = Math.max(1, Math.hypot(dx, dz));
            this.ballVel.set((dx / d) * (27 * diffMult), 2.8 + Math.random() * 3.2, (dz / d) * (27 * diffMult));
            SoundEngine.playKick(0.75, false);
            this.setCommentary(`${p.data.name.toUpperCase()} FIRES AT GOAL!`);
          } else if (closestHomeDist < 2.6 && Math.random() < 0.08 * diffMult) {
            // Pass to open away teammate
            const openMate = this.players.find(
              (m) => m.teamSide === 'away' && m !== p && m.role !== 'GK' && m.x < p.x + 6
            );
            if (openMate) {
              this.ballOwner = null;
              p.kickTimer = 0.3;
              this.stats.awayPasses++;
              const dx = openMate.x - p.x;
              const dz = openMate.z - p.z;
              const d = Math.max(1, Math.hypot(dx, dz));
              this.ballVel.set((dx / d) * 21, 1.2, (dz / d) * 21);
              SoundEngine.playPass();
            }
          }
        }
      } else if (this.passTargetPlayer === p && this.passAssistTimer > 0 && !this.ballOwner) {
        // Intended pass receiver actively moves toward the incoming pass!
        targetX = this.ballPos.x + this.ballVel.x * 0.18;
        targetZ = this.ballPos.z + this.ballVel.z * 0.18;
        speed = 9.4 * diffMult;
      } else if (
        (p.teamSide === 'away' && p === closestAwayAI) ||
        (p.teamSide === 'home' && p === closestHomeAI && isPressing)
      ) {
        // Press the ball carrier
        targetX = this.ballPos.x;
        targetZ = this.ballPos.z;
        speed = 8.3 * diffMult;
      } else if (p.teamSide === 'home' && this.ballOwner?.teamSide === 'home') {
        // Make intelligent forward attacking runs
        targetX = Math.min(PITCH_WIDTH / 2 - 6, p.baseX + 22);
      }

      const dx = targetX - p.x;
      const dz = targetZ - p.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.6) {
        p.vx = (dx / dist) * speed;
        p.vz = (dz / dist) * speed;
        p.x = THREE.MathUtils.clamp(p.x + p.vx * dt, -PITCH_WIDTH / 2 + 1, PITCH_WIDTH / 2 - 1);
        p.z = THREE.MathUtils.clamp(p.z + p.vz * dt, -PITCH_DEPTH / 2 + 1, PITCH_DEPTH / 2 - 1);
        p.facingAngle = Math.atan2(p.vx, p.vz);
      } else {
        p.vx = 0;
        p.vz = 0;
      }

      this.animateArticulatedLimbs(p, dt);
    });

    // 6. Ball Physics, Dribbling & Collisions
    if (this.isOnlineGuest()) {
      // Guest smoothly dead-reckons and interpolates toward Host's authoritative ball state
      if (this.ballOwner && this.celebrationGlobalTimer <= 0) {
        const dirX = Math.sin(this.ballOwner.facingAngle);
        const dirZ = Math.cos(this.ballOwner.facingAngle);
        const strideBob = Math.sin(this.ballOwner.animPhase * 2) * 0.14;
        this.ballPos.x = THREE.MathUtils.lerp(this.ballPos.x, this.ballOwner.x + dirX * (0.85 + strideBob), dt * 18);
        this.ballPos.z = THREE.MathUtils.lerp(this.ballPos.z, this.ballOwner.z + dirZ * (0.85 + strideBob), dt * 18);
        this.ballPos.y = Math.max(0.36, this.ballPos.y * 0.9);
      } else {
        this.ballPos.x = THREE.MathUtils.lerp(this.ballPos.x + this.ballVel.x * dt, this.remoteTargetBallPos.x, dt * 14);
        this.ballPos.y = Math.max(0.36, THREE.MathUtils.lerp(this.ballPos.y + this.ballVel.y * dt, this.remoteTargetBallPos.y, dt * 14));
        this.ballPos.z = THREE.MathUtils.lerp(this.ballPos.z + this.ballVel.z * dt, this.remoteTargetBallPos.z, dt * 14);
      }
      this.ballGroup.position.copy(this.ballPos);
      const speed = Math.hypot(this.ballVel.x, this.ballVel.z);
      this.ballMesh.rotation.x += this.ballVel.z * dt * 1.4;
      this.ballMesh.rotation.z -= this.ballVel.x * dt * 1.4;
      this.trailPositions.pop();
      this.trailPositions.unshift(this.ballPos.clone());
      this.ballTrail.geometry.setFromPoints(this.trailPositions);
      (this.ballTrail.material as THREE.LineBasicMaterial).opacity =
        speed > 16 || this.ballPos.y > 1.2 ? 0.72 : 0.0;
    } else {
      this.updateBallPhysics(dt);
    }

    // 6B. Online 1v1 Network Synchronization Tick (30 Hz)
    if (this.isOnlineMatch() && this.config.onlineConfig?.roomCode) {
      this.netSyncTimer += dt;
      if (this.netSyncTimer >= 0.033) {
        this.netSyncTimer = 0;
        if (this.isOnlineHost()) {
          this.broadcastAuthoritativeState();
        } else if (this.isOnlineGuest() && controlled) {
          const isBehindCam = this.config.cameraMode === 'Player' || this.config.cameraMode === 'Goalkeeper';
          const upPressed = this.keysDown.has(kb.moveForward) || this.keysDown.has('ArrowUp');
          const downPressed = this.keysDown.has(kb.moveBackward) || this.keysDown.has('ArrowDown');
          const leftPressed = this.keysDown.has(kb.moveLeft) || this.keysDown.has('ArrowLeft');
          const rightPressed = this.keysDown.has(kb.moveRight) || this.keysDown.has('ArrowRight');
          let mx = 0;
          let mz = 0;
          if (isBehindCam) {
            if (upPressed) mx += 1;
            if (downPressed) mx -= 1;
            if (leftPressed) mz -= 1;
            if (rightPressed) mz += 1;
          } else {
            if (upPressed) mz -= 1;
            if (downPressed) mz += 1;
            if (leftPressed) mx -= 1;
            if (rightPressed) mx += 1;
          }
          this.netSeq++;
          FriendRoomService.sendGuestInput({
            roomCode: this.config.onlineConfig.roomCode,
            clientId: FriendRoomService.getClientId(),
            seq: this.netSeq,
            controlledIdx: this.controlledIdx,
            moveX: mx,
            moveZ: mz,
            isSprinting: (this.keysDown.has(kb.sprint) || this.keysDown.has('ShiftLeft')) && controlled.stamina > 8,
            isPressing: this.keysDown.has(kb.press),
            mouseWorldX: this.mouseWorldTarget.x,
            mouseWorldZ: this.mouseWorldTarget.z,
            guestX: controlled.x,
            guestZ: controlled.z,
            guestVx: controlled.vx,
            guestVz: controlled.vz,
            guestFacing: controlled.facingAngle,
          });
        }
      }
    }

    // 7. Practice / Skill Challenge Gate Check
    if (this.stadiumObjs.practiceTargetGroup.children.length > 0) {
      for (let i = this.stadiumObjs.practiceTargetGroup.children.length - 1; i >= 0; i--) {
        const gate = this.stadiumObjs.practiceTargetGroup.children[i];
        const d = Math.hypot(this.ballPos.x - gate.position.x, this.ballPos.z - gate.position.z);
        if (d < 2.2) {
          this.stadiumObjs.practiceTargetGroup.remove(gate);
          this.challengeScore += 300;
          SoundEngine.playCrowdReaction('cheer');
          this.setCommentary('SKILL GATE CLEARED! +300 PTS');
        }
      }
    }

    // 8. Record Frame into Instant Replay Ring Buffer (max 260 frames)
    this.replayBuffer.push({
      ballPos: { x: this.ballPos.x, y: this.ballPos.y, z: this.ballPos.z },
      players: this.players.map((p) => ({
        x: p.x,
        y: p.y,
        z: p.z,
        angle: p.facingAngle,
        phase: p.animPhase,
      })),
    });
    if (this.replayBuffer.length > 260) {
      this.replayBuffer.shift();
    }
  }

  private updateBallPhysics(dt: number) {
    if (this.activeSetPiece !== 'none' && this.celebrationGlobalTimer <= 0) {
      const taker = this.players[this.setPieceTakerIdx] || this.ballOwner;
      if (this.activeSetPiece === 'throw_in' && taker) {
        const dirX = Math.sin(taker.facingAngle);
        const dirZ = Math.cos(taker.facingAngle);
        this.ballPos.set(taker.x + dirX * 0.24, 2.08, taker.z + dirZ * 0.24);
        this.ballVel.set(0, 0, 0);
      } else {
        this.ballPos.y = 0.36;
        this.ballVel.set(0, 0, 0);
      }
      this.ballGroup.position.copy(this.ballPos);
      return;
    }

    if (this.ballOwner && this.celebrationGlobalTimer <= 0) {
      // Dribble ball closely in front of owner's boots
      const dirX = Math.sin(this.ballOwner.facingAngle);
      const dirZ = Math.cos(this.ballOwner.facingAngle);
      const strideBob = Math.sin(this.ballOwner.animPhase * 2) * 0.14;
      this.ballPos.x = THREE.MathUtils.lerp(this.ballPos.x, this.ballOwner.x + dirX * (0.85 + strideBob), dt * 18);
      this.ballPos.z = THREE.MathUtils.lerp(this.ballPos.z, this.ballOwner.z + dirZ * (0.85 + strideBob), dt * 18);
      this.ballPos.y = Math.max(0.36, this.ballPos.y * 0.9);
      this.ballVel.set(this.ballOwner.vx, 0, this.ballOwner.vz);
      this.lastTouchTeam = this.ballOwner.teamSide;

      if (this.ballOwner.teamSide === 'home') this.homePossessionFrames++;
      else this.awayPossessionFrames++;
    } else {
      // Homing pass assist so passes go accurately to the intended teammate!
      if (this.passTargetPlayer && this.passAssistTimer > 0) {
        this.passAssistTimer = Math.max(0, this.passAssistTimer - dt);
        const targetX = this.passTargetPlayer.x + this.passLeadX * 0.35;
        const targetZ = this.passTargetPlayer.z;
        const dx = targetX - this.ballPos.x;
        const dz = targetZ - this.ballPos.z;
        const distToTarget = Math.hypot(dx, dz);
        if (distToTarget > 0.4) {
          const curSpeed = Math.max(19, Math.hypot(this.ballVel.x, this.ballVel.z));
          const desiredVx = (dx / distToTarget) * curSpeed;
          const desiredVz = (dz / distToTarget) * curSpeed;
          this.ballVel.x = THREE.MathUtils.lerp(this.ballVel.x, desiredVx, dt * 11);
          this.ballVel.z = THREE.MathUtils.lerp(this.ballVel.z, desiredVz, dt * 11);
        }
      }

      // Free-flight Ball Physics with Gravity + Air Drag + Magnus Curve Effect
      this.ballPos.x += this.ballVel.x * dt;
      this.ballPos.y += this.ballVel.y * dt;
      this.ballPos.z += this.ballVel.z * dt;

      // Magnus lateral curve force when spinning in flight
      if (Math.abs(this.ballSpinZ) > 0.1 && this.ballPos.y > 0.4) {
        this.ballVel.z += this.ballSpinZ * dt * 2.4;
        this.ballSpinZ *= Math.pow(0.65, dt);
      }

      // Gravity
      if (this.ballPos.y > 0.36) {
        this.ballVel.y -= 19.6 * dt;
      } else {
        this.ballPos.y = 0.36;
        if (this.ballVel.y < -2.2) {
          this.ballVel.y = -this.ballVel.y * 0.58; // Turf bounce restitution
          SoundEngine.playPass();
        } else {
          this.ballVel.y = 0;
        }
        // Grass friction (reduced while pass assist is guiding the ball to a teammate)
        const friction =
          this.passAssistTimer > 0
            ? 0.78
            : this.config.weather === 'Rain'
            ? 0.42
            : 0.28;
        this.ballVel.x *= Math.pow(friction, dt);
        this.ballVel.z *= Math.pow(friction, dt);
      }

      // Check Player Ball Pickup / Interception
      if (this.celebrationGlobalTimer <= 0) {
        for (let i = 0; i < this.players.length; i++) {
          const p = this.players[i];
          if (p.role === 'GK' || p.kickTimer > 0.15) continue;
          const d = Math.hypot(p.x - this.ballPos.x, p.z - this.ballPos.z);
          const isIntendedReceiver = this.passTargetPlayer === p && this.passAssistTimer > 0;
          const pickupRadius = isIntendedReceiver ? 1.65 : 1.15;
          if (d < pickupRadius && this.ballPos.y < 1.65) {
            this.ballOwner = p;
            this.passTargetPlayer = null;
            this.passAssistTimer = 0;
            this.lastTouchTeam = p.teamSide;
            if (p.teamSide === 'home' && !this.manualGKActive && !this.isOnlineGuest()) {
              this.controlledIdx = i;
            } else if (p.teamSide === 'away' && this.isOnlineHost()) {
              this.remoteGuestControlledIdx = i;
            }
            break;
          }
        }
      }
    }

    // Goal & Post & Crossbar Detection
    const halfW = PITCH_WIDTH / 2;
    const halfD = PITCH_DEPTH / 2;

    if (Math.abs(this.ballPos.x) >= halfW - 0.25 && this.celebrationGlobalTimer <= 0) {
      const inGoalWidth = Math.abs(this.ballPos.z) < GOAL_WIDTH / 2 - 0.15;
      const underCrossbar = this.ballPos.y < GOAL_HEIGHT - 0.12;

      // Post or Crossbar Metallic Hit!
      const nearPost = Math.abs(Math.abs(this.ballPos.z) - GOAL_WIDTH / 2) < 0.45 && this.ballPos.y <= GOAL_HEIGHT;
      const nearCrossbar = Math.abs(this.ballPos.y - GOAL_HEIGHT) < 0.4 && Math.abs(this.ballPos.z) <= GOAL_WIDTH / 2;

      if (nearPost || nearCrossbar) {
        this.ballVel.x = -this.ballVel.x * 0.7;
        this.ballVel.z = (Math.random() - 0.5) * 10;
        SoundEngine.playPostHit();
        SoundEngine.playCrowdReaction('ooh');
        this.setCommentary('OFF THE WOODWORK! SO CLOSE!');
      } else if (inGoalWidth && underCrossbar) {
        // GOAL SCORED!
        const scoringTeam = this.ballPos.x > 0 ? 'home' : 'away';
        this.ballVel.multiplyScalar(0.25);
        this.triggerGoal(scoringTeam);
      } else if (
        this.isMatchWithOfficialRules() &&
        this.activeSetPiece === 'none' &&
        this.setPieceCooldown <= 0
      ) {
        // OFFICIAL FOOTBALL RULE: Corner Kick vs Goal Kick when ball crosses the goal line outside the posts!
        const rightEnd = this.ballPos.x > 0; // Right goal is Away's goal; Left goal is Home's goal
        const defendingTeam: 'home' | 'away' = rightEnd ? 'away' : 'home';
        const attackingTeam: 'home' | 'away' = rightEnd ? 'home' : 'away';
        if (this.lastTouchTeam === defendingTeam) {
          this.triggerCornerKick(attackingTeam, this.ballPos.x, this.ballPos.z);
        } else {
          this.triggerGoalKick(defendingTeam);
        }
      } else {
        // Rebound softly off goal line in practice / challenge drills
        this.ballPos.x = Math.sign(this.ballPos.x) * (halfW - 0.4);
        this.ballVel.x = -this.ballVel.x * 0.5;
      }
    }

    if (Math.abs(this.ballPos.z) >= halfD - 0.18 && this.celebrationGlobalTimer <= 0) {
      if (
        this.isMatchWithOfficialRules() &&
        this.activeSetPiece === 'none' &&
        this.setPieceCooldown <= 0
      ) {
        // OFFICIAL FOOTBALL RULE: Throw-In when ball crosses either touchline!
        const throwingTeam: 'home' | 'away' = this.lastTouchTeam === 'home' ? 'away' : 'home';
        this.triggerThrowIn(throwingTeam, this.ballPos.x, this.ballPos.z);
      } else {
        this.ballPos.z = Math.sign(this.ballPos.z) * (halfD - 0.4);
        this.ballVel.z = -this.ballVel.z * 0.55;
      }
    }

    // Update 3D Ball Mesh & Spin Trail
    this.ballGroup.position.copy(this.ballPos);
    const speed = Math.hypot(this.ballVel.x, this.ballVel.z);
    this.ballMesh.rotation.x += this.ballVel.z * dt * 1.4;
    this.ballMesh.rotation.z -= this.ballVel.x * dt * 1.4;

    this.trailPositions.pop();
    this.trailPositions.unshift(this.ballPos.clone());
    this.ballTrail.geometry.setFromPoints(this.trailPositions);
    (this.ballTrail.material as THREE.LineBasicMaterial).opacity =
      speed > 16 || this.ballPos.y > 1.2 ? 0.72 : 0.0;
    if (this.ballPos.y <= 0.42) {
      (this.ballTrail.material as THREE.LineBasicMaterial).color.setHex(0x38bdf8);
    }
  }

  private animateArticulatedLimbs(p: ArticulatedPlayer3D, dt: number) {
    p.root.position.set(p.x, p.y, p.z);
    p.root.rotation.y = p.facingAngle;

    // Reset baseline human posture
    p.torso.rotation.z = 0;
    p.torso.rotation.x = 0;
    p.torso.rotation.y = 0;
    p.torso.position.y = 1.12;
    p.headGroup.rotation.x = 0;
    p.headGroup.rotation.y = 0;

    // 0. Overhead Two-Handed Throw-In Posture
    if (this.activeSetPiece === 'throw_in' && this.players[this.setPieceTakerIdx] === p) {
      p.torso.rotation.x = -0.18;
      p.leftArm.rotation.x = -2.85;
      p.rightArm.rotation.x = -2.85;
      p.leftForearm.rotation.x = -0.4;
      p.rightForearm.rotation.x = -0.4;
      p.leftLeg.rotation.x = -0.15;
      p.rightLeg.rotation.x = 0.15;
      return;
    }

    // 1. Goalkeeper Diving Save Animation
    if (p.diveTimer > 0) {
      p.torso.rotation.z = -p.diveDirZ * 1.28;
      p.torso.position.y = 0.68 + p.diveHeight * 0.38;
      p.leftArm.rotation.x = -2.75;
      p.rightArm.rotation.x = -2.75;
      p.leftForearm.rotation.x = -0.15;
      p.rightForearm.rotation.x = -0.15;
      p.leftKnee.rotation.x = 0.35;
      p.rightKnee.rotation.x = 0.25;
      return;
    }

    // 2. Goal Celebration Choreography
    if (p.celebrationTimer > 0) {
      p.animPhase += dt * 12;
      if (p.celebrationType === 'Knee Slide Surge') {
        p.torso.position.y = 0.76;
        p.torso.rotation.x = -0.25;
        p.leftLeg.rotation.x = -0.35;
        p.rightLeg.rotation.x = -0.35;
        p.leftKnee.rotation.x = 1.55;
        p.rightKnee.rotation.x = 1.55;
        p.leftArm.rotation.x = -2.3 + Math.sin(p.animPhase) * 0.25;
        p.rightArm.rotation.x = -2.3 - Math.sin(p.animPhase) * 0.25;
        p.leftForearm.rotation.x = -0.6;
        p.rightForearm.rotation.x = -0.6;
      } else if (p.celebrationType === 'Acrobatic Flip') {
        p.torso.position.y = 1.12 + Math.abs(Math.sin(p.animPhase * 0.5)) * 1.45;
        p.torso.rotation.x = p.animPhase * 2;
        p.leftKnee.rotation.x = 0.9;
        p.rightKnee.rotation.x = 0.9;
      } else {
        // Aeroplane / Skyward Point / Salute
        p.torso.position.y = 1.12 + Math.abs(Math.sin(p.animPhase)) * 0.18;
        p.leftArm.rotation.z = -1.35;
        p.rightArm.rotation.z = 1.35;
        p.leftForearm.rotation.x = -0.2;
        p.rightForearm.rotation.x = -0.2;
      }
      return;
    }

    // 3. Standing / Sliding Tackle Lunge
    if (p.tackleTimer > 0) {
      p.torso.position.y = 0.76;
      p.torso.rotation.x = -0.42;
      p.rightLeg.rotation.x = -1.28;
      p.rightKnee.rotation.x = 0.1;
      p.leftLeg.rotation.x = 0.55;
      p.leftKnee.rotation.x = 1.15;
      return;
    }

    // 3B. Dedicated Acrobatic Overhead Bicycle Kick Animation (KeyB)
    if (p.bicycleTimer > 0) {
      const progress = 1 - p.bicycleTimer / 0.85; // 0 -> 1
      const jumpArc = Math.sin(progress * Math.PI);
      p.torso.position.y = 1.12 + jumpArc * 0.85; // High mid-air leap
      p.torso.rotation.x = -jumpArc * 2.35; // Full overhead backflip tilt
      p.headGroup.rotation.x = -0.35 * jumpArc;
      // Scissor kick leg motion overhead
      const scissor = Math.sin(progress * Math.PI * 2);
      p.rightLeg.rotation.x = -1.45 * jumpArc - scissor * 0.55;
      p.leftLeg.rotation.x = -0.65 * jumpArc + scissor * 0.55;
      p.rightKnee.rotation.x = 0.2;
      p.leftKnee.rotation.x = 0.45;
      p.leftArm.rotation.z = -1.1 * jumpArc;
      p.rightArm.rotation.z = 1.1 * jumpArc;
      return;
    }

    // 4. Dedicated Rainbow Flick Heel-Scoop Biomechanical Animation
    if (p.rainbowTimer > 0) {
      const progress = 1 - p.rainbowTimer / 0.78; // 0 -> 1
      const heelSnap = Math.sin(progress * Math.PI);
      p.torso.position.y = 1.12 + heelSnap * 0.22; // Athletic hop
      p.torso.rotation.x = heelSnap * 0.48; // Forward chest dip to counterweight heel flick
      p.headGroup.rotation.x = -heelSnap * 0.35; // Eyes tracking ball overhead
      p.leftLeg.rotation.x = heelSnap * 0.38;
      p.rightLeg.rotation.x = heelSnap * 0.48;
      // Both knees snap heels sharply up behind the back to flick the ball overhead!
      p.leftKnee.rotation.x = heelSnap * 1.55;
      p.rightKnee.rotation.x = heelSnap * 1.75;
      p.leftArm.rotation.x = 0.45 * heelSnap;
      p.rightArm.rotation.x = 0.45 * heelSnap;
      p.leftArm.rotation.z = -0.35 * heelSnap;
      p.rightArm.rotation.z = 0.35 * heelSnap;
      return;
    }

    // 5. Other Skill Moves (Roulette spin / Step-over / Elastico)
    if (p.skillTimer > 0) {
      if (p.activeSkillName === 'Roulette') {
        p.root.rotation.y += p.skillTimer * 9.5;
      } else {
        p.torso.rotation.z = Math.sin(p.skillTimer * 22) * 0.18;
      }
    }

    // 6. Realistic Human Running Stride & Idle Breathing Cycle
    const speed = Math.hypot(p.vx, p.vz);
    if (speed > 0.35) {
      p.animPhase += dt * (speed * 1.55);
      const stride = Math.sin(p.animPhase);
      const cosStride = Math.cos(p.animPhase);

      // Hip flexion/extension (forward thigh swing = negative X rotation)
      p.leftLeg.rotation.x = stride * 0.78;
      p.rightLeg.rotation.x = -stride * 0.78;

      // Realistic human knee flexion (knees only bend backward = positive X rotation, especially during back-swing & lift)
      p.leftKnee.rotation.x = Math.max(0.08, Math.sin(p.animPhase - 0.85) * 1.05 + 0.32);
      p.rightKnee.rotation.x = Math.max(0.08, Math.sin(p.animPhase + Math.PI - 0.85) * 1.05 + 0.32);

      // Natural counter-balanced arm swing + athletic elbow bend
      p.leftArm.rotation.x = -stride * 0.68;
      p.rightArm.rotation.x = stride * 0.68;
      p.leftArm.rotation.z = -0.08;
      p.rightArm.rotation.z = 0.08;
      p.leftForearm.rotation.x = -0.65 - Math.max(0, -stride) * 0.45;
      p.rightForearm.rotation.x = -0.65 - Math.max(0, stride) * 0.45;

      // Subtle athletic forward lean & upper-torso counter-twist
      const sprintRatio = Math.min(1, speed / 12);
      p.torso.rotation.x = sprintRatio * 0.18;
      p.torso.rotation.y = stride * 0.12;
      p.torso.position.y = 1.12 + Math.abs(cosStride) * 0.065;
    } else {
      // Natural Human Athletic Ready Stance & Breathing
      p.animPhase += dt * 2.2;
      const breath = Math.sin(p.animPhase) * 0.015;
      p.torso.position.y = 1.12 + breath;
      p.leftLeg.rotation.x = THREE.MathUtils.lerp(p.leftLeg.rotation.x, -0.06, dt * 10);
      p.rightLeg.rotation.x = THREE.MathUtils.lerp(p.rightLeg.rotation.x, -0.06, dt * 10);
      p.leftKnee.rotation.x = THREE.MathUtils.lerp(p.leftKnee.rotation.x, 0.12, dt * 10);
      p.rightKnee.rotation.x = THREE.MathUtils.lerp(p.rightKnee.rotation.x, 0.12, dt * 10);
      p.leftArm.rotation.x = THREE.MathUtils.lerp(p.leftArm.rotation.x, 0.04, dt * 10);
      p.rightArm.rotation.x = THREE.MathUtils.lerp(p.rightArm.rotation.x, 0.04, dt * 10);
      p.leftArm.rotation.z = -0.08;
      p.rightArm.rotation.z = 0.08;
      p.leftForearm.rotation.x = THREE.MathUtils.lerp(p.leftForearm.rotation.x, -0.35, dt * 10);
      p.rightForearm.rotation.x = THREE.MathUtils.lerp(p.rightForearm.rotation.x, -0.35, dt * 10);
    }

    // 7. Realistic Shooting / Passing Leg Wind-up & Follow-through
    if (p.kickTimer > 0) {
      const kRatio = p.kickTimer / 0.42;
      if (kRatio > 0.65) {
        // Back-swing wind-up
        p.rightLeg.rotation.x = 0.65;
        p.rightKnee.rotation.x = 1.25;
      } else {
        // Powerful follow-through extension
        p.rightLeg.rotation.x = -1.35 * (kRatio / 0.65);
        p.rightKnee.rotation.x = 0.08;
        p.leftArm.rotation.z = -0.45;
      }
    }
  }

  private updateCameraAndAtmosphere(dt: number) {
    const controlled = this.getControlledPlayer() || this.players[0];
    const targetCamPos = new THREE.Vector3();
    const targetLookAt = new THREE.Vector3();

    if (this.isReplaying) {
      const orbitAngle = this.replayPlayIndex * 0.025;
      targetCamPos.set(
        this.ballPos.x + Math.cos(orbitAngle) * 16,
        7.5,
        this.ballPos.z + Math.sin(orbitAngle) * 16
      );
      targetLookAt.set(this.ballPos.x, 1.0, this.ballPos.z);
    } else if (this.celebrationGlobalTimer > 0 && controlled) {
      targetCamPos.set(controlled.x + 5.5, 3.2, controlled.z + 6.5);
      targetLookAt.set(controlled.x, 1.4, controlled.z);
    } else if (
      this.config.mode === 'penalty_shootout' ||
      this.config.mode === 'free_kick' ||
      (this.config.mode === 'practice' && (this.practiceDrill === 'Penalties' || this.practiceDrill === 'Free Kicks'))
    ) {
      targetCamPos.set(this.ballPos.x - 9.5, 3.8, this.ballPos.z * 1.15);
      targetLookAt.set(PITCH_WIDTH / 2, 1.8, 0);
    } else if (
      this.config.cameraMode === 'Goalkeeper' ||
      this.manualGKActive
    ) {
      const gk = this.players.find((p) => p.teamSide === 'home' && p.role === 'GK') || controlled;
      targetCamPos.set(gk.x - 8.5, 4.4, gk.z * 0.8);
      targetLookAt.set(this.ballPos.x, 1.0, this.ballPos.z);
    } else if (this.config.cameraMode === 'Player' && controlled) {
      targetCamPos.set(controlled.x - 11.5, 6.2, controlled.z + 2.5);
      targetLookAt.set(controlled.x + 12, 1.2, controlled.z);
    } else if (this.config.cameraMode === 'Action') {
      const focusX = (this.ballPos.x + (controlled?.x || 0)) * 0.5;
      const focusZ = (this.ballPos.z + (controlled?.z || 0)) * 0.5;
      targetCamPos.set(focusX * 0.85, 14.5, focusZ + 22);
      targetLookAt.set(this.ballPos.x + 4, 0.8, this.ballPos.z);
    } else if (this.config.cameraMode === 'Free') {
      const r = 28;
      targetCamPos.set(
        this.ballPos.x + Math.sin(this.freeCamYaw) * Math.cos(this.freeCamPitch) * r,
        Math.sin(this.freeCamPitch) * r,
        this.ballPos.z + Math.cos(this.freeCamYaw) * Math.cos(this.freeCamPitch) * r
      );
      targetLookAt.set(this.ballPos.x, 0.8, this.ballPos.z);
    } else {
      // Broadcast Camera (Default TV-style wide tracking)
      targetCamPos.set(this.ballPos.x * 0.72, 23.5, 34 + this.ballPos.z * 0.38);
      targetLookAt.set(this.ballPos.x * 0.85, 0.5, this.ballPos.z * 0.55);
    }

    this.camera.position.lerp(targetCamPos, dt * 6.5);
    this.camera.lookAt(targetLookAt);

    // Update 3D Aim Reticle & Curve Trajectory Preview
    if (controlled) {
      this.stadiumObjs.aimArrowGroup.position.set(this.mouseWorldTarget.x, 0.05, this.mouseWorldTarget.z);
      if (
        this.chargingAction === 'curve' ||
        this.config.mode === 'free_kick' ||
        (this.config.mode === 'practice' && this.practiceDrill === 'Free Kicks')
      ) {
        const pts: THREE.Vector3[] = [];
        const start = this.ballPos.clone();
        const end = new THREE.Vector3(PITCH_WIDTH / 2, 2.2, THREE.MathUtils.clamp(this.mouseWorldTarget.z, -GOAL_WIDTH * 0.45, GOAL_WIDTH * 0.45));
        for (let i = 0; i < 24; i++) {
          const t = i / 23;
          const x = THREE.MathUtils.lerp(start.x, end.x, t);
          const y = THREE.MathUtils.lerp(start.y, end.y, t) + Math.sin(t * Math.PI) * 3.2;
          const z = THREE.MathUtils.lerp(start.z, end.z, t) + Math.sin(t * Math.PI) * (end.z >= 0 ? -3.4 : 3.4);
          pts.push(new THREE.Vector3(x, y, z));
        }
        this.stadiumObjs.curveArcLine.geometry.setFromPoints(pts);
        this.stadiumObjs.curveArcLine.visible = true;
      } else {
        this.stadiumObjs.curveArcLine.visible = false;
      }
    }

    // Animate Rain Particles
    if (this.stadiumObjs.rainSystem) {
      const pos = this.stadiumObjs.rainSystem.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) - dt * 28;
        if (y < 0) y = 34;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
    }

    // Animate Goal Confetti
    if (this.celebrationGlobalTimer > 0) {
      const pos = this.stadiumObjs.confettiSystem.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const vx = this.stadiumObjs.confettiVelocities[i * 3];
        const vy = this.stadiumObjs.confettiVelocities[i * 3 + 1];
        const vz = this.stadiumObjs.confettiVelocities[i * 3 + 2];
        pos.setXYZ(
          i,
          pos.getX(i) + vx * dt,
          Math.max(0.1, pos.getY(i) + vy * dt),
          pos.getZ(i) + vz * dt
        );
        this.stadiumObjs.confettiVelocities[i * 3 + 1] -= 9.8 * dt;
      }
      pos.needsUpdate = true;
    }

    // Goal Net Ripple Animation
    if (this.netRippleTimer > 0) {
      this.netRippleTimer -= dt;
      const net = this.netRippleSide === 'right' ? this.stadiumObjs.rightNetMesh : this.stadiumObjs.leftNetMesh;
      const scaleWave = 1 + Math.sin(this.netRippleTimer * 24) * 0.08;
      net.scale.set(scaleWave, 1, scaleWave);
    } else {
      this.stadiumObjs.leftNetMesh.scale.set(1, 1, 1);
      this.stadiumObjs.rightNetMesh.scale.set(1, 1, 1);
    }
  }

  private loop = () => {
    this.animFrameId = requestAnimationFrame(this.loop);
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastFrameTime) / 1000);
    this.lastFrameTime = now;

    if (!this.isPaused && !this.isMatchOver) {
      if (this.isReplaying) {
        const frame = this.replayBuffer[Math.floor(this.replayPlayIndex)];
        if (frame) {
          this.ballGroup.position.set(frame.ballPos.x, frame.ballPos.y, frame.ballPos.z);
          frame.players.forEach((pf, i) => {
            const p = this.players[i];
            if (p) {
              p.root.position.set(pf.x, pf.y, pf.z);
              p.root.rotation.y = pf.angle;
            }
          });
          this.replayPlayIndex += 0.65; // Smooth slow-motion replay
          if (this.replayPlayIndex >= this.replayBuffer.length) {
            this.skipReplay();
          }
        }
      } else {
        if (this.config.mode !== 'practice') {
          this.elapsedRealSeconds += dt;
          if (this.elapsedRealSeconds >= this.matchDurationRealSeconds) {
            this.isMatchOver = true;
            SoundEngine.playWhistle('fulltime');
          }
        }
        if (this.skillBannerTimer > 0) {
          this.skillBannerTimer = Math.max(0, this.skillBannerTimer - dt);
          if (this.skillBannerTimer <= 0) this.activeSkillBanner = '';
        }
        if (this.commentaryTimer > 0) {
          this.commentaryTimer = Math.max(0, this.commentaryTimer - dt);
        }
        this.updatePhysics(dt);
      }

      this.updateCameraAndAtmosphere(dt);
    }

    this.renderer.render(this.scene, this.camera);
    this.updateBallCarrierHeadLabel();

    // Emit HUD state at ~15 Hz for ultra-smooth UI without React render overhead
    this.hudThrottleTimer += dt;
    if (this.hudThrottleTimer >= 0.065 || this.isMatchOver) {
      this.hudThrottleTimer = 0;
      this.emitHUD();
    }
  };

  private updateBallCarrierHeadLabel() {
    if (!this.ballCarrierOverlayEl) return;
    if (!this.ballOwner || this.isMatchOver || this.isReplaying) {
      this.ballCarrierOverlayEl.style.display = 'none';
      return;
    }

    const headWorld = new THREE.Vector3(
      this.ballOwner.x,
      this.ballOwner.y + 2.35,
      this.ballOwner.z
    );
    headWorld.project(this.camera);

    if (headWorld.z > 1 || headWorld.z < -1) {
      this.ballCarrierOverlayEl.style.display = 'none';
      return;
    }

    const w = this.config.container.clientWidth;
    const h = this.config.container.clientHeight;
    const screenX = (headWorld.x * 0.5 + 0.5) * w;
    const screenY = (-headWorld.y * 0.5 + 0.5) * h;

    this.ballCarrierOverlayEl.style.display = 'block';
    this.ballCarrierOverlayEl.style.left = `${screenX}px`;
    this.ballCarrierOverlayEl.style.top = `${screenY}px`;
    this.ballCarrierOverlayEl.style.borderColor =
      this.ballOwner.teamSide === 'home' ? '#10B981' : '#38BDF8';
    this.ballCarrierOverlayEl.textContent = this.ballOwner.data.name;
  }

  private emitHUD() {
    const controlled = this.getControlledPlayer() || this.players[0];
    const totalPoss = Math.max(1, this.homePossessionFrames + this.awayPossessionFrames);
    const homePoss = Math.round((this.homePossessionFrames / totalPoss) * 100);

    this.config.onHUDUpdate({
      homeScore: this.homeScore,
      awayScore: this.awayScore,
      matchClockSeconds: Math.min(5400, Math.floor((this.elapsedRealSeconds / this.matchDurationRealSeconds) * 5400)),
      controlledPlayerName: controlled?.data.name || 'Player',
      controlledPlayerRole: controlled?.role || 'ST',
      controlledPlayerStamina: Math.round(controlled?.stamina || 100),
      controlledPlayerRating: controlled?.data.rating || 90,
      shotPower: Math.round(this.chargeLevel),
      shotTypeLabel:
        this.chargingAction === 'curve'
          ? 'CURVE SHOT'
          : this.chargingAction === 'chip'
          ? 'CHIP SHOT'
          : this.chargingAction === 'shoot'
          ? this.chargeLevel > 75
            ? 'POWER SHOT'
            : 'NORMAL SHOT'
          : '',
      activeSkillBanner: this.activeSkillBanner,
      commentaryBanner: this.commentaryTimer > 0 ? this.commentaryBanner : '',
      activeSetPiece: this.activeSetPiece,
      setPieceTeam: this.setPieceTeam,
      setPieceLabel: this.activeSetPiece !== 'none' ? this.setPieceLabel : '',
      isCelebrating: this.celebrationGlobalTimer > 0,
      celebrationScorer: this.celebrationScorerName,
      isReplaying: this.isReplaying,
      replayReason: this.replayReason,
      isMatchOver: this.isMatchOver,
      cameraMode: this.config.cameraMode,
      manualGKActive: this.manualGKActive,
      autoSwitchMode: this.autoSwitchMode,
      practiceDrill: this.practiceDrill,
      challengeScore: this.challengeScore,
      challengeAttempts: this.challengeAttempts,
      radarDots: this.players.map((p, idx) => ({
        x: p.x / (PITCH_WIDTH / 2),
        z: p.z / (PITCH_DEPTH / 2),
        team: p.teamSide,
        isControlled: idx === this.controlledIdx,
        isGK: p.role === 'GK',
      })),
      ballRadar: {
        x: this.ballPos.x / (PITCH_WIDTH / 2),
        z: this.ballPos.z / (PITCH_DEPTH / 2),
      },
      stats: {
        homePossession: homePoss,
        awayPossession: 100 - homePoss,
        ...this.stats,
      },
    });
  }
}
