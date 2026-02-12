'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function LandingPage() {
  const t = useTranslations();

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-xl font-bold text-primary-600">{t('nav.brand')}</span>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <a href="#features">{t('nav.features')}</a>
            <a href="#pricing">{t('nav.pricing')}</a>
            <a href="#faq">{t('nav.faq')}</a>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link href="/login" className="text-sm text-gray-700 hover:text-primary-600">{t('nav.login')}</Link>
            <Link href="/register" className="text-sm bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">{t('nav.register')}</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-primary-600 via-primary-700 to-purple-700 text-white">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">{t('hero.title')}</h1>
          <p className="text-lg md:text-xl text-primary-100 mb-10 max-w-2xl mx-auto">
            {t('hero.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/register" className="bg-white text-primary-700 font-semibold px-8 py-3 rounded-lg hover:bg-gray-100 text-lg">{t('hero.cta')}</Link>
            <a href="#features" className="border border-white/40 text-white font-semibold px-8 py-3 rounded-lg hover:bg-white/10 text-lg">{t('hero.learnMore')}</a>
          </div>
          {/* Chat Mockup */}
          <div className="max-w-md mx-auto bg-white rounded-2xl shadow-2xl p-6 text-left">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b">
              <span className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-sm">LT</span>
              <span className="font-semibold text-gray-800 text-sm">{t('chatMock.botName')}</span>
            </div>
            <div className="space-y-3 text-sm">
              <div className="bg-gray-100 text-gray-800 rounded-lg rounded-tl-none p-3 max-w-[80%]">{t('chatMock.botMessage')}</div>
              <div className="bg-primary-600 text-white rounded-lg rounded-tr-none p-3 max-w-[80%] ml-auto">{t('chatMock.userMessage')}</div>
              <div className="bg-gray-100 text-gray-800 rounded-lg rounded-tl-none p-3 max-w-[80%]">
                {t('chatMock.correction')} <strong>&quot;gelest&quot;</strong> → <strong>&quot;{t('chatMock.correctedWord')}&quot;</strong><br/>
                <span className="text-gray-500 text-xs">{t('chatMock.explanation')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-4">{t('features.title')}</h2>
          <p className="text-center text-gray-600 mb-12 max-w-xl mx-auto">{t('features.subtitle')}</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: '🤖', key: 'ai' },
              { icon: '🎯', key: 'personalized' },
              { icon: '📊', key: 'progress' },
              { icon: '📚', key: 'levels' },
              { icon: '💬', key: 'platforms' },
              { icon: '✏️', key: 'content' },
            ].map((f) => (
              <div key={f.key} className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition">
                <span className="text-3xl mb-4 block">{f.icon}</span>
                <h3 className="font-semibold text-gray-800 text-lg mb-2">{t(`features.${f.key}.title`)}</h3>
                <p className="text-gray-600 text-sm">{t(`features.${f.key}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">{t('howItWorks.title')}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {['step1', 'step2', 'step3'].map((step, i) => (
              <div key={step} className="text-center">
                <div className="w-14 h-14 bg-primary-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">{i + 1}</div>
                <h3 className="font-semibold text-gray-800 text-lg mb-2">{t(`howItWorks.${step}.title`)}</h3>
                <p className="text-gray-600 text-sm">{t(`howItWorks.${step}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-4">{t('pricing.title')}</h2>
          <p className="text-center text-gray-600 mb-12">{t('pricing.subtitle')}</p>
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Free */}
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-1">{t('pricing.free.name')}</h3>
              <div className="text-4xl font-bold text-gray-800 mb-6">{t('pricing.free.price')} &euro;<span className="text-base font-normal text-gray-500">{t('pricing.free.period')}</span></div>
              <ul className="space-y-3 text-sm text-gray-600 mb-8">
                {['0', '1', '2', '3'].map(i => (
                  <li key={i}>✓ {t(`pricing.free.features.${i}`)}</li>
                ))}
              </ul>
              <Link href="/register" className="block text-center border border-primary-600 text-primary-600 font-semibold py-3 rounded-lg hover:bg-primary-50">{t('pricing.free.cta')}</Link>
            </div>
            {/* Premium */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-primary-600 relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-xs font-semibold px-3 py-1 rounded-full">{t('pricing.premium.popular')}</span>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">{t('pricing.premium.name')}</h3>
              <div className="text-4xl font-bold text-gray-800 mb-6">{t('pricing.premium.price')} &euro;<span className="text-base font-normal text-gray-500">{t('pricing.premium.period')}</span></div>
              <ul className="space-y-3 text-sm text-gray-600 mb-8">
                {['0', '1', '2', '3', '4'].map(i => (
                  <li key={i}>✓ {t(`pricing.premium.features.${i}`)}</li>
                ))}
              </ul>
              <Link href="/register" className="block text-center bg-primary-600 text-white font-semibold py-3 rounded-lg hover:bg-primary-700">{t('pricing.premium.cta')}</Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">{t('faq.title')}</h2>
          <div className="space-y-4">
            {['0', '1', '2', '3'].map(i => (
              <details key={i} className="bg-gray-50 rounded-lg group">
                <summary className="cursor-pointer p-4 font-medium text-gray-800 flex justify-between items-center">
                  {t(`faq.items.${i}.q`)}
                  <span className="text-gray-400 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="px-4 pb-4 text-sm text-gray-600">{t(`faq.items.${i}.a`)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-400 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
          <span>&copy; 2026 {t('nav.brand')}. {t('footer.copyright')}</span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white">{t('footer.imprint')}</a>
            <a href="#" className="hover:text-white">{t('footer.privacy')}</a>
            <a href="#" className="hover:text-white">{t('footer.contact')}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
