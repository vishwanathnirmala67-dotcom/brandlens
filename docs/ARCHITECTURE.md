# Architecture

## Data flow

```
paste / upload (.txt .md .html .docx)  ──►  draft text + goal + channel
                                              │
   Brand Kit (clauses, glossary, facts, claims, palette)
                                              │
                          ┌───────────────────▼───────────────────┐
                          │ engine.analyze(text, kit, ctx)         │  rules: terms, tone, claims,
                          │ engine.analyzeVisual(visual, kit)      │  facts, disclaimers, a11y, PII
                          └───────────────────┬───────────────────┘
                                              │ findings (each cites a clause or approved fact)
        optional ──► AI second opinion ──► engine.validateAI()   drops findings whose quote or clause is invalid
                                              │
                         findings + decisions (apply / edit / dismiss with reason)
                                              │
              workflow: submit gate → Reviewer sign-off → Manager approval
                                              │
                    audit trail, versions, events → Insights
```

## Main technical decisions

1. **Rules first, AI second.** Rules are deterministic and explainable, so the same input always gives the same findings. The AI only adds what rules cannot see, and every AI finding must quote the draft and cite a clause that exists.
2. **Every finding is grounded.** A finding without a clause or approved source cannot be created. Claims are split into *contradicts an approved fact* and *no approved source*, so reviewers know what to reject and what to verify.
3. **Human control by construction.** Fixes are suggestions. Dismissing needs a reason. High-severity dismissals need Reviewer sign-off before Manager approval. Personal data findings cannot be dismissed.
4. **Client-side engine.** `engine.js` is pure functions with no DOM, so it runs in the browser (no upload for rule checks) and in Node (unit tests). The same file will move to the server in Round 3.
5. **Stable finding keys.** A decision is keyed by rule and quoted text, so a dismissal survives edits and re-checks.
6. **Single self-contained page.** `build.py` inlines the sources into one HTML file so judges can open it with no login or setup.

## Privacy

- Rule checks never leave the browser.
- Before an AI call the exact payload is shown. Emails, phone numbers and ID numbers are masked first.
- Confidential reviews never use the AI.
