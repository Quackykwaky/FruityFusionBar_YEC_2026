'use client';

import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Gift, Sparkles, PartyPopper } from 'lucide-react';

interface RewardBadgeProps {
  freeDrinksCount: number;
}

export default function RewardBadge({ freeDrinksCount }: RewardBadgeProps) {
  useEffect(() => {
    if (freeDrinksCount > 0) {
      // Fire celebratory confetti burst
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#FF6B4A', '#FBBF24', '#10B981', '#3B82F6', '#EC4899'],
        });
      } catch (err) {
        console.error('Confetti error:', err);
      }
    }
  }, [freeDrinksCount]);

  if (freeDrinksCount <= 0) return null;

  return (
    <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white shadow-xl shadow-emerald-500/25 border-2 border-emerald-300/40 animate-pulse-subtle">
      {/* Decorative Sparkle Highlights */}
      <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/15 rounded-full blur-xl pointer-events-none" />
      <div className="absolute -left-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />

      <div className="relative flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
          <Gift className="w-6 h-6 text-yellow-200 animate-bounce" />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/25 text-white backdrop-blur-xs">
              <Sparkles className="w-3 h-3 text-yellow-300" />
              Reward Unlocked!
            </span>
          </div>

          <h3 className="mt-1 text-lg sm:text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
            {freeDrinksCount === 1
              ? '1 Free Drink Ready to Claim!'
              : `${freeDrinksCount} Free Drinks Ready to Claim!`}
            <PartyPopper className="w-5 h-5 text-yellow-300 shrink-0" />
          </h3>

          <p className="mt-1 text-xs sm:text-sm text-emerald-50 font-medium leading-relaxed">
            Show this screen or tell your Student ID to the cashier at the counter to redeem your free handcrafted drink!
          </p>
        </div>
      </div>
    </div>
  );
}
