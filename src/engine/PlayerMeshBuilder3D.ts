import * as THREE from 'three';
import { CelebrationType, FootballPlayer, PositionCode } from '../data/gameDatabase';

export interface ArticulatedPlayer3D {
  id: string;
  data: FootballPlayer;
  teamSide: 'home' | 'away';
  role: PositionCode;
  baseX: number;
  baseZ: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  facingAngle: number;
  stamina: number;
  animPhase: number;
  kickTimer: number;
  tackleTimer: number;
  skillTimer: number;
  rainbowTimer: number;
  bicycleTimer: number;
  activeSkillName: string;
  diveTimer: number;
  diveDirZ: number;
  diveHeight: number;
  celebrationTimer: number;
  celebrationType: CelebrationType;

  // Realistic Multi-Jointed Human 3D Hierarchy
  root: THREE.Group;
  torso: THREE.Group;
  headGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftForearm: THREE.Group;
  rightForearm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftKnee: THREE.Group;
  rightKnee: THREE.Group;
  indicatorRing: THREE.Mesh;
  sprintHalo: THREE.Mesh;
  youSprite: THREE.Sprite;
  carrierNameSprite: THREE.Sprite;
}

function createCarrierNameOverheadSprite(playerName: string, isHome: boolean): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 112;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Measure name width for sleek pill fit
  ctx.font = 'bold 34px "Plus Jakarta Sans", "Chakra Petch", sans-serif';
  const textMetrics = ctx.measureText(playerName);
  const boxWidth = Math.min(488, Math.max(200, textMetrics.width + 64));
  const boxX = (512 - boxWidth) / 2;

  // Dark broadcast pill with team-colored border
  ctx.fillStyle = 'rgba(7, 10, 14, 0.92)';
  ctx.strokeStyle = isHome ? '#10B981' : '#38BDF8';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(boxX, 12, boxWidth, 58, 14);
  ctx.fill();
  ctx.stroke();

  // Downward pointer arrow
  ctx.fillStyle = isHome ? '#10B981' : '#38BDF8';
  ctx.beginPath();
  ctx.moveTo(242, 70);
  ctx.lineTo(270, 70);
  ctx.lineTo(256, 90);
  ctx.closePath();
  ctx.fill();

  // Medium-sized clear player name
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(playerName, 256, 42);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(3.4, 0.74, 1);
  sprite.position.set(0, 2.52, 0);
  sprite.visible = false;
  return sprite;
}

function createYouOverheadSprite(playerName: string, isHome: boolean): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Dark sleek badge background
  ctx.fillStyle = isHome ? 'rgba(16, 185, 129, 0.95)' : 'rgba(245, 158, 11, 0.95)';
  ctx.beginPath();
  ctx.roundRect(48, 8, 160, 44, 10);
  ctx.fill();

  // Downward pointer triangle
  ctx.beginPath();
  ctx.moveTo(116, 52);
  ctx.lineTo(140, 52);
  ctx.lineTo(128, 68);
  ctx.closePath();
  ctx.fill();

  // "YOU" bold text
  ctx.fillStyle = '#070A0E';
  ctx.font = 'bold 26px "Chakra Petch", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(isHome ? 'YOU' : playerName.split(' ').pop() || 'P2', 128, 31);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.2, 0.82, 1);
  sprite.position.set(0, 2.72, 0);
  sprite.visible = false;
  return sprite;
}

