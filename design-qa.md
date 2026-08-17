# ASCRM-16 design QA

- Source visual truth: `docs/design/signal-inbox-reference.png`
- Implementation screenshot: `docs/design/ascrm-16-implementation.png`
- Combined comparison evidence: `docs/design/ascrm-16-comparison.png`
- Responsive evidence: `docs/design/ascrm-16-mobile.png`
- Viewport: 1488 × 1058 CSS px; responsive check at 390 × 844 CSS px
- Source pixels: 1488 × 1058
- Implementation pixels: 1488 × 1058
- Density normalization: both desktop images captured at 1× and compared at equal pixel dimensions
- State: All signals, Acme Corp selected, existing opportunity destination, Jamie Smith owner

## Full-view comparison evidence

The implementation matches the reference's 260 px navigation rail, 385 px signal list, 94 px header, fixed-height desktop workspace, white/warm-neutral surfaces, green review action, and evidence-first detail hierarchy. The signal list and detail region have independent overflow so persistent controls remain visible without document overflow.

## Focused-region comparison evidence

- Header and navigation: title, date, Jamie Smith profile, Inbox count, smart-filter counts, and help card were compared directly.
- Signal list: sort/filter controls, selected border, company marks, score rings, card density, and 12-signal scroll behavior were compared directly.
- Detail header: AI-detected status, headline wrapping, confidence ring, opportunity score, signal type, and date were compared directly.
- Review content: Why it matters, account match, three evidence rows, suggested owner, destination selection, opportunity chip, approve action, and dismiss action were compared directly.

## Required fidelity surfaces

- Fonts and typography: Segoe UI/system typography preserves the reference hierarchy and compact UI density. Headline width and casing were corrected to retain `Series C` and `AI` while matching the two-line wrap.
- Spacing and layout rhythm: core columns measure 260 px / 385 px / 843 px at the target viewport. Card row heights, detail-card rows, gaps, and action footer align with the source composition.
- Colors and visual tokens: established navy, warm white, green, muted ink, and border tokens match the source direction and the ASCRM-8 design system.
- Image quality and asset fidelity: the screen has no photographic imagery. Mock company and evidence identities use the installed Phosphor icon library rather than CSS drawings or placeholder image boxes.
- Copy and content: the selected signal, evidence, account match, owner, opportunity, scores, dates, filters, and action labels match the reference intent and use realistic data across all 12 records.

## Interaction and responsive verification

- Selecting Northwind Logistics updates the complete detail pane: passed.
- Changing suggested owner to Alex Morgan: passed.
- Approving a selected signal removes it, advances selection, and displays a success status: passed.
- Sorting control and destination control are functional.
- Mobile navigation opens and closes: passed.
- Mobile and desktop horizontal overflow: none.
- Desktop document overflow at 1488 × 1058: none.
- Browser console warnings/errors: none.
- Type-check, lint, and production build: passed.

## Comparison history

1. Initial comparison found a P2 list-position drift caused by an invented search row and a P2 copy mismatch caused by lowercasing the full headline. The search row was removed and source casing restored.
2. Second comparison found a P1 desktop overflow issue after expanding the fixture set to 12 signals. The workspace was given a fixed desktop height and both grid children received zero minimum height with independent scrolling.
3. Third comparison found P2 density differences in headline wrapping, detail-card row heights, list-card rhythm, and missing smart-filter states. Headline width, card heights, row gaps, and the Unreviewed/Approved/Dismissed filters were aligned to the reference.
4. Final browser evidence confirms 1488 × 1058 geometry, zero document overflow, zero console warnings/errors, and no remaining actionable P0/P1/P2 findings.

## Findings

- No actionable P0/P1/P2 differences remain.

## Follow-up polish

- P3: Replace the fictional icon-based company marks with approved brand artwork if a future asset library becomes available.

final result: passed
