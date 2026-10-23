/*  Demo workspace data: a fictional brand (Lumo Budget), its Brand Kit, sample reviews and sample history. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BrandLensKit = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const CHANNELS = ['Social post', 'Email', 'Ad', 'Press note', 'Web copy'];

  function defaultKit() {
    return {
      version: 3,
      name: 'Lumo Budget',
      brand: { short: 'Lumo', full: 'Lumo Budget', plus: 'Lumo Plus', fullNameChannels: ['Email', 'Press note', 'Web copy'] },
      capsAllow: ['UPI', 'KYC', 'OTP', 'FAQ', 'SMS', 'PDF', 'ATM', 'NEFT', 'IMPS', 'PAN', 'EMI', 'GST', 'AI', 'USD', 'INR', 'IST'],
      allowedEmails: ['hello@lumo.example', 'support@lumo.example'],
      clauses: [
        { id: 'V-1.1', group: 'Voice', title: 'Friendly, plain and calm', text: 'Write like a helpful senior student: short sentences, everyday words, no pressure.' },
        { id: 'V-1.2', group: 'Voice', title: 'No hype', text: 'No more than one exclamation mark per post. No ALL CAPS. Avoid hype words such as “amazing” or “instantly”.' },
        { id: 'V-1.3', group: 'Voice', title: 'No corporate jargon', text: 'Avoid buzzwords such as “synergy”, “leverage” and “cutting-edge”. Say the plain thing.' },
        { id: 'V-1.4', group: 'Voice', title: 'Formal channels stay formal', text: 'Emails and press notes avoid slang. Casual language is fine on social posts.' },
        { id: 'T-2.1', group: 'Terminology', title: 'Members, not customers', text: 'Call people “members”. Never “customers” or “users” in public copy.' },
        { id: 'T-2.2', group: 'Terminology', title: 'Product names', text: 'The paid plan is “Lumo Plus”. Never “Lumo Pro”, “Lumo Premium” or “Lumo+”.' },
        { id: 'T-2.3', group: 'Terminology', title: 'Brand name capitalisation', text: 'Write “Lumo”. Never “lumo” or “LUMO”.' },
        { id: 'M-3.1', group: 'Messaging', title: 'Money content needs the disclaimer', text: 'Any content about investing, loans, stocks or interest must include: “Lumo is a budgeting tool, not a financial advisor.”' },
        { id: 'M-3.2', group: 'Messaging', title: 'Offers need terms', text: 'Any offer, discount or free trial must say “Terms apply.”' },
        { id: 'M-3.3', group: 'Messaging', title: 'Full name on first mention', text: 'Emails, press notes and web copy use “Lumo Budget” on first mention.' },
        { id: 'C-4.1', group: 'Claims', title: 'Claims need a source', text: 'Every ranking, comparison or number about savings or performance needs an approved source in the Claims register.' },
        { id: 'C-4.2', group: 'Claims', title: 'Prohibited promises', text: 'No guarantees, “risk-free”, “get rich” promises, “military-grade” security or comparisons that name other apps.' },
        { id: 'F-5.1', group: 'Facts', title: 'Facts must match the approved list', text: 'Prices, member counts, dates and plan limits must match the Approved facts list.' },
        { id: 'A-6.1', group: 'Accessibility', title: 'Readable text', text: 'Aim for a reading ease of 60 or more. Keep sentences under 25 words.' },
        { id: 'A-6.2', group: 'Accessibility', title: 'Accessible details', text: 'CamelCase hashtags. No more than two emoji in a row. Descriptive link text. Every image has alt text.' },
        { id: 'A-6.3', group: 'Accessibility', title: 'Colour contrast', text: 'Text must reach a 4.5:1 contrast ratio against its background (3:1 for large text).' },
        { id: 'VI-7.1', group: 'Visual', title: 'Brand palette', text: 'Use Ink, Mint, Sunrise and Cloud. Other colours are for photographs only.' },
        { id: 'VI-7.2', group: 'Visual', title: 'Logo use', text: 'Use the full-colour logo on light backgrounds and the white logo on dark ones. Never stretch or recolour it. The 2022 logo is retired.' },
        { id: 'P-8.1', group: 'Privacy', title: 'No personal or confidential data', text: 'Never publish member personal data, internal-only numbers or anything marked confidential.' },
      ],
      glossary: [
        { id: 'G-1', wrong: ['customers', 'customer', 'users', 'user'], right: 'members', rule: 'TERM-CUST', clause: 'T-2.1', note: 'We call the people who use Lumo “members”.' },
        { id: 'G-2', wrong: ['Lumo Pro', 'Lumo Premium', 'Lumo+', 'Lumo Gold'], right: 'Lumo Plus', rule: 'TERM-NAME', clause: 'T-2.2', note: 'The paid plan is called Lumo Plus.' },
        { id: 'G-3', wrong: ['cheap'], right: 'affordable', rule: 'TERM-GLO', clause: 'T-2.1', note: 'We say “affordable”, never “cheap”.' },
      ],
      banned: [
        { phrase: 'amazing', kind: 'hype', suggest: 'useful' }, { phrase: 'incredible', kind: 'hype', suggest: 'helpful' },
        { phrase: 'mind-blowing', kind: 'hype', suggest: 'helpful' }, { phrase: 'insane', kind: 'hype', suggest: '' },
        { phrase: 'game-changer', kind: 'hype', suggest: 'useful tool' }, { phrase: 'revolutionary', kind: 'hype', suggest: 'new' },
        { phrase: 'revolution', kind: 'hype', suggest: '' }, { phrase: 'must-have', kind: 'hype', suggest: 'handy' },
        { phrase: 'life-changing', kind: 'hype', suggest: 'helpful' }, { phrase: 'unbelievable', kind: 'hype', suggest: '' },
        { phrase: 'epic', kind: 'hype', suggest: '' }, { phrase: 'ultimate', kind: 'hype', suggest: '' },
        { phrase: 'instantly', kind: 'hype', suggest: 'in a few taps' }, { phrase: 'magic', kind: 'hype', suggest: '' },
        { phrase: 'synergy', kind: 'jargon', suggest: 'teamwork' }, { phrase: 'leverage', kind: 'jargon', suggest: 'use' },
        { phrase: 'cutting-edge', kind: 'jargon', suggest: 'modern' }, { phrase: 'state-of-the-art', kind: 'jargon', suggest: 'modern' },
        { phrase: 'best-in-class', kind: 'jargon', suggest: '' }, { phrase: 'seamless', kind: 'jargon', suggest: 'smooth' },
        { phrase: 'robust', kind: 'jargon', suggest: 'reliable' }, { phrase: 'holistic', kind: 'jargon', suggest: 'complete' },
        { phrase: 'empower', kind: 'jargon', suggest: 'help' }, { phrase: 'unlock', kind: 'jargon', suggest: 'get' },
        { phrase: 'bro', kind: 'slang', suggest: '', channels: ['Email', 'Press note'] }, { phrase: 'dude', kind: 'slang', suggest: '', channels: ['Email', 'Press note'] },
        { phrase: 'lit', kind: 'slang', suggest: 'great', channels: ['Email', 'Press note'] }, { phrase: 'gonna', kind: 'slang', suggest: 'going to', channels: ['Email', 'Press note'] },
        { phrase: 'wanna', kind: 'slang', suggest: 'want to', channels: ['Email', 'Press note'] },
      ],
      facts: [
        { key: 'plusPrice', label: 'Lumo Plus price (₹ per month)', value: 99, clause: 'F-5.1', source: 'Pricing page v4, updated Aug 2026' },
        { key: 'userCount', label: 'Active student members (minimum)', value: 50000, clause: 'F-5.1', source: 'Product analytics, Sept 2026' },
        { key: 'launchYear', label: 'Launch year', value: 2023, clause: 'F-5.1', source: 'Company fact sheet' },
        { key: 'freeBudgets', label: 'Budgets on the free plan', value: 3, clause: 'F-5.1', source: 'Pricing page v4' },
        { key: 'trialDays', label: 'Free trial length (days)', value: 14, clause: 'F-5.1', source: 'Pricing page v4' },
      ],
      claims: [
        { id: 'AC-1', status: 'approved', text: 'No hidden fees', pattern: 'no hidden (?:fees|charges)', source: 'Pricing page v4' },
        { id: 'AC-2', status: 'approved', text: 'Bank-grade encryption', pattern: 'bank[- ]grade (?:encryption|security)', source: 'Security whitepaper 2025' },
        { id: 'AC-3', status: 'approved', text: 'Made for students', pattern: '(?:made|built) for students', source: 'Brand book' },
        { id: 'AC-4', status: 'approved', text: 'Works with UPI', pattern: 'works with upi', source: 'Product spec 2.4' },
        { id: 'PC-1', status: 'prohibited', text: 'guaranteed to', pattern: 'guarantee[sd]?\\s+to', suggest: 'designed to', why: 'Nothing in the product can be guaranteed to produce a result. “Designed to” is accurate.' },
        { id: 'PC-2', status: 'prohibited', text: 'guaranteed / guarantee', pattern: '(?<![\\w])guarantee[sd]?(?![\\w])', suggest: '' },
        { id: 'PC-3', status: 'prohibited', text: 'risk-free / zero risk', pattern: '(?<![\\w])(?:risk[- ]free|zero risk|no risk)(?![\\w])', suggest: '' },
        { id: 'PC-4', status: 'prohibited', text: 'military-grade / unhackable', pattern: '(?<![\\w])(?:military[- ]grade|unhackable|100\\s?% secure)(?![\\w])', suggest: 'bank-grade', why: '“Military-grade” isn’t an approved security claim. “Bank-grade” is (AC-2).' },
        { id: 'PC-5', status: 'prohibited', text: 'get rich / make you rich', pattern: '(?<![\\w])(?:get rich|make you rich|double your (?:money|savings)|financial freedom)(?![\\w])', suggest: 'help you manage money', why: 'Wealth promises are prohibited. Lumo helps people manage money.' },
        { id: 'PC-6', status: 'prohibited', text: 'names a competitor', pattern: '(?<![\\w])(?:better than|beats|unlike)\\s+(?:gpay|google pay|phonepe|paytm)(?![\\w])', suggest: null, why: 'We do not compare ourselves with other apps by name.' },
      ],
      disclaimers: [
        {
          id: 'D-1', rule: 'MSG-FIN', severity: 'high', clause: 'M-3.1',
          trigger: '\\b(?:invest(?:ing|ment|ments|or|ors)?|mutual funds?|stocks?|interest rates?|loans?|credit scores?|trading|crypto|returns?\\s+on|\\d+%\\s+returns?)\\b',
          test: 'not a financial advis[eo]r',
          required: 'Lumo is a budgeting tool, not a financial advisor.',
          title: 'Finance content needs the disclaimer',
          why: 'This text talks about money products. Guideline M-3.1 requires the line “Lumo is a budgeting tool, not a financial advisor.”',
        },
        {
          id: 'D-2', rule: 'MSG-TERMS', severity: 'medium', clause: 'M-3.2',
          trigger: '\\b(?:offers?|discounts?|\\d+\\s?%\\s+off|free trial|limited[- ]time|cashback|coupon)\\b',
          test: 'terms apply|t&c|terms and conditions',
          required: 'Terms apply.',
          title: 'Offer needs “Terms apply”',
          why: 'Offers, discounts and free trials must say “Terms apply.” (guideline M-3.2).',
        },
      ],
      palette: [
        { name: 'Ink', hex: '#1B1F4B', use: 'Text, headers' },
        { name: 'Mint', hex: '#2BD4A6', use: 'Accents, success' },
        { name: 'Sunrise', hex: '#FFB547', use: 'Highlights, offers' },
        { name: 'Cloud', hex: '#F4F6FB', use: 'Backgrounds' },
      ],
      changelog: [
        { at: Date.now() - 1000 * 3600 * 24 * 12, by: 'Manish Rao', text: 'Updated Lumo Plus price to ₹99 per month' },
        { at: Date.now() - 1000 * 3600 * 24 * 40, by: 'Manish Rao', text: 'Added claims register and prohibited list' },
      ],
    };
  }

  /* Sample history: 6 weeks of resolved findings for the Insights page. */
  function seedEvents() {
    const table = [
      ['CLM-SUP', 14, 11], ['CLM-NUM', 9, 7], ['CLM-PRO', 6, 6], ['TERM-CUST', 12, 10], ['TERM-CAP', 7, 6],
      ['TONE-HYPE', 13, 5], ['TONE-EXCL', 8, 3], ['TONE-CAPS', 6, 5], ['FACT-PRICE', 4, 4], ['FACT-USERS', 5, 4],
      ['A11Y-HASH', 10, 9], ['A11Y-READ', 9, 4], ['MSG-FIN', 6, 5], ['MSG-TERMS', 7, 6], ['VIS-LOGO', 4, 3],
      ['A11Y-ALT', 7, 6], ['A11Y-CON', 5, 4], ['CONF-PII', 3, 3],
    ];
    const teams = ['Campus', 'Marketing', 'Support'];
    const events = [];
    let seed = 7;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (const [rule, det, acc] of table) {
      for (let i = 0; i < det; i++) {
        const w = Math.min(5, Math.floor(Math.pow(rnd(), 0.8) * 6));
        events.push({ w, team: teams[Math.floor(rnd() * (rule.startsWith('CLM') ? 2 : 3)) % 3], rule, outcome: i < acc ? 'accepted' : 'dismissed' });
      }
    }
    return events;
  }
  const SEED_REVIEWS_PER_WEEK = [14, 17, 19, 22, 21, 24];
  const SEED_CLEAN_RATE = [0.18, 0.22, 0.27, 0.31, 0.36, 0.41];

  const HERO_TEXT =
    '🔥🔥🔥 BACK TO COLLEGE SALE!!! lumo is the #1 budgeting app in India and saves you 40% instantly! ' +
    'Our customers love it – over 2 lakh students already use it, and it is guaranteed to make you rich.\n\n' +
    'Get Lumo Plus for just ₹149 per month with a 30-day free trial. Invest your savings smartly and never worry about money again. ' +
    'Click here to join the revolution: https://lumo.example/plus\n\n#lumobudget #backtocollege';

  function seedSubmissions(now) {
    const H = 3600 * 1000;
    const riya = { name: 'Riya Sharma', role: 'creator' }, manish = { name: 'Manish Rao', role: 'manager' }, kavita = { name: 'Kavita Nair', role: 'reviewer' };
    const ev = (t, who, type, text) => ({ at: now - t * H, by: who.name, role: who.role, type, text });
    return [
      {
        id: 's-hero', title: 'Back-to-college promo post', channel: 'Social post', team: 'Campus', author: riya, status: 'draft',
        goal: 'Get students to try Lumo Plus before exams.', confidential: false,
        draft: HERO_TEXT,
        versions: [{ v: 1, text: HERO_TEXT, at: now - 5 * H, by: 'Riya Sharma', note: 'First draft' }],
        visual: { hasImage: true, alt: '', fg: '#FFB547', bg: '#F4F6FB', large: false, logo: 'old', palette: null, thumb: null },
        decisions: {}, ai: null, comments: [
          { id: 'c1', at: now - 4 * H, by: 'Riya Sharma', role: 'creator', text: 'Draft for the back-to-college push. Poster is in the design folder, logo and colours still to confirm.' },
        ],
        audit: [ev(5, riya, 'created', 'Created the review')], updatedAt: now - 4 * H,
      },
      {
        id: 's-email', title: 'Lumo Plus launch email', channel: 'Email', team: 'Marketing', author: riya, status: 'in_review',
        goal: 'Tell existing members that Lumo Plus is available and invite them to start the trial.', confidential: false,
        draft:
          'Subject: Meet Lumo Plus\n\nHi there,\n\nLumo helps you see where your money goes. Today we are launching Lumo Plus, a paid plan for ₹99 per month with unlimited budgets, spending reports and shared budgets for hostel roommates.\n\n' +
          'New members get a 14-day free trial. No hidden fees, and you can cancel any time.\n\nStart your trial from the Plus tab in the app.\n\nThe Lumo Budget team',
        versions: [], visual: { hasImage: false, alt: '', fg: '#1B1F4B', bg: '#F4F6FB', large: false, logo: 'full', palette: null, thumb: null },
        decisions: {}, ai: null, comments: [
          { id: 'c2', at: now - 20 * H, by: 'Riya Sharma', role: 'creator', text: 'Second version. I fixed the price and the trial length from Manish’s note.' },
          { id: 'c3', at: now - 3 * H, by: 'Kavita Nair', role: 'reviewer', text: 'Facts match the pricing page. Please check the “unlimited” wording with product before this goes out.' },
        ],
        audit: [ev(44, riya, 'created', 'Created the review'), ev(40, riya, 'submitted', 'Submitted version 1 for review'), ev(30, manish, 'changes', 'Requested changes: price and trial length were out of date'), ev(20, riya, 'submitted', 'Submitted version 2 for review')],
        updatedAt: now - 3 * H,
      },
      {
        id: 's-press', title: '50,000 members milestone press note', channel: 'Press note', team: 'Marketing', author: riya, status: 'changes_requested',
        goal: 'Announce the member milestone to campus and tech media.', confidential: false,
        draft:
          'Mumbai: Lumo, India’s leading budgeting app for students, today announced that more than 50,000 students now use it every month.\n\n' +
          'Launched in 2022 as a small project at a Mumbai college, Lumo now helps customers plan pocket money, split hostel costs and save towards goals. “We built Lumo because budgeting should feel calm, not stressful,” said the founding team.\n\n' +
          'Lumo Plus, the paid plan, costs ₹99 per month and includes a 14-day free trial. Terms apply.',
        versions: [], visual: { hasImage: false, alt: '', fg: '#1B1F4B', bg: '#FFFFFF', large: false, logo: 'full', palette: null, thumb: null },
        decisions: {}, ai: null, comments: [
          { id: 'c4', at: now - 26 * H, by: 'Manish Rao', role: 'manager', text: 'Please fix the launch year and drop “leading”. We can’t prove a ranking. Then resubmit.' },
        ],
        audit: [ev(60, riya, 'created', 'Created the review'), ev(50, riya, 'submitted', 'Submitted version 1 for review'), ev(26, manish, 'changes', 'Requested changes: launch year and “leading” claim')],
        updatedAt: now - 26 * H,
      },
      {
        id: 's-poster', title: 'Campus session poster caption', channel: 'Social post', team: 'Campus', author: riya, status: 'approved',
        goal: 'Invite students to the Friday budgeting session.', confidential: false,
        draft: 'Exam week is coming. Plan your pocket money with Lumo Budget and keep a little aside for chai. Join our campus session on Friday at 4 pm in Seminar Hall B.\n\n#LumoBudget #CampusLife',
        versions: [], visual: { hasImage: true, alt: 'Poster with a cup of chai and the words Plan your pocket money on a light background', fg: '#1B1F4B', bg: '#F4F6FB', large: true, logo: 'full', palette: null, thumb: null },
        decisions: {}, ai: null, comments: [{ id: 'c5', at: now - 70 * H, by: 'Manish Rao', role: 'manager', text: 'Clean. Approved.' }],
        audit: [ev(80, riya, 'created', 'Created the review'), ev(76, riya, 'submitted', 'Submitted version 1 for review'), ev(70, manish, 'approved', 'Approved version 1')],
        updatedAt: now - 70 * H, approvedBy: 'Manish Rao',
      },
      {
        id: 's-webinar', title: 'Internship budgeting webinar invite', channel: 'Email', team: 'Campus', author: riya, status: 'approved',
        goal: 'Get final-year students to register for the webinar.', confidential: false,
        draft:
          'Subject: Free webinar: budgeting for your first internship\n\nHello,\n\nJoin us on 12 November at 6 pm for a free, 45-minute session on planning your first stipend. You will learn how to split your money into needs, wants and savings, and how to track it with Lumo Budget.\n\nSave your seat on the registration page.',
        versions: [], visual: { hasImage: false, alt: '', fg: '#1B1F4B', bg: '#FFFFFF', large: false, logo: 'full', palette: null, thumb: null },
        decisions: {}, ai: null, comments: [],
        audit: [ev(120, riya, 'created', 'Created the review'), ev(110, riya, 'submitted', 'Submitted version 1 for review'), ev(100, manish, 'approved', 'Approved version 1')],
        updatedAt: now - 100 * H, approvedBy: 'Manish Rao',
      },
    ].map((s) => {
      if (!s.versions.length) s.versions = [{ v: 1, text: s.draft, at: s.updatedAt - H, by: s.author.name, note: s.status === 'in_review' ? 'Submitted for review' : 'First draft' }];
      return s;
    });
  }

  return { CHANNELS, defaultKit, seedEvents, seedSubmissions, SEED_REVIEWS_PER_WEEK, SEED_CLEAN_RATE, HERO_TEXT };
});
