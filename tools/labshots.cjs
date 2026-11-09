const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const out = process.argv[2] || '/tmp/alab';
  for (const [w, h, tag] of [[1440, 900, 'd'], [390, 844, 'm']]) {
    const p = await b.newPage({ viewport: { width: w, height: h } }); const errs = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
    await p.goto('http://127.0.0.1:8311/'); await p.waitForSelector('body[data-ready="1"]'); await p.evaluate(() => document.fonts.ready);
    for (const id of ['overview', 'prototype', 'navigation', 'contacts', 'intake', 'build', 'tests', 'plan']) {
      await p.click(`.tabs a[href="#${id}"]`); await p.waitForTimeout(250);
      if (id === 'contacts') { await p.click('#samples'); await p.waitForSelector('#seg-out:not([hidden])'); await p.waitForTimeout(300); }
      if (id === 'intake') { await p.click('#typed'); }
      if (id === 'prototype') await p.waitForTimeout(900);
      const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      await p.screenshot({ path: `${out}-${tag}-${id}.png`, fullPage: true });
      console.log(tag, id, 'overflow', ov);
    }
    console.log(tag, 'errors:', errs.join(' | ') || 'none'); await p.close();
  }
  await b.close();
})();
