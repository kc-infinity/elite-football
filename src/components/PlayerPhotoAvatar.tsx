import React, { useEffect, useState } from 'react';
import { FootballPlayer, PlayerRarity, PositionCode } from '../data/gameDatabase';
import { fetchLivePlayerPhotoFallback, getPlayerPhotoUrl } from '../data/playerPhotos';

export const EFOOTBALL_ROLE_COLORS: Record<PositionCode, string> = {
  GK: '#F59E0B',
  LB: '#38BDF8',
  CB: '#38BDF8',
  RB: '#38BDF8',
  CDM: '#10B981',
  CM: '#10B981',
  CAM: '#10B981',
  LW: '#F43F5E',
  RW: '#F43F5E',
  ST: '#F43F5E',
};

export const RARITY_BORDER_COLORS: Record<PlayerRarity, string> = {
  Common: '#94A3B8',
  Rare: '#38BDF8',
  Elite: '#A855F7',
  'World Class': '#10B981',
  Legendary: '#F59E0B',
};

interface PlayerPhotoAvatarProps {
  player: Pick<FootballPlayer, 'id' | 'name' | 'position' | 'rating'> &
    Partial<Pick<FootballPlayer, 'rarity' | 'skinTone' | 'hairColor' | 'number'>>;
  className?: string;
  imgClassName?: string;
  showRatingBadge?: boolean;
  showPositionBadge?: boolean;
}

export const PlayerPhotoAvatar: React.FC<PlayerPhotoAvatarProps> = ({
  player,
  className = 'w-14 h-14 rounded-xl',
  imgClassName = 'w-full h-full object-cover object-top',
  showRatingBadge = false,
  showPositionBadge = false,
}) => {
  const initialUrl = getPlayerPhotoUrl(player);
  const [src, setSrc] = useState<string>(initialUrl);
  const [triedThumbHost, setTriedThumbHost] = useState(false);
  const [triedLiveApi, setTriedLiveApi] = useState(false);
  const [imgFailed, setImgFailed] = useState(!initialUrl);

  useEffect(() => {
    const nextUrl = getPlayerPhotoUrl(player);
    setSrc(nextUrl);
    setTriedThumbHost(false);
    setTriedLiveApi(false);
    setImgFailed(!nextUrl);
  }, [player.id, player.name]);

  const handleError = () => {
    if (!triedThumbHost && src.includes('upload.wikimedia.org')) {
      setTriedThumbHost(true);
      setSrc(src.replace('https://upload.wikimedia.org/', 'https://thumb.wikimedia.org/'));
      return;
    }
    if (!triedLiveApi) {
      setTriedLiveApi(true);
      fetchLivePlayerPhotoFallback(player.name).then((liveUrl) => {
        if (liveUrl && liveUrl !== src) {
          setSrc(liveUrl);
          setImgFailed(false);
        } else {
          setImgFailed(true);
        }
      });
      return;
    }
    setImgFailed(true);
  };

  const roleColor = EFOOTBALL_ROLE_COLORS[player.position] || '#10B981';
  const skin = player.skinTone || '#e0ac69';
  const hair = player.hairColor || '#18181b';

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-b from-[#1E293B] via-[#0F172A] to-[#070A0E] select-none shrink-0 ${className}`}
      title={`${player.name} (${player.position} · OVR ${player.rating})`}
    >
      {/* Subtle eFootball metallic radial glow */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 25%, ${roleColor}55, transparent 70%)`,
        }}
      />

      {!imgFailed && src ? (
        <img
          src={src}
          alt={player.name}
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={handleError}
          className={`relative z-10 ${imgClassName}`}
        />
      ) : (
        /* Realistic fallback portrait silhouette if offline */
        <svg
          viewBox="0 0 80 80"
          className="relative z-10 w-full h-full"
          aria-label={player.name}
        >
          <defs>
            <linearGradient id={`kit_${player.id}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={roleColor} />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
          </defs>
          <path d="M12 80 C14 58, 66 58, 68 80 Z" fill={`url(#kit_${player.id})`} />
          <rect x="33" y="45" width="14" height="14" rx="4" fill={skin} />
          <ellipse cx="40" cy="33" rx="15" ry="17" fill={skin} />
          <path d="M25 30 C25 14, 55 14, 55 30 C52 21, 28 21, 25 30 Z" fill={hair} />
          <circle cx="34" cy="33" r="1.8" fill="#0f172a" />
          <circle cx="46" cy="33" r="1.8" fill="#0f172a" />
          <path d="M35 41 Q40 44 45 41" stroke="#0f172a" strokeWidth="1.6" fill="none" />
        </svg>
      )}

      {showPositionBadge && (
        <span
          className="absolute top-1 left-1 z-20 px-1 py-0.2 rounded text-[9px] font-mono font-bold leading-tight text-[#070A0E] shadow"
          style={{ backgroundColor: roleColor }}
        >
          {player.position}
        </span>
      )}

      {showRatingBadge && (
        <span className="absolute bottom-1 right-1 z-20 px-1 py-0.2 rounded bg-black/85 border border-white/20 text-[10px] font-mono font-bold leading-tight text-[#F59E0B] shadow">
          {player.rating}
        </span>
      )}
    </div>
  );
};

