'use client';

import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-xl font-bold text-primary-600">Deutschlehrer</span>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <a href="#features">Features</a>
            <a href="#preise">Preise</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-700 hover:text-primary-600">Anmelden</Link>
            <Link href="/register" className="text-sm bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">Kostenlos starten</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-primary-600 via-primary-700 to-purple-700 text-white">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">Lerne Deutsch — mit KI als dein persoenlicher Lehrer</h1>
          <p className="text-lg md:text-xl text-primary-100 mb-10 max-w-2xl mx-auto">
            Personalisierte Lektionen, intelligente Korrekturen und Fortschritts-Tracking. Von A1 bis C2.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/register" className="bg-white text-primary-700 font-semibold px-8 py-3 rounded-lg hover:bg-gray-100 text-lg">Kostenlos starten</Link>
            <a href="#features" className="border border-white/40 text-white font-semibold px-8 py-3 rounded-lg hover:bg-white/10 text-lg">Mehr erfahren</a>
          </div>
          {/* Chat Mockup */}
          <div className="max-w-md mx-auto bg-white rounded-2xl shadow-2xl p-6 text-left">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b"><span className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-sm">DL</span><span className="font-semibold text-gray-800 text-sm">Deutschlehrer Bot</span></div>
            <div className="space-y-3 text-sm">
              <div className="bg-gray-100 text-gray-800 rounded-lg rounded-tl-none p-3 max-w-[80%]">Hallo! Schreib mir etwas auf Deutsch 😊</div>
              <div className="bg-primary-600 text-white rounded-lg rounded-tr-none p-3 max-w-[80%] ml-auto">Ich habe gestern ein Buch gelest</div>
              <div className="bg-gray-100 text-gray-800 rounded-lg rounded-tl-none p-3 max-w-[80%]">
                Fast richtig! ✨ <strong>&quot;gelest&quot;</strong> → <strong>&quot;gelesen&quot;</strong><br/>
                <span className="text-gray-500 text-xs">Das Partizip II von &quot;lesen&quot; ist unregelmaessig.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-4">Warum Deutschlehrer?</h2>
          <p className="text-center text-gray-600 mb-12 max-w-xl mx-auto">Alles, was du brauchst, um Deutsch effektiv zu lernen.</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: '🤖', title: 'KI-gestuetztes Lernen', desc: 'Intelligente Korrekturen und Erklaerungen — wie ein echter Lehrer.' },
              { icon: '🎯', title: 'Personalisierte Lektionen', desc: 'Angepasst an dein Level und deine Lernziele.' },
              { icon: '📊', title: 'Fortschritts-Tracking', desc: 'XP, Streaks, Level — verfolge deinen Fortschritt.' },
              { icon: '📚', title: 'A1 bis C2', desc: 'Vom Anfaenger bis zum Experten — alle Niveaus abgedeckt.' },
              { icon: '💬', title: 'Telegram & Web', desc: 'Lerne ueberall — im Browser oder per Telegram.' },
              { icon: '✏️', title: 'Grammatik & Vokabeln', desc: 'Umfassende Inhalte zu allen Aspekten der deutschen Sprache.' },
            ].map((f) => (
              <div key={f.title} className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition">
                <span className="text-3xl mb-4 block">{f.icon}</span>
                <h3 className="font-semibold text-gray-800 text-lg mb-2">{f.title}</h3>
                <p className="text-gray-600 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">So funktioniert es</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Registrieren', desc: 'Erstelle ein kostenloses Konto in weniger als einer Minute.' },
              { step: '2', title: 'Level waehlen', desc: 'Waehle dein Deutsch-Level von A1 bis C2.' },
              { step: '3', title: 'Loslegen', desc: 'Chatte, mache Lektionen und verbessere dein Deutsch.' },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-14 h-14 bg-primary-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">{s.step}</div>
                <h3 className="font-semibold text-gray-800 text-lg mb-2">{s.title}</h3>
                <p className="text-gray-600 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="preise" className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-4">Preise</h2>
          <p className="text-center text-gray-600 mb-12">Starte kostenlos. Upgrade wenn du bereit bist.</p>
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Free */}
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-1">Free</h3>
              <div className="text-4xl font-bold text-gray-800 mb-6">0 &euro;<span className="text-base font-normal text-gray-500">/Monat</span></div>
              <ul className="space-y-3 text-sm text-gray-600 mb-8">
                <li>✓ 10 Nachrichten pro Tag</li>
                <li>✓ A1–A2 Lektionen</li>
                <li>✓ Grundlegende Korrekturen</li>
                <li>✓ Community Support</li>
              </ul>
              <Link href="/register" className="block text-center border border-primary-600 text-primary-600 font-semibold py-3 rounded-lg hover:bg-primary-50">Kostenlos starten</Link>
            </div>
            {/* Premium */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-primary-600 relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-xs font-semibold px-3 py-1 rounded-full">Beliebt</span>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">Premium</h3>
              <div className="text-4xl font-bold text-gray-800 mb-6">9,99 &euro;<span className="text-base font-normal text-gray-500">/Monat</span></div>
              <ul className="space-y-3 text-sm text-gray-600 mb-8">
                <li>✓ Unbegrenzte Nachrichten</li>
                <li>✓ Alle Lektionen (A1–C2)</li>
                <li>✓ Personalisierte Uebungen</li>
                <li>✓ Woechentliche Reports</li>
                <li>✓ Prioritaets-Support</li>
              </ul>
              <Link href="/register" className="block text-center bg-primary-600 text-white font-semibold py-3 rounded-lg hover:bg-primary-700">7 Tage kostenlos testen</Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">Haeufige Fragen</h2>
          <div className="space-y-4">
            {[
              { q: 'Was kostet Deutschlehrer?', a: 'Du kannst Deutschlehrer kostenlos nutzen mit 10 Nachrichten pro Tag. Fuer unbegrenzten Zugang und alle Features kostet Premium 9,99 EUR pro Monat.' },
              { q: 'Fuer welche Sprachniveaus ist das geeignet?', a: 'Fuer alle! Von A1 (kompletter Anfaenger) bis C2 (nahezu muttersprachlich). Die KI passt sich an dein Level an.' },
              { q: 'Kann ich das Abo kuendigen?', a: 'Ja, jederzeit. Du behaehlst den Zugang bis zum Ende der bezahlten Periode.' },
              { q: 'Wie funktioniert die kostenlose Testphase?', a: 'Du bekommst 7 Tage vollen Premium-Zugang kostenlos. Wenn du nicht kuendigst, wird automatisch 9,99 EUR/Monat berechnet.' },
            ].map((item) => (
              <details key={item.q} className="bg-gray-50 rounded-lg group">
                <summary className="cursor-pointer p-4 font-medium text-gray-800 flex justify-between items-center">
                  {item.q}
                  <span className="text-gray-400 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="px-4 pb-4 text-sm text-gray-600">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-400 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
          <span>&copy; 2026 Deutschlehrer. Alle Rechte vorbehalten.</span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white">Impressum</a>
            <a href="#" className="hover:text-white">Datenschutz</a>
            <a href="#" className="hover:text-white">Kontakt</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
