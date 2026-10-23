/* ===== state.js: data, persistence, analysis cache and actions ===== */
const E = window.BrandLensEngine, K = window.BrandLensKit;

const ROLES = {
  creator: { label: 'Creator', name: 'Riya Sharma', unit: 'Campus Marketing' },
  manager: { label: 'Brand Manager', name: 'Manish Rao', unit: 'Brand team' },
  reviewer: { label: 'Reviewer', name: 'Kavita Nair', unit: 'Legal and claims' },
};
const STATUS = {
  draft: { label: 'Draft', cls: 'st-draft' },
  in_review: { label: 'In review', cls: 'st-review' },
  changes_requested: { label: 'Changes requested', cls: 'st-changes' },
  approved: { label: 'Approved', cls: 'st-ok' },
  rejected: { label: 'Rejected', cls: 'st-rej' },
};
const CAT_LABEL = {
  tone: 'Tone', terminology: 'Terminology', messaging: 'Messaging', facts: 'Facts', claims: 'Claims',
  accessibility: 'Accessibility', visual: 'Visual', confidentiality: 'Confidential',
};
const SEV_LABEL = { high: 'High', medium: 'Medium', low: 'Low' };
const KEY = 'brandlens.round2.v1';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = (p) => p + Math.random().toString(36).slice(2, 8);

function fresh() {
  const now = Date.now();
  return { v: 1, role: 'creator', kit: K.defaultKit(), subs: K.seedSubmissions(now), events: K.seedEvents(), tour: {}, tourHidden: false };
}
function loadData() {
  try {
    const j = localStorage.getItem(KEY);
    if (j) {
      const d = JSON.parse(j);
      if (d && d.v === 1 && d.kit && d.subs) return d;
    }
  } catch (e) { /* storage unavailable: run from memory */ }
  return null;
}
let D = loadData() || fresh();
function save() { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) { /* ignore */ } }

const UI = {
  view: 'queue', sel: null, tab: 'comments', sev: 'all', openOnly: false, editing: false, filter: 'all',
  kitTab: 'guidelines', dismissing: null, active: null, diffV: null, ai: null, note: '', cdraft: '', cref: null,
  newOpen: false, newText: '', flash: null, kitFocus: null,
};

/* ----- time ----- */
function rel(ts) {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + ' min ago';
  const h = Math.round(m / 60);
  if (h < 24) return h + ' h ago';
  const d = Math.round(h / 24);
  return d + (d === 1 ? ' day ago' : ' days ago');
}
function stamp(ts) {
  return new Date(ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

/* ----- lookups ----- */
const me = () => ROLES[D.role];
const getSub = (id) => D.subs.find((s) => s.id === id);
const clauseOf = (id) => D.kit.clauses.find((c) => c.id === id);
const editable = (s) => D.role === 'creator' && (s.status === 'draft' || s.status === 'changes_requested');
function log(sub, type, text) {
  sub.audit.push({ at: Date.now(), by: me().name, role: D.role, type, text });
  sub.updatedAt = Date.now();
}
function recordEvent(sub, f, outcome) {
  D.events.push({ w: 5, team: sub.team, rule: f.rule, outcome, live: true });
}

/* ----- analysis (cached per draft + visual + kit + AI) ----- */
const cache = new Map();
function analysis(sub) {
  const sig = [sub.draft, JSON.stringify(Object.assign({}, sub.visual, { thumb: 0 })), D.kit.version, sub.channel, JSON.stringify(sub.ai && sub.ai.items), JSON.stringify(sub.decisions)].join('␟');
  const c = cache.get(sub.id);
  if (c && c.sig === sig) return c;
  const base = E.analyze(sub.draft, D.kit, { channel: sub.channel });
  const ai = (sub.ai ? E.aiToFindings(sub.ai.items, sub.draft) : []).filter((a) => !base.findings.some((f) => f.start >= 0 && a.start < f.end && a.end > f.start));
  const ranged = base.findings.filter((f) => f.start >= 0).concat(ai).sort((a, b) => a.start - b.start);
  const doc = base.findings.filter((f) => f.start < 0);
  const vis = E.analyzeVisual(sub.visual, D.kit);
  const findings = ranged.concat(doc, vis);
  const seen = {};
  findings.forEach((f) => {
    f.decision = sub.decisions[f.key] || null;
    seen[f.id] = (seen[f.id] || 0) + 1;
    if (seen[f.id] > 1) f.id += '#' + seen[f.id];
  });
  const open = findings.filter((f) => !f.decision);
  const res = {
    sig, findings, stats: base.stats,
    open, openHigh: open.filter((f) => f.severity === 'high'),
    count: { high: open.filter((f) => f.severity === 'high').length, medium: open.filter((f) => f.severity === 'medium').length, low: open.filter((f) => f.severity === 'low').length },
    needsAck: findings.filter((f) => f.decision && f.severity === 'high' && !f.decision.ack),
  };
  cache.set(sub.id, res);
  return res;
}

/* ----- actions ----- */
function toast(msg, kind) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'show ' + (kind || '');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (t.className = ''), 3600);
}
function tourMark(k) { if (!D.tour[k]) { D.tour[k] = true; } }

