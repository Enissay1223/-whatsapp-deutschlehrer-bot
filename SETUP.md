# Deutschlehrer Platform - Setup Guide

Complete setup guide for the Deutschlehrer Bot, Webapp, and Admin Dashboard.

---

## 🎯 Overview

This platform consists of three main components:

1. **Backend** - Node.js API (Telegram Bot + REST API)
2. **Webapp** - Next.js frontend for users (Phase 2)
3. **Admin Dashboard** - Next.js admin panel (Phase 4)

**Current Status: Phase 1 Complete ✅**

---

## 📋 Prerequisites

Before you begin, make sure you have:

- **Node.js** 18+ and npm
- **Git** for version control
- **Supabase Account** (free tier)
- **Telegram Bot Token** (from @BotFather)
- **OpenAI API Key** (from platform.openai.com)
- **Pinecone Account** (free tier) - Optional for Phase 2
- **Stripe Account** (for payments) - Optional for Phase 3

---

## 🚀 Quick Start (Phase 1)

### Step 1: Clone and Install

```bash
# Navigate to project
cd deutschlehrer-platform

# Install backend dependencies
cd backend
npm install
```

### Step 2: Setup Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for database to be ready (~2 minutes)
3. Go to **SQL Editor** in your project
4. Open `backend/database-schema.sql` from this repo
5. Copy and paste the entire SQL script
6. Click **Run** to create all tables and functions

### Step 3: Create Telegram Bot

1. Open Telegram and message [@BotFather](https://t.me/BotFather)
2. Send `/newbot`
3. Choose a name: `Deutschlehrer Bot`
4. Choose a username: `deutschlehrer_bot` (must be unique)
5. Copy the bot token (looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### Step 4: Get OpenAI API Key

1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign in or create account
3. Go to **API Keys** section
4. Click **Create new secret key**
5. Copy the key (starts with `sk-proj-...`)

### Step 5: Configure Environment

```bash
# In backend directory
cp .env.example .env
```

Edit `.env` and fill in your credentials:

```env
# Server
NODE_ENV=development
PORT=3000
BACKEND_URL=http://localhost:3000

# Supabase (from your Supabase project settings)
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Telegram
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_WEBHOOK_URL=https://your-backend-url.com/telegram-webhook

# OpenAI
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# JWT (generate a random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Admin
ADMIN_PASSWORD=change-this-secure-password
ADMIN_EMAIL=your-email@example.com

# Rate Limits
FREE_DAILY_MESSAGE_LIMIT=10
PREMIUM_DAILY_MESSAGE_LIMIT=999999
```

### Step 6: Run Development Server

```bash
# Make sure you're in backend directory
npm run dev
```

You should see:

```
============================================================
🇩🇪 DEUTSCHLEHRER BOT - SERVER STARTED
============================================================
Environment: development
Port: 3000
Server URL: http://localhost:3000
============================================================
```

### Step 7: Test Locally with ngrok

To test the Telegram bot on your local machine:

1. Install ngrok:
```bash
# macOS
brew install ngrok

# or download from https://ngrok.com
```

2. Start ngrok:
```bash
ngrok http 3000
```

3. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

4. Set Telegram webhook:
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://abc123.ngrok.io/telegram-webhook"
```

5. Test your bot:
   - Open Telegram
   - Search for your bot username
   - Send `/start`
   - Follow the registration flow!

---

## ✅ Verify Setup

### Check Server

```bash
curl http://localhost:3000/health
```

Should return:
```json
{
  "status": "healthy",
  "checks": {
    "server": "ok",
    "database": "pending",
    "vectorDB": "pending",
    "ai": "pending"
  }
}
```

### Check Telegram Bot

1. Open your bot in Telegram
2. Send `/start`
3. You should see the welcome message with language selection buttons

### Check Database

Go to Supabase → Table Editor and verify these tables exist:
- user_profiles
- lessons
- conversations
- user_progress
- achievements
- payment_transactions
- subscription_events
- system_logs

---

## 🔧 Troubleshooting

### "Module not found" errors

```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

### Bot not responding

1. Check webhook is set:
```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

2. Remove webhook (to reset):
```bash
curl "https://api.telegram.org/bot<TOKEN>/deleteWebhook"
```

3. Set webhook again with ngrok URL

### Database connection errors

1. Check Supabase project is running
2. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`
3. Make sure database schema was run successfully

### OpenAI errors

1. Check API key is valid
2. Verify you have credits: [platform.openai.com/account/billing](https://platform.openai.com/account/billing)

---

## 🚢 Deployment (Production)

### Option 1: Railway (Recommended)

1. Create account at [railway.app](https://railway.app)
2. Click **New Project** → **Deploy from GitHub**
3. Connect your repository
4. Set root directory to `backend`
5. Add all environment variables from `.env`
6. Deploy!
7. Copy the deployment URL
8. Set Telegram webhook to production URL:

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://your-app.railway.app/telegram-webhook"
```

### Option 2: Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. In backend directory: `vercel`
3. Follow prompts
4. Set environment variables
5. Deploy

---

## 📚 Next Steps

### Phase 2: Core Features (Coming Next)

- [ ] Pinecone integration for RAG
- [ ] AI chat functionality
- [ ] Lesson CRUD operations
- [ ] Webapp development

### Phase 3: Monetization

- [ ] Stripe payment integration
- [ ] Premium subscription flow
- [ ] Billing management

### Phase 4: Admin Dashboard

- [ ] User management interface
- [ ] Revenue analytics
- [ ] Lesson content management

---

## 📞 Support

If you encounter issues:

1. Check the logs: `npm run dev` (look for error messages)
2. Review this setup guide
3. Check `backend/README.md` for detailed API documentation

---

## 🎉 Success!

If you can:
- ✅ Start the server without errors
- ✅ Send `/start` to your bot and get a response
- ✅ Complete the registration flow
- ✅ See user data in Supabase

**Congratulations! Phase 1 is complete!** 🎊

You now have a working Telegram bot with:
- Multi-step registration
- User authentication
- Database integration
- Free/Premium tier system
- Command handling

Ready to move to Phase 2? Let's build the AI chat functionality! 🚀
