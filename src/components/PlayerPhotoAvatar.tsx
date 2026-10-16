import React, { useState } from 'react';
import { FootballPlayer } from '../data/gameDatabase';
import { getPlayerPhotoUrl } from '../data/playerPhotos';

const RARITY_ACCENT: Record<string, string> = {
  Common: '#94A3B8',
  Rare: '#38BDF8',
  Elite: '#A855F7',
  'World Class': '#10B981',
  Legendary: '#F59E0B',
  'Special Edition': '#EC4899',
};

const NATION_JERSEY: Record<string, { primary: string; secondary: string; collar: string }> = {
  Argentina: { primary: '#38BDF8', secondary: '#FFFFFF', collar: '#09090B' },
  Portugal: { primary: '#DC2626', secondary: '#15803D', collar: '#FBBF24' },
  France: { primary: '#1E3A8A', secondary: '#DC2626', collar: '#FBBF24' },
  Brazil: { primary: '#FACC15', secondary: '#16A34A', collar: '#1E3A8A' },
  Norway: { primary: '#DC2626', secondary: '#1E3A8A', collar: '#FFFFFF' },
  England: { primary: '#F8FAFC', secondary: '#1E3A8A', collar: '#DC2626' },
  Spain: { primary: '#DC2626', secondary: '#FACC15', collar: '#1E3A8A' },
  Germany: { primary: '#F8FAFC', secondary: '#09090B', collar: '#EAB308' },
  Egypt: { primary: '#B91C1C', secondary: '#09090B', collar: '#FFFFFF' },
  Belgium: { primary: '#991B1B', secondary: '#09090B', collar: '#FACC15' },
  Netherlands: { primary: '#F97316', secondary: '#1E3A8A', collar: '#FFFFFF' },
  Croatia: { primary: '#EF4444', secondary: '#FFFFFF', collar: '#1D4ED8' },
  Uruguay: { primary: '#60A5FA', secondary: '#09090B', collar: '#FFFFFF' },
  Morocco: { primary: '#DC2626', secondary: '#15803D', collar: '#FACC15' },
  Japan: { primary: '#1D4ED8', secondary: '#FFFFFF', collar: '#EC4899' },
  'South Korea': { primary: '#E11D48', secondary: '#09090B', collar: '#FFFFFF' },
};

function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export interface PlayerLikenessProfile {
  archetype:
    | 'ronaldo'
    | 'messi'
    | 'mbappe'
    | 'neymar'
    | 'haaland'
    | 'bellingham'
    | 'vinicius'
    | 'salah'
    | 'debruyne'
    | 'modric'
    | 'vandijk'
    | 'yamal'
    | 'kane'
    | 'benzema'
    | 'custom';
  faceWidth: number;
  jawWidth: number;
  chinLength: number;
  eyeColor: string;
  browThickness: number;
  browArch: number;
  beardStyle: 'none' | 'stubble' | 'goatee' | 'full_trimmed' | 'full_thick' | 'mustache_soul';
  hairStyle:
    | 'cr7_quiff'
    | 'messi_swept'
    | 'mbappe_buzz'
    | 'neymar_curls'
    | 'haaland_long_band'
    | 'bellingham_taper'
    | 'vini_twists'
    | 'salah_afro'
    | 'kdb_swept'
    | 'modric_locks'
    | 'vandijk_bun'
    | 'yamal_curls'
    | 'short_crop'
    | 'textured_fringe'
    | 'afro_fade'
    | 'slick_back'
    | 'wavy_part';
  hasEarring?: boolean;
  hasHeadband?: boolean;
  smileIntensity: number;
}

