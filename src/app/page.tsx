'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  CupSoda,
  PlusCircle,
  Sparkles,
  Award,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  Shield,
  Coffee,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  LogOut,
  Gift,
  CheckCircle2,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import StampCard from '@/components/StampCard';
import RewardBadge from '@/components/RewardBadge';
import VerifyStampModal from '@/components/VerifyStampModal';
import { StudentLoyalty } from '@/types';

function CustomerLoyaltyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlId = searchParams.get('id') || '';

  // Student State
  const [studentIdInput, setStudentIdInput] = useState(urlId);
  const [activeStudent, setActiveStudent] = useState<StudentLoyalty | null>(null);
  const [isStudentLoading, setIsStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);

  // Discreet Staff Login State
  const [showStaffLogin, setShowStaffLogin] = useState(false);
  const [staffPassword, setStaffPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isStaffLoading, setIsStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);

  // Fetch student loyalty record
  const fetchStudentLoyalty = useCallback(async (idToQuery: string) => {
    const cleaned = idToQuery.trim().toUpperCase();
    if (!cleaned) {
      setStudentError('Please enter your Student ID.');
      return;
    }

    setIsStudentLoading(true);
    setStudentError(null);

    try {
      const res = await fetch(
        `/api/customer/lookup?id=${encodeURIComponent(cleaned)}`
      );
      const data = await res.json();

      if (!res.ok || !data.success) {
        setStudentError(data.error || 'Failed to lookup loyalty progress.');
        setActiveStudent(null);
      } else {
        setActiveStudent(data.data);
      }
    } catch (err) {
      console.error('Lookup network error:', err);
      setStudentError('Connection error. Please check your internet and try again.');
    } finally {
      setIsStudentLoading(false);
    }
  }, []);

  // Pre-fill / auto-login if URL param is provided
  useEffect(() => {
    if (!urlId) return;
    let isMounted = true;

    async function fetchInitial() {
      const cleaned = urlId.trim().toUpperCase();
      if (!cleaned) return;
      try {
        const res = await fetch(
          `/api/customer/lookup?id=${encodeURIComponent(cleaned)}`
        );
        const data = await res.json();
        if (isMounted) {
          if (res.ok && data.success) {
            setActiveStudent(data.data);
          }
        }
      } catch (err) {
        console.error('Initial lookup error:', err);
      }
    }

    fetchInitial();

    return () => {
      isMounted = false;
    };
  }, [urlId]);

  const handleStudentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStudentLoyalty(studentIdInput);
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffPassword) {
      setStaffError('Please enter the staff master password.');
      return;
    }

    setIsStaffLoading(true);
    setStaffError(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: staffPassword }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setStaffError(data.error || 'Incorrect staff password.');
      } else {
        router.push('/admin');
        router.refresh();
      }
    } catch (err) {
      console.error('Staff login error:', err);
      setStaffError('Connection error. Please try again.');
    } finally {
      setIsStaffLoading(false);
    }
  };

  const handleStampSuccess = (updatedData: StudentLoyalty, message: string) => {
    setActiveStudent(updatedData);
    setSuccessBanner(message);
    setTimeout(() => {
      setSuccessBanner(null);
    }, 6000);
  };

  const handleStudentLogout = () => {
    setActiveStudent(null);
    setStudentIdInput('');
    setStudentError(null);
    setSuccessBanner(null);
  };

  return (
    <div className="min-h-screen bg-[#FFFDF9] flex flex-col selection:bg-orange-200">
      <Navbar />

      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-8 sm:py-12 flex flex-col gap-6">
        {/* Banner Alert for Successful Stamp Verification */}
        {successBanner && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-start gap-3 shadow-sm animate-in fade-in duration-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-semibold">{successBanner}</div>
            <button
              onClick={() => setSuccessBanner(null)}
              className="text-xs text-emerald-700 hover:text-emerald-900 font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW A: LOGGED-IN STUDENT LOYALTY DASHBOARD */}
        {/* ------------------------------------------------------------- */}
        {activeStudent ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
            {/* Student Account Bar */}
            <div className="flex items-center justify-between pb-2 border-b border-orange-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Student:
                </span>
                <span className="font-mono text-base sm:text-lg font-black text-zinc-900">
                  {activeStudent.student_id}
                </span>
              </div>

              <button
                onClick={handleStudentLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Switch Account
              </button>
            </div>

            {/* Free Drink Reward Celebration Badge */}
            {activeStudent.free_drinks_available > 0 && (
              <RewardBadge freeDrinksCount={activeStudent.free_drinks_available} />
            )}

            {/* PROMINENT "+1 STAMP" BUTTON */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xl shadow-orange-500/5 border border-orange-100 text-center space-y-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 block">
                  Purchased a Handcrafted Drink?
                </span>
                <h3 className="text-xl font-extrabold text-zinc-900">
                  Claim Your Digital Stamp
                </h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Ask staff for the 6-digit rolling code shown on the counter terminal.
                </p>
              </div>

              {activeStudent.free_drinks_available > 0 ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-center gap-2 font-medium">
                  <Gift className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    🎉 You have a Free Drink ready to claim! Please redeem your reward with staff at the counter before collecting more stamps.
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsVerifyModalOpen(true)}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-black text-base shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer transform active:scale-98"
                >
                  <PlusCircle className="w-6 h-6" />
                  +1 Stamp (Enter Staff Code)
                </button>
              )}
            </div>

            {/* Visual Stamp Card */}
            <StampCard
              currentStamps={activeStudent.current_stamps}
              stampsRequired={activeStudent.stamps_required}
              freeDrinksAvailable={activeStudent.free_drinks_available}
            />

            {/* Student Stats Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl p-4 border border-orange-100 shadow-xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <Coffee className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-zinc-500 block uppercase tracking-wide">
                    Lifetime Purchases
                  </span>
                  <span className="text-xl font-black text-zinc-900">
                    {activeStudent.lifetime_purchases}
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-orange-100 shadow-xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-zinc-500 block uppercase tracking-wide">
                    Free Drinks Ready
                  </span>
                  <span className="text-xl font-black text-emerald-600">
                    {activeStudent.free_drinks_available}
                  </span>
                </div>
              </div>
            </div>

            {/* Refresh Stamps Button */}
            <div className="flex justify-center">
              <button
                onClick={() => fetchStudentLoyalty(activeStudent.student_id)}
                disabled={isStudentLoading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 bg-white border border-zinc-200 hover:bg-zinc-50 transition-colors shadow-2xs cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isStudentLoading ? 'animate-spin' : ''}`}
                />
                Refresh stamps
              </button>
            </div>
          </div>
        ) : (
          /* ----------------------------------------------------------- */
          /* VIEW B: CLEAN STUDENT LOGIN & DISCREET STAFF ACCESS         */
          /* ----------------------------------------------------------- */
          <div className="space-y-6">
            {/* Hero Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100/80 text-orange-700 text-xs font-semibold shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin-slow" />
                <span>Campus Loyalty Program</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900">
                Welcome to{' '}
                <span className="bg-gradient-to-r from-orange-600 via-amber-500 to-rose-600 bg-clip-text text-transparent">
                  Fruity Fusion Bar!
                </span>
              </h1>

              <p className="text-sm text-zinc-600 max-w-md mx-auto">
                Sign in with your university Student ID to track your drink stamps, earn rewards, and claim free drinks.
              </p>
            </div>

            {/* Main Student Login Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xl shadow-orange-500/5 border border-orange-100">
              <form onSubmit={handleStudentLogin} className="space-y-4">
                <div>
                  <label
                    htmlFor="student-id-login-input"
                    className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5"
                  >
                    Enter Student ID
                  </label>
                  <div className="relative">
                    <input
                      id="student-id-login-input"
                      type="text"
                      inputMode="numeric"
                      placeholder="e.g. 8974743"
                      value={studentIdInput}
                      onChange={(e) => setStudentIdInput(e.target.value.toUpperCase())}
                      disabled={isStudentLoading}
                      className="w-full pl-4 pr-12 py-3.5 text-base sm:text-lg font-bold tracking-wider rounded-2xl bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 placeholder:font-normal focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all uppercase"
                    />
                    <button
                      type="submit"
                      disabled={isStudentLoading || !studentIdInput.trim()}
                      className="absolute right-2 top-2 bottom-2 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-200 disabled:text-zinc-400 text-white font-bold text-xs flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed shadow-xs"
                    >
                      {isStudentLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <ArrowRight className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] text-zinc-500 flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
                    Enter the number on your student card (e.g. 8974743).
                  </p>
                </div>

                {studentError && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="font-medium">{studentError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isStudentLoading || !studentIdInput.trim()}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 disabled:opacity-50 text-white font-extrabold text-sm shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {isStudentLoading ? 'Signing in...' : 'Sign In to My Loyalty'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* ------------------------------------------------------- */}
              {/* DISCREET "STAFF ACCESS" OPTION                          */}
              {/* ------------------------------------------------------- */}
              <div className="mt-6 pt-5 border-t border-zinc-100">
                {!showStaffLogin ? (
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setShowStaffLogin(true)}
                      className="text-xs text-zinc-400 hover:text-zinc-600 font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Lock className="w-3 h-3" />
                      Staff access
                    </button>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-700">
                        <Shield className="w-3.5 h-3.5 text-orange-600" />
                        Staff Terminal Sign In
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowStaffLogin(false);
                          setStaffError(null);
                        }}
                        className="text-[11px] text-zinc-400 hover:text-zinc-600 font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    <form onSubmit={handleStaffLogin} className="space-y-3">
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter staff password"
                          value={staffPassword}
                          onChange={(e) => setStaffPassword(e.target.value)}
                          disabled={isStaffLoading}
                          className="w-full pl-3 pr-10 py-2.5 text-xs rounded-xl bg-white border border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600"
                        >
                          {showPassword ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {staffError && (
                        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-medium flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{staffError}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isStaffLoading || !staffPassword}
                        className="w-full py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {isStaffLoading ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Shield className="w-3.5 h-3.5 text-orange-400" />
                            Open Staff Dashboard
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>

            {/* How It Works Explainer */}
            <div className="bg-gradient-to-b from-white to-orange-50/30 rounded-3xl p-6 text-center border border-dashed border-orange-200 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto shadow-inner">
                <CupSoda className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-base font-bold text-zinc-800">
                  How Fruity Fusion Bar Loyalty Works
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  No app download or physical card required!
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-2">
                <div className="bg-white/90 p-3.5 rounded-2xl border border-orange-100 shadow-2xs">
                  <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center mb-1.5">
                    1
                  </span>
                  <p className="text-xs font-bold text-zinc-800">Order a Drink</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Buy an eligible drink at the stall counter.
                  </p>
                </div>

                <div className="bg-white/90 p-3.5 rounded-2xl border border-orange-100 shadow-2xs">
                  <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center mb-1.5">
                    2
                  </span>
                  <p className="text-xs font-bold text-zinc-800">Enter Staff Code</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Click &quot;+1 Stamp&quot; and enter the 6-digit rolling code.
                  </p>
                </div>

                <div className="bg-white/90 p-3.5 rounded-2xl border border-orange-100 shadow-2xs">
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center mb-1.5">
                    3
                  </span>
                  <p className="text-xs font-bold text-zinc-800">Free Drink!</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Reach the stamp goal and claim your reward!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Verify Stamp Modal */}
      {activeStudent && (
        <VerifyStampModal
          studentId={activeStudent.student_id}
          isOpen={isVerifyModalOpen}
          onClose={() => setIsVerifyModalOpen(false)}
          onSuccess={handleStampSuccess}
        />
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-orange-100 bg-white/60 py-6 text-center text-xs text-zinc-400">
        <p>© {new Date().getFullYear()} Fruity Fusion Bar • Fast, Fresh & Delicious</p>
      </footer>
    </div>
  );
}

export default function CustomerHomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FFFDF9] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
            <p className="text-xs text-zinc-500 font-semibold">
              Loading Fruity Fusion Bar...
            </p>
          </div>
        </div>
      }
    >
      <CustomerLoyaltyContent />
    </Suspense>
  );
}
