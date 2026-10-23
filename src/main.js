/* ===== main.js: events and boot ===== */
const $ = (s, r) => (r || document).querySelector(s);
const curSub = () => getSub(UI.sel);
const findById = (sub, id) => analysis(sub).findings.find((f) => f.id === id);
const findByKey = (sub, key) => analysis(sub).findings.find((f) => f.key === key);

function openSub(id) {
  Object.assign(UI, { sel: id, view: 'review', editing: false, tab: 'comments', sev: 'all', diffV: null, ai: null, dismissing: null, active: null, note: '', cdraft: '', cref: null });
  render();
  window.scrollTo(0, 0);
}
function phrasePattern(t) {
  return '(?<![\\w])' + t.trim().split(/\s+/).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/-/g, '[- ]')).join('\\s+') + '(?![\\w])';
}
function commitAndRender(msg, kind) { save(); render(); if (msg) toast(msg, kind); }

/* ----- clicks ----- */
document.addEventListener('click', async (ev) => {
  const t = ev.target.closest('[data-act]');
  if (!t) {
    const card = ev.target.closest('.fc');
    if (card && !ev.target.closest('button,input,textarea,a,label') && UI.view === 'review') {
      UI.active = card.dataset.fid; UI.scrollMark = true; render();
    }
    return;
  }
  const a = t.dataset.act, sub = curSub();
  const ed = sub && editable(sub);
  switch (a) {
    case 'nav': ev.preventDefault(); UI.view = t.dataset.v; UI.editing = false; try { history.replaceState(null, '', '#' + UI.view); } catch (e) { /* ignore */ } render(); window.scrollTo(0, 0); break;
    case 'role': D.role = t.dataset.r; UI.editing = false; UI.dismissing = null; UI.note = ''; commitAndRender(); break;
    case 'filter': UI.filter = t.dataset.k; render(); break;
    case 'open': openSub(t.dataset.id); break;
    case 'open-hero': openSub('s-hero'); break;
    case 'newToggle': UI.newOpen = !UI.newOpen; render(); break;
    case 'tourHide': D.tourHidden = true; commitAndRender(); break;
    case 'reset': D = fresh(); cache.clear(); Object.assign(UI, { view: 'queue', sel: null, ai: null, newOpen: false }); commitAndRender('Demo data reset.'); break;

    case 'pick': { UI.active = t.dataset.fid; UI.scrollCard = true; tourMark('picked'); save(); render(); break; }
    case 'startEdit': UI.editing = true; UI.editStart = sub.draft; render(); break;
    case 'editAt': { const f = findById(sub, t.dataset.fid); UI.editing = true; UI.editStart = sub.draft; UI.caret = f ? f.start : null; render(); break; }
    case 'doneEdit': {
      UI.editing = false;
      if (UI.editStart !== undefined && UI.editStart !== sub.draft) log(sub, 'edit', 'Edited the text');
      commitAndRender(); break;
    }
    case 'applyFix': {
      if (!ed) break;
      const f = findById(sub, t.dataset.fid);
      if (f) { applyFinding(sub, f); commitAndRender('Fix applied. Review the change before you submit.'); }
      break;
    }
    case 'applySafe': {
      if (!ed) break;
      const n = applySafe(sub);
      commitAndRender(n + ' mechanical fix' + (n === 1 ? '' : 'es') + ' applied.');
      break;
    }
    case 'dismissStart': UI.dismissing = t.dataset.key; render(); { const i = $('#dis-reason'); if (i) i.focus(); } break;
    case 'dismissCancel': UI.dismissing = null; render(); break;
    case 'dismissConfirm': {
      const f = findByKey(sub, t.dataset.key);
      const reason = ($('#dis-reason') || {}).value || '';
      if (f && dismissFinding(sub, f, reason)) { UI.dismissing = null; commitAndRender('Dismissed. The reason is in the audit trail.'); }
      break;
    }
    case 'undo': {
      const d = sub.decisions[t.dataset.key];
      if (d) {
        const rule = t.dataset.key.split('|')[0];
        const i = D.events.map((e, k) => (e.live && e.rule === rule && e.outcome === 'dismissed' ? k : -1)).filter((k) => k >= 0).pop();
        if (i !== undefined) D.events.splice(i, 1);
        delete sub.decisions[t.dataset.key];
        log(sub, 'undo', 'Reopened a dismissed finding');
        commitAndRender();
      }
      break;
    }
    case 'signoff': case 'signoffAll': {
      const A = analysis(sub);
      const list = a === 'signoff' ? A.findings.filter((f) => f.key === t.dataset.key) : A.needsAck;
      list.forEach((f) => { if (f.decision && f.severity === 'high') { f.decision.ack = true; f.decision.ackBy = me().name; sub.decisions[f.key] = f.decision; log(sub, 'signoff', 'Signed off the dismissal of “' + (f.text || f.title).slice(0, 40) + '”'); } });
      commitAndRender('Signed off.');
      break;
    }
    case 'sev': UI.sev = t.dataset.k; render(); break;
    case 'tab': UI.tab = t.dataset.k; render(); break;
    case 'diff': UI.diffV = UI.diffV === +t.dataset.v ? null : +t.dataset.v; render(); break;
    case 'commentOn': { const f = findById(sub, t.dataset.fid); UI.cref = f ? f.title : null; UI.tab = 'comments'; render(); const c = $('#cdraft'); if (c) { c.focus(); c.scrollIntoView({ block: 'center' }); } break; }
    case 'clearRef': UI.cref = null; render(); break;
    case 'postComment': {
      const c = $('#cdraft'); const txt = c ? c.value : UI.cdraft;
      if (!txt.trim()) { toast('Write a comment first.', 'bad'); break; }
      addComment(sub, txt, UI.cref); UI.cdraft = ''; UI.cref = null; commitAndRender('Comment posted.');
      break;
    }
    case 'gotoVisual': { const el = $('#v-alt') || $('#visualCard'); if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.focus && el.focus(); } break; }
    case 'samplePoster': {
      if (!ed) break;
      try {
        const r = await processImage(samplePoster());
        Object.assign(sub.visual, { hasImage: true, palette: r.palette, thumb: r.thumb });
        log(sub, 'visual', 'Added an image (sample poster)');
        commitAndRender('Sample poster added and scanned.');
      } catch (e) { toast(e.message, 'bad'); }
      break;
    }

    case 'saveVersion': if (saveVersion(sub, 'Saved by creator')) commitAndRender('Version saved.'); else toast('No changes since the last version.'); break;
    case 'submit': {
      const A = analysis(sub);
      if (A.openHigh.length) { toast('Resolve the ' + A.openHigh.length + ' high-severity issue' + (A.openHigh.length > 1 ? 's' : '') + ' first: fix them, or dismiss with a reason.', 'bad'); break; }
      saveVersion(sub, 'Submitted for review');
      setStatus(sub, 'in_review', 'Submitted version ' + sub.versions.length + ' for review', 'submitted');
      tourMark('submitted'); UI.editing = false;
      commitAndRender('Submitted. Switch to Brand Manager (top right) to approve it.');
      break;
    }
    case 'withdraw': setStatus(sub, 'draft', 'Withdrew the review to edit', 'withdraw'); commitAndRender(); break;
    case 'approve': {
      const bl = approvalBlockers(sub);
      if (bl.length) { toast('Can’t approve yet: ' + bl.join('; ') + '.', 'bad'); break; }
      const n = ($('#note') || {}).value || UI.note;
      if (n && n.trim()) addComment(sub, n);
      sub.approvedBy = me().name;
      setStatus(sub, 'approved', 'Approved version ' + sub.versions.length, 'approved');
      if (sub.id === 's-hero') tourMark('approved');
      UI.note = ''; commitAndRender('Approved. This version is locked.');
      break;
    }
    case 'requestChanges': case 'reject': {
      const n = (($('#note') || {}).value || UI.note || '').trim();
      if (n.length < 4) { toast('Add a decision note so the creator knows what to do.', 'bad'); break; }
      addComment(sub, n);
      if (a === 'reject') setStatus(sub, 'rejected', 'Rejected: ' + n, 'rejected');
      else setStatus(sub, 'changes_requested', 'Requested changes: ' + n, 'changes');
      UI.note = ''; commitAndRender(a === 'reject' ? 'Rejected.' : 'Changes requested. Switch to Creator to fix them.');
      break;
    }
    case 'reopen': sub.approvedBy = null; setStatus(sub, 'in_review', 'Reopened the review', 'reopen'); commitAndRender(); break;

    case 'aiOpen': if (sub.confidential) { toast('This review is confidential. The AI is off.', 'bad'); break; } UI.ai = { id: sub.id, status: 'confirm' }; render(); break;
    case 'aiClose': UI.ai = null; render(); break;
    case 'aiSend': await runAI(sub); render(); break;

    case 'kitTab': UI.kitTab = t.dataset.k; render(); break;
    case 'openClause': UI.view = 'kit'; UI.kitTab = 'guidelines'; UI.kitFocus = t.dataset.c; UI.flash = 'cl-' + t.dataset.c; render(); break;
    case 'copyKit': {
      const ta = $('#exp');
      try { await navigator.clipboard.writeText(ta.value); toast('Kit JSON copied.'); } catch (e) { ta.focus(); ta.select(); toast('Press Ctrl+C to copy the selected text.'); }
      break;
    }
    case 'importKit': {
      if (!isManager()) break;
      const txt = ($('#imp') || {}).value || '';
      try {
        const o = JSON.parse(txt);
        let n = 0;
        (o.glossary || []).forEach((g) => { if (Array.isArray(g.wrong) && g.right) { D.kit.glossary.push({ id: uid('G-'), wrong: g.wrong.map(String), right: String(g.right), rule: 'TERM-GLO', clause: 'T-2.1', note: g.note || '' }); n++; } });
        (o.banned || []).forEach((b) => { if (b.phrase) { D.kit.banned.push({ phrase: String(b.phrase), kind: ['hype', 'jargon', 'slang'].includes(b.kind) ? b.kind : 'hype', suggest: b.suggest || '', channels: b.channels }); n++; } });
        (o.claims || []).forEach((c) => { if (c.text && (c.status === 'approved' || c.status === 'prohibited')) { D.kit.claims.push({ id: uid(c.status === 'approved' ? 'AC-' : 'PC-'), status: c.status, text: String(c.text), pattern: c.pattern || phrasePattern(String(c.text)), suggest: c.suggest, source: c.source }); n++; } });
        (o.facts || []).forEach((f) => { const k = D.kit.facts.find((x) => x.key === f.key); if (k && isFinite(+f.value)) { k.value = +f.value; n++; } });
        if (!n) throw new Error('Nothing to import. Expected glossary, banned, claims or facts.');
        kitChange('Imported ' + n + ' entries from JSON'); cache.clear(); commitAndRender('Imported ' + n + ' entries.');
      } catch (e) { toast('Import failed: ' + e.message, 'bad'); }
      break;
    }
  }
});