export function getPlayerLikenessProfile(player: FootballPlayer): PlayerLikenessProfile {
  const n = player.name.toLowerCase();
  const seed = hashSeed(player.id + player.name);

  if (n.includes('ronaldo')) {
    return {
      archetype: 'ronaldo',
      faceWidth: 23,
      jawWidth: 19,
      chinLength: 31,
      eyeColor: '#3B2314',
      browThickness: 3.1,
      browArch: -2.2,
      beardStyle: 'none',
      hairStyle: 'cr7_quiff',
      hasEarring: true,
      smileIntensity: 0.4,
    };
  }
  if (n.includes('messi')) {
    return {
      archetype: 'messi',
      faceWidth: 23.5,
      jawWidth: 19.5,
      chinLength: 29.5,
      eyeColor: '#3B2314',
      browThickness: 2.6,
      browArch: -1.0,
      beardStyle: 'full_trimmed',
      hairStyle: 'messi_swept',
      smileIntensity: 0.6,
    };
  }
  if (n.includes('mbapp')) {
    return {
      archetype: 'mbappe',
      faceWidth: 24,
      jawWidth: 20,
      chinLength: 29,
      eyeColor: '#1E130C',
      browThickness: 2.9,
      browArch: -1.5,
      beardStyle: 'goatee',
      hairStyle: 'mbappe_buzz',
      smileIntensity: 0.9,
    };
  }
  if (n.includes('neymar')) {
    return {
      archetype: 'neymar',
      faceWidth: 22.5,
      jawWidth: 18,
      chinLength: 30,
      eyeColor: '#4A3520',
      browThickness: 2.5,
      browArch: -1.8,
      beardStyle: 'goatee',
      hairStyle: 'neymar_curls',
      hasEarring: true,
      smileIntensity: 0.75,
    };
  }
  if (n.includes('haaland')) {
    return {
      archetype: 'haaland',
      faceWidth: 25,
      jawWidth: 22,
      chinLength: 31,
      eyeColor: '#38BDF8',
      browThickness: 2.4,
      browArch: -2.4,
      beardStyle: 'none',
      hairStyle: 'haaland_long_band',
      hasHeadband: true,
      smileIntensity: 0.35,
    };
  }
  if (n.includes('bellingham')) {
    return {
      archetype: 'bellingham',
      faceWidth: 23.2,
      jawWidth: 19.2,
      chinLength: 30.2,
      eyeColor: '#291810',
      browThickness: 2.8,
      browArch: -1.6,
      beardStyle: 'stubble',
      hairStyle: 'bellingham_taper',
      smileIntensity: 0.85,
    };
  }
  if (n.includes('vinícius') || n.includes('vinicius')) {
    return {
      archetype: 'vinicius',
      faceWidth: 23.5,
      jawWidth: 19.5,
      chinLength: 29.5,
      eyeColor: '#1F130B',
      browThickness: 2.8,
      browArch: -1.4,
      beardStyle: 'goatee',
      hairStyle: 'vini_twists',
      hasEarring: true,
      smileIntensity: 1.0,
    };
  }
  if (n.includes('salah')) {
    return {
      archetype: 'salah',
      faceWidth: 23,
      jawWidth: 19,
      chinLength: 30,
      eyeColor: '#2B1B10',
      browThickness: 3.0,
      browArch: -1.5,
      beardStyle: 'full_thick',
      hairStyle: 'salah_afro',
      smileIntensity: 0.9,
    };
  }
  if (n.includes('de bruyne')) {
    return {
      archetype: 'debruyne',
      faceWidth: 24,
      jawWidth: 20,
      chinLength: 30,
      eyeColor: '#38BDF8',
      browThickness: 2.3,
      browArch: -1.2,
      beardStyle: 'full_trimmed',
      hairStyle: 'kdb_swept',
      smileIntensity: 0.3,
    };
  }
  if (n.includes('modri')) {
    return {
      archetype: 'modric',
      faceWidth: 21.8,
      jawWidth: 17.5,
      chinLength: 30,
      eyeColor: '#475569',
      browThickness: 2.2,
      browArch: -1.2,
      beardStyle: 'stubble',
      hairStyle: 'modric_locks',
      hasHeadband: true,
      smileIntensity: 0.45,
    };
  }
  if (n.includes('van dijk')) {
    return {
      archetype: 'vandijk',
      faceWidth: 24.8,
      jawWidth: 21.2,
      chinLength: 31,
      eyeColor: '#2B1B10',
      browThickness: 3.0,
      browArch: -1.8,
      beardStyle: 'goatee',
      hairStyle: 'vandijk_bun',
      smileIntensity: 0.35,
    };
  }
  if (n.includes('yamal')) {
    return {
      archetype: 'yamal',
      faceWidth: 22.2,
      jawWidth: 17.8,
      chinLength: 29,
      eyeColor: '#23150C',
      browThickness: 2.6,
      browArch: -1.2,
      beardStyle: 'none',
      hairStyle: 'yamal_curls',
      smileIntensity: 0.95,
    };
  }
  if (n.includes('benzema')) {
    return {
      archetype: 'benzema',
      faceWidth: 24.2,
      jawWidth: 20.5,
      chinLength: 30.5,
      eyeColor: '#2E1E12',
      browThickness: 2.9,
      browArch: -1.7,
      beardStyle: 'full_thick',
      hairStyle: 'mbappe_buzz',
      smileIntensity: 0.5,
    };
  }
  if (n.includes('kane')) {
    return {
      archetype: 'kane',
      faceWidth: 23.6,
      jawWidth: 19.8,
      chinLength: 31,
      eyeColor: '#3B82F6',
      browThickness: 2.5,
      browArch: -1.3,
      beardStyle: 'full_trimmed',
      hairStyle: 'slick_back',
      smileIntensity: 0.5,
    };
  }

  const hairStyles: PlayerLikenessProfile['hairStyle'][] = [
    'short_crop',
    'textured_fringe',
    'afro_fade',
    'slick_back',
    'wavy_part',
    'bellingham_taper',
    'vini_twists',
    'cr7_quiff',
  ];
  const beardStyles: PlayerLikenessProfile['beardStyle'][] = [
    'none',
    'stubble',
    'goatee',
    'full_trimmed',
    'mustache_soul',
  ];
  const eyeColors = ['#2B1B10', '#3E2723', '#1E293B', '#0284C7', '#15803D', '#4A3520'];

  return {
    archetype: 'custom',
    faceWidth: 22.2 + (seed % 30) * 0.1,
    jawWidth: 18.0 + ((seed >> 3) % 30) * 0.1,
    chinLength: 28.8 + ((seed >> 6) % 25) * 0.1,
    eyeColor: eyeColors[seed % eyeColors.length],
    browThickness: 2.3 + ((seed >> 4) % 9) * 0.1,
    browArch: -1.0 - ((seed >> 5) % 14) * 0.1,
    beardStyle: beardStyles[(seed >> 2) % beardStyles.length],
    hairStyle: hairStyles[seed % hairStyles.length],
    hasEarring: seed % 7 === 0,
    hasHeadband: seed % 13 === 0,
    smileIntensity: 0.35 + ((seed >> 7) % 60) * 0.01,
  };
}

