import { PLAYERS_10000_DB } from './players10000Database';
export type PlayerRarity = 'Common' | 'Rare' | 'Elite' | 'World Class' | 'Legendary' | 'Special Edition';
export type PositionCode = 'ST' | 'CF' | 'LW' | 'RW' | 'LM' | 'RM' | 'CAM' | 'CM' | 'CDM' | 'LB' | 'CB' | 'RB' | 'GK';

export const ALL_SQUAD_POSITIONS: PositionCode[] = [
  'GK',
  'LB',
  'CB',
  'RB',
  'CDM',
  'CM',
  'CAM',
  'LM',
  'RM',
  'LW',
  'RW',
  'CF',
  'ST',
];

export interface PlayerAttributes {
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  stamina: number;
  skill: number;
  curve: number;
  reactions: number;
  weakFoot?: number;
  skillMoves?: number;
}

export interface FootballPlayer {
  id: string;
  name: string;
  nationality: string;
  club: string;
  position: PositionCode;
  rating: number;
  rarity: PlayerRarity;
  price: number;
  attributes: PlayerAttributes;
  number: number;
  skinTone: string;
  hairColor: string;
  bootColor: string;
  celebration: CelebrationType;
  initialUnlocked?: boolean;
  photoUrl?: string;
}

export type FormationName =
  | '4-3-3'
  | '4-4-2'
  | '4-2-3-1'
  | '3-5-2'
  | '3-4-3'
  | '4-1-4-1'
  | '5-3-2'
  | '5-4-1';

export interface FormationSlot {
  role: PositionCode;
  label: string;
  x: number;
  z: number;
}

export const FORMATIONS: Record<FormationName, FormationSlot[]> = {
  '4-3-3': [
    { role: 'GK', label: 'GK', x: -0.92, z: 0.0 },
    { role: 'LB', label: 'LB', x: -0.68, z: -0.65 },
    { role: 'CB', label: 'LCB', x: -0.72, z: -0.24 },
    { role: 'CB', label: 'RCB', x: -0.72, z: 0.24 },
    { role: 'RB', label: 'RB', x: -0.68, z: 0.65 },
    { role: 'CDM', label: 'CDM', x: -0.46, z: 0.0 },
    { role: 'CM', label: 'LCM', x: -0.36, z: -0.38 },
    { role: 'CM', label: 'RCM', x: -0.36, z: 0.38 },
    { role: 'LW', label: 'LW', x: -0.14, z: -0.62 },
    { role: 'ST', label: 'ST', x: -0.08, z: 0.0 },
    { role: 'RW', label: 'RW', x: -0.14, z: 0.62 },
  ],
  '4-4-2': [
    { role: 'GK', label: 'GK', x: -0.92, z: 0.0 },
    { role: 'LB', label: 'LB', x: -0.68, z: -0.65 },
    { role: 'CB', label: 'LCB', x: -0.72, z: -0.24 },
    { role: 'CB', label: 'RCB', x: -0.72, z: 0.24 },
    { role: 'RB', label: 'RB', x: -0.68, z: 0.65 },
    { role: 'LM', label: 'LM', x: -0.38, z: -0.62 },
    { role: 'CM', label: 'LCM', x: -0.42, z: -0.22 },
    { role: 'CM', label: 'RCM', x: -0.42, z: 0.22 },
    { role: 'RM', label: 'RM', x: -0.38, z: 0.62 },
    { role: 'CF', label: 'CF', x: -0.12, z: -0.22 },
    { role: 'ST', label: 'ST', x: -0.1, z: 0.22 },
  ],
  '4-2-3-1': [
    { role: 'GK', label: 'GK', x: -0.92, z: 0.0 },
    { role: 'LB', label: 'LB', x: -0.68, z: -0.65 },
    { role: 'CB', label: 'LCB', x: -0.72, z: -0.24 },
    { role: 'CB', label: 'RCB', x: -0.72, z: 0.24 },
    { role: 'RB', label: 'RB', x: -0.68, z: 0.65 },
    { role: 'CDM', label: 'LCDM', x: -0.5, z: -0.26 },
    { role: 'CDM', label: 'RCDM', x: -0.5, z: 0.26 },
    { role: 'LW', label: 'LAM', x: -0.26, z: -0.55 },
    { role: 'CAM', label: 'CAM', x: -0.24, z: 0.0 },
    { role: 'RW', label: 'RAM', x: -0.26, z: 0.55 },
    { role: 'ST', label: 'ST', x: -0.08, z: 0.0 },
  ],
  '3-5-2': [
    { role: 'GK', label: 'GK', x: -0.92, z: 0.0 },
    { role: 'CB', label: 'LCB', x: -0.72, z: -0.45 },
    { role: 'CB', label: 'CCB', x: -0.75, z: 0.0 },
    { role: 'CB', label: 'RCB', x: -0.72, z: 0.45 },
    { role: 'LM', label: 'LM', x: -0.42, z: -0.68 },
    { role: 'CDM', label: 'CDM', x: -0.5, z: 0.0 },
    { role: 'CM', label: 'LCM', x: -0.36, z: -0.3 },
    { role: 'CM', label: 'RCM', x: -0.36, z: 0.3 },
    { role: 'RM', label: 'RM', x: -0.42, z: 0.68 },
    { role: 'CF', label: 'CF', x: -0.12, z: -0.24 },
    { role: 'ST', label: 'ST', x: -0.1, z: 0.24 },
  ],
  '3-4-3': [
    { role: 'GK', label: 'GK', x: -0.92, z: 0.0 },
    { role: 'CB', label: 'LCB', x: -0.72, z: -0.45 },
    { role: 'CB', label: 'CCB', x: -0.75, z: 0.0 },
    { role: 'CB', label: 'RCB', x: -0.72, z: 0.45 },
    { role: 'LM', label: 'LM', x: -0.42, z: -0.65 },
    { role: 'CM', label: 'LCM', x: -0.44, z: -0.22 },
    { role: 'CM', label: 'RCM', x: -0.44, z: 0.22 },
    { role: 'RM', label: 'RM', x: -0.42, z: 0.65 },
    { role: 'LW', label: 'LW', x: -0.14, z: -0.58 },
    { role: 'ST', label: 'ST', x: -0.08, z: 0.0 },
    { role: 'RW', label: 'RW', x: -0.14, z: 0.58 },
  ],
  '4-1-4-1': [
    { role: 'GK', label: 'GK', x: -0.92, z: 0.0 },
    { role: 'LB', label: 'LB', x: -0.68, z: -0.65 },
    { role: 'CB', label: 'LCB', x: -0.72, z: -0.24 },
    { role: 'CB', label: 'RCB', x: -0.72, z: 0.24 },
    { role: 'RB', label: 'RB', x: -0.68, z: 0.65 },
    { role: 'CDM', label: 'CDM', x: -0.52, z: 0.0 },
    { role: 'LM', label: 'LM', x: -0.32, z: -0.62 },
    { role: 'CM', label: 'LCM', x: -0.34, z: -0.22 },
    { role: 'CM', label: 'RCM', x: -0.34, z: 0.22 },
    { role: 'RM', label: 'RM', x: -0.32, z: 0.62 },
    { role: 'ST', label: 'ST', x: -0.08, z: 0.0 },
  ],
  '5-3-2': [
    { role: 'GK', label: 'GK', x: -0.92, z: 0.0 },
    { role: 'LB', label: 'LWB', x: -0.6, z: -0.68 },
    { role: 'CB', label: 'LCB', x: -0.72, z: -0.38 },
    { role: 'CB', label: 'CCB', x: -0.75, z: 0.0 },
    { role: 'CB', label: 'RCB', x: -0.72, z: 0.38 },
    { role: 'RB', label: 'RWB', x: -0.6, z: 0.68 },
    { role: 'CM', label: 'LCM', x: -0.38, z: -0.35 },
    { role: 'CDM', label: 'CDM', x: -0.44, z: 0.0 },
    { role: 'CM', label: 'RCM', x: -0.38, z: 0.35 },
    { role: 'CF', label: 'CF', x: -0.12, z: -0.22 },
    { role: 'ST', label: 'ST', x: -0.1, z: 0.22 },
  ],
  '5-4-1': [
    { role: 'GK', label: 'GK', x: -0.92, z: 0.0 },
    { role: 'LB', label: 'LWB', x: -0.62, z: -0.68 },
    { role: 'CB', label: 'LCB', x: -0.72, z: -0.38 },
    { role: 'CB', label: 'CCB', x: -0.75, z: 0.0 },
    { role: 'CB', label: 'RCB', x: -0.72, z: 0.38 },
    { role: 'RB', label: 'RWB', x: -0.62, z: 0.68 },
    { role: 'LM', label: 'LM', x: -0.36, z: -0.6 },
    { role: 'CM', label: 'LCM', x: -0.4, z: -0.2 },
    { role: 'CM', label: 'RCM', x: -0.4, z: 0.2 },
    { role: 'RM', label: 'RM', x: -0.36, z: 0.6 },
    { role: 'ST', label: 'ST', x: -0.08, z: 0.0 },
  ],
};

