import React, { useState } from 'react';
import {
  ArrowLeftRight,
  Award,
  Check,
  Coins,
  CreditCard,
  Crown,
  Eye,
  PackageOpen,
  Play,
  Search,
  Shield,
  Sparkles,
  Users,
  Wifi,
  Zap,
} from 'lucide-react';
import {
  CELEBRATIONS,
  CelebrationType,
  FootballPlayer,
  FormationName,
  FORMATIONS,
  PackDefinition,
  PLAYER_PACKS,
  PlayerRarity,
  PLAYERS_DB,
  PositionCode,
  SPIN_COST_COINS,
  TeamData,
  TEAMS_DB,
  TOP_50_SPIN_PLAYERS,
} from '../data/gameDatabase';
import { SoundEngine } from '../engine/SoundEngine';
import { FriendRoomService } from '../engine/FriendRoomService';
import { OpponentSquadInfo, OpponentSquadPopup } from './OpponentSquadPopup';
import { EFootballPitchPlayerCard, PlayerPhotoAvatar } from './PlayerPhotoAvatar';
import packShowcaseImg from '../assets/images/transfer_pack_showcase_1791305671660.jpg';

interface MyTeamAndMarketProps {
  initialSection: 'my_team' | 'transfer_market' | 'packs' | 'spin_roulette';
  coins: number;
  userTeam: TeamData;
  userFormation: FormationName;
  userSquad: FootballPlayer[];
  unlockedPlayerIds: string[];
  captainId: string;
  preferredCelebration: CelebrationType;
  onSelectTeam: (team: TeamData) => void;
  onSelectFormation: (formation: FormationName) => void;
  onUpdateSquadOrder: (nextSquad: FootballPlayer[]) => void;
  onSelectCaptain: (playerId: string) => void;
  onSelectCelebration: (cel: CelebrationType) => void;
  onBuyPlayer: (player: FootballPlayer) => void;
  onOpenPack: (pack: PackDefinition, pulledPlayer: FootballPlayer) => void;
  onSpinRoulette?: (costCoins: number, pulledPlayer: FootballPlayer) => void;
  roomCode?: string;
  friendRoomStatus?: string;
  friendRoomMembersCount?: number;
  onPlayDreamTeamOnline?: () => void;
  onQuickMatchDreamTeamOnline?: () => void;
  onJoinDreamTeamRoomCode?: (code: string) => void;
  onPlayDreamTeamOffline?: () => void;
  onTriggerPaymentCheckout?: (item: {
    itemType: 'player' | 'coins';
    itemId: string;
    itemName: string;
    subtitle: string;
    amountUsd: number;
    coinsAdded: number;
    playerToUnlock?: FootballPlayer;
  }) => void;
}

const RARITY_COLORS: Record<PlayerRarity, string> = {
  Legendary: '#F59E0B',
  'World Class': '#10B981',
  Elite: '#A855F7',
  Rare: '#38BDF8',
  Common: '#94A3B8',
};