function applyFinding(sub, f) {
  if (!f.fix) return;
  if (f.fix.kind === 'visual') {
    Object.assign(sub.visual, f.fix.set);
    log(sub, 'fix', 'Applied visual fix: ' + f.fix.text);
  } else {
    sub.draft = E.applyFix(sub.draft, f);
    log(sub, 'fix', 'Applied fix for “' + (f.text || f.title).slice(0, 40) + '” (' + f.rule + ')');
  }
  recordEvent(sub, f, 'accepted');
  tourMark('applied');
  UI.active = null;
}

function dismissFinding(sub, f, reason) {
  if (f.noDismiss) { toast('This finding can’t be dismissed. Fix it instead.', 'bad'); return false; }
  if (!reason || reason.trim().length < 4) { toast('Add a short reason first. It goes in the audit trail.', 'bad'); return false; }
  sub.decisions[f.key] = { state: 'dismissed', reason: reason.trim(), by: me().name, at: Date.now(), ack: f.severity !== 'high' ? true : null, ackBy: null };
  log(sub, 'dismiss', 'Dismissed “' + (f.text || f.title).slice(0, 40) + '” (' + f.rule + '): ' + reason.trim());
  recordEvent(sub, f, 'dismissed');
  tourMark('applied');
  return true;
}

function applySafe(sub) {
  let n = 0;
  for (let guard = 0; guard < 40; guard++) {
    const A = analysis(sub);
    const f = A.open.find((x) => x.safe && x.fix && x.start >= 0);
    if (!f) break;
    applyFinding(sub, f);
    n++;
  }
  return n;
}

function approvalBlockers(sub) {
  const A = analysis(sub);
  const out = [];
  if (A.openHigh.length) out.push(A.openHigh.length + ' high-severity issue' + (A.openHigh.length > 1 ? 's' : '') + ' still open');
  if (A.needsAck.length) out.push(A.needsAck.length + ' dismissed high-severity finding' + (A.needsAck.length > 1 ? 's' : '') + ' waiting for Reviewer sign-off');
  return out;
}

function saveVersion(sub, note) {
  const last = sub.versions[sub.versions.length - 1];
  if (last && last.text === sub.draft) return false;
  sub.versions.push({ v: sub.versions.length + 1, text: sub.draft, at: Date.now(), by: me().name, note: note || 'Saved version' });
  log(sub, 'version', 'Saved version ' + sub.versions.length);
  return true;
}

function setStatus(sub, status, text, type) {
  sub.status = status;
  log(sub, type || status, text);
}

function addComment(sub, text, ref) {
  if (!text.trim()) return;
  sub.comments.push({ id: uid('c'), at: Date.now(), by: me().name, role: D.role, text: text.trim(), ref: ref || null });
  log(sub, 'comment', 'Commented' + (ref ? ' on a finding' : ''));
}

