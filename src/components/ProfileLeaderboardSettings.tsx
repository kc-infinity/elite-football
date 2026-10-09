import React, { useState } from 'react';
import {
  Award,
  Camera,
  CheckCircle2,
  Gamepad2,
  Maximize2,
  Sliders,
  Trophy,
  User,
  Volume2,
} from 'lucide-react';
import {
  ACHIEVEMENTS_LIST,
  FootballPlayer,
  GLOBAL_LEADERBOARD,
  TeamData,
} from '../data/gameDatabase';
import {
  AutoSwitchMode,
  CameraMode,
  ControlScheme,
  DifficultyLevel,
  KeyBindings,
} from '../engine/FootballEngine3D';
import { AudioSettings, SoundEngine } from '../engine/SoundEngine';
import { PlayerPhotoAvatar } from './PlayerPhotoAvatar';

export interface UserProfileStats {
  username: string;
  level: number;
  matchesPlayed: number;
  wins: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  trophies: number;
  unlockedAchievementIds: string[];
}

interface ProfileLeaderboardSettingsProps {
  activeSection: 'profile' | 'leaderboard' | 'settings';
  profile: UserProfileStats;
  favoriteTeam: TeamData;
  bestPlayer: FootballPlayer;
  onUpdateUsername: (name: string) => void;
  graphicsQuality: 'Low' | 'Medium' | 'High' | 'Ultra';
  onChangeGraphics: (q: 'Low' | 'Medium' | 'High' | 'Ultra') => void;
  cameraMode: CameraMode;
  onChangeCamera: (c: CameraMode) => void;
  controlScheme: ControlScheme;
  onChangeControlScheme: (cs: ControlScheme) => void;
  difficulty: DifficultyLevel;
  onChangeDifficulty: (d: DifficultyLevel) => void;
  mouseSensitivity: number;
  onChangeMouseSens: (val: number) => void;
  cameraSensitivity: number;
  onChangeCameraSens: (val: number) => void;
  keyBindings: KeyBindings;
  onChangeKeyBindings: (kb: KeyBindings) => void;
  autoSwitchMode?: AutoSwitchMode;
  onChangeAutoSwitchMode?: (mode: AutoSwitchMode) => void;
}

type LeaderboardCategory =
  | 'Global'
  | 'Tournament Wins'
  | 'Most Goals'
  | 'Most Assists'
  | 'Best Goalkeeper'
  | 'Best Win Rate'
  | 'Highest Rating';

