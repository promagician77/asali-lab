/* Work / Live / Play segmenter for spreadsheet contact lists.
   Deterministic rules, no guessing: anything ambiguous goes to "review", anything without
   consent goes to "do-not-import". Same code runs in the browser tool and in the Node tests. */
(function (root) {
  var VERTICALS = ['work', 'live', 'play'];

  // Header aliases (lower-cased, punctuation stripped) -> field
  var HEADERS = {
    email: ['email', 'emailaddress', 'e-mail', 'e-mailaddress', 'mail', 'emailid', 'workemail', 'personalemail', 'primaryemail'],
    first: ['firstname', 'first', 'givenname', 'fname', 'forename'],
    last: ['lastname', 'last', 'surname', 'familyname', 'lname'],
    full: ['name', 'fullname', 'contactname', 'contact', 'attendee', 'studentname', 'clientname'],
    title: ['title', 'jobtitle', 'role', 'position', 'occupation', 'profession'],
    company: ['company', 'organization', 'organisation', 'employer', 'companyname', 'org', 'business'],
    tags: ['tags', 'tag', 'interest', 'interests', 'program', 'programme', 'service', 'services', 'category', 'list', 'group', 'segment', 'source', 'leadsource', 'howdidyouhear', 'event', 'class', 'workshop', 'notes', 'note', 'comments', 'offer'],
    vertical: ['vertical', 'pillar', 'worklifeplay', 'workliveplay', 'track'],
    consent: ['optin', 'opt-in', 'subscribed', 'marketingconsent', 'consent', 'emailconsent', 'acceptsmarketing', 'newsletter', 'emailmarketing', 'status', 'subscriptionstatus', 'unsubscribed', 'donotemail', 'emailoptout']
  };
  function key(h) { return String(h || '').toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-/g, ''); }
  var ALIAS = {};
  Object.keys(HEADERS).forEach(function (f) { HEADERS[f].forEach(function (a) { ALIAS[a.replace(/-/g, '')] = f; }); });

  // Keyword rules. Weighted; whole-word-ish matching on lower-cased text.
  var RULES = {
    play: [['belly dance', 3], ['bellydance', 3], ['menaht', 3], ['dance', 2], ['dancer', 2], ['choreograph', 2], ['troupe', 3], ['stage', 1], ['performer', 2], ['performance', 1], ['artist', 1], ['fiercely feminine', 3], ['masterclass', 1], ['old town school', 2], ['rsvp', 1], ['show', 1], ['studio', 1], ['movement', 1], ['raqs', 3], ['hafla', 3]],
    live: [['mental fitness', 3], ['positive intelligence', 3], ['pq', 2], ['bootcamp', 2], ['wellness', 2], ['wellbeing', 2], ['well-being', 2], ['mind-body', 2], ['mind body', 2], ['burnout', 2], ['anxiety', 2], ['stress', 1], ['self-care', 2], ['resilience', 1], ['mompreneur', 2], ['webinar', 1], ['reset', 1], ['saboteur', 2]],
    work: [['hr', 2], ['human resources', 3], ['talent', 2], ['recruit', 2], ['people ops', 3], ['people operations', 3], ['director', 2], ['vp', 2], ['vice president', 2], ['chief', 2], ['ceo', 2], ['cfo', 2], ['coo', 2], ['manager', 1], ['engineer', 1], ['executive', 2], ['leadership', 2], ['career', 2], ['resume', 2], ['interview', 2], ['linkedin', 1], ['salary', 2], ['negotiation', 1], ['promotion', 1], ['team', 1], ['corporate', 2], ['consulting', 1], ['advisory', 1], ['accelerator', 2], ['job search', 2], ['hiring', 2]]
  };
  var FREEMAIL = /^(gmail|googlemail|yahoo|ymail|hotmail|outlook|live|msn|aol|icloud|me|mac|proton|protonmail|pm|gmx|zoho|mail|comcast|sbcglobal|att|verizon|bellsouth|charter|cox)\.(com|net|org|me|co|uk|de|fr|ca)(\.\w\w)?$/;
  var ROLE = /^(info|admin|hello|contact|support|sales|office|hr|jobs|careers|team|noreply|no-reply|donotreply|marketing|billing|accounts|webmaster|postmaster|abuse|help|enquiries|inquiries)$/;
  var TYPO = { 'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.con': 'gmail.com', 'gnail.com': 'gmail.com', 'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com', 'yahoo.con': 'yahoo.com', 'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'outlok.com': 'outlook.com', 'outlook.con': 'outlook.com', 'iclod.com': 'icloud.com', 'icoud.com': 'icloud.com' };
  var DISPOSABLE = /^(mailinator|guerrillamail|10minutemail|tempmail|temp-mail|yopmail|trashmail|sharklasers|getnada|dispostable)\./;
  var EMAIL = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,24}$/;

  function cleanEmail(raw) {
    var s = String(raw || '').trim().replace(/^mailto:/i, '');
    var angle = /<([^>]+)>/.exec(s); if (angle) s = angle[1]; // "Jane Doe <jane@x.com>"
    s = s.replace(/[\s ​]+/g, '').replace(/[;,.]+$/, '').toLowerCase();
    return s;
  }
  function checkEmail(e) {
    if (!e) return { ok: false, reason: 'empty' };
    if ((e.match(/@/g) || []).length !== 1) return { ok: false, reason: 'not an email' };
    if (/\.\./.test(e) || /^\./.test(e) || /\.@/.test(e)) return { ok: false, reason: 'invalid dots' };
    if (!EMAIL.test(e)) return { ok: false, reason: 'invalid format' };
    var parts = e.split('@'), local = parts[0], dom = parts[1];
    if (TYPO[dom]) return { ok: false, reason: 'domain typo, did you mean ' + local + '@' + TYPO[dom] + '?', fix: local + '@' + TYPO[dom] };
    if (DISPOSABLE.test(dom)) return { ok: false, reason: 'disposable address' };
    return { ok: true, role: ROLE.test(local), free: FREEMAIL.test(dom), domain: dom };
  }
  function consentOf(header, value) {
    var h = key(header), v = String(value || '').trim().toLowerCase();
    if (v === '') return null;
    var neg = /^(no|n|false|0|unsubscribed|opted out|opt-out|optout|bounced|cleaned|declined|do not email)$/.test(v);
    var pos = /^(yes|y|true|1|subscribed|opted in|opt-in|optin|confirmed|active|x)$/.test(v);
    var inverted = /unsubscribed|donotemail|optout/.test(h);
    if (inverted) return pos ? false : neg ? true : null;
    return neg ? false : pos ? true : null;
  }
  var COMPILED = {}; // keyword regexes built once, not per contact
  VERTICALS.forEach(function (v) {
    COMPILED[v] = RULES[v].map(function (r) { return [new RegExp('(^|[^a-z0-9])' + r[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z0-9]|$)'), r[1], r[0]]; });
  });
  function score(text) {
    var t = ' ' + String(text || '').toLowerCase().replace(/[^a-z0-9@.\- ]+/g, ' ') + ' ', s = { work: 0, live: 0, play: 0 }, hits = [];
    if (t.trim() === '') return { s: s, hits: hits };
    VERTICALS.forEach(function (v) {
      COMPILED[v].forEach(function (r) { if (r[0].test(t)) { s[v] += r[1]; hits.push(v + ':' + r[2]); } });
    });
    return { s: s, hits: hits };
  }

  /** Map a header row to fields. Returns {map, unknown} */
  function mapHeaders(row) {
    var map = {}, unknown = [];
    row.forEach(function (h, i) {
      var f = ALIAS[key(h)];
      if (!f) {
        var k = key(h);
        if (/email/.test(k) && map.email === undefined) f = 'email';
        else if (/consent|subscri|optin|optout/.test(k)) f = 'consent';
      }
      if (f && f !== 'tags' && map[f] === undefined) map[f] = i;
      else if (f === 'tags') (map.tags = map.tags || []).push(i);
      else if (String(h).trim()) unknown.push(String(h).trim());
    });
    return { map: map, unknown: unknown };
  }
  function findHeaderRow(rows) {
    for (var i = 0; i < Math.min(rows.length, 15); i++) {
      var m = mapHeaders(rows[i] || []).map;
      if (m.email !== undefined) return i;
    }
    return -1;
  }

  /**
   * @param files [{name, sheets:[{name, rows}]}]
   * @returns {contacts, rejects, stats}
   */
  function run(files, opts) {
    opts = opts || {};
    var byEmail = Object.create(null), rejects = [], stats = { files: files.length, sheets: 0, rows: 0, noHeader: [], duplicatesMerged: 0 };
    files.forEach(function (f) {
      f.sheets.forEach(function (sh) {
        stats.sheets++;
        var hi = findHeaderRow(sh.rows);
        if (hi < 0) { if (sh.rows.some(function (r) { return r && r.join('').trim(); })) stats.noHeader.push(f.name + ' › ' + sh.name); return; }
        var hdr = sh.rows[hi], mh = mapHeaders(hdr), m = mh.map;
        var context = (f.name.replace(/\.(xlsx|csv|txt)$/i, '') + ' ' + sh.name).replace(/[_-]+/g, ' ');
        for (var r = hi + 1; r < sh.rows.length; r++) {
          var row = sh.rows[r] || [];
          if (!row.join('').trim()) continue;
          stats.rows++;
          var where = f.name + ' › ' + sh.name + ' › row ' + (r + 1);
          var email = cleanEmail(row[m.email]);
          var chk = checkEmail(email);
          if (!chk.ok) { rejects.push({ email: email || '(blank)', raw: row[m.email] || '', reason: chk.reason, fix: chk.fix || '', where: where }); continue; }
          var first = String(row[m.first] || '').trim(), last = String(row[m.last] || '').trim();
          var angleName = /^\s*"?([^"<]+?)"?\s*</.exec(String(row[m.email] || ''));
          if (!first && !last && angleName && m.full === undefined) { var an = angleName[1].trim().split(/\s+/); first = an[0]; last = an.slice(1).join(' '); }
          if (!first && !last && angleName) { var an2 = angleName[1].trim().split(/\s+/); first = an2[0]; last = an2.slice(1).join(' '); }
          if (!first && !last && m.full !== undefined) {
            var full = String(row[m.full] || '').trim().replace(/\s+/g, ' ');
            if (full.indexOf(',') > 0) { var p = full.split(','); last = p[0].trim(); first = p.slice(1).join(' ').trim(); }
            else { var sp = full.indexOf(' '); first = sp > 0 ? full.slice(0, sp) : full; last = sp > 0 ? full.slice(sp + 1) : ''; }
          }
          var text = [row[m.title], row[m.company]].concat((m.tags || []).map(function (i) { return row[i]; })).join(' ');
          var explicit = m.vertical !== undefined ? String(row[m.vertical] || '').toLowerCase() : '';
          var consent = m.consent !== undefined ? consentOf(hdr[m.consent], row[m.consent]) : null;
          var c = byEmail[email];
          if (!c) {
            c = byEmail[email] = { email: email, first: first, last: last, text: [], context: [], explicit: [], consent: [], role: chk.role, free: chk.free, domain: chk.domain, sources: [] };
          } else {
            stats.duplicatesMerged++;
            if (!c.first && first) c.first = first;
            if (!c.last && last) c.last = last;
          }
          c.text.push(text); c.context.push(context); c.sources.push(where);
          if (explicit) c.explicit.push(explicit);
          if (consent !== null) c.consent.push(consent);
        }
      });
    });

    var contacts = Object.keys(byEmail).map(function (e) {
      var c = byEmail[e], reasons = [];
      var ex = c.explicit.map(function (x) { return VERTICALS.filter(function (v) { return x.indexOf(v) >= 0; }); }).reduce(function (a, b) { return a.concat(b); }, []);
      var sc = score(c.text.join(' ')), ctx = score(c.context.join(' '));
      var total = { work: sc.s.work * 2 + ctx.s.work, live: sc.s.live * 2 + ctx.s.live, play: sc.s.play * 2 + ctx.s.play };
      if (!c.free && c.domain && !ex.length) total.work += 1; // company address: weak Work signal
      var seg, why;
      var uniq = ex.filter(function (v, i) { return ex.indexOf(v) === i; });
      if (uniq.length === 1) { seg = uniq[0]; why = 'vertical column says ' + seg; }
      else {
        var ranked = VERTICALS.slice().sort(function (a, b) { return total[b] - total[a]; });
        var top = total[ranked[0]], second = total[ranked[1]];
        if (uniq.length > 1) { seg = 'review'; why = 'vertical column lists ' + uniq.join(' + '); }
        else if (top === 0) { seg = 'review'; why = 'no Work/Live/Play signal in any column or file name'; }
        else if (top - second < 2) { seg = 'review'; why = 'close call: ' + ranked[0] + ' ' + top + ' vs ' + ranked[1] + ' ' + second; }
        else { seg = ranked[0]; why = 'score ' + VERTICALS.map(function (v) { return v + ' ' + total[v]; }).join(', ') + ' (' + sc.hits.concat(ctx.hits).slice(0, 4).join('; ') + ')'; }
      }
      var consent = c.consent.length ? (c.consent.indexOf(false) >= 0 ? false : true) : null; // any "no" wins
      var bucket = seg;
      if (consent === false) { bucket = 'do-not-import'; reasons.push('opted out or unsubscribed in ' + c.sources.length + ' source(s)'); }
      else if (c.role && bucket !== 'review') { reasons.push('role address (' + c.email.split('@')[0] + '@): check consent before mailing'); }
      if (consent === null && opts.requireConsent && bucket !== 'do-not-import') { bucket = 'review'; reasons.push('no consent column'); }
      return { email: c.email, first: c.first, last: c.last, segment: seg, bucket: bucket, why: why, notes: reasons.join('; '), consent: consent, sources: c.sources.length, role: c.role, scores: total };
    });
    contacts.sort(function (a, b) { return a.email < b.email ? -1 : 1; });
    stats.unique = contacts.length;
    stats.rejected = rejects.length;
    stats.buckets = { work: 0, live: 0, play: 0, review: 0, 'do-not-import': 0 };
    contacts.forEach(function (c) { stats.buckets[c.bucket]++; });
    return { contacts: contacts, rejects: rejects, stats: stats };
  }

  // safe=true (review/reject files people open in Excel): neutralise leading = + - @ so a cell can't run as a formula.
  function csvCell(v, safe) {
    v = String(v == null ? '' : v);
    if (safe && /^[=+\-@\t\r]/.test(v)) v = "'" + v;
    return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }
  function safeCell(v) { return csvCell(v, true); }
  /** Squarespace Email Campaigns import: email first, then first name, last name (Mailchimp-export layout). */
  function toSquarespaceCsv(list) {
    return ['Email Address,First Name,Last Name'].concat(list.map(function (c) { return [c.email, c.first, c.last].map(csvCell).join(','); })).join('\r\n') + '\r\n';
  }
  function toReviewCsv(list) {
    return ['Email Address,First Name,Last Name,Suggested,Why,Notes,Sources'].concat(list.map(function (c) { return [c.email, c.first, c.last, c.segment, c.why, c.notes, c.sources].map(safeCell).join(','); })).join('\r\n') + '\r\n';
  }
  function toRejectCsv(list) {
    return ['Value,Reason,Suggested fix,Where'].concat(list.map(function (r) { return [r.raw || r.email, r.reason, r.fix, r.where].map(safeCell).join(','); })).join('\r\n') + '\r\n';
  }

  var api = { run: run, cleanEmail: cleanEmail, checkEmail: checkEmail, score: score, mapHeaders: mapHeaders, consentOf: consentOf, toSquarespaceCsv: toSquarespaceCsv, toReviewCsv: toReviewCsv, toRejectCsv: toRejectCsv, RULES: RULES };
  root.Segmenter = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
