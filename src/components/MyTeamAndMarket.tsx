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
  ALL_SQUAD_POSITIONS,
  buildOptimalSquadForFormation,
  CELEBRATIONS,
  CelebrationType,
  findBestSlotIndexForPlayer,
  FootballPlayer,
  FormationName,
  FORMATIONS,
  getCompatiblePositionsForSlot,
  getPlayerSlotFitLevel,
  normalizeSlotPosition,
  PackDefinition,
  PLAYER_PACKS,
  PlayerRarity,
  PLAYERS_DB,
  PositionCode,
  SPIN_COST_COINS,
  TeamData,
  TEAMS_DB,
  TOP_50_SPIN_PLAYERS,
  UPGRADE_CARDS_DB,
  UpgradeCardItem,
} from '../data/gameDatabase';
import { SoundEngine } from '../engine/SoundEngine';
import { FriendRoomService } from '../engine/FriendRoomService';
import { OpponentSquadInfo, OpponentSquadPopup } from './OpponentSquadPopup';
import { EFootballPitchPlayerCard, PlayerPhotoAvatar } from './PlayerPhotoAvatar';
import { EFootballCardOpeningModal, EFootballPlayerCard } from './EFootballPlayerCard';
import { ClassicPESBallOpeningModal } from './ClassicPESBallOpeningModal';
import packShowcaseImg from '../assets/images/transfer_pack_showcase_1791305671660.jpg';

interface SpinDrawTier {
  id: string;
  name: string;
  subtitle: string;
  costCoins: number;
  minRarity: PlayerRarity;
  accentColor: string;
  badgeText: string;
}

const SPIN_DRAW_TIERS: SpinDrawTier[] = [
  {
    id: 'spin_standard_10k',
    name: 'Standard Star Spin Draw',
    subtitle: 'Draw from all 56 World Cup Stars (OVR 85–98)',
    costCoins: 10000,
    minRarity: 'Common',
    accentColor: '#38BDF8',
    badgeText: '10,000 COINS · ALL STARS',
  },
  {
    id: 'spin_highlight_25k',
    name: 'Highlight & Show Time Draw',
    subtitle: 'Guaranteed Elite, World Class, or Legendary Card (OVR 88+)',
    costCoins: 25000,
    minRarity: 'Elite',
    accentColor: '#A855F7',
    badgeText: '25,000 COINS · ELITE+',
  },
  {
    id: 'spin_epic_50k',
    name: 'Epic & Show Time Legend Draw',
    subtitle: 'Guaranteed World Class or Legendary Icon (OVR 91–98)',
    costCoins: 50000,
    minRarity: 'World Class',
    accentColor: '#10B981',
    badgeText: '50,000 COINS · WORLD CLASS+',
  },
  {
    id: 'spin_mega_500k',
    name: '50-Star Mega Legend Roulette',
    subtitle: 'Guaranteed Unowned Top 50 Football Superstar & Icon',
    costCoins: SPIN_COST_COINS,
    minRarity: 'World Class',
    accentColor: '#F59E0B',
    badgeText: '500,000 COINS · TOP 50 UNOWNED',
  },
];

