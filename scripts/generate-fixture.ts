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
