import React, { useState } from 'react';
import { Award, CheckCircle2, ChevronRight, Play, Shield, Sparkles, Trophy } from 'lucide-react';
import {
  FootballPlayer,
  FormationName,
  FORMATIONS,
  STADIUMS,
  TeamData,
  TEAMS_DB,
  TournamentDefinition,
  TOURNAMENTS_LIST,
} from '../data/gameDatabase';
import { SoundEngine } from '../engine/SoundEngine';
import { PlayerPhotoAvatar } from './PlayerPhotoAvatar';
import worldCupBannerImg from '../assets/images/world_cup_trophy_banner_1791305654544.jpg';

interface WorldCupAndTournamentsProps {
  initialTab: 'world_cup' | 'tournaments';
  userTeam: TeamData;
  userFormation: FormationName;
  userSquad: FootballPlayer[];
  onSelectUserTeam: (team: TeamData) => void;
  onSelectFormation: (formation: FormationName) => void;
  onStartTournamentMatch: (config: {
    opponent: TeamData;
    stageLabel: string;
    isFinal: boolean;
    tournamentName: string;
  }) => void;
  tournamentStageIndex: number; // 0: Group 1, 1: Group 2, 2: Group 3, 3: R16, 4: QF, 5: SF, 6: Final, 7: Trophy Won!
  onAdvanceStageSimulation: () => void;
  onResetTournament: () => void;
}

const WC_STAGES = [
  { index: 0, title: 'Group Stage · Matchday 1', short: 'Group MD1' },
  { index: 1, title: 'Group Stage · Matchday 2', short: 'Group MD2' },
  { index: 2, title: 'Group Stage · Matchday 3', short: 'Group MD3' },
  { index: 3, title: 'Round of 16 Knockout', short: 'Round of 16' },
  { index: 4, title: 'Quarter-Final', short: 'Quarter-Final' },
  { index: 5, title: 'Semi-Final', short: 'Semi-Final' },
  { index: 6, title: 'World Cup Grand Final', short: 'Grand Final' },
  { index: 7, title: 'Champions Trophy Ceremony', short: 'Trophy Ceremony' },
];

