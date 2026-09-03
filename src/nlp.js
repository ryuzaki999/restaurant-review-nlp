'use strict';

const Sentiment = require('sentiment');

// English analyzer (AFINN lexicon bundled with the `sentiment` package).
const analyzer = new Sentiment();

// A small custom Thai lexicon for demo purposes. Each entry maps a Thai
// phrase to a positive/negative polarity value. This is a lexicon-based
// approach — no ML model training required.
const THAI_LEXICON = {
  'อร่อยมาก': 3, 'อร่อย': 2, 'เด็ด': 2, 'ยอดเยี่ยม': 3, 'ประทับใจ': 2,
  'บริการดี': 2, 'คุ้มค่า': 2, 'คุ้ม': 1, 'สะอาด': 1, 'สดใหม่': 1, 'สด': 1,
  'หอม': 1, 'นุ่ม': 1, 'กลมกล่อม': 1, 'รสชาติดี': 2, 'ฟิน': 2, 'ชอบ': 1,
  'ดีมาก': 2, 'ดี': 1, 'บรรยากาศดี': 2, 'เข้มข้น': 1,
  'ไม่อร่อย': -2, 'แย่มาก': -3, 'แย่': -2, 'จืด': -1, 'เค็ม': -1,
  'หวานเกิน': -1, 'เปรี้ยวเกิน': -1, 'แพงเกิน': -2, 'แพง': -1,
  'รอนานมาก': -3, 'รอนาน': -2, 'สกปรก': -2, 'บริการแย่': -2,
  'ผิดหวัง': -2, 'ไม่คุ้ม': -2, 'เหม็น': -2, 'แข็ง': -1, 'ช้า': -1,
};

const ENGLISH_STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be',
  'been', 'this', 'that', 'these', 'those', 'it', 'its', 'i', 'you', 'he',
  'she', 'we', 'they', 'my', 'your', 'his', 'her', 'our', 'their', 'to',
  'of', 'in', 'on', 'at', 'for', 'with', 'about', 'as', 'so', 'very',
  'just', 'really', 'not', 'no', 'have', 'has', 'had', 'do', 'does', 'did',
  'me', 'them', 'us', 'will', 'would', 'can', 'could', 'should',
]);

function analyzeThai(text) {
  let score = 0;
  const found = [];
  for (const [word, value] of Object.entries(THAI_LEXICON)) {
    if (text.includes(word)) {
      score += value;
      found.push(word);
    }
  }
  return { score, words: found };
}

function labelFor(score) {
  if (score > 0) return 'positive';
  if (score < 0) return 'negative';
  return 'neutral';
}

/**
 * Analyze sentiment for a review by combining:
 *   1. English score from the `sentiment` package (AFINN lexicon)
 *   2. Thai score from the custom lexicon above
 * so mixed-language reviews still produce a reasonable result.
 */
function analyzeSentiment(text) {
  const input = String(text || '');
  const en = analyzer.analyze(input);
  const th = analyzeThai(input);

  const score = en.score + th.score;
  const positive = [
    ...en.positive,
    ...th.words.filter((w) => THAI_LEXICON[w] > 0),
  ];
  const negative = [
    ...en.negative,
    ...th.words.filter((w) => THAI_LEXICON[w] < 0),
  ];

  return {
    score,
    comparative: en.comparative,
    label: labelFor(score),
    positive,
    negative,
  };
}

// Naive keyword extraction: tokenize, drop stopwords, count frequency.
function extractKeywords(text, limit = 5) {
  const words = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !ENGLISH_STOPWORDS.has(w));

  const freq = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
}

module.exports = { analyzeSentiment, extractKeywords };
