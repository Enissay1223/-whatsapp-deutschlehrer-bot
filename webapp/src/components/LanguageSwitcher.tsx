'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

const localeLabels: Record<string, string> = {
  en: '🇬🇧',
  de: '🇩🇪',
  fr: '🇫🇷',
  ar: '🇸🇦',
};

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value;
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <select
      value={locale}
      onChange={handleChange}
      className="text-sm bg-transparent border border-gray-300 rounded-md px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary-500"
      aria-label="Language"
    >
      {routing.locales.map((loc) => (
        <option key={loc} value={loc}>
          {localeLabels[loc] || loc} {loc.toUpperCase()}
        </option>
      ))}
    </select>
  );
}