function newReview(f) {
  const s = {
    id: uid('s-'), title: f.title || 'Untitled review', channel: f.channel, team: f.team, author: { name: me().name, role: D.role },
    status: 'draft', goal: f.goal || '', confidential: !!f.confidential, draft: f.text,
    versions: [{ v: 1, text: f.text, at: Date.now(), by: me().name, note: 'First draft' }],
    visual: { hasImage: false, alt: '', fg: '#1B1F4B', bg: '#FFFFFF', large: false, logo: 'none', palette: null, thumb: null },
    decisions: {}, ai: null, comments: [], audit: [], updatedAt: Date.now(),
  };
  log(s, 'created', 'Created the review');
  D.subs.unshift(s);
  return s;
}

/* ----- files in ----- */
function stripHtml(h) {
  const d = new DOMParser().parseFromString(h.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|h\d|li|tr)>/gi, '\n'), 'text/html');
  d.querySelectorAll('script,style').forEach((n) => n.remove());
  return (d.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
}
async function readDocx(file) {
  const buf = await file.arrayBuffer(), dv = new DataView(buf);
  let i = buf.byteLength - 22;
  while (i >= 0 && dv.getUint32(i, true) !== 0x06054b50) i--;
  if (i < 0) throw new Error('Not a .docx file');
  const count = dv.getUint16(i + 10, true);
  let p = dv.getUint32(i + 16, true);
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
    const nlen = dv.getUint16(p + 28, true), elen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true), lho = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(new Uint8Array(buf, p + 46, nlen));
    if (name === 'word/document.xml') {
      const start = lho + 30 + dv.getUint16(lho + 26, true) + dv.getUint16(lho + 28, true);
      const raw = new Uint8Array(buf, start, csize);
      let xml;
      if (method === 0) xml = new TextDecoder().decode(raw);
      else xml = await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
      return xml.replace(/<\/w:p>/g, '\n').replace(/<w:tab\/>/g, '\t').replace(/<w:br\/>/g, '\n').replace(/<[^>]+>/g, '')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&').trim();
    }
    p += 46 + nlen + elen + clen;
  }
  throw new Error('No text found in this .docx');
}
async function readTextFile(file) {
  const n = file.name.toLowerCase();
  if (n.endsWith('.docx')) return readDocx(file);
  const t = await file.text();
  if (n.endsWith('.html') || n.endsWith('.htm')) return stripHtml(t);
  return t.trim();
}

/* ----- images ----- */
function processImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const w = Math.min(96, img.width), h = Math.max(1, Math.round((img.height * w) / img.width));
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(img, 0, 0, w, h);
      const palette = E.paletteFromPixels(x.getImageData(0, 0, w, h).data);
      const tw = 240, th = Math.max(1, Math.round((img.height * tw) / img.width));
      const c2 = document.createElement('canvas');
      c2.width = tw; c2.height = th;
      c2.getContext('2d').drawImage(img, 0, 0, tw, th);
      res({ palette, thumb: c2.toDataURL('image/jpeg', 0.72) });
    };
    img.onerror = () => rej(new Error('Could not read this image'));
    img.src = src;
  });
}
function samplePoster() {
  const c = document.createElement('canvas');
  c.width = 640; c.height = 360;
  const x = c.getContext('2d');
  x.fillStyle = '#6D3BEA'; x.fillRect(0, 0, 640, 360);
  x.fillStyle = '#FF8A2B'; x.fillRect(0, 250, 640, 110);
  x.fillStyle = '#FFFFFF'; x.font = '700 54px sans-serif'; x.fillText('BACK TO COLLEGE', 36, 120);
  x.font = '700 40px sans-serif'; x.fillText('SALE', 36, 175);
  x.fillStyle = '#1B1F4B'; x.font = '600 28px sans-serif'; x.fillText('Lumo Plus ₹99 / month', 36, 315);
  return c.toDataURL('image/png');
}

