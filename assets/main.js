/* Shared interactions — used by every page */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Year
  var yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();

  // Loader
  var loader = document.getElementById('loader');
  function hideLoader() { if (loader) loader.classList.add('done'); }
  if (reduce) hideLoader();
  else { window.addEventListener('load', function () { setTimeout(hideLoader, 450); }); setTimeout(hideLoader, 2600); }

  // Sticky header
  var hdr = document.getElementById('hdr');
  function onScroll() {
    if (hdr) hdr.classList.toggle('scrolled', window.scrollY > 24);
    var p = document.getElementById('progress');
    if (p) {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      p.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
    }
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Mobile menu
  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') { links.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }
    });
  }

  // Reveal on scroll (also re-run for dynamically injected nodes)
  window.revealScan = function () {
    var els = [].slice.call(document.querySelectorAll('.reveal:not(.in)'));
    if (reduce || !('IntersectionObserver' in window)) { els.forEach(function (el) { el.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { io.observe(el); });
  };
  window.revealScan();

  // Count-up
  function uspan(s) { return s ? '<span class="u">' + s + '</span>' : ''; }
  function fmt(v, d) { return v.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }); }
  var counters = [].slice.call(document.querySelectorAll('[data-count]'));
  function setFinal(el) { var t = parseFloat(el.getAttribute('data-count')), d = parseInt(el.getAttribute('data-decimals') || '0', 10), s = el.getAttribute('data-suffix') || ''; el.innerHTML = fmt(t, d) + uspan(s); }
  if (reduce || !('IntersectionObserver' in window)) { counters.forEach(setFinal); }
  else if (counters.length) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target, t = parseFloat(el.getAttribute('data-count')), d = parseInt(el.getAttribute('data-decimals') || '0', 10), s = el.getAttribute('data-suffix') || '', dur = 1500, start = null;
        requestAnimationFrame(function step(ts) { if (!start) start = ts; var p = Math.min((ts - start) / dur, 1), e = 1 - Math.pow(1 - p, 3); el.innerHTML = fmt(t * e, d) + uspan(s); if (p < 1) requestAnimationFrame(step); else el.innerHTML = fmt(t, d) + uspan(s); });
        co.unobserve(el);
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { co.observe(el); });
  }
})();

/* ============================================================
   Request Executive Resume — modal (qualify, don't open-download)
   Works on static hosting. To capture submissions seamlessly,
   set RR_ENDPOINT to a free form service (Web3Forms / Formspree).
   Until then it falls back to a pre-filled email to the owner.
   ============================================================ */
