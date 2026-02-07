/**
 * DEUTSCHLEHRER BOT - BACKEND SERVER
 * Main Express application
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { processUpdate } from './telegram/bot.handler.js';
import setupRoutes from './routes/setup.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import adminRoutes from './routes/admin.routes.js';
import lessonRoutes from './routes/lesson.routes.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// MIDDLEWARE
// ============================================================================

// CORS - Must come BEFORE helmet and other middleware
// Allowed origins from environment variable or defaults
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    // Allow any Vercel preview URL or configured origins
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.railway.app')
    ) {
      return callback(null, true);
    }
    callback(null, true); // Allow all for now during development
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Handle preflight requests explicitly
app.options('*', cors());

// Security headers - configured to not interfere with CORS
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting (general) - skip OPTIONS preflight requests
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  skip: (req) => req.method === 'OPTIONS'
});

app.use('/api/', generalLimiter);

// Request logging (simple)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// HEALTH CHECK & STATUS
// ============================================================================

app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'Deutschlehrer Bot API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      telegram: '/telegram-webhook',
      api: '/api/*'
    }
  });
});

app.get('/health', async (req, res) => {
  try {
    // TODO: Add Supabase connection check
    // TODO: Add Pinecone connection check
    // TODO: Add OpenAI connection check

    res.json({
      status: 'healthy',
      checks: {
        server: 'ok',
        database: 'pending', // Will implement after Supabase setup
        vectorDB: 'pending',
        ai: 'pending'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================================
// TELEGRAM WEBHOOK
// ============================================================================

// Telegram webhook route
app.post('/telegram-webhook', async (req, res) => {
  try {
    const update = req.body;

    // Process update asynchronously
    processUpdate(update).catch(err => {
      console.error('Error processing Telegram update:', err);
    });

    // Respond immediately to Telegram
    res.sendStatus(200);
  } catch (error) {
    console.error('Telegram webhook error:', error);
    res.sendStatus(500);
  }
});

// ============================================================================
// API ROUTES
// ============================================================================

// Setup routes (temporary - for initial setup only)
app.use('/api/setup', setupRoutes);

// Payment routes (Stripe)
app.use('/api/payments', paymentRoutes);

// Admin routes
app.use('/api/admin', adminRoutes);

// Lesson routes
app.use('/api/lessons', lessonRoutes);

// Chat routes (placeholder)
app.use('/api/chat', (req, res) => {
  res.json({ message: 'Chat routes - coming soon' });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);

  // Don't leak error details in production
  const errorMessage = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(err.status || 500).json({
    error: 'Server Error',
    message: errorMessage,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🇩🇪 DEUTSCHLEHRER BOT - SERVER STARTED');
  console.log('='.repeat(60));
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Port: ${PORT}`);
  console.log(`Server URL: http://localhost:${PORT}`);
  console.log('='.repeat(60));
  console.log('Available endpoints:');
  console.log(`  GET  /              - Server info`);
  console.log(`  GET  /health        - Health check`);
  console.log(`  POST /telegram-webhook - Telegram bot webhook`);
  console.log(`  *    /api/*         - API routes (coming soon)`);
  console.log('='.repeat(60));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

export default app;
