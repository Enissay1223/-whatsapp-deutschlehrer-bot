# 🇩🇪 Deutschlehrer Platform

AI-powered German learning platform with Telegram Bot, Web App, and Admin Dashboard.

## 📋 Project Overview

Complete learning platform for German language learners featuring:

- **Telegram Bot** - Interactive German tutor with personalized feedback
- **Web Application** - Lesson browser, progress tracking, and web chat
- **Admin Dashboard** - User management, analytics, and content creation
- **Payment System** - Free tier + Premium subscription via Stripe
- **AI Integration** - RAG with Pinecone + OpenAI GPT-4

---

## 🏗️ Architecture

```
deutschlehrer-platform/
├── backend/              # Node.js + Express API
│   ├── src/
│   │   ├── telegram/     # Telegram bot handlers
│   │   ├── api/          # REST API routes
│   │   ├── services/     # Business logic
│   │   └── middleware/   # Auth, rate limiting
│   └── database-schema.sql
│
├── webapp/               # Next.js user interface
│   └── (Coming in Phase 2)
│
├── admin-dashboard/      # Next.js admin panel
│   └── (Coming in Phase 4)
│
└── shared/              # Shared types & constants
```

---

## ✨ Features

### User Features
- 🤖 Telegram bot with multi-language support (EN/FR/AR)
- 📚 Structured lessons (A1-C2 levels)
- 💬 AI-powered conversations with personalized corrections
- 🎮 Gamification (XP, levels, streaks, achievements)
- 📊 Progress tracking and analytics
- 📱 Web app for lesson browsing and chat
- 📄 Export progress (PDF/CSV)

### Premium Features
- ⭐ Unlimited messages (Free: 10/day)
- 📖 All lesson levels (Free: A1-A2 only)
- 🎯 Personalized exercises
- 📈 Weekly progress reports
- 💎 Priority support

### Admin Features
- 👥 User management
- 💰 Revenue dashboard
- 📚 Lesson content management (Rich editor)
- 📊 Advanced analytics (retention, conversion, etc.)
- ⚙️ System monitoring
- 📧 User messaging & broadcasts

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Supabase account (free tier)
- Telegram Bot Token
- OpenAI API Key

### Setup

1. **Clone repository**
   ```bash
   git clone <repository-url>
   cd deutschlehrer-platform
   ```

2. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. **Setup database**
   - Go to Supabase SQL Editor
   - Run `backend/database-schema.sql`

5. **Start server**
   ```bash
   npm run dev
   ```

📖 **Detailed setup guide:** See [SETUP.md](SETUP.md)

---

## 📊 Tech Stack

| Component | Technology |
|-----------|-----------|
| **Backend** | Node.js, Express.js |
| **Database** | Supabase (PostgreSQL) |
| **Vector DB** | Pinecone (RAG) |
| **AI** | OpenAI GPT-4, Embeddings |
| **Bot** | node-telegram-bot-api |
| **Payments** | Stripe |
| **Frontend** | Next.js, React, Tailwind CSS |
| **Auth** | Supabase Auth (Email, Google, Telegram) |
| **Hosting** | Railway (Backend), Vercel (Frontend) |

---

## 📈 Development Phases

### ✅ Phase 1: Foundation (COMPLETE)
- [x] Project structure
- [x] Express server with health checks
- [x] Supabase database integration (8 tables)
- [x] Telegram bot with webhook
- [x] Multi-step user registration (5 steps)
- [x] Authentication middleware
- [x] Rate limiting for free tier
- [x] Multi-language support (EN/FR/AR)
- [x] Free/Premium tier system

### 🔄 Phase 2: Core Features (IN PROGRESS)
- [ ] Pinecone RAG integration
- [ ] AI chat service with Smart Router
- [ ] Lesson CRUD operations
- [ ] Webapp setup (Next.js)
- [ ] Chat interface (Telegram + Web)
- [ ] Lesson content management

### 📅 Phase 3: Monetization
- [ ] Stripe payment integration
- [ ] Checkout flows (Telegram + Web)
- [ ] Subscription management
- [ ] Webhook handlers
- [ ] Invoice generation

### 📅 Phase 4: Admin Dashboard
- [ ] Analytics dashboard
- [ ] User management UI
- [ ] Revenue metrics
- [ ] Content management (Lesson builder)
- [ ] System monitoring
- [ ] Broadcast messaging

### 📅 Phase 5: Polish & Launch
- [ ] Testing (Unit, Integration, E2E)
- [ ] Performance optimization
- [ ] SEO & Marketing pages
- [ ] Documentation
- [ ] Beta testing
- [ ] Public launch

---

## 💰 Pricing

| Plan | Price | Features |
|------|-------|----------|
| **Free** | €0 | 10 messages/day, A1-A2 lessons, Community support |
| **Premium** | €9.99/mo | Unlimited messages, All lessons (A1-C2), Personalized exercises, Progress reports, Priority support, 7-day free trial |

---

## 📚 Documentation

- [Setup Guide](SETUP.md) - Complete installation instructions
- [Backend README](backend/README.md) - API documentation
- [Database Schema](backend/database-schema.sql) - Database structure

---

## 🔐 Security

- JWT authentication
- Row Level Security (RLS) in Supabase
- Rate limiting
- Helmet.js security headers
- CORS protection
- Password hashing (bcrypt)
- Secret scanning protection

---

## 📞 Support

For setup issues or questions:
- Check [SETUP.md](SETUP.md)
- Review backend logs
- Contact: [your-email]

---

## 📄 License

Proprietary - All rights reserved

---

**Built with ❤️ for German learners worldwide** 🇩🇪
