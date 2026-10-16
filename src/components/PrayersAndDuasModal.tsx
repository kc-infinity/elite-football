/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  BookOpen,
  Check,
  Compass,
  Copy,
  ExternalLink,
  Eye,
  Heart,
  Moon,
  Shield,
  Sparkles,
  Sun,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import { PRAYERS_AND_DUAS_DB, PrayerItem } from '../data/prayersDatabase';
import { SoundEngine } from '../engine/SoundEngine';

interface PrayersAndDuasModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrayersAndDuasModal: React.FC<PrayersAndDuasModalProps> = ({ isOpen, onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState<
    'all' | 'daily_prayer' | 'match_dua' | 'protection_dua' | 'gratitude_dua'
  >('all');
  const [activePrayer, setActivePrayer] = useState<PrayerItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredPrayers = PRAYERS_AND_DUAS_DB.filter((p) => {
    if (selectedCategory === 'all') return true;
    return p.category === selectedCategory;
  });

  const handleCopyText = (p: PrayerItem) => {
    SoundEngine.playUIClick();
    const textToCopy = `${p.title} (${p.arabicTitle})\n\n${p.arabicText}\n\nTransliteration: ${p.transliteration}\n\nTranslation: ${p.translation}\n\nReference: ${p.reference}`;
    navigator.clipboard.writeText(textToCopy).catch(() => {});
    setCopiedId(p.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handlePlayRecitationTone = () => {
    SoundEngine.playUIClick();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#070A0E]/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto select-none">
      <div className="relative w-full max-w-6xl bg-[#0C121D] border-2 border-emerald-500/40 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Top Header Banner */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-[#064E3B] via-[#0F766E] to-[#064E3B] border-b border-emerald-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-black/40 border border-emerald-400/50 flex items-center justify-center text-emerald-300 shadow-lg">
              <Compass className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="text-[10px] sm:text-xs font-mono font-bold text-emerald-200 tracking-widest flex items-center gap-2">
                <span>ORIGINAL AUTHENTIC ISLAMIC PRAYERS & DUAS</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 text-[9px] font-extrabold">
                  AUTHENTIC IMAGES
                </span>
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-white tracking-wide">
                DAILY PRAYERS, ATHLETE DUAS & PROSTRATION (SUJOOD)
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              SoundEngine.playUIClick();
              onClose();
            }}
            className="w-10 h-10 rounded-xl bg-black/40 hover:bg-black/70 border border-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Close Prayers & Duas Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Spiritual Quranic Ayah Bar */}
        <div className="px-6 py-2.5 bg-[#09101A] border-b border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="text-xs sm:text-sm font-sans font-medium text-emerald-300 tracking-wide font-serif">
            وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ ۖ أُجِيبُ دَعْوَةَ الدَّاعِ إِذَا دَعَانِ
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            "And when My servants ask you concerning Me, indeed I am near. I respond to the invocation of the supplicant when he calls upon Me." · <span className="text-emerald-400 font-bold">Surah Al-Baqarah 2:186</span>
          </div>
        </div>

        {/* Filter Category Tabs */}
        <div className="px-6 py-3 bg-[#0A111E] border-b border-white/5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'All Prayers & Duas (10)', icon: Sparkles },
              { id: 'daily_prayer', label: '5 Daily Prayers (Fajr-Isha)', icon: Sun },
              { id: 'match_dua', label: 'Match Victory & Composure', icon: Zap },
              { id: 'protection_dua', label: 'Protection & Safety', icon: Shield },
              { id: 'gratitude_dua', label: 'Gratitude & Sujood', icon: Heart },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = selectedCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    SoundEngine.playUIClick();
                    setSelectedCategory(tab.id as typeof selectedCategory);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-400/50'
                      : 'bg-[#111A29] text-slate-300 hover:text-white border border-white/10 hover:border-white/20'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="text-[11px] font-mono text-slate-400">
            Showing <strong className="text-emerald-400">{filteredPrayers.length}</strong> Authentic Prayers
          </div>
        </div>

        {/* Prayers Grid */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredPrayers.map((prayer) => {
              const isCopied = copiedId === prayer.id;
              return (
                <div
                  key={prayer.id}
                  className="bg-[#0F1726] border border-emerald-500/30 hover:border-emerald-400/70 rounded-2xl overflow-hidden shadow-xl transition-all duration-300 group flex flex-col justify-between"
                >
                  {/* Top Authentic Realistic Image Representation */}
                  <div className="relative w-full h-52 sm:h-60 overflow-hidden bg-black/60">
                    <img
                      src={prayer.imageUrl}
                      alt={prayer.title}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0F1726] via-transparent to-black/50" />

                    {/* Category & Time Tag */}
                    <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 z-10">
                      <span className="px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-emerald-400/40 text-[10px] font-mono font-bold text-emerald-300 uppercase tracking-wider">
                        {prayer.categoryLabel}
                      </span>
                    </div>

                    {/* Arabic Title Overlay in Top Right */}
                    <div className="absolute top-3 right-3 z-10 px-3 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-white/20 text-white font-serif text-sm sm:text-base font-bold text-right">
                      {prayer.arabicTitle}
                    </div>

                    {/* View Fullscreen Image Inspect Button */}
                    <button
                      type="button"
                      onClick={() => {
                        SoundEngine.playUIClick();
                        setActivePrayer(prayer);
                      }}
                      className="absolute bottom-3 right-3 z-10 px-2.5 py-1 rounded-lg bg-black/80 hover:bg-emerald-600 text-white text-[10px] font-mono font-bold flex items-center gap-1.5 border border-white/20 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-emerald-400" />
                      View Image Details
                    </button>

                    {/* Image Caption & Context */}
                    <div className="absolute bottom-3 left-3 right-32 z-10 text-[11px] text-slate-300 font-mono line-clamp-1 drop-shadow-md">
                      {prayer.imageCaption}
                    </div>
                  </div>

                  {/* Prayer Content & Text */}
                  <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Title & Timing */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <h3 className="font-display text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                            {prayer.title}
                          </h3>
                          <div className="text-xs font-mono text-emerald-400 flex items-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {prayer.timeOrContext}
                          </div>
                        </div>
                      </div>

                      {/* Arabic Sacred Text */}
                      <div className="p-4 rounded-xl bg-[#090F1A] border border-white/10 text-right leading-loose">
                        <div className="text-base sm:text-lg font-serif font-bold text-emerald-100 tracking-wide select-text">
                          {prayer.arabicText}
                        </div>
                      </div>

                      {/* Transliteration */}
                      <div className="mt-3">
                        <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-0.5">
                          Pronunciation (Transliteration):
                        </div>
                        <div className="text-xs text-slate-200 italic font-mono select-text bg-black/20 p-2 rounded-lg border border-white/5">
                          "{prayer.transliteration}"
                        </div>
                      </div>

                      {/* English Meaning / Translation */}
                      <div className="mt-3">
                        <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider mb-0.5">
                          English Translation & Meaning:
                        </div>
                        <div className="text-xs sm:text-sm text-slate-100 select-text leading-relaxed">
                          "{prayer.translation}"
                        </div>
                      </div>

                      {/* Islamic Significance for Athletes & Life */}
                      <div className="mt-3 p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-200 leading-relaxed">
                        <strong className="text-emerald-300 block mb-0.5 font-mono text-[11px] uppercase">
                          Athletic & Spiritual Significance:
                        </strong>
                        {prayer.significance}
                      </div>
                    </div>

                    {/* Bottom Actions: Copy, Reference & Share */}
                    <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                      <div className="text-[10px] font-mono text-slate-400 truncate">
                        📖 {prayer.reference}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyText(prayer)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                            isCopied
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                              : 'bg-white/10 hover:bg-white/20 text-white border-white/15'
                          }`}
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-slate-950" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-emerald-400" />
                              Copy Dua
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer with Islamic Guidelines */}
        <div className="px-6 py-4 bg-[#090F1A] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>
              All prayers and duas are sourced from verified Quranic verses and Sahih Sunnah traditions.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              SoundEngine.playUIClick();
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-xs transition-colors cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            RETURN TO GAME
          </button>
        </div>
      </div>

      {/* Fullscreen Single Prayer Focus Modal */}
      {activePrayer && (
        <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-2xl w-full bg-[#0C121D] border-2 border-emerald-400 rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                  {activePrayer.categoryLabel}
                </span>
                <h3 className="font-display text-2xl font-bold text-white">
                  {activePrayer.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActivePrayer(null)}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative w-full h-64 rounded-2xl overflow-hidden border border-white/20">
              <img
                src={activePrayer.imageUrl}
                alt={activePrayer.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                <span className="text-xs font-mono text-emerald-200">
                  {activePrayer.imageCaption}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#070A0E] border border-emerald-500/30 text-right">
              <div className="text-lg sm:text-xl font-serif font-bold text-emerald-200 leading-loose">
                {activePrayer.arabicText}
              </div>
            </div>

            <div className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
              <strong>Translation:</strong> "{activePrayer.translation}"
            </div>

            <div className="text-xs font-mono text-slate-400">
              Reference: {activePrayer.reference}
            </div>

            <button
              type="button"
              onClick={() => setActivePrayer(null)}
              className="w-full py-3 bg-emerald-500 text-slate-950 font-display font-bold text-sm rounded-xl cursor-pointer hover:bg-emerald-400 transition-colors"
            >
              Close Prayer Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
