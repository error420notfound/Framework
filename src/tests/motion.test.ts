import { describe, it, expect } from "vitest";
import { createCompleteStarter } from "../starter/collection";
import { execute } from "../domain/engine";
import { createRelease, adoptRelease } from "../domain/releases";
import type { Entity } from "../domain/schema";
import { compileMotion } from "../domain/motion";
import { astroFiles } from "../export/astro";
import { strFromU8 } from "fflate";
const motion: Extract<Entity, { kind: "motion" }> = {
  id: "motion_test",
  name: "Entrance",
  kind: "motion",
  ownerId: "button",
  trigger: "entrance",
  reduced: "skip",
  clips: [
    {
      id: "clip_a",
      targetId: "button_root",
      property: "y",
      from: 10,
      to: 0,
      start: 0,
      duration: { value: { type: "duration", value: 300, unit: "ms" } },
      ease: "power2.out",
    },
  ],
};
describe("motion and release boundaries", () => {
  it("compiles typed timing and rejects overlapping ownership and invalid targets", () => {
    const doc = execute(createCompleteStarter(), [
      { type: "create", entity: motion },
    ]);
    expect(compileMotion(doc, motion).clips[0].duration).toBe(0.3);
    expect(() =>
      execute(doc, [
        {
          type: "update",
          id: motion.id,
          changes: {
            clips: [
              ...motion.clips,
              { ...motion.clips[0], id: "clip_b", start: 0.1 },
            ],
          },
        },
      ]),
    ).toThrow(/conflicting/i);
    expect(() =>
      execute(doc, [
        {
          type: "update",
          id: motion.id,
          changes: {
            clips: [{ ...motion.clips[0], targetId: "weight_value" }],
          },
        },
      ]),
    ).toThrow(/outside/);
  });
  it("includes motion only when authored, with reduced-motion runtime", () => {
    const base = createCompleteStarter();
    expect(astroFiles(base)["components/motion.js"]).toBeUndefined();
    const files = astroFiles(
      execute(base, [{ type: "create", entity: motion }]),
    );
    expect(strFromU8(files["components/motion.js"])).toContain(
      "prefers-reduced-motion",
    );
    expect(strFromU8(files["components/Button.astro"])).toContain(
      "initializeMotion",
    );
    expect(strFromU8(files["components/Text.astro"])).not.toContain(
      "initializeMotion",
    );
  });
  it("isolates snapshots and explicit adoption from draft rename/removal", () => {
    const doc = createCompleteStarter();
    const release = createRelease(doc, "0.1.0");
    const edited = execute(doc, [
      { type: "rename", id: "fill", name: "new fill" },
      { type: "removeNode", id: "button_label" },
    ]);
    expect(release.document.entities.fill.name).not.toBe(
      edited.entities.fill.name,
    );
    expect(release.document.entities.button_label).toBeDefined();
    const adopted = adoptRelease(release, "adopted", "Adopted");
    expect(adopted.provenance?.releaseId).toBe(release.id);
    expect(adopted.entities.button_label).toBeDefined();
    expect(() => createRelease(doc, "next")).toThrow();
  });
});