export const ProfileLeaderboardSettings: React.FC<ProfileLeaderboardSettingsProps> = ({
  activeSection,
  profile,
  favoriteTeam,
  bestPlayer,
  onUpdateUsername,
  graphicsQuality,
  onChangeGraphics,
  cameraMode,
  onChangeCamera,
  controlScheme,
  onChangeControlScheme,
  difficulty,
  onChangeDifficulty,
  mouseSensitivity,
  onChangeMouseSens,
  cameraSensitivity,
  onChangeCameraSens,
  keyBindings,
  onChangeKeyBindings,
  autoSwitchMode = 'auto',
  onChangeAutoSwitchMode,
}) => {
  const [lbCategory, setLbCategory] = useState<LeaderboardCategory>('Global');
  const [audio, setAudio] = useState<AudioSettings>(SoundEngine.settings);
  const [listeningKeyField, setListeningKeyField] = useState<keyof KeyBindings | null>(null);

  const winRate =
    profile.matchesPlayed > 0
      ? `${((profile.wins / profile.matchesPlayed) * 100).toFixed(1)}%`
      : '100.0%';

  const handleAudioChange = (partial: Partial<AudioSettings>) => {
    const next = { ...audio, ...partial };
    setAudio(next);
    SoundEngine.updateSettings(partial);
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Sort leaderboard dynamically including the user's own profile entry
  const combinedLeaderboard = [
    ...GLOBAL_LEADERBOARD,
    {
      rank: 0,
      username: `${profile.username} (YOU)`,
      country: favoriteTeam.name,
      rating: 1950 + profile.wins * 35 + profile.trophies * 120,
      matches: profile.matchesPlayed,
      wins: profile.wins,
      winRate,
      goals: profile.goals,
      assists: profile.assists,
      cleanSheets: profile.cleanSheets,
      tournamentsWon: profile.trophies,
    },
  ]
    .sort((a, b) => {
      if (lbCategory === 'Tournament Wins') return b.tournamentsWon - a.tournamentsWon;
      if (lbCategory === 'Most Goals') return b.goals - a.goals;
      if (lbCategory === 'Most Assists') return b.assists - a.assists;
      if (lbCategory === 'Best Goalkeeper') return b.cleanSheets - a.cleanSheets;
      if (lbCategory === 'Best Win Rate') return parseFloat(b.winRate) - parseFloat(a.winRate);
      return b.rating - a.rating;
    })
    .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* SECTION 1: PLAYER PROFILE & ACHIEVEMENTS */}
      {activeSection === 'profile' && (
        <div className="space-y-8">
          <div className="border-b border-white/10 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-mono text-[#10B981] mb-1">
                CAREER RECORD · TROPHY CABINET · ACHIEVEMENTS
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-white">
                MANAGER & PLAYER PROFILE
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-400">Club Alias:</label>
              <input
                type="text"
                value={profile.username}
                onChange={(e) => onUpdateUsername(e.target.value)}
                className="bg-[#111722] border border-white/15 rounded-lg px-3 py-2 text-xs font-mono text-white"
              />
            </div>
          </div>

          {/* Primary Career Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Career Level', value: `LVL ${profile.level}`, accent: '#10B981' },
              { label: 'Matches Played', value: profile.matchesPlayed, accent: '#F1F5F9' },
              { label: 'Total Wins', value: profile.wins, accent: '#10B981' },
              { label: 'Win Rate', value: winRate, accent: '#38BDF8' },
              { label: 'Goals Scored', value: profile.goals, accent: '#F59E0B' },
              { label: 'Trophies Won', value: profile.trophies, accent: '#F59E0B' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-[#111722] border border-white/10 rounded-2xl p-5"
              >
                <div className="text-xs text-slate-400 mb-1">{stat.label}</div>
                <div
                  className="font-mono text-2xl font-bold tabular-nums"
                  style={{ color: stat.accent }}
                >
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* Secondary Details: Assists, Clean Sheets, Favorite Team, Best Player */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#111722] border border-white/10 rounded-2xl p-5">
              <div className="text-xs text-slate-400 mb-1">Career Assists</div>
              <div className="font-mono text-xl font-bold text-white tabular-nums">
                {profile.assists}
              </div>
            </div>
            <div className="bg-[#111722] border border-white/10 rounded-2xl p-5">
              <div className="text-xs text-slate-400 mb-1">Clean Sheets</div>
              <div className="font-mono text-xl font-bold text-white tabular-nums">
                {profile.cleanSheets}
              </div>
            </div>
            <div className="bg-[#111722] border border-white/10 rounded-2xl p-5">
              <div className="text-xs text-slate-400 mb-1">Favorite Team</div>
              <div className="font-display text-lg font-bold text-white">
                {favoriteTeam.name} (OVR {favoriteTeam.rating})
              </div>
            </div>
            <div className="bg-[#111722] border border-white/10 rounded-2xl p-5">
              <div className="text-xs text-slate-400 mb-1">Best Club Superstar</div>
              <div className="font-display text-lg font-bold text-[#F59E0B]">
                {bestPlayer.name} (OVR {bestPlayer.rating})
              </div>
            </div>
          </div>

          {/* Achievements & Badges Section */}
          <div className="bg-[#111722] border border-white/10 rounded-2xl p-6">
            <h2 className="font-display text-xl font-bold text-white mb-4">
              Achievements & Honors
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {ACHIEVEMENTS_LIST.map((ach) => {
                const unlocked = profile.unlockedAchievementIds.includes(ach.id);
                return (
                  <div
                    key={ach.id}
                    className={`p-4 rounded-xl border transition-all ${
                      unlocked
                        ? 'bg-[#192231] border-[#10B981]'
                        : 'bg-[#070A0E]/60 border-white/10 opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono mb-2">
                      <span className={unlocked ? 'text-[#10B981] font-bold' : 'text-slate-500'}>
                        {ach.code} · {unlocked ? 'UNLOCKED' : 'LOCKED'}
                      </span>
                      <span className="text-[#F59E0B]">+{ach.rewardCoins.toLocaleString()}</span>
                    </div>
                    <div className="font-display font-bold text-base text-white mb-1">
                      {ach.title}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{ach.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: GLOBAL LEADERBOARD */}
      {activeSection === 'leaderboard' && (
        <div className="space-y-6">
          <div className="border-b border-white/10 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-mono text-[#F59E0B] mb-1">
                WORLDWIDE COMPETITIVE STANDINGS · DIVISION 1
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-white">
                GLOBAL LEADERBOARD
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-1 p-1 bg-[#111722] border border-white/10 rounded-lg">
              {(
                [
                  'Global',
                  'Tournament Wins',
                  'Most Goals',
                  'Most Assists',
                  'Best Goalkeeper',
                  'Best Win Rate',
                  'Highest Rating',
                ] as LeaderboardCategory[]
              ).map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    SoundEngine.playUIClick();
                    setLbCategory(cat);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                    lbCategory === cat
                      ? 'bg-[#10B981] text-[#070A0E] font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#111722] border border-white/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-[11px] font-mono text-slate-400 bg-[#070A0E]/50">
                    <th className="py-3.5 px-5">RANK</th>
                    <th className="py-3.5 px-5">PLAYER</th>
                    <th className="py-3.5 px-5">NATION / CLUB</th>
                    <th className="py-3.5 px-5 text-right">SKILL RATING</th>
                    <th className="py-3.5 px-5 text-right">WIN RATE</th>
                    <th className="py-3.5 px-5 text-right">GOALS</th>
                    <th className="py-3.5 px-5 text-right">ASSISTS</th>
                    <th className="py-3.5 px-5 text-right">CLEAN SHEETS</th>
                    <th className="py-3.5 px-5 text-right">TROPHIES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs font-mono tabular-nums">
                  {combinedLeaderboard.map((row) => {
                    const isUser = row.username.includes('(YOU)');
                    return (
                      <tr
                        key={row.username}
                        className={
                          isUser
                            ? 'bg-[#10B981]/15 text-white font-bold'
                            : 'text-slate-200 hover:bg-white/5'
                        }
                      >
                        <td className="py-3.5 px-5 font-bold text-[#F59E0B]">#{row.rank}</td>
                        <td className="py-3.5 px-5 font-sans font-semibold text-white">
                          {row.username}
                        </td>
                        <td className="py-3.5 px-5 font-sans text-slate-300">{row.country}</td>
                        <td className="py-3.5 px-5 text-right text-[#10B981] font-bold">
                          {row.rating}
                        </td>
                        <td className="py-3.5 px-5 text-right">{row.winRate}</td>
                        <td className="py-3.5 px-5 text-right">{row.goals}</td>
                        <td className="py-3.5 px-5 text-right">{row.assists}</td>
                        <td className="py-3.5 px-5 text-right">{row.cleanSheets}</td>
                        <td className="py-3.5 px-5 text-right text-[#F59E0B] font-bold">
                          {row.tournamentsWon}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: SETTINGS & CUSTOMIZABLE CONTROLS */}
      {activeSection === 'settings' && (
        <div className="space-y-8">
          <div className="border-b border-white/10 pb-6 flex items-center justify-between">
            <div>
              <div className="text-xs font-mono text-[#38BDF8] mb-1">
                ENGINE CONFIGURATION · GRAPHICS · AUDIO · KEYBOARD & MOUSE
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-white">
                GAME SETTINGS & CONTROLS
              </h1>
            </div>

            <button
              onClick={handleToggleFullscreen}
              className="px-4 py-2 bg-[#111722] border border-white/15 hover:border-white/30 rounded-lg text-xs font-medium text-white flex items-center gap-2"
            >
              <Maximize2 className="w-3.5 h-3.5 text-[#10B981]" />
              Toggle Fullscreen
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Graphics, Camera, Difficulty, Mouse & Audio */}
            <div className="space-y-6">
              {/* Graphics & Performance */}
              <div className="bg-[#111722] border border-white/10 rounded-2xl p-6 space-y-4">
                <h2 className="font-display text-lg font-bold text-white">
                  Graphics Quality & Camera
                </h2>

                <div>
                  <label className="block text-xs text-slate-400 mb-2">
                    3D Graphics Preset (60 FPS Target)
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['Low', 'Medium', 'High', 'Ultra'] as const).map((q) => (
                      <button
                        key={q}
                        onClick={() => onChangeGraphics(q)}
                        className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
                          graphicsQuality === q
                            ? 'bg-[#10B981] text-[#070A0E] font-bold'
                            : 'bg-[#070A0E] text-slate-300 border border-white/10'
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-2">Default Match Camera</label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {(['Broadcast', 'Player', 'Action', 'Goalkeeper', 'Free'] as CameraMode[]).map(
                      (cam) => (
                        <button
                          key={cam}
                          onClick={() => onChangeCamera(cam)}
                          className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
                            cameraMode === cam
                              ? 'bg-[#38BDF8] text-[#070A0E] font-bold'
                              : 'bg-[#070A0E] text-slate-300 border border-white/10'
                          }`}
                        >
                          {cam}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-2">AI Opponent Difficulty</label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {(
                      ['Easy', 'Normal', 'Hard', 'Professional', 'World Class'] as DifficultyLevel[]
                    ).map((diff) => (
                      <button
                        key={diff}
                        onClick={() => onChangeDifficulty(diff)}
                        className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
                          difficulty === diff
                            ? 'bg-[#F59E0B] text-[#070A0E] font-bold'
                            : 'bg-[#070A0E] text-slate-300 border border-white/10'
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-2">
                    Auto Player Switch Option (When Defending & Loose Balls)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: 'auto', label: 'Auto Switch' },
                        { id: 'air_balls', label: 'Air Balls Only' },
                        { id: 'manual', label: 'Manual [Q]' },
                      ] as { id: AutoSwitchMode; label: string }[]
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          SoundEngine.playUIClick();
                          onChangeAutoSwitchMode?.(opt.id);
                        }}
                        className={`py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          autoSwitchMode === opt.id
                            ? 'bg-[#10B981] text-[#070A0E] font-bold'
                            : 'bg-[#070A0E] text-slate-300 border border-white/10'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-2">
                    Input Mode (Keyboard + Mouse Hybrid Recommended)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Hybrid', 'Keyboard', 'Mouse'] as ControlScheme[]).map((cs) => (
                      <button
                        key={cs}
                        onClick={() => onChangeControlScheme(cs)}
                        className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
                          controlScheme === cs
                            ? 'bg-[#10B981] text-[#070A0E] font-bold'
                            : 'bg-[#070A0E] text-slate-300 border border-white/10'
                        }`}
                      >
                        {cs === 'Hybrid' ? 'Keyboard + Mouse' : `${cs} Only`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Mouse Aim Sensitivity</span>
                      <span className="font-mono text-white">{mouseSensitivity.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.4"
                      max="2.0"
                      step="0.1"
                      value={mouseSensitivity}
                      onChange={(e) => onChangeMouseSens(parseFloat(e.target.value))}
                      className="w-full accent-[#10B981]"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Camera Rotation Sensitivity</span>
                      <span className="font-mono text-white">{cameraSensitivity.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.4"
                      max="2.0"
                      step="0.1"
                      value={cameraSensitivity}
                      onChange={(e) => onChangeCameraSens(parseFloat(e.target.value))}
                      className="w-full accent-[#38BDF8]"
                    />
                  </div>
                </div>
              </div>

              {/* Audio Volume Mixers */}
              <div className="bg-[#111722] border border-white/10 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold text-white">
                    Stadium Audio Mixer
                  </h2>
                  <span className="text-xs font-mono text-slate-400">Language: English (EN)</span>
                </div>

                {[
                  { label: 'Master Volume', field: 'masterVolume' as const, val: audio.masterVolume },
                  { label: 'Ball Kicks, Whistle & Net SFX', field: 'sfxVolume' as const, val: audio.sfxVolume },
                  { label: 'Stadium Crowd & Chants', field: 'crowdVolume' as const, val: audio.crowdVolume },
                  { label: 'Menu & Interface Audio', field: 'uiVolume' as const, val: audio.uiVolume },
                ].map((slider) => (
                  <div key={slider.field}>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>{slider.label}</span>
                      <span className="font-mono">{Math.round(slider.val * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={slider.val}
                      onChange={(e) =>
                        handleAudioChange({ [slider.field]: parseFloat(e.target.value) })
                      }
                      className="w-full accent-[#10B981]"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Interactive Keyboard Controls Customizer */}
            <div className="bg-[#111722] border border-white/10 rounded-2xl p-6">
              <h2 className="font-display text-lg font-bold text-white mb-1">
                Keyboard Controls Customization
              </h2>
              <p className="text-xs text-slate-400 mb-5">
                Click any control binding below and press a key on your keyboard to customize it.
              </p>

              <div className="space-y-2.5 font-mono text-xs">
                {(
                  [
                    { field: 'pass', label: 'Short Pass (Default: P)' },
                    { field: 'shoot', label: 'Shoot / Hold Power (Default: S)' },
                    { field: 'curveShot', label: 'Magnus Curve Shot (Default: C)' },
                    { field: 'rainbowFlick', label: 'Rainbow Flick Skill Move (Default: B)' },
                    { field: 'skillMove', label: 'Execute Skill Move (Default: K)' },
                    { field: 'sprint', label: 'Sprint Boost (Default: I)' },
                    { field: 'press', label: 'Team Press / Pressure (Default: R)' },
                    { field: 'moveForward', label: 'Move Forward (Default: W)' },
                    { field: 'moveBackward', label: 'Move Backward (Default: O)' },
                    { field: 'moveLeft', label: 'Move Left (Default: A)' },
                    { field: 'moveRight', label: 'Move Right / Defend (Default: D)' },
                    { field: 'gkSave', label: 'Goalkeeper Dive Save (Default: V)' },
                    { field: 'throughPass', label: 'Through Ball Pass (Default: U)' },
                    { field: 'cross', label: 'Cross / Lob Pass (Default: X)' },
                    { field: 'tackle', label: 'Standing / Sliding Tackle (Default: T)' },
                    { field: 'switchPlayer', label: 'Switch Player (Default: Q)' },
                  ] as { field: keyof KeyBindings; label: string }[]
                ).map((item) => {
                  const isListening = listeningKeyField === item.field;
                  return (
                    <div
                      key={item.field}
                      className="flex items-center justify-between py-2 px-3 bg-[#070A0E] border border-white/10 rounded-lg"
                    >
                      <span className="font-sans text-slate-200">{item.label}</span>
                      <button
                        onClick={() => setListeningKeyField(item.field)}
                        onKeyDown={(e) => {
                          if (isListening) {
                            e.preventDefault();
                            onChangeKeyBindings({ ...keyBindings, [item.field]: e.code });
                            setListeningKeyField(null);
                          }
                        }}
                        className={`px-3 py-1 rounded font-mono text-xs font-bold transition-colors ${
                          isListening
                            ? 'bg-[#F59E0B] text-[#070A0E]'
                            : 'bg-white/10 text-[#10B981] hover:bg-white/20'
                        }`}
                      >
                        {isListening
                          ? 'PRESS ANY KEY...'
                          : keyBindings[item.field].replace('Key', '')}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