/* ----- AI second opinion (optional, uses the host's Claude via the "sample" capability) ----- */
let sampleFn;
async function getSample() {
  if (sampleFn !== undefined) return sampleFn;
  try { sampleFn = (await (window.claude && window.claude.use && window.claude.use('sample'))) || null; } catch (e) { sampleFn = null; }
  return sampleFn;
}
function buildPrompt(sub, A) {
  const clauses = D.kit.clauses.map((c) => c.id + ' ' + c.title + ': ' + c.text).join('\n');
  const facts = D.kit.facts.map((f) => f.label + ' = ' + f.value).join('\n');
  const known = A.findings.filter((f) => f.source === 'rule' && f.start >= 0).map((f) => '- ' + f.rule + ': "' + f.text + '"').slice(0, 30).join('\n') || '- none';
  return [
    'You are a careful brand-compliance reviewer for the brand "' + D.kit.name + '". You are the SECOND reviewer: a rule engine already ran.',
    'Find issues the rules cannot catch: a tone that does not fit the goal, misleading implications, confusing wording, claims implied but not stated.',
    'You may only flag issues that a guideline clause below justifies.',
    '', 'GUIDELINE CLAUSES:', clauses, '', 'APPROVED FACTS:', facts, '',
    'ALREADY FOUND BY RULES (do not repeat):', known, '',
    'CHANNEL: ' + sub.channel, 'CREATOR\'S GOAL: ' + (sub.goal || 'not stated'), '',
    'DRAFT (between the markers):', '<<<', E.maskPII(sub.draft), '>>>', '',
    'Return ONLY a JSON array with at most 5 items, no other text. Each item:',
    '{"span": exact text copied from the draft, "clauseId": one of the clause ids above, "category": one of tone|terminology|messaging|facts|claims|accessibility|visual,',
    ' "severity": "high"|"medium"|"low", "reason": one plain sentence saying why it breaks that clause,',
    ' "suggestion": replacement for the span that keeps the creator\'s goal, or "" if none, "confidence": number from 0 to 1}',
    'If you find nothing, return [].',
  ].join('\n');
}
async function runAI(sub) {
  const sample = await getSample();
  if (!sample) { UI.ai = { id: sub.id, status: 'unavailable' }; return; }
  const A = analysis(sub);
  UI.ai = { id: sub.id, status: 'running' };
  render();
  try {
    const res = await sample(buildPrompt(sub, A), { cache: false });
    const m = (res.text || '').match(/\[[\s\S]*\]/);
    if (!m) throw new Error('The AI did not return a list');
    const raw = JSON.parse(m[0]);
    const v = E.validateAI(raw, sub.draft, D.kit);
    sub.ai = { items: v.ok, at: Date.now(), dropped: v.dropped.length };
    log(sub, 'ai', 'AI second opinion: ' + v.ok.length + ' finding' + (v.ok.length === 1 ? '' : 's') + ' kept, ' + v.dropped.length + ' discarded (no valid source)');
    tourMark('ai');
    UI.ai = { id: sub.id, status: 'done', kept: v.ok.length, dropped: v.dropped };
  } catch (e) {
    UI.ai = { id: sub.id, status: 'error', msg: e && e.code === 'not_granted' ? 'Permission to use the AI was not given.' : e && e.code === 'rate_limited' ? 'The AI is busy. Try again in a minute.' : (e && e.message) || 'The AI call failed.' };
  }
  save();
}

/* ----- brand kit edits (Manager) ----- */
function kitChange(text) {
  D.kit.version++;
  D.kit.changelog.unshift({ at: Date.now(), by: me().name, text });
  save();
}

/* ----- insights ----- */
function insights() {
  const ev = D.events;
  const byCat = {}, byRule = {}, weeks = new Array(6).fill(0);
  ev.forEach((e) => {
    const meta = E.RULES[e.rule] || {};
    const cat = meta.category || 'tone';
    byCat[cat] = (byCat[cat] || 0) + 1;
    const r = (byRule[e.rule] = byRule[e.rule] || { rule: e.rule, n: 0, dis: 0, teams: {} });
    r.n++;
    if (e.outcome === 'dismissed') r.dis++;
    r.teams[e.team] = (r.teams[e.team] || 0) + 1;
    weeks[e.w] = (weeks[e.w] || 0) + 1;
  });
  const rules = Object.values(byRule).map((r) => {
    const top = Object.entries(r.teams).sort((a, b) => b[1] - a[1])[0];
    return Object.assign(r, { rate: r.n ? r.dis / r.n : 0, team: top ? top[0] : '-', meta: E.RULES[r.rule] || { label: r.rule, clause: '' } });
  });
  const total = ev.length, dis = ev.filter((e) => e.outcome === 'dismissed').length;
  return { byCat, rules, weeks, total, dis, fixed: total - dis };
}