export function normalizeSlotPosition(slotRole: PositionCode, slotLabel: string): PositionCode {
  const lbl = slotLabel.toUpperCase();
  if (lbl === 'GK') return 'GK';
  if (lbl === 'LB' || lbl === 'LWB') return 'LB';
  if (lbl === 'RB' || lbl === 'RWB') return 'RB';
  if (lbl === 'CB' || lbl === 'LCB' || lbl === 'CCB' || lbl === 'RCB') return 'CB';
  if (lbl === 'CDM' || lbl === 'LCDM' || lbl === 'RCDM') return 'CDM';
  if (lbl === 'CM' || lbl === 'LCM' || lbl === 'RCM') return 'CM';
  if (lbl === 'CAM') return 'CAM';
  if (lbl === 'LAM') return 'LW';
  if (lbl === 'RAM') return 'RW';
  if (lbl === 'LM') return 'LM';
  if (lbl === 'RM') return 'RM';
  if (lbl === 'LW') return 'LW';
  if (lbl === 'RW') return 'RW';
  if (lbl === 'CF') return 'CF';
  if (lbl === 'ST' || lbl === 'LST' || lbl === 'RST') return 'ST';
  return slotRole;
}

export function getCompatiblePositionsForSlot(
  slotRole: PositionCode,
  slotLabel: string
): { exact: PositionCode[]; compatible: PositionCode[] } {
  const canonical = normalizeSlotPosition(slotRole, slotLabel);
  switch (canonical) {
    case 'GK':
      return { exact: ['GK'], compatible: ['GK'] };
    case 'LB':
      return { exact: ['LB'], compatible: ['LM', 'CB', 'LW'] };
    case 'RB':
      return { exact: ['RB'], compatible: ['RM', 'CB', 'RW'] };
    case 'CB':
      return { exact: ['CB'], compatible: ['CDM', 'LB', 'RB'] };
    case 'CDM':
      return { exact: ['CDM'], compatible: ['CM', 'CB'] };
    case 'CM':
      return { exact: ['CM'], compatible: ['CDM', 'CAM', 'LM', 'RM'] };
    case 'CAM':
      return { exact: ['CAM'], compatible: ['CF', 'CM', 'LW', 'RW', 'LM', 'RM'] };
    case 'LM':
      return { exact: ['LM'], compatible: ['LW', 'LB', 'CM', 'CAM'] };
    case 'RM':
      return { exact: ['RM'], compatible: ['RW', 'RB', 'CM', 'CAM'] };
    case 'LW':
      return { exact: ['LW'], compatible: ['LM', 'ST', 'CF', 'CAM', 'RW'] };
    case 'RW':
      return { exact: ['RW'], compatible: ['RM', 'ST', 'CF', 'CAM', 'LW'] };
    case 'CF':
      return { exact: ['CF'], compatible: ['ST', 'CAM', 'LW', 'RW'] };
    case 'ST':
    default:
      return { exact: ['ST'], compatible: ['CF', 'LW', 'RW', 'CAM'] };
  }
}

export function getPlayerSlotFitLevel(
  playerPos: PositionCode,
  slotRole: PositionCode,
  slotLabel: string
): 'exact' | 'compatible' | 'out_of_position' {
  const { exact, compatible } = getCompatiblePositionsForSlot(slotRole, slotLabel);
  if (exact.includes(playerPos)) return 'exact';
  if (compatible.includes(playerPos)) return 'compatible';
  return 'out_of_position';
}

