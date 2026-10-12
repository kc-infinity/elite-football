import * as THREE from 'three';
import { CelebrationType, FootballPlayer, PositionCode, TeamData } from '../data/gameDatabase';
import { getPlayerLikenessProfile } from '../components/PlayerPhotoAvatar';

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
  headerTimer?: number;
  activeSkillName: string;
  diveTimer: number;
  diveDirZ: number;
  diveHeight: number;
  celebrationTimer: number;
  celebrationType: CelebrationType;

  // 3D Scene Nodes for Biomechanical Human Animation
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

const faceTextureCache = new Map<string, THREE.CanvasTexture>();

function createRealistic3DFaceTexture(player: FootballPlayer): THREE.CanvasTexture {
  const cacheKey = `${player.id}_${player.skinTone}_${player.hairColor}`;
  const cached = faceTextureCache.get(cacheKey);
  if (cached) return cached;

  const likeness = getPlayerLikenessProfile(player);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Sphere UV mapping: U = 0.25 (front center of SphereGeometry when rotated -Math.PI/2 on Y, or U = 0.5 depending on rotation).
  // Note: In Three.js SphereGeometry, U=0.5 is at +X or -Z; let's align headMesh.rotation.y = -Math.PI / 2 so U=0.5 faces directly forward (+Z in local player coordinates)!
  ctx.fillStyle = player.skinTone || '#e0ac69';
  ctx.fillRect(0, 0, 512, 256);

  // Subtle subsurface skin warmth & cheekbone lighting around front center (x = 256, y = 128)
  const cheekGrad = ctx.createRadialGradient(256, 132, 12, 256, 132, 115);
  cheekGrad.addColorStop(0, 'rgba(255, 235, 215, 0.22)');
  cheekGrad.addColorStop(0.55, 'rgba(210, 120, 95, 0.08)');
  cheekGrad.addColorStop(1, 'rgba(0, 0, 0, 0.16)');
  ctx.fillStyle = cheekGrad;
  ctx.fillRect(0, 0, 512, 256);

  const hairCol =
    likeness.archetype === 'neymar'
      ? '#eab308'
      : likeness.archetype === 'haaland' || likeness.archetype === 'modric'
      ? '#fde047'
      : likeness.archetype === 'debruyne'
      ? '#d97706'
      : player.hairColor || '#111827';

  // Back of head & upper scalp hairline on texture
  ctx.fillStyle = hairCol;
  ctx.fillRect(0, 0, 512, 62);
  ctx.fillRect(0, 0, 145, 165);
  ctx.fillRect(367, 0, 145, 165);

  // Facial hair / beard on lower jaw (around x = 256, y = 165..245)
  const beardCol = likeness.archetype === 'debruyne' ? '#9a3412' : '#141417';
  if (likeness.beardStyle === 'full_thick' || likeness.beardStyle === 'full_trimmed') {
    ctx.save();
    ctx.fillStyle = beardCol;
    ctx.globalAlpha = likeness.beardStyle === 'full_thick' ? 0.88 : 0.68;
    ctx.beginPath();
    ctx.moveTo(192, 142);
    ctx.quadraticCurveTo(256, 245, 320, 142);
    ctx.lineTo(312, 168);
    ctx.quadraticCurveTo(256, 205, 200, 168);
    ctx.closePath();
    ctx.fill();
    // Chin & jawline full coverage
    ctx.beginPath();
    ctx.ellipse(256, 204, 54, 34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (likeness.beardStyle === 'stubble') {
    ctx.save();
    ctx.fillStyle = '#18181b';
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.ellipse(256, 196, 52, 32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Mustache & Goatee
  if (
    likeness.beardStyle === 'full_thick' ||
    likeness.beardStyle === 'full_trimmed' ||
    likeness.beardStyle === 'goatee' ||
    likeness.beardStyle === 'mustache_soul'
  ) {
    ctx.save();
    ctx.fillStyle = beardCol;
    ctx.globalAlpha = 0.82;
    // Mustache
    ctx.beginPath();
    ctx.moveTo(232, 166);
    ctx.quadraticCurveTo(256, 157, 280, 166);
    ctx.quadraticCurveTo(256, 163, 232, 166);
    ctx.fill();
    // Goatee chin patch
    ctx.beginPath();
    ctx.ellipse(256, 198, 18, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Expressive Eyebrows (Left = 228, Right = 284, y = 104)
  ctx.strokeStyle = hairCol === '#fde047' ? '#b45309' : '#0f172a';
  ctx.lineWidth = likeness.browThickness * 2.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(212, 106);
  ctx.quadraticCurveTo(228, 99 + likeness.browArch * 1.5, 244, 105);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(268, 105);
  ctx.quadraticCurveTo(284, 99 + likeness.browArch * 1.5, 300, 106);
  ctx.stroke();

  // Realistic Eyes (Sclera + Colored Iris + Pupil + Specular Catchlight)
  const drawEye = (cx: number, cy: number) => {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 12, 6.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Iris
    ctx.fillStyle = likeness.eyeColor;
    ctx.beginPath();
    ctx.arc(cx, cy, 5.6, 0, Math.PI * 2);
    ctx.fill();

    // Pupil
    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.arc(cx, cy, 2.8, 0, Math.PI * 2);
    ctx.fill();

    // Specular catchlight
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx - 2.0, cy - 1.8, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Upper eyelid lash crease
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(cx, cy + 2, 12.5, Math.PI * 1.12, Math.PI * 1.88);
    ctx.stroke();
    ctx.restore();
  };

  drawEye(229, 118);
  drawEye(283, 118);

  // Nose shadow & nostrils (y = 122..152)
  ctx.strokeStyle = 'rgba(0,0,0,0.22)';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(250, 148);
  ctx.quadraticCurveTo(256, 154, 262, 148);
  ctx.stroke();

  // Mouth / Athletic Smile (y = 174)
  if (likeness.smileIntensity > 0.68) {
    ctx.fillStyle = '#6b1d1d';
    ctx.beginPath();
    ctx.moveTo(236, 173);
    ctx.quadraticCurveTo(256, 185, 276, 173);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(239, 174);
    ctx.quadraticCurveTo(256, 181, 273, 174);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.strokeStyle = 'rgba(95, 32, 28, 0.82)';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(238, 174);
    ctx.quadraticCurveTo(256, 177 + likeness.smileIntensity * 5, 274, 174);
    ctx.stroke();
  }

  // Cristiano Ronaldo / Haaland signature cheekbone contour lines
  if (likeness.archetype === 'ronaldo' || likeness.archetype === 'haaland') {
    ctx.strokeStyle = 'rgba(0,0,0,0.16)';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(212, 140);
    ctx.quadraticCurveTo(222, 165, 232, 182);
    ctx.moveTo(300, 140);
    ctx.quadraticCurveTo(290, 165, 280, 182);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  faceTextureCache.set(cacheKey, tex);
  return tex;
}

function createJerseyTexture(
  primaryColor: string,
  secondaryColor: string,
  number: number,
  playerName: string,
  isGoalkeeper: boolean
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = primaryColor;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle fabric micro-weave & athletic side panels
  ctx.fillStyle = secondaryColor;
  ctx.globalAlpha = isGoalkeeper ? 0.18 : 0.26;
  ctx.fillRect(0, 0, 44, 512);
  ctx.fillRect(468, 0, 44, 512);
  ctx.fillRect(216, 0, 80, 512);
  ctx.globalAlpha = 1.0;

  // Collar trim
  ctx.strokeStyle = secondaryColor;
  ctx.lineWidth = 18;
  ctx.strokeRect(8, 8, 496, 496);

  const isLightJersey =
    primaryColor.toLowerCase() === '#ffffff' ||
    primaryColor.toLowerCase() === '#f8fafc' ||
    primaryColor.toLowerCase() === '#facc15' ||
    primaryColor.toLowerCase() === '#eab308';

  const textColor = isLightJersey ? '#090d16' : '#ffffff';
  const outlineColor = isLightJersey ? '#ffffff' : '#090d16';

  const cleanSurname = (
    playerName
      .replace(/\(.*?\)/g, '')
      .trim()
      .split(' ')
      .pop() || playerName
  )
    .toUpperCase()
    .slice(0, 12);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Back Player Surname
  ctx.font = '800 44px "Chakra Petch", sans-serif';
  ctx.lineWidth = 7;
  ctx.strokeStyle = outlineColor;
  ctx.fillStyle = textColor;
  ctx.strokeText(cleanSurname, 256, 132);
  ctx.fillText(cleanSurname, 256, 132);

  // Large Back Number & Chest Number
  ctx.font = '900 176px "JetBrains Mono", monospace';
  ctx.lineWidth = 12;
  ctx.strokeText(String(number), 256, 295);
  ctx.fillText(String(number), 256, 295);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function createYouOverheadSprite(playerName: string, isHome: boolean): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;

  const accent = isHome ? '#10b981' : '#f59e0b';
  const shortName = (
    playerName
      .replace(/\(.*?\)/g, '')
      .trim()
      .split(' ')
      .pop() || playerName
  )
    .toUpperCase()
    .slice(0, 10);

  ctx.fillStyle = 'rgba(7, 10, 14, 0.88)';
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(18, 8, 220, 50, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = accent;
  ctx.font = '900 22px "Chakra Petch", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`YOU · ${shortName}`, 128, 34);

  // Downward pointer arrow
  ctx.beginPath();
  ctx.moveTo(114, 60);
  ctx.lineTo(142, 60);
  ctx.lineTo(128, 82);
  ctx.closePath();
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.3, 0.86, 1);
  sprite.position.set(0, 2.75, 0);
  sprite.renderOrder = 999;
  return sprite;
}

function createCarrierNameOverheadSprite(playerName: string, isHome: boolean): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  const accent = isHome ? '#10b981' : '#38bdf8';
  const cleanName = playerName.replace(/\(.*?\)/g, '').trim().slice(0, 16);

  ctx.fillStyle = 'rgba(7, 10, 14, 0.82)';
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(12, 10, 232, 42, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 20px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(cleanName, 128, 31);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.1, 0.52, 1);
  sprite.position.set(0, 2.48, 0);
  sprite.renderOrder = 998;
  sprite.visible = false;
  return sprite;
}

export function createArticulatedPlayer3D(
  player: FootballPlayer,
  team: TeamData,
  teamSide: 'home' | 'away',
  role: PositionCode,
  baseX: number,
  baseZ: number
): ArticulatedPlayer3D {
  const root = new THREE.Group();
  const isGK = role === 'GK';
  const likeness = getPlayerLikenessProfile(player);

  // Unique Body Proportions based on real-life player archetype & physical strength
  let heightScale = 1.0;
  let buildWidthScale = 1.0;
  if (
    likeness.archetype === 'haaland' ||
    likeness.archetype === 'vandijk' ||
    isGK
  ) {
    heightScale = 1.06;
    buildWidthScale = 1.06;
  } else if (
    likeness.archetype === 'ronaldo' ||
    likeness.archetype === 'bellingham' ||
    likeness.archetype === 'kane' ||
    likeness.archetype === 'benzema'
  ) {
    heightScale = 1.03;
    buildWidthScale = 1.04;
  } else if (
    likeness.archetype === 'messi' ||
    likeness.archetype === 'neymar' ||
    likeness.archetype === 'modric' ||
    likeness.archetype === 'yamal'
  ) {
    heightScale = 0.95;
    buildWidthScale = 0.96;
  } else {
    heightScale = 0.96 + ((player.attributes.physical - 70) / 30) * 0.08;
    buildWidthScale = 0.96 + ((player.attributes.physical - 70) / 30) * 0.07;
  }
  root.scale.set(buildWidthScale, heightScale, buildWidthScale);

  const primaryCol = isGK ? team.gkColor : team.primaryColor;
  const secondaryCol = isGK ? '#090d16' : team.secondaryColor;
  const shortsCol = isGK ? team.gkColor : team.shortsColor;

  const skinMat = new THREE.MeshStandardMaterial({
    color: player.skinTone,
    roughness: 0.48,
    metalness: 0.04,
  });

  const jerseyTex = createJerseyTexture(
    primaryCol,
    secondaryCol,
    player.number,
    player.name,
    isGK
  );
  const jerseyMat = new THREE.MeshStandardMaterial({
    map: jerseyTex,
    roughness: 0.55,
    metalness: 0.05,
  });

  const shortsMat = new THREE.MeshStandardMaterial({
    color: shortsCol,
    roughness: 0.62,
  });

  const sockMat = new THREE.MeshStandardMaterial({
    color: primaryCol,
    roughness: 0.65,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: secondaryCol,
    roughness: 0.5,
  });

  const bootMat = new THREE.MeshStandardMaterial({
    color: player.bootColor || '#10b981',
    roughness: 0.25,
    metalness: 0.35,
  });

  // 1. Torso Group (Pivots at waist/hips y = 1.12)
  const torso = new THREE.Group();
  torso.position.set(0, 1.12, 0);
  root.add(torso);

  // Sculpted Athletic Upper Chest (V-Taper)
  const chestGeo = new THREE.CylinderGeometry(0.245, 0.2, 0.44, 20);
  chestGeo.scale(1.18, 1.0, 0.74);
  const chestMesh = new THREE.Mesh(chestGeo, jerseyMat);
  chestMesh.position.y = 0.28;
  chestMesh.castShadow = true;
  chestMesh.receiveShadow = true;
  torso.add(chestMesh);

  // Lower Torso / Waist Tuck
  const abdomenGeo = new THREE.CylinderGeometry(0.2, 0.195, 0.18, 18);
  abdomenGeo.scale(1.14, 1.0, 0.74);
  const abdomenMesh = new THREE.Mesh(abdomenGeo, jerseyMat);
  abdomenMesh.position.y = 0.02;
  abdomenMesh.castShadow = true;
  torso.add(abdomenMesh);

  // Rounded Deltoid Shoulder Caps
  const shoulderCapGeo = new THREE.SphereGeometry(0.118, 16, 14);
  shoulderCapGeo.scale(1.1, 0.9, 0.95);
  const leftShoulderCap = new THREE.Mesh(shoulderCapGeo, jerseyMat);
  leftShoulderCap.position.set(-0.27, 0.44, 0);
  torso.add(leftShoulderCap);

  const rightShoulderCap = new THREE.Mesh(shoulderCapGeo, jerseyMat);
  rightShoulderCap.position.set(0.27, 0.44, 0);
  torso.add(rightShoulderCap);

  // Kit Collar Ring
  const collarGeo = new THREE.TorusGeometry(0.115, 0.022, 10, 24);
  collarGeo.rotateX(Math.PI / 2);
  const collarMesh = new THREE.Mesh(collarGeo, trimMat);
  collarMesh.position.set(0, 0.5, 0.01);
  torso.add(collarMesh);

  // Athletic Pelvis / Shorts Waistband
  const pelvisGeo = new THREE.CylinderGeometry(0.198, 0.205, 0.2, 18);
  pelvisGeo.scale(1.14, 1.0, 0.78);
  const pelvisMesh = new THREE.Mesh(pelvisGeo, shortsMat);
  pelvisMesh.position.y = -0.12;
  pelvisMesh.castShadow = true;
  torso.add(pelvisMesh);

  // 2. Sculpted 3D Head & Bespoke Facial Likeness Group
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.55, 0);
  torso.add(headGroup);

  // Muscular Neck
  const neckGeo = new THREE.CylinderGeometry(0.082, 0.096, 0.14, 16);
  const neckMesh = new THREE.Mesh(neckGeo, skinMat);
  neckMesh.position.y = 0.04;
  headGroup.add(neckMesh);

  // 3D Face-Mapped Cranium & Jaw Mesh
  const faceTex = createRealistic3DFaceTexture(player);
  const faceMat = new THREE.MeshStandardMaterial({
    map: faceTex,
    roughness: 0.45,
    metalness: 0.04,
  });

  const headGeo = new THREE.SphereGeometry(0.195, 28, 24);
  headGeo.scale(0.93, 1.12, 0.98);
  const headMesh = new THREE.Mesh(headGeo, faceMat);
  // Rotate so U=0.5 of the canvas texture maps directly to the front (+Z) of the head
  headMesh.rotation.y = -Math.PI / 2;
  headMesh.position.y = 0.22;
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // 3D Nose Bridge & Tip (Gives true 3D profile in close-up cameras & celebrations!)
  const noseGeo = new THREE.ConeGeometry(0.028, 0.068, 10);
  noseGeo.rotateX(Math.PI / 2);
  const noseMesh = new THREE.Mesh(noseGeo, skinMat);
  noseMesh.position.set(0, 0.215, 0.192);
  headGroup.add(noseMesh);

  // 3D Ears on Left & Right Sides
  const earGeo = new THREE.SphereGeometry(0.036, 10, 10);
  earGeo.scale(0.45, 1.15, 0.75);
  const leftEar = new THREE.Mesh(earGeo, skinMat);
  leftEar.position.set(-0.182, 0.215, 0.0);
  headGroup.add(leftEar);

  const rightEar = new THREE.Mesh(earGeo, skinMat);
  rightEar.position.set(0.182, 0.215, 0.0);
  headGroup.add(rightEar);

  // Diamond Stud Earrings for Ronaldo, Neymar, Vinícius Jr.
  if (likeness.hasEarring) {
    const studMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      emissive: '#e2e8f0',
      emissiveIntensity: 0.5,
      metalness: 0.9,
      roughness: 0.1,
    });
    const studGeo = new THREE.SphereGeometry(0.013, 8, 8);
    const leftStud = new THREE.Mesh(studGeo, studMat);
    leftStud.position.set(-0.19, 0.182, 0.01);
    headGroup.add(leftStud);

    const rightStud = new THREE.Mesh(studGeo, studMat);
    rightStud.position.set(0.19, 0.182, 0.01);
    headGroup.add(rightStud);
  }

  // 3D Volumetric Beard Geometry for Messi, Salah, Benzema, De Bruyne
  if (likeness.beardStyle === 'full_thick' || likeness.beardStyle === 'full_trimmed') {
    const beardCol = likeness.archetype === 'debruyne' ? '#9a3412' : '#141417';
    const beardMat = new THREE.MeshStandardMaterial({ color: beardCol, roughness: 0.85 });
    const beardGeo = new THREE.SphereGeometry(
      likeness.beardStyle === 'full_thick' ? 0.155 : 0.145,
      18,
      14,
      0,
      Math.PI * 2,
      Math.PI * 0.42,
      Math.PI * 0.58
    );
    beardGeo.scale(1.12, 0.95, 1.18);
    const beardMesh = new THREE.Mesh(beardGeo, beardMat);
    beardMesh.position.set(0, 0.175, 0.025);
    headGroup.add(beardMesh);
  }

  // 3D Player-Specific Sculpted Hairstyles
  const resolvedHairColor =
    likeness.archetype === 'neymar'
      ? '#eab308'
      : likeness.archetype === 'haaland' || likeness.archetype === 'modric'
      ? '#fde047'
      : likeness.archetype === 'debruyne'
      ? '#d97706'
      : player.hairColor || '#111827';

  const hairMat = new THREE.MeshStandardMaterial({
    color: resolvedHairColor,
    roughness: 0.72,
  });

  // Base cranial hair cap (leaves face & forehead open)
  const capGeo = new THREE.SphereGeometry(
    0.198,
    22,
    18,
    0,
    Math.PI * 2,
    0,
    Math.PI * 0.52
  );
  capGeo.scale(0.95, 1.08, 1.0);
  const capMesh = new THREE.Mesh(capGeo, hairMat);
  capMesh.position.set(0, 0.23, -0.015);
  capMesh.rotation.x = -0.22;
  headGroup.add(capMesh);

  if (likeness.hairStyle === 'cr7_quiff') {
    // Cristiano Ronaldo signature sculpted high front quiff + textured crest
    const quiffGeo = new THREE.BoxGeometry(0.18, 0.09, 0.22);
    const quiffMesh = new THREE.Mesh(quiffGeo, hairMat);
    quiffMesh.position.set(0.015, 0.42, 0.045);
    quiffMesh.rotation.set(-0.22, 0.12, -0.08);
    headGroup.add(quiffMesh);

    const waveGeo = new THREE.CapsuleGeometry(0.042, 0.12, 8, 12);
    waveGeo.rotateZ(Math.PI / 2);
    const waveMesh = new THREE.Mesh(waveGeo, hairMat);
    waveMesh.position.set(0.01, 0.44, 0.11);
    headGroup.add(waveMesh);
  } else if (likeness.hairStyle === 'messi_swept') {
    // Lionel Messi side-swept fringe & layered crown
    const sweptGeo = new THREE.CapsuleGeometry(0.048, 0.16, 10, 12);
    sweptGeo.rotateZ(Math.PI / 2);
    const sweptMesh = new THREE.Mesh(sweptGeo, hairMat);
    sweptMesh.position.set(-0.02, 0.415, 0.06);
    sweptMesh.rotation.z = 0.14;
    headGroup.add(sweptMesh);
  } else if (likeness.hairStyle === 'haaland_long_band') {
    // Erling Haaland long blonde hair + rear man-bun + black headband
    const bunGeo = new THREE.SphereGeometry(0.078, 14, 14);
    const bunMesh = new THREE.Mesh(bunGeo, hairMat);
    bunMesh.position.set(0, 0.34, -0.21);
    headGroup.add(bunMesh);

    const bandGeo = new THREE.TorusGeometry(0.186, 0.016, 10, 26);
    bandGeo.rotateX(Math.PI / 2);
    const bandMesh = new THREE.Mesh(
      bandGeo,
      new THREE.MeshStandardMaterial({ color: '#09090b', roughness: 0.4 })
    );
    bandMesh.position.set(0, 0.31, 0);
    bandMesh.rotation.x = 0.16;
    headGroup.add(bandMesh);
  } else if (likeness.hairStyle === 'salah_afro') {
    // Mohamed Salah iconic wide curly afro
    const afroMain = new THREE.Mesh(new THREE.SphereGeometry(0.235, 18, 18), hairMat);
    afroMain.scale.set(1.08, 0.96, 1.05);
    afroMain.position.set(0, 0.33, -0.02);
    headGroup.add(afroMain);
  } else if (likeness.hairStyle === 'neymar_curls' || likeness.hairStyle === 'yamal_curls') {
    // Curly top clusters
    const curlOffsets = [
      [-0.07, 0.42, 0.05],
      [0.0, 0.435, 0.07],
      [0.07, 0.42, 0.05],
      [-0.04, 0.43, -0.02],
      [0.04, 0.43, -0.02],
    ];
    curlOffsets.forEach(([cx, cy, cz]) => {
      const cMesh = new THREE.Mesh(new THREE.SphereGeometry(0.062, 10, 10), hairMat);
      cMesh.position.set(cx, cy, cz);
      headGroup.add(cMesh);
    });
  } else if (likeness.hairStyle === 'vini_twists' || likeness.hairStyle === 'bellingham_taper') {
    // High taper / twist top
    const topGeo = new THREE.CylinderGeometry(0.145, 0.165, 0.085, 16);
    const topMesh = new THREE.Mesh(topGeo, hairMat);
    topMesh.position.set(0, 0.41, 0.01);
    headGroup.add(topMesh);
  } else if (likeness.hairStyle === 'vandijk_bun') {
    const bunMesh = new THREE.Mesh(new THREE.SphereGeometry(0.068, 12, 12), hairMat);
    bunMesh.position.set(0, 0.38, -0.19);
    headGroup.add(bunMesh);
  } else if (likeness.hairStyle === 'modric_locks') {
    const locksGeo = new THREE.CylinderGeometry(0.185, 0.21, 0.22, 16, 1, true, Math.PI * 0.65, Math.PI * 1.7);
    const locksMesh = new THREE.Mesh(locksGeo, hairMat);
    locksMesh.position.set(0, 0.21, -0.02);
    headGroup.add(locksMesh);

    const bandGeo = new THREE.TorusGeometry(0.186, 0.014, 8, 24);
    bandGeo.rotateX(Math.PI / 2);
    const bandMesh = new THREE.Mesh(
      bandGeo,
      new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4 })
    );
    bandMesh.position.set(0, 0.31, 0);
    bandMesh.rotation.x = 0.14;
    headGroup.add(bandMesh);
  }

  // 3. Articulated Left & Right Arms (Shoulder -> Upper Arm -> Elbow -> Forearm -> Hand)
  const gloveMat = new THREE.MeshStandardMaterial({
    color: isGK ? '#f59e0b' : player.skinTone,
    roughness: 0.45,
  });

  const buildRealisticArm = (xOffset: number) => {
    const armGroup = new THREE.Group();
    armGroup.position.set(xOffset, 0.43, 0);
    torso.add(armGroup);

    // Jersey Sleeve
    const sleeveGeo = new THREE.CylinderGeometry(0.082, 0.072, 0.23, 14);
    const sleeveMesh = new THREE.Mesh(sleeveGeo, jerseyMat);
    sleeveMesh.position.y = -0.11;
    sleeveMesh.castShadow = true;
    armGroup.add(sleeveMesh);

    // Sleeve Cuff Trim
    const cuffGeo = new THREE.CylinderGeometry(0.074, 0.073, 0.032, 14);
    const cuffMesh = new THREE.Mesh(cuffGeo, trimMat);
    cuffMesh.position.y = -0.22;
    armGroup.add(cuffMesh);

    // Upper Arm Bicep/Tricep
    const bicepGeo = new THREE.CylinderGeometry(0.066, 0.058, 0.15, 14);
    const bicepMesh = new THREE.Mesh(bicepGeo, skinMat);
    bicepMesh.position.y = -0.28;
    armGroup.add(bicepMesh);

    // Elbow Joint Sphere
    const elbowGeo = new THREE.SphereGeometry(0.056, 12, 12);
    const elbowMesh = new THREE.Mesh(elbowGeo, skinMat);
    elbowMesh.position.y = -0.35;
    armGroup.add(elbowMesh);

    // Forearm Group (pivots at elbow y = -0.35)
    const forearmGroup = new THREE.Group();
    forearmGroup.position.set(0, -0.35, 0);
    armGroup.add(forearmGroup);

    const forearmGeo = new THREE.CylinderGeometry(0.056, 0.044, 0.27, 14);
    const forearmMesh = new THREE.Mesh(forearmGeo, skinMat);
    forearmMesh.position.y = -0.135;
    forearmMesh.castShadow = true;
    forearmGroup.add(forearmMesh);

    // Wrist Tape
    const tapeGeo = new THREE.CylinderGeometry(0.046, 0.045, 0.035, 12);
    const tapeMesh = new THREE.Mesh(
      tapeGeo,
      new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4 })
    );
    tapeMesh.position.y = -0.255;
    forearmGroup.add(tapeMesh);

    // Hand / Goalkeeper Glove
    const handGeo = new THREE.SphereGeometry(isGK ? 0.072 : 0.05, 12, 12);
    handGeo.scale(0.85, 1.25, 0.65);
    const handMesh = new THREE.Mesh(handGeo, gloveMat);
    handMesh.position.y = -0.3;
    forearmGroup.add(handMesh);

    return { armGroup, forearmGroup };
  };

  const leftArmBuilt = buildRealisticArm(-0.31);
  const rightArmBuilt = buildRealisticArm(0.31);

  // 4. Articulated Left & Right Legs (Hip -> Shorts -> Muscular Quad -> Knee -> Shinguard Sock -> Boot)
  const buildRealisticLeg = (xOffset: number) => {
    const hipGroup = new THREE.Group();
    hipGroup.position.set(xOffset, 0.96, 0);
    root.add(hipGroup);

    // Shorts Leg
    const shortsLegGeo = new THREE.CylinderGeometry(0.112, 0.098, 0.27, 16);
    const shortsLegMesh = new THREE.Mesh(shortsLegGeo, shortsMat);
    shortsLegMesh.position.y = -0.13;
    shortsLegMesh.castShadow = true;
    hipGroup.add(shortsLegMesh);

    // Shorts Hem Trim
    const shortsHemGeo = new THREE.CylinderGeometry(0.1, 0.099, 0.028, 16);
    const shortsHemMesh = new THREE.Mesh(shortsHemGeo, trimMat);
    shortsHemMesh.position.y = -0.255;
    hipGroup.add(shortsHemMesh);

    // Muscular Thigh (Quadriceps & Hamstring)
    const thighGeo = new THREE.CylinderGeometry(0.09, 0.074, 0.2, 16);
    const thighMesh = new THREE.Mesh(thighGeo, skinMat);
    thighMesh.position.y = -0.33;
    thighMesh.castShadow = true;
    hipGroup.add(thighMesh);

    // Sculpted Knee Cap Joint
    const kneeCapGeo = new THREE.SphereGeometry(0.072, 14, 14);
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
    headerTimer: 0,
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
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 512, 512);

  // Geometric thermally-bonded match ball panels
  ctx.fillStyle = '#090d16';
  const patches = [
    [128, 128],
    [384, 128],
    [256, 256],
    [128, 384],
    [384, 384],
    [256, 64],
    [256, 448],
  ];
  patches.forEach(([px, py]) => {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
      const rx = px + Math.cos(angle) * 44;
      const ry = py + Math.sin(angle) * 44;
      if (i === 0) ctx.moveTo(rx, ry);
      else ctx.lineTo(rx, ry);
    }
    ctx.closePath();
    ctx.fill();
  });

  // Gold & Emerald World Cup accents
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(0, 192);
  ctx.lineTo(512, 320);
  ctx.stroke();

  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(0, 256);
  ctx.lineTo(512, 256);
  ctx.stroke();

  const ballTex = new THREE.CanvasTexture(canvas);
  const ballGeo = new THREE.SphereGeometry(0.36, 28, 28);
  const ballMat = new THREE.MeshStandardMaterial({
    map: ballTex,
    roughness: 0.24,
    metalness: 0.14,
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
