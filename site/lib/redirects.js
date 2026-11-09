/* URL Mappings for the consolidation: old paths found on the live site's navigation -> new pages.
   Format is Squarespace's: "/old -> /new 301", one per line. Validator catches the mistakes that
   break redirects silently: loops, chains, duplicates, missing slashes, targets that don't exist. */
(function (root) {
  var NEW_PAGES = ['/', '/about', '/consulting-advisory', '/movement-stage', '/programs-intensives', '/reinvention-accelerator', '/fiercely-feminine-mind-body-reset-intensive', '/results', '/intake', '/resources'];
  var MAP = [
    ['/services-chooseyourpath', '/', 'Start Here → Home “Choose Your Path” cards'],
    ['/services-chooseyourpath-1', '/', 'duplicate of Start Here'],
    ['/workempoweredservices', '/consulting-advisory', 'WORK Empowered → Consulting & Advisory (Work + Live)'],
    ['/liveempoweredservices', '/consulting-advisory', 'LIVE Empowered → Consulting & Advisory (Work + Live)'],
    ['/services-workempowered', '/consulting-advisory', 'old services overview'],
    ['/playempoweredservices', '/movement-stage', 'PLAY Empowered → Movement & Stage'],
    ['/testimonials', '/results', 'Results'],
    ['/about-whoisasali', '/about', 'blueprint keeps this page’s lineage content on About'],
    ['/contact', '/intake', 'old page offers a free 15-min discovery call to anyone; route to the screened intake']
  ];
  var KEEP = [
    ['/fiercely-feminine-mind-body-reset-intensive', 'existing sales page; linked from Programs & Intensives'],
    ['/rsvp', 'Classes / Shows / Events: keep live, link from Movement & Stage (confirm)'],
    ['/clientsuccess-stories-empoweredbyasali/*', 'case-study posts stay; Results links to them'],
    ['/cart', 'store stays reachable; health products leave the navigation']
  ];
  function text(map) { return (map || MAP).map(function (m) { return m[0] + ' -> ' + m[1] + ' 301'; }).join('\n'); }

  function parse(src) {
    var rules = [], errors = [];
    String(src).split(/\r?\n/).forEach(function (line, i) {
      var l = line.trim();
      if (!l || l[0] === '#') return;
      var m = /^(\S+)\s+->\s+(\S+)\s+(301|302)$/.exec(l);
      if (!m) { errors.push('line ' + (i + 1) + ': expected “/old -> /new 301”, got “' + l + '”'); return; }
      if (m[1][0] !== '/') errors.push('line ' + (i + 1) + ': source must start with “/”');
      if (m[2][0] !== '/' && !/^https?:\/\//.test(m[2])) errors.push('line ' + (i + 1) + ': target must start with “/” or http(s)://');
      rules.push({ from: m[1].toLowerCase().replace(/\/$/, '') || '/', to: m[2].replace(/\/$/, '') || '/', code: +m[3], line: i + 1 });
    });
    return { rules: rules, errors: errors };
  }
  function validate(src, pages) {
    pages = pages || NEW_PAGES;
    var p = parse(src), issues = p.errors.slice(), seen = {};
    p.rules.forEach(function (r) {
      if (seen[r.from]) issues.push('line ' + r.line + ': ' + r.from + ' is already redirected on line ' + seen[r.from]);
      seen[r.from] = r.line;
      if (r.from === r.to) issues.push('line ' + r.line + ': ' + r.from + ' redirects to itself');
      if (r.to[0] === '/' && pages.indexOf(r.to) < 0 && !p.rules.some(function (x) { return x.from === r.to; })) issues.push('line ' + r.line + ': target ' + r.to + ' is not a page on the new site');
      if (r.code === 302) issues.push('line ' + r.line + ': 302 is temporary; consolidation should use 301');
    });
    p.rules.forEach(function (r) { // chains and loops
      var hops = [r.from], cur = r.to, guard = 0;
      while (guard++ < 20) {
        var nx = p.rules.filter(function (x) { return x.from === cur; })[0];
        if (!nx) break;
        if (hops.indexOf(nx.from) >= 0 || nx.to === r.from) { issues.push('line ' + r.line + ': redirect loop ' + hops.concat(nx.from, nx.to).join(' → ')); return; }
        hops.push(nx.from); cur = nx.to;
      }
      if (hops.length > 1) issues.push('line ' + r.line + ': chain ' + hops.concat(cur).join(' → ') + ' (point it straight at ' + cur + ')');
    });
    return { rules: p.rules, issues: issues };
  }
  var api = { MAP: MAP, KEEP: KEEP, NEW_PAGES: NEW_PAGES, text: text, parse: parse, validate: validate };
  root.Redirects = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
