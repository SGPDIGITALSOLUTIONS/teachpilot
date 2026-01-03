import type { Metadata } from 'next';
import { Nunito, Comfortaa } from 'next/font/google';
import './globals.css';

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-nunito',
});

const comfortaa = Comfortaa({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-comfortaa',
});

export const metadata: Metadata = {
  title: 'TeachPilot - The Catherine Hudson Bespoke Revision Platform',
  description: 'The Catherine Hudson Bespoke Revision Platform - A comprehensive study management application for tracking revision sessions, exams, and academic progress',
  manifest: '/manifest.json',
  themeColor: '#0EA5E9',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
    shortcut: '/favicon.ico',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TeachPilot',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&family=Comfortaa:wght@400;500;700&display=swap" rel="stylesheet" />
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body className={`${nunito.variable} ${comfortaa.variable}`}>
        {children}
      </body>
    </html>
  );
}

