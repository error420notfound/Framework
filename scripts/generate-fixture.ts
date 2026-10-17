import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createCompleteStarter as createStarter } from "../src/starter/collection";
import { astroFiles } from "../src/export/astro";
import { execute } from "../src/domain/engine";
const files = astroFiles(createStarter());
for (const [name, bytes] of Object.entries(files)) {
  const target = resolve(
    "fixtures/astro-consumer",
    name.startsWith("components/") ? `src/generated/${name.slice(11)}` : name,
  );
  await mkdir(resolve(target, ".."), { recursive: true });
  await writeFile(target, bytes);
}
console.log(
  `Generated ${Object.keys(files).length} export files from the starter document`,
);
const motionDoc = execute(createStarter(), [
  {
    type: "create",
    entity: {
      id: "motion_button",
      name: "Press",
      kind: "motion",
      ownerId: "button",
      trigger: "press",
      reduced: "skip",
      clips: [
        {
          id: "clip_press",
          targetId: "button_root",
          property: "scale",
          from: 1,
          to: 0.94,
          start: 0,
          duration: { value: { type: "duration", value: 200, unit: "ms" } },
          ease: "power2.out",
        },
      ],
    },
  },
  {
    type: "create",
    entity: {
      id: "motion_brew",
      name: "Sequence",
      kind: "motion",
      ownerId: "brew_panel",
      trigger: "entrance",
      reduced: "fade",
      clips: [
        {
          id: "clip_weight",
          targetId: "brew_weight",
          property: "y",
          from: 16,
          to: 0,
          start: 0,
          duration: { value: { type: "duration", value: 300, unit: "ms" } },
          ease: "power2.out",
        },
        {
          id: "clip_timer",
          targetId: "brew_timer",
          property: "opacity",
          from: 0,
          to: 1,
          start: 0.2,
          duration: { value: { type: "duration", value: 300, unit: "ms" } },
          ease: "power2.out",
        },
      ],
    },
  },
]);
for (const [name, bytes] of Object.entries(astroFiles(motionDoc))) {
  if (!name.startsWith("components/")) continue;
  const target = resolve(
    "fixtures/astro-consumer/src/generated-motion",
    name.slice(11),
  );
  await mkdir(resolve(target, ".."), { recursive: true });
  await writeFile(target, bytes);
}

// Generate a real Astro consumer for every delivered expansion family and preset.
const showcaseDoc = createStarter();
const showcaseComponents = Object.values(showcaseDoc.entities).filter(
  (e) => e.kind === "component" && !!e.capabilities,
);
const showcasePresets = Object.values(showcaseDoc.entities).filter(
  (e) => e.kind === "preset",
);
const names = new Map(
  [...showcaseComponents, ...showcasePresets].map((c) => [
    c.id,
    c.name.replace(/[^a-zA-Z0-9]/g, ""),
  ]),
);
const showcase = `---\n${[...showcaseComponents, ...showcasePresets].map((c) => `import ${names.get(c.id)} from '../generated/${names.get(c.id)}.astro';`).join("\n")}\n---\n<!doctype html><html lang="en" data-fw-theme="light" data-fw-density="comfortable"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/><title>Formwork expansion showcase</title><link rel="icon" href="data:,"/><style>body{font:14px system-ui;margin:24px;color:#0f172a}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr));gap:24px}section{border:1px solid #e2e8f0;border-radius:8px;padding:20px;min-width:0;overflow:auto}h1{font-size:28px}.example-label{font-size:16px;margin:0 0 20px}[data-fw-part]{margin-block:0}</style></head><body><h1>Editable starter expansion</h1><main>${showcasePresets.map((p) => `<section data-example="${p.id}"><h2 class="example-label">${p.name}</h2><${names.get(p.id)} /></section>`).join("\n")}<section data-example="long-card"><h2 class="example-label">Long content</h2><Card title="An extended card title that wraps across multiple lines on smaller screens" content="${"Long content remains editable and wraps safely. ".repeat(12)}" /></section><section data-example="missing-avatar"><h2 class="example-label">Missing image</h2><Avatar image="missing" initials="NA" label="Missing image fallback" /></section></main></body></html>`;
await writeFile("fixtures/astro-consumer/src/pages/expansion.astro", showcase);
