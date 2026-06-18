#!/usr/bin/env node
/* ============================================================
   build.js — static article-page generator (no dependencies)
   Reads:  assets/articles.json
   Writes: insights/<slug>/index.html   (one SEO page per article)
           sitemap.xml
   Run:    node tools/build.js
   ============================================================ */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'articles.json'), 'utf8'));
const SITE = (data.site && data.site.baseUrl) || 'https://warinporn.example.com';
const AUTHOR = (data.site && data.site.author) || 'Warinporn Kanoksaksopon';
const ROLE = (data.site && data.site.role) || 'Marketing & Business Development Leader';

const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmtDate = iso => { const d = new Date(iso + 'T00:00:00'); return isNaN(d) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); };

const published = (data.articles || []).filter(a => !a.draft)
  .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

const CAT_ICON = {
  'Battery Industry Insight': '<rect x="3" y="7" width="15" height="10" rx="2"/><path d="M18 10h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2"/>',
  'Automotive Aftermarket': '<path d="M5 13l1.5-4.5A2 2 0 0 1 8.4 7h7.2a2 2 0 0 1 1.9 1.5L19 13M5 13h14v4h-2v-1H7v1H5v-4Z"/><circle cx="8" cy="15" r="1"/><circle cx="16" cy="15" r="1"/>',
  'Marketing Strategy': '<path d="M3 11l16-7-4 16-4-6-8-3Z"/>',
  'Dealer Development': '<circle cx="8" cy="9" r="3"/><circle cx="17" cy="10" r="2.2"/><path d="M3 19c0-3 2.5-5 5-5s5 2 5 5M14 19c0-2 1.5-3.5 3-3.5s4 1.5 4 3.5"/>',
  'Business Growth': '<path d="M4 18V6M4 18h16"/><path d="m7 14 3-3 3 2 4-6"/>',
  'Leadership': '<path d="M12 3l2.4 5 5.6.6-4.2 3.8 1.2 5.6L12 16.8 7 18l1.2-5.6L4 8.6 9.6 8 12 3Z"/>'
};
const icon = cat => '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">' + (CAT_ICON[cat] || CAT_ICON['Business Growth']) + '</svg>';
const ARROW = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

function relatedCards(current) {
  return published.filter(a => a.slug !== current.slug).slice(0, 3).map(a => {
    const url = '../' + a.slug + '/';
    const img = a.cover
      ? '<img src="../../' + esc(a.cover) + '" alt="' + esc(a.title) + '" loading="lazy">'
      : '<span class="ig" aria-hidden="true">' + icon(a.category) + '</span>';
    return `<article class="acard">
      <a class="acard-img" href="${url}" aria-label="${esc(a.title)}"><span class="acard-cat">${esc(a.category)}</span>${img}</a>
      <div class="acard-body">
        <div class="acard-meta">${fmtDate(a.date)}<span class="dotsep"></span>${esc(a.readingTime || '')}</div>
        <h3><a href="${url}">${esc(a.title)}</a></h3>
        <p>${esc(a.excerpt)}</p>
        <a class="readmore" href="${url}">Read More ${ARROW}</a>
      </div></article>`;
  }).join('\n');
}

