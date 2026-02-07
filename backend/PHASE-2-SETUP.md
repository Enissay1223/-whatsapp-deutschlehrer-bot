# Phase 2 Setup: AI Chat + RAG Integration

## Features Implemented ✅

1. **OpenAI Integration** - AI-powered German conversations with error correction
2. **Pinecone Vector Database** - Semantic search for lesson recommendations
3. **Chat Service** - Orchestrates AI responses and lesson suggestions
4. **XP & Streak System** - Rewards daily usage and learning progress
5. **RAG Lesson Retrieval** - Context-aware lesson recommendations

---

## Environment Variables

Add these to your Railway deployment (or `.env` file):

```bash
# Existing variables
TELEGRAM_BOT_TOKEN=your_telegram_token
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
BACKEND_URL=your_railway_url

# NEW for Phase 2
OPENAI_API_KEY=your_openai_api_key
PINECONE_API_KEY=your_pinecone_api_key
```

---

## Setup Steps

### 1. Get OpenAI API Key

1. Go to https://platform.openai.com/
2. Create an account or log in
3. Navigate to **API Keys**
4. Click **Create new secret key**
5. Copy the key and add it to Railway environment variables

### 2. Get Pinecone API Key

1. Go to https://www.pinecone.io/
2. Sign up for a free account
3. Create a new project
4. Go to **API Keys**
5. Copy your API key
6. Add it to Railway environment variables

### 3. Initialize Pinecone Index

Run this script ONCE to create the Pinecone index:

```bash
cd backend
node src/scripts/setup-pinecone.js
```

You should see:
```
🚀 Setting up Pinecone...
📦 Creating Pinecone index: german-lessons
✅ Pinecone index created successfully
✅ Pinecone setup complete!
```

### 4. Seed Sample Lessons

Populate the database with sample German lessons:

```bash
node src/scripts/seed-lessons.js
```

This will create 6 sample lessons (A1-B2) and automatically index them in Pinecone.

You should see:
```
🌱 Seeding sample lessons...
Creating: "Grundlegende Grüße" (A1)
✅ Created and indexed: [uuid]
...
✅ All sample lessons created and indexed in Pinecone!
📊 Summary: 6 lessons created
```

### 5. Deploy to Railway

After adding the environment variables, Railway will automatically redeploy.

---

## How It Works

### 1. User sends German text

```
User: "Ich gehe zur Schule gestern"
```

### 2. Bot processes with AI

- Detects error: "gestern" requires past tense
- Corrects to: "Ich bin gestern zur Schule gegangen"
- Provides explanation

### 3. Bot recommends lessons

- Generates search query: "perfekt tense past actions"
- Searches Pinecone for relevant lessons
- Returns top 2 matches based on user's level

### 4. Bot awards XP

- Base XP: 5 points
- Word count bonus: +5 to +20
- Correction bonus: +10 (learning from mistakes!)
- Updates streak if daily activity

### 5. User response

```
**Correction:** Ich bin gestern zur Schule gegangen.
**Explanation:** When talking about past actions with movement verbs like "gehen",
we use the Perfekt tense with "sein". "Gestern" (yesterday) signals we need past tense.
**Response:** Sehr gut, dass du lernst! Wie war dein Tag in der Schule?

📚 Recommended Lessons:
1. *Perfekt Tense - Past Actions* (A2)
   Learn how to talk about completed actions in the past

Type /lesson to start a lesson!

✨ +25 XP
```

---

## Testing Phase 2

### Test 1: Basic German Message

1. Send `/start` to your bot
2. Complete registration
3. Send a German message: `Hallo! Ich lerne Deutsch.`
4. Bot should respond with AI feedback

### Test 2: Message with Errors

1. Send: `Ich gehe zum Kino gestern`
2. Bot should:
   - Correct the grammar error
   - Explain the correction
   - Recommend a lesson about past tense
   - Award XP

### Test 3: Lesson Recommendations

1. Make several mistakes about the same topic (e.g., articles)
2. Bot should consistently recommend relevant grammar lessons
3. Lessons should match your level (set during registration)

### Test 4: XP and Streaks

1. Check XP: Send `/stats`
2. Should show experience points earned
3. Come back the next day and send another message
4. Streak should increment

---

## Database Tables Updated

### conversation_history
Stores all user messages and AI responses:
- `user_id` - Who sent it
- `message_text` - User's German text
- `ai_response` - Bot's correction + response
- `has_corrections` - Boolean flag
- `created_at` - Timestamp

### lessons
Sample lessons are now populated:
- A1: Greetings, Articles
- A2: Perfekt Tense, Restaurant
- B1: Konjunktiv II
- B2: Idioms (Premium)

### user_lessons
Tracks lesson progress (Phase 3):
- `status`: not_started, in_progress, completed
- `progress_percentage`
- `started_at`, `completed_at`

---

## API Costs (Estimated)

### OpenAI
- Model: `gpt-4o-mini`
- Cost: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- Average message: ~500 tokens total ≈ $0.0004 per message
- **1000 messages ≈ $0.40**

### Pinecone
- Free tier: 1 index, 100k vectors
- Serverless: Pay per request
- **Likely free for testing/small scale**

### Total Monthly Cost
- Low usage (<1000 messages): **< $5/month**
- Medium usage (10k messages): **~$40/month**

---

## Troubleshooting

### "OpenAI API error"
- ✅ Check `OPENAI_API_KEY` is set correctly
- ✅ Ensure your OpenAI account has credits
- ✅ Check Railway logs for exact error

### "Pinecone index not found"
- ✅ Run `setup-pinecone.js` script first
- ✅ Check `PINECONE_API_KEY` is correct
- ✅ Verify index name is `german-lessons`

### "No lessons recommended"
- ✅ Run `seed-lessons.js` to add sample lessons
- ✅ Check lessons are in Supabase
- ✅ Verify Pinecone has vectors (check dashboard)

### "AI response is in wrong language"
- ✅ User's `preferred_language` should be set during registration
- ✅ Check database: `user_profiles.preferred_language`

---

## Next Steps: Phase 3

Phase 3 will add:
- 💳 **Stripe payment integration**
- 🎯 **Interactive lessons** (not just recommendations)
- 📊 **Progress tracking and reports**
- ⭐ **Premium features unlock**

---

## Files Created in Phase 2

```
backend/
├── src/
│   ├── services/
│   │   ├── openai.service.js       # AI chat & error correction
│   │   ├── pinecone.service.js     # Vector database operations
│   │   ├── lesson.service.js       # Lesson CRUD + RAG search
│   │   └── chat.service.js         # Orchestrates AI + lessons
│   └── scripts/
│       ├── setup-pinecone.js       # Initialize Pinecone index
│       └── seed-lessons.js         # Create sample lessons
└── PHASE-2-SETUP.md                # This file
```

---

**Phase 2 is complete!** 🎉

Test it thoroughly before moving to Phase 3.
