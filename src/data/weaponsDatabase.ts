/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface WeaponItem {
  id: string;
  name: string;
  category: 'Pistol' | 'SMG' | 'Assault' | 'Shotgun' | 'Sniper' | 'Energy' | 'Special';
  price: number;
  damage: number; // base damage per projectile
  fireRateMs: number; // cooldown between shots in milliseconds
  magazineSize: number;
  reloadTimeMs: number;
  range: number;
  bulletSpeed: number;
  spread: number;
  pelletsPerShot?: number;
  unlockedByDefault?: boolean;
  color: string;
  bulletColor: string;
  description: string;
  soundType: 'pistol' | 'rifle' | 'shotgun' | 'sniper' | 'plasma';
}

export interface WeaponUpgrade {
  id: string;
  name: string;
  level: number;
  maxLevel: number;
  cost: number;
  damageBonus: number;
  fireRateReductionMs: number;
  magazineBonus: number;
  bulletSpeedBonus: number;
}

export const WEAPONS_ARMORY: WeaponItem[] = [
  {
    id: 'wpn_tactical_sidearm',
    name: 'P250 Combat Striker',
    category: 'Pistol',
    price: 0,
    damage: 32,
    fireRateMs: 260,
    magazineSize: 15,
    reloadTimeMs: 1200,
    range: 45,
    bulletSpeed: 52,
    spread: 0.04,
    unlockedByDefault: true,
    color: '#94A3B8',
    bulletColor: '#FDE047',
    description: 'Reliable semi-automatic tactical sidearm with crisp handling and rapid single-tap recovery.',
    soundType: 'pistol',
  },
  {
    id: 'wpn_mp5_storm',
    name: 'Vector Apex SMG',
    category: 'SMG',
    price: 8500,
    damage: 26,
    fireRateMs: 110,
    magazineSize: 32,
    reloadTimeMs: 1400,
    range: 40,
    bulletSpeed: 58,
    spread: 0.07,
    unlockedByDefault: false,
    color: '#38BDF8',
    bulletColor: '#38BDF8',
    description: 'High-cadence rapid submachine gun ideal for fast close-quarters flanking maneuvers on phones.',
    soundType: 'rifle',
  },
  {
    id: 'wpn_m4_carbine',
    name: 'M4A1 Phantom Assault',
    category: 'Assault',
    price: 20000,
    damage: 44,
    fireRateMs: 150,
    magazineSize: 30,
    reloadTimeMs: 1600,
    range: 65,
    bulletSpeed: 68,
    spread: 0.035,
    unlockedByDefault: false,
    color: '#10B981',
    bulletColor: '#34D399',
    description: 'Military-spec assault rifle delivering laser-flat ballistic trajectory and sustained stopping power.',
    soundType: 'rifle',
  },
  {
    id: 'wpn_bulldog_shotgun',
    name: 'SPAS-12 Breacher Shotgun',
    category: 'Shotgun',
    price: 35000,
    damage: 22, // 22 x 6 = 132 damage point blank
    fireRateMs: 650,
    magazineSize: 8,
    reloadTimeMs: 1900,
    range: 28,
    bulletSpeed: 45,
    spread: 0.16,
    pelletsPerShot: 6,
    unlockedByDefault: false,
    color: '#F97316',
    bulletColor: '#FB923C',
    description: 'Devastating close-range scattergun that obliterates rushers and charges in a single thunderous blast.',
    soundType: 'shotgun',
  },
  {
    id: 'wpn_awp_sniper',
    name: 'AWP Sovereign Sniper',
    category: 'Sniper',
    price: 60000,
    damage: 135,
    fireRateMs: 1100,
    magazineSize: 5,
    reloadTimeMs: 2200,
    range: 95,
    bulletSpeed: 95,
    spread: 0.008,
    unlockedByDefault: false,
    color: '#A855F7',
    bulletColor: '#C084FC',
    description: 'High-caliber precision sniper rifle with lethal armor-piercing rounds and extreme kinetic impact.',
    soundType: 'sniper',
  },
  {
    id: 'wpn_plasma_disrupter',
    name: 'Hyperion Plasma Cannon',
    category: 'Energy',
    price: 120000,
    damage: 75,
    fireRateMs: 280,
    magazineSize: 24,
    reloadTimeMs: 1500,
    range: 70,
    bulletSpeed: 60,
    spread: 0.02,
    unlockedByDefault: false,
    color: '#F59E0B',
    bulletColor: '#FBBF24',
    description: 'Futuristic hyper-energy blaster discharging ionized plasma orbs with thermal splash damage.',
    soundType: 'plasma',
  },
];

export interface ShooterMapArena {
  id: string;
  name: string;
  theme: 'neon_city' | 'desert_outpost' | 'stadium_hangar';
  description: string;
  skyColor: string;
  groundColor: string;
  gridColor: string;
  obstacleColor: string;
  accentColor: string;
  coverCount: number;
}

export const SHOOTER_ARENAS: ShooterMapArena[] = [
  {
    id: 'arena_stadium_hangar',
    name: 'All-Star Stadium Arena',
    theme: 'stadium_hangar',
    description: 'Floodlit stadium grounds with tactical barricades, spectator floodlights, and elevated cover blocks.',
    skyColor: '#070A0E',
    groundColor: '#102A1E',
    gridColor: '#10B981',
    obstacleColor: '#1E293B',
    accentColor: '#10B981',
    coverCount: 16,
  },
  {
    id: 'arena_neon_city',
    name: 'Cyberpunk Metropolis Zone',
    theme: 'neon_city',
    description: 'High-tech downtown courtyard bathed in electric cyan lasers and neon billboard reflections.',
    skyColor: '#050711',
    groundColor: '#0B1120',
    gridColor: '#38BDF8',
    obstacleColor: '#1E1B4B',
    accentColor: '#38BDF8',
    coverCount: 18,
  },
  {
    id: 'arena_desert_outpost',
    name: 'Desert Fortress Outpost',
    theme: 'desert_outpost',
    description: 'Sun-baked tactical outpost filled with shipping crates, watchtowers, and flanking choke points.',
    skyColor: '#1C1308',
    groundColor: '#2B1E12',
    gridColor: '#F59E0B',
    obstacleColor: '#382513',
    accentColor: '#F59E0B',
    coverCount: 15,
  },
];
