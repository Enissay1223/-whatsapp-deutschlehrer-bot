/**
 * LESSON ROUTES
 * Admin lesson management API
 */

import express from 'express';
import { requireAdmin } from '../middleware/auth.middleware.js';
import {
  createLesson,
  getLessonById,
  getLessonsByLevel,
  updateLesson,
  deleteLesson
} from '../services/lesson.service.js';
import { supabase } from '../services/supabase.service.js';

const router = express.Router();

// ============================================================================
// PUBLIC ROUTES
// ============================================================================

/**
 * Get all published lessons (for users)
 * GET /api/lessons?level=A1&type=grammar
 */
router.get('/', async (req, res) => {
  try {
    const { level, type } = req.query;

    let query = supabase
      .from('lessons')
      .select('id, title, description, level, category, lesson_type, difficulty_score, is_premium, view_count')
      .eq('is_published', true)
      .order('difficulty_score', { ascending: true });

    if (level) {
      query = query.eq('level', level);
    }

    if (type) {
      query = query.eq('lesson_type', type);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json(data);

  } catch (error) {
    console.error('Get lessons error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ADMIN ROUTES (Protected) — must be before /:id to prevent "admin" matching as UUID
// ============================================================================

/**
 * Get all lessons (including unpublished)
 * GET /api/lessons/admin/all
 */
router.get('/admin/all', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data);

  } catch (error) {
    console.error('Get all lessons error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get single lesson
 * GET /api/lessons/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const lesson = await getLessonById(req.params.id);

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    res.json(lesson);

  } catch (error) {
    console.error('Get lesson error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create new lesson
 * POST /api/lessons
 */
router.post('/', requireAdmin, async (req, res) => {
  try {
    const lessonData = {
      ...req.body,
      created_by: req.admin.id
    };

    const lesson = await createLesson(lessonData);

    res.status(201).json(lesson);

  } catch (error) {
    console.error('Create lesson error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update lesson
 * PATCH /api/lessons/:id
 */
router.patch('/:id', requireAdmin, async (req, res) => {
  try {
    const lesson = await updateLesson(req.params.id, req.body);

    res.json(lesson);

  } catch (error) {
    console.error('Update lesson error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete lesson
 * DELETE /api/lessons/:id
 */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await deleteLesson(req.params.id);

    res.json({ success: true, message: 'Lesson deleted' });

  } catch (error) {
    console.error('Delete lesson error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