interface PlayerPhotoAvatarProps {
  player: FootballPlayer;
  className?: string;
  showRatingBadge?: boolean;
  showPositionBadge?: boolean;
}

export const PlayerPhotoAvatar: React.FC<PlayerPhotoAvatarProps> = ({
  player,
  className = 'w-14 h-14 rounded-xl',
  showRatingBadge = false,
  showPositionBadge = false,
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const photoUrl = getPlayerPhotoUrl(player);
  const accent = RARITY_ACCENT[player.rarity] || '#10B981';
  const likeness = getPlayerLikenessProfile(player);
  const kit = NATION_JERSEY[player.nationality] || {
    primary: accent,
    secondary: '#FFFFFF',
    collar: '#09090B',
  };
  const uid = player.id.replace(/[^a-zA-Z0-9]/g, '');

  const fw = likeness.faceWidth;
  const jw = likeness.jawWidth;
  const cl = likeness.chinLength;
  const hairCol =
    likeness.archetype === 'neymar'
      ? '#EAB308'
      : likeness.archetype === 'haaland' || likeness.archetype === 'modric'
      ? '#FDE047'
      : likeness.archetype === 'debruyne'
      ? '#D97706'
      : player.hairColor || '#111827';

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-b from-[#1E293B] via-[#0F172A] to-[#070A0E] select-none shrink-0 ${className}`}
    >
      {/* Realistic Bespoke Vector Portrait Layer (Always rendered underneath & as primary likeness) */}
      <svg
        viewBox="0 0 120 120"
        className="absolute inset-0 w-full h-full object-cover"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={`bg_${uid}`} cx="50%" cy="34%" r="68%">
            <stop offset="0%" stopColor={accent} stopOpacity="0.48" />
            <stop offset="65%" stopColor="#0F172A" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#070A0E" stopOpacity="1" />
          </radialGradient>
          <linearGradient id={`skin_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={player.skinTone} />
            <stop offset="60%" stopColor={player.skinTone} />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.28" />
          </linearGradient>
          <linearGradient id={`kit_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={kit.primary} />
            <stop offset="100%" stopColor="#090D16" />
          </linearGradient>
        </defs>

        {/* Stadium Floodlight Halo Backdrop */}
        <rect width="120" height="120" fill={`url(#bg_${uid})`} />
        <circle cx="22" cy="18" r="14" fill="#FFFFFF" opacity="0.06" />
        <circle cx="98" cy="18" r="14" fill={accent} opacity="0.09" />

        {/* Muscular Neck & Trapezius */}
        <path
          d="M46 66 L44 92 L76 92 L74 66 Z"
          fill={player.skinTone}
        />
        <path
          d="M46 72 Q60 82 74 72 L75 84 Q60 90 45 84 Z"
          fill="#000000"
          opacity="0.2"
        />

        {/* Authentic National / Club Kit Shoulders & Collar */}
        <path
          d="M14 120 C16 91, 34 83, 60 83 C86 83, 104 91, 106 120 Z"
          fill={`url(#kit_${uid})`}
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="1.2"
        />
        {/* Kit Stripes / Trim */}
        {player.nationality === 'Argentina' && (
          <g opacity="0.88">
            <rect x="38" y="85" width="7" height="35" fill="#FFFFFF" />
            <rect x="56.5" y="85" width="7" height="35" fill="#FFFFFF" />
            <rect x="75" y="85" width="7" height="35" fill="#FFFFFF" />
          </g>
        )}
        <path
          d="M43 83 L60 98 L77 83"
          fill="none"
          stroke={kit.collar}
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M45 83 L60 96 L75 83"
          fill="none"
          stroke={kit.secondary}
          strokeWidth="1.6"
          strokeLinecap="round"
        />

        {/* Long Back Hair (Haaland / Modrić) */}
        {(likeness.hairStyle === 'haaland_long_band' || likeness.hairStyle === 'modric_locks') && (
          <path
            d="M32 42 Q26 62 34 77 L44 74 Q38 58 38 44 Z M88 42 Q94 62 86 77 L76 74 Q82 58 82 44 Z"
            fill={hairCol}
          />
        )}

        {/* Anatomically Contoured Ears */}
        <ellipse cx={60 - fw - 1.5} cy="50" rx="4.2" ry="7.2" fill={player.skinTone} />
        <ellipse cx={60 - fw - 1.2} cy="50" rx="2.1" ry="4.2" fill="#000000" opacity="0.16" />
        <ellipse cx={60 + fw + 1.5} cy="50" rx="4.2" ry="7.2" fill={player.skinTone} />
        <ellipse cx={60 + fw + 1.2} cy="50" rx="2.1" ry="4.2" fill="#000000" opacity="0.16" />

        {/* Diamond Stud Earring (Cristiano Ronaldo, Neymar, Vinícius) */}
        {likeness.hasEarring && (
          <>
            <circle cx={60 - fw - 2} cy="56.5" r="1.8" fill="#F8FAFC" />
            <circle cx={60 + fw + 2} cy="56.5" r="1.8" fill="#F8FAFC" />
          </>
        )}

        {/* Sculpted 3D Head & Jawline Silhouette */}
        <path
          d={`M ${60 - fw} 38
              C ${60 - fw} 19, ${60 + fw} 19, ${60 + fw} 38
              L ${60 + jw} 60
              Q ${60 + jw * 0.58} ${46 + cl}, 60 ${48 + cl}
              Q ${60 - jw * 0.58} ${46 + cl}, ${60 - jw} 60
              Z`}
          fill={player.skinTone}
        />
        {/* Directional Face Shading & Cheekbone Highlights */}
        <path
          d={`M 60 22
              C ${60 + fw} 22, ${60 + fw} 38, ${60 + jw} 60
              Q ${60 + jw * 0.58} ${46 + cl}, 60 ${48 + cl}
              Z`}
          fill="#000000"
          opacity="0.1"
        />
        <ellipse cx="48" cy="52" rx="5.5" ry="3.2" fill="#FFFFFF" opacity="0.12" />
        <ellipse cx="72" cy="52" rx="5.5" ry="3.2" fill="#FFFFFF" opacity="0.08" />

        {/* Realistic Eyes (Sclera, Colored Iris, Pupil, Specular Catchlight) */}
        <g>
          {/* Left Eye */}
          <path
            d="M44.5 45.5 Q49.5 42.6 54.5 45.5 Q49.5 48.2 44.5 45.5 Z"
            fill="#F8FAFC"
          />
          <circle cx="49.5" cy="45.4" r="2.3" fill={likeness.eyeColor} />
          <circle cx="49.5" cy="45.4" r="1.15" fill="#09090B" />
          <circle cx="48.7" cy="44.7" r="0.65" fill="#FFFFFF" />

          {/* Right Eye */}
          <path
            d="M65.5 45.5 Q70.5 42.6 75.5 45.5 Q70.5 48.2 65.5 45.5 Z"
            fill="#F8FAFC"
          />
          <circle cx="70.5" cy="45.4" r="2.3" fill={likeness.eyeColor} />
          <circle cx="70.5" cy="45.4" r="1.15" fill="#09090B" />
          <circle cx="69.7" cy="44.7" r="0.65" fill="#FFFFFF" />
        </g>

        {/* Expressive Eyebrows */}
        <path
          d={`M43.5 ${41.5} Q49.5 ${41.5 + likeness.browArch} 55.5 41.2`}
          stroke={hairCol === '#FDE047' ? '#CA8A04' : '#111827'}
          strokeWidth={likeness.browThickness}
          strokeLinecap="round"
          fill="none"
        />
        <path
          d={`M64.5 41.2 Q70.5 ${41.5 + likeness.browArch} 76.5 ${41.5}`}
          stroke={hairCol === '#FDE047' ? '#CA8A04' : '#111827'}
          strokeWidth={likeness.browThickness}
          strokeLinecap="round"
          fill="none"
        />

        {/* Anatomically Shaded Nose Bridge & Nostril Contour */}
        <path
          d="M59.2 44 L57.5 55.2 Q60 57.2 62.5 55.2 L60.8 44"
          fill="#000000"
          opacity="0.14"
        />
        <path
          d="M59.8 44.5 L59.5 54.5"
          stroke="#FFFFFF"
          strokeWidth="1.1"
          strokeLinecap="round"
          opacity="0.24"
        />
        <path
          d="M55.8 55.4 Q60 57.6 64.2 55.4"
          stroke="#000000"
          strokeWidth="1.3"
          strokeLinecap="round"
          fill="none"
          opacity="0.28"
        />

        {/* Facial Hair / Beard Styles (Messi, Salah, Benzema, De Bruyne, Mbappé, etc.) */}
        {likeness.beardStyle === 'full_trimmed' && (
          <path
            d={`M ${60 - jw} 55
                Q ${60 - jw * 0.5} 74, 60 76.5
                Q ${60 + jw * 0.5} 74, ${60 + jw} 55
                L ${60 + jw - 2.5} 58
                Q 60 70, ${60 - jw + 2.5} 58 Z`}
            fill={likeness.archetype === 'debruyne' ? '#B45309' : '#1C1917'}
            opacity="0.78"
          />
        )}
        {likeness.beardStyle === 'full_thick' && (
          <path
            d={`M ${60 - jw - 0.5} 52
                Q ${60 - jw * 0.65} 77, 60 79.5
                Q ${60 + jw * 0.65} 77, ${60 + jw + 0.5} 52
                L ${60 + jw - 3} 57
                Q 60 67, ${60 - jw + 3} 57 Z`}
            fill="#09090B"
            opacity="0.92"
          />
        )}
        {(likeness.beardStyle === 'full_trimmed' ||
          likeness.beardStyle === 'full_thick' ||
          likeness.beardStyle === 'goatee' ||
          likeness.beardStyle === 'mustache_soul') && (
          <>
            {/* Mustache */}
            <path
              d="M51.5 60.5 Q60 57.6 68.5 60.5 Q64 62.2 60 61.2 Q56 62.2 51.5 60.5 Z"
              fill={likeness.archetype === 'debruyne' ? '#B45309' : '#111827'}
              opacity="0.82"
            />
            {/* Chin Goatee */}
            <path
              d="M54 71.5 Q60 76.8 66 71.5 Q60 74.2 54 71.5 Z"
              fill={likeness.archetype === 'debruyne' ? '#B45309' : '#111827'}
              opacity="0.82"
            />
          </>
        )}
        {likeness.beardStyle === 'stubble' && (
          <path
            d={`M ${60 - jw + 1} 57 Q 60 76 ${60 + jw - 1} 57 Q 60 72 ${60 - jw + 1} 57 Z`}
            fill="#111827"
            opacity="0.28"
          />
        )}

        {/* Mouth & Confident Athletic Expression */}
        {likeness.smileIntensity > 0.7 ? (
          <g>
            <path
              d="M52.5 63.2 Q60 68.5 67.5 63.2 Z"
              fill="#7F1D1D"
            />
            <path
              d="M53.5 63.5 Q60 66.2 66.5 63.5 Z"
              fill="#FFFFFF"
            />
            <path
              d="M52 63.2 Q60 68.5 68 63.2"
              stroke="#450A0A"
              strokeWidth="1.2"
              fill="none"
              strokeLinecap="round"
            />
          </g>
        ) : (
          <g>
            <path
              d={`M53 63.8 Q60 ${64.5 + likeness.smileIntensity * 3.2} 67 63.8`}
              stroke="#6B2118"
              strokeWidth="2.0"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M55.5 66.8 Q60 67.8 64.5 66.8"
              stroke="#000000"
              strokeWidth="1.1"
              opacity="0.22"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        )}

        {/* Signature Cristiano Ronaldo Jawline Contour & Cheek Crease */}
        {likeness.archetype === 'ronaldo' && (
          <g opacity="0.26" stroke="#451A03" strokeWidth="1.2" fill="none" strokeLinecap="round">
            <path d="M46 53 Q48 61 50 65" />
            <path d="M74 53 Q72 61 70 65" />
            <path d="M57 73 Q60 74.5 63 73" />
          </g>
        )}

        {/* ICONIC BESPOKE HAIRSTYLES */}
        {likeness.hairStyle === 'cr7_quiff' && (
          <g>
            {/* Textured High Quiff with Razor Side-Part */}
            <path
              d="M36 39 C35 20, 48 11, 63 12 C76 13, 84 22, 84 39 C80 28, 70 25, 58 26 C46 27, 40 31, 36 39 Z"
              fill="#09090B"
            />
            <path
              d="M44 24 C50 13, 66 11, 74 22 C65 19, 53 20, 44 24 Z"
              fill="#1E293B"
            />
            {/* CR7 Razor Surgical Line on Left Temple */}
            <path d="M41 28 L47 31" stroke={player.skinTone} strokeWidth="1.5" strokeLinecap="round" />
          </g>
        )}

        {likeness.hairStyle === 'messi_swept' && (
          <g>
            <path
              d="M35 40 C35 21, 47 14, 61 15 C75 15, 85 23, 84 40 C79 30, 69 25, 57 26 C46 27, 39 32, 35 40 Z"
              fill="#1C1917"
            />
            <path
              d="M42 25 Q58 16 76 26 Q62 22 42 25 Z"
              fill="#292524"
            />
          </g>
        )}

        {likeness.hairStyle === 'mbappe_buzz' && (
          <g>
            <path
              d="M36 38 C37 22, 47 17, 60 17 C73 17, 83 22, 84 38 C78 29, 70 26, 60 26 C50 26, 42 29, 36 38 Z"
              fill="#09090B"
              opacity="0.92"
            />
          </g>
        )}

        {likeness.hairStyle === 'neymar_curls' && (
          <g>
            <path
              d="M36 37 C36 20, 46 13, 60 13 C74 13, 84 20, 84 37 C78 28, 70 25, 60 25 C50 25, 42 28, 36 37 Z"
              fill="#18181B"
            />
            <circle cx="48" cy="20" r="6.5" fill="#FACC15" />
            <circle cx="56" cy="18" r="7" fill="#EAB308" />
            <circle cx="65" cy="18.5" r="6.8" fill="#FACC15" />
            <circle cx="72" cy="21" r="6" fill="#CA8A04" />
          </g>
        )}

        {likeness.hairStyle === 'haaland_long_band' && (
          <g>
            <path
              d="M35 39 C35 20, 46 14, 60 14 C74 14, 85 20, 85 39 C79 27, 70 24, 60 24 C50 24, 41 27, 35 39 Z"
              fill="#FDE047"
            />
            {/* Top Knot / Man-Bun */}
            <circle cx="60" cy="12" r="6.5" fill="#EAB308" />
            {/* Black Athletic Headband */}
            <path
              d="M36 31 Q60 26 84 31 L84 34.5 Q60 29.5 36 34.5 Z"
              fill="#09090B"
            />
          </g>
        )}

        {likeness.hairStyle === 'bellingham_taper' && (
          <g>
            <path
              d="M36 38 C36 20, 46 14, 60 14 C74 14, 84 20, 84 38 C79 28, 70 25, 60 25 C50 25, 41 28, 36 38 Z"
              fill="#09090B"
            />
            <circle cx="48" cy="20" r="5" fill="#18181B" />
            <circle cx="60" cy="18" r="5.5" fill="#18181B" />
            <circle cx="72" cy="20" r="5" fill="#18181B" />
          </g>
        )}

        {likeness.hairStyle === 'vini_twists' && (
          <g>
            <path
              d="M36 37 C36 19, 46 13, 60 13 C74 13, 84 19, 84 37 C78 27, 70 24, 60 24 C50 24, 42 27, 36 37 Z"
              fill="#09090B"
            />
            {[44, 50, 56, 62, 68, 74].map((xPos) => (
              <rect
                key={xPos}
                x={xPos}
                y="14"
                width="3.5"
                height="11"
                rx="1.7"
                fill="#18181B"
              />
            ))}
          </g>
        )}

        {likeness.hairStyle === 'salah_afro' && (
          <g>
            <circle cx="60" cy="24" r="22" fill="#09090B" />
            <circle cx="42" cy="27" r="11" fill="#111827" />
            <circle cx="78" cy="27" r="11" fill="#111827" />
            <circle cx="50" cy="16" r="11" fill="#18181B" />
            <circle cx="70" cy="16" r="11" fill="#18181B" />
            <circle cx="60" cy="13" r="11" fill="#09090B" />
            {/* Forehead cut-out so face is cleanly visible */}
            <path
              d={`M ${60 - fw + 1} 36 Q 60 26 ${60 + fw - 1} 36 L ${60 + fw} 44 L ${60 - fw} 44 Z`}
              fill={player.skinTone}
            />
          </g>
        )}

        {likeness.hairStyle === 'yamal_curls' && (
          <g>
            <circle cx="47" cy="21" r="7.5" fill="#09090B" />
            <circle cx="55" cy="18" r="8.5" fill="#18181B" />
            <circle cx="65" cy="18" r="8.5" fill="#09090B" />
            <circle cx="73" cy="21" r="7.5" fill="#18181B" />
            <circle cx="60" cy="22" r="7" fill="#27272A" />
          </g>
        )}

        {likeness.hairStyle === 'vandijk_bun' && (
          <g>
            <circle cx="60" cy="11.5" r="6.2" fill="#09090B" />
            <path
              d="M36 38 C36 20, 46 15, 60 15 C74 15, 84 20, 84 38 C78 27, 70 25, 60 25 C50 25, 42 27, 36 38 Z"
              fill="#18181B"
            />
          </g>
        )}

        {(likeness.hairStyle === 'kdb_swept' ||
          likeness.hairStyle === 'modric_locks' ||
          likeness.hairStyle === 'short_crop' ||
          likeness.hairStyle === 'textured_fringe' ||
          likeness.hairStyle === 'afro_fade' ||
          likeness.hairStyle === 'slick_back' ||
          likeness.hairStyle === 'wavy_part') && (
          <g>
            <path
              d="M35 39 C35 20, 46 14, 60 14 C74 14, 85 20, 85 39 C79 28, 70 24, 60 24 C50 24, 41 28, 35 39 Z"
              fill={hairCol}
            />
            {likeness.hasHeadband && (
              <path
                d="M36 31 Q60 26 84 31 L84 34 Q60 29 36 34 Z"
                fill="#FFFFFF"
              />
            )}
          </g>
        )}
      </svg>

      {/* Real-World Photo Layer when available & valid */}
      {!imgFailed && photoUrl && (
        <img
          src={photoUrl}
          alt={player.name}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="relative z-10 w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
        />
      )}

      {/* Optional Position Badge */}
      {showPositionBadge && (
        <span className="absolute top-1 left-1 z-20 px-1.5 py-0.5 rounded bg-black/80 border border-white/15 font-mono text-[9px] font-bold text-white leading-none">
          {player.position}
        </span>
      )}

      {/* Optional Rating Badge */}
      {showRatingBadge && (
        <span
          className="absolute bottom-1 right-1 z-20 px-1.5 py-0.5 rounded bg-black/85 border border-white/20 font-mono text-[10px] font-extrabold leading-none"
          style={{ color: accent }}
        >
          {player.rating}
        </span>
      )}
    </div>
  );
};

interface PitchPlayerBadgeProps {
  player: FootballPlayer;
  slotLabel?: string;
  fitLevel?: 'exact' | 'compatible' | 'out_of_position';
  isCaptain?: boolean;
  isSelected?: boolean;
  isLeadStar?: boolean;
  compact?: boolean;
  onClick?: () => void;
}

export const PitchPlayerPhotoNode: React.FC<PitchPlayerBadgeProps> = ({
  player,
  slotLabel,
  fitLevel,
  isCaptain,
  isSelected,
  isLeadStar,
  compact,
  onClick,
}) => {
  const accent = RARITY_ACCENT[player.rarity] || '#10B981';

  return (
    <div
      onClick={onClick}
      className={`group flex flex-col items-center select-none ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div
        className={`relative w-14 h-16 sm:w-16 sm:h-18 rounded-xl overflow-hidden bg-[#0B111B] border-2 shadow-[0_8px_20px_rgba(0,0,0,0.75)] transition-transform duration-200 group-hover:scale-105 ${
          isSelected
            ? 'border-[#F59E0B] ring-2 ring-[#F59E0B]/70 scale-105'
            : isLeadStar
            ? 'border-[#10B981] ring-2 ring-[#10B981]/50'
            : 'border-white/30'
        }`}
        style={{
          boxShadow: isSelected
            ? '0 0 18px rgba(245,158,11,0.65)'
            : `0 6px 16px rgba(0,0,0,0.7), inset 0 0 12px ${accent}33`,
        }}
      >
        <PlayerPhotoAvatar player={player} className="w-full h-full" />

        {/* Top Left Position Tag + Fit Indicator */}
        <div className="absolute top-1 left-1 z-20 flex items-center gap-0.5">
          <span className="px-1 py-0.5 rounded bg-black/85 text-[8px] font-mono font-bold text-[#10B981] leading-none">
            {slotLabel || player.position}
          </span>
          {fitLevel && (
            <span
              className={`w-2 h-2 rounded-full border border-black/80 ${
                fitLevel === 'exact'
                  ? 'bg-emerald-400 shadow-[0_0_6px_#10B981]'
                  : fitLevel === 'compatible'
                  ? 'bg-amber-400 shadow-[0_0_6px_#F59E0B]'
                  : 'bg-rose-500 shadow-[0_0_6px_#EF4444]'
              }`}
              title={
                fitLevel === 'exact'
                  ? '100% Exact Position Match'
                  : fitLevel === 'compatible'
                  ? 'Compatible Secondary Role'
                  : 'Out of Position'
              }
            />
          )}
        </div>

        {/* Top Right Captain / YOU Badge */}
        {isLeadStar ? (
          <span className="absolute top-1 right-1 z-20 px-1 py-0.5 rounded bg-[#10B981] text-[#070A0E] text-[8px] font-mono font-extrabold leading-none">
            YOU
          </span>
        ) : isCaptain ? (
          <span className="absolute top-1 right-1 z-20 px-1 py-0.5 rounded bg-[#F59E0B] text-[#070A0E] text-[8px] font-mono font-extrabold leading-none">
            C
          </span>
        ) : null}

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

export const EFootballPitchPlayerCard = PitchPlayerPhotoNode;
