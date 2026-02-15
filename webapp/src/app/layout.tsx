import { Providers } from './providers';
import './globals.css';

export const metadata = {
  title: 'Deutschlehrer Bot',
  description: 'KI-gestützte Sprachlernplattform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
