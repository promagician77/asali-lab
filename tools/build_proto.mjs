// Builds the prototype pages from the blueprint's own copy. node tools/build_proto.mjs
import fs from 'fs';
const OUT = new URL('../site/proto/', import.meta.url).pathname;

const NAV = [
  ['about.html', 'About'],
  ['consulting-advisory.html', 'Consulting & Advisory'],
  ['movement-stage.html', 'Movement & Stage'],
  ['FOLDER', 'Programs & Intensives', [
    ['programs-intensives.html', 'All programs & intensives', 'Overview of both'],
    ['programs-intensives.html#accelerator', 'The Reinvention Accelerator', 'Cohort · apply via intake'],
    ['programs-intensives.html#fiercely-feminine', 'Fiercely Feminine Mind-Body Reset', 'Links to the existing sales page']]],
  ['results.html', 'Results'],
];
const photo = (cls, title, brief, h = '') => `<figure class="photo ${cls}"${h ? ` style="min-height:${h}"` : ''}><figcaption><b>${title}</b>${brief}</figcaption></figure>`;

function header(cur) {
  const items = NAV.map(n => {
    if (n[0] === 'FOLDER') {
      return `<div class="header-nav-item header-nav-item--folder"><button class="header-nav-folder-title" aria-expanded="false" aria-haspopup="true">${n[1]}</button><div class="header-nav-folder-content">${n[2].map(s => `<a href="${s[0]}">${s[1]}<small>${s[2]}</small></a>`).join('')}</div></div>`;
    }
    return `<div class="header-nav-item"><a href="${n[0]}"${cur === n[0] ? ' aria-current="page"' : ''}>${n[1]}</a></div>`;
  }).join('');
  const mobile = NAV.map(n => n[0] === 'FOLDER'
    ? `<details><summary>${n[1]}</summary>${n[2].map(s => `<a href="${s[0]}">${s[1]}</a>`).join('')}</details>`
    : `<a href="${n[0]}">${n[1]}</a>`).join('');
  return `<a class="skip" href="#main">Skip to content</a>
<header class="header"><div class="wrap header-inner">
<a class="header-title" href="index.html">Empowered by Asali</a>
<nav class="header-nav" aria-label="Main">${items}</nav>
<div class="header-actions"><a class="btn btn-primary" href="intake.html">Apply for Strategy Call</a></div>
<button class="burger" aria-label="Open menu" aria-expanded="false" aria-controls="mm"><span></span><span></span><span></span></button>
</div><nav class="mobile-menu" id="mm" aria-label="Mobile">${mobile}<a class="btn btn-primary" href="intake.html">Apply for Strategy Call</a></nav></header>`;
}
const footer = `<section class="section cta-band"><div class="wrap">
<p class="eyebrow">Work · Live · Play</p><h2>Ready for the high-stakes moment?</h2>
<p class="lede">Eight questions, about four minutes. If it's a fit, you'll get a strategy-call link straight away. If not yet, you'll get resources you can start with today.</p>
<a class="btn btn-gold btn-bracket" href="intake.html">Apply for Strategy Call</a></div></section>
<footer class="footer"><div class="wrap"><div class="cols">
<div><div class="brand">Empowered by Asali</div><p>The Work-Live-Play Strategist. Chicago, IL.</p></div>
<div><ul><li><a href="about.html">About</a></li><li><a href="consulting-advisory.html">Consulting &amp; Advisory</a></li><li><a href="movement-stage.html">Movement &amp; Stage</a></li><li><a href="programs-intensives.html">Programs &amp; Intensives</a></li><li><a href="results.html">Results</a></li></ul></div>
<div><ul><li><a href="intake.html">Apply for Strategy Call</a></li><li><a href="#">Instagram</a></li><li><a href="#">LinkedIn</a></li><li><a href="#">YouTube</a></li></ul></div>
</div><div class="legal"><span>© 2026 Empowered by Asali, LLC</span><span><a href="#">Privacy Policy</a> · <a href="#">Terms of Use</a> · <a class="discreet" href="#" title="Kept out of navigation and search, per the blueprint">Wellness products</a></span></div></div></footer>
<div class="proto-badge">PROTOTYPE · not the live site</div>`;

