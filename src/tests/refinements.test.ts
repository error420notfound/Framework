import { describe, it, expect, afterEach, vi } from "vitest";
import { useEditor } from "../app/store";
import { createCompleteStarter } from "../starter/collection";
import { execute, usedBy, resolve } from "../domain/engine";
import { convertColor, srgbHex, type Color } from "../domain/color";
import {
  cssValue,
  type NodeEntity,
  type ComponentEntity,
} from "../domain/schema";
import { effectiveBinding, baseBinding, scopeRule } from "../editor/resolution";
import {
  dependencyDestination,
  downstreamReferences,
} from "../editor/dependencies";
import { compositionsFor } from "../app/navigation";
import { portableBytes, importPortable } from "../persistence/library";
const setup = () => {
  vi.useFakeTimers();
  const doc = createCompleteStarter();
  useEditor.setState({
    doc,
    workspace: "Components",
    selectedId: "button_label",
    componentId: "button",
    contexts: {},
    bindingScope: "base",
    variants: { emphasis: "primary", size: "medium" },
    states: [],
    previewValues: {},
    past: [],
    future: [],
    saveState: "Saved",
  });
  return doc;
};
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});
describe("authoring context", () => {
  it("remembers independent exact selections and preview/scope without history or revision changes", () => {
    const doc = setup(),
      s = () => useEditor.getState();
    s().select("button_label", "rule:small");
    useEditor.setState({
      variants: { size: "small" },
      states: ["focus-visible"],
      previewValues: { label: "Draft preview" },
    });
    s().navigate("Foundations");
    expect(s().selectedId).toBe("");
    expect(s().componentId).toBe("");
    s().select("source_blue");
    s().navigate("Components");
    expect(s().selectedId).toBe("button_label");
    expect(s().bindingScope).toBe("rule:small");
    expect(s().previewValues.label).toBe("Draft preview");
    s().navigate("Compositions");
    expect(s().selectedId).toBe("");
    s().select("brew_panel");
    s().navigate("Foundations");
    expect(s().selectedId).toBe("source_blue");
    s().navigate("Compositions");
    expect(s().selectedId).toBe("brew_panel");
    expect(s().doc).toBe(doc);
    expect(s().past).toHaveLength(0);
  });
  it("opens the owner of a cross-component part and recovers deleted selections safely", () => {
    setup();
    const s = () => useEditor.getState();
    const c = Object.values(s().doc.entities).find(
      (e) => e.kind === "component" && e.id !== "button",
    ) as ComponentEntity;
    s().select(c.rootId);
    expect(s().componentId).toBe(c.id);
    s().command(
      [
        {
          type: "create",
          entity: {
            id: "temporary",
            kind: "source",
            name: "Temporary",
            sourceType: "scale",
            value: { type: "number", value: 3 },
          },
        },
      ],
      "create",
    );
    s().select("temporary");
    s().navigate("Components");
    s().command([{ type: "delete", id: "temporary" }], "delete");
    s().navigate("Foundations");
    expect(s().selectedId).toBe("");
  });
  it("does not reparent shared instances and keeps configuration isolated", () => {
    const doc = setup(),
      composition = doc.entities.brew_panel;
    expect(composition.kind).toBe("composition");
    if (composition.kind !== "composition") throw 0;
    expect(composition.instances).toHaveLength(4);
    const id = composition.instances[2],
      instance = doc.entities[id];
    if (instance.kind !== "instance") throw 0;
    const definition = doc.entities[instance.componentId];
    const next = execute(doc, [
      {
        type: "update",
        id,
        changes: {
          configuration: {
            ...instance.configuration,
            label: "Only this instance",
          },
        },
      },
    ]);
    expect(next.entities[definition.id]).toEqual(definition);
    expect(compositionsFor(next, id)).toHaveLength(1);
    const detached = execute(next, [
      {
        type: "update",
        id: composition.id,
        changes: { instances: composition.instances.filter((x) => x !== id) },
      },
    ]);
    expect(detached.entities[id]).toEqual(next.entities[id]);
    expect(compositionsFor(detached, id)).toHaveLength(0);
  });
});
describe("provenance and precedence", () => {
  it("treats shared literals and tokens as inherited and resets only the selected layer", () => {
    let doc = setup();
    let node = doc.entities.button_label as NodeEntity;
    const c = doc.entities.button as ComponentEntity;
    expect(baseBinding(doc, node, "lineHeight")).toMatchObject({
      origin: "Inherited from Control label",
      reset: false,
    });
    expect(baseBinding(doc, node, "fontSize")?.origin).toBe(
      "Inherited from Control label",
    );
    doc = execute(doc, [
      {
        type: "bind",
        id: node.id,
        property: "fontSize",
        binding: { value: { type: "dimension", value: 19, unit: "px" } },
      },
    ]);
    node = doc.entities[node.id] as NodeEntity;
    expect(baseBinding(doc, node, "fontSize")).toMatchObject({
      origin: "Explicit local value",
      reset: true,
    });
    expect(
      effectiveBinding(doc, c, node, "fontSize", {
        variants: { size: "small" },
      })?.origin,
    ).toBe("Variant override: Small");
    expect(
      effectiveBinding(doc, c, node, "fontSize", {
        variants: { size: "small" },
        overrides: {
          [node.id]: {
            fontSize: { value: { type: "dimension", value: 23, unit: "px" } },
          },
        },
      })?.origin,
    ).toBe("Instance override");
    const bindings = { ...node.bindings };
    delete bindings.fontSize;
    doc = execute(doc, [
      { type: "update", id: node.id, changes: { bindings } },
    ]);
    expect(
      baseBinding(doc, doc.entities[node.id] as NodeEntity, "fontSize")?.origin,
    ).toBe("Inherited from Control label");
    expect((doc.entities.button as ComponentEntity).rules).toEqual(c.rules);
  });
  it("resolves existing stable rule IDs, additive focus/loading and disabled precedence", () => {
    const doc = setup(),
      c = doc.entities.button as ComponentEntity,
      n = doc.entities.button_root as NodeEntity;
    expect(scopeRule(c, "variant:size:small")?.id).toBe("small");
    expect(scopeRule(c, "state:hover", { emphasis: "secondary" })?.id).toBe(
      "secondaryHover",
    );
    expect(scopeRule(c, "rule:focus")?.id).toBe("focus");
    expect(
      effectiveBinding(doc, c, n, "outlineWidth", {
        states: ["focus-visible", "loading"],
      })?.origin,
    ).toBe("State override: Focus-visible");
    expect(
      effectiveBinding(doc, c, n, "background", {
        states: ["hover", "disabled"],
      })?.origin,
    ).toBe("State override: Disabled");
    const rules = c.rules.map((r) =>
      r.id === "small" ? { ...r, patch: { ...r.patch, button_label: {} } } : r,
    );
    const next = execute(doc, [
      { type: "update", id: c.id, changes: { rules } },
    ]);
    expect(
      effectiveBinding(
        next,
        next.entities.button as ComponentEntity,
        next.entities.button_label as NodeEntity,
        "fontSize",
        { variants: { size: "small" } },
      )?.origin,
    ).toBe("Inherited from Control label");
    expect(
      (next.entities.button as ComponentEntity).rules.find(
        (r) => r.id === "small",
      )?.patch.button_root,
    ).toEqual(c.rules.find((r) => r.id === "small")?.patch.button_root);
  });
  it("labels dependencies semantically and targets stable anatomy/rule IDs after reorder/rename", () => {
    let doc = setup();
    const c = doc.entities.button as ComponentEntity;
    const r = usedBy(doc, "button_label").find((r) => r.path[0] === "rules")!;
    expect(dependencyDestination(doc, r)).toMatchObject({
      id: "button_label",
      scope: "rule:small",
      label: "Button → Small → Label",
    });
    doc = execute(doc, [
      { type: "rename", id: "button_label", name: "Duplicate label" },
      { type: "update", id: c.id, changes: { rules: [...c.rules].reverse() } },
    ]);
    const next = usedBy(doc, "button_label").find(
      (r) =>
        r.path[0] === "rules" &&
        dependencyDestination(doc, r).scope === "rule:small",
    )!;
    expect(dependencyDestination(doc, next).label).toBe(
      "Button → Small → Duplicate label",
    );
    expect(
      downstreamReferences(doc, "font_size").some(
        (r) => r.from === "button_label",
      ),
    ).toBe(true);
  });
});
describe("colour and portable compatibility", () => {
  it("matches known sRGB red OKLCH coordinates and preserves alpha", () => {
    const red: Color = {
      type: "color",
      space: "srgb",
      channels: [1, 0, 0],
      alpha: 0.4,
    };
    const o = convertColor(red, "oklch");
    expect(o.channels[0]).toBeCloseTo(0.62795536, 7);
    expect(o.channels[1]).toBeCloseTo(0.25768331, 7);
    expect(o.channels[2]).toBeCloseTo(29.233885, 5);
    expect(o.alpha).toBe(0.4);
  });
  it.each<Color>([
    {
      type: "color",
      space: "srgb",
      channels: [37 / 255, 99 / 255, 235 / 255],
      alpha: 1,
    },
    { type: "color", space: "display-p3", channels: [1, 0, 0], alpha: 0.38 },
    { type: "color", space: "oklch", channels: [0.7, 0.25, 230], alpha: 0.8 },
  ])(
    "round-trips repeated conversions without clipping or uncontrolled drift: $space",
    (source) => {
      let value = source;
      for (let i = 0; i < 100; i++)
        for (const space of ["oklch", "display-p3", "srgb"] as const)
          value = convertColor(value, space);
      value = convertColor(value, source.space);
      source.channels.forEach((n, i) =>
        expect(value.channels[i]).toBeCloseTo(n, 8),
      );
      expect(value.alpha).toBe(source.alpha);
    },
  );
  it("preserves wide-gamut data in portable files and CSS, retaining legacy names and stable IDs", () => {
    const doc = setup(),
      p3: Color = {
        type: "color",
        space: "display-p3",
        channels: [1, 0.05, 0.01],
        alpha: 0.625,
      };
    const extended = convertColor(p3, "srgb");
    expect(srgbHex(extended)).toBeUndefined();
    expect(cssValue(extended)).toContain("color(srgb ");
    const old = execute(doc, [
      { type: "rename", id: "font_weight", name: "font.weight.medium" },
      { type: "update", id: "source_blue", changes: { value: extended } },
    ]);
    const reopened = importPortable(portableBytes(old));
    expect(reopened.entities).toEqual(old.entities);
    expect(resolve(reopened, { ref: "font_weight" }).value).toEqual({
      type: "fontWeight",
      value: 600,
    });
    expect(doc.entities.font_weight.name).toBe("font.weight.semibold");
  });
});
import { changeScopeBinding, scopePatch } from "../editor/resolution";
import { astroFiles } from "../export/astro";
import { strFromU8 } from "fflate";

