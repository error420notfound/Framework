# Architecture and authoring contracts

Formwork is a local browser editor. React owns editor chrome; the domain model and compilation modules do not import React. Editor CSS uses `--ed-*`; authored CSS uses `--fw-*` and is rendered in a sandboxed iframe. The approved concept uses white surfaces, fine cool-gray borders, blue selection, system sans typography, compact tables, anatomy rail, canvas and inspector. Generated concept errors (duplicate navigation and imaginary inventory/counts) are deliberately corrected. Combined state controls replace separate non-combinable specimens.

## Version 1 document

`LibraryDocument` contains schemaVersion, library identity, revision, entity registry, default color/density mode IDs and optional fork provenance. The discriminated entity registry includes source, token, theme, style, anatomy node, component, instance, composition and asset. Stable IDs are the only internal references. Human-readable names can change. Token types include color, dimension, number, fontFamily, fontWeight, duration, easing and content string. Colors retain sRGB, OKLCH or Display P3 channels; dimensions carry units. Content and booleans remain component properties.

Zod validates portable input and every command transaction. Semantic checks reject missing references, cycles, type mismatches, conflicting mode assignments, invalid anatomy and nested interactive elements. Serialized files cannot add JavaScript, arbitrary DOM elements or arbitrary CSS properties. SVG assets are rejected; raster images and font binaries are accepted. Font-family strings, URLs and selector identifiers are constrained. ZIP reads have compressed and expanded size limits and never extract to filesystem paths.

## Resolution and inheritance

Resolve token ID → active color/density assignment (at most one) → base binding → typed source/literal. A mode changes assignments, never anatomy. Foundation → semantic aliases → typography style → anatomy binding retain traceable references. Styles supply bindings; individual node bindings override individual style fields. Component defaults apply before matching variants, then hover, pressed, loading/disabled and additive focus-visible. Instance overrides are explicit final inline bindings and can reset independently. Responsive rules constrain authored layouts.

Loading deliberately disables native activation, retains the accessible label and sets aria-busy. Disabled suppresses hover/pressed; simulated focus styling may coexist. Runtime focus uses `:focus-visible`; temporary preview conditions live only in editor state. Reduced-motion removes the CSS loading spinner rotation.

## Commands: before and after

Commands are applied to a cloned candidate and validated once at the transaction boundary. Failure preserves the current document.

| Operation           | Before → after                                                                     |
| ------------------- | ---------------------------------------------------------------------------------- |
| Create              | absent entity → new stable ID and typed record                                     |
| Duplicate component | one definition → separate definition and cloned anatomy IDs                        |
| Rename              | `fill.name=A`, references to `fill` → `fill.name=B`, same references               |
| Update/bind         | semantic alias `fill → color_blue` → `fill → color_ink`; consumers retain `fill`   |
| Apply style         | node with local fields → style ID plus existing field overrides                    |
| Override/reset      | instance inherits fill → one instance binding → inheritance restored               |
| Move/reorder        | child index 2 → index 0; invalid leaf/nested-interactive moves rejected            |
| Remove anatomy      | selected subtree → removed subtree and its targeted visual rules/overrides         |
| Delete/replace      | referenced token deletion blocked → replacement rebinds consumers then deletes     |
| Theme               | shared structure → additional assignment map on one independent axis               |
| Fork                | source document → independent document ID with source identity/revision provenance |

Zustand separates document state, selection/navigation, preview controls and snapshot undo/redo. Field edits commit on blur/Enter; each multi-command operation is one undo transaction. Escape restores the uncommitted field draft without committing it. Dirty field drafts contribute to the visible Unsaved state and before-unload protection. Ctrl+S and library navigation commit the active field before saving; navigation reads the current store and captures its requested destination before awaiting the write. Selection and preview controls never add history.

## Preview and Astro

The compiler resolves the shared document into a native anatomy tree and CSS selectors. Both iframe HTML and generated Astro visit this compiled tree; designs are not separately hand-authored. Astro accepts native attributes and authored public properties and supports default/named slots. Consumers attach event listeners in application code. The static component has no React, state, persistence or GSAP dependency. The fixture builds real generated `.astro` files and exercises native interactions.

## Persistence and migration boundary

`PersistenceAdapter.loadAll/save` isolates IndexedDB. Autosave waits 450 ms after a committed document edit. Writes are serialized and acknowledged only for the matching library/revision. Failure remains visible and retryable. Opening/forking/importing first saves current work. A `.formwork` ZIP contains `library.json` plus asset bytes; imports are validated and reviewed, then opened as an independent library. Browser autosave is local storage, not a cross-device backup.

Schema 1 is the first supported version. Unsupported versions are rejected before use; future migration functions must explicitly transform a known prior version then revalidate. Do not infer unsupported migrations or silently flatten bindings.

## Source adapter

The Chroma boundary accepts `adapter: chroma-palette-v1`, sourceId, name and entries containing external id, name and typed color. The fixture in `public/fixtures/chroma-palette.json` is illustrative. No existing Chroma HTTP endpoint is claimed. Import records preserve palette/entry identity and color-space channels. System fallback fonts work without a key; font files and explicit HTTPS stylesheet metadata can be registered.

## Authored starter, motion and releases

The starter collection is generated through the same create/update commands and schema. Text, Icon, Image, Surface, Stack, Inline, Grid, Button, Link, TextField, Checkbox, WeightReadout and Timer are reusable definitions. BrewPanel arranges configured instances with an application data/action contract. Layout primitives expose default slots in Astro; native phrasing containers reject block layout children. See starter-library.md for actual anatomy/properties/slots/variants/state inventory.

Motion is a typed entity with a component/composition owner, stable named targets, from/to values, start times, duration bindings, supported easing choices, trigger and reduced-motion alternative. The editor lazy-loads GSAP when the Motion panel opens. Playback and scrubbing change preview DOM, not undo history. Timings, targets, durations and easing are command-edited. Overlapping property ownership, separate competing motion owners, and opacity rules/styles that conflict with animation are rejected. Reduced mode either skips movement to its terminal state or uses one short fade per target. Static output excludes the motion module; motion-enabled Astro imports the generated GSAP runtime. Native press motion handles pointer and keyboard activation.

Local releases use an append-only IndexedDB store (database version 2 adds releases without replacing existing libraries). Snapshots include identity/version/revision metadata; document commands reject edits to a release. Adoption explicitly forks its document into a fresh editable library and records release provenance. Portable snapshot downloads retain release metadata. No external publishing, background sync or remote adoption is implied.

Only schema 1 exists. Unknown document versions and unknown fields are rejected; future migrations must be explicit and revalidated. Rename/remove behavior and release adoption are tested, but no historical document version is fabricated for migration demonstrations. Device/browser runtime budgets remain an explicit acceptance gate.

## Authoring experience refinements

Workspace selections, binding scopes and preview configurations are remembered separately from document history. Compositions display their referenced instances beneath definitions without inventing exclusive ownership. The contextual inspector retains mounted field drafts and resolves actual style/node/rule/instance provenance. Semantic dependency routes resolve current paths to stable entity and rule IDs.

Panel preferences are optional localStorage (`formwork.panels.v1`), separate from IndexedDB documents and portable library files. Colour space switches use unrounded conversion; out-of-gamut sRGB uses extended `color(srgb …)` output. Schema version 1 and existing import/save/export contracts remain intact. See [authoring-refinements.md](authoring-refinements.md) for the detailed contract and evidence.