export const MyTeamAndMarket: React.FC<MyTeamAndMarketProps> = ({
  initialSection,
  coins,
  userTeam,
  userFormation,
  userSquad,
  unlockedPlayerIds,
  captainId,
  preferredCelebration,
  onSelectTeam,
  onSelectFormation,
  onUpdateSquadOrder,
  onSelectCaptain,
  onSelectCelebration,
  onBuyPlayer,
  onOpenPack,
  onSpinRoulette,
  roomCode = 'PLAY-7492',
  friendRoomStatus = 'Waiting for Opponent',
  friendRoomMembersCount = 1,
  onPlayDreamTeamOnline,
  onQuickMatchDreamTeamOnline,
  onJoinDreamTeamRoomCode,
  onPlayDreamTeamOffline,
  onTriggerPaymentCheckout,
}) => {
  const [section, setSection] = useState<'my_team' | 'transfer_market' | 'packs' | 'spin_roulette'>(
    initialSection
  );
  const [selectedSwapIndex, setSelectedSwapIndex] = useState<number | null>(9); // Default ST slot
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [clubCategoryFilter, setClubCategoryFilter] = useState<'Club' | 'International'>('Club');
  const [dreamTeamJoinCode, setDreamTeamJoinCode] = useState('');
  const [copiedDreamCode, setCopiedDreamCode] = useState(false);
  const [scoutOpponentInfo, setScoutOpponentInfo] = useState<OpponentSquadInfo | null>(null);

  // Market filters
  const [rarityFilter, setRarityFilter] = useState<'All' | PlayerRarity>('All');
  const [posFilter, setPosFilter] = useState<'All' | PositionCode>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Tactics state
  const [mentality, setMentality] = useState(userTeam.tactics.mentality);
  const [passingStyle, setPassingStyle] = useState(userTeam.tactics.passingStyle);
  const [defensiveLine, setDefensiveLine] = useState(userTeam.tactics.defensiveLine);

  // Pack reveal modal state
  const [openingPack, setOpeningPack] = useState<PackDefinition | null>(null);
  const [revealedPlayer, setRevealedPlayer] = useState<FootballPlayer | null>(null);

  // 50-Star Roulette Spin state
  const [isSpinningRoulette, setIsSpinningRoulette] = useState(false);
  const [rouletteHighlightIndex, setRouletteHighlightIndex] = useState<number>(0);
  const [rouletteWinner, setRouletteWinner] = useState<FootballPlayer | null>(null);
  const [spinHistory, setSpinHistory] = useState<FootballPlayer[]>([]);

  React.useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  const handleStartRouletteSpin = () => {
    if (isSpinningRoulette || coins < SPIN_COST_COINS) return;
    const pool = TOP_50_SPIN_PLAYERS;
    if (!pool.length) return;

    // Prefer unowned stars from the top 50 so spins feel super rewarding; fallback to full 50 pool
    const unownedPool = pool.filter((p) => !unlockedPlayerIds.includes(p.id));
    const candidatePool = unownedPool.length > 0 ? unownedPool : pool;
    const chosen = candidatePool[Math.floor(Math.random() * candidatePool.length)] || pool[0];
    const targetIdx = Math.max(0, pool.findIndex((p) => p.id === chosen.id));

    setIsSpinningRoulette(true);
    setRouletteWinner(null);
    SoundEngine.playUIClick();

    const totalSteps = 32 + targetIdx;
    let step = 0;

    const tick = () => {
      step += 1;
      const currentIdx = step % pool.length;
      setRouletteHighlightIndex(currentIdx);
      SoundEngine.playUIClick();

      if (step < totalSteps) {
        const progress = step / totalSteps;
        const delay = Math.round(35 + Math.pow(progress, 2.3) * 210);
        setTimeout(tick, delay);
      } else {
        setRouletteHighlightIndex(targetIdx);
        setIsSpinningRoulette(false);
        setRouletteWinner(chosen);
        setSpinHistory((prev) => [chosen, ...prev.slice(0, 7)]);
        SoundEngine.playPackOpen();
        if (onSpinRoulette) {
          onSpinRoulette(SPIN_COST_COINS, chosen);
        } else {
          onOpenPack(
            {
              id: 'roulette_50_spin',
              name: '50-Star Legend Roulette',
              price: SPIN_COST_COINS,
              guaranteedRarity: 'World Class',
              description: 'Top 50 Football Stars Roulette Spin',
              accentColor: '#F59E0B',
              oddsText: '100% Top 50 World Star',
            },
            chosen
          );
        }
      }
    };

    setTimeout(tick, 45);
  };

  const handleSwapPlayers = (idxA: number, idxB: number) => {
    if (idxA === idxB) {
      setSelectedSwapIndex(null);
      return;
    }
    const copy = [...userSquad];
    const temp = copy[idxA];
    copy[idxA] = copy[idxB];
    copy[idxB] = temp;
    onUpdateSquadOrder(copy);
    setSelectedSwapIndex(idxB);
    SoundEngine.playUIClick();
  };

  const handleAssignUnlockedPlayerToSlot = (player: FootballPlayer) => {
    SoundEngine.playUIClick();
    const targetSlot = selectedSwapIndex !== null ? selectedSwapIndex : 9;
    const copy = [...userSquad];
    const existingIdx = copy.findIndex((p) => p.id === player.id);
    if (existingIdx >= 0) {
      const temp = copy[targetSlot];
      copy[targetSlot] = copy[existingIdx];
      copy[existingIdx] = temp;
    } else {
      copy[targetSlot] = player;
    }
    onUpdateSquadOrder(copy);
  };

  const handleTriggerPackOpen = (pack: PackDefinition) => {
    if (coins < pack.price) return;
    SoundEngine.playPackOpen();
    setOpeningPack(pack);

    // Filter pool by guaranteed rarity or higher
    const rarityOrder: PlayerRarity[] = ['Common', 'Rare', 'Elite', 'World Class', 'Legendary'];
    const minIdx = rarityOrder.indexOf(pack.guaranteedRarity);
    const eligible = PLAYERS_DB.filter((p) => rarityOrder.indexOf(p.rarity) >= minIdx);
    const pulled = eligible[Math.floor(Math.random() * eligible.length)] || PLAYERS_DB[0];

    setRevealedPlayer(pulled);
    onOpenPack(pack, pulled);
  };

  const filteredMarketPlayers = PLAYERS_DB.filter((p) => {
    if (rarityFilter !== 'All' && p.rarity !== rarityFilter) return false;
    if (posFilter !== 'All' && p.position !== posFilter) return false;
    if (
      searchQuery.trim() &&
      !p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !p.nationality.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const avgTeamRating = Math.round(
    userSquad.slice(0, 11).reduce((acc, p) => acc + p.rating, 0) / 11
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header & Section Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6 mb-8">
        <div>
          <div className="text-xs font-mono text-[#10B981] mb-1">
            DREAM TEAM 11V11 SQUAD BUILDER · ONLINE 11V11 MULTIPLAYER · GLOBAL TRANSFERS
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-white">
            {section === 'my_team'
              ? `DREAM TEAM 11V11: ${userTeam.name.toUpperCase()}`
              : section === 'transfer_market'
              ? `PLAYER STORE & TRANSFER MARKET (${PLAYERS_DB.length})`
              : section === 'spin_roulette'
              ? '50-STAR FOOTBALL ROULETTE SPIN (500,000 COINS)'
              : 'PLAYER PACKS VAULT'}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Coin Balance Readout */}
          <div className="px-4 py-2 bg-[#111722] border border-[#F59E0B]/40 rounded-lg flex items-center gap-2 font-mono text-sm text-[#F59E0B] font-bold tabular-nums">
            <Coins className="w-4 h-4" />
            {coins.toLocaleString()} Coins
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-[#111722] border border-white/10 rounded-lg">
            <button
              onClick={() => {
                SoundEngine.playUIClick();
                setSection('my_team');
              }}
              className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                section === 'my_team'
                  ? 'bg-[#10B981] text-[#070A0E] font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              My Team & Tactics
            </button>
            <button
              onClick={() => {
                SoundEngine.playUIClick();
                setSection('transfer_market');
              }}
              className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                section === 'transfer_market'
                  ? 'bg-[#10B981] text-[#070A0E] font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Player Store ({PLAYERS_DB.length})
            </button>
            <button
              onClick={() => {
                SoundEngine.playUIClick();
                setSection('spin_roulette');
              }}
              className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                section === 'spin_roulette'
                  ? 'bg-[#F59E0B] text-[#070A0E] font-bold'
                  : 'text-[#F59E0B] hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              50-Star Spin (500K)
            </button>
            <button
              onClick={() => {
                SoundEngine.playUIClick();
                setSection('packs');
              }}
              className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                section === 'packs'
                  ? 'bg-[#F59E0B] text-[#070A0E] font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Player Packs
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: MY TEAM, FORMATIONS (DRAG & SWAP), TACTICS & CELEBRATIONS */}
      {section === 'my_team' && (
        <div className="space-y-8">
          {/* 11V11 DREAM TEAM AGAINST ONLINE BANNER & LIVE ROOM / MATCHMAKING LAUNCHER */}
          <div className="bg-gradient-to-r from-[#111722] via-[#132235] to-[#111722] border-2 border-[#10B981]/60 rounded-2xl p-6 shadow-2xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#10B981] font-bold">
                  <Wifi className="w-4 h-4 animate-pulse" />
                  <span>11V11 DREAM TEAM AGAINST ONLINE · FULL STARTING XI MULTIPLAYER</span>
                  <span className="px-2.5 py-0.5 rounded bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40">
                    {friendRoomStatus} ({friendRoomMembersCount}/2)
                  </span>
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
                  PLAY 11V11 DREAM TEAM AGAINST ONLINE OPPONENTS
                </h2>
                <p className="text-xs sm:text-sm text-slate-300">
                  Take your custom 11-player <span className="text-white font-semibold">{userTeam.name}</span> Starting XI ({userFormation}, OVR {avgTeamRating}) into a live 11v11 online match! Control all 11 players with real-time player switching (<span className="font-mono text-[#10B981]">Q</span>), passing, through balls, Rainbow Flicks, and shots synchronized online.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                {onQuickMatchDreamTeamOnline && (
                  <button
                    onClick={() => {
                      SoundEngine.playUIClick();
                      onQuickMatchDreamTeamOnline();
                    }}
                    className="px-5 py-3.5 bg-[#10B981] hover:bg-[#059669] text-[#070A0E] font-display font-bold text-sm rounded-xl transition-all flex items-center gap-2 shadow-lg cursor-pointer"
                  >
                    <Zap className="w-4 h-4 fill-current" />
                    11V11 ONLINE QUICK MATCH
                  </button>
                )}
                {onPlayDreamTeamOnline && (
                  <button
                    onClick={() => {
                      SoundEngine.playUIClick();
                      onPlayDreamTeamOnline();
                    }}
                    className="px-5 py-3.5 bg-[#F59E0B] hover:bg-[#D97706] text-[#070A0E] font-display font-bold text-sm rounded-xl transition-all flex items-center gap-2 shadow-lg cursor-pointer"
                  >
                    <Wifi className="w-4 h-4" />
                    OPEN 11V11 ONLINE LOBBY
                  </button>
                )}
                {onPlayDreamTeamOffline && (
                  <button
                    onClick={() => {
                      SoundEngine.playUIClick();
                      onPlayDreamTeamOffline();
                    }}
                    className="px-4 py-3.5 bg-white/10 hover:bg-white/15 border border-white/15 text-white font-display font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    11V11 VS AI
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    SoundEngine.playUIClick();
                    const state = FriendRoomService.getCurrentRoomState();
                    const opp = state.members.find(
                      (m) => m.clientId !== FriendRoomService.getClientId()
                    );
                    setScoutOpponentInfo({
                      username: opp?.username || 'OnlineRival_XI',
                      clubName: opp?.clubName || 'FC Barcelona',
                      starPlayerName: opp?.starPlayerName || 'Lionel Messi',
                      starPlayerId: opp?.starPlayerId,
                      squadIds: opp?.squadIds,
                      formation: opp?.formation || '4-3-3',
                    });
                  }}
                  className="px-4 py-3.5 bg-[#38BDF8]/15 hover:bg-[#38BDF8]/25 border border-[#38BDF8]/40 text-[#38BDF8] font-display font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  VIEW OPPONENT SQUAD (XI)
                </button>
              </div>
            </div>

            {/* Direct 11v11 Room Code Bar inside Dream Team */}
            <div className="mt-5 pt-5 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#070A0E]/90 border border-white/15 rounded-xl p-3.5 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-mono text-slate-400">
                    YOUR 11V11 DREAM TEAM ROOM CODE (HOST)
                  </div>
                  <div className="font-mono text-xl font-bold text-[#10B981] tracking-wider">
                    {roomCode}
                  </div>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(roomCode).catch(() => {});
                    setCopiedDreamCode(true);
                    setTimeout(() => setCopiedDreamCode(false), 1800);
                  }}
                  className="px-3.5 py-2 bg-[#10B981]/20 hover:bg-[#10B981]/30 border border-[#10B981]/40 text-[#10B981] font-display font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  {copiedDreamCode ? 'COPIED!' : 'COPY ROOM CODE'}
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!dreamTeamJoinCode.trim() || !onJoinDreamTeamRoomCode) return;
                  SoundEngine.playUIClick();
                  onJoinDreamTeamRoomCode(dreamTeamJoinCode.trim().toUpperCase());
                }}
                className="bg-[#070A0E]/90 border border-white/15 rounded-xl p-2.5 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={dreamTeamJoinCode}
                  onChange={(e) => setDreamTeamJoinCode(e.target.value.toUpperCase())}
                  placeholder="Enter Opponent's 11v11 Room Code (e.g. PLAY-7492)"
                  className="flex-1 bg-transparent px-3 py-2 font-mono text-sm font-bold text-white uppercase placeholder:text-slate-500 placeholder:font-sans placeholder:text-xs focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-[#F59E0B] hover:bg-[#D97706] text-[#070A0E] font-display font-bold text-xs rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  JOIN 11V11 MATCH
                </button>
              </form>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left 7 Cols: Interactive Tactical Pitch with Drag-and-Drop / Click Swap */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-[#111722] border border-white/10 rounded-2xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="font-display text-xl font-bold text-white">
                    Starting XI Pitch Formation ({userFormation})
                  </h2>
                  <p className="text-xs text-slate-400">
                    Drag players between positions or click two players to swap their roles.
                  </p>
                </div>
                <div className="font-mono text-sm text-[#F59E0B] font-bold">
                  SQUAD OVR {avgTeamRating}
                </div>
              </div>

              {/* All 8 Formation Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 mb-5">
                {(Object.keys(FORMATIONS) as FormationName[]).map((form) => (
                  <button
                    key={form}
                    onClick={() => {
                      SoundEngine.playUIClick();
                      onSelectFormation(form);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-mono text-xs font-semibold transition-colors ${
                      userFormation === form
                        ? 'bg-[#10B981] text-[#070A0E]'
                        : 'bg-[#070A0E] text-slate-300 border border-white/10 hover:border-white/25'
                    }`}
                  >
                    {form}
                  </button>
                ))}
              </div>

              {/* Interactive 2D Pitch Diagram */}
              <div className="relative w-full h-[430px] rounded-xl bg-gradient-to-r from-[#0F532B] via-[#156C36] to-[#0F532B] border-2 border-white/30 overflow-hidden shadow-inner">
                {/* Pitch Lines */}
                <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white/30" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border-2 border-white/30" />
                <div className="absolute top-1/2 left-0 -translate-y-1/2 w-24 h-56 border-2 border-l-0 border-white/30" />
                <div className="absolute top-1/2 right-0 -translate-y-1/2 w-24 h-56 border-2 border-r-0 border-white/30" />

                {/* 11 Starting Players */}
                {FORMATIONS[userFormation].map((slot, idx) => {
                  const player = userSquad[idx] || PLAYERS_DB[idx];
                  // Map slot.x in [-0.92, -0.08] across full pitch width [8%, 88%]
                  const leftPct = ((slot.x + 0.96) / 0.95) * 82 + 7;
                  const topPct = ((slot.z + 0.85) / 1.7) * 78 + 11;
                  const isSelected = selectedSwapIndex === idx;
                  const isCaptain = player.id === captainId;

                  return (
                    <div
                      key={`${slot.label}_${idx}`}
                      draggable
                      onDragStart={() => setDraggedIndex(idx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (draggedIndex !== null) {
                          handleSwapPlayers(draggedIndex, idx);
                          setDraggedIndex(null);
                        }
                      }}
                      onClick={() => {
                        if (selectedSwapIndex === null) {
                          setSelectedSwapIndex(idx);
                        } else {
                          handleSwapPlayers(selectedSwapIndex, idx);
                        }
                      }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing transition-transform hover:scale-105 ${
                        isSelected ? 'scale-110 z-20' : 'z-10'
                      }`}
                      style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                    >
                      <EFootballPitchPlayerCard
                        player={player}
                        slotLabel={slot.label}
                        isSelected={isSelected}
                        isCaptain={isCaptain}
                      />
                    </div>
                  );
                })}
              </div>

              {/* World Cup Squad Pool: Unlocked Players First + Unlockable Superstars */}
              <div className="mt-6 space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-mono text-[#10B981] font-bold">
                      YOUR UNLOCKED WORLD CUP PLAYERS ({unlockedPlayerIds.length} AVAILABLE)
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Click any unlocked player to place into Slot #{selectedSwapIndex !== null ? selectedSwapIndex + 1 : 10} ({FORMATIONS[userFormation][selectedSwapIndex ?? 9]?.label || 'ST'})
                    </div>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2.5">
                    {PLAYERS_DB.filter((p) => unlockedPlayerIds.includes(p.id)).map((p) => {
                      const inStartingXI = userSquad.slice(0, 11).some((s) => s.id === p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => handleAssignUnlockedPlayerToSlot(p)}
                          title={`${p.name} (${p.position} · OVR ${p.rating} · ${p.nationality})`}
                          className={`p-2 rounded-xl border flex flex-col items-center text-center transition-all cursor-pointer ${
                            inStartingXI
                              ? 'bg-[#192231] border-[#10B981] ring-1 ring-[#10B981]/50'
                              : 'bg-[#070A0E] border-white/10 hover:border-white/35'
                          }`}
                        >
                          <PlayerPhotoAvatar
                            player={p}
                            className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl border border-white/20 shadow-md"
                            showPositionBadge={true}
                            showRatingBadge={true}
                          />
                          <div className="text-xs font-sans font-bold text-white truncate mt-1.5 w-full leading-tight">
                            {p.name}
                          </div>
                          <div className="text-[10px] font-mono text-slate-300 truncate mt-0.5 w-full">
                            {inStartingXI ? (
                              <span className="text-[#10B981] font-bold">STARTING XI</span>
                            ) : (
                              <span>#{p.number} · {p.nationality}</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Locked World Cup Superstars (Messi, Mbappé, Ronaldo, Neymar, etc.) */}
                {PLAYERS_DB.some((p) => !unlockedPlayerIds.includes(p.id)) && (
                  <div className="pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-xs font-mono text-[#F59E0B] font-bold">
                          UNLOCK MORE WORLD CUP SUPERSTARS (MESSI, MBAPPÉ, RONALDO, NEYMAR & MORE)
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Unlock legendary World Cup players using your in-game Coins to add them immediately to your squad.
                        </p>
                      </div>
                      <button
                        onClick={() => setSection('transfer_market')}
                        className="text-xs font-mono text-[#10B981] hover:underline whitespace-nowrap"
                      >
                        View Full Market →
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {PLAYERS_DB.filter((p) => !unlockedPlayerIds.includes(p.id))
                        .slice(0, 9)
                        .map((star) => {
                          const canAfford = coins >= star.price;
                          return (
                            <div
                              key={star.id}
                              className="p-3.5 rounded-xl bg-[#070A0E] border border-[#F59E0B]/30 flex flex-col justify-between gap-2.5"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex flex-col items-center shrink-0">
                                  <PlayerPhotoAvatar
                                    player={star}
                                    className="w-14 h-14 rounded-xl border border-[#F59E0B]/40"
                                    showPositionBadge={true}
                                    showRatingBadge={true}
                                  />
                                  <div className="text-[10px] font-sans font-bold text-white truncate max-w-[76px] mt-1 leading-tight text-center">
                                    {star.name}
                                  </div>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="font-display font-bold text-sm text-white truncate">
                                    {star.name}
                                  </div>
                                  <div className="flex items-center justify-between text-xs font-mono mb-0.5 mt-0.5">
                                    <span className="text-[#F59E0B] font-bold">
                                      {star.position} · OVR {star.rating}
                                    </span>
                                    <span className="text-slate-400 text-[10px]">{star.nationality}</span>
                                  </div>
                                  <div className="text-[11px] text-slate-300 truncate">
                                    {star.club}
                                  </div>
                                  <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                                    PAC {star.attributes.pace} · SHO {star.attributes.shooting} · DRI {star.attributes.dribbling}
                                  </div>
                                </div>
                              </div>
                              <button
                                disabled={!canAfford}
                                onClick={() => onBuyPlayer(star)}
                                className={`w-full py-2 rounded-lg font-display font-bold text-xs transition-colors flex items-center justify-center gap-1.5 ${
                                  canAfford
                                    ? 'bg-[#F59E0B] hover:bg-[#D97706] text-[#070A0E]'
                                    : 'bg-white/5 text-slate-500 cursor-not-allowed'
                                }`}
                              >
                                <Coins className="w-3.5 h-3.5" />
                                UNLOCK ({star.price.toLocaleString()} COINS)
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right 5 Cols: Favourite Real-World Club Selector, Captain, Tactics & Goal Celebrations */}
          <div className="lg:col-span-5 space-y-6">
            {/* Club / National Team Selector */}
            <div className="bg-[#111722] border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="font-display text-lg font-bold text-white">
                  Favourite Club & Team Selection
                </h3>
                <div className="flex items-center gap-1 p-1 bg-[#070A0E] border border-white/10 rounded-lg">
                  <button
                    onClick={() => setClubCategoryFilter('Club')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors ${
                      clubCategoryFilter === 'Club'
                        ? 'bg-[#10B981] text-[#070A0E]'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Real-World Clubs (17)
                  </button>
                  <button
                    onClick={() => setClubCategoryFilter('International')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors ${
                      clubCategoryFilter === 'International'
                        ? 'bg-[#F59E0B] text-[#070A0E]'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    World Cup Nations (16)
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
                {TEAMS_DB.filter((t) => t.category === clubCategoryFilter).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      SoundEngine.playUIClick();
                      onSelectTeam(t);
                    }}
                    className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-colors ${
                      userTeam.id === t.id
                        ? 'bg-[#192231] border-[#10B981]'
                        : 'bg-[#070A0E] border-white/10 hover:border-white/25'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-sm shrink-0 border border-white/20"
                      style={{ backgroundColor: t.primaryColor }}
                    />
                    <div className="truncate">
                      <div className="font-display font-bold text-xs text-white truncate">
                        {t.name}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {t.shortName} · OVR {t.rating}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Tactics & Captain Selector */}
            <div className="bg-[#111722] border border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="font-display text-lg font-bold text-white">
                Team Tactics & Captain
              </h3>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Team Captain</label>
                <select
                  value={captainId}
                  onChange={(e) => onSelectCaptain(e.target.value)}
                  className="w-full bg-[#070A0E] border border-white/15 rounded-lg px-3 py-2 text-xs text-white font-medium"
                >
                  {userSquad.slice(0, 11).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.position} · OVR {p.rating})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Mentality</label>
                  <select
                    value={mentality}
                    onChange={(e) => setMentality(e.target.value as typeof mentality)}
                    className="w-full bg-[#070A0E] border border-white/15 rounded-lg px-2.5 py-2 text-xs text-white"
                  >
                    <option value="Attacking">Attacking</option>
                    <option value="Balanced">Balanced</option>
                    <option value="Counter-Attack">Counter-Attack</option>
                    <option value="High Press">High Press</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Build-Up Play</label>
                  <select
                    value={passingStyle}
                    onChange={(e) => setPassingStyle(e.target.value as typeof passingStyle)}
                    className="w-full bg-[#070A0E] border border-white/15 rounded-lg px-2.5 py-2 text-xs text-white"
                  >
                    <option value="Short Tiki-Taka">Short Tiki-Taka</option>
                    <option value="Direct Vertical">Direct Vertical</option>
                    <option value="Wide Crossing">Wide Crossing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Defensive Line</label>
                  <select
                    value={defensiveLine}
                    onChange={(e) => setDefensiveLine(e.target.value as typeof defensiveLine)}
                    className="w-full bg-[#070A0E] border border-white/15 rounded-lg px-2.5 py-2 text-xs text-white"
                  >
                    <option value="High Line">High Line</option>
                    <option value="Mid Block">Mid Block</option>
                    <option value="Deep Compact">Deep Compact</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Goal Celebration Selector */}
            <div className="bg-[#111722] border border-white/10 rounded-2xl p-6">
              <h3 className="font-display text-lg font-bold text-white mb-1">
                Goal Celebration Choreography
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Choose the signature celebration triggered when your team scores.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {CELEBRATIONS.map((cel) => (
                  <button
                    key={cel.id}
                    onClick={() => {
                      SoundEngine.playUIClick();
                      onSelectCelebration(cel.id);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      preferredCelebration === cel.id
                        ? 'bg-[#192231] border-[#F59E0B]'
                        : 'bg-[#070A0E] border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="font-display font-bold text-xs text-white mb-0.5">
                      {cel.name}
                    </div>
                    <div className="text-[11px] text-slate-400 leading-snug">
                      {cel.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* SECTION 2: PLAYER STORE & TRANSFER MARKET (56 FIFA WORLD CUP PLAYERS) */}
      {section === 'transfer_market' && (
        <div className="space-y-6">
          {/* Market Overview + Instant App Payment Coin Bundles */}
          <div className="bg-[#111722] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-mono text-[#F59E0B] font-bold">
                  OFFICIAL WORLD CUP PLAYER STORE · {PLAYERS_DB.length} FAMOUS PLAYERS AVAILABLE
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Purchase any of the {PLAYERS_DB.length} World Cup superstars using your in-game Coins or instant App Payment Checkout.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 font-mono text-xs shrink-0">
                <div className="px-3.5 py-2 bg-[#070A0E] border border-white/10 rounded-lg text-slate-300">
                  Unlocked:{' '}
                  <span className="text-[#10B981] font-bold">
                    {unlockedPlayerIds.length} / {PLAYERS_DB.length}
                  </span>
                </div>
                <div className="px-3.5 py-2 bg-[#070A0E] border border-[#10B981]/40 rounded-lg text-white">
                  Lead Star (YOU):{' '}
                  <span className="text-[#10B981] font-bold">{userSquad[9]?.name}</span>
                </div>
              </div>
            </div>

            {/* App Payment Coin Bundles Bar */}
            {onTriggerPaymentCheckout && (
              <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs font-mono text-[#38BDF8] font-bold flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4" />
                  APP PAYMENT STORE · INSTANT COIN TOP-UP:
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: 'coins_60k', label: '+60,000 Coins', coins: 60000, usd: 1.99 },
                    { id: 'coins_180k', label: '+180,000 Coins', coins: 180000, usd: 4.99 },
                    { id: 'coins_500k', label: '+500,000 Coins', coins: 500000, usd: 9.99 },
                  ].map((bundle) => (
                    <button
                      key={bundle.id}
                      onClick={() => {
                        SoundEngine.playUIClick();
                        onTriggerPaymentCheckout({
                          itemType: 'coins',
                          itemId: bundle.id,
                          itemName: bundle.label,
                          subtitle: `Instant ${bundle.coins.toLocaleString()} Coins added to your balance`,
                          amountUsd: bundle.usd,
                          coinsAdded: bundle.coins,
                        });
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[#070A0E] hover:bg-[#192231] border border-[#10B981]/40 text-xs font-mono text-white flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <span className="text-[#F59E0B] font-bold">{bundle.label}</span>
                      <span className="px-2 py-0.5 rounded bg-[#10B981] text-[#070A0E] font-bold">
                        ${bundle.usd.toFixed(2)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Filter Bar */}
          <div className="bg-[#111722] border border-white/10 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1.5">
              {(['All', 'Legendary', 'World Class', 'Elite', 'Rare', 'Common'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRarityFilter(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    rarityFilter === r
                      ? 'bg-[#10B981] text-[#070A0E] font-bold'
                      : 'bg-[#070A0E] text-slate-300 hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={posFilter}
                onChange={(e) => setPosFilter(e.target.value as typeof posFilter)}
                className="bg-[#070A0E] border border-white/15 rounded-lg px-3 py-2 text-xs text-white font-mono"
              >
                <option value="All">All Positions</option>
                <option value="ST">ST (Striker)</option>
                <option value="LW">LW (Left Wing)</option>
                <option value="RW">RW (Right Wing)</option>
                <option value="CAM">CAM (Attacking Mid)</option>
                <option value="CM">CM (Central Mid)</option>
                <option value="CDM">CDM (Defensive Mid)</option>
                <option value="LB">LB (Left Back)</option>
                <option value="CB">CB (Center Back)</option>
                <option value="RB">RB (Right Back)</option>
                <option value="GK">GK (Goalkeeper)</option>
              </select>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search footballer or nation..."
                  className="bg-[#070A0E] border border-white/15 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder:text-slate-500 w-56"
                />
              </div>
            </div>
          </div>

          {/* Player Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredMarketPlayers.map((player) => {
              const isOwned = unlockedPlayerIds.includes(player.id);
              const canAfford = coins >= player.price;
              const accent = RARITY_COLORS[player.rarity];

              return (
                <div
                  key={player.id}
                  className="bg-[#111722] border rounded-2xl p-5 flex flex-col justify-between transition-all hover:-translate-y-0.5"
                  style={{ borderColor: `${accent}45` }}
                >
                  <div>
                    {/* Top Row: Rating, Position, Realistic Player Photo & Name Below Image */}
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div
                          className="font-mono text-3xl font-bold leading-none tabular-nums"
                          style={{ color: accent }}
                        >
                          {player.rating}
                        </div>
                        <div className="font-mono text-xs font-bold text-white mt-1">
                          {player.position}
                        </div>
                        <div className="text-[11px] font-semibold mt-1" style={{ color: accent }}>
                          {player.rarity}
                        </div>
                      </div>
                      <div className="flex flex-col items-center">
                        <PlayerPhotoAvatar
                          player={player}
                          className="w-18 h-18 rounded-2xl border-2 shadow-lg"
                        />
                        <div className="font-display font-bold text-sm text-white text-center mt-2 leading-tight">
                          {player.name}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono font-bold text-white">
                          #{player.number}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          {player.nationality}
                        </div>
                      </div>
                    </div>

                    {/* Club & Role Info */}
                    <div className="border-y border-white/10 py-2.5 mb-3 flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium truncate">{player.club}</span>
                      <span className="font-mono text-[11px] text-[#10B981]">
                        {isOwned ? 'IN SQUAD POOL' : 'AVAILABLE'}
                      </span>
                    </div>

                    {/* 10 Attributes Matrix */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs mb-5 tabular-nums">
                      <div className="flex justify-between">
                        <span className="text-slate-400">PAC</span>
                        <span className="text-white font-semibold">{player.attributes.pace}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">DRI</span>
                        <span className="text-white font-semibold">{player.attributes.dribbling}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">SHO</span>
                        <span className="text-white font-semibold">{player.attributes.shooting}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">DEF</span>
                        <span className="text-white font-semibold">{player.attributes.defending}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">PAS</span>
                        <span className="text-white font-semibold">{player.attributes.passing}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">PHY</span>
                        <span className="text-white font-semibold">{player.attributes.physical}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">CRV</span>
                        <span className="text-[#F59E0B] font-semibold">{player.attributes.curve}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">SKL</span>
                        <span className="text-[#38BDF8] font-semibold">{player.attributes.skill}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">STA</span>
                        <span className="text-white font-semibold">{player.attributes.stamina}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">REA</span>
                        <span className="text-white font-semibold">{player.attributes.reactions}</span>
                      </div>
                    </div>
                  </div>

                  {/* Buy / Owned Button (Coins or App Payment Checkout) */}
                  {isOwned ? (
                    userSquad[9]?.id === player.id ? (
                      <div className="w-full py-2.5 bg-[#10B981]/20 border border-[#10B981] rounded-lg text-center font-mono text-xs text-[#10B981] font-bold flex items-center justify-center gap-1.5">
                        <Check className="w-4 h-4" /> ACTIVE LEAD STAR (YOU)
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedSwapIndex(9);
                          handleAssignUnlockedPlayerToSlot(player);
                        }}
                        className="w-full py-2.5 bg-white/10 hover:bg-[#10B981] text-white hover:text-[#070A0E] border border-white/15 rounded-lg font-display font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-4 h-4" /> SET AS LEAD STAR (YOU)
                      </button>
                    )
                  ) : (
                    <div className="space-y-2">
                      <button
                        disabled={!canAfford}
                        onClick={() => onBuyPlayer(player)}
                        className={`w-full py-2.5 rounded-lg font-display font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                          canAfford
                            ? 'bg-[#10B981] hover:bg-[#059669] text-[#070A0E]'
                            : 'bg-white/5 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <Coins className="w-3.5 h-3.5" />
                        BUY ({player.price.toLocaleString()} COINS)
                      </button>

                      {onTriggerPaymentCheckout && (
                        <button
                          onClick={() => {
                            SoundEngine.playUIClick();
                            const usd =
                              player.rating >= 95
                                ? 6.99
                                : player.rating >= 92
                                ? 4.99
                                : player.rating >= 89
                                ? 2.99
                                : 1.99;
                            onTriggerPaymentCheckout({
                              itemType: 'player',
                              itemId: player.id,
                              itemName: `${player.name} (${player.rating} OVR)`,
                              subtitle: `${player.nationality} · ${player.position} · ${player.club}`,
                              amountUsd: usd,
                              coinsAdded: 0,
                              playerToUnlock: player,
                            });
                          }}
                          className="w-full py-2 rounded-lg bg-[#070A0E] hover:bg-[#192231] border border-[#38BDF8]/40 text-[#38BDF8] font-display font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          INSTANT BUY ($
                          {(player.rating >= 95
                            ? 6.99
                            : player.rating >= 92
                            ? 4.99
                            : player.rating >= 89
                            ? 2.99
                            : 1.99
                          ).toFixed(2)}
                          )
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 3: PLAYER PACKS */}
      {section === 'packs' && (
        <div className="space-y-8">
          {/* Featured 50-Star Roulette Banner inside Packs */}
          <div className="bg-gradient-to-r from-[#111722] via-[#261D0A] to-[#111722] border-2 border-[#F59E0B]/60 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
            <div>
              <div className="text-xs font-mono text-[#F59E0B] font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                NEW · 50-STAR LEGEND ROULETTE WHEEL · 500,000 COINS PER SPIN
              </div>
              <h2 className="font-display text-2xl font-bold text-white mt-1">
                SPIN FOR THE TOP 50 FOOTBALL STARS IN THE WORLD
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Guaranteed pull from the 50 highest-rated legends & icons (Pelé, Messi, Ronaldo, Mbappé, Haaland, Maradona, Ronaldinho & more).
              </p>
            </div>
            <button
              onClick={() => {
                SoundEngine.playUIClick();
                setSection('spin_roulette');
              }}
              className="px-6 py-3.5 bg-[#F59E0B] hover:bg-[#D97706] text-[#070A0E] font-display font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center gap-2 whitespace-nowrap shadow-lg cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              OPEN 50-STAR ROULETTE (500K)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5">
            {PLAYER_PACKS.map((pack) => {
              const canAfford = coins >= pack.price;
              return (
                <div
                  key={pack.id}
                  className="bg-[#111722] border rounded-2xl overflow-hidden flex flex-col justify-between transition-all hover:-translate-y-1"
                  style={{ borderColor: `${pack.accentColor}50` }}
                >
                  <div>
                    <div className="relative h-40 overflow-hidden bg-[#070A0E]">
                      <img
                        src={packShowcaseImg}
                        alt={pack.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover opacity-75"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#111722] via-transparent to-transparent" />
                      <div
                        className="absolute bottom-3 left-4 font-mono text-xs font-bold"
                        style={{ color: pack.accentColor }}
                      >
                        GUARANTEED {pack.guaranteedRarity.toUpperCase()}+
                      </div>
                    </div>

                    <div className="p-5">
                      <h3 className="font-display text-xl font-bold text-white mb-1">
                        {pack.name}
                      </h3>
                      <div className="text-[11px] font-mono text-slate-400 mb-3">
                        {pack.oddsText}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {pack.description}
                      </p>
                    </div>
                  </div>

                  <div className="p-5 pt-0">
                    <button
                      disabled={!canAfford}
                      onClick={() => handleTriggerPackOpen(pack)}
                      className={`w-full py-3 rounded-lg font-display font-bold text-xs transition-colors flex items-center justify-center gap-2 ${
                        canAfford
                          ? 'bg-[#F59E0B] hover:bg-[#D97706] text-[#070A0E]'
                          : 'bg-white/5 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <PackageOpen className="w-4 h-4" />
                      {pack.price.toLocaleString()} COINS
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* PACK OPENING ANIMATION MODAL */}
          {openingPack && revealedPlayer && (
            <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-6">
              <div
                className="bg-[#111722] border-2 rounded-2xl max-w-md w-full p-8 text-center shadow-2xl animate-in zoom-in-95 duration-300"
                style={{ borderColor: RARITY_COLORS[revealedPlayer.rarity] }}
              >
                <div
                  className="text-xs font-mono font-bold tracking-widest mb-2"
                  style={{ color: RARITY_COLORS[revealedPlayer.rarity] }}
                >
                  {openingPack.name.toUpperCase()} WALKOUT REVEAL!
                </div>
                <div className="my-4 flex flex-col items-center">
                  <PlayerPhotoAvatar
                    player={revealedPlayer}
                    className="w-24 h-24 rounded-2xl border-2 border-[#F59E0B] shadow-2xl"
                    showPositionBadge={true}
                    showRatingBadge={true}
                  />
                </div>
                <div className="text-sm font-mono text-white font-semibold mb-1">
                  {revealedPlayer.position} · {revealedPlayer.nationality} · {revealedPlayer.rarity}
                </div>
                <h2 className="font-display text-3xl font-bold text-white mb-2">
                  {revealedPlayer.name}
                </h2>
                <p className="text-xs text-slate-400 mb-6">{revealedPlayer.club}</p>

                <div className="grid grid-cols-3 gap-2 bg-[#070A0E] border border-white/10 rounded-xl p-4 font-mono text-xs mb-6 tabular-nums">
                  <div>
                    <span className="text-slate-400 block">PAC</span>
                    <span className="text-white font-bold text-sm">{revealedPlayer.attributes.pace}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">SHO</span>
                    <span className="text-white font-bold text-sm">{revealedPlayer.attributes.shooting}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">DRI</span>
                    <span className="text-white font-bold text-sm">{revealedPlayer.attributes.dribbling}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">PAS</span>
                    <span className="text-white font-bold text-sm">{revealedPlayer.attributes.passing}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">CRV</span>
                    <span className="text-[#F59E0B] font-bold text-sm">{revealedPlayer.attributes.curve}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">SKL</span>
                    <span className="text-[#38BDF8] font-bold text-sm">{revealedPlayer.attributes.skill}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setOpeningPack(null);
                    setRevealedPlayer(null);
                  }}
                  className="w-full py-3 bg-[#10B981] hover:bg-[#059669] text-[#070A0E] font-display font-bold text-sm rounded-lg transition-colors"
                >
                  SEND TO MY SQUAD
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: 50-STAR PLAYER SPIN / ROULETTE SYSTEM (500,000 COINS PER SPIN) */}
      {section === 'spin_roulette' && (
        <div className="space-y-8">
          {/* Main Roulette Spin Arena */}
          <div className="bg-gradient-to-b from-[#111722] to-[#0A0F18] border-2 border-[#F59E0B]/60 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <div className="text-xs font-mono text-[#F59E0B] font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  OFFICIAL 50-STAR SUPERSTAR ROULETTE · {SPIN_COST_COINS.toLocaleString()} COINS PER SPIN
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
                  TOP 50 WORLD FOOTBALL STARS ROULETTE
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
                  Every spin costs <span className="text-[#F59E0B] font-mono font-bold">500,000 Coins</span> and guarantees one of the <span className="text-white font-semibold">50 Best Football Stars & Icons</span> (OVR 89–98). Won players are permanently unlocked and saved to your account!
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <div className="px-4 py-2.5 rounded-xl bg-[#070A0E] border border-white/15 font-mono text-xs text-slate-300">
                  Top 50 Owned:{' '}
                  <span className="text-[#10B981] font-bold">
                    {TOP_50_SPIN_PLAYERS.filter((p) => unlockedPlayerIds.includes(p.id)).length} /{' '}
                    {TOP_50_SPIN_PLAYERS.length}
                  </span>
                </div>

                {onTriggerPaymentCheckout && coins < SPIN_COST_COINS && (
                  <button
                    onClick={() => {
                      SoundEngine.playUIClick();
                      onTriggerPaymentCheckout({
                        itemType: 'coins',
                        itemId: 'coins_500k_spin',
                        itemName: '+500,000 Roulette Spin Coins',
                        subtitle: 'Instant 500,000 Coins for the 50-Star Roulette Wheel',
                        amountUsd: 9.99,
                        coinsAdded: 500000,
                      });
                    }}
                    className="px-4 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-[#070A0E] font-display font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Coins className="w-4 h-4" />
                    GET +500,000 COINS
                  </button>
                )}
              </div>
            </div>

            {/* Interactive Roulette Carousel Window (Displays 5 Cards Around Active Highlight Index) */}
            <div className="relative bg-[#070A0E] border-2 border-[#F59E0B]/50 rounded-2xl p-5 sm:p-6 overflow-hidden">
              {/* Top & Bottom Center Pointer Triangles */}
              <div className="flex justify-center mb-3">
                <div className="px-3 py-1 rounded-full bg-[#F59E0B] text-[#070A0E] font-mono text-[11px] font-bold tracking-wider flex items-center gap-1.5 shadow-lg">
                  <Crown className="w-3.5 h-3.5" />
                  {isSpinningRoulette ? 'SPINNING 50-STAR WHEEL...' : 'ROULETTE TARGET SELECTOR ▼'}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 items-stretch">
                {[-2, -1, 0, 1, 2].map((offset) => {
                  const poolLen = TOP_50_SPIN_PLAYERS.length;
                  const idx = (rouletteHighlightIndex + offset + poolLen * 10) % poolLen;
                  const star = TOP_50_SPIN_PLAYERS[idx];
                  if (!star) return null;
                  const isCenter = offset === 0;
                  const accent = RARITY_COLORS[star.rarity];

                  return (
                    <div
                      key={`${star.id}_${offset}`}
                      className={`rounded-xl p-4 border transition-all flex flex-col justify-between ${
                        isCenter
                          ? 'bg-gradient-to-b from-[#1E293B] to-[#0F172A] border-2 border-[#F59E0B] scale-105 shadow-2xl z-10 ring-2 ring-[#F59E0B]/40'
                          : 'bg-[#111722]/70 border-white/10 opacity-65 hidden sm:flex'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between font-mono text-xs mb-2">
                          <span className="font-bold text-2xl" style={{ color: accent }}>
                            {star.rating}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-white/10 text-white font-bold">
                            {star.position}
                          </span>
                        </div>
                        <div className="flex flex-col items-center my-2">
                          <PlayerPhotoAvatar
                            player={star}
                            className="w-16 h-16 rounded-xl border border-white/25 shadow-lg"
                          />
                          <div className="font-display font-bold text-xs sm:text-sm text-white text-center truncate w-full mt-1.5 leading-tight">
                            {star.name}
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-300 text-center truncate mt-0.5">
                          {star.nationality} · {star.club}
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between font-mono text-[11px]">
                        <span style={{ color: accent }} className="font-bold">
                          {star.rarity}
                        </span>
                        <span className="text-slate-300">
                          PAC {star.attributes.pace} · SHO {star.attributes.shooting}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Spin Action Button */}
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  disabled={isSpinningRoulette || coins < SPIN_COST_COINS}
                  onClick={handleStartRouletteSpin}
                  className={`px-8 py-4 rounded-xl font-display font-bold text-base transition-all flex items-center justify-center gap-3 shadow-2xl cursor-pointer ${
                    isSpinningRoulette
                      ? 'bg-[#F59E0B]/50 text-[#070A0E] cursor-wait'
                      : coins >= SPIN_COST_COINS
                      ? 'bg-gradient-to-r from-[#F59E0B] via-[#FBBF24] to-[#F59E0B] hover:brightness-110 text-[#070A0E] scale-100 hover:scale-105'
                      : 'bg-white/10 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Sparkles className="w-5 h-5" />
                  {isSpinningRoulette
                    ? 'SPINNING ROULETTE...'
                    : coins >= SPIN_COST_COINS
                    ? `SPIN ROULETTE WHEEL (${SPIN_COST_COINS.toLocaleString()} COINS)`
                    : `NEED ${SPIN_COST_COINS.toLocaleString()} COINS TO SPIN (YOU HAVE ${coins.toLocaleString()})`}
                </button>
              </div>
            </div>

            {/* Winner Walkout Banner */}
            {rouletteWinner && !isSpinningRoulette && (
              <div
                className="p-6 rounded-2xl bg-[#070A0E] border-2 flex flex-col md:flex-row items-center justify-between gap-6 animate-in zoom-in-95 duration-300"
                style={{ borderColor: RARITY_COLORS[rouletteWinner.rarity] }}
              >
                <div className="flex items-center gap-5">
                  <PlayerPhotoAvatar
                    player={rouletteWinner}
                    className="w-20 h-20 rounded-2xl border-2 border-[#F59E0B] shadow-2xl"
                    showPositionBadge={true}
                    showRatingBadge={true}
                  />
                  <div>
                    <div className="text-xs font-mono text-[#10B981] font-bold">
                      ★ ROULETTE REWARD UNLOCKED & SAVED PERMANENTLY!
                    </div>
                    <h3 className="font-display text-2xl sm:text-3xl font-bold text-white">
                      {rouletteWinner.name}
                    </h3>
                    <p className="text-xs text-slate-300">
                      {rouletteWinner.nationality} · {rouletteWinner.club} · PAC{' '}
                      {rouletteWinner.attributes.pace} · SHO {rouletteWinner.attributes.shooting} · DRI{' '}
                      {rouletteWinner.attributes.dribbling}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <button
                    onClick={() => {
                      setSelectedSwapIndex(9);
                      handleAssignUnlockedPlayerToSlot(rouletteWinner);
                      setSection('my_team');
                    }}
                    className="px-5 py-3 bg-[#10B981] hover:bg-[#059669] text-[#070A0E] font-display font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    PUT IN STARTING XI (LEAD STAR)
                  </button>
                  <button
                    disabled={coins < SPIN_COST_COINS}
                    onClick={handleStartRouletteSpin}
                    className={`px-5 py-3 font-display font-bold text-xs rounded-xl transition-colors cursor-pointer ${
                      coins >= SPIN_COST_COINS
                        ? 'bg-[#F59E0B] hover:bg-[#D97706] text-[#070A0E]'
                        : 'bg-white/10 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    SPIN AGAIN (500K)
                  </button>
                </div>
              </div>
            )}

            {/* Recent Spin History */}
            {spinHistory.length > 0 && (
              <div className="pt-2">
                <div className="text-xs font-mono text-slate-400 mb-2">
                  RECENT ROULETTE REWARDS UNLOCKED THIS SESSION:
                </div>
                <div className="flex flex-wrap gap-2">
                  {spinHistory.map((p, i) => (
                    <span
                      key={`${p.id}_${i}`}
                      className="px-3 py-1.5 rounded-lg bg-[#070A0E] border border-[#F59E0B]/40 text-xs font-mono text-white flex items-center gap-1.5"
                    >
                      <span className="text-[#F59E0B] font-bold">{p.rating}</span>
                      <span>{p.name}</span>
                      <span className="text-slate-400">({p.position})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* All 50 Top Football Stars Included in the Roulette Pool */}
          <div className="bg-[#111722] border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-xs font-mono text-[#F59E0B] font-bold">
                  COMPLETE 50-STAR ROULETTE POOL · BEST FOOTBALL STARS & LEGENDS INCLUDED
                </div>
                <h3 className="font-display text-xl font-bold text-white">
                  All 50 Top Football Players Available in the 500,000-Coin Spin
                </h3>
              </div>
              <span className="font-mono text-xs text-slate-400">
                Sorted by OVR Rating ({TOP_50_SPIN_PLAYERS[0]?.rating} –{' '}
                {TOP_50_SPIN_PLAYERS[TOP_50_SPIN_PLAYERS.length - 1]?.rating})
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {TOP_50_SPIN_PLAYERS.map((star, index) => {
                const owned = unlockedPlayerIds.includes(star.id);
                const accent = RARITY_COLORS[star.rarity];
                return (
                  <div
                    key={star.id}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                      owned
                        ? 'bg-[#192231]/90 border-[#10B981]/60'
                        : 'bg-[#070A0E] border-white/10'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between font-mono text-xs mb-2">
                        <span className="text-slate-400">#{index + 1}</span>
                        <span className="font-bold text-base" style={{ color: accent }}>
                          OVR {star.rating}
                        </span>
                      </div>
                      <div className="flex flex-col items-center text-center">
                        <PlayerPhotoAvatar
                          player={star}
                          className="w-14 h-14 rounded-xl border border-white/20 shadow-md"
                          showPositionBadge={true}
                        />
                        <div className="font-display font-bold text-xs sm:text-sm text-white truncate w-full mt-1.5 leading-tight">
                          {star.name}
                        </div>
                        <div className="text-[11px] text-slate-300 font-semibold truncate w-full mt-0.5">
                          {star.position} · {star.nationality}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate w-full">{star.club}</div>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono">
                      <span style={{ color: accent }}>{star.rarity}</span>
                      {owned ? (
                        <span className="text-[#10B981] font-bold flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> OWNED
                        </span>
                      ) : (
                        <span className="text-[#F59E0B]">IN SPIN POOL</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {scoutOpponentInfo && (
        <OpponentSquadPopup
          isOpen={Boolean(scoutOpponentInfo)}
          onClose={() => setScoutOpponentInfo(null)}
          opponent={scoutOpponentInfo}
        />
      )}
    </div>
  );
};
