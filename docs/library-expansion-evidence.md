# Expansion verification — 2026-10-17

Local implementation based on `3a1ecf9`, uncommitted. The working tree was clean before expansion. No push/deployment. Existing authoring-refinement files/evidence and release/device gate are preserved. Test-generated overwrites of the seven original `output/playwright/refined-*.png` files were restored byte-for-byte from HEAD after validation; expansion screenshots use separate `/tmp/` paths.

## Delivered checkpoint

Batch A: preset schema/registration, explicit snapshot semantics with live component inheritance, gallery search/category filter, editable preset configuration, additive install preview/collision handling, compatibility fixture and capability preflight.

Batch B: Button/Text extended; Badge, Avatar, Separator, Card, Alert, Skeleton, Spinner, Progress and Table added as native editable definitions. Thirteen presets reference eleven definitions. No new compositions or charts. Batches C/D/E remain Not started; expansion workstream remains In progress. Next concrete item: inspect pinned Input/Checkbox sources and extend their native public labelling, disabled/value/checked/validation contracts, then implement Textarea/Switch/RadioGroup before overlay adapters.

## Executed checks

| Check | Result |
| --- | --- |
| `npm test` | 47 passed (7 files): existing 40 plus 7 expansion tests |
| `npm run build` | Passed; existing large editor/catalog chunk warning remains |
| `node --import tsx scripts/generate-fixture.ts` + `astro build --root fixtures/astro-consumer` | Passed; 45 exported files and four routes, including `/expansion/` consuming every preset wrapper |
| `FORMWORK_CHROMIUM_PATH='/Applications/Brave Browser.app/Contents/MacOS/Brave Browser' npx playwright test --project chromium` | Stable full run: 24 passed (1.8m), including existing 72-case preview/export matrix |
| Final `... npx playwright test src/tests/e2e/expansion.spec.ts --project chromium` | 4 passed (33.8s), after final gallery-mobile and Progress-binding fixes |
| `git diff --check` | Passed |

The final two visual fixes followed the full stable run: gallery modal moved outside the responsive browser panel and gained an accessible name; Progress gained explicit semantic colour/track/radius bindings. All model tests and both builds passed after those fixes. The final focused four-test run rechecks gallery insertion/local edit/save/reopen, every new core family's geometry editing and persistence, generated Astro semantics/responsive content, and all 13 preset preview/export pairs. Full suite was not rerun after that focused verification.

Earlier exploratory failures were resolved: a style selector assumed one specimen (now explicitly selects Control label); a missing favicon produced a 404; fixture heading styling competed with authored semantic typography; a border control lived in a collapsed appearance group; three tests were interrupted by source live reload during an intermediate run. The stable full run and final focused run above are the acceptance evidence, not those interrupted runs.

## Evidence scope

- Snapshot presets create normal instances of one shared Button definition. Local configuration and later preset edits remain isolated; definition binding edits remain shared.
- Token propagation, independent axes, combined focus/loading/disabled, theme/density and selective overrides retain existing resolution rules.
- Every delivered family parses, round-trips portable files and exports through the shared compiler. Browser flow edits actual appearance fields (padding, width, border or font size) and saves/reopens; no gallery-only implementation claim.
- Historical fixture retains actual pre-expansion schema-1 records/IDs. Installation preserves all existing records, reports incompatible presets, handles different-kind and unrelated same-kind collisions, is idempotent and preserves independent forks.
- Card-only export excludes Button/BrewPanel, icon helper, unrelated primitive CSS, motion/package runtime and unrelated assets/tokens. Unsupported selected and whole-library Astro capabilities fail explicitly. Progress selection retains its semantic token closure.
- Generated output has native heading/alert/status/progress/table semantics, column headers and loading labels. Native Button keyboard focus works. Skeleton/Spinner reduced-motion rules pass.
- All 13 preset wrappers match preview root tag, colour/background, typography, padding/border/radius/gap and part counts. Existing Button 72-case matrix remains separate broader state/theme/density evidence.
- Long Card content and missing Avatar assets render at 1280 desktop and 390×844; no document horizontal overflow or page/console errors in showcase checks. Gallery reviewed at 1440×900 and 390×844, and asserted visibly present at mobile width.

## Browser environment and visual review

Browser plugin skill was unavailable; repository Playwright used. Playwright 1.64.1 had no installed binaries and `npx playwright install chromium firefox webkit` failed with `Playwright does not support chromium on mac13`. An explicit `FORMWORK_CHROMIUM_PATH` fallback uses installed Brave with a temporary isolated Playwright profile. No user profile is used. Current Firefox/WebKit runs are unverified; earlier three-engine evidence is preserved as historical, not reasserted for expansion.

Screenshots captured and visually inspected (ephemeral local artifacts):

- `/tmp/formwork-gallery-desktop.png` — 1440×900.
- `/tmp/formwork-gallery-mobile.png` — 390×844; gallery remains visible and controls wrap.
- `/tmp/formwork-expansion-desktop.png` — 1280 wide, complete generated showcase.
- `/tmp/formwork-expansion-mobile.png` — 390×844, full-page long content.

The review caught/fixed hidden mobile gallery, fixture typography scope and missing Progress colour bindings. Known family limits and runtime/export support are in [library-expansion.md](library-expansion.md); sources/licences in [source-adaptation-matrix.md](source-adaptation-matrix.md). Native Avatar decode/network errors use browser img alt presentation rather than a custom JS error-state adapter. Preset wrappers expose configuration props; custom slots use definitions directly. The device payload/runtime budget and real device acceptance remain unverified and open.
