# Current limitations

- Stage 6 is not fully complete: no hardware/browser target or device output budgets have been agreed. Size measurements are evidence, not ESP32 suitability certification.
- Schema version 1 is the only supported version. Unknown versions/fields are rejected. Release adoption and rename/remove isolation are tested; no historical migration is claimed.
- Remote font stylesheets are registered as explicit consumer dependencies; they are not fetched into the isolated preview. Supplied font files are packaged and their loading/error states are surfaced. No live Chroma endpoint or Google Fonts catalogue integration exists.
- SVG imports are rejected. Use raster images/icons. Source uploads are limited to 10 MB each; portable imports to 25 MB compressed / 50 MB expanded. Arbitrary scripts, HTML and CSS properties are not accepted.
- The Astro package exports the whole library inventory. Fine-grained export pruning, cross-library component nesting and an unconstrained page builder are not included.
- Composition data uses stable instance IDs. Applications own timers, event handlers and device transport. The sample scenarios do not communicate with a device.
- Motion supports opacity, x, y, scale and rotation; entrance/press/hover triggers; four GSAP easing choices; skip/short-fade reduced alternatives. Physics, arbitrary GSAP plugins, audio and a full video-style timeline are outside this implementation.
- Browser storage is not cross-device backup. Multi-tab concurrent merges, remote sync and authentication are not implemented. Corrupt records are not silently deleted; recovery uses retry/reload or a portable backup.
- Browser QA uses Chromium, Firefox and WebKit engines. Physical Safari/Edge and real ESP32-served browsers have not been certified. The full parity matrix runs only in Chromium.
- Restricted Windows process execution prevented browser startup/teardown; the same suites pass outside that sandbox. Expected blocked-script messages from test instrumentation inside the script-disabled iframe are filtered narrowly; other console errors fail the primary journey.
