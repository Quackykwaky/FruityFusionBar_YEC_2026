'use client';

import { useState } from 'react';
import { X, KeyRound, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { StudentLoyalty } from '@/types';

interface VerifyStampModalProps {
  studentId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedData: StudentLoyalty, message: string) => void;
}

export default function VerifyStampModal({
  studentId,
  isOpen,
  onClose,
  onSuccess,
}: VerifyStampModalProps) {
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim();

    if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      setErrorMessage('Please enter the complete 6-digit code from stall staff.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/customer/verify-stamp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, code: cleanCode }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Failed to verify code. Please try again.');
      } else {
        onSuccess(data.data, data.message || 'Stamp earned successfully! 🎉');
        onClose();
      }
    } catch (err) {
      console.error('Verification network error:', err);
      setErrorMessage('Connection error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-orange-100 flex flex-col items-center text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer disabled:opacity-50"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center mb-3 shadow-md shadow-orange-500/20">
          <KeyRound className="w-6 h-6" />
        </div>

        <h3 className="text-xl font-extrabold text-zinc-900">
          Enter Staff Verification Code
        </h3>
        <p className="text-xs text-zinc-500 mt-1 max-w-xs">
          Ask the cashier or barista for the 6-digit code shown on the stall counter terminal.
        </p>

        {/* Verification Form */}
        <form onSubmit={handleSubmit} className="w-full mt-5 space-y-4">
          <div>
            <label
              htmlFor="staff-verification-code"
              className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5"
            >
              6-Digit Staff Code
            </label>
            <input
              id="staff-verification-code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              autoFocus
              placeholder="0 0 0 0 0 0"
              value={code}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setCode(val);
                if (errorMessage) setErrorMessage(null);
              }}
              disabled={isSubmitting}
              className="w-full text-center tracking-[0.4em] font-mono text-2xl font-black py-3.5 px-4 rounded-2xl bg-zinc-50 border-2 border-orange-200 text-zinc-900 placeholder:text-zinc-300 focus:bg-white focus:outline-hidden focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all"
            />
            <p className="mt-1.5 text-[11px] text-zinc-400">
              Codes rotate automatically every 30 seconds for security.
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 text-left animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span className="font-medium leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* Action Buttons: Cancel and Verify */}
          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || code.length !== 6}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-orange-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Verify & Stamp
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
