# Starter expansion checkpoint

Source specification: https://app.notion.com/p/3fcea1d99455811f9ba3e9616c4b37f7

Implementation stays in the React/Vite/plain CSS editor and shared domain/compiler. No Tailwind or shadcn runtime was installed. Official source CLI inspected: shadcn 4.22.0; source implementation is **Radix / new-york-v4**, pinned at `d2fba50ee5b9113008b5bb908563527b7efd2f27`. Current docs default to Base UI; those defaults do not change this source selection. CLI typography lookup is not a registry component; current typography documentation redirects to Typeset. Typography remains shared styles and semantic presets on Text.

Full stable-ID inventory: [components and presets](library-inventory.md).

## Categories and inheritance

- Components own anatomy and public contracts. Existing Button, Text and all prior IDs remain stable.
- Presets are schema-1 `preset` records containing `componentId`, configuration, variants, overrides and `mode: snapshot`. Insertion creates an instance of that definition. It never clones anatomy. Edits to the preset affect future insertions only; existing instances keep the copied configuration. Definition edits still propagate through normal inheritance; instance overrides remain local and reset through the existing inspector.
- Compositions remain arrangements of instance references. Existing BrewPanel is preserved. New metric/login/settings compositions are **not yet delivered**. Metric Card currently names a Card preset, not a composition.

Gallery entry: **Components → Library gallery / install**. Search and category filter distinguish components, presets and compositions. Preview/source and runtime requirements are available before insertion. Edit preset opens the ordinary configuration/variant inspector with an explicit preset scope. Insert opens instance scope. Component definition and anatomy controls remain unchanged.

## Installation and compatibility

Opening an existing IndexedDB/portable library does not install or overwrite anything. Review starter additions computes an exact command transaction; installation creates missing records only, with one undo entry. It lists additions, existing records and conflicts before applying. Existing IDs win; no automatic renaming, replacement or user-edit merge occurs. Incompatible dependent presets/families are skipped deterministically. An unrelated same-kind anatomy collision blocks adoption as well as a different-kind collision. Existing definitions keep their own anatomy. Existing Button/Text definitions do not silently receive new axes; old libraries can therefore omit new Button/typography presets until the author deliberately adapts those definitions. Repeated installation adds nothing. Forks are independent.

Schema version remains 1: new optional capability metadata and a new entity discriminator are additive reader support. No document migration or automatic write-on-open is needed. `src/tests/fixtures/pre-expansion-v1.json` is generated from the actual checked-in pre-expansion `createStarter` + `authorCollection` implementation, retaining original IDs and bindings. It is not an invented schema version. Old applications are not promised forward compatibility with new entity kinds. The separate future historical-version migration/device gate remains open.

## Editable scope and runtime support

All delivered families use named editable nodes, typed properties/defaults, existing token/style bindings, optional slots, axes where meaningful and existing variant/state precedence. All support shared compiler HTML previews and native Astro output with **no client hydration, React, Recharts, GSAP or editor runtime** unless independently authored motion is selected. HTML is the shared compiler output API; the downloadable package remains Astro, not a new HTML packaging target.

| Family | Anatomy / public controls | Axes / slots | Limits |
| --- | --- | --- | --- |
| Button | Existing root/content/Icon/label; label, icon, visibility, trailing position, full width, disabled/loading | Independent emphasis and size; default/icon slots | Adds outline/destructive/ghost to fresh starter; normal native button behaviour and focus preserved |
| Typography / Text | Content, semantic element, shared body/heading/muted styles; editable style/token bindings | Independent element and tone; heading/muted presets | Semantic element whitelist; no unrelated heading definitions |
| Badge | Informational label, geometry and colour bindings | Independent tone and size; default slot | Not a Toggle or removable Tag; no action semantics |
| Avatar | Root, registered image asset, fallback initials, accessible label | No visual axes; image/initials properties | Native initials node handles absent assets; img alt initials provide browser-native decode/network error fallback; no remote avatar URL fetch, groups or status badge |
| Separator | Native hr; width, border colour/width | No axes / child slots | Horizontal semantic divider; vertical/decorative variants deferred |
| Card | Root, header, title, description, content and footer, editable text and geometry | Size; header/title/description/default/footer slots | Default and footer slots are block containers; no business actions |
| Alert | Root, icon, title, description | Tone; icon/title/default slots | Native alert live-region; does not implement notifications or dismissal |
| Skeleton | Decorative placeholder width/height/radius/fill | No axes / child slots | CSS pulse with reduced-motion alternative; consumer supplies loading status |
| Spinner | Indicator glyph, size/colour, accessible loading label | No axes / child slots | CSS rotation with reduced-motion alternative; glyph is editable, not arbitrary SVG path editing |
| Progress | Native progress with value/label and geometry/semantic colour bindings | No axes / child slots | Determinate 0–100, renderer clamps out-of-range finite values; native indicator styling differs by browser |
| Table | Caption, head, row, column headers, body, cells; exposed sample text, geometry/bindings and movable anatomy | Caption/body slots | Small static table; row/cell anatomy can be edited; no sorting, filtering, pagination or application data engine |

Content is stored in properties/instances; it is never a design token. Styles and anatomy bind to existing semantic roles (`fill`, `text`, `surface`, `text_primary`, `color_muted`, spacing/density, font and radius). Destructive colour adds one source → foundation → semantic chain. Existing source/used-by commands see these references. Semantic tags and native table parent/child relationships are validated. Keyboard interaction for static output is native; disabled/loading/focus-visible combinations retain the existing tested contract.

## Export closure

The export menu retains whole-library Astro and portable backup, and adds **Selected Astro component and dependencies**. Selection closure includes the chosen definition/composition, its anatomy, bindings/styles, relevant assets, matching themes/densities (with only retained assignments) and owned motion. Capability preflight rejects unsupported targets with the family name and supported options. Unrelated components and their runtime requirements stay out. Card-only export also omits the icon helper/notices. Packages retaining adapted components include `SHADCN-LICENSE.txt`; copied icon support retains its own notices.

The exporter also writes lightweight named preset/instance wrappers that import their shared definition, preserve configuration and accept property overrides. Wrappers expose configuration props; consumers needing custom named/default slot content use the exported definition directly. This slot forwarding limit is explicit; there is no detached duplicate definition. `scripts/generate-fixture.ts` generates and consumes every preset wrapper in `/expansion/` so those wrappers are actually compiled, not merely emitted.

## Verification and pending batches

See `docs/library-expansion-evidence.md` for executed commands/results and browser environment. Core model coverage includes linkage/isolation, token/theme/density/state resolution, portable round-trip, genuine old-library loading, collisions/idempotence/forks, dependency pruning and unsupported preflight. Browser tests exercise gallery insertion/edit/save/reopen, each core family, generated Astro semantics, responsive long content, reduced motion and per-preset preview/export equivalence.

Batch C is next: extend TextField and Checkbox contracts, then Textarea/Switch/RadioGroup/Tabs/Accordion/Dialog/Tooltip. Dialog and Tooltip must share a declared behaviour adapter between preview and export and pass actual keyboard/focus/dismissal/relationship/positioning checks before completion. Batch D follows with three compositions. Batch E follows with validated chart data/configuration. Actual pinned `chart.tsx` has been inspected: it imports Recharts, config context, per-theme series colour CSS, ResponsiveContainer initial dimensions, tooltip and legend adapters. No chart adapter or runtime has been installed or represented as delivered.

No backend, authentication, firmware, deployment or push. The original release/migrations/device-budget task remains open. A successful export/build is not ESP32 suitability evidence.
