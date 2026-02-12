# Deutschlehrer Bot — Claude Code Skill

## Projektübersicht

KI-gestützte Deutsch-Lernplattform mit Telegram-Bot, Admin-Dashboard und Stripe-Zahlungen.

**Monorepo-Struktur:**
```
/
├── backend/          # Node.js + Express REST API (Railway)
├── admin-dashboard/  # React + Vite Admin Dashboard (Vercel)
├── shared/           # Geteilte Konstanten und Typen
└── webapp/           # Placeholder (Phase 2)
```

## Tech Stack

| Schicht       | Technologie                          |
|---------------|--------------------------------------|
| Backend       | Node.js 18+, Express.js (ES Modules) |
| Datenbank     | Supabase (PostgreSQL)                |
| Vektordaten   | Pinecone (RAG / semantische Suche)   |
| AI            | OpenAI GPT-4 + text-embedding-3-small|
| Bot           | Telegram (node-telegram-bot-api)     |
| Zahlung       | Stripe (Subscriptions, Webhooks)     |
| Frontend      | React 18 + Vite + Tailwind CSS       |
| Auth          | JWT (Admin), Supabase Auth (User)    |
| Hosting       | Railway (Backend), Vercel (Frontend) |

## Git-Workflow

- **Hauptbranch:** `main` (kein direkter Push)
- **Feature-Branches:** immer `claude/<beschreibung>-<session-id>`
- Push immer mit: `git push -u origin <branch-name>`
- PRs gegen `main` erstellen

## Umgebungsvariablen (`.env`)

Benötigt in `backend/.env` (siehe `backend/.env.example`):
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_URL`
- `OPENAI_API_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`
- `PINECONE_API_KEY`, `PINECONE_INDEX_NAME`
- `JWT_SECRET`
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`

## Backend-Architektur

**Einstiegspunkt:** `backend/src/server.js`

**Routes** (`backend/src/routes/`):
- `admin.routes.js` — Admin-Login, User-Verwaltung, Statistiken
- `lesson.routes.js` — Lesson CRUD (öffentlich + geschützt)
- `payment.routes.js` — Stripe Checkout, Webhooks, Abo-Verwaltung
- `setup.routes.js` — Initialisierungs-Endpoints

**Services** (`backend/src/services/`):
- `supabase.service.js` — DB-Operationen (Users, Lessons, Subscriptions)
- `openai.service.js` — AI-Konversation, mehrsprachige System-Prompts
- `pinecone.service.js` — Vektorsuche / RAG
- `stripe.service.js` — Zahlungsverarbeitung
- `chat.service.js` — Chat-Logik und Lesson-Empfehlungen
- `registration.service.js` — 5-stufiger Registrierungsflow
- `admin.service.js` — Admin-Auth + JWT

**Telegram:** `backend/src/telegram/bot.handler.js` — Webhook-Handler für alle Bot-Commands

## Datenbank-Schema

Wichtige Tabellen:
- `user_profiles` — User-Daten, Subscription-Tier, Gamification (XP, Streak)
- `lessons` — Inhalte mit Level (A1–C2), Typ, Premium-Flag, Pinecone-Ref
- `user_lessons` — Fortschritts-Tracking
- `payment_transactions` — Stripe-Transaktionen
- `subscriptions` — Aktive Abos mit Stripe-Metadaten
- `conversation_history` — Chat-Logs
- `admin_users` — Admin-Accounts (admin / superadmin)
- `lesson_feedback` — User-Feedback

Alle Tabellen: UUID-PKs, Timestamps, Soft-Delete wo nötig.

## Business-Logik

**User-Tiers:**
- **Free:** 10 Nachrichten/Tag, nur A1–A2 Lektionen
- **Premium:** Unbegrenzt, alle Level (A1–C2), €9,99/Monat, 7-Tage-Trial

**Telegram-Bot-Flow:**
1. `/start` → 5-stufige Registrierung (Name, Muttersprache, Niveau, Lernziel, Plan)
2. AI-Tutor mit Fehlerkorrektur (EN/FR/AR Systemsprache je nach User)
3. Stripe-Checkout-Link direkt im Chat
4. Mehrsprachige Antworten (Englisch, Französisch, Arabisch)

**Admin-Dashboard-Flow:**
- Login → JWT (7 Tage) → geschützte Routen
- Dashboard: Live-Stats (Users, Revenue, Lessons)
- User-Management + Lesson-Editor (CRUD)

## Häufige Aufgaben

### Backend starten
```bash
cd backend && npm run dev
```

### Admin-Dashboard starten
```bash
cd admin-dashboard && npm run dev
```

### Pinecone Setup & Lesson-Seeding
```bash
cd backend && npm run setup:pinecone
cd backend && npm run seed:lessons
```

### Stripe-Webhook lokal testen
```bash
stripe listen --forward-to localhost:3000/api/payments/webhook
```

### Neuen Admin erstellen
```
POST /api/admin/setup  { email, password, name }
```

## Bekannte Probleme & Fixes (History)

- **Doppelte Route-Handler:** Wurden entfernt (`admin.routes` und `payment.routes` hatten Konflikte)
- **CORS:** Aktuell alle Origins erlaubt (Debug-Modus) — vor Production einschränken!
- **Vercel SPA-Routing:** `vercel.json` mit `rewrites` auf `index.html` nötig
- **Railway Build:** `backend/package.json` Startscript muss auf `src/server.js` zeigen

## Code-Konventionen

- **ES Modules** (`import`/`export`), kein CommonJS
- **Async/Await** überall, kein Callback-Style
- Services sind zustandslos und werden in Routes importiert
- Fehler werden mit `next(err)` an Express-Fehler-Middleware übergeben
- Alle DB-Zugriffe über `supabase.service.js`, nie direkt
- Umgebungsvariablen immer über `process.env`, nie hardcoded

## Deployment

**Backend (Railway):**
- Auto-deploy von `main` Branch
- Umgebungsvariablen in Railway Dashboard setzen
- Health-Check: `GET /health`

**Frontend (Vercel):**
- Build: `cd admin-dashboard && npm run build`
- Output: `admin-dashboard/dist`
- Framework: Vite
- SPA-Routing via `vercel.json` rewrites
