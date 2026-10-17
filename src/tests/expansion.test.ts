import { describe, it, expect } from "vitest";
import historical from "./fixtures/pre-expansion-v1.json";
import { createCompleteStarter } from "../starter/collection";
import {
  execute,
  parseDocument,
  validate,
  fork,
  resolve,
} from "../domain/engine";
import { instantiatePreset, planStarterInstall } from "../starter/registration";
import {
  compileComponent,
  renderComponent,
  tokenCss,
} from "../renderer/compiler";
import { astroFiles } from "../export/astro";
import { exportSelection } from "../export/selection";
import { portableBytes, importPortable } from "../persistence/library";
import { strFromU8 } from "fflate";
describe("starter expansion", () => {
  it("keeps snapshot presets linked to one definition with isolated instances", () => {
    let doc = createCompleteStarter();
    doc = execute(doc, [
      ...instantiatePreset(doc, "preset_button_outline", "one"),
      ...instantiatePreset(doc, "preset_button_destructive", "two"),
    ]);
    expect(doc.entities.one).toMatchObject({
      componentId: "button",
      variants: { emphasis: "outline" },
    });
    expect(doc.entities.two).toMatchObject({
      componentId: "button",
      variants: { emphasis: "destructive" },
    });
    doc = execute(doc, [
      {
        type: "bind",
        id: "button_label",
        property: "fontSize",
        binding: { value: { type: "dimension", value: 22, unit: "px" } },
      },
      {
        type: "update",
        id: "one",
        changes: { configuration: { label: "Local label" } },
      },
      {
        type: "update",
        id: "preset_button_outline",
        changes: { configuration: { label: "Future insertion" } },
      },
    ]);
    expect(compileComponent(doc, "button").css).toContain("font-size:22px");
    expect(doc.entities.one).toMatchObject({
      configuration: { label: "Local label" },
    });
    expect(doc.entities.two).toMatchObject({
      configuration: { label: "Delete" },
    });
    expect(doc.entities.button).toMatchObject({
      properties: expect.arrayContaining([
        expect.objectContaining({ id: "label", default: "Add item" }),
      ]),
    });
  });
  it("preserves genuine pre-expansion schema-1 documents and uses additive install review", () => {
    let old = parseDocument(historical);
    old = execute(old, [
      { type: "rename", id: "button", name: "My button" },
      {
        type: "bind",
        id: "button_root",
        property: "paddingInline",
        binding: { value: { type: "dimension", value: 33, unit: "px" } },
      },
    ]);
    const before = structuredClone(old.entities);
    const plan = planStarterInstall(old, createCompleteStarter());
    const updated = execute(old, plan.commands);
    for (const [id, e] of Object.entries(before))
      expect(updated.entities[id]).toEqual(e);
    expect(plan.conflicts).toContain("button");
    expect(updated.entities.preset_button_outline).toBeUndefined(); // preserved old axis has no outline
    expect(updated.entities.card_component?.kind).toBe("component");
    expect(validate(updated)).toEqual([]);
    expect(
      planStarterInstall(updated, createCompleteStarter()).commands,
    ).toEqual([]);
  });
  it("handles unrelated ID collisions deterministically and keeps forks independent", () => {
    let old = parseDocument(historical);
    old = execute(old, [
      {
        type: "create",
        entity: {
          id: "badge_root",
          name: "User token",
          kind: "token",
          layer: "foundation",
          valueType: "number",
          binding: { value: { type: "number", value: 3 } },
        },
      },
    ]);
    const plan = planStarterInstall(old, createCompleteStarter());
    expect(plan.conflicts).toContain("badge_component");
    const result = execute(old, plan.commands);
    expect(result.entities.badge_root).toEqual(old.entities.badge_root);
    expect(result.entities.badge_component).toBeUndefined();
    const forked = execute(fork(result, "independent", "Independent"), [
      { type: "rename", id: "button", name: "Fork button" },
    ]);
    expect(result.entities.button.name).toBe("Button");
    expect(forked.entities.button.name).toBe("Fork button");
  });
  it("does not adopt unrelated same-kind anatomy with a colliding ID", () => {
    const old = execute(parseDocument(historical), [
      {
        type: "create",
        entity: {
          id: "badge_root",
          name: "My unrelated node",
          kind: "node",
          primitive: "Text",
          children: [],
          bindings: {},
          props: { text: "Mine" },
          expose: {},
        },
      },
    ]);
    const plan = planStarterInstall(old, createCompleteStarter());
    const next = execute(old, plan.commands);
    expect(next.entities.badge_component).toBeUndefined();
    expect(next.entities.badge_root).toEqual(old.entities.badge_root);
    expect(plan.conflicts).toContain("badge_root");
  });
  it("round trips every family, preset and anatomy without flattening bindings", () => {
    const doc = createCompleteStarter();
    expect(parseDocument(doc)).toEqual(doc);
    expect(importPortable(portableBytes(doc))).toEqual(doc);
    expect(validate(doc)).toEqual([]);
    for (const id of [
      "button",
      "text_component",
      "badge_component",
      "avatar_component",
      "separator_component",
      "card_component",
      "alert_component",
      "skeleton_component",
      "spinner_component",
      "progress_component",
      "table_component",
    ]) {
      const c = compileComponent(doc, id);
      expect(renderComponent(doc, c)).toContain(`data-fw-component="${id}"`);
      expect(
        Object.keys(astroFiles(doc, [id])).some((x) => x.endsWith(".astro")),
      ).toBe(true);
    }
  });
  it("propagates shared tokens through themes, density, state and independent variant axes", () => {
    const doc = createCompleteStarter();
    const changed = execute(doc, [
      {
        type: "update",
        id: "source_blue",
        changes: {
          value: {
            type: "color",
            space: "srgb",
            channels: [1, 0, 0],
            alpha: 1,
          },
        },
      },
    ]);
    expect(tokenCss(changed)).toContain("--fw-fill:rgb(255 0 0 / 1)");
    expect(
      resolve(doc, { ref: "padding_inline" }, { densityId: "compact" }).value,
    ).not.toEqual(
      resolve(doc, { ref: "padding_inline" }, { densityId: "comfortable" })
        .value,
    );
    const css = compileComponent(doc, "badge_component").css;
    expect(css).toContain('data-fw-tone="primary"');
    expect(css).toContain('data-fw-size="small"');
    const html = renderComponent(doc, compileComponent(doc, "button"), {
      variants: { emphasis: "destructive", size: "small" },
      states: ["focus-visible", "loading"],
    });
    expect(html).toContain("disabled");
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("focus-visible loading");
  });
  it("prunes selected exports and rejects unsupported capability targets", () => {
    const doc = createCompleteStarter();
    const files = astroFiles(doc, ["card_component"]);
    expect(
      exportSelection(doc, ["progress_component"]).entities.fill?.kind,
    ).toBe("token");
    expect(files["components/Button.astro"]).toBeUndefined();
    expect(files["components/icons.js"]).toBeUndefined();
    expect(strFromU8(files["components/library.css"])).not.toContain(
      '[data-fw-primitive="Progress"]',
    );
    expect(files["components/BrewPanel.astro"]).toBeUndefined();
    expect(files["components/motion.js"]).toBeUndefined();
    expect(files["package.json"]).toBeUndefined();
    expect(strFromU8(files["components/library.css"])).not.toContain(
      "button_root",
    );
    expect(files["SHADCN-LICENSE.txt"]).toBeDefined();
    const card = doc.entities.card_component;
    if (card.kind !== "component") throw Error();
    card.capabilities!.targets = ["html"];
    expect(() => astroFiles(doc)).toThrow("Card does not support astro");
    expect(() => astroFiles(doc, ["card_component"])).toThrow(
      "Card does not support astro",
    );
    expect(() => exportSelection(doc, [])).toThrow("Select at least one");
  });
});
