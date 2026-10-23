'use client';

import { CupSoda, CheckCircle2, Gift, Sparkles } from 'lucide-react';

interface StampCardProps {
  currentStamps: number;
  stampsRequired: number;
  freeDrinksAvailable: number;
}

export default function StampCard({
  currentStamps,
  stampsRequired,
  freeDrinksAvailable,
}: StampCardProps) {
  // Stamps in the current cycle (0 to stampsRequired)
  const effectiveStampsInCycle = currentStamps % stampsRequired;
  // If user has a free drink and remainder is 0, they achieved the full card
  const displayStamps =
    freeDrinksAvailable > 0 && effectiveStampsInCycle === 0
      ? stampsRequired
      : effectiveStampsInCycle;

  const progressPercent = Math.min(
    100,
    Math.round((displayStamps / stampsRequired) * 100)
  );

  return (
    <div className="w-full bg-gradient-to-b from-amber-50/70 to-orange-50/40 rounded-3xl p-5 sm:p-7 border border-orange-200/80 shadow-lg shadow-orange-500/5">
      {/* Card Header */}
      <div className="flex items-center justify-between gap-2 pb-4 border-b border-orange-100">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-orange-600">
            Loyalty Stamp Card
          </span>
          <h4 className="text-base sm:text-lg font-black text-zinc-800">
            Collect {stampsRequired} Stamps → Get 1 Free Drink
          </h4>
        </div>
        <div className="text-right">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-orange-500 text-white shadow-xs">
            {displayStamps} / {stampsRequired} Stamps
          </span>
        </div>
      </div>

      {/* Visual Stamps Slots Grid */}
      <div className="py-6 grid grid-cols-3 sm:grid-cols-5 gap-3 sm:gap-4 items-center justify-center">
        {Array.from({ length: stampsRequired }).map((_, index) => {
          const slotNumber = index + 1;
          const isStamped = slotNumber <= displayStamps;
          const isFinalReward = slotNumber === stampsRequired;

          return (
            <div
              key={slotNumber}
              className={`relative flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-300 ${
                isStamped
                  ? 'bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 text-white shadow-md shadow-orange-500/25 scale-102 ring-2 ring-orange-300/60'
                  : 'bg-white/80 border-2 border-dashed border-orange-200 text-zinc-400 hover:border-orange-300'
              }`}
            >
              {/* Stamp Icon */}
              <div className="w-12 h-12 rounded-full flex items-center justify-center relative">
                {isStamped ? (
                  <>
                    <CupSoda className="w-7 h-7 text-white drop-shadow-xs" />
                    <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-white" />
                    </div>
                  </>
                ) : isFinalReward ? (
                  <Gift className="w-6 h-6 text-orange-400" />
                ) : (
                  <CupSoda className="w-6 h-6 text-zinc-300" />
                )}
              </div>

              {/* Slot Number / Label */}
              <span
                className={`mt-1.5 text-[11px] font-bold ${
                  isStamped
                    ? 'text-white'
                    : isFinalReward
                    ? 'text-orange-500'
                    : 'text-zinc-500'
                }`}
              >
                {isFinalReward ? 'FREE DRINK' : `Stamp #${slotNumber}`}
              </span>

              {/* Status Badge */}
              <span
                className={`text-[9px] uppercase tracking-wider font-extrabold ${
                  isStamped ? 'text-amber-100' : 'text-zinc-400'
                }`}
              >
                {isStamped ? 'Earned' : 'Pending'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress Bar & Subtext */}
      <div className="pt-2">
        <div className="flex items-center justify-between text-xs font-semibold text-zinc-600 mb-1.5">
          <span>Current Cycle Progress</span>
          <span className="text-orange-600 font-bold">{progressPercent}%</span>
        </div>
        <div className="w-full h-3 bg-white rounded-full overflow-hidden p-0.5 border border-orange-200 shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <p className="mt-3 text-xs text-zinc-500 text-center flex items-center justify-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>
            {freeDrinksAvailable > 0
              ? 'Cycle completed! Claim your reward at the counter.'
              : `${stampsRequired - displayStamps} more purchase${
                  stampsRequired - displayStamps === 1 ? '' : 's'
                } needed to earn your next free drink.`}
          </span>
        </p>
      </div>
    </div>
  );
}
