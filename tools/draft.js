#!/usr/bin/env node
/* ============================================================
   draft.js — append ONE draft article to assets/articles.json
   - With secret ANTHROPIC_API_KEY: writes an AI-generated draft.
   - Without it: writes a structured stub from a rotating topic.
   The result is ALWAYS draft:true so nothing publishes until you
   review it, edit, set draft:false, and merge. (No deps; Node 20+)
   ============================================================ */
const fs = require('fs');
const path = require('path');

const FILE = path.resolve(__dirname, '..', 'assets', 'articles.json');
const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));

// Rotating prompt bank — battery + marketing/BD leaning
const TOPICS = [
  { t: 'How Start-Stop Adoption Is Reshaping Battery Demand', c: 'Battery Industry Insight' },
  { t: 'Reading the Aftermarket: Signals That Predict Battery Sales', c: 'Automotive Aftermarket' },
  { t: 'Building a Dealer Onboarding Programme That Scales', c: 'Dealer Development' },
  { t: 'Pricing for Margin in a Discount-Driven Market', c: 'Business Growth' },
  { t: 'Positioning a Battery Brand Beyond Price', c: 'Marketing Strategy' },
  { t: 'What Great Commercial Leaders Do in Their First 90 Days', c: 'Leadership' },
  { t: 'AGM Demand Forecasting for Distributors', c: 'Battery Industry Insight' },
  { t: 'Turning Counter Staff Into Trusted Advisors', c: 'Dealer Development' }
];

const slugify = s => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const today = new Date().toISOString().slice(0, 10);

function pickTopic() {
  const existing = new Set((data.articles || []).map(a => a.slug));
  for (let i = 0; i < TOPICS.length; i++) {
    const idx = (new Date().getDate() + i) % TOPICS.length;
    const cand = TOPICS[idx];
    if (!existing.has(slugify(cand.t))) return cand;
  }
  return TOPICS[0];
}

function stub(topic) {
  return {
    slug: slugify(topic.t),
    title: topic.t,
    metaTitle: topic.t + ' | Warinporn Kanoksaksopon',
    metaDescription: 'Draft — add a 150–160 character SEO description here.',
    category: topic.c,
    date: today,
    readingTime: '5 min read',
    cover: '',
    tags: [topic.c],
    draft: true,
    excerpt: 'Draft excerpt — one or two sentences that sell the article on a card.',
    body: '<p>Draft body. Replace with the full article using &lt;p&gt;, &lt;h2&gt;, &lt;h3&gt;, &lt;ul&gt;&lt;li&gt;, and &lt;blockquote&gt; tags.</p><h2>Key point</h2><p>...</p>'
  };
}

async function ai(topic) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const prompt = `You are Warinporn Kanoksaksopon, a Marketing & Business Development leader in the automotive battery and industrial sectors. Write a professional, strategic, executive thought-leadership article (350-550 words). Topic: "${topic.t}". Category: "${topic.c}".
Return ONLY valid JSON, no markdown fences, with keys:
metaDescription (150-160 chars), excerpt (1-2 sentences), readingTime (e.g. "5 min read"), tags (array of 3-4 strings), body (HTML using only <p>, <h2>, <h3>, <ul><li>, <blockquote>, <strong>).`;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1600, messages: [{ role: 'user', content: prompt }] })
    });
    const j = await r.json();
    const text = (j.content || []).map(b => b.text || '').join('').replace(/```json|```/g, '').trim();
    const out = JSON.parse(text);
    return {
      slug: slugify(topic.t), title: topic.t, metaTitle: topic.t + ' | Warinporn Kanoksaksopon',
      metaDescription: out.metaDescription, category: topic.c, date: today,
      readingTime: out.readingTime || '5 min read', cover: '', tags: out.tags || [topic.c],
      draft: true, excerpt: out.excerpt, body: out.body
    };
  } catch (e) {
    console.log('AI generation failed, using stub:', e.message);
    return null;
  }
}

(async () => {
  const topic = pickTopic();
  const article = (await ai(topic)) || stub(topic);
  data.articles.unshift(article);
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n');
  console.log('Added draft:', article.slug);
})();