document.addEventListener('keydown', (ev) => {
  if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches && ev.target.matches('mark[data-act="pick"]')) { ev.preventDefault(); ev.target.click(); }
});

/* ----- inputs ----- */
let saveT;
const saveSoon = () => { clearTimeout(saveT); saveT = setTimeout(save, 400); };
function syncRatio() {
  const fg = ($('#v-fg') || {}).value, bg = ($('#v-bg') || {}).value, out = $('#ratioOut'), large = ($('#v-large') || {}).checked;
  if (!out) return;
  const r = fg && bg ? E.contrast(fg, bg) : null;
  if (r) out.style.cssText = '--fg:' + fg + ';--bgc:' + bg;
  const need = large ? 3 : 4.5;
  out.lastElementChild.innerHTML = r ? '<b>' + r.toFixed(2) + ':1</b> ' + (r >= need ? '<em class="good">Passes AA</em>' : '<em class="bad">Fails AA (needs ' + need + ':1)</em>') : 'Enter two valid hex colours';
}
document.addEventListener('input', (ev) => {
  const t = ev.target, sub = curSub();
  if (t.id === 'draft' && sub) { sub.draft = t.value; const n = analysis(sub).open.length; const c = $('#liveCount'); if (c) c.textContent = n + ' open issue' + (n === 1 ? '' : 's'); saveSoon(); }
  else if (t.id === 'goal' && sub) { sub.goal = t.value; saveSoon(); }
  else if (t.id === 'cdraft') UI.cdraft = t.value;
  else if (t.id === 'note') UI.note = t.value;
  else if (t.id === 'nr-text') UI.newText = t.value;
  else if (t.dataset && (t.dataset.vis === 'fg' || t.dataset.vis === 'bg')) {
    const key = t.dataset.vis;
    if (t.type === 'color') { const h = $('#v-' + key); if (h) h.value = t.value.toUpperCase(); }
    else if (E.hexToRgb(t.value)) { const c = $('#v-' + key + 'c'); if (c) c.value = '#' + t.value.replace('#', '').padStart(6, '0').slice(0, 6); }
    syncRatio();
  }
});
document.addEventListener('change', async (ev) => {
  const t = ev.target, sub = curSub();
  if (t.id === 'openOnly') { UI.openOnly = t.checked; render(); return; }
  if (t.dataset && t.dataset.vis && sub && editable(sub)) {
    const k = t.dataset.vis, v = sub.visual;
    if (k === 'hasImage' || k === 'large') v[k] = t.checked;
    else if (k === 'fg' || k === 'bg') { let val = t.value.trim(); if (!val.startsWith('#')) val = '#' + val; if (!E.hexToRgb(val)) { toast('Use a hex colour such as #1B1F4B.', 'bad'); render(); return; } v[k] = val.length === 4 ? '#' + val.slice(1).split('').map((c) => c + c).join('') : val.toUpperCase(); }
    else v[k] = t.value;
    log(sub, 'visual', 'Updated visual details (' + k + ')');
    commitAndRender();
    return;
  }
  if (t.dataset && t.dataset.file === 'text' && t.files[0]) {
    try { UI.newText = await readTextFile(t.files[0]); const ti = $('#nr-title'); if (ti && !ti.value) ti.value = t.files[0].name.replace(/\.[^.]+$/, ''); const ta = $('#nr-text'); if (ta) ta.value = UI.newText; toast('File loaded: ' + t.files[0].name); }
    catch (e) { toast('Could not read this file: ' + e.message, 'bad'); }
  }
  if (t.dataset && t.dataset.file === 'image' && t.files[0] && sub) {
    const url = URL.createObjectURL(t.files[0]);
    try {
      const r = await processImage(url);
      Object.assign(sub.visual, { hasImage: true, palette: r.palette, thumb: r.thumb });
      log(sub, 'visual', 'Added an image (' + t.files[0].name + ')');
      commitAndRender('Image added and scanned.');
    } catch (e) { toast(e.message, 'bad'); }
    URL.revokeObjectURL(url);
  }
});