const DESC = {
  "index.html": "Clear internal noise, handle high-pressure moments with composure, and execute with quiet confidence using The 3R System™.",
  "consulting-advisory.html": "Leadership, career and organizational advisory for executives, VPs, directors, HR leaders and growing teams.",
  "programs-intensives.html": "The Reinvention Accelerator cohort and the Fiercely Feminine Mind-Body Reset Intensive.",
  "movement-stage.html": "MENAHT dance technique, embodied stage presence and the commercial business of art.",
  "about.html": "Asali N. Locke-Ellison: corporate talent strategy, Positive Intelligence coaching and MENAHT dance lineage.",
  "results.html": "Documented outcomes: a CFO, a senior engineer and a tech department lead.",
  "intake.html": "Apply for a strategy call: eight questions, one clear next step."
};
function page(file, title, body, cur) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>${title} · Empowered by Asali (prototype)</title><meta name="description" content="${DESC[file]}">
<link rel="preload" href="../fonts/dm-serif-display-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="../fonts/work-sans-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="proto.css"></head><body>${header(cur)}<main id="main">${body}</main>${file === 'intake.html' ? '' : footer}
${file === 'intake.html' ? '<div class="proto-badge">PROTOTYPE · not the live site</div><footer class="footer"><div class="wrap"><div class="legal"><span>© 2026 Empowered by Asali, LLC</span><span><a href="#">Privacy Policy</a> · <a href="#">Terms of Use</a></span></div></div></footer><script src="../lib/funnel.js"></script>' : ''}<script src="proto.js"></script></body></html>`;
  fs.writeFileSync(OUT + file, html);
}

/* ---------- HOME ---------- */
page('index.html', 'Home', `
<section class="hero">
  <div class="hero-copy">
    <p class="eyebrow">The 3R System™: Regulate • Relate • Refocus</p>
    <h1>High-Stakes Moments Require More Than Motivation.</h1>
    <p class="lede">Clear internal noise, handle high-pressure environments with composure, and execute with quiet confidence using The 3R System™.</p>
    <div class="stack-btns"><a class="btn btn-gold btn-bracket" href="consulting-advisory.html">Explore Leadership &amp; Advisory</a><a class="btn btn-dark btn-bracket" href="movement-stage.html">Explore Movement &amp; Stage</a></div>
  </div>
  <div class="hero-media">
    ${photo('', 'Hero portrait · photo direction', 'High-contrast, professional portrait of Asali in sharp modern attire (clean blazer or structured architectural dress) in an executive setting. Warmth, direct gaze, calm authority. No generic smiling stock-coach imagery.')}
    <svg class="ring" viewBox="0 0 150 150" aria-hidden="true"><defs><path id="c" d="M75,75 m-58,0 a58,58 0 1,1 116,0 a58,58 0 1,1 -116,0"/></defs><text><textPath href="#c">THE WORK-LIVE-PLAY STRATEGIST · </textPath></text></svg>
  </div>
</section>
<div class="name-band"><div class="wrap">ASALI N. LOCKE-ELLISON</div></div>

<section class="section dark"><div class="wrap">
  <p class="eyebrow">The problem &amp; the method</p>
  <h2 class="quote">“Most high-achievers don't have a talent problem; they have a noise problem.”</h2>
  <div class="r3">
    <div><span class="k">REGULATE · Emotions</span><h3>Regulate</h3><p>Calibrate your nervous system and manage anxiety when the stakes are high, so emotional noise never derails your performance.</p></div>
    <div><span class="k">RELATE · Better to others</span><h3>Relate</h3><p>Improve communication, collaboration, and executive connection without relying on fake corporate personas or canned scripts.</p></div>
    <div><span class="k">REFOCUS · Thoughts</span><h3>Refocus</h3><p>Cut through brain fog and eliminate internal clutter so you can prioritize cleanly, stop overthinking, and act with decisive clarity.</p></div>
  </div>
