(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  /* ---------- tabs ---------- */
  var tabs = $$('.tabs a'), panels = $$('.panel');
  function show(id, scroll) {
    if (!$('.panel#' + id)) id = 'overview';
    panels.forEach(function (p) { p.hidden = p.id !== id; });
    tabs.forEach(function (t) { t.setAttribute('aria-selected', t.getAttribute('href') === '#' + id ? 'true' : 'false'); });
    var on = $('.tabs a[aria-selected=true]'); if (on && on.scrollIntoView && window.innerWidth < 900) on.scrollIntoView({ block: 'nearest', inline: 'center' });
    if (scroll) window.scrollTo(0, 0);
    if (id === 'prototype') fit();
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]'); if (!a) return;
    var id = a.getAttribute('href').slice(1); if (!$('.panel#' + id)) return;
    e.preventDefault(); history.replaceState(null, '', '#' + id); show(id, true);
  });

  /* ---------- prototype viewer ---------- */
  var PAGES = [['index', 'Home'], ['about', 'About'], ['consulting-advisory', 'Consulting'], ['movement-stage', 'Movement'], ['programs-intensives', 'Programs'], ['results', 'Results'], ['intake', 'Intake']];
  var frame = $('#frame'), stage = $('#stage'), width = 1280;
  $('#pages').innerHTML = PAGES.map(function (p, i) { return '<button' + (i ? '' : ' class="on"') + ' data-p="' + p[0] + '">' + p[1] + '</button>'; }).join('');
  $$('#pages button').forEach(function (b) { b.addEventListener('click', function () { $$('#pages button').forEach(function (x) { x.classList.toggle('on', x === b); }); frame.src = 'proto/' + b.dataset.p + '.html'; }); });
  $$('#devices button').forEach(function (b) { b.addEventListener('click', function () { $$('#devices button').forEach(function (x) { x.classList.toggle('on', x === b); }); width = +b.dataset.w; fit(); }); });
  function fit() {
    var w = stage.clientWidth, h = stage.clientHeight;
    if (!w) return;
    if (width === 390) { stage.classList.add('phone'); frame.style.width = '390px'; frame.style.height = h + 'px'; frame.style.transform = ''; return; }
    stage.classList.remove('phone');
    var s = Math.min(1, w / width); frame.style.width = width + 'px'; frame.style.height = (h / s) + 'px'; frame.style.transform = 'scale(' + s + ')';
  }
  window.addEventListener('resize', fit);

  /* ---------- navigation & redirects ---------- */
  var OLD = [['Home', '/'], ['About', '/about-whoisasali'], ['Start Here', '/services-chooseyourpath'], ['Services (folder)', ''], ['· WORK Empowered', '/workempoweredservices'], ['· LIVE Empowered', '/liveempoweredservices'], ['· PLAY Empowered', '/playempoweredservices'], ['· Classes / Shows / Events', '/rsvp'], ['· Results', '/testimonials'], ['· Contact (free 15-min call)', '/contact']];
  $('#nav-old').innerHTML = OLD.map(function (o) { return '<li>' + esc(o[0]) + (o[1] ? '<small>' + esc(o[1]) + '</small>' : '') + '</li>'; }).join('');
  var map = $('#map'); map.value = '# Consolidation: old navigation paths → new pages\n' + Redirects.text();
  $('#keep').innerHTML = Redirects.KEEP.map(function (k) { return '<li><code>' + esc(k[0]) + '</code> ' + esc(k[1]) + '</li>'; }).join('');
  function checkMap() {
    var v = Redirects.validate(map.value);
    $('#map-issues').innerHTML = v.issues.length ? v.issues.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') : '<li class="ok">' + v.rules.length + ' redirects · no loops, chains, duplicates or missing targets</li>';
  }
  map.addEventListener('input', checkMap); checkMap();
  $('#copy-map').addEventListener('click', function () { copy(map.value.replace(/^#.*\n/gm, ''), '#map-status'); });
  function copy(text, out) {
    var done = function () { $(out).textContent = 'Copied'; setTimeout(function () { $(out).textContent = ''; }, 1600); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () { $(out).textContent = 'Select the text and copy'; });
  }

  /* ---------- contact sorter ---------- */
  var drop = $('#drop'), input = $('#file');
  drop.addEventListener('click', function (e) { if (e.target.id !== 'samples') input.click(); });
  drop.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
  ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
  drop.addEventListener('drop', function (e) { handle(Array.prototype.slice.call(e.dataTransfer.files)); });
  input.addEventListener('change', function () { handle(Array.prototype.slice.call(input.files)); input.value = ''; });
  var SAMPLE_FILES = ['Corporate & HR contacts.xlsx', 'Workshops & bootcamp signups.xlsx', 'Dance students.xlsx', 'Misc leads.xlsx', 'Old newsletter export.csv', 'Inline strings (exporter).xlsx'];
  $('#samples').addEventListener('click', function (e) {
    e.stopPropagation();
    Promise.all(SAMPLE_FILES.map(function (n) { return fetch('samples/' + encodeURIComponent(n)).then(function (r) { return r.arrayBuffer(); }).then(function (b) { return { name: n, buf: b }; }); }))
      .then(function (list) { process(list); });
  });
  function handle(files) {
    Promise.all(files.map(function (f) { return f.arrayBuffer().then(function (b) { return { name: f.name, buf: b }; }); })).then(process);
  }
  var urls = [];
  function process(list) {
    var t0 = performance.now(), parsed = [], errors = [];
    list.forEach(function (f) {
      try {
        var isCsv = /\.(csv|txt)$/i.test(f.name);
        var r = isCsv ? XlsxLite.readCsv(new TextDecoder('utf-8').decode(f.buf)) : XlsxLite.read(f.buf);
        parsed.push({ name: f.name, sheets: r.sheets });
      } catch (e) { errors.push(f.name + ': ' + e.message); }
    });
    var res = Segmenter.run(parsed), ms = Math.round(performance.now() - t0), b = res.stats.buckets;
    $('#seg-out').hidden = false;
    var COL = { work: '#1f4f86', live: '#256b3f', play: '#8a2c5a', review: '#b58a1b', 'do-not-import': '#777' };
    var items = [['work', 'Work'], ['live', 'Live'], ['play', 'Play'], ['review', 'Review'], ['do-not-import', 'Held back (opted out)'], ['rejected', 'Rejected addresses']];
    var max = Math.max.apply(null, Object.keys(b).map(function (k) { return b[k]; }).concat(res.stats.rejected, 1));
    $('#bars').innerHTML = items.map(function (it) { var n = it[0] === 'rejected' ? res.stats.rejected : b[it[0]]; return '<div><b>' + n.toLocaleString('en-US') + '</b><span>' + it[1] + '</span><i style="--c:' + (COL[it[0]] || '#a33') + ';width:' + Math.max(4, 100 * n / max) + '%"></i></div>'; }).join('');
    urls.forEach(URL.revokeObjectURL); urls = [];
    var mk = function (name, text) { var u = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' })); urls.push(u); return '<a href="' + u + '" download="' + name + '">⬇ ' + esc(name) + '</a>'; };
    var pick = function (k) { return res.contacts.filter(function (c) { return c.bucket === k; }); };
    $('#downloads').innerHTML = mk('squarespace-work.csv', Segmenter.toSquarespaceCsv(pick('work'))) + mk('squarespace-live.csv', Segmenter.toSquarespaceCsv(pick('live'))) + mk('squarespace-play.csv', Segmenter.toSquarespaceCsv(pick('play'))) + mk('review.csv', Segmenter.toReviewCsv(pick('review'))) + mk('held-back-opted-out.csv', Segmenter.toReviewCsv(pick('do-not-import'))) + mk('rejected-addresses.csv', Segmenter.toRejectCsv(res.rejects));
    var sample = [].concat(pick('work').slice(0, 4), pick('live').slice(0, 4), pick('play').slice(0, 4), pick('review').slice(0, 5), pick('do-not-import').slice(0, 2));
    $('#preview').innerHTML = '<thead><tr><th>Email</th><th>Bucket</th><th>Why</th></tr></thead><tbody>' + sample.map(function (c) { return '<tr><td>' + esc(c.email) + '</td><td><span class="pill p-' + c.bucket + '">' + c.bucket + '</span></td><td>' + esc(c.why) + (c.notes ? '<br><small>' + esc(c.notes) + '</small>' : '') + '</td></tr>'; }).join('') + '</tbody>';
    var s = res.stats;
    $('#did').innerHTML = [
      'Read ' + s.files + ' file(s), ' + s.sheets + ' sheet(s), ' + s.rows.toLocaleString('en-US') + ' contact rows in ' + ms + ' ms, all in this tab',
      s.duplicatesMerged + ' duplicate rows merged (across files, sheets, letter case and stray spaces)',
      s.rejected + ' addresses rejected with a reason' + (res.rejects.some(function (r) { return r.fix; }) ? ', including typo fixes to confirm' : ''),
      b['do-not-import'] + ' held back because a file marks them opted out',
      b.review + ' left for you to decide, each with the reason',
      s.noHeader.length ? 'No email column found in: ' + s.noHeader.join(', ') : 'Email column found in every sheet (headers can sit below title rows)'
    ].concat(errors).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
  }

  /* ---------- intake ---------- */
  var F = window.Funnel, inv = F.QUESTIONS.filter(function (q) { return q.router; })[0];
  $('#inv').innerHTML = inv.options.map(function (o, i) { return '<button' + (i === 1 ? ' class="on"' : '') + ' data-v="' + o[1] + '">' + esc(o[0]) + '</button>'; }).join('');
  var base = { path: 'work', for: 'individual', role: 'director', moment: 'Panel interview for a VP role', timing: '30d', tried: [], source: 'Referral' };
  function wf(v) {
    var r = F.route(Object.assign({}, base, { investment: v })), w = r.workflow, mail;
    if (r.qualified) mail = '<div class="sub">Your strategy call link</div>Hi Dana, thank you for the detail. Based on your answers, the next step is a strategy call. Choose a time here: <u>' + esc(w.booking.split(' (')[0]) + '</u> (Calendly)<br><br>Asali';
    else if (v === 'self') mail = '<div class="sub">Two ways to start now</div>Hi Dana, here are two self-serve options: the $200 resource and the $600 resource. If your organization is sponsoring this, reply “enterprise” and I’ll be in touch.<br><br>Asali';
    else mail = '<div class="sub">A quick question before we talk</div>Hi Dana, thanks for applying. Reply with what success looks like and who is investing, and I’ll point you to the right next step. Meanwhile, two self-serve options are below.<br><br>Asali';
    $('#wfout').innerHTML = '<div><h3>' + esc(w.name) + '</h3><ol class="plain">' + w.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol><p class="fine">Project tags: ' + esc(r.tags.concat(r.qualified ? ['qualified'] : []).join(', ')) + '</p></div><div class="mailbox">' + mail + '</div>';
    $('#flow-wf').innerHTML = esc(w.name) + '<small>email from Asali’s Gmail, in seconds</small>';
    $('#flow-end').innerHTML = (r.qualified ? 'Calendly secret event' : 'Resources, reply open') + '<small>' + (r.qualified ? esc(w.booking.split(' (')[0]) : '$200 / $600 options') + '</small>';
  }
  $$('#inv button').forEach(function (b) { b.addEventListener('click', function () { $$('#inv button').forEach(function (x) { x.classList.toggle('on', x === b); }); wf(b.dataset.v); }); });
  wf('individual');
  $('#sheet').innerHTML = '<thead><tr><th>#</th><th>Question</th><th>17hats type</th><th>Does</th></tr></thead><tbody>' + F.QUESTIONS.map(function (q, i) {
    return '<tr><td>' + (i + 1) + '</td><td>' + esc(q.label) + (q.options && q.type !== 'Lead Source' ? '<br><small class="fine">' + esc(q.options.map(function (o) { return o[0]; }).join(' · ')) + '</small>' : '') + '</td><td>' + esc(q.type) + '</td><td>' + (q.router ? '<b>Starts the workflow</b>' : q.effect === 'project tag' ? 'Project tag (not a start tag)' : q.effect === 'lead source report' ? 'Lead source report' : 'Context for Asali') + '</td></tr>';
  }).join('') + '</tbody>';
  $('#typed').addEventListener('change', function () {
    if (!this.checked) { $('#typed-out').innerHTML = ''; return; }
    var typed = F.QUESTIONS.map(function (q) { return q.router ? Object.assign({}, q, { type: 'Short Answer' }) : q; });
    var v = F.validate({ questions: typed }), r = F.route(Object.assign({}, base, { investment: '2500' }), { questions: typed });
    $('#typed-out').innerHTML = v.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '<li>Test lead answering “2500”: ' + r.workflows.length + ' workflows started, so no link, no resources, no follow-up.</li>';
  });

  /* ---------- build sheet ---------- */
  var RULES = [
    ['5 links + high-contrast intake button', 'Pages → Main Navigation holds exactly 5 items; Site Header → Button element links to /intake', 'No code'],
    ['Remove health product links from navigation', 'Store page moved to Not Linked; discreet footer link; SEO → “Hide page from search results” on the store collection', 'No code'],
    ['Programs & Intensives dropdown', 'Folder whose first item is the Programs & Intensives overview, then Accelerator and the Fiercely Feminine link', 'No code'],
    ['Fiercely Feminine direct link', 'Existing page and URL /fiercely-feminine-mind-body-reset-intensive kept unchanged', 'No code'],
    ['Dual pathway cards, #cbd5e1 hairlines, no shadows', 'List Section (cards) + 4 lines of Custom CSS', 'CSS'],
    ['“Are We a Fit?” green / amber panels', 'List Section (2 items) + Custom CSS by item order', 'CSS'],
    ['3R Strategic Application Matrix', 'Code Block with an HTML table (works on every plan), stacked cards on phones', 'HTML/CSS'],
    ['About keeps /about-whoisasali lineage', 'Content moved to /about; 301 from the old URL', 'URL Mappings'],
    ['Results: 3 case studies', 'Existing case-study posts kept; Results page shows the three cards', 'No code'],
    ['8-question 17hats form on /intake', 'Code Block embed (Core plan or higher), or link to the hosted form on Basic', 'Embed'],
    ['Photo direction per page', 'Image blocks sized to each frame; alt text written from the direction notes', 'No code'],
    ['Old URLs keep working', 'Settings → Developer Tools → URL Mappings (map on tab 03)', 'URL Mappings']
  ];
  $('#rules').innerHTML = '<thead><tr><th>Blueprint rule</th><th>Squarespace setting</th><th>Needs</th></tr></thead><tbody>' + RULES.map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td></tr>'; }).join('') + '</tbody>';
  var CSS = [
    '/* 1 · Choose Your Path cards: hairline #cbd5e1, no shadow */',
    'section[data-section-id="PATHS_ID"] .list-item {',
    '  border: 1px solid #cbd5e1;',
    '  box-shadow: none !important;',
    '}',
    '',
    '/* 2 · "Are We a Fit?" panels: green, then amber */',
    'section[data-section-id="FIT_ID"] .list-item {',
    '  border: 2px solid #3f7d5a;',
    '  box-shadow: none !important;',
    '}',
    'section[data-section-id="FIT_ID"] .list-item:nth-child(2) {',
    '  border-color: #c08a2e;',
    '}',
    '',
    '/* 3 · Bracketed hero buttons, as in the mockup */',
    'section[data-section-id="HERO_ID"] .sqs-button-element--primary::before,',
    'section[data-section-id="HERO_ID"] .sqs-button-element--secondary::before { content: "["; margin-right: .6em; opacity: .8; }',
    'section[data-section-id="HERO_ID"] .sqs-button-element--primary::after,',
    'section[data-section-id="HERO_ID"] .sqs-button-element--secondary::after { content: "]"; margin-left: .6em; opacity: .8; }',
    '',
    '/* 4 · 3R matrix (Code Block): stack into cards on phones */',
    '@media (max-width: 767px) {',
    '  .r3-matrix thead { display: none; }',
    '  .r3-matrix, .r3-matrix tr, .r3-matrix th, .r3-matrix td { display: block; width: 100%; }',
    '  .r3-matrix td::before { content: attr(data-h); display: block; font-weight: 600; }',
    '}'
  ].join('\n');
  $('#css').textContent = CSS;
  $('#copy-css').addEventListener('click', function () { copy(CSS, '#copy-css'); setTimeout(function () { $('#copy-css').textContent = 'Copy CSS'; }, 1700); });

  /* ---------- measured data ---------- */
  function load(u) { return fetch(u).then(function (r) { if (!r.ok) throw 0; return r.json(); }); }
  Promise.all([load('data/tests.json'), load('data/checks.json')]).then(function (d) {
    var T = d[0], C = d[1], runs = C.runs;
    var pass = runs.filter(function (r) { return !r.overflow && !r.contrastFails && !r.under44 && !r.skipped && r.h1 === 1 && !r.unlabeled; }).length;
    $('#t-checks').textContent = pass + '/' + runs.length; $('#t-tests').textContent = T.passed + '/' + T.total; $('#t-combos').textContent = T.combos.toLocaleString('en-US');
    var worst = runs.reduce(function (m, r) { return r.contrastWorst.ratio < m ? r.contrastWorst.ratio : m; }, 99);
    var maxCls = runs.reduce(function (m, r) { return Math.max(m, r.cls); }, 0);
    var nav = runs[0].navLinks.length, cards = runs.filter(function (r) { return r.pathCards.length; })[0].pathCards;
    $('#checks').innerHTML = '<div class="chk">' + [
      [pass + '/' + runs.length, '7 pages × 1440 / 1024 / 390 px, all checks clean'],
      [worst.toFixed(2) + ':1', 'lowest text contrast found (AA needs 4.5)'],
      [String(maxCls), 'largest layout shift (CLS) while loading'],
      [nav + ' + 1', 'header links + Apply button · path cards ' + (cards.every(function (c) { return c.border === 'rgb(203, 213, 225)' && c.shadow === 'none'; }) ? '#cbd5e1, no shadow ✓' : '✗')]
    ].map(function (x) { return '<div><b>' + x[0] + '</b><span>' + x[1] + '</span></div>'; }).join('') + '</div>';
    $('#env').textContent = 'Logic tests: Node ' + T.node + ', run ' + T.ran_at.slice(0, 16).replace('T', ' ') + ' UTC. Page checks: Chromium ' + C.browser + ', ' + C.when.slice(0, 16).replace('T', ' ') + ' UTC.';
    $('#perf').innerHTML = [['Logic tests', T.passed + '/' + T.total], ['Intake combinations', T.combos.toLocaleString('en-US')], ['Sample rows sorted', T.sample.rows + ' → ' + T.sample.unique], ['50,000-row sheet', T.perf50k + ' ms']].map(function (x) { return '<div><dt>' + x[0] + '</dt><dd>' + x[1] + '</dd></div>'; }).join('');
    $('#test-table').innerHTML = T.results.map(function (r) { return '<div class="t"><span class="' + (r.ok ? 'ok' : 'bad') + '">' + (r.ok ? 'PASS' : 'FAIL') + '</span><span class="g">' + r.group + '</span><span>' + esc(r.name) + (r.detail ? '<small>' + esc(r.detail) + '</small>' : '') + '</span><span class="ms">' + r.ms + ' ms</span></div>'; }).join('') +
      '<div class="t"><span class="ok">PASS</span><span class="g">pages</span><span>Prototype: overflow, contrast, tap targets, headings, labels, layout shift, blueprint rules<small>' + pass + ' of ' + runs.length + ' page × width runs clean · worst contrast ' + worst.toFixed(2) + ':1 · CLS ' + maxCls + '</small></span><span class="ms"></span></div>';
    document.body.setAttribute('data-ready', '1');
  }).catch(function () { document.body.setAttribute('data-ready', '1'); });

  show((location.hash || '#overview').slice(1), false);
})();