/* ----- forms ----- */
document.addEventListener('submit', (ev) => {
  const f = ev.target.closest('form[data-form]');
  if (!f) return;
  ev.preventDefault();
  const fd = Object.fromEntries(new FormData(f).entries());
  const kind = f.dataset.form;
  if (kind === 'newReview') {
    if (!fd.text || !fd.text.trim()) { toast('Add some content to check.', 'bad'); return; }
    const s = newReview({ title: fd.title.trim(), channel: fd.channel, team: fd.team, goal: fd.goal, text: fd.text, confidential: !!fd.confidential });
    UI.newOpen = false; UI.newText = ''; save(); openSub(s.id);
    const n = analysis(s).open.length;
    toast(n ? n + ' issue' + (n === 1 ? '' : 's') + ' found. Click any underlined text to see why.' : 'No issues found.');
    return;
  }
  if (!isManager()) { toast('Only the Brand Manager can edit the kit.', 'bad'); return; }
  if (kind === 'addGlossary') {
    const wrong = fd.wrong.split(',').map((s) => s.trim()).filter(Boolean);
    if (!wrong.length || !fd.right.trim()) return;
    D.kit.glossary.push({ id: uid('G-'), wrong, right: fd.right.trim(), rule: 'TERM-GLO', clause: 'T-2.1', note: fd.note || '' });
    kitChange('Added glossary term: ' + wrong.join(', ') + ' → ' + fd.right.trim());
  } else if (kind === 'addBanned') {
    D.kit.banned.push({ phrase: fd.phrase.trim(), kind: fd.kind, suggest: (fd.suggest || '').trim(), channels: fd.kind === 'slang' ? ['Email', 'Press note'] : undefined });
    kitChange('Added banned phrase: ' + fd.phrase.trim());
  } else if (kind === 'setFact') {
    const k = D.kit.facts.find((x) => x.key === f.dataset.key), v = Number(fd.value);
    if (!k || !isFinite(v)) return;
    const old = k.value; k.value = v;
    kitChange('Updated “' + k.label + '” from ' + old + ' to ' + v);
  } else if (kind === 'addClaim') {
    const txt = fd.text.trim();
    if (!txt) return;
    const c = { id: uid(fd.status === 'approved' ? 'AC-' : 'PC-'), status: fd.status, text: txt, pattern: phrasePattern(txt) };
    if (fd.status === 'approved') c.source = fd.extra || 'Added by Brand Manager'; else c.suggest = fd.extra ? fd.extra : '';
    D.kit.claims.push(c);
    kitChange('Added ' + fd.status + ' claim: ' + txt);
  }
  cache.clear(); commitAndRender('Brand kit updated to version ' + D.kit.version + '. Open reviews were re-checked.');
});

/* ----- boot ----- */
window.addEventListener('hashchange', () => {
  const h = location.hash.replace('#', '');
  if (['queue', 'kit', 'insights', 'about'].includes(h) && h !== UI.view) { UI.view = h; render(); }
});
(function boot() {
  const h = location.hash.replace('#', '');
  if (['queue', 'kit', 'insights', 'about'].includes(h)) UI.view = h;
  render();
  getSample();
})();
