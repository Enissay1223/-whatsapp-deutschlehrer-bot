// Root layout - locale-specific layout is in [locale]/layout.tsx
// This file is required by Next.js but the actual rendering
// happens in the [locale] segment

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
