import { describe, it, expect } from "vitest";
import { createStarter } from "../starter/library";
import {
  execute,
  resolve,
  validate,
  parseDocument,
  fork,
  usedBy,
} from "../domain/engine";
import { hexColor, type ComponentEntity } from "../domain/schema";
import {
  compileComponent,
  previewHtml,
  renderComponent,
  statePriority,
} from "../renderer/compiler";
import { importPortable, portableBytes } from "../persistence/library";
import { astroFiles } from "../export/astro";
import { strFromU8 } from "fflate";
import { importPalette } from "../domain/importers";
describe("document and references", () => {
  it("validates starter and resolves independent theme/density combinations", () => {
    const doc = createStarter();
    expect(validate(doc)).toEqual([]);
    expect(
      resolve(
        doc,
        { ref: "surface" },
        { themeId: "dark", densityId: "comfortable" },
      ).value,
    ).toEqual(hexColor("#0F172A"));
    expect(
      resolve(
        doc,
        { ref: "padding_inline" },
        { themeId: "dark", densityId: "compact" },
      ).value,
    ).toEqual({ type: "dimension", value: 12, unit: "px" });
  });
  it("preserves references across rename and propagates foundation changes", () => {
    let doc = createStarter();
    doc = execute(doc, [
      { type: "rename", id: "color_blue", name: "brand.main" },
      {
        type: "update",
        id: "source_blue",
        changes: { value: hexColor("#FF4400") },
      },
    ]);
    expect(resolve(doc, { ref: "fill" }).chain).toEqual([
      "fill",
      "color_blue",
      "source_blue",
    ]);
    expect(resolve(doc, { ref: "fill" }).value).toEqual(hexColor("#FF4400"));
  });
  it("rejects cycles, mismatched types and missing references atomically", () => {
    const doc = createStarter();
    expect(() =>
      execute(doc, [
        {
          type: "bind",
          id: "fill",
          property: "value",
          binding: { ref: "fill" },
        },
      ]),
    ).toThrow(/cycle/i);
    expect(() =>
      execute(doc, [
        {
          type: "bind",
          id: "fill",
          property: "value",
          binding: { ref: "font_size" },
        },
      ]),
    ).toThrow(/type mismatch/i);
    expect(() =>
      execute(doc, [
        {
          type: "bind",
          id: "fill",
          property: "value",
          binding: { ref: "missing" },
        },
      ]),
    ).toThrow(/missing/i);
    expect(validate(doc)).toEqual([]);
  });
  it("diagnoses overlapping mode assignments", () => {
    const doc = createStarter();
    expect(() =>
      execute(doc, [
        {
          type: "update",
          id: "compact",
          changes: { assignments: { surface: { ref: "color_white" } } },
        },
      ]),
    ).toThrow(/conflict/i);
  });
  it("blocks used deletion and replaces compatible references", () => {
    const doc = createStarter();
    expect(usedBy(doc, "color_blue").length).toBeGreaterThan(0);
    expect(() => execute(doc, [{ type: "delete", id: "color_blue" }])).toThrow(
      /used by/i,
    );
    const next = execute(doc, [
      { type: "delete", id: "color_blue", replacementId: "color_blueHover" },
    ]);
    expect(next.entities.color_blue).toBeUndefined();
    expect(resolve(next, { ref: "fill" }).chain).toContain("color_blueHover");
  });
  it("rejects malformed documents, unsupported versions and executable assets", () => {
    const doc = createStarter();
    expect(() => parseDocument({ ...doc, schemaVersion: 9 })).toThrow();
    expect(() => parseDocument({})).toThrow();
    expect(() =>
      execute(doc, [
        {
          type: "create",
          entity: {
            id: "bad",
            name: "SVG",
            kind: "asset",
            filename: "x.svg",
            mediaType: "image/svg+xml",
            data: btoa('<svg onload="alert(1)"/>'),
          },
        },
      ]),
    ).toThrow(/SVG/);
  });
  it("enforces constrained native anatomy and deep duplicates component nodes", () => {
    const doc = createStarter();
    expect(() =>
      execute(doc, [
        {
          type: "update",
          id: "button_label",
          changes: { primitive: "Button" },
        },
      ]),
    ).toThrow(/nested interactive/i);
    expect(() =>
      execute(doc, [
        {
          type: "move",
          id: "button_content",
          parentId: "button_label",
          index: 0,
        },
      ]),
    ).toThrow(/descendant/);
    const next = execute(doc, [
      {
        type: "duplicate",
        id: "button",
        newId: "copy_button",
        name: "Another button",
      },
    ]);
    expect((next.entities.copy_button as ComponentEntity).rootId).not.toBe(
      "button_root",
    );
    expect(next.entities.copy_button_n0).toBeDefined();
  });
  it("forks are independent", () => {
    const doc = createStarter();
    const f = execute(fork(doc, "fork", "Fork"), [
      { type: "rename", id: "fill", name: "new role" },
    ]);
    expect(doc.entities.fill.name).toBe("action.primary.default.fill");
    expect(f.provenance?.libraryId).toBe(doc.id);
  });
});
describe("preview, packaging and export", () => {
  it("quotes untrusted content in generated Astro instead of interpreting expressions", () => {
    const doc = execute(createStarter(), [
      {
        type: "update",
        id: "button_label",
        changes: {
          expose: {},
          slot: undefined,
          props: { text: "{globalThis.process.exit(1)} <script>bad</script>" },
        },
      },
    ]);
    const astro = strFromU8(astroFiles(doc)["components/Button.astro"]);
    expect(astro).toContain(
      '{"{globalThis.process.exit(1)} \\u003cscript>bad\\u003c/script>"}',
    );
  });
  it("renders native disabled/loading and escapes content", () => {
    const doc = createStarter(),
      c = compileComponent(doc, "button");
    const html = renderComponent(doc, c, {
      states: ["focus-visible", "loading"],
      values: { label: "<script>alert(1)</script>" },
    });
    expect(html).toContain(" disabled");
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("focus-visible loading");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(statePriority(["focus-visible"])).toBeGreaterThan(
      statePriority(["disabled"]),
    );
    expect(c.css).toContain(":hover:not(:disabled)");
  });
  it("supports instance override/reset without detaching definitions", () => {
    let doc = createStarter();
    doc = execute(doc, [
      {
        type: "create",
        entity: {
          id: "instance",
          name: "Instance",
          kind: "instance",
          componentId: "button",
          configuration: {},
          variants: {},
          overrides: {},
        },
      },
      {
        type: "override",
        id: "instance",
        nodeId: "button_root",
        property: "background",
        binding: { ref: "color_ink" },
      },
    ]);
    expect(
      doc.entities.instance.kind === "instance" &&
        doc.entities.instance.overrides.button_root.background,
    ).toEqual({ ref: "color_ink" });
    doc = execute(doc, [
      {
        type: "override",
        id: "instance",
        nodeId: "button_root",
        property: "background",
      },
    ]);
    expect(
      doc.entities.instance.kind === "instance" &&
        doc.entities.instance.overrides,
    ).toEqual({});
  });
  it("round trips asset bytes, identities and bindings", () => {
    let doc = createStarter();
    doc = execute(doc, [
      {
        type: "create",
        entity: {
          id: "asset_test",
          name: "Test image",
          kind: "asset",
          filename: "test.png",
          mediaType: "image/png",
          data: "aGVsbG8=",
        },
      },
    ]);
    expect(importPortable(portableBytes(doc))).toEqual(doc);
  });
  it("does not leak preview conditions or editor dependencies into Astro", () => {
    const doc = createStarter();
    const files = astroFiles(doc),
      astro = strFromU8(files["components/Button.astro"]);
    expect(astro).toContain('data-fw-part="button_label"');
    expect(astro).toContain("<slot>");
    expect(astro).not.toContain("data-fw-preview");
    expect(astro).not.toMatch(/react|zustand|indexedDB|gsap/);
    expect(strFromU8(files["components/library.css"])).toContain(
      "prefers-reduced-motion",
    );
  });
  it("isolates preview and exposes a validated palette adapter", () => {
    expect(previewHtml(createStarter(), "button", {})).toContain(
      "default-src 'none'",
    );
    expect(
      importPalette({
        adapter: "chroma-palette-v1",
        sourceId: "demo",
        name: "Demo",
        entries: [
          {
            id: "p3",
            name: "P3",
            color: {
              type: "color",
              space: "display-p3",
              channels: [1, 0.4, 0],
              alpha: 1,
            },
          },
        ],
      })[0],
    ).toMatchObject({
      value: { space: "display-p3" },
      origin: { externalId: "p3" },
    });
  });
});
