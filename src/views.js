/* ===== views.js: rendering ===== */
const IC = {
  lens: '<svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true"><circle cx="14" cy="14" r="9" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M21 21l7 7" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><circle cx="14" cy="14" r="3.2" class="pen-dot"/></svg>',
  check: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  spark: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M8 1l1.6 4.4L14 7l-4.4 1.6L8 13l-1.6-4.4L2 7l4.4-1.6z" fill="currentColor"/></svg>',
  lock: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  back: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};
const trunc = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const statusPill = (s) => '<span class="pill ' + STATUS[s].cls + '">' + STATUS[s].label + '</span>';
const isManager = () => D.role === 'manager';

/* ---------- top bar ---------- */
function renderTop() {
  const nav = [['queue', 'Reviews'], ['kit', 'Brand Kit'], ['insights', 'Insights'], ['about', 'How it works']];
  document.getElementById('top').innerHTML =
    '<div class="top-in">' +
    '<a class="logo" href="#queue" data-act="nav" data-v="queue">' + IC.lens + '<span>BrandLens</span></a>' +
    '<nav aria-label="Main">' + nav.map(([v, l]) => '<a href="#' + v + '" data-act="nav" data-v="' + v + '"' + (UI.view === v || (v === 'queue' && UI.view === 'review') ? ' aria-current="page"' : '') + '>' + l + '</a>').join('') + '</nav>' +
    '<div class="roles" role="radiogroup" aria-label="Viewing as">' +
    Object.entries(ROLES).map(([k, r]) => '<button role="radio" aria-checked="' + (D.role === k) + '" class="role' + (D.role === k ? ' on' : '') + '" data-act="role" data-r="' + k + '"><b>' + r.label + '</b><small>' + r.name + '</small></button>').join('') +
    '</div></div>';
}

/* ---------- queue ---------- */
function waitingFor(s) {
  if (D.role === 'creator') return s.status === 'draft' || s.status === 'changes_requested';
  return s.status === 'in_review';
}
function tourCard() {
  if (D.tourHidden) return '';
  const T = D.tour;
  const steps = [
    ['Open the “Back-to-college promo post” and click any underlined text', T.picked, 'open-hero', 'Open the draft'],
    ['Apply a suggested fix, or dismiss one with a reason', T.applied, null],
    ['Optional: ask for the AI second opinion', T.ai, null],
    ['Resolve every high-severity issue, then submit for review', T.submitted, null],
    ['Switch to Brand Manager (top right) and approve it', T.approved, null],
  ];
  const done = steps.filter((s) => s[1]).length;
  return '<section class="tour card" aria-label="Quick tour"><div class="tour-h"><div><h2>Try the full workflow in about two minutes</h2><p class="muted">Everything below is live. Your changes stay in this browser.</p></div>' +
    '<button class="btn ghost sm" data-act="tourHide">Hide</button></div>' +
    '<ol class="steps">' + steps.map((s, i) => '<li class="' + (s[1] ? 'done' : '') + '"><span class="n">' + (s[1] ? IC.check : i + 1) + '</span><span>' + s[0] + '</span>' + (s[2] ? '<button class="btn sm" data-act="' + s[2] + '">' + s[3] + '</button>' : '') + '</li>').join('') + '</ol>' +
    '<div class="tour-f"><span class="muted">' + done + ' of ' + steps.length + ' done</span><button class="btn ghost sm" data-act="reset">Reset demo data</button></div></section>';
}
function newPanel() {
  if (!UI.newOpen) return '';
  return '<section class="card newp" aria-label="New review"><h2>New review</h2>' +
    '<form data-form="newReview" class="form-grid">' +
    '<label>Title<input id="nr-title" name="title" required placeholder="For example: Diwali offer post"></label>' +
    '<label>Channel<select id="nr-channel" name="channel">' + K.CHANNELS.map((c) => '<option>' + c + '</option>').join('') + '</select></label>' +
    '<label>Team<select id="nr-team" name="team"><option>Campus</option><option>Marketing</option><option>Support</option></select></label>' +
    '<label class="wide">What should this content achieve?<input id="nr-goal" name="goal" placeholder="One sentence. Suggestions will keep this goal."></label>' +
    '<label class="wide">Content<textarea id="nr-text" name="text" rows="7" required placeholder="Paste your draft here, or upload a file below">' + esc(UI.newText) + '</textarea></label>' +
    '<div class="wide row-gap"><label class="btn sm file">Upload .txt .md .html .docx<input id="nr-file" type="file" accept=".txt,.md,.html,.htm,.docx" data-file="text"></label>' +
    '<label class="chk"><input type="checkbox" id="nr-conf" name="confidential"> Confidential: never send this to the AI</label></div>' +
    '<div class="wide row-gap"><button class="btn primary" type="submit">Create and check</button><button class="btn ghost" type="button" data-act="newToggle">Cancel</button></div>' +
    '</form></section>';
}
function viewQueue() {
  const subs = D.subs.slice().sort((a, b) => b.updatedAt - a.updatedAt);
  const f = UI.filter;
  const shown = subs.filter((s) => f === 'all' || (f === 'waiting' ? waitingFor(s) : s.status === f));
  const waiting = subs.filter(waitingFor).length;
  const cnt = (k) => subs.filter((s) => s.status === k).length;
  const chips = [['all', 'All', subs.length], ['waiting', 'Waiting for you', waiting], ['draft', 'Draft', cnt('draft')], ['in_review', 'In review', cnt('in_review')], ['changes_requested', 'Changes requested', cnt('changes_requested')], ['approved', 'Approved', cnt('approved')]];
  const note = { creator: 'You write and fix. Drafts and requested changes are waiting for you.', manager: 'You give final approval. Reviews in “In review” are waiting for you.', reviewer: 'You sign off claims and facts. Reviews in “In review” are waiting for you.' }[D.role];
  return '<div class="wrap">' + tourCard() +
    '<div class="page-h"><div><h1>Reviews</h1><p class="muted">' + note + '</p></div>' +
    (D.role === 'creator' ? '<button class="btn primary" data-act="newToggle">New review</button>' : '<span class="muted small">Switch to Creator to start a review</span>') + '</div>' +
    newPanel() +
    '<div class="chips" role="tablist" aria-label="Filter reviews">' + chips.map(([k, l, n]) => '<button class="fchip' + (f === k ? ' on' : '') + '" data-act="filter" data-k="' + k + '">' + l + ' <b>' + n + '</b></button>').join('') + '</div>' +
    '<div class="list">' + (shown.length ? shown.map((s) => {
      const A = analysis(s);
      const c = A.count;
      return '<button class="rowc" data-act="open" data-id="' + s.id + '"><span class="r-main"><b>' + esc(s.title) + '</b><small>' + esc(s.channel) + ' · ' + esc(s.team) + ' · ' + esc(s.author.name) + '</small></span>' +
        '<span class="r-sev" aria-label="Open issues">' + (c.high + c.medium + c.low === 0 ? '<span class="clean">' + IC.check + ' Clean</span>' : ['high', 'medium', 'low'].map((k) => c[k] ? '<span class="dotc ' + k + '"><i></i>' + c[k] + '</span>' : '').join('')) + '</span>' +
        '<span class="r-st">' + statusPill(s.status) + (waitingFor(s) ? '<em class="wf">Waiting for you</em>' : '') + '</span><span class="r-t muted">' + rel(s.updatedAt) + '</span></button>';
    }).join('') : '<p class="empty">Nothing here. Try another filter.</p>') + '</div></div>';
}

