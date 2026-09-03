'use strict';

const express = require('express');
const { z } = require('zod');
const db = require('../db');
const { analyzeSentiment, extractKeywords } = require('../nlp');

const router = express.Router();

const createReviewSchema = z.object({
  restaurantId: z.coerce.number().int().positive(),
  rating: z.coerce.number().int().min(1).max(5),
  text: z.string().trim().min(1).max(2000),
});

// POST /api/reviews — create a review and analyze its sentiment automatically.
router.post('/', (req, res) => {
  const parsed = createReviewSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  const { restaurantId, rating, text } = parsed.data;

  const restaurant = db.prepare('SELECT id FROM restaurants WHERE id = ?').get(restaurantId);
  if (!restaurant) {
    return res.status(404).json({ error: 'Restaurant not found' });
  }

  const sentiment = analyzeSentiment(text);
  const keywords = extractKeywords(text);

  const info = db.prepare(`
    INSERT INTO reviews (restaurant_id, rating, text, sentiment_score, sentiment_label)
    VALUES (?, ?, ?, ?, ?)
  `).run(restaurantId, rating, text, sentiment.score, sentiment.label);

  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(info.lastInsertRowid);

  res.status(201).json({
    data: { ...review, sentiment, keywords },
  });
});

// GET /api/reviews/:id — fetch a single review with its stored sentiment.
router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(id);
  if (!review) {
    return res.status(404).json({ error: 'Review not found' });
  }

  res.json({ data: review });
});

module.exports = router;