function createJerseyNumberTexture(
  jerseyHex: string,
  trimHex: string,
  squadNumber: number,
  lastName: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Base jersey fabric color
  ctx.fillStyle = jerseyHex;
  ctx.fillRect(0, 0, 256, 256);

  // Subtle athletic mesh weave lines
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  for (let y = 0; y < 256; y += 8) {
    ctx.fillRect(0, y, 256, 2);
  }

  // Chest / shoulder trim accent stripe
  ctx.fillStyle = trimHex;
  ctx.fillRect(0, 34, 256, 20);

  // Determine high-contrast text color for squad number
  const isLightJersey =
    jerseyHex.toLowerCase() === '#ffffff' ||
    jerseyHex.toLowerCase() === '#f8fafc' ||
    jerseyHex.toLowerCase() === '#facc15';
  ctx.fillStyle = isLightJersey ? '#0f172a' : '#ffffff';

  // Back & Front Squad Number
  ctx.font = 'bold 68px "Chakra Petch", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(squadNumber || 10), 64, 140);
  ctx.fillText(String(squadNumber || 10), 192, 140);

  // Player Surname across upper back
  ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
  const cleanSurname = (lastName.split(' ').pop() || 'STAR').toUpperCase().slice(0, 10);
  ctx.fillText(cleanSurname, 192, 86);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export function createArticulatedPlayer3D(
  player: FootballPlayer,
  teamSide: 'home' | 'away',
  role: PositionCode,
  baseX: number,
  baseZ: number,
  kitPrimary: string,
  kitSecondary: string,
  shortsColor: string,
  gkColor: string
): ArticulatedPlayer3D {
  const root = new THREE.Group();
  const isGK = role === 'GK';
  const jerseyHex = isGK ? gkColor : kitPrimary;
  const trimHex = isGK ? '#09090b' : kitSecondary;

  const skinMat = new THREE.MeshStandardMaterial({
    color: player.skinTone,
    roughness: 0.55,
    metalness: 0.05,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: player.hairColor,
    roughness: 0.82,
  });
  const jerseyTex = createJerseyNumberTexture(jerseyHex, trimHex, player.number, player.name);
  const jerseyMat = new THREE.MeshStandardMaterial({
    map: jerseyTex,
    roughness: 0.62,
    metalness: 0.04,
  });
  const solidJerseyMat = new THREE.MeshStandardMaterial({
    color: jerseyHex,
    roughness: 0.6,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: trimHex,
    roughness: 0.5,
  });
  const shortsMat = new THREE.MeshStandardMaterial({
    color: isGK ? gkColor : shortsColor,
    roughness: 0.65,
  });
  const sockMat = new THREE.MeshStandardMaterial({
    color: isGK ? gkColor : kitPrimary === '#ffffff' ? '#f1f5f9' : kitPrimary,
    roughness: 0.7,
  });
  const bootMat = new THREE.MeshStandardMaterial({
    color: player.bootColor,
    roughness: 0.28,
    metalness: 0.25,
  });
  const eyeDarkMat = new THREE.MeshBasicMaterial({ color: '#111827' });

  // ============================================================================
  // 1. REALISTIC HUMAN TORSO & PELVIS (Natural 1.84m Athletic Proportions)
  // ============================================================================
  const torso = new THREE.Group();
  torso.position.y = 1.12; // Hip / Pelvis center height above turf
  root.add(torso);

  // Upper Chest (Tapered V-shape athletic human ribcage, wider X than Z)
  const chestGeo = new THREE.CylinderGeometry(0.22, 0.175, 0.48, 20);
  chestGeo.scale(1.18, 1.0, 0.74);
  const chestMesh = new THREE.Mesh(chestGeo, jerseyMat);
  chestMesh.position.y = 0.28;
  chestMesh.castShadow = true;
  chestMesh.receiveShadow = true;
  torso.add(chestMesh);

  // Rounded Shoulder Caps (Deltoids) + V-Neck Collar
  const collarGeo = new THREE.TorusGeometry(0.105, 0.022, 10, 20);
  const collarMesh = new THREE.Mesh(collarGeo, trimMat);
  collarMesh.rotation.x = Math.PI / 2 + 0.15;
  collarMesh.position.set(0, 0.51, 0.02);
  torso.add(collarMesh);

  // Lower Waist / Core transition
  const waistGeo = new THREE.CylinderGeometry(0.175, 0.185, 0.18, 18);
  waistGeo.scale(1.12, 1.0, 0.74);
  const waistMesh = new THREE.Mesh(waistGeo, solidJerseyMat);
  waistMesh.position.y = 0.02;
  waistMesh.castShadow = true;
  torso.add(waistMesh);

  // Tailored Football Shorts Hip / Pelvis
  const pelvisGeo = new THREE.CylinderGeometry(0.188, 0.2, 0.24, 18);
  pelvisGeo.scale(1.14, 1.0, 0.78);
  const pelvisMesh = new THREE.Mesh(pelvisGeo, shortsMat);
  pelvisMesh.position.y = -0.14;
  pelvisMesh.castShadow = true;
  torso.add(pelvisMesh);

  // ============================================================================
  // 2. REALISTIC HUMAN NECK, HEAD, FACE & HAIRSTYLE
  // ============================================================================
  const headGroup = new THREE.Group();
  headGroup.position.y = 0.54; // Base of neck
  torso.add(headGroup);

  // Anatomical Neck Cylinder
  const neckGeo = new THREE.CylinderGeometry(0.068, 0.078, 0.13, 14);
  const neckMesh = new THREE.Mesh(neckGeo, skinMat);
  neckMesh.position.y = 0.05;
  neckMesh.castShadow = true;
  headGroup.add(neckMesh);

  // Oval Human Cranium & Jawline
  const craniumGeo = new THREE.SphereGeometry(0.145, 20, 20);
  craniumGeo.scale(0.9, 1.1, 0.96);
  const headMesh = new THREE.Mesh(craniumGeo, skinMat);
  headMesh.position.y = 0.21;
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Human Ears
  const earGeo = new THREE.SphereGeometry(0.028, 10, 10);
  earGeo.scale(0.45, 1.1, 0.7);
  const leftEar = new THREE.Mesh(earGeo, skinMat);
  leftEar.position.set(-0.13, 0.2, 0);
  const rightEar = new THREE.Mesh(earGeo, skinMat);
  rightEar.position.set(0.13, 0.2, 0);
  headGroup.add(leftEar, rightEar);

  // Subtle Nose Bridge & Eyes (Facing +Z local forward)
  const noseGeo = new THREE.ConeGeometry(0.022, 0.055, 8);
  const noseMesh = new THREE.Mesh(noseGeo, skinMat);
  noseMesh.rotation.x = Math.PI / 2 - 0.25;
  noseMesh.position.set(0, 0.205, 0.142);
  headGroup.add(noseMesh);

  const eyeGeo = new THREE.SphereGeometry(0.015, 8, 8);
  const leftEye = new THREE.Mesh(eyeGeo, eyeDarkMat);
  leftEye.position.set(-0.046, 0.228, 0.13);
  const rightEye = new THREE.Mesh(eyeGeo, eyeDarkMat);
  rightEye.position.set(0.046, 0.228, 0.13);
  headGroup.add(leftEye, rightEye);

  // Eyebrows
  const browGeo = new THREE.BoxGeometry(0.036, 0.009, 0.012);
  const leftBrow = new THREE.Mesh(browGeo, hairMat);
  leftBrow.position.set(-0.046, 0.252, 0.132);
  const rightBrow = new THREE.Mesh(browGeo, hairMat);
  rightBrow.position.set(0.046, 0.252, 0.132);
  headGroup.add(leftBrow, rightBrow);

  // Sculpted Realistic Athlete Haircut Cap + Textured Top Volume
  const hairCapGeo = new THREE.SphereGeometry(
    0.15,
    18,
    16,
    0,
    Math.PI * 2,
    0,
    Math.PI * 0.58
  );
  hairCapGeo.scale(0.92, 1.1, 0.99);
  const hairCap = new THREE.Mesh(hairCapGeo, hairMat);
  hairCap.position.set(0, 0.22, -0.008);
  hairCap.rotation.x = -0.18;
  headGroup.add(hairCap);

  // Top Hair Crest / Modern Fade Volume
  const hairTopGeo = new THREE.CapsuleGeometry(0.068, 0.09, 8, 12);
  const hairTop = new THREE.Mesh(hairTopGeo, hairMat);
  hairTop.rotation.x = Math.PI / 2;
  hairTop.position.set(0, 0.34, 0.01);
  headGroup.add(hairTop);

  // ============================================================================
  // 3. REALISTIC ARTICULATED ARMS (Shoulder -> Upper Arm -> Elbow -> Forearm -> Hand)
  // ============================================================================
  const buildRealisticArm = (sideSign: number): { armGroup: THREE.Group; forearmGroup: THREE.Group } => {
    const armGroup = new THREE.Group();
    armGroup.position.set(sideSign * 0.29, 0.45, 0); // Shoulder socket

    // Shoulder / Short Sleeve (Capsule)
    const sleeveGeo = new THREE.CylinderGeometry(0.072, 0.064, 0.22, 14);
    const sleeveMesh = new THREE.Mesh(sleeveGeo, solidJerseyMat);
    sleeveMesh.position.y = -0.09;
    sleeveMesh.castShadow = true;
    armGroup.add(sleeveMesh);

    // Sleeve cuff band
    const cuffGeo = new THREE.CylinderGeometry(0.066, 0.066, 0.025, 14);
    const cuffMesh = new THREE.Mesh(cuffGeo, trimMat);
    cuffMesh.position.y = -0.195;
    armGroup.add(cuffMesh);

    // Bicep / Tricep lower upper-arm skin
    const bicepGeo = new THREE.CylinderGeometry(0.06, 0.052, 0.11, 12);
    const bicepMesh = new THREE.Mesh(bicepGeo, skinMat);
    bicepMesh.position.y = -0.24;
    bicepMesh.castShadow = true;
    armGroup.add(bicepMesh);

    // Elbow Pivot Group
    const forearmGroup = new THREE.Group();
    forearmGroup.position.set(0, -0.29, 0);
    armGroup.add(forearmGroup);

    // Tapered Muscular Forearm
    const forearmGeo = new THREE.CylinderGeometry(0.052, 0.038, 0.26, 12);
    const forearmMesh = new THREE.Mesh(forearmGeo, skinMat);
    forearmMesh.position.y = -0.13;
    forearmMesh.castShadow = true;
    forearmGroup.add(forearmMesh);

    // Wristband / Athlete Tape
    const wristTapeGeo = new THREE.CylinderGeometry(0.041, 0.041, 0.035, 12);
    const wristTape = new THREE.Mesh(
      wristTapeGeo,
      new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 })
    );
    wristTape.position.y = -0.25;
    forearmGroup.add(wristTape);

    // Sculpted Hand (or GK Pro Glove)
    const handGeo = new THREE.SphereGeometry(isGK ? 0.064 : 0.046, 12, 12);
    handGeo.scale(0.85, 1.25, 0.65);
    const handMesh = new THREE.Mesh(handGeo, isGK ? trimMat : skinMat);
    handMesh.position.y = -0.3;
    handMesh.castShadow = true;
    forearmGroup.add(handMesh);

    // Slight natural athletic elbow bend
    forearmGroup.rotation.x = -0.32;

    torso.add(armGroup);
    return { armGroup, forearmGroup };
  };

  const leftArmBuilt = buildRealisticArm(-1);
  const rightArmBuilt = buildRealisticArm(1);

  // ============================================================================
  // 4. REALISTIC ARTICULATED LEGS (Hip -> Thigh -> Knee Pivot -> Calf/Sock -> Boot)
  // ============================================================================
  const buildRealisticLeg = (offsetX: number): { hipGroup: THREE.Group; kneeGroup: THREE.Group } => {
    const hipGroup = new THREE.Group();
    hipGroup.position.set(offsetX, -0.22, 0); // Hip socket inside pelvis
    torso.add(hipGroup);

    // Upper Thigh Shorts Leg
    const shortLegGeo = new THREE.CylinderGeometry(0.105, 0.092, 0.24, 16);
    const shortLegMesh = new THREE.Mesh(shortLegGeo, shortsMat);
    shortLegMesh.position.y = -0.11;
    shortLegMesh.castShadow = true;
    hipGroup.add(shortLegMesh);

    // Muscular Quadricep / Hamstring (Exposed thigh above knee)
    const quadGeo = new THREE.CylinderGeometry(0.086, 0.072, 0.21, 14);
    const quadMesh = new THREE.Mesh(quadGeo, skinMat);
    quadMesh.position.y = -0.31;
    quadMesh.castShadow = true;
    hipGroup.add(quadMesh);

    // Knee Cap Joint
    const kneeCapGeo = new THREE.SphereGeometry(0.07, 12, 12);
    const kneeCapMesh = new THREE.Mesh(kneeCapGeo, skinMat);
    kneeCapMesh.position.y = -0.42;
    hipGroup.add(kneeCapMesh);

    // Knee Articulation Pivot Group (at y = -0.42 from hip)
    const kneeGroup = new THREE.Group();
    kneeGroup.position.set(0, -0.42, 0);
    hipGroup.add(kneeGroup);

    // Upper Calf Skin (Just below knee)
    const upperCalfGeo = new THREE.CylinderGeometry(0.068, 0.065, 0.09, 14);
    const upperCalfMesh = new THREE.Mesh(upperCalfGeo, skinMat);
    upperCalfMesh.position.y = -0.045;
    kneeGroup.add(upperCalfMesh);

    // High-Top Football Sock with Shinguard Contour
    const sockGeo = new THREE.CylinderGeometry(0.068, 0.048, 0.34, 16);
    const sockMesh = new THREE.Mesh(sockGeo, sockMat);
    sockMesh.position.y = -0.24;
    sockMesh.castShadow = true;
    kneeGroup.add(sockMesh);

    // Sock Turnover Trim Band
    const sockBandGeo = new THREE.CylinderGeometry(0.07, 0.069, 0.045, 16);
    const sockBandMesh = new THREE.Mesh(sockBandGeo, trimMat);
    sockBandMesh.position.y = -0.1;
    kneeGroup.add(sockBandMesh);

    // Contoured Aerodynamic Football Boot (Capsule + Studded Soleplate)
    const bootGroup = new THREE.Group();
    bootGroup.position.set(0, -0.43, 0.045);
    kneeGroup.add(bootGroup);

    const bootUpperGeo = new THREE.CapsuleGeometry(0.052, 0.14, 10, 14);
    bootUpperGeo.rotateX(Math.PI / 2);
    bootUpperGeo.scale(1.05, 0.78, 1.0);
    const bootUpperMesh = new THREE.Mesh(bootUpperGeo, bootMat);
    bootUpperMesh.castShadow = true;
    bootGroup.add(bootUpperMesh);

    const soleGeo = new THREE.BoxGeometry(0.095, 0.018, 0.23);
    const soleMesh = new THREE.Mesh(
      soleGeo,
      new THREE.MeshStandardMaterial({ color: '#09090b', roughness: 0.4 })
    );
    soleMesh.position.y = -0.038;
    bootGroup.add(soleMesh);

    return { hipGroup, kneeGroup };
  };

  const leftLegBuilt = buildRealisticLeg(-0.125);
  const rightLegBuilt = buildRealisticLeg(0.125);

  // Active Controlled Player Floor Ring Indicator
  const ringGeo = new THREE.RingGeometry(0.75, 0.96, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: teamSide === 'home' ? 0x10b981 : 0xf59e0b,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.0,
  });
  const indicatorRing = new THREE.Mesh(ringGeo, ringMat);
  indicatorRing.rotation.x = -Math.PI / 2;
  indicatorRing.position.y = 0.05;
  root.add(indicatorRing);

  // Sprint / Skill Boost Halo
  const haloGeo = new THREE.RingGeometry(0.98, 1.14, 32);
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.0,
  });
  const sprintHalo = new THREE.Mesh(haloGeo, haloMat);
  sprintHalo.rotation.x = -Math.PI / 2;
  sprintHalo.position.y = 0.06;
  root.add(sprintHalo);

  // Floating 3D "YOU" indicator above controlled player + Ball Carrier Name above head
  const youSprite = createYouOverheadSprite(player.name, teamSide === 'home');
  root.add(youSprite);

  const carrierNameSprite = createCarrierNameOverheadSprite(player.name, teamSide === 'home');
  root.add(carrierNameSprite);

  root.position.set(baseX, 0, baseZ);

  return {
    id: `${teamSide}_${player.id}_${role}_${Math.random().toString(36).slice(2, 6)}`,
    data: player,
    teamSide,
    role,
    baseX,
    baseZ,
    x: baseX,
    y: 0,
    z: baseZ,
    vx: 0,
    vz: 0,
    facingAngle: teamSide === 'home' ? Math.PI / 2 : -Math.PI / 2,
    stamina: 100,
    animPhase: Math.random() * Math.PI * 2,
    kickTimer: 0,
    tackleTimer: 0,
    skillTimer: 0,
    rainbowTimer: 0,
    bicycleTimer: 0,
    activeSkillName: '',
    diveTimer: 0,
    diveDirZ: 0,
    diveHeight: 0,
    celebrationTimer: 0,
    celebrationType: player.celebration || 'Knee Slide Surge',
    root,
    torso,
    headGroup,
    leftArm: leftArmBuilt.armGroup,
    rightArm: rightArmBuilt.armGroup,
    leftForearm: leftArmBuilt.forearmGroup,
    rightForearm: rightArmBuilt.forearmGroup,
    leftLeg: leftLegBuilt.hipGroup,
    rightLeg: rightLegBuilt.hipGroup,
    leftKnee: leftLegBuilt.kneeGroup,
    rightKnee: rightLegBuilt.kneeGroup,
    indicatorRing,
    sprintHalo,
    youSprite,
    carrierNameSprite,
  };
}