</div></section>

<section class="section" id="choose-your-path"><div class="wrap">
  <p class="eyebrow">Choose your path</p><h2>Two ways to work with Asali</h2>
  <div class="paths">
    <article class="path-card"><span class="tag">Path 1 · Work + Live</span><h3>Leadership &amp; Advisory</h3><p>Executive transitions, resume &amp; personal brand positioning, interview anxiety management, salary negotiation, and team performance turnarounds.</p><a class="btn btn-dark" href="consulting-advisory.html">Explore Advisory Programs →</a></article>
    <article class="path-card"><span class="tag">Path 2 · Play</span><h3>Movement &amp; Stage</h3><p>MENAHT dance technique, embodied presence, keynote performance design, and creative career navigation.</p><a class="btn btn-dark" href="movement-stage.html">Explore Movement Programs →</a></article>
  </div>
</div></section>

<section class="section cream2"><div class="wrap">
  <p class="eyebrow">Results</p><h2>Documented outcomes</h2>
  <div class="cases">
    <article class="case"><div class="who">Michael M.</div><div class="role">CFO</div><p>Career advancement &amp; executive EQ transformation under pressure.</p><a class="link-arrow" href="results.html">Read the story</a></article>
    <article class="case"><div class="who">Melinda D.</div><div class="role">Senior Engineer</div><p>Multiple job offers, interview anxiety mastery &amp; salary negotiation.</p><a class="link-arrow" href="results.html">Read the story</a></article>
    <article class="case"><div class="who">Jeff D.</div><div class="role">Tech Department Lead</div><p>Strategic talent acquisition &amp; high-retention team building.</p><a class="link-arrow" href="results.html">Read the story</a></article>
  </div>
</div></section>`, 'index.html');

/* ---------- CONSULTING ---------- */
const M = [
  ['REGULATE', 'Quiet Your Mind',
    ['<b>In panel interviews &amp; salary talks:</b> Calibrate nervous system to manage tough questions with calm authority.', '<b>Before presentations:</b> Eliminate physical anxiety before keynotes.', '<b>In high-workload seasons:</b> Stop fire-extinguishing.'],
    ['<b>In high-pressure quarters:</b> Reduce stress-driven turnover and retain key talent.', '<b>During pivots &amp; RTO:</b> Stop reactive management across leadership.', '<b>In delivery windows:</b> Keep leaders operating with composure.']],
  ['RELATE', 'Strengthen Your Presence',
    ['<b>In personal branding &amp; pitch:</b> Distill resume, LinkedIn, and story to command higher compensation.', '<b>When managing up:</b> Navigate politics and command the room without fake personas.', '<b>In career inflection:</b> Position strategic value.'],
    ['<b>In cross-functional teams:</b> Shift polite friction into collaborative execution.', '<b>During PIPs &amp; turnarounds:</b> Rebuild professional trust and accountability.', '<b>In stubborn dynamics:</b> Equip managers to lead without micromanaging.']],
  ['REFOCUS', 'Perform with Confidence',
    ['<b>During career pivots:</b> Cut through overthinking and execute high-priority goals.', '<b>In complex decisions:</b> Eliminate brain fog and paralysis.', '<b>In daily career execution:</b> Align focus with long-term trajectory.'],
    ['<b>During restructuring &amp; RTO:</b> Drive decisive execution without team fatigue.', '<b>In team deliverables:</b> Elevate accountability and speed-to-market.', '<b>In leadership development:</b> Maximize executive ROI.']],
];
page('consulting-advisory.html', 'Consulting & Advisory', `
<section class="section"><div class="wrap two">
  <div><p class="eyebrow">Work + Live · for corporate teams, VPs/Directors, HR decision-makers and mid-career executives</p>
  <h1>Leadership, Career &amp; Organizational Advisory</h1>
  <p class="lede">Practical strategy, emotional fitness, and unshakeable presence for professionals, executive leaders, and growing teams.</p>
  <a class="btn btn-primary" href="intake.html">Apply for Strategy Call</a></div>
  ${photo('room', 'Photo direction', 'Asali actively advising, facilitating, or presenting in front of an engaged group, or working one-on-one across a table. Professional, focused, conversational.', '440px')}
