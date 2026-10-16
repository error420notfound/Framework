# Authoring experience refinements

Specification: https://app.notion.com/p/3fbea1d9945581a99fb8c5d16abe6411

## Inspection and baseline

Inspected `main` with a clean working tree at the start. No repository or ancestor AGENTS.md was present. Read the current Notion refinement page, full project checkpoint, original plan, tracker schema and existing Formwork task states before implementation. The existing eleven completed Actions were preserved; the release/migration/device-budget Action remains a separate gate.

The pre-change Chromium review at 1366×900 reproduced every reported finding. None was already fixed or unreproducible locally:

| Requirement | Local reproduction | Implementation modules |
| --- | --- | --- |
| R1 | Foundations → Components retained Blue 600 in the inspector | `app/store.ts`, `app/navigation.ts`, `app/App.tsx` |
| R2 | Four BrewPanel instances listed as peers; populated Compositions said Create first item | `shell/Browser.tsx`, `workspaces/Composition.tsx`, `controls/Breadcrumbs.tsx` |
| R3 | Node content, primitive, anatomy, styling, rules and destructive actions in one long form | `inspectors/Inspector.tsx`, `controls/Fields.tsx`, `app/styles.css` |
| R4 | Shared-style line-height literal labelled both Inherited and Local override; inherited fields offered Reset | `editor/resolution.ts`, `inspectors/Inspector.tsx`, `controls/Fields.tsx` |
| R5 | Used-by paths displayed machine keys, including `bindings.fontSize.ref` and rule patch paths | `editor/dependencies.ts`, `shell/BottomPanel.tsx` |
| R6 | Channel 1–3; space selector reinterpreted channels; non-sRGB hex was a hard-coded blue | `domain/color.ts`, `domain/schema.ts`, `controls/ColorEditor.tsx` |
| R7 | Drawer open initially, large content controls, fixed panels; viewport constrained available width instead of simulating it | `app/preferences.ts`, `controls/PanelResize.tsx`, `workspaces/Canvas.tsx`, shell and CSS |
| R8 | `font.weight.medium` resolved to 600 | `starter/library.ts` |

Baseline model suite: 25 tests passed. Raw review observations: `output/playwright/baseline-findings.json`; screenshot: `output/playwright/before-components.png`.

## Architecture and execution plan

Retain React/Vite/plain CSS, Zustand document commands and separate transient editor state. Retain schema version 1, IndexedDB libraries/releases, portable ZIPs, stable IDs and shared preview/Astro compilation. No new framework, runtime dependency or schema migration is needed.

1. Implement R1–R2 in transient navigation and browser presentation. Each workspace remembers selection, component, binding scope and preview context. Empty/deleted selections remain explicit. Composition membership is derived from the existing reference arrays.
2. Implement R3–R5 with mounted contextual sections, appearance groups, resolution-based provenance and dependency destinations. Keep exact references and technical details. Match existing rules by stable IDs/conditions instead of manufacturing duplicate rules.
3. Implement R6–R8 with conversion helpers, precision-preserving drafts, independent panel preferences, actual viewport simulation with fit scaling and a stable-ID starter rename.
4. Run model and existing browser regression suites, add failure-specific checks, build editor and Astro, inspect desktop/narrow screenshots and update Notion with actual outcomes.

## Relationship and editing decisions

Compositions reference instances; the schema has no exclusive owner field. A shared instance may appear under multiple compositions. Standalone instances are separately labelled. Removing composition membership leaves the instance record intact, preserving existing semantics. Instance preview hides the definition anatomy rail and opens the referenced component through explicit links.

Inspector sections stay mounted with `hidden`, so switching sections preserves draft and picker state. Controls commit on blur/Enter and cancel with Escape. Appearance uses applicable groups only. Exact binding selectors and advanced token creation remain available; record deletion is in a collapsed disclosure. The effective preview source is shown separately when it differs from the editing layer. Reset removes the selected node/rule/responsive/instance property, preserving other properties and scopes. Shared-style values use a separate Remove action, rather than being labelled overrides. Responsive routes select the threshold and simulated viewport. Instance routes select their exact anatomy part; motion consumers open the owning workspace and highlight the stable clip ID.

An additional source-level defect was found: starter rule IDs (`small`, `hover`, `focus`) differ from generated inspector IDs (`variant_size_small`, etc.). Scope lookup now resolves existing rules by stable ID or matching conditions. Dependency destinations carry rule IDs, never persisted rule-array positions.

Panel preferences use `formwork.panels.v1` in optional localStorage, separate from library persistence/history. Width limits are browser 160–280 px and inspector 280–440 px. Below 1100 px, panels open as overlays. Keyboard separators support arrows, Home and End. A 1280 px simulated viewport is genuinely 1280 CSS pixels inside its iframe, with fit scaling reported separately.

## Colour contract

