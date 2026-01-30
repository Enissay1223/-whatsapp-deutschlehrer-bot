/**
 * SETUP ROUTES
 * Temporary endpoints to run setup scripts via HTTP
 * ⚠️ REMOVE THESE IN PRODUCTION!
 */

import express from 'express';
import { initializePineconeIndex } from '../services/pinecone.service.js';
import { createLesson } from '../services/lesson.service.js';

const router = express.Router();

// Sample lessons data
const SAMPLE_LESSONS = [
  {
    title: 'Grundlegende Grüße',
    description: 'Learn basic German greetings for everyday conversations',
    content: `# Grundlegende Grüße\n\n## Vocabulary\n- **Guten Morgen** - Good morning\n- **Guten Tag** - Good day\n- **Guten Abend** - Good evening\n- **Hallo** - Hello (informal)\n- **Tschüss** - Bye (informal)\n- **Auf Wiedersehen** - Goodbye (formal)`,
    level: 'A1',
    category: 'vocabulary',
    lesson_type: 'vocabulary',
    difficulty_score: 1,
    tags: ['greetings', 'beginner', 'conversation'],
    is_premium: false
  },
  {
    title: 'Der, Die, Das - German Articles',
    description: 'Master the three German articles and their usage',
    content: `# German Articles: Der, Die, Das\n\n## The Three Genders\nGerman nouns have three genders:\n- **Masculine (der)** - der Mann, der Tisch\n- **Feminine (die)** - die Frau, die Tür\n- **Neuter (das)** - das Kind, das Buch`,
    level: 'A1',
    category: 'grammar',
    lesson_type: 'grammar',
    difficulty_score: 2,
    tags: ['articles', 'grammar', 'gender'],
    is_premium: false
  },
  {
    title: 'Perfekt Tense - Past Actions',
    description: 'Learn how to talk about completed actions in the past',
    content: `# Perfekt Tense (Present Perfect)\n\n## Formation\n**haben/sein + past participle**\n\n- Ich **habe** gegessen (I have eaten)\n- Er **ist** gegangen (He has gone)`,
    level: 'A2',
    category: 'grammar',
    lesson_type: 'grammar',
    difficulty_score: 4,
    tags: ['perfekt', 'past-tense', 'verbs'],
    is_premium: false
  },
  {
    title: 'Im Restaurant - Ordering Food',
    description: 'Essential phrases for dining out in Germany',
    content: `# Im Restaurant\n\n## Useful Phrases\n- Ich hätte gerne... (I would like...)\n- Die Rechnung, bitte. (The bill, please)\n- Das stimmt so. (Keep the change)`,
    level: 'A2',
    category: 'conversation',
    lesson_type: 'conversation',
    difficulty_score: 3,
    tags: ['restaurant', 'food', 'conversation'],
    is_premium: false
  },
  {
    title: 'Konjunktiv II - Hypothetical Situations',
    description: 'Express wishes, hypothetical situations, and polite requests',
    content: `# Konjunktiv II (Subjunctive II)\n\n## Uses\n1. **Wishes**: Ich wünschte, ich wäre reich.\n2. **Hypothetical**: Wenn ich Zeit hätte, würde ich reisen.\n3. **Polite requests**: Könnten Sie mir helfen?`,
    level: 'B1',
    category: 'grammar',
    lesson_type: 'grammar',
    difficulty_score: 6,
    tags: ['konjunktiv', 'subjunctive', 'advanced-grammar'],
    is_premium: true
  },
  {
    title: 'Idioms and Expressions',
    description: 'Common German idioms that make you sound like a native',
    content: `# German Idioms and Expressions\n\n## Animal Idioms\n**Schwein haben** - to be lucky\n**die Katze aus dem Sack lassen** - reveal a secret\n\n## Body Idioms\n**Daumen drücken** - keep fingers crossed`,
    level: 'B2',
    category: 'vocabulary',
    lesson_type: 'vocabulary',
    difficulty_score: 7,
    tags: ['idioms', 'expressions', 'advanced'],
    is_premium: true
  }
];

/**
 * Setup Pinecone index
 * GET /api/setup/pinecone
 */
router.get('/pinecone', async (req, res) => {
  try {
    console.log('🚀 Setting up Pinecone via HTTP endpoint...');

    await initializePineconeIndex();

    res.json({
      success: true,
      message: '✅ Pinecone index created successfully!',
      indexName: 'german-lessons'
    });

  } catch (error) {
    console.error('❌ Pinecone setup failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Seed sample lessons
 * GET /api/setup/lessons
 */
router.get('/lessons', async (req, res) => {
  try {
    console.log('🌱 Seeding sample lessons via HTTP endpoint...');

    const createdLessons = [];

    for (const lessonData of SAMPLE_LESSONS) {
      console.log(`Creating: "${lessonData.title}" (${lessonData.level})`);
      const lesson = await createLesson(lessonData);
      createdLessons.push(lesson);
      console.log(`✅ Created: ${lesson.id}`);
    }

    res.json({
      success: true,
      message: `✅ ${SAMPLE_LESSONS.length} lessons created and indexed!`,
      lessons: createdLessons.map(l => ({ id: l.id, title: l.title, level: l.level }))
    });

  } catch (error) {
    console.error('❌ Lesson seeding failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Check setup status
 * GET /api/setup/status
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    message: 'Setup endpoints are available',
    endpoints: {
      pinecone: '/api/setup/pinecone',
      lessons: '/api/setup/lessons'
    },
    instructions: [
      '1. Call /api/setup/pinecone to create the Pinecone index',
      '2. Call /api/setup/lessons to create sample lessons',
      '3. Delete these routes in production for security!'
    ]
  });
});

export default router;