interface MyTeamAndMarketProps {
  initialSection: 'my_team' | 'transfer_market' | 'upgrades' | 'packs' | 'spin_roulette';
  coins: number;
  userTeam: TeamData;
  userFormation: FormationName;
  userSquad: FootballPlayer[];
  allPlayers?: FootballPlayer[];
  unlockedPlayerIds: string[];
  captainId: string;
  preferredCelebration: CelebrationType;
  onSelectTeam: (team: TeamData) => void;
  onSelectFormation: (formation: FormationName) => void;
  onUpdateSquadOrder: (nextSquad: FootballPlayer[]) => void;
  onSelectCaptain: (playerId: string) => void;
  onSelectCelebration: (cel: CelebrationType) => void;
  onBuyPlayer: (player: FootballPlayer) => void;
  onApplyUpgradeCard?: (card: UpgradeCardItem, targetPlayerId: string) => void;
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
  'Special Edition': '#EC4899',
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
  allPlayers,
  unlockedPlayerIds,
  captainId,
  preferredCelebration,
  onSelectTeam,
  onSelectFormation,
  onUpdateSquadOrder,
  onSelectCaptain,
  onSelectCelebration,
  onBuyPlayer,
  onApplyUpgradeCard,
  onOpenPack,
  onSpinRoulette,
  onPlayDreamTeamOffline,
  onTriggerPaymentCheckout,
}) => {
  const playersPool = allPlayers && allPlayers.length > 0 ? allPlayers : PLAYERS_DB;
  const [section, setSection] = useState<
    'my_team' | 'transfer_market' | 'upgrades' | 'packs' | 'spin_roulette'
  >(initialSection);
  const [selectedSwapIndex, setSelectedSwapIndex] = useState<number | null>(1); // Default LB / Slot #2 or any clicked slot
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [squadPositionFilter, setSquadPositionFilter] = useState<'slot_match' | 'all' | PositionCode>('slot_match');
  const [squadActionBanner, setSquadActionBanner] = useState<string | null>(null);
  const [clubCategoryFilter, setClubCategoryFilter] = useState<'Club' | 'International'>('Club');
  const [scoutOpponentInfo, setScoutOpponentInfo] = useState<OpponentSquadInfo | null>(null);

  // Market filters
  const [rarityFilter, setRarityFilter] = useState<'All' | PlayerRarity>('All');
  const [posFilter, setPosFilter] = useState<'All' | PositionCode>('All');
  const [ownershipFilter, setOwnershipFilter] = useState<'all' | 'owned' | 'available'>('all');
  const [minRatingFilter, setMinRatingFilter] = useState<number>(0);
  const [maxPriceFilter, setMaxPriceFilter] = useState<number>(0);
  const [nationalityFilter, setNationalityFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<
    'rating_desc' | 'price_asc' | 'shooting_power_desc' | 'passing_desc' | 'speed_desc'
  >('rating_desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [marketPage, setMarketPage] = useState<number>(1);
  const [marketPageSize, setMarketPageSize] = useState<number>(48);
  const [marketFeedback, setMarketFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Upgrade Cards state
  const [upgradeTargetPlayerId, setUpgradeTargetPlayerId] = useState<string>(
    userSquad[9]?.id || PLAYERS_DB[0].id
  );
  const [upgradeRarityFilter, setUpgradeRarityFilter] = useState<
    'All' | 'Common' | 'Rare' | 'Elite' | 'Legendary' | 'Special Edition'
  >('All');
  const [upgradeFeedback, setUpgradeFeedback] = useState<string | null>(null);

  // Tactics state
  const [mentality, setMentality] = useState(userTeam.tactics.mentality);
  const [passingStyle, setPassingStyle] = useState(userTeam.tactics.passingStyle);
  const [defensiveLine, setDefensiveLine] = useState(userTeam.tactics.defensiveLine);

  // eFootball Card-Opening Walkout / Inspection Modal state
  const [openingPack, setOpeningPack] = useState<PackDefinition | null>(null);
  const [revealedPlayer, setRevealedPlayer] = useState<FootballPlayer | null>(null);
  const [cardModalState, setCardModalState] = useState<{
    player: FootballPlayer;
    sourceTitle: string;
    sourceSubtitle: string;
    skipAnimation: boolean;
    canSpinAgain?: boolean;
    spinAgainLabel?: string;
    onSpinAgain?: () => void;
  } | null>(null);

  // Spin / Draw & 50-Star Roulette state
  const [selectedSpinTierId, setSelectedSpinTierId] = useState<string>('spin_epic_50k');
  const [isSpinningRoulette, setIsSpinningRoulette] = useState(false);
  const [rouletteHighlightIndex, setRouletteHighlightIndex] = useState<number>(0);
  const [rouletteWinner, setRouletteWinner] = useState<FootballPlayer | null>(null);
  const [spinHistory, setSpinHistory] = useState<FootballPlayer[]>([]);
  const [drawMode, setDrawMode] = useState<'classic_ball' | 'roulette'>('classic_ball');
  const [pesBallModalState, setPesBallModalState] = useState<{
    player: FootballPlayer;
    sourceTitle: string;
    sourceSubtitle: string;
    canDrawAgain?: boolean;
    drawAgainLabel?: string;
    onDrawAgain?: () => void;
  } | null>(null);

  React.useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  const activeSpinTier =
    SPIN_DRAW_TIERS.find((t) => t.id === selectedSpinTierId) || SPIN_DRAW_TIERS[2];

  const handlePurchasePlayerWithReveal = (player: FootballPlayer) => {
    if (unlockedPlayerIds.includes(player.id)) {
      setMarketFeedback({
        type: 'error',
        message: `${player.name} is already in your squad collection! Coins were not deducted.`,
      });
      return;
    }
    if (coins < player.price) {
      SoundEngine.playUIClick();
      const needed = player.price - coins;
      setMarketFeedback({
        type: 'error',
        message: `Insufficient Coins! You need ${needed.toLocaleString()} more Coins to buy ${player.name} (Price: ${player.price.toLocaleString()} Coins · Your Balance: ${coins.toLocaleString()} Coins).`,
      });
      return;
    }
    onBuyPlayer(player);
    setMarketFeedback({
      type: 'success',
      message: `Successfully signed ${player.name} (${player.rating} OVR · ${player.position}) for ${player.price.toLocaleString()} Coins! Added to your squad.`,
    });
    setCardModalState({
      player,
      sourceTitle: 'EFOOTBALL TRANSFER SIGNING',
      sourceSubtitle: `Purchased for ${player.price.toLocaleString()} Coins`,
      skipAnimation: false,
      canSpinAgain: false,
    });
  };

  const handleStartRouletteSpin = (tierOverride?: SpinDrawTier) => {
    const tier = tierOverride || activeSpinTier;
    if (isSpinningRoulette || coins < tier.costCoins) return;

    const rarityOrder: PlayerRarity[] = ['Common', 'Rare', 'Elite', 'World Class', 'Legendary'];
    const minIdx = rarityOrder.indexOf(tier.minRarity);
    const basePool =
      tier.id === 'spin_mega_500k'
        ? TOP_50_SPIN_PLAYERS
        : TOP_50_SPIN_PLAYERS.filter((p) => rarityOrder.indexOf(p.rarity) >= minIdx);
    const pool = basePool.length > 0 ? basePool : TOP_50_SPIN_PLAYERS;
    if (!pool.length) return;

    // Prefer unowned stars so spins feel super rewarding; fallback to full pool
    const unownedPool = pool.filter((p) => !unlockedPlayerIds.includes(p.id));
    const candidatePool = unownedPool.length > 0 ? unownedPool : pool;
    const chosen = candidatePool[Math.floor(Math.random() * candidatePool.length)] || pool[0];
    const targetIdx = Math.max(0, TOP_50_SPIN_PLAYERS.findIndex((p) => p.id === chosen.id));

    if (drawMode === 'classic_ball') {
      if (onSpinRoulette) {
        onSpinRoulette(tier.costCoins, chosen);
      } else {
        onOpenPack(
          {
            id: tier.id,
            name: tier.name,
            price: tier.costCoins,
            guaranteedRarity: tier.minRarity,
            description: tier.subtitle,
            accentColor: tier.accentColor,
            oddsText: tier.badgeText,
          },
          chosen
        );
      }
      setSpinHistory((prev) => [chosen, ...prev.slice(0, 7)]);
      setPesBallModalState({
        player: chosen,
        sourceTitle: tier.name.toUpperCase(),
        sourceSubtitle: `${tier.costCoins.toLocaleString()} Coins Special Agent Draw`,
        canDrawAgain: coins - tier.costCoins >= tier.costCoins,
        drawAgainLabel: `DRAW AGAIN (${tier.costCoins.toLocaleString()} COINS)`,
        onDrawAgain: () => handleStartRouletteSpin(tier),
      });
      return;
    }

    setIsSpinningRoulette(true);
    setRouletteWinner(null);
    setCardModalState(null);
    SoundEngine.playUIClick();

    const displayPoolLen = TOP_50_SPIN_PLAYERS.length;
    const totalSteps = 26 + (targetIdx % displayPoolLen);
    let step = 0;

    const tick = () => {
      step += 1;
      const currentIdx = step % displayPoolLen;
      setRouletteHighlightIndex(currentIdx);
      SoundEngine.playUIClick();

      if (step < totalSteps) {
        const progress = step / totalSteps;
        const delay = Math.round(32 + Math.pow(progress, 2.2) * 185);
        setTimeout(tick, delay);
      } else {
        setRouletteHighlightIndex(targetIdx);
        setIsSpinningRoulette(false);
        setRouletteWinner(chosen);
        setSpinHistory((prev) => [chosen, ...prev.slice(0, 7)]);
        if (onSpinRoulette) {
          onSpinRoulette(tier.costCoins, chosen);
        } else {
          onOpenPack(
            {
              id: tier.id,
              name: tier.name,
              price: tier.costCoins,
              guaranteedRarity: tier.minRarity,
              description: tier.subtitle,
              accentColor: tier.accentColor,
              oddsText: tier.badgeText,
            },
            chosen
          );
        }
        // Trigger smooth, exciting eFootball Card-Opening Walkout Reveal Modal!
        setCardModalState({
          player: chosen,
          sourceTitle: tier.name.toUpperCase(),
          sourceSubtitle: `${tier.costCoins.toLocaleString()} Coins Spin Draw`,
          skipAnimation: false,
          canSpinAgain: coins - tier.costCoins >= tier.costCoins,
          spinAgainLabel: `SPIN AGAIN (${tier.costCoins.toLocaleString()})`,
          onSpinAgain: () => handleStartRouletteSpin(tier),
        });
      }
    };

    setTimeout(tick, 40);
  };

  const handleSwapPlayers = (idxA: number, idxB: number) => {
    if (idxA === idxB) return;
    const copy = [...userSquad];
    const playerA = copy[idxA];
    const playerB = copy[idxB];
    copy[idxA] = playerB;
    copy[idxB] = playerA;
    onUpdateSquadOrder(copy);
    setSelectedSwapIndex(idxB);
    const slotA = FORMATIONS[userFormation][idxA]?.label || `Slot #${idxA + 1}`;
    const slotB = FORMATIONS[userFormation][idxB]?.label || `Slot #${idxB + 1}`;
    if (playerA && playerB) {
      setSquadActionBanner(
        `Swapped ${playerA.name} (${slotA} → ${slotB}) with ${playerB.name} (${slotB} → ${slotA}).`
      );
    }
    SoundEngine.playUIClick();
  };

  const handleAssignUnlockedPlayerToSlot = (player: FootballPlayer, explicitSlotIdx?: number) => {
    SoundEngine.playUIClick();
    const targetSlot =
      explicitSlotIdx !== undefined
        ? explicitSlotIdx
        : selectedSwapIndex !== null
        ? selectedSwapIndex
        : findBestSlotIndexForPlayer(player, userFormation, userSquad);

    const copy = [...userSquad];
    const existingIdx = copy.findIndex((p) => p?.id === player.id);
    const slotLabel = FORMATIONS[userFormation][targetSlot]?.label || player.position;
    const previousOccupant = copy[targetSlot];

    if (existingIdx === targetSlot) {
      setSquadActionBanner(`${player.name} is already active at ${slotLabel}.`);
      return;
    }

    if (existingIdx >= 0 && existingIdx < 11) {
      // Swap between two Starting XI positions
      const otherSlotLabel = FORMATIONS[userFormation][existingIdx]?.label || `Slot #${existingIdx + 1}`;
      copy[targetSlot] = player;
      copy[existingIdx] = previousOccupant;
      setSquadActionBanner(
        `Swapped ${player.name} into ${slotLabel} and moved ${previousOccupant?.name || 'player'} to ${otherSlotLabel}!`
      );
    } else if (existingIdx >= 11) {
      // Swap from reserve bench into Starting XI targetSlot
      copy[targetSlot] = player;
      copy[existingIdx] = previousOccupant;
      setSquadActionBanner(
        `Placed ${player.name} (${player.position} · OVR ${player.rating}) into ${slotLabel} (replaced ${previousOccupant?.name || 'player'})!`
      );
    } else {
      // Player wasn't in userSquad array yet — place into targetSlot and keep previous occupant in reserves
      copy[targetSlot] = player;
      if (previousOccupant && !copy.some((p) => p?.id === previousOccupant.id)) {
        copy.push(previousOccupant);
      }
      setSquadActionBanner(
        `Placed ${player.name} (${player.position} · OVR ${player.rating}) into ${slotLabel} (replaced ${previousOccupant?.name || 'player'})!`
      );
    }
    onUpdateSquadOrder(copy.filter(Boolean));
  };

  const handleAutoFillBestSquad = () => {
    SoundEngine.playUIClick();
    const unlockedPool = playersPool.filter((p) => unlockedPlayerIds.includes(p.id));
    const optimal = buildOptimalSquadForFormation(unlockedPool, userSquad, userFormation);
    onUpdateSquadOrder(optimal);
    setSquadActionBanner(
      `Auto-arranged your highest-rated unlocked players into their natural ${userFormation} positions!`
    );
  };

  const handleTriggerPackOpen = (pack: PackDefinition) => {
    if (coins < pack.price) return;
    setOpeningPack(pack);

    // Filter pool by guaranteed rarity or higher
    const rarityOrder: PlayerRarity[] = ['Common', 'Rare', 'Elite', 'World Class', 'Legendary'];
    const minIdx = rarityOrder.indexOf(pack.guaranteedRarity);
    const eligible = PLAYERS_DB.filter((p) => rarityOrder.indexOf(p.rarity) >= minIdx);
    const pulled = eligible[Math.floor(Math.random() * eligible.length)] || PLAYERS_DB[0];

    setRevealedPlayer(pulled);
    onOpenPack(pack, pulled);

    if (drawMode === 'classic_ball') {
      setPesBallModalState({
        player: pulled,
        sourceTitle: `${pack.name.toUpperCase()} BALL OPENING`,
        sourceSubtitle: `${pack.oddsText} · Guaranteed ${pack.guaranteedRarity}+`,
        canDrawAgain: coins - pack.price >= pack.price,
        drawAgainLabel: `OPEN AGAIN (${pack.price.toLocaleString()})`,
        onDrawAgain: () => handleTriggerPackOpen(pack),
      });
    } else {
      setCardModalState({
        player: pulled,
        sourceTitle: `${pack.name.toUpperCase()} WALKOUT`,
        sourceSubtitle: `${pack.oddsText} · Guaranteed ${pack.guaranteedRarity}+`,
        skipAnimation: false,
        canSpinAgain: coins - pack.price >= pack.price,
        spinAgainLabel: `OPEN AGAIN (${pack.price.toLocaleString()})`,
        onSpinAgain: () => handleTriggerPackOpen(pack),
      });
    }
  };

  const allNationalities = React.useMemo(() => {
    const set = new Set<string>();
    playersPool.forEach((p) => set.add(p.nationality));
    return Array.from(set).sort();
  }, [playersPool]);

  const filteredMarketPlayers = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = playersPool.filter((p) => {
      if (ownershipFilter === 'owned' && !unlockedPlayerIds.includes(p.id)) return false;
      if (ownershipFilter === 'available' && unlockedPlayerIds.includes(p.id)) return false;
      if (rarityFilter !== 'All' && p.rarity !== rarityFilter) return false;
      if (posFilter !== 'All' && p.position !== posFilter) return false;
      if (minRatingFilter > 0 && p.rating < minRatingFilter) return false;
      if (maxPriceFilter > 0 && p.price > maxPriceFilter) return false;
      if (nationalityFilter !== 'All' && p.nationality !== nationalityFilter) return false;
      if (
        q &&
        !p.name.toLowerCase().includes(q) &&
        !p.nationality.toLowerCase().includes(q) &&
        !p.club.toLowerCase().includes(q) &&
        !p.position.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'rating_desc') return b.rating - a.rating || b.price - a.price;
      if (sortBy === 'price_asc') return a.price - b.price || b.rating - a.rating;
      if (sortBy === 'shooting_power_desc') {
        const shpA = a.attributes.shooting * 0.65 + a.attributes.physical * 0.35;
        const shpB = b.attributes.shooting * 0.65 + b.attributes.physical * 0.35;
        return shpB - shpA || b.rating - a.rating;
      }
      if (sortBy === 'passing_desc') {
        return b.attributes.passing - a.attributes.passing || b.rating - a.rating;
      }
      if (sortBy === 'speed_desc') {
        return b.attributes.pace - a.attributes.pace || b.rating - a.rating;
      }
      return 0;
    });
  }, [
    playersPool,
    ownershipFilter,
    unlockedPlayerIds,
    rarityFilter,
    posFilter,
    minRatingFilter,
    maxPriceFilter,
    nationalityFilter,
    searchQuery,
    sortBy,
  ]);

  // Reset pagination to page 1 whenever any filter changes
  React.useEffect(() => {
    setMarketPage(1);
  }, [
    ownershipFilter,
    rarityFilter,
    posFilter,
    minRatingFilter,
    maxPriceFilter,
    nationalityFilter,
    searchQuery,
    sortBy,
  ]);

  const totalMarketPages = Math.max(1, Math.ceil(filteredMarketPlayers.length / marketPageSize));
  const currentSafePage = Math.min(marketPage, totalMarketPages);
  const paginatedMarketPlayers = React.useMemo(() => {
    const start = (currentSafePage - 1) * marketPageSize;
    return filteredMarketPlayers.slice(start, start + marketPageSize);
  }, [filteredMarketPlayers, currentSafePage, marketPageSize]);

  const avgTeamRating = Math.round(
    userSquad.slice(0, 11).reduce((acc, p) => acc + p.rating, 0) / 11
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header & Section Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6 mb-8">
        <div>
          <div className="text-xs font-mono text-[#10B981] mb-1">
            DREAM TEAM 11V11 SQUAD BUILDER · PLAYER MARKET · UPGRADE CARDS
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-white">
            {section === 'my_team'
              ? `DREAM TEAM 11V11: ${userTeam.name.toUpperCase()}`
              : section === 'transfer_market'
              ? `PLAYER BUYING MARKET (${playersPool.length} PLAYERS)`
              : section === 'upgrades'
              ? 'COLLECTIBLE UPGRADE & BOOST CARDS'
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
              Player Market ({playersPool.length})
            </button>
            <button
              onClick={() => {
                SoundEngine.playUIClick();
                setSection('upgrades');
              }}
              className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                section === 'upgrades'
                  ? 'bg-[#EC4899] text-white font-bold'
                  : 'text-[#F9A8D4] hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Upgrade Cards ({UPGRADE_CARDS_DB.length})
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
              Spin / Draw Cards
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
          {/* 11V11 DREAM TEAM STADIUM KICK-OFF BANNER */}
          <div className="bg-gradient-to-r from-[#111722] via-[#132235] to-[#111722] border-2 border-[#10B981]/60 rounded-2xl p-6 shadow-2xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#10B981] font-bold">
                  <Shield className="w-4 h-4" />
                  <span>11V11 DREAM TEAM · FULL STARTING XI STADIUM SIMULATION</span>
                  <span className="px-2.5 py-0.5 rounded bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40">
                    SQUAD OVR {avgTeamRating}
                  </span>
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
                  PLAY 11V11 WITH YOUR CUSTOM DREAM TEAM
                </h2>
                <p className="text-xs sm:text-sm text-slate-300">
                  Lead your custom 11-player <span className="text-white font-semibold">{userTeam.name}</span> Starting XI ({userFormation}, OVR {avgTeamRating}) onto the 3D stadium pitch! Control all 11 footballers with real-time player switching (<span className="font-mono text-[#10B981]">Q</span>), pinpoint short & through passes, finesse shots, headers, and skill moves.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                {onPlayDreamTeamOffline && (
                  <button
                    onClick={() => {
                      SoundEngine.playUIClick();
                      onPlayDreamTeamOffline();
                    }}
                    className="px-6 py-3.5 bg-[#10B981] hover:bg-[#059669] text-[#070A0E] font-display font-bold text-sm rounded-xl transition-all flex items-center gap-2 shadow-lg cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    PLAY 11V11 DREAM TEAM MATCH
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    SoundEngine.playUIClick();
                    setSection('transfer_market');
                  }}
                  className="px-5 py-3.5 bg-[#F59E0B] hover:bg-[#D97706] text-[#070A0E] font-display font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center gap-2 shadow-lg cursor-pointer"
                >
                  <Coins className="w-4 h-4" />
                  BUY PLAYERS IN MARKET
                </button>
                <button
                  type="button"
                  onClick={() => {
                    SoundEngine.playUIClick();
                    setSection('upgrades');
                  }}
                  className="px-4 py-3.5 bg-[#EC4899]/20 hover:bg-[#EC4899] text-[#F9A8D4] hover:text-white border border-[#EC4899]/50 font-display font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Zap className="w-4 h-4" />
                  UPGRADE CARDS
                </button>
              </div>
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
                    Click any position on the pitch (e.g. LB, CB, GK, CM, ST) to select & place an available player there, or drag/swap between positions.
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleAutoFillBestSquad}
                    className="px-3 py-1.5 rounded-lg bg-[#10B981]/20 hover:bg-[#10B981] text-[#10B981] hover:text-[#070A0E] border border-[#10B981]/40 font-display font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    AUTO-FILL BEST XI
                  </button>
                  <div className="font-mono text-sm text-[#F59E0B] font-bold">
                    SQUAD OVR {avgTeamRating}
                  </div>
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
                    className={`px-3 py-1.5 rounded-lg font-mono text-xs font-semibold transition-colors cursor-pointer ${
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

                {/* Tactical Chemistry Link Lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                  {FORMATIONS[userFormation].map((slotA, i) => {
                    const ax = ((slotA.x + 0.96) / 0.95) * 82 + 7;
                    const ay = ((slotA.z + 0.85) / 1.7) * 78 + 11;
                    return FORMATIONS[userFormation].slice(i + 1).map((slotB, j) => {
                      const bx = ((slotB.x + 0.96) / 0.95) * 82 + 7;
                      const by = ((slotB.z + 0.85) / 1.7) * 78 + 11;
                      const dist = Math.hypot(bx - ax, by - ay);
                      if (dist > 34) return null;
                      return (
                        <line
                          key={`link_${i}_${i + 1 + j}`}
                          x1={`${ax}%`}
                          y1={`${ay}%`}
                          x2={`${bx}%`}
                          y2={`${by}%`}
                          stroke="rgba(16, 185, 129, 0.24)"
                          strokeWidth="2"
                          strokeDasharray="4 4"
                        />
                      );
                    });
                  })}
                </svg>

                {/* 11 Starting Players */}
                {FORMATIONS[userFormation].map((slot, idx) => {
                  const player = userSquad[idx] || playersPool[idx] || PLAYERS_DB[idx];
                  // Map slot.x in [-0.92, -0.08] across full pitch width [8%, 88%]
                  const leftPct = ((slot.x + 0.96) / 0.95) * 82 + 7;
                  const topPct = ((slot.z + 0.85) / 1.7) * 78 + 11;
                  const isSelected = selectedSwapIndex === idx;
                  const isCaptain = player.id === captainId;
                  const fit = getPlayerSlotFitLevel(player.position, slot.role, slot.label);

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
                        SoundEngine.playUIClick();
                        setSelectedSwapIndex(idx);
                        setSquadPositionFilter('slot_match');
                      }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-105 group ${
                        isSelected ? 'scale-110 z-20' : 'z-10'
                      }`}
                      style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                    >
                      <EFootballPitchPlayerCard
                        player={player}
                        slotLabel={slot.label}
                        fitLevel={fit}
                        isSelected={isSelected}
                        isCaptain={isCaptain}
                      />
                      {/* Direct Pitch Swap Pill when another position is selected */}
                      {selectedSwapIndex !== null && selectedSwapIndex !== idx && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSwapPlayers(selectedSwapIndex, idx);
                          }}
                          className="mt-0.5 mx-auto block px-1.5 py-0.5 rounded bg-[#38BDF8] hover:bg-[#0284C7] text-[#070A0E] font-mono text-[9px] font-bold shadow-md opacity-90 hover:opacity-100 cursor-pointer"
                          title={`Swap ${FORMATIONS[userFormation][selectedSwapIndex]?.label} with ${slot.label}`}
                        >
                          ⇄ Swap
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Quick 11-Slot Position Bar (Click any position: GK, LB, CB, RB, CDM, CM, CAM, LM, RM, LW, RW, CF, ST) */}
              <div className="mt-4 p-3 rounded-xl bg-[#070A0E] border border-white/10">
                <div className="text-[11px] font-mono text-slate-400 mb-2 flex items-center justify-between">
                  <span>CLICK ANY POSITION SLOT TO REPLACE OR SWAP PLAYER:</span>
                  <span className="text-[#10B981] font-bold">
                    ACTIVE SLOT: {FORMATIONS[userFormation][selectedSwapIndex ?? 0]?.label || 'LB'}
                  </span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-11 gap-1.5">
                  {FORMATIONS[userFormation].map((slot, idx) => {
                    const occupant = userSquad[idx] || playersPool[idx] || PLAYERS_DB[idx];
                    const isSel = selectedSwapIndex === idx;
                    const fit = getPlayerSlotFitLevel(occupant.position, slot.role, slot.label);
                    return (
                      <button
                        key={`bar_${slot.label}_${idx}`}
                        type="button"
                        onClick={() => {
                          SoundEngine.playUIClick();
                          setSelectedSwapIndex(idx);
                          setSquadPositionFilter('slot_match');
                        }}
                        className={`p-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                          isSel
                            ? 'bg-[#10B981] text-[#070A0E] border-[#10B981] font-bold shadow-md'
                            : 'bg-[#111722] text-white border-white/10 hover:border-white/30'
                        }`}
                      >
                        <div className="font-mono text-[10px] font-bold leading-none">
                          {slot.label}
                        </div>
                        <div
                          className={`text-[9px] truncate mt-0.5 ${
                            isSel ? 'text-[#070A0E] font-semibold' : 'text-slate-300'
                          }`}
                        >
                          {occupant.name.split(' ').slice(-1)[0]}
                        </div>
                        <div
                          className={`text-[9px] font-mono leading-none mt-0.5 ${
                            isSel
                              ? 'text-[#070A0E]'
                              : fit === 'exact'
                              ? 'text-[#10B981]'
                              : fit === 'compatible'
                              ? 'text-[#F59E0B]'
                              : 'text-rose-400'
                          }`}
                        >
                          {occupant.position}·{occupant.rating}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {squadActionBanner && (
                <div className="mt-3 p-3 rounded-xl bg-[#10B981]/15 border border-[#10B981]/50 text-[#10B981] text-xs font-medium flex items-center justify-between gap-2">
                  <span>✓ {squadActionBanner}</span>
                  <button
                    type="button"
                    onClick={() => setSquadActionBanner(null)}
                    className="text-[11px] font-mono underline cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* POSITION-AWARE AVAILABLE PLAYERS SELECTOR */}
              {(() => {
                const activeSlotIdx = selectedSwapIndex ?? 0;
                const activeSlot = FORMATIONS[userFormation][activeSlotIdx] || FORMATIONS[userFormation][0];
                const currentOccupant =
                  userSquad[activeSlotIdx] || playersPool[activeSlotIdx] || PLAYERS_DB[activeSlotIdx];
                const canonicalPos = normalizeSlotPosition(activeSlot.role, activeSlot.label);
                const { exact: exactPositions, compatible: compatiblePositions } =
                  getCompatiblePositionsForSlot(activeSlot.role, activeSlot.label);

                // All unlocked players (including any in userSquad)
                const unlockedSet = new Set([
                  ...unlockedPlayerIds,
                  ...userSquad.map((p) => p?.id).filter(Boolean),
                ]);
                const allUnlockedPlayers = playersPool.filter((p) => unlockedSet.has(p.id));

                // Players matching the selected slot position (exact + compatible)
                const matchingSlotPlayers = allUnlockedPlayers
                  .filter((p) => compatiblePositions.includes(p.position))
                  .sort((a, b) => {
                    const fitA = exactPositions.includes(a.position) ? 2 : 1;
                    const fitB = exactPositions.includes(b.position) ? 2 : 1;
                    if (fitB !== fitA) return fitB - fitA;
                    // Put available bench players for this position right before already-assigned players
                    const inXIA = userSquad.slice(0, 11).some((s) => s?.id === a.id) ? 1 : 0;
                    const inXIB = userSquad.slice(0, 11).some((s) => s?.id === b.id) ? 1 : 0;
                    if (inXIA !== inXIB) return inXIA - inXIB;
                    return b.rating - a.rating;
                  });

                // Displayed list based on squadPositionFilter
                const displayedUnlockedPlayers = (() => {
                  if (squadPositionFilter === 'slot_match') {
                    // If user has matching players, show them first; also append remaining players below or if none match
                    if (matchingSlotPlayers.length > 0) {
                      return matchingSlotPlayers;
                    }
                    return [...allUnlockedPlayers].sort((a, b) => b.rating - a.rating);
                  }
                  if (squadPositionFilter === 'all') {
                    return [...allUnlockedPlayers].sort((a, b) => {
                      const fitA = exactPositions.includes(a.position)
                        ? 2
                        : compatiblePositions.includes(a.position)
                        ? 1
                        : 0;
                      const fitB = exactPositions.includes(b.position)
                        ? 2
                        : compatiblePositions.includes(b.position)
                        ? 1
                        : 0;
                      if (fitB !== fitA) return fitB - fitA;
                      return b.rating - a.rating;
                    });
                  }
                  // Specific PositionCode filter (GK, LB, CB, RB, CDM, CM, CAM, LM, RM, LW, RW, CF, ST)
                  return allUnlockedPlayers
                    .filter((p) => p.position === squadPositionFilter)
                    .sort((a, b) => b.rating - a.rating);
                })();

                return (
                  <div className="mt-5 space-y-5">
                    <div className="p-4 rounded-xl bg-[#070A0E] border border-[#10B981]/40 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                        <div>
                          <div className="text-xs font-mono text-[#10B981] font-bold">
                            SELECT PLAYER FOR POSITION: {activeSlot.label} (NATURAL: {exactPositions.join(' / ')})
                          </div>
                          <div className="text-xs text-slate-300 mt-0.5">
                            Currently in <span className="text-white font-bold">{activeSlot.label}</span>:{' '}
                            <span className="text-[#F59E0B] font-bold">
                              {currentOccupant.name} ({currentOccupant.position} · OVR {currentOccupant.rating})
                            </span>
                            {' · '}Click any player below to replace or swap into{' '}
                            <span className="text-[#10B981] font-bold">{activeSlot.label}</span>.
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setSquadPositionFilter('slot_match')}
                            className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-colors cursor-pointer ${
                              squadPositionFilter === 'slot_match'
                                ? 'bg-[#10B981] text-[#070A0E]'
                                : 'bg-[#111722] text-slate-300 border border-white/10 hover:text-white'
                            }`}
                          >
                            Best for {activeSlot.label} ({matchingSlotPlayers.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setSquadPositionFilter('all')}
                            className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-colors cursor-pointer ${
                              squadPositionFilter === 'all'
                                ? 'bg-[#38BDF8] text-[#070A0E]'
                                : 'bg-[#111722] text-slate-300 border border-white/10 hover:text-white'
                            }`}
                          >
                            All Unlocked ({allUnlockedPlayers.length})
                          </button>
                        </div>
                      </div>

                      {/* Filter by any specific position (GK, LB, CB, RB, CDM, CM, CAM, LM, RM, LW, RW, CF, ST) */}
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[10px] font-mono text-slate-400 mr-1">
                          FILTER BY POSITION:
                        </span>
                        {ALL_SQUAD_POSITIONS.map((posCode) => {
                          const countForPos = allUnlockedPlayers.filter(
                            (p) => p.position === posCode
                          ).length;
                          const isActiveFilter =
                            squadPositionFilter === posCode ||
                            (squadPositionFilter === 'slot_match' && canonicalPos === posCode);
                          return (
                            <button
                              key={posCode}
                              type="button"
                              onClick={() => {
                                SoundEngine.playUIClick();
                                setSquadPositionFilter(posCode);
                                // Also auto-select the corresponding slot on the pitch if current slot doesn't match posCode
                                const currentFit = getPlayerSlotFitLevel(
                                  posCode,
                                  activeSlot.role,
                                  activeSlot.label
                                );
                                if (currentFit !== 'exact') {
                                  const matchingSlotIdx = FORMATIONS[userFormation].findIndex(
                                    (s) =>
                                      getPlayerSlotFitLevel(posCode, s.role, s.label) === 'exact'
                                  );
                                  if (matchingSlotIdx >= 0) {
                                    setSelectedSwapIndex(matchingSlotIdx);
                                  }
                                }
                              }}
                              className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                                isActiveFilter
                                  ? 'bg-[#F59E0B] text-[#070A0E]'
                                  : 'bg-[#111722] text-slate-300 border border-white/10 hover:border-white/30'
                              }`}
                            >
                              {posCode} ({countForPos})
                            </button>
                          );
                        })}
                      </div>

                      {/* Available Players Grid for Selected Position */}
                      {displayedUnlockedPlayers.length === 0 ? (
                        <div className="p-6 text-center rounded-xl bg-[#111722] border border-white/10 space-y-2">
                          <div className="text-xs font-display font-bold text-white">
                            No unlocked {squadPositionFilter} players in your squad yet.
                          </div>
                          <div className="flex items-center justify-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setSquadPositionFilter('all')}
                              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-mono text-white cursor-pointer"
                            >
                              Show All Unlocked Players ({allUnlockedPlayers.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  squadPositionFilter !== 'slot_match' &&
                                  squadPositionFilter !== 'all'
                                ) {
                                  setPosFilter(squadPositionFilter);
                                } else {
                                  setPosFilter(canonicalPos);
                                }
                                setSection('transfer_market');
                              }}
                              className="px-3 py-1.5 rounded-lg bg-[#F59E0B] text-[#070A0E] text-xs font-mono font-bold cursor-pointer"
                            >
                              Buy {squadPositionFilter === 'slot_match' ? canonicalPos : squadPositionFilter} Players in Market →
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                          {displayedUnlockedPlayers.map((p) => {
                            const existingXIIdx = userSquad
                              .slice(0, 11)
                              .findIndex((s) => s?.id === p.id);
                            const isCurrentInSelectedSlot = existingXIIdx === activeSlotIdx;
                            const isInAnotherXISlot =
                              existingXIIdx >= 0 && existingXIIdx !== activeSlotIdx;
                            const otherSlotLabel = isInAnotherXISlot
                              ? FORMATIONS[userFormation][existingXIIdx]?.label ||
                                `Slot #${existingXIIdx + 1}`
                              : '';
                            const fitLevel = getPlayerSlotFitLevel(
                              p.position,
                              activeSlot.role,
                              activeSlot.label
                            );

                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => handleAssignUnlockedPlayerToSlot(p, activeSlotIdx)}
                                title={`${p.name} (${p.position} · OVR ${p.rating} · ${p.nationality})`}
                                className={`p-2.5 rounded-xl border flex flex-col items-center text-center transition-all cursor-pointer ${
                                  isCurrentInSelectedSlot
                                    ? 'bg-[#192231] border-[#10B981] ring-2 ring-[#10B981]'
                                    : fitLevel === 'exact' && !isInAnotherXISlot
                                    ? 'bg-[#111722] border-[#10B981]/70 hover:border-[#10B981] shadow-md'
                                    : isInAnotherXISlot
                                    ? 'bg-[#0B121C] border-white/15 hover:border-[#38BDF8]'
                                    : 'bg-[#111722] border-white/15 hover:border-white/40'
                                }`}
                              >
                                <div className="w-full flex items-center justify-between text-[9px] font-mono mb-1">
                                  <span
                                    className={`px-1.5 py-0.5 rounded font-bold ${
                                      fitLevel === 'exact'
                                        ? 'bg-[#10B981]/20 text-[#10B981]'
                                        : fitLevel === 'compatible'
                                        ? 'bg-[#F59E0B]/20 text-[#F59E0B]'
                                        : 'bg-white/10 text-slate-400'
                                    }`}
                                  >
                                    {p.position}
                                  </span>
                                  <span className="text-[#F59E0B] font-bold">OVR {p.rating}</span>
                                </div>

                                <PlayerPhotoAvatar
                                  player={p}
                                  className="w-15 h-15 rounded-xl border border-white/20 shadow-md"
                                  showPositionBadge={false}
                                  showRatingBadge={false}
                                />

                                <div className="text-xs font-sans font-bold text-white truncate mt-1.5 w-full leading-tight">
                                  {p.name}
                                </div>
                                <div className="text-[10px] font-mono text-slate-400 truncate w-full">
                                  {p.nationality}
                                </div>

                                <div
                                  className={`mt-1.5 w-full py-1 px-1.5 rounded text-[9px] font-mono font-bold truncate ${
                                    isCurrentInSelectedSlot
                                      ? 'bg-[#10B981]/20 text-[#10B981]'
                                      : isInAnotherXISlot
                                      ? 'bg-[#38BDF8]/20 text-[#38BDF8]'
                                      : 'bg-[#10B981] text-[#070A0E]'
                                  }`}
                                >
                                  {isCurrentInSelectedSlot
                                    ? `✓ ACTIVE AT ${activeSlot.label}`
                                    : isInAnotherXISlot
                                    ? `⇄ SWAP (${otherSlotLabel})`
                                    : `+ PLACE AT ${activeSlot.label}`}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Locked Superstars matching this position or top available in Market */}
                    {playersPool.some((p) => !unlockedSet.has(p.id)) && (
                      <div className="pt-4 border-t border-white/10">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="text-xs font-mono text-[#F59E0B] font-bold">
                              SIGN NEW {canonicalPos} & WORLD CUP SUPERSTARS WITH COINS
                            </div>
                            <p className="text-[11px] text-slate-400">
                              Unlock players below to place them directly into your {activeSlot.label} position.
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setPosFilter(canonicalPos);
                              setSection('transfer_market');
                            }}
                            className="text-xs font-mono text-[#10B981] hover:underline whitespace-nowrap cursor-pointer"
                          >
                            Scout All {canonicalPos} in Market →
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {playersPool
                            .filter((p) => !unlockedSet.has(p.id))
                            .sort((a, b) => {
                              const fitA = exactPositions.includes(a.position)
                                ? 2
                                : compatiblePositions.includes(a.position)
                                ? 1
                                : 0;
                              const fitB = exactPositions.includes(b.position)
                                ? 2
                                : compatiblePositions.includes(b.position)
                                ? 1
                                : 0;
                              if (fitB !== fitA) return fitB - fitA;
                              return b.rating - a.rating;
                            })
                            .slice(0, 6)
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
                                    onClick={() => handlePurchasePlayerWithReveal(star)}
                                    className={`w-full py-2 rounded-lg font-display font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                                      canAfford
                                        ? 'bg-[#F59E0B] hover:bg-[#D97706] text-[#070A0E]'
                                        : 'bg-white/5 text-slate-500 cursor-not-allowed'
                                    }`}
                                  >
                                    <Coins className="w-3.5 h-3.5" />
                                    BUY & ADD ({star.price.toLocaleString()} COINS)
                                  </button>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
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

          {/* Advanced Player Search & Filter Bar */}
          <div className="bg-[#111722] border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
            {/* Feedback Banner for Coin Purchases / Insufficient Coins */}
            {marketFeedback && (
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs font-mono ${
                  marketFeedback.type === 'success'
                    ? 'bg-[#10B981]/15 border-[#10B981] text-[#10B981]'
                    : 'bg-red-500/15 border-red-500/60 text-red-300'
                }`}
              >
                <span>{marketFeedback.message}</span>
                <button
                  type="button"
                  onClick={() => setMarketFeedback(null)}
                  className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white text-[10px] cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Ownership Filter Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3.5">
              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    { id: 'all', label: `All Players (${playersPool.length})` },
                    { id: 'owned', label: `My Squad Collection (${unlockedPlayerIds.length})` },
                    {
                      id: 'available',
                      label: `Available to Buy (${playersPool.length - unlockedPlayerIds.length})`,
                    },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      SoundEngine.playUIClick();
                      setOwnershipFilter(tab.id);
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-display font-bold transition-all cursor-pointer ${
                      ownershipFilter === tab.id
                        ? 'bg-[#F59E0B] text-[#070A0E] shadow-md'
                        : 'bg-[#070A0E] text-slate-300 border border-white/10 hover:border-white/30'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    SoundEngine.playUIClick();
                    setSection('upgrades');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#EC4899]/20 hover:bg-[#EC4899] text-[#F9A8D4] hover:text-white border border-[#EC4899]/50 font-display font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  UPGRADE PLAYER CARDS
                </button>
                <button
                  type="button"
                  onClick={() => {
                    SoundEngine.playUIClick();
                    setSection('spin_roulette');
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-[#070A0E] font-display font-bold text-xs flex items-center gap-1.5 shadow-lg cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  SPIN / DRAW CARDS
                </button>
              </div>
            </div>

            {/* Row 1: Rarity Filter Buttons (Common, Rare, Elite, World Class, Legendary, Special Edition) */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-mono text-slate-400 mr-1">RARITY:</span>
                {(
                  [
                    'All',
                    'Special Edition',
                    'Legendary',
                    'World Class',
                    'Elite',
                    'Rare',
                    'Common',
                  ] as const
                ).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRarityFilter(r)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      rarityFilter === r
                        ? 'bg-[#10B981] text-[#070A0E] font-bold'
                        : 'bg-[#070A0E] text-slate-300 hover:text-white border border-white/10'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              {/* Quick Position Filter Pills for ST, CF, LW, RW, CAM, CM, CDM, LB, RB, CB, GK */}
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[11px] font-mono text-slate-400 mr-1">POS:</span>
                {(
                  [
                    'All',
                    'ST',
                    'CF',
                    'LW',
                    'RW',
                    'CAM',
                    'CM',
                    'CDM',
                    'LB',
                    'RB',
                    'CB',
                    'GK',
                  ] as const
                ).map((pos) => (
                  <button
                    key={pos}
                    onClick={() => setPosFilter(pos)}
                    className={`px-2.5 py-1 rounded-md font-mono text-[11px] font-bold transition-colors cursor-pointer ${
                      posFilter === pos
                        ? 'bg-[#F59E0B] text-[#070A0E]'
                        : 'bg-[#070A0E] text-slate-300 hover:text-white border border-white/10'
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 2: Search Input + Overall Rating Filter + Coin Price Filter + Nationality Filter + Sort Dropdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 pt-2 border-t border-white/10">
              <div className="relative lg:col-span-2">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search player name, nation, club, or position..."
                  className="w-full bg-[#070A0E] border border-white/15 focus:border-[#10B981] rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none"
                />
              </div>

              <select
                value={minRatingFilter}
                onChange={(e) => setMinRatingFilter(Number(e.target.value))}
                className="bg-[#070A0E] border border-white/15 rounded-lg px-3 py-2 text-xs text-white font-mono"
              >
                <option value={0}>All Overall Ratings</option>
                <option value={82}>82+ OVR Rating</option>
                <option value={85}>85+ OVR Rating</option>
                <option value={88}>88+ OVR Rating</option>
                <option value={90}>90+ OVR Rating</option>
                <option value={93}>93+ OVR Rating</option>
                <option value={95}>95+ OVR Rating</option>
              </select>

              <select
                value={maxPriceFilter}
                onChange={(e) => setMaxPriceFilter(Number(e.target.value))}
                className="bg-[#070A0E] border border-white/15 rounded-lg px-3 py-2 text-xs text-white font-mono"
              >
                <option value={0}>All Coin Prices</option>
                <option value={25000}>Under 25,000 Coins</option>
                <option value={50000}>Under 50,000 Coins</option>
                <option value={80000}>Under 80,000 Coins</option>
                <option value={110000}>Under 110,000 Coins</option>
                <option value={150000}>Under 150,000 Coins</option>
                <option value={250000}>Under 250,000 Coins</option>
              </select>

              <select
                value={nationalityFilter}
                onChange={(e) => setNationalityFilter(e.target.value)}
                className="bg-[#070A0E] border border-white/15 rounded-lg px-3 py-2 text-xs text-white font-mono"
              >
                <option value="All">All Nationalities ({allNationalities.length})</option>
                {allNationalities.map((nat) => (
                  <option key={nat} value={nat}>
                    {nat}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="bg-[#070A0E] border border-[#10B981]/40 rounded-lg px-3 py-2 text-xs text-[#10B981] font-mono font-bold"
              >
                <option value="rating_desc">Sort: Highest Rating</option>
                <option value="price_asc">Sort: Lowest Price</option>
                <option value="shooting_power_desc">Sort: Greatest Shooting Power</option>
                <option value="passing_desc">Sort: Best Passing Accuracy</option>
                <option value="speed_desc">Sort: Highest Speed</option>
              </select>
            </div>
          </div>

          {/* Empty State When No Players Match Search */}
          {filteredMarketPlayers.length === 0 ? (
            <div className="bg-[#111722] border border-white/15 rounded-2xl p-12 text-center space-y-4">
              <div className="text-sm font-mono text-[#F59E0B] font-bold">
                NO PLAYERS MATCH YOUR SEARCH FILTERS
              </div>
              <p className="text-xs text-slate-300 max-w-md mx-auto">
                No football players matched your current combination of name search, position ({posFilter}), rating, price, nationality, or rarity.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setPosFilter('All');
                  setRarityFilter('All');
                  setMinRatingFilter(0);
                  setMaxPriceFilter(0);
                  setNationalityFilter('All');
                  setOwnershipFilter('all');
                  setSortBy('rating_desc');
                }}
                className="px-5 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-[#070A0E] font-display font-bold text-xs transition-colors cursor-pointer"
              >
                RESET ALL SEARCH FILTERS
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Top Pagination and Count Strip */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0A0F18] border border-white/10 rounded-xl px-4 py-3">
                <div className="text-xs font-mono text-slate-300">
                  Showing <span className="text-[#10B981] font-bold">{(currentSafePage - 1) * marketPageSize + 1}–{Math.min(currentSafePage * marketPageSize, filteredMarketPlayers.length)}</span> of <span className="text-[#F59E0B] font-bold">{filteredMarketPlayers.length.toLocaleString()}</span> Players
                  {filteredMarketPlayers.length === 10000 && <span className="ml-2 text-slate-500">(10,000 Total Players Database)</span>}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-400">Per page:</span>
                  <select
                    value={marketPageSize}
                    onChange={(e) => {
                      setMarketPageSize(Number(e.target.value));
                      setMarketPage(1);
                    }}
                    className="bg-[#111722] border border-white/20 rounded px-2 py-1 text-xs text-white font-mono cursor-pointer"
                  >
                    <option value={24}>24</option>
                    <option value={48}>48</option>
                    <option value={96}>96</option>
                  </select>

                  <div className="flex items-center gap-1 ml-2">
                    <button
                      type="button"
                      disabled={currentSafePage <= 1}
                      onClick={() => setMarketPage((p) => Math.max(1, p - 1))}
                      className="px-2.5 py-1 rounded bg-[#111722] hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed border border-white/15 text-xs text-white font-mono font-bold cursor-pointer"
                    >
                      ‹ Prev
                    </button>
                    <span className="px-2 font-mono text-xs text-slate-300">
                      {currentSafePage} / {totalMarketPages}
                    </span>
                    <button
                      type="button"
                      disabled={currentSafePage >= totalMarketPages}
                      onClick={() => setMarketPage((p) => Math.min(totalMarketPages, p + 1))}
                      className="px-2.5 py-1 rounded bg-[#111722] hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed border border-white/15 text-xs text-white font-mono font-bold cursor-pointer"
                    >
                      Next ›
                    </button>
                  </div>
                </div>
              </div>

              {/* Authentic eFootball Foil Player Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {paginatedMarketPlayers.map((player) => {
                  const isOwned = unlockedPlayerIds.includes(player.id);
                  const isInStartingXI = userSquad.slice(0, 11).some((s) => s.id === player.id);
                  const isLeadStar = userSquad[9]?.id === player.id;
                  const canAfford = coins >= player.price;

                  return (
                    <EFootballPlayerCard
                      key={player.id}
                      player={player}
                      isOwned={isOwned}
                      isLeadStar={isLeadStar}
                      isInStartingXI={isInStartingXI}
                      onInspect={(p) =>
                        setCardModalState({
                          player: p,
                          sourceTitle: 'EFOOTBALL PLAYER CARD SHOWCASE',
                          sourceSubtitle: `${p.club} · ${p.nationality}`,
                          skipAnimation: true,
                        })
                      }
                      footerSlot={
                        isOwned ? (
                          isInStartingXI ? (
                            <button
                              onClick={() => {
                                const currentSlotIdx = userSquad
                                  .slice(0, 11)
                                  .findIndex((s) => s.id === player.id);
                                setSelectedSwapIndex(currentSlotIdx >= 0 ? currentSlotIdx : 0);
                                setSquadPositionFilter('slot_match');
                                setSection('my_team');
                              }}
                              className="w-full py-2.5 bg-[#10B981]/20 hover:bg-[#10B981]/30 border border-[#10B981] rounded-xl text-center font-mono text-xs text-[#10B981] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Check className="w-4 h-4" /> IN STARTING XI ({FORMATIONS[userFormation][userSquad.slice(0, 11).findIndex((s) => s.id === player.id)]?.label || player.position})
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                const bestIdx = findBestSlotIndexForPlayer(
                                  player,
                                  userFormation,
                                  userSquad
                                );
                                handleAssignUnlockedPlayerToSlot(player, bestIdx);
                                setSection('my_team');
                              }}
                              className="w-full py-2.5 bg-white/10 hover:bg-[#10B981] text-white hover:text-[#070A0E] border border-white/15 rounded-xl font-display font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Check className="w-4 h-4" /> OWNED · PLACE AT {FORMATIONS[userFormation][findBestSlotIndexForPlayer(player, userFormation, userSquad)]?.label || player.position}
                            </button>
                          )
                        ) : (
                          <div className="space-y-2">
                            <button
                              onClick={() => handlePurchasePlayerWithReveal(player)}
                              className={`w-full py-2.5 rounded-xl font-display font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                                canAfford
                                  ? 'bg-[#10B981] hover:bg-[#059669] text-[#070A0E] shadow-md'
                                  : 'bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-300'
                              }`}
                            >
                              <Coins className="w-3.5 h-3.5" />
                              {canAfford
                                ? `BUY (${player.price.toLocaleString()} COINS)`
                                : `BUY (${player.price.toLocaleString()} COINS · NEED ${(player.price - coins).toLocaleString()} MORE)`}
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
                                className="w-full py-2 rounded-xl bg-[#070A0E] hover:bg-[#192231] border border-[#38BDF8]/40 text-[#38BDF8] font-display font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                INSTANT SIGN ($
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
                        )
                      }
                    />
                  );
                })}
              </div>

              {/* Bottom Pagination Controls */}
              {totalMarketPages > 1 && (
                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-6 pb-2">
                  <button
                    type="button"
                    disabled={currentSafePage <= 1}
                    onClick={() => {
                      setMarketPage(1);
                      window.scrollTo({ top: 350, behavior: 'smooth' });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#070A0E] hover:bg-[#111722] border border-white/15 disabled:opacity-30 disabled:cursor-not-allowed font-mono text-xs text-slate-300 hover:text-white cursor-pointer"
                  >
                    « First
                  </button>
                  <button
                    type="button"
                    disabled={currentSafePage <= 1}
                    onClick={() => {
                      setMarketPage((p) => Math.max(1, p - 1));
                      window.scrollTo({ top: 350, behavior: 'smooth' });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#070A0E] hover:bg-[#111722] border border-white/15 disabled:opacity-30 disabled:cursor-not-allowed font-mono text-xs text-slate-300 hover:text-white cursor-pointer"
                  >
                    ‹ Prev
                  </button>

                  {Array.from({ length: Math.min(7, totalMarketPages) }).map((_, idx) => {
                    let pageNum = currentSafePage;
                    if (totalMarketPages <= 7) {
                      pageNum = idx + 1;
                    } else if (currentSafePage <= 4) {
                      pageNum = idx + 1;
                    } else if (currentSafePage >= totalMarketPages - 3) {
                      pageNum = totalMarketPages - 6 + idx;
                    } else {
                      pageNum = currentSafePage - 3 + idx;
                    }
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => {
                          setMarketPage(pageNum);
                          window.scrollTo({ top: 350, behavior: 'smooth' });
                        }}
                        className={`w-9 h-8 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                          currentSafePage === pageNum
                            ? 'bg-[#10B981] text-[#070A0E] shadow-lg shadow-[#10B981]/30 font-black'
                            : 'bg-[#070A0E] text-slate-400 hover:text-white border border-white/15'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    disabled={currentSafePage >= totalMarketPages}
                    onClick={() => {
                      setMarketPage((p) => Math.min(totalMarketPages, p + 1));
                      window.scrollTo({ top: 350, behavior: 'smooth' });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#070A0E] hover:bg-[#111722] border border-white/15 disabled:opacity-30 disabled:cursor-not-allowed font-mono text-xs text-slate-300 hover:text-white cursor-pointer"
                  >
                    Next ›
                  </button>
                  <button
                    type="button"
                    disabled={currentSafePage >= totalMarketPages}
                    onClick={() => {
                      setMarketPage(totalMarketPages);
                      window.scrollTo({ top: 350, behavior: 'smooth' });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#070A0E] hover:bg-[#111722] border border-white/15 disabled:opacity-30 disabled:cursor-not-allowed font-mono text-xs text-slate-300 hover:text-white cursor-pointer"
                  >
                    Last »
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2B: COLLECTIBLE UPGRADE CARDS & SPECIAL EDITION EVOLUTIONS */}
      {section === 'upgrades' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-[#111722] via-[#27102C] to-[#111722] border-2 border-[#EC4899]/50 rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <div className="text-xs font-mono text-[#EC4899] font-bold flex items-center gap-1.5">
                  <Zap className="w-4 h-4" />
                  COLLECTIBLE TRAINING, BOOST & SPECIAL EDITION UPGRADE CARDS
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
                  BOOST YOUR PLAYERS’ STATS & IN-MATCH PERFORMANCE
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
                  Select a footballer from your collection below, then purchase Shooting, Passing, Speed, Strength, Stamina, Training, or Special Edition cards to permanently boost their attributes on the pitch!
                </p>
              </div>

              {/* Target Player Selector for Upgrades */}
              <div className="bg-[#070A0E] border border-white/15 rounded-xl p-3.5 min-w-[270px]">
                <label className="block text-[10px] font-mono text-[#10B981] font-bold mb-1.5">
                  SELECT PLAYER TO UPGRADE:
                </label>
                <select
                  value={upgradeTargetPlayerId}
                  onChange={(e) => setUpgradeTargetPlayerId(e.target.value)}
                  className="w-full bg-[#111722] border border-white/20 rounded-lg px-3 py-2 text-xs text-white font-bold"
                >
                  {playersPool
                    .filter((p) => unlockedPlayerIds.includes(p.id))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.position} · OVR {p.rating} · {p.rarity})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {marketFeedback && (
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs font-mono ${
                  marketFeedback.type === 'success'
                    ? 'bg-[#10B981]/15 border-[#10B981] text-[#10B981]'
                    : 'bg-red-500/15 border-red-500/60 text-red-300'
                }`}
              >
                <span>{marketFeedback.message}</span>
                <button
                  type="button"
                  onClick={() => setMarketFeedback(null)}
                  className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white text-[10px] cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Selected Target Player Live Stat Preview */}
            {(() => {
              const targetPlayer =
                playersPool.find((p) => p.id === upgradeTargetPlayerId) || userSquad[9] || playersPool[0];
              if (!targetPlayer) return null;
              return (
                <div className="bg-[#070A0E] border border-white/15 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <PlayerPhotoAvatar
                      player={targetPlayer}
                      className="w-16 h-16 rounded-xl border-2 border-[#10B981]"
                      showPositionBadge={true}
                      showRatingBadge={true}
                    />
                    <div>
                      <div className="text-[11px] font-mono text-[#10B981] font-bold">
                        ACTIVE UPGRADE TARGET · {targetPlayer.rarity.toUpperCase()}
                      </div>
                      <div className="font-display text-xl font-bold text-white">
                        {targetPlayer.name} (OVR {targetPlayer.rating})
                      </div>
                      <div className="text-xs text-slate-400">
                        {targetPlayer.nationality} · {targetPlayer.club}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 font-mono text-xs w-full md:w-auto">
                    {[
                      { label: 'SPD', val: targetPlayer.attributes.pace },
                      { label: 'SHO', val: targetPlayer.attributes.shooting },
                      { label: 'PAS', val: targetPlayer.attributes.passing },
                      { label: 'DRI', val: targetPlayer.attributes.dribbling },
                      { label: 'PHY', val: targetPlayer.attributes.physical },
                      { label: 'STA', val: targetPlayer.attributes.stamina },
                    ].map((s) => (
                      <div
                        key={s.label}
                        className="px-3 py-1.5 rounded-lg bg-[#111722] border border-white/10 text-center"
                      >
                        <div className="text-[10px] text-slate-400">{s.label}</div>
                        <div className="text-sm font-bold text-[#F59E0B]">{s.val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Rarity Filter for Collectible Upgrade Cards */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono text-slate-400">CARD RARITY:</span>
              {(['All', 'Common', 'Rare', 'Elite', 'Legendary', 'Special Edition'] as const).map(
                (r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setUpgradeRarityFilter(r)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      upgradeRarityFilter === r
                        ? 'bg-[#EC4899] text-white font-bold'
                        : 'bg-[#070A0E] text-slate-300 border border-white/10 hover:text-white'
                    }`}
                  >
                    {r}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Grid of Collectible Upgrade & Boost Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {UPGRADE_CARDS_DB.filter(
              (c) => upgradeRarityFilter === 'All' || c.rarity === upgradeRarityFilter
            ).map((card) => {
              const canAfford = coins >= card.price;
              const targetPlayer =
                playersPool.find((p) => p.id === upgradeTargetPlayerId) || userSquad[9] || playersPool[0];

              return (
                <div
                  key={card.id}
                  className="bg-[#111722] border-2 rounded-2xl overflow-hidden flex flex-col justify-between transition-all hover:-translate-y-1 shadow-xl"
                  style={{ borderColor: `${card.accentColor}77` }}
                >
                  <div>
                    {/* Collectible Card Artwork Header */}
                    <div
                      className="relative h-36 p-4 flex items-center justify-between overflow-hidden"
                      style={{
                        background: `radial-gradient(circle at 30% 30%, ${card.accentColor}44 0%, #070A0E 85%)`,
                      }}
                    >
                      <div className="space-y-1 z-10">
                        <span
                          className="inline-block px-2.5 py-0.5 rounded-full font-mono text-[10px] font-extrabold uppercase tracking-wider border"
                          style={{
                            color: card.accentColor,
                            borderColor: card.accentColor,
                            backgroundColor: `${card.accentColor}1A`,
                          }}
                        >
                          {card.rarity} · {card.category}
                        </span>
                        <h3 className="font-display text-lg font-bold text-white leading-snug max-w-[210px]">
                          {card.name}
                        </h3>
                        <div className="font-mono text-xs text-[#F59E0B] font-bold">
                          +{card.ratingBonus} OVR RATING BOOST
                        </div>
                      </div>

                      {/* Bespoke SVG Card Crest Artwork */}
                      <div
                        className="w-20 h-24 rounded-xl border-2 flex flex-col items-center justify-center shrink-0 shadow-2xl"
                        style={{
                          borderColor: card.accentColor,
                          background: `linear-gradient(145deg, ${card.accentColor}33, #090D16)`,
                        }}
                      >
                        <Zap className="w-8 h-8 mb-1" style={{ color: card.accentColor }} />
                        <span className="font-mono text-[10px] font-black text-white">
                          +{card.ratingBonus} OVR
                        </span>
                      </div>
                    </div>

                    <div className="p-5 space-y-3">
                      <p className="text-xs text-slate-300 leading-relaxed">{card.description}</p>
                      <div className="p-2.5 rounded-xl bg-[#070A0E] border border-white/10 font-mono text-[11px] text-[#10B981] font-bold">
                        EFFECT: {card.effectSummary}
                      </div>
                    </div>
                  </div>

                  <div className="p-5 pt-0 space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!targetPlayer) return;
                        if (coins < card.price) {
                          SoundEngine.playUIClick();
                          setMarketFeedback({
                            type: 'error',
                            message: `Insufficient Coins! You need ${(card.price - coins).toLocaleString()} more Coins to buy ${card.name}.`,
                          });
                          return;
                        }
                        if (onApplyUpgradeCard) {
                          onApplyUpgradeCard(card, targetPlayer.id);
                        }
                        setMarketFeedback({
                          type: 'success',
                          message: `Applied ${card.name} to ${targetPlayer.name}! Stats & in-match performance permanently boosted!`,
                        });
                      }}
                      className={`w-full py-3 rounded-xl font-display font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        canAfford
                          ? 'text-[#070A0E] shadow-lg hover:brightness-110'
                          : 'bg-red-500/15 border border-red-500/40 text-red-300'
                      }`}
                      style={canAfford ? { backgroundColor: card.accentColor } : undefined}
                    >
                      <Coins className="w-4 h-4" />
                      {canAfford
                        ? `BUY & UPGRADE ${targetPlayer?.name.split(' ').pop()?.toUpperCase()} (${card.price.toLocaleString()} COINS)`
                        : `NEED ${card.price.toLocaleString()} COINS`}
                    </button>
                  </div>
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

          {/* SECTION 3 PACK OPENING uses the global EFootballCardOpeningModal below */}
        </div>
      )}

      {/* SECTION 4: EFOOTBALL SPECIAL AGENT SPIN / DRAW & ROULETTE SYSTEM */}
      {section === 'spin_roulette' && (
        <div className="space-y-8">
          {/* Main Spin / Draw Arena */}
          <div className="bg-gradient-to-b from-[#111722] to-[#0A0F18] border-2 border-[#F59E0B]/60 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <div className="text-xs font-mono text-[#F59E0B] font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  OFFICIAL EFOOTBALL SPECIAL AGENT · SPIN & CARD DRAW SYSTEM
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
                  SPIN & DRAW EFOOTBALL SUPERSTAR CARDS
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
                  Select a Special Agent Spin Tier below, spend your Coins to spin the wheel, and experience the <span className="text-[#F59E0B] font-semibold">full eFootball Walkout Card Reveal</span>!
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                {/* Draw Mode Switcher */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-[#070A0E] border border-white/15">
                  <button
                    type="button"
                    onClick={() => {
                      SoundEngine.playUIClick();
                      setDrawMode('classic_ball');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-display font-bold transition-all cursor-pointer ${
                      drawMode === 'classic_ball'
                        ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Classic Ball Draw (PES)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      SoundEngine.playUIClick();
                      setDrawMode('roulette');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-display font-bold transition-all cursor-pointer ${
                      drawMode === 'roulette'
                        ? 'bg-[#38BDF8] text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Roulette Wheel
                  </button>
                </div>

                <div className="px-4 py-2.5 rounded-xl bg-[#070A0E] border border-white/15 font-mono text-xs text-slate-300">
                  Top 50 Owned:{' '}
                  <span className="text-[#10B981] font-bold">
                    {TOP_50_SPIN_PLAYERS.filter((p) => unlockedPlayerIds.includes(p.id)).length} /{' '}
                    {TOP_50_SPIN_PLAYERS.length}
                  </span>
                </div>

                {onTriggerPaymentCheckout && (
                  <button
                    onClick={() => {
                      SoundEngine.playUIClick();
                      onTriggerPaymentCheckout({
                        itemType: 'coins',
                        itemId: 'coins_500k_spin',
                        itemName: '+500,000 Roulette Spin Coins',
                        subtitle: 'Instant 500,000 Coins for the eFootball Spin / Draw Wheel',
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

            {/* 4 Selectable Spin / Draw Tiers (10K, 25K, 50K, 500K Coins) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {SPIN_DRAW_TIERS.map((tier) => {
                const isSelected = activeSpinTier.id === tier.id;
                const affordable = coins >= tier.costCoins;
                return (
                  <div
                    key={tier.id}
                    onClick={() => {
                      SoundEngine.playUIClick();
                      setSelectedSpinTierId(tier.id);
                    }}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-[#192231] scale-[1.02] shadow-xl'
                        : 'bg-[#070A0E]/90 hover:bg-[#111722] opacity-85 hover:opacity-100'
                    }`}
                    style={{
                      borderColor: isSelected ? tier.accentColor : 'rgba(255,255,255,0.12)',
                    }}
                  >
                    <div>
                      <div
                        className="text-[10px] font-mono font-extrabold uppercase tracking-wider mb-1"
                        style={{ color: tier.accentColor }}
                      >
                        {tier.badgeText}
                      </div>
                      <div className="font-display font-bold text-base text-white leading-snug">
                        {tier.name}
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                        {tier.subtitle}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isSpinningRoulette || !affordable}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSpinTierId(tier.id);
                        handleStartRouletteSpin(tier);
                      }}
                      className={`mt-4 w-full py-2.5 rounded-xl font-display font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        affordable
                          ? 'text-[#070A0E] shadow-md hover:brightness-110'
                          : 'bg-white/5 text-slate-500 cursor-not-allowed'
                      }`}
                      style={
                        affordable
                          ? { backgroundColor: tier.accentColor }
                          : undefined
                      }
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      SPIN ({tier.costCoins.toLocaleString()} COINS)
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Interactive Roulette Carousel Window (Displays 5 Cards Around Active Highlight Index) */}
            <div className="relative bg-[#070A0E] border-2 border-[#F59E0B]/50 rounded-2xl p-5 sm:p-6 overflow-hidden">
              {/* Top & Bottom Center Pointer Triangles */}
              <div className="flex justify-center mb-3">
                <div className="px-3 py-1 rounded-full bg-[#F59E0B] text-[#070A0E] font-mono text-[11px] font-bold tracking-wider flex items-center gap-1.5 shadow-lg">
                  <Crown className="w-3.5 h-3.5" />
                  {isSpinningRoulette
                    ? `DRAWING FROM ${activeSpinTier.name.toUpperCase()}...`
                    : `${activeSpinTier.name.toUpperCase()} TARGET SELECTOR ▼`}
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
                  disabled={isSpinningRoulette || coins < activeSpinTier.costCoins}
                  onClick={() => handleStartRouletteSpin(activeSpinTier)}
                  className={`px-8 py-4 rounded-xl font-display font-bold text-base transition-all flex items-center justify-center gap-3 shadow-2xl cursor-pointer ${
                    isSpinningRoulette
                      ? 'bg-[#F59E0B]/50 text-[#070A0E] cursor-wait'
                      : coins >= activeSpinTier.costCoins
                      ? 'bg-gradient-to-r from-[#F59E0B] via-[#FBBF24] to-[#F59E0B] hover:brightness-110 text-[#070A0E] scale-100 hover:scale-105'
                      : 'bg-white/10 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Sparkles className="w-5 h-5" />
                  {isSpinningRoulette
                    ? 'SPINNING & OPENING CARD...'
                    : coins >= activeSpinTier.costCoins
                    ? `SPIN & DRAW CARD (${activeSpinTier.costCoins.toLocaleString()} COINS)`
                    : `NEED ${activeSpinTier.costCoins.toLocaleString()} COINS TO SPIN (YOU HAVE ${coins.toLocaleString()})`}
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
                  <div className="flex flex-col items-center">
                    <PlayerPhotoAvatar
                      player={rouletteWinner}
                      className="w-20 h-20 rounded-2xl border-2 border-[#F59E0B] shadow-2xl"
                      showPositionBadge={true}
                      showRatingBadge={true}
                    />
                    <div className="font-display font-bold text-xs text-white mt-1.5 text-center">
                      {rouletteWinner.name}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-mono text-[#10B981] font-bold">
                      ★ EFOOTBALL CARD UNLOCKED & SAVED PERMANENTLY!
                    </div>
                    <h3 className="font-display text-2xl sm:text-3xl font-bold text-white">
                      {rouletteWinner.name} ({rouletteWinner.rating} OVR · {rouletteWinner.position})
                    </h3>
                    <p className="text-xs text-slate-300">
                      {rouletteWinner.rarity} · {rouletteWinner.nationality} · {rouletteWinner.club} · PAC{' '}
                      {rouletteWinner.attributes.pace} · SHO {rouletteWinner.attributes.shooting} · DRI{' '}
                      {rouletteWinner.attributes.dribbling}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <button
                    onClick={() =>
                      setCardModalState({
                        player: rouletteWinner,
                        sourceTitle: activeSpinTier.name.toUpperCase(),
                        sourceSubtitle: 'Full eFootball Card Walkout Replay',
                        skipAnimation: false,
                        canSpinAgain: coins >= activeSpinTier.costCoins,
                        spinAgainLabel: `SPIN AGAIN (${activeSpinTier.costCoins.toLocaleString()})`,
                        onSpinAgain: () => handleStartRouletteSpin(activeSpinTier),
                      })
                    }
                    className="px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/15 text-white font-display font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    REPLAY WALKOUT
                  </button>
                  <button
                    onClick={() => {
                      const bestIdx = findBestSlotIndexForPlayer(
                        rouletteWinner,
                        userFormation,
                        userSquad
                      );
                      handleAssignUnlockedPlayerToSlot(rouletteWinner, bestIdx);
                      setSection('my_team');
                    }}
                    className="px-5 py-3 bg-[#10B981] hover:bg-[#059669] text-[#070A0E] font-display font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    PLACE AT {FORMATIONS[userFormation][findBestSlotIndexForPlayer(rouletteWinner, userFormation, userSquad)]?.label || rouletteWinner.position} IN SQUAD
                  </button>
                  <button
                    disabled={coins < activeSpinTier.costCoins}
                    onClick={() => handleStartRouletteSpin(activeSpinTier)}
                    className={`px-5 py-3 font-display font-bold text-xs rounded-xl transition-colors cursor-pointer ${
                      coins >= activeSpinTier.costCoins
                        ? 'bg-[#F59E0B] hover:bg-[#D97706] text-[#070A0E]'
                        : 'bg-white/10 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    SPIN AGAIN ({activeSpinTier.costCoins.toLocaleString()})
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

      {/* EFOOTBALL MULTI-STAGE CARD-OPENING WALKOUT & CARD SHOWCASE MODAL */}
      <EFootballCardOpeningModal
        isOpen={Boolean(cardModalState)}
        player={cardModalState?.player || null}
        sourceTitle={cardModalState?.sourceTitle}
        sourceSubtitle={cardModalState?.sourceSubtitle}
        skipAnimation={cardModalState?.skipAnimation}
        canSpinAgain={cardModalState?.canSpinAgain}
        spinAgainLabel={cardModalState?.spinAgainLabel}
        onSpinAgain={cardModalState?.onSpinAgain}
        onEquipToSquad={(player) => {
          const bestIdx = findBestSlotIndexForPlayer(player, userFormation, userSquad);
          handleAssignUnlockedPlayerToSlot(player, bestIdx);
          setSection('my_team');
        }}
        onClose={() => {
          setCardModalState(null);
          setOpeningPack(null);
          setRevealedPlayer(null);
        }}
      />

      {/* CLASSIC PES / EFOOTBALL BALL OPENING GACHA MODAL */}
      <ClassicPESBallOpeningModal
        isOpen={Boolean(pesBallModalState)}
        player={pesBallModalState?.player || PLAYERS_DB[0]}
        sourceTitle={pesBallModalState?.sourceTitle || 'SPECIAL AGENT BALL OPENING'}
        sourceSubtitle={pesBallModalState?.sourceSubtitle || 'Classic PES Ball Draw'}
        canDrawAgain={pesBallModalState?.canDrawAgain}
        drawAgainLabel={pesBallModalState?.drawAgainLabel}
        onDrawAgain={pesBallModalState?.onDrawAgain}
        onClose={() => {
          if (pesBallModalState?.player) {
            const bestIdx = findBestSlotIndexForPlayer(pesBallModalState.player, userFormation, userSquad);
            handleAssignUnlockedPlayerToSlot(pesBallModalState.player, bestIdx);
          }
          setPesBallModalState(null);
          setOpeningPack(null);
          setRevealedPlayer(null);
        }}
      />
    </div>
  );
};
