# Verification evidence

## Commands and results

- npm test: 23 domain/model/persistence/release tests passed.
- npm run build: TypeScript and Vite production build passed; motion tools are a separate lazy chunk.
- npm run fixture:build: three routes built from actual generated Astro files (Button matrix, starter/composition and authored motion).
- npm run test:e2e: 12 Chromium workflows passed.
- npm run test:e2e:firefox: 11 passed; one deliberately skipped Chromium-only matrix.
- npm run test:e2e:webkit: 11 passed; one deliberately skipped Chromium-only matrix.
- npm run measure: reproducible raw/gzip/package measurements in export-measurements.json. The static Button package is 2,969 bytes ZIP, with 1,409 bytes gzipped CSS and no client runtime. These values are not agreed device budgets.

The 72-case matrix compares native output and preview across color theme, density, emphasis, size and default/hover/focus appearance. Dedicated tests cover disabled/loading, keyboard Enter/Space, slots, native attributes, instance override/reset, reference cycles/types, safe deletion, undo transactions, stale save acknowledgements, failure/retry, portable assets and fork isolation. Editor journeys additionally cover source propagation, rebinding, typography, anatomy, context creation, combined states, save/reload, import review, Astro download, sample data, timeline scrub/play/timing/reopen and snapshot adoption.

Resilience checks cover long labels, absent icon content, rejected imports and failed font files. CSS isolation is tested in both directions with deliberately conflicting editor and authored styles. Native phrasing constraints and nested-control rejection protect anatomy.

## Browser path and screenshots

The in-app browser returned `Browser is not available: iab`; Playwright was used as requested. Restricted Windows process execution also caused Firefox blank-page crashes and test cleanup stalls. All three engine suites pass with normal process permissions. Runtime verification uses built Astro output on port 4322, avoiding shared development optimizer caches.

The script-disabled iframe is intentional. Chromium/WebKit report blocked test-driver script attempts in about:srcdoc; the console assertion excludes only that exact class of sandbox message. Library documents do not inject scripts, and other console/page errors fail the checked journey.

Desktop: 1600x1000. Narrow: 390x844. Screenshot method: Playwright page.screenshot. Temporary evidence files: C:/Users/HS108 Design Studio/AppData/Local/Temp/formwork-desktop.png and formwork-narrow.png.

Approved concept: C:/Users/HS108 Design Studio/.codex/generated_images/01a145cc-e97f-72e3-995e-97425d7ad5b1/exec-ef1d4ef2-e74c-45ba-a360-f629a045dda2.png. Both the concept and rendered screenshots were opened with view_image for direct comparison.

## Fidelity ledger

| Comparison               | Result / intentional change                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Information architecture | Eight requested workspaces; duplicate generated Primitives tab removed                                                                           |
| Panel geometry           | Same top bar, browser, anatomy rail, preview, inspector and expandable bottom area                                                               |
| Palette                  | White editor surfaces, fine cool-gray borders, charcoal text and restrained blue selection retained; authored canvas follows its own theme token |
| Typography               | Compact system sans with explicit control/table type sizes; increased the first pass's overly small labels                                       |
| Controls and copy        | Functional controls replace generated mock text; invented inventory/counts removed and later replaced by actual authored records                 |
| State presentation       | Combinable checkboxes drive one live preview rather than disconnected state specimens                                                            |
| Inspector density        | Added required real authoring fields, source traces, inherited binding labels and reset actions; inspector scrolls                               |
| Responsive behavior      | Library/inspector become collapsible panels; workspace navigation scrolls and document content stays within viewport                             |

The approved visual direction was faithfully checked at native-size desktop and narrow layouts. Functional additions and the listed corrections are intentional deviations from the generated concept; no pixel-identical claim is made.

Final navigation regression: library switching while autosaving edits, independent fork preservation and Escape cancellation pass in Chromium, Firefox and WebKit. The final shared-field changes also make pending drafts visible as Unsaved and protect them on close.

Final full run: npm run test:e2e:all completed with 34 passed and 2 intentionally skipped (the Chromium-only parity matrix in Firefox/WebKit). All browser cases passed after the shared draft/save fixes.
Final visual repair: normalized editor select appearance and chevrons after WebKit screenshots exposed clipped native select text. Selected values remain readable; native select semantics and keyboard operation are retained.