describe("deep authoring scopes and recovery", () => {
  it("edits and resets only a responsive field and retains its navigation target after rule reorder", () => {
    let doc = setup();
    const c = doc.entities.button as ComponentEntity;
    doc = execute(doc, [
      {
        type: "update",
        id: c.id,
        changes: {
          responsive: [
            {
              maxWidth: 500,
              patch: {
                button_root: {
                  paddingInline: { ref: "space_inline" },
                  gap: { ref: "space_gap" },
                },
              },
            },
            {
              maxWidth: 320,
              patch: { button_root: { paddingBlock: { ref: "space_block" } } },
            },
          ],
        },
      },
    ]);
    let current = doc.entities.button as ComponentEntity;
    const use = usedBy(doc, "space_inline").find(
      (r) => r.path[0] === "responsive",
    )!;
    expect(dependencyDestination(doc, use)).toMatchObject({
      id: "button_root",
      scope: "responsive:500",
      viewport: 500,
    });
    doc = execute(doc, [
      {
        type: "update",
        id: c.id,
        changes: changeScopeBinding(
          current,
          "responsive:500",
          "button_root",
          "paddingInline",
          { value: { type: "dimension", value: 7, unit: "px" } },
        ),
      },
    ]);
    current = doc.entities.button as ComponentEntity;
    expect(
      scopePatch(current, "responsive:500")?.button_root.paddingInline,
    ).toEqual({ value: { type: "dimension", value: 7, unit: "px" } });
    doc = execute(doc, [
      {
        type: "update",
        id: c.id,
        changes: changeScopeBinding(
          current,
          "responsive:500",
          "button_root",
          "paddingInline",
          undefined,
        ),
      },
    ]);
    current = doc.entities.button as ComponentEntity;
    expect(current.responsive[0].patch.button_root.gap).toEqual({
      ref: "space_gap",
    });
    expect(current.rules).toEqual(c.rules);
    expect(current.responsive[1].maxWidth).toBe(320);
  });
  it("routes nested instance and motion consumers to exact records and scopes", () => {
    const doc = setup();
    const composition = doc.entities.brew_panel;
    if (composition.kind !== "composition") throw 0;
    const id = composition.instances.find(
      (id) =>
        doc.entities[id].kind === "instance" &&
        (doc.entities[id] as any).componentId === "button",
    )!;
    const withInstance = execute(doc, [
      {
        type: "override",
        id,
        nodeId: "button_label",
        property: "fontSize",
        binding: { ref: "font_size" },
      },
      {
        type: "create",
        entity: {
          kind: "motion",
          id: "motion_route",
          name: "Press",
          ownerId: "button",
          trigger: "press",
          reduced: "skip",
          clips: [
            {
              id: "clip_route",
              targetId: "button_root",
              property: "x",
              from: 0,
              to: 1,
              start: 0,
              duration: { ref: "motion_fast" },
              ease: "none",
            },
          ],
        },
      },
    ]);
    const dest = dependencyDestination(
      withInstance,
      usedBy(withInstance, "font_size").find((r) => r.from === id)!,
    );
    expect(dest).toMatchObject({ id, scope: "instance:button_label" });
    const r = usedBy(withInstance, "motion_fast").find(
      (r) => r.from === "motion_route",
    )!;
    expect(dependencyDestination(withInstance, r)).toMatchObject({
      id: "motion_route",
      scope: "clip:clip_route",
    });
    useEditor.setState({ doc: withInstance });
    useEditor.getState().select("motion_route");
    expect(useEditor.getState()).toMatchObject({
      workspace: "Components",
      componentId: "button",
      selectedId: "motion_route",
      panelOpen: true,
      bottom: "Motion",
    });
  });
  it("clears stale selection after undoing creation and clears foreign context on import", () => {
    setup();
    const s = () => useEditor.getState();
    s().command(
      [
        {
          type: "create",
          entity: {
            id: "transient",
            kind: "source",
            name: "Transient",
            sourceType: "scale",
            value: { type: "number", value: 1 },
          },
        },
      ],
      "create",
    );
    s().select("transient");
    s().undo();
    expect(s().selectedId).toBe("");
    s().redo();
    s().select("transient");
    s().importLibrary(createCompleteStarter());
    expect(s().contexts).toEqual({});
    expect(s().selectedId).toBe("");
    expect(s().componentId).toBe("");
    s().navigate("Foundations");
    expect(s().selectedId).toBe("");
  });
  it("accounts for configured disabled/loading and keeps extended colour CSS in Astro output", () => {
    const doc = setup(),
      c = doc.entities.button as ComponentEntity,
      node = doc.entities.button_root as NodeEntity;
    expect(
      effectiveBinding(doc, c, node, "background", {
        states: ["hover"],
        values: { loading: true },
      })?.origin,
    ).toBe("State override: Disabled");
    const extended = convertColor(
      { type: "color", space: "display-p3", channels: [1, 0, 0], alpha: 1 },
      "srgb",
    );
    const changed = execute(doc, [
      { type: "update", id: "source_blue", changes: { value: extended } },
    ]);
    expect(strFromU8(astroFiles(changed)["components/library.css"])).toContain(
      "color(srgb ",
    );
  });
});
