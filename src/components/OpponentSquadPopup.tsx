import React, { useMemo, useState } from 'react';
import { Eye, LayoutGrid, List, Shield, Star, Users, X } from 'lucide-react';
import {
  FootballPlayer,
  FORMATIONS,
  FormationName,
  PLAYERS_DB,
  PositionCode,
  TeamData,
} from '../data/gameDatabase';
import { SoundEngine } from '../engine/SoundEngine';
import { EFootballPitchPlayerCard, PlayerPhotoAvatar } from './PlayerPhotoAvatar';

export interface OpponentSquadInfo {
  username: string;
  clubName: string;
  clubPrimaryColor?: string;
  clubSecondaryColor?: string;
  formation?: FormationName | string;
  starPlayerName?: string;
  starPlayerId?: string;
  squadIds?: string[];
  squad?: FootballPlayer[];
  matchFormat?: '11v11' | '1v1';
}

interface OpponentSquadPopupProps {
  isOpen: boolean;
  onClose: () => void;
  opponent: OpponentSquadInfo;
  /**
   * When true, renders as a compact floating HUD panel in the corner of the 3D match
   * without any full-screen backdrop so gameplay continues uninterrupted.
   */
  inMatchFloating?: boolean;
}

const ROLE_ORDER: PositionCode[] = [
  'GK',
  'LB',
  'CB',
  'CB',
  'RB',
  'CDM',
  'CM',
  'CM',
  'LW',
  'ST',
  'RW',
];

export function resolveOpponentStartingXI(opponent: OpponentSquadInfo): {
  players: FootballPlayer[];
  formation: FormationName;
  teamRating: number;
} {
  const validFormations: FormationName[] = [
    '4-3-3',
    '4-4-2',
    '4-2-3-1',
    '3-5-2',
    '3-4-3',
    '4-1-4-1',
    '5-3-2',
    '5-4-1',
  ];
  const resolvedFormation: FormationName = validFormations.includes(
    opponent.formation as FormationName
  )
    ? (opponent.formation as FormationName)
    : '4-3-3';

  const slots = FORMATIONS[resolvedFormation] || FORMATIONS['4-3-3'];

  // 1. If full squad array of 11 is provided, use it directly
  if (opponent.squad && opponent.squad.length >= 11) {
    const xi = opponent.squad.slice(0, 11);
    const avg = Math.round(xi.reduce((acc, p) => acc + p.rating, 0) / xi.length);
    return { players: xi, formation: resolvedFormation, teamRating: avg };
  }

  // 2. If squadIds are provided from real-time sync, map them to PLAYERS_DB
  if (opponent.squadIds && opponent.squadIds.length > 0) {
    const mapped = opponent.squadIds
      .map((id) => PLAYERS_DB.find((p) => p.id === id))
      .filter((p): p is FootballPlayer => Boolean(p));
    if (mapped.length >= 11) {
      const xi = mapped.slice(0, 11);
      const avg = Math.round(xi.reduce((acc, p) => acc + p.rating, 0) / xi.length);
      return { players: xi, formation: resolvedFormation, teamRating: avg };
    }
  }

  // 3. Otherwise build a complete 11-player Starting XI tailored to opponent's club & star player
  const usedIds = new Set<string>();
  const clubKey = (opponent.clubName || '').toLowerCase();

  // Find star player if specified
  const leadStar =
    (opponent.starPlayerId && PLAYERS_DB.find((p) => p.id === opponent.starPlayerId)) ||
    (opponent.starPlayerName &&
      PLAYERS_DB.find(
        (p) =>
          p.name.toLowerCase().includes(opponent.starPlayerName!.toLowerCase()) ||
          opponent.starPlayerName!.toLowerCase().includes(p.name.toLowerCase())
      ));

  const xi: FootballPlayer[] = [];

  for (let i = 0; i < 11; i++) {
    const targetRole = slots[i]?.role || ROLE_ORDER[i] || 'CM';

    // Put lead star in their natural attacking slot (or ST slot #9)
    if (
      leadStar &&
      !usedIds.has(leadStar.id) &&
      (leadStar.position === targetRole || (i === 9 && targetRole === 'ST'))
    ) {
      xi.push(leadStar);
      usedIds.add(leadStar.id);
      continue;
    }

    // Prefer players from the opponent's club or nationality matching the position
    const clubMatch = PLAYERS_DB.find(
      (p) =>
        !usedIds.has(p.id) &&
        p.position === targetRole &&
        (p.club.toLowerCase() === clubKey || p.nationality.toLowerCase() === clubKey)
    );
    if (clubMatch) {
      xi.push(clubMatch);
      usedIds.add(clubMatch.id);
      continue;
    }

    // Next prefer high-rated player in that exact position
    const roleMatch = PLAYERS_DB.find((p) => !usedIds.has(p.id) && p.position === targetRole);
    if (roleMatch) {
      xi.push(roleMatch);
      usedIds.add(roleMatch.id);
      continue;
    }

    // Fallback to any unused player
    const fallback = PLAYERS_DB.find((p) => !usedIds.has(p.id)) || PLAYERS_DB[i % PLAYERS_DB.length];
    xi.push(fallback);
    usedIds.add(fallback.id);
  }

  // Ensure leadStar is included in the XI if not already placed
  if (leadStar && !usedIds.has(leadStar.id)) {
    xi[9] = leadStar;
  }

  const avg = Math.round(xi.reduce((acc, p) => acc + p.rating, 0) / xi.length);
  return { players: xi, formation: resolvedFormation, teamRating: avg };
}

