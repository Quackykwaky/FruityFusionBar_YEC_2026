'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Printer, Copy, Check, Sparkles } from 'lucide-react';

interface StallQrModalProps {
  onClose: () => void;
  presetStudentId?: string;
}

export default function StallQrModal({
  onClose,
  presetStudentId,
}: StallQrModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://fruityfusionbar.drinks';
  const fullUrl = presetStudentId
    ? `${origin}/?id=${encodeURIComponent(presetStudentId)}`
    : `${origin}/`;

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(fullUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#1e1b4b',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch((err) => console.error('Failed to generate QR code:', err));

    return () => {
      active = false;
    };
  }, [fullUrl]);

  const handleCopy = async () => {
    if (typeof window !== 'undefined') {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-orange-100 flex flex-col items-center text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-3">
          <Sparkles className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold text-zinc-900">
          Stall Customer QR Code
        </h3>
        <p className="text-xs text-zinc-500 mt-1 max-between max-w-xs">
          Place on the drinks counter so students can scan with their phone and check their loyalty stamps!
        </p>

        {/* QR Code Canvas / Image */}
        <div className="mt-5 p-4 bg-white rounded-2xl shadow-inner border-2 border-dashed border-orange-200">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt="Drinks Stall Loyalty QR Code"
              className="w-56 h-56 rounded-lg object-contain mx-auto"
            />
          ) : (
            <div className="w-56 h-56 flex items-center justify-center text-xs text-zinc-400">
              Generating QR Code...
            </div>
          )}
        </div>

        <p className="mt-3 text-[11px] font-mono text-zinc-500 truncate max-w-[260px]">
          {fullUrl}
        </p>

        {/* Actions */}
        <div className="mt-5 flex gap-2 w-full">
          <button
            onClick={handleCopy}
            className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Link
              </>
            )}
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-orange-600/20 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print Sign
          </button>
        </div>
      </div>
    </div>
  );
}
