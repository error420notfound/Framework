# Formwork

A local-first design-system editor with typed tokens, native component anatomy, isolated preview and standalone Astro output.

## Run

Requires Node 24.21.0 or newer within Node 24.x. Local development and CI use the version pinned in `.nvmrc`. In Windows PowerShell use `npm.cmd` if `npm.ps1` is blocked by execution policy.

```sh
nvm install
nvm use
npm ci
npm run dev
```

Open http://127.0.0.1:5173. The starter library opens in Components. Select a source/token/style to edit it, or select an anatomy part to bind properties, add/reorder/remove parts and author variant/state rules. Preview controls are temporary; inspectors edit persistent definitions and instances.

The Export menu downloads an Astro package or asset-complete `.formwork` backup, imports a separate library, or creates an independent fork. IndexedDB autosave stays in this browser; portable downloads are the cross-device backup.

## Verify

```sh
npm test
npm run build
npm run fixture:build
npx playwright install chromium
npm run test:e2e
npx playwright install webkit
npm run test:e2e:webkit
npm run measure
```

The Astro fixture is real generated output, not a hand-authored duplicate. Run `npm run fixture:dev` and open http://127.0.0.1:4321. Browser tests build and serve static output on port 4322. The first static Button exports no React, Zustand, IndexedDB or GSAP. Authored motion adds GSAP only to motion-enabled output. Application code owns event listeners and device communication.

See [architecture](docs/architecture.md), [implementation status](docs/implementation-plan.md), [tracker mapping](docs/notion-tracking.md) and [limitations](docs/limitations.md). No backend, auth, sync or external publishing is included.

The starter includes native Button, Link, TextField and Checkbox plus text/layout primitives, WeightReadout, Timer and BrewPanel. Compositions preview connected, disconnected, stale, unstable and overload sample data. The Motion panel provides playback, scrubbing, duration-token bindings, named targets and reduced-motion alternatives. Export > Library releases creates immutable local snapshots and adopts them into independent drafts.

Firefox is an optional additional check (`npm run test:e2e:firefox`); its complete authoring suite passes with normal process permissions (restricted sandbox execution caused blank-page crashes). WebKit checks are an engine proxy, not physical Safari/device certification. Device budgets remain unagreed. Source imports support the documented local Chroma adapter and font/image files; there is no live Chroma endpoint or Google Fonts catalogue integration.

### Icon picker

Icon anatomy, exposed icon defaults, preview values, and instance overrides support Lucide, Bootstrap Icons, and Google Material Symbols (Outlined, Rounded, Sharp). Existing text glyphs remain supported. Catalogs load only when opened. Selections use a `fw-icon:` JSON string carrying library/name/style and SVG or codepoint data, so portable libraries retain the chosen icon without a catalog lookup. SVG selections render as isolated CSS masks and inherit text color. Material Symbols require access to Google Fonts; the preview CSP permits the Google stylesheet and font hosts.

Run `npm run icons:generate` with Node 24+ to refresh the checked-in catalogs and generated export renderer. It uses the installed npm SVG packages and Google's Material Symbols codepoints. Upstream licenses are under `src/icons/licenses`. Astro exports share the renderer and load Material font stylesheets when used.

Starter expansion: open **Components → Library gallery / install** to browse component definitions, snapshot presets and compositions or review additive starter installation. Existing libraries retain their records. See [the expansion checkpoint](docs/library-expansion.md), [source matrix](docs/source-adaptation-matrix.md) and [verification evidence](docs/library-expansion-evidence.md). `fixture:generate` also creates the native Astro `/expansion/` showcase.

On hosts where Playwright's browser builds are unsupported, `FORMWORK_CHROMIUM_PATH` can point to an existing Chromium executable. It is an explicit local testing fallback; other browser engines still require separate validation.
