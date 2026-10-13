/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Check,
  CreditCard,
  DollarSign,
  Lock,
  LogOut,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { FootballPlayer } from '../data/gameDatabase';

export interface AuthenticatedAccount {
  id: string;
  username: string;
  email?: string;
  provider?: 'google' | 'email' | 'guest';
  coins?: number;
  profilePicture?: string;
  avatarUrl?: string;
  favouriteClubId?: string;
  unlockedPlayerIds?: string[];
  squadIds?: string[];
  formation?: string;
  captainId?: string;
  preferredCelebration?: string;
  tournamentStageIndex?: number;
  matchesPlayed?: number;
  wins?: number;
  goals?: number;
  assists?: number;
  cleanSheets?: number;
  trophies?: number;
  level?: number;
  unlockedAchievementIds?: string[];
  googleId?: string;
  mmrRating?: number;
  [key: string]: any;
}

export interface PaymentCheckoutItem {
  id?: string;
  name?: string;
  type?: 'coins' | 'pass' | 'player' | 'pack';
  priceUsd?: number;
  coinsReward?: number;
  playerReward?: FootballPlayer;
  description?: string;
  itemType?: 'coins' | 'player' | 'pack' | 'pass';
  itemId?: string;
  itemName?: string;
  subtitle?: string;
  amountUsd?: number;
  coinsAdded?: number;
  playerToUnlock?: FootballPlayer;
}

interface GoogleAuthModalProps {
  isOpen: boolean;
  currentUsername: string;
  currentClubId: string;
  unlockedPlayerIds: string[];
  account: AuthenticatedAccount | null;
  onClose: () => void;
  onSuccessAuth: (account: AuthenticatedAccount, token: string) => void;
  onLogout: () => void;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  currentUsername,
  currentClubId,
  unlockedPlayerIds,
  account,
  onClose,
  onSuccessAuth,
  onLogout,
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successNotice, setSuccessNotice] = useState('');

  if (!isOpen) return null;

  const handleSimulatedGoogleSignIn = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const generatedToken = 'tok_fe_google_' + Math.random().toString(36).substring(2, 10);
      const email = emailInput.trim() || `${currentUsername.toLowerCase().replace(/\s+/g, '')}@gmail.com`;
      const authUser: AuthenticatedAccount = {
        id: 'usr_' + Date.now(),
        username: currentUsername || 'FootballChampion',
        email,
        provider: 'google',
        profilePicture: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
        favouriteClubId: currentClubId,
        unlockedPlayerIds: unlockedPlayerIds,
        coins: 1500000,
      };
      setSuccessNotice('Successfully authenticated with Google Cloud Account!');
      setIsProcessing(false);
      setTimeout(() => {
        onSuccessAuth(authUser, generatedToken);
        onClose();
      }, 700);
    }, 600);
  };

  const handleSignOut = () => {
    onLogout();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#0D131B] border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-display font-bold text-white tracking-wide">
            {account ? 'Account Profile & Cloud Sync' : 'Sign In & Save Squad'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {account
              ? 'Your cloud progress, squad, coins, and player cards are synced.'
              : 'Save your squad, player collection, and coin progress to your account.'}
          </p>
        </div>

        {account ? (
          <div className="space-y-4">
            <div className="p-4 bg-[#141C26] border border-white/10 rounded-xl flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden border border-emerald-500/40 bg-slate-800 flex items-center justify-center">
                {account.profilePicture ? (
                  <img src={account.profilePicture} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-slate-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white truncate">{account.username}</div>
                <div className="text-xs text-slate-400 truncate">{account.email || 'Cloud Account'}</div>
                <div className="text-[10px] text-emerald-400 font-mono mt-0.5 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Cloud Synced
                </div>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl font-medium text-xs transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out of Account
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Google or Club Email (Optional)
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-[#141C26] border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <button
              onClick={handleSimulatedGoogleSignIn}
              disabled={isProcessing}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-black font-display font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {isProcessing ? 'Authenticating...' : 'Sign In with Google Account'}
            </button>

            {successNotice && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl text-center">
                {successNotice}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface PaymentCheckoutModalProps {
  item: PaymentCheckoutItem | null;
  username: string;
  authToken: string | null;
  onClose: () => void;
  onPaymentSuccess: (res: { coinsAdded: number; playerUnlocked?: FootballPlayer }) => void;
}

export const PaymentCheckoutModal: React.FC<PaymentCheckoutModalProps> = ({
  item,
  onClose,
  onPaymentSuccess,
}) => {
  const [isPaying, setIsPaying] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!item) return null;

  const itemName = item.name || item.itemName || 'Football Pass';
  const itemPrice = item.priceUsd ?? item.amountUsd ?? 0;
  const coinsReward = item.coinsReward ?? item.coinsAdded ?? 0;
  const playerReward = item.playerReward ?? item.playerToUnlock;

  const handleConfirmPurchase = () => {
    setIsPaying(true);
    setTimeout(() => {
      setIsPaying(false);
      setSuccess(true);
      setTimeout(() => {
        onPaymentSuccess({
          coinsAdded: coinsReward,
          playerUnlocked: playerReward,
        });
        setSuccess(false);
        onClose();
      }, 700);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#0D131B] border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <DollarSign className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-display font-bold text-white tracking-wide">
            Checkout & Upgrade
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Complete simulated instant transaction for {itemName}.
          </p>
        </div>

        <div className="p-4 bg-[#141C26] border border-white/10 rounded-xl mb-4 space-y-2">
          <div className="flex justify-between items-center text-sm font-semibold text-white">
            <span>{itemName}</span>
            <span className="text-emerald-400 font-mono text-base">${itemPrice.toFixed(2)}</span>
          </div>
          {(item.description || item.subtitle) && (
            <p className="text-xs text-slate-400 leading-relaxed">{item.description || item.subtitle}</p>
          )}
          {coinsReward > 0 && (
            <div className="text-xs text-amber-400 font-mono flex items-center gap-1.5 pt-1">
              <Sparkles className="w-3.5 h-3.5" /> +{coinsReward.toLocaleString()} Coins Bonus
            </div>
          )}
        </div>

        <div className="space-y-3">
          <button
            onClick={handleConfirmPurchase}
            disabled={isPaying || success}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-black font-display font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
          >
            {isPaying ? (
              'Processing Transaction...'
            ) : success ? (
              <>
                <Check className="w-4 h-4" /> Purchased Successfully!
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" /> Pay ${itemPrice.toFixed(2)} & Claim
              </>
            )}
          </button>
        </div>

        <div className="mt-4 text-center text-[10px] text-slate-500 flex items-center justify-center gap-1.5">
          <Lock className="w-3 h-3 text-emerald-500" />
          Simulated instant sandbox checkout · Instant delivery
        </div>
      </div>
    </div>
  );
};
