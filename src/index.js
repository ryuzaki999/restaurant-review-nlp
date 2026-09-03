'use strict';

const express = require('express');
const cors = require('cors');
const db = require('./db'); // initializes DB + schema on startup
const restaurantsRouter = require('./routes/restaurants');
const reviewsRouter = require('./routes/reviews');

const app = express();

app.use(cors());
app.use(express.json());

// Simple request logger.
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

app.get('/healthz', (req, res) => {
  const count = db.prepare('SELECT COUNT(*) AS c FROM restaurants').get().c;
  res.json({ status: 'ok', restaurants: count });
});

// Root — a small HTML landing page with clickable links to each endpoint.
app.get('/', (req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Restaurant Review NLP API</title>
  <style>
    :root { color-scheme: light; }
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 760px; margin: 48px auto; padding: 0 16px; color: #1f2937; }
    h1 { border-bottom: 2px solid #e5e7eb; padding-bottom: 12px; }
    .endpoint { display: flex; gap: 12px; align-items: baseline; padding: 12px 0; border-bottom: 1px solid #f3f4f6; }
    .method { font-weight: 700; min-width: 52px; }
    .GET { color: #16a34a; } .POST { color: #2563eb; }
    .path { font-family: ui-monospace, Menlo, Consolas, monospace; font-weight: 600; }
    a { color: #2563eb; text-decoration: none; } a:hover { text-decoration: underline; }
    .desc { color: #6b7280; font-size: 0.85rem; }
  </style>
</head>
<body>
  <h1>🍜 Restaurant Review NLP API</h1>
  <p>Click an endpoint to open it in your browser.</p>
  <div class="endpoint"><span class="method GET">GET</span><a class="path" href="/healthz">/healthz</a><span class="desc">Health check</span></div>
  <div class="endpoint"><span class="method GET">GET</span><a class="path" href="/api/restaurants">/api/restaurants</a><span class="desc">List restaurants + avg rating + sentiment breakdown</span></div>
  <div class="endpoint"><span class="method POST">POST</span><span class="path">/api/restaurants</span><span class="desc">Create a restaurant</span></div>
  <div class="endpoint"><span class="method GET">GET</span><a class="path" href="/api/restaurants/1">/api/restaurants/:id</a><span class="desc">Restaurant detail + recent reviews</span></div>
  <div class="endpoint"><span class="method POST">POST</span><span class="path">/api/reviews</span><span class="desc">Create a review (auto sentiment analysis)</span></div>
  <div class="endpoint"><span class="method GET">GET</span><a class="path" href="/api/reviews/1">/api/reviews/:id</a><span class="desc">Get a single review</span></div>
</body>
</html>`);
});

app.use('/api/restaurants', restaurantsRouter);
app.use('/api/reviews', reviewsRouter);

// 404 handler.
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    hint: 'Try GET / or GET /healthz or GET /api/restaurants',
  });
});

// Error handler.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

// Only start listening when run directly (`node src/index.js`). When required
// (e.g. by a test), export the app instead so the caller can start it.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🍜 Restaurant Review NLP API running at http://localhost:${PORT}`);
    console.log('   GET  /api/restaurants');
    console.log('   GET  /api/restaurants/:id');
    console.log('   POST /api/reviews   (auto sentiment analysis)');
    console.log('   GET  /healthz\n');
  });
}

module.exports = app;