</div></section>
<section class="section dark"><div class="wrap two">
  <div><p class="eyebrow">The grounded leadership reality</p><h2>Grip-Tightener or Fire-Extinguisher?</h2></div>
  <p class="lede mt0">When the pressure spikes, most leaders react in one of two ways: they become the <b>Grip-Tightener</b> (trying to micromanage every detail) or the <b>Fire-Extinguisher</b> (running in ten directions at once). Neither is a character flaw. It is a sign that anxiety and burnout have overwhelmed the nervous system. Powered by <b>Positive Intelligence (PQ)</b> and <b>The 3R System™</b>, we rewire the mental habits that drive second-guessing and team friction.</p>
</div></section>
<section class="section"><div class="wrap">
  <p class="eyebrow">The strategic delivery tiers</p><h2>Two ways in</h2>
  <div class="tiers">
    <article class="tier"><h3>Individual Advisory</h3><div class="range">$1,200 – $5,000+</div><p>Executive career pivots, panel interview prep, compensation negotiation, and burnout recovery.</p><a class="link-arrow" href="intake.html">Apply for Strategy Call</a></article>
    <article class="tier"><h3>Organizational Advisory</h3><div class="range">$5,000 – $50,000+</div><p>Talent turnarounds (PIP recovery), resolving hybrid/RTO friction, cross-functional team alignment, and executive EQ development.</p><a class="link-arrow" href="intake.html">Apply for Strategy Call</a></article>
  </div>
</div></section>
<section class="section cream2"><div class="wrap">
  <p class="eyebrow">The 3R strategic application matrix</p><h2>Where the 3R System™ shows up</h2>
  <table class="matrix"><thead><tr><th>Pillar</th><th>Individual outcomes ($1.2k–$5k)</th><th>Organizational outcomes ($5k–$50k+)</th></tr></thead><tbody>
  ${M.map(r => `<tr><th>${r[0]}<small>${r[1]}</small></th><td data-h="Individual outcomes"><ul>${r[2].map(x => `<li>${x}</li>`).join('')}</ul></td><td data-h="Organizational outcomes"><ul>${r[3].map(x => `<li>${x}</li>`).join('')}</ul></td></tr>`).join('')}
  </tbody></table>
</div></section>`, 'consulting-advisory.html');

/* ---------- PROGRAMS ---------- */
page('programs-intensives.html', 'Programs & Intensives', `
<section class="section"><div class="wrap">
  <p class="eyebrow">Programs &amp; intensives</p><h1>High-touch cohorts and intensives</h1>
  <p class="lede">Two ways to go deeper: a strategic redesign for leaders at a crossroads, and a somatic reset for women carrying heavy mandates.</p>
