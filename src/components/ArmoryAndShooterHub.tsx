/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Crosshair,
  Shield,
  Zap,
  Check,
  Lock,
  Coins,
  ChevronRight,
  Flame,
  Award,
  Sparkles,
  ArrowRight,
  Smartphone,
  Info,
} from 'lucide-react';
import { WEAPONS_ARMORY, SHOOTER_ARENAS, WeaponItem, ShooterMapArena } from '../data/weaponsDatabase';
import { FootballPlayer } from '../data/gameDatabase';
import { PlayerPhotoAvatar } from './PlayerPhotoAvatar';
import { SoundEngine } from '../engine/SoundEngine';

interface ArmoryAndShooterProps {
  coins: number;
  unlockedPlayerIds: string[];
  userSquad: FootballPlayer[];
  allPlayers: FootballPlayer[];
  unlockedWeaponIds: string[];
  selectedWeaponId: string;
  selectedArenaId: string;
  selectedOperativeId: string;
  weaponUpgradeLevels: Record<string, number>;
  onUnlockWeapon: (weapon: WeaponItem) => void;
  onSelectWeapon: (weaponId: string) => void;
  onUpgradeWeapon: (weaponId: string, cost: number) => void;
  onSelectArena: (arenaId: string) => void;
  onSelectOperative: (playerId: string) => void;
  onLaunchShooterMatch: () => void;
  onGoToMarket: () => void;
}