Conversion uses D65 RGB matrices and extended-range transfer functions, plus OKLab/OKLCH Cartesian/polar transforms. Reference: [CSS Color 4 conversion algorithms](https://www.w3.org/TR/css-color-4/#color-conversion-code). No gamut clipping occurs in stored conversions. Extended sRGB uses `color(srgb …)` in CSS to preserve out-of-gamut coordinates; ordinary sRGB retains the existing `rgb(…)` output.

sRGB controls display R/G/B in 0–255 units; Display P3 uses 0–1; OKLCH uses L 0–1, C ≥ 0 and H 0–360 degrees. RGB conversions may retain extended finite values. Alpha is 0–1. Blank/nonfinite or invalid constrained values do not mutate the document. Fields display up to four decimal places without writing rounded values back; CSS details retain the full stored values. Hex is available only within sRGB gamut (tolerance 1e-6 at the boundary), represents 8-bit RGB, and keeps alpha when edited.

Regression tolerances: 100 cycles through all three spaces return tested non-achromatic source channels within 1e-8; alpha remains exact. Browser conversion loops compare stored source channels within 1e-9. Save/portable round-trips retain exact serialized colour channels. These tolerances measure conversion arithmetic, not a device's displayed gamut. Achromatic hue is normalised to 0 below chroma 1e-7.

The 600-weight starter token is renamed to `font.weight.semibold`, preserving `font_weight` and all references. The registered source supports 400/500/600/700, so 600 is intentional. Related starter token terminology was inspected; no arbitrary value or appearance changes were made. Imported documents retain their existing names; user data is not rewritten.

## Verification checkpoint

The model suite passes 40 tests. Six focused Chromium acceptance journeys pass, including workspace/instance/source navigation, selective reset, inspector drafts, colour validation/conversion, panel resize/collapse, save/reload, keyboard interaction, and screenshots at 1366×900, 1440×900, 900×900 and 390×844. Full cross-engine results and final evidence are recorded below after completion.

The release/migration/device-budget gate remains outside these refinements. No push or deployment is authorised or performed.

## Screenshots inspected

- `output/playwright/refined-button-1366.png` and `refined-button-1440.png`: fill and padding visible in the initial desktop inspector.
- `output/playwright/refined-label-1366.png` and `refined-label-1440.png`: typography and binding scope.
- `output/playwright/refined-narrow-900.png`: collapsible inspector overlay.
- `output/playwright/refined-mobile-390.png` and `refined-mobile-canvas.png`: inspector and collapsed anatomy at 390 x 844.
- `output/playwright/refined-composition.png`: BrewPanel with four child instances and a visible scaled preview.
- `output/playwright/refined-dependencies.png`: readable source/direct/downstream paths.
- `output/playwright/refined-color.png`: labelled colour units and resolved CSS.

Screenshot review caught and corrected a composition wrapper clipping defect; the browser regression now checks that the iframe is in the viewport, not only that its document contains the expected text. Earlier diagnostic screenshots and temporary implementation scripts were removed.

## Final verification — 2026-10-17

- `npm test`: 40 passed across six files, including fifteen refinement regressions.
- `npm run build`: TypeScript and Vite production build passed. The existing large-chunk warning remains (editor/catalog assets); no build errors.
- `npm run fixture:build`: generated Astro output builds three routes. The complete browser test server also rebuilds the fixture before serving it.
- `npm run test:e2e:all`: 58 passed, 2 intentional parity-matrix skips across Chromium, Firefox and WebKit. Twenty workflows run in Chromium; nineteen run in each other engine. The 72-combination preview/export matrix runs in Chromium; dedicated native disabled/loading/focus checks run as well.
- Verified source propagation, scoped semantic rebinding, combined focus/loading and disabled behavior, definition/instance isolation, undo/redo, selected-record deletion, draft retention, save/reload, portable import/export with IDs/assets, legacy token names, exact rule/responsive/instance/motion routes, colour conversion/validation, keyboard and pointer resizing, panel preference restoration and console health.
- Screenshot inspection completed at both requested desktop sizes plus 900 x 900 and 390 x 844. A clipping regression found in visual review was fixed and covered by an in-viewport assertion.
- `git diff --check`: passed. Temporary implementation helpers and diagnostic captures removed. The source remains on the existing main branch with uncommitted changes; no push or deployment.

No unresolved R1–R8 acceptance failure remains in these checks. Physical wide-gamut output depends on the display. The separate release/migrations/device-budget gate remains open: agree the target profile/budgets and add a genuine historical migration fixture when a schema change exists. No schema change was made for these refinements.

Notion read-back verified: the refinement Group and all four Actions are Done with evidence; the specification and project checkpoints were appended. The project and original release/migration/device-budget Action remain In progress. See `docs/notion-tracking.md` for the exact records. No pending tracker writes.