</div></section>
<section class="section cream2"><div class="wrap">
  <div class="module" id="accelerator">
    <div><p class="eyebrow">Module 1</p><h2>The Reinvention Accelerator</h2><span class="range-chip">$2,500 – $7,500</span>
    <p><b>Strategic Career &amp; Leadership Redesign for High-Achievers.</b> For established leaders, directors, and executives standing at a career or identity crossroad who need to transition from exhaustion to intentional authority.</p>
    <a class="btn btn-primary" href="intake.html">Apply for the Accelerator →</a></div>
    <ol class="phases">
      <li><b>Friction &amp; Capacity Audit</b>Pinpoint where internal over-functioning (“Grip-Tightening”) or reactive drift (“Fire-Extinguishing”) is stalling progress.</li>
      <li><b>Strategic Repositioning</b>Overhaul your commercial narrative, resume branding, and executive market presence.</li>
      <li><b>High-Stakes Execution Blueprint</b>Concrete milestones to negotiate executive pay, secure board/VP seats, or launch specialized advisory offerings with quiet confidence.</li>
    </ol>
  </div>
  <div class="module" id="fiercely-feminine">
    ${photo('lifestyle', 'Photo direction', 'Grounded feminine power: an editorial lifestyle portrait showing vitality, calm strength, and physical ease.', '420px')}
    <div><p class="eyebrow">Module 2</p><h2>Fiercely Feminine — Mind-Body Reset Intensive</h2>
    <p>High-stakes execution demands a resilient, regulated vessel. The Fiercely Feminine Intensive is a deep somatic and mental fitness reset designed to release systemic burnout, reconnect with physical vitality, and reclaim unshakeable embodied power for women carrying heavy professional and personal mandates.</p>
    <a class="btn btn-dark" href="#" title="/fiercely-feminine-mind-body-reset-intensive (existing page, URL unchanged)">View Dedicated Intensive Page →</a></div>
  </div>
</div></section>`, 'programs-intensives.html');

/* ---------- MOVEMENT ---------- */
page('movement-stage.html', 'Movement & Stage', `
<section class="section dark"><div class="wrap two">
  <div><p class="eyebrow">Play</p><h1>Embodied Presence &amp; Stagecraft Strategy</h1>
  <p class="lede">Master MENAHT dance traditions, command high-visibility spaces, and navigate the business of being an artist with commercial confidence.</p>
  <a class="btn btn-gold btn-bracket" href="intake.html">Inquire for Masterclasses &amp; Performance</a></div>
  ${photo('stage', 'Photo direction', 'Dynamic stage photography of Asali performing MENAHT / belly dance under theatrical lighting. Artistry, precision, dignity, and historical lineage.', '480px')}
</div></section>
<section class="section"><div class="wrap">
  <p class="eyebrow">Core pillars of advisory</p><h2>Three ways to train</h2>
  <div class="pillars">
    <div class="pillar"><h3>MENAHT Dance Technique &amp; Lineage</h3><p>Specialized coaching in Middle Eastern, North African, Hellenic, and Turkish dance traditions for aspiring and established performers.</p></div>
    <div class="pillar"><h3>Embodied Stage Presence</h3><p>Movement strategy for speakers, artists, and leaders seeking to command physical presence on stage without artificial stiffness.</p></div>
    <div class="pillar"><h3>The Commercial Business of Art</h3><p>Systems for pricing, booking contracts, managing visibility, and building an enduring artistic career without creative burnout.</p></div>
  </div>
  <p style="margin-top:40px"><a class="link-arrow" href="#" title="/rsvp stays live">See classes, shows &amp; events</a></p>
</div></section>`, 'movement-stage.html');

/* ---------- ABOUT ---------- */
page('about.html', 'About', `
<section class="section"><div class="wrap two">
  <div><p class="eyebrow">About · executive lineage meets the stage</p><h1>Build confidence without the act.</h1>
  <p class="lede">I’ve spent more than two decades working between corporate leadership rooms, creative stages, and community circles. No matter the room, I earned trust the same way: direct, clear, honest, and fair.</p>
  <p>The Work-Live-Play approach brings strategy, systems creation, communication coaching, hiring insight, high-trust facilitation and embodied presence into one place.</p></div>
  ${photo('', 'Photo direction', 'Portrait in an executive setting, or facilitating a group. Warm, direct, composed.', '460px')}
