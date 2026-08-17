# ASCRM-8 design QA

- Source visual truth: `docs/design/signal-inbox-reference.png`
- Implementation evidence: `docs/design/ascrm-8-implementation.png`
- Combined comparison: `docs/design/ascrm-8-comparison.png`
- Viewport: desktop 1488 × 1058 CSS px; mobile 390 × 844 CSS px
- Source pixels: 1488 × 1058
- Implementation pixels: 1488 × 1058
- State: desktop overview with Inbox active; mobile drawer opened, Accounts selected, then closed

## Full-view comparison evidence

The implemented application shell retains the reference's core proportions and hierarchy: fixed deep-navy navigation, white top bar, warm workspace canvas, green active/action state, compact line icons, bordered surfaces, and restrained elevation. The central overview content intentionally differs because ASCRM-8 establishes the shell and design system; the complete Signal Inbox content is scoped to ASCRM-16.

## Focused-region comparison evidence

The sidebar was checked directly for brand lockup, active navigation state, count badge, smart-filter treatment, icon weight, spacing rhythm, and contrast. The header was checked for title hierarchy, date, notification control, profile treatment, borders, and alignment.

## Findings

- No actionable P0/P1/P2 shell mismatches remain.
- The exact Signal Inbox columns and signal-detail content are intentionally absent and remain ASCRM-16 work.
- Browser capture density differed from CSS density during one comparison; layout geometry was therefore verified with browser-computed CSS measurements in addition to the equal-pixel evidence capture.

## Interaction and responsive verification

- Desktop navigation active state: passed.
- Mobile drawer open/close and navigation selection: passed.
- Horizontal overflow at mobile width: none.
- Keyboard-visible focus styles: implemented.
- Browser console warnings/errors: none.
- Type-check, lint, and production build: passed.

## Comparison history

1. Initial build: the selected reference was compared against the browser-rendered implementation.
2. Typography was refined from Arial-first to Segoe UI-first and the profile affordance was corrected to a chevron icon.
3. Post-fix checks found no remaining P0/P1/P2 issue within the ASCRM-8 shell scope.

## Follow-up polish

- ASCRM-16 will implement the full three-pane Signal Inbox and its review interactions.

final result: passed
