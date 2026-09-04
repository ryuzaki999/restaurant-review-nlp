# 🍜 Restaurant Review Platform with NLP

A portfolio backend for a **Backend Developer internship** — a REST API that
accepts restaurant reviews and **automatically analyzes sentiment** using
Natural Language Processing (NLP).

> ## 🌐 🔴 Live Demo
>
> **[https://restaurant-review-nlp.onrender.com](https://restaurant-review-nlp.onrender.com)** (live) 👉 Try: [`GET /api/restaurants`](https://restaurant-review-nlp.onrender.com/api/restaurants)
>
> 🔑 Try it: `GET /api/restaurants` · `POST /api/reviews` (auto sentiment)

## Stack

| Layer | Tech |
| ----- | ---- |
| Runtime | Node.js (Express 4) |
| Database | SQLite via the built-in `node:sqlite` module (zero native deps) |
| Validation | `zod` |
| Testing | Vitest + Supertest (22 tests) |
| NLP | `sentiment` (AFINN English lexicon) + custom Thai lexicon |

## How the NLP works

1. English text is scored with the `sentiment` package (AFINN lexicon).
2. Thai text is scored against a small custom lexicon in `src/nlp.js`.
3. The two scores are summed and mapped to `positive` / `neutral` / `negative`.

> This is a **lexicon-based** approach — easy to understand and explain in an
> interview, with no ML model training required.

## Run locally

```bash
npm install
npm run seed     # seed sample restaurants + reviews
npm run dev      # start the API on http://localhost:3000
npm test         # run the test suite (Vitest + Supertest)
```

## Testing

- `npm test` runs **22 automated tests** (Vitest + Supertest):
  - `test/nlp.test.js` — unit tests for Thai + English sentiment and keyword extraction.
  - `test/api.test.js` — end-to-end API tests (list / create / detail, validation, 404s).
- Tests run against an isolated temp SQLite file, so they never touch `data.db`.

## Deploy (Render)

Zero native dependencies (`node:sqlite` is built into Node 22.5+), so it deploys to
a free Render web service in one click via the included `render.yaml`.

## API at a glance

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET`  | `/healthz` | Health check |
| `GET`  | `/api/restaurants` | List restaurants + avg rating + sentiment breakdown |
| `POST` | `/api/restaurants` | Create a restaurant |
| `GET`  | `/api/restaurants/:id` | Restaurant detail + recent reviews |
| `POST` | `/api/reviews` | Create a review (auto sentiment analysis) |
| `GET`  | `/api/reviews/:id` | Get a single review |

### Example: create a review

```bash
curl -X POST http://localhost:3000/api/reviews \
  -H "Content-Type: application/json" \
  -d '{"restaurantId": 1, "rating": 5, "text": "อร่อยมาก บริการดี คุ้มค่ามาก"}'
```

Response:

```json
{
  "data": {
    "id": 11,
    "restaurant_id": 1,
    "rating": 5,
    "text": "อร่อยมาก บริการดี คุ้มค่ามาก",
    "sentiment_score": 7,
    "sentiment_label": "positive",
    "created_at": "2026-09-03 12:00:00",
    "sentiment": { "score": 7, "label": "positive", "positive": ["อร่อยมาก", "บริการดี", "คุ้มค่า"], "negative": [] },
    "keywords": []
  }
}
```

## Project layout

```
src/
  index.js              Express app + entrypoint
  db.js                 SQLite connection + schema + indexes
  nlp.js                Sentiment analysis + keyword extraction
  seed.js               Sample data
  routes/
    restaurants.js      Restaurant endpoints (zod validation)
    reviews.js          Review endpoints (NLP + zod validation)
test/
  nlp.test.js           NLP unit tests
  api.test.js           API integration tests
render.yaml             Render one-click deploy
vitest.config.mjs       Test config
```
