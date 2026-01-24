# Deutschlehrer Bot - Backend

Backend API for the Deutschlehrer Telegram Bot and Webapp.

## 📋 Features

- 🤖 Telegram Bot with multi-step registration
- 💬 AI-powered German learning conversations
- 📚 Lesson management system
- 💳 Stripe payment integration
- 📊 Admin analytics dashboard
- 🔐 Supabase authentication
- 🔍 Pinecone vector search (RAG)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Telegram Bot Token
- OpenAI API Key

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Setup

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and fill in your credentials:

```env
# Get these from your services:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
TELEGRAM_BOT_TOKEN=your-bot-token
OPENAI_API_KEY=your-openai-key
```

### 3. Database Setup

1. Go to your Supabase project
2. Open SQL Editor
3. Copy and paste the contents of `database-schema.sql`
4. Run the SQL script

This will create all necessary tables, indexes, and functions.

### 4. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000`

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── telegram/
│   │   └── bot.handler.js       # Telegram webhook processor
│   ├── api/
│   │   ├── auth/                # Auth routes
│   │   ├── lessons/             # Lesson routes
│   │   ├── chat/                # Chat routes
│   │   ├── payments/            # Payment routes
│   │   └── admin/               # Admin routes
│   ├── services/
│   │   ├── supabase.service.js  # Database operations
│   │   ├── registration.service.js # User registration flow
│   │   ├── rag.service.js       # Pinecone RAG (Phase 2)
│   │   ├── chat.service.js      # AI chat logic (Phase 2)
│   │   └── payment.service.js   # Stripe integration (Phase 3)
│   ├── middleware/
│   │   └── auth.middleware.js   # Authentication & authorization
│   ├── utils/
│   └── server.js                # Express app entry point
├── database-schema.sql          # Supabase schema
├── package.json
└── .env.example
```

---

## 🔧 Configuration

### Telegram Bot Setup

1. Create a bot via [@BotFather](https://t.me/BotFather)
2. Copy the bot token to `.env`
3. Set webhook URL (after deploying):

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=<YOUR_BACKEND_URL>/telegram-webhook"
```

### Supabase Setup

1. Create project at [supabase.com](https://supabase.com)
2. Run `database-schema.sql` in SQL Editor
3. Enable Auth providers (Email, Google OAuth)
4. Copy Project URL and Keys to `.env`

### OpenAI Setup

1. Get API key from [platform.openai.com](https://platform.openai.com)
2. Add to `.env` as `OPENAI_API_KEY`

### Pinecone Setup (Phase 2)

1. Create account at [pinecone.io](https://pinecone.io)
2. Create index: `deutschlehrer-lessons`
3. Dimensions: 1536 (OpenAI embeddings)
4. Add credentials to `.env`

### Stripe Setup (Phase 3)

1. Create account at [stripe.com](https://stripe.com)
2. Create product: "Deutschlehrer Premium"
3. Set price: €9.99/month with 7-day trial
4. Add keys to `.env`

---

## 🌐 API Endpoints

### Public Endpoints

```
GET  /                  - Server info
GET  /health            - Health check
POST /telegram-webhook  - Telegram bot webhook
```

### Auth Endpoints (Coming in Phase 2)

```
POST /api/auth/signup   - User registration (webapp)
POST /api/auth/login    - User login
POST /api/auth/logout   - User logout
GET  /api/auth/me       - Get current user
```

### Lesson Endpoints

```
GET    /api/lessons           - Get all lessons
GET    /api/lessons/:id       - Get lesson by ID
POST   /api/lessons           - Create lesson (Admin)
PUT    /api/lessons/:id       - Update lesson (Admin)
DELETE /api/lessons/:id       - Delete lesson (Admin)
```

### Chat Endpoints

```
POST /api/chat          - Send message to AI
GET  /api/chat/history  - Get conversation history
```

### Payment Endpoints (Phase 3)

```
POST /api/payments/checkout          - Create checkout session
POST /api/payments/webhook           - Stripe webhook
GET  /api/payments/subscription      - Get subscription info
POST /api/payments/cancel            - Cancel subscription
```

### Admin Endpoints

```
GET  /api/admin/dashboard   - Dashboard metrics
GET  /api/admin/users       - Get all users
GET  /api/admin/revenue     - Revenue stats
POST /api/admin/broadcast   - Send message to all users
```

---

## 🧪 Testing

### Manual Testing

1. Start server: `npm run dev`
2. Test health check:
```bash
curl http://localhost:3000/health
```

3. Test Telegram bot:
   - Open your bot in Telegram
   - Send `/start`
   - Follow registration flow

### Testing Webhook Locally

Use ngrok to expose local server:

```bash
ngrok http 3000
```

Then set Telegram webhook to ngrok URL:

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://your-ngrok-url.ngrok.io/telegram-webhook"
```

---

## 🚢 Deployment

### Railway

1. Create account at [railway.app](https://railway.app)
2. Create new project from GitHub
3. Add environment variables
4. Deploy

### Vercel (Serverless)

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Follow prompts

### Environment Variables for Production

Make sure to set all variables from `.env.example` in your hosting platform.

---

## 📊 Database Schema

### Main Tables

- **user_profiles** - User data and subscription info
- **lessons** - German lessons (created by admin)
- **conversations** - Chat history
- **user_progress** - Lesson completion tracking
- **achievements** - User badges and milestones
- **payment_transactions** - Payment history
- **subscription_events** - Subscription changes
- **system_logs** - Error and activity logs

See `database-schema.sql` for full schema.

---

## 🔐 Security

- All passwords are hashed with bcrypt
- JWT tokens for authentication
- Rate limiting enabled
- Helmet.js for security headers
- Row Level Security (RLS) in Supabase
- CORS configured for production domains

---

## 🐛 Troubleshooting

### Bot not responding

1. Check if webhook is set:
```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

2. Check server logs
3. Verify environment variables

### Database connection error

1. Check Supabase URL and keys in `.env`
2. Verify database is running
3. Check if schema is properly set up

### OpenAI errors

1. Verify API key is valid
2. Check account has credits
3. Review rate limits

---

## 📝 Development Phases

### ✅ Phase 1: Foundation (Current)
- [x] Project structure
- [x] Express server
- [x] Supabase integration
- [x] Telegram bot basic
- [x] User registration
- [x] Auth middleware

### 🔄 Phase 2: Core Features (Next)
- [ ] RAG with Pinecone
- [ ] AI chat functionality
- [ ] Lesson CRUD
- [ ] Webapp chat interface

### 📅 Phase 3: Monetization
- [ ] Stripe integration
- [ ] Payment flows
- [ ] Subscription management

### 📅 Phase 4: Admin Dashboard
- [ ] Analytics
- [ ] User management
- [ ] Content management

---

## 🤝 Contributing

This is a private project. For questions or issues, contact the project owner.

---

## 📄 License

Proprietary - All rights reserved

---

## 📞 Support

For issues or questions:
- Check logs: `pm2 logs` or `railway logs`
- Review documentation above
- Contact: your-email@example.com

---

**Built with ❤️ for German learners worldwide** 🇩🇪
