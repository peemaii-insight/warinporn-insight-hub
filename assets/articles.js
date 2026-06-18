/* ============================================================
   Article system (client-side rendering for listings)
   Source of truth: assets/articles.json
   Used by: index.html (#latest-insights) and insights.html (#hub)
   Individual article pages are pre-built static HTML in /insights/<slug>/
   ============================================================ */
(function () {
  var DATA_URL = 'assets/articles.json';     // relative to root pages
  var ARTICLE_BASE = 'insights/';            // each article lives at insights/<slug>/

  var CAT_ICON = {
    'Battery Industry Insight': '<rect x="3" y="7" width="15" height="10" rx="2"/><path d="M18 10h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2"/>',
    'Automotive Aftermarket': '<path d="M5 13l1.5-4.5A2 2 0 0 1 8.4 7h7.2a2 2 0 0 1 1.9 1.5L19 13M5 13h14v4h-2v-1H7v1H5v-4Z"/><circle cx="8" cy="15" r="1"/><circle cx="16" cy="15" r="1"/>',
    'Marketing Strategy': '<path d="M3 11l16-7-4 16-4-6-8-3Z"/>',
    'Dealer Development': '<circle cx="8" cy="9" r="3"/><circle cx="17" cy="10" r="2.2"/><path d="M3 19c0-3 2.5-5 5-5s5 2 5 5M14 19c0-2 1.5-3.5 3-3.5s4 1.5 4 3.5"/>',
    'Business Growth': '<path d="M4 18V6M4 18h16"/><path d="m7 14 3-3 3 2 4-6"/>',
    'Leadership': '<path d="M12 3l2.4 5 5.6.6-4.2 3.8 1.2 5.6L12 16.8 7 18l1.2-5.6L4 8.6 9.6 8 12 3Z"/>'
  };
  function icon(cat) {
    var p = CAT_ICON[cat] || CAT_ICON['Business Growth'];
    return '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">' + p + '</svg>';
  }
  var ARROW = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  function fmtDate(iso) {
    var d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function imgBlock(a) {
    if (a.cover) return '<img src="' + esc(a.cover) + '" alt="' + esc(a.title) + '" loading="lazy">';
    return '<span class="ig" aria-hidden="true">' + icon(a.category) + '</span>';
  }

  function card(a) {
    var url = ARTICLE_BASE + a.slug + '/';
    return '' +
      '<article class="acard reveal">' +
        '<a class="acard-img" href="' + url + '" aria-label="' + esc(a.title) + '">' +
          '<span class="acard-cat">' + esc(a.category) + '</span>' + imgBlock(a) +
        '</a>' +
        '<div class="acard-body">' +
          '<div class="acard-meta">' + fmtDate(a.date) + '<span class="dotsep"></span>' + esc(a.readingTime || '') + '</div>' +
          '<h3><a href="' + url + '">' + esc(a.title) + '</a></h3>' +
          '<p>' + esc(a.excerpt) + '</p>' +
          '<a class="readmore" href="' + url + '">Read More ' + ARROW + '</a>' +
        '</div>' +
      '</article>';
  }

  function published(list) {
    return list.filter(function (a) { return !a.draft; })
      .sort(function (x, y) { return (y.date || '').localeCompare(x.date || ''); });
  }

  function load() {
    return fetch(DATA_URL, { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('articles.json ' + r.status); return r.json(); })
      .then(function (j) { return published(j.articles || []); });
  }

  // ---- Homepage: latest N ----
  function mountLatest() {
    var el = document.getElementById('latest-insights');
    if (!el) return;
    var n = parseInt(el.getAttribute('data-limit') || '3', 10);
    load().then(function (list) {
      if (!list.length) { el.innerHTML = '<p class="empty">New insights are being prepared.</p>'; return; }
      el.innerHTML = list.slice(0, n).map(card).join('');
      if (window.revealScan) window.revealScan();
    }).catch(function () {
      el.innerHTML = '<p class="empty">Insights load on the published site.</p>';
    });
  }

  // ---- Hub: featured + filter + grid ----
  function mountHub() {
    var hub = document.getElementById('hub');
    if (!hub) return;
    var featureEl = document.getElementById('hub-feature');
    var barEl = document.getElementById('filterbar');
    var gridEl = document.getElementById('hub-grid');

    load().then(function (list) {
      if (!list.length) { gridEl.innerHTML = '<p class="empty">New insights are being prepared.</p>'; return; }

      // Featured = newest
      var feat = list[0];
      if (featureEl) {
        var furl = ARTICLE_BASE + feat.slug + '/';
        featureEl.innerHTML =
          '<a class="hf-img" href="' + furl + '" aria-label="' + esc(feat.title) + '">' + imgBlock(feat) + '</a>' +
          '<div class="hf-body">' +
            '<div class="hf-tag">Featured · ' + esc(feat.category) + '</div>' +
            '<h2><a href="' + furl + '">' + esc(feat.title) + '</a></h2>' +
            '<p>' + esc(feat.excerpt) + '</p>' +
            '<div class="acard-meta" style="margin-top:22px">' + fmtDate(feat.date) + '<span class="dotsep"></span>' + esc(feat.readingTime || '') + '</div>' +
            '<a class="btn btn-line" style="margin-top:26px" href="' + furl + '">Read the insight ' + ARROW + '</a>' +
          '</div>';
      }

      // Categories
      var cats = ['All'].concat(list.map(function (a) { return a.category; }).filter(function (v, i, s) { return s.indexOf(v) === i; }));
      var active = 'All';
      function renderChips() {
        barEl.innerHTML = cats.map(function (c) {
          return '<button class="chip' + (c === active ? ' active' : '') + '" data-cat="' + esc(c) + '">' + esc(c) + '</button>';
        }).join('');
      }
      function renderGrid() {
        var rest = list.slice(1); // featured already shown
        var filtered = active === 'All' ? rest : rest.filter(function (a) { return a.category === active; });
        // if a category is selected, include the featured one too if it matches
        if (active !== 'All' && feat.category === active) filtered = [feat].concat(filtered);
        gridEl.innerHTML = filtered.length ? filtered.map(card).join('') : '<p class="empty">No insights in this category yet.</p>';
        if (window.revealScan) window.revealScan();
      }
      renderChips(); renderGrid();
      barEl.addEventListener('click', function (e) {
        var b = e.target.closest('.chip'); if (!b) return;
        active = b.getAttribute('data-cat'); renderChips(); renderGrid();
      });
    }).catch(function () {
      gridEl.innerHTML = '<p class="empty">Insights load on the published site.</p>';
    });
  }

  mountLatest();
  mountHub();
})();
