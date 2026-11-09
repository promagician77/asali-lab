// Test suite for the lab's logic: spreadsheet reader, segmenter, intake routing, redirects.
// node test/run.js [out.json]
const fs = require('fs'), path = require('path');
const X = require('../site/lib/xlsx-lite.js'), S = require('../site/lib/segment.js');
const F = require('../site/lib/funnel.js'), R = require('../site/lib/redirects.js');
const results = []; let cur;
function t(group, name, fn) {
  cur = { group, name, ok: true, checks: 0, detail: '' };
  const t0 = process.hrtime.bigint();
  try { const d = fn(); if (typeof d === 'string') cur.detail = d; } catch (e) { cur.ok = false; cur.detail = e.message; }
  cur.ms = Number(process.hrtime.bigint() - t0) / 1e6; cur.ms = Math.round(cur.ms * 100) / 100;
  results.push(cur); console.log((cur.ok ? 'PASS' : 'FAIL') + '  ' + group.padEnd(10) + name + (cur.detail ? '  — ' + cur.detail : ''));
}
function ok(c, m) { cur.checks++; if (!c) throw new Error('assert: ' + m); }
function eq(a, b, m) { ok(JSON.stringify(a) === JSON.stringify(b), (m || '') + ' expected ' + JSON.stringify(b) + ' got ' + JSON.stringify(a)); }

const SAMPLES = path.join(__dirname, '..', 'samples');
const load = n => { const b = fs.readFileSync(path.join(SAMPLES, n)); return { name: n, sheets: (n.endsWith('.csv') ? X.readCsv(b.toString('utf8')) : X.read(b)).sheets }; };
const names = fs.readdirSync(SAMPLES).filter(f => /\.(xlsx|csv)$/.test(f)).sort();
const files = names.map(load);
const run = S.run(files);
const by = e => run.contacts.find(c => c.email === e);
const expect = JSON.parse(fs.readFileSync(path.join(SAMPLES, 'expect.json'), 'utf8')).designed;

/* ---- reader ---- */
t('reader', 'Reads shared strings, rich text, inline strings and multiple sheets', () => {
  const inl = files.find(f => /Inline/.test(f.name)).sheets[0].rows;
  eq(inl[1][2], 'Belly Dance', 'inline rich runs'); eq(inl[2][0], 'inline.two&co@gmail.com', 'entity decode'); eq(inl[0][1], '', 'gap column filled');
  const w = files.find(f => /Workshops/.test(f.name)); eq(w.sheets.map(s => s.name), ['PQ Bootcamp 2025', 'Webinars']);
  const d = files.find(f => /Dance/.test(f.name)).sheets[0].rows; ok(d[3][0] && !/[<>]/.test(d[3][0]), 'rich text name flattened: ' + d[3][0]);
  return `${files.length} files, ${files.reduce((a, f) => a + f.sheets.length, 0)} sheets`;
});
t('reader', 'CSV: semicolons, BOM, quoted commas, CRLF', () => {
  const c = files.find(f => f.name.endsWith('.csv')).sheets[0].rows;
  eq(c[0], ['Email', 'Name', 'Status']); ok(/,/.test(c[1][1]), 'quoted comma kept: ' + c[1][1]); ok(!/\r/.test(c[1][2]), 'no stray CR');
});
t('reader', 'Refuses old .xls and non-spreadsheets with a clear message', () => {
  let msg = ''; try { X.read(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0])); } catch (e) { msg = e.message; }
  ok(/re-saved as .xlsx or .csv/.test(msg), msg);
});

