# BrandLens

An intelligent brand-governance platform that reviews content **before publication**: it checks text and visual details against approved guidelines, facts and claims, explains every finding with its source, suggests minimal fixes, and routes the result through a role-based human approval workflow.

Built for the Inkloom AI problem statement, Round 2 (The Build). The demo brand, *Lumo Budget*, is fictional.

**Live app:** see the link in the submission. **Source:** this repository.

## What works in this build

- **Brand Kit** with 19 guideline clauses, glossary, banned phrases (hype, jargon, slang by channel), approved facts, a claims register (approved and prohibited), palette and logo rules. Managers edit it, every change is versioned, and it can be imported and exported as JSON.
- **Review engine** with 31 rule types in 8 categories (tone, terminology, messaging, facts, claims, accessibility, visual, confidentiality). Every finding cites a clause or approved source and says whether a claim *contradicts* an approved fact or simply has *no approved source*.
- **Suggested fixes** shown as before/after, always minimal. Nothing is applied automatically. Only purely mechanical fixes (capitals, hashtags, term spelling) can be applied in one click.
- **Visual details**: image upload with palette scan (photos are skipped), alt text, WCAG contrast with a brand-colour fix, logo version against the background.
- **Confidentiality**: personal data and confidential markings are detected and cannot be dismissed. A review can be marked confidential, which switches the AI off.
- **Optional AI second opinion** that must quote the draft and cite an existing clause. A validator discards anything without a valid source and the page shows how many were discarded. The exact text sent is shown first, with personal data masked.
- **Workflow**: Creator, Brand Manager and Reviewer roles; submit gate for high-severity issues; Reviewer sign-off for dismissed high-severity findings; approve, request changes or reject with a note; comments, version history with word diff, and an audit trail.
- **Insights**: issues by category, weekly trend, guidelines that people keep overriding (linked to the clause), repeat mistakes.
- Inputs: paste text or upload `.txt`, `.md`, `.html`, `.docx`.

## Run it

It is a static page. Open `dist/index.html` in a browser, or rebuild it:

```bash
python3 build.py          # inlines src/ into dist/index.html
node tests/engine.test.js # 15 unit tests for the engine
pip install playwright && python3 tests/ui_flow.py   # end-to-end flow in headless Chromium
```

## Layout

```
src/engine.js   pure review engine (browser + Node), no DOM
src/kit.js      demo brand kit, sample reviews, sample history
src/state.js    state, persistence, analysis cache, actions, AI call
src/views.js    rendering
src/main.js     events and boot
src/style.css   styles (light and dark)
tests/          unit tests and the end-to-end flow
docs/ARCHITECTURE.md
```

## Disclosure

- Code was written with AI assistance (Claude) and reviewed and tested by the team.
- Runtime dependencies: none. Fonts (Bricolage Grotesque, IBM Plex) load from Google Fonts.
- The optional AI second opinion uses the host's Claude through the page's `sample` capability. Rules always run first and work without it.
- Demo data is stored in the browser (`localStorage`) only.
