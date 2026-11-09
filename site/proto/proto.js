(function () {
  // Mobile menu (Squarespace 7.1 overlay pattern)
  var burger = document.querySelector('.burger'), mm = document.getElementById('mm');
  if (burger) burger.addEventListener('click', function () {
    var open = mm.classList.toggle('open'); burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.style.overflow = open ? 'hidden' : '';
  });
  // Folder: click/Enter toggles for keyboard and touch users (hover still works on desktop)
  document.querySelectorAll('.header-nav-item--folder').forEach(function (f) {
    var b = f.querySelector('.header-nav-folder-title');
    b.addEventListener('click', function () { var o = f.classList.toggle('open'); b.setAttribute('aria-expanded', o ? 'true' : 'false'); });
    f.addEventListener('keydown', function (e) { if (e.key === 'Escape') { f.classList.remove('open'); b.setAttribute('aria-expanded', 'false'); b.focus(); } });
    document.addEventListener('click', function (e) { if (!f.contains(e.target)) { f.classList.remove('open'); b.setAttribute('aria-expanded', 'false'); } });
  });

  // Intake: renders the 8 questions from the shared funnel model and shows the routed outcome
  var qs = document.getElementById('qs');
  if (!qs || !window.Funnel) return;
  var F = window.Funnel;
  qs.innerHTML = F.QUESTIONS.map(function (q, i) {
    var head = (i + 1) + '. ' + q.label + (q.required ? '' : ' <span class="hint">Optional</span>');
    if (q.type === 'Long Answer') return '<div class="q"><label for="q-' + q.id + '">' + head + '</label><textarea id="q-' + q.id + '" name="' + q.id + '"></textarea></div>';
    if (q.type === 'Lead Source') return '<div class="q"><label for="q-' + q.id + '">' + head + '</label><select id="q-' + q.id + '" name="' + q.id + '"><option value="">Choose…</option><option>Referral</option><option>LinkedIn</option><option>Instagram</option><option>Talk or workshop</option><option>Search</option></select></div>';
    var multi = q.type === 'Checkboxes';
    return '<fieldset class="q' + (q.router ? ' router' : '') + '"><legend>' + head + (q.router ? '<span class="hint">In 17hats this is the one “Choose from a List” question that starts the matching workflow.</span>' : '') + '</legend><div class="opts">' +
      q.options.map(function (o) { return '<label><input type="' + (multi ? 'checkbox' : 'radio') + '" name="' + q.id + '" value="' + o[1] + '"> ' + o[0] + '</label>'; }).join('') + '</div></fieldset>';
  }).join('');
  var form = document.getElementById('intake'), res = document.getElementById('res');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var a = {};
    F.QUESTIONS.forEach(function (q) {
      if (q.type === 'Checkboxes') a[q.id] = Array.prototype.map.call(form.querySelectorAll('[name=' + q.id + ']:checked'), function (x) { return x.value; });
      else if (q.options && q.type !== 'Lead Source') { var c = form.querySelector('[name=' + q.id + ']:checked'); a[q.id] = c ? c.value : ''; }
      else a[q.id] = (form.querySelector('[name=' + q.id + ']') || {}).value || '';
    });
    var r = F.route(a), first = (document.getElementById('n').value || 'there').split(' ')[0];
    res.classList.add('on');
    if (!r.ok) { res.innerHTML = '<b>Please answer:</b> ' + r.errors.map(function (x) { return x.replace(' is required', ''); }).join(', '); return; }
    var wf = r.workflow, mail;
    if (r.qualified) mail = '<div class="sub">Subject: Your strategy call link</div><p>Hi ' + first + ', thank you for the detail. Based on your answers, the next step is a strategy call. Choose a time here: <u>Calendly · ' + wf.booking.split(' (')[0] + '</u></p><p>Asali</p>';
    else if (a.investment === 'self') mail = '<div class="sub">Subject: Two ways to start now</div><p>Hi ' + first + ', here are two self-serve options: the $200 resource and the $600 resource. If your organization is sponsoring this, just reply “enterprise” and I’ll be in touch.</p><p>Asali</p>';
    else mail = '<div class="sub">Subject: A quick question before we talk</div><p>Hi ' + first + ', thanks for applying. Reply with a line on what success looks like and who is investing, and I’ll point you to the right next step. In the meantime, here are two self-serve options.</p><p>Asali</p>';
    res.innerHTML = '<b>Workflow started: ' + wf.name + '</b><br><span class="hint">Tags: ' + r.tags.join(', ') + ' · sent from Asali’s Gmail via 17hats</span><div class="mail">' + mail + '</div>';
  });
})();
