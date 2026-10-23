'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  CupSoda,
  Search,
  Gift,
  RefreshCw,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Clock,
  QrCode,
  History,
  ShieldCheck,
  Copy,
  Check,
  KeyRound,
  Sparkles,
} from 'lucide-react';
import { StudentLoyalty, LoyaltyTransaction } from '@/types';
import StampCard from '@/components/StampCard';
import StallQrModal from '@/components/StallQrModal';

export default function AdminDashboardClient() {
  const router = useRouter();

  // 30-Second Rolling Code State
  const [rollingCode, setRollingCode] = useState<string>('------');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30);
  const [isCodeLoading, setIsCodeLoading] = useState<boolean>(true);
  const [justRotated, setJustRotated] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const codeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Student Search & Redemption State
  const [searchId, setSearchId] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [studentData, setStudentData] = useState<StudentLoyalty | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<
    LoyaltyTransaction[]
  >([]);
  const [showQrModal, setShowQrModal] = useState(false);

  // Status feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [recentStudentIds, setRecentStudentIds] = useState<string[]>([]);
  const [confirmingRedeem, setConfirmingRedeem] = useState(false);

  // Fetch current rolling TOTP code from server
  const fetchRollingCode = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/code');
      if (res.status === 401) {
        router.push('/');
        return;
      }
      const data = await res.json();
      if (data.success && data.data) {
        setRollingCode(data.data.code);
        setSecondsRemaining(data.data.secondsRemaining);
        setIsCodeLoading(false);

        // Flash "Just Rotated" visual indicator
        setJustRotated(true);
        setTimeout(() => setJustRotated(false), 2000);
      }
    } catch (err) {
      console.error('Failed to fetch rolling code:', err);
    }
  }, [router]);

  // Handle local 1-second countdown and automatic 30-second refresh
  useEffect(() => {
    let isMounted = true;

    async function loadInitialCode() {
      try {
        const res = await fetch('/api/admin/code');
        if (res.status === 401) {
          router.push('/');
          return;
        }
        const data = await res.json();
        if (isMounted && data.success && data.data) {
          setRollingCode(data.data.code);
          setSecondsRemaining(data.data.secondsRemaining);
          setIsCodeLoading(false);
          setJustRotated(true);
          setTimeout(() => {
            if (isMounted) setJustRotated(false);
          }, 2000);
        }
      } catch (err) {
        console.error('Failed to fetch rolling code:', err);
      }
    }

    loadInitialCode();

    codeTimerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          // Time expired: fetch new code from server
          fetchRollingCode();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      isMounted = false;
      if (codeTimerRef.current) clearInterval(codeTimerRef.current);
    };
  }, [fetchRollingCode, router]);

  // Fetch recent stall transactions
  const fetchRecentTransactions = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/recent');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setRecentTransactions(data.data);
        }
      }
    } catch (err) {
      console.error('Failed to load recent activity:', err);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function loadRecent() {
      try {
        const res = await fetch('/api/admin/recent');
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.success && data.data) {
            setRecentTransactions(data.data);
          }
        }
      } catch (err) {
        console.error('Failed to load recent activity:', err);
      }
    }
    loadRecent();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCopyCode = async () => {
    if (typeof window !== 'undefined' && rollingCode !== '------') {
      await navigator.clipboard.writeText(rollingCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleSearch = async (idToSearch?: string) => {
    const targetId = (
      idToSearch !== undefined ? idToSearch : searchId
    )
      .trim()
      .toUpperCase();

    if (!targetId) {
      setErrorMessage('Please enter a student ID to search');
      return;
    }

    setIsSearching(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setConfirmingRedeem(false);

    try {
      const res = await fetch(
        `/api/admin/search?id=${encodeURIComponent(targetId)}`
      );
      const data = await res.json();

      if (!res.ok || !data.success) {
        if (res.status === 401) {
          router.push('/');
          return;
        }
        setErrorMessage(data.error || 'Student not found');
        setStudentData(null);
      } else {
        setStudentData(data.data);
        setSearchId(targetId);
        setRecentStudentIds((prev) => {
          const filtered = prev.filter((id) => id !== targetId);
          return [targetId, ...filtered].slice(0, 5);
        });
      }
    } catch (err) {
      console.error('Search error:', err);
      setErrorMessage('Network connection error while searching.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleRedeemReward = async () => {
    if (!studentData) return;

    if (
      studentData.free_drinks_available <= 0 &&
      studentData.current_stamps < studentData.stamps_required
    ) {
      setErrorMessage(
        `Customer only has ${studentData.current_stamps} stamps. ${studentData.stamps_required} stamps are needed to redeem a free drink.`
      );
      setConfirmingRedeem(false);
      return;
    }

    setIsActionLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/admin/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: studentData.student_id }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        if (res.status === 401) {
          router.push('/');
          return;
        }
        setErrorMessage(data.error || 'Failed to redeem reward');
      } else {
        setStudentData(data.data);
        setSuccessMessage(
          data.message ||
            `🎉 Free drink redeemed! Loyalty cycle reset for ${data.data.student_id}.`
        );
        fetchRecentTransactions();
      }
    } catch (err) {
      console.error('Redeem action error:', err);
      setErrorMessage('Network connection error while redeeming reward.');
    } finally {
      setIsActionLoading(false);
      setConfirmingRedeem(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    }
    router.push('/');
    router.refresh();
  };

  const progressPercent = Math.max(0, Math.min(100, (secondsRemaining / 30) * 100));

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col selection:bg-orange-200">
      {/* Admin Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-orange-200/70 bg-white/95 backdrop-blur-md shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-rose-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <CupSoda className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg text-zinc-900">
                  Fruity Fusion Bar Staff Dashboard
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Staff Terminal
                </span>
              </div>
              <p className="text-[11px] text-zinc-500">Live Verification Code & Free Drink Redemption</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQrModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 transition-colors cursor-pointer"
            >
              <QrCode className="w-4 h-4 text-zinc-600" />
              <span className="hidden sm:inline">Stall QR</span>
            </button>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Alerts / Feedback */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3 shadow-xs animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{errorMessage}</div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs text-rose-500 hover:text-rose-700 font-semibold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-start gap-3 shadow-xs animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-semibold">{successMessage}</div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-xs text-emerald-600 hover:text-emerald-800 font-semibold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 1. 30-SECOND ROLLING CODE DISPLAY (PRIMARY TERMINAL WIDGET) */}
        <div className="relative overflow-hidden bg-gradient-to-br from-zinc-900 via-stone-900 to-zinc-950 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-zinc-800 text-center">
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col items-center max-w-lg mx-auto">
            {/* Header Badge */}
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30">
                <KeyRound className="w-3.5 h-3.5" />
                Staff Verification Code
              </span>
              {justRotated && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 animate-pulse">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  New Code Active
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm text-zinc-400 mb-5 max-w-md">
              Show this code to customers making a purchase so they can enter it on their phone to earn a stamp.
            </p>

            {/* The 6-Digit Code Display */}
            <div className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md mb-5 group">
              {isCodeLoading ? (
                <div className="flex items-center gap-3 py-2 text-zinc-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-orange-500" />
                  <span className="font-mono text-xl font-bold tracking-widest">
                    Generating code...
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
                  {rollingCode.split('').map((digit, i) => (
                    <span
                      key={i}
                      className="w-11 h-14 sm:w-14 sm:h-18 rounded-2xl bg-white/10 border-2 border-orange-500/40 flex items-center justify-center font-mono text-3xl sm:text-4xl font-black text-orange-400 shadow-inner group-hover:border-orange-400 transition-colors"
                    >
                      {digit}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Countdown Timer & Progress Bar */}
            <div className="w-full max-w-md space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-zinc-400">
                  <Clock className="w-3.5 h-3.5 text-orange-400" />
                  Code changes in:
                </span>
                <span className="font-mono text-sm font-bold text-orange-400">
                  {secondsRemaining}s remaining
                </span>
              </div>

              {/* Animated Progress Bar */}
              <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/10">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                    secondsRemaining <= 5
                      ? 'bg-rose-500'
                      : 'bg-gradient-to-r from-amber-400 to-orange-500'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Quick Actions for Staff Terminal */}
            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={handleCopyCode}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy Code
                  </>
                )}
              </button>

              <button
                onClick={fetchRollingCode}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh Now
              </button>
            </div>
          </div>
        </div>

        {/* 2. CUSTOMER FREE DRINK REDEMPTION TERMINAL */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-lg shadow-orange-500/5 border border-orange-100 space-y-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-orange-600 block">
              Staff Reward Redemption
            </span>
            <h2 className="text-lg font-extrabold text-zinc-900">
              Redeem Customer Free Drink
            </h2>
            <p className="text-xs text-zinc-500">
              Enter customer student ID to check loyalty status and claim an earned free drink reward.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex flex-col sm:flex-row gap-3 pt-1"
          >
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Enter Student ID (e.g. 8974743)"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value.toUpperCase())}
                disabled={isSearching || isActionLoading}
                className="w-full pl-4 pr-10 py-3.5 text-base font-bold tracking-wider rounded-2xl bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 placeholder:font-normal focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all uppercase"
              />
              {searchId && (
                <button
                  type="button"
                  onClick={() => setSearchId('')}
                  className="absolute right-3 top-3.5 text-zinc-400 hover:text-zinc-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isSearching || isActionLoading || !searchId.trim()}
              className="py-3.5 px-6 rounded-2xl bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-200 text-white font-bold text-sm shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              {isSearching ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Check Status
                </>
              )}
            </button>
          </form>

          {/* Quick Recent Student ID chips */}
          {recentStudentIds.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-medium text-zinc-400">
                Recent:
              </span>
              {recentStudentIds.map((id) => (
                <button
                  key={id}
                  onClick={() => handleSearch(id)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-orange-100 hover:text-orange-700 text-zinc-700 text-xs font-mono font-semibold transition-colors cursor-pointer"
                >
                  {id}
                </button>
              ))}
            </div>
          )}

          {/* Student Status & Redemption Action */}
          {studentData && (
            <div className="mt-4 pt-4 border-t border-zinc-100 space-y-4 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-orange-50/50 border border-orange-200/80">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
                    Student Account
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-2xl font-black font-mono text-zinc-900">
                      {studentData.student_id}
                    </span>
                    {studentData.free_drinks_available > 0 ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-emerald-500 text-white shadow-xs">
                        ★ Free Drink Ready!
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-200 text-zinc-700">
                        {studentData.current_stamps} / {studentData.stamps_required} Stamps
                      </span>
                    )}
                  </div>
                </div>

                {/* Redeem Free Drink Button with Confirmation */}
                <div>
                  {confirmingRedeem ? (
                    <div className="flex items-center gap-2 p-1.5 bg-emerald-50 rounded-2xl border border-emerald-300 shadow-xs animate-in fade-in">
                      <button
                        onClick={handleRedeemReward}
                        disabled={isActionLoading}
                        className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                      >
                        <Gift className="w-4 h-4" />
                        Confirm Redemption
                      </button>
                      <button
                        onClick={() => setConfirmingRedeem(false)}
                        disabled={isActionLoading}
                        className="py-2.5 px-3 rounded-xl bg-zinc-200 hover:bg-zinc-300 text-zinc-700 font-bold text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        if (
                          studentData.free_drinks_available > 0 ||
                          studentData.current_stamps >= studentData.stamps_required
                        ) {
                          setConfirmingRedeem(true);
                        }
                      }}
                      disabled={
                        isActionLoading ||
                        (studentData.free_drinks_available <= 0 &&
                          studentData.current_stamps < studentData.stamps_required)
                      }
                      className={`py-3 px-5 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        studentData.free_drinks_available > 0 ||
                        studentData.current_stamps >= studentData.stamps_required
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25 ring-2 ring-emerald-400/50'
                          : 'bg-zinc-100 text-zinc-400 border border-zinc-200 cursor-not-allowed'
                      }`}
                    >
                      <Gift className="w-5 h-5" />
                      Redeem Free Drink
                    </button>
                  )}
                </div>
              </div>

              {/* Visual Stamp Card for Student */}
              <StampCard
                currentStamps={studentData.current_stamps}
                stampsRequired={studentData.stamps_required}
                freeDrinksAvailable={studentData.free_drinks_available}
              />
            </div>
          )}
        </div>

        {/* 3. RECENT STALL TRANSACTIONS ACTIVITY FEED */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-lg shadow-orange-500/5 border border-orange-100 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-orange-500" />
              <h3 className="text-sm font-bold text-zinc-900">
                Recent Stall Activity
              </h3>
            </div>
            <button
              onClick={fetchRecentTransactions}
              className="text-xs text-zinc-500 hover:text-zinc-800 flex items-center gap-1 cursor-pointer font-medium"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          {recentTransactions.length > 0 ? (
            <div className="divide-y divide-zinc-100">
              {recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="py-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
                        tx.type === 'PURCHASE'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {tx.type === 'PURCHASE' ? '+1' : '★'}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5 font-medium text-zinc-800">
                        <button
                          onClick={() => handleSearch(tx.student_id)}
                          className="font-mono font-bold hover:text-orange-600 hover:underline cursor-pointer"
                        >
                          {tx.student_id}
                        </button>
                        <span className="text-zinc-400">•</span>
                        <span>
                          {tx.type === 'PURCHASE'
                            ? 'Drink Purchase (+1 stamp via staff code)'
                            : 'Free Drink Redeemed at Stall'}
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-400">
                        {new Date(tx.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        - {new Date(tx.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`font-semibold px-2 py-0.5 rounded-md text-[11px] ${
                      tx.type === 'PURCHASE'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {tx.type}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-zinc-400 flex items-center justify-center gap-1.5">
              <Clock className="w-4 h-4" />
              No purchases or redemptions recorded in this session yet.
            </div>
          )}
        </div>
      </main>

      {showQrModal && <StallQrModal onClose={() => setShowQrModal(false)} />}
    </div>
  );
}
