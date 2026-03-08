import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Realtime Collaborative Spreadsheet',
  description:
    'A lightweight real-time collaborative spreadsheet with formula support, multi-user presence, and instant synchronization.',
  keywords: ['spreadsheet', 'collaborative', 'realtime', 'google sheets', 'formula'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#09090b" />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