interface EFootballPitchPlayerCardProps {
  player: FootballPlayer;
  slotLabel: string;
  isSelected?: boolean;
  isCaptain?: boolean;
  compact?: boolean;
}

/**
 * Authentic eFootball PES Game Plan Pitch Card:
 * Replaces text player names on the squad pitch with each player's original,
 * realistic face photo, position role badge, captain armband, and OVR rating.
 */
export const EFootballPitchPlayerCard: React.FC<EFootballPitchPlayerCardProps> = ({
  player,
  slotLabel,
  isSelected = false,
  isCaptain = false,
  compact = false,
}) => {
  const roleColor = EFOOTBALL_ROLE_COLORS[player.position] || '#10B981';
  const rarityColor = RARITY_BORDER_COLORS[player.rarity] || '#10B981';

  if (compact) {
    return (
      <div
        className="flex flex-col items-center select-none"
        title={`${player.name} (${slotLabel} · OVR ${player.rating})`}
      >
        <div
          className={`relative rounded-xl overflow-hidden bg-[#070A0E]/95 border-2 shadow-lg transition-all ${
            isSelected
              ? 'border-[#F59E0B] ring-2 ring-[#F59E0B]/60 scale-105'
              : 'border-white/30 hover:border-white/70'
          } w-10 h-10 sm:w-11 sm:h-11`}
        >
          <PlayerPhotoAvatar
            player={player}
            className="w-full h-full"
            imgClassName="w-full h-full object-cover object-top"
          />
          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-1 py-0.5 bg-gradient-to-b from-black/85 via-black/45 to-transparent">
            <span
              className="text-[7px] font-mono font-extrabold leading-none"
              style={{ color: roleColor }}
            >
              {slotLabel}
            </span>
            <span className="text-[8px] font-mono font-extrabold leading-none text-[#F59E0B]">
              {player.rating}
            </span>
          </div>
          {isCaptain && (
            <span className="absolute bottom-0.5 left-0.5 z-20 px-1 rounded bg-[#F59E0B] text-[#070A0E] font-mono text-[6px] font-extrabold leading-tight">
              C
            </span>
          )}
        </div>
        <div className="mt-0.5 px-1.5 py-0.2 rounded bg-black/85 border border-white/15 max-w-[70px] text-center shadow">
          <div className="text-[8px] font-sans font-bold text-white truncate leading-tight">
            {player.name}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center select-none"
      title={`${player.name} (${slotLabel} · OVR ${player.rating})`}
    >
      <div
        className={`relative rounded-xl overflow-hidden bg-[#070A0E]/95 backdrop-blur-md border-2 shadow-xl transition-all ${
          isSelected
            ? 'border-[#F59E0B] ring-2 ring-[#F59E0B]/60'
            : 'border-white/30 hover:border-[#10B981]'
        } w-[56px] h-[62px] sm:w-[64px] sm:h-[70px]`}
        style={{
          boxShadow: isSelected
            ? '0 0 16px rgba(245, 158, 11, 0.55)'
            : `0 6px 16px -4px rgba(0,0,0,0.75), inset 0 0 0 1px ${rarityColor}33`,
        }}
      >
        {/* Realistic Original Player Face Photo */}
        <PlayerPhotoAvatar
          player={player}
          className="w-full h-full"
          imgClassName="w-full h-full object-cover object-top"
        />

        {/* Top eFootball Role & Captain Strip */}
        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-1.5 pt-1 pb-2 bg-gradient-to-b from-black/85 via-black/40 to-transparent">
          <span
            className="px-1 py-0.2 rounded text-[8px] font-mono font-extrabold leading-none text-[#070A0E] shadow"
            style={{ backgroundColor: roleColor }}
          >
            {slotLabel}
          </span>
          {isCaptain && (
            <span className="px-1 py-0.2 rounded bg-[#F59E0B] text-[#070A0E] font-mono text-[8px] font-extrabold leading-none shadow">
              C
            </span>
          )}
        </div>

        {/* Bottom eFootball Rating Bar */}
        <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between px-1.5 py-0.5 bg-gradient-to-t from-black/95 via-black/75 to-transparent">
          <span className="text-[8px] font-mono text-slate-300 font-bold leading-none">
            #{player.number}
          </span>
          <span
            className="font-mono text-[11px] sm:text-xs font-extrabold leading-none tabular-nums drop-shadow"
            style={{ color: player.rating >= 94 ? '#F59E0B' : '#FFFFFF' }}
          >
            {player.rating}
          </span>
        </div>
      </div>

      {/* Player's Name Directly Below Their Image */}
      <div
        className={`mt-1 px-1.5 py-0.5 rounded-md bg-[#070A0E]/90 border text-center shadow-md max-w-[88px] sm:max-w-[98px] ${
          isSelected ? 'border-[#F59E0B] text-[#F59E0B]' : 'border-white/20 text-white'
        }`}
      >
        <div className="text-[9px] sm:text-[10px] font-sans font-bold truncate leading-tight">
          {player.name}
        </div>
      </div>
    </div>
  );
};
