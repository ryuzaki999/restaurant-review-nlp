import { describe, it, expect } from 'vitest';
import { analyzeSentiment, extractKeywords } from '../src/nlp.js';

describe('analyzeSentiment', () => {
  it('classifies English positive', () => {
    const r = analyzeSentiment('This food is absolutely amazing and delicious!');
    expect(r.label).toBe('positive');
    expect(r.score).toBeGreaterThan(0);
  });

  it('classifies English negative', () => {
    const r = analyzeSentiment('This was terrible and disgusting.');
    expect(r.label).toBe('negative');
    expect(r.score).toBeLessThan(0);
  });

  it('classifies Thai positive', () => {
    const r = analyzeSentiment('อร่อยมาก บริการดี ประทับใจ');
    expect(r.label).toBe('positive');
  });

  it('classifies Thai negative', () => {
    const r = analyzeSentiment('แย่มาก ไม่อร่อย สกปรก');
    expect(r.label).toBe('negative');
  });

  it('returns neutral for text without sentiment', () => {
    const r = analyzeSentiment('this is a table');
    expect(r.label).toBe('neutral');
  });

  it('handles mixed Thai + English', () => {
    const r = analyzeSentiment('อร่อยมาก and delicious');
    expect(r.label).toBe('positive');
  });
});

describe('extractKeywords', () => {
  it('returns the most frequent non-stopwords', () => {
    const k = extractKeywords('delicious noodles and delicious soup');
    expect(k[0]).toEqual({ word: 'delicious', count: 2 });
  });

  it('ignores stopwords and short words', () => {
    const k = extractKeywords('a very good meal');
    expect(k.find((x) => x.word === 'a' || x.word === 'very')).toBeUndefined();
  });
});