function page(a) {
  const url = `${SITE}/insights/${a.slug}/`;
  const ogImg = a.cover ? `${SITE}/${a.cover}` : `${SITE}/profile.jpg`;
  const cover = a.cover
    ? `<img src="../../${esc(a.cover)}" alt="${esc(a.title)}">`
    : `<span class="ig" aria-hidden="true">${icon(a.category)}</span>`;
  const tags = (a.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('');
  const ld = {
    "@context": "https://schema.org", "@type": "Article",
    "headline": a.title, "description": a.metaDescription || a.excerpt,
    "datePublished": a.date, "dateModified": a.date,
    "articleSection": a.category, "keywords": (a.tags || []).join(', '),
    "author": { "@type": "Person", "name": AUTHOR, "jobTitle": ROLE },
    "publisher": { "@type": "Person", "name": AUTHOR },
    "mainEntityOfPage": { "@type": "WebPage", "@id": url },
    "image": ogImg
  };
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(a.metaTitle || a.title)}</title>
<meta name="description" content="${esc(a.metaDescription || a.excerpt)}" />
<meta name="author" content="${esc(AUTHOR)}" />
<meta name="robots" content="index, follow" />
<link rel="canonical" href="${url}" />
<meta property="og:type" content="article" />
<meta property="og:title" content="${esc(a.title)}" />
<meta property="og:description" content="${esc(a.metaDescription || a.excerpt)}" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${esc(ogImg)}" />
<meta property="article:published_time" content="${a.date}" />
<meta property="article:section" content="${esc(a.category)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(a.title)}" />
<meta name="twitter:description" content="${esc(a.metaDescription || a.excerpt)}" />
<meta name="twitter:image" content="${esc(ogImg)}" />
<script type="application/ld+json">
${JSON.stringify(ld, null, 2)}
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Mulish:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../assets/styles.css">
</head>
<body>
<div id="progress"></div>

<header class="site" id="hdr">
  <nav class="nav">
    <a class="brand" href="../../index.html" aria-label="Warinporn Kanoksaksopon — home">
      <span class="monogram">WK</span>
      <span><span class="brand-name">Warinporn Kanoksaksopon</span><span class="brand-role">Insight Hub</span></span>
    </a>
    <div class="nav-links" id="navLinks">
      <a href="../../index.html#about">About</a>
      <a href="../../index.html#expertise">Expertise</a>
      <a href="../../index.html#industries">Industries</a>
      <a href="../../insights.html" class="active">Insights</a>
      <a href="../../index.html#contact">Contact</a>
    </div>
    <button type="button" class="btn btn-gold btn-resume" data-request-resume>Request Resume</button>
    <button class="nav-toggle" id="navToggle" aria-label="Open menu" aria-expanded="false"><span></span><span></span><span></span></button>
  </nav>
</header>

<article>
  <header class="article-hero">
    <div class="wrap" style="max-width:var(--maxw-read)">
      <div class="breadcrumb"><a href="../../index.html">Home</a> &nbsp;/&nbsp; <a href="../../insights.html">Insights</a> &nbsp;/&nbsp; ${esc(a.category)}</div>
      <div class="article-cat-line">${esc(a.category)}</div>
      <h1 class="article-title">${esc(a.title)}</h1>
      <div class="article-meta"><span class="by">By ${esc(AUTHOR)}</span><span class="dotsep"></span>${fmtDate(a.date)}<span class="dotsep"></span>${esc(a.readingTime || '')}</div>
    </div>
    <div class="wrap"><div class="article-cover">${cover}</div></div>
  </header>

  <div class="prose">
    ${a.body}
  </div>

  <div class="article-foot">
    <div class="signoff">— ${esc(AUTHOR)}</div>
    <div class="article-tags">${tags}</div>
  </div>
</article>

<section class="section section--beige">
  <div class="wrap">
    <span class="eyebrow"><span class="rule"></span>More Insights</span>
    <h2 class="section-title">Continue reading.</h2>
    <div class="more-grid">
${relatedCards(a)}
    </div>
    <div style="margin-top:44px"><a class="btn btn-line" href="../../insights.html">View All Insights ${ARROW}</a></div>
  </div>
</section>

<footer class="site">
  <div class="wrap">
    <div class="foot-top">
      <a class="foot-brand" href="../../index.html"><span class="monogram">WK</span><span class="brand-name">Warinporn Kanoksaksopon</span></a>
      <nav class="foot-nav">
        <a href="../../index.html#about">About</a><a href="../../index.html#industries">Industries</a>
        <a href="../../insights.html">Insights</a><a href="../../index.html#contact">Contact</a>
      </nav>
    </div>
    <div class="foot-bottom">
      <span>© <span id="yr"></span> ${esc(AUTHOR)} · ${esc(ROLE)}</span>
      <span><a href="mailto:peemaii123@gmail.com">peemaii123@gmail.com</a> · Bangkok, Thailand</span>
    </div>
  </div>
</footer>

<script src="../../assets/main.js"></script>
</body>
</html>
`;
}

// ---- write article pages ----
let count = 0;
published.forEach(a => {
  const dir = path.join(ROOT, 'insights', a.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), page(a));
  count++;
});

// ---- sitemap ----
const urls = [`${SITE}/`, `${SITE}/insights.html`]
  .map(u => `  <url><loc>${u}</loc></url>`)
  .concat(published.map(a => `  <url><loc>${SITE}/insights/${a.slug}/</loc><lastmod>${a.date}</lastmod></url>`));
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);

console.log(`Built ${count} article page(s) + sitemap.xml`);
