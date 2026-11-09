// Screenshots of every prototype page at desktop and phone + layout checks.
const { chromium } = require('playwright');
const pages = ['index', 'consulting-advisory', 'programs-intensives', 'movement-stage', 'about', 'results', 'intake'];
const OUT = process.argv[2] || '/tmp/proto';
(async () => {
  const b = await chromium.launch(); const report = [];
  for (const [w, h, tag, dpr] of [[1440, 900, 'd', 1], [390, 844, 'm', 2]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: tag === 'm', hasTouch: tag === 'm' });
    for (const p of pages) {
      const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
      await pg.goto(`http://127.0.0.1:8311/proto/${p}.html`); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(100);
      const m = await pg.evaluate(() => {
        const ov = document.documentElement.scrollWidth - document.documentElement.clientWidth;
        const small = [...document.querySelectorAll('a,button,input,select,textarea,summary,label')].filter(e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && (r.height < 40 && !e.closest('p,li,td') ); }).map(e => (e.textContent || e.name || e.tagName).trim().slice(0, 30));
        const nav = [...document.querySelectorAll('.header-nav > .header-nav-item')].length;
        const btn = document.querySelectorAll('.header-actions .btn').length;
        const cards = [...document.querySelectorAll('.path-card')].map(c => { const cs = getComputedStyle(c); return cs.borderTopColor + '|' + cs.borderTopWidth + '|' + cs.boxShadow; });
        return { ov, small: small.slice(0, 6), nav, btn, cards };
      });
      await pg.screenshot({ path: `${OUT}-${tag}-${p}.png`, fullPage: true });
      report.push({ tag, p, ...m, errs }); console.log(tag, p, JSON.stringify(m), errs.join('|'));
      await pg.close();
    }
    await ctx.close();
  }
  require('fs').writeFileSync(OUT + '-report.json', JSON.stringify(report, null, 1)); await b.close();
})();