export const WorldCupAndTournaments: React.FC<WorldCupAndTournamentsProps> = ({
  initialTab,
  userTeam,
  userFormation,
  userSquad,
  onSelectUserTeam,
  onSelectFormation,
  onStartTournamentMatch,
  tournamentStageIndex,
  onAdvanceStageSimulation,
  onResetTournament,
}) => {
  const [activeTab, setActiveTab] = useState<'world_cup' | 'tournaments'>(initialTab);
  const [selectedTournament, setSelectedTournament] = useState<TournamentDefinition>(TOURNAMENTS_LIST[0]);
  const [wcStep, setWcStep] = useState<'country' | 'squad' | 'bracket'>('bracket');

  const internationalTeams = TEAMS_DB.filter((t) => t.category === 'International');
  const opponentsPool = TEAMS_DB.filter((t) => t.id !== userTeam.id);
  const currentOpponent = opponentsPool[tournamentStageIndex % opponentsPool.length] || TEAMS_DB[1];
  const currentStage = WC_STAGES[Math.min(tournamentStageIndex, WC_STAGES.length - 1)];

  // Group A Standings calculation
  const groupTeams = [
    { team: userTeam, played: Math.min(3, tournamentStageIndex), pts: Math.min(3, tournamentStageIndex) * 3, gd: `+${Math.min(3, tournamentStageIndex) * 2}` },
    { team: opponentsPool[0], played: Math.min(3, tournamentStageIndex), pts: Math.max(0, Math.min(3, tournamentStageIndex) * 2 - 1), gd: '+1' },
    { team: opponentsPool[1], played: Math.min(3, tournamentStageIndex), pts: Math.min(3, tournamentStageIndex), gd: '-1' },
    { team: opponentsPool[2], played: Math.min(3, tournamentStageIndex), pts: 0, gd: '-4' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6 mb-8">
        <div>
          <div className="text-xs font-mono text-[#F59E0B] mb-1">
            OFFICIAL INTERNATIONAL & CONTINENTAL COMPETITIONS
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-white">
            {activeTab === 'world_cup' ? 'WORLD CUP: ROAD TO GLORY' : 'GLOBAL TOURNAMENTS'}
          </h1>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#111722] border border-white/10 rounded-lg">
          <button
            onClick={() => {
              SoundEngine.playUIClick();
              setActiveTab('world_cup');
            }}
            className={`px-4 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'world_cup'
                ? 'bg-[#F59E0B] text-[#070A0E] font-bold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            World Cup Mode
          </button>
          <button
            onClick={() => {
              SoundEngine.playUIClick();
              setActiveTab('tournaments');
            }}
            className={`px-4 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'tournaments'
                ? 'bg-[#10B981] text-[#070A0E] font-bold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            All 8 Tournaments
          </button>
        </div>
      </div>

      {/* TAB 1: SPECIAL WORLD CUP MODE */}
      {activeTab === 'world_cup' && (
        <div className="space-y-8">
          {/* Hero World Cup Banner */}
          <div className="relative rounded-2xl overflow-hidden border border-[#F59E0B]/30 bg-[#111722]">
            <img
              src={worldCupBannerImg}
              alt="World Cup Trophy Ceremony"
              referrerPolicy="no-referrer"
              className="w-full h-64 object-cover opacity-55"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#070A0E] via-[#070A0E]/80 to-transparent p-8 flex flex-col justify-between">
              <div>
                <div className="text-xs font-mono text-[#F59E0B] mb-2">
                  CROWN OF CHAMPIONS STADIUM · {selectedTournament.name.toUpperCase()}
                </div>
                <h2 className="font-display text-3xl md:text-4xl font-bold text-white max-w-xl mb-2">
                  Lead {userTeam.name} Through the Knockout Bracket to Lift the Golden Trophy
                </h2>
                <p className="text-sm text-slate-300 max-w-lg">
                  1. Choose Country · 2. Choose Squad · 3. Group Stage · 4. Round of 16 · 5. Quarter-Final · 6. Semi-Final · 7. Grand Final · 8. Trophy Celebration
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-4">
                <button
                  onClick={() => setWcStep('country')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    wcStep === 'country'
                      ? 'bg-[#F59E0B] text-[#070A0E]'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  1. Select Nation ({userTeam.shortName})
                </button>
                <button
                  onClick={() => setWcStep('squad')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    wcStep === 'squad'
                      ? 'bg-[#F59E0B] text-[#070A0E]'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  2. Squad & Formation ({userFormation})
                </button>
                <button
                  onClick={() => setWcStep('bracket')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    wcStep === 'bracket'
                      ? 'bg-[#F59E0B] text-[#070A0E]'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  3–8. Tournament Bracket & Fixtures
                </button>
              </div>
            </div>
          </div>

          {/* Step 1: Choose Country */}
          {wcStep === 'country' && (
            <div className="bg-[#111722] border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display text-xl font-bold text-white">
                  1. Select Your World Cup National Team
                </h3>
                <button
                  onClick={() => setWcStep('squad')}
                  className="px-4 py-2 bg-[#10B981] text-[#070A0E] font-display font-bold text-xs rounded-lg flex items-center gap-1.5"
                >
                  Confirm {userTeam.name} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {internationalTeams.map((nation) => {
                  const isSelected = nation.id === userTeam.id;
                  return (
                    <button
                      key={nation.id}
                      onClick={() => {
                        SoundEngine.playUIClick();
                        onSelectUserTeam(nation);
                      }}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-[#192231] border-[#F59E0B] shadow-lg'
                          : 'bg-[#070A0E]/60 border-white/10 hover:border-white/25'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className="w-6 h-4 rounded-sm inline-block border border-white/20"
                          style={{ backgroundColor: nation.primaryColor }}
                        />
                        <span className="font-mono text-xs text-[#F59E0B] font-bold">
                          OVR {nation.rating}
                        </span>
                      </div>
                      <div className="font-display font-bold text-base text-white">
                        {nation.name}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {nation.confederation} · {nation.defaultFormation}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Choose Squad & Formation */}
          {wcStep === 'squad' && (
            <div className="bg-[#111722] border border-white/10 rounded-2xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="font-display text-xl font-bold text-white">
                    2. {userTeam.name} Starting XI & Tactical Formation
                  </h3>
                  <p className="text-xs text-slate-400">
                    Select your preferred formation before entering the World Cup Group Stage.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {(Object.keys(FORMATIONS) as FormationName[]).map((form) => (
                    <button
                      key={form}
                      onClick={() => {
                        SoundEngine.playUIClick();
                        onSelectFormation(form);
                      }}
                      className={`px-3 py-1.5 rounded text-xs font-mono font-semibold transition-colors ${
                        userFormation === form
                          ? 'bg-[#10B981] text-[#070A0E]'
                          : 'bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {form}
                    </button>
                  ))}
                  <button
                    onClick={() => setWcStep('bracket')}
                    className="ml-2 px-4 py-2 bg-[#F59E0B] text-[#070A0E] font-display font-bold text-xs rounded-lg"
                  >
                    Proceed to Group Stage
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {userSquad.slice(0, 11).map((player, idx) => {
                  const slot = FORMATIONS[userFormation][idx];
                  return (
                    <div
                      key={player.id}
                      className="p-3 rounded-xl bg-[#070A0E]/80 border border-white/10 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <PlayerPhotoAvatar
                          player={player}
                          className="w-13 h-13 rounded-xl border border-white/20"
                          showPositionBadge={true}
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-mono text-[#10B981] font-bold">
                            {slot?.label || player.position} · #{player.number}
                          </div>
                          <div className="text-[11px] text-slate-300 truncate">
                            {player.nationality}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            PAC {player.attributes.pace} · SHO {player.attributes.shooting}
                          </div>
                        </div>
                      </div>
                      <div className="font-mono text-lg font-bold text-[#F59E0B] shrink-0">
                        {player.rating}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Steps 3-8: Group Stage, Knockout Bracket & Trophy Ceremony */}
          {wcStep === 'bracket' && (
            <div className="space-y-6">
              {/* Stage Progress Stepper */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                {WC_STAGES.map((st) => {
                  const isCompleted = tournamentStageIndex > st.index;
                  const isCurrent = tournamentStageIndex === st.index;
                  return (
                    <div
                      key={st.index}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isCurrent
                          ? 'bg-[#192231] border-[#F59E0B]'
                          : isCompleted
                          ? 'bg-[#10B981]/10 border-[#10B981]/40'
                          : 'bg-[#111722] border-white/5 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                        <span className={isCurrent ? 'text-[#F59E0B]' : isCompleted ? 'text-[#10B981]' : 'text-slate-400'}>
                          STEP 0{st.index + 1}
                        </span>
                        {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />}
                      </div>
                      <div className="font-display font-bold text-xs text-white truncate">
                        {st.short}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* TROPHY CEREMONY CELEBRATION IF TOURNAMENT WON */}
              {tournamentStageIndex >= 7 ? (
                <div className="bg-gradient-to-b from-[#192231] to-[#111722] border-2 border-[#F59E0B] rounded-2xl p-10 text-center shadow-2xl">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[#F59E0B]/20 border border-[#F59E0B] flex items-center justify-center">
                    <Trophy className="w-10 h-10 text-[#F59E0B]" />
                  </div>
                  <div className="text-xs font-mono text-[#F59E0B] tracking-widest mb-2">
                    CONFETTI · FIREWORKS · CHAMPIONS OF THE WORLD
                  </div>
                  <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-3">
                    {userTeam.name.toUpperCase()} WINS THE {selectedTournament.name.toUpperCase()}!
                  </h2>
                  <p className="text-sm text-slate-300 max-w-xl mx-auto mb-6">
                    Your captain lifts the golden trophy beneath a storm of stadium fireworks and roaring supporters. You have earned +{selectedTournament.prizeCoins.toLocaleString()} Coins and the World Champion Badge!
                  </p>
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={onResetTournament}
                      className="px-6 py-3 bg-[#F59E0B] text-[#070A0E] font-display font-bold text-sm rounded-lg hover:bg-[#D97706] transition-colors"
                    >
                      START NEW CAMPAIGN
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left: Group Standings Table */}
                  <div className="bg-[#111722] border border-white/10 rounded-2xl p-6">
                    <h3 className="font-display text-lg font-bold text-white mb-4">
                      Group A Standings
                    </h3>
                    <div className="space-y-3 font-mono text-xs">
                      <div className="grid grid-cols-6 text-slate-400 pb-2 border-b border-white/10">
                        <span className="col-span-3">TEAM</span>
                        <span className="text-center">P</span>
                        <span className="text-center">GD</span>
                        <span className="text-right">PTS</span>
                      </div>
                      {groupTeams.map((row, idx) => (
                        <div
                          key={row.team.id}
                          className={`grid grid-cols-6 items-center py-2 border-b border-white/5 ${
                            idx === 0 ? 'text-[#10B981] font-bold' : 'text-slate-200'
                          }`}
                        >
                          <span className="col-span-3 font-sans truncate">
                            {idx + 1}. {row.team.name}
                          </span>
                          <span className="text-center tabular-nums">{row.played}</span>
                          <span className="text-center tabular-nums">{row.gd}</span>
                          <span className="text-right tabular-nums">{row.pts}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Center & Right: Active Fixture & Knockout Bracket Preview */}
                  <div className="lg:col-span-2 bg-[#111722] border border-white/10 rounded-2xl p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                        <div>
                          <div className="text-xs font-mono text-[#10B981]">
                            NEXT FIXTURE · {currentStage.title.toUpperCase()}
                          </div>
                          <h3 className="font-display text-2xl font-bold text-white mt-1">
                            {userTeam.name} vs {currentOpponent.name}
                          </h3>
                        </div>
                        <div className="text-right font-mono text-xs text-slate-400">
                          <div>Venue: {STADIUMS[tournamentStageIndex === 6 ? 4 : 0].name}</div>
                          <div>Prize Pool: {selectedTournament.prizeCoins.toLocaleString()} Coins</div>
                        </div>
                      </div>

                      {/* Knockout Bracket Tree Visualization */}
                      <div className="grid grid-cols-4 gap-3 mb-6 text-xs font-mono">
                        <div className={`p-3 rounded-lg border ${tournamentStageIndex === 3 ? 'border-[#F59E0B] bg-[#192231]' : 'border-white/10 bg-[#070A0E]/60'}`}>
                          <div className="text-slate-400 mb-1">ROUND OF 16</div>
                          <div className="text-white font-bold">{userTeam.shortName} vs {opponentsPool[3]?.shortName}</div>
                        </div>
                        <div className={`p-3 rounded-lg border ${tournamentStageIndex === 4 ? 'border-[#F59E0B] bg-[#192231]' : 'border-white/10 bg-[#070A0E]/60'}`}>
                          <div className="text-slate-400 mb-1">QUARTER-FINAL</div>
                          <div className="text-white font-bold">{userTeam.shortName} vs {opponentsPool[4]?.shortName}</div>
                        </div>
                        <div className={`p-3 rounded-lg border ${tournamentStageIndex === 5 ? 'border-[#F59E0B] bg-[#192231]' : 'border-white/10 bg-[#070A0E]/60'}`}>
                          <div className="text-slate-400 mb-1">SEMI-FINAL</div>
                          <div className="text-white font-bold">{userTeam.shortName} vs {opponentsPool[5]?.shortName}</div>
                        </div>
                        <div className={`p-3 rounded-lg border ${tournamentStageIndex === 6 ? 'border-[#F59E0B] bg-[#192231]' : 'border-white/10 bg-[#070A0E]/60'}`}>
                          <div className="text-[#F59E0B] mb-1">GRAND FINAL</div>
                          <div className="text-white font-bold">{userTeam.shortName} vs {opponentsPool[6]?.shortName}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/10">
                      <button
                        onClick={() =>
                          onStartTournamentMatch({
                            opponent: currentOpponent,
                            stageLabel: `${selectedTournament.name} · ${currentStage.short}`,
                            isFinal: tournamentStageIndex === 6,
                            tournamentName: selectedTournament.name,
                          })
                        }
                        className="px-6 py-3 bg-[#10B981] hover:bg-[#059669] text-[#070A0E] font-display font-bold text-sm rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        PLAY {currentStage.short.toUpperCase()} MATCH (3D)
                      </button>

                      <button
                        onClick={onAdvanceStageSimulation}
                        className="px-4 py-3 bg-white/10 hover:bg-white/15 text-slate-200 font-display font-semibold text-xs rounded-lg transition-colors"
                      >
                        Simulate Stage (Instant Result)
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ALL 8 MAJOR TOURNAMENTS */}
      {activeTab === 'tournaments' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {TOURNAMENTS_LIST.map((tourney) => (
            <div
              key={tourney.id}
              className="bg-[#111722] border border-white/10 hover:border-white/25 rounded-2xl p-6 flex flex-col justify-between transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/15"
                    style={{ backgroundColor: `${tourney.trophyColor}20` }}
                  >
                    <Trophy className="w-5 h-5" style={{ color: tourney.trophyColor }} />
                  </div>
                  <span className="font-mono text-xs text-[#F59E0B] font-semibold">
                    +{tourney.prizeCoins.toLocaleString()} Coins
                  </span>
                </div>
                <div className="text-xs text-slate-400 mb-1">{tourney.region}</div>
                <h3 className="font-display text-xl font-bold text-white mb-2">
                  {tourney.name}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-6">
                  {tourney.description}
                </p>
              </div>

              <button
                onClick={() => {
                  SoundEngine.playUIClick();
                  setSelectedTournament(tourney);
                  setActiveTab('world_cup');
                  setWcStep('bracket');
                }}
                className="w-full py-2.5 bg-[#10B981] hover:bg-[#059669] text-[#070A0E] font-display font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                ENTER TOURNAMENT <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
