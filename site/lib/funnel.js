/* Intake funnel model: the 8-question 17hats Lead Capture Form, its routing, and a validator for
   the 17hats rules that decide whether routing can work at all. Used by the simulator and tests. */
(function (root) {
  var Q = [
    { id: 'path', type: 'Choose from a List', label: 'What do you want support with?', required: true,
      options: [['Leadership, career or team performance', 'work'], ['Mental fitness, burnout or wellbeing', 'live'], ['Movement, dance or stage presence', 'play']],
      effect: 'project tag', tagPrefix: 'vertical-' },
    { id: 'for', type: 'Choose from a List', label: 'Who is this for?', required: true,
      options: [['Myself', 'individual'], ['My team or organization', 'organization'], ['A performance, event or keynote', 'event']], effect: 'project tag', tagPrefix: 'for-' },
    { id: 'role', type: 'Choose from a List', label: 'Which best describes your role?', required: true,
      options: [['Executive, VP or C-suite', 'exec'], ['Director or senior manager', 'director'], ['Manager or team lead', 'manager'], ['Individual contributor', 'ic'], ['HR or people leader', 'hr'], ['Artist or performer', 'artist'], ['Other', 'other']], effect: 'none' },
    { id: 'moment', type: 'Long Answer', label: 'What high-stakes moment is coming up?', required: true, effect: 'none' },
    { id: 'timing', type: 'Choose from a List', label: 'When does it need to be handled?', required: true,
      options: [['In the next 30 days', '30d'], ['In 1–3 months', '90d'], ['3 months or more', 'later'], ['Just exploring', 'exploring']], effect: 'none' },
    { id: 'investment', type: 'Choose from a List', label: 'What investment are you planning for this?', required: true, router: true,
      options: [['Under $1,200: show me self-serve options', 'self'], ['$1,200 – $5,000 (individual advisory)', 'individual'], ['$5,000 – $50,000+ (organizational advisory)', 'org'], ['Not sure yet', 'unsure']], effect: 'start workflow' },
    { id: 'tried', type: 'Checkboxes', label: "What have you already tried?", required: false,
      options: [['Coaching', 'coaching'], ['Therapy or counselling', 'therapy'], ['Courses or books', 'courses'], ['Nothing yet', 'nothing']], effect: 'none' },
    { id: 'source', type: 'Lead Source', label: 'How did you hear about Asali?', required: false, effect: 'lead source report' }
  ];
  var WORKFLOWS = {
    individual: { name: 'Qualified · Individual advisory', qualified: true, booking: 'Strategy Call · Individual (secret event, 30 min)',
      steps: ['Send email “Your strategy call link” immediately (Calendly secret link)', 'Add project tag “qualified”', 'To-do for Asali: review answers before the call'] },
    org: { name: 'Qualified · Organizational advisory', qualified: true, booking: 'Strategy Call · Organizations (secret event, 45 min)',
      steps: ['Send email “Let’s scope this for your team” immediately (Calendly secret link)', 'Add project tag “qualified-org”', 'To-do for Asali: research the organization'] },
    self: { name: 'Self-serve resources', qualified: false, booking: null,
      steps: ['Send email “Two ways to start now” immediately: $200 and $600 resources', 'Line in email: reply “enterprise” if an organization is sponsoring this', 'Add project tag “self-serve”'] },
    unsure: { name: 'Clarify investment', qualified: false, booking: null,
      steps: ['Send email “A quick question before we talk” immediately: self-serve options + reply to discuss', 'Add project tag “unsure”', 'To-do for Asali: decide within 2 business days'] }
  };

  /** Route one submission. Mirrors 17hats: only the router question's answer starts a workflow. */
  function route(answers, config) {
    config = config || { questions: Q };
    var router = config.questions.filter(function (q) { return q.router; });
    var errors = [];
    config.questions.forEach(function (q) {
      if (q.required && (answers[q.id] === undefined || answers[q.id] === '' || (Array.isArray(answers[q.id]) && !answers[q.id].length))) errors.push(q.id + ' is required');
    });
    if (errors.length) return { ok: false, errors: errors, workflows: [] };
    var workflows = [];
    router.forEach(function (q) {
      if (q.type !== 'Choose from a List') return; // 17hats can't start a workflow from any other type
      var opt = q.options.filter(function (o) { return o[1] === answers[q.id]; })[0];
      if (opt) workflows.push(opt[1]);
    });
    var tags = [];
    config.questions.forEach(function (q) {
      if (q.effect === 'project tag' && answers[q.id]) tags.push(q.tagPrefix + answers[q.id]);
    });
    var wf = workflows.length ? WORKFLOWS[workflows[0]] : null;
    return { ok: true, workflows: workflows, workflow: wf, qualified: !!(wf && wf.qualified), booking: wf ? wf.booking : null, tags: tags, vertical: answers.path || null };
  }

  /** 17hats rules (from 17hats Help Center) that a form plan must satisfy for routing to work. */
  function validate(config) {
    var v = [], qs = config.questions;
    var routers = qs.filter(function (q) { return q.router; });
    if (!routers.length) v.push('No question starts a workflow, so every lead gets the same treatment.');
    if (routers.length > 1) v.push('Only one Choose-from-a-List question per Lead Capture Form can start workflows.');
    routers.forEach(function (q) {
      if (q.type !== 'Choose from a List') v.push('“' + q.label + '” is a ' + q.type + ' question. 17hats starts workflows only from a Choose-from-a-List answer, so this can never route anyone.');
    });
    if (config.formLevelWorkflow && routers.length) v.push('A form-level workflow and a per-answer workflow can’t both be set on one Lead Capture Form.');
    if (qs.filter(function (q) { return q.type === 'Lead Source'; }).length > 1) v.push('Only one Lead Source question is allowed per form.');
    qs.forEach(function (q) { if (q.startTag && !q.router) v.push('“' + q.label + '” applies a Start Tag: a second workflow could start alongside the routed one.'); });
    var nonCF = qs.filter(function (q) { return q.type !== 'Contact'; }).length;
    if (nonCF !== 8) v.push('Blueprint calls for 8 questions; this plan has ' + nonCF + '.');
    return v;
  }

  function combos() {
    // Every combination of the closed answers (open text filled with a placeholder).
    var lists = Q.filter(function (q) { return q.options && q.type !== 'Checkboxes'; });
    var out = [{}];
    lists.forEach(function (q) {
      var next = [];
      out.forEach(function (a) { q.options.forEach(function (o) { var b = Object.assign({}, a); b[q.id] = o[1]; next.push(b); }); });
      out = next;
    });
    var cb = Q.filter(function (q) { return q.type === 'Checkboxes'; })[0];
    var subsets = [];
    for (var mask = 0; mask < (1 << cb.options.length); mask++) subsets.push(cb.options.filter(function (o, i) { return mask & (1 << i); }).map(function (o) { return o[1]; }));
    var all = [];
    out.forEach(function (a) { subsets.forEach(function (s) { var b = Object.assign({}, a); b[cb.id] = s; b.moment = 'Board presentation'; b.source = 'Referral'; all.push(b); }); });
    return all;
  }

  var api = { QUESTIONS: Q, WORKFLOWS: WORKFLOWS, route: route, validate: validate, combos: combos };
  root.Funnel = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
