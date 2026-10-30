/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  Zap,
  RotateCcw,
  CheckCircle2,
  X,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { FootballPlayer } from '../data/gameDatabase';
import { SoundEngine } from '../engine/SoundEngine';
import { PlayerPhotoAvatar } from './PlayerPhotoAvatar';

export type PESBallTier = 'black' | 'gold' | 'silver' | 'bronze';

export interface ClassicPESBallOpeningProps {
  isOpen: boolean;
  onClose: () => void;
  player: FootballPlayer;
  sourceTitle: string;
  sourceSubtitle: string;
  canDrawAgain?: boolean;
  drawAgainLabel?: string;
  onDrawAgain?: () => void;
}

export function getBallTierForPlayer(player: FootballPlayer): PESBallTier {
  if (player.rarity === 'Legendary' || player.rarity === 'Special Edition' || player.rating >= 85) {
    return 'black';
  }
  if (player.rating >= 80) return 'gold';
  if (player.rating >= 75) return 'silver';
  return 'bronze';
}

const BALL_STYLES: Record<
  PESBallTier,
  {
    name: string;
    bgGradient: string;
    seamColor: string;
    glowShadow: string;
    textColor: string;
    badgeBg: string;
    border: string;
  }
> = {
  black: {
    name: 'BLACK BALL (85+ OVR · LEGEND)',
    bgGradient: 'radial-gradient(circle at 35% 35%, #334155, #0F172A 60%, #020617 100%)',
    seamColor: '#F59E0B',
    glowShadow: '0 0 45px rgba(245, 158, 11, 0.75), 0 0 90px rgba(56, 189, 248, 0.45)',
    textColor: '#F59E0B',
    badgeBg: 'bg-gradient-to-r from-amber-500/20 via-black to-cyan-500/20 border-amber-500/60',
    border: 'border-amber-400',
  },
  gold: {
    name: 'GOLD BALL (80–84 OVR)',
    bgGradient: 'radial-gradient(circle at 35% 35%, #FDE047, #CA8A04 60%, #713F12 100%)',
    seamColor: '#FEF08A',
    glowShadow: '0 0 35px rgba(234, 179, 8, 0.75)',
    textColor: '#EAB308',
    badgeBg: 'bg-yellow-500/20 border-yellow-500/60',
    border: 'border-yellow-400',
  },
  silver: {
    name: 'SILVER BALL (75–79 OVR)',
    bgGradient: 'radial-gradient(circle at 35% 35%, #F8FAFC, #94A3B8 60%, #334155 100%)',
    seamColor: '#E2E8F0',
    glowShadow: '0 0 30px rgba(226, 232, 240, 0.65)',
    textColor: '#E2E8F0',
    badgeBg: 'bg-slate-400/20 border-slate-400/60',
    border: 'border-slate-300',
  },
  bronze: {
    name: 'BRONZE BALL (BELOW 75 OVR)',
    bgGradient: 'radial-gradient(circle at 35% 35%, #D97706, #92400E 60%, #451A03 100%)',
    seamColor: '#FCD34D',
    glowShadow: '0 0 25px rgba(217, 119, 6, 0.55)',
    textColor: '#F59E0B',
    badgeBg: 'bg-amber-700/20 border-amber-700/60',
    border: 'border-amber-600',
  },
};

