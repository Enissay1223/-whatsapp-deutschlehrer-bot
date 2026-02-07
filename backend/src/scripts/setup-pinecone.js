/**
 * SETUP PINECONE
 * One-time script to initialize Pinecone index
 */

import { initializePineconeIndex } from '../services/pinecone.service.js';
import dotenv from 'dotenv';

dotenv.config();

async function setup() {
  try {
    console.log('🚀 Setting up Pinecone...');

    await initializePineconeIndex();

    console.log('✅ Pinecone setup complete!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Pinecone setup failed:', error);
    process.exit(1);
  }
}

setup();
