'use strict';

const express = require('express');
const { z } = require('zod');
const db = require('../db');

const router = express.Router();

// Aggregate query used by both list and detail endpoints.
const BASE_SELECT = `
  SELECT
    r.id, r.name, r.cuisine, r.address, r.created_at,
    COUNT(rv.id) AS review_count,
    COALESCE(ROUND(AVG(rv.rating), 2), 0) AS avg_rating,
    COALESCE(SUM(CASE WHEN rv.sentiment_label = 'positive' THEN 1 ELSE 0 END), 0) AS positive,
    COALESCE(SUM(CASE WHEN rv.sentiment_label = 'neutral'  THEN 1 ELSE 0 END), 0) AS neutral,
    COALESCE(SUM(CASE WHEN rv.sentiment_label = 'negative' THEN 1 ELSE 0 END), 0) AS negative
  FROM restaurants r
  LEFT JOIN reviews rv ON rv.restaurant_id = r.id
`;

function toRestaurant(row) {
  return {
    id: row.id,
    name: row.name,
    cuisine: row.cuisine,
    address: row.address,
    createdAt: row.created_at,
    reviewCount: row.review_count,
    avgRating: row.avg_rating,
    sentimentBreakdown: {
      positive: row.positive,
      neutral: row.neutral,
      negative: row.negative,
    },
  };
}

// GET /api/restaurants — list all restaurants with aggregate stats.
router.get('/', (req, res) => {
  const rows = db.prepare(`${BASE_SELECT} GROUP BY r.id ORDER BY r.id`).all();
  res.json({ data: rows.map(toRestaurant) });
});

const createRestaurantSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(200),
  cuisine: z.string().trim().max(100).optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
});

// POST /api/restaurants — create a restaurant.
router.post('/', (req, res) => {
  const parsed = createRestaurantSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  const { name, cuisine, address } = parsed.data;

  const info = db.prepare('INSERT INTO restaurants (name, cuisine, address) VALUES (?, ?, ?)')
    .run(name, cuisine || null, address || null);

  const restaurant = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ data: restaurant });
});

// GET /api/restaurants/:id — detail + aggregate stats + recent reviews.
router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  const row = db.prepare(`${BASE_SELECT} WHERE r.id = ? GROUP BY r.id`).get(id);
  if (!row) {
    return res.status(404).json({ error: 'Restaurant not found' });
  }

  const reviews = db.prepare(`
    SELECT id, rating, text, sentiment_score, sentiment_label, created_at
    FROM reviews WHERE restaurant_id = ? ORDER BY id DESC LIMIT 20
  `).all(id);

  res.json({ data: { ...toRestaurant(row), recentReviews: reviews } });
});

module.exports = router;
