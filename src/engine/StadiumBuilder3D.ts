import * as THREE from 'three';
import { StadiumInfo, WeatherType } from '../data/gameDatabase';

export const PITCH_WIDTH = 105; // X axis (-52.5 to +52.5)
export const PITCH_DEPTH = 68;  // Z axis (-34 to +34)
export const GOAL_WIDTH = 11.2;
export const GOAL_HEIGHT = 3.8;
export const GOAL_DEPTH = 2.8;

export interface StadiumSceneObjects {
  crowdMesh: THREE.InstancedMesh;
  crowdCount: number;
  crowdBasePositions: Float32Array;
  crowdColors: Float32Array;
  rainSystem: THREE.Points | null;
  confettiSystem: THREE.Points;
  confettiVelocities: Float32Array;
  leftNetMesh: THREE.Mesh;
  rightNetMesh: THREE.Mesh;
  aimArrowGroup: THREE.Group;
  curveArcLine: THREE.Line;
  practiceTargetGroup: THREE.Group;
}

export function buildStadiumScene(
  scene: THREE.Scene,
  stadium: StadiumInfo,
  weather: WeatherType,
  graphicsQuality: 'Low' | 'Medium' | 'High' | 'Ultra'
): StadiumSceneObjects {
  // 1. Sky & Atmospheric Fog
  const isNight = weather === 'Night' || stadium.id === 'night' || stadium.id === 'final';
  const isRain = weather === 'Rain' || stadium.id === 'rain';
  const isCloudy = weather === 'Cloudy';

  const skyColor = isNight
    ? 0x050811
    : isRain
    ? 0x16202c
    : isCloudy
    ? 0x283546
    : 0x0d1b2a;

  scene.background = new THREE.Color(skyColor);
  scene.fog = new THREE.FogExp2(skyColor, isRain ? 0.0048 : isNight ? 0.0032 : 0.0025);

  // 2. Three-Point + Stadium Floodlight Rig
  const ambientIntensity = isNight ? 0.55 : isRain ? 0.65 : 0.85;
  const ambientLight = new THREE.AmbientLight(isNight ? 0xcbd5e1 : 0xf8fafc, ambientIntensity);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(isNight ? 0xe2e8f0 : 0xfffbeb, isNight ? 1.35 : 1.55);
  sunLight.position.set(35, 65, 42);
  if (graphicsQuality !== 'Low') {
    sunLight.castShadow = true;
    const mapSize = graphicsQuality === 'Ultra' ? 2048 : graphicsQuality === 'High' ? 1024 : 512;
    sunLight.shadow.mapSize.width = mapSize;
    sunLight.shadow.mapSize.height = mapSize;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 160;
    const d = 65;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
  }
  scene.add(sunLight);

  const rimLight = new THREE.DirectionalLight(stadium.accentColor, 0.45);
  rimLight.position.set(-40, 35, -45);
  scene.add(rimLight);

  // 3. Procedural Striped Turf Pitch Canvas Texture
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  const stripeCount = 18;
  const stripeW = canvas.width / stripeCount;
  for (let i = 0; i < stripeCount; i++) {
    ctx.fillStyle = i % 2 === 0 ? stadium.turfPrimary : stadium.turfSecondary;
    ctx.fillRect(i * stripeW, 0, stripeW, canvas.height);
  }

  // Subtle turf grain
  ctx.fillStyle = 'rgba(255,255,255,0.02)';
  for (let i = 0; i < 1200; i++) {
    ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 3, 3);
  }

  // Crisp White Pitch Markings
  const mX = 80;
  const mY = 60;
  const pW = canvas.width - mX * 2;
  const pH = canvas.height - mY * 2;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 6;
  ctx.strokeRect(mX, mY, pW, pH);

  // Halfway line & Center circle
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, mY);
  ctx.lineTo(canvas.width / 2, canvas.height - mY);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, 115, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, 8, 0, Math.PI * 2);
  ctx.fill();

  // Left & Right Penalty Boxes
  const boxW = 285;
  const boxH = 520;
  const sixW = 105;
  const sixH = 260;

  // Left Box
  ctx.strokeRect(mX, (canvas.height - boxH) / 2, boxW, boxH);
  ctx.strokeRect(mX, (canvas.height - sixH) / 2, sixW, sixH);
  ctx.beginPath();
  ctx.arc(mX + 205, canvas.height / 2, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(mX + 205, canvas.height / 2, 95, -0.65, 0.65);
  ctx.stroke();

  // Right Box
  ctx.strokeRect(canvas.width - mX - boxW, (canvas.height - boxH) / 2, boxW, boxH);
  ctx.strokeRect(canvas.width - mX - sixW, (canvas.height - sixH) / 2, sixW, sixH);
  ctx.beginPath();
  ctx.arc(canvas.width - mX - 205, canvas.height / 2, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(canvas.width - mX - 205, canvas.height / 2, 95, Math.PI - 0.65, Math.PI + 0.65);
  ctx.stroke();

  const pitchTex = new THREE.CanvasTexture(canvas);
  pitchTex.anisotropy = 4;

  const pitchGeo = new THREE.PlaneGeometry(PITCH_WIDTH + 10, PITCH_DEPTH + 9);
  const pitchMat = new THREE.MeshStandardMaterial({
    map: pitchTex,
    roughness: isRain ? 0.35 : 0.78,
    metalness: isRain ? 0.15 : 0.02,
  });
  const pitchMesh = new THREE.Mesh(pitchGeo, pitchMat);
  pitchMesh.rotation.x = -Math.PI / 2;
  pitchMesh.receiveShadow = true;
  scene.add(pitchMesh);

  // Outer Stadium Track / Apron
  const apronGeo = new THREE.PlaneGeometry(PITCH_WIDTH + 48, PITCH_DEPTH + 44);
  const apronMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
  const apronMesh = new THREE.Mesh(apronGeo, apronMat);
  apronMesh.rotation.x = -Math.PI / 2;
  apronMesh.position.y = -0.04;
  scene.add(apronMesh);

  // 4. Goals & Deformable Goal Nets
  const createGoal = (side: -1 | 1): THREE.Mesh => {
    const goalGroup = new THREE.Group();
    const postMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.5, roughness: 0.2 });
    const postGeo = new THREE.CylinderGeometry(0.12, 0.12, GOAL_HEIGHT, 12);

    const leftPost = new THREE.Mesh(postGeo, postMat);
    leftPost.position.set(0, GOAL_HEIGHT / 2, -GOAL_WIDTH / 2);
    goalGroup.add(leftPost);

    const rightPost = new THREE.Mesh(postGeo, postMat);
    rightPost.position.set(0, GOAL_HEIGHT / 2, GOAL_WIDTH / 2);
    goalGroup.add(rightPost);

    const crossbarGeo = new THREE.CylinderGeometry(0.12, 0.12, GOAL_WIDTH + 0.24, 12);
    const crossbar = new THREE.Mesh(crossbarGeo, postMat);
    crossbar.rotation.x = Math.PI / 2;
    crossbar.position.set(0, GOAL_HEIGHT, 0);
    goalGroup.add(crossbar);

    // Goal Net Box
    const netGeo = new THREE.BoxGeometry(GOAL_DEPTH, GOAL_HEIGHT, GOAL_WIDTH, 4, 4, 8);
    const netMat = new THREE.MeshBasicMaterial({
      color: 0xe2e8f0,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const netMesh = new THREE.Mesh(netGeo, netMat);
    netMesh.position.set((side * GOAL_DEPTH) / 2, GOAL_HEIGHT / 2, 0);
    goalGroup.add(netMesh);

    goalGroup.position.set(side * (PITCH_WIDTH / 2), 0, 0);
    scene.add(goalGroup);
    return netMesh;
  };

  const leftNetMesh = createGoal(-1);
  const rightNetMesh = createGoal(1);

  // 5. LED Perimeter Advertising Boards & Dugouts
  const boardMat = new THREE.MeshStandardMaterial({
    color: 0x090d16,
    emissive: new THREE.Color(stadium.accentColor),
    emissiveIntensity: 0.22,
    roughness: 0.4,
  });
  const northBoard = new THREE.Mesh(new THREE.BoxGeometry(PITCH_WIDTH + 6, 1.1, 0.4), boardMat);
  northBoard.position.set(0, 0.55, -(PITCH_DEPTH / 2 + 3.2));
  scene.add(northBoard);

  const southBoard = new THREE.Mesh(new THREE.BoxGeometry(PITCH_WIDTH + 6, 1.1, 0.4), boardMat);
  southBoard.position.set(0, 0.55, PITCH_DEPTH / 2 + 3.2);
  scene.add(southBoard);

  // 6. Multi-Tier Stadium Stands & Floodlight Towers
  const standMat = new THREE.MeshStandardMaterial({ color: stadium.standColor, roughness: 0.85 });
  const createStand = (w: number, h: number, d: number, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), standMat);
    mesh.position.set(x, y, z);
    scene.add(mesh);
  };

  // North & South Grandstands
  createStand(PITCH_WIDTH + 34, 16, 18, 0, 8, -(PITCH_DEPTH / 2 + 15));
  createStand(PITCH_WIDTH + 34, 16, 18, 0, 8, PITCH_DEPTH / 2 + 15);
  // West & East Goal Stands
  createStand(18, 16, PITCH_DEPTH + 24, -(PITCH_WIDTH / 2 + 16), 8, 0);
  createStand(18, 16, PITCH_DEPTH + 24, PITCH_WIDTH / 2 + 16, 8, 0);

  // 4 Corner Floodlight Towers
  const towerPositions = [
    [-(PITCH_WIDTH / 2 + 18), -(PITCH_DEPTH / 2 + 16)],
    [PITCH_WIDTH / 2 + 18, -(PITCH_DEPTH / 2 + 16)],
    [-(PITCH_WIDTH / 2 + 18), PITCH_DEPTH / 2 + 16],
    [PITCH_WIDTH / 2 + 18, PITCH_DEPTH / 2 + 16],
  ];
  const pylonMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6 });
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });

  towerPositions.forEach(([tx, tz]) => {
    const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.1, 34, 8), pylonMat);
    pylon.position.set(tx, 17, tz);
    scene.add(pylon);

    const head = new THREE.Mesh(new THREE.BoxGeometry(5.5, 3.2, 1.2), lampMat);
    head.position.set(tx, 34, tz);
    head.lookAt(0, 0, 0);
    scene.add(head);
  });

  // 7. Animated Instanced Stadium Crowd
  const crowdCount = graphicsQuality === 'Ultra' ? 2400 : graphicsQuality === 'High' ? 1600 : graphicsQuality === 'Medium' ? 900 : 450;
  const fanGeo = new THREE.BoxGeometry(0.55, 0.95, 0.55);
  const fanMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const crowdMesh = new THREE.InstancedMesh(fanGeo, fanMat, crowdCount);
  const crowdBasePositions = new Float32Array(crowdCount * 3);
  const crowdColors = new Float32Array(crowdCount * 3);

  const palette = [
    new THREE.Color(stadium.accentColor),
    new THREE.Color('#f8fafc'),
    new THREE.Color('#38bdf8'),
    new THREE.Color('#facc15'),
    new THREE.Color('#ef4444'),
  ];

  const dummy = new THREE.Object3D();
  for (let i = 0; i < crowdCount; i++) {
    const section = i % 4;
    let fx = 0;
    let fy = 3 + Math.random() * 11;
    let fz = 0;
    const rowDepth = (fy - 3) * 0.9;

    if (section === 0) {
      fx = (Math.random() - 0.5) * (PITCH_WIDTH + 18);
      fz = -(PITCH_DEPTH / 2 + 7.5 + rowDepth);
    } else if (section === 1) {
      fx = (Math.random() - 0.5) * (PITCH_WIDTH + 18);
      fz = PITCH_DEPTH / 2 + 7.5 + rowDepth;
    } else if (section === 2) {
      fx = -(PITCH_WIDTH / 2 + 8.5 + rowDepth);
      fz = (Math.random() - 0.5) * (PITCH_DEPTH + 10);
    } else {
      fx = PITCH_WIDTH / 2 + 8.5 + rowDepth;
      fz = (Math.random() - 0.5) * (PITCH_DEPTH + 10);
    }

    crowdBasePositions[i * 3] = fx;
    crowdBasePositions[i * 3 + 1] = fy;
    crowdBasePositions[i * 3 + 2] = fz;

    dummy.position.set(fx, fy, fz);
    dummy.updateMatrix();
    crowdMesh.setMatrixAt(i, dummy.matrix);

    const c = palette[i % palette.length];
    crowdMesh.setColorAt(i, c);
    crowdColors[i * 3] = c.r;
    crowdColors[i * 3 + 1] = c.g;
    crowdColors[i * 3 + 2] = c.b;
  }
  crowdMesh.instanceMatrix.needsUpdate = true;
  if (crowdMesh.instanceColor) crowdMesh.instanceColor.needsUpdate = true;
  scene.add(crowdMesh);

  // 8. Optional Rain Particle System
  let rainSystem: THREE.Points | null = null;
  if (isRain) {
    const rainCount = graphicsQuality === 'Low' ? 600 : 1800;
    const rainGeo = new THREE.BufferGeometry();
    const rainPos = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      rainPos[i * 3] = (Math.random() - 0.5) * 130;
      rainPos[i * 3 + 1] = Math.random() * 35;
      rainPos[i * 3 + 2] = (Math.random() - 0.5) * 90;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.28,
      transparent: true,
      opacity: 0.55,
    });
    rainSystem = new THREE.Points(rainGeo, rainMat);
    scene.add(rainSystem);
  }

  // 9. Goal Confetti & Fireworks Particle System
  const confettiCount = 500;
  const confettiGeo = new THREE.BufferGeometry();
  const confettiPos = new Float32Array(confettiCount * 3);
  const confettiColors = new Float32Array(confettiCount * 3);
  const confettiVelocities = new Float32Array(confettiCount * 3);

  for (let i = 0; i < confettiCount; i++) {
    confettiPos[i * 3] = 0;
    confettiPos[i * 3 + 1] = -20; // Hidden below pitch until goal
    confettiPos[i * 3 + 2] = 0;
    const col = palette[i % palette.length];
    confettiColors[i * 3] = col.r;
    confettiColors[i * 3 + 1] = col.g;
    confettiColors[i * 3 + 2] = col.b;
  }
  confettiGeo.setAttribute('position', new THREE.BufferAttribute(confettiPos, 3));
  confettiGeo.setAttribute('color', new THREE.BufferAttribute(confettiColors, 3));
  const confettiMat = new THREE.PointsMaterial({
    size: 0.48,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
  });
  const confettiSystem = new THREE.Points(confettiGeo, confettiMat);
  scene.add(confettiSystem);

  // 10. 3D Mouse/Directional Aim Reticle & Curve Trajectory Line
  const aimArrowGroup = new THREE.Group();
  const ringGeo = new THREE.RingGeometry(0.85, 1.15, 28);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x10b981,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.75,
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.rotation.x = -Math.PI / 2;
  ringMesh.position.y = 0.06;
  aimArrowGroup.add(ringMesh);
  scene.add(aimArrowGroup);

  const arcPoints: THREE.Vector3[] = [];
  for (let i = 0; i < 24; i++) {
    arcPoints.push(new THREE.Vector3(0, -10, 0));
  }
  const arcGeo = new THREE.BufferGeometry().setFromPoints(arcPoints);
  const arcMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.85 });
  const curveArcLine = new THREE.Line(arcGeo, arcMat);
  scene.add(curveArcLine);

  // 11. Practice & Skill Challenge Target Rings
  const practiceTargetGroup = new THREE.Group();
  scene.add(practiceTargetGroup);

  return {
    crowdMesh,
    crowdCount,
    crowdBasePositions,
    crowdColors,
    rainSystem,
    confettiSystem,
    confettiVelocities,
    leftNetMesh,
    rightNetMesh,
    aimArrowGroup,
    curveArcLine,
    practiceTargetGroup,
  };
}