/* ---------- review ---------- */
function annotated(sub, A) {
  const text = sub.draft;
  const ranged = A.findings.filter((f) => f.start >= 0);
  const b = new Set([0, text.length]);
  ranged.forEach((f) => { b.add(f.start); b.add(f.end); });
  const pts = [...b].sort((x, y) => x - y);
  let html = '';
  for (let i = 0; i < pts.length - 1; i++) {
    const s = pts[i], e = pts[i + 1], seg = text.slice(s, e);
    const cov = ranged.filter((f) => f.start <= s && f.end >= e);
    if (!cov.length) { html += esc(seg); continue; }
    const top = cov.slice().sort((x, y) => E.SEV[y.severity] - E.SEV[x.severity])[0];
    const open = cov.filter((f) => !f.decision);
    html += '<mark class="mk ' + top.severity + (open.length ? '' : ' done') + (cov.some((f) => f.id === UI.active) ? ' on' : '') + '" data-act="pick" data-fid="' + esc(top.id) + '" tabindex="0" role="button" aria-label="' + esc(top.title) + '">' + esc(seg) + '</mark>';
  }
  return html;
}
function visualCard(sub, A) {
  const v = sub.visual, ed = editable(sub), dis = ed ? '' : ' disabled';
  const ratio = v.fg && v.bg ? E.contrast(v.fg, v.bg) : null;
  const need = v.large ? 3 : 4.5;
  const pal = v.palette && v.palette.colors ? v.palette.colors : [];
  return '<section class="card" id="visualCard"><div class="card-h"><h3>Visual details</h3><span class="muted small">Colours, logo and alt text are checked against the brand kit</span></div>' +
    '<label class="chk"><input type="checkbox" data-vis="hasImage" id="v-has"' + (v.hasImage ? ' checked' : '') + dis + '> This content includes an image or graphic</label>' +
    '<div class="vgrid"><div class="vcol">' +
    (v.hasImage ? '<div class="thumb">' + (v.thumb ? '<img src="' + v.thumb + '" alt="Preview of the uploaded image">' : '<div class="thumb-empty">No image uploaded yet</div>') + '</div>' +
      (ed ? '<div class="row-gap"><label class="btn sm file">Upload image<input type="file" id="v-file" accept="image/*" data-file="image"></label><button class="btn sm ghost" data-act="samplePoster">Use a sample poster</button></div>' : '') +
      (pal.length ? '<div class="pal" aria-label="Dominant colours">' + pal.slice(0, 5).map((c) => { const nb = E.nearestBrand(c.hex, D.kit); const off = nb.d > 18; return '<div class="sw"><i style="background:' + c.hex + '"></i><span>' + Math.round(c.share * 100) + '%</span><small class="' + (off && !v.palette.photographic ? 'bad' : 'good') + '">' + (off ? 'off-brand' : nb.name) + '</small></div>'; }).join('') + '</div>' +
        (v.palette.photographic ? '<p class="muted small">Photograph detected: the palette check is skipped for photos.</p>' : '') : '') : '<p class="muted small">Tick the box if a poster, banner or photo goes out with this text.</p>') +
    '</div><div class="vcol">' +
    (v.hasImage ? '<label>Alt text<input id="v-alt" data-vis="alt" value="' + esc(v.alt) + '" placeholder="Describe what the image shows"' + dis + '></label>' : '') +
    '<div class="cols2"><label>Text colour<span class="colorin"><input type="color" id="v-fgc" data-vis="fg" value="' + esc(v.fg) + '"' + dis + '><input class="hex" id="v-fg" data-vis="fg" value="' + esc(v.fg) + '"' + dis + ' aria-label="Text colour hex"></span></label>' +
    '<label>Background<span class="colorin"><input type="color" id="v-bgc" data-vis="bg" value="' + esc(v.bg) + '"' + dis + '><input class="hex" id="v-bg" data-vis="bg" value="' + esc(v.bg) + '"' + dis + ' aria-label="Background colour hex"></span></label></div>' +
    '<label class="chk"><input type="checkbox" data-vis="large" id="v-large"' + (v.large ? ' checked' : '') + dis + '> Large text (24 px or bold 19 px and up)</label>' +
    '<div class="contrast" id="ratioOut" style="--fg:' + esc(v.fg) + ';--bgc:' + esc(v.bg) + '"><span class="sample">Aa</span><span>' + (ratio ? '<b>' + ratio.toFixed(2) + ':1</b> ' + (ratio >= need ? '<em class="good">Passes AA</em>' : '<em class="bad">Fails AA (needs ' + need + ':1)</em>') : 'Enter two valid hex colours') + '</span></div>' +
    '<label>Logo shown<select id="v-logo" data-vis="logo"' + dis + '>' + [['none', 'No logo'], ['full', 'Full-colour logo'], ['mono', 'White logo'], ['old', '2022 logo (retired)'], ['altered', 'Stretched or recoloured logo']].map(([k, l]) => '<option value="' + k + '"' + (v.logo === k ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></label>' +
    '</div></div></section>';
}
function metersHtml(A) {
  const s = A.stats, r = s.reading;
  return '<div class="meters">' +
    '<div class="meter"><span class="k">Reading ease</span><b class="' + (r >= 60 ? 'good' : r >= 50 ? '' : 'bad') + '">' + r + '</b><small>target 60+</small></div>' +
    '<div class="meter"><span class="k">Facts verified</span><b>' + s.factsOk + '<span class="of"> / ' + s.factsChecked + '</span></b><small>prices, counts, dates</small></div>' +
    '<div class="meter"><span class="k">Claims on the approved list</span><b>' + s.claimsApproved + '</b><small>' + s.claimsFlagged + ' need attention</small></div>' +
    '<div class="meter"><span class="k">Open issues</span><b class="' + (A.openHigh.length ? 'bad' : 'good') + '">' + A.open.length + '</b><small>' + A.openHigh.length + ' high</small></div></div>';
}
function discussion(sub) {
  const tabs = [['comments', 'Comments (' + sub.comments.length + ')'], ['versions', 'Versions (' + sub.versions.length + ')'], ['audit', 'Audit trail (' + sub.audit.length + ')']];
  let body = '';
  if (UI.tab === 'comments') {
    body = (sub.comments.length ? sub.comments.map((c) => '<div class="cm"><div class="cm-h"><b>' + esc(c.by) + '</b><span class="rchip r-' + c.role + '">' + ROLES[c.role].label + '</span><span class="muted small">' + stamp(c.at) + '</span></div>' + (c.ref ? '<p class="muted small">Re: ' + esc(c.ref) + '</p>' : '') + '<p>' + esc(c.text) + '</p></div>').join('') : '<p class="empty">No comments yet.</p>') +
      '<div class="composer">' + (UI.cref ? '<p class="muted small">Commenting on: ' + esc(UI.cref) + ' <button class="lnk" data-act="clearRef">clear</button></p>' : '') +
      '<textarea id="cdraft" rows="2" placeholder="Write a comment as ' + esc(me().name) + '">' + esc(UI.cdraft) + '</textarea><button class="btn sm" data-act="postComment">Post comment</button></div>';
  } else if (UI.tab === 'versions') {
    body = '<ul class="vers">' + sub.versions.slice().reverse().map((v) => '<li><div><b>Version ' + v.v + '</b> <span class="muted small">' + esc(v.by) + ' · ' + stamp(v.at) + ' · ' + esc(v.note) + '</span></div><button class="btn sm ghost" data-act="diff" data-v="' + v.v + '">' + (UI.diffV === v.v ? 'Hide changes' : 'Compare with current') + '</button></li>').join('') + '</ul>';
    if (UI.diffV) {
      const v = sub.versions.find((x) => x.v === UI.diffV);
      if (v) {
        const ops = E.diffWords(v.text, sub.draft);
        body += '<div class="diff" aria-label="Changes since version ' + v.v + '"><p class="muted small">Red is removed since version ' + v.v + ', green is added.</p><div class="difft">' + ops.map((o) => o.t === 'eq' ? esc(o.v) : '<' + (o.t === 'del' ? 'del' : 'ins') + '>' + esc(o.v) + '</' + (o.t === 'del' ? 'del' : 'ins') + '>').join('') + '</div></div>';
      }
    }
  } else {
    body = '<ol class="audit">' + sub.audit.slice().reverse().map((a) => '<li><span class="rchip r-' + a.role + '">' + ROLES[a.role].label + '</span><span><b>' + esc(a.by) + '</b> ' + esc(a.text) + '<br><small class="muted">' + stamp(a.at) + '</small></span></li>').join('') + '</ol>';
  }
  return '<section class="card"><div class="tabs" role="tablist">' + tabs.map(([k, l]) => '<button role="tab" aria-selected="' + (UI.tab === k) + '" class="tab' + (UI.tab === k ? ' on' : '') + '" data-act="tab" data-k="' + k + '">' + l + '</button>').join('') + '</div>' + body + '</section>';
}
function actionBar(sub, A) {
  const st = sub.status, bl = approvalBlockers(sub);
  const note = '<textarea id="note" rows="1" placeholder="Decision note (required to request changes or reject)">' + esc(UI.note) + '</textarea>';
  let inner = '';
  if (st === 'approved') {
    inner = '<div class="ab-msg ok">' + IC.check + ' Approved by ' + esc(sub.approvedBy || 'Brand Manager') + '. This version is locked.</div>' + (isManager() ? '<button class="btn sm" data-act="reopen">Reopen</button>' : '');
  } else if (st === 'rejected') {
    inner = '<div class="ab-msg bad">Rejected. Create a new review to try again.</div>';
  } else if (D.role === 'creator') {
    if (st === 'in_review') inner = '<div class="ab-msg">Waiting for the Brand Manager and Reviewer.</div><button class="btn sm" data-act="withdraw">Withdraw to edit</button>';
    else inner = '<div class="ab-msg' + (A.openHigh.length ? ' warn' : '') + '">' + (A.openHigh.length ? A.openHigh.length + ' high-severity issue' + (A.openHigh.length > 1 ? 's' : '') + ' to resolve before you can submit' : 'Ready to submit. Medium and low issues can go through.') + '</div><button class="btn" data-act="saveVersion">Save version</button><button class="btn primary" data-act="submit"' + (A.openHigh.length ? ' aria-disabled="true"' : '') + '>Submit for review</button>';
  } else if (D.role === 'manager') {
    if (st === 'in_review') inner = '<div class="ab-note">' + note + '</div><div class="ab-msg' + (bl.length ? ' warn' : '') + '">' + (bl.length ? 'Can’t approve yet: ' + bl.join('; ') : 'No blockers. You can approve.') + '</div><button class="btn" data-act="requestChanges">Request changes</button><button class="btn danger" data-act="reject">Reject</button><button class="btn primary" data-act="approve"' + (bl.length ? ' aria-disabled="true"' : '') + '>Approve</button>';
    else inner = '<div class="ab-msg">Nothing to decide yet. This review is ' + STATUS[st].label.toLowerCase() + '.</div>';
  } else {
    if (st === 'in_review') inner = '<div class="ab-note">' + note + '</div><div class="ab-msg">' + (A.needsAck.length ? A.needsAck.length + ' dismissed high-severity finding' + (A.needsAck.length > 1 ? 's' : '') + ' need your sign-off.' : 'Nothing waiting for sign-off.') + '</div>' + (A.needsAck.length ? '<button class="btn primary" data-act="signoffAll">Sign off all</button>' : '') + '<button class="btn" data-act="requestChanges">Request changes</button>';
    else inner = '<div class="ab-msg">Nothing to review yet. This review is ' + STATUS[st].label.toLowerCase() + '.</div>';
  }
  return '<div class="abar" role="region" aria-label="Actions">' + inner + '</div>';
}

function fixPreview(f) {
  const fx = f.fix;
  if (!fx) return '';
  const b = f.text ? '<del>' + esc(trunc(f.text, 70)) + '</del>' : '';
  if (fx.kind === 'replace') return '<div class="ba">' + b + '<span class="arr">→</span><ins>' + esc(trunc(fx.text, 80)) + '</ins></div>';
  if (fx.kind === 'delete') return '<div class="ba">' + b + '<span class="arr">→</span><ins class="gone">remove</ins></div>';
  if (fx.kind === 'append') return '<div class="ba"><span class="muted small">Add at the end</span><span class="arr">→</span><ins>' + esc(fx.text) + '</ins></div>';
  if (fx.kind === 'visual') return '<div class="ba"><span class="muted small">Change to</span><span class="arr">→</span><ins>' + esc(fx.text) + '</ins></div>';
  return '';
}
const SUBLBL = { contradicts: 'Contradicts an approved fact', unverified: 'No approved source', outdated: 'Out of date' };
function card(sub, f, canAct) {
  const cl = clauseOf(f.clause), d = f.decision;
  const head = '<div class="fc-h"><span class="sev ' + f.severity + '">' + SEV_LABEL[f.severity] + '</span><span class="chip">' + CAT_LABEL[f.category] + '</span><span class="rid">' + (f.source === 'ai' ? 'AI' : f.rule) + '</span>' +
    (f.source === 'ai' ? '<span class="chip ai">' + IC.spark + ' ' + Math.round(f.conf * 100) + '%' + (f.lowConf ? ' · needs human check' : '') + '</span>' : '') +
    (f.sub ? '<span class="chip sub-' + f.sub + '">' + (f.rule === 'CLM-PRO' ? 'On the prohibited list' : SUBLBL[f.sub]) + '</span>' : '') + '</div>';
  const on = UI.active === f.id ? ' on' : '';
  if (d) {
    const acked = f.severity !== 'high' || d.ack;
    return '<article class="fc ' + f.severity + ' resolved' + on + '" id="fc-' + esc(f.id) + '" data-fid="' + esc(f.id) + '">' + head + '<h4>' + esc(f.title) + '</h4>' +
      '<p class="why"><b>Dismissed</b> by ' + esc(d.by) + ': ' + esc(d.reason) + '</p>' +
      (f.severity === 'high' ? '<p class="so ' + (acked ? 'ok' : 'wait') + '">' + (acked ? IC.check + ' Signed off by ' + esc(d.ackBy || 'Reviewer') : 'Waiting for Reviewer sign-off') + '</p>' : '') +
      '<div class="fc-a">' + (D.role === 'reviewer' && !acked && sub.status === 'in_review' ? '<button class="btn sm primary" data-act="signoff" data-key="' + esc(f.key) + '">Sign off</button>' : '') +
      (editable(sub) ? '<button class="btn sm ghost" data-act="undo" data-key="' + esc(f.key) + '">Undo</button>' : '') + '</div></article>';
  }
  let acts = '';
  if (canAct) {
    acts += (f.fix ? '<button class="btn sm primary" data-act="applyFix" data-fid="' + esc(f.id) + '">Apply fix</button>' : '') +
      (f.start >= 0 ? '<button class="btn sm" data-act="editAt" data-fid="' + esc(f.id) + '">Edit text</button>' : f.field === 'alt' ? '<button class="btn sm" data-act="gotoVisual">Go to alt text</button>' : '') +
      (f.noDismiss ? '<span class="muted small">Can’t be dismissed</span>' : '<button class="btn sm ghost" data-act="dismissStart" data-key="' + esc(f.key) + '">Dismiss…</button>');
  }
  acts += '<button class="btn sm ghost" data-act="commentOn" data-fid="' + esc(f.id) + '">Comment</button>';
  const dis = UI.dismissing === f.key ? '<div class="dis"><label>Why is this fine to publish?<input id="dis-reason" placeholder="Short reason. It goes in the audit trail."></label><div class="row-gap"><button class="btn sm primary" data-act="dismissConfirm" data-key="' + esc(f.key) + '">Dismiss</button><button class="btn sm ghost" data-act="dismissCancel">Cancel</button></div>' + (f.severity === 'high' ? '<p class="muted small">High-severity dismissals need Reviewer sign-off before approval.</p>' : '') + '</div>' : '';
  return '<article class="fc ' + f.severity + on + '" id="fc-' + esc(f.id) + '" data-fid="' + esc(f.id) + '">' + head + '<h4>' + esc(f.title) + '</h4>' +
    (f.start >= 0 && f.text ? '<p class="quote">“' + esc(trunc(f.text, 120)) + '”</p>' : '') +
    '<p class="why">' + esc(f.why) + '</p>' +
    (cl ? '<div class="src"><span class="cid">' + esc(cl.id) + '</span><span><b>' + esc(cl.title) + '.</b> ' + esc(cl.text) + '</span></div>' : '') +
    (f.fix ? '<div class="fix">' + fixPreview(f) + (f.keep ? '<p class="keep">' + esc(f.keep) + '</p>' : '') + '</div>' : f.keep ? '<p class="keep">' + esc(f.keep) + '</p>' : '') +
    dis + '<div class="fc-a">' + acts + '</div></article>';
}

function aiPanel(sub) {
  const a = UI.ai && UI.ai.id === sub.id ? UI.ai : null;
  const hasAI = sub.ai && sub.ai.items;
  if (!editable(sub) && !hasAI) return '';
  const masked = E.maskPII(sub.draft);
  let body = '';
  if (a && a.status === 'confirm') {
    body = '<p><b>What will be sent:</b> the draft below (personal data masked), your goal, the guideline clauses and the approved facts. Nothing else.</p><pre class="sent">' + esc(trunc(masked, 700)) + '</pre>' +
      '<div class="row-gap"><button class="btn primary sm" data-act="aiSend">Send to AI</button><button class="btn ghost sm" data-act="aiClose">Cancel</button></div>';
  } else if (a && a.status === 'running') {
    body = '<p class="muted">Asking the AI for a second opinion…</p>';
  } else if (a && a.status === 'unavailable') {
    body = '<p class="muted">The AI second opinion needs the Claude app around this page. Everything else works without it.</p><button class="btn ghost sm" data-act="aiClose">Close</button>';
  } else if (a && a.status === 'error') {
    body = '<p class="bad">' + esc(a.msg) + '</p><button class="btn ghost sm" data-act="aiClose">Close</button>';
  } else if (a && a.status === 'done') {
    body = '<p><b>' + a.kept + ' AI finding' + (a.kept === 1 ? '' : 's') + ' added.</b> ' + (a.dropped.length ? a.dropped.length + ' discarded because they had no valid source in the brand kit: ' + a.dropped.map((x) => esc(x.why.toLowerCase())).join(', ') + '.' : 'All were backed by a clause.') + '</p><button class="btn ghost sm" data-act="aiClose">Close</button>';
  }
  const btn = editable(sub) ? (sub.confidential ? '<span class="muted small">' + IC.lock + ' Confidential: AI is off for this review</span>' : '<button class="btn sm" data-act="aiOpen">' + IC.spark + ' AI second opinion</button>') : '';
  return '<div class="aip"><div class="aip-h">' + btn + (hasAI ? '<span class="muted small">Last AI check: ' + sub.ai.items.length + ' kept, ' + sub.ai.dropped + ' discarded</span>' : '') + '</div>' + (body ? '<div class="aip-b">' + body + '</div>' : '') +
    '<p class="muted small">AI use is disclosed on every review. Rules always run first, and the AI can only cite clauses that exist.</p></div>';
}
function findingsPane(sub, A) {
  const ed = editable(sub);
  let list = A.findings.filter((f) => UI.sev === 'all' || f.severity === UI.sev);
  if (UI.openOnly) list = list.filter((f) => !f.decision);
  list.sort((a, b) => E.SEV[b.severity] - E.SEV[a.severity] || ((a.start < 0) - (b.start < 0)) || a.start - b.start);
  const safeN = A.open.filter((f) => f.safe && f.fix && f.start >= 0).length;
  const total = A.findings.length;
  const chips = [['all', 'All', total], ['high', 'High', A.findings.filter((f) => f.severity === 'high').length], ['medium', 'Medium', A.findings.filter((f) => f.severity === 'medium').length], ['low', 'Low', A.findings.filter((f) => f.severity === 'low').length]];
  return '<div class="fp-h"><h2>Findings</h2><span class="muted small">' + A.open.length + ' open · ' + (total - A.open.length) + ' resolved</span></div>' +
    '<div class="chips sm">' + chips.map(([k, l, n]) => '<button class="fchip' + (UI.sev === k ? ' on' : '') + '" data-act="sev" data-k="' + k + '">' + l + ' <b>' + n + '</b></button>').join('') +
    '<label class="chk tiny"><input type="checkbox" id="openOnly" ' + (UI.openOnly ? 'checked' : '') + '> Hide resolved</label></div>' +
    (ed && safeN ? '<div class="safe"><span><b>' + safeN + ' mechanical fix' + (safeN > 1 ? 'es' : '') + '</b> (spelling of terms, capitals, hashtags). Claims and facts are never applied for you.</span><button class="btn sm" data-act="applySafe">Apply ' + safeN + '</button></div>' : '') +
    aiPanel(sub) +
    (list.length ? list.map((f) => card(sub, f, ed)).join('') : '<div class="allclear"><div class="big">' + IC.check + '</div><b>' + (total ? 'Nothing matches this filter' : 'No issues found') + '</b><p class="muted">' + (total ? 'Change the filter above.' : 'This content matches the brand kit. A person still decides whether it goes out.') + '</p></div>');
}

function viewReview() {
  const sub = getSub(UI.sel);
  if (!sub) { UI.view = 'queue'; return viewQueue(); }
  const A = analysis(sub), ed = editable(sub);
  const body = UI.editing && ed
    ? '<textarea id="draft" class="draft-ta" rows="14" spellcheck="true" aria-label="Content">' + esc(sub.draft) + '</textarea><div class="row-gap"><button class="btn primary sm" data-act="doneEdit">Done editing</button><span class="muted small" id="liveCount">' + A.open.length + ' open issues</span></div>'
    : '<div class="draft" id="draftView">' + annotated(sub, A) + '</div>' + (ed ? '<div class="row-gap"><button class="btn sm" data-act="startEdit">Edit text</button><span class="muted small">Underlines show findings. Click one to see why.</span></div>' : '<p class="muted small">Underlines show findings. Click one to see why.</p>');
  return '<div class="wrap review"><div class="r-top"><button class="btn ghost sm" data-act="nav" data-v="queue">' + IC.back + ' All reviews</button></div>' +
    '<div class="r-grid"><div class="r-left">' +
    '<div class="page-h tight"><div><h1>' + esc(sub.title) + '</h1><p class="muted">' + esc(sub.channel) + ' · ' + esc(sub.team) + ' · by ' + esc(sub.author.name) + ' · version ' + sub.versions.length + '</p></div>' + statusPill(sub.status) + '</div>' +
    '<section class="card"><div class="card-h"><h3>Content</h3>' + (sub.confidential ? '<span class="chip conf">' + IC.lock + ' Confidential</span>' : '') + '</div>' +
    '<p class="goal"><span class="k">Goal</span> ' + (ed ? '<input id="goal" class="goal-in" value="' + esc(sub.goal) + '" placeholder="What should this achieve?">' : esc(sub.goal || 'Not stated')) + '</p>' + body + '</section>' +
    metersHtml(A) + visualCard(sub, A) + discussion(sub) + actionBar(sub, A) +
    '</div><aside class="r-right" aria-label="Findings">' + findingsPane(sub, A) + '</aside></div></div>';
}

/* ---------- brand kit ---------- */
function viewKit() {
  const kit = D.kit, mgr = isManager();
  const tabs = [['guidelines', 'Guidelines'], ['glossary', 'Glossary'], ['banned', 'Banned phrases'], ['facts', 'Approved facts'], ['claims', 'Claims register'], ['palette', 'Palette and logo'], ['share', 'Import and export']];
  let b = '';
  const ro = mgr ? '' : '<p class="note">Read only. Switch to <b>Brand Manager</b> (top right) to edit the kit.</p>';
  if (UI.kitTab === 'guidelines') {
    const groups = [...new Set(kit.clauses.map((c) => c.group))];
    b = groups.map((g) => '<h3 class="grp">' + g + '</h3><div class="clauses">' + kit.clauses.filter((c) => c.group === g).map((c) => {
      const rules = Object.entries(E.RULES).filter(([, r]) => r.clause === c.id).map(([k, r]) => '<span class="chip">' + k + '</span>');
      return '<div class="clause' + (UI.kitFocus === c.id ? ' flash' : '') + '" id="cl-' + c.id + '"><span class="cid">' + c.id + '</span><div><b>' + esc(c.title) + '</b><p>' + esc(c.text) + '</p>' + (rules.length ? '<div class="rules">Checked by ' + rules.join('') + '</div>' : '') + '</div></div>';
    }).join('') + '</div>').join('');
  } else if (UI.kitTab === 'glossary') {
    b = ro + '<div class="tw"><table><thead><tr><th>Avoid</th><th>Use</th><th>Why</th></tr></thead><tbody>' + kit.glossary.map((g) => '<tr><td>' + g.wrong.map((w) => '<span class="chip">' + esc(w) + '</span>').join(' ') + '</td><td><b>' + esc(g.right) + '</b></td><td class="muted">' + esc(g.note || '') + '</td></tr>').join('') + '</tbody></table></div>' +
      (mgr ? '<form data-form="addGlossary" class="form-grid inline"><label>Avoid (comma separated)<input id="g-wrong" name="wrong" required placeholder="cheap, bargain"></label><label>Use instead<input id="g-right" name="right" required placeholder="affordable"></label><label class="wide">Why<input id="g-note" name="note" placeholder="Optional"></label><div class="wide"><button class="btn primary sm" type="submit">Add term</button></div></form>' : '');
  } else if (UI.kitTab === 'banned') {
    b = ro + '<div class="tw"><table><thead><tr><th>Phrase</th><th>Type</th><th>Suggestion</th><th>Only in</th></tr></thead><tbody>' + kit.banned.map((p) => '<tr><td><b>' + esc(p.phrase) + '</b></td><td>' + p.kind + '</td><td>' + (p.suggest ? esc(p.suggest) : '<span class="muted">none</span>') + '</td><td class="muted">' + (p.channels && p.channels.length ? p.channels.join(', ') : 'all channels') + '</td></tr>').join('') + '</tbody></table></div>' +
      (mgr ? '<form data-form="addBanned" class="form-grid inline"><label>Phrase<input id="b-phrase" name="phrase" required></label><label>Type<select id="b-kind" name="kind"><option value="hype">Hype</option><option value="jargon">Jargon</option><option value="slang">Slang (email and press only)</option></select></label><label class="wide">Suggested replacement<input id="b-suggest" name="suggest" placeholder="Optional"></label><div class="wide"><button class="btn primary sm" type="submit">Add phrase</button></div></form>' : '');
  } else if (UI.kitTab === 'facts') {
    b = ro + '<p class="muted">Content is checked against these values. Change one and every open review is re-checked.</p><div class="facts">' + kit.facts.map((f) => '<form class="fact" data-form="setFact" data-key="' + f.key + '"><div><b>' + esc(f.label) + '</b><small class="muted">' + esc(f.source) + '</small></div><input type="number" id="f-' + f.key + '" name="value" value="' + f.value + '" ' + (mgr ? '' : 'disabled') + ' aria-label="' + esc(f.label) + '">' + (mgr ? '<button class="btn sm" type="submit">Update</button>' : '') + '</form>').join('') + '</div>';
  } else if (UI.kitTab === 'claims') {
    const row = (c) => '<tr><td><b>' + esc(c.text) + '</b></td><td class="muted">' + (c.status === 'approved' ? 'Source: ' + esc(c.source || '') : c.suggest ? 'Suggest: ' + esc(c.suggest) : c.suggest === '' ? 'Remove the phrase' : 'No automatic fix') + '</td></tr>';
    b = ro + '<h3 class="grp">Approved claims</h3><div class="tw"><table><tbody>' + kit.claims.filter((c) => c.status === 'approved').map(row).join('') + '</tbody></table></div><h3 class="grp">Prohibited claims</h3><div class="tw"><table><tbody>' + kit.claims.filter((c) => c.status === 'prohibited').map(row).join('') + '</tbody></table></div>' +
      (mgr ? '<form data-form="addClaim" class="form-grid inline"><label>Status<select id="c-status" name="status"><option value="approved">Approved</option><option value="prohibited">Prohibited</option></select></label><label>Phrase<input id="c-text" name="text" required placeholder="For example: free for students"></label><label>Source or replacement<input id="c-extra" name="extra" placeholder="Source (approved) or replacement (prohibited)"></label><div class="wide"><button class="btn primary sm" type="submit">Add claim</button></div></form>' : '');
  } else if (UI.kitTab === 'palette') {
    b = '<div class="palette">' + kit.palette.map((p) => '<div class="pc"><i style="background:' + p.hex + '"></i><b>' + p.name + '</b><span class="mono">' + p.hex + '</span><small class="muted">' + p.use + '</small></div>').join('') + '</div>' +
      '<p class="muted">Contrast rule: text needs 4.5:1 (3:1 for large text). Logo: full-colour on light, white on dark, never stretched. The 2022 logo is retired.</p>';
  } else {
    const exp = JSON.stringify({ glossary: kit.glossary.map(({ wrong, right, note }) => ({ wrong, right, note })), banned: kit.banned, facts: kit.facts.map(({ key, value }) => ({ key, value })), claims: kit.claims.map(({ status, text, pattern, suggest, source }) => ({ status, text, pattern, suggest, source })) }, null, 2);
    b = ro + '<div class="two"><div><h3 class="grp">Export</h3><textarea id="exp" rows="10" readonly>' + esc(exp) + '</textarea><button class="btn sm" data-act="copyKit">Copy JSON</button></div>' +
      '<div><h3 class="grp">Import</h3><textarea id="imp" rows="10" placeholder="Paste kit JSON here. New glossary terms, phrases and claims are added; facts are updated by key."' + (mgr ? '' : ' disabled') + '></textarea>' + (mgr ? '<button class="btn primary sm" data-act="importKit">Import</button>' : '') + '</div></div>' +
      '<h3 class="grp">Version history</h3><ol class="audit">' + kit.changelog.map((c) => '<li><span class="rchip r-manager">Manager</span><span><b>' + esc(c.by) + '</b> ' + esc(c.text) + '<br><small class="muted">' + stamp(c.at) + '</small></span></li>').join('') + '</ol>';
  }
  return '<div class="wrap"><div class="page-h"><div><h1>Brand Kit</h1><p class="muted">The approved source material for every check. Version ' + kit.version + ' · ' + kit.name + ' (demo brand)</p></div></div>' +
    '<div class="tabs scroll" role="tablist">' + tabs.map(([k, l]) => '<button role="tab" aria-selected="' + (UI.kitTab === k) + '" class="tab' + (UI.kitTab === k ? ' on' : '') + '" data-act="kitTab" data-k="' + k + '">' + l + '</button>').join('') + '</div><div class="card kitb">' + b + '</div></div>';
}

/* ---------- insights ---------- */
function barChart(data) {
  const rows = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max.apply(null, rows.map((r) => r[1]).concat(1));
  const H = rows.length * 30 + 6;
  return '<svg viewBox="0 0 560 ' + H + '" class="chart" role="img" aria-label="Issues caught by category">' + rows.map(([k, v], i) => {
    const y = i * 30 + 4, w = Math.max(3, (v / max) * 360);
    return '<text x="0" y="' + (y + 16) + '" class="ct">' + CAT_LABEL[k] + '</text><rect x="120" y="' + y + '" width="' + w + '" height="20" rx="3" class="bar"/><text x="' + (128 + w) + '" y="' + (y + 15) + '" class="cv">' + v + '</text>';
  }).join('') + '</svg>';
}
function trendChart(weeks) {
  const W = 560, Ht = 190, l = 30, r = 16, t = 20, bt = 28;
  const max = Math.ceil(Math.max.apply(null, weeks.concat(1)) / 10) * 10;
  const x = (i) => l + (i * (W - l - r)) / (weeks.length - 1), y = (v) => t + (1 - v / max) * (Ht - t - bt);
  const pts = weeks.map((v, i) => x(i) + ',' + y(v)).join(' ');
  const area = l + ',' + y(0) + ' ' + pts + ' ' + x(weeks.length - 1) + ',' + y(0);
  const labels = ['6 wks ago', '5 wks', '4 wks', '3 wks', '2 wks', 'Now'];
  return '<svg viewBox="0 0 ' + W + ' ' + Ht + '" class="chart" role="img" aria-label="Issues caught per week: ' + weeks.join(', ') + '">' +
    [0, max / 2, max].map((v) => '<line x1="' + l + '" x2="' + (W - r) + '" y1="' + y(v) + '" y2="' + y(v) + '" class="grid"/><text x="0" y="' + (y(v) + 4) + '" class="ct s">' + v + '</text>').join('') +
    '<polygon points="' + area + '" class="area"/><polyline points="' + pts + '" class="line" fill="none"/>' +
    weeks.map((v, i) => '<circle cx="' + x(i) + '" cy="' + y(v) + '" r="' + (i === weeks.length - 1 ? 5 : 3) + '" class="dot' + (i === weeks.length - 1 ? ' last' : '') + '"/><text x="' + x(i) + '" y="' + (y(v) - 9) + '" text-anchor="middle" class="cv s">' + v + '</text><text x="' + x(i) + '" y="' + (Ht - 8) + '" text-anchor="middle" class="ct s">' + labels[i] + '</text>').join('') + '</svg>';
}
function viewInsights() {
  const I = insights();
  const approved = D.subs.filter((s) => s.status === 'approved').length;
  const rules = I.rules.slice();
  const repeat = rules.slice().sort((a, b) => b.n - a.n).slice(0, 8);
  const unclear = rules.filter((r) => r.n >= 5 && r.rate >= 0.5).sort((a, b) => b.rate - a.rate);
  const reviewsTot = K.SEED_REVIEWS_PER_WEEK.reduce((a, b) => a + b, 0) + D.subs.length;
  return '<div class="wrap"><div class="page-h"><div><h1>Governance insights</h1><p class="muted">What goes wrong most often, and which guidelines people keep overriding. Includes six weeks of sample history from the demo workspace, plus everything you do here.</p></div></div>' +
    '<div class="kpis"><div><b>' + I.total + '</b><span>issues caught before publishing</span></div><div><b>' + Math.round((I.fixed / I.total) * 100) + '%</b><span>fixed rather than dismissed</span></div><div><b>' + Math.round(K.SEED_CLEAN_RATE[5] * 100) + '%</b><span>of reviews clean on first check (was ' + Math.round(K.SEED_CLEAN_RATE[0] * 100) + '% six weeks ago)</span></div><div><b>' + reviewsTot + '</b><span>reviews checked · ' + approved + ' approved in this demo</span></div></div>' +
    '<div class="two-c"><section class="card"><h3>Issues caught by category</h3>' + barChart(I.byCat) + '</section><section class="card"><h3>Issues caught per week</h3>' + trendChart(I.weeks) + '</section></div>' +
    '<section class="card"><div class="card-h"><h3>Guidelines that may be unclear</h3><span class="muted small">Rules dismissed at least half the time, with 5 or more hits</span></div>' +
    (unclear.length ? '<div class="tw"><table><thead><tr><th>Rule</th><th>Clause</th><th>Dismissed</th><th>What to do</th></tr></thead><tbody>' + unclear.map((r) => '<tr><td><b>' + esc(r.meta.label) + '</b><br><span class="mono muted small">' + r.rule + '</span></td><td><button class="lnk" data-act="openClause" data-c="' + r.meta.clause + '">' + r.meta.clause + '</button></td><td><span class="rate"><i style="width:' + Math.round(r.rate * 100) + '%"></i></span> ' + r.dis + ' of ' + r.n + ' (' + Math.round(r.rate * 100) + '%)</td><td>Creators keep overriding this. Add a clear example or an exception to clause ' + r.meta.clause + ', or relax the rule.</td></tr>').join('') + '</tbody></table></div>' : '<p class="empty">No unclear guidelines right now.</p>') + '</section>' +
    '<section class="card"><div class="card-h"><h3>Repeat mistakes</h3><span class="muted small">Most frequent findings across all teams</span></div><div class="tw"><table><thead><tr><th>Rule</th><th>Times caught</th><th>Most affected team</th><th>Dismissed</th></tr></thead><tbody>' +
    repeat.map((r) => '<tr><td><b>' + esc(r.meta.label) + '</b><br><span class="mono muted small">' + r.rule + '</span></td><td>' + r.n + '</td><td>' + esc(r.team) + '</td><td>' + Math.round(r.rate * 100) + '%</td></tr>').join('') + '</tbody></table></div></section></div>';
}

/* ---------- about ---------- */
function viewAbout() {
  const steps = [['Import', 'The Brand Manager sets up guidelines, glossary, approved facts, claims and palette.'], ['Check', 'A rule engine checks text and visual details. Every finding cites a clause or approved fact.'], ['Second opinion', 'Optional AI review for what rules cannot see. A validator drops anything without a real source.'], ['Fix', 'The creator accepts, edits or dismisses each suggestion. Nothing is changed automatically.'], ['Approve', 'Manager and Reviewer approve. High-severity dismissals need Reviewer sign-off.'], ['Learn', 'Every decision feeds the insights page so unclear guidelines get fixed.']];
  return '<div class="wrap narrow"><div class="page-h"><div><h1>How BrandLens works</h1><p class="muted">Built for the Inkloom AI brand-governance challenge, Round 2. The brand “Lumo Budget” is fictional.</p></div></div>' +
    '<ol class="flow">' + steps.map(([h, p], i) => '<li><span class="n">' + (i + 1) + '</span><div><b>' + h + '</b><p>' + p + '</p></div></li>').join('') + '</ol>' +
    '<section class="card"><h3>Automation and human control</h3><div class="tw"><table><thead><tr><th>Done by rules</th><th>Done by AI (optional)</th><th>Always done by a person</th></tr></thead><tbody><tr><td>Terminology, capitals, hype words, facts, prices, claims, disclaimers, reading level, hashtags, contrast, palette, logo, personal data</td><td>Tone against the creator’s goal, misleading implications, confusing wording. Each finding must cite an existing clause and quote the draft.</td><td>Applying every change, dismissing findings, final approval, signing off dismissed high-severity findings, editing the brand kit</td></tr></tbody></table></div></section>' +
    '<section class="card"><h3>Privacy and AI disclosure</h3><ul class="plain"><li>The rule engine runs entirely in your browser. Drafts are not uploaded for the rule checks.</li><li>The AI second opinion is optional. Before anything is sent you see the exact text. Emails, phone numbers and ID numbers are masked first.</li><li>Mark a review as confidential and the AI is switched off for it.</li><li>Findings about personal data or confidential markings can’t be dismissed, only fixed.</li><li>Demo data is stored only in this browser. Use “Reset demo data” on the Reviews page to start again.</li></ul></section>' +
    '<section class="card"><h3>Known limits in this build</h3><ul class="plain"><li>Image checks use colours and details you provide plus a palette scan. Reading text inside images and spotting logo misuse by sight come in Round 3.</li><li>Roles are switched from the top bar for the demo. Real accounts and access rules come with the server version.</li><li>Rules are tuned for English. Hindi support is planned.</li></ul></section></div>';
}

/* ---------- router ---------- */
function render() {
  const y = window.scrollY;
  renderTop();
  const app = document.getElementById('app');
  const views = { queue: viewQueue, review: viewReview, kit: viewKit, insights: viewInsights, about: viewAbout };
  app.innerHTML = (views[UI.view] || viewQueue)();
  window.scrollTo(0, y);
  if (UI.flash) {
    const el = document.getElementById(UI.flash);
    if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('flash'); }
    UI.flash = null;
  }
  if (UI.scrollCard && UI.active) {
    const el = document.getElementById('fc-' + UI.active);
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    UI.scrollCard = false;
  }
  if (UI.scrollMark) {
    const m = document.querySelector('.mk.on');
    if (m) m.scrollIntoView({ block: 'center', behavior: 'smooth' });
    UI.scrollMark = false;
  }
  if (UI.view === 'review' && UI.editing) {
    const ta = document.getElementById('draft');
    if (ta && UI.caret != null) { ta.focus(); ta.setSelectionRange(UI.caret, UI.caret); UI.caret = null; }
  }
}
