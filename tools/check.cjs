// Launch checks on the seven prototype pages in a real browser (Chromium via Playwright) at desktop,
// tablet and phone widths. Writes site/data/checks.json.
//   node tools/check.cjs [baseUrl]
const { chromium } = require("playwright");
const fs = require("fs");

const BASE = process.argv[2] || "http://127.0.0.1:8311";
const PAGES = ["index", "consulting-advisory", "programs-intensives", "movement-stage", "about", "results", "intake"], WIDTHS = [1440, 1024, 390];
const STYLE = {};

async function measure(page) {
  return page.evaluate((STYLE) => {
    const lum = (c) => { const m = c.match(/[\d.]+/g).map(Number); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return { L: 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]), a: m[3] ?? 1, rgb: m.slice(0, 3) }; };
    const solidBg = (el) => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; const m = c.match(/[\d.]+/g); if (m && (m[3] === undefined || +m[3] > 0.5)) return c; } return "rgb(255,255,255)"; };
    const opac = (el) => { let o = 1; for (let e = el; e; e = e.parentElement) o *= +getComputedStyle(e).opacity; return o; };
    const blend = (fg, bg, a) => fg.map((v, i) => v * a + bg[i] * (1 - a));
    const toL = (rgb) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]); };
    const visible = (el) => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none"; };
    // text elements that hold their own text, in the new canvases only (header/footer are existing site canvases)
    const texts = [...document.querySelectorAll("main *, .header *, .footer *")].filter((el) => visible(el) && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
    let minFont = 99, minFontText = "", worst = { ratio: 99 }, below = [];
    for (const el of texts) {
      const cs = getComputedStyle(el), fs = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 600;
      if (fs < minFont) { minFont = fs; minFontText = el.textContent.trim().slice(0, 40); }
      const fg = lum(cs.color), bg = lum(solidBg(el)), a = (fg.a ?? 1) * opac(el);
      const L1 = toL(blend(fg.rgb, bg.rgb, a)), L2 = bg.L, ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      const large = fs >= 24 || (bold && fs >= 18.66), need = large ? 3 : 4.5;
      if (ratio < worst.ratio) worst = { ratio: +ratio.toFixed(2), text: el.textContent.trim().slice(0, 40), need };
      if (ratio < need) below.push({ text: el.textContent.trim().slice(0, 40), ratio: +ratio.toFixed(2), need });
    }
    // tap targets: links and buttons that are not inline links inside running text
    const targets = [...document.querySelectorAll("main a, main button, .header a, .header button, main input, main select, main textarea")].filter((el) => visible(el) && !el.closest("label") && !(el.closest("p") && getComputedStyle(el).display === "inline"));
    let minTarget = { size: 999 }, under44 = 0, under24 = 0;
    for (const el of targets) { const r = el.getBoundingClientRect(), s = Math.min(r.width, r.height); if (s < minTarget.size) minTarget = { size: Math.round(s), text: (el.textContent.trim() || el.getAttribute("aria-label") || "").slice(0, 30) }; if (s < 44) under44++; if (s < 24) under24++; }
    const heads = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter(visible).map((h) => ({ tag: h.tagName, text: h.textContent.trim().replace(/\s+/g, " ").slice(0, 60) }));
    let skipped = 0; for (let i = 1; i < heads.length; i++) if (+heads[i].tag[1] > +heads[i - 1].tag[1] + 1) skipped++;
    const links = [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href"));
    const faqLinks = links.filter((h) => h.startsWith("/faq/"));
    const generic = [...document.querySelectorAll("a")].filter((a) => /^(click here|read more|learn more|here)$/i.test(a.textContent.trim())).length;
    const c = document.createElement("canvas").getContext("2d"); c.font = "20px Arial";
    const title = document.title, desc = document.querySelector('meta[name="description"]')?.content || "";
    const imgs = [...document.querySelectorAll("main img, main [role=img]")];
    const imgNoAlt = imgs.filter((i) => i.tagName === "IMG" ? !(i.getAttribute("alt") || "").trim() : !(i.getAttribute("aria-label") || "").trim()).length;
    const imgNoSize = [...document.querySelectorAll("main img")].filter((i) => !i.getAttribute("width") || !i.getAttribute("height")).length;
    const fields = [...document.querySelectorAll("main input, main select, main textarea")];
    const unlabeled = fields.filter((f) => !(f.id && document.querySelector(`label[for="${f.id}"]`)) && !f.closest("label") && !f.getAttribute("aria-label")).length;
    const canvases = [];
    // blueprint conformance
    const navLinks = [...document.querySelectorAll(".header-nav > .header-nav-item")].map((n) => n.textContent.trim().replace(/\s+/g, " "));
    const headerBtn = [...document.querySelectorAll(".header-actions .btn")].map((b) => b.textContent.trim());
    const pathCards = [...document.querySelectorAll(".path-card")].map((c) => { const cs = getComputedStyle(c); return { border: cs.borderTopColor, width: cs.borderTopWidth, shadow: cs.boxShadow }; });
    const fitPanels = [...document.querySelectorAll(".fit > div")].map((c) => getComputedStyle(c).borderTopColor);
    const healthInHeader = /wellness products|health/i.test(document.querySelector(".header")?.textContent || "");
    return {
      title, titleChars: title.length, titlePx: Math.round(c.measureText(title).width), desc, descChars: desc.length,
      h1: heads.filter((h) => h.tag === "H1").length, h1Text: heads.filter((h) => h.tag === "H1").map((h) => h.text), headings: heads.length, skipped, outline: heads,
      links: links.length, faqLinks: faqLinks.length, faqLinksUnique: new Set(faqLinks).size, genericLinkText: generic,
      minFont, minFontText, minTarget, under44, under24, targets: targets.length,
      contrastWorst: worst, contrastFails: below.length, contrastFailList: below.slice(0, 5),
      overflow: document.documentElement.scrollWidth > innerWidth, height: document.documentElement.scrollHeight, canvases,
      images: imgs.length, imgNoAlt, imgNoSize, fields: fields.length, unlabeled, navLinks, headerBtn, pathCards, fitPanels, healthInHeader,
    };
  }, STYLE);
}