(function () {
  // --- CONFIG -------------------------------------------------
  var RR_ENDPOINT = '';                 // e.g. 'https://api.web3forms.com/submit'
  var RR_ACCESS_KEY = '';               // Web3Forms access key (free, instant)
  var RR_EMAIL = 'peemaii123@gmail.com';// mailto fallback recipient
  // ------------------------------------------------------------

  if (document.getElementById('rrBackdrop')) return; // inject once

  var modal = document.createElement('div');
  modal.id = 'rrBackdrop';
  modal.className = 'rr-backdrop';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Request Executive Resume');
  modal.innerHTML =
    '<div class="rr-modal"><div class="rr-inner">' +
      '<button type="button" class="rr-close" data-rr-close aria-label="Close">&times;</button>' +
      '<span class="rr-eyebrow"><span class="rule"></span>Private Profile</span>' +
      '<h2 class="rr-title">Request Executive Resume</h2>' +
      '<p class="rr-sub">My full professional profile is shared privately with verified recruiters, executive search firms, business partners, and industry contacts. Please share a few details and I will follow up directly.</p>' +
      '<form class="rr-form" id="rrForm" novalidate>' +
        '<div class="rr-field"><label for="rrName">Full Name <span class="req">*</span></label><input id="rrName" name="name" type="text" autocomplete="name" required placeholder="Your full name"></div>' +
        '<div class="rr-row">' +
          '<div class="rr-field"><label for="rrCompany">Company <span class="req">*</span></label><input id="rrCompany" name="company" type="text" autocomplete="organization" required placeholder="Organisation"></div>' +
          '<div class="rr-field"><label for="rrPosition">Position <span class="req">*</span></label><input id="rrPosition" name="position" type="text" autocomplete="organization-title" required placeholder="Your role"></div>' +
        '</div>' +
        '<div class="rr-field"><label for="rrEmail">Business Email <span class="req">*</span></label><input id="rrEmail" name="email" type="email" autocomplete="email" required placeholder="name@company.com"><span class="rr-error" id="rrEmailErr">Please enter a valid business email.</span></div>' +
        '<div class="rr-field"><label for="rrPurpose">Purpose of Contact <span class="req">*</span></label><select id="rrPurpose" name="purpose" required>' +
          '<option value="" disabled selected>Select a reason</option>' +
          '<option>Executive search / Recruitment</option>' +
          '<option>Direct hiring / Employer</option>' +
          '<option>Business partnership</option>' +
          '<option>Industry networking</option>' +
          '<option>Other professional enquiry</option>' +
        '</select></div>' +
        '<button type="submit" class="btn btn-gold rr-submit">Submit Request</button>' +
        '<p class="rr-note">Your details are used only to respond to this request.</p>' +
      '</form>' +
      '<div class="rr-thanks" id="rrThanks">' +
        '<div class="rr-check"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12.5l4.2 4.2L19 7"/></svg></div>' +
        '<h3>Thank you for your interest. I will review your request and share my professional profile shortly.</h3>' +
        '<p>A response will follow to the email you provided.</p>' +
        '<button type="button" class="btn btn-line" data-rr-close>Close</button>' +
      '</div>' +
    '</div></div>';
  document.body.appendChild(modal);

  var form = modal.querySelector('#rrForm');
  var thanks = modal.querySelector('#rrThanks');
  var emailErr = modal.querySelector('#rrEmailErr');
  var lastFocus = null;

  function open() {
    lastFocus = document.activeElement;
    // reset to form view each open
    form.classList.remove('hide'); thanks.classList.remove('show');
    modal.querySelector('.rr-eyebrow').classList.remove('hide');
    modal.querySelector('.rr-title').classList.remove('hide');
    modal.querySelector('.rr-sub').classList.remove('hide');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { var n = modal.querySelector('#rrName'); if (n) n.focus(); }, 60);
  }
  function close() {
    modal.classList.remove('show');
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function showThanks() {
    form.classList.add('hide');
    modal.querySelector('.rr-eyebrow').classList.add('hide');
    modal.querySelector('.rr-title').classList.add('hide');
    modal.querySelector('.rr-sub').classList.add('hide');
    thanks.classList.add('show');
    modal.querySelector('.rr-modal').scrollTop = 0;
  }

  function emailOk(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  function deliver(data) {
    // 1) configured form endpoint (recommended)
    if (RR_ENDPOINT) {
      var payload = Object.assign({}, data, {
        access_key: RR_ACCESS_KEY,
        subject: 'Executive Resume Request — ' + data.name + ' (' + data.company + ')',
        from_name: data.name
      });
      return fetch(RR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (r) { return r.ok; }).catch(function () { return false; });
    }
    // 2) fallback: open a pre-filled email so nothing is lost
    var body = 'Executive Resume Request%0D%0A%0D%0A'
      + 'Full Name: ' + encodeURIComponent(data.name) + '%0D%0A'
      + 'Company: ' + encodeURIComponent(data.company) + '%0D%0A'
      + 'Position: ' + encodeURIComponent(data.position) + '%0D%0A'
      + 'Business Email: ' + encodeURIComponent(data.email) + '%0D%0A'
      + 'Purpose: ' + encodeURIComponent(data.purpose);
    var href = 'mailto:' + RR_EMAIL + '?subject=' + encodeURIComponent('Executive Resume Request — ' + data.name) + '&body=' + body;
    try { window.location.href = href; } catch (e) {}
    return Promise.resolve(true);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    emailErr.classList.remove('show');
    var data = {
      name: form.name.value.trim(),
      company: form.company.value.trim(),
      position: form.position.value.trim(),
      email: form.email.value.trim(),
      purpose: form.purpose.value
    };
    if (!data.name || !data.company || !data.position || !data.purpose) { form.reportValidity(); return; }
    if (!emailOk(data.email)) { emailErr.classList.add('show'); form.email.focus(); return; }
    var btn = form.querySelector('.rr-submit');
    btn.textContent = 'Sending…'; btn.disabled = true;
    deliver(data).then(function () { showThanks(); }).catch(function () { showThanks(); });
  });

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-request-resume]')) { e.preventDefault(); open(); }
    else if (e.target.closest('[data-rr-close]')) { close(); }
    else if (e.target === modal) { close(); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modal.classList.contains('show')) close(); });
})();
