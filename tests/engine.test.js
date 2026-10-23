// Run with: node tests/engine.test.js
const assert = require('assert');
const E = require('../src/engine.js'), K = require('../src/kit.js');
const kit = K.defaultKit();
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok -', name); };
const rules = (txt, ch) => E.analyze(txt, kit, { channel: ch || 'Social post' }).findings.map((f) => f.rule);

t('flags unsupported ranking and offers a minimal fix', () => {
  const r = E.analyze('Lumo is the #1 budgeting app for students.', kit, {});
  const f = r.findings.find((x) => x.rule === 'CLM-SUP');
  assert(f && f.severity === 'high' && f.sub === 'unverified');
  assert.strictEqual(E.applyFix('Lumo is the #1 budgeting app for students.', f), 'Lumo is a simple budgeting app for students.');
});
t('approved claim is not flagged', () => assert(!rules('We offer bank-grade encryption and no hidden fees.').includes('CLM-PRO')));
t('facts: wrong price, year, trial are high severity and correct ones pass', () => {
  assert(rules('Lumo Plus costs ₹149 per month.').includes('FACT-PRICE'));
  assert(!rules('Lumo Plus costs ₹99 per month.').includes('FACT-PRICE'));
  assert(rules('Launched in 2021.').includes('FACT-YEAR'));
  assert(rules('Try our 30-day free trial. Terms apply.').includes('FACT-TRIAL'));
});
t('member count: overclaim contradicts, understated is outdated', () => {
  const o = E.analyze('Over 2 lakh students use it.', kit, {}).findings.find((f) => f.rule === 'FACT-USERS');
  assert.strictEqual(o.sub, 'contradicts');
  const u = E.analyze('10,000 students use it.', kit, {}).findings.find((f) => f.rule === 'FACT-USERS');
  assert.strictEqual(u.sub, 'outdated');
  assert(!rules('More than 50,000 students use it.').includes('FACT-USERS'));
});
t('finance disclaimer required and satisfied by appending', () => {
  const txt = 'Learn about investing early.';
  const f = E.analyze(txt, kit, {}).findings.find((x) => x.rule === 'MSG-FIN');
  assert(f);
  assert(!rules(E.applyFix(txt, f)).includes('MSG-FIN'));
});
t('slang only flagged in formal channels', () => {
  assert(!rules('This is lit.', 'Social post').includes('TONE-SLANG'));
  assert(rules('This is lit.', 'Email').includes('TONE-SLANG'));
});
t('personal data cannot be dismissed', () => {
  const f = E.analyze('Call 9876543210 or mail riya@gmail.com', kit, {}).findings.filter((x) => x.rule === 'CONF-PII');
  assert.strictEqual(f.length, 2); assert(f.every((x) => x.noDismiss && x.severity === 'high'));
  assert(!rules('Write to hello@lumo.example').includes('CONF-PII'));
});
t('hashtags, caps and exclamation marks', () => {
  const r = rules('SAVE MORE!!! #backtocollege');
  ['TONE-CAPS', 'TONE-EXCL', 'A11Y-HASH'].forEach((x) => assert(r.includes(x), x));
});
t('clean text has no high findings', () => {
  const r = E.analyze('Exam week is coming. Plan your pocket money with Lumo Budget. #LumoBudget', kit, {});
  assert.strictEqual(r.findings.filter((f) => f.severity === 'high').length, 0);
});
t('contrast maths matches WCAG', () => {
  assert(Math.abs(E.contrast('#000000', '#FFFFFF') - 21) < 0.01);
  assert(E.contrast('#FFB547', '#F4F6FB') < 3);
  const v = E.analyzeVisual({ fg: '#FFB547', bg: '#F4F6FB', large: false }, kit);
  assert(v[0].rule === 'A11Y-CON' && v[0].fix.kind === 'visual');
  assert(E.contrast(v[0].fix.set.fg, '#F4F6FB') >= 4.5);
});
t('visual: alt text, retired logo, logo on dark', () => {
  const v = E.analyzeVisual({ hasImage: true, alt: '', logo: 'old', bg: '#FFFFFF', fg: '#000000' }, kit).map((f) => f.rule);
  assert(v.includes('A11Y-ALT') && v.includes('VIS-LOGO'));
  assert(E.analyzeVisual({ logo: 'full', bg: '#101030', fg: '#fff' }, kit).some((f) => f.rule === 'VIS-LOGO'));
});
t('palette: off-brand dominant colour flagged, photos skipped', () => {
  const px = new Uint8ClampedArray(400 * 4);
  for (let i = 0; i < 400; i++) { px.set(i < 300 ? [109, 59, 234, 255] : [27, 31, 75, 255], i * 4); }
  const pal = E.paletteFromPixels(px);
  assert(!pal.photographic);
  assert(E.analyzeVisual({ hasImage: true, alt: 'A purple poster with offer text', palette: pal }, kit).some((f) => f.rule === 'VIS-PAL'));
  const photo = new Uint8ClampedArray(1000 * 4);
  for (let i = 0; i < 1000; i++) photo.set([(i * 37) % 256, (i * 91) % 256, (i * 13) % 256, 255], i * 4);
  assert(E.paletteFromPixels(photo).photographic);
});
t('AI validator drops findings with no valid source', () => {
  const text = 'Join the party today.';
  const v = E.validateAI([
    { span: 'party', clauseId: 'V-1.1', reason: 'Too casual', severity: 'low', confidence: 0.8, suggestion: 'session' },
    { span: 'not in text', clauseId: 'V-1.1', reason: 'x' },
    { span: 'Join', clauseId: 'NOPE-9', reason: 'x' },
  ], text, kit);
  assert.strictEqual(v.ok.length, 1); assert.strictEqual(v.dropped.length, 2);
  const f = E.aiToFindings(v.ok, text);
  assert(f[0].source === 'ai' && f[0].start === 9);
});
t('word diff', () => {
  const ops = E.diffWords('save you 40% today', 'helps you save today');
  assert(ops.some((o) => o.t === 'del') && ops.some((o) => o.t === 'ins'));
});
t('PII is masked before anything goes to the AI', () => {
  const m = E.maskPII('mail riya@gmail.com call 9876543210');
  assert(!/riya@|9876/.test(m) && m.includes('[EMAIL]') && m.includes('[PHONE]'));
});
console.log('\n' + n + ' tests passed');