/* ---- segmenter ---- */
t('segment', 'Every unique contact lands in exactly one bucket', () => {
  const total = Object.values(run.stats.buckets).reduce((a, b) => a + b, 0);
  eq(total, run.stats.unique); eq(new Set(run.contacts.map(c => c.email)).size, run.contacts.length, 'no duplicate emails');
  eq(run.stats.rows, run.stats.unique + run.stats.duplicatesMerged + run.stats.rejected, 'rows = unique + merged + rejected');
  return JSON.stringify(run.stats.buckets).replace(/"/g, '');
});
t('segment', 'Duplicates merge across files, sheets, case and spaces', () => {
  ok(run.stats.duplicatesMerged >= 12, 'merged ' + run.stats.duplicatesMerged);
  const multi = run.contacts.filter(c => c.sources > 1); ok(multi.length >= 12, 'multi-source ' + multi.length);
  return `${run.stats.duplicatesMerged} duplicate rows merged`;
});
t('segment', 'An opt-out anywhere wins over an opt-in elsewhere', () => {
  const c = by(expect.unsub_overlap); eq(c.bucket, 'do-not-import'); eq(c.consent, false);
  ok(run.contacts.filter(c => c.bucket === 'do-not-import').every(c => c.consent === false), 'only opt-outs');
  eq(S.consentOf('Unsubscribed', 'yes'), false, 'inverted column'); eq(S.consentOf('Marketing Opt-In', 'No'), false); eq(S.consentOf('Status', 'subscribed'), true);
  return `${run.stats.buckets['do-not-import']} contacts held back`;
});
t('segment', 'Bad addresses are rejected with a reason (and a fix when it is a typo)', () => {
  const reasons = run.rejects.map(r => r.reason);
  ok(reasons.includes('invalid format') && reasons.includes('not an email') && reasons.includes('invalid dots'), reasons.join('|'));
  const typo = run.rejects.find(r => r.email === expect.typo); eq(typo.fix, 'sofia.reyes@gmail.com');
  ok(!by(expect.typo), 'typo not exported');
  return reasons.join(', ');
});
t('segment', '“Name <email>” cells, role addresses and header rows below a title', () => {
  const a = by(expect.angle); ok(a && a.first === 'Chris' && a.last === 'Obi', JSON.stringify(a));
  ok(/role address/.test(by(expect.role).notes), 'role flagged');
  ok(run.contacts.some(c => /Dance students/.test(c.why) || c.segment === 'play'), 'header on row 3 found');
  eq(run.stats.noHeader, []);
});
t('segment', 'Explicit Vertical column wins; two verticals go to review, never guessed', () => {
  eq(by(expect.multi_vertical).bucket, 'review');
  const leads = run.contacts.filter(c => /vertical column says/.test(c.why)); ok(leads.length >= 40, 'explicit ' + leads.length);
  ok(run.contacts.filter(c => c.bucket === 'review').every(c => c.why), 'review always has a reason');
});
t('segment', 'Signals from titles, programs, classes and file names', () => {
  eq(S.score('HR Director').s.work > 0, true); eq(S.score('6-Week Mental Fitness Bootcamp (PQ)').s.live >= 7, true);
  eq(S.score('MENAHT Masterclass').s.play >= 3, true); eq(S.score('Burnout Reset Webinar').s.live >= 3, true);
  eq(S.score('shower thoughts').s.play, 0, 'no substring hits ("show" in "shower")');
});
t('segment', 'Squarespace import files: email first, header like a Mailchimp export, no formula escaping in data', () => {
  const work = run.contacts.filter(c => c.bucket === 'work'), csv = S.toSquarespaceCsv(work), lines = csv.trim().split('\r\n');
  eq(lines[0], 'Email Address,First Name,Last Name'); eq(lines.length, work.length + 1);
  ok(lines.slice(1).every(l => /^[^,@]+@[^,]+,/.test(l) || /^"[^"]+@/.test(l)), 'first column is an email');
  const rev = S.toReviewCsv([{ email: 'a@b.co', first: '=HYPERLINK("x")', last: '', segment: 'review', why: '', notes: '', sources: 1 }]);
  ok(/'=HYPERLINK/.test(rev), 'review csv neutralises formulas');
  return `${work.length} Work rows`;
});
t('segment', '50,000-row workbook processed in the browser engine', () => {
  const rows = [['Email', 'Name', 'Title', 'Tags']];
  for (let i = 0; i < 50000; i++) rows.push([`person${i % 41000}@example${(i % 41000) % 300}.com`, `First${i} Last${i}`, ['HR Director', 'Dancer', 'Wellness lead', ''][i % 4], ['PQ bootcamp', 'belly dance class', 'career', ''][i % 4]]);
  const t0 = Date.now(); const r = S.run([{ name: 'big.xlsx', sheets: [{ name: 'All', rows }] }]); const ms = Date.now() - t0;
  eq(r.stats.unique, 41000); ok(ms < 8000, 'took ' + ms + ' ms');
  cur.perf = ms; return `${ms} ms for 50,000 rows → 41,000 unique`;
});

/* ---- intake funnel ---- */
const combos = F.combos();
t('intake', 'Every possible answer combination starts exactly one workflow', () => {
  let n = 0; combos.forEach(a => { const r = F.route(a); ok(r.ok && r.workflows.length === 1, JSON.stringify(a)); n++; });
  return `${n.toLocaleString('en-US')} combinations checked`;
});
t('intake', 'Booking link only for $1,200+; everyone else gets resources, never a dead end', () => {
  combos.forEach(a => {
    const r = F.route(a), q = a.investment === 'individual' || a.investment === 'org';
    ok(r.qualified === q && !!r.booking === q, a.investment);
    ok(r.workflow.steps.length >= 2, 'steps');
  });
  eq(F.route(Object.assign({}, combos[0], { investment: 'self', for: 'organization' })).workflow.steps.some(s => /enterprise/.test(s)), true, 'org on a small budget can still reply');
});
t('intake', 'Work / Live / Play tag always set for later email segments', () => {
  combos.forEach(a => { const r = F.route(a); ok(r.tags.indexOf('vertical-' + a.path) >= 0, 'tag'); });
});
t('intake', 'Missing required answers are refused', () => {
  const r = F.route({ path: 'work' }); ok(!r.ok && r.errors.length >= 4, r.errors.join(','));
});
t('intake', '17hats rules: the plan passes; a typed budget field is caught', () => {
  eq(F.validate({ questions: F.QUESTIONS }), []);
  const typed = F.QUESTIONS.map(q => q.id === 'investment' ? Object.assign({}, q, { type: 'Short Answer', options: undefined }) : q);
  const v = F.validate({ questions: typed }); ok(v.some(x => /can never route/.test(x)), v.join(' | '));
  const r = F.route(Object.assign({}, combos[0], { investment: '2500' }), { questions: typed }); eq(r.workflows.length, 0, 'typed answer routes nowhere');
  const two = F.QUESTIONS.map(q => q.id === 'for' ? Object.assign({}, q, { router: true }) : q);
  ok(F.validate({ questions: two }).some(x => /Only one/.test(x)), 'two routers');
  ok(F.validate({ questions: F.QUESTIONS, formLevelWorkflow: true }).some(x => /can’t both/.test(x)), 'form-level + per-answer');
  return 'typed budget → 0 workflows started';
});

/* ---- redirects ---- */
t('redirects', 'Consolidation map is valid: no loops, chains, duplicates or missing targets', () => {
  const v = R.validate(R.text()); eq(v.issues, []); eq(v.rules.length, R.MAP.length);
  return `${v.rules.length} rules`;
});
t('redirects', 'Validator catches the silent failures', () => {
  const bad = ['/a -> /b 301', '/b -> /a 301', '/c -> /d 301', '/d -> /about 301', '/x -> /nowhere 301', 'services -> /results 301', '/e -> /results 302', '/a -> /results 301'].join('\n');
  const v = R.validate(bad).issues.join(' | ');
  ['loop', 'chain', 'not a page', 'must start with', 'temporary', 'already redirected'].forEach(k => ok(v.indexOf(k) >= 0, k + ' in ' + v));
});
t('redirects', 'Every old nav path found on the live site is either redirected or kept on purpose', () => {
  const live = ['/', '/about-whoisasali', '/services-chooseyourpath', '/workempoweredservices', '/liveempoweredservices', '/playempoweredservices', '/rsvp', '/testimonials', '/contact'];
  const covered = R.MAP.map(m => m[0]).concat(R.KEEP.map(k => k[0]), ['/']);
  live.forEach(p => ok(covered.indexOf(p) >= 0, p));
  return `${live.length} live nav paths accounted for`;
});

const pass = results.filter(r => r.ok).length;
const out = { ran_at: new Date().toISOString(), node: process.version, passed: pass, total: results.length, checks: results.reduce((a, r) => a + r.checks, 0), sample: { files: run.stats.files, sheets: run.stats.sheets, rows: run.stats.rows, unique: run.stats.unique, merged: run.stats.duplicatesMerged, rejected: run.stats.rejected, buckets: run.stats.buckets }, combos: combos.length, perf50k: (results.find(r => r.perf) || {}).perf, results };
fs.writeFileSync(process.argv[2] || path.join(__dirname, '..', 'site', 'data', 'tests.json'), JSON.stringify(out, null, 1));
console.log(`\n${pass}/${results.length} tests, ${out.checks} assertions`);
process.exit(pass === results.length ? 0 : 1);
