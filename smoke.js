'use strict';

// Quick end-to-end smoke test: starts the API on an ephemeral port, exercises
// every endpoint with real HTTP requests (Node 24 has a global `fetch`),
// then exits with a non-zero code if anything failed.
const app = require('./src/index');
const db = require('./src/db');

// Ensure we always test from a known state.
db.exec('DELETE FROM reviews; DELETE FROM restaurants; DELETE FROM sqlite_sequence;');

// Seed one restaurant + a couple of reviews directly so the assertions are
// deterministic regardless of whether `npm run seed` ran before.
db.prepare("INSERT INTO restaurants (name, cuisine, address) VALUES (?, ?, ?)")
  .run('Test Kitchen', 'Thai', 'Test St');
const restId = db.prepare("SELECT id FROM restaurants WHERE name = 'Test Kitchen'").get().id;
const insert = db.prepare(
  'INSERT INTO reviews (restaurant_id, rating, text, sentiment_score, sentiment_label) VALUES (?, ?, ?, ?, ?)'
);
insert.run(restId, 5, 'Absolutely delicious food, I love it!', 5, 'positive');
insert.run(restId, 1, 'ไม่อร่อย รอนานมาก บริการแย่', -7, 'negative');

const server = app.listen(0, async () => {
  const { port } = server.address();
  const base = `http://localhost:${port}`;
  const lines = [];
  let failures = 0;

  async function check(name, actual, expected) {
    const ok = actual === expected;
    lines.push(`${ok ? 'PASS' : 'FAIL'}  ${name}  -> got=${JSON.stringify(actual)}`);
    if (!ok) failures++;
  }

  async function json(url, options) {
    const res = await fetch(url, options);
    return { status: res.status, body: await res.json() };
  }

  try {
    const rootRes = await fetch(`${base}/`);
    const rootText = await rootRes.text();
    check('GET / status', rootRes.status, 200);
    check('GET / content-type html', rootRes.headers.get('content-type').includes('text/html'), true);
    check('GET / lists endpoints', rootText.includes('/api/restaurants'), true);

    const h = await json(`${base}/healthz`);
    check('GET /healthz status', h.body.status, 'ok');

    const list = await json(`${base}/api/restaurants`);
    check('GET /api/restaurants count', list.body.data.length, 1);

    const detail = await json(`${base}/api/restaurants/${restId}`);
    check('GET /api/restaurants/:id reviewCount', detail.body.data.reviewCount, 2);
    check('GET /api/restaurants/:id positive', detail.body.data.sentimentBreakdown.positive, 1);
    check('GET /api/restaurants/:id negative', detail.body.data.sentimentBreakdown.negative, 1);

    const en = await json(`${base}/api/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurantId: restId, rating: 5, text: 'Wonderful food and great service!' }),
    });
    check('POST review (English) status', en.status, 201);
    check('POST review (English) label', en.body.data.sentiment_label, 'positive');

    const th = await json(`${base}/api/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurantId: restId, rating: 1, text: 'แย่มาก ไม่อร่อย รอนานมาก' }),
    });
    check('POST review (Thai) label', th.body.data.sentiment_label, 'negative');

    const bad = await json(`${base}/api/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 5, text: 'missing restaurantId' }),
    });
    check('POST review validation 400', bad.status, 400);

    const notFound = await json(`${base}/api/restaurants/99999`);
    check('GET missing restaurant 404', notFound.status, 404);
  } catch (err) {
    failures++;
    lines.push(`ERROR  ${err.message}`);
  }

  console.log(lines.join('\n'));
  console.log(`\n${failures === 0 ? 'ALL TESTS PASSED ✅' : failures + ' FAILED ❌'}`);
  server.close(() => process.exit(failures === 0 ? 0 : 1));
});