</div></section>
<section class="section cream2"><div class="wrap two">
  <div><p class="eyebrow">Credentials &amp; lineage</p><h2>Corporate-to-stage synthesis</h2></div>
  <ul class="creds">
    <li>Mental Fitness (PQ) Certified Coach<span>Positive Intelligence</span></li>
    <li>Talent Strategy Certification<span>Human Capital Institute</span></li>
    <li>BA in Sociology<span>Hampton University · Ebony Fire alum &amp; founder of Majestic Dance Troupe</span></li>
    <li>CAPA alum &amp; dance faculty member<span>Old Town School of Folk Music</span></li>
    <li>International MENAHT &amp; belly dance artist<span>Performer and teacher</span></li>
  </ul>
</div></section>
<section class="section"><div class="wrap">
  <p class="eyebrow">The “Are We a Fit?” standard</p><h2>Who this is for</h2>
  <div class="fit">
    <div><h3><span class="dot"></span>We are a fit if</h3><p>You are an executive, team lead, or artist ready to build emotional fitness, nail high-stakes moments, eliminate micromanagement, and take full ownership of your trajectory.</p></div>
    <div class="not"><h3><span class="dot"></span>We are not a fit if</h3><p>You are looking for canned scripts, fake corporate personas, quick cosmetic fixes, or prefer defensive excuses over doing the deep internal work.</p></div>
  </div>
</div></section>`, 'about.html');

/* ---------- RESULTS ---------- */
page('results.html', 'Results', `
<section class="section"><div class="wrap">
  <p class="eyebrow">Results</p><h1>Documented corporate and individual outcomes</h1>
  <p class="lede">Three proof points, retained from the current site. Each links to its full story.</p>
  <div class="cases" style="margin-top:36px">
    <article class="case"><div class="who">Michael M.</div><div class="role">CFO · Work</div><p>Career advancement &amp; executive EQ transformation under pressure.</p><a class="link-arrow" href="#">Read Michael’s leadership story</a></article>
    <article class="case"><div class="who">Melinda D.</div><div class="role">Senior Engineer · Work</div><p>Multiple job offers, interview anxiety mastery &amp; salary negotiation.</p><a class="link-arrow" href="#">Read Melinda’s job search</a></article>
    <article class="case"><div class="who">Jeff D.</div><div class="role">Tech Department Lead · Work</div><p>Strategic talent acquisition &amp; high-retention team building.</p><a class="link-arrow" href="#">Read Jeff’s team story</a></article>
  </div>
</div></section>`, 'results.html');

/* ---------- INTAKE ---------- */
page('intake.html', 'Apply for Strategy Call', `
<section class="section"><div class="wrap intake">
  <div><p class="eyebrow">Apply for a strategy call</p><h1>Eight questions. One clear next step.</h1>
  <p class="lede">If your goals and investment fit Individual or Organizational Advisory, your strategy-call link arrives by email in moments. If not yet, you’ll get two self-serve options you can start today, and you can always reply to talk about an enterprise engagement.</p>
  <p class="form17 note" style="border:0;background:none;padding:0">On the live site this panel is the 17hats Lead Capture Form, embedded in a Squarespace Code Block. The routing below mirrors exactly what 17hats can do: one pick-from-a-list answer starts one workflow.</p></div>
  <form class="form17" id="intake" novalidate>
    <p class="note">Prototype form · nothing is sent anywhere</p>
    <div class="q"><label for="n">Your name</label><input id="n" type="text" autocomplete="name" required></div>
    <div class="q"><label for="e">Email</label><input id="e" type="email" autocomplete="email" required></div>
    <div id="qs"></div>
    <button class="btn btn-primary" type="submit">Submit application</button>
    <div class="result" id="res" role="status" aria-live="polite"></div>
  </form>
</div></section>`, 'intake.html');
console.log('built', fs.readdirSync(OUT).filter(f => f.endsWith('.html')).length, 'pages');
