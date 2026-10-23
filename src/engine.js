/*  BrandLens review engine
 *  Pure functions, no DOM. Runs in the browser and in Node (see tests/).
 *  Every finding cites a guideline clause or an approved source from the Brand Kit.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BrandLensEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SEV = { high: 3, medium: 2, low: 1 };

  /* Rule catalogue: label, category and the clause the rule enforces. */
  const RULES = {
    'TERM-CUST': { label: 'Customers / users → members', category: 'terminology', clause: 'T-2.1' },
    'TERM-NAME': { label: 'Product naming', category: 'terminology', clause: 'T-2.2' },
    'TERM-CAP': { label: 'Brand name capitalisation', category: 'terminology', clause: 'T-2.3' },
    'TERM-GLO': { label: 'Glossary term', category: 'terminology', clause: 'T-2.1' },
    'TONE-HYPE': { label: 'Hype words', category: 'tone', clause: 'V-1.2' },
    'TONE-JARGON': { label: 'Corporate jargon', category: 'tone', clause: 'V-1.3' },
    'TONE-SLANG': { label: 'Slang in formal channel', category: 'tone', clause: 'V-1.4' },
    'TONE-CAPS': { label: 'ALL CAPS', category: 'tone', clause: 'V-1.2' },
    'TONE-EXCL': { label: 'Exclamation marks', category: 'tone', clause: 'V-1.2' },
    'CLM-SUP': { label: 'Unsupported ranking claim', category: 'claims', clause: 'C-4.1' },
    'CLM-NUM': { label: 'Unverified performance figure', category: 'claims', clause: 'C-4.1' },
    'CLM-ABS': { label: 'Absolute promise', category: 'claims', clause: 'C-4.1' },
    'CLM-PRO': { label: 'Prohibited claim', category: 'claims', clause: 'C-4.2' },
    'FACT-PRICE': { label: 'Price mismatch', category: 'facts', clause: 'F-5.1' },
    'FACT-USERS': { label: 'Member count mismatch', category: 'facts', clause: 'F-5.1' },
    'FACT-YEAR': { label: 'Launch year mismatch', category: 'facts', clause: 'F-5.1' },
    'FACT-FREE': { label: 'Free plan limit mismatch', category: 'facts', clause: 'F-5.1' },
    'FACT-TRIAL': { label: 'Trial length mismatch', category: 'facts', clause: 'F-5.1' },
    'MSG-FIN': { label: 'Finance disclaimer missing', category: 'messaging', clause: 'M-3.1' },
    'MSG-TERMS': { label: 'Offer terms missing', category: 'messaging', clause: 'M-3.2' },
    'MSG-NAME': { label: 'Full product name on first mention', category: 'messaging', clause: 'M-3.3' },
    'A11Y-READ': { label: 'Reading level', category: 'accessibility', clause: 'A-6.1' },
    'A11Y-LONG': { label: 'Very long sentence', category: 'accessibility', clause: 'A-6.1' },
    'A11Y-HASH': { label: 'Hashtag not CamelCase', category: 'accessibility', clause: 'A-6.2' },
    'A11Y-LINK': { label: 'Vague link text', category: 'accessibility', clause: 'A-6.2' },
    'A11Y-EMOJI': { label: 'Emoji overuse', category: 'accessibility', clause: 'A-6.2' },
    'A11Y-ALT': { label: 'Image alt text', category: 'accessibility', clause: 'A-6.2' },
    'A11Y-CON': { label: 'Colour contrast', category: 'accessibility', clause: 'A-6.3' },
    'VIS-PAL': { label: 'Off-palette colour', category: 'visual', clause: 'VI-7.1' },
    'VIS-LOGO': { label: 'Logo usage', category: 'visual', clause: 'VI-7.2' },
    'CONF-PII': { label: 'Confidential or personal data', category: 'confidentiality', clause: 'P-8.1' },
    'AI-REV': { label: 'AI second opinion', category: 'tone', clause: 'V-1.1' },
  };

  const CATEGORIES = ['tone', 'terminology', 'messaging', 'facts', 'claims', 'accessibility', 'visual', 'confidentiality'];

  /* ---------- helpers ---------- */
  const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const phraseRe = (p, flags) =>
    new RegExp('(?<![\\w])' + escRe(p).replace(/-/g, '[- ]') + '(?![\\w])', flags || 'gi');
  const matchCase = (src, rep) =>
    rep && /^[A-Z]/.test(src) && /^[a-z]/.test(rep) ? rep[0].toUpperCase() + rep.slice(1) : rep;
  const fmtNum = (n) => Number(n).toLocaleString('en-IN');

  function F(o) {
    const meta = RULES[o.rule] || {};
    const f = Object.assign(
      { start: -1, end: -1, text: '', fix: null, keep: '', conf: 1, source: 'rule', safe: false, noDismiss: false, sub: null },
      { category: meta.category, clause: meta.clause },
      o
    );
    f.key = f.rule + '|' + (f.text || f.title || '').toLowerCase();
    f.id = f.rule + ':' + f.start + ':' + f.end + ':' + (f.source === 'ai' ? 'ai' : 'r');
    return f;
  }

  function protectedRanges(text) {
    const r = [];
    const re = /https?:\/\/\S+|\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+|[#@][A-Za-z]\w*/g;
    for (const m of text.matchAll(re)) r.push([m.index, m.index + m[0].length]);
    return r;
  }
  const overlaps = (ranges, s, e) => ranges.some(([a, b]) => s < b && e > a);

  function sentences(text) {
    const out = [];
    for (const m of text.matchAll(/[^.!?\n]+[.!?]*/g)) {
      const lead = m[0].match(/^\s*/)[0].length;
      const t = m[0].trim();
      if (t) out.push({ start: m.index + lead, end: m.index + lead + t.length, text: t });
    }
    return out;
  }

  function syllables(word) {
    let w = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!w) return 0;
    if (w.length <= 3) return 1;
    w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
    const m = w.match(/[aeiouy]{1,2}/g);
    return m ? m.length : 1;
  }

  function readability(text) {
    const words = text.replace(/https?:\/\/\S+|[#@]\w+/g, ' ').match(/[A-Za-z][A-Za-z'’-]*/g) || [];
    const sents = sentences(text.replace(/https?:\/\/\S+/g, ' ')).length || 1;
    const syl = words.reduce((n, w) => n + syllables(w), 0);
    const score = words.length ? 206.835 - 1.015 * (words.length / sents) - 84.6 * (syl / words.length) : 100;
    return { score: Math.round(score), words: words.length, sentences: sents };
  }

  /* ---------- colour maths (WCAG + Lab) ---------- */
  function hexToRgb(h) {
    if (typeof h !== 'string') return null;
    let x = h.trim().replace('#', '');
    if (x.length === 3) x = x.split('').map((c) => c + c).join('');
    if (!/^[0-9a-fA-F]{6}$/.test(x)) return null;
    return [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16)];
  }
  const rgbToHex = (r, g, b) =>
    '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();
  function luminance(rgb) {
    const [r, g, b] = rgb.map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  function contrast(h1, h2) {
    const a = hexToRgb(h1), b = hexToRgb(h2);
    if (!a || !b) return null;
    const l1 = luminance(a), l2 = luminance(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }
  function toLab(rgb) {
    const lin = rgb.map((v) => {
      v /= 255;
      return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    const x = (lin[0] * 0.4124 + lin[1] * 0.3576 + lin[2] * 0.1805) / 0.95047;
    const y = lin[0] * 0.2126 + lin[1] * 0.7152 + lin[2] * 0.0722;
    const z = (lin[0] * 0.0193 + lin[1] * 0.1192 + lin[2] * 0.9505) / 1.08883;
    const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
  }
  function deltaE(h1, h2) {
    const a = toLab(hexToRgb(h1)), b = toLab(hexToRgb(h2));
    return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
  }
  function nearestBrand(hex, kit) {
    let best = null;
    for (const p of kit.palette) {
      const d = deltaE(hex, p.hex);
      if (!best || d < best.d) best = { name: p.name, hex: p.hex, d };
    }
    return best;
  }
  /* A brand colour (or black/white) that passes AA against the background and stays closest to the current colour. */
  function suggestTextColor(fg, bg, large, kit) {
    const need = large ? 3 : 4.5;
    const brand = kit.palette.map((p) => ({ name: p.name, hex: p.hex }));
    const pools = [brand, [{ name: 'Black', hex: '#000000' }, { name: 'White', hex: '#FFFFFF' }]];
    for (const pool of pools) {
      const ok = pool.filter((c) => contrast(c.hex, bg) >= need);
      if (ok.length) {
        ok.sort((a, b) => (hexToRgb(fg) ? deltaE(fg, a.hex) - deltaE(fg, b.hex) : 0));
        return ok[0];
      }
    }
    return null;
  }

  /* Dominant colours from raw RGBA pixels (4 bits per channel buckets). */
  function paletteFromPixels(data) {
    const bins = new Map();
    let total = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue;
      const k = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
      let b = bins.get(k);
      if (!b) bins.set(k, (b = { n: 0, r: 0, g: 0, b: 0 }));
      b.n++; b.r += data[i]; b.g += data[i + 1]; b.b += data[i + 2];
      total++;
    }
    const list = [...bins.values()]
      .map((b) => ({ hex: rgbToHex(b.r / b.n, b.g / b.n, b.b / b.n), share: b.n / (total || 1) }))
      .sort((a, b) => b.share - a.share);
    const top6 = list.slice(0, 6).reduce((n, c) => n + c.share, 0);
    const photographic = top6 < 0.6 || list.filter((c) => c.share >= 0.02).length >= 9;
    return { colors: list.slice(0, 6), photographic };
  }

  /* ---------- hashtag helper ---------- */
  const DICT = ('back to college budget budgeting lumo plus save smart money student students life campus spend clear calm free new launch ' +
    'offer deal sale tips fest day week hack hacks goal goals study exam exams semester hostel pocket month easy app india finance financial first ' +
    'internship stipend chai weekend monthly plan planning for with and the you your of in on my our is it up go get now best win join tracker track ' +
    'expense expenses needs wants savings invest wealth school class kit club team day night live fresh start').split(' ');
  function segment(s) {
    const n = s.length, best = new Array(n + 1).fill(null);
    best[0] = [];
    for (let i = 0; i < n; i++) {
      if (!best[i]) continue;
      for (const w of DICT) {
        if (s.startsWith(w, i) && (!best[i + w.length] || best[i].length + 1 < best[i + w.length].length)) best[i + w.length] = best[i].concat(w);
      }
    }
    return best[n];
  }

  /* ---------- text analysis ---------- */
  function analyze(text, kit, ctx) {
    ctx = ctx || {};
    const out = [];
    const add = (o) => out.push(F(o));
    const prot = protectedRanges(text);
    const stats = { factsChecked: 0, factsOk: 0, claimsApproved: 0, claimsFlagged: 0 };
    const brand = kit.brand;

    /* approved claims (used to suppress false alarms) */
    const approvedR = [];
    for (const c of kit.claims.filter((c) => c.status === 'approved')) {
      try {
        for (const m of text.matchAll(new RegExp(c.pattern, 'gi'))) {
          approvedR.push([m.index, m.index + m[0].length]);
          stats.claimsApproved++;
        }
      } catch (e) { /* bad pattern in kit: ignore */ }
    }

    /* terminology: glossary */
    for (const g of kit.glossary) {
      for (const w of g.wrong) {
        for (const m of text.matchAll(phraseRe(w))) {
          const s = m.index, e = s + m[0].length;
          if (overlaps(prot, s, e)) continue;
          add({
            rule: g.rule || 'TERM-GLO', severity: 'medium', start: s, end: e, text: m[0],
            title: 'Use “' + g.right + '” instead of “' + m[0] + '”',
            why: g.note || 'Approved terminology uses “' + g.right + '”.',
            clause: g.clause || 'T-2.1',
            fix: { kind: 'replace', text: matchCase(m[0], g.right) },
            keep: 'Same meaning, approved wording.', safe: true,
          });
        }
      }
    }
    /* terminology: brand capitalisation */
    if (brand.short) {
      const re = new RegExp('(?<![\\w#@./-])(' + escRe(brand.short.toLowerCase()) + '|' + escRe(brand.short.toUpperCase()) + ')(?![\\w.@/-])', 'g');
      for (const m of text.matchAll(re)) {
        add({
          rule: 'TERM-CAP', severity: 'low', start: m.index, end: m.index + m[0].length, text: m[0],
          title: 'Write the brand name as “' + brand.short + '”',
          why: 'The brand name is always written with a capital first letter and lowercase letters after it.',
          fix: { kind: 'replace', text: brand.short }, keep: 'Only the capitalisation changes.', safe: true,
        });
      }
    }

    /* tone: banned phrases */
    for (const b of kit.banned) {
      if (b.channels && b.channels.length && !b.channels.includes(ctx.channel)) continue;
      const rule = b.kind === 'jargon' ? 'TONE-JARGON' : b.kind === 'slang' ? 'TONE-SLANG' : 'TONE-HYPE';
      for (const m of text.matchAll(phraseRe(b.phrase))) {
        const s = m.index, e = s + m[0].length;
        if (overlaps(prot, s, e)) continue;
        add({
          rule, severity: 'low', start: s, end: e, text: m[0],
          title: '“' + m[0] + '” doesn’t match the brand voice',
          why: rule === 'TONE-HYPE' ? 'The voice is calm and plain. Hype words make claims sound bigger than we can prove.'
            : rule === 'TONE-JARGON' ? 'Corporate buzzwords make copy harder to read. Say it the way a helpful senior student would.'
            : 'This channel is formal. Slang is only for casual posts.',
          clause: rule === 'TONE-HYPE' ? 'V-1.2' : rule === 'TONE-JARGON' ? 'V-1.3' : 'V-1.4',
          fix: b.suggest ? { kind: 'replace', text: matchCase(m[0], b.suggest) } : null,
          keep: b.suggest ? 'Keeps the point of the sentence in plainer words.' : '',
        });
      }
    }
    /* tone: ALL CAPS runs */
    const capsAllow = new Set((kit.capsAllow || []).concat([brand.short ? brand.short.toUpperCase() : '']));
    for (const m of text.matchAll(/\b[A-Z]{3,}(?:\s+[A-Z]{2,})*\b/g)) {
      const s = m.index, e = s + m[0].length;
      if (overlaps(prot, s, e)) continue;
      const toks = m[0].split(/(\s+)/);
      if (toks.every((t) => /^\s+$/.test(t) || capsAllow.has(t))) continue;
      const before = text.slice(0, s).trimEnd();
      let atStart = !/[A-Za-z0-9,;:'"-]$/.test(before);
      const fixed = toks.map((t) => {
        if (/^\s+$/.test(t) || capsAllow.has(t)) return t;
        const low = t.toLowerCase();
        const r = atStart ? low[0].toUpperCase() + low.slice(1) : low;
        atStart = false;
        return r;
      }).join('');
      add({
        rule: 'TONE-CAPS', severity: 'low', start: s, end: e, text: m[0],
        title: 'Avoid ALL CAPS',
        why: 'Capital letters read as shouting and are harder for screen readers and dyslexic readers.',
        fix: { kind: 'replace', text: fixed }, keep: 'Same words, normal capitalisation.', safe: true,
      });
    }
    /* tone: exclamation marks */
    const words0 = (text.match(/[A-Za-z]+/g) || []).length;
    const allowEx = Math.max(1, Math.floor(words0 / 90));
    let seenEx = 0;
    for (const m of text.matchAll(/!+/g)) {
      seenEx++;
      if (m[0].length >= 2) {
        add({
          rule: 'TONE-EXCL', severity: 'low', start: m.index, end: m.index + m[0].length, text: m[0],
          title: 'Use a single exclamation mark',
          why: 'At most one exclamation mark per post. Repeated marks feel pushy.',
          fix: { kind: 'replace', text: '!' }, keep: 'Keeps the friendly energy.', safe: true,
        });
      } else if (seenEx > allowEx) {
        add({
          rule: 'TONE-EXCL', severity: 'low', start: m.index, end: m.index + 1, text: '!',
          title: 'Too many exclamation marks',
          why: 'At most one exclamation mark per post. Use a full stop for the rest.',
          fix: { kind: 'replace', text: '.' }, keep: 'Keeps the sentence, softens the tone.', safe: true,
        });
      }
    }

    /* claims: prohibited and approved register */
    for (const c of kit.claims.filter((c) => c.status === 'prohibited')) {
      let re;
      try { re = new RegExp(c.pattern, 'gi'); } catch (e) { continue; }
      for (const m of text.matchAll(re)) {
        const s = m.index, e = s + m[0].length;
        if (!m[0].trim() || overlaps(prot, s, e)) continue;
        let fix = null;
        if (typeof c.suggest === 'string') fix = c.suggest === '' ? { kind: 'delete' } : { kind: 'replace', text: matchCase(m[0], c.suggest) };
        stats.claimsFlagged++;
        add({
          rule: 'CLM-PRO', severity: 'high', sub: 'contradicts', start: s, end: e, text: m[0],
          title: 'Prohibited claim: “' + m[0] + '”',
          why: c.why || 'This kind of promise is on the prohibited list (' + c.id + '). It can mislead members and creates legal risk.',
          clause: 'C-4.2', fix, keep: fix ? 'Keeps the sentence, removes the promise.' : '',
        });
      }
    }
    /* claims: superlatives */
    const supRe = /(?<![\w])(?:the\s+)?(#\s?1|number one|no\.?\s?1|best|leading|fastest|most (?:trusted|popular|loved|secure|reliable)|top[- ]rated|world[- ]class|unbeatable|unmatched)(?![\w])/gi;
    for (const m of text.matchAll(supRe)) {
      let s = m.index, e = s + m[0].length;
      const word = m[1].toLowerCase();
      if (overlaps(prot, s, e) || overlaps(approvedR, s, e)) continue;
      const after = text.slice(e), before = text.slice(0, s);
      if (word === 'best' && (/^\s+(practice|practices|friend|wishes|regards|of luck)/i.test(after) || /\b(your|my|our|their|do|at)\s+$/i.test(before))) continue;
      let fix = { kind: 'delete' }, keep = 'Removes only the unproven ranking.';
      const rank = /^(#|number|no|best|leading|fastest|most|top)/.test(word);
      const m2 = after.match(/^\s+([A-Za-z][A-Za-z -]{1,32}?)(?=\s+(?:and|for|that|to|in|on|with|which|you|so)\b|[.,!?;:\n]|$)/);
      if (rank && m2 && m2[1].trim().split(/\s+/).length <= 4) {
        e += m2[0].length;
        fix = { kind: 'replace', text: 'a simple ' + m2[1].trim() };
        keep = 'Keeps what the product is, drops the unproven ranking.';
      }
      stats.claimsFlagged++;
      add({
        rule: 'CLM-SUP', severity: 'high', sub: 'unverified', start: s, end: e, text: text.slice(s, e).trim(),
        title: 'Unsupported claim: “' + text.slice(s, e).trim() + '”',
        why: 'Rankings and superlatives need an approved source in the Claims register. None exists for this one, so it can’t go out as written.',
        clause: 'C-4.1', fix, keep,
      });
    }
    /* claims: numeric performance figures */
    const numRes = [
      /\b(save|saves|saving|savings of|earn|earns|grow|grows|boost|boosts|cut|cuts|reduce|reduces|lower|lowers)\s+(?:you\s+|your\s+\w+\s+)?(?:up to\s+)?(?:by\s+)?(\d+(?:\.\d+)?)\s?%/gi,
      /\b(\d+(?:\.\d+)?)\s?%\s+(?:more|less|faster|better|savings|returns|cheaper)\b/gi,
    ];
    for (const re of numRes) {
      for (const m of text.matchAll(re)) {
        const s = m.index, e = s + m[0].length;
        if (overlaps(prot, s, e)) continue;
        const verb = (m[1] || '').toLowerCase();
        const money = /save|saving|earn|grow|boost|returns|cut|reduce|lower|cheaper|savings/.test(m[0].toLowerCase());
        const canFix = /^(save|saves|saving|cut|cuts|reduce|reduces|lower|lowers)/.test(verb);
        stats.claimsFlagged++;
        add({
          rule: 'CLM-NUM', severity: money ? 'high' : 'medium', sub: 'unverified', start: s, end: e, text: m[0],
          title: 'Unverified figure: “' + m[0] + '”',
          why: 'Numbers about savings or performance need a verified source in the Approved facts list. There is none for this figure.',
          clause: 'C-4.1',
          fix: canFix ? { kind: 'replace', text: 'helps you save' } : null,
          keep: canFix ? 'Keeps the benefit, drops the number we can’t prove.' : 'Remove the figure, or ask a Reviewer to add a verified source.',
        });
      }
    }
    /* claims: absolute promises */
    const absRe = /(?<![\w])(unlimited|free forever|completely free|totally free|never worry|zero effort|100\s?%(?!\s?(?:safe|secure))(?:\s+free)?)(?![\w])/gi;
    for (const m of text.matchAll(absRe)) {
      const s = m.index, e = s + m[0].length;
      if (overlaps(prot, s, e) || overlaps(approvedR, s, e)) continue;
      stats.claimsFlagged++;
      add({
        rule: 'CLM-ABS', severity: 'medium', sub: 'unverified', start: s, end: e, text: m[0],
        title: 'Absolute promise: “' + m[0] + '”',
        why: 'Words like “unlimited” and “free forever” are promises the product plan has to back up. Check them against the approved facts or soften them.',
        clause: 'C-4.1', fix: null, keep: 'Say what the plan really includes, for example the number of budgets.',
      });
    }

    /* facts */
    const fact = (k) => kit.facts.find((f) => f.key === k);
    const num = (n, unit) => {
      let v = parseFloat(String(n).replace(/,/g, ''));
      unit = (unit || '').trim().toLowerCase();
      if (unit === 'k') v *= 1e3;
      else if (unit === 'lakh' || unit === 'lakhs') v *= 1e5;
      else if (unit === 'm' || unit === 'million') v *= 1e6;
      return v;
    };
    const fp = fact('plusPrice');
    if (fp) {
      for (const m of text.matchAll(/(₹|rs\.?|inr)\s?(\d[\d,]*(?:\.\d+)?)(?=\s*(?:\/|per|a|each)?\s*(?:month|mo)\b)/gi)) {
        stats.factsChecked++;
        const v = num(m[2]);
        if (v === Number(fp.value)) { stats.factsOk++; continue; }
        add({
          rule: 'FACT-PRICE', severity: 'high', sub: 'contradicts', start: m.index, end: m.index + m[0].length, text: m[0],
          title: 'Price doesn’t match the approved fact',
          why: 'Approved: ₹' + fmtNum(fp.value) + ' per month. Your text says ' + m[0] + '. Source: ' + fp.source + '.',
          clause: fp.clause || 'F-5.1', fix: { kind: 'replace', text: '₹' + fmtNum(fp.value) }, keep: 'Same sentence with the current price.',
        });
      }
    }
    const fu = fact('userCount');
    if (fu) {
      const re = /(?:(over|more than|nearly|almost|about|around|up to)\s+)?(\d[\d,]*(?:\.\d+)?)(\s?(?:k|lakhs?|m|million)\b)?(\+)?(?=\s*(?:active\s+)?(?:students|users|members)\b)/gi;
      for (const m of text.matchAll(re)) {
        const v = num(m[2], m[3]);
        if (!(v >= 100)) continue;
        stats.factsChecked++;
        const appr = Number(fu.value);
        if (v >= appr * 0.9 && v <= appr * 1.02) { stats.factsOk++; continue; }
        const over = v > appr;
        add({
          rule: 'FACT-USERS', severity: over ? 'high' : 'medium', sub: over ? 'contradicts' : 'outdated', start: m.index, end: m.index + m[0].length, text: m[0],
          title: over ? 'Member count is higher than the approved figure' : 'Member count is out of date',
          why: 'Approved: ' + fmtNum(appr) + '+ students. Your text says ' + m[0].trim() + '. Source: ' + fu.source + '.',
          clause: fu.clause || 'F-5.1', fix: { kind: 'replace', text: fmtNum(appr) + '+' }, keep: 'Same claim with the verified number.',
        });
      }
    }
    const fy = fact('launchYear');
    if (fy) {
      for (const m of text.matchAll(/\b(launched|founded|started|since|established)(\s+in)?\s+(20\d{2})\b/gi)) {
        stats.factsChecked++;
        if (Number(m[3]) === Number(fy.value)) { stats.factsOk++; continue; }
        const s = m.index + m[0].lastIndexOf(m[3]);
        add({
          rule: 'FACT-YEAR', severity: 'high', sub: 'contradicts', start: s, end: s + 4, text: m[3],
          title: 'Launch year doesn’t match the approved fact',
          why: 'Approved: launched in ' + fy.value + '. Your text says ' + m[3] + '. Source: ' + fy.source + '.',
          clause: fy.clause || 'F-5.1', fix: { kind: 'replace', text: String(fy.value) }, keep: 'Same sentence with the correct year.',
        });
      }
    }
    const ff = fact('freeBudgets');
    if (ff) {
      for (const m of text.matchAll(/(\d+)(?=\s+free\s+budgets?\b)/gi)) {
        stats.factsChecked++;
        if (Number(m[1]) === Number(ff.value)) { stats.factsOk++; continue; }
        add({
          rule: 'FACT-FREE', severity: 'high', sub: 'contradicts', start: m.index, end: m.index + m[0].length, text: m[0],
          title: 'Free plan limit doesn’t match the approved fact',
          why: 'Approved: ' + ff.value + ' free budgets. Source: ' + ff.source + '.',
          clause: ff.clause || 'F-5.1', fix: { kind: 'replace', text: String(ff.value) }, keep: 'Same sentence with the correct limit.',
        });
      }
    }
    const ft = fact('trialDays');
    if (ft) {
      for (const m of text.matchAll(/(\d+)(?=[- ]day\s+(?:free\s+)?trial)/gi)) {
        stats.factsChecked++;
        if (Number(m[1]) === Number(ft.value)) { stats.factsOk++; continue; }
        add({
          rule: 'FACT-TRIAL', severity: 'high', sub: 'contradicts', start: m.index, end: m.index + m[0].length, text: m[0],
          title: 'Trial length doesn’t match the approved fact',
          why: 'Approved: ' + ft.value + '-day free trial. Source: ' + ft.source + '.',
          clause: ft.clause || 'F-5.1', fix: { kind: 'replace', text: String(ft.value) }, keep: 'Same sentence with the correct trial length.',
        });
      }
    }

    /* messaging: required disclaimers */
    for (const d of kit.disclaimers) {
      let trig, ok;
      try { trig = text.match(new RegExp(d.trigger, 'i')); ok = new RegExp(d.test, 'i').test(text); } catch (e) { continue; }
      if (trig && !ok) {
        add({
          rule: d.rule, severity: d.severity || 'medium', start: trig.index, end: trig.index + trig[0].length, text: trig[0],
          title: d.title, why: d.why, clause: d.clause,
          fix: { kind: 'append', text: d.required, sep: '\n\n' }, keep: 'Adds the required line at the end. Your message is unchanged.',
        });
      }
    }
    /* messaging: full product name on first mention */
    if ((brand.fullNameChannels || []).includes(ctx.channel) && brand.full) {
      const re = new RegExp('(?<![\\w#@./-])' + escRe(brand.short) + '(?!\\s+(?:Budget|Plus)\\b)(?![\\w.@/-])', 'g');
      const first = [...text.matchAll(re)][0];
      if (first && !new RegExp(escRe(brand.full)).test(text)) {
        add({
          rule: 'MSG-NAME', severity: 'low', start: first.index, end: first.index + first[0].length, text: first[0],
          title: 'Use “' + brand.full + '” on first mention',
          why: 'In ' + ctx.channel.toLowerCase() + ' copy the full product name appears first, then “' + brand.short + '” is fine.',
          clause: 'M-3.3', fix: { kind: 'replace', text: brand.full }, keep: 'Only adds the full name.', safe: true,
        });
      }
    }

    /* confidentiality */
    const piiDefs = [
      [/\b\d{4}\s\d{4}\s\d{4}\b/g, 'a 12-digit ID number'],
      [/\b(?:\d[ -]?){13,16}\b/g, 'a card-like number'],
      [/(?<![\w@])(?:\+?91[\s-]?)?[6-9]\d{9}\b/g, 'a phone number'],
      [/\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, 'an email address'],
      [/\b(confidential|internal only|do not share|not for release|embargo(?:ed)?)\b/gi, 'a confidentiality marking'],
    ];
    const piiKept = [];
    for (const [re, label] of piiDefs) {
      for (const m of text.matchAll(re)) {
        const s = m.index, e = s + m[0].length;
        if ((kit.allowedEmails || []).includes(m[0].toLowerCase())) continue;
        if (piiKept.some(([a, b]) => s < b && e > a)) continue;
        piiKept.push([s, e]);
        add({
          rule: 'CONF-PII', severity: 'high', noDismiss: true, start: s, end: e, text: m[0],
          title: 'Contains ' + label,
          why: 'Public content must not include personal data or material marked confidential. This finding can’t be dismissed, only fixed.',
          clause: 'P-8.1', fix: { kind: 'delete' }, keep: 'Removes only the sensitive text.',
        });
      }
    }

    /* accessibility */
    const rd = readability(text);
    if (rd.words >= 25 && rd.score < 50) {
      add({
        rule: 'A11Y-READ', severity: 'medium', text: 'Reading ease ' + rd.score, title: 'Hard to read: reading ease ' + rd.score + ' (target 60+)',
        why: 'Long sentences and long words make the text hard to read for many members. Aim for a reading ease of 60 or more.',
        clause: 'A-6.1', keep: 'Split long sentences and swap long words for short ones.',
      });
    }
    for (const s of sentences(text)) {
      const wc = (s.text.match(/[A-Za-z0-9'’-]+/g) || []).length;
      if (wc > 28) {
        add({
          rule: 'A11Y-LONG', severity: 'low', start: s.start, end: s.end, text: s.text,
          title: 'Very long sentence (' + wc + ' words)',
          why: 'Keep sentences under 25 words so they are easy to follow and easy to read aloud.', clause: 'A-6.1', keep: 'Split it into two sentences.',
        });
      }
    }
    for (const m of text.matchAll(/#[A-Za-z][A-Za-z0-9]*/g)) {
      const tag = m[0].slice(1);
      if (tag !== tag.toLowerCase() || tag.length < 9) continue;
      const seg = segment(tag.toLowerCase());
      const cap = (w) => w[0].toUpperCase() + w.slice(1);
      if (seg && seg.length > 1) {
        add({
          rule: 'A11Y-HASH', severity: 'low', start: m.index, end: m.index + m[0].length, text: m[0],
          title: 'Write hashtags in CamelCase',
          why: 'Screen readers read #' + tag + ' as one long word. CamelCase lets them read each word.',
          fix: { kind: 'replace', text: '#' + seg.map(cap).join('') }, keep: 'Same hashtag, easier to read.', safe: true,
        });
      } else if (!seg && tag.length >= 12) {
        add({
          rule: 'A11Y-HASH', severity: 'low', start: m.index, end: m.index + m[0].length, text: m[0],
          title: 'Write hashtags in CamelCase',
          why: 'Capitalise each word so screen readers can read it.', keep: 'Same hashtag with capital letters at each word.',
        });
      }
    }
    for (const m of text.matchAll(/\b(click|tap)\s+here(\s+to\s+(\w))?|\bread more\b/gi)) {
      const fix = m[3] ? { kind: 'replace', text: m[3].toUpperCase() } : null;
      add({
        rule: 'A11Y-LINK', severity: 'low', start: m.index, end: m.index + m[0].length, text: m[0],
        title: 'Use descriptive link text',
        why: 'Screen reader users often jump from link to link. “' + m[0] + '” says nothing about where it leads.',
        fix, keep: fix ? 'Starts the sentence with the action.' : 'Name the destination, for example “Join Lumo Plus”.',
      });
    }
    const run = text.match(/(?:\p{Extended_Pictographic}️?){3,}/u);
    if (run) {
      const first = run[0].match(/^\p{Extended_Pictographic}️?/u)[0];
      add({
        rule: 'A11Y-EMOJI', severity: 'low', start: run.index, end: run.index + run[0].length, text: run[0],
        title: 'Too many emoji in a row',
        why: 'Screen readers read out every emoji by name. Keep it to one or two.',
        fix: { kind: 'replace', text: first }, keep: 'Keeps one emoji for tone.', safe: true,
      });
    }

    return { findings: dedupe(out), stats: Object.assign(stats, { reading: rd.score, words: rd.words }) };
  }

  /* keep the strongest finding when two of the same category overlap */
  function dedupe(list) {
    const sorted = list.slice().sort((a, b) => SEV[b.severity] - SEV[a.severity] || b.end - b.start - (a.end - a.start));
    const kept = [];
    for (const f of sorted) {
      if (f.start >= 0 && kept.some((k) => k.start >= 0 && k.category === f.category && f.start < k.end && f.end > k.start)) continue;
      kept.push(f);
    }
    return kept.sort((a, b) => (a.start < 0) - (b.start < 0) || a.start - b.start);
  }

  /* ---------- visual details ---------- */
  function analyzeVisual(v, kit) {
    const out = [];
    if (!v) return out;
    const add = (o) => out.push(F(o));
    if (v.hasImage) {
      const alt = (v.alt || '').trim();
      if (!alt) {
        add({ rule: 'A11Y-ALT', severity: 'high', text: 'missing alt text', title: 'Image has no alt text',
          why: 'People who use screen readers get nothing from an image without alt text. Describe what the image shows and why it is there.',
          clause: 'A-6.2', keep: 'Write one short sentence, for example “Students at a campus stall comparing budget plans.”', field: 'alt' });
      } else if (alt.split(/\s+/).length < 4 || /^(image|photo|picture|graphic)\s+of\b/i.test(alt)) {
        add({ rule: 'A11Y-ALT', severity: 'medium', text: 'weak alt text', title: 'Alt text is too short or starts with “image of”',
          why: 'Screen readers already announce that it is an image. Say what it shows in at least four words.', clause: 'A-6.2',
          keep: 'Describe the content and purpose.', field: 'alt' });
      }
    }
    if (v.fg && v.bg && hexToRgb(v.fg) && hexToRgb(v.bg)) {
      const ratio = contrast(v.fg, v.bg), need = v.large ? 3 : 4.5;
      if (ratio < need) {
        const sg = suggestTextColor(v.fg, v.bg, v.large, kit);
        add({ rule: 'A11Y-CON', severity: ratio < 3 ? 'high' : 'medium', text: 'contrast ' + ratio.toFixed(2),
          title: 'Text colour contrast is ' + ratio.toFixed(2) + ':1 (needs ' + need + ':1)',
          why: v.fg.toUpperCase() + ' on ' + v.bg.toUpperCase() + ' is hard to read, especially on a phone in daylight.',
          clause: 'A-6.3', fix: sg ? { kind: 'visual', set: { fg: sg.hex }, text: sg.name + ' ' + sg.hex } : null,
          keep: sg ? 'Uses the brand colour closest to your current one that passes.' : 'Pick a darker or lighter text colour.' });
      }
    }
    if (v.logo && v.logo !== 'none') {
      const bgRgb = hexToRgb(v.bg || '');
      const lum = bgRgb ? luminance(bgRgb) : null;
      if (v.logo === 'old') {
        add({ rule: 'VIS-LOGO', severity: 'high', text: 'retired logo', title: 'Retired 2022 logo in use',
          why: 'The 2022 logo was retired. Use the current full-colour logo on light backgrounds or the white logo on dark ones.', clause: 'VI-7.2',
          fix: { kind: 'visual', set: { logo: lum !== null && lum < 0.35 ? 'mono' : 'full' }, text: lum !== null && lum < 0.35 ? 'White logo' : 'Full-colour logo' },
          keep: 'Swaps the logo file only.' });
      } else if (v.logo === 'altered') {
        add({ rule: 'VIS-LOGO', severity: 'high', text: 'altered logo', title: 'Logo has been stretched or recoloured',
          why: 'The logo is never stretched, rotated or recoloured.', clause: 'VI-7.2',
          fix: { kind: 'visual', set: { logo: lum !== null && lum < 0.35 ? 'mono' : 'full' }, text: 'Original logo' }, keep: 'Uses the supplied logo file.' });
      } else if (v.logo === 'full' && lum !== null && lum < 0.35) {
        add({ rule: 'VIS-LOGO', severity: 'medium', text: 'full-colour on dark', title: 'Full-colour logo on a dark background',
          why: 'On dark backgrounds use the white version of the logo.', clause: 'VI-7.2',
          fix: { kind: 'visual', set: { logo: 'mono' }, text: 'White logo' }, keep: 'Swaps the logo file only.' });
      } else if (v.logo === 'mono' && lum !== null && lum > 0.6) {
        add({ rule: 'VIS-LOGO', severity: 'medium', text: 'white logo on light', title: 'White logo on a light background',
          why: 'The white logo disappears on light backgrounds. Use the full-colour version.', clause: 'VI-7.2',
          fix: { kind: 'visual', set: { logo: 'full' }, text: 'Full-colour logo' }, keep: 'Swaps the logo file only.' });
      }
    }
    if (v.hasImage && v.palette && v.palette.colors && !v.palette.photographic) {
      for (const c of v.palette.colors) {
        if (c.share < 0.12) continue;
        const nb = nearestBrand(c.hex, kit);
        if (nb.d > 18) {
          add({ rule: 'VIS-PAL', severity: 'medium', text: 'off-palette ' + c.hex, title: 'Off-brand colour ' + c.hex + ' covers ' + Math.round(c.share * 100) + '% of the image',
            why: 'The brand palette has four colours. The closest is ' + nb.name + ' ' + nb.hex + ', and it is still clearly different (ΔE ' + Math.round(nb.d) + ').',
            clause: 'VI-7.1', keep: 'Recolour the design with ' + nb.name + ' ' + nb.hex + ' or another palette colour.' });
        }
      }
    }
    return out;
  }

  /* ---------- AI second opinion ---------- */
  function maskPII(text) {
    return text
      .replace(/\b\d{4}\s\d{4}\s\d{4}\b/g, '[ID NUMBER]')
      .replace(/\b(?:\d[ -]?){13,16}\b/g, '[CARD NUMBER]')
      .replace(/(?<![\w@])(?:\+?91[\s-]?)?[6-9]\d{9}\b/g, '[PHONE]')
      .replace(/\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '[EMAIL]');
  }

  function validateAI(raw, text, kit) {
    const ids = new Set(kit.clauses.map((c) => c.id));
    const ok = [], dropped = [];
    for (const r of Array.isArray(raw) ? raw : []) {
      const why = !r || typeof r.span !== 'string' || !r.span.trim() ? 'No quoted text'
        : text.indexOf(r.span) < 0 ? 'Quoted text is not in the draft'
        : !ids.has(r.clauseId) ? 'Cites a guideline that does not exist'
        : typeof r.reason !== 'string' || !r.reason.trim() ? 'No explanation' : null;
      if (why) { dropped.push({ span: r && r.span, why }); continue; }
      ok.push({
        span: r.span, clauseId: r.clauseId,
        category: CATEGORIES.includes(r.category) ? r.category : 'tone',
        severity: SEV[r.severity] ? r.severity : 'medium',
        reason: r.reason.trim(), suggestion: typeof r.suggestion === 'string' ? r.suggestion : '',
        confidence: Math.max(0, Math.min(1, Number(r.confidence) || 0.5)),
      });
    }
    return { ok, dropped };
  }

  function aiToFindings(items, text) {
    const out = [];
    for (const it of items || []) {
      const s = text.indexOf(it.span);
      if (s < 0) continue;
      const low = it.confidence < 0.6;
      out.push(F({
        rule: 'AI-REV', source: 'ai', category: it.category, clause: it.clauseId, severity: low ? 'low' : it.severity,
        start: s, end: s + it.span.length, text: it.span, conf: it.confidence, lowConf: low,
        title: it.reason.length > 90 ? it.reason.slice(0, 87) + '…' : it.reason, why: it.reason,
        fix: it.suggestion && it.suggestion !== it.span ? { kind: 'replace', text: it.suggestion } : null,
        keep: 'Suggested by the AI to fit your goal. Review before using.',
      }));
    }
    return out;
  }

  /* ---------- apply a fix ---------- */
  function applyFix(text, f) {
    const fx = f.fix;
    if (!fx) return text;
    if (fx.kind === 'append') return text.replace(/\s+$/, '') + (fx.sep !== undefined ? fx.sep : '\n\n') + fx.text;
    if (fx.kind !== 'replace' && fx.kind !== 'delete') return text;
    let before = text.slice(0, f.start), after = text.slice(f.end);
    if (fx.kind === 'delete') {
      if (/\s$/.test(before) && /^\s/.test(after)) after = after.replace(/^\s+/, '');
      else if (/\s$/.test(before) && /^[.,!?;:]/.test(after)) before = before.replace(/\s+$/, '');
      if (/(^|[.!?\n]\s*)$/.test(before) && /^[a-z]/.test(after)) after = after[0].toUpperCase() + after.slice(1);
      return before + after;
    }
    return before + fx.text + after;
  }

  /* ---------- word diff ---------- */
  function diffWords(a, b) {
    const ta = a.match(/\s+|[\w’'-]+|[^\w\s]/g) || [], tb = b.match(/\s+|[\w’'-]+|[^\w\s]/g) || [];
    const n = ta.length, m = tb.length;
    const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
      dp[i][j] = ta[i] === tb[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const ops = [];
    let i = 0, j = 0;
    const push = (t, v) => { const l = ops[ops.length - 1]; if (l && l.t === t) l.v += v; else ops.push({ t, v }); };
    while (i < n && j < m) {
      if (ta[i] === tb[j]) { push('eq', ta[i]); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { push('del', ta[i]); i++; }
      else { push('ins', tb[j]); j++; }
    }
    while (i < n) push('del', ta[i++]);
    while (j < m) push('ins', tb[j++]);
    return ops;
  }

  return {
    RULES, CATEGORIES, SEV, analyze, analyzeVisual, applyFix, diffWords, readability, contrast, deltaE, nearestBrand,
    suggestTextColor, paletteFromPixels, maskPII, validateAI, aiToFindings, hexToRgb, luminance, sentences, fmtNum,
  };
});