export function createFootballMesh(): {
  ballGroup: THREE.Group;
  ballMesh: THREE.Mesh;
  ballTrail: THREE.Line;
  trailPositions: THREE.Vector3[];
} {
  const ballGroup = new THREE.Group();

  // Procedural high-contrast official World Cup style match ball texture
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#090d16';
  const patches = [
    [64, 64],
    [192, 64],
    [128, 128],
    [64, 192],
    [192, 192],
  ];
  patches.forEach(([px, py]) => {
    ctx.beginPath();
    ctx.arc(px, py, 26, 0, Math.PI * 2);
    ctx.fill();
  });

  // Gold & Emerald World Cup accents
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, 96);
  ctx.lineTo(256, 160);
  ctx.stroke();

  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(0, 128);
  ctx.lineTo(256, 128);
  ctx.stroke();

  const ballTex = new THREE.CanvasTexture(canvas);
  const ballGeo = new THREE.SphereGeometry(0.36, 24, 24);
  const ballMat = new THREE.MeshStandardMaterial({
    map: ballTex,
    roughness: 0.28,
    metalness: 0.12,
  });
  const ballMesh = new THREE.Mesh(ballGeo, ballMat);
  ballMesh.castShadow = true;
  ballGroup.add(ballMesh);

  const trailPositions: THREE.Vector3[] = [];
  for (let i = 0; i < 20; i++) {
    trailPositions.push(new THREE.Vector3(0, 0.36, 0));
  }
  const trailGeo = new THREE.BufferGeometry().setFromPoints(trailPositions);
  const trailMat = new THREE.LineBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.0,
  });
  const ballTrail = new THREE.Line(trailGeo, trailMat);

  return { ballGroup, ballMesh, ballTrail, trailPositions };
}
