import type { Metadata } from 'next';
import { AuthProvider } from '@/context/AuthContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'Deutschlehrer - Deutsch lernen online',
  description:
    'Lernen Sie Deutsch online mit personalisierten Lektionen, interaktiven Uebungen und KI-gestuetztem Chat. Von A1 bis C2.',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
