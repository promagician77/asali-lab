// Viewport crops of the prototype and lab for the 2-page PDF.
const { chromium } = require('playwright');
const OUT = __dirname + '/pdf-img/';
(async () => {
  const b = await chromium.launch();
  const d = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const m = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  async function shot(ctx, url, file, opts = {}) {
    const p = await ctx.newPage(); await p.goto('http://127.0.0.1:8311/' + url); await p.evaluate(() => document.fonts.ready);
    if (opts.before) await opts.before(p);
    await p.waitForTimeout(200);
    if (opts.sel) { const el = await p.$(opts.sel); await el.scrollIntoViewIfNeeded(); await el.screenshot({ path: OUT + file, type: 'jpeg', quality: 86 }); }
    else await p.screenshot({ path: OUT + file, type: 'jpeg', quality: 86, clip: opts.clip });
    await p.close();
  }
  await shot(d, 'proto/index.html', 'home-d.jpg');
  await shot(m, 'proto/index.html', 'home-m.jpg');
  await shot(d, 'proto/consulting-advisory.html', 'matrix-d.jpg', { sel: '.matrix, table' });
  await shot(d, 'proto/about.html', 'fit-d.jpg', { sel: '.fit' });
  await b.close();
})();