export function findBestSlotIndexForPlayer(
  player: FootballPlayer,
  formation: FormationName,
  currentSquad: FootballPlayer[]
): number {
  const slots = FORMATIONS[formation] || FORMATIONS['4-3-3'];
  const exactIndices: number[] = [];
  const compatibleIndices: number[] = [];

  slots.forEach((slot, idx) => {
    const fit = getPlayerSlotFitLevel(player.position, slot.role, slot.label);
    if (fit === 'exact') exactIndices.push(idx);
    else if (fit === 'compatible') compatibleIndices.push(idx);
  });

  const pickBestTargetFromCandidates = (indices: number[]): number => {
    if (indices.length === 1) return indices[0];

    // Priority 1: Replace an empty slot
    for (const idx of indices) {
      if (!currentSquad[idx]) return idx;
    }

    // Priority 2: Replace an out-of-position player
    for (const idx of indices) {
      const occupant = currentSquad[idx];
      const fit = getPlayerSlotFitLevel(occupant.position, slots[idx].role, slots[idx].label);
      if (fit === 'out_of_position') return idx;
    }

    // Priority 3: Replace a secondary / compatible player
    for (const idx of indices) {
      const occupant = currentSquad[idx];
      const fit = getPlayerSlotFitLevel(occupant.position, slots[idx].role, slots[idx].label);
      if (fit === 'compatible') return idx;
    }

    // Priority 4: Replace the lowest rated player in this position
    let lowestRating = Infinity;
    let targetIdx = indices[0];
    for (const idx of indices) {
      const occupant = currentSquad[idx];
      if (occupant.rating < lowestRating) {
        lowestRating = occupant.rating;
        targetIdx = idx;
      }
    }
    return targetIdx;
  };

  if (exactIndices.length > 0) {
    return pickBestTargetFromCandidates(exactIndices);
  }
  if (compatibleIndices.length > 0) {
    return pickBestTargetFromCandidates(compatibleIndices);
  }

  // Fallbacks by role category
  if (player.position === 'GK') return 0;
  if (['CB', 'LB', 'RB'].includes(player.position)) return 2;
  if (['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(player.position)) return 6;
  return 9;
}

export function buildOptimalSquadForFormation(
  unlockedPlayers: FootballPlayer[],
  currentSquad: FootballPlayer[],
  formation: FormationName
): FootballPlayer[] {
  const slots = FORMATIONS[formation];
  const pool = [...unlockedPlayers];
  // Ensure any player currently in currentSquad is also in pool
  currentSquad.forEach((p) => {
    if (p && !pool.some((x) => x.id === p.id)) {
      pool.push(p);
    }
  });

  const usedIds = new Set<string>();
  const startingXI: FootballPlayer[] = new Array(11);

  // Pass 1: Fill each slot with highest-rated exact position match
  slots.forEach((slot, idx) => {
    const candidates = pool
      .filter(
        (p) =>
          !usedIds.has(p.id) &&
          getPlayerSlotFitLevel(p.position, slot.role, slot.label) === 'exact'
      )
      .sort((a, b) => b.rating - a.rating);
    if (candidates.length > 0) {
      startingXI[idx] = candidates[0];
      usedIds.add(candidates[0].id);
    }
  });

  // Pass 2: Fill remaining slots with highest-rated compatible position match
  slots.forEach((slot, idx) => {
    if (startingXI[idx]) return;
    const candidates = pool
      .filter(
        (p) =>
          !usedIds.has(p.id) &&
          getPlayerSlotFitLevel(p.position, slot.role, slot.label) === 'compatible'
      )
      .sort((a, b) => b.rating - a.rating);
    if (candidates.length > 0) {
      startingXI[idx] = candidates[0];
      usedIds.add(candidates[0].id);
    }
  });

  // Pass 3: Fill any still-empty slots with highest-rated remaining players
  slots.forEach((_, idx) => {
    if (startingXI[idx]) return;
    const remaining = pool.filter((p) => !usedIds.has(p.id)).sort((a, b) => b.rating - a.rating);
    if (remaining.length > 0) {
      startingXI[idx] = remaining[0];
      usedIds.add(remaining[0].id);
    }
  });

  // Append all unused unlocked players as reserves so no player is ever lost
  const reserves = pool.filter((p) => !usedIds.has(p.id)).sort((a, b) => b.rating - a.rating);
  return [...startingXI.filter(Boolean), ...reserves];
}

export type CelebrationType =
  | 'Knee Slide Surge'
  | 'Aeroplane Glide'
  | 'Skyward Point'
  | 'Acrobatic Flip'
  | 'Captain Salute'
  | 'Team Huddle Roar';

export const CELEBRATIONS: { id: CelebrationType; name: string; description: string }[] = [
  { id: 'Knee Slide Surge', name: 'Knee Slide Surge', description: 'High-speed turf knee slide toward the corner flag with fist pump.' },
  { id: 'Aeroplane Glide', name: 'Aeroplane Glide', description: 'Sprint across the touchline with arms outstretched as teammates chase.' },
  { id: 'Skyward Point', name: 'Skyward Point', description: 'Composed two-handed tribute to the upper stadium tiers.' },
  { id: 'Acrobatic Flip', name: 'Acrobatic Flip', description: 'Explosive somersault leap followed by a champion landing.' },
  { id: 'Captain Salute', name: 'Captain Salute', description: 'Commanding chest tap and salute in front of the ultra stands.' },
  { id: 'Team Huddle Roar', name: 'Team Huddle Roar', description: 'Gather nearby outfield teammates for a synchronized victory roar.' },
];

export type SkillMoveName =
  | 'Step-over'
  | 'Body Feint'
  | 'Ball Roll'
  | 'Roulette'
  | 'Drag Back'
  | 'Flick'
  | 'Fake Shot'
  | 'Heel-to-Heel'
  | 'Rainbow Flick'
  | 'Elastico';

export const SKILL_MOVES: { name: SkillMoveName; ratingReq: number; speedBoost: number; description: string }[] = [
  { name: 'Step-over', ratingReq: 70, speedBoost: 1.22, description: 'Rapid alternating foot circles over the ball to unbalance markers.' },
  { name: 'Body Feint', ratingReq: 70, speedBoost: 1.18, description: 'Drop shoulder one way and explode into the opposite lane.' },
  { name: 'Ball Roll', ratingReq: 72, speedBoost: 1.15, description: 'Sole-of-the-boot lateral glide to open passing and shooting angles.' },
  { name: 'Roulette', ratingReq: 78, speedBoost: 1.28, description: '360-degree spin shielding the ball between both boots.' },
  { name: 'Drag Back', ratingReq: 74, speedBoost: 1.16, description: 'Sharp stop and pullback to evade sliding defenders.' },
  { name: 'Flick', ratingReq: 80, speedBoost: 1.25, description: 'Quick toe-lift over an outstretched defensive leg.' },
  { name: 'Fake Shot', ratingReq: 75, speedBoost: 1.24, description: 'Feign a powerful strike to freeze the keeper or defender.' },
  { name: 'Heel-to-Heel', ratingReq: 82, speedBoost: 1.32, description: 'Knock the ball forward off the inside heel for a sudden burst.' },
  { name: 'Rainbow Flick', ratingReq: 86, speedBoost: 1.35, description: 'Arc the ball high overhead from heel to shin over the defender.' },
  { name: 'Elastico', ratingReq: 88, speedBoost: 1.38, description: 'Lightning outside-to-inside whip that leaves defenders flat-footed.' },
];

export type StadiumId =
  | 'modern'
  | 'classic'
  | 'night'
  | 'rain'
  | 'final'
  | 'european'
  | 'asian'
  | 'international';

export type WeatherType = 'Sunny' | 'Night' | 'Cloudy' | 'Rain';

export interface StadiumInfo {
  id: StadiumId;
  name: string;
  location: string;
  capacity: number;
  defaultWeather: WeatherType;
  turfPrimary: string;
  turfSecondary: string;
  standColor: string;
  accentColor: string;
  description: string;
}

export const STADIUMS: StadiumInfo[] = [
  {
    id: 'modern',
    name: 'Modern Stadium (Allianz Arena Style)',
    location: 'Munich, Germany',
    capacity: 78500,
    defaultWeather: 'Sunny',
    turfPrimary: '#156c36',
    turfSecondary: '#197c3e',
    standColor: '#0f172a',
    accentColor: '#10b981',
    description: 'State-of-the-art LED roof ring, pristine hybrid turf, and steep acoustics.',
  },
  {
    id: 'classic',
    name: 'Classic Stadium (San Siro Colosseum)',
    location: 'Milan, Italy',
    capacity: 82000,
    defaultWeather: 'Sunny',
    turfPrimary: '#166534',
    turfSecondary: '#15803d',
    standColor: '#1e293b',
    accentColor: '#f59e0b',
    description: 'Historic multi-tier concrete colosseum with iconic spiral towers and roaring ultras.',
  },
  {
    id: 'night',
    name: 'Night Stadium (Santiago Bernabéu Dome)',
    location: 'Madrid, Spain',
    capacity: 85000,
    defaultWeather: 'Night',
    turfPrimary: '#115e30',
    turfSecondary: '#157039',
    standColor: '#090d16',
    accentColor: '#38bdf8',
    description: 'High-contrast floodlit cathedral engineered for prime-time continental clashes.',
  },
  {
    id: 'rain',
    name: 'Rain Stadium (Wembley / Old Trafford)',
    location: 'Manchester / London, UK',
    capacity: 74000,
    defaultWeather: 'Rain',
    turfPrimary: '#0f532b',
    turfSecondary: '#136334',
    standColor: '#1e293b',
    accentColor: '#ef4444',
    description: 'Slick, fast-skidding wet surface where low driven shots and sliding tackles thrive.',
  },
  {
    id: 'final',
    name: 'Final Stadium (Lusail World Cup Iconic)',
    location: 'Lusail, World Cup Final',
    capacity: 96000,
    defaultWeather: 'Night',
    turfPrimary: '#136835',
    turfSecondary: '#187c40',
    standColor: '#12100b',
    accentColor: '#fbbf24',
    description: 'Golden bowl reserved for World Cup Finals with pyrotechnic rigs and ceremonial podium.',
  },
  {
    id: 'european',
    name: 'European Stadium (Parc des Princes)',
    location: 'Paris, France',
    capacity: 69000,
    defaultWeather: 'Cloudy',
    turfPrimary: '#166c38',
    turfSecondary: '#1b7d42',
    standColor: '#0f172a',
    accentColor: '#6366f1',
    description: 'Intimate pitch-side seating with sunken dugouts and intense European cup atmosphere.',
  },
  {
    id: 'asian',
    name: 'Asian Stadium (Tokyo National Arena)',
    location: 'Tokyo, Japan',
    capacity: 80000,
    defaultWeather: 'Night',
    turfPrimary: '#146936',
    turfSecondary: '#197a40',
    standColor: '#111827',
    accentColor: '#ec4899',
    description: 'Architectural timber-and-steel canopy with precision laser light shows.',
  },
  {
    id: 'international',
    name: 'International Stadium (Estádio do Maracanã)',
    location: 'Rio de Janeiro, Brazil',
    capacity: 88000,
    defaultWeather: 'Sunny',
    turfPrimary: '#177034',
    turfSecondary: '#1c823d',
    standColor: '#172554',
    accentColor: '#eab308',
    description: 'Sun-drenched cauldron pulsing with relentless drums, giant banners, and confetti.',
  },
];

// ============================================================================
// REAL-WORLD WORLD CUP PLAYERS DATABASE
// Includes starter active World Cup squad (`initialUnlocked: true`) +
// Unlockable / Purchasable superstars (Messi, Mbappé, Ronaldo, Neymar, etc.)
// ============================================================================
// 10,000 WORLD-CLASS FOOTBALL PLAYERS (EXACTLY 1,000 PLAYERS PER POSITION: GK, CB, LB, RB, CDM, CM, CAM, LW, RW, ST)
export const PLAYERS_DB: FootballPlayer[] = PLAYERS_10000_DB;

export interface UpgradeCardItem {
  id: string;
  name: string;
  category:
    | 'Shooting Boost'
    | 'Passing Boost'
    | 'Speed Boost'
    | 'Strength Boost'
    | 'Stamina Boost'
    | 'Training & Upgrade'
    | 'Special Edition';
  rarity: PlayerRarity;
  price: number;
  description: string;
  effectSummary: string;
  accentColor: string;
  statBonuses: Partial<PlayerAttributes>;
  ratingBonus: number;
  upgradeRarityTo?: PlayerRarity;
}

export const UPGRADE_CARDS_DB: UpgradeCardItem[] = [
  {
    id: 'upg_shooting_boost',
    name: 'Sniper Finisher Shooting Boost Card',
    category: 'Shooting Boost',
    rarity: 'Rare',
    price: 12000,
    description: 'Calibrates strike mechanics, volley timing, and long-range shot power for clinical top-corner finishes.',
    effectSummary: '+5 Shooting Power & Accuracy · +4 Curve · +3 Reactions',
    accentColor: '#EF4444',
    statBonuses: { shooting: 5, curve: 4, reactions: 3 },
    ratingBonus: 1,
  },
  {
    id: 'upg_passing_boost',
    name: 'Playmaker Vision Passing Boost Card',
    category: 'Passing Boost',
    rarity: 'Rare',
    price: 11500,
    description: 'Sharpens ground short-pass weight, defense-splitting through balls, and whipped aerial crosses.',
    effectSummary: '+5 Passing Accuracy · +4 Curve · +3 Ball Control',
    accentColor: '#38BDF8',
    statBonuses: { passing: 5, curve: 4, dribbling: 3 },
    ratingBonus: 1,
  },
  {
    id: 'upg_speed_boost',
    name: 'Nitro Sprint Speed Boost Card',
    category: 'Speed Boost',
    rarity: 'Elite',
    price: 14500,
    description: 'Explosive first-step acceleration and top-end breakaway sprint speed to leave defenders behind.',
    effectSummary: '+5 Speed (Pace) · +3 Dribbling · +3 Reactions',
    accentColor: '#10B981',
    statBonuses: { pace: 5, dribbling: 3, reactions: 3 },
    ratingBonus: 1,
  },
  {
    id: 'upg_strength_boost',
    name: 'Titan Shield Strength Boost Card',
    category: 'Strength Boost',
    rarity: 'Elite',
    price: 13500,
    description: 'Maximizes upper-body physical balance, shoulder-to-shoulder shielding, and aerial header dominance.',
    effectSummary: '+6 Physical Strength · +4 Defending · +2 Stamina',
    accentColor: '#F97316',
    statBonuses: { physical: 6, defending: 4, stamina: 2 },
    ratingBonus: 1,
  },
  {
    id: 'upg_stamina_card',
    name: 'Relentless Engine Stamina Card',
    category: 'Stamina Boost',
    rarity: 'Common',
    price: 9000,
    description: 'High-altitude conditioning card that drastically reduces sprint fatigue across full 90-minute matches.',
    effectSummary: '+8 Stamina · +3 Pace · +2 Physical',
    accentColor: '#22C55E',
    statBonuses: { stamina: 8, pace: 3, physical: 2 },
    ratingBonus: 1,
  },
  {
    id: 'upg_training_pro',
    name: 'Elite Academy Training & Upgrade Card',
    category: 'Training & Upgrade',
    rarity: 'Legendary',
    price: 24000,
    description: 'Comprehensive tactical and technical masterclass that elevates every attribute and increases Overall Rating.',
    effectSummary: '+2 OVR Rating · +3 All Core Attributes (Speed, Shooting, Passing, Dribbling, Physical)',
    accentColor: '#F59E0B',
    statBonuses: {
      pace: 3,
      shooting: 3,
      passing: 3,
      dribbling: 3,
      defending: 3,
      physical: 3,
      stamina: 4,
      skill: 3,
      curve: 3,
      reactions: 3,
    },
    ratingBonus: 2,
  },
  {
    id: 'upg_special_edition_evo',
    name: 'Ballon d’Or Special Edition Evolution Card',
    category: 'Special Edition',
    rarity: 'Special Edition',
    price: 45000,
    description: 'Transforms any footballer into a holographic Special Edition Superstar with +3 OVR and elite stat boosts.',
    effectSummary: 'Evolves Card to SPECIAL EDITION · +3 OVR Rating · +5 All Attacking & Physical Stats',
    accentColor: '#EC4899',
    statBonuses: {
      pace: 5,
      shooting: 5,
      passing: 5,
      dribbling: 5,
      defending: 4,
      physical: 5,
      stamina: 5,
      skill: 5,
      curve: 5,
      reactions: 5,
    },
    ratingBonus: 3,
    upgradeRarityTo: 'Special Edition',
  },
];

export const SPIN_COST_COINS = 500000;

export const TOP_50_SPIN_PLAYERS: FootballPlayer[] = [...PLAYERS_DB]
  .sort((a, b) => b.rating - a.rating || b.price - a.price)
  .slice(0, 50);

export interface PackDefinition {
  id: string;
  name: string;
  price: number;
  guaranteedRarity: PlayerRarity;
  description: string;
  accentColor: string;
  oddsText: string;
  positionFilter?: PositionCode[] | 'ALL';
  badgeText?: string;
}

export const PLAYER_PACKS: PackDefinition[] = [
  {
    id: 'pack_basic',
    name: 'Basic Pack',
    price: 15000,
    guaranteedRarity: 'Rare',
    description: 'Entry World Cup scout pack containing 1 guaranteed international footballer.',
    accentColor: '#94A3B8',
    oddsText: '60% Rare · 30% Elite · 10% World Class+',
    positionFilter: 'ALL',
    badgeText: '10,000 PLAYERS',
  },
  {
    id: 'pack_gk',
    name: 'Goalkeepers 1,000-Star Vault',
    price: 35000,
    guaranteedRarity: 'Elite',
    description: 'Guaranteed 1 of 1,000 World-Class Goalkeepers (Courtois, Alisson, Neuer, Ter Stegen, Donnarumma, Buffon, Yashin).',
    accentColor: '#38BDF8',
    oddsText: '100% Guaranteed GK · 1,000 Goalkeepers Available',
    positionFilter: ['GK'],
    badgeText: '1,000 GOALKEEPERS',
  },
  {
    id: 'pack_defenders',
    name: 'Defenders Titan Pack',
    price: 45000,
    guaranteedRarity: 'Elite',
    description: 'Guaranteed Defender from 3,000 Center Backs, Left Backs, and Right Backs (Van Dijk, Saliba, Theo, Hakimi, Maldini, Carlos).',
    accentColor: '#10B981',
    oddsText: '100% Guaranteed DEF (CB, LB, RB) · 3,000 Defenders Available',
    positionFilter: ['CB', 'LB', 'RB'],
    badgeText: '3,000 DEFENDERS',
  },
  {
    id: 'pack_midfielders',
    name: 'Midfield Maestros Pack',
    price: 55000,
    guaranteedRarity: 'Elite',
    description: 'Guaranteed Midfielder from 3,000 CDMs, CMs, and CAMs (De Bruyne, Rodri, Bellingham, Musiala, Modrić, Zidane, Iniesta).',
    accentColor: '#A855F7',
    oddsText: '100% Guaranteed MID (CDM, CM, CAM) · 3,000 Midfielders Available',
    positionFilter: ['CDM', 'CM', 'CAM'],
    badgeText: '3,000 MIDFIELDERS',
  },
  {
    id: 'pack_attackers',
    name: 'Attackers & Strikers Fire Pack',
    price: 75000,
    guaranteedRarity: 'World Class',
    description: 'Guaranteed Attacker from 3,000 Strikers, Left Wingers, and Right Wingers (Haaland, Mbappé, Messi, Ronaldo, Salah, Vini Jr.).',
    accentColor: '#EF4444',
    oddsText: '100% Guaranteed FWD (ST, LW, RW) · 3,000 Attackers Available',
    positionFilter: ['ST', 'LW', 'RW'],
    badgeText: '3,000 ATTACKERS',
  },
  {
    id: 'pack_premium',
    name: 'Premium All-Star Pack',
    price: 30000,
    guaranteedRarity: 'Elite',
    description: 'First-team reinforcement pack guaranteeing 86+ OVR Elite or higher international stars across all 10 positions.',
    accentColor: '#38BDF8',
    oddsText: '55% Elite · 35% World Class · 10% Legendary',
    positionFilter: 'ALL',
    badgeText: 'ALL POSITIONS',
  },
  {
    id: 'pack_elite',
    name: 'Elite Continental Pack',
    price: 60000,
    guaranteedRarity: 'Elite',
    description: 'Top-flight continental pack featuring high odds of 90+ OVR World Cup superstars across all 10,000 players.',
    accentColor: '#A855F7',
    oddsText: '40% Elite · 45% World Class · 15% Legendary',
    positionFilter: 'ALL',
    badgeText: 'ELITE 86+',
  },
  {
    id: 'pack_world_class',
    name: 'World Class Pack',
    price: 95000,
    guaranteedRarity: 'World Class',
    description: 'Prestigious championship contract guaranteeing a 90+ OVR World Class or Legendary superstar.',
    accentColor: '#10B981',
    oddsText: '65% World Class · 35% Legendary',
    positionFilter: 'ALL',
    badgeText: 'WORLD CLASS 90+',
  },
  {
    id: 'pack_legendary',
    name: 'Legendary Icon Pack',
    price: 150000,
    guaranteedRarity: 'Legendary',
    description: 'Ultimate Hall-of-Champions vault containing a guaranteed 94–99 OVR Legend (Messi, Ronaldo, Pelé, Maradona, Mbappé, Haaland).',
    accentColor: '#F59E0B',
    oddsText: '100% Guaranteed Legendary Superstar (94–99 OVR)',
    positionFilter: 'ALL',
    badgeText: 'LEGENDS 94+',
  },
];

export interface TeamData {
  id: string;
  name: string;
  shortName: string;
  category: 'International' | 'Club';
  confederation: 'Europe' | 'Americas' | 'Asia' | 'Africa' | 'Club Elite';
  leagueOrRegion?: string;
  rating: number;
  attack: number;
  midfield: number;
  defense: number;
  primaryColor: string;
  secondaryColor: string;
  shortsColor: string;
  gkColor: string;
  stadiumId: StadiumId;
  defaultFormation: FormationName;
  tactics: {
    mentality: 'Attacking' | 'Balanced' | 'Counter-Attack' | 'High Press';
    passingStyle: 'Short Tiki-Taka' | 'Direct Vertical' | 'Wide Crossing';
    defensiveLine: 'High Line' | 'Mid Block' | 'Deep Compact';
  };
}

export const TEAMS_DB: TeamData[] = [
  // ==========================================================================
  // REAL-WORLD FOOTBALL CLUBS (For Favourite Club Selection & Club Matches)
  // ==========================================================================
  {
    id: 'club_real_madrid',
    name: 'Real Madrid',
    shortName: 'RMA',
    category: 'Club',
    confederation: 'Club Elite',
    leagueOrRegion: 'La Liga · Spain',
    rating: 95,
    attack: 96,
    midfield: 95,
    defense: 93,
    primaryColor: '#f8fafc',
    secondaryColor: '#f59e0b',
    shortsColor: '#f8fafc',
    gkColor: '#10b981',
    stadiumId: 'night',
    defaultFormation: '4-3-3',
    tactics: { mentality: 'Attacking', passingStyle: 'Direct Vertical', defensiveLine: 'High Line' },
  },
  {
    id: 'club_barcelona',
    name: 'FC Barcelona',
    shortName: 'BAR',
    category: 'Club',
    confederation: 'Club Elite',
    leagueOrRegion: 'La Liga · Spain',
    rating: 93,
    attack: 94,
    midfield: 94,
    defense: 90,
    primaryColor: '#1d4ed8',
    secondaryColor: '#b91c1c',
    shortsColor: '#1e3a8a',
    gkColor: '#f97316',
    stadiumId: 'european',
    defaultFormation: '4-3-3',
    tactics: { mentality: 'High Press', passingStyle: 'Short Tiki-Taka', defensiveLine: 'High Line' },
  },
  {
    id: 'club_man_city',
    name: 'Manchester City',
    shortName: 'MCI',
    category: 'Club',
    confederation: 'Club Elite',
    leagueOrRegion: 'Premier League · England',
    rating: 95,
    attack: 96,
    midfield: 96,
    defense: 93,
    primaryColor: '#38bdf8',
    secondaryColor: '#ffffff',
    shortsColor: '#ffffff',
    gkColor: '#facc15',
    stadiumId: 'modern',
    defaultFormation: '4-2-3-1',
    tactics: { mentality: 'High Press', passingStyle: 'Short Tiki-Taka', defensiveLine: 'High Line' },
  },
  {
    id: 'club_liverpool',
    name: 'Liverpool FC',
    shortName: 'LIV',
    category: 'Club',
    confederation: 'Club Elite',
    leagueOrRegion: 'Premier League · England',
    rating: 93,
    attack: 94,
    midfield: 91,
    defense: 93,
    primaryColor: '#dc2626',
    secondaryColor: '#ffffff',
    shortsColor: '#dc2626',
    gkColor: '#10b981',
    stadiumId: 'rain',
    defaultFormation: '4-3-3',
    tactics: { mentality: 'High Press', passingStyle: 'Direct Vertical', defensiveLine: 'High Line' },
  },
  {
    id: 'club_arsenal',
    name: 'Arsenal FC',
    shortName: 'ARS',
    category: 'Club',
    confederation: 'Club Elite',
    leagueOrRegion: 'Premier League · England',
    rating: 92,
    attack: 91,
    midfield: 92,
    defense: 94,
    primaryColor: '#ef4444',
    secondaryColor: '#ffffff',
    shortsColor: '#ffffff',
    gkColor: '#38bdf8',
    stadiumId: 'modern',
    defaultFormation: '4-3-3',
    tactics: { mentality: 'Attacking', passingStyle: 'Short Tiki-Taka', defensiveLine: 'High Line' },
  },
  {
    id: 'club_bayern',
    name: 'Bayern Munich',
    shortName: 'BAY',
    category: 'Club',
    confederation: 'Club Elite',
    leagueOrRegion: 'Bundesliga · Germany',
    rating: 93,
    attack: 95,
    midfield: 92,
    defense: 91,
    primaryColor: '#dc2626',
    secondaryColor: '#ffffff',
    shortsColor: '#dc2626',
    gkColor: '#38bdf8',
    stadiumId: 'modern',
    defaultFormation: '4-2-3-1',
    tactics: { mentality: 'High Press', passingStyle: 'Wide Crossing', defensiveLine: 'High Line' },
  },
  {
    id: 'club_psg',
    name: 'Paris Saint-Germain',
    shortName: 'PSG',
    category: 'Club',
    confederation: 'Club Elite',
    leagueOrRegion: 'Ligue 1 · France',
    rating: 92,
    attack: 93,
    midfield: 91,
    defense: 91,
    primaryColor: '#1e3a8a',
    secondaryColor: '#ef4444',
    shortsColor: '#1e3a8a',
    gkColor: '#22c55e',
    stadiumId: 'european',
    defaultFormation: '4-3-3',
    tactics: { mentality: 'Attacking', passingStyle: 'Short Tiki-Taka', defensiveLine: 'High Line' },
  },
  {
    id: 'club_inter_milan',
    name: 'Inter Milan',
    shortName: 'INT',
    category: 'Club',
    confederation: 'Club Elite',
    leagueOrRegion: 'Serie A · Italy',
    rating: 92,
    attack: 92,
    midfield: 92,
    defense: 93,
    primaryColor: '#1d4ed8',
    secondaryColor: '#09090b',
    shortsColor: '#09090b',
    gkColor: '#facc15',
    stadiumId: 'classic',
    defaultFormation: '3-5-2',
    tactics: { mentality: 'Counter-Attack', passingStyle: 'Direct Vertical', defensiveLine: 'Mid Block' },
  },
  {
    id: 'club_ac_milan',
    name: 'AC Milan',
    shortName: 'ACM',
    category: 'Club',
    confederation: 'Club Elite',
    leagueOrRegion: 'Serie A · Italy',
    rating: 90,
    attack: 91,
    midfield: 89,
    defense: 90,
    primaryColor: '#b91c1c',
    secondaryColor: '#09090b',
    shortsColor: '#09090b',
    gkColor: '#eab308',
    stadiumId: 'classic',
    defaultFormation: '4-2-3-1',
    tactics: { mentality: 'Counter-Attack', passingStyle: 'Direct Vertical', defensiveLine: 'Mid Block' },
  },
  {
    id: 'club_man_united',
    name: 'Manchester United',
    shortName: 'MUN',
    category: 'Club',
    confederation: 'Club Elite',
    leagueOrRegion: 'Premier League · England',
    rating: 89,
    attack: 89,
    midfield: 89,
    defense: 88,
    primaryColor: '#dc2626',
    secondaryColor: '#09090b',
    shortsColor: '#ffffff',
    gkColor: '#22c55e',
    stadiumId: 'rain',
    defaultFormation: '4-2-3-1',
    tactics: { mentality: 'Counter-Attack', passingStyle: 'Direct Vertical', defensiveLine: 'Mid Block' },
  },
  {
    id: 'club_chelsea',
    name: 'Chelsea FC',
    shortName: 'CHE',
    category: 'Club',
    confederation: 'Club Elite',
    leagueOrRegion: 'Premier League · England',
    rating: 89,
    attack: 90,
    midfield: 90,
    defense: 88,
    primaryColor: '#1d4ed8',
    secondaryColor: '#ffffff',
    shortsColor: '#1d4ed8',
    gkColor: '#f97316',
    stadiumId: 'rain',
    defaultFormation: '4-2-3-1',
    tactics: { mentality: 'Attacking', passingStyle: 'Short Tiki-Taka', defensiveLine: 'High Line' },
  },
  {
    id: 'club_juventus',
    name: 'Juventus',
    shortName: 'JUV',
    category: 'Club',
    confederation: 'Club Elite',
    leagueOrRegion: 'Serie A · Italy',
    rating: 90,
    attack: 90,
    midfield: 89,
    defense: 91,
    primaryColor: '#f8fafc',
    secondaryColor: '#09090b',
    shortsColor: '#09090b',
    gkColor: '#38bdf8',
    stadiumId: 'classic',
    defaultFormation: '3-5-2',
    tactics: { mentality: 'Balanced', passingStyle: 'Short Tiki-Taka', defensiveLine: 'Deep Compact' },
  },
  {
    id: 'club_atletico',
    name: 'Atlético Madrid',
    shortName: 'ATM',
    category: 'Club',
    confederation: 'Club Elite',
    leagueOrRegion: 'La Liga · Spain',
    rating: 90,
    attack: 91,
    midfield: 89,
    defense: 91,
    primaryColor: '#dc2626',
    secondaryColor: '#ffffff',
    shortsColor: '#1e3a8a',
    gkColor: '#eab308',
    stadiumId: 'night',
    defaultFormation: '5-3-2',
    tactics: { mentality: 'Counter-Attack', passingStyle: 'Direct Vertical', defensiveLine: 'Deep Compact' },
  },
  {
    id: 'club_dortmund',
    name: 'Borussia Dortmund',
    shortName: 'BVB',
    category: 'Club',
    confederation: 'Club Elite',
    leagueOrRegion: 'Bundesliga · Germany',
    rating: 89,
    attack: 90,
    midfield: 88,
    defense: 88,
    primaryColor: '#facc15',
    secondaryColor: '#09090b',
    shortsColor: '#09090b',
    gkColor: '#f97316',
    stadiumId: 'modern',
    defaultFormation: '4-3-3',
    tactics: { mentality: 'High Press', passingStyle: 'Direct Vertical', defensiveLine: 'High Line' },
  },
  {
    id: 'club_inter_miami',
    name: 'Inter Miami CF',
    shortName: 'MIA',
    category: 'Club',
    confederation: 'Club Elite',
    leagueOrRegion: 'MLS · United States',
    rating: 88,
    attack: 93,
    midfield: 87,
    defense: 84,
    primaryColor: '#f472b6',
    secondaryColor: '#09090b',
    shortsColor: '#f472b6',
    gkColor: '#10b981',
    stadiumId: 'international',
    defaultFormation: '4-3-3',
    tactics: { mentality: 'Attacking', passingStyle: 'Short Tiki-Taka', defensiveLine: 'High Line' },
  },
  {
    id: 'club_al_nassr',
    name: 'Al-Nassr FC',
    shortName: 'ALN',
    category: 'Club',
    confederation: 'Club Elite',
    leagueOrRegion: 'Pro League · Saudi Arabia',
    rating: 88,
    attack: 93,
    midfield: 87,
    defense: 85,
    primaryColor: '#facc15',
    secondaryColor: '#1d4ed8',
    shortsColor: '#1d4ed8',
    gkColor: '#10b981',
    stadiumId: 'final',
    defaultFormation: '4-2-3-1',
    tactics: { mentality: 'Attacking', passingStyle: 'Direct Vertical', defensiveLine: 'High Line' },
  },
  {
    id: 'club_al_hilal',
    name: 'Al-Hilal SFC',
    shortName: 'HIL',
    category: 'Club',
    confederation: 'Club Elite',
    leagueOrRegion: 'Pro League · Saudi Arabia',
    rating: 88,
    attack: 91,
    midfield: 88,
    defense: 86,
    primaryColor: '#2563eb',
    secondaryColor: '#ffffff',
    shortsColor: '#2563eb',
    gkColor: '#facc15',
    stadiumId: 'final',
    defaultFormation: '4-3-3',
    tactics: { mentality: 'Attacking', passingStyle: 'Short Tiki-Taka', defensiveLine: 'High Line' },
  },

  // ==========================================================================
  // INTERNATIONAL WORLD CUP TEAMS
  // ==========================================================================
  {
    id: 'team_argentina',
    name: 'Argentina',
    shortName: 'ARG',
    category: 'International',
    confederation: 'Americas',
    leagueOrRegion: 'CONMEBOL · World Champions',
    rating: 95,
    attack: 96,
    midfield: 94,
    defense: 92,
    primaryColor: '#38bdf8',
    secondaryColor: '#ffffff',
    shortsColor: '#09090b',
    gkColor: '#22c55e',
    stadiumId: 'final',
    defaultFormation: '4-3-3',
    tactics: { mentality: 'Attacking', passingStyle: 'Short Tiki-Taka', defensiveLine: 'High Line' },
  },
  {
    id: 'team_france',
    name: 'France',
    shortName: 'FRA',
    category: 'International',
    confederation: 'Europe',
    leagueOrRegion: 'UEFA · Europe',
    rating: 95,
    attack: 96,
    midfield: 93,
    defense: 93,
    primaryColor: '#1e3a8a',
    secondaryColor: '#ffffff',
    shortsColor: '#ffffff',
    gkColor: '#eab308',
    stadiumId: 'european',
    defaultFormation: '4-2-3-1',
    tactics: { mentality: 'Counter-Attack', passingStyle: 'Direct Vertical', defensiveLine: 'Mid Block' },
  },
  {
    id: 'team_brazil',
    name: 'Brazil',
    shortName: 'BRA',
    category: 'International',
    confederation: 'Americas',
    leagueOrRegion: 'CONMEBOL · South America',
    rating: 94,
    attack: 96,
    midfield: 92,
    defense: 91,
    primaryColor: '#facc15',
    secondaryColor: '#15803d',
    shortsColor: '#1d4ed8',
    gkColor: '#10b981',
    stadiumId: 'international',
    defaultFormation: '4-3-3',
    tactics: { mentality: 'Attacking', passingStyle: 'Short Tiki-Taka', defensiveLine: 'High Line' },
  },
  {
    id: 'team_england',
    name: 'England',
    shortName: 'ENG',
    category: 'International',
    confederation: 'Europe',
    leagueOrRegion: 'UEFA · Europe',
    rating: 93,
    attack: 94,
    midfield: 94,
    defense: 90,
    primaryColor: '#f8fafc',
    secondaryColor: '#dc2626',
    shortsColor: '#1e3a8a',
    gkColor: '#f97316',
    stadiumId: 'rain',
    defaultFormation: '4-2-3-1',
    tactics: { mentality: 'Balanced', passingStyle: 'Wide Crossing', defensiveLine: 'Mid Block' },
  },
  {
    id: 'team_spain',
    name: 'Spain',
    shortName: 'ESP',
    category: 'International',
    confederation: 'Europe',
    leagueOrRegion: 'UEFA · European Champions',
    rating: 94,
    attack: 92,
    midfield: 96,
    defense: 91,
    primaryColor: '#dc2626',
    secondaryColor: '#facc15',
    shortsColor: '#1e3a8a',
    gkColor: '#38bdf8',
    stadiumId: 'night',
    defaultFormation: '4-3-3',
    tactics: { mentality: 'High Press', passingStyle: 'Short Tiki-Taka', defensiveLine: 'High Line' },
  },
  {
    id: 'team_portugal',
    name: 'Portugal',
    shortName: 'POR',
    category: 'International',
    confederation: 'Europe',
    leagueOrRegion: 'UEFA · Europe',
    rating: 93,
    attack: 94,
    midfield: 92,
    defense: 91,
    primaryColor: '#991b1b',
    secondaryColor: '#15803d',
    shortsColor: '#15803d',
    gkColor: '#facc15',
    stadiumId: 'european',
    defaultFormation: '4-3-3',
    tactics: { mentality: 'Attacking', passingStyle: 'Wide Crossing', defensiveLine: 'Mid Block' },
  },
  {
    id: 'team_germany',
    name: 'Germany',
    shortName: 'GER',
    category: 'International',
    confederation: 'Europe',
    leagueOrRegion: 'UEFA · Europe',
    rating: 92,
    attack: 91,
    midfield: 93,
    defense: 91,
    primaryColor: '#ffffff',
    secondaryColor: '#09090b',
    shortsColor: '#09090b',
    gkColor: '#ef4444',
    stadiumId: 'modern',
    defaultFormation: '4-2-3-1',
    tactics: { mentality: 'High Press', passingStyle: 'Direct Vertical', defensiveLine: 'High Line' },
  },
  {
    id: 'team_netherlands',
    name: 'Netherlands',
    shortName: 'NED',
    category: 'International',
    confederation: 'Europe',
    leagueOrRegion: 'UEFA · Europe',
    rating: 90,
    attack: 89,
    midfield: 89,
    defense: 93,
    primaryColor: '#f97316',
    secondaryColor: '#09090b',
    shortsColor: '#f97316',
    gkColor: '#38bdf8',
    stadiumId: 'modern',
    defaultFormation: '3-4-3',
    tactics: { mentality: 'Attacking', passingStyle: 'Short Tiki-Taka', defensiveLine: 'High Line' },
  },
  {
    id: 'team_italy',
    name: 'Italy',
    shortName: 'ITA',
    category: 'International',
    confederation: 'Europe',
    leagueOrRegion: 'UEFA · Europe',
    rating: 89,
    attack: 86,
    midfield: 89,
    defense: 92,
    primaryColor: '#2563eb',
    secondaryColor: '#ffffff',
    shortsColor: '#ffffff',
    gkColor: '#eab308',
    stadiumId: 'classic',
    defaultFormation: '3-5-2',
    tactics: { mentality: 'Counter-Attack', passingStyle: 'Direct Vertical', defensiveLine: 'Deep Compact' },
  },
  {
    id: 'team_japan',
    name: 'Japan',
    shortName: 'JPN',
    category: 'International',
    confederation: 'Asia',
    leagueOrRegion: 'AFC · Asia',
    rating: 87,
    attack: 88,
    midfield: 88,
    defense: 85,
    primaryColor: '#1d4ed8',
    secondaryColor: '#ffffff',
    shortsColor: '#1d4ed8',
    gkColor: '#ec4899',
    stadiumId: 'asian',
    defaultFormation: '4-2-3-1',
    tactics: { mentality: 'High Press', passingStyle: 'Short Tiki-Taka', defensiveLine: 'High Line' },
  },
  {
    id: 'team_south_korea',
    name: 'South Korea',
    shortName: 'KOR',
    category: 'International',
    confederation: 'Asia',
    leagueOrRegion: 'AFC · Asia',
    rating: 86,
    attack: 88,
    midfield: 84,
    defense: 86,
    primaryColor: '#e11d48',
    secondaryColor: '#09090b',
    shortsColor: '#09090b',
    gkColor: '#38bdf8',
    stadiumId: 'asian',
    defaultFormation: '4-3-3',
    tactics: { mentality: 'Counter-Attack', passingStyle: 'Direct Vertical', defensiveLine: 'Mid Block' },
  },
  {
    id: 'team_morocco',
    name: 'Morocco',
    shortName: 'MAR',
    category: 'International',
    confederation: 'Africa',
    leagueOrRegion: 'CAF · Africa',
    rating: 88,
    attack: 87,
    midfield: 87,
    defense: 89,
    primaryColor: '#dc2626',
    secondaryColor: '#15803d',
    shortsColor: '#15803d',
    gkColor: '#facc15',
    stadiumId: 'final',
    defaultFormation: '4-1-4-1',
    tactics: { mentality: 'Counter-Attack', passingStyle: 'Direct Vertical', defensiveLine: 'Deep Compact' },
  },
  {
    id: 'team_usa',
    name: 'United States',
    shortName: 'USA',
    category: 'International',
    confederation: 'Americas',
    leagueOrRegion: 'CONCACAF · North America',
    rating: 85,
    attack: 86,
    midfield: 85,
    defense: 83,
    primaryColor: '#f8fafc',
    secondaryColor: '#1e3a8a',
    shortsColor: '#1e3a8a',
    gkColor: '#ef4444',
    stadiumId: 'international',
    defaultFormation: '4-3-3',
    tactics: { mentality: 'High Press', passingStyle: 'Wide Crossing', defensiveLine: 'Mid Block' },
  },
  {
    id: 'team_uruguay',
    name: 'Uruguay',
    shortName: 'URU',
    category: 'International',
    confederation: 'Americas',
    leagueOrRegion: 'CONMEBOL · South America',
    rating: 89,
    attack: 89,
    midfield: 90,
    defense: 88,
    primaryColor: '#60a5fa',
    secondaryColor: '#09090b',
    shortsColor: '#09090b',
    gkColor: '#f59e0b',
    stadiumId: 'international',
    defaultFormation: '4-3-3',
    tactics: { mentality: 'High Press', passingStyle: 'Direct Vertical', defensiveLine: 'Mid Block' },
  },
  {
    id: 'team_croatia',
    name: 'Croatia',
    shortName: 'CRO',
    category: 'International',
    confederation: 'Europe',
    leagueOrRegion: 'UEFA · Europe',
    rating: 87,
    attack: 85,
    midfield: 91,
    defense: 87,
    primaryColor: '#ef4444',
    secondaryColor: '#ffffff',
    shortsColor: '#ffffff',
    gkColor: '#38bdf8',
    stadiumId: 'classic',
    defaultFormation: '4-3-3',
    tactics: { mentality: 'Balanced', passingStyle: 'Short Tiki-Taka', defensiveLine: 'Mid Block' },
  },
  {
    id: 'team_nigeria',
    name: 'Nigeria',
    shortName: 'NGA',
    category: 'International',
    confederation: 'Africa',
    leagueOrRegion: 'CAF · Africa',
    rating: 86,
    attack: 90,
    midfield: 84,
    defense: 84,
    primaryColor: '#16a34a',
    secondaryColor: '#ffffff',
    shortsColor: '#16a34a',
    gkColor: '#facc15',
    stadiumId: 'international',
    defaultFormation: '4-3-3',
    tactics: { mentality: 'Attacking', passingStyle: 'Direct Vertical', defensiveLine: 'Mid Block' },
  },
];

export type MatchModeId =
  | 'quick_match'
  | '1v1'
  | '11v11'
  | 'practice'
  | 'penalty_shootout'
  | 'free_kick'
  | 'attack_vs_defense'
  | 'gk_challenge'
  | 'skill_challenge'
  | 'world_cup'
  | 'tournament';

export interface MatchModeInfo {
  id: MatchModeId;
  title: string;
  subtitle: string;
  playersPerSide: string;
  durationLabel: string;
  description: string;
  rewardCoins: number;
}

export const MATCH_MODES: MatchModeInfo[] = [
  {
    id: 'quick_match',
    title: 'Quick Match',
    subtitle: 'Instant 11v11 Kick-Off',
    playersPerSide: '11 vs 11',
    durationLabel: '4 Mins',
    description: 'Select any two international or real-world club teams and jump straight into broadcast 3D stadium action.',
    rewardCoins: 5000,
  },
  {
    id: '11v11',
    title: '11 vs 11 Pro Simulation',
    subtitle: 'Full Tactical Dream Team Match',
    playersPerSide: '11 vs 11',
    durationLabel: '6 Mins',
    description: 'Complete tactical 11-a-side match with your custom Dream Team, full stamina management, formations, and intelligent AI.',
    rewardCoins: 6500,
  },
  {
    id: '1v1',
    title: '1 vs 1 World Star Duel',
    subtitle: 'Pure Skill Showdown',
    playersPerSide: '1 vs 1 (+GK)',
    durationLabel: '3 Mins',
    description: 'High-tempo one-on-one duel where your chosen superstar battles head-to-head with dribbling, skill moves, and curved finishes.',
    rewardCoins: 4500,
  },
  {
    id: 'practice',
    title: 'Practice Arena',
    subtitle: 'Free Training & Drills',
    playersPerSide: 'Custom Drills',
    durationLabel: 'Unlimited',
    description: 'Master passing, shooting, curved shots, skill moves, free kicks, penalties, and goalkeeper saves.',
    rewardCoins: 2500,
  },
  {
    id: 'penalty_shootout',
    title: 'Penalty Shootout',
    subtitle: 'High-Pressure Spot Kicks',
    playersPerSide: '5 Rounds + Sudden Death',
    durationLabel: 'Shootout',
    description: 'Aim with precision, charge power and curve, then switch to your goalkeeper to make diving saves.',
    rewardCoins: 3500,
  },
  {
    id: 'free_kick',
    title: 'Free Kick Masters',
    subtitle: 'Set-Piece Precision',
    playersPerSide: 'Set-Piece Waves',
    durationLabel: '10 Attempts',
    description: 'Bend the ball around a jumping defensive wall into the top corners using Magnus spin physics.',
    rewardCoins: 3500,
  },
  {
    id: 'attack_vs_defense',
    title: 'Attack vs Defense',
    subtitle: 'Final Third Overload',
    playersPerSide: '6 Attackers vs 5 Defenders',
    durationLabel: '4 Mins',
    description: 'Continuous attacking waves starting in the final third against a disciplined defensive block.',
    rewardCoins: 4000,
  },
  {
    id: 'gk_challenge',
    title: 'Goalkeeper Challenge',
    subtitle: 'Shot-Stopper Reflexes',
    playersPerSide: 'Manual Goalkeeper',
    durationLabel: '15 Shots',
    description: 'Command the penalty box as the goalkeeper. Read striker body angles and press V or Click to dive.',
    rewardCoins: 4000,
  },
  {
    id: 'skill_challenge',
    title: 'Skill Challenge',
    subtitle: 'Dribbling & Target Course',
    playersPerSide: 'Solo Trial',
    durationLabel: 'Timed Trial',
    description: 'Weave through slalom gates, execute skill moves in bonus zones, and curl finishes into corner targets.',
    rewardCoins: 4000,
  },
];

export interface TournamentDefinition {
  id: string;
  name: string;
  region: string;
  teamsCount: number;
  prizeCoins: number;
  trophyColor: string;
  description: string;
  defaultStadium: StadiumId;
}

export const TOURNAMENTS_LIST: TournamentDefinition[] = [
  {
    id: 'world_cup',
    name: 'World Cup',
    region: 'Global · 32 Nations',
    teamsCount: 16,
    prizeCoins: 50000,
    trophyColor: '#F59E0B',
    description: 'The pinnacle of international football. Navigate the Group Stage, Round of 16, Quarter-Finals, Semi-Finals, and the Grand Final.',
    defaultStadium: 'final',
  },
  {
    id: 'european_cup',
    name: 'European Cup',
    region: 'Europe · Continental Championship',
    teamsCount: 8,
    prizeCoins: 30000,
    trophyColor: '#38BDF8',
    description: 'Europe’s premier national team tournament featuring tactical powerhouses and electric night stadiums.',
    defaultStadium: 'european',
  },
  {
    id: 'asian_cup',
    name: 'Asian Cup',
    region: 'Asia · Continental Championship',
    teamsCount: 8,
    prizeCoins: 25000,
    trophyColor: '#EC4899',
    description: 'High-speed technical tournament hosted across Tokyo and premier Asian arenas.',
    defaultStadium: 'asian',
  },
  {
    id: 'copa_continental',
    name: 'Copa Continental',
    region: 'Americas · South & North Championship',
    teamsCount: 8,
    prizeCoins: 28000,
    trophyColor: '#FACC15',
    description: 'Passionate flares, samba flair, and relentless intensity in the oldest continental cup.',
    defaultStadium: 'international',
  },
  {
    id: 'champions_club',
    name: 'Champions Club Cup',
    region: 'Club Football · Real Madrid, Barça, Man City & More',
    teamsCount: 8,
    prizeCoins: 45000,
    trophyColor: '#A855F7',
    description: 'The ultimate floodlit club competition pitting the world’s biggest football clubs against each other.',
    defaultStadium: 'night',
  },
  {
    id: 'international_cup',
    name: 'International Super Cup',
    region: 'Intercontinental · Invitational',
    teamsCount: 8,
    prizeCoins: 22000,
    trophyColor: '#10B981',
    description: 'Cross-continental knockout showdown uniting champions from every confederation.',
    defaultStadium: 'modern',
  },
  {
    id: 'nations_tournament',
    name: 'Nations League Finals',
    region: 'Global Division A',
    teamsCount: 8,
    prizeCoins: 24000,
    trophyColor: '#60A5FA',
    description: 'Every fixture is a heavyweight clash between top-seeded international rivals.',
    defaultStadium: 'classic',
  },
  {
    id: 'custom_tournament',
    name: 'Custom Tournament',
    region: 'Custom Rules & Teams',
    teamsCount: 8,
    prizeCoins: 20000,
    trophyColor: '#F97316',
    description: 'Build your own knockout or group competition with custom weather, stadium, and difficulty.',
    defaultStadium: 'modern',
  },
];

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  code: string;
  rewardCoins: number;
}

export const ACHIEVEMENTS_LIST: AchievementBadge[] = [
  { id: 'ach_world_champ', title: 'World Champion', description: 'Lift the trophy in World Cup or Tournament mode.', code: 'WC-01', rewardCoins: 25000 },
  { id: 'ach_speed_demon', title: 'Speed Demon', description: 'Score a breakaway goal while sprinting (I) past defenders.', code: 'SPD-02', rewardCoins: 5000 },
  { id: 'ach_sniper', title: 'Sniper', description: 'Score a long-range or Curved Shot (C) from outside the box.', code: 'SNP-03', rewardCoins: 7500 },
  { id: 'ach_wall', title: 'The Wall', description: 'Keep a clean sheet or perform 5+ Goalkeeper Saves (V).', code: 'GK-04', rewardCoins: 6000 },
  { id: 'ach_hat_trick', title: 'Hat-Trick Hero', description: 'Score 3 or more goals in a single match.', code: 'HT-05', rewardCoins: 10000 },
  { id: 'ach_champion', title: 'Champion', description: 'Win 5 matches across any game mode.', code: 'CMP-06', rewardCoins: 8000 },
  { id: 'ach_skill_master', title: 'Skill Maestro', description: 'Successfully execute 10 Skill Moves (K) in match play.', code: 'SKL-07', rewardCoins: 5000 },
  { id: 'ach_transfer_mogul', title: 'Transfer Mogul', description: 'Unlock a World Cup star from the Transfer Market or Player Packs.', code: 'TRN-08', rewardCoins: 5000 },
];

export interface LeaderboardEntry {
  rank: number;
  username: string;
  country: string;
  rating: number;
  matches: number;
  wins: number;
  winRate: string;
  goals: number;
  assists: number;
  cleanSheets: number;
  tournamentsWon: number;
}

export const GLOBAL_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, username: 'ValenStrike_99', country: 'Real Madrid', rating: 2480, matches: 142, wins: 128, winRate: '90.1%', goals: 412, assists: 198, cleanSheets: 74, tournamentsWon: 19 },
  { rank: 2, username: 'SambaKing_BR', country: 'Brazil', rating: 2445, matches: 138, wins: 121, winRate: '87.7%', goals: 389, assists: 215, cleanSheets: 68, tournamentsWon: 17 },
  { rank: 3, username: 'TikiTakaMaestro', country: 'FC Barcelona', rating: 2390, matches: 129, wins: 110, winRate: '85.3%', goals: 340, assists: 244, cleanSheets: 71, tournamentsWon: 15 },
  { rank: 4, username: 'NeoTokyo_Ace', country: 'Japan', rating: 2350, matches: 118, wins: 99, winRate: '83.9%', goals: 318, assists: 176, cleanSheets: 62, tournamentsWon: 14 },
  { rank: 5, username: 'DerKaiser_FX', country: 'Bayern Munich', rating: 2315, matches: 124, wins: 102, winRate: '82.3%', goals: 295, assists: 164, cleanSheets: 69, tournamentsWon: 12 },
  { rank: 6, username: 'Albiceleste10', country: 'Argentina', rating: 2290, matches: 115, wins: 94, winRate: '81.7%', goals: 310, assists: 190, cleanSheets: 55, tournamentsWon: 11 },
  { rank: 7, username: 'AzzurriWall_GK', country: 'AC Milan', rating: 2260, matches: 110, wins: 89, winRate: '80.9%', goals: 245, assists: 142, cleanSheets: 82, tournamentsWon: 10 },
  { rank: 8, username: 'AtlasLion_MAR', country: 'Morocco', rating: 2210, matches: 104, wins: 82, winRate: '78.8%', goals: 268, assists: 151, cleanSheets: 58, tournamentsWon: 9 },
];
