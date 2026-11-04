/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  Crosshair,
  Shield,
  Zap,
  RotateCcw,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Award,
  ChevronLeft,
  Coins,
  Skull,
  Target,
  Smartphone,
  Eye,
  Check,
} from 'lucide-react';
import { WeaponItem, SHOOTER_ARENAS, ShooterMapArena } from '../data/weaponsDatabase';
import { FootballPlayer } from '../data/gameDatabase';
import { SoundEngine } from '../engine/SoundEngine';
import { PlayerPhotoAvatar } from './PlayerPhotoAvatar';

interface ShooterMatchViewportProps {
  player: FootballPlayer;
  weapon: WeaponItem;
  weaponLevel: number;
  arenaId: string;
  opponentPlayers: FootballPlayer[];
  onFinishMatch: (earnedCoins: number, kills: number, score: number) => void;
  onExitToHub: () => void;
}

interface BulletProjectile {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  distanceTraveled: number;
  maxDistance: number;
  damage: number;
  isPlayerBullet: boolean;
  mesh: THREE.Mesh;
}

interface CombatantBot {
  id: string;
  player: FootballPlayer;
  mesh: THREE.Group;
  health: number;
  maxHealth: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation: number;
  targetPos: THREE.Vector3;
  weaponCooldown: number;
  strafeDir: number;
  strafeTimer: number;
  avatarSprite?: THREE.Sprite;
}

