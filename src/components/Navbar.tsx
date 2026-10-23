'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CupSoda, ShieldCheck, QrCode } from 'lucide-react';
import StallQrModal from './StallQrModal';

interface NavbarProps {
  isAdmin?: boolean;
  onLogout?: () => void;
}

export default function Navbar({ isAdmin = false, onLogout }: NavbarProps) {
  const [showQrModal, setShowQrModal] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-orange-100 bg-white/90 backdrop-blur-md shadow-xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group transition-transform active:scale-95"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 group-hover:rotate-6 transition-all duration-300">
              <CupSoda className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-orange-600 to-rose-600 bg-clip-text text-transparent">
                  Fruity Fusion
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
                  Bar
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 -mt-0.5 font-medium">
                Student Loyalty
              </p>
            </div>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQrModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 transition-colors cursor-pointer"
              title="Show Stall QR Code"
            >
              <QrCode className="w-3.5 h-3.5 text-zinc-600" />
              <span className="hidden sm:inline">Stall QR</span>
            </button>

            {isAdmin && (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Staff Logged In
                </span>
                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                  >
                    Logout
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {showQrModal && <StallQrModal onClose={() => setShowQrModal(false)} />}
    </>
  );
}
