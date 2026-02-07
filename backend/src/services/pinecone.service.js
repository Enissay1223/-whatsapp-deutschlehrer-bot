/**
 * PINECONE SERVICE
 * Handles vector database operations for lesson RAG (Retrieval Augmented Generation)
 */

import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Pinecone
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY
});

// Initialize OpenAI for embeddings
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Pinecone index name
const INDEX_NAME = 'german-lessons';

// ============================================================================
// EMBEDDING FUNCTIONS
// ============================================================================

/**
 * Generate embedding vector for text using OpenAI
 */
async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float'
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('❌ Error generating embedding:', error);
    throw error;
  }
}

// ============================================================================
// LESSON VECTOR OPERATIONS
// ============================================================================

/**
 * Add a lesson to Pinecone vector database
 */
export async function indexLesson(lesson) {
  try {
    const index = pinecone.index(INDEX_NAME);

    // Create searchable text from lesson
    const searchableText = `${lesson.title} ${lesson.description} ${lesson.content}`;

    // Generate embedding
    const embedding = await generateEmbedding(searchableText);

    // Upsert to Pinecone
    await index.upsert([
      {
        id: lesson.id,
        values: embedding,
        metadata: {
          title: lesson.title,
          description: lesson.description,
          level: lesson.level,
          lesson_type: lesson.lesson_type,
          difficulty_score: lesson.difficulty_score,
          tags: lesson.tags || []
        }
      }
    ]);

    console.log('✅ Lesson indexed in Pinecone:', lesson.id);
    return true;

  } catch (error) {
    console.error('❌ Error indexing lesson:', error);
    throw error;
  }
}

/**
 * Search for relevant lessons based on query
 */
export async function searchLessons(query, userLevel, topK = 3) {
  try {
    const index = pinecone.index(INDEX_NAME);

    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);

    // Search Pinecone
    const results = await index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
      filter: {
        level: { $in: getLevelRange(userLevel) }
      }
    });

    console.log(`🔍 Found ${results.matches.length} lessons for query: "${query}"`);

    return results.matches.map(match => ({
      id: match.id,
      score: match.score,
      ...match.metadata
    }));

  } catch (error) {
    console.error('❌ Error searching lessons:', error);
    throw error;
  }
}

/**
 * Get level range for filtering (e.g., B1 user can see A2, B1, B2)
 */
function getLevelRange(userLevel) {
  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const currentIndex = levels.indexOf(userLevel || 'A1');

  if (currentIndex === -1) return ['A1', 'A2', 'B1'];

  // Return current level and ±1 levels
  const start = Math.max(0, currentIndex - 1);
  const end = Math.min(levels.length, currentIndex + 2);

  return levels.slice(start, end);
}

/**
 * Batch index multiple lessons
 */
export async function indexLessonsBatch(lessons) {
  try {
    const index = pinecone.index(INDEX_NAME);
    const vectors = [];

    for (const lesson of lessons) {
      const searchableText = `${lesson.title} ${lesson.description} ${lesson.content}`;
      const embedding = await generateEmbedding(searchableText);

      vectors.push({
        id: lesson.id,
        values: embedding,
        metadata: {
          title: lesson.title,
          description: lesson.description,
          level: lesson.level,
          lesson_type: lesson.lesson_type,
          difficulty_score: lesson.difficulty_score,
          tags: lesson.tags || []
        }
      });
    }

    // Batch upsert
    await index.upsert(vectors);

    console.log(`✅ Indexed ${lessons.length} lessons in batch`);
    return true;

  } catch (error) {
    console.error('❌ Error batch indexing lessons:', error);
    throw error;
  }
}

/**
 * Delete lesson from vector database
 */
export async function deleteLesson(lessonId) {
  try {
    const index = pinecone.index(INDEX_NAME);
    await index.deleteOne(lessonId);

    console.log('✅ Lesson deleted from Pinecone:', lessonId);
    return true;

  } catch (error) {
    console.error('❌ Error deleting lesson:', error);
    throw error;
  }
}

/**
 * Initialize Pinecone index (run once during setup)
 */
export async function initializePineconeIndex() {
  try {
    // Check if index exists
    const indexes = await pinecone.listIndexes();
    const indexExists = indexes.indexes?.some(idx => idx.name === INDEX_NAME);

    if (!indexExists) {
      console.log('📦 Creating Pinecone index:', INDEX_NAME);

      await pinecone.createIndex({
        name: INDEX_NAME,
        dimension: 1536, // text-embedding-3-small dimension
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1'
          }
        }
      });

      console.log('✅ Pinecone index created successfully');
    } else {
      console.log('✅ Pinecone index already exists');
    }

    return true;

  } catch (error) {
    console.error('❌ Error initializing Pinecone index:', error);
    throw error;
  }
}

export default {
  indexLesson,
  searchLessons,
  indexLessonsBatch,
  deleteLesson,
  initializePineconeIndex
};
