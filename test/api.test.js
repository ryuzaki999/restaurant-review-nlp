import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';
import db from '../src/db.js';

function seedRestaurant(name = 'Test Kitchen', cuisine = 'Thai', address = 'Test St') {
  const info = db
    .prepare('INSERT INTO restaurants (name, cuisine, address) VALUES (?, ?, ?)')
    .run(name, cuisine, address);
  return Number(info.lastInsertRowid);
}

beforeEach(() => {
  db.exec('DELETE FROM reviews; DELETE FROM restaurants; DELETE FROM sqlite_sequence;');
});

describe('System', () => {
  it('GET / returns the HTML landing page', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('/api/restaurants');
  });

  it('GET /healthz returns ok', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Restaurants API', () => {
  it('lists restaurants with aggregate sentiment stats', async () => {
    const id = seedRestaurant();
    db.prepare(
      'INSERT INTO reviews (restaurant_id, rating, text, sentiment_score, sentiment_label) VALUES (?, ?, ?, ?, ?)'
    ).run(id, 5, 'Delicious!', 2, 'positive');

    const res = await request(app).get('/api/restaurants');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({
      name: 'Test Kitchen',
      reviewCount: 1,
      avgRating: 5,
      sentimentBreakdown: { positive: 1, neutral: 0, negative: 0 },
    });
  });

  it('creates a restaurant', async () => {
    const res = await request(app)
      .post('/api/restaurants')
      .send({ name: 'New Place', cuisine: 'Japanese' });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('New Place');
  });

  it('rejects a restaurant without a name (400)', async () => {
    const res = await request(app).post('/api/restaurants').send({ cuisine: 'Thai' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 404 for a missing restaurant', async () => {
    const res = await request(app).get('/api/restaurants/999999');
    expect(res.status).toBe(404);
  });

  it('returns 400 for an invalid restaurant id', async () => {
    const res = await request(app).get('/api/restaurants/abc');
    expect(res.status).toBe(400);
  });

  it('returns restaurant detail with recent reviews', async () => {
    const id = seedRestaurant();
    db.prepare(
      'INSERT INTO reviews (restaurant_id, rating, text, sentiment_score, sentiment_label) VALUES (?, ?, ?, ?, ?)'
    ).run(id, 2, 'not great', -2, 'negative');

    const res = await request(app).get(`/api/restaurants/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.reviewCount).toBe(1);
    expect(res.body.data.recentReviews).toHaveLength(1);
  });
});

describe('Reviews API (NLP sentiment)', () => {
  it('analyzes an English positive review', async () => {
    const id = seedRestaurant();
    const res = await request(app)
      .post('/api/reviews')
      .send({ restaurantId: id, rating: 5, text: 'Wonderful food and great service!' });
    expect(res.status).toBe(201);
    expect(res.body.data.sentiment.label).toBe('positive');
    expect(res.body.data.sentiment.positive.length).toBeGreaterThan(0);
  });

  it('analyzes a Thai negative review', async () => {
    const id = seedRestaurant();
    const res = await request(app)
      .post('/api/reviews')
      .send({ restaurantId: id, rating: 1, text: 'แย่มาก ไม่อร่อย รอนานมาก' });
    expect(res.status).toBe(201);
    expect(res.body.data.sentiment.label).toBe('negative');
  });

  it('extracts keywords from a review', async () => {
    const id = seedRestaurant();
    const res = await request(app)
      .post('/api/reviews')
      .send({ restaurantId: id, rating: 4, text: 'delicious noodles and delicious soup' });
    expect(res.status).toBe(201);
    expect(res.body.data.keywords).toContainEqual({ word: 'delicious', count: 2 });
  });

  it('rejects invalid review input (400)', async () => {
    const id = seedRestaurant();
    const res = await request(app)
      .post('/api/reviews')
      .send({ restaurantId: id, rating: 9, text: 'x' });
    expect(res.status).toBe(400);
  });

  it('rejects a review for a missing restaurant (404)', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .send({ restaurantId: 999999, rating: 3, text: 'ok' });
    expect(res.status).toBe(404);
  });

  it('fetches a single review by id', async () => {
    const id = seedRestaurant();
    const created = await request(app)
      .post('/api/reviews')
      .send({ restaurantId: id, rating: 5, text: 'Great!' });
    const reviewId = created.body.data.id;

    const res = await request(app).get(`/api/reviews/${reviewId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(reviewId);
  });
});