export function buildOpponentInfoFromTeam(
  username: string,
  team: TeamData,
  formation?: FormationName,
  squadIds?: string[],
  starPlayerId?: string
): OpponentSquadInfo {
  return {
    username,
    clubName: team.name,
    clubPrimaryColor: team.primaryColor,
    clubSecondaryColor: team.secondaryColor,
    formation: formation || '4-3-3',
    squadIds,
    starPlayerId,
  };
}

export const OpponentSquadPopup: React.FC<OpponentSquadPopupProps> = ({
  isOpen,
  onClose,
  opponent,
  inMatchFloating = false,
}) => {
  const [viewTab, setViewTab] = useState<'both' | 'pitch' | 'list'>('both');
  const [selectedSlotIdx, setSelectedSlotIdx] = useState<number>(9);

  const { players, formation, teamRating } = useMemo(
    () => resolveOpponentStartingXI(opponent),
    [opponent]
  );

  const slots = FORMATIONS[formation] || FORMATIONS['4-3-3'];
  const inspectedPlayer = players[selectedSlotIdx] || players[0];
  const inspectedSlot = slots[selectedSlotIdx] || slots[0];

  if (!isOpen) return null;

  const primaryColor = opponent.clubPrimaryColor || '#EF4444';

  const cardContent = (
    <div
      className={`bg-[#0B1018]/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl text-white overflow-hidden pointer-events-auto ${
        inMatchFloating ? 'w-[370px] sm:w-[410px] max-h-[80vh] flex flex-col' : 'w-full max-w-2xl'
      }`}
    >
      {/* Compact Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-[#111927] via-[#152234] to-[#111927] border-b border-white/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-display font-bold text-xs text-white shrink-0 border border-white/20 shadow"
            style={{ backgroundColor: primaryColor }}
          >
            {opponent.clubName.slice(0, 3).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#F59E0B] font-bold">
                OPPONENT SQUAD
              </span>
              <span className="px-1.5 py-0.5 rounded bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981] font-mono text-[10px] font-bold">
                {formation}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px] font-bold">
                OVR {teamRating}
              </span>
            </div>
            <div className="font-display font-bold text-sm sm:text-base text-white truncate">
              @{opponent.username}{' '}
              <span className="text-xs font-normal text-slate-400">· {opponent.clubName}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Compact View Mode Toggle */}
          <div className="flex items-center bg-[#070A0E] border border-white/10 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => {
                SoundEngine.playUIClick();
                setViewTab('both');
              }}
              className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                viewTab === 'both'
                  ? 'bg-[#10B981] text-[#070A0E]'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Split Pitch + XI List"
            >
              ALL
            </button>
            <button
              type="button"
              onClick={() => {
                SoundEngine.playUIClick();
                setViewTab('pitch');
              }}
              className={`p-1 rounded transition-colors cursor-pointer ${
                viewTab === 'pitch'
                  ? 'bg-[#10B981] text-[#070A0E]'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Formation Pitch View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                SoundEngine.playUIClick();
                setViewTab('list');
              }}
              className={`p-1 rounded transition-colors cursor-pointer ${
                viewTab === 'list'
                  ? 'bg-[#10B981] text-[#070A0E]'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Starting XI Roster List"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              SoundEngine.playUIClick();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors cursor-pointer"
            aria-label="Close Opponent Squad Popup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body Content */}
      <div
        className={`p-3.5 overflow-y-auto space-y-3 ${
          !inMatchFloating && viewTab === 'both'
            ? 'grid grid-cols-1 md:grid-cols-12 gap-4 space-y-0 items-start'
            : ''
        }`}
      >
        {/* 1. Tactical Mini-Pitch Formation View */}
        {(viewTab === 'both' || viewTab === 'pitch') && (
          <div className={!inMatchFloating && viewTab === 'both' ? 'md:col-span-6 space-y-2.5' : 'space-y-2.5'}>
            <div className="relative w-full h-52 sm:h-56 rounded-xl bg-gradient-to-b from-[#0E3A24] via-[#134E30] to-[#0E3A24] border border-white/20 overflow-hidden shadow-inner select-none">
              {/* Pitch markings */}
              <div className="absolute inset-2 border border-white/20 rounded pointer-events-none" />
              <div className="absolute inset-y-2 left-1/2 w-px bg-white/20 pointer-events-none" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full border border-white/20 pointer-events-none" />
              {/* Left & Right Penalty Boxes */}
              <div className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-24 border-r border-y border-white/20 pointer-events-none" />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-24 border-l border-y border-white/20 pointer-events-none" />

              {/* Formation Watermark */}
              <div className="absolute top-2 right-2.5 px-2 py-0.5 rounded bg-black/45 border border-white/10 font-mono text-[10px] text-[#10B981] font-bold">
                {formation} STARTING XI
              </div>

              {/* 11 Player Nodes on Tactical Pitch (eFootball PES Realistic Player Photos) */}
              {slots.map((slot, idx) => {
                const player = players[idx] || players[0];
                // Map x (-0.95..0) to 10%..88% horizontal pitch coordinate
                const leftPct = Math.min(90, Math.max(8, ((slot.x + 1.0) / 1.02) * 82 + 6));
                // Map z (-0.75..0.75) to 12%..88% vertical coordinate
                const topPct = Math.min(88, Math.max(12, ((slot.z + 0.78) / 1.56) * 76 + 12));
                const isSelected = idx === selectedSlotIdx;

                return (
                  <button
                    type="button"
                    key={`${slot.label}_${idx}`}
                    onClick={() => {
                      SoundEngine.playUIClick();
                      setSelectedSlotIdx(idx);
                    }}
                    style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer transition-transform ${
                      isSelected ? 'scale-110 z-20' : 'hover:scale-105 z-10'
                    }`}
                  >
                    <EFootballPitchPlayerCard
                      player={player}
                      slotLabel={slot.label}
                      isSelected={isSelected}
                      compact={true}
                    />
                  </button>
                );
              })}
            </div>

            {/* Selected Player Mini Attribute Bar */}
            {inspectedPlayer && (
              <div className="p-2.5 rounded-xl bg-[#070A0E]/90 border border-white/10 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <PlayerPhotoAvatar
                    player={inspectedPlayer}
                    className="w-11 h-11 rounded-lg border border-white/25"
                    showRatingBadge={true}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-[#10B981]/20 text-[#10B981] font-mono text-[10px] font-bold">
                        {inspectedSlot?.label || inspectedPlayer.position}
                      </span>
                      <span className="text-[10px] font-mono text-[#F59E0B] font-bold">
                        OVR {inspectedPlayer.rating}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-300 truncate mt-0.5">
                      {inspectedPlayer.club} · {inspectedPlayer.nationality} · #{inspectedPlayer.number}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px]">
                  <div className="px-1.5 py-1 rounded bg-white/5 text-center">
                    <div className="text-[8px] text-slate-400">PAC</div>
                    <div className="font-bold text-white">{inspectedPlayer.attributes.pace}</div>
                  </div>
                  <div className="px-1.5 py-1 rounded bg-white/5 text-center">
                    <div className="text-[8px] text-slate-400">SHO</div>
                    <div className="font-bold text-white">{inspectedPlayer.attributes.shooting}</div>
                  </div>
                  <div className="px-1.5 py-1 rounded bg-white/5 text-center">
                    <div className="text-[8px] text-slate-400">PAS</div>
                    <div className="font-bold text-white">{inspectedPlayer.attributes.passing}</div>
                  </div>
                  <div className="px-1.5 py-1 rounded bg-white/5 text-center">
                    <div className="text-[8px] text-slate-400">DEF</div>
                    <div className="font-bold text-white">{inspectedPlayer.attributes.defending}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. Compact Starting XI Roster Table (Names, Positions, Ratings) */}
        {(viewTab === 'both' || viewTab === 'list') && (
          <div className={!inMatchFloating && viewTab === 'both' ? 'md:col-span-6' : ''}>
            <div className="flex items-center justify-between mb-1.5 px-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">
                STARTING XI LINEUP (11 PLAYERS)
              </span>
              <span className="text-[10px] font-mono text-[#10B981]">
                Click player to inspect stats
              </span>
            </div>
            <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
              {slots.map((slot, idx) => {
                const player = players[idx] || players[0];
                const isSelected = idx === selectedSlotIdx;
                return (
                  <button
                    type="button"
                    key={`row_${slot.label}_${idx}`}
                    onClick={() => {
                      SoundEngine.playUIClick();
                      setSelectedSlotIdx(idx);
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-lg border text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#10B981]/15 border-[#10B981]/60'
                        : 'bg-[#070A0E]/80 border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-9 text-center py-0.5 rounded font-mono text-[10px] font-bold shrink-0 ${
                          slot.role === 'GK'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : ['LB', 'CB', 'RB'].includes(slot.role)
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                            : ['CDM', 'CM', 'CAM'].includes(slot.role)
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {slot.label}
                      </span>
                      <PlayerPhotoAvatar
                        player={player}
                        className="w-9 h-9 rounded-lg border border-white/20"
                      />
                      <div className="min-w-0">
                        <div className="text-[10px] font-mono text-white font-semibold truncate flex items-center gap-1">
                          <span>#{player.number} · {player.nationality}</span>
                          {player.rating >= 94 && (
                            <Star className="w-3 h-3 text-[#F59E0B] fill-[#F59E0B] shrink-0" />
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {player.position} · PAC {player.attributes.pace} · SHO{' '}
                          {player.attributes.shooting}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded font-mono text-xs font-bold ${
                          player.rating >= 94
                            ? 'bg-[#F59E0B] text-[#070A0E]'
                            : player.rating >= 90
                            ? 'bg-[#10B981]/25 text-[#10B981] border border-[#10B981]/40'
                            : 'bg-white/10 text-white'
                        }`}
                      >
                        {player.rating}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer note */}
      <div className="px-4 py-2 bg-[#070A0E] border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-slate-400">
        <span>
          {inMatchFloating
            ? 'LIVE MATCH CONTINUES UNINTERRUPTED · PRESS [O] TO TOGGLE'
            : `FORMATION: ${formation} · STARTING XI READY`}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-[#10B981] hover:underline font-bold cursor-pointer"
        >
          CLOSE
        </button>
      </div>
    </div>
  );

  // During a match: render as a non-blocking floating HUD card in the top-right below the HUD bar
  if (inMatchFloating) {
    return (
      <div className="fixed top-16 right-4 z-40 pointer-events-none flex justify-end">
        {cardContent}
      </div>
    );
  }

  // Pre-match / Lobby: render as a clean compact modal popup
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl">
        {cardContent}
      </div>
    </div>
  );
};
