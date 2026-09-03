'use strict';

const db = require('./db');
const { analyzeSentiment } = require('./nlp');

// Reset tables (safe for a demo).
db.exec('DELETE FROM reviews; DELETE FROM restaurants; DELETE FROM sqlite_sequence;');

const restaurants = [
  { name: 'Baan Somtam', cuisine: 'Isaan / Thai', address: '123 Sukhumvit Rd, Bangkok' },
  { name: 'Ramen Ichiban', cuisine: 'Japanese', address: '456 Silom Rd, Bangkok' },
  { name: 'Pizza Roma', cuisine: 'Italian', address: '789 Sathorn Rd, Bangkok' },
  { name: 'Cafe Verde', cuisine: 'Cafe / Brunch', address: '321 Ari Soi 2, Bangkok' },
];

const insertRestaurant = db.prepare(
  'INSERT INTO restaurants (name, cuisine, address) VALUES (?, ?, ?)'
);
const ids = restaurants.map(
  (r) => insertRestaurant.run(r.name, r.cuisine, r.address).lastInsertRowid
);

const reviews = [
  { id: ids[0], rating: 5, text: 'อร่อยมาก บริการดี ราคาคุ้มค่า กลับมาซ้ำแน่นอน' },
  { id: ids[0], rating: 4, text: 'Somtam is delicious and very fresh. Great value.' },
  { id: ids[0], rating: 2, text: 'รอนานมาก บริการแย่ ทั้งที่ร้านว่าง' },

  { id: ids[1], rating: 5, text: 'The broth is rich and the noodles are perfectly chewy.' },
  { id: ids[1], rating: 4, text: 'ยอดเยี่ยม ซุปเข้มข้น แต่รอนานไปหน่อย' },
  { id: ids[1], rating: 3, text: 'It was okay, a bit salty for my taste.' },

  { id: ids[2], rating: 5, text: 'Authentic wood-fired pizza, fresh ingredients and great service.' },
  { id: ids[2], rating: 2, text: 'แป้งแข็ง แพงเกิน ไม่คุ้มกับราคา' },

  { id: ids[3], rating: 5, text: 'Coffee is aromatic and the cakes are soft and delightful.' },
  { id: ids[3], rating: 4, text: 'หอม นุ่ม บรรยากาศดี แต่ราคาสูงนิดหน่อย' },
];

const insertReview = db.prepare(`
  INSERT INTO reviews (restaurant_id, rating, text, sentiment_score, sentiment_label)
  VALUES (?, ?, ?, ?, ?)
`);

for (const r of reviews) {
  const sentiment = analyzeSentiment(r.text);
  insertReview.run(r.id, r.rating, r.text, sentiment.score, sentiment.label);
  console.log(`  [${sentiment.label.padEnd(8)}] (${String(sentiment.score).padStart(3)}) "${r.text}"`);
}

console.log(`\nSeeded ${restaurants.length} restaurants and ${reviews.length} reviews.`);