export const ArmoryAndShooterHub: React.FC<ArmoryAndShooterProps> = ({
  coins,
  unlockedPlayerIds,
  userSquad,
  allPlayers,
  unlockedWeaponIds,
  selectedWeaponId,
  selectedArenaId,
  selectedOperativeId,
  weaponUpgradeLevels,
  onUnlockWeapon,
  onSelectWeapon,
  onUpgradeWeapon,
  onSelectArena,
  onSelectOperative,
  onLaunchShooterMatch,
  onGoToMarket,
}) => {
  const [hubTab, setHubTab] = useState<'weapons' | 'operatives' | 'arenas'>('weapons');
  const [filterCategory, setFilterCategory] = useState<string>('All');

  const selectedWeapon =
    WEAPONS_ARMORY.find((w) => w.id === selectedWeaponId) || WEAPONS_ARMORY[0];
  const selectedArena =
    SHOOTER_ARENAS.find((a) => a.id === selectedArenaId) || SHOOTER_ARENAS[0];
  const selectedOperative =
    allPlayers.find((p) => p.id === selectedOperativeId) || userSquad[0] || allPlayers[0];

  const currentWpnLvl = weaponUpgradeLevels[selectedWeapon.id] || 1;
  const upgradeCost = Math.round(selectedWeapon.price * 0.4 + currentWpnLvl * 4500);
  const maxLevel = 5;
  const canUpgrade = currentWpnLvl < maxLevel && coins >= upgradeCost;

  const filteredWeapons = WEAPONS_ARMORY.filter((w) => {
    if (filterCategory === 'All') return true;
    return w.category === filterCategory;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Mobile-Optimized Shooter Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border-2 border-[#EF4444]/60 bg-gradient-to-br from-[#1A0A0A] via-[#0D0F18] to-[#070A0E] p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 font-mono text-xs font-bold tracking-wider uppercase">
              <Crosshair className="w-4 h-4 animate-pulse" />
              SMOOTH 3D MOBILE SHOOTER · TACTICAL ARENA
            </div>
            <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
              WORLD STRIKE <span className="text-red-500">OPERATIONS</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Deploy your authentic unlocked players into fast, smooth 3D tactical shootouts on mobile phones. Earn bounties of <span className="text-[#F59E0B] font-bold">Coins</span> for every hit, headshot, and victory to unlock rare weapons, stat upgrades, and elite superstars!
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-black/60 border border-white/10 text-xs font-mono text-slate-300">
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Dual Virtual Joystick + Instant Aim & Tap</span>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-black/60 border border-white/10 text-xs font-mono text-slate-300">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>+5,000 to +15,000 Coins / Match Victory</span>
              </div>
            </div>
          </div>

          {/* Quick Match Launch Card */}
          <div className="w-full lg:w-80 shrink-0 bg-[#0F1420]/90 backdrop-blur-md border border-white/15 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="text-xs font-mono text-slate-400 flex items-center justify-between">
              <span>SELECTED LOADOUT</span>
              <span className="text-emerald-400 font-bold">READY TO PLAY</span>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-black/40 border border-white/10">
              <PlayerPhotoAvatar player={selectedOperative} className="w-14 h-14 rounded-xl border border-white/20 shrink-0" />
              <div className="min-w-0">
                <div className="font-display font-bold text-sm text-white truncate">
                  {selectedOperative.name}
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  {selectedOperative.position} · {selectedOperative.nationality}
                </div>
                <div className="text-[11px] font-mono text-emerald-400 font-semibold">
                  SPD {selectedOperative.attributes.pace} · PHY {selectedOperative.attributes.physical}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-mono px-1">
              <span className="text-slate-400">Weapon:</span>
              <span className="text-amber-400 font-bold truncate max-w-[170px]">
                {selectedWeapon.name} (Lvl {currentWpnLvl})
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono px-1">
              <span className="text-slate-400">Battle Arena:</span>
              <span className="text-cyan-400 font-bold truncate max-w-[170px]">
                {selectedArena.name}
              </span>
            </div>

            <button
              onClick={() => {
                SoundEngine.playGunshot('rifle');
                onLaunchShooterMatch();
              }}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-display font-black text-sm tracking-wide shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Crosshair className="w-4 h-4 animate-spin" />
              START SHOOTING MATCH
            </button>
          </div>
        </div>
      </div>

      {/* Armory Navigation Tabs */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3 overflow-x-auto">
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              SoundEngine.playUIClick();
              setHubTab('weapons');
            }}
            className={`px-4 py-2 rounded-xl font-display font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2 ${
              hubTab === 'weapons'
                ? 'bg-red-500 text-white shadow-md shadow-red-500/20'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            <Crosshair className="w-4 h-4" />
            WEAPONS ARMORY ({WEAPONS_ARMORY.length})
          </button>
          <button
            onClick={() => {
              SoundEngine.playUIClick();
              setHubTab('operatives');
            }}
            className={`px-4 py-2 rounded-xl font-display font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2 ${
              hubTab === 'operatives'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            OPERATIVES & SQUAD ({unlockedPlayerIds.length} OWNED)
          </button>
          <button
            onClick={() => {
              SoundEngine.playUIClick();
              setHubTab('arenas');
            }}
            className={`px-4 py-2 rounded-xl font-display font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2 ${
              hubTab === 'arenas'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-black'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-4 h-4" />
            TACTICAL ARENAS ({SHOOTER_ARENAS.length})
          </button>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs font-bold text-amber-400 shrink-0">
          <Coins className="w-4 h-4" />
          <span>{coins.toLocaleString()} COINS</span>
        </div>
      </div>

      {/* TAB 1: WEAPONS ARMORY & UPGRADES */}
      {hubTab === 'weapons' && (
        <div className="space-y-6">
          {/* Category filter pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {['All', 'Pistol', 'SMG', 'Assault', 'Shotgun', 'Sniper', 'Energy'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer shrink-0 ${
                  filterCategory === cat
                    ? 'bg-white text-slate-950 shadow'
                    : 'bg-[#111722] text-slate-400 hover:text-white border border-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredWeapons.map((wpn) => {
              const isUnlocked = unlockedWeaponIds.includes(wpn.id);
              const isSelected = selectedWeaponId === wpn.id;
              const lvl = weaponUpgradeLevels[wpn.id] || 1;
              const effectiveDmg = Math.round(wpn.damage * (1 + (lvl - 1) * 0.18));
              const effectiveMag = wpn.magazineSize + (lvl - 1) * 3;
              const canAffordUnlock = coins >= wpn.price;

              return (
                <div
                  key={wpn.id}
                  className={`relative rounded-2xl border-2 p-5 flex flex-col justify-between transition-all ${
                    isSelected
                      ? 'border-red-500 bg-gradient-to-b from-[#1C0D0D] to-[#0F1420] shadow-xl shadow-red-500/20'
                      : isUnlocked
                      ? 'border-white/15 bg-[#0F1420] hover:border-white/30'
                      : 'border-white/10 bg-[#0A0D14]/70 opacity-90'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider"
                        style={{ backgroundColor: `${wpn.color}22`, color: wpn.color }}
                      >
                        {wpn.category}
                      </span>
                      {isSelected && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500 text-white font-mono text-[10px] font-bold">
                          <Check className="w-3 h-3" /> EQUIPPED
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="font-display font-bold text-lg text-white">{wpn.name}</h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{wpn.description}</p>
                    </div>

                    {/* Weapon Stat Gauges */}
                    <div className="space-y-2 pt-2 border-t border-white/10 text-xs font-mono">
                      <div>
                        <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                          <span>Damage</span>
                          <span className="text-white font-bold">{effectiveDmg} DMG</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-red-500 transition-all"
                            style={{ width: `${Math.min(100, (effectiveDmg / 140) * 100)}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                          <span>Fire Rate</span>
                          <span className="text-white font-bold">{(1000 / wpn.fireRateMs).toFixed(1)} rps</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-400 transition-all"
                            style={{ width: `${Math.min(100, (1000 / wpn.fireRateMs / 10) * 100)}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                          <span>Magazine & Reload</span>
                          <span className="text-white font-bold">{effectiveMag} rounds · {(wpn.reloadTimeMs / 1000).toFixed(1)}s</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-cyan-400 transition-all"
                            style={{ width: `${Math.min(100, (effectiveMag / 40) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Weapon Action Footer */}
                  <div className="pt-4 mt-3 border-t border-white/10 space-y-2">
                    {isUnlocked ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            SoundEngine.playGunshot(wpn.soundType);
                            onSelectWeapon(wpn.id);
                          }}
                          className={`flex-1 py-2.5 rounded-xl font-display font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            isSelected
                              ? 'bg-red-500 text-white font-black'
                              : 'bg-white/10 hover:bg-white/20 text-white'
                          }`}
                        >
                          <Crosshair className="w-3.5 h-3.5" />
                          {isSelected ? 'ACTIVE WEAPON' : 'EQUIP WEAPON'}
                        </button>

                        {lvl < maxLevel && (
                          <button
                            disabled={coins < Math.round(wpn.price * 0.4 + lvl * 4500)}
                            onClick={() => {
                              onUpgradeWeapon(wpn.id, Math.round(wpn.price * 0.4 + lvl * 4500));
                              SoundEngine.playBallOpeningTick();
                            }}
                            className="px-3 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-mono font-bold text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer shrink-0"
                            title={`Upgrade to Level ${lvl + 1}`}
                          >
                            <Zap className="w-3 h-3 text-amber-400" />
                            +Lvl {lvl + 1}
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        disabled={!canAffordUnlock}
                        onClick={() => {
                          onUnlockWeapon(wpn);
                          SoundEngine.playBallCrackExplosion();
                        }}
                        className={`w-full py-2.5 rounded-xl font-display font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                          canAffordUnlock
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-md'
                            : 'bg-white/5 border border-white/15 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <Coins className="w-3.5 h-3.5" />
                        UNLOCK FOR {wpn.price.toLocaleString()} COINS
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: OPERATIVES & SQUAD */}
      {hubTab === 'operatives' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#0F1420] border border-white/15">
            <div>
              <div className="text-xs font-mono text-emerald-400 font-bold uppercase">
                AUTHENTIC FOOTBALL OPERATIVES
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Each player brings their authentic face image, speed (Pace), armor (Physical), and agility to the shooting battlefield.
              </p>
            </div>
            <button
              onClick={() => {
                SoundEngine.playUIClick();
                onGoToMarket();
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-display font-bold text-xs hover:brightness-110 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-md"
            >
              <Coins className="w-3.5 h-3.5" />
              BUY MORE STARS IN MARKET
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
            {allPlayers
              .filter((p) => unlockedPlayerIds.includes(p.id))
              .slice(0, 48)
              .map((p) => {
                const isSelected = selectedOperativeId === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      SoundEngine.playUIClick();
                      onSelectOperative(p.id);
                    }}
                    className={`group relative rounded-xl border-2 p-3 flex flex-col items-center text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-gradient-to-b from-[#0F281E] to-[#070A0E] shadow-lg shadow-emerald-500/20'
                        : 'border-white/10 bg-[#0F1420] hover:border-white/25 hover:bg-[#151D2C]'
                    }`}
                  >
                    <div className="relative mb-2">
                      <PlayerPhotoAvatar
                        player={p}
                        className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl border border-white/20"
                        showPositionBadge
                      />
                      {isSelected && (
                        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-xs shadow">
                          ✓
                        </div>
                      )}
                    </div>

                    <div className="font-display font-bold text-xs text-white truncate w-full">
                      {p.name}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 truncate w-full">
                      {p.club}
                    </div>

                    <div className="flex items-center justify-center gap-2 mt-2 pt-1.5 border-t border-white/10 w-full text-[10px] font-mono">
                      <span className="text-emerald-400 font-bold">SPD {p.attributes.pace}</span>
                      <span className="text-amber-400 font-bold">HP {100 + Math.round((p.attributes.physical - 70) * 1.5)}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 3: TACTICAL ARENAS */}
      {hubTab === 'arenas' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SHOOTER_ARENAS.map((arena) => {
            const isSelected = selectedArenaId === arena.id;
            return (
              <div
                key={arena.id}
                onClick={() => {
                  SoundEngine.playUIClick();
                  onSelectArena(arena.id);
                }}
                className={`group rounded-2xl border-2 p-6 flex flex-col justify-between transition-all cursor-pointer ${
                  isSelected
                    ? 'border-cyan-400 bg-gradient-to-b from-[#0D2438] to-[#070A0E] shadow-xl shadow-cyan-400/20'
                    : 'border-white/15 bg-[#0F1420] hover:border-white/30'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider"
                      style={{ backgroundColor: `${arena.accentColor}22`, color: arena.accentColor }}
                    >
                      3D COMBAT ZONE
                    </span>
                    {isSelected && (
                      <span className="text-cyan-400 font-mono text-xs font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> ACTIVE
                      </span>
                    )}
                  </div>

                  <h3 className="font-display text-xl font-bold text-white">{arena.name}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{arena.description}</p>
                </div>

                <div className="pt-4 mt-6 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">{arena.coverCount} Barricades & Chokepoints</span>
                  <button
                    className={`px-3.5 py-1.5 rounded-lg font-display font-bold text-xs ${
                      isSelected ? 'bg-cyan-400 text-slate-950 font-black' : 'bg-white/10 text-white'
                    }`}
                  >
                    {isSelected ? 'SELECTED' : 'SELECT MAP'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