export const ShooterMatchViewport3D: React.FC<ShooterMatchViewportProps> = ({
  player,
  weapon,
  weaponLevel,
  arenaId,
  opponentPlayers,
  onFinishMatch,
  onExitToHub,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Gameplay state
  const [health, setHealth] = useState<number>(100);
  const [maxHealth] = useState<number>(100 + Math.round((player.attributes.physical - 70) * 1.5));
  const [ammo, setAmmo] = useState<number>(weapon.magazineSize + (weaponLevel - 1) * 3);
  const [maxAmmo] = useState<number>(weapon.magazineSize + (weaponLevel - 1) * 3);
  const [isReloading, setIsReloading] = useState<boolean>(false);
  const [reloadProgress, setReloadProgress] = useState<number>(0);
  const [kills, setKills] = useState<number>(0);
  const [matchScore, setMatchScore] = useState<number>(0);
  const [earnedCoins, setEarnedCoins] = useState<number>(0);
  const [matchTimer, setMatchTimer] = useState<number>(90); // 90 seconds match
  const [matchOver, setMatchOver] = useState<boolean>(false);
  const [killFeed, setKillFeed] = useState<string[]>([]);
  const [hitMarkerVisible, setHitMarkerVisible] = useState<boolean>(false);

  // Touch Virtual Joysticks & Controls
  const moveJoystickRef = useRef<{ active: boolean; startX: number; startY: number; currX: number; currY: number }>({
    active: false,
    startX: 0,
    startY: 0,
    currX: 0,
    currY: 0,
  });
  const [moveJoystickPos, setMoveJoystickPos] = useState<{ x: number; y: number } | null>(null);

  const aimJoystickRef = useRef<{ active: boolean; startX: number; startY: number; currX: number; currY: number }>({
    active: false,
    startX: 0,
    startY: 0,
    currX: 0,
    currY: 0,
  });
  const [aimJoystickPos, setAimJoystickPos] = useState<{ x: number; y: number } | null>(null);
  const isFiringRef = useRef<boolean>(false);

  // Keyboard controls fallback for desktop testing
  const keysPressed = useRef<Record<string, boolean>>({});

  // 3D Scene Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const playerMeshRef = useRef<THREE.Group | null>(null);
  const botsRef = useRef<CombatantBot[]>([]);
  const bulletsRef = useRef<BulletProjectile[]>([]);
  const lastShotTimeRef = useRef<number>(0);
  const isReloadingRef = useRef<boolean>(false);
  const obstaclesRef = useRef<THREE.Box3[]>([]);

  const arena = SHOOTER_ARENAS.find((a) => a.id === arenaId) || SHOOTER_ARENAS[0];
  const effectiveDamage = Math.round(weapon.damage * (1 + (weaponLevel - 1) * 0.18));

  // Trigger weapon firing
  const fireWeapon = useCallback(() => {
    if (isReloadingRef.current || matchOver) return;

    const now = performance.now();
    if (now - lastShotTimeRef.current < weapon.fireRateMs) return;

    setAmmo((prev) => {
      if (prev <= 0) {
        // Trigger auto-reload
        startReload();
        return 0;
      }
      lastShotTimeRef.current = now;

      // Create bullets
      const pellets = weapon.pelletsPerShot || 1;
      const playerPos = playerMeshRef.current?.position || new THREE.Vector3();
      const playerRot = playerMeshRef.current?.rotation.y || 0;

      SoundEngine.playGunshot(weapon.soundType);

      for (let i = 0; i < pellets; i++) {
        const spreadAngle = (Math.random() - 0.5) * weapon.spread * (pellets > 1 ? 2.5 : 1.2);
        const bulletAngle = playerRot + spreadAngle;

        const dir = new THREE.Vector3(Math.sin(bulletAngle), 0, Math.cos(bulletAngle)).normalize();
        const spawnPos = playerPos.clone().add(new THREE.Vector3(0, 1.2, 0)).add(dir.clone().multiplyScalar(0.8));

        // Create 3D Bullet tracer
        const geom = new THREE.CylinderGeometry(0.08, 0.08, 0.45, 6);
        geom.rotateX(Math.PI / 2);
        const mat = new THREE.MeshBasicMaterial({ color: weapon.bulletColor });
        const bulletMesh = new THREE.Mesh(geom, mat);
        bulletMesh.position.copy(spawnPos);
        bulletMesh.lookAt(spawnPos.clone().add(dir));

        sceneRef.current?.add(bulletMesh);

        bulletsRef.current.push({
          position: spawnPos,
          velocity: dir.multiplyScalar(weapon.bulletSpeed),
          distanceTraveled: 0,
          maxDistance: weapon.range,
          damage: effectiveDamage,
          isPlayerBullet: true,
          mesh: bulletMesh,
        });
      }

      return prev - 1;
    });
  }, [weapon, weaponLevel, effectiveDamage, matchOver]);

  const startReload = useCallback(() => {
    if (isReloadingRef.current || ammo === maxAmmo) return;
    isReloadingRef.current = true;
    setIsReloading(true);
    setReloadProgress(0);
    SoundEngine.playReload();

    const startTime = performance.now();
    const duration = weapon.reloadTimeMs;

    const interval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(100, Math.round((elapsed / duration) * 100));
      setReloadProgress(progress);

      if (elapsed >= duration) {
        clearInterval(interval);
        setAmmo(maxAmmo);
        isReloadingRef.current = false;
        setIsReloading(false);
      }
    }, 50);
  }, [ammo, maxAmmo, weapon.reloadTimeMs]);

  // Touch Virtual Joystick Handlers (Responsive on Phones)
  const handleTouchStartMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    moveJoystickRef.current = {
      active: true,
      startX: touch.clientX,
      startY: touch.clientY,
      currX: touch.clientX,
      currY: touch.clientY,
    };
    setMoveJoystickPos({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchMoveMove = (e: React.TouchEvent) => {
    if (!moveJoystickRef.current.active) return;
    const touch = e.touches[0];
    moveJoystickRef.current.currX = touch.clientX;
    moveJoystickRef.current.currY = touch.clientY;
  };

  const handleTouchEndMove = () => {
    moveJoystickRef.current.active = false;
    setMoveJoystickPos(null);
  };

  const handleTouchStartAim = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    aimJoystickRef.current = {
      active: true,
      startX: touch.clientX,
      startY: touch.clientY,
      currX: touch.clientX,
      currY: touch.clientY,
    };
    setAimJoystickPos({ x: touch.clientX, y: touch.clientY });
    isFiringRef.current = true;
    fireWeapon();
  };

  const handleTouchMoveAim = (e: React.TouchEvent) => {
    if (!aimJoystickRef.current.active) return;
    const touch = e.touches[0];
    aimJoystickRef.current.currX = touch.clientX;
    aimJoystickRef.current.currY = touch.clientY;
  };

  const handleTouchEndAim = () => {
    aimJoystickRef.current.active = false;
    setAimJoystickPos(null);
    isFiringRef.current = false;
  };

  // Keyboard desktop event listeners
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = true;
      if (e.key === ' ' || e.key.toLowerCase() === 'k') {
        fireWeapon();
      }
      if (e.key.toLowerCase() === 'r') {
        startReload();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [fireWeapon, startReload]);

  // Match countdown timer
  useEffect(() => {
    if (matchOver) return;
    const timer = setInterval(() => {
      setMatchTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setMatchOver(true);
          SoundEngine.playWhistle('fulltime');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [matchOver]);

  // Setup Three.js scene & gameplay loop
  useEffect(() => {
    if (!mountRef.current) return;
    const width = mountRef.current.clientWidth || window.innerWidth;
    const height = mountRef.current.clientHeight || window.innerHeight;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(arena.skyColor);
    scene.fog = new THREE.FogExp2(arena.skyColor, 0.022);
    sceneRef.current = scene;

    // Camera setup (Isometric third-person view ideal for phones)
    const camera = new THREE.PerspectiveCamera(54, width / height, 0.1, 150);
    camera.position.set(0, 16, 14);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(20, 35, 15);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Floor / Ground
    const floorGeo = new THREE.PlaneGeometry(80, 80);
    const floorMat = new THREE.MeshStandardMaterial({
      color: arena.groundColor,
      roughness: 0.8,
      metalness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid Floor Overlay
    const grid = new THREE.GridHelper(80, 40, arena.gridColor, 0x1e293b);
    grid.position.y = 0.02;
    scene.add(grid);

    // Tactical Obstacles & Barricades
    const obstacles: THREE.Box3[] = [];
    const obstacleGeom = new THREE.BoxGeometry(2.8, 2.2, 2.8);
    const obstacleMat = new THREE.MeshStandardMaterial({
      color: arena.obstacleColor,
      roughness: 0.6,
      metalness: 0.4,
    });

    const coverPositions = [
      [-12, -12], [12, -12], [-12, 12], [12, 12],
      [-6, 0], [6, 0], [0, -6], [0, 6],
      [-18, 4], [18, -4], [-4, -18], [4, 18],
      [-10, 20], [10, -20], [-22, -16], [22, 16],
    ];

    coverPositions.forEach(([x, z]) => {
      const box = new THREE.Mesh(obstacleGeom, obstacleMat);
      box.position.set(x, 1.1, z);
      box.castShadow = true;
      box.receiveShadow = true;
      scene.add(box);

      // Create boundary box for collision
      const bbox = new THREE.Box3().setFromObject(box);
      obstacles.push(bbox);
    });
    obstaclesRef.current = obstacles;

    // Outer Boundary Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
    const wallH = 3;
    const createWall = (x: number, z: number, w: number, d: number) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), wallMat);
      wall.position.set(x, wallH / 2, z);
      scene.add(wall);
      obstacles.push(new THREE.Box3().setFromObject(wall));
    };
    createWall(0, -40, 80, 1.5);
    createWall(0, 40, 80, 1.5);
    createWall(-40, 0, 1.5, 80);
    createWall(40, 0, 1.5, 80);

    // Helper: Create 3D Soldier / Player Mesh with Photo Face Plate
    const createPlayerMesh = (isLocalPlayer: boolean, skinTone: string, hairColor: string, jerseyColor: string) => {
      const group = new THREE.Group();

      // Body / Torso
      const bodyMat = new THREE.MeshStandardMaterial({ color: jerseyColor });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.4, 1.1, 8), bodyMat);
      body.position.y = 1.0;
      body.castShadow = true;
      group.add(body);

      // Head
      const headMat = new THREE.MeshStandardMaterial({ color: skinTone });
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 12), headMat);
      head.position.y = 1.85;
      head.castShadow = true;
      group.add(head);

      // Hair
      const hairMat = new THREE.MeshStandardMaterial({ color: hairColor });
      const hair = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.2, 8), hairMat);
      hair.position.y = 2.05;
      group.add(hair);

      // Weapon model in hands
      const gunMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.8 });
      const gun = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.85), gunMat);
      gun.position.set(0.32, 1.25, 0.5);
      group.add(gun);

      // Red/Green Indicator Ring
      const ringGeo = new THREE.RingGeometry(0.55, 0.65, 16);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: isLocalPlayer ? 0x10b981 : 0xef4444,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = 0.05;
      group.add(ring);

      return group;
    };

    // Spawn Local Player
    const playerGroup = createPlayerMesh(true, player.skinTone, player.hairColor, '#10B981');
    playerGroup.position.set(0, 0, 15);
    scene.add(playerGroup);
    playerMeshRef.current = playerGroup;

    // Spawn Opponent Footballer Bots
    const bots: CombatantBot[] = [];
    const botCandidates = opponentPlayers.slice(0, 8);
    const spawnPoints = [
      [-15, -20], [15, -20], [0, -25], [-20, -5],
      [20, -5], [-12, -30], [12, -30], [0, -15],
    ];

    botCandidates.forEach((botPlayer, idx) => {
      const botMesh = createPlayerMesh(false, botPlayer.skinTone, botPlayer.hairColor, '#EF4444');
      const [spawnX, spawnZ] = spawnPoints[idx % spawnPoints.length];
      botMesh.position.set(spawnX, 0, spawnZ);
      scene.add(botMesh);

      bots.push({
        id: botPlayer.id,
        player: botPlayer,
        mesh: botMesh,
        health: 100,
        maxHealth: 100,
        position: botMesh.position,
        velocity: new THREE.Vector3(),
        rotation: 0,
        targetPos: new THREE.Vector3(spawnX, 0, spawnZ),
        weaponCooldown: 0,
        strafeDir: Math.random() > 0.5 ? 1 : -1,
        strafeTimer: 0,
      });
    });
    botsRef.current = bots;

    // Animation & Game Physics Loop (60 FPS smooth mobile loop)
    let animationFrameId: number;
    let lastFrameTime = performance.now();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = Math.min(0.06, (now - lastFrameTime) / 1000);
      lastFrameTime = now;

      const pMesh = playerMeshRef.current;
      if (!pMesh) return;

      // 1. Process Player Movement (Virtual Joystick + Desktop WASD)
      let moveX = 0;
      let moveZ = 0;

      if (moveJoystickRef.current.active) {
        const dx = moveJoystickRef.current.currX - moveJoystickRef.current.startX;
        const dy = moveJoystickRef.current.currY - moveJoystickRef.current.startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 10) {
          moveX = Math.min(1, Math.max(-1, dx / 45));
          moveZ = Math.min(1, Math.max(-1, dy / 45));
        }
      }

      if (keysPressed.current['w'] || keysPressed.current['arrowup']) moveZ -= 1;
      if (keysPressed.current['s'] || keysPressed.current['arrowdown']) moveZ += 1;
      if (keysPressed.current['a'] || keysPressed.current['arrowleft']) moveX -= 1;
      if (keysPressed.current['d'] || keysPressed.current['arrowright']) moveX += 1;

      const moveLen = Math.sqrt(moveX * moveX + moveZ * moveZ);
      const playerSpeed = 8.5 * (player.attributes.pace / 85);

      if (moveLen > 0.05) {
        const normX = (moveX / moveLen) * playerSpeed * delta;
        const normZ = (moveZ / moveLen) * playerSpeed * delta;

        // Candidate position with obstacle collision
        const newX = pMesh.position.x + normX;
        const newZ = pMesh.position.z + normZ;

        // Check arena bounds
        if (Math.abs(newX) < 38) pMesh.position.x = newX;
        if (Math.abs(newZ) < 38) pMesh.position.z = newZ;
      }

      // 2. Process Player Aim Rotation (Aim Joystick or Face Nearest Bot)
      if (aimJoystickRef.current.active) {
        const dx = aimJoystickRef.current.currX - aimJoystickRef.current.startX;
        const dy = aimJoystickRef.current.currY - aimJoystickRef.current.startY;
        if (Math.hypot(dx, dy) > 10) {
          pMesh.rotation.y = Math.atan2(dx, dy);
        }
      } else if (moveLen > 0.1) {
        // Face moving direction if not manually aiming
        pMesh.rotation.y = Math.atan2(moveX, moveZ);
      }

      // Continuous firing when holding down aim joystick
      if (isFiringRef.current) {
        fireWeapon();
      }

      // 3. Smooth Camera Follow Player
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, pMesh.position.x, 0.1);
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, pMesh.position.z + 14, 0.1);
      camera.position.y = 16;
      camera.lookAt(pMesh.position.x, 1, pMesh.position.z);

      // 4. Update Bullets & Hit Detection
      for (let i = bulletsRef.current.length - 1; i >= 0; i--) {
        const b = bulletsRef.current[i];
        const step = b.velocity.clone().multiplyScalar(delta);
        b.position.add(step);
        b.distanceTraveled += step.length();
        b.mesh.position.copy(b.position);

        let bulletDestroyed = false;

        // Player bullet hitting enemy bots
        if (b.isPlayerBullet) {
          for (const bot of botsRef.current) {
            if (bot.health <= 0) continue;
            const dist = b.position.distanceTo(bot.mesh.position);
            if (dist < 1.1) {
              bot.health -= b.damage;
              bulletDestroyed = true;
              SoundEngine.playHitConfirm();
              setHitMarkerVisible(true);
              setTimeout(() => setHitMarkerVisible(false), 120);

              if (bot.health <= 0) {
                // Bot eliminated
                SoundEngine.playEliminationRoar();
                setKills((k) => k + 1);
                const bounty = 1500;
                setEarnedCoins((c) => c + bounty);
                setMatchScore((s) => s + 250);
                setKillFeed((prev) => [
                  `🎯 ${player.name} eliminated ${bot.player.name} (+${bounty} Coins)`,
                  ...prev.slice(0, 3),
                ]);

                // Hide eliminated bot mesh & respawn after 4 seconds
                bot.mesh.visible = false;
                setTimeout(() => {
                  bot.health = bot.maxHealth;
                  bot.mesh.position.set(
                    (Math.random() - 0.5) * 50,
                    0,
                    -15 - Math.random() * 15
                  );
                  bot.mesh.visible = true;
                }, 4000);
              }
              break;
            }
          }
        } else {
          // Bot bullet hitting Player
          const distToPlayer = b.position.distanceTo(pMesh.position);
          if (distToPlayer < 1.1) {
            setHealth((hp) => {
              const newHp = Math.max(0, hp - b.damage);
              if (newHp === 0 && !matchOver) {
                // Player knocked out -> respawn after brief penalty
                setTimeout(() => {
                  pMesh.position.set(0, 0, 15);
                  setHealth(maxHealth);
                }, 1500);
              }
              return newHp;
            });
            bulletDestroyed = true;
            SoundEngine.playKick(0.5);
          }
        }

        // Remove bullet if traveled beyond max range or hit
        if (b.distanceTraveled >= b.maxDistance || bulletDestroyed) {
          scene.remove(b.mesh);
          bulletsRef.current.splice(i, 1);
        }
      }

      // 5. Update Enemy Combatant Bots AI & Combat
      botsRef.current.forEach((bot) => {
        if (bot.health <= 0 || !bot.mesh.visible) return;

        const distToPlayer = bot.mesh.position.distanceTo(pMesh.position);

        // Turn toward player
        const dx = pMesh.position.x - bot.mesh.position.x;
        const dz = pMesh.position.z - bot.mesh.position.z;
        bot.mesh.rotation.y = Math.atan2(dx, dz);

        // Movement AI: Approach player if far, strafe around cover if near
        bot.strafeTimer += delta;
        if (bot.strafeTimer > 2.5) {
          bot.strafeDir *= -1;
          bot.strafeTimer = 0;
        }

        if (distToPlayer > 12) {
          // Move toward player
          const dir = new THREE.Vector3(dx, 0, dz).normalize();
          bot.mesh.position.add(dir.multiplyScalar(4.5 * delta));
        } else if (distToPlayer < 6) {
          // Back up if player gets too close
          const dir = new THREE.Vector3(-dx, 0, -dz).normalize();
          bot.mesh.position.add(dir.multiplyScalar(3.5 * delta));
        } else {
          // Tactical lateral strafe
          const perp = new THREE.Vector3(-dz, 0, dx).normalize().multiplyScalar(bot.strafeDir);
          bot.mesh.position.add(perp.multiplyScalar(3.8 * delta));
        }

        // Enemy shooting logic (Periodic bursts)
        bot.weaponCooldown += delta;
        if (bot.weaponCooldown > 1.8 && distToPlayer < 28) {
          bot.weaponCooldown = Math.random() * 0.6; // reset with slight variance

          const dir = new THREE.Vector3(dx, 0, dz).normalize();
          const spawnPos = bot.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0)).add(dir.clone().multiplyScalar(0.8));

          const geom = new THREE.CylinderGeometry(0.08, 0.08, 0.45, 6);
          geom.rotateX(Math.PI / 2);
          const mat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
          const bulletMesh = new THREE.Mesh(geom, mat);
          bulletMesh.position.copy(spawnPos);
          bulletMesh.lookAt(spawnPos.clone().add(dir));

          scene.add(bulletMesh);

          bulletsRef.current.push({
            position: spawnPos,
            velocity: dir.multiplyScalar(42),
            distanceTraveled: 0,
            maxDistance: 45,
            damage: 16,
            isPlayerBullet: false,
            mesh: bulletMesh,
          });
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [arena, player, opponentPlayers]);

  return (
    <div className="relative w-full h-screen bg-[#070A0E] overflow-hidden select-none touch-none">
      {/* 3D Canvas Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* TOP HUD: Health, Score, Bounty Coins, Kill Feed, Timer */}
      <div className="absolute top-0 inset-x-0 p-3 sm:p-5 flex items-start justify-between pointer-events-none z-20">
        {/* Left: Player Profile & Health Bar */}
        <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md border border-white/15 rounded-2xl p-2.5 sm:p-3 pointer-events-auto shadow-xl">
          <PlayerPhotoAvatar player={player} className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl border border-white/20 shrink-0" />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-xs sm:text-sm text-white truncate max-w-[130px]">
                {player.name}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 font-mono text-[10px] font-bold">
                {weapon.name}
              </span>
            </div>

            {/* Health Bar */}
            <div className="w-32 sm:w-44 h-2.5 rounded-full bg-black/70 border border-white/15 overflow-hidden">
              <div
                className={`h-full transition-all duration-200 ${
                  health > 50 ? 'bg-emerald-500' : health > 25 ? 'bg-amber-500' : 'bg-red-500 animate-pulse'
                }`}
                style={{ width: `${Math.max(0, (health / maxHealth) * 100)}%` }}
              />
            </div>
            <div className="text-[10px] font-mono text-slate-300 font-bold">
              HP {health} / {maxHealth}
            </div>
          </div>
        </div>

        {/* Center: Match Timer & Score */}
        <div className="flex flex-col items-center">
          <div className="px-4 py-1.5 rounded-2xl bg-black/70 backdrop-blur-md border border-white/20 font-mono text-lg sm:text-xl font-black text-white shadow-lg flex items-center gap-2">
            <span className={matchTimer <= 15 ? 'text-red-500 animate-pulse' : 'text-amber-400'}>
              {Math.floor(matchTimer / 60)}:{(matchTimer % 60).toString().padStart(2, '0')}
            </span>
          </div>

          <div className="flex items-center gap-3 mt-1.5 text-xs font-mono">
            <span className="px-2.5 py-0.5 rounded-lg bg-black/50 text-slate-300 border border-white/10">
              KILLS: <strong className="text-white">{kills}</strong>
            </span>
            <span className="px-2.5 py-0.5 rounded-lg bg-black/50 text-amber-400 border border-white/10 font-bold flex items-center gap-1">
              <Coins className="w-3 h-3" />+{earnedCoins.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Right: Exit / Menu button */}
        <button
          onClick={() => {
            SoundEngine.playUIClick();
            onExitToHub();
          }}
          className="pointer-events-auto px-3.5 py-2 rounded-xl bg-black/60 hover:bg-black/90 border border-white/15 text-xs font-mono font-bold text-slate-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-lg"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>HUB</span>
        </button>
      </div>

      {/* Kill Feed (Top Right below HUD) */}
      <div className="absolute top-20 right-4 space-y-1.5 pointer-events-none z-10 hidden sm:block">
        {killFeed.map((feed, idx) => (
          <div
            key={idx}
            className="px-3 py-1 rounded-lg bg-black/70 border border-red-500/30 text-[11px] font-mono text-red-200 animate-fade-in shadow"
          >
            {feed}
          </div>
        ))}
      </div>

      {/* Center Screen Crosshair & Hitmarker */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div className={`relative transition-transform duration-75 ${hitMarkerVisible ? 'scale-125' : 'scale-100'}`}>
          <div className="w-8 h-8 rounded-full border border-white/40 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
          </div>
          {hitMarkerVisible && (
            <div className="absolute -inset-2 flex items-center justify-center">
              <span className="text-red-500 font-bold text-lg select-none">✕</span>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Touch Controls Layer (Bottom Screen) */}
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-8 flex items-end justify-between pointer-events-none z-20">
        {/* Left Touch Virtual Joystick: Movement (WASD on Phones) */}
        <div
          onTouchStart={handleTouchStartMove}
          onTouchMove={handleTouchMoveMove}
          onTouchEnd={handleTouchEndMove}
          className="pointer-events-auto relative w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-black/40 border-2 border-white/20 flex items-center justify-center touch-none backdrop-blur-sm shadow-2xl"
        >
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest pointer-events-none">
            MOVE
          </div>
          {moveJoystickPos && (
            <div
              className="absolute w-14 h-14 rounded-full bg-emerald-500/80 border-2 border-white shadow-lg pointer-events-none"
              style={{
                transform: `translate(${Math.min(45, Math.max(-45, moveJoystickRef.current.currX - moveJoystickRef.current.startX))}px, ${Math.min(45, Math.max(-45, moveJoystickRef.current.currY - moveJoystickRef.current.startY))}px)`,
              }}
            />
          )}
        </div>

        {/* Center Ammo Gauge & Reload Button */}
        <div className="pointer-events-auto flex flex-col items-center gap-2 mb-2">
          <div className="px-4 py-2 rounded-2xl bg-black/80 backdrop-blur-md border border-white/20 text-center shadow-xl">
            <div className="font-mono text-xs text-slate-400">AMMO</div>
            <div className="font-display font-black text-2xl text-white">
              {isReloading ? (
                <span className="text-amber-400 text-sm animate-pulse">RELOADING {reloadProgress}%</span>
              ) : (
                <>
                  <span className={ammo <= 3 ? 'text-red-500' : 'text-white'}>{ammo}</span>
                  <span className="text-slate-400 text-sm"> / {maxAmmo}</span>
                </>
              )}
            </div>
          </div>

          <button
            disabled={isReloading || ammo === maxAmmo}
            onClick={startReload}
            className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-40 border border-white/20 text-xs font-mono font-bold text-white transition-all cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isReloading ? 'animate-spin' : ''}`} />
            RELOAD (R)
          </button>
        </div>

        {/* Right Touch Virtual Joystick & Fire Button: Aim + Shoot */}
        <div
          onTouchStart={handleTouchStartAim}
          onTouchMove={handleTouchMoveAim}
          onTouchEnd={handleTouchEndAim}
          className="pointer-events-auto relative w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-red-950/40 border-2 border-red-500/40 flex items-center justify-center touch-none backdrop-blur-sm shadow-2xl"
        >
          <div className="text-[10px] font-mono text-red-300 uppercase tracking-widest pointer-events-none flex flex-col items-center gap-0.5">
            <Crosshair className="w-5 h-5 text-red-400" />
            <span>AIM & FIRE</span>
          </div>
          {aimJoystickPos && (
            <div
              className="absolute w-14 h-14 rounded-full bg-red-500/90 border-2 border-white shadow-lg pointer-events-none"
              style={{
                transform: `translate(${Math.min(45, Math.max(-45, aimJoystickRef.current.currX - aimJoystickRef.current.startX))}px, ${Math.min(45, Math.max(-45, aimJoystickRef.current.currY - aimJoystickRef.current.startY))}px)`,
              }}
            />
          )}
        </div>
      </div>

      {/* Match Over Modal (Victory & Rewards Celebration) */}
      {matchOver && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="max-w-md w-full rounded-3xl bg-gradient-to-b from-[#1E1111] to-[#0A0D14] border-2 border-red-500/60 p-6 sm:p-8 text-center space-y-6 shadow-2xl animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center mx-auto text-red-400">
              <Award className="w-8 h-8" />
            </div>

            <div>
              <div className="text-xs font-mono text-red-400 font-bold uppercase tracking-wider">
                OPERATION CONCLUDED
              </div>
              <h2 className="font-display text-3xl font-black text-white mt-1">
                VICTORY REWARDS
              </h2>
            </div>

            <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-3 font-mono text-sm">
              <div className="flex justify-between items-center text-slate-300">
                <span>Opponents Eliminated:</span>
                <span className="text-white font-bold text-base">{kills} Kills</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Combat Score:</span>
                <span className="text-cyan-400 font-bold">{matchScore} pts</span>
              </div>
              <div className="flex justify-between items-center text-amber-400 font-bold text-base pt-2 border-t border-white/10">
                <span>Total Coins Earned:</span>
                <span className="flex items-center gap-1">
                  <Coins className="w-4 h-4" />
                  +{(earnedCoins + 2500).toLocaleString()} Coins
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                SoundEngine.playBallCrackExplosion();
                onFinishMatch(earnedCoins + 2500, kills, matchScore);
              }}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-display font-black text-sm tracking-wide shadow-xl cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              CLAIM REWARDS & RETURN TO ARMORY
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
