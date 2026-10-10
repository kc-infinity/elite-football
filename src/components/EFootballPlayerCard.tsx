import React, { useEffect, useState } from 'react';
import {
  Award,
  Check,
  Coins,
  Crown,
  Sparkles,
  Star,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import { FootballPlayer, PlayerRarity } from '../data/gameDatabase';
import { useAppIcon } from '../data/appIconStore';
import { SoundEngine } from '../engine/SoundEngine';
import { PlayerPhotoAvatar } from './PlayerPhotoAvatar';

export interface RarityTheme {
  accent: string;
  secondary: string;
  badgeLabel: string;
  cardSeries: string;
  bgGradient: string;
  borderGlow: string;
  foilGradient: string;
  stars: number;
}

export const EFOOTBALL_RARITY_THEMES: Record<PlayerRarity, RarityTheme> = {
  Legendary: {
    accent: '#F59E0B',
    secondary: '#FDE68A',
    badgeLabel: 'EPIC · BIG TIME',
    cardSeries: 'EPIC LEGEND SERIES',
    bgGradient: 'linear-gradient(155deg, #2A1C05 0%, #120E07 48%, #2E1F06 100%)',
    borderGlow: '0 0 28px rgba(245, 158, 11, 0.45)',
    foilGradient:
      'linear-gradient(125deg, rgba(245,158,11,0.28) 0%, rgba(253,230,138,0.12) 45%, rgba(16,185,129,0.18) 100%)',
    stars: 5,
  },
  'World Class': {
    accent: '#10B981',
    secondary: '#6EE7B7',
    badgeLabel: 'SHOW TIME',
    cardSeries: 'WORLD CLASS SHOW TIME',
    bgGradient: 'linear-gradient(155deg, #06281E 0%, #091318 50%, #072B20 100%)',
    borderGlow: '0 0 24px rgba(16, 185, 129, 0.4)',
    foilGradient:
      'linear-gradient(125deg, rgba(16,185,129,0.26) 0%, rgba(56,189,248,0.14) 50%, rgba(245,158,11,0.15) 100%)',
    stars: 5,
  },
  Elite: {
    accent: '#A855F7',
    secondary: '#D8B4FE',
    badgeLabel: 'HIGHLIGHT',
    cardSeries: 'CLUB SELECTION HIGHLIGHT',
    bgGradient: 'linear-gradient(155deg, #220C3B 0%, #0D0B18 50%, #1F0B36 100%)',
    borderGlow: '0 0 22px rgba(168, 85, 247, 0.38)',
    foilGradient:
      'linear-gradient(125deg, rgba(168,85,247,0.25) 0%, rgba(216,180,254,0.1) 50%, rgba(56,189,248,0.15) 100%)',
    stars: 4,
  },
  Rare: {
    accent: '#38BDF8',
    secondary: '#BAE6FD',
    badgeLabel: 'FEATURED',
    cardSeries: 'FEATURED STANDOUT',
    bgGradient: 'linear-gradient(155deg, #082338 0%, #09111B 50%, #0A253B 100%)',
    borderGlow: '0 0 18px rgba(56, 189, 248, 0.32)',
    foilGradient:
      'linear-gradient(125deg, rgba(56,189,248,0.22) 0%, rgba(186,230,253,0.08) 50%, rgba(16,185,129,0.12) 100%)',
    stars: 4,
  },
  Common: {
    accent: '#94A3B8',
    secondary: '#E2E8F0',
    badgeLabel: 'STANDARD',
    cardSeries: 'STANDARD GP SIGNING',
    bgGradient: 'linear-gradient(155deg, #161F2E 0%, #0B1018 50%, #161F2E 100%)',
    borderGlow: '0 0 14px rgba(148, 163, 184, 0.2)',
    foilGradient:
      'linear-gradient(125deg, rgba(148,163,184,0.16) 0%, rgba(255,255,255,0.05) 50%, rgba(148,163,184,0.12) 100%)',
    stars: 3,
  },
};

function getStatBadgeColor(val: number): string {
  if (val >= 92) return '#F59E0B';
  if (val >= 86) return '#10B981';
  if (val >= 80) return '#38BDF8';
  return '#E2E8F0';
}

interface EFootballPlayerCardProps {
  player: FootballPlayer;
  isOwned?: boolean;
  isLeadStar?: boolean;
  isInStartingXI?: boolean;
  compact?: boolean;
  onInspect?: (player: FootballPlayer) => void;
  footerSlot?: React.ReactNode;
}

/**
 * Authentic eFootball-style foil player card displaying:
 * - OVR Rating, Position, Rarity Foil Tier & Star Rating
 * - Realistic Player Photo with the Player's Name directly below their image
 * - Key Stats with color-coded attribute ratings & mini bars
 */
export const EFootballPlayerCard: React.FC<EFootballPlayerCardProps> = ({
  player,
  isOwned = false,
  isLeadStar = false,
  isInStartingXI = false,
  compact = false,
  onInspect,
  footerSlot,
}) => {
  const { iconUrl } = useAppIcon();
  const theme = EFOOTBALL_RARITY_THEMES[player.rarity] || EFOOTBALL_RARITY_THEMES.Rare;
  const starCount = player.rating >= 90 ? 5 : player.rating >= 85 ? 4 : 3;

  const keyStats = [
    { label: 'PAC', value: player.attributes.pace },
    { label: 'SHO', value: player.attributes.shooting },
    { label: 'PAS', value: player.attributes.passing },
    { label: 'DRI', value: player.attributes.dribbling },
    { label: 'DEF', value: player.attributes.defending },
    { label: 'PHY', value: player.attributes.physical },
  ];

  return (
    <div
      className="relative rounded-2xl overflow-hidden border-2 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 group select-none"
      style={{
        background: theme.bgGradient,
        borderColor: `${theme.accent}88`,
        boxShadow: theme.borderGlow,
      }}
    >
      {/* Foil diagonal sheen overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-75 group-hover:opacity-100 transition-opacity"
        style={{ background: theme.foilGradient }}
      />

      {/* Decorative top corner geometric slash */}
      <div
        className="pointer-events-none absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl opacity-35"
        style={{ backgroundColor: theme.accent }}
      />

      <div className={`relative z-10 ${compact ? 'p-3.5' : 'p-4 sm:p-5'} flex-1 flex flex-col justify-between`}>
        <div>
          {/* Top Header Strip: Series Badge + Stars + Owned Pill */}
          <div className="flex items-center justify-between gap-1.5 mb-2.5">
            <div className="flex items-center gap-1.5">
              <img
                src={iconUrl}
                alt="Crest"
                referrerPolicy="no-referrer"
                className="w-4 h-4 rounded-sm object-contain shrink-0"
              />
              <span
                className="px-2 py-0.5 rounded text-[10px] font-mono font-extrabold tracking-wider uppercase border"
                style={{
                  backgroundColor: `${theme.accent}22`,
                  borderColor: `${theme.accent}66`,
                  color: theme.secondary,
                }}
              >
                {theme.badgeLabel}
              </span>
            </div>

            <div className="flex items-center gap-0.5" title={`${starCount}-Star eFootball Card`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${
                    i < starCount ? 'fill-[#F59E0B] text-[#F59E0B]' : 'text-white/20'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Main Card Hero Area: Left OVR/Pos, Center Photo + Name Directly Below Image, Right Nation/Kit */}
          <div className="grid grid-cols-12 items-center gap-2 my-1">
            {/* Left Column: OVR Rating & Position Badge */}
            <div className="col-span-3 flex flex-col items-start">
              <div className="text-[9px] font-mono uppercase tracking-widest text-slate-300 font-bold">
                OVR
              </div>
              <div
                className={`${
                  compact ? 'text-3xl' : 'text-3xl sm:text-4xl'
                } font-mono font-black leading-none tracking-tight tabular-nums drop-shadow`}
                style={{ color: theme.accent }}
              >
                {player.rating}
              </div>
              <div
                className="mt-1.5 px-2 py-0.5 rounded-md font-mono text-xs font-extrabold text-[#070A0E] shadow"
                style={{ backgroundColor: theme.accent }}
              >
                {player.position}
              </div>
              <div
                className="text-[10px] font-mono font-bold mt-1 leading-tight"
                style={{ color: theme.secondary }}
              >
                {player.rarity}
              </div>
            </div>

            {/* Center Column: Realistic Player Photo + Player Name Directly Below Image */}
            <div
              onClick={() => onInspect && onInspect(player)}
              className={`col-span-6 flex flex-col items-center ${
                onInspect ? 'cursor-pointer' : ''
              }`}
            >
              <div className="relative">
                <div
                  className="absolute -inset-1 rounded-2xl blur-md opacity-60 group-hover:opacity-95 transition-opacity"
                  style={{ backgroundColor: theme.accent }}
                />
                <PlayerPhotoAvatar
                  player={player}
                  className={`${
                    compact ? 'w-16 h-16' : 'w-20 h-20 sm:w-22 sm:h-22'
                  } relative rounded-2xl border-2 shadow-2xl`}
                />
                {isLeadStar && (
                  <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-[#F59E0B] text-[#070A0E] font-mono text-[9px] font-black shadow flex items-center gap-0.5">
                    <Crown className="w-2.5 h-2.5" /> YOU
                  </span>
                )}
              </div>

              {/* Player Name Directly Below Image */}
              <div className="mt-2 w-full text-center">
                <div
                  className="font-display font-extrabold text-sm sm:text-base text-white leading-tight truncate px-1 drop-shadow"
                  title={player.name}
                >
                  {player.name}
                </div>
                <div className="text-[10px] font-mono text-slate-300 truncate mt-0.5">
                  {player.nationality} · #{player.number}
                </div>
              </div>
            </div>

            {/* Right Column: Club, Special Skill & Status */}
            <div className="col-span-3 flex flex-col items-end text-right">
              <div className="px-1.5 py-0.5 rounded bg-black/50 border border-white/15 font-mono text-[10px] font-bold text-white">
                #{player.number}
              </div>
              <div className="text-[10px] text-slate-300 font-semibold mt-1.5 line-clamp-2 leading-tight">
                {player.club}
              </div>
              {isOwned ? (
                <span className="mt-2 px-1.5 py-0.5 rounded bg-[#10B981]/20 border border-[#10B981]/50 text-[#10B981] font-mono text-[9px] font-bold">
                  {isInStartingXI ? 'XI STARTER' : 'OWNED'}
                </span>
              ) : (
                <span className="mt-2 px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono text-[9px]">
                  MARKET
                </span>
              )}
            </div>
          </div>

          {/* Key Stats Matrix (6 Primary eFootball Stats + Curve/Skill Highlight) */}
          <div className="mt-3 pt-2.5 border-t border-white/15">
            <div className="grid grid-cols-3 gap-1.5 font-mono text-xs tabular-nums">
              {keyStats.map((st) => {
                const statColor = getStatBadgeColor(st.value);
                return (
                  <div
                    key={st.label}
                    className="bg-black/45 border border-white/10 rounded-lg px-2 py-1 flex flex-col"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-bold">{st.label}</span>
                      <span className="font-extrabold text-xs" style={{ color: statColor }}>
                        {st.value}
                      </span>
                    </div>
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, Math.max(25, st.value))}%`,
                          backgroundColor: statColor,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {!compact && (
              <div className="mt-2 flex items-center justify-between px-2 py-1 rounded-lg bg-black/35 border border-white/10 font-mono text-[11px] tabular-nums">
                <span className="text-slate-300">
                  CRV <strong className="text-[#F59E0B]">{player.attributes.curve}</strong>
                </span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-300">
                  SKL <strong className="text-[#38BDF8]">{player.attributes.skill}</strong>
                </span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-300">
                  STA <strong className="text-white">{player.attributes.stamina}</strong>
                </span>
                {onInspect && (
                  <button
                    type="button"
                    onClick={() => onInspect(player)}
                    className="text-[10px] text-[#10B981] hover:underline font-bold cursor-pointer"
                  >
                    Full Stats →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Footer Slot */}
        {footerSlot && <div className="mt-3.5 pt-2.5 border-t border-white/10">{footerSlot}</div>}
      </div>
    </div>
  );
};

interface EFootballCardOpeningModalProps {
  isOpen: boolean;
  player: FootballPlayer | null;
  sourceTitle?: string;
  sourceSubtitle?: string;
  skipAnimation?: boolean;
  canSpinAgain?: boolean;
  spinAgainLabel?: string;
  onSpinAgain?: () => void;
  onEquipToSquad?: (player: FootballPlayer) => void;
  onClose: () => void;
}

/**
 * Multi-stage eFootball Spin/Draw & Pack Walkout Reveal Modal:
 * - Stage 1 ('spinning'): Spinning eFootball energy prism & stadium spotlights
 * - Stage 2 ('flare'): Rarity shockwave flare revealing Nation, Position, Star Rating & Tier
 * - Stage 3 ('revealed'): 3D foil card flip revealing Photo, Name below Photo, OVR Rating, Position, Rarity & Key Stats
 */
export const EFootballCardOpeningModal: React.FC<EFootballCardOpeningModalProps> = ({
  isOpen,
  player,
  sourceTitle = 'SPECIAL PLAYER SPIN DRAW',
  sourceSubtitle = 'OFFICIAL EFOOTBALL CONTRACT SIGNING',
  skipAnimation = false,
  canSpinAgain = false,
  spinAgainLabel = 'SPIN AGAIN',
  onSpinAgain,
  onEquipToSquad,
  onClose,
}) => {
  const [stage, setStage] = useState<'spinning' | 'flare' | 'revealed'>('spinning');
  const [equippedSuccess, setEquippedSuccess] = useState(false);
  const { iconUrl } = useAppIcon();

  useEffect(() => {
    if (!isOpen || !player) return;
    setEquippedSuccess(false);

    if (skipAnimation) {
      setStage('revealed');
      SoundEngine.playUIClick();
      return;
    }

    setStage('spinning');
    SoundEngine.playSpinBuildup();

    const t1 = setTimeout(() => {
      setStage('flare');
      SoundEngine.playCardRevealFlare();
    }, 850);

    const t2 = setTimeout(() => {
      setStage('revealed');
      SoundEngine.playPackOpen();
      SoundEngine.playCrowdReaction('cheer');
    }, 1850);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isOpen, player, skipAnimation]);

  if (!isOpen || !player) return null;

  const theme = EFOOTBALL_RARITY_THEMES[player.rarity] || EFOOTBALL_RARITY_THEMES.Rare;
  const starCount = player.rating >= 90 ? 5 : player.rating >= 85 ? 4 : 3;

  return (
    <div className="fixed inset-0 z-50 bg-black/92 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
      {/* Ambient Radial Stadium Spotlight Glow */}
      <div
        className="pointer-events-none fixed inset-0 opacity-35 transition-all duration-700"
        style={{
          background: `radial-gradient(circle at 50% 42%, ${theme.accent}66 0%, transparent 65%)`,
        }}
      />

      {/* STAGE 1: SPINNING ENERGY PRISM & STADIUM TUNNEL */}
      {stage === 'spinning' && (
        <div className="relative z-10 max-w-md w-full text-center py-12 px-6 flex flex-col items-center">
          <div className="text-xs font-mono font-bold tracking-widest uppercase text-[#F59E0B] mb-3 animate-pulse">
            {sourceTitle}
          </div>
          <div className="relative w-44 h-44 flex items-center justify-center my-6">
            <div
              className="absolute inset-0 rounded-full border-4 border-dashed animate-spin"
              style={{ borderColor: `${theme.accent}88`, animationDuration: '2.2s' }}
            />
            <div
              className="absolute inset-4 rounded-full border-2 animate-ping opacity-40"
              style={{ borderColor: theme.accent }}
            />
            <div
              className="w-28 h-36 rounded-2xl border-2 flex flex-col items-center justify-center shadow-2xl animate-bounce p-2"
              style={{
                background: theme.bgGradient,
                borderColor: theme.accent,
                boxShadow: theme.borderGlow,
              }}
            >
              <img
                src={iconUrl}
                alt="App Icon"
                referrerPolicy="no-referrer"
                className="w-14 h-14 object-contain mb-1.5 drop-shadow"
              />
              <span className="font-mono text-[10px] font-bold text-white tracking-widest">
                DRAWING...
              </span>
            </div>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-wide">
            OPENING EFOOTBALL CONTRACT...
          </h2>
          <p className="text-xs text-slate-400 mt-1">{sourceSubtitle}</p>

          <button
            type="button"
            onClick={() => {
              setStage('revealed');
              SoundEngine.playPackOpen();
            }}
            className="mt-6 px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-mono text-slate-300 cursor-pointer"
          >
            Skip Animation →
          </button>
        </div>
      )}

      {/* STAGE 2: RARITY WALKOUT FLARE TEASE (NATION · POSITION · STARS · RARITY) */}
      {stage === 'flare' && (
        <div className="relative z-10 max-w-lg w-full text-center py-12 px-6 flex flex-col items-center animate-in zoom-in-90 duration-300">
          <div
            className="px-4 py-1 rounded-full font-mono text-xs font-extrabold tracking-widest uppercase mb-4 border shadow-lg"
            style={{
              backgroundColor: `${theme.accent}25`,
              borderColor: theme.accent,
              color: theme.secondary,
            }}
          >
            ★ {theme.cardSeries} WALKOUT! ★
          </div>

          {/* 5-Star Row */}
          <div className="flex items-center justify-center gap-2 my-3">
            {Array.from({ length: starCount }).map((_, idx) => (
              <Star
                key={idx}
                className="w-8 h-8 fill-[#F59E0B] text-[#F59E0B] drop-shadow animate-bounce"
                style={{ animationDelay: `${idx * 80}ms` }}
              />
            ))}
          </div>

          <div
            className="font-mono text-6xl sm:text-7xl font-black tracking-tight my-2 drop-shadow-2xl"
            style={{ color: theme.accent }}
          >
            {player.position}
          </div>

          <div className="font-display text-2xl sm:text-3xl font-bold text-white uppercase tracking-wider mt-1">
            {player.nationality}
          </div>
          <div className="text-sm font-mono text-slate-300 mt-1">{player.club}</div>

          <button
            type="button"
            onClick={() => setStage('revealed')}
            className="mt-8 px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-mono text-slate-300 cursor-pointer"
          >
            Reveal Player →
          </button>
        </div>
      )}

      {/* STAGE 3: FULL EFOOTBALL CARD REVEAL & STATS SHOWCASE */}
      {stage === 'revealed' && (
        <div
          className="relative z-10 bg-[#0B1018]/95 border-2 rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl animate-in zoom-in-95 duration-300"
          style={{
            borderColor: theme.accent,
            boxShadow: theme.borderGlow,
          }}
        >
          {/* Top Modal Header */}
          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4 mb-5">
            <div>
              <div
                className="text-xs font-mono font-extrabold tracking-widest uppercase flex items-center gap-1.5"
                style={{ color: theme.accent }}
              >
                <Sparkles className="w-4 h-4" />
                {sourceTitle} · {theme.badgeLabel}
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mt-0.5">
                NEW PLAYER CARD REVEALED!
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Center Layout: Left Authentic eFootball Foil Card, Right Detailed Stats & Actions */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Left 6 Cols: The Revealed eFootball Foil Card */}
            <div className="md:col-span-6">
              <EFootballPlayerCard player={player} isOwned={true} />
            </div>

            {/* Right 6 Cols: Full 10-Attribute Breakdown & Instant Squad Actions */}
            <div className="md:col-span-6 space-y-4">
              <div className="bg-[#070A0E] border border-white/10 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono text-slate-400 font-bold uppercase">
                    EFOOTBALL PLAYER PROFILE
                  </span>
                  <span
                    className="px-2 py-0.5 rounded font-mono text-[10px] font-bold"
                    style={{
                      backgroundColor: `${theme.accent}22`,
                      color: theme.accent,
                    }}
                  >
                    {player.rarity.toUpperCase()}
                  </span>
                </div>

                <div className="font-display text-2xl font-bold text-white leading-tight">
                  {player.name}
                </div>
                <div className="text-xs text-slate-300 mt-0.5">
                  {player.position} · {player.nationality} · {player.club} · Kit #{player.number}
                </div>

                {/* All 10 Attributes with Progress Bars */}
                <div className="mt-4 space-y-2 font-mono text-xs tabular-nums">
                  {[
                    { label: 'Speed & Pace (PAC)', val: player.attributes.pace },
                    { label: 'Finishing & Power (SHO)', val: player.attributes.shooting },
                    { label: 'Playmaking & Pass (PAS)', val: player.attributes.passing },
                    { label: 'Ball Control & Dribble (DRI)', val: player.attributes.dribbling },
                    { label: 'Magnus Curve Spin (CRV)', val: player.attributes.curve },
                    { label: 'Flair & Skill Moves (SKL)', val: player.attributes.skill },
                    { label: 'Defending & Tackle (DEF)', val: player.attributes.defending },
                    { label: 'Physical & Stamina (PHY)', val: player.attributes.physical },
                  ].map((item) => {
                    const barColor = getStatBadgeColor(item.val);
                    return (
                      <div key={item.label}>
                        <div className="flex justify-between text-[11px] mb-0.5">
                          <span className="text-slate-300">{item.label}</span>
                          <span className="font-bold" style={{ color: barColor }}>
                            {item.val}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(100, Math.max(25, item.val))}%`,
                              backgroundColor: barColor,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5">
                {onEquipToSquad && (
                  <button
                    type="button"
                    onClick={() => {
                      SoundEngine.playUIClick();
                      onEquipToSquad(player);
                      setEquippedSuccess(true);
                    }}
                    className={`w-full py-3 rounded-xl font-display font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      equippedSuccess
                        ? 'bg-[#10B981]/25 border border-[#10B981] text-[#10B981]'
                        : 'bg-[#10B981] hover:bg-[#059669] text-[#070A0E] shadow-lg'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    {equippedSuccess
                      ? `${player.name.toUpperCase()} EQUIPPED IN STARTING XI!`
                      : 'EQUIP IN STARTING XI (LEAD STAR)'}
                  </button>
                )}

                <div className="flex items-center gap-2.5">
                  {canSpinAgain && onSpinAgain && (
                    <button
                      type="button"
                      onClick={() => {
                        SoundEngine.playUIClick();
                        onSpinAgain();
                      }}
                      className="flex-1 py-3 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-[#070A0E] font-display font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      {spinAgainLabel}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      SoundEngine.playUIClick();
                      onClose();
                    }}
                    className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-display font-bold text-xs sm:text-sm transition-colors cursor-pointer"
                  >
                    COLLECT CARD
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