export const ClassicPESBallOpeningModal: React.FC<ClassicPESBallOpeningProps> = ({
  isOpen,
  onClose,
  player,
  sourceTitle,
  sourceSubtitle,
  canDrawAgain,
  drawAgainLabel,
  onDrawAgain,
}) => {
  // Animation phases: 'spinning' -> 'stopping' -> 'selected' -> 'cracking' -> 'revealed'
  const [phase, setPhase] = useState<'spinning' | 'stopping' | 'selected' | 'cracking' | 'revealed'>('spinning');
  const [offsetIndex, setOffsetIndex] = useState<number>(0);
  const [selectedBallTier, setSelectedBallTier] = useState<PESBallTier>('black');
  const [audioMuted, setAudioMuted] = useState<boolean>(false);
  const animFrameRef = useRef<number | null>(null);

  const winningTier = getBallTierForPlayer(player);

  // Generate sequence of balls with authentic PES ball distribution around the target
  const ballSequence: PESBallTier[] = React.useMemo(() => {
    const list: PESBallTier[] = [
      'silver', 'gold', 'silver', 'black', 'gold',
      'silver', 'gold', 'black', 'silver', 'bronze',
      'gold', 'black', 'silver', 'gold', 'black',
      'silver', 'gold', 'silver', 'black', 'gold'
    ];
    // Ensure index 12 (center landing slot) is the exact winning tier
    list[12] = winningTier;
    // Add suspense: if winning tier is black, put a gold ball right before it
    if (winningTier === 'black') {
      list[11] = 'gold';
    }
    return list;
  }, [winningTier]);

  useEffect(() => {
    if (!isOpen) {
      setPhase('spinning');
      setOffsetIndex(0);
      return;
    }

    setPhase('spinning');
    setSelectedBallTier(winningTier);

    let currentIdx = 0;
    const interval = setInterval(() => {
      currentIdx = (currentIdx + 1) % ballSequence.length;
      setOffsetIndex(currentIdx);
      if (!audioMuted) {
        SoundEngine.playBallOpeningTick(1.2);
      }
    }, 65);

    return () => {
      clearInterval(interval);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen, winningTier, ballSequence.length, audioMuted]);

  if (!isOpen) return null;

  const handleStopBallReel = () => {
    if (phase !== 'spinning') return;
    setPhase('stopping');
    SoundEngine.playUIClick();

    let step = 0;
    const totalSteps = 16;
    let currentStepDelay = 70;

    const tickSlowdown = () => {
      step++;
      setOffsetIndex((prev) => (prev + 1) % ballSequence.length);
      if (!audioMuted) {
        const pitch = Math.max(0.7, 1.4 - (step / totalSteps) * 0.6);
        SoundEngine.playBallOpeningTick(pitch);
      }

      if (step < totalSteps) {
        currentStepDelay += Math.round(18 + Math.pow(step / totalSteps, 2) * 45);
        setTimeout(tickSlowdown, currentStepDelay);
      } else {
        // Land on the winning center ball
        setPhase('selected');
        setTimeout(() => {
          setPhase('cracking');
          if (!audioMuted) {
            SoundEngine.playBallCrackExplosion(winningTier === 'black');
          }
          setTimeout(() => {
            setPhase('revealed');
            SoundEngine.playCardRevealFlare();
          }, 850);
        }, 750);
      }
    };

    setTimeout(tickSlowdown, currentStepDelay);
  };

  const handleSkipToReveal = () => {
    setPhase('revealed');
    SoundEngine.playCardRevealFlare();
  };

  const winningBallStyle = BALL_STYLES[winningTier];

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 overflow-hidden select-none">
      {/* Background Stadium Floodlights & Ambient Fog */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.85)_100%)]" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-3xl bg-[#090D14]/95 border-2 border-amber-500/40 rounded-3xl p-5 sm:p-8 shadow-[0_0_80px_rgba(245,158,11,0.25)] flex flex-col items-center text-center">
        {/* Top Header Bar */}
        <div className="w-full flex items-center justify-between border-b border-white/10 pb-4 mb-4">
          <div className="text-left">
            <div className="text-[10px] sm:text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              CLASSIC PES / EFOOTBALL BALL OPENING
            </div>
            <h2 className="font-display text-lg sm:text-2xl font-extrabold text-white tracking-wide">
              {sourceTitle}
            </h2>
            <p className="text-xs text-slate-400">{sourceSubtitle}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAudioMuted(!audioMuted)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={audioMuted ? 'Unmute Sound' : 'Mute Sound'}
            >
              {audioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* PHASE 1 & 2: ROLLING BALL CAROUSEL REEL */}
        {/* ============================================================== */}
        {(phase === 'spinning' || phase === 'stopping') && (
          <div className="w-full flex flex-col items-center py-6 sm:py-8 space-y-6">
            <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2">
              <Zap className="w-4 h-4 animate-bounce" />
              {phase === 'spinning' ? 'PRESS STOP TO DRAW YOUR PLAYER' : 'DECELERATING BALL REEL...'}
            </div>

            {/* Carousel Viewing Box with Center Crosshair Indicator */}
            <div className="relative w-full max-w-xl h-44 sm:h-52 bg-[#05080E] border-2 border-amber-500/60 rounded-2xl overflow-hidden flex items-center justify-center shadow-inner">
              {/* Center Target Indicator Arrows */}
              <div className="absolute top-1 z-30 flex flex-col items-center pointer-events-none">
                <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[14px] border-t-amber-400 filter drop-shadow-[0_2px_8px_rgba(245,158,11,0.8)]" />
              </div>
              <div className="absolute bottom-1 z-30 flex flex-col items-center pointer-events-none">
                <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[14px] border-b-amber-400 filter drop-shadow-[0_2px_8px_rgba(245,158,11,0.8)]" />
              </div>

              {/* Vertical Center Indicator Line */}
              <div className="absolute inset-y-0 w-24 bg-amber-400/10 border-x border-amber-400/40 pointer-events-none z-20" />

              {/* Rolling Balls Belt */}
              <div className="flex items-center gap-4 sm:gap-6 transition-transform duration-75">
                {[-2, -1, 0, 1, 2].map((offset) => {
                  const idx = (offsetIndex + offset + ballSequence.length * 10) % ballSequence.length;
                  const tier = ballSequence[idx];
                  const style = BALL_STYLES[tier];
                  const isCenter = offset === 0;

                  return (
                    <div
                      key={`ball_${offset}_${idx}`}
                      className={`relative rounded-full transition-all flex items-center justify-center shrink-0 ${
                        isCenter
                          ? 'w-24 h-24 sm:w-28 sm:h-28 scale-110 shadow-2xl z-20'
                          : 'w-18 h-18 sm:w-20 sm:h-20 opacity-60'
                      }`}
                      style={{
                        background: style.bgGradient,
                        boxShadow: isCenter ? style.glowShadow : undefined,
                        border: isCenter ? '3px solid rgba(255,255,255,0.85)' : '1px solid rgba(255,255,255,0.2)',
                      }}
                    >
                      {/* Geometric Pentagons on Ball Surface */}
                      <div
                        className="w-8 h-8 rounded-full border border-white/40 flex items-center justify-center"
                        style={{ borderColor: style.seamColor }}
                      >
                        <div
                          className="w-3 h-3 rotate-45"
                          style={{ backgroundColor: style.seamColor }}
                        />
                      </div>
                      {/* Gloss Highlight Arc */}
                      <div className="absolute top-2 left-3 w-8 h-4 rounded-full bg-white/30 -rotate-45 filter blur-[1px]" />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Big Tactile STOP Button */}
            <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
              <button
                disabled={phase !== 'spinning'}
                onClick={handleStopBallReel}
                className={`px-10 py-4.5 rounded-2xl font-display font-extrabold text-lg sm:text-xl transition-all shadow-[0_0_40px_rgba(245,158,11,0.6)] cursor-pointer flex items-center gap-2.5 ${
                  phase === 'spinning'
                    ? 'bg-gradient-to-r from-emerald-400 via-yellow-400 to-amber-500 hover:brightness-115 text-slate-950 scale-100 hover:scale-105 active:scale-95'
                    : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Zap className="w-6 h-6 fill-current" />
                {phase === 'spinning' ? 'STOP REEL!' : 'STOPPING...'}
              </button>

              <button
                onClick={handleSkipToReveal}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Skip Animation
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PHASE 3 & 4: BALL CRACKING OPEN WITH LIGHTNING & PARTICLES */}
        {/* ============================================================== */}
        {(phase === 'selected' || phase === 'cracking') && (
          <div className="py-10 sm:py-14 flex flex-col items-center justify-center space-y-6 animate-in fade-in zoom-in duration-300">
            <div
              className={`text-sm sm:text-base font-mono font-extrabold uppercase tracking-widest px-4 py-1.5 rounded-full border ${winningBallStyle.badgeBg}`}
              style={{ color: winningBallStyle.textColor }}
            >
              {winningBallStyle.name}
            </div>

            {/* Zoomed-in Winning Ball */}
            <div className="relative flex items-center justify-center">
              {/* Radial Lightning Aura */}
              <div
                className={`absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full animate-ping opacity-40`}
                style={{ backgroundColor: winningBallStyle.textColor }}
              />

              {/* The Ball Cracking in Two */}
              <div
                className={`relative w-36 h-36 sm:w-44 sm:h-44 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 ${
                  phase === 'cracking' ? 'scale-125' : 'scale-100 animate-pulse'
                }`}
                style={{
                  background: winningBallStyle.bgGradient,
                  boxShadow: winningBallStyle.glowShadow,
                  border: '4px solid rgba(255,255,255,0.9)',
                }}
              >
                {/* Center Lightning Fracture */}
                {phase === 'cracking' && (
                  <div className="absolute inset-0 flex items-center justify-center z-30">
                    <div className="w-1 h-full bg-white animate-pulse shadow-[0_0_25px_#FFFFFF]" />
                    <Zap className="w-16 h-16 text-yellow-300 animate-spin absolute" />
                  </div>
                )}
                <div
                  className="w-12 h-12 rounded-full border-2 flex items-center justify-center"
                  style={{ borderColor: winningBallStyle.seamColor }}
                >
                  <div
                    className="w-5 h-5 rotate-45"
                    style={{ backgroundColor: winningBallStyle.seamColor }}
                  />
                </div>
              </div>
            </div>

            <div className="text-white font-display font-bold text-lg animate-pulse">
              {phase === 'cracking' ? 'CRACKING BALL OPEN...' : 'BALL LOCKED IN! OPENING...'}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PHASE 5: FULL PLAYER CARD WALKOUT REVEAL WITH SQUAD CONFIRMATION */}
        {/* ============================================================== */}
        {phase === 'revealed' && (
          <div className="w-full flex flex-col items-center py-4 space-y-6 animate-in zoom-in-95 duration-500">
            {/* Success Squad Placement Banner */}
            <div className="w-full max-w-lg p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                AUTHENTIC DRAW: {player.name} placed in My Squad as{' '}
                <span className="text-white font-extrabold uppercase">
                  {player.position}
                </span>!
              </span>
            </div>

            {/* High-Impact Player Card Display */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full max-w-xl">
              {/* Realistic Photo Card */}
              <div
                className={`relative w-48 sm:w-56 h-72 sm:h-80 rounded-2xl overflow-hidden p-3 bg-gradient-to-b from-[#1E293B] to-[#0A0F18] border-2 shadow-2xl flex flex-col justify-between shrink-0 ${winningBallStyle.border}`}
                style={{ boxShadow: winningBallStyle.glowShadow }}
              >
                {/* Header Strip: Rating & Position */}
                <div className="flex items-center justify-between font-mono z-20">
                  <span
                    className="font-extrabold text-3xl sm:text-4xl leading-none drop-shadow"
                    style={{ color: winningBallStyle.textColor }}
                  >
                    {player.rating}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-black/80 border border-white/20 text-white font-bold text-xs">
                    {player.position}
                  </span>
                </div>

                {/* Player Face Photo Avatar */}
                <div className="relative w-full h-36 sm:h-44 my-auto flex items-center justify-center">
                  <PlayerPhotoAvatar
                    player={player}
                    className="w-32 h-36 sm:w-36 sm:h-42 rounded-xl object-cover object-top border border-white/20 shadow-2xl"
                    showPositionBadge={false}
                    showRatingBadge={false}
                  />
                </div>

                {/* Player Name and Club/Nation */}
                <div className="z-20 text-center bg-black/75 backdrop-blur-sm p-2 rounded-xl border border-white/10">
                  <div className="font-display font-extrabold text-sm sm:text-base text-white truncate">
                    {player.name}
                  </div>
                  <div className="text-[11px] text-slate-300 truncate mt-0.5">
                    {player.nationality} · {player.club}
                  </div>
                </div>
              </div>

              {/* Player Attributes & Stats Column */}
              <div className="flex-1 text-left space-y-3 w-full">
                <div className="border-b border-white/10 pb-2">
                  <div
                    className="text-xs font-mono font-bold uppercase tracking-wider"
                    style={{ color: winningBallStyle.textColor }}
                  >
                    {player.rarity} Superstar
                  </div>
                  <h3 className="font-display text-xl sm:text-2xl font-bold text-white">
                    {player.name}
                  </h3>
                  <div className="text-xs text-slate-400">
                    Jersey #{player.number} · Preferred Role: {player.position}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2 rounded-lg bg-white/5 border border-white/10 flex justify-between">
                    <span className="text-slate-400">Pace:</span>
                    <span className="text-white font-bold">{player.attributes.pace}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5 border border-white/10 flex justify-between">
                    <span className="text-slate-400">Shooting:</span>
                    <span className="text-white font-bold">{player.attributes.shooting}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5 border border-white/10 flex justify-between">
                    <span className="text-slate-400">Passing:</span>
                    <span className="text-white font-bold">{player.attributes.passing}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5 border border-white/10 flex justify-between">
                    <span className="text-slate-400">Dribbling:</span>
                    <span className="text-white font-bold">{player.attributes.dribbling}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5 border border-white/10 flex justify-between">
                    <span className="text-slate-400">Defending:</span>
                    <span className="text-white font-bold">{player.attributes.defending}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5 border border-white/10 flex justify-between">
                    <span className="text-slate-400">Physical:</span>
                    <span className="text-white font-bold">{player.attributes.physical}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
              {canDrawAgain && onDrawAgain && (
                <button
                  onClick={() => {
                    setPhase('spinning');
                    onDrawAgain();
                  }}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-slate-950 font-display font-extrabold text-sm transition-all shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  {drawAgainLabel || 'DRAW AGAIN'}
                </button>
              )}

              <button
                onClick={onClose}
                className="px-8 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-display font-extrabold text-sm transition-all shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                ADD TO SQUAD & CLOSE
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
