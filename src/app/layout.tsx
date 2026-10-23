import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Fruity Fusion Bar • Student Loyalty Rewards',
  description:
    'Track your drinks stamps and claim free handcrafted drinks at Fruity Fusion Bar. Quick, mobile-friendly loyalty tracking.',
  keywords: [
    'student loyalty',
    'drinks stall',
    'free drinks',
    'boba',
    'coffee',
    'smoothies',
    'loyalty stamps',
    'fruity fusion bar',
  ],
  authors: [{ name: 'Fruity Fusion Bar' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#FF6B4A',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#FFFDF9] text-zinc-900">
        {children}
      </body>
    </html>
  );
}