(async () => {
  const b = await chromium.launch(); const out = { when: new Date().toISOString(), browser: b.version(), runs: [] };
  for (const pg of PAGES) for (const w of WIDTHS) {
    const p = await b.newPage({ viewport: { width: w, height: 900 } });
    await p.addInitScript(() => { window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true }); });
    await p.goto(`${BASE}/proto/${pg}.html`); await p.evaluate(() => document.fonts.ready);
    // scroll through so lazy images load and reveal animations run, as a visitor would
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)); } scrollTo(0, 0); await new Promise((r) => setTimeout(r, 1300)); });
    const m = await measure(p); m.cls = +(await p.evaluate(() => window.__cls)).toFixed(4);
    out.runs.push({ page: pg, width: w, ...m }); await p.close();
    console.log(pg.padEnd(9), String(w).padStart(4), `h1=${m.h1} skip=${m.skipped} title=${m.titleChars}c/${m.titlePx}px desc=${m.descChars} img=${m.images} noAlt=${m.imgNoAlt} noSize=${m.imgNoSize} fields=${m.fields} unlabeled=${m.unlabeled} minFont=${m.minFont} minTarget=${m.minTarget.size}(${m.minTarget.text}) <44=${m.under44} contrastMin=${m.contrastWorst.ratio}(${m.contrastWorst.text}) fails=${m.contrastFails} cls=${m.cls} overflow=${m.overflow}`);
  }
  await b.close();
  fs.mkdirSync("site/data", { recursive: true }); fs.writeFileSync(process.argv[3] || "site/data/checks.json", JSON.stringify(out, null, 1));
})();
