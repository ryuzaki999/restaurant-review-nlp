'use strict';

const { DatabaseSync } = require('node:sqlite');
const path = require('path');

// Store the SQLite file at the project root (gitignored). Override with DB_PATH.
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data.db');

const db = new DatabaseSync(DB_PATH);

// Foreign keys are off by default in SQLite — turn them on.
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS restaurants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    cuisine TEXT,
    address TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    text TEXT NOT NULL,
    sentiment_score REAL NOT NULL,
    sentiment_label TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_reviews_restaurant_id ON reviews(restaurant_id);
  CREATE INDEX IF NOT EXISTS idx_reviews_sentiment_label ON reviews(sentiment_label);
`);

module.exports = db;
