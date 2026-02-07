import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: '3 BODY PAYMENT',
  description: 'Decentralized tri-party settlement protocol with Swiss Brutalist × Art Deco design',
  keywords: ['DeFi', 'payment', 'blockchain', 'USDT', 'settlement'],
  authors: [{ name: '3 Body Protocol' }],
  creator: '3 Body Protocol',
  metadataBase: new URL('https://threebody.protocol'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://threebody.protocol',
    title: '3 BODY PAYMENT',
    description: 'Decentralized tri-party settlement protocol',
    siteName: '3 BODY PAYMENT',
  },
  twitter: {
    card: 'summary_large_image',
    title: '3 BODY PAYMENT',
    description: 'Decentralized tri-party settlement protocol',
    creator: '@threebodyprotocol',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body 
        className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} font-body antialiased bg-black text-white`}
      >
        {children}
      </body>
    </html>
  );
}
